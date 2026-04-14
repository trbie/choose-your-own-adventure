import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface UiState {
  isInspectorOpen: boolean;
  isInspectorSettingsOpen: boolean;
  isToolbarSearchOpen: boolean;
}

const initialState: UiState = {
  isInspectorOpen: true,
  isInspectorSettingsOpen: false,
  isToolbarSearchOpen: false,
};

export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    setInspectorOpen(state, action: PayloadAction<boolean>) {
      state.isInspectorOpen = action.payload;
    },

    setInspectorSettingsOpen(state, action: PayloadAction<boolean>) {
      state.isInspectorSettingsOpen = action.payload;
    },

    setToolbarSearchOpen(state, action: PayloadAction<boolean>) {
      state.isToolbarSearchOpen = action.payload;
    },
  },
});

export const { setInspectorOpen, setInspectorSettingsOpen, setToolbarSearchOpen } = uiSlice.actions;

export const uiReducer = uiSlice.reducer;
