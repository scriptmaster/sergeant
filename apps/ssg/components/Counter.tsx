import { h, Component } from "preact";
import { Clock } from './Clock.tsx';

interface CounterState {
  value: number;
}

export class Counter extends Component {
  state: CounterState = {
    value: 0
  };

  increment = () => {
    this.setState((prev: CounterState) => ({ value: prev.value +1 }));
  };

  render() {
    return (
      <div>
        <p>Counter: {this.state.value}</p>
        <button onClick={this.increment}>Increment</button>
        <Clock />
      </div>
    );
  }
}