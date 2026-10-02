import { screen, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { VI_WORDS } from '../data/vi1'
import { wordsOfLesson } from '../data/courses'
import { buildExercises, createRng, isChoiceExercise, seedFromText } from '../lib/exercises'
import { loadProgress } from '../lib/storage'
import { renderApp } from '../test/renderApp'
import type { Exercise } from '../types'

/** Như `app-flow.test.tsx`: không có file mp3 nào, để test đúng cảnh máy không phát âm được. */
vi.mock('../lib/audioFiles', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/audioFiles')>()
  return {
    ...actual,
    hasRecordedAudio: () => false,
    hasVietnameseAudio: () => false,
    audioUrlForWord: () => null,
    audioUrlForSentence: () => null,
  }
})

const LESSON_ID = 'vu1l1'
const WORDS = wordsOfLesson(LESSON_ID)
const EXERCISES = buildExercises(WORDS, VI_WORDS, createRng(seedFromText(LESSON_ID)), 'vi')

/** Người Trung đã qua màn chào. */
const LEARNER = { name: 'Lan', track: 'vi' as const }

/** Làm hết bài tập, luôn chọn đáp án đúng. */
async function answerAll(user: UserEvent, list: Exercise[]) {
  for (const exercise of list) {
    if (isChoiceExercise(exercise)) {
      const correct = exercise.choices.find((choice) => choice.id === exercise.correctChoiceId)!
      await user.click(screen.getByRole('button', { name: correct.label }))
    } else if (exercise.kind === 'matching') {
      for (const [leftId, rightId] of Object.entries(exercise.answerKey)) {
        await user.click(screen.getByRole('button', { name: exercise.left.find((c) => c.id === leftId)!.label }))
        await user.click(screen.getByRole('button', { name: exercise.right.find((c) => c.id === rightId)!.label }))
      }
    } else if (exercise.kind === 'sentence') {
      for (const piece of exercise.pieces) {
        const bank = screen.getByRole('group', { name: '词块' })
        await user.click(within(bank).getAllByRole('button', { name: piece })[0])
      }
    } else if (exercise.kind === 'dictation') {
      await user.type(screen.getByLabelText('你听到的越南语'), exercise.answer)
    }
    await user.click(screen.getByRole('button', { name: '检查' }))
    await user.click(screen.getByRole('button', { name: /继续|查看结果/ }))
  }
}

describe('Người Trung học tiếng Việt', () => {
  it('chọn 学越南语 ở màn chào thì cả màn chào chuyển sang tiếng Trung', async () => {
    const { user } = renderApp('/')
    await user.click(screen.getByRole('button', { name: /学越南语/ }))

    expect(screen.getByRole('heading', { name: '学越南语' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('怎么称呼你？'), 'Lan')
    await user.click(screen.getByRole('button', { name: '开始学习' }))

    expect(screen.getByRole('heading', { name: 'Lan' })).toBeInTheDocument()
    expect(screen.getByText('基本问候')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '继续学习' })).toBeInTheDocument()
    expect(loadProgress().track).toBe('vi')
    expect(document.documentElement.lang).toBe('zh-CN')
  })

  it('màn khoá học liệt kê khoá tiếng Việt, không phải HSK 1', () => {
    renderApp('/learn', LEARNER)
    expect(screen.getByRole('heading', { name: '越南语入门' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toContain('第 1 单元 · 问候')
    expect(screen.queryByText('Lời chào cơ bản')).not.toBeInTheDocument()
  })

  it('màn từ mới hiện chữ tiếng Việt kèm nghĩa tiếng Trung, không có pinyin, không có luyện nói', () => {
    renderApp(`/lesson/${LESSON_ID}`, LEARNER)

    expect(screen.getByRole('heading', { name: '生词' })).toBeInTheDocument()
    const first = screen.getAllByRole('listitem')[0]
    expect(within(first).getByText('xin chào')).toBeInTheDocument()
    expect(within(first).getByText('你好')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Luyện nói/ })).not.toBeInTheDocument()
  })

  it('vào thẳng đường dẫn luyện nói của khoá tiếng Việt thì bị đưa về', () => {
    renderApp(`/lesson/${LESSON_ID}/speaking`, LEARNER)
    expect(screen.getByRole('heading', { name: '越南语入门' })).toBeInTheDocument()
  })

  it('máy không phát được âm thì bài nghe đưa nghĩa tiếng Trung ra thay', async () => {
    const { user } = renderApp(`/lesson/${LESSON_ID}/exercise`, LEARNER)
    const listening = EXERCISES.findIndex((exercise) => exercise.kind === 'listening')
    await answerAll(user, EXERCISES.slice(0, listening))

    expect(screen.getByText(/设备无法发音/)).toBeInTheDocument()
  })

  it('học trọn một bài: flashcard, bài tập, kết quả — tất cả bằng tiếng Trung', async () => {
    const { user } = renderApp(`/lesson/${LESSON_ID}/flashcards`, LEARNER)

    for (let i = 0; i < WORDS.length; i += 1) {
      await user.click(screen.getByRole('button', { name: '翻卡' }))
      await user.click(screen.getByRole('button', { name: '记住了' }))
    }

    expect(screen.getByRole('heading', { name: EXERCISES[0].prompt })).toBeInTheDocument()
    await answerAll(user, EXERCISES)

    expect(screen.getByRole('heading', { name: '满分！' })).toBeInTheDocument()
    expect(screen.getByText(`答对 ${EXERCISES.length}/${EXERCISES.length} 题`)).toBeInTheDocument()

    const saved = loadProgress()
    expect(saved.completedLessonIds).toEqual([LESSON_ID])
    expect(Object.keys(saved.words)).toEqual(WORDS.map((word) => word.id))

    await user.click(screen.getByRole('button', { name: '学下一课' }))
    expect(screen.getByRole('heading', { name: '生词' })).toBeInTheDocument()
    expect(screen.getByText('không có gì')).toBeInTheDocument()
  })

  it('đổi sang học tiếng Trung ở màn Cá nhân thì giao diện về tiếng Việt, tiến độ khoá cũ còn nguyên', async () => {
    const { user } = renderApp('/profile', { ...LEARNER, completedLessonIds: ['vu1l1'] })

    expect(screen.getByRole('heading', { name: '我的' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Học tiếng Trung' }))
    expect(screen.getByRole('heading', { name: 'Cá nhân' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '学越南语' }))
    await user.click(screen.getByRole('link', { name: '首页' }))
    // Bài kế tiếp là bài 2 của khoá tiếng Việt, vì bài 1 vẫn được tính là đã xong.
    expect(screen.getByText('礼貌用语')).toBeInTheDocument()
  })
})
