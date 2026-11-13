export type RequestStatus = "submitted" | "approved" | "cancelled"

export interface ServiceRequest {
  id: string
  workspace: string
  title: string
  revision: number
  status: RequestStatus
  scheduledStart: string
}

export interface RequestList {
  workspace: string
  canApprove: boolean
  requests: ServiceRequest[]
}

export const fixtureClock = "2030-01-10T12:00:00.000Z"
