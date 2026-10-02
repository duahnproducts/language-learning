import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { AudioButton } from '../components/AudioButton'
import { FocusHeader } from '../components/FocusHeader'
import { MascotSays } from '../components/Mascot'
import { MicButton, type MicStatus } from '../components/speaking/MicButton'
import { SpeakingResult } from '../components/speaking/SpeakingResult'
import { Button } from '../components/ui/Button'
import { findLesson, wordsOfLesson } from '../data/courses'
import { MIC_PROBLEMS, PRIVACY_NOTE } from '../data/pronunciationTips'
import { useProgress } from '../context/ProgressContext'
import { audioUrlForWord } from '../lib/audioFiles'
import { encodeWav } from '../lib/dsp'
import { scoreAttempt, type Attempt } from '../lib/pronunciation'
import { MicError, micSupport, startRecording, type ActiveRecording, type MicFailure } from '../lib/recorder'
import { referenceSeconds } from '../lib/referenceAudio'
import { stopPlayback } from '../lib/speech'
import { loadVoiceSamples, recordVoiceSample, voiceBaseline } from '../lib/voiceBaseline'

const HINTS: Record<MicStatus, string> = {
  idle: 'Bấm micro rồi đọc to từ này',
  starting: 'Đang mở micro…',
  recording: 'Đang nghe… đọc xong mình tự dừng',
  scoring: 'Đang chấm…',
}

/** Thu lâu nhất bao nhiêu giây cho một từ. */
const MAX_SECONDS = 5

/** Hai lỗi này xin lại quyền cũng vô ích: máy hoặc trang không cho thu âm. */
const PERMANENT: MicFailure[] = ['unsupported', 'insecure']

/**
 * Màn Luyện nói: đọc to từng từ của bài học, máy chấm thanh điệu và nhịp ngay
 * trên máy người học — xem `docs/pronunciation-mvp.md`.
 *
 * XP thưởng cho việc có luyện, một lần mỗi từ mỗi lượt vào màn, không phụ
 * thuộc điểm: bộ chấm còn nhiễu vài điểm, đừng để nó làm trọng tài phát XP.
 */
export function Speaking() {
  const { lessonId = '' } = useParams()
  const navigate = useNavigate()
  const { practiceSpeaking } = useProgress()

  // Bộ chấm chỉ biết bốn thanh tiếng Trung, nên bài của khoá tiếng Việt không vào đây.
  const found = findLesson(lessonId)
  const lesson = found?.track === 'zh' ? found : undefined
  const words = wordsOfLesson(lessonId)

  const [index, setIndex] = useState(0)
  const [status, setStatus] = useState<MicStatus>('idle')
  const [level, setLevel] = useState(0)
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [micProblem, setMicProblem] = useState<MicFailure | null>(() => {
    const support = micSupport()
    return support === 'ok' ? null : support
  })
  const [replayUrl, setReplayUrl] = useState<string | null>(null)

  const active = useRef<ActiveRecording | null>(null)
  const replay = useRef<HTMLAudioElement | null>(null)
  const practiced = useRef(new Set<string>())

  // Rời màn hình thì tắt micro và bỏ bản thu — không giữ gì lại.
  useEffect(
    () => () => {
      active.current?.cancel()
      replay.current?.pause()
    },
    [],
  )
  useEffect(() => () => {
    if (replayUrl) URL.revokeObjectURL(replayUrl)
  }, [replayUrl])

  if (!lesson || words.length === 0) return <Navigate to="/learn" replace />

  const word = words[index]
  const isLast = index === words.length - 1

  async function begin() {
    stopPlayback()
    replay.current?.pause()
    setAttempt(null)
    setStatus('starting')
    try {
      active.current = await startRecording({
        maxSeconds: MAX_SECONDS,
        onLevel: setLevel,
        onAutoStop: () => void finish(),
      })
      setStatus('recording')
    } catch (error) {
      setMicProblem(error instanceof MicError ? error.reason : 'error')
      setStatus('idle')
    }
  }

  async function finish() {
    const recorder = active.current
    if (!recorder) return
    active.current = null
    setStatus('scoring')
    setLevel(0)

    const recording = await recorder.stop()
    const reference = await referenceSeconds(audioUrlForWord(word.id))
    // Nhường một nhịp để chữ "Đang chấm…" kịp hiện trước khi máy bận tính.
    await new Promise((resolve) => setTimeout(resolve, 0))

    const result = scoreAttempt({
      samples: recording.samples,
      rate: recording.rate,
      pinyin: word.pinyin,
      referenceSeconds: reference,
      baselineHz: voiceBaseline(loadVoiceSamples()),
    })

    if (!result.rejected) {
      if (result.medianHz) recordVoiceSample(result.medianHz)
      if (!practiced.current.has(word.id)) {
        practiced.current.add(word.id)
        practiceSpeaking()
      }
    }

    setReplayUrl(URL.createObjectURL(new Blob([encodeWav(recording.samples, recording.rate)], { type: 'audio/wav' })))
    setAttempt(result)
    setStatus('idle')
  }

  function press() {
    if (status === 'recording') void finish()
    else if (status === 'idle') void begin()
  }

  function playMine() {
    if (!replayUrl) return
    stopPlayback()
    replay.current?.pause()
    replay.current = new Audio(replayUrl)
    void replay.current.play().catch(() => {})
  }

  function next() {
    active.current?.cancel()
    active.current = null
    replay.current?.pause()
    setStatus('idle')
    setLevel(0)
    setAttempt(null)
    setReplayUrl(null)
    if (isLast) navigate(`/lesson/${lessonId}`)
    else setIndex((current) => current + 1)
  }

  const permanent = micProblem !== null && PERMANENT.includes(micProblem)

  return (
    <>
      <FocusHeader
        title={`Luyện nói · ${index + 1}/${words.length}`}
        progress={((index + (attempt && !attempt.rejected ? 1 : 0)) / words.length) * 100}
        backTo={`/lesson/${lessonId}`}
      />

      <div className="flex-1">
        {index === 0 && !attempt && !micProblem && (
          <MascotSays mood="chao">Đọc to từng từ, mình chấm thanh điệu cho bạn. {PRIVACY_NOTE}</MascotSays>
        )}

        <section aria-label="Từ cần đọc" className="surface mt-5 p-5 text-center">
          <p lang="zh-CN" className="font-hanzi text-6xl font-semibold text-slate-900 dark:text-slate-100">
            {word.hanzi}
          </p>
          <p className="mt-2 text-xl text-brand-600 dark:text-brand-300">{word.pinyin}</p>
          <p className="font-medium text-slate-700 dark:text-slate-300">{word.meaning}</p>
          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <AudioButton text={word.hanzi} wordId={word.id} label={`mẫu ${word.hanzi}`} size="sm" />
            Nghe mẫu trước
          </div>
        </section>

        <div className="mt-6 flex flex-col items-center gap-3">
          {micProblem ? (
            <div className="w-full space-y-3">
              <MascotSays mood="tiec">{MIC_PROBLEMS[micProblem]}</MascotSays>
              {!permanent && (
                <div className="flex justify-center">
                  <Button variant="secondary" onClick={() => setMicProblem(null)}>
                    Thử lại
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <>
              <MicButton status={status} level={level} onPress={press} />
              <p aria-live="polite" className="text-sm text-slate-500 dark:text-slate-400">
                {attempt && status === 'idle' ? 'Bấm micro để đọc lại' : HINTS[status]}
              </p>
            </>
          )}
        </div>

        {attempt && (
          <div className="mt-6">
            <SpeakingResult attempt={attempt} onReplay={replayUrl ? playMine : undefined} />
          </div>
        )}
      </div>

      <div className="sticky bottom-0 -mx-4 mt-6 bg-slate-50/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur dark:bg-slate-950/95">
        <Button
          size="lg"
          fullWidth
          variant={attempt && !attempt.rejected ? 'primary' : 'secondary'}
          disabled={status === 'starting' || status === 'scoring'}
          onClick={next}
        >
          {isLast ? 'Xong' : attempt && !attempt.rejected ? 'Từ tiếp theo' : 'Bỏ qua từ này'}
        </Button>
      </div>
    </>
  )
}
