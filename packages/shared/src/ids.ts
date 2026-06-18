import { randomUUID } from "node:crypto";

export function isoNow(): string {
  return new Date().toISOString();
}

export function createSeraId(prefix: string): string {
  const short = randomUUID().replace(/-/g, "").slice(0, 12);
  return `${prefix}_${short}`;
}
