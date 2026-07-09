import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SegmentedCodeInput } from './SegmentedCodeInput';

function boxes() {
  return [1, 2, 3, 4, 5, 6].map((n) => screen.getByLabelText(`Kod, ${n}-xona`));
}

describe('SegmentedCodeInput', () => {
  it('uzunlikka mos sonda alohida katakcha chizadi (har biriga bitta raqam)', () => {
    render(<SegmentedCodeInput value="" onChange={() => {}} />);
    const inputs = boxes();
    expect(inputs).toHaveLength(6);
    inputs.forEach((input) => expect(input).toHaveAttribute('maxlength', '1'));
  });

  it('bitta raqam kiritilgach avtomatik keyingi katakchaga o\'tadi', () => {
    const onChange = vi.fn();
    render(<SegmentedCodeInput value="" onChange={onChange} />);
    const inputs = boxes();

    fireEvent.change(inputs[0], { target: { value: '5' } });
    expect(onChange).toHaveBeenCalledWith('5');
  });

  it('Backspace bo\'sh katakchada oldingisiga qaytaradi va uni tozalaydi', () => {
    const onChange = vi.fn();
    const { rerender } = render(<SegmentedCodeInput value="12" onChange={onChange} />);
    const inputs = boxes();

    // 3-katakcha (index 2) bo'sh — Backspace bossak 2-katakchaga (index 1) fokus o'tishi kerak
    fireEvent.keyDown(inputs[2], { key: 'Backspace' });
    expect(document.activeElement).toBe(inputs[1]);

    rerender(<SegmentedCodeInput value="12" onChange={onChange} />);
  });

  it("kodni bir vaqtda joylashtirsa (paste) barcha katakchalarga tarqaladi", () => {
    const onChange = vi.fn();
    render(<SegmentedCodeInput value="" onChange={onChange} />);
    const inputs = boxes();

    fireEvent.paste(inputs[0], { clipboardData: { getData: () => '654321' } });
    expect(onChange).toHaveBeenCalledWith('654321');
  });

  it('xato xabarini ko\'rsatadi', () => {
    render(<SegmentedCodeInput value="" onChange={() => {}} error="Kod noto'g'ri" />);
    expect(screen.getByText("Kod noto'g'ri")).toBeInTheDocument();
  });

  it('faqat raqamlarni qabul qiladi — harflar e\'tiborga olinmaydi', () => {
    const onChange = vi.fn();
    render(<SegmentedCodeInput value="" onChange={onChange} />);
    const inputs = boxes();

    fireEvent.change(inputs[0], { target: { value: 'a' } });
    expect(onChange).not.toHaveBeenCalledWith(expect.stringContaining('a'));
  });
});
