export interface ProviderResponse {
  status: number
  body: unknown
}

export type SendDispatch = (operationId: string) => Promise<ProviderResponse>

export type DispatchOutcome =
  | { outcome: "confirmed"; operationId: string; receiptId: string }
  | { outcome: "rejected" | "uncertain"; operationId: string }

export type Receipt =
  | { state: "completed"; completedAt: number }
  | { state: "pending" | "uncertain"; startedAt: number }
