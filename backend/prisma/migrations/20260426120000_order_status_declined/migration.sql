-- AlterEnum: provider workflow — decline an order without treating it as fulfilled/closed
ALTER TYPE "OrderStatus" ADD VALUE 'declined';
