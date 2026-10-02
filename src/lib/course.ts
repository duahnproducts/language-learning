import { lessonsOf } from '../data/courses'
import type { LearnTrack } from '../types'

/**
 * Bài học nên gợi ý tiếp theo: bài chưa hoàn thành đầu tiên theo thứ tự khoá học.
 * Học xong hết thì quay lại bài cuối để ôn.
 */
export function nextLessonId(completedLessonIds: readonly string[], track: LearnTrack = 'zh'): string {
  const lessons = lessonsOf(track)
  const completed = new Set(completedLessonIds)
  const pending = lessons.find((lesson) => !completed.has(lesson.id))
  return pending ? pending.id : lessons[lessons.length - 1].id
}

/** Vị trí của một bài trong khoá của nó, bắt đầu từ 1. Trả về 0 nếu không tìm thấy. */
export function lessonPosition(lessonId: string): number {
  for (const track of ['zh', 'vi'] as const) {
    const index = lessonsOf(track).findIndex((lesson) => lesson.id === lessonId)
    if (index !== -1) return index + 1
  }
  return 0
}

/** Bài kế tiếp trong cùng khoá, hoặc null nếu đây đã là bài cuối. */
export function lessonAfter(lessonId: string): string | null {
  for (const track of ['zh', 'vi'] as const) {
    const lessons = lessonsOf(track)
    const index = lessons.findIndex((lesson) => lesson.id === lessonId)
    if (index === -1) continue
    return index === lessons.length - 1 ? null : lessons[index + 1].id
  }
  return null
}

/** Phần trăm khoá học đã hoàn thành, 0–100. Bài của khoá kia không được tính. */
export function courseCompletion(completedLessonIds: readonly string[], track: LearnTrack = 'zh'): number {
  const lessons = lessonsOf(track)
  return Math.round((completedInCourse(completedLessonIds, track) / lessons.length) * 100)
}

/** Số bài đã xong trong một khoá. */
export function completedInCourse(completedLessonIds: readonly string[], track: LearnTrack = 'zh'): number {
  const valid = new Set(lessonsOf(track).map((lesson) => lesson.id))
  return new Set(completedLessonIds.filter((id) => valid.has(id))).size
}

/** Tổng số bài học của một khoá. Hai khoá hiện cùng 10 bài. */
export function totalLessons(track: LearnTrack = 'zh'): number {
  return lessonsOf(track).length
}

/** Tổng số bài học của khoá HSK 1. */
export const TOTAL_LESSONS = totalLessons('zh')
