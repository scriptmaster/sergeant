import { createSlice } from "https://esm.sh/@reduxjs/toolkit";

export interface CounterState {
    value: number;
};

const initialState: CounterState = {
    value: 0,
};

// const counterSlice = createSlice
const counterSlice = createSlice({
    name: 'counter',
    initialState,
    reducers: {
        incremented(state) {
            state.value++;
        }
    }
});

export const { incremented } = counterSlice.actions;
export default counterSlice.reducer;
