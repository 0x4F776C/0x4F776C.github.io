import { defineComponent } from 'vue';
import setupApp from './App.js';
import AppTemplate from './App.html?raw';

export default defineComponent({
  template: AppTemplate,
  setup() {
    return setupApp();
  }
});