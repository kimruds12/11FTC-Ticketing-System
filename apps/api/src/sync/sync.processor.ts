import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger, type OnModuleInit } from "@nestjs/common";
import { Queue, type Job } from "bullmq";
import { SyncService } from "./sync.service.js";

export const SYNC_QUEUE = "sync";

/**
 * M8 — BullMQ consumer. Handles the "drain" job dispatched (post-commit) by M5, PLUS a
 * repeatable sweeper every minute so a dropped dispatch is still caught (FR-29). The outbox
 * rows + their status are the source of truth, not the queue — a lost job is harmless.
 */
@Processor(SYNC_QUEUE)
export class SyncProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(SyncProcessor.name);

  constructor(
    private readonly sync: SyncService,
    @InjectQueue(SYNC_QUEUE) private readonly queue: Queue,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    await this.queue.add(
      "drain",
      {},
      {
        repeat: { every: 60_000 },
        jobId: "sweeper",
        removeOnComplete: true,
        removeOnFail: true,
      },
    );
    this.logger.log("sync worker ready — minute sweeper scheduled");
  }

  async process(_job: Job): Promise<void> {
    await this.sync.drain();
  }
}
