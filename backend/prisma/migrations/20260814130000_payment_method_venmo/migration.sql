-- AlterEnum
-- Add the active Venmo payment rail, plus the legacy `paypal` label the Prisma schema still
-- declares for historical Payment rows.
--
-- No positional clause: this previously read `BEFORE 'paypal'`, but the initial migration creates
-- PaymentMethod as ('stripe', 'clover', 'manual_venmo', 'manual_paypal') — there is no 'paypal' to
-- anchor to, so `migrate deploy` failed on any fresh database with 22023 "not an existing enum
-- label". Enum ordering only affects sorting, which nothing here relies on, so the values are
-- simply appended. Both are IF NOT EXISTS, so this is a no-op on the live database where the
-- labels already exist.
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'venmo';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'paypal';
