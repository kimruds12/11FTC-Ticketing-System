import type { AxiosInstance } from "axios";
import type { TicketStatus } from "@11ftc/shared";

/**
 * Tickets transport (M5/M3). One function per endpoint; no domain logic — the API enforces
 * the state machine, numbering, audit, and outbox.
 *
 * INTERIM TYPES: the authoritative request/response DTOs live in @11ftc/shared and are
 * added when M5 lands. The read-model shapes below are local view-models so screens can be
 * built now; replace them with the shared DTOs (do not fork validation rules).
 */
export interface TicketListItem {
  id: string;
  ticketNo: string;
  status: TicketStatus;
  mainIssueLabel: string;
  employeeName: string;
  department: string;
  createdAt: string;
}

export interface TicketListQuery {
  status?: TicketStatus;
  q?: string;
  page?: number;
}

export interface TicketListResult {
  items: TicketListItem[];
  total: number;
}

export const ticketsService = (api: AxiosInstance) => ({
  async list(query: TicketListQuery = {}): Promise<TicketListResult> {
    const { data } = await api.get<TicketListResult>("/tickets", { params: query });
    return data;
  },

  async getById(id: string): Promise<TicketListItem> {
    const { data } = await api.get<TicketListItem>(`/tickets/${id}`);
    return data;
  },

  // encode / update / transition take the M5 DTOs once they exist; typed as `unknown`
  // payloads until then so no fabricated write-contract leaks into the frontend.
  async encode(payload: unknown): Promise<TicketListItem> {
    const { data } = await api.post<TicketListItem>("/tickets", payload);
    return data;
  },

  async update(id: string, payload: unknown): Promise<TicketListItem> {
    const { data } = await api.patch<TicketListItem>(`/tickets/${id}`, payload);
    return data;
  },

  async transition(id: string, next: TicketStatus): Promise<TicketListItem> {
    const { data } = await api.post<TicketListItem>(`/tickets/${id}/transition`, { next });
    return data;
  },
});

export type TicketsService = ReturnType<typeof ticketsService>;
