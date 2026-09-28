import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WORD_BY_ID } from '../data/hsk1'
import {
  GOOGLE_ENDPOINT,
  MAX_INPUT_LENGTH,
  TranslateError,
  clearTranslationCache,
  flip,
  flipTranslation,
  hasHanzi,
  lookupCourse,
  matchKey,
  parseGoogleResponse,
  translate,
  type Pair,
} from './translate'

const VI_ZH: Pair = { from: 'vi', to: 'zh' }
const ZH_VI: Pair = { from: 'zh', to: 'vi' }
const EN_ZH: Pair = { from: 'en', to: 'zh' }
const ZH_EN: Pair = { from: 'zh', to: 'en' }
const VI_EN: Pair = { from: 'vi', to: 'en' }

/** Câu trả lời thật của Google cho "tôi muốn đi ngân hàng", rút gọn phần không dùng. */
const GOOGLE_BANK = [
  [
    ['我想去银行', 'tôi muốn đi ngân hàng', null, null, 3],
    [null, null, 'Wǒ xiǎng qù yínháng'],
  ],
  null,
  'vi',
]

/** Câu trả lời thật của Google cho 你好 ở chiều Trung → Việt: pinyin đứng ở ô thứ tư. */
const GOOGLE_HELLO_VI = [[['Xin chào', '你好', null, null, 10], [null, null, null, 'Nǐ hǎo']], null, 'zh-CN']

/** Câu trả lời thật của Google cho 我想去银行 ở chiều Trung → Việt. */
const GOOGLE_BANK_VI = [
  [['Tôi muốn đến ngân hàng', '我想去银行', null, null, 3], [null, null, null, 'Wǒ xiǎng qù yínháng']],
  null,
  'zh-CN',
]

/** Câu trả lời thật của Google, thử ngày 2026-09-28, cho các cặp có tiếng Anh. */
const GOOGLE_EN_ZH = [[['你好吗？', 'hello, how are you?', null, null, 10], [null, null, 'Nǐ hǎo ma?']], null, 'en']
const GOOGLE_ZH_EN = [
  [['I want to go to the bank', '我想去银行', null, null, 3], [null, null, null, 'Wǒ xiǎng qù yínháng']],
  null,
  'zh-CN',
]
const GOOGLE_VI_EN = [[['I want to drink tea', 'tôi muốn uống trà', null, null, 3]], null, 'vi']

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

/** Google trả đúng câu này, và ghi lại địa chỉ đã gọi. */
function googleAnswers(body: unknown) {
  return vi.fn(async (_url: string) => jsonResponse(body)) as unknown as typeof fetch & {
    mock: { calls: Array<[string]> }
  }
}

/** Tham số của lần gọi Google thứ `index`. */
function calledWith(fetch: { mock: { calls: Array<[string]> } }, index = 0): URLSearchParams {
  return new URL(String(fetch.mock.calls[index][0])).searchParams
}

/** Lỗi `translate` ném ra, hoặc null nếu nó chạy êm. */
async function failure(promise: Promise<unknown>): Promise<string | null> {
  try {
    await promise
    return null
  } catch (error) {
    return error instanceof TranslateError ? error.reason : 'not-a-translate-error'
  }
}

beforeEach(() => clearTranslationCache())
afterEach(() => vi.unstubAllGlobals())

describe('matchKey', () => {
  it('không phân biệt hoa thường, dấu câu và khoảng trắng thừa', () => {
    expect(matchKey('  Bạn tên là gì ?? ')).toBe(matchKey('bạn tên là gì'))
    expect(matchKey('“Cảm ơn!”')).toBe(matchKey('cảm ơn'))
  })

  it('bỏ dấu kiểu cũ hay kiểu mới đều ra một: khoẻ = khỏe, hoà = hòa', () => {
    expect(matchKey('khoẻ')).toBe(matchKey('khỏe'))
    expect(matchKey('hoà bình')).toBe(matchKey('hòa bình'))
  })

  it('nhưng khác dấu thanh thì vẫn là hai từ khác nhau', () => {
    expect(matchKey('bạn')).not.toBe(matchKey('bán'))
    expect(matchKey('ban')).not.toBe(matchKey('bạn'))
  })
})

describe('tra khoá học, chiều Việt → Trung', () => {
  it('gõ đúng nghĩa của một từ thì ra từ đó, kèm pinyin và id để phát file thu sẵn', () => {
    const result = lookupCourse('Xin chào!', VI_ZH)!
    expect(result).toMatchObject({ from: 'vi', to: 'zh', source: 'course', original: 'Xin chào!', translated: '你好' })
    expect(result.chinese).toMatchObject({ hanzi: '你好', pinyin: 'nǐ hǎo' })
    expect(WORD_BY_ID[result.chinese!.wordId!].hanzi).toBe('你好')
  })

  it('từ có nhiều nghĩa thì gõ nghĩa nào cũng ra, kể cả kiểu bỏ dấu khác', () => {
    expect(lookupCourse('khỏe', VI_ZH)?.translated).toBe('好')
    expect(lookupCourse('tốt', VI_ZH)?.translated).toBe('好')
  })

  it('bỏ chú thích trong ngoặc: "cái" tra ra lượng từ 个', () => {
    expect(lookupCourse('cái', VI_ZH)?.translated).toBe('个')
  })

  it('một nghĩa ứng với nhiều từ thì đưa cả, không chọn thầm: "năm" là 五 mà cũng là 年', () => {
    const result = lookupCourse('năm', VI_ZH)!
    expect(result.translated).toBe('五')
    expect(result.alternatives?.map((entry) => entry.translated)).toEqual(['年'])
    // Nghĩa chỉ một từ mang thì không có danh sách thừa.
    expect(lookupCourse('cảm ơn', VI_ZH)?.alternatives).toBeUndefined()
  })

  it('gõ nguyên một câu mẫu thì ra câu đó, kèm nghĩa đúng như khoá học viết và file đọc cả câu', () => {
    const result = lookupCourse('bạn tên là gì', VI_ZH)!
    expect(result.translated).toBe('你叫什么名字？')
    expect(result.courseMeaning).toBe('Bạn tên là gì?')
    expect(result.chinese?.clipUrl).toBeTruthy()
  })

  it('không có trong khoá học thì trả null', () => {
    expect(lookupCourse('con mèo', VI_ZH)).toBeNull()
  })
})

describe('tra khoá học, chiều Trung → Việt', () => {
  it('gõ đúng chữ Hán của một từ thì ra nghĩa trong khoá học, kèm pinyin và file thu sẵn', () => {
    const result = lookupCourse('你好！', ZH_VI)!
    expect(result).toMatchObject({ from: 'zh', to: 'vi', source: 'course', translated: 'xin chào' })
    expect(result.chinese).toMatchObject({ hanzi: '你好', pinyin: 'nǐ hǎo' })
    expect(WORD_BY_ID[result.chinese!.wordId!].hanzi).toBe('你好')
  })

  it('gõ nguyên một câu mẫu, bỏ dấu câu cũng được, thì ra câu đó kèm file đọc cả câu', () => {
    const result = lookupCourse('你叫什么名字', ZH_VI)!
    expect(result.translated).toBe('Bạn tên là gì?')
    expect(result.chinese?.clipUrl).toBeTruthy()
  })
})

describe('khoá học chỉ có tiếng Việt và tiếng Trung', () => {
  it('cặp có tiếng Anh thì không tra khoá học', () => {
    expect(lookupCourse('hello', EN_ZH)).toBeNull()
    expect(lookupCourse('你好', ZH_EN)).toBeNull()
    expect(lookupCourse('xin chào', VI_EN)).toBeNull()
  })
})

describe('đọc câu trả lời của Google', () => {
  it('dịch sang tiếng Trung: lấy bản dịch và pinyin của bản dịch', () => {
    expect(parseGoogleResponse(GOOGLE_BANK)).toEqual({
      text: '我想去银行',
      targetRomanization: 'Wǒ xiǎng qù yínháng',
      sourceRomanization: null,
    })
  })

  it('dịch từ tiếng Trung: pinyin nằm ở phía câu gốc', () => {
    expect(parseGoogleResponse(GOOGLE_HELLO_VI)).toEqual({
      text: 'Xin chào',
      targetRomanization: null,
      sourceRomanization: 'Nǐ hǎo',
    })
  })

  it('nhiều câu thì nối các đoạn lại', () => {
    const data = [[['你叫什么名字？', 'bạn tên là gì?'], ['我叫兰。', 'tôi tên là Lan.'], [null, null, 'Nǐ jiào shénme míngzì? Wǒ jiào lán.']]]
    expect(parseGoogleResponse(data)).toEqual({
      text: '你叫什么名字？我叫兰。',
      targetRomanization: 'Nǐ jiào shénme míngzì? Wǒ jiào lán.',
      sourceRomanization: null,
    })
  })

  it('thiếu phiên âm thì vẫn có bản dịch; hỏng dạng thì trả null', () => {
    expect(parseGoogleResponse(GOOGLE_VI_EN)).toEqual({
      text: 'I want to drink tea',
      targetRomanization: null,
      sourceRomanization: null,
    })
    expect(parseGoogleResponse({ error: 'x' })).toBeNull()
    expect(parseGoogleResponse([[[null, null, 'Māo']]])).toBeNull()
  })
})

describe('translate', () => {
  it('có trong khoá học thì không gọi mạng', async () => {
    const fetch = vi.fn()
    const result = await translate('cảm ơn', { pair: VI_ZH, fetch })
    expect(result.translated).toBe('谢谢')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('không nói chiều thì mặc định Việt → Trung', async () => {
    expect((await translate('cảm ơn')).to).toBe('zh')
  })

  it('không có thì hỏi Google, đúng chiều Việt → Trung giản thể, xin cả pinyin', async () => {
    const fetch = googleAnswers(GOOGLE_BANK)
    const result = await translate('tôi muốn đi ngân hàng', { pair: VI_ZH, fetch })

    expect(result).toMatchObject({ source: 'google', original: 'tôi muốn đi ngân hàng', translated: '我想去银行' })
    expect(result.chinese).toMatchObject({ hanzi: '我想去银行', pinyin: 'Wǒ xiǎng qù yínháng' })
    const url = new URL(String(fetch.mock.calls[0][0]))
    expect(`${url.origin}${url.pathname}`).toBe(GOOGLE_ENDPOINT)
    const params = calledWith(fetch)
    expect(params.get('sl')).toBe('vi')
    expect(params.get('tl')).toBe('zh-CN')
    expect(params.getAll('dt')).toEqual(['t', 'rm'])
    expect(params.get('q')).toBe('tôi muốn đi ngân hàng')
  })

  it('Google dịch ra đúng chữ khoá học đã thu âm thì dùng luôn file thu sẵn', async () => {
    const fetch = googleAnswers([[['谢谢', 'cám ơn nha'], [null, null, 'Xièxiè']]])
    const result = await translate('cám ơn nha', { pair: VI_ZH, fetch })
    expect(result.source).toBe('google')
    expect(WORD_BY_ID[result.chinese!.wordId!].hanzi).toBe('谢谢')
  })

  it('dịch lại câu vừa dịch thì lấy bản đã có, không gọi mạng lần nữa', async () => {
    const fetch = googleAnswers(GOOGLE_BANK)
    await translate('tôi muốn đi ngân hàng', { pair: VI_ZH, fetch })
    await translate('Tôi muốn đi ngân hàng.', { pair: VI_ZH, fetch })
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('ô trống hay quá dài thì không gọi mạng, báo đúng lý do', async () => {
    const fetch = vi.fn()
    expect(await failure(translate('   ', { pair: VI_ZH, fetch }))).toBe('empty')
    expect(await failure(translate('a'.repeat(MAX_INPUT_LENGTH + 1), { pair: VI_ZH, fetch }))).toBe('too-long')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('mất mạng thì báo mất mạng, không gọi đi — nhưng từ trong khoá học vẫn tra được', async () => {
    vi.stubGlobal('navigator', { ...navigator, onLine: false })
    const fetch = vi.fn()
    expect(await failure(translate('con mèo', { pair: VI_ZH, fetch }))).toBe('offline')
    expect(fetch).not.toHaveBeenCalled()
    expect((await translate('xin chào', { pair: VI_ZH, fetch })).translated).toBe('你好')
  })

  it('Google chặn vì gọi dồn dập thì báo khác với lỗi thường', async () => {
    const blocked = vi.fn(async () => new Response('Sorry', { status: 429 }))
    const broken = vi.fn(async () => new Response('', { status: 500 }))
    expect(await failure(translate('con mèo', { pair: VI_ZH, fetch: blocked }))).toBe('blocked')
    expect(await failure(translate('con chó', { pair: VI_ZH, fetch: broken }))).toBe('failed')
  })

  it('mạng hỏng giữa chừng hay trả về thứ không đọc được thì báo lỗi, không treo', async () => {
    const reject = vi.fn(async () => Promise.reject(new TypeError('network')))
    const html = vi.fn(async () => new Response('<html>', { status: 200 }))
    const empty = vi.fn(async () => jsonResponse([[]]))
    expect(await failure(translate('con mèo', { pair: VI_ZH, fetch: reject }))).toBe('failed')
    expect(await failure(translate('con mèo', { pair: VI_ZH, fetch: html }))).toBe('failed')
    expect(await failure(translate('con mèo', { pair: VI_ZH, fetch: empty }))).toBe('failed')
  })
})

describe('translate chiều Trung → Việt', () => {
  it('hỏi Google đúng chiều, lấy nghĩa tiếng Việt và pinyin của câu tiếng Trung', async () => {
    const fetch = googleAnswers(GOOGLE_BANK_VI)
    const result = await translate('我想去银行', { pair: ZH_VI, fetch })

    expect(result).toMatchObject({ from: 'zh', to: 'vi', source: 'google', translated: 'Tôi muốn đến ngân hàng' })
    expect(result.chinese).toMatchObject({ hanzi: '我想去银行', pinyin: 'Wǒ xiǎng qù yínháng' })
    expect(calledWith(fetch).get('sl')).toBe('zh-CN')
    expect(calledWith(fetch).get('tl')).toBe('vi')
  })

  it('có trong khoá học thì không gọi mạng', async () => {
    const fetch = vi.fn()
    expect((await translate('谢谢', { pair: ZH_VI, fetch })).translated).toBe('cảm ơn')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('không có chữ Hán nào thì nhắc gõ chữ Hán, không gửi pinyin đi cho Google đoán bừa', async () => {
    const fetch = vi.fn()
    expect(await failure(translate('ni hao', { pair: ZH_VI, fetch }))).toBe('not-chinese')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('gõ chữ Hán mà đang dịch từ tiếng Việt hay tiếng Anh thì nhắc đổi ngôn ngữ', async () => {
    const fetch = vi.fn()
    expect(await failure(translate('我想喝茶', { pair: VI_ZH, fetch }))).toBe('looks-chinese')
    expect(await failure(translate('我想喝茶', { pair: EN_ZH, fetch }))).toBe('looks-chinese')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('bộ nhớ bản dịch tách theo chiều: cùng chữ ở hai chiều không lẫn vào nhau', async () => {
    const zh = googleAnswers(GOOGLE_BANK_VI)
    const viet = googleAnswers(GOOGLE_BANK)
    await translate('我想去银行', { pair: ZH_VI, fetch: zh })
    await translate('tôi muốn đi ngân hàng', { pair: VI_ZH, fetch: viet })
    await translate('我想去银行', { pair: ZH_VI, fetch: zh })
    expect(zh).toHaveBeenCalledOnce()
    expect(viet).toHaveBeenCalledOnce()
  })
})

describe('translate với tiếng Anh', () => {
  it('Anh → Trung: ra chữ Hán kèm pinyin, gửi Google đúng mã en → zh-CN', async () => {
    const fetch = googleAnswers(GOOGLE_EN_ZH)
    const result = await translate('hello, how are you?', { pair: EN_ZH, fetch })

    expect(result).toMatchObject({ from: 'en', to: 'zh', translated: '你好吗？' })
    expect(result.chinese).toMatchObject({ hanzi: '你好吗？', pinyin: 'Nǐ hǎo ma?' })
    expect(calledWith(fetch).get('sl')).toBe('en')
    expect(calledWith(fetch).get('tl')).toBe('zh-CN')
  })

  it('Anh → Trung ra đúng câu khoá học đã thu âm thì dùng luôn file thu sẵn', async () => {
    const fetch = googleAnswers([[['你好吗？', 'how are you?'], [null, null, 'Nǐ hǎo ma?']]])
    const result = await translate('how are you?', { pair: EN_ZH, fetch })
    expect(result.chinese?.clipUrl).toBeTruthy()
  })

  it('Trung → Anh: ra tiếng Anh, vẫn giữ chữ Hán và pinyin của câu gốc', async () => {
    const fetch = googleAnswers(GOOGLE_ZH_EN)
    const result = await translate('我想去银行', { pair: ZH_EN, fetch })

    expect(result).toMatchObject({ from: 'zh', to: 'en', translated: 'I want to go to the bank' })
    expect(result.chinese).toMatchObject({ hanzi: '我想去银行', pinyin: 'Wǒ xiǎng qù yínháng' })
    expect(calledWith(fetch).get('tl')).toBe('en')
  })

  it('Việt → Anh: không có tiếng Trung nên không có phía chữ Hán', async () => {
    const fetch = googleAnswers(GOOGLE_VI_EN)
    const result = await translate('tôi muốn uống trà', { pair: VI_EN, fetch })

    expect(result).toMatchObject({ from: 'vi', to: 'en', translated: 'I want to drink tea', chinese: null })
    expect(calledWith(fetch).get('sl')).toBe('vi')
    expect(calledWith(fetch).get('tl')).toBe('en')
  })

  it('hai bên cùng một ngôn ngữ thì không dịch', async () => {
    const fetch = vi.fn()
    expect(await failure(translate('hello', { pair: { from: 'en', to: 'en' }, fetch }))).toBe('failed')
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('hasHanzi, flip, flipTranslation', () => {
  it('nhận ra chữ Hán, kể cả lẫn giữa chữ Latin', () => {
    expect(hasHanzi('tôi thích 猫')).toBe(true)
    expect(hasHanzi('ni hao')).toBe(false)
  })

  it('đổi chiều qua lại', () => {
    expect(flip(VI_ZH)).toEqual(ZH_VI)
    expect(flip(ZH_EN)).toEqual({ from: 'en', to: 'zh' })
  })

  it('lật một bản dịch: câu gốc và bản dịch đổi chỗ, phía tiếng Trung giữ nguyên', () => {
    const result = lookupCourse('năm', VI_ZH)!
    const flipped = flipTranslation(result)

    expect(flipped).toMatchObject({ from: 'zh', to: 'vi', original: '五', translated: 'năm' })
    expect(flipped.chinese).toEqual(result.chinese)
    expect(flipped.alternatives).toBeUndefined()
  })
})
