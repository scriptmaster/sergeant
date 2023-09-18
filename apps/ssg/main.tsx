import { render } from 'preact';
import React from 'react';

// import { Container, injectable, inject } from "inversify";
// @injectable()
// class Shuriken {
//     public throw() {
//         return "hit!";
//     }
// }

// DI Container

import App from './App.tsx';
import "../scss/main.scss";

render(<App />, document.body);
