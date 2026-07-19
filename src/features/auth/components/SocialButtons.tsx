// features/auth/components/SocialButtons.tsx
import { useTranslation } from 'react-i18next';
import { useGoogleAuth } from '@/features/auth/hooks/useGoogleAuth';
import { useTheme } from '@/shared/hooks/useTheme';
import { AppleIcon, GoogleIcon, TelegramIcon } from '@/shared/ui/icons';

interface SocialButtonsProps {
  /** Register kabi zich sahifalar uchun kichikroq tugmalar (mobilda) */
  dense?: boolean;
}

/**
 * Ijtimoiy kirish tugmalari. Google — to'liq ishlaydi (akkaunt tanlash popupi).
 * Apple/Telegram — keyingi bosqichda.
 * Mobilda ixcham (faqat ikonka) doiralar; `lg:` dan boshlab (desktop) —
 * ikonka + yorliq bilan teng kenglikdagi tugmalar qatori.
 */
export function SocialButtons({ dense }: SocialButtonsProps) {
  const { t } = useTranslation();
  const { signInWithGoogle, loading, error } = useGoogleAuth();
  const { theme } = useTheme();
  const size = dense ? 'h-11 w-16 lg:h-12' : 'h-14 w-20 lg:h-12';

  return (
    <div>
      <div className="flex justify-center gap-3">
        <button
          type="button"
          aria-label={t('auth.social.google')}
          onClick={signInWithGoogle}
          disabled={loading}
          className={`flex ${size} items-center justify-center gap-2 rounded-field border border-neutral-200 bg-white transition-all hover:border-brand-300 hover:shadow-card active:scale-95 disabled:cursor-wait disabled:opacity-60 lg:flex-1 lg:px-3`}
        >
          {loading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-200 border-t-brand-700" />
          ) : (
            <>
              <GoogleIcon />
              <span className="hidden text-sm font-medium text-brand-900 lg:inline">Google</span>
            </>
          )}
        </button>
        <button
          type="button"
          aria-label={t('auth.social.apple')}
          disabled
          className={`flex ${size} cursor-not-allowed items-center justify-center gap-2 rounded-field border border-neutral-200 bg-white opacity-50 lg:flex-1 lg:px-3`}
        >
          <AppleIcon className={theme === 'dark' ? 'text-white' : 'text-black'} />
          <span className="hidden text-sm font-medium text-brand-900 lg:inline">Apple</span>
        </button>
        <button
          type="button"
          aria-label={t('auth.social.telegram')}
          disabled
          className={`flex ${size} cursor-not-allowed items-center justify-center gap-2 rounded-field border border-neutral-200 bg-white opacity-50 lg:flex-1 lg:px-3`}
        >
          <TelegramIcon />
          <span className="hidden text-sm font-medium text-brand-900 lg:inline">Telegram</span>
        </button>
      </div>
      {error && <p className="mt-2 text-center text-xs text-red-500">{error}</p>}
    </div>
  );
}
