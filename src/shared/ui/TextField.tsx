import { forwardRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { EyeIcon, EyeOffIcon } from '@/shared/ui/icons';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  icon: ReactNode;
  error?: string;
  isPassword?: boolean;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ icon, error, isPassword, type, className = '', ...rest }, ref) => {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);
    const inputType = isPassword ? (visible ? 'text' : 'password') : type;

    return (
      <div className={className}>
        <div
          className={`flex items-center gap-3 rounded-field border bg-white px-4 py-3.5 transition-colors focus-within:border-brand-600 ${
            error ? 'border-red-400' : 'border-neutral-200'
          }`}
        >
          <span className="shrink-0 text-brand-800">{icon}</span>
          <input
            ref={ref}
            type={inputType}
            className="w-full bg-transparent text-[15px] text-brand-900 outline-none"
            {...rest}
          />
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              aria-label={visible ? t('shared.textField.hidePassword') : t('shared.textField.showPassword')}
              onClick={() => setVisible((v) => !v)}
              className="-m-2 shrink-0 p-2 text-neutral-500 transition-colors hover:text-brand-700"
            >
              {visible ? <EyeIcon /> : <EyeOffIcon />}
            </button>
          )}
        </div>
        {error && <p className="mt-1.5 px-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  },
);
TextField.displayName = 'TextField';
