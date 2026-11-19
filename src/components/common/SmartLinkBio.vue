<template>
  <div
    class="bm-smart-bio"
    :class="{ 'bm-smart-bio--preview': preview }"
    :style="{ '--bm-bio-bg': link.theme.backgroundColor, '--bm-bio-fg': foreground }"
  >
    <div class="bm-smart-bio__avatar" aria-hidden="true">{{ link.title.slice(0, 2).toUpperCase() }}</div>
    <component :is="preview ? 'h3' : 'h1'" class="bm-smart-bio__title">{{ link.title }}</component>
    <p v-if="link.description" class="bm-smart-bio__description">{{ link.description }}</p>

    <div v-if="buttons.length" class="bm-smart-bio__links">
      <component
        :is="preview ? 'div' : 'a'"
        v-for="button in buttons"
        :key="button.id"
        :href="preview ? undefined : button.url"
        :target="preview ? undefined : '_blank'"
        :rel="preview ? undefined : 'noopener noreferrer'"
        class="bm-smart-bio__link"
        :style="{ backgroundColor: link.theme.buttonColor, color: link.theme.buttonTextColor }"
        @click="!preview && emit('link-click', button)"
      >
        <span>{{ button.label }}</span>
        <span aria-hidden="true">↗</span>
      </component>
    </div>

    <footer v-if="!preview" class="bm-smart-bio__footer">
      <router-link to="/">Powered by BeeloftMetric</router-link>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { SmartLink, SmartLinkButton } from '@/types/api';

const props = defineProps<{ link: SmartLink; preview?: boolean }>();
const emit = defineEmits<{ (e: 'link-click', button: SmartLinkButton): void }>();
const buttons = computed(() => props.link.buttons.filter(button => button.active));

const foreground = computed(() => {
  const hex = props.link.theme.backgroundColor.trim().replace(/^#/, '');
  if (!/^(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(hex)) return 'var(--bm-text)';
  const rgb = hex.length === 3 ? [...hex].map(char => char.repeat(2)) : hex.match(/../g)!;
  const [red, green, blue] = rgb.map(channel => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  return luminance > 0.179 ? '#000000' : '#ffffff';
});
</script>

<style scoped>
.bm-smart-bio {
  display: grid;
  justify-items: center;
  align-content: start;
  gap: 14px;
  color: var(--bm-bio-fg);
  text-align: center;
  overflow-wrap: anywhere;
}

.bm-smart-bio__avatar {
  display: grid;
  width: 58px;
  height: 58px;
  place-items: center;
  border-radius: 15px;
  background: var(--bm-bio-fg);
  color: var(--bm-bio-bg);
  font-family: var(--font-data);
  font-size: 16px;
}

.bm-smart-bio__title {
  width: 100%;
  margin: 0;
  color: inherit;
  font-family: var(--font-signifier);
  font-size: clamp(2.25rem, 5vw, 3.5rem);
  font-weight: 300;
  line-height: 1.02;
  letter-spacing: -0.045em;
}

.bm-smart-bio__description,
.bm-smart-bio__links {
  width: 100%;
}

.bm-smart-bio__description {
  font-size: 15px;
  white-space: pre-wrap;
}

.bm-smart-bio__links {
  display: grid;
  gap: 8px;
  margin-top: 6px;
}

.bm-smart-bio__link {
  display: flex;
  min-width: 0;
  min-height: 48px;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 14px;
  border: 1px solid color-mix(in srgb, currentColor 30%, transparent);
  border-radius: 8px;
  text-align: left;
  text-decoration: none;
}

a.bm-smart-bio__link:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.bm-smart-bio :focus-visible {
  outline-color: var(--bm-bio-fg);
}

.bm-smart-bio__footer {
  margin-top: 8px;
  font-size: 12px;
}

.bm-smart-bio__footer a {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  text-underline-offset: 3px;
}

.bm-smart-bio--preview {
  gap: 10px;
  padding-block: 8px;
}

.bm-smart-bio--preview .bm-smart-bio__avatar {
  width: 44px;
  height: 44px;
  border-radius: 11px;
  font-size: 13px;
}

.bm-smart-bio--preview .bm-smart-bio__title {
  font-size: clamp(1.45rem, 3vw, 1.9rem);
}

.bm-smart-bio--preview :is(.bm-smart-bio__description, .bm-smart-bio__link) {
  font-size: 13px;
}
</style>
