-- Clears a stuck Prisma migration row (common cause of P3009).
-- This app syncs the schema in production with `prisma db push`, not `migrate deploy`.
-- Safe to re-run: deleting a missing row is a no-op.
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20260425_postgres_init';
