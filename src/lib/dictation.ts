/**
 * Nói thay cho gõ ở màn Dịch — nhận dạng giọng nói có sẵn của trình duyệt
 * (Web Speech API, `SpeechRecognition`). Xem `docs/translate.md`.
 *
 * Trình duyệt tự gửi tiếng nói lên máy chủ nhận dạng của hãng — Google trên
 * Chrome, Apple trên Safari — rồi trả chữ về. Không có cách nào miễn phí khác để
 * nghe được cả tiếng Việt, tiếng Trung lẫn tiếng Anh trong trình duyệt: mô hình
 * chạy trên máy như Whisper nặng hàng chục MB và nghe tiếng Việt kém. Màn Dịch
 * nói rõ chuyện tiếng nói được gửi đi ngay cạnh nút micro.
 *
 * Việc này khác hẳn phần chấm phát âm, nơi tiếng nói **không** rời khỏi máy và
 * `SpeechRecognition` đã bị loại có lý do — `docs/pronunciation-scoring.md`.
 * Ở đây ta chỉ cần biết người học nói chữ gì, không chấm họ nói đúng hay sai.
 */

/** Lý do không nghe được. */
export type DictationFailure =
  /** Trình duyệt không có nhận dạng giọng nói (Firefox, vài trình duyệt nhúng). */
  | 'unsupported'
  /** Người dùng hay trình duyệt chặn micro, hoặc dịch vụ nhận dạng không cho dùng. */
  | 'denied'
  /** Không nghe thấy gì. */
  | 'no-speech'
  | 'no-mic'
  /** Nhận dạng cần mạng. */
  | 'network'
  | 'error'

/** Ngôn ngữ nghe, theo mã BCP 47. */
export type DictationLang = 'vi-VN' | 'zh-CN' | 'en-US'

/** Phần của `SpeechRecognition` mà ta dùng — trình duyệt nào cũng có đủ. */
interface Recognition {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  onresult: ((event: RecognitionResultEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}

interface RecognitionResultEvent {
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>
}

type RecognitionConstructor = new () => Recognition

function recognitionClass(): RecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  const scope = window as unknown as {
    SpeechRecognition?: RecognitionConstructor
    webkitSpeechRecognition?: RecognitionConstructor
  }
  return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null
}

/** Trình duyệt này có nghe được giọng nói không. */
export function dictationSupported(): boolean {
  return recognitionClass() !== null
}

/**
 * Mã lỗi của `SpeechRecognition` → lý do để nói với người học. Trả null cho
 * `aborted`: đó là chính app dừng nghe, không phải lỗi.
 */
export function classifyDictationError(code: string): DictationFailure | null {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'denied'
    case 'no-speech':
      return 'no-speech'
    case 'audio-capture':
      return 'no-mic'
    case 'network':
      return 'network'
    case 'aborted':
      return null
    default:
      return 'error'
  }
}

export interface Dictation {
  /** Thôi nghe, nhưng vẫn lấy những gì đã nghe được. */
  stop(): void
  /** Bỏ hẳn: không báo gì nữa. */
  cancel(): void
}

/**
 * Bắt đầu nghe một câu. Trình duyệt tự dừng khi người nói ngừng.
 *
 * @param options.onText gọi liên tục khi chữ về tới, để ô nhập hiện ngay từng
 * chữ đang nghe được.
 * @param options.onEnd gọi đúng một lần khi xong: có chữ thì `failure` là null.
 */
export function startDictation(options: {
  lang: DictationLang
  onText: (text: string) => void
  onEnd: (result: { text: string; failure: DictationFailure | null }) => void
}): Dictation {
  const Recognition = recognitionClass()
  if (!Recognition) {
    options.onEnd({ text: '', failure: 'unsupported' })
    return { stop() {}, cancel() {} }
  }

  const recognition = new Recognition()
  recognition.lang = options.lang
  recognition.interimResults = true
  recognition.continuous = false
  recognition.maxAlternatives = 1

  let text = ''
  let failure: DictationFailure | null = null
  let finished = false
  const finish = () => {
    if (finished) return
    finished = true
    options.onEnd({ text, failure: text ? null : (failure ?? 'no-speech') })
  }

  recognition.onresult = (event) => {
    let transcript = ''
    for (let i = 0; i < event.results.length; i += 1) transcript += event.results[i][0].transcript
    text = transcript.trim()
    options.onText(text)
  }
  recognition.onerror = (event) => {
    failure = classifyDictationError(event.error) ?? failure
  }
  recognition.onend = finish

  try {
    recognition.start()
  } catch {
    failure = 'error'
    finish()
  }

  return {
    stop: () => recognition.stop(),
    cancel: () => {
      finished = true
      recognition.abort()
    },
  }
}
