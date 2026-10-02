/**
 * Danh mục file audio thu sẵn đặt trong `src/assets/audio/`.
 *
 * - Từ: `<id của từ>.mp3`, ví dụ `nihao.mp3` cho `你好`.
 * - Câu mẫu: `sentences/<khoá>.mp3`, khoá băm từ chữ Hán và pinyin của câu —
 *   xem `sentenceAudioKey()`.
 * - Khoá tiếng Việt nằm riêng trong `vi/` theo đúng hai quy ước trên, do
 *   `npm run generate-audio-vi` sinh ra — xem `docs/languages.md`.
 *
 * Vite quét thư mục lúc build nên chỉ cần thả file vào là dùng được, không phải
 * khai báo thêm. File do `npm run generate-audio` sinh ra.
 */

import type { ExampleSentence } from '../types'
import { sentenceAudioKey } from './sentences'

const WORD_MODULES = import.meta.glob('../assets/audio/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const SENTENCE_MODULES = import.meta.glob('../assets/audio/sentences/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

/** Tên file bỏ đuôi `.mp3` → URL. */
function byName(modules: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(modules).map(([path, url]) => [
      path.slice(path.lastIndexOf('/') + 1).replace(/\.mp3$/, ''),
      url,
    ]),
  )
}

const VI_WORD_MODULES = import.meta.glob('../assets/audio/vi/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

const VI_SENTENCE_MODULES = import.meta.glob('../assets/audio/vi/sentences/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>

/** wordId -> URL file audio của khoá tiếng Trung. Rỗng khi chưa thu file nào. */
export const AUDIO_FILE_URLS: Record<string, string> = byName(WORD_MODULES)

/** Khoá của câu mẫu -> URL file audio đọc cả câu, khoá tiếng Trung. */
export const SENTENCE_AUDIO_URLS: Record<string, string> = byName(SENTENCE_MODULES)

/** Như hai bảng trên, cho khoá tiếng Việt. */
export const VI_AUDIO_FILE_URLS: Record<string, string> = byName(VI_WORD_MODULES)
export const VI_SENTENCE_AUDIO_URLS: Record<string, string> = byName(VI_SENTENCE_MODULES)

/** URL file audio của một từ, hoặc null nếu từ đó chưa có file thu sẵn. */
export function audioUrlForWord(wordId: string | undefined): string | null {
  if (!wordId) return null
  return AUDIO_FILE_URLS[wordId] ?? VI_AUDIO_FILE_URLS[wordId] ?? null
}

/** URL file audio đọc cả một câu mẫu, hoặc null nếu câu đó chưa có file. */
export function audioUrlForSentence(sentence: ExampleSentence): string | null {
  const key = sentenceAudioKey(sentence)
  return SENTENCE_AUDIO_URLS[key] ?? VI_SENTENCE_AUDIO_URLS[key] ?? null
}

/** Đã có ít nhất một file audio thu sẵn hay chưa. */
export function hasRecordedAudio(): boolean {
  return Object.keys(AUDIO_FILE_URLS).length > 0
}

/** Đã có file audio thu sẵn nào cho khoá tiếng Việt chưa. */
export function hasVietnameseAudio(): boolean {
  return Object.keys(VI_AUDIO_FILE_URLS).length > 0
}
