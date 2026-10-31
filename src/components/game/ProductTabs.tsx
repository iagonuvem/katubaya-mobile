import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/** Produtos | Lotes de Animais: the two halves of the collection */
export function ProductTabs({ current }: { current: 'products' | 'animals' }) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t('collection.sections')} className="kb-segs">
      <Link to="/produtos" className={`kb-seg ${current === 'products' ? 'kb-seg-on' : ''}`} aria-current={current === 'products' ? 'page' : undefined}>{t('collection.tabProducts')}</Link>
      <Link to="/animais" className={`kb-seg ${current === 'animals' ? 'kb-seg-on' : ''}`} aria-current={current === 'animals' ? 'page' : undefined}>{t('collection.tabAnimals')}</Link>
    </nav>
  );
}
