import { describe, expect, it } from 'vitest'
import { ALL_LESSONS, COURSES, findLesson, lessonsOf, wordsOfLesson } from './courses'
import { WORDS as ZH_WORDS } from './hsk1'
import { VI1, VI_WORDS } from './vi1'
import { toneVariants, vietnameseSyllables } from '../lib/vietnamese'

const HAN = /[㐀-鿿]/

describe('Khoá tiếng Việt cho người Trung', () => {
  it('có 5 unit, 10 bài, 60 từ — cùng khung với HSK 1', () => {
    expect(VI1.units).toHaveLength(5)
    expect(lessonsOf('vi')).toHaveLength(10)
    expect(VI_WORDS).toHaveLength(60)
  })

  it('mỗi từ nằm đúng một bài, và bài nào cũng đủ sáu từ có thật', () => {
    const used = lessonsOf('vi').flatMap((lesson) => lesson.wordIds)
    expect(new Set(used).size).toBe(used.length)
    expect(new Set(used)).toEqual(new Set(VI_WORDS.map((word) => word.id)))
    for (const lesson of lessonsOf('vi')) expect(wordsOfLesson(lesson.id)).toHaveLength(6)
  })

  it('id từ, id bài và id unit không trùng với HSK 1, vì tiến độ hai khoá nằm chung một chỗ', () => {
    const zhIds = new Set(ZH_WORDS.map((word) => word.id))
    for (const word of VI_WORDS) {
      expect(word.id.startsWith('vi-')).toBe(true)
      expect(zhIds.has(word.id)).toBe(false)
    }
    const lessonIds = ALL_LESSONS.map((lesson) => lesson.id)
    expect(new Set(lessonIds).size).toBe(lessonIds.length)
    const unitIds = [...COURSES.zh.course.units, ...COURSES.vi.course.units].map((unit) => unit.id)
    expect(new Set(unitIds).size).toBe(unitIds.length)
  })

  it('tra bài theo id thì biết luôn bài thuộc khoá nào', () => {
    expect(findLesson('vu1l1')?.track).toBe('vi')
    expect(findLesson('u1l1')?.track).toBe('zh')
  })

  it('nghĩa của từ và của câu mẫu đều viết bằng tiếng Trung, chữ thì không có chữ Hán', () => {
    for (const word of VI_WORDS) {
      expect(word.meaning).toMatch(HAN)
      expect(word.hanzi).not.toMatch(HAN)
      expect(word.pinyin).toBe('')
      for (const sentence of word.examples) {
        expect(sentence.meaning).toMatch(HAN)
        expect(sentence.hanzi).not.toMatch(HAN)
        expect(sentence.pinyin).toBe('')
      }
    }
  })

  it('mỗi từ có ba câu mẫu, câu nào cũng chứa đúng từ đó để tô được', () => {
    for (const word of VI_WORDS) {
      expect(word.examples).toHaveLength(3)
      for (const sentence of word.examples) {
        expect(sentence.hanzi.toLowerCase(), `${word.id}: ${sentence.hanzi}`).toContain(word.hanzi.toLowerCase())
      }
    }
  })

  it('từ nào cũng có ít nhất một câu vừa sức để ghép (3–7 mảnh)', () => {
    for (const word of VI_WORDS) {
      const fits = word.examples.some((sentence) => {
        const n = vietnameseSyllables(sentence.hanzi).length
        return n >= 3 && n <= 7
      })
      expect(fits, word.id).toBe(true)
    }
  })

  it('bài nào cũng có đủ hai từ mang dấu thanh, để đủ hai bài phân biệt thanh', () => {
    for (const lesson of lessonsOf('vi')) {
      const toned = wordsOfLesson(lesson.id).filter((word) => toneVariants(word.hanzi) !== null)
      expect(toned.length, lesson.id).toBeGreaterThanOrEqual(2)
    }
  })
})
