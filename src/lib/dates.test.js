import { describe, it, expect } from 'vitest'
import {
  DAYS,
  MONTHS,
  dateKey,
  parseDateKey,
  minutesFromHHMM,
  hhmmFromMinutes,
  daysBetween,
  weekOffsetForDate,
  formatDateShort,
  formatDateLong,
} from './dates.js'

const D = new Date(2026, 9, 14)

function mondayOf(d) {
  const day = d.getDay() || 7
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - (day - 1))
}

function addDays(d, n) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

describe('fixtures', () => {
  it('14 oct 2026 este miercuri', () => {
    expect(D.getDay()).toBe(3)
  })

  it('DAYS are 7 zile', () => {
    expect(DAYS.length).toBe(7)
    expect(DAYS[0]).toBe('Luni')
    expect(DAYS[6]).toBe('Duminică')
  })

  it('MONTHS are 12 luni', () => {
    expect(MONTHS.length).toBe(12)
    expect(MONTHS[0]).toBe('ian')
    expect(MONTHS[9]).toBe('oct')
  })
})

describe('dateKey', () => {
  it('formatează data locală ca YYYY-MM-DD', () => {
    expect(dateKey(D)).toBe('2026-10-14')
  })

  it('completează cu zero luna și ziua', () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(dateKey(new Date(2026, 10, 3))).toBe('2026-11-03')
  })
})

describe('parseDateKey', () => {
  it('returnează miezul nopții local al datei', () => {
    const p = parseDateKey('2026-10-14')
    expect(p.getFullYear()).toBe(2026)
    expect(p.getMonth()).toBe(9)
    expect(p.getDate()).toBe(14)
    expect(p.getHours()).toBe(0)
    expect(p.getMinutes()).toBe(0)
    expect(p.getSeconds()).toBe(0)
    expect(p.getMilliseconds()).toBe(0)
  })

  it('face round-trip cu dateKey', () => {
    expect(dateKey(parseDateKey('2026-10-14'))).toBe('2026-10-14')
    expect(dateKey(parseDateKey('2026-01-05'))).toBe('2026-01-05')
  })
})

describe('minutesFromHHMM', () => {
  it('transformă 14:30 în 870 minute', () => {
    expect(minutesFromHHMM('14:30')).toBe(870)
  })

  it('transformă marginile zilei', () => {
    expect(minutesFromHHMM('00:00')).toBe(0)
    expect(minutesFromHHMM('23:59')).toBe(1439)
    expect(minutesFromHHMM('09:05')).toBe(545)
  })

  it('returnează null pentru gol sau invalid', () => {
    expect(minutesFromHHMM('')).toBeNull()
    expect(minutesFromHHMM('abc')).toBeNull()
    expect(minutesFromHHMM('25:00')).toBeNull()
    expect(minutesFromHHMM('12:60')).toBeNull()
    expect(minutesFromHHMM('14')).toBeNull()
  })
})

describe('hhmmFromMinutes', () => {
  it('transformă 870 în 14:30', () => {
    expect(hhmmFromMinutes(870)).toBe('14:30')
  })

  it('completează cu zero orele și minutele', () => {
    expect(hhmmFromMinutes(0)).toBe('00:00')
    expect(hhmmFromMinutes(5)).toBe('00:05')
    expect(hhmmFromMinutes(60)).toBe('01:00')
    expect(hhmmFromMinutes(1439)).toBe('23:59')
  })
})

describe('daysBetween', () => {
  it('numără zilele întregi între două date', () => {
    expect(daysBetween(new Date(2026, 9, 14), new Date(2026, 9, 19))).toBe(5)
  })

  it('returnează negativ pentru ordine inversă', () => {
    expect(daysBetween(new Date(2026, 9, 19), new Date(2026, 9, 14))).toBe(-5)
  })

  it('returnează 0 pentru aceeași zi', () => {
    expect(daysBetween(D, new Date(2026, 9, 14))).toBe(0)
  })

  it('tratează ambele date la miezul nopții', () => {
    expect(daysBetween(new Date(2026, 9, 14, 23, 59), new Date(2026, 9, 15, 0, 1))).toBe(1)
  })
})

describe('weekOffsetForDate', () => {
  it('returnează 0 pentru fiecare zi din săptămâna curentă', () => {
    const mon = mondayOf(new Date())
    for (let i = 0; i < 7; i++) {
      expect(weekOffsetForDate(addDays(mon, i))).toBe(0)
    }
  })

  it('returnează 1 pentru săptămâna următoare', () => {
    const mon = mondayOf(new Date())
    expect(weekOffsetForDate(addDays(mon, 7))).toBe(1)
    expect(weekOffsetForDate(addDays(mon, 13))).toBe(1)
  })

  it('returnează -1 pentru săptămâna anterioară', () => {
    const mon = mondayOf(new Date())
    expect(weekOffsetForDate(addDays(mon, -1))).toBe(-1)
    expect(weekOffsetForDate(addDays(mon, -7))).toBe(-1)
  })
})

describe('formatDateShort', () => {
  it('formatează ca „14 oct”', () => {
    expect(formatDateShort(D)).toBe('14 oct')
  })

  it('formatează alte date', () => {
    expect(formatDateShort(new Date(2026, 0, 1))).toBe('1 ian')
    expect(formatDateShort(new Date(2026, 11, 31))).toBe('31 dec')
  })
})

describe('formatDateLong', () => {
  it('formatează ca „Miercuri, 14 oct 2026”', () => {
    expect(formatDateLong(D)).toBe('Miercuri, 14 oct 2026')
  })

  it('folosește numele zilei cu prima literă mare', () => {
    expect(formatDateLong(new Date(2026, 0, 1))).toBe('Joi, 1 ian 2026')
    expect(formatDateLong(new Date(2026, 9, 18))).toBe('Duminică, 18 oct 2026')
  })
})