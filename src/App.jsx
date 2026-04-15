import { useState, useEffect, useCallback, useMemo, useRef } from 'react'

const DAYS = ['Luni','Marți','Miercuri','Joi','Vineri','Sâmbătă','Duminică']
const MONTHS = ['ian','feb','mar','apr','mai','iun','iul','aug','sep','oct','nov','dec']

const TYPE = {
  work:     { color: 'var(--work)',     bg: 'var(--work-bg)',     label: 'Muncă' },
  course:   { color: 'var(--course)',   bg: 'var(--course-bg)',   label: 'Curs' },
  hobby:    { color: 'var(--hobby)',    bg: 'var(--hobby-bg)',    label: 'Hobby' },
  personal: { color: 'var(--personal)', bg: 'var(--personal-bg)', label: 'Personal' },
}

function getISOWeek(d) {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1))
  return Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7)
}

function getMonday(offset) {
  const d = new Date()
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1 + offset * 7)
  d.setHours(0,0,0,0)
  return d
}

function getDates(offset) {
  const mon = getMonday(offset)
  return Array.from({length:7}, (_,i) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    return d
  })
}

function isToday(d) {
  return d.toDateString() === new Date().toDateString()
}

function getWeekKey(offset) {
  const mon = getMonday(offset)
  return `${mon.getFullYear()}-W${String(getISOWeek(mon)).padStart(2,'0')}`
}

function getDayKey(weekOffset, dayIdx) {
  return getWeekKey(weekOffset) + '-' + dayIdx
}

function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function formatWeekRange(offset) {
  const dates = getDates(offset)
  const s = dates[0], e = dates[6]
  if (s.getMonth() === e.getMonth())
    return `${s.getDate()} – ${e.getDate()} ${MONTHS[s.getMonth()]} ${s.getFullYear()}`
  return `${s.getDate()} ${MONTHS[s.getMonth()]} – ${e.getDate()} ${MONTHS[e.getMonth()]} ${s.getFullYear()}`
}

function TaskCard({ task, dayIdx, onEdit, onDelete, onDragStart, onDragEnd, onDragOver, onDrop }) {
  const tp = TYPE[task.type] || TYPE.work
  const timeStr = task.time 
    ? <span className="card-time">
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1"/>
          <path d="M5 3v2l1.5 1" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
        </svg>
        {task.time}
      </span>
    : ''

  return (
    <div
      className="task-card"
      draggable="true"
      data-id={task.id}
      data-day={dayIdx}
      onDragStart={(e) => onDragStart(e, task.id, dayIdx)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onDragOver(e, task.id, dayIdx)}
      onDrop={(e) => onDrop(e, task.id, dayIdx)}
    >
      <div className="card-top">
        <span className="card-dot" style={{background: tp.color}} />
        <div className="card-info">
          <div className="card-title">{escHtml(task.title)}</div>
          {timeStr}
          <span className="card-tag" style={{background: tp.bg, color: tp.color}}>{tp.label}</span>
        </div>
        <div className="card-actions">
          <button className="icon-btn" title="Editează" onClick={() => onEdit(task)}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M8 2l2 2-6 6H2v-2L8 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
            </svg>
          </button>
          <button className="icon-btn del" title="Șterge" onClick={() => onDelete(task.id)}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function Column({ dayIdx, tasks, date, onAdd, onEdit, onDelete, onDragStart, onDragEnd, onDragOver, onDrop, onTaskDragOver, onTaskDrop }) {
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
            dayIdx={dayIdx}
            onEdit={onEdit}
            onDelete={onDelete}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onTaskDragOver}
            onDrop={onTaskDrop}
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

function Modal({ isOpen, mode, task, dayIdx, onClose, onSave }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('work')
  const [time, setTime] = useState('')
  const titleRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && task) {
        setTitle(task.title)
        setType(task.type)
        setTime(task.time || '')
      } else {
        setTitle('')
        setType('work')
        setTime('')
      }
      setTimeout(() => titleRef.current?.focus(), 80)
    }
  }, [isOpen, mode, task])

  const handleSave = () => {
    if (!title.trim()) {
      titleRef.current?.focus()
      return
    }
    onSave({ title: title.trim(), type, time })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave()
  }

  const headerText = mode === 'edit' ? 'Editează task' : `Adaugă în ${DAYS[dayIdx]}`

  return (
    <div className={`modal-bg ${isOpen ? 'open' : ''}`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" onKeyDown={handleKeyDown}>
        <h3>{headerText}</h3>
        <div className="field">
          <label>Titlu</label>
          <input
            ref={titleRef}
            type="text"
            id="taskTitle"
            placeholder="ex: Yoga, React curs, Ședință..."
            maxLength="60"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="field-row">
          <div className="field">
            <label>Tip</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="work">Muncă</option>
              <option value="course">Curs</option>
              <option value="hobby">Hobby</option>
              <option value="personal">Personal</option>
            </select>
          </div>
          <div className="field">
            <label>Oră (opțional)</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <div className="modal-btns">
          <button className="mbtn cancel" onClick={onClose}>Anulează</button>
          <button className="mbtn save" onClick={handleSave}>Salvează</button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [weekOffset, setWeekOffset] = useState(0)
  const [activeDayFilter, setActiveDayFilter] = useState(-1)
  const [store, setStore] = useState({})
  const [nextId, setNextId] = useState(100)
  const [modal, setModal] = useState({ isOpen: false, mode: 'add', task: null, dayIdx: null })
  
  const dragState = useRef({ id: null, fromDay: null })
  const sortDrag = useRef({ el: null, day: null, id: null })

  // Load from localStorage
  useEffect(() => {
    try {
      const data = localStorage.getItem('planner_v2')
      if (data) {
        const parsed = JSON.parse(data)
        setStore(parsed)
        const allIds = Object.values(parsed).flat().map(t => t.id)
        if (allIds.length > 0) setNextId(Math.max(...allIds) + 1)
      }
    } catch (e) {}
  }, [])

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('planner_v2', JSON.stringify(store))
    } catch (e) {}
  }, [store])

  const getTasks = useCallback((weekOff, dayIdx) => {
    const k = getDayKey(weekOff, dayIdx)
    return store[k] || []
  }, [store])

  const setTasks = useCallback((weekOff, dayIdx, arr) => {
    setStore(prev => ({ ...prev, [getDayKey(weekOff, dayIdx)]: arr }))
  }, [])

  const dates = useMemo(() => getDates(weekOffset), [weekOffset])

  const indices = useMemo(() => 
    activeDayFilter >= 0 ? [activeDayFilter] : Array.from({length:7},(_,i)=>i),
    [activeDayFilter]
  )

  const openModal = useCallback((dayIdx, task = null) => {
    setModal({ isOpen: true, mode: task ? 'edit' : 'add', task, dayIdx })
  }, [])

  const closeModal = useCallback(() => {
    setModal({ isOpen: false, mode: 'add', task: null, dayIdx: null })
  }, [])

  const saveTask = useCallback((taskData) => {
    if (modal.mode === 'edit' && modal.task) {
      const tasks = getTasks(weekOffset, modal.dayIdx)
      const updated = tasks.map(t => t.id === modal.task.id ? { ...t, ...taskData } : t)
      setTasks(weekOffset, modal.dayIdx, updated)
    } else {
      const tasks = getTasks(weekOffset, modal.dayIdx)
      tasks.push({ id: nextId, ...taskData })
      setTasks(weekOffset, modal.dayIdx, tasks)
      setNextId(prev => prev + 1)
    }
    closeModal()
  }, [modal, weekOffset, nextId, getTasks, setTasks, closeModal])

  const deleteTask = useCallback((taskId) => {
    const tasks = getTasks(weekOffset, activeDayFilter >= 0 ? activeDayFilter : 0).filter(t => t.id !== taskId)
    if (activeDayFilter >= 0) {
      setTasks(weekOffset, activeDayFilter, tasks)
    } else {
      for (let i = 0; i < 7; i++) {
        const t = getTasks(weekOffset, i).filter(x => x.id !== taskId)
        setTasks(weekOffset, i, t)
      }
    }
  }, [weekOffset, activeDayFilter, getTasks, setTasks])

  const filterDay = useCallback((i) => {
    setActiveDayFilter(prev => prev === i ? -1 : i)
  }, [])

  const handleDragStart = useCallback((e, taskId, dayIdx) => {
    dragState.current = { id: taskId, fromDay: dayIdx }
    e.target.classList.add('dragging')
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', taskId)
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
          <div className="brand-title">Săptămâna mea</div>
          <div className="brand-sub">Planificator personal</div>
        </div>
        <div className="week-nav">
          <button className="nav-btn" onClick={() => setWeekOffset(w => w - 1)}>←</button>
          <div className="week-range">{formatWeekRange(weekOffset)}</div>
          <button className="nav-btn" onClick={() => setWeekOffset(w => w + 1)}>→</button>
        </div>
      </div>

      <div className="days-strip">
        {dates.map((d, i) => (
          <div
            key={i}
            className={`day-pill ${activeDayFilter === i ? 'active' : ''} ${isToday(d) ? 'today' : ''}`}
            onClick={() => filterDay(i)}
          >
            <span className="pname">{DAYS[i].slice(0,3)}</span>
            <span className="pnum">{d.getDate()}</span>
          </div>
        ))}
      </div>

      <div className="legend">
        <div className="leg-item"><div className="leg-dot" style={{background:'var(--work)'}}></div> Muncă</div>
        <div className="leg-item"><div className="leg-dot" style={{background:'var(--course)'}}></div> Curs</div>
        <div className="leg-item"><div className="leg-dot" style={{background:'var(--hobby)'}}></div> Hobby</div>
        <div className="leg-item"><div className="leg-dot" style={{background:'var(--personal)'}}></div> Personal</div>
      </div>

      <div className="grid">
        {indices.map(i => (
          <Column
            key={i}
            dayIdx={i}
            tasks={getTasks(weekOffset, i)}
            date={dates[i]}
            onAdd={(dayIdx) => openModal(dayIdx)}
            onEdit={(task) => openModal(modal.dayIdx ?? i, task)}
            onDelete={deleteTask}
            onDragStart={(e) => handleDragStart(e, e.target.dataset.id, i)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, i)}
            onDragLeave={(e) => handleDragLeave(e, i)}
            onDrop={(e) => handleDrop(e, i)}
            onTaskDragOver={handleTaskDragOver}
            onTaskDrop={handleTaskDrop}
          />
        ))}
      </div>

      <Modal
        isOpen={modal.isOpen}
        mode={modal.mode}
        task={modal.task}
        dayIdx={modal.dayIdx}
        onClose={closeModal}
        onSave={saveTask}
      />
    </div>
  )
}