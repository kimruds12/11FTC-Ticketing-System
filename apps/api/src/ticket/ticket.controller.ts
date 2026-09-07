import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import {
  assignTicketSchema,
  bulkEncodeTicketSchema,
  closeTicketSchema,
  encodeTicketSchema,
  ticketListQuerySchema,
  updateTicketSchema,
  type AssignTicketDto,
  type AuthContext,
  type BulkEncodeTicketDto,
  type CloseTicketDto,
  type EncodeTicketDto,
  type TicketDetailDto,
  type TicketDto,
  type TicketListQuery,
  type TicketListResult,
  type UpdateTicketDto,
} from "@11ftc/shared";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { ZodValidationPipe } from "../common/zod-validation.pipe.js";
import { TicketService } from "./ticket.service.js";

/**
 * M5 — Ticket HTTP surface. Both IT roles may act (§3.3); the global AuthGuard requires a
 * session. An illegal state transition is a **409** from the domain layer (the request was
 * well-formed, the state said no), not a 400.
 */
@Controller({ path: "tickets", version: "1" })
export class TicketController {
  constructor(private readonly tickets: TicketService) {}

  @Post()
  encode(
    @Body(new ZodValidationPipe(encodeTicketSchema)) dto: EncodeTicketDto,
    @CurrentUser() user: AuthContext,
  ): Promise<TicketDto> {
    return this.tickets.encode(dto, user);
  }

  /**
   * FR-39 — encode a batch atomically. Declared before any `:id` route so the literal
   * segment can never be read as a ticket id.
   */
  @Post("bulk")
  encodeBulk(
    @Body(new ZodValidationPipe(bulkEncodeTicketSchema)) dto: BulkEncodeTicketDto,
    @CurrentUser() user: AuthContext,
  ): Promise<TicketDto[]> {
    return this.tickets.encodeBulk(dto.tickets, user);
  }

  @Get()
  list(
    @Query(new ZodValidationPipe(ticketListQuerySchema)) query: TicketListQuery,
  ): Promise<TicketListResult> {
    return this.tickets.list(query);
  }

  @Get(":id")
  detail(@Param("id") id: string): Promise<TicketDetailDto> {
    return this.tickets.getDetail(id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateTicketSchema)) dto: UpdateTicketDto,
    @CurrentUser() user: AuthContext,
  ): Promise<TicketDto> {
    return this.tickets.update(id, dto, user);
  }

  @Post(":id/assign")
  assign(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(assignTicketSchema)) dto: AssignTicketDto,
    @CurrentUser() user: AuthContext,
  ): Promise<TicketDto> {
    return this.tickets.assign(id, dto, user);
  }

  @Post(":id/ongoing")
  ongoing(
    @Param("id") id: string,
    @CurrentUser() user: AuthContext,
  ): Promise<TicketDto> {
    return this.tickets.markOngoing(id, user);
  }

  @Post(":id/close")
  close(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(closeTicketSchema)) dto: CloseTicketDto,
    @CurrentUser() user: AuthContext,
  ): Promise<TicketDto> {
    return this.tickets.close(id, dto, user);
  }
}
