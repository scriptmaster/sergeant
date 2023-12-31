/** @jsx h */
import { h } from 'preact';
///**tsx_prefx**///
import { render } from 'preact';

// import { Container, injectable, inject } from "inversify";
// @injectable()
// class Shuriken {
//     public throw() {
//         return "hit!";
//     }
// }

// DI Container

// container
import ioc from "./ioc.ts";

import App from './App.tsx';
import "./external/emeraldcss/main.scss";

// ioc.use('t', TranslationProvider);
// ioc.use('userService', UserService);
// ioc.use('carbonData', CarbonDataService);
// ioc.use('dataAdapter', HttpAdapter);

render(<App />, document.body);
