import { useState } from 'react'
import {
  AutoThemeIcon,
  ButterflyIcon,
  MoonIcon,
  OffIcon,
  StillSceneIcon,
  SunIcon,
} from '../components/icons/UiIcons'
import { BubbleSwitch, type BubbleOption } from '../components/ui/BubbleSwitch'
import { Button } from '../components/ui/Button'
import { useProgress, useT } from '../context/ProgressContext'
import { useScene } from '../context/SceneContext'
import { useTheme } from '../context/ThemeContext'
import { levelFromXp } from '../lib/gamification'
import type { SceneChoice } from '../lib/scene'
import type { ThemeChoice } from '../lib/theme'
import { currentPlatform, shouldOfferInstall } from '../lib/install'
import type { LearnTrack } from '../types'

type T = (vi: string, zh: string) => string

const goalOptions = (t: T) => [
  { value: 30, label: t('Nhẹ nhàng', '轻松'), hint: t('30 XP · khoảng 3 phút mỗi ngày', '30 XP · 每天约 3 分钟') },
  { value: 50, label: t('Vừa sức', '适中'), hint: t('50 XP · khoảng 5 phút mỗi ngày', '50 XP · 每天约 5 分钟') },
  { value: 100, label: t('Nghiêm túc', '认真'), hint: t('100 XP · khoảng 10 phút mỗi ngày', '100 XP · 每天约 10 分钟') },
]

const themeOptions = (t: T): Array<BubbleOption<ThemeChoice>> => [
  { value: 'light', label: t('Sáng', '浅色'), icon: <SunIcon size={18} /> },
  { value: 'dark', label: t('Tối', '深色'), icon: <MoonIcon size={18} /> },
  { value: 'system', label: t('Theo máy', '跟随系统'), icon: <AutoThemeIcon size={18} /> },
]

const sceneOptions = (t: T): Array<BubbleOption<SceneChoice>> => [
  { value: 'full', label: t('Đầy đủ', '完整'), icon: <ButterflyIcon size={18} /> },
  { value: 'still', label: t('Tĩnh', '静止'), icon: <StillSceneIcon size={18} /> },
  { value: 'off', label: t('Tắt', '关闭'), icon: <OffIcon size={18} /> },
]

/**
 * Hai hướng học. Nhãn mỗi bên viết bằng tiếng của người sẽ bấm vào nó, không
 * theo giao diện đang hiện: lỡ bấm sang khoá kia thì giao diện đổi sang thứ
 * tiếng mình không đọc được, và nút quay lại vẫn phải đọc được.
 */
const TRACK_OPTIONS: Array<BubbleOption<LearnTrack>> = [
  { value: 'zh', label: 'Học tiếng Trung' },
  { value: 'vi', label: '学越南语' },
]

/** Màn hình Profile: tên hiển thị, mục tiêu hằng ngày, giao diện và tuỳ chọn xoá dữ liệu. */
export function Profile() {
  const { progress, updateName, updateDailyGoal, updateTrack, resetEverything } = useProgress()
  const t = useT()
  const GOAL_OPTIONS = goalOptions(t)
  const { choice, setChoice } = useTheme()
  const { choice: sceneChoice, setChoice: setSceneChoice } = useScene()
  const [name, setName] = useState(progress.name)
  const [saved, setSaved] = useState(false)
  const [confirmingReset, setConfirmingReset] = useState(false)

  // Máy và trình duyệt không đổi giữa chừng, nên hỏi đúng một lần lúc dựng.
  const [offerInstall] = useState(() => shouldOfferInstall(currentPlatform()))

  const level = levelFromXp(progress.xp)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('Cá nhân', '我的')}</h1>

      <section className="surface flex items-center gap-4 p-5">
        <span
          aria-hidden="true"
          className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-2xl font-bold text-brand-600 dark:bg-brand-500/15 dark:text-brand-300"
        >
          {progress.name.trim().charAt(0).toUpperCase() || '?'}
        </span>
        <div>
          <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{progress.name}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Level {level.level} · {progress.xp} XP
          </p>
        </div>
      </section>

      {/* Thứ tiếng đang học. Đổi khoá thì tiến độ khoá cũ vẫn còn nguyên. */}
      <section className="surface p-5">
        <h2 id="track-label" className="font-semibold text-slate-900 dark:text-slate-100">
          <span lang="vi">Thứ tiếng đang học</span> · <span lang="zh-CN">正在学的语言</span>
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t(
            'Đổi khoá thì giao diện đổi theo. Tiến độ của từng khoá vẫn giữ nguyên.',
            '换课程后界面语言也会跟着换。每门课的进度都会保留。',
          )}
        </p>
        <BubbleSwitch
          labelledBy="track-label"
          options={TRACK_OPTIONS}
          value={progress.track}
          onChange={updateTrack}
          className="mt-4"
        />
      </section>

      {/* Hướng dẫn cài lên màn hình chính.
          Safari không tự mời cài như Chrome trên Android, nên app phải tự nhắc
          — nhưng nhắc ở đây chứ không chắn ngang lúc đang học. */}
      {offerInstall && (
        <section className="rounded-3xl bg-brand-50 p-5 ring-1 ring-brand-100 dark:bg-brand-500/15 dark:ring-brand-500/25">
          <h2 className="font-semibold text-brand-700 dark:text-brand-300">
            {t('Cài vào màn hình chính', '添加到主屏幕')}
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            {t(
              'Mở được như một app thật, chạy toàn màn hình và dùng được cả khi không có mạng.',
              '像真正的 App 一样打开，全屏运行，没有网络也能用。',
            )}
          </p>
          <ol className="mt-3 space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
            <li>{t('1. Bấm nút Chia sẻ ở thanh dưới Safari', '1. 点 Safari 底部的“分享”按钮')}</li>
            <li>{t('2. Kéo xuống chọn “Thêm vào MH chính”', '2. 向下滑，选择“添加到主屏幕”')}</li>
            <li>{t('3. Bấm “Thêm” ở góc trên bên phải', '3. 点右上角的“添加”')}</li>
          </ol>
        </section>
      )}

      {/* Tên hiển thị */}
      <section className="surface p-5">
        <label htmlFor="profile-name" className="block font-semibold text-slate-900 dark:text-slate-100">
          {t('Tên hiển thị', '显示名称')}
        </label>
        <div className="mt-3 flex gap-2">
          <input
            id="profile-name"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setSaved(false)
            }}
            className="h-12 min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 dark:border-slate-700 dark:bg-slate-800"
          />
          <Button
            disabled={name.trim() === '' || name.trim() === progress.name}
            onClick={() => {
              updateName(name)
              setSaved(true)
            }}
          >
            {t('Lưu', '保存')}
          </Button>
        </div>
        {saved && (
          <p role="status" className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">
            {t('Đã lưu tên mới.', '新名字已保存。')}
          </p>
        )}
      </section>

      {/* Mục tiêu hằng ngày */}
      <section className="surface p-5">
        <h2 id="goal-label" className="font-semibold text-slate-900 dark:text-slate-100">
          {t('Mục tiêu mỗi ngày', '每日目标')}
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t(
            'Đạt mục tiêu là giữ được streak. Chọn mức bạn theo nổi mỗi ngày.',
            '完成目标就能保持连续天数。选一个你每天坚持得了的强度。',
          )}
        </p>
        <BubbleSwitch
          labelledBy="goal-label"
          options={GOAL_OPTIONS}
          value={progress.dailyGoal}
          onChange={updateDailyGoal}
          className="mt-4"
        />
        {/* Ba mức vừa đủ chỗ cho tên, không đủ cho phần giải thích — nên chỉ
            giải thích mức đang chọn, ngay bên dưới. Mục tiêu cũ ngoài ba mức
            này (dữ liệu lưu từ trước) thì không có dòng nào, thay vì đoán bừa. */}
        <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400" aria-live="polite">
          {GOAL_OPTIONS.find((option) => option.value === progress.dailyGoal)?.hint}
        </p>
      </section>

      {/* Giao diện */}
      <section className="surface p-5">
        <h2 id="theme-label" className="font-semibold text-slate-900 dark:text-slate-100">
          {t('Giao diện', '外观')}
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t('Học buổi tối thì chế độ tối đỡ chói mắt hơn.', '晚上学习时，深色模式更护眼。')}
        </p>
        <BubbleSwitch
          labelledBy="theme-label"
          options={themeOptions(t)}
          value={choice}
          onChange={setChoice}
          className="mt-4"
        />

        {/* Nền động.
            Ba mức chứ không phải công tắc bật/tắt: máy yếu thì cảnh vẫn nên ở
            lại, chỉ là đứng yên. Hệ điều hành bật "giảm chuyển động" thì app
            tự về mức Tĩnh mà không đụng tới lựa chọn đang lưu ở đây. */}
        <h3 id="scene-label" className="mt-6 font-semibold text-slate-900 dark:text-slate-100">
          {t('Nền động', '动态背景')}
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t(
            'Khu vườn ban ngày, bầu trời sao ban đêm — nở dần theo tiến độ hôm nay.',
            '白天是花园，夜里是星空——随着今天的进度慢慢绽放。',
          )}
        </p>
        <BubbleSwitch
          labelledBy="scene-label"
          options={sceneOptions(t)}
          value={sceneChoice}
          onChange={setSceneChoice}
          className="mt-4"
        />
      </section>

      {/* Dữ liệu */}
      <section className="surface p-5">
        <h2 className="font-semibold text-slate-900 dark:text-slate-100">{t('Dữ liệu học', '学习数据')}</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t(
            'Toàn bộ tiến độ đang được lưu trên máy bạn. Xoá đi là không lấy lại được.',
            '所有进度都保存在你的设备上，删除后无法恢复。',
          )}
        </p>
        {confirmingReset ? (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {t('Xoá toàn bộ XP, streak và lịch sử học?', '删除全部 XP、连续天数和学习记录？')}
            </p>
            <div className="flex gap-2">
              <Button variant="danger" onClick={resetEverything}>
                {t('Xoá hết', '全部删除')}
              </Button>
              <Button variant="ghost" onClick={() => setConfirmingReset(false)}>
                {t('Giữ lại', '保留')}
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="secondary" className="mt-4" onClick={() => setConfirmingReset(true)}>
            {t('Xoá tiến độ học', '删除学习进度')}
          </Button>
        )}
      </section>

      <p className="pb-2 text-center text-xs text-slate-400 dark:text-slate-500">
        {t('Chinese Learning App · bản demo Phase 1', 'Chinese Learning App · Phase 1 演示版')}
      </p>
    </div>
  )
}
