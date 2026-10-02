import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Flashcard } from '../components/Flashcard'
import { FocusHeader } from '../components/FocusHeader'
import { Button } from '../components/ui/Button'
import { findLesson, wordsOfLesson } from '../data/courses'
import { useProgress, useT } from '../context/ProgressContext'

/**
 * Bước 2: lật từng thẻ và tự đánh giá.
 * Luồng đúng mục 7 của bản thiết kế: nhìn từ → tự nhớ → lật → đánh giá → lưu tiến độ.
 */
export function Flashcards() {
  const { lessonId = '' } = useParams()
  const navigate = useNavigate()
  const { reviewWord } = useProgress()
  const t = useT()

  const lesson = findLesson(lessonId)
  const words = wordsOfLesson(lessonId)

  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  if (!lesson || words.length === 0) return <Navigate to="/learn" replace />

  const word = words[index]
  const isLast = index === words.length - 1

  function rate(known: boolean) {
    reviewWord(word.id, known)
    if (isLast) {
      navigate(`/lesson/${lessonId}/exercise`)
      return
    }
    setFlipped(false)
    setIndex((current) => current + 1)
  }

  return (
    <>
      <FocusHeader
        title={`${t('Flashcard', '闪卡')} · ${index + 1}/${words.length}`}
        progress={25 + (index / words.length) * 25}
        backTo={`/lesson/${lessonId}`}
      />

      <div className="flex flex-1 flex-col justify-center gap-6">
        <Flashcard word={word} flipped={flipped} onFlip={() => setFlipped((v) => !v)} />

        {flipped ? (
          <div className="grid grid-cols-2 gap-3">
            <Button variant="danger" size="lg" onClick={() => rate(false)}>
              {t('Chưa nhớ', '还没记住')}
            </Button>
            <Button variant="success" size="lg" onClick={() => rate(true)}>
              {t('Đã nhớ', '记住了')}
            </Button>
          </div>
        ) : (
          <Button size="lg" fullWidth onClick={() => setFlipped(true)}>
            {t('Lật thẻ', '翻卡')}
          </Button>
        )}

        <p className="text-center text-sm text-slate-400 dark:text-slate-500">
          {t('Tự trả lời trong đầu trước khi lật — nhớ lâu hơn nhiều.', '翻卡前先在心里回答——记得更牢。')}
        </p>
      </div>
    </>
  )
}
