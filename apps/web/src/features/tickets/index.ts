/**
 * Public surface of the tickets feature-slice. Other layers import from here, never from
 * internal files. Server Actions are imported directly from "./actions" (they are the
 * mutation entrypoints); this barrel exposes the client-state surface.
 *
 * Guides: encode.md, queue.md, detail.md.
 */
export {
  setStatusFilter,
  setSearch,
  setPage,
  resetFilters,
  ticketFiltersReducer,
} from "./store/ticketFiltersSlice.js";
export type { StatusFilter, TicketFiltersState } from "./store/ticketFiltersSlice.js";
