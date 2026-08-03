import type { AxiosInstance } from "axios";
import type {
  AssignTicketDto,
  CloseTicketDto,
  EncodeTicketDto,
  TicketDetailDto,
  TicketDto,
  TicketListQuery,
  TicketListResult,
  UpdateTicketDto,
} from "@11ftc/shared";

/**
 * Tickets transport (M5 lifecycle + M6 history). One function per endpoint; no domain logic —
 * the API owns the transaction boundary, numbering, the state machine, audit, and the outbox.
 *
 * There is deliberately NO generic `transition()`: the API models state changes as three
 * distinct endpoints (`assign`, `ongoing`, `close`), and Closed is terminal (FR-8), so no
 * reopen call exists to write. An illegal transition comes back as 409.
 */

/** Filters are all optional over the wire; the API applies `limit`/`offset` defaults. */
export type TicketListParams = Partial<TicketListQuery>;

export const ticketsService = (api: AxiosInstance) => ({
  async list(params: TicketListParams = {}): Promise<TicketListResult> {
    const { data } = await api.get<TicketListResult>("/tickets", { params });
    return data;
  },

  /** Detail carries the M6 audit trail in `history`. */
  async getById(id: string): Promise<TicketDetailDto> {
    const { data } = await api.get<TicketDetailDto>(`/tickets/${id}`);
    return data;
  },

  async encode(payload: EncodeTicketDto): Promise<TicketDto> {
    const { data } = await api.post<TicketDto>("/tickets", payload);
    return data;
  },

  /** Field corrections only (FR-9). Status and assignment have their own endpoints. */
  async update(id: string, payload: UpdateTicketDto): Promise<TicketDto> {
    const { data } = await api.patch<TicketDto>(`/tickets/${id}`, payload);
    return data;
  },

  async assign(id: string, payload: AssignTicketDto): Promise<TicketDto> {
    const { data } = await api.post<TicketDto>(`/tickets/${id}/assign`, payload);
    return data;
  },

  async markOngoing(id: string): Promise<TicketDto> {
    const { data } = await api.post<TicketDto>(`/tickets/${id}/ongoing`, {});
    return data;
  },

  async close(id: string, payload: CloseTicketDto = {}): Promise<TicketDto> {
    const { data } = await api.post<TicketDto>(`/tickets/${id}/close`, payload);
    return data;
  },
});

export type TicketsService = ReturnType<typeof ticketsService>;
