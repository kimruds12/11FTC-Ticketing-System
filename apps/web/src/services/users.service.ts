import type { AxiosInstance } from "axios";
import type { InviteUserDto, UpdateUserDto, UserDto } from "@11ftc/shared";

/**
 * System Users transport (M2). Admin-only on the API. Inviting pre-authorizes a Gmail on the
 * allowlist (ADR-0013); the account materializes on the invitee's first Google sign-in.
 */
export const usersService = (api: AxiosInstance) => ({
  async list(): Promise<UserDto[]> {
    const { data } = await api.get<UserDto[]>("/users");
    return data;
  },

  async invite(dto: InviteUserDto): Promise<UserDto> {
    const { data } = await api.post<UserDto>("/users/invite", dto);
    return data;
  },

  async update(id: string, dto: UpdateUserDto): Promise<UserDto> {
    const { data } = await api.patch<UserDto>(`/users/${id}`, dto);
    return data;
  },
});

export type UsersService = ReturnType<typeof usersService>;
