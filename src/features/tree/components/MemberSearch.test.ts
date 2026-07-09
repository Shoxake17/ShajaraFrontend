import { describe, expect, it } from 'vitest';
import { filterMembers, normalize, type SearchItem } from './MemberSearch';

const items: SearchItem[] = [
  { id: '1', name: 'Akmal Karimov', relation: 'Ota' },
  { id: '2', name: "O'g'iloy Ismoilova", relation: 'Opa' },
  { id: '3', name: 'Malika Karimova', relation: 'Ona' },
  { id: '4', name: 'Bobur Aliyev', relation: 'Bobo' },
];

describe('filterMembers', () => {
  it('ism bo\'yicha topadi (registrga bog\'liq emas)', () => {
    expect(filterMembers(items, 'akmal').map((r) => r.id)).toEqual(['1']);
    expect(filterMembers(items, 'AKMAL').map((r) => r.id)).toEqual(['1']);
  });

  it('familiya bo\'yicha topadi (substring)', () => {
    expect(filterMembers(items, 'karimov').map((r) => r.id).sort()).toEqual(['1', '3']);
  });

  it('bo\'sh so\'rov -> bo\'sh natija', () => {
    expect(filterMembers(items, '')).toEqual([]);
    expect(filterMembers(items, '   ')).toEqual([]);
  });

  it('apostrof shakllari birlashtiriladi (o\' = oʻ = o`)', () => {
    expect(filterMembers(items, "o'g'iloy").map((r) => r.id)).toEqual(['2']);
    expect(filterMembers(items, 'oʻgʻiloy').map((r) => r.id)).toEqual(['2']);
  });

  it('natijalar soni cheklanadi (DoS himoyasi)', () => {
    const many: SearchItem[] = Array.from({ length: 100 }, (_, i) => ({
      id: String(i),
      name: 'Test Odam',
      relation: 'Aka',
    }));
    expect(filterMembers(many, 'test', 8)).toHaveLength(8);
  });

  it('regex belgilari oddiy matn sifatida (ReDoS/injection yo\'q)', () => {
    // "(a+)+" kabi kiritish regex sifatida emas, oddiy substring sifatida ishlaydi
    expect(filterMembers(items, '(a+)+').map((r) => r.id)).toEqual([]);
    expect(filterMembers(items, '.*').map((r) => r.id)).toEqual([]);
  });

  it('normalize bir nechta bo\'shliqni birlashtiradi', () => {
    expect(normalize('  Ali   Vali  ')).toBe('ali vali');
  });
});
