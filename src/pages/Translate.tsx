import { useEffect, useRef, useState } from 'react'
import { AudioButton } from '../components/AudioButton'
import { BookIcon, ChevronDownIcon, MicIcon, SpeakerIcon, SwapIcon } from '../components/icons/UiIcons'
import { MascotSays } from '../components/Mascot'
import { Button } from '../components/ui/Button'
import { cn } from '../lib/cn'
import { startDictation, type Dictation, type DictationFailure, type DictationLang } from '../lib/dictation'
import { playWord, speakWithDeviceVoice, stopPlayback, type DeviceVoiceLang } from '../lib/speech'
import {
  LANGS,
  MAX_INPUT_LENGTH,
  TranslateError,
  flip,
  flipTranslation,
  translate,
  type Lang,
  type Pair,
  type TranslateFailure,
  type Translation,
} from '../lib/translate'

/** Những gì đổi theo ngôn ngữ. */
const LANG_INFO: Record<
  Lang,
  { name: string; lower: string; placeholder: string; listen: DictationLang; code: string; suggestions: string[] }
> = {
  vi: {
    name: 'Tiếng Việt',
    lower: 'tiếng Việt',
    placeholder: 'Gõ, hoặc bấm micro để nói. Ví dụ: con mèo',
    listen: 'vi-VN',
    code: 'vi',
    suggestions: ['xin chào', 'cảm ơn', 'bạn tên là gì?', 'tôi muốn uống trà'],
  },
  zh: {
    name: 'Tiếng Trung',
    lower: 'tiếng Trung',
    placeholder: 'Gõ chữ Hán, hoặc bấm micro để nói. Ví dụ: 你好',
    listen: 'zh-CN',
    code: 'zh-CN',
    suggestions: ['你好', '谢谢', '你叫什么名字？', '我想喝茶'],
  },
  en: {
    name: 'Tiếng Anh',
    lower: 'tiếng Anh',
    placeholder: 'Gõ tiếng Anh, hoặc bấm micro để nói. Ví dụ: hello',
    listen: 'en-US',
    code: 'en',
    suggestions: ['hello', 'thank you', "what's your name?", 'I would like some tea'],
  },
}

/** Zibi nói gì khi không dịch được. Ô trống thì nút đã tắt, không cần lời. */
const FAILURES: Record<Exclude<TranslateFailure, 'empty'>, string> = {
  'too-long': `Dài quá — mỗi lần mình dịch tối đa ${MAX_INPUT_LENGTH} chữ thôi nhé.`,
  'not-chinese': 'Dịch từ tiếng Trung thì cần chữ Hán. Gõ chữ Hán, hoặc bấm micro rồi nói tiếng Trung nhé.',
  'looks-chinese': 'Đây là chữ Hán — chọn dịch từ tiếng Trung nhé.',
  offline: 'Đang mất mạng nên mình chỉ tra được từ và câu có trong bài học. Có mạng lại thì thử lần nữa nhé.',
  blocked: 'Google Dịch đang tạm từ chối vì bị hỏi dồn dập. Đợi vài phút rồi thử lại nhé.',
  failed: 'Chưa dịch được lần này. Bạn thử lại nhé.',
}

/** Zibi nói gì khi không nghe được. */
const HEARING: Record<DictationFailure, string> = {
  unsupported: 'Trình duyệt này chưa nghe được giọng nói. Hãy mở bằng Chrome hoặc Safari, hoặc gõ vào ô nhé.',
  denied:
    'Micro đang bị chặn. Cho phép Micro trong cài đặt của trang rồi thử lại. Trên iPhone, nếu mở app từ màn hình chính mà không nghe được, hãy thử mở bằng Safari.',
  'no-speech': 'Mình chưa nghe thấy gì. Bấm micro rồi nói to, rõ một chút nhé.',
  'no-mic': 'Không tìm thấy micro nào trên máy này.',
  network: 'Nghe giọng nói cần có mạng. Có mạng lại thì thử lần nữa nhé.',
  error: 'Chưa nghe được lần này. Bạn thử lại nhé.',
}

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; result: Translation }
  | { status: 'error'; reason: TranslateFailure }

/**
 * Dịch xong thì đọc bản dịch một lần: tiếng Trung bằng giọng thu sẵn nếu có,
 * tiếng Việt và tiếng Anh bằng giọng của máy.
 */
function speakResult(result: Translation) {
  if (result.to === 'zh') {
    if (result.chinese) {
      void playWord({ text: result.chinese.hanzi, wordId: result.chinese.wordId, clipUrl: result.chinese.clipUrl })
    }
  } else {
    void speakWithDeviceVoice(result.translated, result.to)
  }
}

/**
 * Màn Dịch: qua lại giữa tiếng Việt, tiếng Trung và tiếng Anh, gõ hoặc nói, rồi
 * Zibi đọc bản dịch lên.
 *
 * Tra khoá học trước, không có mới hỏi Google Dịch — xem `src/lib/translate.ts`
 * và `docs/translate.md`. Nói thì dùng nhận dạng giọng nói của trình duyệt —
 * `src/lib/dictation.ts`.
 */
export function Translate() {
  const [pair, setPair] = useState<Pair>({ from: 'vi', to: 'zh' })
  const [text, setText] = useState('')
  const [state, setState] = useState<State>({ status: 'idle' })
  const [listening, setListening] = useState(false)
  const [hearing, setHearing] = useState<DictationFailure | null>(null)

  // Người học có thể dịch câu mới khi câu cũ chưa về: chỉ nhận câu mới nhất.
  const latest = useRef(0)
  const dictation = useRef<Dictation | null>(null)

  // Rời màn hình thì thôi nghe, thôi đọc.
  useEffect(
    () => () => {
      dictation.current?.cancel()
      stopPlayback()
    },
    [],
  )

  const source = LANG_INFO[pair.from]
  const target = LANG_INFO[pair.to]
  const loading = state.status === 'loading'

  async function run(query: string, next: Pair = pair) {
    const ticket = ++latest.current
    setHearing(null)
    setState({ status: 'loading' })
    try {
      const result = await translate(query, { pair: next })
      if (ticket !== latest.current) return
      setState({ status: 'done', result })
      speakResult(result)
    } catch (error) {
      if (ticket !== latest.current) return
      setState({ status: 'error', reason: error instanceof TranslateError ? error.reason : 'failed' })
    }
  }

  function submit(event?: React.FormEvent) {
    event?.preventDefault()
    if (text.trim() && !loading && !listening) void run(text)
  }

  /** Dừng mọi thứ đang dở trước khi đổi ngôn ngữ. */
  function interrupt() {
    dictation.current?.cancel()
    setListening(false)
    stopPlayback()
    latest.current += 1
    setHearing(null)
  }

  /** Đảo hai bên. Vừa dịch xong thì lật luôn cặp câu, khỏi gọi mạng lần nữa. */
  function swap() {
    interrupt()
    setPair(flip(pair))
    if (state.status === 'done') {
      setText(state.result.translated)
      setState({ status: 'done', result: flipTranslation(state.result) })
    } else {
      setState({ status: 'idle' })
    }
  }

  /** Chọn một ngôn ngữ. Trùng với bên kia thì đổi chỗ hai bên, như các app dịch vẫn làm. */
  function choose(side: keyof Pair, lang: Lang) {
    if (lang === pair[side]) return
    const other: keyof Pair = side === 'from' ? 'to' : 'from'
    if (lang === pair[other]) {
      swap()
      return
    }

    interrupt()
    const next = { ...pair, [side]: lang }
    setPair(next)
    // Đổi ngôn ngữ đích mà đang có bản dịch thì dịch lại luôn câu đó sang ngôn
    // ngữ mới. Đổi ngôn ngữ nguồn thì câu đang có không còn đúng tiếng nữa.
    if (side === 'to' && state.status === 'done' && text.trim()) void run(text, next)
    else setState({ status: 'idle' })
  }

  /** Gõ chữ Hán mà đang dịch từ thứ tiếng khác: chuyển sang dịch từ tiếng Trung rồi dịch luôn. */
  function translateFromChinese() {
    const next: Pair = { from: 'zh', to: pair.to === 'zh' ? pair.from : pair.to }
    setPair(next)
    void run(text, next)
  }

  function toggleListening() {
    if (listening) {
      // Thôi nghe nhưng giữ những gì đã nghe được — onEnd sẽ dịch.
      dictation.current?.stop()
      return
    }

    stopPlayback()
    latest.current += 1
    setHearing(null)
    setState({ status: 'idle' })
    setListening(true)

    const current = pair
    dictation.current = startDictation({
      lang: LANG_INFO[current.from].listen,
      onText: setText,
      onEnd: ({ text: heard, failure }) => {
        setListening(false)
        if (heard) {
          setText(heard)
          void run(heard, current)
        } else if (failure) {
          setHearing(failure)
        }
      },
    })
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dịch</h1>

      <MascotSays mood="chao">
        Gõ hoặc bấm micro để nói — mình dịch qua lại tiếng Việt, tiếng Trung và tiếng Anh, rồi đọc cho bạn nghe.
      </MascotSays>

      <form onSubmit={submit} className="surface space-y-3 p-4">
        <div className="flex items-center gap-2">
          <LangSelect label="Dịch từ" value={pair.from} onChange={(lang) => choose('from', lang)} />
          <button
            type="button"
            onClick={swap}
            aria-label="Đổi chiều dịch"
            title="Đổi chiều dịch"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-brand-600 ring-1 ring-slate-200 transition hover:bg-slate-50 active:scale-90 dark:text-brand-300 dark:ring-slate-700 dark:hover:bg-slate-800"
          >
            <SwapIcon size={20} />
          </button>
          <LangSelect label="Dịch sang" value={pair.to} onChange={(lang) => choose('to', lang)} />
        </div>

        <label htmlFor="translate-input" className="sr-only">
          {source.name}
        </label>
        <div className="relative">
          <textarea
            id="translate-input"
            lang={source.code}
            value={text}
            rows={2}
            maxLength={MAX_INPUT_LENGTH}
            readOnly={listening}
            placeholder={listening ? 'Đang nghe…' : source.placeholder}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              // Enter là dịch; Shift + Enter mới xuống dòng.
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                submit()
              }
            }}
            className={cn(
              'block w-full resize-none rounded-2xl border border-slate-200 py-3 pr-16 pl-4 text-base dark:border-slate-700 dark:bg-slate-800',
              pair.from === 'zh' && 'font-hanzi',
            )}
          />
          <button
            type="button"
            onClick={toggleListening}
            disabled={loading}
            aria-label={listening ? 'Dừng nghe' : `Nói ${source.lower}`}
            aria-pressed={listening}
            title={listening ? 'Dừng nghe' : `Nói ${source.lower}`}
            className={cn(
              'absolute right-2 bottom-2 flex h-11 w-11 items-center justify-center rounded-full transition active:scale-90 disabled:opacity-40',
              listening
                ? 'animate-pulse bg-brand-500 text-white ring-4 ring-brand-500/25 motion-reduce:animate-none'
                : 'bg-brand-50 text-brand-600 ring-1 ring-brand-100 hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-300 dark:ring-brand-500/25',
            )}
          >
            <MicIcon size={22} />
          </button>
        </div>

        <Button type="submit" size="lg" fullWidth disabled={!text.trim() || loading || listening}>
          {listening ? 'Đang nghe…' : loading ? 'Đang dịch…' : `Dịch sang ${target.lower}`}
        </Button>

        <div className="flex flex-wrap gap-2" aria-label="Gợi ý">
          {source.suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              lang={source.code}
              disabled={loading || listening}
              onClick={() => {
                setText(suggestion)
                void run(suggestion)
              }}
              className="rounded-full px-3 py-1.5 text-sm text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-40 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-800"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </form>

      <div aria-live="polite">
        {hearing && (
          <div role="status">
            <MascotSays mood="nghi">{HEARING[hearing]}</MascotSays>
          </div>
        )}
        {state.status === 'done' && <TranslationCard result={state.result} />}
        {state.status === 'error' && state.reason !== 'empty' && (
          <div role="status" className="space-y-3">
            <MascotSays mood="tiec" tone="wrong">
              {FAILURES[state.reason]}
            </MascotSays>
            {state.reason === 'looks-chinese' && (
              <div className="flex justify-center">
                <Button variant="secondary" onClick={translateFromChinese}>
                  <SwapIcon size={18} /> Dịch từ tiếng Trung
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        Từ và câu có trong bài học được tra ngay trên máy, kèm giọng đọc thu sẵn. Còn lại được gửi tới Google
        Dịch để dịch. Khi bấm micro, trình duyệt gửi giọng nói tới dịch vụ nhận dạng của hãng (Google trên
        Chrome, Apple trên Safari) để đổi thành chữ.
      </p>
    </div>
  )
}

/** Ô chọn ngôn ngữ — ô chọn thật của trình duyệt, nên trên điện thoại hiện đúng bảng chọn của máy. */
function LangSelect({ label, value, onChange }: { label: string; value: Lang; onChange: (lang: Lang) => void }) {
  return (
    <span className="relative min-w-0 flex-1">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value as Lang)}
        className="w-full appearance-none rounded-full bg-transparent py-2 pr-8 pl-3 text-center font-semibold text-slate-900 ring-1 ring-slate-200 transition hover:bg-slate-50 dark:text-slate-100 dark:ring-slate-700 dark:hover:bg-slate-800"
      >
        {LANGS.map((lang) => (
          <option key={lang} value={lang}>
            {LANG_INFO[lang].name}
          </option>
        ))}
      </select>
      <ChevronDownIcon size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-400" />
    </span>
  )
}

/** Dòng nói rõ bản dịch lấy từ đâu. */
function SourceNote({ result }: { result: Translation }) {
  return (
    <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
      {result.source === 'course' ? (
        <>
          <BookIcon size={16} className="mr-1 inline-block align-[-3px]" />
          Có trong bài học
          {result.from === 'vi' && result.courseMeaning && `: “${result.courseMeaning}”`}
        </>
      ) : (
        'Dịch bởi Google Dịch'
      )}
    </p>
  )
}

function TranslationCard({ result }: { result: Translation }) {
  return result.to === 'zh' ? <ChineseCard result={result} /> : <TextCard result={result} lang={result.to} />
}

/** Dịch sang tiếng Trung: chữ Hán to, pinyin, nút nghe lại. */
function ChineseCard({ result }: { result: Translation }) {
  const chinese = result.chinese ?? { hanzi: result.translated, pinyin: null }
  const long = chinese.hanzi.length > 8

  return (
    <section aria-label="Bản dịch" className="surface p-5">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <p
            lang="zh-CN"
            className={cn(
              'font-hanzi font-semibold break-words text-slate-900 dark:text-slate-100',
              long ? 'text-3xl' : 'text-5xl',
            )}
          >
            {chinese.hanzi}
          </p>
          {chinese.pinyin && <p className="mt-2 text-lg text-brand-600 dark:text-brand-300">{chinese.pinyin}</p>}
        </div>
        <AudioButton text={chinese.hanzi} wordId={chinese.wordId} clipUrl={chinese.clipUrl} label={chinese.hanzi} size="lg" />
      </div>

      <SourceNote result={result} />

      {result.alternatives && result.alternatives.length > 0 && (
        <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Cũng mang nghĩa này trong bài học:</p>
          <ul className="mt-2 space-y-2">
            {result.alternatives.map((entry) =>
              entry.chinese ? (
                <li key={entry.chinese.hanzi} className="flex items-center gap-3">
                  <span lang="zh-CN" className="font-hanzi text-2xl font-semibold text-slate-900 dark:text-slate-100">
                    {entry.chinese.hanzi}
                  </span>
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="text-brand-600 dark:text-brand-300">{entry.chinese.pinyin}</span>
                    <span className="text-slate-500 dark:text-slate-400"> · {entry.courseMeaning}</span>
                  </span>
                  <AudioButton
                    text={entry.chinese.hanzi}
                    wordId={entry.chinese.wordId}
                    clipUrl={entry.chinese.clipUrl}
                    label={entry.chinese.hanzi}
                    size="sm"
                  />
                </li>
              ) : null,
            )}
          </ul>
        </div>
      )}
    </section>
  )
}

/**
 * Dịch sang tiếng Việt hay tiếng Anh: bản dịch to. Câu gốc là tiếng Trung thì
 * bên dưới hiện chữ Hán kèm pinyin — người học vẫn thấy và nghe được phía tiếng
 * Trung, thứ họ đang học.
 */
function TextCard({ result, lang }: { result: Translation; lang: DeviceVoiceLang }) {
  return (
    <section aria-label="Bản dịch" className="surface p-5">
      <div className="flex items-start gap-4">
        <p lang={LANG_INFO[lang].code} className="min-w-0 flex-1 text-2xl font-bold break-words text-slate-900 dark:text-slate-100">
          {result.translated}
        </p>
        <DeviceSpeakButton text={result.translated} lang={lang} />
      </div>

      {result.chinese && (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/60">
          <div className="min-w-0 flex-1">
            <p lang="zh-CN" className="font-hanzi text-2xl font-semibold break-words text-slate-900 dark:text-slate-100">
              {result.chinese.hanzi}
            </p>
            {result.chinese.pinyin && <p className="text-brand-600 dark:text-brand-300">{result.chinese.pinyin}</p>}
          </div>
          <AudioButton
            text={result.chinese.hanzi}
            wordId={result.chinese.wordId}
            clipUrl={result.chinese.clipUrl}
            label={result.chinese.hanzi}
            size="md"
          />
        </div>
      )}

      <SourceNote result={result} />
    </section>
  )
}

/** Nút đọc bản dịch tiếng Việt hay tiếng Anh bằng giọng của máy. */
function DeviceSpeakButton({ text, lang }: { text: string; lang: DeviceVoiceLang }) {
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const name = LANG_INFO[lang].lower

  async function speak() {
    setHint(null)
    setBusy(true)
    const result = await speakWithDeviceVoice(text, lang)
    setBusy(false)
    if (result === 'no-voice') setHint(`Máy chưa có giọng đọc ${name} nên mình chưa đọc được câu này.`)
    else if (result === 'unsupported') setHint('Trình duyệt này chưa đọc được thành tiếng.')
    else if (result === 'error') setHint('Không đọc được lần này. Thử bấm lại nhé.')
  }

  return (
    <span className="relative inline-flex flex-col items-center">
      <button
        type="button"
        onClick={speak}
        aria-label={`Nghe câu ${name}`}
        aria-busy={busy}
        className={cn(
          'inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 ring-1 ring-brand-100 transition hover:bg-brand-100 active:scale-95 dark:bg-brand-500/15 dark:text-brand-300 dark:ring-brand-500/25 dark:hover:bg-brand-500/25',
          busy && 'animate-pulse motion-reduce:animate-none',
        )}
      >
        <SpeakerIcon size={24} />
      </button>
      {hint && (
        <span
          role="status"
          className="absolute top-full right-0 z-10 mt-2 w-60 rounded-xl bg-slate-900 px-3 py-2 text-center text-xs leading-snug font-normal text-white shadow-lg dark:bg-slate-700"
        >
          {hint}
        </span>
      )}
    </span>
  )
}
