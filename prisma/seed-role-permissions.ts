/**
 * Idempotent role -> permission mapping. Safe to re-run: uses upsert on the
 * (roleId, permissionId) unique key and never removes existing grants.
 * Run with: npm run seed:roles
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const GRANTS: Record<string, string[]> = {
  CASHIER: ["invoice.create", "invoice.finalize", "payment.receive"],
  ACCOUNTANT: [
    "accounting.view",
    "invoice.create",
    "invoice.finalize",
    "payment.receive",
    "payment.refund",
  ],
  SERVICE_ADVISOR: ["invoice.create"],
  SERVICE_MANAGER: ["invoice.create", "invoice.finalize", "payment.receive"],
  BRANCH_MANAGER: [
    "accounting.view",
    "invoice.create",
    "invoice.finalize",
    "payment.receive",
  ],
};

async function main() {
  const roles = await prisma.role.findMany({ where: { code: { in: Object.keys(GRANTS) } } });
  const perms = await prisma.permission.findMany();
  const permByCode = new Map(perms.map((p) => [p.code, p.id]));
  let granted = 0;

  for (const role of roles) {
    for (const code of GRANTS[role.code]) {
      const permissionId = permByCode.get(code);
      if (!permissionId) {
        console.warn(`Permission not found, skipping: ${code}`);
        continue;
      }
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId },
      });
      granted++;
    }
  }
  console.log(`Role permissions ensured: ${granted} grants across ${roles.length} roles.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
