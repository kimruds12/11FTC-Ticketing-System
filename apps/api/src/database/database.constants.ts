/**
 * DI tokens for the database layer.
 * - `DATABASE`      → the Drizzle `Db` handle. Inject with `@Inject(DATABASE) db: Db`.
 * - `DB_CONNECTION` → the `{ db, pool }` pair; internal, used only for pool shutdown.
 */
export const DATABASE = Symbol("DATABASE");
export const DB_CONNECTION = Symbol("DB_CONNECTION");
