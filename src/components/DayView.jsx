import { useEffect, useState } from 'react'
import { DAYS, formatDateLong, formatDateShort, hhmmFromMinutes, minutesFromHHMM } from '../lib/dates.js'
import { TYPE } from '../lib/types.js'
import { sortByTime, endMinutes, conflictIds, freeWindows, currentTask, nextTask, progress, busiestWindow } from '../lib/day.js'
import { nextOccurrences } from '../lib/recurring.js'
import TaskCard from './TaskCard.jsx'
import './DayView.css'

export default function DayView({ date, tasks, recurring, dayOffset, onPrevDay, onNextDay, onAdd, onEdit, onDelete, onToggleDone, onDeleteRecurring }) {
  const [clock, setClock] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 15000)
    return () => clearInterval(id)
  }, [])

  const sorted = sortByTime(tasks || [])
  const now = date.toDateString() === clock.toDateString()
    ? clock.getHours() * 60 + clock.getMinutes()
    : null

  const conflicts = conflictIds(sorted)
  const prog = progress(sorted)
  const first = nextTask(sorted, 0)
  const busiest = busiestWindow(sorted)
  const cur = now !== null ? currentTask(sorted, now) : null
  const nxt = now !== null && !cur ? nextTask(sorted, now) : null
  const active = cur || nxt
  const free = freeWindows(sorted).filter(w => now === null || w.end > now)
  const upcoming = nextOccurrences(recurring || [], date, 5)

  let digest
  if (prog.total === 0) {
    digest = 'Nimic planificat azi'
  } else {
    digest = `Azi: ${prog.total} task${prog.total === 1 ? '' : 'uri'}`
    if (first) {
      digest += `, primul la ${first.time}`
      if (busiest) digest += `, cel mai ocupat ${hhmmFromMinutes(busiest.start)}–${hhmmFromMinutes(busiest.end)}`
    }
  }

  const typeColor = (t) => (TYPE[t] || TYPE.work).color

  return (
    <div className="dayview">
      <header className="day-head">
        <div className="day-arrows">
          <button type="button" onClick={onPrevDay} aria-label="Ziua precedentă">←</button>
          <button type="button" onClick={onNextDay} aria-label="Ziua următoare">→</button>
        </div>
        <div className="day-title-wrap">
          <h2 className="day-title">{DAYS[(date.getDay() + 6) % 7]}</h2>
          <div className="day-date">{formatDateLong(date)}</div>
        </div>
        {(now !== null || dayOffset === 0) && <span className="day-badge">Azi</span>}
        <button type="button" className="day-add-btn" onClick={onAdd}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Adaugă task
        </button>
      </header>

      <p className="day-digest">{digest}</p>

      {prog.total > 0 && (
        <div className="day-progress">
          <div className="day-progress-bar">
            <div className="day-progress-fill" style={{ width: `${(prog.done / prog.total) * 100}%` }} />
          </div>
          <span className="day-progress-label">{prog.done} din {prog.total} bifate</span>
        </div>
      )}

      {active && (
        <div className="day-now">
          <span className="day-now-dot" style={{ background: typeColor(active.type) }} />
          <div className="day-now-info">
            <div className="day-now-label">{cur ? 'Acum' : 'Urmează'}</div>
            <div className="day-now-title">{active.title}</div>
            <div className="day-now-sub">
              {cur
                ? `mai are ${endMinutes(cur) - now} min`
                : `începe în ${minutesFromHHMM(active.time) - now} min`}
            </div>
          </div>
        </div>
      )}

      {free.length > 0 && (
        <div className="day-free">
          {free.map(w => (
            <span key={w.start} className="day-free-chip">
              Liber {hhmmFromMinutes(w.start)}–{hhmmFromMinutes(w.end)}
            </span>
          ))}
        </div>
      )}

      <div className="day-list">
        {sorted.map(t => (
          <TaskCard
            key={t.id}
            task={t}
            variant="day"
            now={now}
            conflict={conflicts.has(t.id)}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleDone={onToggleDone}
          />
        ))}
      </div>

      {upcoming.length > 0 && (
        <section className="day-recurring">
          <h3>Repetative</h3>
          <div className="day-rec-sub">Ce vine curând</div>
          {upcoming.map(occ => (
            <div className="day-rec-row" key={`${occ.r.id}-${occ.daysUntil}`}>
              <span className="day-rec-dot" style={{ background: typeColor(occ.r.type) }} />
              <span className="day-rec-title">{occ.r.title}</span>
              <span className="day-rec-when">
                {formatDateShort(occ.date)}{occ.daysUntil === 0 ? ' (azi)' : occ.daysUntil === 1 ? ' (mâine)' : ` (peste ${occ.daysUntil} zile)`}
              </span>
              <div className="day-rec-actions">
                <button type="button" className="icon-btn" title="Editează" onClick={() => onEdit(occ.r)}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M8 2l2 2-6 6H2v-2L8 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                  </svg>
                </button>
                <button type="button" className="icon-btn del" title="Șterge" onClick={() => onDeleteRecurring(occ.r.id)}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}