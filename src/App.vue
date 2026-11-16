<template>
  <RouterView />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { initAttributionSession } from '@/services/attribution';
import { useAppStore } from '@/stores/appStore';

const store = useAppStore();

onMounted(() => {
  store.applyTheme(store.theme);
  initAttributionSession(window.location.pathname).catch(() => undefined);
});
</script>
