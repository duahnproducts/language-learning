import type { UserProgress, WordProgress } from '../types'
import { createProgress } from './progress'

/** Khoá localStorage. Có đánh số version để sau này đổi cấu trúc dữ liệu còn di trú được. */
export const STORAGE_KEY = 'chinese-learning-app:progress:v1'

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function asNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function asWords(value: unknown): Record<string, WordProgress> {
  if (typeof value !== 'object' || value === null) return {}
  const result: Record<string, WordProgress> = {}
  for (const [wordId, raw] of Object.entries(value as Record<string, unknown>)) {
    if (typeof raw !== 'object' || raw === null) continue
    const entry = raw as Record<string, unknown>
    result[wordId] = {
      wordId,
      known: asNumber(entry.known, 0),
      unknown: asNumber(entry.unknown, 0),
      lastReviewed: asString(entry.lastReviewed, ''),
    }
  }
  return result
}

/**
 * Đọc tiến độ đã lưu.
 * Dữ liệu hỏng, thiếu trường hoặc sai kiểu đều được thay bằng giá trị mặc định,
 * để một bản ghi lỗi không làm chết ứng dụng.
 */
export function loadProgress(storage: Storage = localStorage): UserProgress {
  const defaults = createProgress()
  let raw: string | null = null

  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch {
    return defaults
  }
  if (!raw) return defaults

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return defaults
  }
  if (typeof parsed !== 'object' || parsed === null) return defaults

  const data = parsed as Record<string, unknown>
  return {
    name: asString(data.name, defaults.name),
    // Bản lưu từ trước khi có lựa chọn này đều là người Việt học tiếng Trung.
    track: data.track === 'vi' ? 'vi' : 'zh',
    xp: Math.max(0, asNumber(data.xp, 0)),
    xpToday: Math.max(0, asNumber(data.xpToday, 0)),
    dailyGoal: Math.max(10, asNumber(data.dailyGoal, defaults.dailyGoal)),
    streak: Math.max(0, asNumber(data.streak, 0)),
    lastActiveDate: asString(data.lastActiveDate, ''),
    lastGoalDate: asString(data.lastGoalDate, ''),
    completedLessonIds: asStringArray(data.completedLessonIds),
    words: asWords(data.words),
    unlockedAchievementIds: asStringArray(data.unlockedAchievementIds),
  }
}

/** Lưu tiến độ. Bỏ qua lỗi quota hoặc chế độ riêng tư chặn ghi. */
export function saveProgress(progress: UserProgress, storage: Storage = localStorage): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // Không lưu được thì phiên học hiện tại vẫn chạy bình thường.
  }
}

/** Xoá toàn bộ tiến độ đã lưu. */
export function clearProgress(storage: Storage = localStorage): void {
  try {
    storage.removeItem(STORAGE_KEY)
  } catch {
    // Không có gì để dọn.
  }
}
