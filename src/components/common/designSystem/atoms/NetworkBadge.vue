<template>
  <span class="bm-net-badge" :class="{ 'bm-net-badge--peach': isPeach }">
    {{ code }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { NetworkKey } from '@/types/api';

const props = defineProps<{
  network: NetworkKey | string;
}>();

const CODES: Record<string, string> = {
  web: 'WEB',
  instagram: 'IG',
  facebook: 'FB',
  tiktok: 'TT',
  youtube: 'YT',
  linkedin: 'IN',
  twitter: 'X',
  pinterest: 'PN',
  threads: 'TH',
  bluesky: 'BS',
  twitch: 'TW',
  gmb: 'GBP',
  metaAds: 'MA',
  googleAds: 'GA',
  tiktokAds: 'TA'
};

const code = computed(() => CODES[props.network] || 'CH');
const isPeach = computed(() => String(props.network).includes('Ads'));
</script>

<style scoped>
.bm-net-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  height: 22px;
  padding: 0 7px;
  border-radius: var(--radius-buttons);
  background: var(--bm-elevated);
  color: var(--bm-text);
  border: 1px solid var(--bm-control-border);
  font-family: var(--font-sohne);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.02em;
}

.bm-net-badge--peach {
  background: var(--color-blush-peach);
  color: var(--color-sienna-brown);
  border-color: var(--color-sienna-brown);
}
</style>
