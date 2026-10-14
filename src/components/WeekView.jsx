import { useEffect, useRef } from 'react'
import TaskCard from './TaskCard.jsx'
import { conflictIds } from '../lib/day.js'
import { DAYS, MONTHS, isToday } from '../lib/dates.js'
import { TYPE } from '../lib/types.js'

function Column({ dayIdx, tasks, date, onAdd, onEdit, onDelete, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop, onTaskDragOver, onTaskDrop }) {
  const conflicts = conflictIds(tasks)
  const todayBadge = isToday(date)
    ? <span className="col-today-badge">Azi</span>
    : <span className="col-count">{tasks.length} task{tasks.length !== 1 ? 'uri' : ''}</span>

  return (
    <div
      className="col"
      data-day={dayIdx}
      onDragOver={(e) => onDragOver(e, dayIdx)}
      onDragLeave={(e) => onDragLeave(e, dayIdx)}
      onDrop={(e) => onDrop(e, dayIdx)}
    >
      <div className="col-head">
        <div>
          <div className="col-day-name">{DAYS[dayIdx]}</div>
          <div className="col-day-date">{date.getDate()} {MONTHS[date.getMonth()]} {date.getFullYear()}</div>
        </div>
        {todayBadge}
      </div>
      <div className="col-body" id={`body-${dayIdx}`}>
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            variant="week"
            conflict={conflicts.has(task.id)}
            onEdit={(task) => onEdit(task, dayIdx)}
            onDelete={onDelete}
            onDragStart={(e, id) => onDragStart(e, id, dayIdx)}
            onDragEnd={onDragEnd}
            onDragOver={(e, id) => onTaskDragOver(e, id, dayIdx)}
            onDrop={(e, id) => onTaskDrop(e, id, dayIdx)}
          />
        ))}
      </div>
      <div className="add-row">
        <button className="add-btn" onClick={() => onAdd(dayIdx)}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Adaugă task
        </button>
      </div>
    </div>
  )
}

export default function WeekView({ dates, getDayTasks, activeDayFilter, onFilterDay, onAdd, onEdit, onDelete, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop, onTaskDragOver, onTaskDrop }) {
  const gridRef = useRef(null)

  useEffect(() => {
    const idx = dates.findIndex(d => isToday(d))
    if (idx < 0 || !gridRef.current) return
    gridRef.current.querySelector(`.col[data-day="${idx}"]`)?.scrollIntoView({ behavior: 'auto', block: 'start' })
  }, [dates])

  const indices = activeDayFilter >= 0
    ? [activeDayFilter]
    : Array.from({length:7},(_,i)=>i)

  return (
    <>
      <div className="days-strip">
        {dates.map((d, i) => (
          <div
            key={i}
            className={`day-pill ${activeDayFilter === i ? 'active' : ''} ${isToday(d) ? 'today' : ''}`}
            onClick={() => onFilterDay(i)}
          >
            <span className="pname">{DAYS[i].slice(0,3)}</span>
            <span className="pnum">{d.getDate()}</span>
          </div>
        ))}
      </div>

      <div className="legend">
        {Object.entries(TYPE).map(([key, t]) => (
          <div key={key} className="leg-item"><div className="leg-dot" style={{background: t.color}}></div> {t.label}</div>
        ))}
      </div>

      <div className="grid" ref={gridRef}>
        {indices.map(i => (
          <Column
            key={i}
            dayIdx={i}
            tasks={getDayTasks(i)}
            date={dates[i]}
            onAdd={onAdd}
            onEdit={onEdit}
            onDelete={onDelete}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onTaskDragOver={onTaskDragOver}
            onTaskDrop={onTaskDrop}
          />
        ))}
      </div>
    </>
  )
}