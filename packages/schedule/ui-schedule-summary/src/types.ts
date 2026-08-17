/** Browser/Host wire shapes for the optional sidebar Schedule summary. */

/** Dedicated Connection RPC channel protected by the loopback trust policy. */
export const SCHEDULE_SUMMARY_CHANNEL = '/pilot-schedule-summary'
/** Read-only RPC operation returning one Session's persisted reminder summary. */
export const SCHEDULE_SUMMARY_GET_ENDPOINT = 'get'

/** Request for the persisted reminder summary of one Session. */
export interface ScheduleSummaryRequest {
  readonly sessionId: string
}

/** Read-only active reminder metadata returned to the hover contribution. */
export interface ScheduleSummary {
  /** Number of active reminder records in the inspected Session suffix. */
  readonly activeCount: number
  /** Earliest active reminder target, when one exists. */
  readonly nextScheduledAt?: string
}
