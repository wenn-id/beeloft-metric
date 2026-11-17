import { hmacSha256Hex, randomToken, sha256Base64Url } from '../security/crypto.js';
import type {
  BeeloftDatabase,
  Brand,
  EdgeEnv,
  NetworkKey,
  OAuthCredentialRow,
  PlannerPost,
  PlatformRepository
} from '../types.js';

export interface OAuthProviderStatus {
  network: NetworkKey;
  oauthSupported: boolean;
  configured: boolean;
  envHint: string;
}

export function listOAuthProviderStatuses(env?: EdgeEnv): OAuthProviderStatus[] {
  const metaReady = Boolean(env?.META_APP_ID && env?.META_APP_SECRET);
  const tiktokReady = Boolean(env?.TIKTOK_CLIENT_KEY && env?.TIKTOK_CLIENT_SECRET);
  const googleReady = Boolean(env?.GOOGLE_CLIENT_ID && env?.GOOGLE_CLIENT_SECRET);
  const xReady = Boolean(env?.X_CLIENT_ID && env?.X_CLIENT_SECRET);
  const liReady = Boolean(env?.LINKEDIN_CLIENT_ID && env?.LINKEDIN_CLIENT_SECRET);

  return [
    { network: 'web', oauthSupported: false, configured: true, envHint: 'First-party tracker.js' },
    { network: 'instagram', oauthSupported: true, configured: metaReady, envHint: 'META_APP_ID + META_APP_SECRET' },
    { network: 'facebook', oauthSupported: true, configured: metaReady, envHint: 'META_APP_ID + META_APP_SECRET' },
    { network: 'metaAds', oauthSupported: true, configured: metaReady, envHint: 'META_APP_ID + META_APP_SECRET' },
    { network: 'tiktok', oauthSupported: true, configured: tiktokReady, envHint: 'TIKTOK_CLIENT_KEY + TIKTOK_CLIENT_SECRET' },
    { network: 'tiktokAds', oauthSupported: true, configured: tiktokReady, envHint: 'TIKTOK_CLIENT_KEY + TIKTOK_CLIENT_SECRET' },
    { network: 'youtube', oauthSupported: true, configured: googleReady, envHint: 'GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET' },
    { network: 'gmb', oauthSupported: true, configured: googleReady, envHint: 'GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET' },
    { network: 'googleAds', oauthSupported: true, configured: googleReady, envHint: 'GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET' },
    { network: 'twitter', oauthSupported: true, configured: xReady, envHint: 'X_CLIENT_ID + X_CLIENT_SECRET' },
    { network: 'linkedin', oauthSupported: true, configured: liReady, envHint: 'LINKEDIN_CLIENT_ID + LINKEDIN_CLIENT_SECRET' },
    { network: 'pinterest', oauthSupported: false, configured: false, envHint: 'Connect via Access Token' },
    { network: 'threads', oauthSupported: true, configured: metaReady, envHint: 'META_APP_ID + META_APP_SECRET' },
    { network: 'bluesky', oauthSupported: false, configured: false, envHint: 'Connect via App Password / Token' },
    { network: 'twitch', oauthSupported: false, configured: false, envHint: 'Connect via Access Token' }
  ];
}

export async function buildOAuthAuthorizeUrl(params: {
  repo: PlatformRepository;
  env?: EdgeEnv;
  userId: number;
  blogId: number;
  network: NetworkKey;
  origin: string;
}): Promise<{ authorizeUrl: string } | { error: string }> {
  const { env, network, origin, userId, blogId, repo } = params;
  const callbackUri = `${origin.replace(/\/+$/, '')}/api/v2/oauth/${network}/callback`;
  const state = randomToken('oas', 16);
  let codeVerifier: string | null = null;
  let authorizeUrl = '';

  if (network === 'instagram' || network === 'facebook' || network === 'metaAds' || network === 'threads') {
    if (!env?.META_APP_ID || !env?.META_APP_SECRET) {
      return { error: 'META_APP_ID and META_APP_SECRET are not configured in Cloudflare environment variables yet.' };
    }
    const scopes =
      network === 'metaAds'
        ? 'ads_read,ads_management,pages_show_list'
        : 'pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish,instagram_manage_insights,instagram_manage_messages';
    const u = new URL('https://www.facebook.com/v20.0/dialog/oauth');
    u.searchParams.set('client_id', env.META_APP_ID);
    u.searchParams.set('redirect_uri', callbackUri);
    u.searchParams.set('state', state);
    u.searchParams.set('scope', scopes);
    u.searchParams.set('response_type', 'code');
    authorizeUrl = u.toString();
  } else if (network === 'tiktok' || network === 'tiktokAds') {
    if (!env?.TIKTOK_CLIENT_KEY || !env?.TIKTOK_CLIENT_SECRET) {
      return { error: 'TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET are not configured yet.' };
    }
    const u = new URL('https://www.tiktok.com/v2/auth/authorize/');
    u.searchParams.set('client_key', env.TIKTOK_CLIENT_KEY);
    u.searchParams.set('redirect_uri', callbackUri);
    u.searchParams.set('state', state);
    u.searchParams.set('scope', 'user.info.basic,user.info.stats,video.list,video.publish');
    u.searchParams.set('response_type', 'code');
    authorizeUrl = u.toString();
  } else if (network === 'youtube' || network === 'gmb' || network === 'googleAds') {
    if (!env?.GOOGLE_CLIENT_ID || !env?.GOOGLE_CLIENT_SECRET) {
      return { error: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are not configured yet.' };
    }
    const scope =
      network === 'youtube'
        ? 'https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/youtube.upload'
        : network === 'gmb'
          ? 'https://www.googleapis.com/auth/business.manage'
          : 'https://www.googleapis.com/auth/adwords';
    const u = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    u.searchParams.set('client_id', env.GOOGLE_CLIENT_ID);
    u.searchParams.set('redirect_uri', callbackUri);
    u.searchParams.set('response_type', 'code');
    u.searchParams.set('access_type', 'offline');
    u.searchParams.set('prompt', 'consent');
    u.searchParams.set('scope', scope);
    u.searchParams.set('state', state);
    authorizeUrl = u.toString();
  } else if (network === 'twitter') {
    if (!env?.X_CLIENT_ID || !env?.X_CLIENT_SECRET) {
      return { error: 'X_CLIENT_ID and X_CLIENT_SECRET are not configured yet.' };
    }
    codeVerifier = randomToken('pkce', 24);
    const challenge = await sha256Base64Url(codeVerifier);
    const u = new URL('https://twitter.com/i/oauth2/authorize');
    u.searchParams.set('response_type', 'code');
    u.searchParams.set('client_id', env.X_CLIENT_ID);
    u.searchParams.set('redirect_uri', callbackUri);
    u.searchParams.set('scope', 'tweet.read tweet.write users.read offline.access');
    u.searchParams.set('state', state);
    u.searchParams.set('code_challenge', challenge);
    u.searchParams.set('code_challenge_method', 'S256');
    authorizeUrl = u.toString();
  } else if (network === 'linkedin') {
    if (!env?.LINKEDIN_CLIENT_ID || !env?.LINKEDIN_CLIENT_SECRET) {
      return { error: 'LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET are not configured yet.' };
    }
    const u = new URL('https://www.linkedin.com/oauth/v2/authorization');
    u.searchParams.set('response_type', 'code');
    u.searchParams.set('client_id', env.LINKEDIN_CLIENT_ID);
    u.searchParams.set('redirect_uri', callbackUri);
    u.searchParams.set('state', state);
    u.searchParams.set('scope', 'openid profile email w_member_social');
    authorizeUrl = u.toString();
  } else {
    return { error: `Direct OAuth2 redirect is not configured for ${network}. Use access token connection.` };
  }

  await repo.saveOAuthState({
    state,
    userId,
    blogId,
    network,
    codeVerifier,
    redirectOrigin: origin.replace(/\/+$/, ''),
    createdAt: new Date().toISOString()
  });

  return { authorizeUrl };
}

export async function exchangeOAuthCallback(params: {
  repo: PlatformRepository;
  env?: EdgeEnv;
  network: NetworkKey;
  code: string;
  state: string;
}): Promise<{ redirectUrl: string } | { error: string }> {
  const stateRow = await params.repo.consumeOAuthState(params.state);
  if (!stateRow || stateRow.network !== params.network) {
    return { error: 'Invalid or expired OAuth state.' };
  }

  const callbackUri = `${stateRow.redirectOrigin}/api/v2/oauth/${params.network}/callback`;
  const env = params.env;
  let accessToken = '';
  let refreshToken: string | null = null;
  let expiresInSec = 3600;
  let accountId = `${params.network}-${Date.now()}`;
  let accountHandle = `@${params.network}_connected`;
  let initialFollowers = 0;

  try {
    if (
      params.network === 'instagram' ||
      params.network === 'facebook' ||
      params.network === 'metaAds' ||
      params.network === 'threads'
    ) {
      const tokenUrl = new URL('https://graph.facebook.com/v20.0/oauth/access_token');
      tokenUrl.searchParams.set('client_id', env?.META_APP_ID || '');
      tokenUrl.searchParams.set('client_secret', env?.META_APP_SECRET || '');
      tokenUrl.searchParams.set('redirect_uri', callbackUri);
      tokenUrl.searchParams.set('code', params.code);
      const tRes = await fetch(tokenUrl.toString());
      const tJson = (await tRes.json()) as { access_token?: string; expires_in?: number; error?: { message?: string } };
      if (!tRes.ok || !tJson.access_token) {
        return { error: tJson.error?.message || 'Meta OAuth token exchange failed.' };
      }
      accessToken = tJson.access_token;
      expiresInSec = tJson.expires_in || 5184000;

      const meRes = await fetch(
        `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,fan_count,instagram_business_account{id,username,followers_count}&access_token=${encodeURIComponent(accessToken)}`
      );
      if (meRes.ok) {
        const meJson = (await meRes.json()) as {
          data?: Array<{
            id: string;
            name: string;
            fan_count?: number;
            instagram_business_account?: { id: string; username?: string; followers_count?: number };
          }>;
        };
        const firstPage = meJson.data?.[0];
        if (params.network === 'instagram' && firstPage?.instagram_business_account) {
          accountId = firstPage.instagram_business_account.id;
          accountHandle = `@${firstPage.instagram_business_account.username || firstPage.name}`;
          initialFollowers = Number(firstPage.instagram_business_account.followers_count || 0);
        } else if (firstPage) {
          accountId = firstPage.id;
          accountHandle = firstPage.name;
          initialFollowers = Number(firstPage.fan_count || 0);
        }
      }
    } else if (params.network === 'tiktok' || params.network === 'tiktokAds') {
      const tRes = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_key: env?.TIKTOK_CLIENT_KEY || '',
          client_secret: env?.TIKTOK_CLIENT_SECRET || '',
          code: params.code,
          grant_type: 'authorization_code',
          redirect_uri: callbackUri
        })
      });
      const tJson = (await tRes.json()) as { access_token?: string; refresh_token?: string; open_id?: string; expires_in?: number };
      if (!tRes.ok || !tJson.access_token) return { error: 'TikTok token exchange failed.' };
      accessToken = tJson.access_token;
      refreshToken = tJson.refresh_token || null;
      expiresInSec = tJson.expires_in || 86400;
      accountId = tJson.open_id || accountId;

      const uRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,follower_count', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (uRes.ok) {
        const uJson = (await uRes.json()) as { data?: { user?: { display_name?: string; follower_count?: number } } };
        if (uJson.data?.user?.display_name) accountHandle = `@${uJson.data.user.display_name}`;
        initialFollowers = Number(uJson.data?.user?.follower_count || 0);
      }
    } else if (params.network === 'youtube' || params.network === 'gmb' || params.network === 'googleAds') {
      const tRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: params.code,
          client_id: env?.GOOGLE_CLIENT_ID || '',
          client_secret: env?.GOOGLE_CLIENT_SECRET || '',
          redirect_uri: callbackUri,
          grant_type: 'authorization_code'
        })
      });
      const tJson = (await tRes.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
      if (!tRes.ok || !tJson.access_token) return { error: 'Google OAuth token exchange failed.' };
      accessToken = tJson.access_token;
      refreshToken = tJson.refresh_token || null;
      expiresInSec = tJson.expires_in || 3600;

      if (params.network === 'youtube') {
        const chRes = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        if (chRes.ok) {
          const chJson = (await chRes.json()) as {
            items?: Array<{ id: string; snippet?: { title?: string }; statistics?: { subscriberCount?: string } }>;
          };
          const ch = chJson.items?.[0];
          if (ch) {
            accountId = ch.id;
            accountHandle = ch.snippet?.title || accountHandle;
            initialFollowers = Number(ch.statistics?.subscriberCount || 0);
          }
        }
      }
    } else if (params.network === 'twitter') {
      const basic = btoa(`${env?.X_CLIENT_ID || ''}:${env?.X_CLIENT_SECRET || ''}`);
      const tRes = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${basic}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          code: params.code,
          grant_type: 'authorization_code',
          redirect_uri: callbackUri,
          code_verifier: stateRow.codeVerifier || ''
        })
      });
      const tJson = (await tRes.json()) as { access_token?: string; refresh_token?: string; expires_in?: number };
      if (!tRes.ok || !tJson.access_token) return { error: 'X OAuth2 token exchange failed.' };
      accessToken = tJson.access_token;
      refreshToken = tJson.refresh_token || null;
      expiresInSec = tJson.expires_in || 7200;

      const meRes = await fetch('https://api.twitter.com/2/users/me?user.fields=public_metrics', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (meRes.ok) {
        const meJson = (await meRes.json()) as {
          data?: { id: string; username: string; public_metrics?: { followers_count?: number } };
        };
        if (meJson.data) {
          accountId = meJson.data.id;
          accountHandle = `@${meJson.data.username}`;
          initialFollowers = Number(meJson.data.public_metrics?.followers_count || 0);
        }
      }
    } else if (params.network === 'linkedin') {
      const tRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: params.code,
          redirect_uri: callbackUri,
          client_id: env?.LINKEDIN_CLIENT_ID || '',
          client_secret: env?.LINKEDIN_CLIENT_SECRET || ''
        })
      });
      const tJson = (await tRes.json()) as { access_token?: string; expires_in?: number };
      if (!tRes.ok || !tJson.access_token) return { error: 'LinkedIn OAuth token exchange failed.' };
      accessToken = tJson.access_token;
      expiresInSec = tJson.expires_in || 5184000;

      const uRes = await fetch('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (uRes.ok) {
        const uJson = (await uRes.json()) as { sub?: string; name?: string };
        if (uJson.sub) accountId = uJson.sub;
        if (uJson.name) accountHandle = uJson.name;
      }
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'OAuth provider communication failed.' };
  }

  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();

  await params.repo.saveOAuthCredential({
    blogId: stateRow.blogId,
    userId: stateRow.userId,
    network: params.network,
    accessToken,
    refreshToken,
    expiresAt,
    accountId,
    accountHandle,
    updatedAt: nowIso
  });

  const user = await params.repo.getUserById(stateRow.userId);
  if (user) {
    const brand = user.workspace.brands.find((b) => b.blogId === stateRow.blogId);
    if (brand && brand.connections[params.network]) {
      brand.connections[params.network].connected = true;
      brand.connections[params.network].accountId = accountId;
      brand.connections[params.network].accountHandle = accountHandle;
      brand.connections[params.network].lastSync = nowIso;
      recordInitialMetricSnapshot(user.workspace, brand, params.network, initialFollowers);
      await params.repo.saveUser(user);
    }
  }

  return {
    redirectUrl: `${stateRow.redirectOrigin}/brands/connections?blogId=${stateRow.blogId}&oauth=connected&network=${params.network}`
  };
}

export function recordInitialMetricSnapshot(
  workspace: BeeloftDatabase,
  brand: Brand,
  network: NetworkKey,
  followersCount = 0
): void {
  const blogKey = String(brand.blogId);
  if (!workspace.metricsSeries[blogKey]) {
    workspace.metricsSeries[blogKey] = {};
  }
  if (!workspace.metricsSeries[blogKey][network]) {
    const today = new Date().toISOString().slice(0, 10);
    workspace.metricsSeries[blogKey][network] = [
      {
        date: today,
        impressions: 0,
        reach: 0,
        followers: followersCount,
        interactions: 0,
        clicks: 0
      }
    ];
  }
}

export async function publishPostToConnectedNetworks(params: {
  repo: PlatformRepository;
  workspace: BeeloftDatabase;
  post: PlannerPost;
}): Promise<{ allSucceeded: boolean; summaryNote: string }> {
  const results: string[] = [];
  let anyFailure = false;

  for (const net of params.post.networks) {
    const cred: OAuthCredentialRow | null = await params.repo.getOAuthCredential(params.post.blogId, net);
    if (!cred?.accessToken) {
      results.push(`${net}: published to workspace archive (connect OAuth token for remote API dispatch)`);
      continue;
    }

    try {
      if (net === 'twitter') {
        const res = await fetch('https://api.twitter.com/2/tweets', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${cred.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ text: params.post.text })
        });
        if (!res.ok) {
          anyFailure = true;
          results.push(`twitter: HTTP ${res.status}`);
        } else {
          results.push('twitter: posted live');
        }
      } else if (net === 'facebook' && cred.accountId) {
        const res = await fetch(`https://graph.facebook.com/v20.0/${encodeURIComponent(cred.accountId)}/feed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: params.post.text,
            access_token: cred.accessToken
          })
        });
        if (!res.ok) {
          anyFailure = true;
          results.push(`facebook: HTTP ${res.status}`);
        } else {
          results.push('facebook: posted live');
        }
      } else if (net === 'instagram' && cred.accountId) {
        const mediaUrl = params.post.media[0]?.url;
        if (!mediaUrl) {
          anyFailure = true;
          results.push('instagram: media attachment required by Instagram Graph API');
        } else {
          const containerRes = await fetch(
            `https://graph.facebook.com/v20.0/${encodeURIComponent(cred.accountId)}/media`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                image_url: mediaUrl,
                caption: params.post.text,
                access_token: cred.accessToken
              })
            }
          );
          const containerJson = (await containerRes.json()) as { id?: string };
          if (!containerRes.ok || !containerJson.id) {
            anyFailure = true;
            results.push(`instagram: container error HTTP ${containerRes.status}`);
          } else {
            const pubRes = await fetch(
              `https://graph.facebook.com/v20.0/${encodeURIComponent(cred.accountId)}/media_publish`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  creation_id: containerJson.id,
                  access_token: cred.accessToken
                })
              }
            );
            if (!pubRes.ok) {
              anyFailure = true;
              results.push(`instagram: publish HTTP ${pubRes.status}`);
            } else {
              results.push('instagram: posted live');
            }
          }
        }
      } else if (net === 'linkedin' && cred.accountId) {
        const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${cred.accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
          },
          body: JSON.stringify({
            author: `urn:li:person:${cred.accountId}`,
            lifecycleState: 'PUBLISHED',
            specificContent: {
              'com.linkedin.ugc.ShareContent': {
                shareCommentary: { text: params.post.text },
                shareMediaCategory: 'NONE'
              }
            },
            visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
          })
        });
        if (!res.ok) {
          anyFailure = true;
          results.push(`linkedin: HTTP ${res.status}`);
        } else {
          results.push('linkedin: posted live');
        }
      } else {
        results.push(`${net}: recorded as published`);
      }
    } catch (err) {
      anyFailure = true;
      results.push(`${net}: ${err instanceof Error ? err.message : 'network failure'}`);
    }
  }

  const nowIso = new Date().toISOString();
  if (!anyFailure) {
    params.post.status = 'PUBLISHED';
    for (const net of params.post.networks) {
      params.workspace.topPosts.unshift({
        id: `tp-${params.post.id}-${net}`,
        blogId: params.post.blogId,
        network: net,
        title: params.post.text.slice(0, 90),
        publishedAt: nowIso.slice(0, 10),
        format: params.post.media.length > 0 ? params.post.media[0].type : 'Post',
        impressions: 0,
        reach: 0,
        engagementRate: 0,
        clicks: 0
      });
    }
    params.workspace.topPosts = params.workspace.topPosts.slice(0, 100);
  } else {
    params.post.status = 'FAILED';
  }

  const summaryNote = results.join('; ');
  params.post.notes = summaryNote;
  return { allSucceeded: !anyFailure, summaryNote };
}

export async function verifyWebhookSignature(
  secret: string | undefined,
  rawBody: string,
  signatureHeader: string | undefined
): Promise<boolean> {
  if (!secret) return true;
  if (!signatureHeader) return false;
  const cleanSig = signatureHeader.replace(/^sha256=/i, '').trim().toLowerCase();
  const expected = await hmacSha256Hex(secret, rawBody);
  return expected.toLowerCase() === cleanSig;
}
