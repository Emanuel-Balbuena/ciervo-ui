import { ref, shallowRef } from 'vue';
import {
  createShader,
  playSweep,
  GLIMM_PALETTES,
  EASINGS,
  type ShaderController,
  type SweepOptions
} from '../utils/glimm/glimmEngine';

const activeController = shallowRef<ShaderController | null>(null);
const isSweeping = ref(false);

export function useGlimm() {
  function registerCanvas(canvas: HTMLCanvasElement) {
    if (activeController.value) {
      activeController.value.destroy();
    }
    activeController.value = createShader({ canvas });
    return activeController.value;
  }

  function unregisterCanvas() {
    if (activeController.value) {
      activeController.value.destroy();
      activeController.value = null;
    }
  }

  async function triggerSweep(options: SweepOptions = {}) {
    if (!activeController.value) {
      console.warn('[useGlimm] Canvas controller not registered yet.');
      return;
    }

    if (isSweeping.value) {
      return;
    }

    isSweeping.value = true;

    try {
      const handle = playSweep(activeController.value, {
        ...options,
        onComplete: () => {
          isSweeping.value = false;
          options.onComplete?.();
        }
      });

      await handle.done;
    } catch (err) {
      console.error('[useGlimm] sweep failed:', err);
    } finally {
      isSweeping.value = false;
    }
  }

  return {
    activeController,
    isSweeping,
    registerCanvas,
    unregisterCanvas,
    triggerSweep,
    palettes: GLIMM_PALETTES,
    easings: EASINGS
  };
}
