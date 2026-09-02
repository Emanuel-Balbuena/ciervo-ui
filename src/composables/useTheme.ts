import { ref } from 'vue';

const isDark = ref(false);

export function useTheme() {
    const toggleTheme = (_event?: MouseEvent) => {
        const isAppearanceTransition =
            // @ts-ignore
            'startViewTransition' in document &&
            !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        if (!isAppearanceTransition) {
            isDark.value = !isDark.value;
            document.documentElement.classList.toggle('dark', isDark.value);
            return;
        }

        // @ts-ignore
        document.startViewTransition(() => {
            isDark.value = !isDark.value;
            document.documentElement.classList.toggle('dark', isDark.value);
        });
    };

    return {
        isDark,
        toggleTheme
    };
}
