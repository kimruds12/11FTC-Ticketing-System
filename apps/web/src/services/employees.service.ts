import type { AxiosInstance } from "axios";
import type { CreateEmployeeDto, EmployeeDto, UpdateEmployeeDto } from "@11ftc/shared";

/**
 * Employees transport (M2 directory + M4 match-first search). An Employee is the person who
 * REPORTED a ticket — a directory entry, not an account (ADR-0013).
 *
 * De-duplication (normalizeName + the unique index) is enforced server-side; `search` only
 * surfaces existing matches so the encoder picks one instead of creating a near-duplicate. The
 * encode form itself needs no create call — the API resolve-or-creates from `employeeName`.
 */
export const employeesService = (api: AxiosInstance) => ({
  async list(includeInactive = false): Promise<EmployeeDto[]> {
    const { data } = await api.get<EmployeeDto[]>("/employees", {
      params: includeInactive ? { includeInactive: "true" } : undefined,
    });
    return data;
  },

  async search(q: string): Promise<EmployeeDto[]> {
    const { data } = await api.get<EmployeeDto[]>("/employees/search", { params: { q } });
    return data;
  },

  async create(dto: CreateEmployeeDto): Promise<EmployeeDto> {
    const { data } = await api.post<EmployeeDto>("/employees", dto);
    return data;
  },

  /** Corrections and retirement. There is no delete — `isActive: false` retires (FR-9). */
  async update(id: string, dto: UpdateEmployeeDto): Promise<EmployeeDto> {
    const { data } = await api.patch<EmployeeDto>(`/employees/${id}`, dto);
    return data;
  },
});

export type EmployeesService = ReturnType<typeof employeesService>;
