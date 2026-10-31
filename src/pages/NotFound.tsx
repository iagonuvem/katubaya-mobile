import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { sprite } from '@/components/game/Shell';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <main className="kb-screen kb-screen-flow items-center justify-center text-center">
      <img src={sprite('broto-avisando')} alt="" className="h-32 w-auto" />
      <h1 className="kb-title">{t('notFound.title')}</h1>
      <Link to="/" className="kb-tap kb-tap-go max-w-xs">{t('notFound.backHome')}</Link>
    </main>
  );
}
