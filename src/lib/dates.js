export const DAYS = ['Luni','Marți','Miercuri','Joi','Vineri','Sâmbătă','Duminică']
export const MONTHS = ['ian','feb','mar','apr','mai','iun','iul','aug','sep','oct','nov','dec']

export function getISOWeek(d) {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
  return Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7)
}

export function getMonday(offset) {
  const d = new Date()
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1 + offset * 7)
  d.setHours(0,0,0,0)
  return d
}

export function getDates(offset) {
  const mon = getMonday(offset)
  return Array.from({length:7}, (_,i) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    return d
  })
}

export function isToday(d) {
  return d.toDateString() === new Date().toDateString()
}

export function getWeekKey(offset) {
  const mon = getMonday(offset)
  return `${mon.getFullYear()}-W${String(getISOWeek(mon)).padStart(2,'0')}`
}

export function getDayKey(weekOffset, dayIdx) {
  return getWeekKey(weekOffset) + '-' + dayIdx
}

export function formatWeekRange(offset) {
  const dates = getDates(offset)
  const s = dates[0], e = dates[6]
  if (s.getMonth() === e.getMonth())
    return `${s.getDate()} – ${e.getDate()} ${MONTHS[s.getMonth()]} ${s.getFullYear()}`
  return `${s.getDate()} ${MONTHS[s.getMonth()]} – ${e.getDate()} ${MONTHS[e.getMonth()]} ${s.getFullYear()}`
}

export function dateKey(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function minutesFromHHMM(s) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(s)
  if (!match) return null
  const h = Number(match[1])
  const min = Number(match[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

export function hhmmFromMinutes(m) {
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

export function daysBetween(a, b) {
  const da = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const db = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((db - da) / 86400000)
}

export function weekOffsetForDate(d) {
  const mon = getMonday(0)
  const da = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  const mo = Date.UTC(mon.getFullYear(), mon.getMonth(), mon.getDate())
  return Math.floor((da - mo) / (7 * 86400000))
}

export function formatDateLong(d) {
  const idx = d.getDay() === 0 ? 6 : d.getDay() - 1
  const name = DAYS[idx]
  const day = name.charAt(0).toUpperCase() + name.slice(1)
  return `${day}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export function formatDateShort(d) {
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}