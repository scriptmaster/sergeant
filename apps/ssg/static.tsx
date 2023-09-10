/** @jsx h */
import { h } from 'preact';
import render from 'preact-render-to-string/jsx';
import Router from 'preact-router';
import { Home } from "./pages/home.tsx";
import { About } from "./pages/about.tsx";
import { Search } from "./pages/search.tsx";

const Foo = () => <div>foo</div>;

interface RenderRoute {
    path: string;
    app?: string;
    component?: string;
    context?: object;
    output?: string;
}

// https://www.digitalocean.com/community/tutorials/build-a-ssr-app-with-preact-unistore-and-preact-router
export function StaticApp() {
    return <Router>
        <Home path="/" />
        <About path="/about" />
        <Search path="/search/:query/:advanced?" />
    </Router>
}

export function renderRoutes(routes: RenderRoute[] = []): RenderRoute[] {
    routes = routes.map(r => {
        r.output = render(<StaticApp />, {
            path: '/about',
            location: '/about',
        }, { pretty: true })

        return r;
    });

    return routes;
}
