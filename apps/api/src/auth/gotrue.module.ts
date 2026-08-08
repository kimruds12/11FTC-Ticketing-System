import { Module } from "@nestjs/common";
import { GoTrueAdminService } from "./gotrue-admin.service.js";

/**
 * The GoTrue admin client, on its own so it can be shared without a cycle.
 *
 * `MasterDataModule` needs it to provision accounts; `AuthModule` needs `UsersService` from
 * `MasterDataModule` to serve `POST /me/password`. Leaving this service inside `AuthModule`
 * would make those two import each other and force a `forwardRef` — a circular graph kept
 * alive by a workaround. A leaf module both can import is the honest shape.
 */
@Module({
  providers: [GoTrueAdminService],
  exports: [GoTrueAdminService],
})
export class GoTrueModule {}
