import { dateKey, formatDateLong, getDayKey, weekOffsetForDate } from './dates.js'
import { sortByTime, progress } from './day.js'
import { instancesOnDate } from './recurring.js'
import { TYPE } from './types.js'

export function buildWidgetPayload(store, recurring, fromDate, days = 3) {
  const out = { days: {} }
  for (let i = 0; i < days; i++) {
    const date = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate() + i)
    const dayIdx = (date.getDay() + 6) % 7
    const key = getDayKey(weekOffsetForDate(date), dayIdx)
    const tasks = sortByTime([...((store || {})[key] || []), ...instancesOnDate(recurring, date)])
    const { total, done } = progress(tasks)
    out.days[dateKey(date)] = {
      label: formatDateLong(date),
      total,
      done,
      tasks: tasks.map(t => ({
        title: t.title,
        start: t.time || '',
        end: t.endTime || '',
        color: (TYPE[t.type] || TYPE.work).hex,
        done: !!t.done,
      })),
    }
  }
  return out
}