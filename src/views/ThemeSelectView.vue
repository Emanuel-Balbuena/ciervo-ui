<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import Button from '../components/Button/Button.vue';
import ThemeSelectModal from '../components/ThemeSelect/ThemeSelectModal.vue';
import { useTheme } from '../composables/useTheme';

const router = useRouter();
const { accent } = useTheme();

const isModalOpen = ref(false);
const modalOrigin = ref<HTMLElement | null>(null);

const handleOpen = (e: Event) => {
  modalOrigin.value = e.currentTarget as HTMLElement;
  isModalOpen.value = true;
};
</script>

<template>
  <div class="theme-select-wrapper">
    <header class="top-nav">
      <Button variant="ghost" color="black" shape="round" size="small" @click="router.push('/')">
        <template #icon>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </template>
      </Button>
    </header>

    <main class="content-area">
      <h1 class="page-title">Tema</h1>
      <p class="page-subtitle">Haz clic en el botón de abajo para abrir el selector de apariencia con físicas Gooey mejoradas.</p>
      
      <div style="margin-top: 3rem; text-align: center;">
        <Button
          variant="solid"
          :color="accent.name"
          shape="round"
          size="large"
          @click="handleOpen"
        >
          <template #icon>
            <span data-morph-icon="theme-icon" style="display: inline-flex; align-items: center; justify-content: center; line-height: 1;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.26-.29-.43-.68-.43-1.12A1.68 1.68 0 0 1 14.46 16h2.08A2.46 2.46 0 0 0 19 13.54V12C19 6.5 16.5 2 12 2z"/></svg>
            </span>
          </template>
          <span data-morph-split="theme-text">Tema</span>
        </Button>
      </div>
    </main>

    <ThemeSelectModal v-model:open="isModalOpen" :origin="modalOrigin" />
  </div>
</template>

<style scoped>
.theme-select-wrapper {
  min-height: 100vh;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  padding: 2rem;
  font-family: 'Instrument Sans', sans-serif;
}

.top-nav {
  margin-bottom: 3rem;
}

.content-area {
  max-width: 800px;
  margin: 0 auto;
  text-align: center;
  padding-top: 10vh;
}

.page-title {
  font-size: 3rem;
  font-weight: 700;
  letter-spacing: -0.04em;
  margin-bottom: 1rem;
}

.page-subtitle {
  font-size: 1.25rem;
  color: var(--text-secondary);
  max-width: 500px;
  margin: 0 auto;
}
</style>
