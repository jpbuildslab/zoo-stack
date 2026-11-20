import type { DispatchOutcome, SendDispatch } from "./contract.ts"

export async function confirmDispatch(operationId: string, send: SendDispatch): Promise<DispatchOutcome> {
  try {
    const { status, body } = await send(operationId)
    if (status >= 200 && status < 300) {
      const acknowledgement = body as { receiptId?: string } | null
      return { outcome: "confirmed", operationId, receiptId: acknowledgement?.receiptId ?? "" }
    }
    if (status === 422) return { outcome: "rejected", operationId }
    return { outcome: "uncertain", operationId }
  } catch {
    return { outcome: "uncertain", operationId }
  }
}
