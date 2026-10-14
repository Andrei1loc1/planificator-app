import { describe, it, expect } from 'vitest'
import { matchesDate, instancesOnDate, nextOccurrences, markRecurringDone } from './recurring.js'
import { dateKey } from './dates.js'

const TUE = new Date(2026, 9, 13)
const WED = new Date(2026, 9, 14)
const THU = new Date(2026, 9, 15)
const FRI = new Date(2026, 9, 16)

describe('matchesDate', () => {
  it('weekly: potrivește zilele 0=Luni..6=Duminică', () => {
    const r = { id: 1, title: 'Gym', type: 'health', time: '18:00', endTime: '19:00', repeat: 'weekly', days: [2, 4] }
    expect(matchesDate(r, FRI)).toBe(true)
    expect(matchesDate(r, TUE)).toBe(false)
  })

  it('monthly: potrivește ziua lunii', () => {
    const r = { id: 2, title: 'Facturi', type: 'personal', repeat: 'monthly', dayOfMonth: 14 }
    expect(matchesDate(r, WED)).toBe(true)
    expect(matchesDate(r, FRI)).toBe(false)
  })

  it('monthly: 31 nu există în februarie 2026, fără throw', () => {
    const r = { repeat: 'monthly', dayOfMonth: 31 }
    expect(() => matchesDate(r, new Date(2026, 1, 28))).not.toThrow()
    expect(matchesDate(r, new Date(2026, 1, 28))).toBe(false)
  })

  it('fără days sau dayOfMonth returnează false, fără throw', () => {
    expect(() => matchesDate({ repeat: 'weekly' }, WED)).not.toThrow()
    expect(matchesDate({ repeat: 'weekly' }, WED)).toBe(false)
    expect(() => matchesDate({ repeat: 'monthly' }, WED)).not.toThrow()
    expect(matchesDate({ repeat: 'monthly' }, WED)).toBe(false)
    expect(() => matchesDate({}, WED)).not.toThrow()
    expect(matchesDate({}, WED)).toBe(false)
  })
})

describe('instancesOnDate', () => {
  const tpl = { id: 7, title: 'Sala', type: 'health', time: '18:00', endTime: '19:00', repeat: 'weekly', days: [2] }

  it('creează instanță cu id „r<id>”', () => {
    const out = instancesOnDate([tpl], WED)
    expect(out.length).toBe(1)
    expect(out[0]).toEqual({
      id: 'r7',
      recurringId: 7,
      title: 'Sala',
      type: 'health',
      time: '18:00',
      endTime: '19:00',
      repeat: 'weekly',
      done: false,
    })
  })

  it('done=true când doneDates conține dateKey(date)', () => {
    const done = { ...tpl, doneDates: [dateKey(WED)] }
    expect(instancesOnDate([done], WED)[0].done).toBe(true)
  })

  it('date nepotrivită → []', () => {
    expect(instancesOnDate([tpl], TUE)).toEqual([])
  })

  it('nu sortează instanțele', () => {
    const evening = { ...tpl, id: 1, time: '18:00' }
    const morning = { ...tpl, id: 2, time: '07:00' }
    const out = instancesOnDate([evening, morning], WED)
    expect(out.map(i => i.id)).toEqual(['r1', 'r2'])
  })
})

describe('nextOccurrences', () => {
  it('listă goală → []', () => {
    expect(nextOccurrences([], WED, 5)).toEqual([])
  })

  it('începe din fromDate (daysUntil 0) și urcă pe date', () => {
    const t = { id: 3, title: 'Antrenament', type: 'health', time: '18:00', repeat: 'weekly', days: [0, 2, 4] }
    const out = nextOccurrences([t], WED, 2)
    expect(out.length).toBe(2)
    expect(out[0].r).toBe(t)
    expect(out[0].date.getFullYear()).toBe(2026)
    expect(out[0].date.getMonth()).toBe(9)
    expect(out[0].date.getDate()).toBe(14)
    expect(out[0].daysUntil).toBe(0)
    expect(out[1].date.getDate()).toBe(16)
    expect(out[1].daysUntil).toBe(2)
  })

  it('aceeași zi: ordonat după oră, 07:00 înainte de 18:00', () => {
    const evening = { id: 4, title: 'Seară', type: 'hobby', time: '18:00', repeat: 'weekly', days: [0, 2, 4] }
    const morning = { id: 5, title: 'Dimineață', type: 'health', time: '07:00', repeat: 'weekly', days: [2] }
    const out = nextOccurrences([evening, morning], WED, 3)
    expect(out[0].r.id).toBe(5)
    expect(out[0].date.getDate()).toBe(14)
    expect(out[0].daysUntil).toBe(0)
    expect(out[1].r.id).toBe(4)
    expect(out[1].date.getDate()).toBe(14)
    expect(out[1].daysUntil).toBe(0)
    expect(out[2].r.id).toBe(4)
    expect(out[2].date.getDate()).toBe(16)
    expect(out[2].daysUntil).toBe(2)
  })

  it('șablon fără oră vine ultim în aceeași zi', () => {
    const timeless = { id: 8, title: 'Fără oră', type: 'personal', repeat: 'weekly', days: [2] }
    const timed = { id: 9, title: 'La oră', type: 'personal', time: '09:00', repeat: 'weekly', days: [2] }
    const out = nextOccurrences([timeless, timed], WED, 2)
    expect(out[0].r.id).toBe(9)
    expect(out[1].r.id).toBe(8)
  })

  it('dayOfMonth 31 sare februarie → 31 martie, fără crash', () => {
    const t = { id: 6, title: 'Rate', type: 'personal', repeat: 'monthly', dayOfMonth: 31 }
    let out
    expect(() => { out = nextOccurrences([t], new Date(2026, 1, 28), 1) }).not.toThrow()
    expect(out.length).toBe(1)
    expect(out[0].date.getMonth()).toBe(2)
    expect(out[0].date.getDate()).toBe(31)
    expect(out[0].daysUntil).toBe(31)
  })

  it('oprește după count elemente', () => {
    const t = { id: 10, title: 'Lunar', type: 'personal', repeat: 'monthly', dayOfMonth: 14 }
    const out = nextOccurrences([t], WED, 1)
    expect(out.length).toBe(1)
  })
})

describe('markRecurringDone', () => {
  const tpl = { id: 7, title: 'Sala', type: 'health', time: '18:00', repeat: 'weekly', days: [2, 3] }

  it('bifează doar data dată', () => {
    const updated = markRecurringDone([tpl], 7, '2026-10-14')
    expect(instancesOnDate(updated, WED)[0].done).toBe(true)
    expect(instancesOnDate(updated, THU)[0].done).toBe(false)
  })

  it('al doilea apel comută înapoi', () => {
    const once = markRecurringDone([tpl], 7, '2026-10-14')
    const twice = markRecurringDone(once, 7, '2026-10-14')
    expect(instancesOnDate(once, WED)[0].done).toBe(true)
    expect(instancesOnDate(twice, WED)[0].done).toBe(false)
  })

  it('nu mutează șablonul original', () => {
    const original = { ...tpl }
    markRecurringDone([original], 7, '2026-10-14')
    expect(original.doneDates).toBeUndefined()
  })

  it('returnează listă nouă, fără să atingă alte șabloane', () => {
    const other = { ...tpl, id: 8 }
    const list = [tpl, other]
    const updated = markRecurringDone(list, 7, '2026-10-14')
    expect(updated).not.toBe(list)
    expect(updated[1]).toBe(other)
    expect(updated[0]).not.toBe(tpl)
  })

  it('păstrează doneDates sortat crescător', () => {
    const original = { ...tpl, doneDates: ['2026-10-16'] }
    const updated = markRecurringDone([original], 7, '2026-10-14')
    expect(updated[0].doneDates).toEqual(['2026-10-14', '2026-10-16'])
  })
})