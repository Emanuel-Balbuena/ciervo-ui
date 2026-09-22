import { ref, computed, watch, nextTick } from 'vue';

const isDark = ref(false);

// Acento cromático global (selector de tema): tiñe el PullCord y su trigger.
export interface ThemeAccent {
    name: string;
    hex: string;
}

const baseAccentName = ref('orange');
const baseAccentHex = ref('#ff4d00');

const accent = computed<ThemeAccent>(() => {
    if (baseAccentName.value === 'black') {
        return {
            name: 'black',
            hex: isDark.value ? '#ffffff' : '#000000'
        };
    }
    return { name: baseAccentName.value, hex: baseAccentHex.value };
});

watch(accent, (newVal) => {
    if (typeof document !== 'undefined') {
        document.documentElement.style.setProperty('--pullcord-ink', newVal.hex);
        document.documentElement.style.setProperty('--primary-color', newVal.hex);
        // Si el color primario es blanco puro (en modo oscuro con tema negro), 
        // el texto dentro de ::selection debe ser negro para verse.
        const foreground = (newVal.hex.toLowerCase() === '#ffffff') ? '#000000' : '#ffffff';
        document.documentElement.style.setProperty('--primary-foreground', foreground);
    }
}, { immediate: true });
// Initialize global theme classes on load so modals (portals) inherit them
if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark', isDark.value);
    document.documentElement.classList.toggle('theme-dark', isDark.value);
    document.documentElement.classList.toggle('theme-light', !isDark.value);
}

export function useTheme() {
    const toggleTheme = async (_event?: MouseEvent) => {
        const content = document.getElementById('app-content');

        if (!content) {
            isDark.value = !isDark.value;
            document.documentElement.classList.toggle('dark', isDark.value);
            document.documentElement.classList.toggle('theme-dark', isDark.value);
            document.documentElement.classList.toggle('theme-light', !isDark.value);
            return;
        }

        // 1. Snapshot del tema viejo
        const rootStyle = getComputedStyle(document.documentElement);
        const vars = [
            '--page-bg', '--text-primary', '--text-secondary', '--text-tertiary',
            '--card-bg', '--card-border', '--card-border-subtle', '--canvas-bg',
            '--canvas-border', '--code-bg', '--code-border', '--pill-bg',
            '--pill-border', '--pill-text', '--pill-hover-text', '--pill-active-bg',
            '--pill-active-text', '--checkbox-border', '--checkbox-checked',
            '--input-bg', '--input-border', '--input-focus'
        ];

        // 2. Clonamos y fijamos atrás
        const clone = content.cloneNode(true) as HTMLElement;
        const cloneWrapper = document.createElement('div');
        cloneWrapper.style.position = 'fixed';
        cloneWrapper.style.inset = '0';
        cloneWrapper.style.zIndex = '-1';
        cloneWrapper.style.pointerEvents = 'none';
        cloneWrapper.style.background = rootStyle.getPropertyValue('--page-bg');

        const scrollY = window.scrollY;
        clone.style.transform = `translateY(-${scrollY}px)`;
        clone.style.width = '100%';

        vars.forEach(v => {
            cloneWrapper.style.setProperty(v, rootStyle.getPropertyValue(v));
        });

        cloneWrapper.appendChild(clone);
        document.body.appendChild(cloneWrapper);

        // 3. Cambiar tema real al instante
        isDark.value = !isDark.value;
        document.documentElement.classList.toggle('dark', isDark.value);
        document.documentElement.classList.toggle('theme-dark', isDark.value);
        document.documentElement.classList.toggle('theme-light', !isDark.value);

        await nextTick();

        // 4. Inyección CSS manual garantizada (Orígen Top Center adaptado al scroll)
        const originX = '50%';
        const originY = scrollY + 'px';

        // Calculamos el radio exacto necesario para cubrir solo la pantalla visible
        // Si usamos porcentajes (ej. 150%) en vistas muy altas (8000px), el círculo crecerá a 12000px, 
        // tapando la pantalla en 0.1 segundos y pareciendo instantáneo.
        const maxRadius = Math.ceil(Math.hypot(window.innerWidth, window.innerHeight));

        const styleId = 'theme-transition-style';
        let styleTag = document.getElementById(styleId);
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = styleId;
            document.head.appendChild(styleTag);
        }

        styleTag.innerHTML = `
            @keyframes expand-theme-sharp {
                0% { 
                    clip-path: circle(0px at ${originX} ${originY}); 
                    -webkit-clip-path: circle(0px at ${originX} ${originY}); 
                }
                100% { 
                    clip-path: circle(${maxRadius}px at ${originX} ${originY}); 
                    -webkit-clip-path: circle(${maxRadius}px at ${originX} ${originY}); 
                }
            }
            .theme-animating-custom {
                animation: expand-theme-sharp 3s cubic-bezier(0.22, 1, 0.36, 1) both !important;
            }
        `;

        content.classList.remove('theme-animating-custom');
        void content.offsetWidth;
        content.classList.add('theme-animating-custom');

        // 5. Limpieza
        setTimeout(() => {
            content.classList.remove('theme-animating-custom');
            if (document.body.contains(cloneWrapper)) {
                document.body.removeChild(cloneWrapper);
            }
        }, 1600); // Darle margen por la animación de 1.5s
    };

    const setAccent = (name: string, hex: string) => {
        baseAccentName.value = name;
        // The hex provided by the selector is the "light mode" standard, so we store it as is.
        // The computed property will handle the inversion if name === 'black'.
        baseAccentHex.value = (name === 'black') ? '#000000' : hex;
    };

    return {
        isDark,
        toggleTheme,
        accent,
        setAccent
    };
}
