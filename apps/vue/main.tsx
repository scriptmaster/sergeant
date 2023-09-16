import { createApp } from "vue";
import App from "./App.vue";
import "../scss/main.scss";

createApp({
  components: {
    "app": App,
  },
}).mount("#app");
