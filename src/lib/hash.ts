import "server-only";
import { createHash } from "node:crypto";
import { env } from "./env";

/** Salted one-way hash so raw IPs / identifiers are never stored. */
export function hashIdentifier(value: string): string {
  const salt = env().IP_HASH_SALT ?? "patronos-dev-salt-change-me";
  return createHash("sha256").update(`${salt}:${value}`).digest("hex").slice(0, 32);
}
