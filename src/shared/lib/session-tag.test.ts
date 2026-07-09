import { beforeEach, describe, expect, it } from 'vitest';
import { getSessionTag } from './session-tag';

describe('getSessionTag', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('birinchi chaqiruvda yangi teg yaratadi va sessionStorage-ga saqlaydi', () => {
    const tag = getSessionTag();
    expect(tag).toMatch(/^[0-9a-f-]{36}$/i);
    expect(sessionStorage.getItem('shajara_tab_id')).toBe(tag);
  });

  it('keyingi chaqiruvlarda bir xil tegni qaytaradi (tab davomida barqaror)', () => {
    const first = getSessionTag();
    const second = getSessionTag();
    expect(second).toBe(first);
  });

  it("sessionStorage tozalansa (yangi tab simulyatsiyasi) — yangi teg yaratadi", () => {
    const first = getSessionTag();
    sessionStorage.clear();
    const second = getSessionTag();
    expect(second).not.toBe(first);
  });
});
