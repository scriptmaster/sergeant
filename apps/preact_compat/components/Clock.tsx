import React, { Component } from "react";

export class Clock extends Component {
    state = {time: Date.now()};
    timer = 0;

    componentDidMount() {
        this.timer = setInterval(() => {
            this.setState({ time: Date.now() });
        }, 1000);
    }

    // Called just before our component will be destroyed
    componentWillUnmount() {
        // stop when not renderable
        clearInterval(this.timer);
    }
    
    render() {
        const time = new Date(this.state.time).toLocaleTimeString();
        return <span>{time}</span>;
    }
}
