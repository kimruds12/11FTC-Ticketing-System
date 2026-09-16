import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { NotificationsController } from "./notifications.controller.js";

@Module({
  imports: [DatabaseModule],
  controllers: [NotificationsController],
})
export class NotificationsModule {}
