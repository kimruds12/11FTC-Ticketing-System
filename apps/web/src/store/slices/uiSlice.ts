import { createSlice, nanoid, type PayloadAction } from "@reduxjs/toolkit";

/**
 * Purely presentational client state: toasts and which global modal is open. No server
 * data, no domain rules.
 */
export interface Toast {
  id: string;
  kind: "success" | "error" | "info";
  message: string;
}

export interface UiState {
  toasts: Toast[];
  openModal: string | null;
}

const initialState: UiState = {
  toasts: [],
  openModal: null,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    pushToast: {
      reducer(state, action: PayloadAction<Toast>) {
        state.toasts.push(action.payload);
      },
      prepare(input: Omit<Toast, "id">) {
        return { payload: { id: nanoid(), ...input } };
      },
    },
    dismissToast(state, action: PayloadAction<string>) {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },
    openModal(state, action: PayloadAction<string>) {
      state.openModal = action.payload;
    },
    closeModal(state) {
      state.openModal = null;
    },
  },
});

export const { pushToast, dismissToast, openModal, closeModal } = uiSlice.actions;
export const uiReducer = uiSlice.reducer;
