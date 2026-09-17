import { ref } from 'vue';

const isDark = ref(false);

// Initialize global theme classes on load so modals (portals) inherit them
if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', isDark.value);
    document.documentElement.classList.toggle('theme-dark', isDark.value);
    document.documentElement.classList.toggle('theme-light', !isDark.value);
}

export function useTheme() {
    const toggleTheme = (_event?: MouseEvent) => {
        const isAppearanceTransition =
            // @ts-ignore
            'startViewTransition' in document &&
            !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (!isAppearanceTransition) {
            isDark.value = !isDark.value;
            document.documentElement.classList.toggle('dark', isDark.value);
            document.documentElement.classList.toggle('theme-dark', isDark.value);
            document.documentElement.classList.toggle('theme-light', !isDark.value);
            return;
        }

        // @ts-ignore
        document.startViewTransition(() => {
            isDark.value = !isDark.value;
            document.documentElement.classList.toggle('dark', isDark.value);
            document.documentElement.classList.toggle('theme-dark', isDark.value);
            document.documentElement.classList.toggle('theme-light', !isDark.value);
        });
    };

    return {
        isDark,
        toggleTheme
    };
}
