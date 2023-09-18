/// <reference types="./shim-vue.d.ts" />
import { createApp } from "vue";
import "../scss/main.scss";

import Counter from "./Counter.vue";
import App from "./App.vue";

const app = createApp(App)

app.component('Counter', Counter);

app.mount('#app');
