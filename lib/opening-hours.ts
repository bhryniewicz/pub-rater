export type DayHours = { open: string; close: string | null } | null

export type OpeningHours = {
  mo: DayHours
  tu: DayHours
  we: DayHours
  th: DayHours
  fr: DayHours
  sa: DayHours
  su: DayHours
}

export const DAY_KEYS = ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'] as const
export type DayKey = (typeof DAY_KEYS)[number]

const DAY_INDEX: Record<string, number> = {
  mo: 0, tu: 1, we: 2, th: 3, fr: 4, sa: 5, su: 6,
}

function expandDays(spec: string): number[] {
  const days: number[] = []
  const parts = spec.toLowerCase().split(',').map(s => s.trim())
  for (const part of parts) {
    const rangeParts = part.split('-').map(s => s.trim())
    if (rangeParts.length === 2 && DAY_INDEX[rangeParts[0]] !== undefined && DAY_INDEX[rangeParts[1]] !== undefined) {
      const start = DAY_INDEX[rangeParts[0]]
      const end = DAY_INDEX[rangeParts[1]]
      for (let i = start; i <= end; i++) days.push(i)
    } else {
      const idx = DAY_INDEX[part]
      if (idx !== undefined) days.push(idx)
    }
  }
  return days
}

function parseTimeRange(spec: string): DayHours {
  const trimmed = spec.trim().toLowerCase()

  if (trimmed === 'off' || trimmed === 'closed') return null

  // "12:00+" — open-ended
  if (trimmed.endsWith('+')) {
    return { open: trimmed.slice(0, -1).trim(), close: null }
  }

  // "09:00-17:00"
  const match = trimmed.match(/^(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/)
  if (match) return { open: match[1], close: match[2] }

  return null
}

export function parseOsmOpeningHours(raw: string | null): OpeningHours | null {
  if (!raw?.trim()) return null

  const trimmed = raw.trim()
  const result: OpeningHours = { mo: null, tu: null, we: null, th: null, fr: null, sa: null, su: null }

  if (trimmed === '24/7') {
    for (const key of DAY_KEYS) result[key] = { open: '00:00', close: '24:00' }
    return result
  }

  const rules = trimmed.split(';').map(r => r.trim()).filter(Boolean)

  for (const rule of rules) {
    let targetDays: number[]
    let timeSpec: string

    // Try to split "DaySpec TimeSpec" where TimeSpec starts with a digit
    const dayTimeMatch = rule.match(/^([A-Za-z][A-Za-z,\-\s]*?)\s+([\d].+)$/)
    if (dayTimeMatch) {
      const firstPart = dayTimeMatch[1].split(/[-,\s]/)[0].toLowerCase()
      if (DAY_INDEX[firstPart] !== undefined) {
        targetDays = expandDays(dayTimeMatch[1].trim())
        timeSpec = dayTimeMatch[2].trim()
      } else {
        targetDays = [0, 1, 2, 3, 4, 5, 6]
        timeSpec = rule
      }
    } else {
      // "Mo off" pattern
      const offMatch = rule.match(/^([A-Za-z][A-Za-z,\-\s]*?)\s+(off|closed)$/i)
      if (offMatch) {
        const firstPart = offMatch[1].split(/[-,\s]/)[0].toLowerCase()
        if (DAY_INDEX[firstPart] !== undefined) {
          targetDays = expandDays(offMatch[1].trim())
          timeSpec = 'off'
        } else {
          continue
        }
      } else {
        // No day spec — applies to all days
        targetDays = [0, 1, 2, 3, 4, 5, 6]
        timeSpec = rule
      }
    }

    const hours = parseTimeRange(timeSpec)
    for (const dayIdx of targetDays) {
      result[DAY_KEYS[dayIdx]] = hours
    }
  }

  return result
}

function checkSlot(slot: DayHours, currentMins: number): boolean {
  if (!slot) return false
  const [openH, openM] = slot.open.split(':').map(Number)
  const openMins = openH * 60 + openM
  if (slot.close === null) return currentMins >= openMins
  const [closeH, closeM] = slot.close.split(':').map(Number)
  const closeMins = closeH === 24 ? 1440 : closeH * 60 + closeM
  if (closeMins === 0 || closeMins >= 1440) return currentMins >= openMins
  if (closeMins > openMins) return currentMins >= openMins && currentMins < closeMins
  // Crosses midnight e.g. 22:00-02:00
  return currentMins >= openMins || currentMins < closeMins
}

export function getCloseTimeToday(hours: OpeningHours, now = new Date()): string | null {
  const jsDay = now.getDay()
  const todayIdx = jsDay === 0 ? 6 : jsDay - 1
  const slot = hours[DAY_KEYS[todayIdx]]
  if (!slot || slot.close === null) return null
  // Normalise 24:00 → 00:00 for display
  return slot.close === '24:00' ? '00:00' : slot.close
}

export function isOpenLate(hours: OpeningHours): boolean {
  for (const key of DAY_KEYS) {
    const slot = hours[key]
    if (!slot || slot.close === null) continue
    const [closeH, closeM] = slot.close.split(':').map(Number)
    const [openH, openM] = slot.open.split(':').map(Number)
    const closeMins = closeH * 60 + closeM
    const openMins = openH * 60 + openM
    // Crosses midnight: close time (e.g. 02:00) is less than open time (e.g. 22:00)
    if (closeMins > 0 && closeMins < openMins) return true
  }
  return false
}

export function isOpenNow(hours: OpeningHours, now = new Date()): boolean {
  // JS getDay(): 0=Sun … 6=Sat → convert to Mo=0 … Su=6
  const jsDay = now.getDay()
  const todayIdx = jsDay === 0 ? 6 : jsDay - 1
  const currentMins = now.getHours() * 60 + now.getMinutes()

  if (checkSlot(hours[DAY_KEYS[todayIdx]], currentMins)) return true

  // Check yesterday's slot — handles the case where it's e.g. 01:00 on Wednesday
  // but Tuesday had opening hours of 22:00-02:00 (cross-midnight span carrying into today)
  const yestIdx = (todayIdx + 6) % 7
  const yest = hours[DAY_KEYS[yestIdx]]
  if (yest && yest.close !== null) {
    const [openH, openM] = yest.open.split(':').map(Number)
    const openMins = openH * 60 + openM
    const [closeH, closeM] = yest.close.split(':').map(Number)
    const closeMins = closeH === 24 ? 1440 : closeH * 60 + closeM
    // Only relevant when yesterday's slot crosses midnight (close < open)
    if (closeMins > 0 && closeMins < openMins && currentMins < closeMins) return true
  }

  return false
}
