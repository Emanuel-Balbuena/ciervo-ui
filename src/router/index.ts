import { createRouter, createWebHashHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import ButtonView from '../views/ButtonView.vue';
import ButtonGroupView from '../views/ButtonGroupView.vue';
import ToggleView from '../views/ToggleView.vue';
import ToggleGroupView from '../views/ToggleGroupView.vue';
import GlimmLabView from '../views/GlimmLabView.vue';

import SliderView from '../views/SliderView.vue';

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
