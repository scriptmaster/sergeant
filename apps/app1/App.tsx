import { h } from 'preact';
import { Counter } from './components/Counter.tsx';
import { Clock } from './components/Clock.tsx';

export default function App() {
    return <div>
        <h1>App Comp!!</h1>
        <Counter />
        <Clock />
    </div>;
}
