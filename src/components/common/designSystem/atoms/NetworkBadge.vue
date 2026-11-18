<template>
  <span class="bm-net-badge" :data-net="networkKey">
    <span class="bm-net-badge__dot" aria-hidden="true"></span>
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
  metaAds: 'META',
  googleAds: 'GADS',
  tiktokAds: 'TADS'
};

const networkKey = computed(() => String(props.network || 'web'));
const code = computed(() => CODES[networkKey.value] || 'CH');
</script>

<style scoped>
.bm-net-badge {
  --net-dot: #6f6962;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-width: 34px;
  height: 24px;
  padding: 0 8px;
  border-radius: var(--radius-buttons);
  background: var(--bm-elevated);
  color: var(--bm-text);
  border: 1px solid var(--bm-border-soft);
  box-shadow: 0 1px 2px rgba(24, 22, 21, 0.05);
  font-family: var(--font-sohne);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.bm-net-badge__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--net-dot);
  flex-shrink: 0;
}

.bm-net-badge[data-net='web'] {
  --net-dot: #0d9488;
}
.bm-net-badge[data-net='instagram'] {
  --net-dot: #db2777;
}
.bm-net-badge[data-net='facebook'],
.bm-net-badge[data-net='metaAds'] {
  --net-dot: #2563eb;
}
.bm-net-badge[data-net='tiktok'],
.bm-net-badge[data-net='tiktokAds'] {
  --net-dot: #0f766e;
}
.bm-net-badge[data-net='youtube'],
.bm-net-badge[data-net='pinterest'] {
  --net-dot: #dc2626;
}
.bm-net-badge[data-net='linkedin'] {
  --net-dot: #0284c7;
}
.bm-net-badge[data-net='gmb'],
.bm-net-badge[data-net='googleAds'] {
  --net-dot: #d97706;
}
.bm-net-badge[data-net='twitch'] {
  --net-dot: #7c3aed;
}
.bm-net-badge[data-net='bluesky'] {
  --net-dot: #0369a1;
}
</style>
