import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CourseIcon, LessonsIcon, StreakIcon, WordsIcon } from '../components/icons/GameIcons'
import { StatBar } from '../components/StatBar'
import { Button } from '../components/ui/Button'
import { ProgressBar } from '../components/ui/ProgressBar'
import { COURSES, findLesson } from '../data/courses'
import { useProgress, useT } from '../context/ProgressContext'
import { completedInCourse, courseCompletion, lessonPosition, nextLessonId, totalLessons } from '../lib/course'
import { effectiveStreak, learnedWordCount } from '../lib/gamification'

/** Trang chủ: người học luôn thấy ngay bước tiếp theo của mình. */
export function Home() {
  const { progress, today } = useProgress()
  const t = useT()
  const { track } = progress

  const nextId = nextLessonId(progress.completedLessonIds, track)
  const nextLesson = findLesson(nextId)!
  const isReview = progress.completedLessonIds.includes(nextId)

  const goalPercent = (progress.xpToday / progress.dailyGoal) * 100
  const goalMet = progress.xpToday >= progress.dailyGoal
  const streak = effectiveStreak(progress, today)

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('Chào bạn,', '你好，')}</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{progress.name}</h1>
        </div>
        <StatBar />
      </header>

      {/* Mục tiêu hôm nay */}
      <section className="surface p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">{t('Mục tiêu hôm nay', '今日目标')}</h2>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {progress.xpToday}/{progress.dailyGoal} XP
          </p>
        </div>
        <ProgressBar
          value={goalPercent}
          tone={goalMet ? 'emerald' : 'brand'}
          label={t('Tiến độ mục tiêu hôm nay', '今日目标进度')}
          className="mt-3"
        />
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          {goalMet ? (
            streak > 0 ? (
              <>
                {t(`Xong rồi! Streak của bạn đang là ${streak} ngày.`, `完成了！你已经连续学习 ${streak} 天。`)}{' '}
                <StreakIcon size={18} className="inline-block align-[-3px]" />
              </>
            ) : (
              t('Xong mục tiêu hôm nay rồi. Tuyệt vời!', '今天的目标完成了，太棒了！')
            )
          ) : (
            t(
              `Còn ${progress.dailyGoal - progress.xpToday} XP nữa là đạt mục tiêu.`,
              `再得 ${progress.dailyGoal - progress.xpToday} XP 就完成目标了。`,
            )
          )}
        </p>
      </section>

      {/* Bước tiếp theo */}
      <section className="rounded-3xl bg-brand-500 p-5 text-white shadow-sm dark:bg-brand-600">
        <p className="text-sm text-brand-100">
          {isReview
            ? t('Ôn lại', '复习')
            : t(`Bài ${lessonPosition(nextId)}/${totalLessons(track)}`, `第 ${lessonPosition(nextId)}/${totalLessons(track)} 课`)}{' '}
          ·{' '}
          {nextLesson.unitTitle}
        </p>
        <h2 className="mt-1 text-xl font-bold">{nextLesson.title}</h2>
        <p className="mt-1 text-brand-100">{nextLesson.description}</p>
        <Link to={`/lesson/${nextId}`} className="mt-4 block">
          <Button variant="on-brand" size="lg" fullWidth>
            {isReview ? t('Ôn lại bài này', '复习这一课') : t('Học tiếp', '继续学习')}
          </Button>
        </Link>
      </section>

      {/* Tổng quan nhanh */}
      <section className="grid grid-cols-3 gap-3">
        <SummaryCard
          icon={<WordsIcon size={34} />}
          value={learnedWordCount(progress, track)}
          label={t('từ đã nhớ', '已记住的词')}
        />
        <SummaryCard
          icon={<LessonsIcon size={34} />}
          value={completedInCourse(progress.completedLessonIds, track)}
          label={t('bài đã xong', '已完成的课')}
        />
        <SummaryCard
          icon={<CourseIcon size={34} />}
          value={`${courseCompletion(progress.completedLessonIds, track)}%`}
          label={t(`khoá ${COURSES.zh.course.title}`, COURSES.vi.course.title)}
        />
      </section>

      <Link
        to="/learn"
        className="surface block p-4 text-center font-semibold text-slate-700 transition hover:shadow-md active:scale-[.99] dark:text-slate-300"
      >
        {t('Xem toàn bộ khoá học', '查看全部课程')} →
      </Link>
    </div>
  )
}

function SummaryCard({
  icon,
  value,
  label,
}: {
  /** Icon vẽ tay, tự `aria-hidden`. */
  icon: ReactNode
  value: number | string
  label: string
}) {
  return (
    <div className="surface rounded-2xl p-3 text-center">
      <span className="flex justify-center">{icon}</span>
      <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
    </div>
  )
}
