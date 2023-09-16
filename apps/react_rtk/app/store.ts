// import { configureStore } from "https://esm.sh/v132/@reduxjs/toolkit@1.9.5/dist/configureStore.js";
import { configureStore } from "https://esm.sh/@reduxjs/toolkit@1.9.5";
import reducer from "../features/couter/slice.ts";

console.log(reducer);

export const store = configureStore({
    reducer: {
        counter: reducer
    },
})

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
