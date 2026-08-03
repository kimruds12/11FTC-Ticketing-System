import type { AxiosInstance } from "axios";
import type {
  CreateTechnicianDto,
  TechnicianDto,
  UpdateTechnicianDto,
} from "@11ftc/shared";

/**
 * Technicians transport (ADR-0017) — the IT people who HANDLE tickets. Not accounts: listing
 * and search are open to any authenticated user, which is why assignment now works for IT
 * Staff. (It used to read the admin-only `/users`, so the dropdown was simply empty for them.)
 *
 * The encode form needs no `create` call — the API resolve-or-creates from the names it sends,
 * inside the encode transaction. `create` here is for the admin directory screen.
 */
export const techniciansService = (api: AxiosInstance) => ({
  async list(includeInactive = false): Promise<TechnicianDto[]> {
    const { data } = await api.get<TechnicianDto[]>("/technicians", {
      params: includeInactive ? { includeInactive: "true" } : undefined,
    });
    return data;
  },

  async search(q: string): Promise<TechnicianDto[]> {
    const { data } = await api.get<TechnicianDto[]>("/technicians/search", {
      params: { q },
    });
    return data;
  },

  async create(dto: CreateTechnicianDto): Promise<TechnicianDto> {
    const { data } = await api.post<TechnicianDto>("/technicians", dto);
    return data;
  },

  async update(id: string, dto: UpdateTechnicianDto): Promise<TechnicianDto> {
    const { data } = await api.patch<TechnicianDto>(`/technicians/${id}`, dto);
    return data;
  },
});

export type TechniciansService = ReturnType<typeof techniciansService>;
