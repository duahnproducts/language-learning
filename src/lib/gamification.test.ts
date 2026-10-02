import { describe, expect, it } from 'vitest'
import type { UserProgress } from '../types'
import { createProgress } from './progress'
import {
  ACHIEVEMENTS,
  DEFAULT_DAILY_GOAL,
  XP_REWARDS,
  effectiveStreak,
  evaluateAchievements,
  learnedWordCount,
  levelFromXp,
  newlyUnlocked,
  nextStreak,
  xpToAdvance,
} from './gamification'

function progressWith(overrides: Partial<UserProgress>): UserProgress {
  return { ...createProgress(), ...overrides }
}

describe('XP_REWARDS', () => {
  it('khớp với bảng phần thưởng trong bản thiết kế', () => {
    expect(XP_REWARDS).toEqual({
      flashcard: 5,
      correctAnswer: 10,
      lessonComplete: 30,
      speaking: 5,
      dailyGoal: 50,
    })
  })
})

describe('xpToAdvance', () => {
  it('level 1 cần 100 XP', () => {
    expect(xpToAdvance(1)).toBe(100)
  })

  it('mỗi level sau cần thêm 50 XP', () => {
    expect(xpToAdvance(2)).toBe(150)
    expect(xpToAdvance(3)).toBe(200)
  })
})

describe('levelFromXp', () => {
  it('người mới ở level 1 với 0%', () => {
    expect(levelFromXp(0)).toEqual({ level: 1, xpIntoLevel: 0, xpForLevel: 100, percent: 0 })
  })

  it('chưa đủ 100 XP thì vẫn level 1', () => {
    expect(levelFromXp(99).level).toBe(1)
  })

  it('đúng 100 XP thì lên level 2', () => {
    expect(levelFromXp(100)).toEqual({ level: 2, xpIntoLevel: 0, xpForLevel: 150, percent: 0 })
  })

  it('250 XP thì lên level 3', () => {
    expect(levelFromXp(250).level).toBe(3)
  })

  it('tính đúng phần trăm trong level hiện tại', () => {
    // Level 3 bắt đầu ở 250 XP và cần 200 XP để lên level 4.
    const info = levelFromXp(420)
    expect(info.level).toBe(3)
    expect(info.xpIntoLevel).toBe(170)
    expect(info.percent).toBe(85)
  })

  it('không vỡ với XP âm', () => {
    expect(levelFromXp(-50).level).toBe(1)
  })
})

describe('nextStreak', () => {
  it('đạt goal lần đầu thì streak là 1', () => {
    expect(nextStreak('', '2026-09-22', 0)).toBe(1)
  })

  it('đạt lại trong cùng ngày thì giữ nguyên', () => {
    expect(nextStreak('2026-09-22', '2026-09-22', 4)).toBe(4)
  })

  it('nối tiếp ngày hôm trước thì tăng 1', () => {
    expect(nextStreak('2026-09-21', '2026-09-22', 4)).toBe(5)
  })

  it('bỏ lỡ một ngày thì về lại 1', () => {
    expect(nextStreak('2026-09-20', '2026-09-22', 9)).toBe(1)
  })
})

describe('effectiveStreak', () => {
  it('bằng 0 khi chưa từng đạt goal', () => {
    expect(effectiveStreak(createProgress(), '2026-09-22')).toBe(0)
  })

  it('giữ nguyên khi đã đạt goal hôm nay', () => {
    const progress = progressWith({ streak: 7, lastGoalDate: '2026-09-22' })
    expect(effectiveStreak(progress, '2026-09-22')).toBe(7)
  })

  it('vẫn giữ khi hôm qua đạt goal, vì hôm nay chưa kết thúc', () => {
    const progress = progressWith({ streak: 7, lastGoalDate: '2026-09-21' })
    expect(effectiveStreak(progress, '2026-09-22')).toBe(7)
  })

  it('về 0 khi đã đứt quãng', () => {
    const progress = progressWith({ streak: 7, lastGoalDate: '2026-09-19' })
    expect(effectiveStreak(progress, '2026-09-22')).toBe(0)
  })
})

describe('learnedWordCount', () => {
  it('chỉ đếm những từ đã bấm "Đã nhớ"', () => {
    const progress = progressWith({
      words: {
        nihao: { wordId: 'nihao', known: 2, unknown: 0, lastReviewed: '2026-09-22' },
        xiexie: { wordId: 'xiexie', known: 0, unknown: 3, lastReviewed: '2026-09-22' },
      },
    })
    expect(learnedWordCount(progress)).toBe(1)
  })
})

describe('evaluateAchievements', () => {
  it('mở khoá First Lesson sau bài học đầu tiên', () => {
    const progress = progressWith({ completedLessonIds: ['u1l1'] })
    expect(evaluateAchievements(progress)).toContain('first-lesson')
  })

  it('mở khoá theo mốc XP', () => {
    expect(evaluateAchievements(progressWith({ xp: 1000 }))).toContain('xp-1000')
    expect(evaluateAchievements(progressWith({ xp: 400 }))).not.toContain('xp-500')
  })

  it('mở khoá 7 Day Streak', () => {
    expect(evaluateAchievements(progressWith({ streak: 7 }))).toContain('streak-7')
  })

  it('không thu hồi thành tích đã mở dù streak đã đứt', () => {
    const progress = progressWith({ streak: 0, unlockedAchievementIds: ['streak-7'] })
    expect(evaluateAchievements(progress)).toContain('streak-7')
  })

  it('không trả về id trùng lặp', () => {
    const progress = progressWith({ completedLessonIds: ['u1l1'], unlockedAchievementIds: ['first-lesson'] })
    const result = evaluateAchievements(progress)
    expect(new Set(result).size).toBe(result.length)
  })

  it('chỉ trả về id có thật trong danh sách thành tích', () => {
    const known = new Set(ACHIEVEMENTS.map((a) => a.id))
    const progress = progressWith({ xp: 5000, streak: 30, completedLessonIds: ['a', 'b', 'c', 'd', 'e'] })
    for (const id of evaluateAchievements(progress)) {
      expect(known.has(id)).toBe(true)
    }
  })
})

describe('newlyUnlocked', () => {
  it('chỉ trả về phần vừa mở thêm', () => {
    const before = progressWith({ unlockedAchievementIds: ['first-lesson'] })
    const after = progressWith({ unlockedAchievementIds: ['first-lesson', 'words-10'] })
    expect(newlyUnlocked(before, after).map((a) => a.id)).toEqual(['words-10'])
  })

  it('trả về mảng rỗng khi không có gì mới', () => {
    const same = progressWith({ unlockedAchievementIds: ['first-lesson'] })
    expect(newlyUnlocked(same, same)).toEqual([])
  })
})

describe('DEFAULT_DAILY_GOAL', () => {
  it('là một mục tiêu vừa sức cho người mới', () => {
    expect(DEFAULT_DAILY_GOAL).toBe(50)
  })
})

describe('learnedWordCount theo khoá', () => {
  it('chỉ đếm từ của khoá được hỏi, không hỏi thì đếm cả hai', () => {
    const progress = {
      ...createProgress('Lan'),
      words: {
        nihao: { wordId: 'nihao', known: 1, unknown: 0, lastReviewed: '' },
        'vi-xinchao': { wordId: 'vi-xinchao', known: 2, unknown: 0, lastReviewed: '' },
        'vi-ban': { wordId: 'vi-ban', known: 1, unknown: 0, lastReviewed: '' },
      },
    }
    expect(learnedWordCount(progress, 'zh')).toBe(1)
    expect(learnedWordCount(progress, 'vi')).toBe(2)
    expect(learnedWordCount(progress)).toBe(3)
  })
})
