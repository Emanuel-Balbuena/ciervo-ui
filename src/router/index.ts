import { createRouter, createWebHashHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import ButtonView from '../views/ButtonView.vue';
import ButtonGroupView from '../views/ButtonGroupView.vue';
import ToggleView from '../views/ToggleView.vue';
import ToggleGroupView from '../views/ToggleGroupView.vue';
import GlimmLabView from '../views/GlimmLabView.vue';

import SliderView from '../views/SliderView.vue';
import CardView from '../views/CardView.vue';
import GsapMorphView from '../views/GsapMorphView.vue';
import ThemeSelectView from '../views/ThemeSelectView.vue';
import MenuView from '../views/MenuView.vue';

const routes = [
  {
    path: '/menu',
    name: 'menu',
    component: MenuView
  },
  {
    path: '/appearance',
    redirect: '/theme-select'
  },
  {
    path: '/theme-select',
    name: 'theme-select',
    component: ThemeSelectView
  },
  {
    path: '/pullcord',
    name: 'pullcord',
    component: () => import('../views/PullCordView.vue')
  },
  {
    path: '/select',
    name: 'select',
    component: () => import('../views/SelectView.vue')
  },
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/button',
    name: 'button',
    component: ButtonView
  },
  {
    path: '/button-group',
    name: 'button-group',
    component: ButtonGroupView
  },
  {
    path: '/toggle',
    name: 'toggle',
    component: ToggleView
  },
  {
    path: '/toggle-group',
    name: 'toggle-group',
    component: ToggleGroupView
  },
  {
    path: '/slider',
    name: 'slider',
    component: SliderView
  },
  {
    path: '/glimm-lab',
    name: 'glimm-lab',
    component: GlimmLabView
  },
  {
    path: '/modal',
    name: 'modal',
    component: GsapMorphView
  },
  {
    path: '/card',
    name: 'card',
    component: CardView
  },
  {
    path: '/gsap-morph',
    redirect: '/modal'
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  }
});

export default router;
