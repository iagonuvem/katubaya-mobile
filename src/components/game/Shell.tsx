/**
 * Screen chrome shared by every screen of the farm game: header, bottom navigation with the
 * raised action button, bottom sheets and the toast.
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon, type IconName } from './Icon';
import { useToast, useToastOffset } from './toast';

// ============================================================================
// Header
// ============================================================================

interface ScreenHeaderProps {
  title: ReactNode;
  back?: { to: string; label: string; icon?: 'back' | 'close' } | { onClick: () => void; label: string; icon?: 'back' | 'close' };
  eyebrow?: ReactNode;
  sub?: ReactNode;
  right?: ReactNode;
  size?: 'lg' | 'md';
  titleId?: string;
}

export function ScreenHeader({ title, back, eyebrow, sub, right, size = 'lg', titleId }: ScreenHeaderProps) {
  const icon = <Icon name={back?.icon ?? 'back'} size={22} />;
  return (
    <header className="flex items-center gap-3">
      {back && ('to' in back
        ? <Link to={back.to} aria-label={back.label} className="kb-icon-btn">{icon}</Link>
        : <button type="button" onClick={back.onClick} aria-label={back.label} className="kb-icon-btn">{icon}</button>)}
      <div className="flex min-w-0 flex-1 flex-col">
        {eyebrow && <span className="text-[13px] leading-[18px] text-ink-muted">{eyebrow}</span>}
        <h1 id={titleId} className={`${size === 'lg' ? 'kb-title' : 'kb-title-sm'} truncate`}>{title}</h1>
        {sub && <span className="kb-sub">{sub}</span>}
      </div>
      {right}
    </header>
  );
}

// ============================================================================
// Quick actions sheet ("mochila") — opened by the raised button
// ============================================================================

const MochilaContext = createContext<{ open: () => void }>({ open: () => {} });
export const useMochila = () => useContext(MochilaContext);

export function MochilaProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const open = useCallback(() => setOpen(true), []);
  return (
    <MochilaContext.Provider value={{ open }}>
      {children}
      {isOpen && <Mochila onClose={() => setOpen(false)} />}
    </MochilaContext.Provider>
  );
}

const MOCHILA: { to: string; key: string; icon: IconName; tone: 'amber' | 'canopy' | 'river' | 'muted' }[] = [
  { to: '/paiol/ajustar', key: 'adjust', icon: 'box', tone: 'amber' },
  { to: '/animais', key: 'animals', icon: 'cattle', tone: 'canopy' },
  { to: '/processar', key: 'process', icon: 'process', tone: 'river' },
  { to: '/produtos', key: 'product', icon: 'cards', tone: 'river' },
  { to: '/feira/banca', key: 'stall', icon: 'stall', tone: 'canopy' },
  { to: '/talhao/novo', key: 'zone', icon: 'pin', tone: 'muted' },
];

const TONE_BG: Record<string, string> = {
  amber: 'bg-amber-soft text-amber', canopy: 'bg-canopy-soft text-canopy', river: 'bg-river-soft text-river', muted: 'bg-surface-sunken text-ink',
};

function Mochila({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <BottomSheet onClose={onClose} labelledBy="mochila-t" overlay variant="modal">
      <div className="flex items-center gap-3">
        <h2 id="mochila-t" className="m-0 flex-1 text-[24px] font-medium leading-[30px]">{t('mochila.title')}</h2>
        <button type="button" onClick={onClose} aria-label={t('common.close')} className="kb-icon-btn" data-autofocus>
          <Icon name="close" size={22} />
        </button>
      </div>
      <Link to="/colher" onClick={onClose} className="flex min-h-[88px] items-center gap-3.5 rounded-[20px] bg-canopy px-4 py-3 text-canopy-on no-underline transition-transform active:translate-y-1" style={{ boxShadow: '0 5px 0 var(--canopy-edge)' }}>
        <img src={sprite('caixa-banana')} alt="" className="w-16 flex-none" />
        <span className="flex flex-1 flex-col">
          <span className="text-[22px] font-medium leading-7">{t('mochila.produce')}</span>
          <span className="text-sm opacity-90">{t('mochila.produceHint')}</span>
        </span>
        <Icon name="chevron" strokeWidth={2} />
      </Link>
      <div className="grid grid-cols-2 gap-2.5">
        {MOCHILA.map(a => (
          <Link key={a.key} to={a.to} onClick={onClose}
            className="flex min-h-[120px] flex-col items-start gap-2 rounded-[18px] border-[1.5px] border-line bg-surface p-3 text-ink no-underline transition-transform active:translate-y-0.5"
            style={{ boxShadow: '0 3px 0 var(--line)' }}>
            <span className={`flex h-11 w-11 flex-none items-center justify-center rounded-[14px] ${TONE_BG[a.tone]}`}><Icon name={a.icon} /></span>
            <span className="flex flex-col gap-0.5">
              <span className="text-base font-medium leading-5">{t(`mochila.${a.key}`)}</span>
              <span className="text-[13px] leading-[18px] text-ink-muted">{t(`mochila.${a.key}Hint`)}</span>
            </span>
          </Link>
        ))}
      </div>
    </BottomSheet>
  );
}

// ============================================================================
// Bottom sheet
// ============================================================================

interface BottomSheetProps {
  children: ReactNode;
  onClose: () => void;
  labelledBy: string;
  /** 'map' floats above the bottom bar over the live map; 'modal' covers the screen with a scrim */
  variant?: 'map' | 'modal';
  overlay?: boolean;
}

/** Bottom sheet with a grabber you can drag down to dismiss, Escape to close and focus moved inside */
export function BottomSheet({ children, onClose, labelledBy, variant = 'map' }: BottomSheetProps) {
  const ref = useRef<HTMLElement>(null);
  const drag = useRef<{ y: number; dy: number } | null>(null);
  const [dy, setDy] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.activeElement as HTMLElement | null;
    (ref.current?.querySelector('[data-autofocus]') as HTMLElement | null)?.focus();
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [onClose]);

  const onDown = (e: React.PointerEvent) => { drag.current = { y: e.clientY, dy: 0 }; (e.target as HTMLElement).setPointerCapture(e.pointerId); };
  const onMove = (e: React.PointerEvent) => { if (!drag.current) return; drag.current.dy = Math.max(0, e.clientY - drag.current.y); setDy(drag.current.dy); };
  const onUp = () => { if (!drag.current) return; const d = drag.current.dy; drag.current = null; if (d > 80) onClose(); else setDy(0); };

  const modal = variant === 'modal';
  return (
    <>
      {modal && <div aria-hidden="true" onClick={onClose} className="fixed inset-0 z-50 backdrop-blur-[1px]" style={{ background: 'var(--scrim)', animation: 'kb-fade 200ms ease-out' }} />}
      <section
        ref={ref}
        role="dialog"
        aria-modal={modal || undefined}
        aria-labelledby={labelledBy}
        className={`kb-sheet fixed left-1/2 z-50 w-full max-w-[480px] overflow-y-auto ${modal ? 'bottom-0 rounded-t-[28px] px-4 pt-3' : 'px-4 pt-2.5'}`}
        style={{
          transform: `translate(-50%, ${dy}px)`,
          transition: drag.current ? 'none' : 'transform 200ms ease',
          bottom: modal ? 0 : 'calc(88px + var(--safe-area-bottom))',
          maxHeight: modal ? 'calc(100dvh - 24px)' : 'min(470px, calc(100dvh - 200px))',
          paddingBottom: modal ? 'calc(28px + var(--safe-area-bottom))' : 18,
          boxShadow: modal ? 'var(--shadow-floating)' : undefined,
        }}
      >
        <div className="-mb-1 flex cursor-grab touch-none justify-center py-1" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} aria-hidden="true">
          <span className="kb-grab" />
        </div>
        {children}
      </section>
    </>
  );
}

/** Header row of a map sheet: title, subtitle and the close button */
export function SheetHead({ id, title, sub, onClose }: { id: string; title: ReactNode; sub?: ReactNode; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h2 id={id} className="m-0 text-[22px] font-medium leading-7">{title}</h2>
        {sub && <span className="kb-sub">{sub}</span>}
      </div>
      <button type="button" className="kb-icon-btn !bg-surface" onClick={onClose} aria-label={t('common.close')} data-autofocus>
        <Icon name="close" size={20} />
      </button>
    </div>
  );
}

// ============================================================================
// Bottom navigation
// ============================================================================

export function BottomNav({ active, onSend }: { active?: 'sitio'; onSend?: () => void }) {
  const { t } = useTranslation();
  const { open } = useMochila();
  useToastOffset(104);
  const send = (
    <>
      <Icon name="copy" />
      {t('nav.send')}
    </>
  );
  return (
    <nav aria-label={t('nav.label')} className="kb-nav">
      <Link to="/" className={`kb-navb ${active === 'sitio' ? 'kb-navb-on' : ''}`} aria-current={active === 'sitio' ? 'page' : undefined}>
        <Icon name="home" />
        {t('nav.farm')}
      </Link>
      <button type="button" className="kb-fab" aria-label={t('nav.actions')} aria-haspopup="dialog" onClick={open}>
        <Icon name="plus" size={32} strokeWidth={2.2} />
      </button>
      {onSend
        ? <button type="button" className="kb-navb" onClick={onSend}>{send}</button>
        : <Link to="/feira" className="kb-navb">{send}</Link>}
    </nav>
  );
}

// ============================================================================
// Toast
// ============================================================================

/** Rendered once in App; sits 24px up, or above the bottom bar when one sets --toast-bottom */
export function GameToast() {
  const toast = useToast();
  if (!toast) return null;
  return (
    <div key={toast.id} role="status" className="kb-toast" style={{ bottom: 'calc(var(--toast-bottom, 24px) + var(--safe-area-bottom))' }}>
      <Icon name="check" size={18} strokeWidth={2} />
      {toast.text}
    </div>
  );
}

// ============================================================================
// Sprites
// ============================================================================

const SPRITES = import.meta.glob<string>('@/assets/game/*.{webp,svg}', { eager: true, import: 'default', query: '?url' });

export type SpriteName =
  | 'agricultora' | 'operadora' | 'carregador' | 'cliente' | 'paiol' | 'industria' | 'galinheiro'
  | 'caixa-banana' | 'caixa-cacau' | 'caixa-mandioca'
  | 'broto-tranquilo' | 'broto-explicando' | 'broto-comemorando' | 'broto-avisando' | 'logo' | 'grafismo';

export function sprite(name: SpriteName): string {
  const hit = Object.entries(SPRITES).find(([path]) => path.endsWith(`/${name}.webp`) || path.endsWith(`/${name}.svg`));
  return hit ? hit[1] : '';
}

/** Crate art for a product, when one was drawn */
export function cropSprite(name: string): string | undefined {
  const n = name.toLowerCase();
  if (n.includes('banana')) return sprite('caixa-banana');
  if (n.includes('cacau')) return sprite('caixa-cacau');
  if (n.includes('mandioca')) return sprite('caixa-mandioca');
  return undefined;
}
