import type { AxiosInstance } from "axios";
import type {
  InviteUserDto,
  InvitedUserDto,
  ResetPasswordDto,
  UpdateUserDto,
  UserDto,
} from "@11ftc/shared";

/**
 * System Users transport (M2). Admin-only on the API.
 *
 * Inviting creates the allowlist row AND the sign-in account (ADR-0018), returning the
 * generated password once — there is no mail server on the internal deployment to send it,
 * and it cannot be read back.
 */
export const usersService = (api: AxiosInstance) => ({
  async list(): Promise<UserDto[]> {
    const { data } = await api.get<UserDto[]>("/users");
    return data;
  },

  async invite(dto: InviteUserDto): Promise<InvitedUserDto> {
    const { data } = await api.post<InvitedUserDto>("/users/invite", dto);
    return data;
  },

  /** Admin reset. Returns the new password once, on the same terms as invite. */
  async resetPassword(id: string, dto: ResetPasswordDto = {}): Promise<InvitedUserDto> {
    const { data } = await api.post<InvitedUserDto>(`/users/${id}/reset-password`, dto);
    return data;
  },

  async update(id: string, dto: UpdateUserDto): Promise<UserDto> {
    const { data } = await api.patch<UserDto>(`/users/${id}`, dto);
    return data;
  },
});

export type UsersService = ReturnType<typeof usersService>;
