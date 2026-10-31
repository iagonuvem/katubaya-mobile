/** Montar a banca: farm name, contact, header and footer of every market message */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFarm } from '@/hooks/useFarm';
import { saveStall } from '@/data/actions';
import { ScreenHeader, sprite } from '@/components/game/Shell';
import { Loading } from '@/components/game/bits';
import { showToast } from '@/components/game/toast';

export default function StallPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const data = useFarm();
  const [form, setForm] = useState<{ farmName: string; contactInfo: string; header: string; footer: string } | null>(null);

  useEffect(() => {
    if (data && !form) {
      setForm({
        farmName: data.settings.farmName || data.config?.farmName || '',
        contactInfo: data.settings.contactInfo || data.config?.contactInfo || '',
        header: data.config?.defaultHeaderText ?? '',
        footer: data.config?.defaultFooterText ?? '',
      });
    }
  }, [data, form]);
  if (!data || !form) return <Loading />;

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm({ ...form, [k]: e.target.value });
  const save = async () => {
    try {
      await saveStall(form);
      showToast(t('stall.saved'));
      navigate('/feira');
    } catch {
      showToast(t('common.error'));
    }
  };

  return (
    <main className="kb-screen kb-screen-flow">
      <ScreenHeader title={t('stall.title')} back={{ to: '/feira', label: t('stall.back') }} />

      <div className="relative flex h-[120px] items-end gap-1 overflow-hidden rounded-[22px] bg-canopy-soft px-4">
        <img src={sprite('agricultora')} alt="" className="h-[110px] w-auto" />
        <img src={sprite('caixa-banana')} alt="" className="mb-1.5 h-[52px] w-auto" />
        <img src={sprite('caixa-mandioca')} alt="" className="mb-1.5 h-[46px] w-auto" />
        <span className="ml-auto max-w-[140px] self-center text-sm leading-5">{t('stall.hero')}</span>
      </div>

      <section className="flex flex-col gap-3.5">
        <h2 className="kb-h3">{t('stall.farm')}</h2>
        <label className="flex flex-col gap-1.5"><span className="text-[15px] font-medium">{t('stall.farmName')}</span>
          <input className="kb-field" type="text" value={form.farmName} onChange={set('farmName')} autoComplete="organization" /></label>
        <label className="flex flex-col gap-1.5"><span className="text-[15px] font-medium">{t('stall.contact')}</span>
          <input className="kb-field" type="tel" inputMode="tel" placeholder="(XX) XXXXX-XXXX" value={form.contactInfo} onChange={set('contactInfo')} autoComplete="tel" /></label>
      </section>

      <section className="flex flex-col gap-3.5">
        <h2 className="kb-h3">{t('stall.message')}</h2>
        <label className="flex flex-col gap-1.5"><span className="text-[15px] font-medium">{t('stall.header')}</span>
          <input className="kb-field" type="text" placeholder={t('stall.headerPlaceholder')} value={form.header} onChange={set('header')} />
          <span className="kb-hint">{t('stall.headerHint')}</span></label>
        <label className="flex flex-col gap-1.5"><span className="text-[15px] font-medium">{t('stall.footer')}</span>
          <textarea className="kb-field" rows={3} value={form.footer} onChange={set('footer')} />
          <span className="kb-hint">{t('stall.footerHint')}</span></label>
      </section>

      <div className="mt-auto flex flex-col gap-2.5">
        <span className="kb-hint text-center">{t('stall.after')}</span>
        <button type="button" className="kb-tap kb-tap-go" onClick={save}>{t('stall.save')}</button>
      </div>
    </main>
  );
}
