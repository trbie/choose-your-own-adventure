import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface AuthorPrefs {
  inspectorWidth: number;
  lastOpenedGraphId: string | null;
  autoLayoutDirection: "LR" | "TB";
}

export interface PrefsState {
  author: AuthorPrefs;
}

const initialState: PrefsState = {
  author: {
    inspectorWidth: 360,
    lastOpenedGraphId: null,
    autoLayoutDirection: "LR",
  },
};

function clampInspectorWidth(value: number): number {
  return Math.max(260, Math.min(760, value));
}

export const prefsSlice = createSlice({
  name: "prefs",
  initialState,
  reducers: {
    hydratePrefs(state, action: PayloadAction<Partial<PrefsState>>) {
      const author = action.payload.author;
      if (!author) return;

      if (typeof author.inspectorWidth === "number") {
        state.author.inspectorWidth = clampInspectorWidth(author.inspectorWidth);
      }

      if (typeof author.lastOpenedGraphId === "string" || author.lastOpenedGraphId === null) {
        state.author.lastOpenedGraphId = author.lastOpenedGraphId;
      }

      if (author.autoLayoutDirection === "LR" || author.autoLayoutDirection === "TB") {
        state.author.autoLayoutDirection = author.autoLayoutDirection;
      }
    },

    setInspectorWidth(state, action: PayloadAction<number>) {
      state.author.inspectorWidth = clampInspectorWidth(action.payload);
    },

    setLastOpenedGraphId(state, action: PayloadAction<string | null>) {
      state.author.lastOpenedGraphId = action.payload;
    },

    setAutoLayoutDirection(state, action: PayloadAction<"LR" | "TB">) {
      state.author.autoLayoutDirection = action.payload;
    },
  },
});

export const { hydratePrefs, setInspectorWidth, setLastOpenedGraphId, setAutoLayoutDirection } =
  prefsSlice.actions;

export const prefsReducer = prefsSlice.reducer;
