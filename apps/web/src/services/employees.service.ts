import type { AxiosInstance } from "axios";

/**
 * Employees transport (M4/M2). Powers the match-first typeahead on the encode form.
 * De-duplication (normalizeName + unique index) is enforced server-side — this only
 * surfaces matches and forwards a create request.
 *
 * INTERIM TYPES: replace with the M4 DTOs from @11ftc/shared when they exist.
 */
export interface EmployeeMatch {
  id: string;
  name: string;
  department: string;
}

export const employeesService = (api: AxiosInstance) => ({
  async search(q: string): Promise<EmployeeMatch[]> {
    const { data } = await api.get<EmployeeMatch[]>("/employees/search", { params: { q } });
    return data;
  },

  async create(payload: unknown): Promise<EmployeeMatch> {
    const { data } = await api.post<EmployeeMatch>("/employees", payload);
    return data;
  },
});

export type EmployeesService = ReturnType<typeof employeesService>;
