import { PLAN_QUOTAS } from '../workspaceTemplate.js';
import { hmacSha256Hex, randomToken, sha512Hex, timingSafeEqualStr } from '../security/crypto.js';
import type {
  EdgeEnv,
  PaymentOrderRow,
  PlatformRepository,
  UserAccountRow,
  UserProfile
} from '../types.js';

export interface CreateCheckoutResult {
  order: PaymentOrderRow;
  activatedImmediately: boolean;
}

export async function createSubscriptionCheckout(params: {
  repo: PlatformRepository;
  env?: EdgeEnv;
  user: UserAccountRow;
  targetPlan: UserProfile['plan'];
  provider: 'midtrans' | 'stripe';
  couponCode?: string;
  origin: string;
}): Promise<CreateCheckoutResult | { error: string }> {
  const spec = PLAN_QUOTAS[params.targetPlan];
  if (!spec) return { error: 'Invalid subscription plan selected.' };

  let discountPct = 0;
  let appliedCoupon: string | null = null;
  const meta = await params.repo.getGlobalMeta();

  if (params.couponCode?.trim()) {
    const code = params.couponCode.trim().toUpperCase();
    const coupon = meta.coupons.find((c) => c.code === code && c.active);
    if (!coupon) {
      return { error: `Coupon code ${code} is invalid or inactive.` };
    }
    if (coupon.redemptions >= coupon.maxRedemptions) {
      return { error: `Coupon code ${code} has reached its redemption limit.` };
    }
    discountPct = coupon.discountPct;
    appliedCoupon = coupon.code;
  }

  const factor = Math.max(0, (100 - discountPct) / 100);
  const amountIdr = Math.round(spec.priceIdr * factor);
  const amountUsd = Number((spec.priceUsd * factor).toFixed(2));
  const nowIso = new Date().toISOString();
  const orderId = `BM-${params.user.userId}-${Date.now()}`;

  if (amountIdr === 0 || params.targetPlan === 'FREE') {
    const freeOrder: PaymentOrderRow = {
      orderId,
      userId: params.user.userId,
      plan: params.targetPlan,
      amountIdr: 0,
      amountUsd: 0,
      provider: 'coupon_100',
      providerRef: 'instant',
      checkoutUrl: null,
      status: 'PAID',
      couponCode: appliedCoupon,
      createdAt: nowIso,
      paidAt: nowIso
    };
    await params.repo.savePaymentOrder(freeOrder);
    await activatePaidPlan(params.repo, params.user.userId, params.targetPlan, 0, appliedCoupon);
    return { order: freeOrder, activatedImmediately: true };
  }

  const baseOrigin = params.origin.replace(/\/+$/, '');

  if (params.provider === 'midtrans') {
    if (!params.env?.MIDTRANS_SERVER_KEY) {
      return {
        error:
          'MIDTRANS_SERVER_KEY is not configured in Cloudflare environment variables yet. Add your Midtrans Server Key to process IDR payments.'
      };
    }
    const isProd = params.env.MIDTRANS_IS_PRODUCTION === 'true';
    const snapEndpoint = isProd
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions';
    const authHeader = btoa(`${params.env.MIDTRANS_SERVER_KEY}:`);

    const res = await fetch(snapEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authHeader}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: orderId,
          gross_amount: amountIdr
        },
        item_details: [
          {
            id: params.targetPlan,
            price: amountIdr,
            quantity: 1,
            name: `BeeloftMetric ${spec.label} Monthly`
          }
        ],
        customer_details: {
          first_name: params.user.name,
          email: params.user.email
        },
        callbacks: {
          finish: `${baseOrigin}/user-settings/plan?payment=finish&order_id=${orderId}`
        }
      })
    });

    const data = (await res.json()) as {
      token?: string;
      redirect_url?: string;
      error_messages?: string[];
    };
    if (!res.ok || !data.redirect_url) {
      return {
        error: data.error_messages?.join(', ') || `Midtrans returned HTTP ${res.status}`
      };
    }

    const order: PaymentOrderRow = {
      orderId,
      userId: params.user.userId,
      plan: params.targetPlan,
      amountIdr,
      amountUsd,
      provider: 'midtrans',
      providerRef: data.token || null,
      checkoutUrl: data.redirect_url,
      status: 'PENDING',
      couponCode: appliedCoupon,
      createdAt: nowIso,
      paidAt: null
    };
    await params.repo.savePaymentOrder(order);
    return { order, activatedImmediately: false };
  }

  // Stripe Checkout
  if (!params.env?.STRIPE_SECRET_KEY) {
    return {
      error:
        'STRIPE_SECRET_KEY is not configured in Cloudflare environment variables yet. Add your Stripe Secret Key or use Midtrans.'
    };
  }

  const form = new URLSearchParams();
  form.set('mode', 'payment');
  form.set('client_reference_id', orderId);
  form.set('customer_email', params.user.email);
  form.set('success_url', `${baseOrigin}/user-settings/plan?payment=success&order_id=${orderId}`);
  form.set('cancel_url', `${baseOrigin}/user-settings/plan?payment=cancelled`);
  form.set('line_items[0][price_data][currency]', 'usd');
  form.set('line_items[0][price_data][unit_amount]', String(Math.round(amountUsd * 100)));
  form.set('line_items[0][price_data][product_data][name]', `BeeloftMetric ${spec.label} Plan`);
  form.set('line_items[0][quantity]', '1');
  form.set('metadata[order_id]', orderId);

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: form
  });
  const data = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
  if (!res.ok || !data.url) {
    return { error: data.error?.message || `Stripe returned HTTP ${res.status}` };
  }

  const order: PaymentOrderRow = {
    orderId,
    userId: params.user.userId,
    plan: params.targetPlan,
    amountIdr,
    amountUsd,
    provider: 'stripe',
    providerRef: data.id || null,
    checkoutUrl: data.url,
    status: 'PENDING',
    couponCode: appliedCoupon,
    createdAt: nowIso,
    paidAt: null
  };
  await params.repo.savePaymentOrder(order);
  return { order, activatedImmediately: false };
}

export async function activatePaidPlan(
  repo: PlatformRepository,
  userId: number,
  plan: UserProfile['plan'],
  amountUsd: number,
  couponCode: string | null
): Promise<void> {
  const user = await repo.getUserById(userId);
  if (!user) return;

  const spec = PLAN_QUOTAS[plan];
  user.plan = plan;
  user.workspace.user.plan = plan;
  user.workspace.user.trialActive = false;
  user.workspace.user.trialEndsAt = null;
  user.workspace.user.trialDaysRemaining = 0;
  user.workspace.user.brandLimit = spec.brandLimit;
  user.workspace.user.validUntil = new Date(Date.now() + 31 * 86400000).toISOString();
  await repo.saveUser(user);

  const meta = await repo.getGlobalMeta();
  if (couponCode) {
    const cpn = meta.coupons.find((c) => c.code === couponCode);
    if (cpn) cpn.redemptions += 1;
  }
  const inv = {
    id: randomToken('inv', 4).toUpperCase(),
    date: new Date().toISOString().slice(0, 10),
    customerEmail: user.email,
    plan,
    amountUsd,
    status: 'PAID' as const
  };
  meta.invoices.unshift(inv);
  await repo.saveGlobalMeta(meta);
}

export async function handleMidtransWebhook(params: {
  repo: PlatformRepository;
  env?: EdgeEnv;
  payload: Record<string, unknown>;
}): Promise<{ ok: boolean; error?: string }> {
  const serverKey = params.env?.MIDTRANS_SERVER_KEY;
  if (!serverKey) return { ok: false, error: 'MIDTRANS_SERVER_KEY not configured.' };

  const orderId = String(params.payload.order_id || '');
  const statusCode = String(params.payload.status_code || '');
  const grossAmount = String(params.payload.gross_amount || '');
  const signatureKey = String(params.payload.signature_key || '').toLowerCase();

  const expectedSig = (await sha512Hex(`${orderId}${statusCode}${grossAmount}${serverKey}`)).toLowerCase();
  if (!timingSafeEqualStr(signatureKey, expectedSig)) {
    return { ok: false, error: 'Invalid Midtrans signature_key.' };
  }

  const order = await params.repo.getPaymentOrder(orderId);
  if (!order) return { ok: false, error: 'Order not found.' };

  const txStatus = String(params.payload.transaction_status || '');
  const fraudStatus = String(params.payload.fraud_status || 'accept');

  if ((txStatus === 'capture' && fraudStatus === 'accept') || txStatus === 'settlement') {
    if (order.status !== 'PAID') {
      order.status = 'PAID';
      order.paidAt = new Date().toISOString();
      await params.repo.savePaymentOrder(order);
      await activatePaidPlan(params.repo, order.userId, order.plan, order.amountUsd, order.couponCode);
    }
  } else if (txStatus === 'cancel' || txStatus === 'deny' || txStatus === 'expire') {
    order.status = txStatus === 'expire' ? 'EXPIRED' : 'FAILED';
    await params.repo.savePaymentOrder(order);
  }

  return { ok: true };
}

export async function handleStripeWebhook(params: {
  repo: PlatformRepository;
  env?: EdgeEnv;
  rawBody: string;
  signatureHeader?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const secret = params.env?.STRIPE_WEBHOOK_SECRET;
  if (!secret || !params.signatureHeader) {
    return { ok: false, error: 'Missing Stripe webhook secret or signature.' };
  }

  const parts = Object.fromEntries(
    params.signatureHeader.split(',').map((kv) => {
      const [k, v] = kv.split('=');
      return [k?.trim(), v?.trim()];
    })
  );
  const timestamp = parts.t;
  const v1 = parts.v1;
  if (!timestamp || !v1) return { ok: false, error: 'Malformed Stripe-Signature header.' };

  const expected = await hmacSha256Hex(secret, `${timestamp}.${params.rawBody}`);
  if (!timingSafeEqualStr(v1.toLowerCase(), expected.toLowerCase())) {
    return { ok: false, error: 'Invalid Stripe webhook signature.' };
  }

  const event = JSON.parse(params.rawBody) as {
    type?: string;
    data?: { object?: { client_reference_id?: string; metadata?: { order_id?: string } } };
  };

  if (event.type === 'checkout.session.completed') {
    const orderId =
      event.data?.object?.metadata?.order_id || event.data?.object?.client_reference_id || '';
    const order = await params.repo.getPaymentOrder(orderId);
    if (order && order.status !== 'PAID') {
      order.status = 'PAID';
      order.paidAt = new Date().toISOString();
      await params.repo.savePaymentOrder(order);
      await activatePaidPlan(params.repo, order.userId, order.plan, order.amountUsd, order.couponCode);
    }
  }

  return { ok: true };
}
