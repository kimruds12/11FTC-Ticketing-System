import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { TicketStatus } from "@11ftc/shared";

/**
 * CLIENT state for the ticket queue: which filter/search/page is active. This is UI state,
 * NOT ticket data — the tickets themselves are read in a Server Component and revalidated
 * after mutations (architecture.md, pattern 1). Lives in the tickets feature-slice;
 * registered in the store composition root (src/store/index.ts).
 */
export type StatusFilter = TicketStatus | "ALL";

export interface TicketFiltersState {
  status: StatusFilter;
  search: string;
  page: number;
}

const initialState: TicketFiltersState = {
  status: "ALL",
  search: "",
  page: 1,
};

const ticketFiltersSlice = createSlice({
  name: "ticketFilters",
  initialState,
  reducers: {
    setStatusFilter(state, action: PayloadAction<StatusFilter>) {
      state.status = action.payload;
      state.page = 1;
    },
    setSearch(state, action: PayloadAction<string>) {
      state.search = action.payload;
      state.page = 1;
    },
    setPage(state, action: PayloadAction<number>) {
      state.page = action.payload;
    },
    resetFilters() {
      return initialState;
    },
  },
});

export const { setStatusFilter, setSearch, setPage, resetFilters } =
  ticketFiltersSlice.actions;
export const ticketFiltersReducer = ticketFiltersSlice.reducer;
