import "server-only";
import { PrismaClient } from "@prisma/client";
import { resolveDatabaseUrl } from "./db-env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Vercel Marketplace databases (Supabase, Neon) expose POSTGRES_PRISMA_URL (pooled, pgbouncer-safe), possibly prefixed.
const url = resolveDatabaseUrl();

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: url ? { db: { url } } : undefined,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
