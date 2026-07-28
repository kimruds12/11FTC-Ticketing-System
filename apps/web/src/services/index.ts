// Public surface of the transport layer — the SIDE-AGNOSTIC pieces only. Import `axios`
// nowhere outside this folder (architecture.md import rules).
//
// The client entrypoints are intentionally NOT re-exported here: `server.ts` is
// `server-only` and `browser.ts` is `"use client"`, so bundling both through one barrel
// would drag the server-only module into client components. Import them directly:
//   import { serverApi } from "@/services/server";   // RSC + server actions
//   import { browserApi } from "@/services/browser";  // client thunks/hooks
export { AppError } from "./errors";
export { authService, type AuthService } from "./auth.service";
export { usersService, type UsersService } from "./users.service";
export { lookupsService, type LookupsService } from "./lookups.service";
export { ticketsService, type TicketsService } from "./tickets.service";
export { employeesService, type EmployeesService } from "./employees.service";
export { dashboardService, type DashboardService } from "./dashboard.service";
