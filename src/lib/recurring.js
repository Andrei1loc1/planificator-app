import { dateKey, minutesFromHHMM } from './dates.js'

export function matchesDate(r, date) {
  if (!r || !r.repeat) return false
  if (r.repeat === 'weekly') return (r.days || []).includes((date.getDay() + 6) % 7)
  if (r.repeat === 'monthly') return date.getDate() === r.dayOfMonth
  return false
}

export function instancesOnDate(list, date) {
  const key = dateKey(date)
  const out = []
  for (const r of list || []) {
    if (!matchesDate(r, date)) continue
    out.push({
      id: 'r' + r.id,
      recurringId: r.id,
      title: r.title,
      type: r.type,
      time: r.time,
      endTime: r.endTime,
      repeat: r.repeat,
      done: (r.doneDates || []).includes(key),
    })
  }
  return out
}

function timeMinutes(r) {
  const m = minutesFromHHMM(r.time)
  return m == null ? Infinity : m
}

export function nextOccurrences(list, fromDate, count) {
  const templates = list || []
  const out = []
  for (let i = 0; i < 62 && out.length < count; i++) {
    const date = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate() + i)
    const matching = templates.filter(r => matchesDate(r, date))
    if (matching.length === 0) continue
    matching.sort((a, b) => timeMinutes(a) - timeMinutes(b))
    for (const r of matching) {
      if (out.length >= count) break
      out.push({ r, date, daysUntil: i })
    }
  }
  return out
}

export function markRecurringDone(list, templateId, dateKeyStr) {
  return (list || []).map(r => {
    if (!r || r.id !== templateId) return r
    const doneDates = r.doneDates || []
    if (doneDates.includes(dateKeyStr))
      return { ...r, doneDates: doneDates.filter(d => d !== dateKeyStr) }
    return { ...r, doneDates: [...doneDates, dateKeyStr].sort() }
  })
}