import { useState, useEffect, useRef } from 'react'
import { TYPE } from '../lib/types.js'
import { DAYS } from '../lib/dates.js'
import './Modal.css'

export default function Modal({ isOpen, mode, task, dayIdx, dayLabel, isRecurring, onClose, onSave }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('work')
  const [time, setTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [repeat, setRepeat] = useState('nu')
  const [days, setDays] = useState([])
  const [dayOfMonth, setDayOfMonth] = useState(1)
  const titleRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && task) {
        setTitle(task.title)
        setType(task.type)
        setTime(task.time || '')
        setEndTime(task.endTime || '')
        const rep = task.repeat === 'weekly' || task.repeat === 'monthly' ? task.repeat : 'nu'
        setRepeat(rep)
        const ds = Array.isArray(task.days) ? task.days.filter(d => d >= 0 && d <= 6) : []
        setDays(ds.length > 0 ? ds : (dayIdx != null ? [dayIdx] : [0]))
        setDayOfMonth(Math.min(31, Math.max(1, Number(task.dayOfMonth) || 1)))
      } else {
        setTitle('')
        setType('work')
        setTime('')
        setEndTime('')
        setRepeat('nu')
        setDays(dayIdx != null ? [dayIdx] : [0])
        setDayOfMonth(1)
      }
      setTimeout(() => titleRef.current?.focus(), 80)
    }
  }, [isOpen, mode, task, dayIdx, isRecurring])

  const toggleDay = (i) => {
    setDays(prev => prev.includes(i) ? prev.filter(d => d !== i) : [...prev, i].sort((a, b) => a - b))
  }

  const handleDayOfMonth = (e) => {
    const v = e.target.value === '' ? 1 : Math.min(31, Math.max(1, Number(e.target.value)))
    setDayOfMonth(v)
  }

  const handleSave = () => {
    if (!title.trim()) {
      titleRef.current?.focus()
      return
    }
    const base = { title: title.trim(), type, time, endTime }
    if (repeat === 'nu') onSave(base)
    else onSave({ ...base, repeat, days, dayOfMonth })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave()
  }

  const headerText = mode === 'edit'
    ? 'Editează task'
    : `Adaugă în ${dayLabel || (dayIdx != null ? DAYS[dayIdx] : '')}`

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
        <div className="field">
          <label>Tip</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {Object.entries(TYPE).map(([key, t]) => (
              <option key={key} value={key}>{t.label}</option>
            ))}
          </select>
        </div>
        <div className="field-row">
          <div className="field">
            <label>Început</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              onClick={(e) => { try { e.target.showPicker() } catch (err) {} }}
            />
          </div>
          <div className="field">
            <label>Sfârșit</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              onClick={(e) => { try { e.target.showPicker() } catch (err) {} }}
            />
          </div>
        </div>
        <div className="field">
          <label>Se repetă</label>
          <div className="repeat-opts">
            <button type="button" className={`repeat-opt ${repeat === 'nu' ? 'active' : ''}`} onClick={() => setRepeat('nu')}>Nu</button>
            <button type="button" className={`repeat-opt ${repeat === 'weekly' ? 'active' : ''}`} onClick={() => setRepeat('weekly')}>Săptămânal</button>
            <button type="button" className={`repeat-opt ${repeat === 'monthly' ? 'active' : ''}`} onClick={() => setRepeat('monthly')}>Lunar</button>
          </div>
        </div>
        {repeat === 'weekly' && (
          <div className="field">
            <label>Zilele</label>
            <div className="day-chips">
              {DAYS.map((d, i) => (
                <button
                  type="button"
                  key={i}
                  className={`day-chip ${days.includes(i) ? 'active' : ''}`}
                  onClick={() => toggleDay(i)}
                >
                  {d.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>
        )}
        {repeat === 'monthly' && (
          <div className="field field-num">
            <label>Ziua din lună</label>
            <input
              type="number"
              min="1"
              max="31"
              value={dayOfMonth}
              onChange={handleDayOfMonth}
            />
          </div>
        )}
        <div className="modal-btns">
          <button className="mbtn cancel" onClick={onClose}>Anulează</button>
          <button className="mbtn save" onClick={handleSave}>Salvează</button>
        </div>
      </div>
    </div>
  )
}