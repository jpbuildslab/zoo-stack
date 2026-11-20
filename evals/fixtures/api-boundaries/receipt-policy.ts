import type { Receipt } from "./contract.ts"

export function canDiscard(receipt: Receipt, now: number): boolean {
  const timestamp = receipt.state === "completed" ? receipt.completedAt : receipt.startedAt
  return now - timestamp >= 24 * 60 * 60 * 1000
}
