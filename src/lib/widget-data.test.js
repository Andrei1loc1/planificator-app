import { describe, it, expect } from 'vitest'
import { buildWidgetPayload } from './widget-data.js'
import { dateKey, formatDateLong, getDayKey, weekOffsetForDate } from './dates.js'
import { TYPE } from './types.js'

const WED = new Date(2026, 9, 14)
const THU = new Date(2026, 9, 15)
const FRI = new Date(2026, 9, 16)

const wedKey = dateKey(WED)
const thuKey = dateKey(THU)
const friKey = dateKey(FRI)

const weekKey = () => getDayKey(weekOffsetForDate(WED), (WED.getDay() + 6) % 7)

const regularDone = { id: 1, title: 'Raport', type: 'work', time: '09:00', endTime: '10:00', done: true }
const regularOpen = { id: 2, title: 'Alergare', type: 'health', time: '18:00', endTime: '19:00' }
const weeklyTpl = { id: 7, title: 'Sala', type: 'health', time: '18:00', endTime: '19:00', repeat: 'weekly', days: [2, 3] }

const store = () => ({ [weekKey()]: [regularDone, regularOpen] })

describe('buildWidgetPayload', () => {
  it('fereastră de 3 zile: cheile sunt dateKey pentru fromDate, +1, +2', () => {
    const payload = buildWidgetPayload(store(), [weeklyTpl], WED)
    expect(Object.keys(payload.days)).toEqual([wedKey, thuKey, friKey])
  })

  it('parametrul days limitează fereastra', () => {
    const payload = buildWidgetPayload(store(), [weeklyTpl], WED, 2)
    expect(Object.keys(payload.days)).toEqual([wedKey, thuKey])
  })

  it('task normal apare cu title/start/end/color/done corecte', () => {
    const payload = buildWidgetPayload(store(), [weeklyTpl], WED)
    const tasks = payload.days[wedKey].tasks
    expect(tasks.find(t => t.title === 'Raport')).toEqual({
      title: 'Raport',
      start: '09:00',
      end: '10:00',
      color: TYPE.work.hex,
      done: true,
    })
    expect(tasks.find(t => t.title === 'Alergare')).toEqual({
      title: 'Alergare',
      start: '18:00',
      end: '19:00',
      color: TYPE.health.hex,
      done: false,
    })
  })

  it('taskurile sunt sortate după oră', () => {
    const payload = buildWidgetPayload(store(), [weeklyTpl], WED)
    expect(payload.days[wedKey].tasks.map(t => t.title)).toEqual(['Raport', 'Alergare', 'Sala'])
  })

  it('instanță recurring apare în zilele potrivite cu done:false', () => {
    const payload = buildWidgetPayload({}, [weeklyTpl], WED)
    const expected = [{ title: 'Sala', start: '18:00', end: '19:00', color: TYPE.health.hex, done: false }]
    expect(payload.days[wedKey].tasks).toEqual(expected)
    expect(payload.days[thuKey].tasks).toEqual(expected)
    expect(payload.days[friKey].tasks).toEqual([])
  })

  it('doneDates cu dateKey-ul zilei → instanță done:true doar în acea zi', () => {
    const tpl = { ...weeklyTpl, doneDates: [wedKey] }
    const payload = buildWidgetPayload({}, [tpl], WED)
    expect(payload.days[wedKey].tasks[0].done).toBe(true)
    expect(payload.days[thuKey].tasks[0].done).toBe(false)
  })

  it('total/done reflectă progresul zilei', () => {
    const payload = buildWidgetPayload(store(), [weeklyTpl], WED)
    expect(payload.days[wedKey].total).toBe(3)
    expect(payload.days[wedKey].done).toBe(1)
    expect(payload.days[thuKey].total).toBe(1)
    expect(payload.days[thuKey].done).toBe(0)
  })

  it('1 din 2 bifate → done:1, total:2', () => {
    const s = { [weekKey()]: [regularDone, { id: 3, title: 'B', type: 'personal', time: '20:00' }] }
    const payload = buildWidgetPayload(s, [], WED)
    expect(payload.days[wedKey].done).toBe(1)
    expect(payload.days[wedKey].total).toBe(2)
  })

  it('zi goală → label, total 0, done 0, tasks []', () => {
    const payload = buildWidgetPayload(store(), [weeklyTpl], WED)
    expect(payload.days[friKey]).toEqual({ label: formatDateLong(FRI), total: 0, done: 0, tasks: [] })
  })

  it('label = formatDateLong pentru fiecare zi', () => {
    const payload = buildWidgetPayload({}, [], WED)
    expect(payload.days[wedKey].label).toBe(formatDateLong(WED))
    expect(payload.days[thuKey].label).toBe(formatDateLong(THU))
    expect(payload.days[friKey].label).toBe(formatDateLong(FRI))
  })

  it('tip necunoscut → culoarea work', () => {
    const s = { [weekKey()]: [{ id: 4, title: 'X', type: 'altceva', time: '08:00' }] }
    const payload = buildWidgetPayload(s, [], WED)
    expect(payload.days[wedKey].tasks[0].color).toBe(TYPE.work.hex)
  })

  it('task fără oră → start și end goale', () => {
    const s = { [weekKey()]: [{ id: 5, title: 'Fără oră', type: 'rest' }] }
    const payload = buildWidgetPayload(s, [], WED)
    expect(payload.days[wedKey].tasks[0]).toEqual({
      title: 'Fără oră',
      start: '',
      end: '',
      color: TYPE.rest.hex,
      done: false,
    })
  })
})