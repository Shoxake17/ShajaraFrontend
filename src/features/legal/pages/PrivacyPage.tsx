// features/legal/pages/PrivacyPage.tsx
import { LegalLayout } from '../components/LegalLayout';
import { PRIVACY_CONTENT } from '../legalContent';
import { useLanguage } from '@/shared/hooks/useLanguage';

export function PrivacyPage() {
  const { language } = useLanguage();
  return <LegalLayout doc={PRIVACY_CONTENT[language]} />;
}
