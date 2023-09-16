import React, { Component } from 'react';
import { CounterState } from "../features/couter/slice.ts";

// interface CounterState {
//   value: number;
// }

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
      </div>
    );
  }
}
