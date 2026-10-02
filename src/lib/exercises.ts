import type {
  Choice,
  ChoiceExercise,
  DictationExercise,
  Exercise,
  MatchingExercise,
  SentenceExercise,
  LearnTrack,
  ToneExercise,
  Word,
} from '../types'
import { EXTRA_LEXICON, tokenizeChinese } from './chinese'
import { matchesPinyin } from './pinyin'
import {
  isSingleToned,
  splitSyllables,
  stripTone,
  toneOf,
  tonedSyllableIndex,
  wordToneVariants,
} from './tones'
import { toneVariants, vietnameseSyllables } from './vietnamese'

/**
 * Bộ sinh số giả ngẫu nhiên có seed (mulberry32).
 * Dùng seed để bài tập sinh ra ổn định và kiểm thử được, thay vì Math.random.
 */
export function createRng(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Biến một chuỗi thành seed số (FNV-1a).
 * Nhờ vậy mỗi lesson luôn sinh ra đúng một bộ câu hỏi, lần học lại vẫn như cũ.
 */
export function seedFromText(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** Trộn mảng, không làm thay đổi mảng gốc (Fisher–Yates). */
export function shuffle<T>(items: readonly T[], rng: () => number): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * Chọn `count` từ nhiễu khác với `word`.
 * Loại bỏ những từ trùng đáp án hiển thị để không có hai lựa chọn giống hệt nhau.
 */
function pickDistractors(
  word: Word,
  pool: readonly Word[],
  count: number,
  label: (word: Word) => string,
  rng: () => number,
): Word[] {
  const answer = label(word)
  const seen = new Set([answer])
  const candidates = shuffle(pool, rng).filter((candidate) => {
    if (candidate.id === word.id) return false
    const value = label(candidate)
    if (seen.has(value)) return false
    seen.add(value)
    return true
  })
  return candidates.slice(0, count)
}

function buildChoiceExercise(
  word: Word,
  pool: readonly Word[],
  kind: ChoiceExercise['kind'],
  prompt: string,
  label: (word: Word) => string,
  rng: () => number,
): ChoiceExercise {
  const distractors = pickDistractors(word, pool, 3, label, rng)
  const correctChoiceId = `c-${word.id}`
  const choices: Choice[] = shuffle(
    [
      { id: correctChoiceId, label: label(word) },
      ...distractors.map((item) => ({ id: `c-${item.id}`, label: label(item) })),
    ],
    rng,
  )

  return { id: `${kind}-${word.id}`, kind, wordId: word.id, prompt, choices, correctChoiceId }
}

/** Bài ghép Hanzi với nghĩa, mặc định 4 cặp. */
export function buildMatchingExercise(
  words: readonly Word[],
  rng: () => number,
  pairs = 4,
  prompt = 'Ghép chữ Hán với nghĩa đúng',
): MatchingExercise | null {
  const chosen = shuffle(words, rng).slice(0, Math.min(pairs, words.length))
  if (chosen.length < 2) return null

  const left: Choice[] = chosen.map((word) => ({ id: `l-${word.id}`, label: word.hanzi }))
  const right: Choice[] = shuffle(
    chosen.map((word) => ({ id: `r-${word.id}`, label: word.meaning })),
    rng,
  )
  const answerKey = Object.fromEntries(chosen.map((word) => [`l-${word.id}`, `r-${word.id}`]))

  return { id: 'matching', kind: 'matching', prompt, left, right, answerKey }
}

/** Câu ngắn hơn thế này thì ghép chẳng có gì để nghĩ; dài hơn thì quá sức người mới. */
export const SENTENCE_MIN_TILES = 3
export const SENTENCE_MAX_TILES = 7

/** Số mảnh nhiễu trộn vào bài ghép câu, để không thể bấm bừa theo thứ tự còn lại. */
export const SENTENCE_DISTRACTORS = 2

/**
 * Bài ghép câu từ câu mẫu của một từ.
 *
 * Lấy câu mẫu **đầu tiên vừa sức**: câu chính thường là câu hay nhất, nhưng
 * `请坐。` chỉ có hai mảnh, không có gì để nghĩ — khi đó dùng câu kế tiếp.
 * Không câu nào vừa sức thì trả `null`, và nơi gọi thay bằng dạng bài khác.
 *
 * Mảnh nhiễu là những từ khác trong khoá, không trùng chữ nào với câu đúng: một
 * mảnh nhiễu trùng chữ với đáp án sẽ làm câu có hai cách ghép đều đúng.
 */
export function buildSentenceExercise(
  word: Word,
  pool: readonly Word[],
  lexicon: readonly string[],
  rng: () => number,
): SentenceExercise | null {
  const fits = (pieces: string[]) =>
    pieces.length >= SENTENCE_MIN_TILES && pieces.length <= SENTENCE_MAX_TILES
  const chosen = word.examples
    .map((sentence) => ({ sentence, pieces: tokenizeChinese(sentence.hanzi, lexicon) }))
    .find(({ pieces }) => fits(pieces))
  if (!chosen) return null

  const { sentence, pieces } = chosen

  const inAnswer = new Set(pieces)
  const answerChars = new Set(pieces.join(''))
  const distractors = shuffle(pool, rng)
    .map((item) => item.hanzi)
    .filter((hanzi, index, all) => all.indexOf(hanzi) === index)
    .filter((hanzi) => !inAnswer.has(hanzi) && ![...hanzi].some((char) => answerChars.has(char)))
    .slice(0, SENTENCE_DISTRACTORS)

  // Id theo vị trí chứ không theo chữ: một câu có thể có hai mảnh giống hệt
  // nhau, ví dụ hai chữ 我, và người học phải bấm được cả hai.
  const tiles: Choice[] = shuffle(
    [...pieces, ...distractors].map((label, index) => ({ id: `t${index}`, label })),
    rng,
  )

  return {
    id: `sentence-${word.id}`,
    kind: 'sentence',
    wordId: word.id,
    prompt: 'Sắp xếp thành câu đúng',
    meaning: sentence.meaning,
    sentence,
    answer: pieces.join(''),
    pieces,
    tiles,
  }
}

/** Bài nghe một từ rồi viết lại bằng pinyin. */
export function buildDictationExercise(word: Word): DictationExercise {
  return {
    id: `dictation-${word.id}`,
    kind: 'dictation',
    wordId: word.id,
    prompt: 'Nghe rồi viết lại bằng pinyin',
    answer: word.pinyin,
    meaning: word.meaning,
    hanzi: word.hanzi,
  }
}

/**
 * Bài chọn thanh điệu, từ một từ **một âm tiết** có thanh rõ ràng.
 *
 * Từ nhiều âm tiết không hỏi kiểu này được: "thanh của 你好 là gì" không có câu
 * trả lời duy nhất. Những từ đó đã có `buildTonePairExercise` lo.
 *
 * Trả `null` khi từ không đủ điều kiện, để nơi gọi chọn từ khác.
 */
export function buildToneExercise(word: Word): ToneExercise | null {
  if (!isSingleToned(word.pinyin)) return null

  const syllable = splitSyllables(word.pinyin)[0]
  return {
    id: `tone-${word.id}`,
    kind: 'tone',
    wordId: word.id,
    prompt: 'Từ bạn vừa nghe mang thanh nào?',
    syllable: stripTone(syllable),
    tone: toneOf(syllable),
    hanzi: word.hanzi,
    meaning: word.meaning,
  }
}

/**
 * Bài phân biệt thanh: bốn cách đọc của **cùng một từ**, chỉ lệch nhau đúng
 * cái thanh của một âm tiết.
 *
 * Khác hẳn bài `pinyin` sẵn có, nơi ba phương án nhiễu lấy từ những từ khác —
 * `nǐ` đứng cạnh `shǎo`, `qī`, `wǒ` thì đoán được bằng phụ âm, tai không cần
 * làm gì. Ở đây `nī / ní / nǐ / nì` chỉ còn mỗi cao độ để mà phân biệt.
 *
 * Trả `null` khi cả từ đều là thanh nhẹ, tức không có gì để phân biệt.
 */
export function buildTonePairExercise(word: Word): ChoiceExercise | null {
  const index = tonedSyllableIndex(word.pinyin)
  if (index === -1) return null

  const variants = wordToneVariants(word.pinyin, index)
  const correctTone = toneOf(splitSyllables(word.pinyin)[index])

  // Không trộn: bốn phương án cố tình xếp theo thứ tự thanh 1 → 4, để người
  // học đọc được bảng thanh điệu chứ không chỉ dò tìm chữ khớp.
  const choices: Choice[] = variants.map((label, position) => ({
    id: `c-tone-${position + 1}`,
    label,
  }))

  return {
    id: `tone-pair-${word.id}`,
    kind: 'tone-pair',
    wordId: word.id,
    prompt: 'Nghe rồi chọn cách đọc đúng',
    choices,
    correctChoiceId: `c-tone-${correctTone}`,
  }
}

/**
 * Bài ghép câu tiếng Việt: mỗi âm tiết một mảnh, đề bài là nghĩa tiếng Trung.
 *
 * Tiếng Việt viết sẵn khoảng trắng giữa các âm tiết nên không cần bộ tách từ
 * như chữ Hán. Mảnh nhiễu là âm tiết của những từ khác, không trùng âm tiết nào
 * của câu đúng (không kể hoa thường) — trùng thì câu có hai cách ghép đều đúng.
 */
export function buildVietnameseSentenceExercise(
  word: Word,
  pool: readonly Word[],
  rng: () => number,
): SentenceExercise | null {
  const chosen = word.examples
    .map((sentence) => ({ sentence, pieces: vietnameseSyllables(sentence.hanzi) }))
    .find(({ pieces }) => pieces.length >= SENTENCE_MIN_TILES && pieces.length <= SENTENCE_MAX_TILES)
  if (!chosen) return null

  const { sentence, pieces } = chosen
  const inAnswer = new Set(pieces.map((piece) => piece.toLowerCase()))
  const distractors = shuffle(
    [...new Set(pool.flatMap((item) => vietnameseSyllables(item.hanzi.toLowerCase())))],
    rng,
  )
    .filter((syllable) => !inAnswer.has(syllable))
    .slice(0, SENTENCE_DISTRACTORS)

  const tiles: Choice[] = shuffle(
    [...pieces, ...distractors].map((label, index) => ({ id: `t${index}`, label })),
    rng,
  )

  return {
    id: `sentence-${word.id}`,
    kind: 'sentence',
    wordId: word.id,
    prompt: '把词语排成正确的句子',
    meaning: sentence.meaning,
    sentence,
    answer: pieces.join(''),
    pieces,
    tiles,
  }
}

/**
 * Bài phân biệt thanh tiếng Việt: nghe một từ, chọn trong sáu cách viết chỉ
 * lệch nhau đúng cái thanh — `chao / chào / cháo / chảo / chão / chạo`.
 *
 * Sáu thanh là chỗ người Trung khó nhất khi học tiếng Việt: hỏi và ngã, sắc và
 * nặng nghe rất gần nhau với tai quen bốn thanh. Trả `null` khi từ không có âm
 * tiết nào mang dấu.
 */
export function buildVietnameseTonePairExercise(word: Word): ChoiceExercise | null {
  const result = toneVariants(word.hanzi)
  if (!result) return null

  return {
    id: `tone-pair-${word.id}`,
    kind: 'tone-pair',
    wordId: word.id,
    prompt: '听一听，选出正确的声调',
    choices: result.variants.map((label, position) => ({ id: `c-tone-${position}`, label })),
    correctChoiceId: `c-tone-${result.correct}`,
  }
}

/** Các dạng bài xoay vòng theo từng từ của bài học. */
const ROTATION = ['multiple-choice', 'pinyin', 'listening', 'sentence', 'dictation'] as const

/**
 * Khoá tiếng Việt bỏ bài chọn pinyin: chữ Quốc ngữ đã ghi cách đọc, không có
 * phiên âm nào để chọn.
 */
const VI_ROTATION = ['multiple-choice', 'listening', 'sentence', 'dictation'] as const

/**
 * Sinh bộ bài tập cho một lesson: mỗi từ một câu, xoay vòng qua năm dạng, rồi
 * khép lại bằng hai bài luyện thanh và một bài ghép nối.
 *
 * Từ nào không có câu mẫu vừa sức để ghép thì được hỏi bằng trắc nghiệm thay vào.
 *
 * `pool` là kho từ để lấy đáp án nhiễu — thường là toàn bộ từ vựng của khoá học.
 */
export function buildExercises(
  words: readonly Word[],
  pool: readonly Word[],
  rng: () => number = createRng(1),
  track: LearnTrack = 'zh',
): Exercise[] {
  if (words.length === 0) return []
  if (track === 'vi') return buildVietnameseExercises(words, pool, rng)

  const distractorPool = pool.length >= 4 ? pool : words
  const lexicon = [...pool.map((word) => word.hanzi), ...EXTRA_LEXICON]

  const multipleChoice = (word: Word) =>
    buildChoiceExercise(
      word,
      distractorPool,
      'multiple-choice',
      `"${word.hanzi}" nghĩa là gì?`,
      (item) => item.meaning,
      rng,
    )

  const exercises: Exercise[] = words.map((word, index) => {
    const kind = ROTATION[index % ROTATION.length]
    switch (kind) {
      case 'sentence':
        return buildSentenceExercise(word, distractorPool, lexicon, rng) ?? multipleChoice(word)
      case 'dictation':
        return buildDictationExercise(word)
      case 'multiple-choice':
        return buildChoiceExercise(
          word,
          distractorPool,
          kind,
          `"${word.hanzi}" nghĩa là gì?`,
          (item) => item.meaning,
          rng,
        )
      case 'pinyin':
        return buildChoiceExercise(
          word,
          distractorPool,
          kind,
          `Pinyin của "${word.hanzi}" là gì?`,
          (item) => item.pinyin,
          rng,
        )
      case 'listening':
        return buildChoiceExercise(
          word,
          distractorPool,
          kind,
          'Nghe và chọn từ bạn vừa nghe',
          (item) => item.hanzi,
          rng,
        )
    }
  })

  const matching = buildMatchingExercise(words, rng)
  return [...exercises, ...buildToneDrills(words, rng), ...(matching ? [matching] : [])]
}

/**
 * Bộ bài tập của khoá tiếng Việt, đề bài bằng tiếng Trung.
 *
 * Cùng khung với khoá tiếng Trung: mỗi từ một câu xoay vòng, rồi hai bài phân
 * biệt thanh và một bài ghép nối. Nghe–viết dùng chung `gradeDictation`: gõ
 * không dấu vẫn được tính đúng, vì bàn phím Trung không gõ sẵn được ả hay ữ.
 */
function buildVietnameseExercises(
  words: readonly Word[],
  pool: readonly Word[],
  rng: () => number,
): Exercise[] {
  const distractorPool = pool.length >= 4 ? pool : words

  const multipleChoice = (word: Word) =>
    buildChoiceExercise(word, distractorPool, 'multiple-choice', `“${word.hanzi}”是什么意思？`, (item) => item.meaning, rng)

  const exercises: Exercise[] = words.map((word, index) => {
    switch (VI_ROTATION[index % VI_ROTATION.length]) {
      case 'sentence':
        return buildVietnameseSentenceExercise(word, distractorPool, rng) ?? multipleChoice(word)
      case 'dictation':
        // Đáp án là chính chữ tiếng Việt — khoá này không có pinyin.
        return { ...buildDictationExercise(word), answer: word.hanzi, prompt: '听写：写出你听到的越南语' }
      case 'listening':
        return buildChoiceExercise(word, distractorPool, 'listening', '听一听，选出你听到的词', (item) => item.hanzi, rng)
      default:
        return multipleChoice(word)
    }
  })

  // Hai bài phân biệt thanh rơi vào hai từ khác nhau, như khoá tiếng Trung.
  const drills = shuffle(words, rng)
    .map(buildVietnameseTonePairExercise)
    .filter((exercise): exercise is ChoiceExercise => exercise !== null)
    .slice(0, 2)

  const matching = buildMatchingExercise(words, rng, 4, '把越南语和中文意思配对')
  return [...exercises, ...drills, ...(matching ? [matching] : [])]
}

/**
 * Hai bài luyện thanh, chốt lại phần bài tập của mỗi lesson.
 *
 * Cố tình **không** nhét vào vòng xoay theo từng từ: vòng xoay đã có năm dạng
 * và mỗi lesson chỉ sáu từ, nên thêm vào đó thì có lesson được luyện thanh, có
 * lesson không. Thanh điệu quan trọng tới mức không được phép rơi vào may rủi,
 * nên nó là phần cố định của mọi bài.
 *
 * Hai bài cố ý rơi vào hai từ khác nhau, và bài phân biệt thanh ưu tiên từ
 * nhiều âm tiết, để hai bài không hỏi đúng một thứ hai lần.
 */
export function buildToneDrills(words: readonly Word[], rng: () => number): Exercise[] {
  if (words.length === 0) return []

  const shuffled = shuffle(words, rng)
  const drills: Exercise[] = []

  // Bài chọn thanh cần từ một âm tiết. Lesson nào không có thì bỏ qua bài này,
  // bài phân biệt thanh phía dưới vẫn chạy.
  const toneWord = shuffled.find((word) => isSingleToned(word.pinyin))
  const tone = toneWord ? buildToneExercise(toneWord) : null
  if (tone) drills.push(tone)

  const rest = shuffled.filter((word) => word.id !== toneWord?.id)
  const pairWord =
    rest.find((word) => splitSyllables(word.pinyin).length > 1) ?? rest[0] ?? shuffled[0]
  const pair = buildTonePairExercise(pairWord)
  if (pair) drills.push(pair)

  return drills
}

/** Bài chọn một đáp án: trắc nghiệm nghĩa, chọn pinyin, nghe rồi chọn, phân biệt thanh. */
export function isChoiceExercise(exercise: Exercise): exercise is ChoiceExercise {
  return (
    exercise.kind === 'multiple-choice' ||
    exercise.kind === 'pinyin' ||
    exercise.kind === 'listening' ||
    exercise.kind === 'tone-pair'
  )
}

/** Chấm một bài chọn đáp án. */
export function gradeChoice(exercise: ChoiceExercise, choiceId: string): boolean {
  return exercise.correctChoiceId === choiceId
}

/** Chấm một bài ghép nối: đúng khi mọi cặp đều khớp. */
export function gradeMatching(
  exercise: MatchingExercise,
  answers: Record<string, string>,
): boolean {
  const keys = Object.keys(exercise.answerKey)
  return keys.every((leftId) => answers[leftId] === exercise.answerKey[leftId])
}

/**
 * Chấm bài ghép câu: đúng khi các mảnh ghép lại ra đúng câu.
 *
 * So theo chữ chứ không theo id, vì câu có thể có hai mảnh giống hệt nhau —
 * bấm chữ 我 thứ nhất hay thứ hai trước thì câu vẫn là một.
 */
export function gradeSentence(exercise: SentenceExercise, pickedIds: readonly string[]): boolean {
  const labelOf = new Map(exercise.tiles.map((tile) => [tile.id, tile.label]))
  return pickedIds.map((id) => labelOf.get(id) ?? '').join('') === exercise.answer
}

/** Chấm bài nghe–viết. Không bắt gõ dấu thanh — xem `src/lib/pinyin.ts`. */
export function gradeDictation(exercise: DictationExercise, input: string): boolean {
  return matchesPinyin(input, exercise.answer)
}

/** Chấm bài chọn thanh. `picked` là 0 khi người học chưa chọn gì. */
export function gradeTone(exercise: ToneExercise, picked: number): boolean {
  return picked === exercise.tone
}

/** Nhãn tiếng Trung của từng dạng bài tập, cho người Trung học tiếng Việt. */
export const KIND_LABEL_ZH: Record<Exercise['kind'], string> = {
  'multiple-choice': '选择题',
  pinyin: '拼音',
  listening: '听力',
  matching: '配对',
  sentence: '排句子',
  dictation: '听写',
  tone: '声调',
  'tone-pair': '辨别声调',
}

/** Nhãn tiếng Việt của từng dạng bài tập, dùng cho tiêu đề màn hình. */
export const KIND_LABEL: Record<Exercise['kind'], string> = {
  'multiple-choice': 'Trắc nghiệm',
  pinyin: 'Pinyin',
  listening: 'Nghe',
  matching: 'Ghép nối',
  sentence: 'Ghép câu',
  dictation: 'Nghe và viết',
  tone: 'Thanh điệu',
  'tone-pair': 'Phân biệt thanh',
}
