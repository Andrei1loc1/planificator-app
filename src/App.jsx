import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Modal from './components/Modal.jsx'
import WeekView from './components/WeekView.jsx'
import DayView from './components/DayView.jsx'
import { DAYS, getDates, getDayKey, weekOffsetForDate, dateKey, formatWeekRange } from './lib/dates.js'
import { sortByTime } from './lib/day.js'
import { instancesOnDate, markRecurringDone } from './lib/recurring.js'

const DAY_SVG = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="1.5" y="2.5" width="11" height="10" rx="2" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M1.5 5.5h11" stroke="currentColor" strokeWidth="1.2"/>
    <circle cx="7" cy="9" r="1.6" fill="currentColor"/>
  </svg>
)

const WEEK_SVG = (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="1.5" y="2.5" width="11" height="10" rx="2" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M1.5 5.5h11M7 5.5v7" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M4.2 5.5v7M9.8 5.5v7" stroke="currentColor" strokeWidth="0.8" opacity="0.55"/>
  </svg>
)

export default function App() {
  const [view, setView] = useState('azi')
  const [dayOffset, setDayOffset] = useState(0)
  const [weekOffset, setWeekOffset] = useState(0)
  const [activeDayFilter, setActiveDayFilter] = useState(-1)
  const [store, setStore] = useState({})
  const [recurring, setRecurring] = useState([])
  const [nextId, setNextId] = useState(100)
  const [modal, setModal] = useState({ isOpen: false, mode: 'add', task: null, dayIdx: null, date: null })

  const dragState = useRef({ id: null, fromDay: null })

  useEffect(() => {
    try {
      const raw = localStorage.getItem('planner_v2')
      const data = raw ? JSON.parse(raw) : null
      if (data && typeof data === 'object') setStore(data)
      const rawR = localStorage.getItem('planner_recurring_v1')
      const rec = rawR ? JSON.parse(rawR) : null
      if (Array.isArray(rec)) setRecurring(rec)
      const ids = [
        ...Object.values(data || {}).flat().map(t => t && t.id),
        ...(rec || []).map(r => r && r.id),
      ].filter(n => typeof n === 'number')
      if (ids.length > 0) setNextId(Math.max(...ids) + 1)
    } catch (e) {}
  }, [])

  useEffect(() => {
    try { localStorage.setItem('planner_v2', JSON.stringify(store)) } catch (e) {}
  }, [store])

  useEffect(() => {
    try { localStorage.setItem('planner_recurring_v1', JSON.stringify(recurring)) } catch (e) {}
  }, [recurring])

  const dates = useMemo(() => getDates(weekOffset), [weekOffset])

  const dayDate = useMemo(() => {
    const d = new Date()
    d.setHours(0,0,0,0)
    d.setDate(d.getDate() + dayOffset)
    return d
  }, [dayOffset])

  const getTasks = useCallback((weekOff, dayIdx) => {
    return store[getDayKey(weekOff, dayIdx)] || []
  }, [store])

  const setTasks = useCallback((weekOff, dayIdx, arr) => {
    setStore(prev => ({ ...prev, [getDayKey(weekOff, dayIdx)]: arr }))
  }, [])

  const tasksForDate = useCallback((date) => {
    const dayIdx = (date.getDay() + 6) % 7
    const k = getDayKey(weekOffsetForDate(date), dayIdx)
    return sortByTime([...(store[k] || []), ...instancesOnDate(recurring, date)])
  }, [store, recurring])

  const openModal = useCallback((dayIdx, task = null, date = null) => {
    const target = task && task.recurringId != null
      ? recurring.find(r => r.id === task.recurringId) || task
      : task
    setModal({ isOpen: true, mode: task ? 'edit' : 'add', task: target, dayIdx, date })
  }, [recurring])

  const closeModal = useCallback(() => {
    setModal({ isOpen: false, mode: 'add', task: null, dayIdx: null, date: null })
  }, [])

  const saveTask = useCallback((data) => {
    if (modal.mode === 'edit' && modal.task) {
      if (modal.task.repeat) {
        if (data.repeat) {
          setRecurring(prev => prev.map(r => r.id === modal.task.id ? { ...r, ...data } : r))
        } else {
          setRecurring(prev => prev.filter(r => r.id !== modal.task.id))
          const k = getDayKey(weekOffsetForDate(modal.date), modal.dayIdx)
          setStore(prev => ({ ...prev, [k]: [...(prev[k] || []), { id: nextId, ...data }] }))
          setNextId(n => n + 1)
        }
      } else {
        const k = getDayKey(weekOffsetForDate(modal.date), modal.dayIdx)
        setStore(prev => ({
          ...prev,
          [k]: (prev[k] || []).map(t => String(t.id) === String(modal.task.id) ? { ...t, ...data } : t),
        }))
      }
    } else {
      if (data.repeat) {
        setRecurring(prev => [...prev, { id: nextId, ...data, doneDates: [] }])
        setNextId(n => n + 1)
      } else {
        const k = getDayKey(weekOffsetForDate(modal.date), modal.dayIdx)
        setStore(prev => ({ ...prev, [k]: [...(prev[k] || []), { id: nextId, ...data }] }))
        setNextId(n => n + 1)
      }
    }
    closeModal()
  }, [modal, nextId, closeModal])

  const deleteTask = useCallback((task) => {
    if (task.recurringId != null) {
      setRecurring(prev => prev.filter(r => r.id !== task.recurringId))
      return
    }
    setStore(prev => {
      const next = {}
      for (const k of Object.keys(prev)) {
        next[k] = prev[k].filter(t => String(t.id) !== String(task.id))
      }
      return next
    })
  }, [])

  const deleteRecurring = useCallback((id) => {
    setRecurring(prev => prev.filter(r => r.id !== id))
  }, [])

  const toggleDone = useCallback((task) => {
    if (task.recurringId != null) {
      setRecurring(prev => markRecurringDone(prev, task.recurringId, dateKey(dayDate)))
      return
    }
    setStore(prev => {
      const next = {}
      for (const k of Object.keys(prev)) {
        next[k] = prev[k].map(t => String(t.id) === String(task.id) ? { ...t, done: !t.done } : t)
      }
      return next
    })
  }, [dayDate])

  const filterDay = useCallback((i) => {
    setActiveDayFilter(prev => prev === i ? -1 : i)
  }, [])

  const handleDragStart = useCallback((e, taskId, dayIdx) => {
    dragState.current = { id: taskId, fromDay: dayIdx }
    e.target.classList.add('dragging')
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(taskId))
  }, [])

  const handleDragEnd = useCallback((e) => {
    e.target.classList.remove('dragging')
    document.querySelectorAll('.col').forEach(c => c.classList.remove('drag-over'))
    dragState.current = { id: null, fromDay: null }
  }, [])

  const handleDragOver = useCallback((e, dayIdx) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    document.querySelectorAll('.col').forEach(c => c.classList.remove('drag-over'))
    document.querySelector(`.col[data-day="${dayIdx}"]`)?.classList.add('drag-over')
  }, [])

  const handleDragLeave = useCallback((e, dayIdx) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      document.querySelector(`.col[data-day="${dayIdx}"]`)?.classList.remove('drag-over')
    }
  }, [])

  const handleDrop = useCallback((e, toDay) => {
    e.preventDefault()
    document.querySelectorAll('.col').forEach(c => c.classList.remove('drag-over'))

    const taskId = e.dataTransfer.getData('text/plain') || dragState.current.id
    const fromDay = dragState.current.fromDay

    if (!taskId) return

    const fromTasks = getTasks(weekOffset, fromDay)
    const taskIdx = fromTasks.findIndex(t => String(t.id) === String(taskId))
    if (taskIdx < 0) return

    const [task] = fromTasks.splice(taskIdx, 1)

    if (fromDay === toDay) {
      fromTasks.splice(taskIdx, 0, task)
      setTasks(weekOffset, fromDay, fromTasks)
    } else {
      setTasks(weekOffset, fromDay, fromTasks)
      const toTasks = getTasks(weekOffset, toDay)
      toTasks.push(task)
      setTasks(weekOffset, toDay, toTasks)
    }

    dragState.current = { id: null, fromDay: null }
  }, [weekOffset, getTasks, setTasks])

  const handleTaskDragOver = useCallback((e, taskId, dayIdx) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleTaskDrop = useCallback((e, targetTaskId, dayIdx) => {
    e.preventDefault()
    e.stopPropagation()

    const taskId = e.dataTransfer.getData('text/plain') || dragState.current.id
    const fromDay = dragState.current.fromDay

    if (!taskId || fromDay !== dayIdx) return

    const tasks = getTasks(weekOffset, dayIdx)
    const fromIdx = tasks.findIndex(t => String(t.id) === String(taskId))
    const toIdx = tasks.findIndex(t => String(t.id) === String(targetTaskId))

    if (fromIdx < 0 || toIdx < 0) return

    const [movedTask] = tasks.splice(fromIdx, 1)
    tasks.splice(toIdx, 0, movedTask)
    setTasks(weekOffset, dayIdx, tasks)

    dragState.current = { id: null, fromDay: null }
  }, [weekOffset, getTasks, setTasks])

  return (
    <div className="app">
      <div className="top">
        <div className="brand">
          <img src="/planificator_logo.png" alt="Logo" className="brand-logo" />
          <div className="brand-text">
            <div className="brand-title">Săptămâna mea</div>
            <div className="brand-sub">Planificator personal</div>
          </div>
        </div>
        {view === 'saptamana' && (
          <div className="week-nav">
            <button className="nav-btn" onClick={() => setWeekOffset(w => w - 1)}>←</button>
            <div className="week-range">{formatWeekRange(weekOffset)}</div>
            <button className="nav-btn" onClick={() => setWeekOffset(w => w + 1)}>→</button>
          </div>
        )}
      </div>

      <nav className="view-nav">
        <button
          type="button"
          className={`view-tab ${view === 'azi' ? 'active' : ''}`}
          onClick={() => setView('azi')}
          aria-current={view === 'azi' ? 'page' : undefined}
        >
          {DAY_SVG}
          Azi
        </button>
        <button
          type="button"
          className={`view-tab ${view === 'saptamana' ? 'active' : ''}`}
          onClick={() => setView('saptamana')}
          aria-current={view === 'saptamana' ? 'page' : undefined}
        >
          {WEEK_SVG}
          Săptămâna
        </button>
      </nav>

      {view === 'azi' ? (
        <DayView
          date={dayDate}
          tasks={tasksForDate(dayDate)}
          recurring={recurring}
          dayOffset={dayOffset}
          onPrevDay={() => setDayOffset(o => o - 1)}
          onNextDay={() => setDayOffset(o => o + 1)}
          onAdd={() => openModal((dayDate.getDay() + 6) % 7, null, dayDate)}
          onEdit={(task) => openModal((dayDate.getDay() + 6) % 7, task, dayDate)}
          onDelete={deleteTask}
          onToggleDone={toggleDone}
          onDeleteRecurring={deleteRecurring}
        />
      ) : (
        <WeekView
          dates={dates}
          getDayTasks={(dayIdx) => tasksForDate(dates[dayIdx])}
          activeDayFilter={activeDayFilter}
          onFilterDay={filterDay}
          onAdd={(dayIdx) => openModal(dayIdx, null, dates[dayIdx])}
          onEdit={(task, dayIdx) => openModal(dayIdx, task, dates[dayIdx])}
          onDelete={deleteTask}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onTaskDragOver={handleTaskDragOver}
          onTaskDrop={handleTaskDrop}
        />
      )}

      <Modal
        isOpen={modal.isOpen}
        mode={modal.mode}
        task={modal.task}
        dayIdx={modal.dayIdx}
        dayLabel={modal.dayIdx != null ? DAYS[modal.dayIdx] : ''}
        isRecurring={!!modal.task?.repeat}
        onClose={closeModal}
        onSave={saveTask}
      />
    </div>
  )
}