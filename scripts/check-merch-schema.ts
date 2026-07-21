import { prisma } from "../lib/prisma";

async function main() {
  const columns = await prisma.$queryRaw<
    Array<{ table_name: string; column_name: string }>
  >`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('merch_campaigns', 'merch_orders', 'payments')
      AND column_name IN (
        'bankName',
        'bankAccount',
        'bankHolder',
        'bankCode',
        'merchOrderId'
      )
    ORDER BY table_name, column_name
  `;

  console.log(columns);

  const expected = new Set([
    "merch_campaigns.bankName",
    "merch_campaigns.bankAccount",
    "merch_campaigns.bankHolder",
    "merch_campaigns.bankCode",
    "payments.merchOrderId",
  ]);

  for (const column of columns) {
    expected.delete(`${column.table_name}.${column.column_name}`);
  }

  if (expected.size > 0) {
    throw new Error(`Missing columns: ${[...expected].join(", ")}`);
  }

  console.log("Merch schema columns are complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
