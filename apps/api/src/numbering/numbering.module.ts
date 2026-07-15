import { Module } from "@nestjs/common";
import { NumberingService } from "./numbering.service.js";

/**
 * M3 — Ticket Numbering. THE HIGHEST-RISK MODULE. Allocates via atomic ON CONFLICT
 * upsert inside the caller's transaction; never SELECT MAX()+1. See
 * .claude/rules/numbering.md and docs/implementation/M3-numbering.md.
 * Write test:concurrency BEFORE implementing this.
 */
@Module({
  providers: [NumberingService],
  exports: [NumberingService],
})
export class NumberingModule {}
