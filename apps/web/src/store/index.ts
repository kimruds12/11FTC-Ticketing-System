import { configureStore } from "@reduxjs/toolkit";
import { authReducer } from "./slices/authSlice";
import { uiReducer } from "./slices/uiSlice";
import { ticketFiltersReducer } from "@/features/tickets/store/ticketFiltersSlice";

/**
 * Store composition root. This is the one place allowed to reach into feature-slices for
 * their reducers (like `app/` is allowed to import features) — features never import each
 * other. `makeStore` is a factory so each request/render gets a fresh store, which is the
 * correct pattern for the Next App Router (no shared server state across requests).
 *
 * Only CLIENT state lives here — auth mirror, UI, queue filters. Server data (tickets,
 * employees, dashboard) is fetched in Server Components, never cached in Redux.
 */
export const makeStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      ui: uiReducer,
      ticketFilters: ticketFiltersReducer,
    },
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
