import { describe, expect, it } from 'vitest'
import { XP_REWARDS } from './gamification'
import {
  awardXp,
  completeLesson,
  createProgress,
  setTrack,
  isOnboarded,
  recordCorrectAnswer,
  recordSpeakingPractice,
  recordWordReview,
  setDailyGoal,
  setName,
} from './progress'

const TODAY = '2026-09-22'
const YESTERDAY = '2026-09-21'

describe('createProgress', () => {
  it('bắt đầu từ con số 0', () => {
    const progress = createProgress()
    expect(progress.xp).toBe(0)
    expect(progress.streak).toBe(0)
    expect(progress.completedLessonIds).toEqual([])
    expect(progress.words).toEqual({})
  })

  it('nhận tên tuỳ chỉnh', () => {
    expect(createProgress('Duy').name).toBe('Duy')
  })

  it('mặc định chưa có tên, tức là chưa qua màn chào', () => {
    expect(createProgress().name).toBe('')
  })
})

describe('isOnboarded', () => {
  it('false khi chưa khai tên', () => {
    expect(isOnboarded(createProgress())).toBe(false)
  })

  it('false khi tên chỉ có khoảng trắng', () => {
    expect(isOnboarded({ ...createProgress(), name: '   ' })).toBe(false)
  })

  it('true sau khi đã khai tên', () => {
    expect(isOnboarded(createProgress('Duy'))).toBe(true)
  })
})

describe('awardXp', () => {
  it('cộng XP vào tổng và vào XP trong ngày', () => {
    const progress = awardXp(createProgress(), 10, TODAY)
    expect(progress.xp).toBe(10)
    expect(progress.xpToday).toBe(10)
    expect(progress.lastActiveDate).toBe(TODAY)
  })

  it('bỏ qua lượng XP bằng 0 hoặc âm', () => {
    const start = createProgress()
    expect(awardXp(start, 0, TODAY)).toBe(start)
    expect(awardXp(start, -20, TODAY)).toBe(start)
  })

  it('không làm thay đổi trạng thái đầu vào', () => {
    const start = createProgress()
    awardXp(start, 30, TODAY)
    expect(start.xp).toBe(0)
  })

  it('đặt lại XP trong ngày khi sang ngày mới', () => {
    const day1 = awardXp(createProgress(), 30, YESTERDAY)
    const day2 = awardXp(day1, 10, TODAY)
    expect(day2.xpToday).toBe(10)
    expect(day2.xp).toBe(40)
  })

  it('thưởng thêm 50 XP và bật streak khi vừa chạm daily goal', () => {
    const progress = awardXp(createProgress(), 50, TODAY)
    expect(progress.xpToday).toBe(50)
    expect(progress.xp).toBe(50 + XP_REWARDS.dailyGoal)
    expect(progress.streak).toBe(1)
    expect(progress.lastGoalDate).toBe(TODAY)
  })

  it('chỉ thưởng daily goal một lần mỗi ngày', () => {
    const first = awardXp(createProgress(), 50, TODAY)
    const second = awardXp(first, 10, TODAY)
    expect(second.xp).toBe(first.xp + 10)
    expect(second.streak).toBe(1)
  })

  it('nối streak khi đạt goal hai ngày liên tiếp', () => {
    const day1 = awardXp(createProgress(), 50, YESTERDAY)
    const day2 = awardXp(day1, 50, TODAY)
    expect(day2.streak).toBe(2)
  })

  it('đặt lại streak về 1 khi bỏ lỡ một ngày', () => {
    const day1 = awardXp(createProgress(), 50, '2026-09-19')
    const day3 = awardXp(day1, 50, TODAY)
    expect(day3.streak).toBe(1)
  })

  it('phần thưởng daily goal không tự kích hoạt goal lần nữa', () => {
    const progress = awardXp(createProgress(), 50, TODAY)
    expect(progress.xpToday).toBe(50)
  })

  it('cập nhật thành tích ngay khi cộng XP', () => {
    const progress = awardXp(createProgress(), 600, TODAY)
    expect(progress.unlockedAchievementIds).toContain('xp-500')
  })
})

describe('recordWordReview', () => {
  it('ghi nhận "Đã nhớ" và cộng XP flashcard', () => {
    const progress = recordWordReview(createProgress(), 'nihao', true, TODAY)
    expect(progress.words.nihao).toEqual({
      wordId: 'nihao',
      known: 1,
      unknown: 0,
      lastReviewed: TODAY,
    })
    expect(progress.xp).toBe(XP_REWARDS.flashcard)
  })

  it('ghi nhận "Chưa nhớ" nhưng vẫn cộng XP vì người học có ôn thật', () => {
    const progress = recordWordReview(createProgress(), 'nihao', false, TODAY)
    expect(progress.words.nihao.known).toBe(0)
    expect(progress.words.nihao.unknown).toBe(1)
    expect(progress.xp).toBe(XP_REWARDS.flashcard)
  })

  it('cộng dồn qua nhiều lần ôn', () => {
    let progress = recordWordReview(createProgress(), 'nihao', false, YESTERDAY)
    progress = recordWordReview(progress, 'nihao', true, TODAY)
    expect(progress.words.nihao).toEqual({
      wordId: 'nihao',
      known: 1,
      unknown: 1,
      lastReviewed: TODAY,
    })
  })

  it('mở khoá thành tích 10 từ sau khi nhớ đủ 10 từ', () => {
    let progress = createProgress()
    for (let i = 0; i < 10; i += 1) {
      progress = recordWordReview(progress, `w${i}`, true, TODAY)
    }
    expect(progress.unlockedAchievementIds).toContain('words-10')
  })
})

describe('recordCorrectAnswer', () => {
  it('cộng 10 XP cho mỗi câu đúng', () => {
    const progress = recordCorrectAnswer(createProgress(), TODAY)
    expect(progress.xp).toBe(XP_REWARDS.correctAnswer)
  })
})

describe('recordSpeakingPractice', () => {
  it('cộng XP cho việc có luyện nói, không phụ thuộc điểm', () => {
    const progress = recordSpeakingPractice(createProgress(), TODAY)
    expect(progress.xp).toBe(XP_REWARDS.speaking)
    expect(progress.xpToday).toBe(XP_REWARDS.speaking)
  })
})

describe('completeLesson', () => {
  it('lưu lesson đã xong và cộng 30 XP', () => {
    const progress = completeLesson(createProgress(), 'u1l1', TODAY)
    expect(progress.completedLessonIds).toEqual(['u1l1'])
    expect(progress.xp).toBe(XP_REWARDS.lessonComplete)
  })

  it('không đếm trùng khi học lại bài cũ', () => {
    const first = completeLesson(createProgress(), 'u1l1', TODAY)
    const second = completeLesson(first, 'u1l1', TODAY)
    expect(second.completedLessonIds).toEqual(['u1l1'])
  })

  it('học lại bài cũ vẫn được cộng XP', () => {
    const first = completeLesson(createProgress(), 'u1l1', TODAY)
    const second = completeLesson(first, 'u1l1', TODAY)
    expect(second.xp).toBeGreaterThan(first.xp)
  })

  it('mở khoá First Lesson', () => {
    const progress = completeLesson(createProgress(), 'u1l1', TODAY)
    expect(progress.unlockedAchievementIds).toContain('first-lesson')
  })

  it('mở khoá Unit Master sau 5 bài', () => {
    let progress = createProgress()
    for (const id of ['a', 'b', 'c', 'd', 'e']) {
      progress = completeLesson(progress, id, TODAY)
    }
    expect(progress.unlockedAchievementIds).toContain('unit-master')
  })
})

describe('setDailyGoal', () => {
  it('đổi được mục tiêu', () => {
    expect(setDailyGoal(createProgress(), 120).dailyGoal).toBe(120)
  })

  it('không cho đặt mục tiêu thấp phi lý', () => {
    expect(setDailyGoal(createProgress(), 1).dailyGoal).toBe(10)
  })
})

describe('setName', () => {
  it('cắt khoảng trắng thừa', () => {
    expect(setName(createProgress(), '  Duy  ').name).toBe('Duy')
  })

  it('bỏ qua tên rỗng', () => {
    const progress = createProgress('Duy')
    expect(setName(progress, '   ').name).toBe('Duy')
  })
})

describe('kịch bản một ngày học trọn vẹn', () => {
  it('học 6 flashcard rồi làm đúng 4 câu thì đạt goal và có streak', () => {
    let progress = createProgress('Duy')
    for (const id of ['nihao', 'ni', 'hao', 'wo', 'zaijian', 'xiexie']) {
      progress = recordWordReview(progress, id, true, TODAY)
    }
    expect(progress.xpToday).toBe(30)
    expect(progress.streak).toBe(0)

    for (let i = 0; i < 2; i += 1) {
      progress = recordCorrectAnswer(progress, TODAY)
    }

    expect(progress.xpToday).toBe(50)
    expect(progress.streak).toBe(1)
    expect(progress.xp).toBe(50 + XP_REWARDS.dailyGoal)
  })
})

describe('setTrack', () => {
  it('đổi hướng học mà giữ nguyên tiến độ của cả hai khoá', () => {
    const before = { ...createProgress('Lan'), completedLessonIds: ['u1l1'], xp: 50 }
    const after = setTrack(before, 'vi')
    expect(after.track).toBe('vi')
    expect(after.completedLessonIds).toEqual(['u1l1'])
    expect(after.xp).toBe(50)
  })
})
