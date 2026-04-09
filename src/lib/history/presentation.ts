import { getUiLanguage } from "../shared/browser"

const HISTORY_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}

const HISTORY_TIME_FORMAT: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit"
}

export function formatHistoryDate(isoString: string): string {
  return new Intl.DateTimeFormat(getUiLanguage(), HISTORY_DATE_FORMAT).format(new Date(isoString))
}

export function formatHistoryTime(isoString: string): string {
  return new Intl.DateTimeFormat(getUiLanguage(), HISTORY_TIME_FORMAT).format(new Date(isoString))
}
