import { describe, expect, it } from 'vitest'
import manifest from '../assets/audio/manifest.json'
import viManifest from '../assets/audio/vi/manifest.json'
import { WORDS, WORD_BY_ID } from '../data/hsk1'
import { VI_WORDS, VI_WORD_BY_ID } from '../data/vi1'
import {
  AUDIO_FILE_URLS,
  SENTENCE_AUDIO_URLS,
  VI_AUDIO_FILE_URLS,
  VI_SENTENCE_AUDIO_URLS,
  hasVietnameseAudio,
  audioUrlForSentence,
  audioUrlForWord,
  hasRecordedAudio,
} from './audioFiles'
import { sentenceAudioKey } from './sentences'
import { speechTokens } from './speechTokens'

/** Pinyin đánh số mà `npm run generate-audio` đã đưa cho máy đọc, theo tên file. */
const SPOKEN: Record<string, string> = manifest.clips

describe('audioFiles', () => {
  it('mọi file audio đều khớp với một từ có thật', () => {
    // Đặt sai tên file thì âm thanh im lặng mà không báo gì — test này bắt lỗi đó.
    const lạc = Object.keys(AUDIO_FILE_URLS).filter((id) => !WORD_BY_ID[id])
    expect(lạc).toEqual([])
  })

  it('mọi từ trong khoá học đều đã có file phát âm', () => {
    // Đây là lưới an toàn cho lúc thêm từ mới: quên chạy `npm run generate-audio`
    // thì nút loa của từ đó câm lặng trên bản deploy mà không ai hay.
    const thiếu = WORDS.filter((word) => !AUDIO_FILE_URLS[word.id]).map((word) => word.id)
    expect(thiếu).toEqual([])
  })

  it('file của mỗi từ được đọc từ đúng pinyin đang có trong dữ liệu', () => {
    // Sửa pinyin mà quên chạy lại `npm run generate-audio` thì file cũ vẫn nằm
    // đó và vẫn phát được — chỉ là đọc theo pinyin cũ, không ai nghe ra. Test
    // này so pinyin hiện tại với pinyin đã dùng lúc sinh file.
    const stale = WORDS.filter(
      (word) => SPOKEN[`${word.id}.mp3`] !== speechTokens(word.pinyin).join(' '),
    ).map((word) => word.id)
    expect(stale).toEqual([])
  })

  it('mọi file đều do script sinh ra, nên cùng một giọng đọc', () => {
    // Script ghi lại giọng trong manifest và sinh lại tất cả khi đổi giọng.
    // File thả tay vào thư mục thì không có trong manifest — dễ lẫn hai giọng.
    const unknown = Object.keys(AUDIO_FILE_URLS).filter((id) => !(`${id}.mp3` in SPOKEN))
    expect(unknown).toEqual([])
    expect(manifest.voice).toMatch(/^zh_CN-/)
  })

  it('có đủ audio nên máy nào cũng phát âm được', () => {
    expect(hasRecordedAudio()).toBe(true)
  })

  it('không có wordId thì không có file', () => {
    expect(audioUrlForWord(undefined)).toBeNull()
    expect(audioUrlForWord('')).toBeNull()
  })

  it('từ chưa thu audio thì trả về null', () => {
    expect(audioUrlForWord('khong-ton-tai')).toBeNull()
  })

  it('hasRecordedAudio phản ánh đúng số file đang có', () => {
    expect(hasRecordedAudio()).toBe(Object.keys(AUDIO_FILE_URLS).length > 0)
  })
})

describe('audio của câu mẫu', () => {
  const SENTENCES = WORDS.flatMap((word) => word.examples)

  it('câu mẫu nào cũng có file đọc cả câu', () => {
    // Thêm hay sửa câu mà quên `npm run generate-audio` thì nút loa của câu đó
    // phải nhờ giọng máy — trên điện thoại không cài giọng tiếng Trung là câm.
    const missing = SENTENCES.filter((sentence) => !audioUrlForSentence(sentence)).map(
      (sentence) => sentence.hanzi,
    )
    expect(missing).toEqual([])
  })

  it('không có file câu nào bị bỏ rơi', () => {
    // Tên file băm từ nội dung câu, nên sửa câu là sinh ra tên mới. File cũ còn
    // nằm lại thì vẫn bị đóng gói vào bản offline mà không ai phát tới.
    const keys = new Set(SENTENCES.map(sentenceAudioKey))
    const orphans = Object.keys(SENTENCE_AUDIO_URLS).filter((key) => !keys.has(key))
    expect(orphans).toEqual([])
  })

  it('file của mỗi câu được đọc từ đúng pinyin của câu đó', () => {
    const stale = SENTENCES.filter(
      (sentence) =>
        SPOKEN[`sentences/${sentenceAudioKey(sentence)}.mp3`] !==
        speechTokens(sentence.pinyin).join(' '),
    ).map((sentence) => sentence.hanzi)
    expect(stale).toEqual([])
  })

  it('file của câu khác file của từ, dù câu chỉ có đúng một chữ', () => {
    const [sentence] = WORD_BY_ID.ni.examples
    expect(audioUrlForSentence(sentence)).not.toBe(audioUrlForWord('ni'))
  })

  it('câu chưa có trong khoá học thì không có file', () => {
    expect(audioUrlForSentence({ hanzi: '我爱你。', pinyin: 'Wǒ ài nǐ.', meaning: '' })).toBeNull()
  })
})

describe('audio của khoá tiếng Việt', () => {
  const SPOKEN_VI: Record<string, string> = viManifest.clips
  const SENTENCES = VI_WORDS.flatMap((word) => word.examples)

  it('từ nào, câu mẫu nào cũng có file, và không có file nào thừa', () => {
    expect(VI_WORDS.filter((word) => !VI_AUDIO_FILE_URLS[word.id]).map((word) => word.id)).toEqual([])
    expect(Object.keys(VI_AUDIO_FILE_URLS).filter((id) => !VI_WORD_BY_ID[id])).toEqual([])
    expect(SENTENCES.filter((sentence) => !audioUrlForSentence(sentence)).map((s) => s.hanzi)).toEqual([])
    const keys = new Set(SENTENCES.map(sentenceAudioKey))
    expect(Object.keys(VI_SENTENCE_AUDIO_URLS).filter((key) => !keys.has(key))).toEqual([])
    expect(hasVietnameseAudio()).toBe(true)
  })

  it('file nào cũng được đọc từ đúng chữ đang có trong dữ liệu', () => {
    // Sửa chữ mà quên `npm run generate-audio-vi` thì file cũ vẫn phát, chỉ là đọc chữ cũ.
    expect(VI_WORDS.filter((word) => SPOKEN_VI[`vi/${word.id}.mp3`] !== word.hanzi).map((w) => w.id)).toEqual([])
    expect(
      SENTENCES.filter((s) => SPOKEN_VI[`vi/sentences/${sentenceAudioKey(s)}.mp3`] !== s.hanzi).map((s) => s.hanzi),
    ).toEqual([])
  })

  it('cùng một giọng nữ tiếng Việt, không lẫn với giọng tiếng Trung', () => {
    expect(viManifest.voice).toBe('vi_VN-vais1000-medium')
    expect(audioUrlForWord('vi-xinchao')).toBe(VI_AUDIO_FILE_URLS['vi-xinchao'])
    // Tên file câu của hai khoá băm cùng một cách: không được trùng nhau.
    expect(Object.keys(VI_SENTENCE_AUDIO_URLS).filter((key) => key in SENTENCE_AUDIO_URLS)).toEqual([])
  })
})
