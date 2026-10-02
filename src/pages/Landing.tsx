import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { StreakIcon, TargetIcon, WordsIcon } from '../components/icons/GameIcons'
import { MascotSays } from '../components/Mascot'
import { Button } from '../components/ui/Button'
import { useProgress, useT } from '../context/ProgressContext'
import { isOnboarded } from '../lib/progress'
import type { LearnTrack } from '../types'

/** Hai hướng học. Mỗi thẻ viết bằng tiếng của người sẽ bấm vào nó. */
const TRACKS: Array<{ track: LearnTrack; sample: string; sampleLang: string; who: string; goal: string }> = [
  { track: 'zh', sample: '你好', sampleLang: 'zh-CN', who: 'Tôi là người Việt', goal: 'Học tiếng Trung' },
  { track: 'vi', sample: 'Xin chào', sampleLang: 'vi', who: '我是中国人', goal: '学越南语' },
]

/**
 * Màn hình chào.
 *
 * Bước 1 chọn hướng học: người Việt học tiếng Trung, hay người Trung học tiếng
 * Việt. Bước 2 hỏi tên, bằng đúng thứ tiếng của người học — từ đây cả giao
 * diện theo hướng đã chọn. Đổi được về sau ở màn Cá nhân.
 *
 * Bản thiết kế dự tính có Register/Login thật; giai đoạn này mới chỉ hỏi tên
 * và lưu ở máy, phần Authentication sẽ nối vào đây ở Phase 3.
 */
export function Landing() {
  const { progress, updateName, updateTrack } = useProgress()
  const t = useT()
  const [picked, setPicked] = useState(false)
  const [name, setName] = useState('')
  const navigate = useNavigate()

  if (isOnboarded(progress)) return <Navigate to="/" replace />

  if (!picked) {
    return (
      <div className="flex min-h-dvh flex-col justify-center bg-gradient-to-b from-brand-50 to-slate-50 px-6 py-10 dark:from-brand-500/10 dark:to-slate-950">
        <div className="mx-auto w-full max-w-md">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Bạn muốn học gì?
            <span lang="zh-CN" className="font-hanzi mt-1 block text-2xl text-slate-600 dark:text-slate-400">
              你想学什么？
            </span>
          </h1>

          <ul className="mt-8 space-y-4">
            {TRACKS.map(({ track, sample, sampleLang, who, goal }) => (
              <li key={track}>
                <button
                  type="button"
                  onClick={() => {
                    updateTrack(track)
                    setPicked(true)
                  }}
                  className="surface flex w-full items-center gap-5 p-5 text-left transition hover:shadow-md active:scale-[.99]"
                >
                  <span lang={sampleLang} className="font-hanzi w-28 shrink-0 text-center text-2xl font-semibold whitespace-nowrap text-brand-600 dark:text-brand-300">
                    {sample}
                  </span>
                  <span lang={track === 'vi' ? 'zh-CN' : 'vi'}>
                    <span className="block text-sm text-slate-500 dark:text-slate-400">{who}</span>
                    <span className="block text-xl font-bold text-slate-900 dark:text-slate-100">{goal}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )
  }

  const trimmed = name.trim()
  const learningVietnamese = progress.track === 'vi'

  return (
    <div className="flex min-h-dvh flex-col justify-between bg-gradient-to-b from-brand-50 to-slate-50 dark:from-brand-500/10 dark:to-slate-950 px-6 py-10">
      <div className="mx-auto w-full max-w-md">
        <button
          type="button"
          onClick={() => setPicked(false)}
          className="text-sm font-medium text-slate-500 underline-offset-4 hover:underline dark:text-slate-400"
        >
          ← {t('Đổi thứ tiếng muốn học', '换一种语言')}
        </button>
        <p className="font-hanzi mt-4 text-6xl">{learningVietnamese ? 'Xin chào' : '你好'}</p>
        <h1 className="mt-6 text-3xl font-bold text-slate-900 dark:text-slate-100">
          {t('Học tiếng Trung', '学越南语')}
        </h1>
        <p className="mt-3 text-slate-600 dark:text-slate-400">
          {t(
            'Mỗi ngày một chút: từ vựng, pinyin, phát âm và bài tập ngắn. Không cần biết gì trước.',
            '每天学一点：词汇、声调、发音和小练习。零基础也能学。',
          )}
        </p>

        <MascotSays mood="chao" size={84} className="mt-7">
          {t(
            'Chào bạn! Mình là Zibi. Mình sẽ đi cùng bạn suốt khoá này nhé.',
            '你好！我是 Zibi，这门课我会一直陪着你。',
          )}
        </MascotSays>

        <ul className="mt-6 space-y-3 text-slate-700 dark:text-slate-300">
          <li className="flex items-center gap-3">
            <WordsIcon size={26} /> {t('60 từ HSK 1 kèm phát âm', '60 个越南语常用词，配发音')}
          </li>
          <li className="flex items-center gap-3">
            <TargetIcon size={26} /> {t('Bài tập ngắn, làm xong trong 5 phút', '小练习，5 分钟就能做完')}
          </li>
          <li className="flex items-center gap-3">
            <StreakIcon size={26} /> {t('XP và streak để giữ thói quen', '用 XP 和连续天数养成习惯')}
          </li>
        </ul>
      </div>

      <form
        className="mx-auto mt-10 w-full max-w-md"
        onSubmit={(event) => {
          event.preventDefault()
          if (!trimmed) return
          updateName(trimmed)
          navigate('/', { replace: true })
        }}
      >
        <label htmlFor="learner-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          {t('Gọi bạn là gì nhỉ?', '怎么称呼你？')}
        </label>
        <input
          id="learner-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('Tên của bạn', '你的名字')}
          autoComplete="given-name"
          className="mt-2 h-14 w-full rounded-2xl border border-slate-200 bg-white px-4 text-base shadow-sm placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:placeholder:text-slate-500"
        />
        <Button type="submit" size="lg" fullWidth className="mt-4" disabled={!trimmed}>
          {t('Bắt đầu học', '开始学习')}
        </Button>
        <p className="mt-3 text-center text-xs text-slate-400 dark:text-slate-500">
          {t('Tiến độ được lưu ngay trên máy bạn.', '学习进度保存在你的设备上。')}
        </p>
      </form>
    </div>
  )
}
