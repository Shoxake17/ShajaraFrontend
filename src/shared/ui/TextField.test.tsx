import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TextField } from './TextField';
import { LockIcon } from './icons';

describe('TextField', () => {
  it('placeholder va xato xabarini ko\'rsatadi', () => {
    render(<TextField icon={<LockIcon />} placeholder="Parol" error="Majburiy maydon" />);
    expect(screen.getByPlaceholderText('Parol')).toBeInTheDocument();
    expect(screen.getByText('Majburiy maydon')).toBeInTheDocument();
  });

  it("parol maydonida ko'z tugmasi ko'rinishni almashtiradi", () => {
    render(<TextField icon={<LockIcon />} isPassword placeholder="Parol" />);
    const input = screen.getByPlaceholderText('Parol');
    expect(input).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: "Parolni ko'rsatish" }));
    expect(input).toHaveAttribute('type', 'text');

    fireEvent.click(screen.getByRole('button', { name: 'Parolni yashirish' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('oddiy maydonda ko\'z tugmasi chiqmaydi', () => {
    render(<TextField icon={<LockIcon />} placeholder="Email" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
