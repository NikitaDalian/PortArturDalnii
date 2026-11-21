import { locale } from '../i18n/locale';
import { articles, href } from './data';

const text = (ru: string, en: string, zh: string) => ({ ru, en, zh })[locale];
export const updatesTitle = text('Обновления сайта', 'Site updates', '网站更新');
export const updatesIntro = text(
  'Когда на сайте появились новые материалы и какие сведения удалось уточнить.',
  'New additions to the site and corrections to earlier material, in date order.',
  '按日期查阅新收录的资料，以及对既有内容的订正。'
);
const link = (url: string, ru: string, en: string, zh: string) => ({ url, label: text(ru, en, zh) });
const importedPosts = new Set([303, 309, 329, 332, 333, 335, 338, 339, 347, 350, 351, 352, 354]);

export const updates = [
  {
    date: '2026-11-21',
    title: text('Эскадры, городской архив и новые заметки', 'Fleet profiles, city history and new notes', '舰艇资料、城市档案与新收录文章'),
    entries: [
      {
        body: text('В оригиналах появились раскрывающиеся примечания. Рядом с двумя спорными датировками приведены источники. Из карточек упомянутых людей, мест, книг и кораблей можно вернуться к заметкам.',
          'The Russian originals now have expandable reading notes. Two notes clarify dates and link to the evidence. Profiles of people, places, books and ships link back to the relevant posts.',
          '俄文原帖新增可展开的阅读注释。其中两条说明订正了日期，并附有史料来源。人物、地点、书籍和舰船条目也提供了返回相关笔记的链接。'),
        links: [link(href.note('tolstoi-odumaites-1904') + '#fn-79-term-port-arthur-attack-date', 'Два стиля датировки', 'Old and New Style dates', '俄历与公历日期'),
          link(href.note('molodyakov-rossiya-i-frantsiya') + '#fn-142-term-entente-and-port-arthur-siege', 'Англо-французское соглашение и осада', 'The Entente Cordiale and the siege', '英法协约与围城时间')],
      },
      {
        body: text('Все 84 заметки можно прочитать на сайте в исходной русской редакции. Шесть из них объединяют по два сообщения. У каждой части сохранены дата и ссылка для обсуждения в канале.',
          'All 84 notes include their original Russian text. Six notes bring together two posts each. Each post retains its date and a link to the channel for discussion.',
          '全部84篇笔记现已收录俄文原文。其中六篇各包含两条原帖，每条均保留发布日期和前往频道讨论的链接。'),
        links: [link(href.notes(), 'Все заметки', 'Browse the notes', '浏览全部笔记'),
          link(href.note('ukreplenie-4-daanzishan') + '#original', 'Две публикации об укреплении № 4', 'Two posts on Fortification No. 4', '关于第4号防御工事的两条原帖')],
      },
      {
        body: text('В справочник Первой Тихоокеанской эскадры добавлены минный транспорт «Амур», грузовой пароход «Бурея», транспорт «Ангара» и госпитальное судно «Монголия». В карточках указано, какие задачи выполняло каждое судно и какими документами это подтверждается.',
          'Four vessels supporting the First Pacific Squadron now have profiles with sources documenting their service: the minelayer Amur, the cargo steamer Bureya, the transport Angara and the hospital ship Mongoliya.',
          '新增四艘为第一太平洋舰队提供支援的船只条目，分别为布雷舰「阿穆尔」号、货轮「布列亚」号、运输船「安加拉」号和医院船「蒙古」号。各条目均附服役史料。'),
        links: [
          link(href.hardware('amur'), '«Амур»', 'Amur', '「阿穆尔」号'),
          link(href.hardware('bureya'), '«Бурея»', 'Bureya', '「布列亚」号'),
          link(href.hardware('angara'), '«Ангара»', 'Angara', '「安加拉」号'),
          link(href.hardware('mongoliya'), '«Монголия»', 'Mongoliya', '「蒙古」号'),
        ],
      },
      {
        body: text('Четыре броненосца первого отряда Второй Тихоокеанской эскадры получили отдельные карточки. Из них можно перейти к биографиям командиров и уцелевшего матроса «Бородино» Семёна Ющина.',
          'The four ships of the Second Pacific Squadron’s First Battleship Division now have individual profiles linking to their captains and to Semyon Yushchin, Borodino’s sole survivor.',
          '第二太平洋舰队第一战列舰分队的四艘战列舰各有独立条目，并附舰长和「博罗季诺」号唯一幸存者谢苗恩·尤先的生平链接。'),
        links: [
          link(href.hardware('knyaz-suvorov'), '«Князь Суворов»', 'Knyaz Suvorov', '「苏沃洛夫公爵」号'),
          link(href.hardware('imperator-aleksandr-iii'), '«Император Александр III»', 'Imperator Aleksandr III', '「亚历山大三世皇帝」号'),
          link(href.hardware('borodino'), '«Бородино»', 'Borodino', '「博罗季诺」号'),
          link(href.hardware('orel'), '«Орёл»', 'Oryol', '「鹰」号'),
          link(href.person('semen-yushchin'), 'Семён Ющин', 'Semyon Yushchin', '谢苗恩·尤先'),
        ],
      },
      {
        body: text('Уточнили подпись к фотографии эсминца «Страшный». На снимке его тёзка, спущенный на воду в 1906 году. В карточке корабля, погибшего у Порт-Артура в 1904 году, помещён рисунок издания 1907 года.',
          'The corrected caption identifies the ship in the photograph as the later Strashnyi, launched in 1906. The profile of the destroyer lost off Port Arthur in 1904 uses an illustration published in 1907.',
          '已订正「可怕」号的照片说明。照片上是1906年下水的同名舰。1904年在旅顺外海沉没的那艘驱逐舰，其条目配有1907年出版的插图。'),
        links: [link(href.hardware('strashnyi'), 'Миноносец «Страшный»', 'Destroyer Strashnyi', '「可怕」号驱逐舰')],
      },
      {
        body: text('На площади Чжуншань описаны десять адресов по её периметру, включая участок бывшего британского консульства. У площади Синхай и моста через бухту появились собственные страницы.',
          'Ten addresses around Zhongshan Square are documented, including the former British consulate site. Xinghai Square and the bridge across the bay have their own pages.',
          '现可查阅中山广场沿街的十处地址，其中包括英国领事馆原址。星海广场与星海湾跨海大桥也各有专页。'),
        links: [
          link(href.place('nikolaevskaya-ploshchad'), 'Здания площади Чжуншань', 'Buildings on Zhongshan Square', '中山广场建筑'),
          link(href.place('ploshchad-sinhai'), 'Площадь Синхай', 'Xinghai Square', '星海广场'),
          link(href.place('most-buhty-sinhai'), 'Мост через бухту Синхай', 'Xinghai Bay Bridge', '星海湾跨海大桥'),
        ],
      },
      {
        body: text('На карте мест можно наложить 16 исторических листов и менять прозрачность. Для вновь привязанных листов показано расхождение в контрольной точке.',
          'The map now has 16 historical overlays with adjustable opacity. For each newly aligned sheet, the map shows the offset measured at a check point.',
          '地图现可叠加16幅历史图，并可调节透明度。每幅新配准的历史图都显示了校核点的偏差。'),
        links: [link(href.map() + '?sheet=312', 'Открыть план Дальнего', 'Open the plan of Dalny', '查看达里尼市街图')],
      },
      {
        body: text('В каталог вошли тринадцать заметок канала. Укреплению № 4 посвящены два сообщения одной фотопрогулки, объединённые на одной странице.',
          'Thirteen notes from the channel joined the catalogue. The two photo posts from one visit to Fortification No. 4 share a page.',
          '此次收录了频道的十三篇文章。作者探访第4号防御工事后发布的两篇图文合并在同一页。'),
        links: articles.filter(a => a.tg_ids.some(id => importedPosts.has(id))).map(a => ({ url: href.note(a.slug), label: a.title })),
      },
    ],
  },
  {
    date: '2026-11-16',
    title: text('Корабли в масштабе', 'Ships to scale', '舰船尺度比较'),
    entries: [{
      body: text('В справочнике стало можно сравнивать размеры кораблей и находить их по флотам. В карточках появились архивные изображения с пояснениями.',
        'The fleet catalogue gained size comparisons, fleet filters and annotated archival images.',
        '舰船目录增加了尺度比较和舰队筛选功能，条目中也加入了带说明的历史图像。'),
      links: [link(href.fleetOverview(), 'Сравнить корабли', 'Compare ships', '比较舰船')],
    }],
  },
  {
    date: '2026-11-15',
    title: text('Две истории из документов', 'Two stories from the archives', '两篇从史料出发的文章'),
    entries: [{
      body: text('Вышли статьи о питании на броненосце «Микаса» и о банковском служащем в Дайрене. В тот же день появились английское и китайское издания сайта с поиском на каждом языке.',
        'Two essays appeared, on meals aboard Mikasa and a bank employee in Dairen. The English and Chinese editions launched the same day, each with its own site search.',
        '新增两篇文章，分别讲述“三笠”号上的伙食及大连一位银行职员的经历。同日上线的英文版与中文版均可使用各自的站内搜索。'),
      links: [
        link(href.essay('mikasa-obed-i-snabzhenie'), 'Обед на «Микасе»', 'Meals aboard Mikasa', '“三笠”号上的伙食'),
        link(href.essay('bankovskiy-sluzhashchiy-dayrena'), 'Банк в Дайрене', 'Banking in Dairen', '大连的银行'),
      ],
    }],
  },
];
