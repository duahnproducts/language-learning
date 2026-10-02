import type { Course, ExampleSentence, Word } from '../types'

/** Viết gọn một câu mẫu: câu tiếng Việt và nghĩa tiếng Trung. Chữ Quốc ngữ đã ghi cách đọc nên không có pinyin. */
function ex(text: string, meaning: string): ExampleSentence {
  return { hanzi: text, pinyin: '', meaning }
}

/** Viết gọn một từ. Id có tiền tố `vi-` để không bao giờ trùng id từ của HSK 1. */
function w(id: string, text: string, meaning: string, examples: ExampleSentence[]): Word {
  return { id: `vi-${id}`, hanzi: text, pinyin: '', meaning, examples }
}

/**
 * Từ vựng khoá tiếng Việt cho người Trung — cùng khung chủ đề với HSK 1 để hai
 * khoá đi song song: chào hỏi, giới thiệu, gia đình, số đếm, thời gian.
 *
 * Kiểu `Word` dùng chung với khoá tiếng Trung: `hanzi` chứa chữ tiếng Việt,
 * `meaning` là nghĩa tiếng Trung. Câu mẫu nào cũng chứa đúng từ đang học, để
 * tô được nó trong câu — `vi1.test.ts` chặn trước.
 */
export const VI_WORDS: Word[] = [
  // Unit 1 — 问候
  w('xinchao', 'xin chào', '你好', [
    ex('Xin chào, tôi là Lan.', '你好，我是阿兰。'),
    ex('Xin chào cô giáo!', '老师好！'),
    ex('Xin chào, rất vui được gặp bạn.', '你好，很高兴见到你。'),
  ]),
  w('ban', 'bạn', '你；朋友', [
    ex('Bạn tên là gì?', '你叫什么名字？'),
    ex('Bạn khỏe không?', '你好吗？'),
    ex('Bạn là học sinh à?', '你是学生吗？'),
  ]),
  w('toi', 'tôi', '我', [
    ex('Tôi là người Việt Nam.', '我是越南人。'),
    ex('Tôi yêu gia đình tôi.', '我爱我的家。'),
    ex('Tôi muốn uống trà.', '我想喝茶。'),
  ]),
  w('khoe', 'khỏe', '好；健康', [
    ex('Tôi rất khỏe.', '我很好。'),
    ex('Mẹ tôi vẫn khỏe.', '我妈妈身体还好。'),
    ex('Bạn có khỏe không?', '你身体好吗？'),
  ]),
  w('tambiet', 'tạm biệt', '再见', [
    ex('Tạm biệt thầy!', '老师再见！'),
    ex('Tạm biệt, mai gặp lại!', '再见，明天见！'),
    ex('Tạm biệt các bạn.', '同学们再见。'),
  ]),
  w('camon', 'cảm ơn', '谢谢', [
    ex('Cảm ơn bạn!', '谢谢你！'),
    ex('Cảm ơn thầy ạ!', '谢谢老师！'),
    ex('Cảm ơn, tôi rất khỏe.', '谢谢，我很好。'),
  ]),

  w('khongcogi', 'không có gì', '不客气', [
    ex('Không có gì, tạm biệt.', '不客气，再见。'),
    ex('Không có gì đâu.', '不客气。'),
    ex('Không có gì, mời bạn uống trà.', '不客气，请喝茶。'),
  ]),
  w('xinloi', 'xin lỗi', '对不起', [
    ex('Xin lỗi, tôi không biết.', '对不起，我不知道。'),
    ex('Xin lỗi, tôi đến muộn.', '对不起，我来晚了。'),
    ex('Xin lỗi bạn nhé.', '对不起啊。'),
  ]),
  w('khongsao', 'không sao', '没关系', [
    ex('Không sao, cảm ơn bạn.', '没关系，谢谢你。'),
    ex('Không sao đâu, mời ngồi.', '没关系，请坐。'),
    ex('Không sao, mai chúng ta đi.', '没关系，我们明天去。'),
  ]),
  w('moi', 'mời', '请', [
    ex('Mời bạn uống trà.', '请喝茶。'),
    ex('Mời ngồi.', '请坐。'),
    ex('Mời thầy vào nhà.', '老师，请进。'),
  ]),
  w('la', 'là', '是', [
    ex('Anh ấy là bạn tôi.', '他是我的朋友。'),
    ex('Cô ấy là mẹ tôi.', '她是我妈妈。'),
    ex('Đây là sách của tôi.', '这是我的书。'),
  ]),
  w('khong', 'không', '不', [
    ex('Tôi không biết.', '我不知道。'),
    ex('Tôi không uống cà phê.', '我不喝咖啡。'),
    ex('Hôm nay không lạnh.', '今天不冷。'),
  ]),

  // Unit 2 — 自我介绍
  w('ten', 'tên', '名字', [
    ex('Tôi tên là Minh.', '我叫阿明。'),
    ex('Tên cô ấy rất đẹp.', '她的名字很好听。'),
    ex('Tên bạn là gì?', '你的名字是什么？'),
  ]),
  w('gi', 'gì', '什么', [
    ex('Đây là cái gì?', '这是什么？'),
    ex('Bạn muốn ăn gì?', '你想吃什么？'),
    ex('Bạn học gì?', '你学什么？'),
  ]),
  w('chungtoi', 'chúng tôi', '我们', [
    ex('Chúng tôi là học sinh.', '我们是学生。'),
    ex('Chúng tôi đều khỏe.', '我们都很好。'),
    ex('Chúng tôi đi học.', '我们去上学。'),
  ]),
  w('anhay', 'anh ấy', '他', [
    ex('Anh ấy là bác sĩ.', '他是医生。'),
    ex('Anh ấy tên là gì?', '他叫什么名字？'),
    ex('Anh ấy rất cao.', '他很高。'),
  ]),
  w('coay', 'cô ấy', '她', [
    ex('Cô ấy là giáo viên.', '她是老师。'),
    ex('Cô ấy rất đẹp.', '她很漂亮。'),
    ex('Cô ấy là bạn tôi.', '她是我的朋友。'),
  ]),
  w('ai', 'ai', '谁', [
    ex('Đó là ai?', '那是谁？'),
    ex('Ai là giáo viên?', '谁是老师？'),
    ex('Bạn tìm ai?', '你找谁？'),
  ]),

  w('nguoi', 'người', '人', [
    ex('Tôi là người Trung Quốc.', '我是中国人。'),
    ex('Anh ấy là người tốt.', '他是好人。'),
    ex('Ở đây có nhiều người.', '这里有很多人。'),
  ]),
  w('vietnam', 'Việt Nam', '越南', [
    ex('Tôi yêu Việt Nam.', '我爱越南。'),
    ex('Bạn đến Việt Nam chưa?', '你去过越南吗？'),
    ex('Việt Nam rất đẹp.', '越南很美。'),
  ]),
  w('trungquoc', 'Trung Quốc', '中国', [
    ex('Anh ấy đến từ Trung Quốc.', '他来自中国。'),
    ex('Trung Quốc rất lớn.', '中国很大。'),
    ex('Tôi học ở Trung Quốc.', '我在中国学习。'),
  ]),
  w('giaovien', 'giáo viên', '老师', [
    ex('Mẹ tôi là giáo viên.', '我妈妈是老师。'),
    ex('Giáo viên của tôi rất tốt.', '我的老师很好。'),
    ex('Tôi muốn làm giáo viên.', '我想当老师。'),
  ]),
  w('hocsinh', 'học sinh', '学生', [
    ex('Tôi là học sinh.', '我是学生。'),
    ex('Các học sinh đều đến.', '学生们都来了。'),
    ex('Học sinh đi học.', '学生去上学。'),
  ]),
  w('bacsi', 'bác sĩ', '医生', [
    ex('Bố tôi là bác sĩ.', '我爸爸是医生。'),
    ex('Tôi muốn làm bác sĩ.', '我想当医生。'),
    ex('Bác sĩ, tôi bị ốm.', '医生，我病了。'),
  ]),

  // Unit 3 — 家庭
  w('bo', 'bố', '爸爸', [
    ex('Bố tôi rất cao.', '我爸爸很高。'),
    ex('Bố ơi, con về rồi!', '爸爸，我回来了！'),
    ex('Bố tôi uống trà.', '我爸爸喝茶。'),
  ]),
  w('me', 'mẹ', '妈妈', [
    ex('Mẹ ơi, con đói.', '妈妈，我饿了。'),
    ex('Tôi yêu mẹ.', '我爱妈妈。'),
    ex('Mẹ tôi nấu cơm.', '我妈妈做饭。'),
  ]),
  w('contrai', 'con trai', '儿子', [
    ex('Tôi có một con trai.', '我有一个儿子。'),
    ex('Con trai tôi là học sinh.', '我儿子是学生。'),
    ex('Con trai bạn mấy tuổi?', '你儿子几岁？'),
  ]),
  w('congai', 'con gái', '女儿', [
    ex('Con gái tôi rất đẹp.', '我女儿很漂亮。'),
    ex('Họ có hai con gái.', '他们有两个女儿。'),
    ex('Con gái tôi đi học.', '我女儿去上学。'),
  ]),
  w('nha', 'nhà', '家', [
    ex('Nhà tôi ở Hà Nội.', '我家在河内。'),
    ex('Mời bạn đến nhà tôi.', '请到我家来。'),
    ex('Tôi về nhà.', '我回家。'),
  ]),
  w('co', 'có', '有', [
    ex('Tôi có một con mèo.', '我有一只猫。'),
    ex('Nhà tôi có bốn người.', '我家有四口人。'),
    ex('Bạn có anh chị em không?', '你有兄弟姐妹吗？'),
  ]),

  w('to', 'to', '大', [
    ex('Nhà này rất to.', '这个房子很大。'),
    ex('Con chó to quá!', '这只狗好大！'),
    ex('Mắt cô ấy to.', '她的眼睛很大。'),
  ]),
  w('nho', 'nhỏ', '小', [
    ex('Con mèo này rất nhỏ.', '这只猫很小。'),
    ex('Nhà tôi nhỏ.', '我家很小。'),
    ex('Em trai tôi còn nhỏ.', '我弟弟还小。'),
  ]),
  w('nhieu', 'nhiều', '多', [
    ex('Hà Nội có nhiều người.', '河内人很多。'),
    ex('Cảm ơn nhiều!', '多谢！'),
    ex('Tôi có nhiều bạn.', '我有很多朋友。'),
  ]),
  w('it', 'ít', '少', [
    ex('Tôi uống ít cà phê.', '我很少喝咖啡。'),
    ex('Ở đây ít người.', '这里人很少。'),
    ex('Tôi chỉ biết ít tiếng Việt.', '我只会一点越南语。'),
  ]),
  w('rat', 'rất', '很', [
    ex('Tôi rất vui.', '我很高兴。'),
    ex('Hôm nay rất nóng.', '今天很热。'),
    ex('Tiếng Việt rất hay.', '越南语很有意思。'),
  ]),
  w('deu', 'đều', '都', [
    ex('Chúng tôi đều là học sinh.', '我们都是学生。'),
    ex('Bố mẹ tôi đều khỏe.', '我爸爸妈妈都很好。'),
    ex('Họ đều đến rồi.', '他们都来了。'),
  ]),

  // Unit 4 — 数字
  w('mot', 'một', '一', [
    ex('Một ly cà phê.', '一杯咖啡。'),
    ex('Chờ một chút.', '等一下。'),
    ex('Tôi có một con chó.', '我有一只狗。'),
  ]),
  w('hai', 'hai', '二', [
    ex('Hai ly trà.', '两杯茶。'),
    ex('Tôi có hai con trai.', '我有两个儿子。'),
    ex('Bây giờ là hai giờ.', '现在两点。'),
  ]),
  w('ba', 'ba', '三', [
    ex('Nhà tôi có ba người.', '我家有三口人。'),
    ex('Ba cái bánh mì.', '三个面包。'),
    ex('Tôi học ba năm rồi.', '我学了三年了。'),
  ]),
  w('bon', 'bốn', '四', [
    ex('Bốn ly trà.', '四杯茶。'),
    ex('Một năm có bốn mùa.', '一年有四个季节。'),
    ex('Tôi có bốn người bạn.', '我有四个朋友。'),
  ]),
  w('nam-so', 'năm', '五', [
    ex('Tôi có năm cái bút.', '我有五支笔。'),
    ex('Con gái tôi năm tuổi.', '我女儿五岁。'),
    ex('Bây giờ là năm giờ.', '现在五点。'),
  ]),
  w('sau', 'sáu', '六', [
    ex('Sáu ly cà phê.', '六杯咖啡。'),
    ex('Tôi dậy lúc sáu giờ.', '我六点起床。'),
    ex('Nhà tôi có sáu người.', '我家有六口人。'),
  ]),

  w('bay', 'bảy', '七', [
    ex('Bảy giờ tôi đi học.', '我七点去上学。'),
    ex('Một tuần có bảy ngày.', '一个星期有七天。'),
    ex('Em trai tôi bảy tuổi.', '我弟弟七岁。'),
  ]),
  w('tam', 'tám', '八', [
    ex('Tám giờ sáng.', '早上八点。'),
    ex('Tôi có tám cái bút.', '我有八支笔。'),
    ex('Con trai tôi tám tuổi.', '我儿子八岁。'),
  ]),
  w('chin', 'chín', '九', [
    ex('Tôi có chín quyển sách.', '我有九本书。'),
    ex('Bây giờ là chín giờ.', '现在九点。'),
    ex('Chín cộng một là mười.', '九加一等于十。'),
  ]),
  w('muoi', 'mười', '十', [
    ex('Mười ly trà.', '十杯茶。'),
    ex('Tôi học mười từ mới.', '我学十个新词。'),
    ex('Con gái tôi mười tuổi.', '我女儿十岁。'),
  ]),
  w('may', 'mấy', '几', [
    ex('Bạn có mấy con?', '你有几个孩子？'),
    ex('Nhà bạn có mấy người?', '你家有几口人？'),
    ex('Bây giờ là mấy giờ?', '现在几点？'),
  ]),
  w('cai', 'cái', '个（量词）', [
    ex('Cái này là gì?', '这个是什么？'),
    ex('Cho tôi hai cái.', '给我两个。'),
    ex('Tôi muốn một cái bánh mì.', '我要一个面包。'),
  ]),

  // Unit 5 — 时间
  w('homnay', 'hôm nay', '今天', [
    ex('Hôm nay là thứ hai.', '今天是星期一。'),
    ex('Hôm nay tôi rất vui.', '今天我很高兴。'),
    ex('Hôm nay bạn có bận không?', '你今天忙吗？'),
  ]),
  w('ngaymai', 'ngày mai', '明天', [
    ex('Ngày mai gặp lại!', '明天见！'),
    ex('Ngày mai tôi đi Hà Nội.', '明天我去河内。'),
    ex('Ngày mai là chủ nhật.', '明天是星期天。'),
  ]),
  w('homqua', 'hôm qua', '昨天', [
    ex('Hôm qua tôi ở nhà.', '昨天我在家。'),
    ex('Hôm qua trời mưa.', '昨天下雨了。'),
    ex('Hôm qua bạn đi đâu?', '你昨天去哪儿了？'),
  ]),
  w('nam-tg', 'năm', '年', [
    ex('Chúc mừng năm mới!', '新年快乐！'),
    ex('Năm nay tôi hai mươi tuổi.', '我今年二十岁。'),
    ex('Một năm có mười hai tháng.', '一年有十二个月。'),
  ]),
  w('thang', 'tháng', '月', [
    ex('Tháng này tôi rất bận.', '这个月我很忙。'),
    ex('Bây giờ là tháng mấy?', '现在是几月？'),
    ex('Tháng sau tôi đi Việt Nam.', '下个月我去越南。'),
  ]),
  w('ngay', 'ngày', '日；天', [
    ex('Tôi học mỗi ngày.', '我每天学习。'),
    ex('Hôm nay là ngày mấy?', '今天几号？'),
    ex('Ngày mai là ngày nghỉ.', '明天是休息日。'),
  ]),

  w('baygio', 'bây giờ', '现在', [
    ex('Bây giờ tôi rất bận.', '我现在很忙。'),
    ex('Bây giờ bạn ở đâu?', '你现在在哪儿？'),
    ex('Bây giờ là tám giờ.', '现在八点。'),
  ]),
  w('gio', 'giờ', '点；小时', [
    ex('Mấy giờ rồi?', '几点了？'),
    ex('Tôi học hai giờ.', '我学两个小时。'),
    ex('Bảy giờ tôi ăn sáng.', '我七点吃早饭。'),
  ]),
  w('phut', 'phút', '分钟', [
    ex('Chờ tôi năm phút.', '等我五分钟。'),
    ex('Mười phút nữa tôi đến.', '我十分钟后到。'),
    ex('Bây giờ là tám giờ mười phút.', '现在八点十分。'),
  ]),
  w('tuan', 'tuần', '星期；周', [
    ex('Tuần này tôi rất bận.', '这个星期我很忙。'),
    ex('Tuần sau gặp lại!', '下周见！'),
    ex('Tôi học tiếng Việt mỗi tuần.', '我每周学越南语。'),
  ]),
  w('luc', 'lúc', '……的时候；在（几点）', [
    ex('Tôi ngủ lúc mười giờ.', '我十点睡觉。'),
    ex('Lúc đó tôi ở nhà.', '那时候我在家。'),
    ex('Bạn đi lúc mấy giờ?', '你几点走？'),
  ]),
  w('buoisang', 'buổi sáng', '早上；上午', [
    ex('Chào buổi sáng!', '早上好！'),
    ex('Buổi sáng tôi uống cà phê.', '早上我喝咖啡。'),
    ex('Buổi sáng tôi đi học.', '我上午去上学。'),
  ]),
]

export const VI_WORD_BY_ID: Record<string, Word> = Object.fromEntries(
  VI_WORDS.map((word) => [word.id, word]),
)

/** Id đầy đủ của các từ trong một bài, từ tên ngắn: `xinchao` → `vi-xinchao`. */
const ids = (...names: string[]) => names.map((name) => `vi-${name}`)

/**
 * Khoá tiếng Việt cho người Trung. Id unit và id bài có tiền tố `v` để không
 * trùng HSK 1: tiến độ của hai khoá nằm chung một danh sách `completedLessonIds`.
 */
export const VI1: Course = {
  id: 'vi1',
  title: '越南语入门',
  description: '零基础越南语课程，60 个最常用的词。',
  units: [
    {
      id: 'vu1',
      title: '第 1 单元 · 问候',
      description: '和越南人见面时最先用到的话。',
      lessons: [
        {
          id: 'vu1l1',
          title: '基本问候',
          description: '打招呼和说再见。',
          wordIds: ids('xinchao', 'ban', 'toi', 'khoe', 'tambiet', 'camon'),
        },
        {
          id: 'vu1l2',
          title: '礼貌用语',
          description: '谢谢、对不起，以及怎么回答。',
          wordIds: ids('khongcogi', 'xinloi', 'khongsao', 'moi', 'la', 'khong'),
        },
      ],
    },
    {
      id: 'vu2',
      title: '第 2 单元 · 自我介绍',
      description: '说出你的名字、职业和国籍。',
      lessons: [
        {
          id: 'vu2l1',
          title: '你叫什么名字',
          description: '问名字和回答名字。',
          wordIds: ids('ten', 'gi', 'chungtoi', 'anhay', 'coay', 'ai'),
        },
        {
          id: 'vu2l2',
          title: '职业和国籍',
          description: '老师、学生、医生。',
          wordIds: ids('nguoi', 'vietnam', 'trungquoc', 'giaovien', 'hocsinh', 'bacsi'),
        },
      ],
    },
    {
      id: 'vu3',
      title: '第 3 单元 · 家庭',
      description: '介绍你的家人。',
      lessons: [
        {
          id: 'vu3l1',
          title: '家人',
          description: '爸爸、妈妈、孩子。',
          wordIds: ids('bo', 'me', 'contrai', 'congai', 'nha', 'co'),
        },
        {
          id: 'vu3l2',
          title: '简单描述',
          description: '大、小、多、少。',
          wordIds: ids('to', 'nho', 'nhieu', 'it', 'rat', 'deu'),
        },
      ],
    },
    {
      id: 'vu4',
      title: '第 4 单元 · 数字',
      description: '从 1 数到 10，学会量词。',
      lessons: [
        {
          id: 'vu4l1',
          title: '1 到 6',
          description: '最先学的几个数字。',
          wordIds: ids('mot', 'hai', 'ba', 'bon', 'nam-so', 'sau'),
        },
        {
          id: 'vu4l2',
          title: '7 到 10',
          description: '数完十个数，再学量词 cái。',
          wordIds: ids('bay', 'tam', 'chin', 'muoi', 'may', 'cai'),
        },
      ],
    },
    {
      id: 'vu5',
      title: '第 5 单元 · 时间',
      description: '说日期和时间。',
      lessons: [
        {
          id: 'vu5l1',
          title: '日期',
          description: '昨天、今天、明天。',
          wordIds: ids('homnay', 'ngaymai', 'homqua', 'nam-tg', 'thang', 'ngay'),
        },
        {
          id: 'vu5l2',
          title: '时刻',
          description: '现在几点了？',
          wordIds: ids('baygio', 'gio', 'phut', 'tuan', 'luc', 'buoisang'),
        },
      ],
    },
  ],
}
