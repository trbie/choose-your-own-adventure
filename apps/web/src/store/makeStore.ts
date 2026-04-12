import { combineReducers, configureStore } from "@reduxjs/toolkit";

import { graphReducer } from "@/features/graph/graphSlice";

const rootReducer = combineReducers({
  graph: graphReducer,
});

export function makeStore() {
  return configureStore({
    reducer: rootReducer,
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = AppStore["dispatch"];
