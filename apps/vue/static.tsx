import { createSSRApp } from 'vue'
import { renderToString } from 'https://esm.sh/vue/server-renderer';

import App from "./App.vue";
// import "../scss/main.scss";

const app = createSSRApp(App)

const __VUE_OPTIONS_API__ = false;

export async function renderRoutes(routes: RenderRoute[] = []) {
    for await (const r of routes) {
        const ctx = {
        };
        r.output = await renderToString(app, ctx);
    }

    // console.log(routes);

    return routes;
}










interface RenderRoute {
    path: string;
    app?: string;
    component?: string;
    context?: object;
    output?: string;
}

