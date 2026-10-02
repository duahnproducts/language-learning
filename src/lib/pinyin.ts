/**
 * So khớp pinyin do người học gõ vào.
 *
 * Bài nghe–viết không thể bắt gõ đúng dấu thanh: bàn phím thường không có ǎ
 * hay ǜ, và bắt học cách gõ chúng là dạy một thứ chẳng liên quan gì tới tiếng
 * Trung. Nên đáp án được chuẩn hoá về dạng không dấu, không khoảng trắng —
 * "nǐ hǎo", "ni hao", "NiHao" đều được tính đúng.
 *
 * Toàn bộ logic ở đây là hàm thuần để test trực tiếp, không cần dựng React.
 */

/** Dấu thanh nằm trong khoảng ký tự tổ hợp, tách ra được bằng NFD. */
const COMBINING_MARKS = /[̀-ͯ]/g

/**
 * Đưa một chuỗi pinyin về dạng so sánh được.
 *
 * `NFD` tách chữ cái khỏi dấu, nên ǎ thành a + dấu rồi bỏ dấu đi; ü cũng rụng
 * hai chấm thành u theo đúng cách đó. Sau đó v được coi như u, vì bàn phím
 * không gõ được ü nên người học quen gõ "nv" cho 女.
 */
export function normalizePinyin(text: string): string {
  return text
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .toLowerCase()
    // Bài nghe–viết của khoá tiếng Việt chấm qua đúng hàm này: đ không tách
    // được bằng NFD nên đổi tay, để "deu" và "đều" là một.
    .replace(/đ/g, 'd')
    .replace(/v/g, 'u')
    .replace(/[^a-z]/g, '')
}

/** Người học gõ đúng chưa. Bỏ qua dấu thanh, khoảng trắng và chữ hoa/thường. */
export function matchesPinyin(input: string, answer: string): boolean {
  const normalized = normalizePinyin(input)
  return normalized.length > 0 && normalized === normalizePinyin(answer)
}
