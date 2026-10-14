import { describe, it, expect } from 'vitest'
import { minutesFromHHMM } from './dates.js'
import {
  DEFAULT_DURATION,
  sortByTime,
  endMinutes,
  conflictIds,
  freeWindows,
  currentTask,
  nextTask,
  isPast,
  progress,
  busiestWindow,
} from './day.js'

describe('DEFAULT_DURATION', () => {
  it('este 60 de minute', () => {
    expect(DEFAULT_DURATION).toBe(60)
  })
})

describe('sortByTime', () => {
  it('sortează crescător după oră', () => {
    const a = { id: 1, title: 'a', time: '14:00' }
    const b = { id: 2, title: 'b', time: '09:00' }
    expect(sortByTime([a, b])).toEqual([b, a])
  })

  it('taskurile fără oră rămân la coadă, în ordine relativă', () => {
    const tasks = [
      { id: 1, time: '14:00' },
      { id: 2, time: '' },
      { id: 3, time: '09:00' },
      { id: 4 },
      { id: 5, time: 'abc' },
    ]
    expect(sortByTime(tasks).map((t) => t.id)).toEqual([3, 1, 2, 4, 5])
  })

  it('păstrează ordinea relativă pentru ore egale', () => {
    const a = { id: 1, time: '09:00' }
    const b = { id: 2, time: '09:00' }
    expect(sortByTime([a, b])).toEqual([a, b])
  })

  it('nu modifică array-ul original', () => {
    const a = { id: 1, time: '14:00' }
    const b = { id: 2, time: '09:00' }
    const input = [a, b]
    sortByTime(input)
    expect(input).toEqual([a, b])
  })
})

describe('endMinutes', () => {
  it('endTime valid, după start', () => {
    expect(endMinutes({ time: '14:00', endTime: '16:00' })).toBe(960)
  })

  it('endTime invalid (end <= start) folosește durata implicită', () => {
    expect(endMinutes({ time: '23:00', endTime: '01:00' })).toBe(minutesFromHHMM('23:00') + DEFAULT_DURATION)
    expect(endMinutes({ time: '14:00', endTime: '14:00' })).toBe(840 + 60)
  })

  it('fără endTime folosește durata implicită', () => {
    expect(endMinutes({ time: '14:00' })).toBe(minutesFromHHMM('14:00') + DEFAULT_DURATION)
    expect(endMinutes({ time: '14:00', endTime: '' })).toBe(900)
  })

  it('fără oră → null', () => {
    expect(endMinutes({})).toBeNull()
    expect(endMinutes({ endTime: '10:00' })).toBeNull()
  })
})

describe('currentTask', () => {
  it('task start-only e curent între start și start+60', () => {
    const t = { id: 1, time: '14:00' }
    expect(currentTask([t], 840)).toBe(t)
    expect(currentTask([t], 870)).toBe(t)
    expect(currentTask([t], 900)).toBeNull()
    expect(currentTask([t], 930)).toBeNull()
  })

  it('interval invalid folosește durata implicită', () => {
    const t = { id: 1, time: '23:00', endTime: '01:00' }
    expect(currentTask([t], 1410)).toBe(t)
    expect(currentTask([t], 1440)).toBeNull()
  })

  it('returnează primul task curent din array', () => {
    const a = { id: 1, time: '14:00', endTime: '15:00' }
    const b = { id: 2, time: '14:30', endTime: '16:00' }
    expect(currentTask([a, b], 870).id).toBe(1)
    expect(currentTask([b, a], 870).id).toBe(2)
  })

  it('fără oră nu e niciodată curent', () => {
    expect(currentTask([{ id: 1, time: '' }], 500)).toBeNull()
  })
})

describe('isPast', () => {
  it('task start-only e trecut după start+60', () => {
    const t = { id: 1, time: '14:00' }
    expect(isPast(t, 870)).toBe(false)
    expect(isPast(t, 900)).toBe(false)
    expect(isPast(t, 930)).toBe(true)
  })

  it('fără oră → false', () => {
    expect(isPast({}, 930)).toBe(false)
  })
})

describe('taskuri fără oră', () => {
  const timeless = { id: 'x', title: 'fără oră', time: '' }

  it('nu intră în conflicte', () => {
    const timed1 = { id: 'a', time: '09:00', endTime: '10:00' }
    const timed2 = { id: 'b', time: '09:30', endTime: '11:00' }
    const set = conflictIds([timeless, timed1, timed2])
    expect(set.has('x')).toBe(false)
    expect(set.has('a')).toBe(true)
    expect(set.has('b')).toBe(true)
  })

  it('nu e curent și nu e următor', () => {
    expect(currentTask([timeless], 500)).toBeNull()
    expect(nextTask([timeless], 0)).toBeNull()
    expect(nextTask([timeless, { id: 'a', time: '14:00' }], 600).id).toBe('a')
  })

  it('nu creează ferestre libere și nu e busiest', () => {
    expect(freeWindows([timeless])).toEqual([])
    expect(busiestWindow([timeless])).toBeNull()
  })
})

describe('interval invalid (end <= start)', () => {
  const invalid = { id: 'x', time: '23:00', endTime: '01:00' }
  const after = { id: 'y', time: '23:30' }

  it('endMinutes = start + durata implicită', () => {
    expect(endMinutes(invalid)).toBe(1440)
  })

  it('nu intră în conflictIds', () => {
    expect(conflictIds([invalid, after]).size).toBe(0)
  })

  it('nu creează fereastră liberă falsă', () => {
    expect(freeWindows([invalid, after])).toEqual([])
    expect(freeWindows([invalid])).toEqual([])
  })

  it('nu intră în busiestWindow', () => {
    expect(busiestWindow([invalid, after])).toEqual({ start: 1410, end: 1470 })
  })
})

describe('conflictIds', () => {
  it('suprapunere → ambele id-uri', () => {
    const a = { id: 'a', time: '09:00', endTime: '10:00' }
    const b = { id: 'b', time: '09:30', endTime: '11:00' }
    const set = conflictIds([a, b])
    expect(set.has('a')).toBe(true)
    expect(set.has('b')).toBe(true)
    expect(set.size).toBe(2)
  })

  it('capete care se ating nu conflictă', () => {
    const a = { id: 'a', time: '09:00', endTime: '10:00' }
    const b = { id: 'b', time: '10:00', endTime: '11:00' }
    expect(conflictIds([a, b]).size).toBe(0)
  })

  it('task start-only conflictă pe durata implicită', () => {
    const a = { id: 'a', time: '09:00' }
    const b = { id: 'b', time: '09:30', endTime: '11:00' }
    const set = conflictIds([a, b])
    expect(set.has('a')).toBe(true)
    expect(set.has('b')).toBe(true)
  })

  it('lanț de suprapuneri → toți id-urile în set', () => {
    const a = { id: 'a', time: '09:00', endTime: '10:00' }
    const b = { id: 'b', time: '09:30', endTime: '10:30' }
    const c = { id: 'c', time: '10:00', endTime: '11:00' }
    const set = conflictIds([a, b, c])
    expect(set.size).toBe(3)
  })
})

describe('freeWindows', () => {
  it('golul dintre intervalele ocupate, în minute', () => {
    const tasks = [
      { id: 'a', time: '09:00', endTime: '10:00' },
      { id: 'b', time: '14:00', endTime: '15:00' },
    ]
    expect(freeWindows(tasks)).toEqual([{ start: 600, end: 840 }])
  })

  it('gol sub minMinutes nu apare', () => {
    const tasks = [
      { id: 'a', time: '09:00', endTime: '10:00' },
      { id: 'b', time: '10:20', endTime: '11:00' },
    ]
    expect(freeWindows(tasks)).toEqual([])
  })

  it('respectă minMinutes dat', () => {
    const tasks = [
      { id: 'a', time: '09:00', endTime: '10:00' },
      { id: 'b', time: '10:20', endTime: '11:00' },
    ]
    expect(freeWindows(tasks, 20)).toEqual([{ start: 600, end: 620 }])
  })

  it('intervale care se ating fuzionează fără gol', () => {
    const tasks = [
      { id: 'a', time: '09:00', endTime: '10:00' },
      { id: 'b', time: '10:00', endTime: '11:00' },
    ]
    expect(freeWindows(tasks)).toEqual([])
  })

  it('fără taskuri cu oră → []', () => {
    expect(freeWindows([])).toEqual([])
    expect(freeWindows([{ id: 'x', time: '' }])).toEqual([])
  })

  it('un singur task cu oră → fără ferestre', () => {
    expect(freeWindows([{ id: 'a', time: '09:00', endTime: '10:00' }])).toEqual([])
  })
})

describe('nextTask', () => {
  it('primul task cu oră, după now', () => {
    const past = { id: 'p', time: '09:00', endTime: '10:00' }
    const upcoming = { id: 'n', time: '14:00' }
    const timeless = { id: 'x', time: '' }
    expect(nextTask([past, upcoming, timeless], 600)).toBe(upcoming)
  })

  it('exact la startul taskului nu mai e următor', () => {
    const t = { id: 'n', time: '14:00' }
    expect(nextTask([t], 840)).toBeNull()
  })
})

describe('busiestWindow', () => {
  it('cel mai lung interval continuu ocupat, fuzionat', () => {
    const tasks = [
      { id: 'a', time: '09:00', endTime: '10:00' },
      { id: 'b', time: '09:30', endTime: '12:00' },
    ]
    expect(busiestWindow(tasks)).toEqual({ start: 540, end: 720 })
  })

  it('alege cel mai lung dintre intervalele separate', () => {
    const tasks = [
      { id: 'a', time: '09:00', endTime: '10:00' },
      { id: 'b', time: '11:00', endTime: '13:00' },
    ]
    expect(busiestWindow(tasks)).toEqual({ start: 660, end: 780 })
  })

  it('fără taskuri cu oră → null', () => {
    expect(busiestWindow([])).toBeNull()
    expect(busiestWindow([{ id: 'x', time: '' }])).toBeNull()
  })
})

describe('progress', () => {
  it('numără bifate și total', () => {
    const tasks = [
      { id: 1, done: true },
      { id: 2, done: true },
      { id: 3 },
    ]
    expect(progress(tasks)).toEqual({ done: 2, total: 3 })
  })

  it('doar done === true se numără', () => {
    const tasks = [
      { id: 1, done: false },
      { id: 2 },
      { id: 3, done: 'yes' },
    ]
    expect(progress(tasks)).toEqual({ done: 0, total: 3 })
  })
})