import type { AxiosInstance } from "axios";
import type {
  CreateDepartmentDto,
  CreateMainIssueDto,
  DepartmentDto,
  MainIssueDto,
  UpdateDepartmentDto,
  UpdateMainIssueDto,
} from "@11ftc/shared";

/**
 * Lookups transport (M2) — departments + main-issue categories. Reads power dropdowns (encode
 * form, filters) and are open to any authenticated user; writes are admin-only on the API.
 */
export const lookupsService = (api: AxiosInstance) => ({
  async listDepartments(): Promise<DepartmentDto[]> {
    const { data } = await api.get<DepartmentDto[]>("/departments");
    return data;
  },
  async createDepartment(dto: CreateDepartmentDto): Promise<DepartmentDto> {
    const { data } = await api.post<DepartmentDto>("/departments", dto);
    return data;
  },
  async updateDepartment(id: string, dto: UpdateDepartmentDto): Promise<DepartmentDto> {
    const { data } = await api.patch<DepartmentDto>(`/departments/${id}`, dto);
    return data;
  },

  async listMainIssues(): Promise<MainIssueDto[]> {
    const { data } = await api.get<MainIssueDto[]>("/main-issues");
    return data;
  },
  async createMainIssue(dto: CreateMainIssueDto): Promise<MainIssueDto> {
    const { data } = await api.post<MainIssueDto>("/main-issues", dto);
    return data;
  },
  async updateMainIssue(id: string, dto: UpdateMainIssueDto): Promise<MainIssueDto> {
    const { data } = await api.patch<MainIssueDto>(`/main-issues/${id}`, dto);
    return data;
  },
});

export type LookupsService = ReturnType<typeof lookupsService>;
