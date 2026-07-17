"use client";
import { useState, type ReactNode } from "react";
import { Provider } from "react-redux";
import { makeStore } from "./index";

/**
 * Mounts the Redux store on the client. The lazy `useState` initializer runs once, so the
 * store is created a single time per client and survives re-renders (the correct Next App
 * Router pattern — a fresh store per client, never shared across server requests).
 */
export function StoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(makeStore);
  return <Provider store={store}>{children}</Provider>;
}
