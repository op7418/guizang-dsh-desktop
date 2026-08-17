/** Pure wire type for the Session model summary projection. */

export {}

/** Last model route recorded by a Session request header. */
export interface SessionModelProjection {
  /** Adapter provider id consumed by the request. */
  provider: string
  /** Adapter model id consumed by the request. */
  model: string
  /** Optional adapter-owned reasoning effort id consumed by the request. */
  reasoningEffort?: string | undefined
}

declare module '@deepseek-ai/dsh-session-projection/types' {
  interface SessionProjectionMap {
    /** Last durable provider/model route used by this Session. */
    sessionModel: SessionModelProjection | null
  }
}
