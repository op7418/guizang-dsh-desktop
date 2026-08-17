/** Locale namespace used by the optional Schedule summary row. */
export const NS = 'scheduleSummary'

/** Default Simplified Chinese dictionary. */
export const zh = {
  'summary.label': '提醒',
  'summary.one': '{n} 个 · {time}',
  'summary.other': '{n} 个 · {time}',
} as const

/** English counterpart to the default dictionary. */
export const en: Record<keyof typeof zh, string> = {
  'summary.label': 'Reminder',
  'summary.one': '{n} · {time}',
  'summary.other': '{n} · {time}',
}

/** Keys available in the Schedule summary locale namespace. */
export type ScheduleSummaryKey = keyof typeof zh
