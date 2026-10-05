import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL!;

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

// Cast to `any` to bypass the @types/pg version conflict between the
// globally installed @types/pg and the one bundled inside @prisma/adapter-pg.
// The runtime behaviour is identical — only the TS types differ between versions.
const adapter = new PrismaPg(pool as any);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}