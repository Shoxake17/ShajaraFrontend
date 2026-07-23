// features/legal/legalContent.ts
// /terms va /privacy hujjatlarining to'liq matni (uz/ru/en). Bu UZUN, hujjat
// darajasidagi matn bo'lgani uchun ATAYLAB umumiy i18n JSON fayllariga
// (src/i18n/locales/*.json — qisqa UI yorliqlari uchun) EMAS, shu alohida
// modulga joylashtirilgan — aralashtirilsa i18n fayllari o'qib bo'lmas
// darajada shishib ketardi. LegalLayout shu tuzilmani generik render qiladi.
import type { SupportedLanguage } from '@/i18n';

export interface LegalSection {
  heading: string;
  paragraphs: string[];
  list?: string[];
}

export interface LegalDoc {
  title: string;
  updatedLabel: string;
  intro: string[];
  sections: LegalSection[];
  footer: string;
}

const SUPPORT_EMAIL = 'support@ajdo.uz';
const SUPPORT_TELEGRAM = '@AJDOO_bot';

// ---------------------------------------------------------------------------
// FOYDALANISH SHARTLARI / TERMS OF USE / УСЛОВИЯ ИСПОЛЬЗОВАНИЯ
// ---------------------------------------------------------------------------

const termsUz: LegalDoc = {
  title: 'Foydalanish shartlari',
  updatedLabel: 'Oxirgi yangilanish: 2026-yil 24-iyul',
  intro: [
    'Ushbu Foydalanish shartlari ("Shartlar") Shajara (AJDO) oila daraxti ilovasi va u bilan bog\'liq veb-sayt, mobil (Android) hamda Windows desktop ilovalaridan (birgalikda — "Xizmat") foydalanishni tartibga soladi. Xizmat ajdo.uz domeni ostida taqdim etiladi.',
    'Ro\'yxatdan o\'tish yoki Xizmatdan foydalanishni boshlash orqali siz ushbu Shartlarga va Maxfiylik siyosatiga to\'liq rozilik bildirasiz. Agar Shartlarning biror qismiga rozi bo\'lmasangiz, Xizmatdan foydalanmasligingiz kerak.',
  ],
  sections: [
    {
      heading: "Xizmat tavsifi",
      paragraphs: [
        'Shajara — foydalanuvchilarga o\'z oila daraxtini interaktiv tarzda yaratish, oila a\'zolari haqida ma\'lumot (ism, tug\'ilgan/vafot sana, rasm) saqlash, oila a\'zolari bilan xabar almashish, audio/video qo\'ng\'iroq qilish va media fayllar (rasm, video, hujjat) saqlash imkonini beruvchi xizmat.',
        'Xizmat bepul (FREE) va pullik (PRO, PREMIUM va h.k.) tariflarda taqdim etiladi — tariflar orasidagi farq (xotira hajmi, a\'zolar soni chegarasi) ilova ichida "Obuna" bo\'limida ko\'rsatiladi.',
      ],
    },
    {
      heading: 'Hisob yaratish va yosh chegarasi',
      paragraphs: [
        'Xizmatdan foydalanish uchun telefon raqami, email, Google hisobi yoki Telegram orqali ro\'yxatdan o\'tishingiz kerak. Siz ro\'yxatdan o\'tishda taqdim etgan ma\'lumotlarning to\'g\'ri va dolzarb ekanligiga javobgarsiz.',
        'Xizmatdan foydalanish uchun kamida 16 yoshda bo\'lishingiz kerak. 16 yoshgacha bo\'lgan shaxslar Xizmatdan faqat ota-ona yoki vasiysining nazorati ostida, ular tomonidan yaratilgan hisob orqali foydalanishi mumkin.',
        'Hisobingiz parolini maxfiy saqlash, hisobingiz orqali amalga oshirilgan barcha harakatlar uchun javobgarlik sizning zimmangizda. Hisobingizga ruxsatsiz kirish haqida shubha tug\'ilsa, darhol parolni almashtiring va biz bilan bog\'laning.',
      ],
    },
    {
      heading: 'Oila daraxti ma\'lumotlari va boshqa shaxslar haqidagi ma\'lumot',
      paragraphs: [
        'Oila daraxtiga qo\'shgan a\'zolar (masalan ota-ona, farzand, aka-uka) haqidagi ma\'lumotlar ko\'pincha SIZ EMAS, balki boshqa shaxslarga tegishli bo\'ladi. Bunday ma\'lumotni kiritish orqali siz ushbu shaxslarning ma\'lumotini oila a\'zolari doirasida (yoki ular tanlagan ko\'rinish sozlamalariga muvofiq) ko\'rsatishga huquqingiz borligini tasdiqlaysiz.',
        'Agar biror oila a\'zosi o\'zining shaxsiy ma\'lumotlarini (masalan rasmini) daraxtdan olib tashlashni so\'rasa, buni bajarish daraxt egasining (yoki ushbu yozuvni qo\'shgan foydalanuvchining) mas\'uliyatidir. Biz nizoli holatlarda tomonlar orasidagi kelishuvga aralashmaymiz, lekin qonuniy asosga ega talab bo\'yicha ma\'lumotni bloklashimiz mumkin.',
        'Oila daraxtiga ulashish kodi orqali qo\'shilgan foydalanuvchilar (VIEWER) daraxt egasi (OWNER) belgilagan ko\'rinish huquqlariga muvofiq ma\'lumotlarni ko\'radi va tahrirlaydi.',
      ],
    },
    {
      heading: 'Taqiqlangan xatti-harakatlar',
      paragraphs: ['Xizmatdan foydalanganda quyidagilar QAT\'IYAN TAQIQLANADI:'],
      list: [
        'Yolg\'on, aldamchi yoki boshqa shaxsni taqlid qiluvchi ma\'lumot kiritish;',
        'Boshqa foydalanuvchilarni haqorat qilish, ta\'qib qilish, tahdid qilish yoki bezovta qilish;',
        'Xizmat orqali qonunga zid, zo\'ravonlikni targ\'ib qiluvchi, kamsituvchi yoki 18 yoshgacha bo\'lganlar uchun mos bo\'lmagan kontent tarqatish;',
        'Boshqa foydalanuvchining roziligisiz uning shaxsiy ma\'lumotlarini (rasm, aloqa ma\'lumotlari) yig\'ish yoki tarqatish;',
        'Xizmatning texnik ishlashiga zarar yetkazish (zararli dastur tarqatish, avtomatlashtirilgan so\'rovlar bilan serverni ortiqcha yuklash, xavfsizlik teshiklarini izlash/ekspluatatsiya qilish);',
        'Xizmatni noqonuniy maqsadlarda yoki uchinchi shaxslar huquqini buzgan holda ishlatish.',
      ],
    },
    {
      heading: 'Obuna, to\'lovlar va bekor qilish',
      paragraphs: [
        'Pullik tariflar (obuna yoki bir martalik xotira sloti) Google Play Billing tizimi orqali sotib olinadi va to\'lanadi. To\'lov shartlari, avtomatik yangilanish (auto-renewal) va bekor qilish tartibi Google Play\'ning o\'ziga xos qoidalariga bo\'ysunadi.',
        'Obunani istalgan vaqtda Google Play sozlamalari orqali bekor qilishingiz mumkin — bekor qilish joriy to\'langan davr oxirigacha xizmatdan foydalanish huquqini saqlab qoladi, lekin keyingi davr uchun pul yechilmaydi.',
        'Qaytarib berish (refund) so\'rovlari Google Play\'ning qaytarib berish siyosatiga muvofiq ko\'rib chiqiladi. Biz istisno holatlarda (texnik xato tufayli xizmat ko\'rsatilmagan bo\'lsa) alohida qaytarib berishni ko\'rib chiqishimiz mumkin — buning uchun {SUPPORT_EMAIL} manziliga murojaat qiling.',
      ],
    },
    {
      heading: 'Intellektual mulk',
      paragraphs: [
        'Xizmatning dizayni, logotipi, kodi va boshqa intellektual mulk ob\'ektlari Shajara (AJDO)ga tegishli. Siz Xizmat orqali yuklagan kontent (rasm, matn, oila daraxti ma\'lumotlari) ustidan mualliflik huquqingiz saqlanib qoladi — biz ushbu kontentdan faqat Xizmatni ko\'rsatish maqsadida (saqlash, ko\'rsatish, sizning ko\'rsatmangizga muvofiq boshqa foydalanuvchilarga taqdim etish) foydalanamiz.',
      ],
    },
    {
      heading: 'Uchinchi tomon xizmatlari',
      paragraphs: [
        'Xizmat quyidagi uchinchi tomon xizmatlaridan foydalanadi: Google (kirish/OAuth va Google Play Billing), Telegram (kirish va bot orqali bildirishnoma), Cloudflare (fayl saqlash), LiveKit (audio/video qo\'ng\'iroqlar), Firebase (push-bildirishnomalar) va email yuborish xizmati. Ushbu xizmatlarning har biri o\'zining maxfiylik siyosati va foydalanish shartlariga ega bo\'lib, ularga ham rioya qilishingiz kerak bo\'lishi mumkin.',
      ],
    },
    {
      heading: 'Xizmatni to\'xtatish va hisobni o\'chirish',
      paragraphs: [
        'Siz istalgan vaqtda Sozlamalar bo\'limi orqali hisobingizni o\'chirishingiz mumkin. Hisobni o\'chirish shaxsiy hisob ma\'lumotlaringizni (ism, aloqa ma\'lumotlari, parol) o\'chiradi, LEKIN siz qo\'shgan oila daraxti a\'zolari, edge\'lar va media fayllar — agar ularni boshqa oila a\'zolari (VIEWER\'lar) ham ko\'rib turgan bo\'lsa — umumiy daraxt yaxlitligini saqlash uchun O\'CHIRILMAYDI.',
        'Ushbu Shartlarni buzgan foydalanuvchining hisobini biz oldindan ogohlantirmasdan vaqtincha bloklashimiz yoki butunlay o\'chirishimiz mumkin — bu haqda Maxfiylik siyosatida batafsil yozilgan.',
      ],
    },
    {
      heading: 'Kafolatlarning yo\'qligi va javobgarlikni cheklash',
      paragraphs: [
        'Xizmat "bor holicha" ("as is") taqdim etiladi. Biz Xizmatning uzluksiz, xatosiz ishlashini yoki barcha ma\'lumotlarning yo\'qolmasligini kafolatlamaymiz — garchi biz ma\'lumotlar xavfsizligi va zaxira nusxalash bo\'yicha oqilona choralarni ko\'rsak ham.',
        'Qonun ruxsat bergan chegarada, Shajara (AJDO) Xizmatdan foydalanish natijasida yuzaga kelgan bilvosita, tasodifiy yoki oqibat zararlar uchun javobgar emas.',
      ],
    },
    {
      heading: 'Amal qiluvchi qonunchilik',
      paragraphs: [
        'Ushbu Shartlar O\'zbekiston Respublikasi qonunchiligiga muvofiq talqin qilinadi. Nizolar, agar tomonlar muzokaralar orqali kelisha olmasa, O\'zbekiston Respublikasining tegishli sud organlarida ko\'rib chiqiladi.',
      ],
    },
    {
      heading: 'Shartlarga o\'zgartirish kiritish',
      paragraphs: [
        'Biz ushbu Shartlarni vaqti-vaqti bilan yangilashimiz mumkin. Muhim o\'zgarishlar haqida ilova ichida bildirishnoma orqali xabar beramiz. O\'zgarishlar kuchga kirgandan keyin Xizmatdan foydalanishni davom ettirish — yangi Shartlarga rozilik bildirish hisoblanadi.',
      ],
    },
    {
      heading: "Bog'lanish",
      paragraphs: [
        `Ushbu Shartlar bo'yicha savollaringiz bo'lsa, biz bilan quyidagi manzillar orqali bog'lanishingiz mumkin: email — ${SUPPORT_EMAIL}, Telegram — ${SUPPORT_TELEGRAM}.`,
      ],
    },
  ],
  footer: '© Shajara (AJDO). Barcha huquqlar himoyalangan.',
};

const termsRu: LegalDoc = {
  title: 'Условия использования',
  updatedLabel: 'Последнее обновление: 24 июля 2026 г.',
  intro: [
    'Настоящие Условия использования ("Условия") регулируют использование приложения для составления семейного древа Shajara (AJDO), а также связанного с ним веб-сайта, мобильного (Android) и настольного (Windows) приложений (совместно именуемых "Сервис"), предоставляемых на домене ajdo.uz.',
    'Регистрируясь или начиная использовать Сервис, вы полностью соглашаетесь с настоящими Условиями и Политикой конфиденциальности. Если вы не согласны с какой-либо частью Условий, вы не должны использовать Сервис.',
  ],
  sections: [
    {
      heading: 'Описание сервиса',
      paragraphs: [
        'Shajara — сервис, позволяющий пользователям интерактивно создавать семейное древо, хранить информацию о членах семьи (имя, даты рождения/смерти, фото), обмениваться сообщениями, совершать аудио/видеозвонки и хранить медиафайлы (фото, видео, документы).',
        'Сервис предоставляется на бесплатном (FREE) и платных (PRO, PREMIUM и др.) тарифах — различия между тарифами (объём хранилища, лимит участников) указаны в разделе "Подписка" приложения.',
      ],
    },
    {
      heading: 'Создание аккаунта и возрастное ограничение',
      paragraphs: [
        'Для использования Сервиса необходимо зарегистрироваться по номеру телефона, email, через Google или Telegram. Вы несёте ответственность за точность и актуальность предоставленных при регистрации данных.',
        'Для использования Сервиса необходимо достичь 16-летнего возраста. Лица младше 16 лет могут пользоваться Сервисом только под наблюдением родителя или опекуна, через созданный ими аккаунт.',
        'Вы обязаны хранить пароль от аккаунта в тайне; вы несёте ответственность за все действия, совершённые через ваш аккаунт. При подозрении на несанкционированный доступ немедленно смените пароль и свяжитесь с нами.',
      ],
    },
    {
      heading: 'Данные семейного древа и информация о третьих лицах',
      paragraphs: [
        'Информация о добавленных вами членах семьи (родители, дети, братья/сёстры) часто относится не к вам самим, а к другим лицам. Вводя такую информацию, вы подтверждаете, что имеете право предоставлять её в рамках семейного круга (или в соответствии с выбранными настройками видимости).',
        'Если член семьи просит удалить свои личные данные (например, фото) из древа — это ответственность владельца древа (или пользователя, добавившего запись). Мы не вмешиваемся в споры между сторонами, но можем заблокировать данные при наличии законного основания для запроса.',
        'Пользователи (VIEWER), присоединившиеся к древу по коду приглашения, видят и редактируют данные в соответствии с правами доступа, установленными владельцем древа (OWNER).',
      ],
    },
    {
      heading: 'Запрещённые действия',
      paragraphs: ['При использовании Сервиса СТРОГО ЗАПРЕЩАЕТСЯ:'],
      list: [
        'Предоставлять ложную, вводящую в заблуждение информацию или выдавать себя за другое лицо;',
        'Оскорблять, преследовать, угрожать или иным образом беспокоить других пользователей;',
        'Распространять через Сервис незаконный, пропагандирующий насилие, дискриминационный контент или контент, не предназначенный для лиц младше 18 лет;',
        'Собирать или распространять личные данные (фото, контакты) других пользователей без их согласия;',
        'Наносить вред техническому функционированию Сервиса (распространение вредоносного ПО, перегрузка сервера автоматизированными запросами, поиск/эксплуатация уязвимостей);',
        'Использовать Сервис в незаконных целях или в нарушение прав третьих лиц.',
      ],
    },
    {
      heading: 'Подписка, платежи и отмена',
      paragraphs: [
        'Платные тарифы (подписка или разовая покупка слота хранилища) приобретаются и оплачиваются через систему Google Play Billing. Условия оплаты, автопродление и порядок отмены регулируются собственными правилами Google Play.',
        'Вы можете отменить подписку в любое время через настройки Google Play — отмена сохраняет доступ до конца оплаченного периода, но следующее списание не производится.',
        `Запросы на возврат средств рассматриваются в соответствии с политикой возврата Google Play. В исключительных случаях (техническая ошибка, из-за которой услуга не была оказана) мы можем рассмотреть возврат отдельно — для этого обратитесь на ${SUPPORT_EMAIL}.`,
      ],
    },
    {
      heading: 'Интеллектуальная собственность',
      paragraphs: [
        'Дизайн, логотип, код и другие объекты интеллектуальной собственности Сервиса принадлежат Shajara (AJDO). За вами сохраняются авторские права на загруженный вами контент (фото, текст, данные семейного древа) — мы используем этот контент только для предоставления Сервиса (хранение, отображение, предоставление другим пользователям согласно вашим настройкам).',
      ],
    },
    {
      heading: 'Сторонние сервисы',
      paragraphs: [
        'Сервис использует следующие сторонние сервисы: Google (вход/OAuth и Google Play Billing), Telegram (вход и уведомления через бота), Cloudflare (хранение файлов), LiveKit (аудио/видеозвонки), Firebase (push-уведомления) и сервис отправки email. У каждого из этих сервисов есть собственная политика конфиденциальности и условия использования, которые также могут на вас распространяться.',
      ],
    },
    {
      heading: 'Прекращение сервиса и удаление аккаунта',
      paragraphs: [
        'Вы можете удалить свой аккаунт в любое время через раздел "Настройки". Удаление аккаунта удаляет ваши личные данные (имя, контактные данные, пароль), НО добавленные вами члены семейного древа, связи и медиафайлы — если их также видят другие члены семьи (VIEWER) — НЕ УДАЛЯЮТСЯ, чтобы сохранить целостность общего древа.',
        'Мы можем временно заблокировать или полностью удалить аккаунт пользователя, нарушившего настоящие Условия, без предварительного уведомления — подробнее об этом в Политике конфиденциальности.',
      ],
    },
    {
      heading: 'Отказ от гарантий и ограничение ответственности',
      paragraphs: [
        'Сервис предоставляется "как есть" ("as is"). Мы не гарантируем бесперебойную, безошибочную работу Сервиса или сохранность всех данных — хотя мы принимаем разумные меры по обеспечению безопасности данных и резервному копированию.',
        'В пределах, разрешённых законом, Shajara (AJDO) не несёт ответственности за косвенные, случайные или последующие убытки, возникшие в результате использования Сервиса.',
      ],
    },
    {
      heading: 'Применимое законодательство',
      paragraphs: [
        'Настоящие Условия толкуются в соответствии с законодательством Республики Узбекистан. Споры, если стороны не смогут договориться путём переговоров, рассматриваются в соответствующих судебных органах Республики Узбекистан.',
      ],
    },
    {
      heading: 'Изменения условий',
      paragraphs: [
        'Мы можем периодически обновлять настоящие Условия. О существенных изменениях мы уведомим через уведомление в приложении. Продолжение использования Сервиса после вступления изменений в силу считается согласием с новыми Условиями.',
      ],
    },
    {
      heading: 'Контакты',
      paragraphs: [
        `По вопросам, связанным с настоящими Условиями, вы можете связаться с нами: email — ${SUPPORT_EMAIL}, Telegram — ${SUPPORT_TELEGRAM}.`,
      ],
    },
  ],
  footer: '© Shajara (AJDO). Все права защищены.',
};

const termsEn: LegalDoc = {
  title: 'Terms of Use',
  updatedLabel: 'Last updated: July 24, 2026',
  intro: [
    'These Terms of Use ("Terms") govern your use of the Shajara (AJDO) family tree application and its associated website, Android mobile app, and Windows desktop app (collectively, the "Service"), provided under the ajdo.uz domain.',
    'By registering or beginning to use the Service, you fully agree to these Terms and our Privacy Policy. If you do not agree with any part of these Terms, you must not use the Service.',
  ],
  sections: [
    {
      heading: 'Description of the Service',
      paragraphs: [
        'Shajara is a service that lets users interactively build a family tree, store information about family members (name, birth/death dates, photo), message and call family members via audio/video, and store media files (photos, videos, documents).',
        'The Service is offered on a free (FREE) tier and paid tiers (PRO, PREMIUM, etc.) — the differences between tiers (storage size, member limits) are shown in the "Subscription" section of the app.',
      ],
    },
    {
      heading: 'Account creation and age requirement',
      paragraphs: [
        'To use the Service you must register using a phone number, email, Google account, or Telegram. You are responsible for the accuracy and currency of the information you provide when registering.',
        'You must be at least 16 years old to use the Service. Individuals under 16 may only use the Service under the supervision of a parent or guardian, through an account created by that parent or guardian.',
        'You are responsible for keeping your account password confidential and for all activity that occurs under your account. If you suspect unauthorized access, change your password immediately and contact us.',
      ],
    },
    {
      heading: 'Family tree data and information about other individuals',
      paragraphs: [
        "Information about family members you add (e.g. parents, children, siblings) frequently relates to people other than yourself. By entering such information, you represent that you have the right to share it within the family circle (or according to the visibility settings selected).",
        'If a family member requests removal of their personal data (e.g. a photo) from the tree, fulfilling that request is the responsibility of the tree owner (or the user who added the entry). We do not arbitrate disputes between parties, but we may block data upon a legitimate legal request.',
        'Users (VIEWERs) who join a tree via an invitation code see and edit data according to the access rights set by the tree owner (OWNER).',
      ],
    },
    {
      heading: 'Prohibited conduct',
      paragraphs: ['When using the Service, you are STRICTLY PROHIBITED from:'],
      list: [
        'Providing false, misleading information or impersonating another person;',
        'Harassing, stalking, threatening, or otherwise abusing other users;',
        'Distributing unlawful, violence-promoting, discriminatory content, or content unsuitable for persons under 18, through the Service;',
        "Collecting or distributing another user's personal data (photos, contact details) without their consent;",
        'Harming the technical operation of the Service (distributing malware, overloading the server with automated requests, probing/exploiting security vulnerabilities);',
        "Using the Service for unlawful purposes or in violation of third parties' rights.",
      ],
    },
    {
      heading: 'Subscriptions, payments, and cancellation',
      paragraphs: [
        'Paid tiers (subscriptions or one-time storage slot purchases) are purchased and billed through Google Play Billing. Payment terms, auto-renewal, and cancellation are governed by Google Play\'s own rules.',
        'You may cancel your subscription at any time via Google Play settings — cancellation retains access until the end of the current paid period, with no further charges afterward.',
        `Refund requests are handled according to Google Play's refund policy. In exceptional cases (a technical error that prevented the service from being delivered) we may consider a separate refund — contact ${SUPPORT_EMAIL} for this.`,
      ],
    },
    {
      heading: 'Intellectual property',
      paragraphs: [
        "The Service's design, logo, code, and other intellectual property belong to Shajara (AJDO). You retain copyright over content you upload through the Service (photos, text, family tree data) — we use this content solely to provide the Service (storage, display, and sharing with other users according to your instructions).",
      ],
    },
    {
      heading: 'Third-party services',
      paragraphs: [
        'The Service relies on the following third-party services: Google (sign-in/OAuth and Google Play Billing), Telegram (sign-in and bot notifications), Cloudflare (file storage), LiveKit (audio/video calls), Firebase (push notifications), and an email delivery service. Each of these services has its own privacy policy and terms of use, which may also apply to you.',
      ],
    },
    {
      heading: 'Termination and account deletion',
      paragraphs: [
        'You may delete your account at any time via the Settings section. Deleting your account removes your personal account data (name, contact details, password), BUT family members, connections (edges), and media files you added are NOT deleted if other family members (VIEWERs) also see them, in order to preserve the integrity of the shared tree.',
        'We may suspend or permanently delete the account of a user who violates these Terms without prior notice — see the Privacy Policy for more detail.',
      ],
    },
    {
      heading: 'Disclaimer of warranties and limitation of liability',
      paragraphs: [
        'The Service is provided "as is". We do not guarantee uninterrupted, error-free operation of the Service or that no data will ever be lost — although we take reasonable measures for data security and backups.',
        'To the extent permitted by law, Shajara (AJDO) is not liable for indirect, incidental, or consequential damages arising from use of the Service.',
      ],
    },
    {
      heading: 'Governing law',
      paragraphs: [
        'These Terms are interpreted in accordance with the laws of the Republic of Uzbekistan. Disputes that cannot be resolved through negotiation will be heard by the competent courts of the Republic of Uzbekistan.',
      ],
    },
    {
      heading: 'Changes to these Terms',
      paragraphs: [
        'We may update these Terms from time to time. We will notify you of material changes via an in-app notification. Continuing to use the Service after changes take effect constitutes acceptance of the new Terms.',
      ],
    },
    {
      heading: 'Contact',
      paragraphs: [
        `If you have questions about these Terms, you can reach us at: email — ${SUPPORT_EMAIL}, Telegram — ${SUPPORT_TELEGRAM}.`,
      ],
    },
  ],
  footer: '© Shajara (AJDO). All rights reserved.',
};

// ---------------------------------------------------------------------------
// MAXFIYLIK SIYOSATI / PRIVACY POLICY / ПОЛИТИКА КОНФИДЕНЦИАЛЬНОСТИ
// ---------------------------------------------------------------------------

const privacyUz: LegalDoc = {
  title: 'Maxfiylik siyosati',
  updatedLabel: 'Oxirgi yangilanish: 2026-yil 24-iyul',
  intro: [
    'Ushbu Maxfiylik siyosati Shajara (AJDO) ("biz") sizning shaxsiy ma\'lumotlaringizni qanday yig\'ishi, ishlatishi, saqlashi va himoya qilishini tushuntiradi. Xizmatdan foydalanish orqali siz ushbu siyosatga muvofiq ma\'lumotlarni qayta ishlashga rozilik bildirasiz.',
  ],
  sections: [
    {
      heading: "Biz to'playdigan ma'lumotlar",
      paragraphs: ["Xizmatdan foydalanishingiz davomida quyidagi turdagi ma'lumotlarni to'playmiz:"],
      list: [
        "Hisob ma'lumotlari: to'liq ism, telefon raqami, email (ixtiyoriy), parol (xesh ko'rinishida, hech qachon ochiq matnda saqlanmaydi), Google/Telegram hisob identifikatori;",
        "Ikki bosqichli tasdiqlash (2FA): TOTP maxfiy kaliti (shifrlangan holda) va zaxira kodlar (xesh ko'rinishida);",
        "Kirish tarixi va xavfsizlik jurnali: kirish/chiqish hodisalari, brauzer, operatsion tizim, qurilma turi, IP-manzil va vaqt belgisi;",
        "Oila daraxti ma'lumotlari: siz qo'shgan a'zolarning ismi, jinsi, qarindoshlik turi, tug'ilgan/vafot sanasi, profil rasmi;",
        "Media fayllar: yuklagan rasm, video va hujjatlar (Cloudflare R2 saqlash xizmatida);",
        "Xabarlar: oila a'zolari bilan yozishma matni va biriktirilgan fayllar;",
        "Qo'ng'iroq ma'lumotlari: qo'ng'iroq vaqti, davomiyligi, turi (audio/video) va holati — QO'NG'IROQNING O'ZI (ovoz/video oqimi) SAQLANMAYDI, faqat metama'lumot;",
        "To'lov ma'lumotlari: Google Play orqali amalga oshirilgan xarid ma'lumotlari (mahsulot ID, buyurtma raqami, holat) — TO'LIQ KARTA RAQAMINGIZ BIZGA HECH QACHON YETIB KELMAYDI, uni Google Play o'zi qayta ishlaydi;",
        "Push-bildirishnoma tokeni: qurilmangizga bildirishnoma yuborish uchun zarur texnik token.",
      ],
    },
    {
      heading: "Ma'lumotlardan qanday foydalanamiz",
      paragraphs: ["To'plangan ma'lumotlardan quyidagi maqsadlarda foydalanamiz:"],
      list: [
        'Xizmatni taqdim etish va ishlashini ta\'minlash (oila daraxtini saqlash/ko\'rsatish, xabar/qo\'ng\'iroq yetkazish);',
        "Hisobingiz xavfsizligini ta'minlash (kirish urinishlarini kuzatish, shubhali harakatlarni aniqlash);",
        "Tasdiqlash kodlari (OTP) va muhim bildirishnomalarni yuborish;",
        "To'lovlarni tasdiqlash va obuna holatini boshqarish;",
        "Xizmatni yaxshilash va texnik nosozliklarni bartaraf etish;",
        "Qonun talablariga rioya qilish (masalan sud so'roviga javob berish).",
      ],
    },
    {
      heading: "Ma'lumotlarni kim bilan bo'lishamiz",
      paragraphs: [
        "Biz sizning shaxsiy ma'lumotlaringizni SOTMAYMIZ. Ma'lumotlar faqat quyidagi hollarda uchinchi tomonlarga uzatiladi:",
      ],
      list: [
        'Xizmat ko\'rsatuvchi provayderlar: Cloudflare (fayl saqlash), LiveKit (qo\'ng\'iroq infratuzilmasi), Firebase (push-bildirishnoma), email yuborish xizmati — bular faqat Xizmatni ishga tushirish uchun zarur hajmda ma\'lumot oladi;',
        "Google va Telegram — faqat siz ular orqali kirish/ro'yxatdan o'tishni tanlaganingizda (OAuth), va Google Play — to'lovlarni qayta ishlash uchun;",
        "Sizning oila daraxtingizga kirish huquqi bergan boshqa foydalanuvchilar (VIEWER'lar) — siz belgilagan ko'rinish sozlamalariga muvofiq;",
        "Qonuniy talab (sud qarori, davlat organi so'rovi) bo'lganda — faqat qonun talab qilgan hajmda.",
      ],
    },
    {
      heading: "Maxfiylik sozlamalari (siz nazorat qilasiz)",
      paragraphs: [
        'Sozlamalar bo\'limida quyidagilarni alohida-alohida boshqarishingiz mumkin: profilingizni kim ko\'ra oladi, sizni qidiruvda kim topa oladi, media fayllaringizni kim ko\'ra oladi va sizga kim xabar yubora oladi — har biri "Hammaga ochiq", "Faqat oila" yoki "Hech kimga" (maxfiy) qiymatlariga ega.',
      ],
    },
    {
      heading: "Ma'lumotlarni saqlash muddati va hisobni o'chirish",
      paragraphs: [
        "Hisobingiz faol ekan, ma'lumotlaringiz saqlanadi. Hisobni o'chirganingizda shaxsiy hisob ma'lumotlaringiz (ism, aloqa ma'lumotlari, parol) darhol o'chiriladi.",
        "MUHIM: siz qo'shgan oila daraxti a'zolari, ular orasidagi bog'lanishlar (edge) va media fayllar — agar ularni boshqa oila a'zolari ham ko'rib turgan bo'lsa — umumiy daraxtning yaxlitligini saqlash uchun O'CHIRILMAYDI. Bu — ko'p foydalanuvchili oila daraxti xizmatining tabiatidan kelib chiqadigan, ilova ichida ochiq aytilgan qoida.",
        "Kirish tarixi (xavfsizlik jurnali) audit maqsadida cheklangan muddat (har bir hisob uchun so'nggi 50 ta yozuv) saqlanadi.",
      ],
    },
    {
      heading: 'Xavfsizlik choralari',
      paragraphs: [
        "Parolingiz argon2id algoritmi bilan xeshlanadi (hech qachon ochiq matnda saqlanmaydi). 2FA maxfiy kaliti AES-256-GCM bilan shifrlanadi. Barcha aloqa HTTPS orqali shifrlanadi. Serverlarimiz xavfsizlik devori, avtomatik shubhali faollikni aniqlash tizimi (CrowdSec) bilan himoyalangan.",
        "Hech qanday tizim 100% xavfsiz bo'la olmaydi — biz oqilona texnik va tashkiliy choralarni ko'ramiz, lekin mutlaq kafolat bera olmaymiz.",
      ],
    },
    {
      heading: 'Sizning huquqlaringiz',
      paragraphs: ["Siz quyidagi huquqlarga egasiz:"],
      list: [
        "O'zingiz haqingizdagi ma'lumotlarga kirish va ularning nusxasini olish (Sozlamalar → Eksport);",
        "Noto'g'ri ma'lumotni tuzatish (profilni tahrirlash orqali);",
        "Hisobingizni va shaxsiy ma'lumotlaringizni o'chirishni so'rash;",
        "Maxfiylik sozlamalari orqali ma'lumotlaringiz ko'rinishini cheklash;",
        `Ushbu huquqlarni amalga oshirishda qiyinchilik yuzaga kelsa, ${SUPPORT_EMAIL} manziliga murojaat qiling.`,
      ],
    },
    {
      heading: 'Bolalar maxfiyligi',
      paragraphs: [
        "Xizmat 16 yoshdan kichik shaxslar tomonidan mustaqil ro'yxatdan o'tish uchun mo'ljallanmagan. Agar 16 yoshgacha bo'lgan bolaning ma'lumoti (masalan oila daraxtida farzand sifatida) kiritilgan bo'lsa, bu ma'lumot ota-ona yoki vasiy tomonidan, ularning o'z hisobi orqali kiritiladi deb hisoblanadi.",
      ],
    },
    {
      heading: "Ma'lumotlarni xalqaro uzatish",
      paragraphs: [
        "Bizning ba'zi xizmat ko'rsatuvchi provayderlarimiz (Cloudflare, Google, Firebase) O'zbekiston hududidan tashqarida joylashgan serverlardan foydalanishi mumkin. Ushbu provayderlar xalqaro tan olingan ma'lumotlar xavfsizligi standartlariga rioya qiladi.",
      ],
    },
    {
      heading: "Cookie va lokal saqlash",
      paragraphs: [
        "Veb-versiyada sessiyangizni saqlash uchun zarur cookie va brauzer lokal xotirasidan (localStorage) foydalanamiz (masalan kirish holati, til va ko'rinish tanlovi). Biz uchinchi tomon reklama/kuzatuv (tracking) cookie'laridan foydalanmaymiz.",
      ],
    },
    {
      heading: "Siyosatga o'zgartirish kiritish",
      paragraphs: [
        "Ushbu Maxfiylik siyosatini vaqti-vaqti bilan yangilashimiz mumkin. Muhim o'zgarishlar haqida ilova ichida bildirishnoma orqali xabar beramiz.",
      ],
    },
    {
      heading: "Bog'lanish",
      paragraphs: [
        `Maxfiylik bilan bog'liq savol yoki so'rovlaringiz bo'lsa: email — ${SUPPORT_EMAIL}, Telegram — ${SUPPORT_TELEGRAM}.`,
      ],
    },
  ],
  footer: '© Shajara (AJDO). Barcha huquqlar himoyalangan.',
};

const privacyRu: LegalDoc = {
  title: 'Политика конфиденциальности',
  updatedLabel: 'Последнее обновление: 24 июля 2026 г.',
  intro: [
    'Настоящая Политика конфиденциальности объясняет, как Shajara (AJDO) ("мы") собирает, использует, хранит и защищает ваши персональные данные. Используя Сервис, вы соглашаетесь на обработку данных в соответствии с настоящей политикой.',
  ],
  sections: [
    {
      heading: 'Какие данные мы собираем',
      paragraphs: ['В процессе использования Сервиса мы собираем следующие типы данных:'],
      list: [
        'Данные аккаунта: полное имя, номер телефона, email (по желанию), пароль (в виде хеша, никогда не хранится в открытом виде), идентификатор аккаунта Google/Telegram;',
        'Двухфакторная аутентификация (2FA): секретный ключ TOTP (в зашифрованном виде) и резервные коды (в виде хеша);',
        'История входов и журнал безопасности: события входа/выхода, браузер, операционная система, тип устройства, IP-адрес и временная метка;',
        'Данные семейного древа: имя, пол, тип родства, даты рождения/смерти, фото профиля добавленных вами членов семьи;',
        'Медиафайлы: загруженные фото, видео и документы (в хранилище Cloudflare R2);',
        'Сообщения: текст переписки с членами семьи и вложенные файлы;',
        'Данные о звонках: время, продолжительность, тип (аудио/видео) и статус звонка — САМ ЗВОНОК (аудио/видеопоток) НЕ СОХРАНЯЕТСЯ, только метаданные;',
        'Платёжные данные: данные о покупках через Google Play (ID продукта, номер заказа, статус) — ПОЛНЫЙ НОМЕР ВАШЕЙ КАРТЫ НИКОГДА НЕ ПОПАДАЕТ К НАМ, его обрабатывает сам Google Play;',
        'Токен push-уведомлений: технический токен, необходимый для отправки уведомлений на ваше устройство.',
      ],
    },
    {
      heading: 'Как мы используем данные',
      paragraphs: ['Собранные данные используются в следующих целях:'],
      list: [
        'Предоставление и обеспечение работы Сервиса (хранение/отображение семейного древа, доставка сообщений/звонков);',
        'Обеспечение безопасности вашего аккаунта (отслеживание попыток входа, выявление подозрительной активности);',
        'Отправка кодов подтверждения (OTP) и важных уведомлений;',
        'Подтверждение платежей и управление статусом подписки;',
        'Улучшение Сервиса и устранение технических неполадок;',
        'Соблюдение требований законодательства (например, ответ на судебный запрос).',
      ],
    },
    {
      heading: 'С кем мы делимся данными',
      paragraphs: ['Мы НЕ ПРОДАЁМ ваши персональные данные. Данные передаются третьим лицам только в следующих случаях:'],
      list: [
        'Поставщики услуг: Cloudflare (хранение файлов), LiveKit (инфраструктура звонков), Firebase (push-уведомления), сервис отправки email — они получают данные только в объёме, необходимом для работы Сервиса;',
        'Google и Telegram — только при выборе входа/регистрации через них (OAuth), и Google Play — для обработки платежей;',
        'Другие пользователи (VIEWER), которым вы предоставили доступ к своему семейному древу — в соответствии с установленными вами настройками видимости;',
        'При законном требовании (решение суда, запрос государственного органа) — только в объёме, требуемом законом.',
      ],
    },
    {
      heading: 'Настройки конфиденциальности (управляете вы)',
      paragraphs: [
        'В разделе "Настройки" вы можете отдельно управлять тем, кто видит ваш профиль, кто может найти вас в поиске, кто видит ваши медиафайлы и кто может отправлять вам сообщения — каждый параметр может быть "Публично", "Только семья" или "Никому" (приватно).',
      ],
    },
    {
      heading: 'Срок хранения данных и удаление аккаунта',
      paragraphs: [
        'Пока ваш аккаунт активен, данные сохраняются. При удалении аккаунта ваши личные данные (имя, контактные данные, пароль) удаляются немедленно.',
        'ВАЖНО: добавленные вами члены семейного древа, связи между ними и медиафайлы — если их также видят другие члены семьи — НЕ УДАЛЯЮТСЯ, чтобы сохранить целостность общего древа. Это правило прямо указано в приложении и вытекает из природы многопользовательского сервиса семейного древа.',
        'История входов (журнал безопасности) хранится в течение ограниченного срока в целях аудита (последние 50 записей на аккаунт).',
      ],
    },
    {
      heading: 'Меры безопасности',
      paragraphs: [
        'Ваш пароль хешируется алгоритмом argon2id (никогда не хранится в открытом виде). Секретный ключ 2FA шифруется по стандарту AES-256-GCM. Всё соединение шифруется через HTTPS. Наши серверы защищены брандмауэром и автоматической системой обнаружения подозрительной активности (CrowdSec).',
        'Ни одна система не может быть защищена на 100% — мы принимаем разумные технические и организационные меры, но не можем дать абсолютную гарантию.',
      ],
    },
    {
      heading: 'Ваши права',
      paragraphs: ['Вы имеете следующие права:'],
      list: [
        'Доступ к своим данным и получение их копии (Настройки → Экспорт);',
        'Исправление неверных данных (через редактирование профиля);',
        'Запрос на удаление аккаунта и личных данных;',
        'Ограничение видимости ваших данных через настройки конфиденциальности;',
        `Если у вас возникли сложности с реализацией этих прав, обратитесь на ${SUPPORT_EMAIL}.`,
      ],
    },
    {
      heading: 'Конфиденциальность детей',
      paragraphs: [
        'Сервис не предназначен для самостоятельной регистрации лицами младше 16 лет. Если данные ребёнка младше 16 лет внесены (например, как ребёнок в семейном древе), предполагается, что эти данные внесены родителем или опекуном через их собственный аккаунт.',
      ],
    },
    {
      heading: 'Международная передача данных',
      paragraphs: [
        'Некоторые из наших поставщиков услуг (Cloudflare, Google, Firebase) могут использовать серверы, расположенные за пределами Узбекистана. Эти поставщики соблюдают международно признанные стандарты защиты данных.',
      ],
    },
    {
      heading: 'Файлы cookie и локальное хранилище',
      paragraphs: [
        'В веб-версии мы используем необходимые cookie и локальное хранилище браузера (localStorage) для сохранения вашей сессии (например, статус входа, язык и тема оформления). Мы не используем сторонние рекламные/трекинговые cookie.',
      ],
    },
    {
      heading: 'Изменения политики',
      paragraphs: [
        'Мы можем периодически обновлять настоящую Политику конфиденциальности. О существенных изменениях мы уведомим через уведомление в приложении.',
      ],
    },
    {
      heading: 'Контакты',
      paragraphs: [
        `По вопросам конфиденциальности обращайтесь: email — ${SUPPORT_EMAIL}, Telegram — ${SUPPORT_TELEGRAM}.`,
      ],
    },
  ],
  footer: '© Shajara (AJDO). Все права защищены.',
};

const privacyEn: LegalDoc = {
  title: 'Privacy Policy',
  updatedLabel: 'Last updated: July 24, 2026',
  intro: [
    'This Privacy Policy explains how Shajara (AJDO) ("we") collects, uses, stores, and protects your personal data. By using the Service, you consent to the processing of data as described in this policy.',
  ],
  sections: [
    {
      heading: 'Data we collect',
      paragraphs: ['While you use the Service, we collect the following types of data:'],
      list: [
        'Account data: full name, phone number, email (optional), password (stored as a hash, never in plain text), Google/Telegram account identifier;',
        'Two-factor authentication (2FA): TOTP secret key (encrypted) and recovery codes (hashed);',
        'Login history and security log: sign-in/sign-out events, browser, operating system, device type, IP address, and timestamp;',
        "Family tree data: name, gender, relationship type, birth/death dates, and profile photo of the family members you add;",
        'Media files: uploaded photos, videos, and documents (stored via Cloudflare R2);',
        'Messages: text and attached files exchanged with family members;',
        'Call data: call time, duration, type (audio/video), and status — the call CONTENT ITSELF (audio/video stream) is NOT recorded, only metadata;',
        'Payment data: purchase data from Google Play (product ID, order number, status) — YOUR FULL CARD NUMBER NEVER REACHES US, it is processed by Google Play itself;',
        'Push notification token: the technical token required to send notifications to your device.',
      ],
    },
    {
      heading: 'How we use data',
      paragraphs: ['We use the data we collect for the following purposes:'],
      list: [
        'Providing and operating the Service (storing/displaying the family tree, delivering messages/calls);',
        'Securing your account (tracking sign-in attempts, detecting suspicious activity);',
        'Sending verification codes (OTP) and important notifications;',
        'Verifying payments and managing subscription status;',
        'Improving the Service and fixing technical issues;',
        'Complying with legal requirements (e.g. responding to a court order).',
      ],
    },
    {
      heading: 'Who we share data with',
      paragraphs: ['We DO NOT SELL your personal data. Data is shared with third parties only in the following cases:'],
      list: [
        'Service providers: Cloudflare (file storage), LiveKit (call infrastructure), Firebase (push notifications), our email delivery service — these receive only the data necessary to operate the Service;',
        'Google and Telegram — only when you choose to sign in/register through them (OAuth), and Google Play — to process payments;',
        'Other users (VIEWERs) to whom you have granted access to your family tree — according to the visibility settings you set;',
        'When legally required (court order, government request) — only to the extent required by law.',
      ],
    },
    {
      heading: 'Privacy controls (you are in control)',
      paragraphs: [
        'In the Settings section, you can separately control who can see your profile, who can find you in search, who can see your media files, and who can message you — each setting can be "Public," "Family only," or "No one" (private).',
      ],
    },
    {
      heading: 'Data retention and account deletion',
      paragraphs: [
        'While your account is active, your data is retained. When you delete your account, your personal account data (name, contact details, password) is deleted immediately.',
        'IMPORTANT: family members you added, the connections (edges) between them, and media files — if other family members can also see them — are NOT deleted, in order to preserve the integrity of the shared tree. This is explicitly stated in the app and follows from the nature of a multi-user family tree service.',
        'Login history (security log) is retained for a limited period for audit purposes (the last 50 entries per account).',
      ],
    },
    {
      heading: 'Security measures',
      paragraphs: [
        'Your password is hashed using the argon2id algorithm (never stored in plain text). The 2FA secret key is encrypted with AES-256-GCM. All communication is encrypted via HTTPS. Our servers are protected by a firewall and an automated suspicious-activity detection system (CrowdSec).',
        'No system can be 100% secure — we take reasonable technical and organizational measures, but we cannot provide an absolute guarantee.',
      ],
    },
    {
      heading: 'Your rights',
      paragraphs: ['You have the following rights:'],
      list: [
        'Access your data and obtain a copy of it (Settings → Export);',
        'Correct inaccurate data (by editing your profile);',
        'Request deletion of your account and personal data;',
        'Restrict the visibility of your data via privacy settings;',
        `If you have difficulty exercising these rights, contact ${SUPPORT_EMAIL}.`,
      ],
    },
    {
      heading: "Children's privacy",
      paragraphs: [
        "The Service is not intended for independent registration by individuals under 16. If data about a child under 16 is entered (e.g. as a child in the family tree), it is assumed that this data was entered by a parent or guardian through their own account.",
      ],
    },
    {
      heading: 'International data transfers',
      paragraphs: [
        'Some of our service providers (Cloudflare, Google, Firebase) may use servers located outside Uzbekistan. These providers comply with internationally recognized data-protection standards.',
      ],
    },
    {
      heading: 'Cookies and local storage',
      paragraphs: [
        'On the web version, we use necessary cookies and browser local storage (localStorage) to maintain your session (e.g. sign-in status, language, and theme preference). We do not use third-party advertising/tracking cookies.',
      ],
    },
    {
      heading: 'Changes to this policy',
      paragraphs: [
        'We may update this Privacy Policy from time to time. We will notify you of material changes via an in-app notification.',
      ],
    },
    {
      heading: 'Contact',
      paragraphs: [
        `If you have privacy-related questions or requests, contact us at: email — ${SUPPORT_EMAIL}, Telegram — ${SUPPORT_TELEGRAM}.`,
      ],
    },
  ],
  footer: '© Shajara (AJDO). All rights reserved.',
};

export const TERMS_CONTENT: Record<SupportedLanguage, LegalDoc> = {
  uz: termsUz,
  ru: termsRu,
  en: termsEn,
};

export const PRIVACY_CONTENT: Record<SupportedLanguage, LegalDoc> = {
  uz: privacyUz,
  ru: privacyRu,
  en: privacyEn,
};
