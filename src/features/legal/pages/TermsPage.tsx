// features/legal/pages/TermsPage.tsx
import { LegalLayout } from '../components/LegalLayout';
import { TERMS_CONTENT } from '../legalContent';
import { useLanguage } from '@/shared/hooks/useLanguage';

export function TermsPage() {
  const { language } = useLanguage();
  return <LegalLayout doc={TERMS_CONTENT[language]} />;
}
