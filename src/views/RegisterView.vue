<template>
  <div class="bm-auth-page">
    <BrandHeaderPublic />

    <main class="bm-auth-main">
      <div class="bm-auth-card bm-card">
        <h1>Create your BeeloftMetric account</h1>
        <p class="bm-auth-sub">
          Registration saves your profile to the local store and records the session attribution event.
        </p>

        <form class="bm-auth-form" @submit.prevent="submitRegister">
          <div>
            <label for="reg-name" class="bm-label">Your name</label>
            <input
              id="reg-name"
              v-model="name"
              type="text"
              class="bm-input"
              placeholder="Your Name"
              required
            />
          </div>

          <div>
            <label for="reg-email" class="bm-label">Work email</label>
            <input
              id="reg-email"
              v-model="email"
              type="email"
              class="bm-input"
              placeholder="email@example.com"
              autocomplete="email"
              required
            />
          </div>

          <div>
            <label for="reg-password" class="bm-label">Password</label>
            <input
              id="reg-password"
              v-model="password"
              type="password"
              class="bm-input"
              placeholder="At least 6 characters"
              autocomplete="new-password"
              required
            />
          </div>

          <p v-if="errorMsg" class="bm-auth-error" role="alert">
            Error: {{ errorMsg }}
          </p>

          <BmButton type="submit" variant="primary" :loading="submitting">
            Create account
          </BmButton>
        </form>

        <p class="bm-auth-foot">
          Already have an account?
          <router-link to="/login">Sign in</router-link>
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

const name = ref('');
const email = ref('');
const password = ref('');
const errorMsg = ref('');
const submitting = ref(false);

async function submitRegister(): Promise<void> {
  submitting.value = true;
  errorMsg.value = '';
  try {
    await apiRequest('/api/v2/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name: name.value, email: email.value, password: password.value })
    });
    await trackAttributionEvent('register_success', '/evolution/brandSummary');
    await store.bootstrap();
    await router.push('/evolution/brandSummary?blogId=8137743&userId=6401427');
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Unable to register account.';
  } finally {
    submitting.value = false;
  }
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

.bm-auth-foot {
  font-size: 0.875rem;
  color: var(--bm-text-muted);
}

.bm-auth-foot a {
  color: var(--bm-accent);
  font-weight: 700;
}
</style>
