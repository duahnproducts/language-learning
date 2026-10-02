import { describe, expect, it } from 'vitest'
import { createProgress } from './progress'
import { STORAGE_KEY, clearProgress, loadProgress, saveProgress } from './storage'

describe('loadProgress', () => {
  it('trả về tiến độ mặc định khi chưa có gì được lưu', () => {
    expect(loadProgress()).toEqual(createProgress())
  })

  it('đọc lại đúng những gì đã lưu', () => {
    const progress = { ...createProgress('Duy'), xp: 420, streak: 7, lastGoalDate: '2026-09-22' }
    saveProgress(progress)
    expect(loadProgress()).toEqual(progress)
  })

  it('không vỡ khi dữ liệu lưu bị hỏng', () => {
    localStorage.setItem(STORAGE_KEY, '{ này không phải JSON')
    expect(loadProgress()).toEqual(createProgress())
  })

  it('không vỡ khi dữ liệu lưu không phải object', () => {
    localStorage.setItem(STORAGE_KEY, '"chuỗi bất kỳ"')
    expect(loadProgress()).toEqual(createProgress())
  })

  it('bù giá trị mặc định cho trường bị thiếu', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ xp: 100 }))
    const progress = loadProgress()
    expect(progress.xp).toBe(100)
    expect(progress.dailyGoal).toBe(createProgress().dailyGoal)
    expect(progress.completedLessonIds).toEqual([])
    expect(progress.words).toEqual({})
  })

  it('bỏ qua trường sai kiểu', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ xp: 'nhiều lắm', completedLessonIds: 'u1l1', words: 5 }),
    )
    const progress = loadProgress()
    expect(progress.xp).toBe(0)
    expect(progress.completedLessonIds).toEqual([])
    expect(progress.words).toEqual({})
  })

  it('lọc phần tử rác trong danh sách lesson', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ completedLessonIds: ['u1l1', 42, null] }))
    expect(loadProgress().completedLessonIds).toEqual(['u1l1'])
  })

  it('không nhận XP âm', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ xp: -500, streak: -3 }))
    const progress = loadProgress()
    expect(progress.xp).toBe(0)
    expect(progress.streak).toBe(0)
  })

  it('chuẩn hoá lại tiến độ từng từ', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ words: { nihao: { known: 2 }, hong: 'rác' } }),
    )
    const progress = loadProgress()
    expect(progress.words.nihao).toEqual({
      wordId: 'nihao',
      known: 2,
      unknown: 0,
      lastReviewed: '',
    })
    expect(progress.words.hong).toBeUndefined()
  })
})

describe('saveProgress', () => {
  it('ghi vào đúng khoá localStorage', () => {
    saveProgress(createProgress('Duy'))
    expect(localStorage.getItem(STORAGE_KEY)).toContain('Duy')
  })

  it('không ném lỗi khi localStorage từ chối ghi', () => {
    const broken = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    } as Storage

    expect(() => saveProgress(createProgress(), broken)).not.toThrow()
    expect(loadProgress(broken)).toEqual(createProgress())
  })
})

describe('clearProgress', () => {
  it('xoá sạch tiến độ đã lưu', () => {
    saveProgress({ ...createProgress(), xp: 999 })
    clearProgress()
    expect(loadProgress()).toEqual(createProgress())
  })
})

describe('Hướng học', () => {
  it('bản lưu từ trước khi có lựa chọn này được coi là người Việt học tiếng Trung', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: 'Duy', xp: 10 }))
    expect(loadProgress().track).toBe('zh')
  })

  it('đọc lại đúng hướng học tiếng Việt', () => {
    saveProgress(createProgress('Lan', 'vi'))
    expect(loadProgress().track).toBe('vi')
  })

  it('giá trị lạ thì về mặc định', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ track: 'fr' }))
    expect(loadProgress().track).toBe('zh')
  })
})
