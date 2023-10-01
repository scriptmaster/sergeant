/** @jsx h */
import { h } from 'preact';
//*-*-*-*-*-*-*-*-*-*-*-*-*-*- AUTO_GENERATED_PREFIX *-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-//
import { Counter } from './components/Counter.tsx';
import { Clock } from './components/Clock.tsx';
import Router from 'preact-router';
import { Home } from "./pages/home.tsx";
import { About } from "./pages/about.tsx";
import { Search } from "./pages/search.tsx";

export default function App(props: {url?:string}) {
    return <Router url={props.url}>
        <Home path="/" />
        <About path="/about" />
        <Search path="/search/:query/:advanced?" />
    </Router>;
}

// export function BrowserLayout(props: any) {
//     return <div className="container">
//         {props.children}
//     </div>;
// }
