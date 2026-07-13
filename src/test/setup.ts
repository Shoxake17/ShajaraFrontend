import '@testing-library/jest-dom/vitest';
// i18next'ni bootstrap qilamiz — aks holda useTranslation() testlarda xom
// tarjima kalitlarini ("auth.login.submit" kabi) qaytarib, matnga qarab
// tekshiradigan (screen.getByText) testlarni sindirib qo'yardi.
import '@/i18n';

// jsdom has no real viewport, so it doesn't implement matchMedia. Default to
// "no match" (mobile) for every query, matching a narrow real-world viewport.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
