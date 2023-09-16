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

export function StaticApp(props: {url:string}) {
    return <Router url={props.url}>
        <Home path="/" />
        <About path="/about" />
        <Search path="/search/:query/:advanced?" />
    </Router>
}

export function renderRoutes(routes: RenderRoute[] = []): RenderRoute[] {
    routes = routes.map(r => {
        r.output = render(<StaticApp url={r.path} />, {}, { pretty: true })
        return r;
    });

    return routes;
}
