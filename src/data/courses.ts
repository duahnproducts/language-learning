import type { Course, LearnTrack, Word } from '../types'
import { HSK1, WORD_BY_ID as ZH_WORD_BY_ID, WORDS as ZH_WORDS } from './hsk1'
import { VI1, VI_WORD_BY_ID, VI_WORDS } from './vi1'

/**
 * Hai khoá học, mỗi thứ tiếng một khoá.
 *
 * Id bài và id từ của hai khoá không trùng nhau, nên các màn trong một bài học
 * (`/lesson/:lessonId/...`) tra thẳng theo id mà không cần biết người học đang
 * ở khoá nào. Chỉ những màn liệt kê cả khoá — Trang chủ, Học, Tiến độ — mới cần
 * hỏi `progress.track`.
 */
export const COURSES: Record<LearnTrack, { course: Course; words: Word[] }> = {
  zh: { course: HSK1, words: ZH_WORDS },
  vi: { course: VI1, words: VI_WORDS },
}

/** Một bài học kèm unit và khoá chứa nó. */
export interface LessonEntry {
  id: string
  title: string
  description: string
  wordIds: string[]
  unitId: string
  unitTitle: string
  track: LearnTrack
}

/** Mọi bài học của một khoá, theo đúng thứ tự học. */
export function lessonsOf(track: LearnTrack): LessonEntry[] {
  return COURSES[track].course.units.flatMap((unit) =>
    unit.lessons.map((lesson) => ({ ...lesson, unitId: unit.id, unitTitle: unit.title, track })),
  )
}

/** Mọi bài học của cả hai khoá. */
export const ALL_LESSONS: LessonEntry[] = [...lessonsOf('zh'), ...lessonsOf('vi')]

/** Mọi từ của cả hai khoá, tra theo id. */
export const WORD_BY_ID: Record<string, Word> = { ...ZH_WORD_BY_ID, ...VI_WORD_BY_ID }

/** Tìm một bài học trong cả hai khoá. */
export function findLesson(lessonId: string): LessonEntry | undefined {
  return ALL_LESSONS.find((lesson) => lesson.id === lessonId)
}

/** Lấy danh sách Word của một bài học. */
export function wordsOfLesson(lessonId: string): Word[] {
  const lesson = findLesson(lessonId)
  if (!lesson) return []
  return lesson.wordIds.map((id) => WORD_BY_ID[id]).filter(Boolean)
}
