import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { store } from './app/store.ts';
//import { createRoot } from 'https://esm.sh/react-dom@18.2.0/client?prod';

import App from './App.tsx';
//import "../../vendor/github.com/primer-css/src/core/index.scss"
import "../scss/main.scss";

// ReactDOM.render(
//     <App />
// , document.getElementsByTagName('main')[0]);

// ReactDOM.render(
//     <App />
// , document.getElementsByTagName('main')[0]);

ReactDOM.render(<React.StrictMode>
    <Provider store={store}>
        <App />
    </Provider>
</React.StrictMode>, document.getElementById('#root'));

// const mount = document.createElement('div');
// //const mount = document.createDocumentFragment();
// const root = createRoot(mount); 
// root.render(<App />);
// document.body.prepend(mount);
