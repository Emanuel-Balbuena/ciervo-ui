<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ToastHost, toast } from 'super-beautiful-toast';
import { modal } from 'super-beautiful-modals';
import { Button } from './components/Button';
import { bind } from 'cuelume';

// Import required styles
import 'super-beautiful-toast/style.css';
import 'super-beautiful-modals/style.css';

onMounted(() => {
    bind(); // 👈 2. Lo ejecutas una sola vez al cargar la app
});

// 1. EL MOTOR DE TEMAS (Interruptor de estado)
const isDark = ref(true);

const toggleTheme = () => {
    isDark.value = !isDark.value;
};

// 2. LA MATRIZ DE DATOS (El principio DRY)
const colors = ['black', 'red', 'orange', 'yellow', 'lime', 'green', 'cyan', 'blue', 'violet', 'pink'];
const variants = ['framed','solid', 'soft', 'ghost', 'outline'];
const shapes = ['square', 'round'];


// 3. CONTROLADORES
const handleToast = (event: MouseEvent) => {
    toast.show({
        message: 'Hello Toast!',
        variant: 'success',
        origin: event.currentTarget as HTMLElement
    });
};

const handleModal = (event: MouseEvent) => {
    modal.open({
        title: 'Hello Modal!',
        description: 'This is a playground modal.',
        origin: event.currentTarget as HTMLElement
    });
};
</script>

<template>
    <ToastHost />

    <!-- El chasis principal lee la variable isDark y aplica la clase correspondiente -->
    <div class="playground" :class="isDark ? 'theme-dark' : 'theme-light'">
        
        <!-- BARRA DE HERRAMIENTAS SUPERIOR -->
        <header class="toolbar">
            <h1 class="title">UI System V1</h1>
            <div class="actions">
                <!-- Botón para alternar temas -->
                <Button @click="toggleTheme" variant="soft" color="black" shape="round">
                    {{ isDark ? 'Modo Claro' : 'Modo Oscuro' }}
                </Button>
                
                <Button @click="handleToast" variant="solid" color="accent" shape="square">Probar Toast</Button>
                <Button @click="handleModal" variant="outline" color="accent" shape="square">Probar Modal</Button>
            </div>
        </header>

        <!-- EL MOSAICO DE COMPONENTES GENERADO DINÁMICAMENTE -->
        <main class="matrix">
            <section v-for="color in colors" :key="color" class="color-row">
                
                <div class="row-header">
                    <h2>{{ color.toUpperCase() }}</h2>
                </div>

                <div class="button-grid">
                    <div v-for="variant in variants" :key="variant" class="variant-cell">
                        <span class="token-label">{{ variant }}</span>
                        
                        <div class="button-pair">
                            <!-- Otro bucle para renderizar el botón redondo y cuadrado lado a lado -->
                            <Button 
                                v-for="shape in shapes" 
                                :key="shape" 
                                :variant="variant" 
                                :color="color" 
                                :shape="shape"
                            >
                                Button
                            </Button>
                        </div>
                    </div>
                </div>

            </section>
        </main>
    </div>
</template>

<style scoped>
/* =========================================
   1. TRANSICIONES GLOBALES DEL ENTORNO
   ========================================= */
.playground {
    min-height: 100vh;
    padding: 40px;
    font-family: 'Instrumental Sans', sans-serif;
    /* Esto hace que el cambio de claro a oscuro sea suave (fading) */
    transition: background-color 0.3s ease, color 0.3s ease;
}

/* =========================================
   2. EL SISTEMA DE TOKENS (Temas)
   ========================================= */
.theme-dark {
    background-color: #050505;
    color: #e5e7eb;
    --cell-bg: #0a0a0a;
    --cell-border: #1a1a1a;
    --text-muted: #666666;
    --border-line: #222222;
}

.theme-light {
    background-color: #f9fafb;
    color: #111827;
    --cell-bg: #ffffff;
    --cell-border: #e5e7eb;
    --text-muted: #9ca3af;
    --border-line: #e5e7eb;
}

/* =========================================
   3. LA ARQUITECTURA DE GRID (El Layout)
   ========================================= */
.toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 24px;
    margin-bottom: 40px;
    border-bottom: 1px solid var(--border-line);
    transition: border-color 0.3s ease;
}

.title {
    font-size: 24px;
    font-weight: 600;
    margin: 0;
    letter-spacing: -0.5px;
}

.actions {
    display: flex;
    gap: 16px;
}

.color-row {
    margin-bottom: 64px;
}

.row-header h2 {
    font-size: 14px;
    color: var(--text-muted);
    letter-spacing: 2px;
    margin-bottom: 24px;
    border-left: 3px solid var(--border-line);
    padding-left: 12px;
    transition: color 0.3s ease, border-color 0.3s ease;
}

/* El gestor de mosaico matemático */
.button-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 32px;
}

.variant-cell {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 24px;
    border-radius: 12px;
    
    /* Conectado a las variables del tema actual */
    background-color: var(--cell-bg);
    border: 1px solid var(--cell-border);
    transition: background-color 0.3s ease, border-color 0.3s ease;
}

.token-label {
    font-size: 12px;
    font-weight: 500;
    text-transform: capitalize;
    color: var(--text-muted);
    transition: color 0.3s ease;
}

.button-pair {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
}
</style>