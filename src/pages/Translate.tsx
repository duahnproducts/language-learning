import { useEffect, useRef, useState } from 'react'
import { AudioButton } from '../components/AudioButton'
import { BookIcon, ChevronDownIcon, MicIcon, SpeakerIcon, SwapIcon } from '../components/icons/UiIcons'
import { MascotSays } from '../components/Mascot'
import { Button } from '../components/ui/Button'
import { useT, useTrack } from '../context/ProgressContext'
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

type T = (vi: string, zh: string) => string

/** Những gì đổi theo ngôn ngữ. Tên và lời nhắc viết bằng tiếng của giao diện. */
function langInfo(
  t: T,
): Record<Lang, { name: string; lower: string; placeholder: string; listen: DictationLang; code: string; suggestions: string[] }> {
  return {
    vi: {
      name: t('Tiếng Việt', '越南语'),
      lower: t('tiếng Việt', '越南语'),
      placeholder: t('Gõ, hoặc bấm micro để nói. Ví dụ: con mèo', '输入越南语，或点麦克风说话。例如：xin chào'),
      listen: 'vi-VN',
      code: 'vi',
      suggestions: ['xin chào', 'cảm ơn', 'bạn tên là gì?', 'tôi muốn uống trà'],
    },
    zh: {
      name: t('Tiếng Trung', '中文'),
      lower: t('tiếng Trung', '中文'),
      placeholder: t('Gõ chữ Hán, hoặc bấm micro để nói. Ví dụ: 你好', '输入汉字，或点麦克风说话。例如：你好'),
      listen: 'zh-CN',
      code: 'zh-CN',
      suggestions: ['你好', '谢谢', '你叫什么名字？', '我想喝茶'],
    },
    en: {
      name: t('Tiếng Anh', '英语'),
      lower: t('tiếng Anh', '英语'),
      placeholder: t('Gõ tiếng Anh, hoặc bấm micro để nói. Ví dụ: hello', '输入英语，或点麦克风说话。例如：hello'),
      listen: 'en-US',
      code: 'en',
      suggestions: ['hello', 'thank you', "what's your name?", 'I would like some tea'],
    },
  }
}

/** Zibi nói gì khi không dịch được. Ô trống thì nút đã tắt, không cần lời. */
function failures(t: T): Record<Exclude<TranslateFailure, 'empty'>, string> {
  return {
    'too-long': t(
      `Dài quá — mỗi lần mình dịch tối đa ${MAX_INPUT_LENGTH} chữ thôi nhé.`,
      `太长了——每次最多翻译 ${MAX_INPUT_LENGTH} 个字。`,
    ),
    'not-chinese': t(
      'Dịch từ tiếng Trung thì cần chữ Hán. Gõ chữ Hán, hoặc bấm micro rồi nói tiếng Trung nhé.',
      '从中文翻译需要汉字。请输入汉字，或点麦克风说中文。',
    ),
    'looks-chinese': t('Đây là chữ Hán — chọn dịch từ tiếng Trung nhé.', '这是汉字——请选择从中文翻译。'),
    offline: t(
      'Đang mất mạng nên mình chỉ tra được từ và câu có trong bài học. Có mạng lại thì thử lần nữa nhé.',
      '现在没有网络，只能查课程里的词和句子。联网后再试一次吧。',
    ),
    blocked: t(
      'Google Dịch đang tạm từ chối vì bị hỏi dồn dập. Đợi vài phút rồi thử lại nhé.',
      '请求太频繁，Google 翻译暂时拒绝了。等几分钟再试吧。',
    ),
    failed: t('Chưa dịch được lần này. Bạn thử lại nhé.', '这次没翻译成功，请再试一次。'),
  }
}

/** Zibi nói gì khi không nghe được. */
function hearingProblems(t: T): Record<DictationFailure, string> {
  return {
    unsupported: t(
      'Trình duyệt này chưa nghe được giọng nói. Hãy mở bằng Chrome hoặc Safari, hoặc gõ vào ô nhé.',
      '这个浏览器不能识别语音。请用 Chrome 或 Safari 打开，或者直接输入。',
    ),
    denied: t(
      'Micro đang bị chặn. Cho phép Micro trong cài đặt của trang rồi thử lại. Trên iPhone, nếu mở app từ màn hình chính mà không nghe được, hãy thử mở bằng Safari.',
      '麦克风被禁用了。请在网站设置里允许麦克风，然后再试。iPhone 上如果从主屏幕打开听不到，请改用 Safari 打开。',
    ),
    'no-speech': t('Mình chưa nghe thấy gì. Bấm micro rồi nói to, rõ một chút nhé.', '我什么也没听到。点麦克风，大声清楚地说一遍吧。'),
    'no-mic': t('Không tìm thấy micro nào trên máy này.', '这台设备上找不到麦克风。'),
    network: t('Nghe giọng nói cần có mạng. Có mạng lại thì thử lần nữa nhé.', '语音识别需要网络。联网后再试一次吧。'),
    error: t('Chưa nghe được lần này. Bạn thử lại nhé.', '这次没听清，请再试一次。'),
  }
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
  const t = useT()
  const LANG_INFO = langInfo(t)
  // Mặc định dịch từ tiếng của người học sang thứ tiếng họ đang học.
  const [pair, setPair] = useState<Pair>(useTrack() === 'vi' ? { from: 'zh', to: 'vi' } : { from: 'vi', to: 'zh' })
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
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t('Dịch', '翻译')}</h1>

      <MascotSays mood="chao">
        {t(
          'Gõ hoặc bấm micro để nói — mình dịch qua lại tiếng Việt, tiếng Trung và tiếng Anh, rồi đọc cho bạn nghe.',
          '输入或点麦克风说话——我在越南语、中文和英语之间互译，然后读给你听。',
        )}
      </MascotSays>

      <form onSubmit={submit} className="surface space-y-3 p-4">
        <div className="flex items-center gap-2">
          <LangSelect label={t('Dịch từ', '翻译自')} names={LANG_INFO} value={pair.from} onChange={(lang) => choose('from', lang)} />
          <button
            type="button"
            onClick={swap}
            aria-label={t('Đổi chiều dịch', '交换翻译方向')}
            title={t('Đổi chiều dịch', '交换翻译方向')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-brand-600 ring-1 ring-slate-200 transition hover:bg-slate-50 active:scale-90 dark:text-brand-300 dark:ring-slate-700 dark:hover:bg-slate-800"
          >
            <SwapIcon size={20} />
          </button>
          <LangSelect label={t('Dịch sang', '翻译成')} names={LANG_INFO} value={pair.to} onChange={(lang) => choose('to', lang)} />
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
            placeholder={listening ? t('Đang nghe…', '正在听…') : source.placeholder}
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
            aria-label={listening ? t('Dừng nghe', '停止听') : t(`Nói ${source.lower}`, `说${source.lower}`)}
            aria-pressed={listening}
            title={listening ? t('Dừng nghe', '停止听') : t(`Nói ${source.lower}`, `说${source.lower}`)}
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
          {listening
            ? t('Đang nghe…', '正在听…')
            : loading
              ? t('Đang dịch…', '正在翻译…')
              : t(`Dịch sang ${target.lower}`, `翻译成${target.lower}`)}
        </Button>

        <div className="flex flex-wrap gap-2" aria-label={t('Gợi ý', '建议')}>
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
            <MascotSays mood="nghi">{hearingProblems(t)[hearing]}</MascotSays>
          </div>
        )}
        {state.status === 'done' && <TranslationCard result={state.result} />}
        {state.status === 'error' && state.reason !== 'empty' && (
          <div role="status" className="space-y-3">
            <MascotSays mood="tiec" tone="wrong">
              {failures(t)[state.reason]}
            </MascotSays>
            {state.reason === 'looks-chinese' && (
              <div className="flex justify-center">
                <Button variant="secondary" onClick={translateFromChinese}>
                  <SwapIcon size={18} /> {t('Dịch từ tiếng Trung', '从中文翻译')}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        {t(
          'Từ và câu có trong bài học được tra ngay trên máy, kèm giọng đọc thu sẵn. Còn lại được gửi tới Google Dịch để dịch. Khi bấm micro, trình duyệt gửi giọng nói tới dịch vụ nhận dạng của hãng (Google trên Chrome, Apple trên Safari) để đổi thành chữ.',
          '课程里的词和句子直接在设备上查，并配有录好的发音；其余内容发送到 Google 翻译。点麦克风时，浏览器会把语音发给厂商的识别服务（Chrome 用 Google，Safari 用 Apple）转成文字。',
        )}
      </p>
    </div>
  )
}

/** Ô chọn ngôn ngữ — ô chọn thật của trình duyệt, nên trên điện thoại hiện đúng bảng chọn của máy. */
function LangSelect({
  label,
  names,
  value,
  onChange,
}: {
  label: string
  names: Record<Lang, { name: string }>
  value: Lang
  onChange: (lang: Lang) => void
}) {
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
            {names[lang].name}
          </option>
        ))}
      </select>
      <ChevronDownIcon size={16} className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-slate-400" />
    </span>
  )
}

/** Dòng nói rõ bản dịch lấy từ đâu. */
function SourceNote({ result }: { result: Translation }) {
  const t = useT()
  return (
    <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
      {result.source === 'course' ? (
        <>
          <BookIcon size={16} className="mr-1 inline-block align-[-3px]" />
          {t('Có trong bài học', '课程里有')}
          {result.from === 'vi' && result.courseMeaning && `: “${result.courseMeaning}”`}
        </>
      ) : (
        t('Dịch bởi Google Dịch', '由 Google 翻译提供')
      )}
    </p>
  )
}

function TranslationCard({ result }: { result: Translation }) {
  return result.to === 'zh' ? <ChineseCard result={result} /> : <TextCard result={result} lang={result.to} />
}

/** Dịch sang tiếng Trung: chữ Hán to, pinyin, nút nghe lại. */
function ChineseCard({ result }: { result: Translation }) {
  const t = useT()
  const chinese = result.chinese ?? { hanzi: result.translated, pinyin: null }
  const long = chinese.hanzi.length > 8

  return (
    <section aria-label={t('Bản dịch', '译文')} className="surface p-5">
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
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {t('Cũng mang nghĩa này trong bài học:', '课程里意思相同的词：')}
          </p>
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
  const t = useT()
  return (
    <section aria-label={t('Bản dịch', '译文')} className="surface p-5">
      <div className="flex items-start gap-4">
        <p lang={lang} className="min-w-0 flex-1 text-2xl font-bold break-words text-slate-900 dark:text-slate-100">
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
  const t = useT()
  const name = langInfo(t)[lang].lower

  async function speak() {
    setHint(null)
    setBusy(true)
    const result = await speakWithDeviceVoice(text, lang)
    setBusy(false)
    if (result === 'no-voice')
      setHint(t(`Máy chưa có giọng đọc ${name} nên mình chưa đọc được câu này.`, `设备没有${name}语音，暂时读不了这句话。`))
    else if (result === 'unsupported') setHint(t('Trình duyệt này chưa đọc được thành tiếng.', '这个浏览器不能朗读。'))
    else if (result === 'error') setHint(t('Không đọc được lần này. Thử bấm lại nhé.', '这次没读出来，请再点一次。'))
  }

  return (
    <span className="relative inline-flex flex-col items-center">
      <button
        type="button"
        onClick={speak}
        aria-label={t(`Nghe câu ${name}`, `听${name}句子`)}
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
