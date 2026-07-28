import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../config/env.js";
import { NumberingService } from "./numbering.service.js";

/**
 * M3 — Ticket Numbering. THE HIGHEST-RISK MODULE. Allocates via atomic ON CONFLICT upsert
 * inside the caller's transaction; never SELECT MAX()+1. See .claude/rules/numbering.md.
 *
 * The scope (`date` | `year`) comes from `TICKET_NUMBER_SCOPE` (OPEN-1) and is injected into
 * the service constructor — the same shape the concurrency test constructs directly.
 */
@Module({
  providers: [
    {
      provide: NumberingService,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        new NumberingService(config.get("TICKET_NUMBER_SCOPE", { infer: true })),
    },
  ],
  exports: [NumberingService],
})
export class NumberingModule {}
