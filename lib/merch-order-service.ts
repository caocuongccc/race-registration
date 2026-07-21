import { randomBytes, randomInt } from "crypto";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export function createMerchPublicCode() {
  return `TTE${randomBytes(5).toString("hex").toUpperCase()}`;
}

export function createMerchSecretCode() {
  return randomInt(100000, 1000000).toString();
}

export function hashMerchSecretCode(code: string) {
  return hash(code, 12);
}

export function normalizeMerchLookup(value: string) {
  const trimmed = value.trim().toLowerCase();
  return trimmed.includes("@") ? trimmed : trimmed.replace(/\D/g, "");
}

export async function confirmMerchOrderPayment(input: {
  publicCode: string;
  transactionId: string;
  amount: number;
  paymentMethod: string;
  webhookData?: unknown;
}) {
  const order = await prisma.merchOrder.findUnique({
    where: { publicCode: input.publicCode.toUpperCase() },
    include: { campaign: true, items: true },
  });
  if (!order) throw new Error(`Merch order not found: ${input.publicCode}`);
  if (order.paymentStatus === "PAID") return order;

  const duplicate = await prisma.payment.findUnique({ where: { transactionId: input.transactionId } });
  if (duplicate) {
    if (duplicate.merchOrderId !== order.id) {
      throw new Error("Transaction " + input.transactionId + " was already assigned to another order");
    }
    return prisma.merchOrder.findUniqueOrThrow({
      where: { id: order.id },
      include: { campaign: true, items: true },
    });
  }
  if (input.amount + 1000 < order.totalAmount) {
    throw new Error(`Payment amount ${input.amount} is less than required ${order.totalAmount}`);
  }

  await prisma.$transaction(async (tx) => {
    const fresh = await tx.merchOrder.findUnique({ where: { id: order.id }, include: { items: true } });
    if (!fresh || fresh.paymentStatus === "PAID") return;
    for (const item of fresh.items) {
      const variant = await tx.merchShirtVariant.findUnique({ where: { id: item.variantId } });
      if (!variant || variant.reservedQuantity < item.quantity) {
        throw new Error(`Reserved stock is invalid for ${item.variantId}`);
      }
      await tx.merchShirtVariant.update({
        where: { id: item.variantId },
        data: { reservedQuantity: { decrement: item.quantity }, soldQuantity: { increment: item.quantity } },
      });
    }
    await tx.merchOrder.update({
      where: { id: fresh.id },
      data: { paymentStatus: "PAID", paymentDate: new Date() },
    });
    await tx.payment.create({
      data: {
        merchOrderId: fresh.id,
        purpose: "MERCH_ORDER",
        transactionId: input.transactionId,
        amount: input.amount,
        status: "PAID",
        paymentMethod: input.paymentMethod,
        webhookData: input.webhookData as any,
      },
    });
  });

  return prisma.merchOrder.findUniqueOrThrow({
    where: { id: order.id },
    include: { campaign: true, items: true },
  });
}
