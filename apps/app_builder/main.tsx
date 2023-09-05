import { BrowserRouter, React, ReactDOM } from "../deps.react.ts";
import App from "./App.tsx";

ReactDOM.render(<BrowserRouter><App /></BrowserRouter>,
  document.getElementsByTagName('main')[0]);
