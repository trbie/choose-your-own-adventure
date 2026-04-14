import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
}

export interface AuthState {
  status: "unknown" | "authenticated" | "anonymous";
  user: AuthUser | null;
  checkedAt: string | null;
}

const initialState: AuthState = {
  status: "unknown",
  user: null,
  checkedAt: null,
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuthUser(state, action: PayloadAction<AuthUser | null>) {
      state.user = action.payload;
      state.status = action.payload ? "authenticated" : "anonymous";
      state.checkedAt = new Date().toISOString();
    },

    setAuthUnknown(state) {
      state.status = "unknown";
      state.user = null;
      state.checkedAt = null;
    },
  },
});

export const { setAuthUser, setAuthUnknown } = authSlice.actions;
export const authReducer = authSlice.reducer;
