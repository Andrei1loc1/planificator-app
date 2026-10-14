import { isPast } from '../lib/day.js'
import { TYPE } from '../lib/types.js'
import './TaskCard.css'

export default function TaskCard({ task, variant = 'week', now, conflict, onEdit, onDelete, onToggleDone, onDragStart, onDragEnd, onDragOver, onDrop }) {
  const tp = TYPE[task.type] || TYPE.work
  const week = variant === 'week'
  const canDrag = week && !task.repeat
  const fade = !week && (task.done || (now != null && isPast(task, now)))

  const timeStr = (task.time || task.endTime)
    ? <span className="card-time">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1"/>
          <path d="M5 3v2l1.5 1" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
        </svg>
        {[task.time, task.endTime].filter(Boolean).join(' – ')}
        {conflict && <span className="card-conflict">!</span>}
      </span>
    : ''

  return (
    <div
      className={`task-card${fade ? ' card-fade' : ''}`}
      draggable={canDrag}
      data-id={task.id}
      onDragStart={canDrag ? (e) => onDragStart(e, task.id) : undefined}
      onDragEnd={canDrag ? onDragEnd : undefined}
      onDragOver={canDrag ? (e) => onDragOver(e, task.id) : undefined}
      onDrop={canDrag ? (e) => onDrop(e, task.id) : undefined}
    >
      <div className="card-top">
        {!week &&
          <button
            type="button"
            className={`card-check${task.done ? ' on' : ''}`}
            title={task.done ? 'Debifează' : 'Bifează'}
            aria-pressed={task.done}
            onClick={() => onToggleDone(task)}
          >
            {task.done &&
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1.5 5.5l2.5 2.5 4.5-6" stroke="#0e0e11" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            }
          </button>
        }
        <span className="card-dot" style={{background: tp.color}} />
        <div className="card-info">
          <div className="card-title">{task.title}</div>
          {timeStr}
          <span className="card-tag" style={{background: tp.bg, color: tp.color}}>{tp.label}</span>
          {task.repeat &&
            <svg className="card-repeat" width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="m17 2 4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 11v-1a4 4 0 0 1 4-4h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="m7 22-4-4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 13v1a4 4 0 0 1-4 4H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          }
        </div>
        <div className="card-actions">
          <button className="icon-btn" title="Editează" onClick={() => onEdit(task)}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M8 2l2 2-6 6H2v-2L8 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="icon-btn del" title="Șterge" onClick={() => onDelete(task)}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}