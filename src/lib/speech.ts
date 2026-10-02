/**
 * Phát âm tiếng Trung.
 *
 * Bốn nguồn âm thanh, thử lần lượt — mục 7 của `docs/audio-tts.md`:
 *
 * 1. File thu sẵn trong `src/assets/audio/` (xem `audioFiles.ts`).
 * 2. CDN Supabase, đường dẫn suy ra từ nội dung (xem `remoteAudio.ts`).
 * 3. Edge Function `/speak`, chỉ khi CDN chưa có file.
 * 4. Giọng đọc tiếng Trung của hệ điều hành qua Web Speech API.
 *
 * Hết cả bốn thì nút chuyển xám kèm hướng dẫn, chứ không im lặng: máy không có
 * giọng tiếng Trung thì Web Speech API không phát gì mà cũng không báo lỗi.
 */

import { audioUrlForWord, hasRecordedAudio, hasVietnameseAudio } from './audioFiles'
import { remoteAudioUrl } from './remoteAudio'
import { hasSupabase } from '../services/supabase'

/** Tình trạng phát âm của máy đang dùng. */
export type AudioStatus =
  /** Phát được: có file thu sẵn hoặc có giọng tiếng Trung. */
  | 'ready'
  /** Trình duyệt đọc được nhưng máy chưa cài giọng tiếng Trung nào. */
  | 'no-chinese-voice'
  /** Như trên, cho khoá tiếng Việt: không có file thu sẵn, máy cũng không có giọng tiếng Việt. */
  | 'no-vietnamese-voice'
  /** Trình duyệt không hỗ trợ đọc và cũng không có file thu sẵn. */
  | 'unsupported'

/** Kết quả một lần bấm nút phát âm. */
export type PlayResult = 'played' | 'no-chinese-voice' | 'no-vietnamese-voice' | 'unsupported' | 'error'

/** Chữ Hán (khối CJK cơ bản và mở rộng A). */
const HAN = /[㐀-鿿]/

/**
 * Chuỗi cần đọc là tiếng Việt hay tiếng Trung.
 *
 * Nút phát âm của khoá tiếng Việt đi chung đường với khoá tiếng Trung, và hai
 * thứ chữ không bao giờ lẫn nhau: câu tiếng Trung luôn có chữ Hán, câu tiếng
 * Việt thì không có chữ nào.
 */
export function isVietnameseText(text: string): boolean {
  return !HAN.test(text)
}

/** Thứ tiếng của chuỗi cần đọc. */
export type AudioLang = 'zh' | 'vi'

/**
 * Nút phát âm đang ở chặng nào.
 * Tải file từ mạng có thể mất vài giây, nên giao diện cần phân biệt "đang tải"
 * với "đang đọc" thay vì để người học nhìn một nút nhấp nháy không rõ vì sao.
 */
export type PlayStage = 'loading' | 'speaking'

/** Mã ngôn ngữ được coi là tiếng Trung: phổ thông, Quan thoại, Quảng Đông. */
const CHINESE_LANGS = ['zh', 'cmn', 'yue']

/** Thứ tự ưu tiên khi máy có nhiều giọng tiếng Trung. */
const PREFERRED_LANGS = ['zh-cn', 'zh', 'cmn', 'zh-tw', 'zh-hk', 'yue']

function synth(): SpeechSynthesis | null {
  if (typeof window === 'undefined') return null
  return 'speechSynthesis' in window ? window.speechSynthesis : null
}

function isChinese(voice: SpeechSynthesisVoice): boolean {
  const lang = voice.lang.toLowerCase().replace('_', '-')
  return CHINESE_LANGS.some((code) => lang === code || lang.startsWith(`${code}-`))
}

function rank(voice: SpeechSynthesisVoice): number {
  const lang = voice.lang.toLowerCase().replace('_', '-')
  const index = PREFERRED_LANGS.findIndex((code) => lang === code || lang.startsWith(`${code}-`))
  return index === -1 ? PREFERRED_LANGS.length : index
}

/** Giọng tiếng Trung hợp nhất mà máy đang có, hoặc null nếu không có giọng nào. */
export function findChineseVoice(): SpeechSynthesisVoice | null {
  const speech = synth()
  if (!speech) return null

  const chinese = speech.getVoices().filter(isChinese)
  if (chinese.length === 0) return null

  return [...chinese].sort((a, b) => rank(a) - rank(b))[0]
}

/**
 * Tình trạng phát âm ngay lúc này.
 *
 * Có file thu sẵn hoặc có Supabase thì phát được, không cần máy cài giọng
 * tiếng Trung — đó chính là điều mà phương án audio nhắm tới.
 */
export function getAudioStatus(lang: AudioLang = 'zh'): AudioStatus {
  // Tiếng Việt chỉ có hai nguồn: file thu sẵn của khoá tiếng Việt, và giọng của máy.
  if (lang === 'vi') {
    if (hasVietnameseAudio() || findDeviceVoice('vi')) return 'ready'
    return synth() ? 'no-vietnamese-voice' : 'unsupported'
  }
  if (hasRecordedAudio() || hasSupabase()) return 'ready'
  if (findChineseVoice()) return 'ready'
  if (synth()) return 'no-chinese-voice'
  return 'unsupported'
}

/**
 * Theo dõi danh sách giọng đọc.
 *
 * Chrome và Edge nạp danh sách giọng bất đồng bộ: lần `getVoices()` đầu tiên
 * thường trả về mảng rỗng. Vừa nghe sự kiện `voiceschanged` vừa hỏi lại vài
 * lần để giao diện cập nhật khi danh sách về tới nơi.
 *
 * @returns hàm huỷ theo dõi.
 */
export function subscribeAudioStatus(
  onChange: (status: AudioStatus) => void,
  lang: AudioLang = 'zh',
): () => void {
  const speech = synth()
  if (!speech) return () => {}

  let stopped = false
  let last = getAudioStatus(lang)

  const check = () => {
    if (stopped) return
    const next = getAudioStatus(lang)
    if (next !== last) {
      last = next
      onChange(next)
    }
  }

  speech.addEventListener?.('voiceschanged', check)
  // Một số bản Safari không bắn `voiceschanged`, nên hỏi lại trong ~3 giây đầu.
  const timers = [100, 300, 700, 1500, 3000].map((delay) => setTimeout(check, delay))
  speech.getVoices()

  return () => {
    stopped = true
    speech.removeEventListener?.('voiceschanged', check)
    timers.forEach(clearTimeout)
  }
}

/**
 * Một câu mẫu dài nhất đọc chậm cũng chỉ cỡ 4–5 giây; quá mốc này coi như
 * trình duyệt đã nuốt câu.
 */
const MAX_UTTERANCE_MS = 10_000

/** Audio đang phát, giữ lại để lần bấm sau cắt ngang được lần trước. */
let current: HTMLAudioElement | null = null

/** Dừng mọi âm thanh đang phát. */
export function stopPlayback(): void {
  if (current) {
    current.pause()
    current = null
  }
  synth()?.cancel()
}

function playFile(url: string): Promise<PlayResult> {
  return new Promise((resolve) => {
    const audio = new Audio(url)
    current = audio
    audio.addEventListener('ended', () => resolve('played'), { once: true })
    audio.addEventListener('error', () => resolve('error'), { once: true })
    audio.play().catch(() => resolve('error'))
  })
}

function playVoice(text: string, voice: SpeechSynthesisVoice, rate = 0.85): Promise<PlayResult> {
  const speech = synth()
  if (!speech) return Promise.resolve('unsupported')

  return new Promise((resolve) => {
    // Nút phát âm không được phép kẹt ở trạng thái "đang đọc": Chrome thỉnh
    // thoảng nuốt luôn sự kiện `end`, nên luôn có một mốc thời gian chốt lại.
    let done = false
    const finish = (result: PlayResult) => {
      if (done) return
      done = true
      clearTimeout(guard)
      resolve(result)
    }
    const guard = setTimeout(() => finish('error'), MAX_UTTERANCE_MS)

    try {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.voice = voice
      utterance.lang = voice.lang
      // Tiếng Trung đọc chậm hơn bình thường một chút để người mới nghe kịp từng âm tiết.
      utterance.rate = rate
      utterance.onend = () => finish('played')
      utterance.onerror = () => finish('error')

      // Chrome bỏ rơi câu mới nếu `speak` được gọi ngay sau `cancel`, nên nhường
      // một nhịp event loop trước khi đọc.
      speech.cancel()
      setTimeout(() => {
        try {
          speech.speak(utterance)
        } catch {
          finish('error')
        }
      }, 0)
    } catch {
      finish('error')
    }
  })
}

/**
 * Phát âm một từ hoặc cả một câu, thử lần lượt bốn nguồn ở đầu file.
 *
 * @param input.text chuỗi tiếng Trung — dùng cho ba nguồn sau nếu không có file.
 * @param input.wordId id của từ, để tìm file thu sẵn của từ đó.
 * @param input.clipUrl file thu sẵn cho đúng chuỗi này, ví dụ audio một câu mẫu.
 * Có thì dùng trước `wordId`.
 * @param input.onStage được gọi mỗi khi đổi chặng, để nút phân biệt "đang tải"
 * với "đang đọc".
 * @returns kết quả để giao diện biết nên hiện gì — không bao giờ ném lỗi.
 */
export async function playWord(input: {
  text: string
  wordId?: string
  clipUrl?: string | null
  onStage?: (stage: PlayStage) => void
}): Promise<PlayResult> {
  stopPlayback()
  const stage = input.onStage ?? (() => {})

  // 1. File thu sẵn: nhanh nhất, chạy được cả khi mất mạng.
  const local = input.clipUrl ?? audioUrlForWord(input.wordId)
  if (local) {
    stage('speaking')
    const result = await playFile(local)
    if (result === 'played') return result
    // File hỏng hoặc trình duyệt chặn tự phát: vẫn còn ba cửa nữa.
  }

  // Tiếng Việt: Supabase và giọng tiếng Trung đều không đọc được, chỉ còn giọng
  // tiếng Việt của máy.
  if (isVietnameseText(input.text)) {
    if (!synth()) return 'unsupported'
    const voice = findDeviceVoice('vi')
    if (!voice) return 'no-vietnamese-voice'
    stage('speaking')
    return playVoice(input.text, voice)
  }

  // 2 và 3. CDN Supabase, rồi Edge Function nếu CDN chưa có file.
  if (hasSupabase()) {
    stage('loading')
    const remote = await remoteAudioUrl(input.text)
    if (remote) {
      stage('speaking')
      const result = await playFile(remote)
      if (result === 'played') return result
    }
  }

  // 4. Giọng của hệ điều hành.
  const voice = findChineseVoice()
  if (voice) {
    stage('speaking')
    return playVoice(input.text, voice)
  }

  return synth() ? 'no-chinese-voice' : 'unsupported'
}

/** Ngôn ngữ đọc bằng giọng của máy — tiếng Việt và tiếng Anh ở màn Dịch. */
export type DeviceVoiceLang = 'vi' | 'en'

/** Thứ tự ưu tiên khi máy có nhiều giọng của cùng một thứ tiếng. */
const PREFERRED_DEVICE_LANGS: Record<DeviceVoiceLang, string[]> = {
  vi: ['vi-vn', 'vi'],
  en: ['en-us', 'en-gb', 'en'],
}

/** Giọng của máy cho một thứ tiếng, hoặc null nếu máy không có. */
export function findDeviceVoice(lang: DeviceVoiceLang): SpeechSynthesisVoice | null {
  const speech = synth()
  if (!speech) return null

  const langOf = (voice: SpeechSynthesisVoice) => voice.lang.toLowerCase().replace('_', '-')
  const matching = speech.getVoices().filter((voice) => langOf(voice) === lang || langOf(voice).startsWith(`${lang}-`))
  if (matching.length === 0) return null

  const preferred = PREFERRED_DEVICE_LANGS[lang]
  const rankOf = (voice: SpeechSynthesisVoice) => {
    const index = preferred.indexOf(langOf(voice))
    return index === -1 ? preferred.length : index
  }
  return [...matching].sort((a, b) => rankOf(a) - rankOf(b))[0]
}

/** Kết quả đọc một câu bằng giọng của máy. */
export type DeviceVoiceResult = 'played' | 'no-voice' | 'unsupported' | 'error'

/**
 * Đọc một câu tiếng Việt hay tiếng Anh — bản dịch ở màn Dịch.
 *
 * Hai thứ tiếng này không có file thu sẵn nào, nên chỉ có giọng của máy. Máy nào
 * cũng có giọng tiếng Anh; giọng tiếng Việt thì iPhone có sẵn, Android thường
 * có, máy tính Windows hay thiếu. Không có thì trả `no-voice` để giao diện nói
 * rõ, không im lặng.
 */
export async function speakWithDeviceVoice(text: string, lang: DeviceVoiceLang): Promise<DeviceVoiceResult> {
  stopPlayback()
  if (!synth()) return 'unsupported'
  const voice = findDeviceVoice(lang)
  if (!voice) return 'no-voice'
  const result = await playVoice(text, voice, 1)
  return result === 'played' ? 'played' : 'error'
}
