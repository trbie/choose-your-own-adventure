import { combineReducers, configureStore } from "@reduxjs/toolkit";

import { authReducer } from "@/features/auth/authSlice";
import { graphReducer } from "@/features/graph/graphSlice";
import { prefsReducer } from "@/features/prefs/prefsSlice";
import { uiReducer } from "@/features/ui/uiSlice";

const rootReducer = combineReducers({
  auth: authReducer,
  graph: graphReducer,
  ui: uiReducer,
  prefs: prefsReducer,
});

export function makeStore() {
  return configureStore({
    reducer: rootReducer,
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = AppStore["dispatch"];
