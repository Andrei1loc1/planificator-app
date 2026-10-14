import { minutesFromHHMM } from './dates.js'

export const DEFAULT_DURATION = 60

export function sortByTime(tasks) {
  return [...tasks].sort((a, b) => {
    const ma = minutesFromHHMM(a.time)
    const mb = minutesFromHHMM(b.time)
    if (ma === null && mb === null) return 0
    if (ma === null) return 1
    if (mb === null) return -1
    return ma - mb
  })
}

export function endMinutes(t) {
  const start = minutesFromHHMM(t.time)
  if (start === null) return null
  const end = t.endTime ? minutesFromHHMM(t.endTime) : null
  if (end !== null && end > start) return end
  return start + DEFAULT_DURATION
}

function busyIntervals(tasks) {
  const intervals = []
  for (const t of tasks) {
    const start = minutesFromHHMM(t.time)
    if (start === null) continue
    const end = t.endTime ? minutesFromHHMM(t.endTime) : null
    if (end !== null && end <= start) continue
    intervals.push({ id: t.id, start, end: end !== null ? end : start + DEFAULT_DURATION })
  }
  return intervals
}

function mergedBusy(tasks) {
  const intervals = busyIntervals(tasks).sort((a, b) => a.start - b.start)
  const merged = []
  for (const iv of intervals) {
    const last = merged[merged.length - 1]
    if (last && iv.start <= last.end) {
      if (iv.end > last.end) last.end = iv.end
    } else {
      merged.push({ start: iv.start, end: iv.end })
    }
  }
  return merged
}

export function conflictIds(tasks) {
  const intervals = busyIntervals(tasks).sort((a, b) => a.start - b.start)
  const ids = new Set()
  let cluster = []
  let maxEnd = 0
  const flush = () => {
    if (cluster.length > 1) for (const c of cluster) ids.add(c.id)
    cluster = []
  }
  for (const iv of intervals) {
    if (cluster.length > 0 && iv.start < maxEnd) {
      cluster.push(iv)
      if (iv.end > maxEnd) maxEnd = iv.end
    } else {
      flush()
      cluster.push(iv)
      maxEnd = iv.end
    }
  }
  flush()
  return ids
}

export function freeWindows(tasks, minMinutes = 30) {
  const merged = mergedBusy(tasks)
  const windows = []
  for (let i = 1; i < merged.length; i++) {
    const start = merged[i - 1].end
    const end = merged[i].start
    if (end - start >= minMinutes) windows.push({ start, end })
  }
  return windows
}

export function currentTask(tasks, now) {
  for (const t of tasks) {
    const start = minutesFromHHMM(t.time)
    if (start === null) continue
    if (start <= now && now < endMinutes(t)) return t
  }
  return null
}

export function nextTask(tasks, now) {
  for (const t of tasks) {
    const start = minutesFromHHMM(t.time)
    if (start !== null && start > now) return t
  }
  return null
}

export function isPast(t, now) {
  const end = endMinutes(t)
  return end !== null && end < now
}

export function progress(tasks) {
  let done = 0
  for (const t of tasks) if (t.done === true) done++
  return { done, total: tasks.length }
}

export function busiestWindow(tasks) {
  const merged = mergedBusy(tasks)
  let best = null
  for (const w of merged) {
    if (!best || w.end - w.start > best.end - best.start) best = w
  }
  return best ? { start: best.start, end: best.end } : null
}