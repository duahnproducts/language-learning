/**
 * Dịch qua lại giữa tiếng Việt, tiếng Trung và tiếng Anh — xem `docs/translate.md`.
 *
 * Hai nguồn, thử lần lượt:
 *
 * 1. **Khoá học.** 60 từ và 180 câu mẫu, chỉ cho cặp Việt – Trung: tra theo nghĩa
 *    tiếng Việt (Việt → Trung) hoặc theo chữ Hán (Trung → Việt). Tra ngay trên
 *    máy, không cần mạng, pinyin do người soạn, audio thu sẵn bằng Piper.
 * 2. **Google Dịch**, qua đúng endpoint mà tiện ích từ điển của Chrome dùng. Trả
 *    cả bản dịch lẫn pinyin của phía tiếng Trung, và mở CORS nên gọi thẳng từ
 *    trình duyệt được — app không có máy chủ nào để đứng giữa.
 *
 * Endpoint đó không phải API chính thức: không cần khoá, không tốn tiền, nhưng
 * Google có thể đổi hay chặn bất cứ lúc nào. Mọi chỗ chạm tới nó nằm trong
 * `translateWithGoogle`, đổi nguồn thì chỉ sửa một hàm. Vì sao không dùng các
 * dịch vụ miễn phí khác: xem tài liệu.
 */

import { WORDS } from '../data/hsk1'
import { audioUrlForSentence } from './audioFiles'

/** Ba ngôn ngữ của màn Dịch. */
export type Lang = 'vi' | 'zh' | 'en'

export const LANGS: readonly Lang[] = ['vi', 'zh', 'en']

/** Một chiều dịch. `from` và `to` luôn khác nhau. */
export interface Pair {
  from: Lang
  to: Lang
}

export type TranslationSource = 'course' | 'google'

/** Phía tiếng Trung của một cặp câu: chữ Hán, pinyin, và file thu sẵn nếu có. */
export interface ChineseSide {
  hanzi: string
  /** Pinyin có dấu thanh; null khi nguồn không trả. */
  pinyin: string | null
  /** Id của từ, để phát file thu sẵn. */
  wordId?: string
  /** File thu sẵn cho đúng câu này. */
  clipUrl?: string | null
}

export interface Translation {
  from: Lang
  to: Lang
  source: TranslationSource
  /** Câu gốc, đúng như người học đưa vào. */
  original: string
  /** Bản dịch. */
  translated: string
  /**
   * Phía tiếng Trung của cặp — là câu gốc hay bản dịch tuỳ chiều — để giao diện
   * luôn hiện chữ Hán kèm pinyin và phát được tiếng Trung. Null khi cặp không có
   * tiếng Trung (Việt ⇄ Anh).
   */
  chinese: ChineseSide | null
  /** Nghĩa tiếng Việt đúng như khoá học viết — chỉ có khi tìm thấy trong khoá học. */
  courseMeaning?: string
  /**
   * Từ khác trong khoá học cũng mang đúng nghĩa đã gõ — "năm" là 五 mà cũng là
   * 年. Tiếng Việt nhập nhằng thì cho người học thấy hết, đừng chọn thầm một.
   */
  alternatives?: Translation[]
}

/** Lý do không dịch được. */
export type TranslateFailure =
  | 'empty'
  | 'too-long'
  /** Dịch từ tiếng Trung mà không có chữ Hán nào — gõ pinyin thì Google đọc không ra. */
  | 'not-chinese'
  /** Dịch từ tiếng Việt hay tiếng Anh mà lại gõ chữ Hán — nhiều khả năng quên đổi ngôn ngữ. */
  | 'looks-chinese'
  | 'offline'
  | 'blocked'
  | 'failed'

export class TranslateError extends Error {
  readonly reason: TranslateFailure

  constructor(reason: TranslateFailure) {
    super(reason)
    this.name = 'TranslateError'
    this.reason = reason
  }
}

/** Đủ cho một câu dài; ô nhập cũng chặn ở mốc này. */
export const MAX_INPUT_LENGTH = 200

/** Quá mốc này thì coi như mạng hỏng, đừng để người học chờ mãi. */
const TIMEOUT_MS = 8000

export const GOOGLE_ENDPOINT = 'https://clients5.google.com/translate_a/single'

/** Mã ngôn ngữ của Google. Tiếng Trung là giản thể. */
const GOOGLE_CODE: Record<Lang, string> = { vi: 'vi', zh: 'zh-CN', en: 'en' }

/** Có chữ Hán nào không. */
export function hasHanzi(text: string): boolean {
  return /\p{Script=Han}/u.test(text)
}

/** Chiều ngược lại. */
export function flip(pair: Pair): Pair {
  return { from: pair.to, to: pair.from }
}

/** Lật một bản dịch: bản dịch thành câu gốc và ngược lại — khỏi gọi mạng lần nữa. */
export function flipTranslation(translation: Translation): Translation {
  return {
    ...translation,
    from: translation.to,
    to: translation.from,
    original: translation.translated,
    translated: translation.original,
    alternatives: undefined,
  }
}

/** Năm dấu thanh tiếng Việt, ở dạng ký tự tổ hợp: huyền, sắc, ngã, hỏi, nặng. */
const TONE_MARKS = /[̣̀́̃̉]/g

/**
 * Khoá để so hai chuỗi tiếng Việt: không phân biệt hoa thường, dấu câu, dấu
 * ngoặc, và **chỗ đặt dấu thanh**.
 *
 * Tiếng Việt có hai lối bỏ dấu: khoá học viết "khoẻ", nhiều người gõ "khỏe".
 * Tách dấu thanh của từng tiếng ra rồi gắn về cuối tiếng thì hai lối thành
 * một, mà "bạn" với "bán" vẫn khác nhau.
 */
export function matchKey(text: string): string {
  return text
    .normalize('NFD')
    .toLowerCase()
    .replace(/[“”"‘’'«»()[\]]/g, ' ')
    .replace(/[.,!?;:…。，！？、~-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const tone = word.match(TONE_MARKS)?.[0] ?? ''
      return word.replace(TONE_MARKS, '') + tone
    })
    .join(' ')
}

/** Bỏ dấu câu và khoảng trắng, để "你好！" và "你好" là một. */
function hanziKey(text: string): string {
  return text.replace(/[\s\p{P}]/gu, '')
}

/** Các nghĩa của một từ: "tốt, khoẻ" → ["tốt", "khoẻ"]; bỏ chú thích trong ngoặc. */
function senses(meaning: string): string[] {
  return meaning
    .replace(/\([^)]*\)/g, '')
    .split(/[,;/]/)
    .map((sense) => sense.trim())
    .filter(Boolean)
}

/** Một mục của khoá học: một từ hay một câu mẫu. */
interface CourseItem extends ChineseSide {
  pinyin: string
  meaning: string
}

type CourseIndex = Map<string, CourseItem[]>
const courseIndexes: Partial<Record<'vi' | 'zh', CourseIndex>> = {}

/**
 * Bảng tra khoá học, dựng một lần khi cần tới: theo nghĩa tiếng Việt, hoặc theo
 * chữ Hán. Từ trước, câu sau: gõ đúng một từ thì ra đúng từ đó.
 */
function getCourseIndex(by: 'vi' | 'zh'): CourseIndex {
  const cached = courseIndexes[by]
  if (cached) return cached

  const index: CourseIndex = new Map()
  const add = (key: string, item: CourseItem) => {
    if (!key) return
    const items = index.get(key) ?? []
    if (!items.some((existing) => existing.hanzi === item.hanzi)) index.set(key, [...items, item])
  }

  for (const word of WORDS) {
    const item: CourseItem = { hanzi: word.hanzi, pinyin: word.pinyin, meaning: word.meaning, wordId: word.id }
    if (by === 'zh') {
      add(hanziKey(word.hanzi), item)
    } else {
      add(matchKey(word.meaning), item)
      for (const sense of senses(word.meaning)) add(matchKey(sense), item)
    }
  }
  for (const word of WORDS) {
    for (const sentence of word.examples) {
      const item: CourseItem = {
        hanzi: sentence.hanzi,
        pinyin: sentence.pinyin,
        meaning: sentence.meaning,
        clipUrl: audioUrlForSentence(sentence),
      }
      add(by === 'zh' ? hanziKey(sentence.hanzi) : matchKey(sentence.meaning), item)
    }
  }

  courseIndexes[by] = index
  return index
}

/** Khoá học chỉ có tiếng Việt và tiếng Trung. */
function isCoursePair(pair: Pair): boolean {
  return (pair.from === 'vi' && pair.to === 'zh') || (pair.from === 'zh' && pair.to === 'vi')
}

/**
 * Tìm trong khoá học; null nếu khoá học không có đúng chữ này, hoặc cặp ngôn ngữ
 * không phải Việt – Trung. Nhiều mục cùng khớp thì mục đứng trước trong khoá học
 * là bản chính, còn lại ở `alternatives`.
 */
export function lookupCourse(text: string, pair: Pair = { from: 'vi', to: 'zh' }): Translation | null {
  if (!isCoursePair(pair)) return null

  const key = pair.from === 'zh' ? hanziKey(text) : matchKey(text)
  const [first, ...rest] = getCourseIndex(pair.from === 'zh' ? 'zh' : 'vi').get(key) ?? []
  if (!first) return null

  const toTranslation = ({ meaning, ...chinese }: CourseItem): Translation => ({
    from: pair.from,
    to: pair.to,
    source: 'course',
    original: text,
    translated: pair.to === 'zh' ? chinese.hanzi : meaning,
    chinese,
    courseMeaning: meaning,
  })

  const main = toTranslation(first)
  return rest.length > 0 ? { ...main, alternatives: rest.map(toTranslation) } : main
}

let recordedIndex: Map<string, Pick<ChineseSide, 'wordId' | 'clipUrl'>> | null = null

/**
 * File thu sẵn cho một chuỗi chữ Hán, nếu khoá học có đúng chuỗi đó.
 *
 * Google dịch "xin chào" hay "hello" ra 你好 — đúng chữ đã có file Piper, nghe
 * hay hơn giọng đọc của máy nhiều.
 */
function recordedAudioFor(hanzi: string): Pick<ChineseSide, 'wordId' | 'clipUrl'> {
  if (!recordedIndex) {
    recordedIndex = new Map()
    for (const word of WORDS) {
      recordedIndex.set(hanziKey(word.hanzi), { wordId: word.id })
      for (const sentence of word.examples) {
        const key = hanziKey(sentence.hanzi)
        if (!recordedIndex.has(key)) recordedIndex.set(key, { clipUrl: audioUrlForSentence(sentence) })
      }
    }
  }
  return recordedIndex.get(hanziKey(hanzi)) ?? {}
}

/** Câu trả lời của Google, đã đọc ra. */
export interface GoogleAnswer {
  /** Bản dịch. */
  text: string
  /** Phiên âm của bản dịch — có khi dịch sang tiếng Trung. */
  targetRomanization: string | null
  /** Phiên âm của câu gốc — có khi câu gốc là tiếng Trung. */
  sourceRomanization: string | null
}

/**
 * Đọc câu trả lời của Google.
 *
 * Dạng `[[[bản dịch, câu gốc, …], …, [null, null, phiên âm bản dịch, phiên âm
 * câu gốc]], …]`: mỗi câu một đoạn, đoạn cuối mang phiên âm của cả hai phía.
 * Trả null nếu không có bản dịch.
 */
export function parseGoogleResponse(data: unknown): GoogleAnswer | null {
  if (!Array.isArray(data) || !Array.isArray(data[0])) return null

  let text = ''
  const target: string[] = []
  const source: string[] = []
  for (const segment of data[0]) {
    if (!Array.isArray(segment)) continue
    if (typeof segment[0] === 'string') {
      text += segment[0]
    } else if (segment[0] == null) {
      if (typeof segment[2] === 'string') target.push(segment[2])
      if (typeof segment[3] === 'string') source.push(segment[3])
    }
  }

  text = text.trim()
  if (!text) return null
  return {
    text,
    targetRomanization: target.join(' ').trim() || null,
    sourceRomanization: source.join(' ').trim() || null,
  }
}

/** Gọi Google Dịch. Chỗ duy nhất trong app chạm tới dịch vụ này. */
export async function translateWithGoogle(text: string, pair: Pair, fetchImpl: typeof fetch): Promise<GoogleAnswer> {
  const params = new URLSearchParams([
    ['client', 'dict-chrome-ex'],
    ['sl', GOOGLE_CODE[pair.from]],
    ['tl', GOOGLE_CODE[pair.to]],
    ['dt', 't'],
    ['dt', 'rm'],
    ['q', text],
  ])

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  let response: Response
  try {
    response = await fetchImpl(`${GOOGLE_ENDPOINT}?${params}`, { signal: controller.signal })
  } catch {
    throw new TranslateError(isOffline() ? 'offline' : 'failed')
  } finally {
    clearTimeout(timer)
  }

  // 429 và 403 là Google đang chặn vì gọi dồn dập — khác với hỏng hẳn.
  if (response.status === 429 || response.status === 403) throw new TranslateError('blocked')
  if (!response.ok) throw new TranslateError('failed')

  let data: unknown
  try {
    data = await response.json()
  } catch {
    throw new TranslateError('failed')
  }

  const parsed = parseGoogleResponse(data)
  if (!parsed) throw new TranslateError('failed')
  return parsed
}

function isOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

/** Bản dịch đã có trong lượt dùng này — dịch lại câu cũ thì khỏi gọi mạng. */
const cache = new Map<string, Translation>()
const CACHE_LIMIT = 100

/** Xoá bộ nhớ bản dịch — cho test. */
export function clearTranslationCache(): void {
  cache.clear()
}

/**
 * Dịch một chữ, một cụm hay một câu theo chiều đã chọn.
 *
 * @throws TranslateError kèm lý do để giao diện nói đúng chuyện gì xảy ra.
 */
export async function translate(
  input: string,
  options: { pair?: Pair; fetch?: typeof fetch } = {},
): Promise<Translation> {
  const pair = options.pair ?? { from: 'vi', to: 'zh' }
  if (pair.from === pair.to) throw new TranslateError('failed')

  const text = input.trim().replace(/\s+/g, ' ')
  if (!text) throw new TranslateError('empty')
  if (text.length > MAX_INPUT_LENGTH) throw new TranslateError('too-long')
  if (pair.from === 'zh' && !hasHanzi(text)) throw new TranslateError('not-chinese')
  if (pair.from !== 'zh' && hasHanzi(text)) throw new TranslateError('looks-chinese')

  const course = lookupCourse(text, pair)
  if (course) return course

  const key = `${pair.from}-${pair.to}:${matchKey(text)}`
  const cached = cache.get(key)
  if (cached) return cached

  if (isOffline()) throw new TranslateError('offline')

  const answer = await translateWithGoogle(text, pair, options.fetch ?? globalThis.fetch)
  const chinese: ChineseSide | null =
    pair.to === 'zh'
      ? { hanzi: answer.text, pinyin: answer.targetRomanization, ...recordedAudioFor(answer.text) }
      : pair.from === 'zh'
        ? { hanzi: text, pinyin: answer.sourceRomanization, ...recordedAudioFor(text) }
        : null

  const translation: Translation = {
    from: pair.from,
    to: pair.to,
    source: 'google',
    original: text,
    translated: answer.text,
    chinese,
  }

  if (cache.size >= CACHE_LIMIT) cache.delete(cache.keys().next().value!)
  cache.set(key, translation)
  return translation
}
