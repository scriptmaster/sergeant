import { createApp } from "vue";

import "../scss/main.scss";
import Counter from "./Counter.vue";
import App from "./App.vue";


const app = createApp(App)

app.component('counter', Counter);

app.mount('#app');
