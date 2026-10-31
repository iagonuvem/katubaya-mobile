/** Ajustes: the farm's chest (backup), the farm itself, notifications, appearance and about */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFarm, useNow } from '@/hooks/useFarm';
import { calendarDays, plotZones, type NoticeCategory } from '@/domain/rules/farm';
import { APP_VERSION } from '@/domain/contracts';
import { settingsRepository } from '@/data/repositories';
import { exportPack } from '@/data/actions';
import { GameToast, ScreenHeader } from '@/components/game/Shell';
import { Icon } from '@/components/game/Icon';
import { Loading } from '@/components/game/bits';
import { showToast } from '@/components/game/toast';

const CATEGORIES: NoticeCategory[] = ['paiol', 'talhao', 'animal', 'feira', 'bau'];

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const data = useFarm();
  const now = useNow();
  const [farm, setFarm] = useState<{ name: string; contact: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (data && !farm) setFarm({ name: data.settings.farmName, contact: data.settings.contactInfo });
  }, [data, farm]);
  useEffect(() => {
    navigator.serviceWorker?.getRegistration().then(r => setOffline(!!r?.active)).catch(() => setOffline(false));
  }, []);
  if (!data || !farm) return <Loading />;

  const s = data.settings;
  const since = s.lastExportAt ? calendarDays(s.lastExportAt, now) : undefined;
  const muted = new Set(s.mutedNotifications ?? []);
  const pack = async (type: 'availability' | 'full') => {
    setBusy(type);
    try {
      const r = await exportPack(type);
      showToast(t('settings.saved', { file: r.filename }));
    } catch {
      showToast(t('settings.exportError'));
    } finally {
      setBusy(null);
    }
  };
  const saveFarm = () => settingsRepository.update({ farmName: farm.name.trim(), contactInfo: farm.contact.trim() });
  const toggleNotice = (c: NoticeCategory) => {
    const next = new Set(muted);
    if (next.has(c)) next.delete(c); else next.add(c);
    settingsRepository.update({ mutedNotifications: [...next] });
  };
  const setLang = (lng: 'pt-BR' | 'en') => {
    i18n.changeLanguage(lng);
    settingsRepository.setLocale(lng);
  };

  const group = 'flex flex-col gap-3 rounded-[20px] border border-line bg-surface-raised p-4';
  const packBtn = 'flex min-h-[72px] items-center gap-3 rounded-2xl border-[1.5px] border-line bg-surface px-3.5 py-3 text-left text-ink transition-transform active:translate-y-0.5';

  return (
    <main className="kb-screen kb-screen-flow !gap-3.5">
      <ScreenHeader title={t('settings.title')} back={{ to: '/', label: t('paiol.backToFarm') }} />

      <section className={group} aria-labelledby="bau-t" style={{ background: 'var(--river-soft)', borderColor: 'transparent' }}>
        <div className="flex flex-col">
          <h2 id="bau-t" className="kb-h3">{t('settings.chest')}</h2>
          <span className="text-sm leading-5">{since === undefined ? t('settings.chestNever') : t('settings.chestLast', { count: since })} {t('settings.chestRitual')}</span>
        </div>
        <button type="button" className={packBtn} style={{ boxShadow: '0 3px 0 var(--line)' }} onClick={() => pack('availability')} disabled={!!busy} aria-busy={busy === 'availability'}>
          <span className="flex h-12 w-12 flex-none items-center justify-center rounded-[14px] bg-canopy text-canopy-on"><Icon name="download" /></span>
          <span className="flex flex-1 flex-col"><span className="font-medium">{t('settings.packFeira')}</span><span className="text-[13px] leading-[18px] text-ink-muted">{t('settings.packFeiraHint')}</span></span>
        </button>
        <button type="button" className={packBtn} style={{ boxShadow: '0 3px 0 var(--line)' }} onClick={() => pack('full')} disabled={!!busy} aria-busy={busy === 'full'}>
          <span className="flex h-12 w-12 flex-none items-center justify-center rounded-[14px] border-[1.5px] border-line-strong bg-surface-raised text-ink"><Icon name="chest" /></span>
          <span className="flex flex-1 flex-col">
            <span className="font-medium">{t('settings.packFull')}</span>
            <span className="text-[13px] leading-[18px] text-ink-muted">{t('settings.packFullHint', { crops: data.crops.length, count: data.harvests.length })}</span>
          </span>
        </button>
        <span className="kb-hint">{t('settings.chestNote')}</span>
      </section>

      <section className={group} aria-labelledby="sitio-t">
        <h2 id="sitio-t" className="kb-h3">{t('settings.farm')}</h2>
        <label className="flex flex-col gap-1 text-sm text-ink-muted">{t('stall.farmName')}
          <input className="kb-field !min-h-12 !rounded-xl !bg-surface" type="text" value={farm.name} onChange={e => setFarm({ ...farm, name: e.target.value })} onBlur={saveFarm} /></label>
        <label className="flex flex-col gap-1 text-sm text-ink-muted">{t('stall.contact')}
          <input className="kb-field !min-h-12 !rounded-xl !bg-surface" type="tel" placeholder="(XX) XXXXX-XXXX" value={farm.contact} onChange={e => setFarm({ ...farm, contact: e.target.value })} onBlur={saveFarm} /></label>
        <Link to="/" className="kb-inline text-[15px]">{t('settings.zones', { count: plotZones(data).length })}</Link>
      </section>

      <section className={group} aria-labelledby="avisos-t">
        <h2 id="avisos-t" className="kb-h3">{t('settings.notices')}</h2>
        {CATEGORIES.map(c => (
          <div key={c} className="flex items-center justify-between gap-3">
            <span className="flex flex-col"><span>{t(`notices.filter.${c}`)}</span><span className="kb-hint">{t(`settings.noticeHint.${c}`)}</span></span>
            <button type="button" role="switch" aria-checked={!muted.has(c)} aria-label={t('settings.noticeToggle', { name: t(`notices.filter.${c}`) })} className="kb-switch" onClick={() => toggleNotice(c)}><span /></button>
          </div>
        ))}
      </section>

      <section className={group} aria-labelledby="look-t">
        <h2 id="look-t" className="kb-h3">{t('settings.look')}</h2>
        <div className="kb-segs !rounded-[14px]" role="radiogroup" aria-label={t('settings.theme')}>
          {(['light', 'dark', 'system'] as const).map(v => (
            <button key={v} type="button" role="radio" aria-checked={s.theme === v} className={`kb-seg !rounded-[10px] ${s.theme === v ? 'kb-seg-on' : ''}`} onClick={() => settingsRepository.setTheme(v)}>{t(`settings.themes.${v}`)}</button>
          ))}
        </div>
        <div className="kb-segs !rounded-[14px]" role="radiogroup" aria-label={t('settings.language')}>
          {(['pt-BR', 'en'] as const).map(v => (
            <button key={v} type="button" role="radio" aria-checked={i18n.language === v} className={`kb-seg !rounded-[10px] ${i18n.language === v ? 'kb-seg-on' : ''}`} onClick={() => setLang(v)} lang={v}>{v === 'en' ? 'English' : 'Português'}</button>
          ))}
        </div>
        <span className="kb-hint">{t('settings.themeHint')}</span>
      </section>

      <section className={group} aria-labelledby="about-t">
        <h2 id="about-t" className="kb-h3">{t('settings.about')}</h2>
        <div className="flex items-center justify-between gap-2 text-[15px]"><span className="text-ink-muted">{t('settings.version')}</span><span className="kb-mono">{APP_VERSION}</span></div>
        <div className="flex items-center justify-between gap-2 text-[15px]">
          <span className="text-ink-muted">{t('settings.offline')}</span>
          <span className="rounded px-2 py-px text-[13px] font-medium" style={offline ? { background: 'var(--canopy-soft)', color: 'var(--canopy)' } : { background: 'var(--amber-soft)', color: 'var(--amber)' }}>
            {offline ? t('settings.offlineReady') : t('settings.offlinePending')}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 text-[15px]"><span className="text-ink-muted">{t('settings.account')}</span><span className="text-right">{t('settings.noAccount')}</span></div>
        <Link to="/regras" className="kb-inline text-[15px]">{t('settings.rules')}</Link>
      </section>
      <GameToast bottom={24} />
    </main>
  );
}
