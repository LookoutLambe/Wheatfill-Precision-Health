-- AlterEnum
-- Add the active Venmo payment rail. Historical values (paypal, clover, manual_*) are kept for
-- DB compatibility with existing Payment rows. Safe to re-run: IF NOT EXISTS.
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'venmo' BEFORE 'paypal';
