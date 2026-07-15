import { Injectable } from "@nestjs/common";

/**
 * M8 — Sync Worker (read side). Empty service (scaffold). Must never block encoding and
 * never write to the wrong row. Idempotent; one-way only. See
 * docs/implementation/M8-sync-worker.md.
 */
@Injectable()
export class SyncService {}
