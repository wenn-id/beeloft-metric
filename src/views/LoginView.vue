<template>
  <div class="bm-auth-page">
    <BrandHeaderPublic />

    <main class="bm-auth-main">
      <div class="bm-auth-card bm-card">
        <h1>Sign in to BeeloftMetric</h1>
        <p class="bm-auth-sub">
          Access the analytics, planning calendar, unified inbox, and attribution tools.
        </p>

        <form class="bm-auth-form" @submit.prevent="submitLogin">
          <div>
            <label for="login-email" class="bm-label">Work email</label>
            <input
              id="login-email"
              v-model="email"
              type="email"
              class="bm-input"
              placeholder="email@example.com"
              autocomplete="email"
              required
            />
          </div>

          <div>
            <label for="login-password" class="bm-label">Password</label>
            <input
              id="login-password"
              v-model="password"
              type="password"
              class="bm-input"
              placeholder="Enter password (min 4 characters)"
              autocomplete="current-password"
              required
            />
          </div>

          <p v-if="errorMsg" class="bm-auth-error" role="alert">
            Error: {{ errorMsg }}
          </p>

          <BmButton type="submit" variant="primary" :loading="submitting">
            Sign in to workspace
          </BmButton>
        </form>

        <div class="bm-auth-divider">
          <span>or</span>
        </div>

        <BmButton variant="secondary" @click="enterLocalOperatorWorkspace">
          Open pre-seeded operator session (Beeloft Studio [SAMPLE DATA])
        </BmButton>

        <p class="bm-auth-foot">
          Need a new workspace profile?
          <router-link to="/register">Create account</router-link>
        </p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import BrandHeaderPublic from '@/components/common/BrandHeaderPublic.vue';
import BmButton from '@/components/common/designSystem/atoms/BmButton.vue';
import { apiRequest } from '@/services/api';
import { trackAttributionEvent } from '@/services/attribution';
import { useAppStore } from '@/stores/appStore';

const router = useRouter();
const store = useAppStore();

const email = ref('operator@beeloftmetric.local');
const password = ref('beeloft-demo');
const errorMsg = ref('');
const submitting = ref(false);

async function submitLogin(): Promise<void> {
  submitting.value = true;
  errorMsg.value = '';
  try {
    await apiRequest('/api/v2/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: email.value, password: password.value })
    });
    await trackAttributionEvent('login_success', '/evolution/brandSummary');
    await store.bootstrap();
    await router.push('/evolution/brandSummary?blogId=8137744&userId=6401427');
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Unable to sign in.';
  } finally {
    submitting.value = false;
  }
}

async function enterLocalOperatorWorkspace(): Promise<void> {
  await store.bootstrap();
  await router.push('/evolution/brandSummary?blogId=8137744&userId=6401427');
}
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
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.bm-auth-card h1 {
  font-size: 1.5rem;
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

.bm-auth-error {
  padding: 0.625rem 0.75rem;
  border-radius: var(--bm-radius-md);
  background: var(--bm-danger-bg);
  color: var(--bm-danger-text);
  border: 1px solid var(--bm-danger-border);
  font-size: 0.875rem;
  font-weight: 600;
}

.bm-auth-divider {
  text-align: center;
  color: var(--bm-text-muted);
  font-size: 0.8125rem;
}

.bm-auth-foot {
  font-size: 0.875rem;
  color: var(--bm-text-muted);
}

.bm-auth-foot a {
  color: var(--bm-accent);
  font-weight: 700;
}
</style>
