// features/settings/faqContent.ts
// "Tez-tez so'raladigan savollar" (Sozlamalar → Yordam) — legalContent.ts
// bilan bir xil sabab: uzun, hujjat darajasidagi matn, i18n JSON'ga emas
// shu alohida modulga (uz/ru/en).
import type { SupportedLanguage } from '@/i18n';

export interface FaqItem {
  question: string;
  answer: string;
}

const faqUz: FaqItem[] = [
  {
    question: "Oila daraxtiga qanday a'zo qo'shaman?",
    answer:
      "Doska sahifasida istalgan kartaga bosing va \"+\" tugmasi orqali yangi qarindosh (ota, ona, farzand, turmush o'rtog'i va h.k.) qo'shing. Yangi a'zo avtomatik tanlangan kartaga bog'lanadi.",
  },
  {
    question: "Ulashish kodi nima va qanday ishlatiladi?",
    answer:
      "Har bir a'zo kartasi o'zining noyob ulashish kodiga ega. Shu kodni real hayotdagi oila a'zosiga bering — u ro'yxatdan o'tayotganda shu kodni kiritsa, sizning daraxtingizga kartasi orqali ulanadi va o'sha kartaga tegishli VIEWER huquqi bilan kiradi.",
  },
  {
    question: "Bepul va pullik tariflar orasidagi farq nima?",
    answer:
      "Bepul (FREE) tarifda xotira hajmi va a'zolar soni cheklangan. Pullik tariflar (PRO, PREMIUM) ko'proq xotira va a'zo sloti beradi. Aniq raqamlarni Sozlamalar → Obuna bo'limida ko'rishingiz mumkin.",
  },
  {
    question: "Hisobimni o'chirsam, oila daraxtim ham o'chib ketadimi?",
    answer:
      "Yo'q. Hisobingizni o'chirsangiz, faqat shaxsiy ma'lumotlaringiz (ism, aloqa) o'chadi. Siz qo'shgan oila a'zolari va rasm-videolar, agar ularni boshqa oila a'zolari ham ko'rib turgan bo'lsa, umumiy daraxt yaxlitligini saqlash uchun o'chirilmaydi.",
  },
  {
    question: "Kim mening profilimni/rasmlarimni ko'ra oladi?",
    answer:
      "Sozlamalar → Maxfiylik bo'limida buni to'liq nazorat qilasiz: profilingizni, media fayllaringizni va sizga xabar yubora olishni \"Hammaga ochiq\", \"Faqat oila\" yoki \"Hech kimga\" (maxfiy) qilib belgilashingiz mumkin.",
  },
  {
    question: "Xabar/qo'ng'iroq kimlar bilan ishlaydi?",
    answer:
      "Faqat sizning faol oila daraxtingizdagi, ulashish kodi orqali hisobini bog'lagan a'zolar bilan xabar almashishingiz va qo'ng'iroq qilishingiz mumkin (ularning \"Kimlar sizga xabar yuborishi mumkin\" sozlamasiga qarab).",
  },
  {
    question: "Parolimni unutib qo'ydim, nima qilaman?",
    answer: "Kirish sahifasidagi \"Parolni unutdingizmi?\" havolasini bosing — telefon raqamingiz yoki emailingizga tasdiqlash kodi yuboriladi, shu orqali yangi parol o'rnatasiz.",
  },
  {
    question: "Ilova qaysi platformalarda ishlaydi?",
    answer: "Shajara veb-brauzerda, Android mobil ilovasi va Windows desktop ilovasi (AJDO.exe) sifatida ishlaydi — hisobingiz barcha qurilmalarda bir xil.",
  },
];

const faqRu: FaqItem[] = [
  {
    question: 'Как добавить члена в семейное древо?',
    answer:
      'На странице Доска нажмите на любую карточку и добавьте нового родственника (родителя, ребёнка, супруга и т.д.) через кнопку "+". Новый член автоматически привязывается к выбранной карточке.',
  },
  {
    question: 'Что такое код приглашения и как он используется?',
    answer:
      'У каждой карточки члена семьи есть свой уникальный код приглашения. Дайте этот код реальному родственнику — при регистрации он вводит этот код и подключается к вашему древу через свою карточку, получая права VIEWER.',
  },
  {
    question: 'В чём разница между бесплатным и платным тарифом?',
    answer:
      'На бесплатном (FREE) тарифе объём хранилища и количество участников ограничены. Платные тарифы (PRO, PREMIUM) дают больше хранилища и слотов участников. Точные цифры — в разделе Настройки → Подписка.',
  },
  {
    question: 'Если я удалю аккаунт, удалится ли моё семейное древо?',
    answer:
      'Нет. При удалении аккаунта удаляются только ваши личные данные (имя, контакты). Добавленные вами члены семьи и фото/видео не удаляются, если их также видят другие члены семьи — это сохраняет целостность общего древа.',
  },
  {
    question: 'Кто может видеть мой профиль/фотографии?',
    answer:
      'Вы полностью контролируете это в разделе Настройки → Конфиденциальность: профиль, медиафайлы и возможность писать вам можно установить как "Публично", "Только семья" или "Никому" (приватно).',
  },
  {
    question: 'С кем работают сообщения/звонки?',
    answer:
      'Вы можете переписываться и звонить только с теми членами вашего активного семейного древа, кто подключил свой аккаунт по коду приглашения (в зависимости от их настройки "Кто может мне писать").',
  },
  {
    question: 'Я забыл пароль, что делать?',
    answer: 'На странице входа нажмите "Забыли пароль?" — на ваш телефон или email придёт код подтверждения, с помощью которого вы установите новый пароль.',
  },
  {
    question: 'На каких платформах работает приложение?',
    answer: 'Shajara работает в веб-браузере, в виде Android-приложения и приложения для Windows (AJDO.exe) — ваш аккаунт единый на всех устройствах.',
  },
];

const faqEn: FaqItem[] = [
  {
    question: 'How do I add a member to the family tree?',
    answer:
      'On the Board page, click any card and add a new relative (parent, child, spouse, etc.) via the "+" button. The new member is automatically linked to the selected card.',
  },
  {
    question: 'What is an invite code and how is it used?',
    answer:
      "Each family member's card has its own unique invite code. Give this code to the real-life relative — when they register, they enter this code and connect to your tree through their card, gaining VIEWER access.",
  },
  {
    question: "What's the difference between the free and paid plans?",
    answer:
      'The free (FREE) tier has limited storage and member count. Paid tiers (PRO, PREMIUM) provide more storage and member slots. Exact numbers are shown in Settings → Subscription.',
  },
  {
    question: 'If I delete my account, will my family tree be deleted too?',
    answer:
      'No. Deleting your account only removes your personal account data (name, contact details). Family members and photos/videos you added are not deleted if other family members can still see them — this preserves the integrity of the shared tree.',
  },
  {
    question: 'Who can see my profile/photos?',
    answer:
      'You have full control in Settings → Privacy: your profile, media files, and who can message you can each be set to "Public," "Family only," or "No one" (private).',
  },
  {
    question: 'Who can I message or call?',
    answer:
      'You can only message and call members of your active family tree who have linked their account via an invite code (subject to their own "Who can message me" setting).',
  },
  {
    question: 'I forgot my password, what do I do?',
    answer: 'On the login page, tap "Forgot password?" — a verification code will be sent to your phone or email, which you use to set a new password.',
  },
  {
    question: 'Which platforms does the app run on?',
    answer: 'Shajara runs in the web browser, as an Android app, and as a Windows desktop app (AJDO.exe) — your account is the same across all devices.',
  },
];

export const FAQ_CONTENT: Record<SupportedLanguage, FaqItem[]> = {
  uz: faqUz,
  ru: faqRu,
  en: faqEn,
};
