import { describe, expect, it } from 'vitest'
import { ALL_LESSONS } from '../data/hsk1'
import {
  TOTAL_LESSONS,
  courseCompletion,
  lessonAfter,
  lessonPosition,
  nextLessonId,
} from './course'

describe('nextLessonId', () => {
  it('người mới bắt đầu từ bài đầu tiên', () => {
    expect(nextLessonId([])).toBe(ALL_LESSONS[0].id)
  })

  it('bỏ qua những bài đã hoàn thành', () => {
    expect(nextLessonId([ALL_LESSONS[0].id])).toBe(ALL_LESSONS[1].id)
  })

  it('lấy bài chưa xong đầu tiên, kể cả khi người học nhảy cóc', () => {
    expect(nextLessonId([ALL_LESSONS[1].id, ALL_LESSONS[2].id])).toBe(ALL_LESSONS[0].id)
  })

  it('học xong hết thì quay lại bài cuối để ôn', () => {
    const all = ALL_LESSONS.map((lesson) => lesson.id)
    expect(nextLessonId(all)).toBe(ALL_LESSONS[ALL_LESSONS.length - 1].id)
  })
})

describe('lessonPosition', () => {
  it('đánh số từ 1', () => {
    expect(lessonPosition(ALL_LESSONS[0].id)).toBe(1)
    expect(lessonPosition(ALL_LESSONS[3].id)).toBe(4)
  })

  it('trả về 0 với bài không tồn tại', () => {
    expect(lessonPosition('không-có')).toBe(0)
  })
})

describe('lessonAfter', () => {
  it('trả về bài kế tiếp', () => {
    expect(lessonAfter(ALL_LESSONS[0].id)).toBe(ALL_LESSONS[1].id)
  })

  it('trả về null ở bài cuối cùng', () => {
    expect(lessonAfter(ALL_LESSONS[ALL_LESSONS.length - 1].id)).toBeNull()
  })

  it('trả về null với bài không tồn tại', () => {
    expect(lessonAfter('không-có')).toBeNull()
  })
})

describe('courseCompletion', () => {
  it('chưa học gì là 0%', () => {
    expect(courseCompletion([])).toBe(0)
  })

  it('học hết là 100%', () => {
    expect(courseCompletion(ALL_LESSONS.map((lesson) => lesson.id))).toBe(100)
  })

  it('tính đúng phần trăm giữa chừng', () => {
    const half = ALL_LESSONS.slice(0, TOTAL_LESSONS / 2).map((lesson) => lesson.id)
    expect(courseCompletion(half)).toBe(50)
  })

  it('bỏ qua id lạ và id trùng lặp', () => {
    const first = ALL_LESSONS[0].id
    expect(courseCompletion([first, first, 'id-rác'])).toBe(courseCompletion([first]))
  })
})

describe('Khoá tiếng Việt', () => {
  it('người mới bắt đầu từ bài đầu của khoá tiếng Việt', () => {
    expect(nextLessonId([], 'vi')).toBe('vu1l1')
  })

  it('bài của khoá này không tính vào tiến độ khoá kia', () => {
    expect(courseCompletion(['u1l1', 'u1l2'], 'vi')).toBe(0)
    expect(courseCompletion(['vu1l1'], 'vi')).toBe(10)
    expect(nextLessonId(['vu1l1'], 'zh')).toBe(ALL_LESSONS[0].id)
  })

  it('bài kế tiếp và vị trí bài tính trong đúng khoá của nó', () => {
    expect(lessonAfter('vu1l1')).toBe('vu1l2')
    expect(lessonAfter('vu5l2')).toBeNull()
    expect(lessonPosition('vu2l1')).toBe(3)
  })
})
