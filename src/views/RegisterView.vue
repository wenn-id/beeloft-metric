<template>
  <div class="bm-public-page bm-auth-page">
    <a href="#auth-main" class="bm-skip-link">Skip to content</a>
    <BrandHeaderPublic class="bm-pub-header--editorial" />

    <main id="auth-main" class="bm-auth-main" tabindex="-1">
      <div class="bm-auth-card">
        <h1>Start your 7-day free trial</h1>
        <p class="bm-auth-sub">
          Every new account unlocks 7 days of full Starter access (up to 5 brands, 2,000 scheduled
          posts, report exports, and real-time web tracking), no credit card required upfront.
        </p>

        <form class="bm-auth-form" @submit.prevent="submitRegister">
          <div>
            <label for="reg-name" class="bm-label">Full name or organization</label>
            <input
              id="reg-name"
              v-model="name"
              type="text"
              class="bm-input"
              placeholder="Alwan Studio"
              autocomplete="name"
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
              placeholder="name@company.com"
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
              placeholder="Minimum 6 characters"
              autocomplete="new-password"
              required
            />
          </div>

          <p v-if="selectedPlan && selectedPlan !== 'FREE'" class="bm-plan-note">
            Selected plan <strong>{{ selectedPlan.replaceAll('_', ' ').toLowerCase() }}</strong>.
            <template v-if="selectedPlan === 'STARTER'">Your trial starts when you create your workspace.</template>
            <template v-else>Continue to plan settings after creating your workspace.</template>
          </p>

          <p v-if="errorMsg" class="bm-auth-error" role="alert">{{ errorMsg }}</p>

          <BmButton type="submit" variant="primary" :loading="submitting">
            Start 7-day free trial
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
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BrandHeaderPublic from '@/components/common/BrandHeaderPublic.vue';
import BmButton from '@/components/common/designSystem/atoms/BmButton.vue';
import { apiRequest } from '@/services/api';
import { trackAttributionEvent } from '@/services/attribution';
import { useAppStore } from '@/stores/appStore';

const route = useRoute();
const router = useRouter();
const store = useAppStore();

const name = ref('');
const email = ref('');
const password = ref('');
const errorMsg = ref('');
const submitting = ref(false);

const selectedPlan = computed(() =>
  typeof route.query.plan === 'string' ? route.query.plan.toUpperCase() : 'FREE'
);
const referralCode = computed(() =>
  typeof route.query.ref === 'string' ? route.query.ref : undefined
);

async function submitRegister(): Promise<void> {
  submitting.value = true;
  errorMsg.value = '';
  try {
    const res = await apiRequest<{
      ok: boolean;
      primaryBlogId: number;
      requestedUpgradePlan: string | null;
    }>('/api/v2/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: name.value,
        email: email.value,
        password: password.value,
        plan: selectedPlan.value,
        referralCode: referralCode.value
      })
    });
    await trackAttributionEvent('register_success', '/evolution/brandSummary');
    await store.bootstrap();

    if (res.requestedUpgradePlan) {
      await router.push(`/user-settings/plan?blogId=${res.primaryBlogId}&upgrade=${res.requestedUpgradePlan}`);
    } else {
      await router.push(`/evolution/brandSummary?blogId=${res.primaryBlogId}`);
    }
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Unable to register account.';
  } finally {
    submitting.value = false;
  }
}
</script>
