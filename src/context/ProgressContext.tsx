import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Achievement, LearnTrack, UserProgress } from '../types'
import { todayIso } from '../lib/date'
import { newlyUnlocked } from '../lib/gamification'
import {
  completeLesson,
  createProgress,
  recordCorrectAnswer,
  recordSpeakingPractice,
  recordWordReview,
  setDailyGoal,
  setName,
  setTrack,
} from '../lib/progress'
import { clearProgress, loadProgress, saveProgress } from '../lib/storage'

export interface ProgressContextValue {
  progress: UserProgress
  /** Ngày hôm nay, dạng YYYY-MM-DD. Mọi thao tác ghi nhận đều quy về ngày này. */
  today: string
  /** Thành tích vừa mở khoá, để màn hình kết quả khoe ra. Gọi `clearNewAchievements` sau khi hiển thị. */
  newAchievements: Achievement[]
  clearNewAchievements: () => void
  reviewWord: (wordId: string, known: boolean) => void
  answerCorrect: () => void
  /** Người học vừa đọc to một từ ở màn Luyện nói. */
  practiceSpeaking: () => void
  finishLesson: (lessonId: string) => void
  updateName: (name: string) => void
  updateDailyGoal: (goal: number) => void
  updateTrack: (track: LearnTrack) => void
  resetEverything: () => void
}

const ProgressContext = createContext<ProgressContextValue | null>(null)

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<UserProgress>(() => loadProgress())
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([])
  const today = todayIso()

  // Giữ bản mới nhất ngoài state để hàm cập nhật của React luôn thuần tuý.
  const latest = useRef(progress)

  useEffect(() => {
    saveProgress(progress)
  }, [progress])

  // Giao diện đổi thứ tiếng theo hướng học, nên trình đọc màn hình cũng phải đổi giọng.
  useEffect(() => {
    document.documentElement.lang = progress.track === 'vi' ? 'zh-CN' : 'vi'
  }, [progress.track])

  /**
   * Áp dụng một phép biến đổi thuần và gom lại những thành tích vừa mở.
   *
   * Việc so sánh thành tích cố tình nằm ngoài hàm cập nhật của `setProgress`:
   * React có thể gọi hàm đó nhiều lần cho cùng một thao tác, và trước đây điều
   * này làm thành tích bị xếp hàng trùng lặp.
   */
  const apply = useCallback((transform: (current: UserProgress) => UserProgress) => {
    const current = latest.current
    const next = transform(current)
    latest.current = next
    setProgress(next)

    const unlocked = newlyUnlocked(current, next)
    if (unlocked.length === 0) return

    setNewAchievements((pending) => {
      const seen = new Set(pending.map((achievement) => achievement.id))
      const fresh = unlocked.filter((achievement) => !seen.has(achievement.id))
      return fresh.length > 0 ? [...pending, ...fresh] : pending
    })
  }, [])

  const value = useMemo<ProgressContextValue>(
    () => ({
      progress,
      today,
      newAchievements,
      clearNewAchievements: () => setNewAchievements([]),
      reviewWord: (wordId, known) => apply((p) => recordWordReview(p, wordId, known, today)),
      answerCorrect: () => apply((p) => recordCorrectAnswer(p, today)),
      practiceSpeaking: () => apply((p) => recordSpeakingPractice(p, today)),
      finishLesson: (lessonId) => apply((p) => completeLesson(p, lessonId, today)),
      updateName: (name) => apply((p) => setName(p, name)),
      updateDailyGoal: (goal) => apply((p) => setDailyGoal(p, goal)),
      updateTrack: (track) => apply((p) => setTrack(p, track)),
      resetEverything: () => {
        clearProgress()
        setNewAchievements([])
        latest.current = createProgress()
        setProgress(latest.current)
      },
    }),
    [apply, newAchievements, progress, today],
  )

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>
}

/**
 * Chọn câu theo ngôn ngữ giao diện: người Trung học tiếng Việt thì đọc giao diện
 * tiếng Trung, còn lại là tiếng Việt. Viết cặp câu ngay tại chỗ dùng, khỏi phải
 * dò bảng khoá.
 *
 *     const t = useT()
 *     t('Học tiếp', '继续学习')
 */
export function useT(): (vi: string, zh: string) => string {
  return useTrack() === 'vi' ? (_vi, zh) => zh : (vi) => vi
}

/**
 * Thứ tiếng đang học. Ngoài `ProgressProvider` — các test dựng riêng một nút
 * hay một thẻ — thì coi như khoá tiếng Trung, giao diện tiếng Việt.
 */
export function useTrack(): LearnTrack {
  return useContext(ProgressContext)?.progress.track ?? 'zh'
}

/** Truy cập tiến độ người học. Phải nằm trong `ProgressProvider`. */
export function useProgress(): ProgressContextValue {
  const context = useContext(ProgressContext)
  if (!context) throw new Error('useProgress phải được dùng bên trong ProgressProvider')
  return context
}
