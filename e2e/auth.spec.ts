import { expect, test } from '@playwright/test';

/**
 * To'liq auth oqimi + interaktiv doska.
 * Har ishga tushirishda unikal telefon/email (baza iflos bo'lmaydi, konflikt yo'q).
 * Telefon 7 xonasi tasodifiy — takror yuritishda ham to'qnashmaydi.
 */
const rnd7 = () => String(Math.floor(1_000_000 + Math.random() * 8_999_999));
const suffix = rnd7();
const phone = `+99890${suffix}`;
const email = `e2e-${Date.now()}-${suffix}@example.com`;
const password = 'Test1234';
const fullName = 'E2E Foydalanuvchi';

async function registerUser(
  page: import('@playwright/test').Page,
  opts: { name: string; phone: string; email: string },
) {
  await page.goto('/register');
  await page.getByPlaceholder('Ism familiya').fill(opts.name);
  await page.getByPlaceholder('+998 90 123 45 67').fill(opts.phone);
  await page.getByPlaceholder('Email manzil').fill(opts.email);
  await page.getByPlaceholder('Parol', { exact: true }).fill(password);
  await page.getByPlaceholder('Parolni tasdiqlang').fill(password);
  await page.getByRole('checkbox').check();
  // Matndagi apostrof tipografik (U+2018) — regex bilan qidiramiz
  await page.getByRole('button', { name: /yxatdan o/ }).click();
  // argon2 hash + doska yuklash sekinroq bo'lishi mumkin — kengroq kutamiz
  await expect(page).toHaveURL('/', { timeout: 15_000 });
}

test('register -> doska -> logout -> login (xato va muvaffaqiyat)', async ({ page }) => {
  // --- 1. Ro'yxatdan o'tish -> interaktiv doska ---
  await registerUser(page, { name: fullName, phone, email });
  await expect(page.getByText(fullName).first()).toBeVisible(); // doskadagi "Men" tuguni
  await expect(page.getByText('Men', { exact: true })).toBeVisible();

  // --- 2. Chiqish ---
  await page.getByRole('button', { name: 'Chiqish' }).click();
  await expect(page).toHaveURL('/login');

  // --- 3. Noto'g'ri parol -> xato xabari ---
  await page.getByPlaceholder('Telefon raqam yoki email').fill(phone);
  await page.getByPlaceholder('Parol').fill('NotoGri999');
  await page.getByRole('button', { name: 'Kirish', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText("noto'g'ri");

  // --- 4. To'g'ri parol (TELEFON bilan) -> doska ---
  await page.getByPlaceholder('Parol').fill(password);
  await page.getByRole('button', { name: 'Kirish', exact: true }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByText(fullName).first()).toBeVisible();

  // --- 5. Chiqib, endi EMAIL bilan kirish ---
  await page.getByRole('button', { name: 'Chiqish' }).click();
  await expect(page).toHaveURL('/login');
  await page.getByPlaceholder('Telefon raqam yoki email').fill(email);
  await page.getByPlaceholder('Parol').fill(password);
  await page.getByRole('button', { name: 'Kirish', exact: true }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByText(fullName).first()).toBeVisible();
});

test('himoyalangan sahifa sessiyasiz /login ga qaytaradi', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL('/login');
});

test('sahifa yangilanganda sessiya faqat httpOnly cookie orqali tiklanadi', async ({ page }) => {
  const s = (Date.now() + 1).toString().slice(-7);
  await registerUser(page, {
    name: 'Reload Test',
    phone: `+99891${s}`,
    email: `reload-${s}@example.com`,
  });

  // localStorage'da hech qanday sessiya ma'lumoti YO'Q
  const stored = await page.evaluate(() => JSON.stringify(localStorage));
  expect(stored).not.toContain('Reload Test');
  expect(stored).not.toContain('accessToken');

  // To'liq reload — xotira tozalanadi, sessiya cookie orqali qaytadi
  await page.reload();
  await expect(page.getByText('Reload Test').first()).toBeVisible();
});

test("qarindosh qo'shiladi, saqlanadi va reload'dan keyin qoladi", async ({ page }) => {
  const s = (Date.now() + 2).toString().slice(-7);
  await registerUser(page, {
    name: 'Doska Tester',
    phone: `+99893${s}`,
    email: `board-${s}@example.com`,
  });

  // --- Erkak a'zo qo'shish (Ota) ---
  await page.getByRole('button', { name: /Qarindosh/ }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder('Ism familiya').fill('Akmal Bobo');
  await dialog.getByLabel('Qarindoshlik turi').selectOption('OTA');
  await dialog.getByPlaceholder("Tug'ilgan yil").fill('1950');
  await dialog.getByRole('button', { name: /Qo/ }).click();
  await expect(page.getByText('Akmal Bobo')).toBeVisible();

  // --- Ayol a'zo qo'shish (Ona) — pushti ko'rinishi ---
  await page.getByRole('button', { name: /Qarindosh/ }).click();
  await dialog.getByPlaceholder('Ism familiya').fill('Malika Ona');
  await dialog.getByLabel('Qarindoshlik turi').selectOption('ONA');
  await dialog.getByRole('button', { name: /Qo/ }).click();
  await expect(page.getByText('Malika Ona')).toBeVisible();

  // --- ENG MUHIMI: reload'dan keyin ham saqlangan bo'lishi ---
  await page.reload();
  await expect(page.getByText('Akmal Bobo')).toBeVisible();
  await expect(page.getByText('Malika Ona')).toBeVisible();
  await expect(page.getByText('1950 –')).toBeVisible(); // tug'ilgan yil ham saqlangan
});

test('tirik va vafot etgan a\'zolar uchun yosh hisoblanadi', async ({ page }) => {
  const s = (Date.now() + 5).toString().slice(-7);
  const nowYear = new Date().getFullYear();
  await registerUser(page, {
    name: 'Yosh Tester',
    phone: `+99896${s}`,
    email: `age-${s}@example.com`,
  });
  const add = page.getByRole('dialog', { name: /a'zosini qo/ });

  // Tirik a'zo — tug'ilgan yil bor, vafot yo'q -> hozirgi yoshi
  await page.getByRole('button', { name: /Qarindosh/ }).click();
  await add.getByPlaceholder('Ism familiya').fill('Tirik Ota');
  await add.getByLabel('Qarindoshlik turi').selectOption('OTA');
  await add.getByPlaceholder("Tug'ilgan yil").fill('1990');
  await add.getByRole('button', { name: /Qo/ }).click();
  await expect(page.getByText(`${nowYear - 1990} yosh`, { exact: true })).toBeVisible();

  // Vafot etgan a'zo — nechi yoshda vafot etgani
  await page.getByRole('button', { name: /Qarindosh/ }).click();
  await add.getByPlaceholder('Ism familiya').fill('Marhum Bobo');
  await add.getByLabel('Qarindoshlik turi').selectOption('BOBO');
  await add.getByPlaceholder("Tug'ilgan yil").fill('1930');
  await add.getByPlaceholder('Vafot yili').fill('1995');
  await add.getByRole('button', { name: /Qo/ }).click();
  await expect(page.getByText('65 yoshda vafot etgan')).toBeVisible();

  // Reload — yosh saqlangan yillardan qayta hisoblanadi
  await page.reload();
  await expect(page.getByText('65 yoshda vafot etgan')).toBeVisible();
});

test('a\'zoni tahrirlash va o\'chirish (serverda saqlanadi)', async ({ page }) => {
  const s = (Date.now() + 3).toString().slice(-7);
  await registerUser(page, {
    name: 'CRUD Tester',
    phone: `+99894${s}`,
    email: `crud-${s}@example.com`,
  });

  // Qarindosh qo'shamiz
  await page.getByRole('button', { name: /Qarindosh/ }).click();
  const add = page.getByRole('dialog', { name: /a'zosini qo/ });
  await add.getByPlaceholder('Ism familiya').fill('Eski Ism');
  await add.getByLabel('Qarindoshlik turi').selectOption('AKA');
  await add.getByRole('button', { name: /Qo/ }).click();
  await expect(page.getByText('Eski Ism')).toBeVisible();

  // --- TAHRIRLASH: tugunni tanlab, ismni o'zgartiramiz ---
  await page.getByText('Eski Ism').click();
  await page.getByRole('button', { name: 'Tahrirlash' }).click();
  const edit = page.getByRole('dialog', { name: /tahrirlash/ });
  await expect(edit.getByPlaceholder('Ism familiya')).toHaveValue('Eski Ism');
  await edit.getByPlaceholder('Ism familiya').fill('Yangi Ism');
  await edit.getByRole('button', { name: 'Saqlash' }).click();
  // Tanlangan tugun nomi kartada ham, amal panelida ham chiqadi — .first()
  await expect(page.getByText('Yangi Ism').first()).toBeVisible();

  // Reload — tahrir saqlangan
  await page.reload();
  await expect(page.getByText('Yangi Ism')).toBeVisible();
  await expect(page.getByText('Eski Ism')).toHaveCount(0);

  // --- O'CHIRISH: tanlab (profil panel), tasdiqlab o'chiramiz ---
  await page.getByText('Yangi Ism').first().click();
  // Panel'dagi o'chirish tugmasi (apostrof tipografik — regex bilan)
  await page.getByRole('button', { name: /chirish/ }).click();
  const confirm = page.getByRole('alertdialog');
  await confirm.getByRole('button', { name: /chirish/ }).click();
  await expect(page.getByText('Yangi Ism')).toHaveCount(0);

  // Reload — o'chirilgan holat saqlangan
  await page.reload();
  await expect(page.getByText('Yangi Ism')).toHaveCount(0);
});

test("tahrirda a'zoning kimligi (qarindoshligi) o'zgartiriladi", async ({ page }) => {
  const s = (Date.now() + 10).toString().slice(-7);
  await registerUser(page, {
    name: 'Rel Tester',
    phone: `+998340${s.slice(0, 6)}`,
    email: `rel-${s}@example.com`,
  });
  const add = page.getByRole('dialog', { name: /a'zosini qo/ });

  // Xato bilan "Aka" qilib qo'shamiz
  await page.getByRole('button', { name: /Qarindosh qo/ }).click();
  await add.getByPlaceholder('Ism familiya').fill('Test Odam');
  await add.getByLabel('Qarindoshlik turi').selectOption('AKA');
  await add.getByRole('button', { name: /^Qo/ }).click();
  // Kartaga aniqlashtiramiz (dropdown'da ham "Aka" bor)
  const card = page.locator('.react-flow__node').filter({ hasText: 'Test Odam' });
  await expect(card.getByText('Aka', { exact: true })).toBeVisible();

  // Kartani bosib, tahrirlab kimligini "Ota" ga o'zgartiramiz
  await page.getByText('Test Odam').click();
  await page.getByRole('button', { name: 'Tahrirlash' }).click();
  const edit = page.getByRole('dialog', { name: /tahrirlash/ });
  await edit.getByLabel('Qarindoshlik turi').selectOption('OTA');
  await edit.getByRole('button', { name: 'Saqlash' }).click();

  // Endi kartada "Ota" ko'rinadi ("Aka" emas), reload'dan keyin ham saqlangan
  await expect(card.getByText('Ota', { exact: true })).toBeVisible();
  await expect(card.getByText('Aka', { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(
    page.locator('.react-flow__node').filter({ hasText: 'Test Odam' }).getByText('Ota', { exact: true }),
  ).toBeVisible();
});

test('avtomatik tartiblash ishlaydi va saqlanadi', async ({ page }) => {
  const s = (Date.now() + 4).toString().slice(-7);
  await registerUser(page, {
    name: 'Layout Tester',
    phone: `+99895${s}`,
    email: `layout-${s}@example.com`,
  });

  // Ikki a'zo qo'shamiz (ota va farzand — turli avlodlar)
  const add = page.getByRole('dialog', { name: /a'zosini qo/ });
  await page.getByRole('button', { name: /Qarindosh/ }).click();
  await add.getByPlaceholder('Ism familiya').fill('Bobojon Ota');
  await add.getByLabel('Qarindoshlik turi').selectOption('OTA');
  await add.getByRole('button', { name: /Qo/ }).click();
  await expect(page.getByText('Bobojon Ota')).toBeVisible();

  await page.getByRole('button', { name: /Qarindosh/ }).click();
  await add.getByPlaceholder('Ism familiya').fill('Kichkina Ogil');
  await add.getByLabel('Qarindoshlik turi').selectOption('OGIL');
  await add.getByRole('button', { name: /Qo/ }).click();
  await expect(page.getByText('Kichkina Ogil')).toBeVisible();

  // Tartiblash tugmasi — barcha a'zolar joyida qoladi va reload'dan keyin saqlanadi
  await page.getByRole('button', { name: 'Tartiblash' }).click();
  await expect(page.getByText('Bobojon Ota')).toBeVisible();
  await expect(page.getByText('Kichkina Ogil')).toBeVisible();

  await page.reload();
  await expect(page.getByText('Bobojon Ota')).toBeVisible();
  await expect(page.getByText('Kichkina Ogil')).toBeVisible();
});

test('onamning ota-onasi -> Bobo/Buvi, onamning opasi -> Xola (ildizga nisbatan)', async ({
  page,
}) => {
  const s = (Date.now() + 6).toString().slice(-7);
  await registerUser(page, {
    name: 'Kinship Tester',
    phone: `+99897${s}`,
    email: `kin-${s}@example.com`,
  });
  const add = page.getByRole('dialog', { name: /a'zosini qo/ });

  // Onamni qo'shamiz (header orqali — o'zimga)
  await page.getByRole('button', { name: /Qarindosh qo/ }).click();
  await add.getByPlaceholder('Ism familiya').fill('Onam Ismi');
  await add.getByLabel('Qarindoshlik turi').selectOption('ONA');
  await add.getByRole('button', { name: /^Qo/ }).click();
  await expect(page.getByText('Onam Ismi')).toBeVisible();

  // Onamni bosib profil panelni ochamiz, "Onamga qarindosh qo'shish" bilan otasini qo'shamiz
  await page.getByText('Onam Ismi').click();
  const panel = page.locator('aside');
  await panel.getByRole('button', { name: /qarindosh qo/i }).click();
  await add.getByPlaceholder('Ism familiya').fill('Ona Otasi');
  await add.getByLabel('Qarindoshlik turi').selectOption('OTA');
  await add.getByRole('button', { name: /^Qo/ }).click();
  // Menga -> Bobo ("Ota" emas)
  await expect(page.getByText('Ona Otasi')).toBeVisible();
  await expect(page.getByText('Bobo', { exact: true }).first()).toBeVisible();

  // Onamga uning ONAsini ham qo'shamiz -> ona otasi bilan avtomatik BITTA kartada birlashadi
  await page.getByText('Onam Ismi').first().click();
  await panel.getByRole('button', { name: /qarindosh qo/i }).click();
  await add.getByPlaceholder('Ism familiya').fill('Ona Onasi');
  await add.getByLabel('Qarindoshlik turi').selectOption('ONA');
  await add.getByRole('button', { name: /^Qo/ }).click();
  await expect(page.getByText('Ona Onasi')).toBeVisible();

  // "Ona Otasi" (Bobo) va "Ona Onasi" (Buvi) bitta kartada — ♥ bilan
  const coupleCard = page.locator('.react-flow__node').filter({ hasText: 'Ona Otasi' });
  await expect(coupleCard.getByText('Ona Onasi')).toBeVisible();
  await expect(coupleCard.getByText('Buvi', { exact: true })).toBeVisible();

  // Reload'dan keyin ham birlashgan qoladi
  await page.reload();
  const couple2 = page.locator('.react-flow__node').filter({ hasText: 'Ona Otasi' });
  await expect(couple2.getByText('Ona Onasi')).toBeVisible();
});

test("tog'aning xotini -> Kelinoyi; xolaning eri -> Pochcha", async ({ page }) => {
  const s = (Date.now() + 12).toString().slice(-7);
  await registerUser(page, {
    name: 'Toga Tester',
    phone: `+998360${s.slice(0, 6)}`,
    email: `toga-${s}@example.com`,
  });
  const add = page.getByRole('dialog', { name: /a'zosini qo/ });
  const panel = page.locator('aside');

  // Tog'a va Xola qo'shamiz (header orqali — o'zimga)
  for (const [name, rel] of [
    ['Togam Ismi', 'TOGA'],
    ['Xolam Ismi', 'XOLA'],
  ] as const) {
    await page.getByRole('button', { name: /Qarindosh qo/ }).click();
    await add.getByPlaceholder('Ism familiya').fill(name);
    await add.getByLabel('Qarindoshlik turi').selectOption(rel);
    await add.getByRole('button', { name: /^Qo/ }).click();
    await expect(page.getByText(name)).toBeVisible();
  }

  // Tog'aga turmush o'rtog'i (xotin) -> Kelinoyi
  await page.getByText('Togam Ismi').first().click();
  await panel.getByRole('button', { name: /Togamga qarindosh/i }).click();
  await add.getByPlaceholder('Ism familiya').fill('Toga Xotini');
  await add.getByLabel('Qarindoshlik turi').selectOption('TURMUSH');
  await add.getByRole('button', { name: /^Qo/ }).click();
  const togaCard = page.locator('.react-flow__node').filter({ hasText: 'Togam Ismi' });
  await expect(togaCard.getByText('Kelinoyi', { exact: true })).toBeVisible();

  // Xolaga turmush o'rtog'i (er) -> Pochcha
  await page.getByText('Xolam Ismi').first().click();
  await panel.getByRole('button', { name: /Xolamga qarindosh/i }).click();
  await add.getByPlaceholder('Ism familiya').fill('Xola Eri');
  await add.getByLabel('Qarindoshlik turi').selectOption('TURMUSH');
  await add.getByRole('button', { name: /^Qo/ }).click();
  const xolaCard = page.locator('.react-flow__node').filter({ hasText: 'Xolam Ismi' });
  await expect(xolaCard.getByText('Pochcha', { exact: true })).toBeVisible();
});

test("boboning ikki xotini -> Buvi 1, Buvi 2 (turmush o'rtog'i emas)", async ({ page }) => {
  const s = (Date.now() + 11).toString().slice(-7);
  await registerUser(page, {
    name: 'Buvi Tester',
    phone: `+998350${s.slice(0, 6)}`,
    email: `buvi-${s}@example.com`,
  });
  const add = page.getByRole('dialog', { name: /a'zosini qo/ });
  const panel = page.locator('aside');

  // Bobomni qo'shamiz (header orqali — o'zimga)
  await page.getByRole('button', { name: /Qarindosh qo/ }).click();
  await add.getByPlaceholder('Ism familiya').fill('Bobom Ismi');
  await add.getByLabel('Qarindoshlik turi').selectOption('BOBO');
  await add.getByRole('button', { name: /^Qo/ }).click();
  await expect(page.getByText('Bobom Ismi')).toBeVisible();

  // Bobomga ikkita turmush o'rtog'i (xotin) qo'shamiz
  for (const wife of ['Birinchi Buvi', 'Ikkinchi Buvi']) {
    await page.getByText('Bobom Ismi').first().click();
    // Aynan bobomga qo'shish tugmasi (panelda boshqa a'zolarniki ham bo'lishi mumkin)
    await panel.getByRole('button', { name: /Bobomga qarindosh/i }).click();
    await add.getByPlaceholder('Ism familiya').fill(wife);
    await add.getByLabel('Qarindoshlik turi').selectOption('TURMUSH');
    await add.getByRole('button', { name: 'Ayol' }).click(); // xotin -> ayol
    await add.getByRole('button', { name: /^Qo/ }).click();
    await expect(page.locator('.react-flow__node').filter({ hasText: wife })).toBeVisible();
  }

  // Ikkalasi ham bobom kartasida "Buvi 1" va "Buvi 2" bo'lib ko'rinadi
  const card = page.locator('.react-flow__node').filter({ hasText: 'Bobom Ismi' });
  await expect(card.getByText('Buvi 1', { exact: true })).toBeVisible();
  await expect(card.getByText('Buvi 2', { exact: true })).toBeVisible();
});

test('turmush o\'rtoqlar bitta umumiy kartada birlashadi', async ({ page }) => {
  const s = (Date.now() + 7).toString().slice(-7);
  await registerUser(page, {
    name: 'Juft Tester',
    phone: `+99898${s}`,
    email: `couple-${s}@example.com`,
  });
  const add = page.getByRole('dialog', { name: /a'zosini qo/ });

  await page.getByRole('button', { name: /Qarindosh/ }).click();
  await add.getByPlaceholder('Ism familiya').fill('Rafiqam Ismi');
  await add.getByLabel('Qarindoshlik turi').selectOption('TURMUSH');
  await add.getByRole('button', { name: /Qo/ }).click();

  // "Juft Tester" va "Rafiqam Ismi" bir kartada — kartaga aniqlashtiramiz
  const coupleCard = page.locator('.react-flow__node').filter({ hasText: 'Juft Tester' });
  await expect(coupleCard.getByText('Rafiqam Ismi')).toBeVisible();
  await expect(coupleCard.getByText("Turmush o'rtog'i")).toBeVisible();

  // Reload'dan keyin ham birlashgan holda qoladi
  await page.reload();
  await expect(page.getByText('Rafiqam Ismi')).toBeVisible();
  await expect(page.getByText('Juft Tester').first()).toBeVisible();
});

test('bir nechta turmush o\'rtog\'i (qo\'sh xotinlar) bitta kartada birlashadi', async ({ page }) => {
  const s = (Date.now() + 9).toString().slice(-7);
  await registerUser(page, {
    name: 'Er Tester',
    phone: `+998330${s.slice(0, 6)}`,
    email: `poly-${s}@example.com`,
  });
  const add = page.getByRole('dialog', { name: /a'zosini qo/ });

  // Uch marta turmush o'rtog'i qo'shamiz. Hech narsa tanlanmagani uchun anchor —
  // root (Er Tester), demak uchala xotin ham uning kartasiga birlashadi.
  for (const wife of ['Birinchi Xotin', 'Ikkinchi Xotin', 'Uchinchi Xotin']) {
    await page.getByRole('button', { name: /Qarindosh/ }).click();
    await add.getByPlaceholder('Ism familiya').fill(wife);
    await add.getByLabel('Qarindoshlik turi').selectOption('TURMUSH');
    await add.getByRole('button', { name: /Qo/ }).click();
    await expect(page.getByText(wife)).toBeVisible();
  }

  // Uchala xotin ham bitta kartada (root tuguni ichida) ko'rinadi
  const card = page.locator('.react-flow__node').filter({ hasText: 'Er Tester' });
  await expect(card.getByText('Birinchi Xotin')).toBeVisible();
  await expect(card.getByText('Ikkinchi Xotin')).toBeVisible();
  await expect(card.getByText('Uchinchi Xotin')).toBeVisible();

  // Reload'dan keyin ham hammasi bitta kartada qoladi
  await page.reload();
  const card2 = page.locator('.react-flow__node').filter({ hasText: 'Er Tester' });
  await expect(card2.getByText('Birinchi Xotin')).toBeVisible();
  await expect(card2.getByText('Uchinchi Xotin')).toBeVisible();

  // Turmush o'rtog'iga ham qarindosh qo'shish mumkin (profil panelda har birida tugma bor)
  await card2.getByText('Birinchi Xotin').click();
  const panel = page.locator('aside');
  // Panelda ikkala odam uchun ham "qarindosh qo'shish" tugmasi bor
  await expect(panel.getByRole('button', { name: /qarindosh qo/i })).toHaveCount(4);
  // Ikkinchi xotinning qarindosh qo'shish tugmasini bosamiz (add — test boshida e'lon qilingan)
  await panel.getByRole('button', { name: /Ikkinchiga qarindosh/i }).click();
  await add.getByPlaceholder('Ism familiya').fill('Xotin Otasi');
  await add.getByLabel('Qarindoshlik turi').selectOption('OTA');
  await add.getByRole('button', { name: /^Qo/ }).click();
  await expect(page.getByText('Xotin Otasi')).toBeVisible();
});

test('kartani bosganda profil paneli ochiladi', async ({ page }) => {
  const s = (Date.now() + 8).toString().slice(-7);
  await registerUser(page, {
    name: 'Panel Tester',
    phone: `+99899${s}`,
    email: `panel-${s}@example.com`,
  });

  // O'z kartamni (header'dagi ism emas — doskadagi tugun) bosaman -> profil panel
  await page.locator('.react-flow__node').filter({ hasText: 'Panel Tester' }).click();
  const panel = page.locator('aside');
  await expect(panel.getByText('Profil')).toBeVisible();
  await expect(panel.getByText('Erkak')).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Tahrirlash' })).toBeVisible();
});

test('qidiruv orqali a\'zoni topish va unga o\'tish', async ({ page }) => {
  const s = (Date.now() + 9).toString().slice(-7);
  await registerUser(page, {
    name: 'Qidiruv Tester',
    phone: `+99897${s}`,
    email: `search-${s}@example.com`,
  });

  // Bir qarindosh qo'shamiz — keyin qidiramiz
  await page.getByRole('button', { name: /Qarindosh qo/ }).click();
  const add = page.getByRole('dialog', { name: /a'zosini qo/ });
  await add.getByPlaceholder('Ism familiya').fill('Akmaljon Karimov');
  await add.getByLabel('Qarindoshlik turi').selectOption('OTA');
  await add.getByRole('button', { name: /^Qo/ }).click();
  await expect(page.locator('.react-flow__node').filter({ hasText: 'Akmaljon Karimov' })).toBeVisible();

  // Header'dagi qidiruvга ism yozamiz -> natija chiqadi -> bosganда profil ochiladi
  const search = page.locator('header').getByPlaceholder(/qidirish/i);
  await search.fill('akmal');
  const option = page.getByRole('option').filter({ hasText: 'Akmaljon Karimov' });
  await expect(option).toBeVisible();
  await option.click();
  await expect(page.locator('aside').getByText('Akmaljon Karimov')).toBeVisible();

  // "Menga o'tish" — header'dagi ismni bosсам, o'zimning (root) profilim ochiladi
  await page.locator('header').getByRole('button', { name: /Qidiruv Tester/ }).click();
  // Profil paneli sarlavhasi (sidebar'даги ism emas — h3)
  await expect(page.getByRole('heading', { name: 'Qidiruv Tester' })).toBeVisible();
});

test('sidebar navigatsiyasi va sahifalar', async ({ page }) => {
  const s = (Date.now() + 10).toString().slice(-7);
  await registerUser(page, {
    name: 'Sidebar Tester',
    phone: `+99896${s}`,
    email: `sidebar-${s}@example.com`,
  });
  const nav = page.locator('aside').first(); // Sidebar (birinchi aside)

  // Oila a'zolarim
  await nav.getByRole('link', { name: "Oila a'zolarim" }).click();
  await expect(page).toHaveURL('/oila');
  await expect(page.getByRole('heading', { name: "Oila a'zolarim" })).toBeVisible();
  await expect(page.locator('main').getByText('Sidebar Tester').first()).toBeVisible();

  // Media galereya
  await nav.getByRole('link', { name: 'Media galereya' }).click();
  await expect(page).toHaveURL('/media');
  await expect(page.getByRole('heading', { name: 'Media Galereya' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Yangi yuklash/ })).toBeVisible();

  // Shajara AI
  await nav.getByRole('link', { name: 'Shajara AI' }).click();
  await expect(page).toHaveURL('/ai');
  await expect(page.getByRole('heading', { name: 'Tez orada' })).toBeVisible();

  // Sozlamalar
  await nav.getByRole('link', { name: 'Sozlamalar' }).click();
  await expect(page).toHaveURL('/sozlamalar');
  await expect(page.getByRole('heading', { name: 'Sozlamalar' })).toBeVisible();
  await expect(page.getByRole('heading', { name: "Profil ma'lumotlari" })).toBeVisible();

  // Doskaga qaytish
  await nav.getByRole('link', { name: 'Shajara doskasi' }).click();
  await expect(page).toHaveURL('/');

  // Chiqish — sidebar'даги logout tugmasi
  await nav.getByRole('button', { name: 'Chiqish' }).click();
  await expect(page).toHaveURL('/login');
});

test("oila a'zolarim doskasi faqat yaqin oilani ko'rsatadi", async ({ page }) => {
  const s = (Date.now() + 11).toString().slice(-7);
  await registerUser(page, {
    name: 'Filter Tester',
    phone: `+99895${s}`,
    email: `filter-${s}@example.com`,
  });
  const add = page.getByRole('dialog', { name: /a'zosini qo/ });

  // Ota (yaqin) qo'shamiz
  await page.getByRole('button', { name: /Qarindosh qo/ }).click();
  await add.getByPlaceholder('Ism familiya').fill('Otajon Ismi');
  await add.getByLabel('Qarindoshlik turi').selectOption('OTA');
  await add.getByRole('button', { name: /^Qo/ }).click();
  await expect(page.locator('.react-flow__node').filter({ hasText: 'Otajon Ismi' })).toBeVisible();

  // Tog'a (yaqin EMAS) qo'shamiz
  await page.getByRole('button', { name: /Qarindosh qo/ }).click();
  await add.getByPlaceholder('Ism familiya').fill('Togajon Ismi');
  await add.getByLabel('Qarindoshlik turi').selectOption('TOGA');
  await add.getByRole('button', { name: /^Qo/ }).click();
  await expect(page.locator('.react-flow__node').filter({ hasText: 'Togajon Ismi' })).toBeVisible();

  // "Oila a'zolarim" bo'limiga o'tamiz — faqat yaqin oila
  await page.locator('aside').first().getByRole('link', { name: "Oila a'zolarim" }).click();
  await expect(page).toHaveURL('/oila');
  await expect(page.locator('.react-flow__node').filter({ hasText: 'Filter Tester' })).toBeVisible();
  await expect(page.locator('.react-flow__node').filter({ hasText: 'Otajon Ismi' })).toBeVisible();
  // Tog'a bu bo'limда ko'rinmaydi (yaqin oila emas)
  await expect(page.locator('.react-flow__node').filter({ hasText: 'Togajon Ismi' })).toHaveCount(0);

  // Umumiy doskaga qaytsak — Tog'a bor
  await page.locator('aside').first().getByRole('link', { name: 'Shajara doskasi' }).click();
  await expect(page.locator('.react-flow__node').filter({ hasText: 'Togajon Ismi' })).toBeVisible();
});

test('sozlamalar — profil ma\'lumoti ko\'rinadi va saqlanadi', async ({ page }) => {
  const s = (Date.now() + 12).toString().slice(-7);
  const em = `settings-${s}@example.com`;
  await registerUser(page, { name: 'Sozlama Tester', phone: `+99894${s}`, email: em });

  await page.locator('aside').first().getByRole('link', { name: 'Sozlamalar' }).click();
  await expect(page).toHaveURL('/sozlamalar');
  await expect(page.getByRole('heading', { name: 'Sozlamalar' })).toBeVisible();

  // Email (read-only) haqiqiy qiymat bilan ko'rinadi
  await expect(page.getByLabel('Email')).toHaveValue(em);

  // Familiyani o'zgartirib saqlaymiz -> doskadagi ismim yangilanadi
  await page.getByLabel('Familiya').fill('Yangiov');
  await page.getByRole('button', { name: 'Saqlash' }).click();
  await expect(page.getByText('Saqlandi ✓')).toBeVisible();

  await page.locator('aside').first().getByRole('link', { name: 'Shajara doskasi' }).click();
  await expect(page.locator('.react-flow__node').filter({ hasText: 'Sozlama Yangiov' })).toBeVisible();
});

test("taklif kodi bilan register — VIEWER sifatida daraxtni ko'radi", async ({ page }) => {
  const s = (Date.now() + 15).toString().slice(-7);
  await registerUser(page, { name: 'Egam Testov', phone: `+99891${s}`, email: `owner-${s}@example.com` });

  // Egа daraxtiga qarindosh qo'shadi (viewer BUNI ham ko'rishi kerak)
  await page.getByRole('button', { name: /Qarindosh/ }).click();
  const add = page.getByRole('dialog', { name: /a'zosini qo/ });
  await add.getByPlaceholder('Ism familiya').fill('Farzand Testov');
  await add.getByLabel('Qarindoshlik turi').selectOption('OGIL');
  await add.getByRole('button', { name: /Qo/ }).click();
  await expect(page.getByText('Farzand Testov')).toBeVisible();

  // O'z kartasini ochib ulashish kodini olamiz (faqat egaga ko'rinadi)
  await page.locator('.react-flow__node').filter({ hasText: 'Egam Testov' }).click();
  const code = (await page.locator('aside code').first().innerText()).trim();
  expect(code).toHaveLength(12);

  // Chiqish
  await page.locator('aside').first().getByRole('button', { name: 'Chiqish' }).click();
  await expect(page).toHaveURL('/login');

  // Yangi foydalanuvchi kod bilan ro'yxatdan o'tadi
  const g = (Date.now() + 16).toString().slice(-7);
  await page.goto('/register');
  await page.getByPlaceholder('Ism familiya').fill('Mehmon Testov');
  await page.getByPlaceholder('+998 90 123 45 67').fill(`+99895${g}`);
  await page.getByPlaceholder('Email manzil').fill(`guest-${g}@example.com`);
  await page.getByPlaceholder('Parol', { exact: true }).fill('Test1234');
  await page.getByPlaceholder('Parolni tasdiqlang').fill('Test1234');
  await page.getByPlaceholder(/Ulashish kodi/).fill(code);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: /yxatdan o/ }).click();
  await expect(page).toHaveURL('/', { timeout: 15_000 });

  // VIEWER egaming TO'LIQ daraxtini ko'radi (o'zini emas — barcha qarindoshlar)
  await expect(page.locator('.react-flow__node').filter({ hasText: 'Egam Testov' })).toBeVisible();
  await expect(page.locator('.react-flow__node').filter({ hasText: 'Farzand Testov' })).toBeVisible();
  // O'zining bo'sh daraxti ("Mehmon Testov" root) ko'rinmasligi kerak
  await expect(page.locator('.react-flow__node').filter({ hasText: 'Mehmon Testov' })).toHaveCount(0);
  // Tartiblash endi VIEWER uchun ham ishlaydi (lokal, serverga saqlanmaydi)
  await expect(page.getByRole('button', { name: /Tartiblash/ })).toBeEnabled();

  // Egaming kartasini o'chira OLMAYDI (o'zi qo'shmagan) — O'chirish tugmasi yo'q
  await page.locator('.react-flow__node').filter({ hasText: 'Egam Testov' }).click();
  await expect(page.getByRole('button', { name: /chirish/ })).toHaveCount(0);

  // O'ZI qo'shgan kartaga TO'LIQ huquq (qo'shadi -> o'chiradi)
  await page.getByRole('button', { name: /Qarindosh/ }).click();
  const vadd = page.getByRole('dialog', { name: /a'zosini qo/ });
  await vadd.getByPlaceholder('Ism familiya').fill('Mehmon Qoshgani');
  await vadd.getByLabel('Qarindoshlik turi').selectOption('AKA');
  await vadd.getByRole('button', { name: /Qo/ }).click();
  await expect(page.getByText('Mehmon Qoshgani')).toBeVisible();
  await page.getByText('Mehmon Qoshgani').first().click();
  await page.getByRole('button', { name: /chirish/ }).click(); // o'zi qo'shganini o'chira oladi
  await page.getByRole('alertdialog').getByRole('button', { name: /chirish/ }).click();
  await expect(page.getByText('Mehmon Qoshgani')).toHaveCount(0);
});

test('sidebar xotira (storage) bloki ko\'rinadi', async ({ page }) => {
  const s = (Date.now() + 14).toString().slice(-7);
  await registerUser(page, { name: 'Xotira Tester', phone: `+99892${s}`, email: `storage-${s}@example.com` });

  const nav = page.locator('aside').first();
  await expect(nav.getByText('Xotira', { exact: true })).toBeVisible();
  // "X / 100 MB foydalanilgan"
  await expect(nav.getByText(/100 MB foydalanilgan/)).toBeVisible();
});

test('media galereya — bo\'sh holat va yuklash oynasi', async ({ page }) => {
  const s = (Date.now() + 13).toString().slice(-7);
  await registerUser(page, { name: 'Media Tester', phone: `+99893${s}`, email: `media-${s}@example.com` });

  await page.locator('aside').first().getByRole('link', { name: 'Media galereya' }).click();
  await expect(page).toHaveURL('/media');
  await expect(page.getByRole('heading', { name: 'Media Galereya' })).toBeVisible();
  // Yangi foydalanuvchi -> media yo'q
  await expect(page.getByText(/Hali media/)).toBeVisible();
  // "Yangi yuklash" -> yuklash oynasi ochiladi (rasm/video/hujjat)
  await page.getByRole('button', { name: /Yangi yuklash/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Media yuklash' });
  await expect(dialog.getByRole('heading', { name: 'Media yuklash' })).toBeVisible();
  await expect(dialog.getByText('Fayl tanlash')).toBeVisible();
  await dialog.getByRole('button', { name: 'Bekor qilish' }).click();
  await expect(dialog).toBeHidden();
});
