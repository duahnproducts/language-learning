import { useEffect, useState, type ReactNode } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { AchievementIcon, StreakIcon } from '../components/icons/GameIcons'
import { MicIcon } from '../components/icons/UiIcons'
import { Mascot } from '../components/Mascot'
import { Button } from '../components/ui/Button'
import { ProgressBar } from '../components/ui/ProgressBar'
import { findLesson } from '../data/courses'
import { useProgress, useT } from '../context/ProgressContext'
import { lessonAfter } from '../lib/course'
import { ACHIEVEMENT_DESCRIPTION_ZH, effectiveStreak } from '../lib/gamification'
import type { Achievement } from '../types'

interface ResultState {
  correct: number
  total: number
  xpEarned: number
}

/** Bước 4: kết quả, XP nhận được và thành tích vừa mở khoá. */
export function Result() {
  const { lessonId = '' } = useParams()
  const location = useLocation()
  const { progress, today, newAchievements, clearNewAchievements } = useProgress()
  const t = useT()

  // Giữ lại danh sách thành tích ngay khi vào màn hình, rồi dọn hàng chờ
  // để lần học sau không hiển thị lại những thứ cũ.
  const [unlocked] = useState<Achievement[]>(newAchievements)
  useEffect(() => {
    clearNewAchievements()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const state = location.state as ResultState | null
  const lesson = findLesson(lessonId)

  // Vào thẳng URL này hoặc tải lại trang thì không có dữ liệu bài vừa làm.
  if (!lesson || !state) return <Navigate to="/learn" replace />

  const percent = Math.round((state.correct / state.total) * 100)
  const nextId = lessonAfter(lessonId)
  const streak = effectiveStreak(progress, today)
  const goalMet = progress.xpToday >= progress.dailyGoal

  return (
    <div className="flex min-h-dvh flex-col justify-center py-8">
      <div className="text-center">
        <div className="flex justify-center">
          <Mascot mood={percent >= 60 ? 'mung' : 'tiec'} size={128} />
        </div>
        <h1 className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-100">
          {percent === 100
            ? t('Hoàn hảo!', '满分！')
            : percent >= 60
              ? t('Làm tốt lắm!', '做得好！')
              : t('Cứ từ từ thôi', '慢慢来')}
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          {lesson.unitTitle} · {lesson.title}
        </p>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          {percent === 100
            ? t('Zibi: không sai câu nào luôn! Mình phục bạn đấy.', 'Zibi：一题都没错！我服了你。')
            : percent >= 60
              ? t('Zibi: chắc tay rồi. Mai quay lại là nhớ lâu hơn nữa.', 'Zibi：很稳！明天再来，记得更牢。')
              : t(
                  'Zibi: sai vài câu là chuyện thường thôi. Ôn lại bài này một lượt nhé.',
                  'Zibi：错几题很正常，再复习一遍这一课吧。',
                )}
        </p>
      </div>

      <div className="mt-8 surface p-5">
        <div className="flex items-baseline justify-between">
          <span className="font-semibold text-slate-900 dark:text-slate-100">{t('Kết quả bài tập', '练习结果')}</span>
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {t(`${state.correct}/${state.total} câu đúng`, `答对 ${state.correct}/${state.total} 题`)}
          </span>
        </div>
        <ProgressBar
          value={percent}
          tone={percent >= 60 ? 'emerald' : 'brand'}
          label={t('Tỉ lệ trả lời đúng', '正确率')}
          className="mt-3"
        />

        <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
          <Stat label={t('XP nhận được', '获得 XP')} value={`+${state.xpEarned}`} />
          <Stat label={t('Tổng XP', '总 XP')} value={progress.xp} />
          <Stat
            label={t('Streak', '连续天数')}
            value={
              <span className="inline-flex items-center gap-1">
                {streak}
                <StreakIcon size={20} />
              </span>
            }
          />
        </dl>
      </div>

      {goalMet && (
        <p className="mt-4 rounded-2xl bg-emerald-50 p-4 text-center text-sm font-medium text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">
          {t(
            `Bạn đã đạt mục tiêu ${progress.dailyGoal} XP hôm nay. Hẹn gặp lại ngày mai!`,
            `你已完成今天 ${progress.dailyGoal} XP 的目标，明天见！`,
          )}
        </p>
      )}

      {unlocked.length > 0 && (
        <section className="mt-4 rounded-3xl bg-gold-400/15 p-5 ring-1 ring-gold-400/40 dark:bg-gold-400/10">
          <h2 className="font-semibold text-slate-900 dark:text-slate-100">{t('Thành tích mới', '新成就')}</h2>
          <ul className="mt-3 space-y-2">
            {unlocked.map((achievement) => (
              <li key={achievement.id} className="flex items-center gap-3">
                <AchievementIcon name={achievement.icon} size={36} className="shrink-0" />
                <span>
                  <span className="block font-semibold text-slate-900 dark:text-slate-100">{achievement.title}</span>
                  <span className="block text-sm text-slate-600 dark:text-slate-400">
                    {t(achievement.description, ACHIEVEMENT_DESCRIPTION_ZH[achievement.id])}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8 space-y-3">
        {nextId ? (
          <Link to={`/lesson/${nextId}`}>
            <Button size="lg" fullWidth>
              {t('Học bài tiếp theo', '学下一课')}
            </Button>
          </Link>
        ) : (
          <Link to="/progress">
            <Button size="lg" fullWidth>
              {t('Xem tiến độ của bạn', '查看你的进度')}
            </Button>
          </Link>
        )}
        {lesson.track === 'zh' && (
          <Link to={`/lesson/${lessonId}/speaking`}>
            <Button variant="secondary" size="lg" fullWidth>
              <MicIcon size={20} /> Luyện nói các từ vừa học
            </Button>
          </Link>
        )}
        <Link to="/">
          <Button variant="secondary" size="lg" fullWidth>
            {t('Về trang chủ', '回到首页')}
          </Button>
        </Link>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-lg font-bold text-slate-900 dark:text-slate-100">{value}</dd>
    </div>
  )
}
