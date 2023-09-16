import * as React from 'react';
import Header from './components/Header.tsx';
import { Counter } from "./components/Counter.tsx";

export default function App() {
    return <>
        <Header></Header>
        <main>
            Main
            <Counter />
        </main>
        <footer>

        </footer>
    </>;
}
