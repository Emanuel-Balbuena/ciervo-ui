import { createRouter, createWebHashHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import ButtonView from '../views/ButtonView.vue';
import ButtonGroupView from '../views/ButtonGroupView.vue';
import ToggleView from '../views/ToggleView.vue';
import ToggleGroupView from '../views/ToggleGroupView.vue';
import GlimmLabView from '../views/GlimmLabView.vue';

import SliderView from '../views/SliderView.vue';
import ModalView from '../views/ModalView.vue';
import CardView from '../views/CardView.vue';
import GsapMorphView from '../views/GsapMorphView.vue';

const routes = [
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
    component: ModalView
  },
  {
    path: '/card',
    name: 'card',
    component: CardView
  },
  {
    path: '/gsap-morph',
    name: 'gsap-morph',
    component: GsapMorphView
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
