<template>
  <div class="bm-auth-page">
    <BrandHeaderPublic />

    <main class="bm-auth-main">
      <!-- 1. Email Activation View (/activate-user?token=...) -->
      <div v-if="mode === 'verify'" class="bm-auth-card bm-card">
        <h1>Email Verification</h1>
        <p class="bm-auth-sub">{{ statusBanner || 'Confirming your email verification token...' }}</p>
        <p v-if="errorMsg" class="bm-auth-error" role="alert">{{ errorMsg }}</p>
        <BmButton variant="primary" @click="router.push('/evolution/brandSummary')">
          Continue to workspace
        </BmButton>
      </div>

      <!-- 2. Collaborator Invite Acceptance (/activate-collaborator?token=...) -->
      <div v-else-if="mode === 'invite'" class="bm-auth-card bm-card">
        <h1>Accept Workspace Invitation</h1>
        <p class="bm-auth-sub">Set a password to activate your collaborator access on BeeloftMetric.</p>
        <form class="bm-auth-form" @submit.prevent="submitAcceptInvite">
          <div>
            <label for="inv-pwd" class="bm-label">Create password</label>
            <input
              id="inv-pwd"
              v-model="newPassword"
              type="password"
              class="bm-input"
              placeholder="Minimum 6 characters"
              autocomplete="new-password"
              required
            />
          </div>
          <p v-if="errorMsg" class="bm-auth-error" role="alert">{{ errorMsg }}</p>
          <BmButton type="submit" variant="primary" :loading="submitting">
            Activate & join workspace
          </BmButton>
        </form>
      </div>

      <!-- 3. Password Reset Confirmation (/new-password?token=...) -->
      <div v-else-if="mode === 'reset'" class="bm-auth-card bm-card">
        <h1>Set a New Password</h1>
        <p class="bm-auth-sub">Choose a new password for your BeeloftMetric account.</p>
        <form class="bm-auth-form" @submit.prevent="submitResetPassword">
          <div>
            <label for="rst-pwd" class="bm-label">New password</label>
            <input
              id="rst-pwd"
              v-model="newPassword"
              type="password"
              class="bm-input"
              placeholder="Minimum 6 characters"
              autocomplete="new-password"
              required
            />
          </div>
          <p v-if="statusBanner" class="bm-auth-ok" role="status">{{ statusBanner }}</p>
          <p v-if="errorMsg" class="bm-auth-error" role="alert">{{ errorMsg }}</p>
          <BmButton type="submit" variant="primary" :loading="submitting">
            Update password
          </BmButton>
        </form>
        <p class="bm-auth-foot">
          <router-link to="/login">Return to sign in</router-link>
        </p>
      </div>

      <!-- 4. Forgot Password Request -->
      <div v-else-if="forgotOpen" class="bm-auth-card bm-card">
        <h1>Reset Your Password</h1>
        <p class="bm-auth-sub">
          Enter your registered work email and we will send a 60-minute password reset link.
        </p>
        <form class="bm-auth-form" @submit.prevent="submitForgotPassword">
          <div>
            <label for="fg-email" class="bm-label">Work email</label>
            <input
              id="fg-email"
              v-model="email"
              type="email"
              class="bm-input"
              placeholder="name@company.com"
              autocomplete="email"
              required
            />
          </div>
          <p v-if="statusBanner" class="bm-auth-ok" role="status">{{ statusBanner }}</p>
          <p v-if="errorMsg" class="bm-auth-error" role="alert">{{ errorMsg }}</p>
          <BmButton type="submit" variant="primary" :loading="submitting">
            Send reset link
          </BmButton>
        </form>
        <p class="bm-auth-foot">
          <button type="button" class="bm-link-btn" @click="forgotOpen = false">
            Back to sign in
          </button>
        </p>
      </div>

      <!-- 5. Standard Sign-In + TOTP 2FA Challenge -->
      <div v-else class="bm-auth-card bm-card">
        <h1>Sign in to BeeloftMetric</h1>
        <p class="bm-auth-sub">
          Access your brand analytics, publishing calendar, unified inbox, and SmartLinks.
        </p>

        <form class="bm-auth-form" @submit.prevent="submitLogin">
          <template v-if="!needsTwoFactor">
            <div>
              <label for="login-email" class="bm-label">Work email</label>
              <input
                id="login-email"
                v-model="email"
                type="email"
                class="bm-input"
                placeholder="name@company.com"
                autocomplete="email"
                required
              />
            </div>

            <div>
              <div class="bm-label-row">
                <label for="login-password" class="bm-label">Password</label>
                <button type="button" class="bm-link-btn" @click="forgotOpen = true">
                  Forgot password?
                </button>
              </div>
              <input
                id="login-password"
                v-model="password"
                type="password"
                class="bm-input"
                placeholder="Enter your password"
                autocomplete="current-password"
                required
              />
            </div>
          </template>

          <div v-else>
            <label for="login-totp" class="bm-label">Two-Factor Authentication Code (6 digits)</label>
            <input
              id="login-totp"
              v-model="totpCode"
              type="text"
              inputmode="numeric"
              pattern="[0-9]{6}"
              maxlength="6"
              class="bm-input tabular-nums"
              placeholder="000000"
              autocomplete="one-time-code"
              required
            />
          </div>

          <p v-if="errorMsg" class="bm-auth-error" role="alert">{{ errorMsg }}</p>

          <BmButton type="submit" variant="primary" :loading="submitting">
            {{ needsTwoFactor ? 'Verify 2FA & sign in' : 'Sign in to workspace' }}
          </BmButton>
        </form>

        <p class="bm-auth-foot">
          New to BeeloftMetric?
          <router-link to="/register">Create a free workspace</router-link>
        </p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BrandHeaderPublic from '@/components/common/BrandHeaderPublic.vue';
import BmButton from '@/components/common/designSystem/atoms/BmButton.vue';
import { apiRequest } from '@/services/api';
import { trackAttributionEvent } from '@/services/attribution';
import { useAppStore } from '@/stores/appStore';

const route = useRoute();
const router = useRouter();
const store = useAppStore();

const email = ref('');
const password = ref('');
const totpCode = ref('');
const newPassword = ref('');
const needsTwoFactor = ref(false);
const forgotOpen = ref(false);
const errorMsg = ref('');
const statusBanner = ref('');
const submitting = ref(false);

const mode = computed(() => {
  if (route.path === '/activate-user') return 'verify';
  if (route.path === '/activate-collaborator') return 'invite';
  if (route.path === '/new-password') return 'reset';
  return 'login';
});

async function submitLogin(): Promise<void> {
  submitting.value = true;
  errorMsg.value = '';
  try {
    const res = await apiRequest<{
      ok: boolean;
      requiresTwoFactor?: boolean;
      primaryBlogId?: number;
    }>('/api/v2/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: email.value,
        password: password.value,
        totpCode: needsTwoFactor.value ? totpCode.value : undefined
      })
    });

    if (res.requiresTwoFactor) {
      needsTwoFactor.value = true;
      return;
    }

    await trackAttributionEvent('login_success', '/evolution/brandSummary');
    await store.bootstrap();
    const nextPath = typeof route.query.next === 'string' ? route.query.next : '';
    if (nextPath && nextPath.startsWith('/')) {
      await router.push(nextPath);
    } else {
      const targetBlog = res.primaryBlogId || store.activeBlogId;
      await router.push(
        targetBlog ? `/evolution/brandSummary?blogId=${targetBlog}` : '/evolution/brandSummary'
      );
    }
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Unable to sign in.';
  } finally {
    submitting.value = false;
  }
}

async function submitForgotPassword(): Promise<void> {
  submitting.value = true;
  errorMsg.value = '';
  statusBanner.value = '';
  try {
    const res = await apiRequest<{ message: string }>('/api/v2/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: email.value })
    });
    statusBanner.value = res.message;
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Unable to process reset request.';
  } finally {
    submitting.value = false;
  }
}

async function submitResetPassword(): Promise<void> {
  submitting.value = true;
  errorMsg.value = '';
  statusBanner.value = '';
  try {
    const token = String(route.query.token || '');
    await apiRequest('/api/v2/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword: newPassword.value })
    });
    statusBanner.value = 'Password updated. Redirecting to sign in...';
    setTimeout(() => router.push('/login'), 1000);
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Unable to reset password.';
  } finally {
    submitting.value = false;
  }
}

async function submitAcceptInvite(): Promise<void> {
  submitting.value = true;
  errorMsg.value = '';
  try {
    const token = String(route.query.token || '');
    const res = await apiRequest<{ ok: boolean; primaryBlogId: number }>('/api/v2/auth/accept-invite', {
      method: 'POST',
      body: JSON.stringify({ token, password: newPassword.value })
    });
    await store.bootstrap();
    await router.push(`/evolution/brandSummary?blogId=${res.primaryBlogId}`);
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Unable to accept invitation.';
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  if (mode.value === 'verify') {
    const token = String(route.query.token || '');
    if (!token) {
      errorMsg.value = 'Missing verification token.';
      return;
    }
    try {
      const res = await apiRequest<{ email: string }>('/api/v2/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token })
      });
      statusBanner.value = `Email verified for ${res.email}.`;
      await store.bootstrap();
    } catch (err) {
      errorMsg.value = err instanceof Error ? err.message : 'Verification failed.';
    }
  }
});
</script>

<style scoped>
.bm-auth-page {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

.bm-auth-main {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
}

.bm-auth-card {
  width: min(460px, 100%);
  padding: 2rem 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.bm-auth-card h1 {
  font-size: 1.75rem;
}

.bm-auth-sub {
  color: var(--bm-text-muted);
  font-size: 0.9375rem;
}

.bm-auth-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.bm-label-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.bm-link-btn {
  border: none;
  background: transparent;
  padding: 0;
  color: var(--bm-accent);
  font-size: 0.8125rem;
  font-weight: 500;
  text-decoration: underline;
}

.bm-auth-error {
  padding: 0.625rem 0.75rem;
  border-radius: var(--bm-radius-md);
  background: var(--bm-danger-bg);
  color: var(--bm-danger-text);
  border: 1px solid var(--bm-danger-border);
  font-size: 0.875rem;
  font-weight: 500;
}

.bm-auth-ok {
  padding: 0.625rem 0.75rem;
  border-radius: var(--bm-radius-md);
  background: var(--bm-success-bg);
  color: var(--bm-success-text);
  border: 1px solid var(--bm-success-border);
  font-size: 0.875rem;
  font-weight: 500;
}

.bm-auth-foot {
  font-size: 0.875rem;
  color: var(--bm-text-muted);
}

.bm-auth-foot a {
  color: var(--bm-accent);
  font-weight: 500;
}
</style>
