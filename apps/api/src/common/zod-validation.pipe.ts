import { BadRequestException, type PipeTransform } from "@nestjs/common";
import type { ZodType } from "zod";

/**
 * Validates a request payload against a Zod schema — the SAME schemas in `@11ftc/shared`
 * the web app validates its forms with, so the contract is enforced identically on both
 * sides. A parse failure becomes a 400 with field-level messages.
 *
 *   @Body(new ZodValidationPipe(inviteUserSchema)) dto: InviteUserDto
 */
export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(
        result.error.issues.map((i) => ({
          path: i.path.join(".") || "(root)",
          message: i.message,
        })),
      );
    }
    return result.data;
  }
}
