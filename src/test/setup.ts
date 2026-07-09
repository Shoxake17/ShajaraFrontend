import '@testing-library/jest-dom/vitest';

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
