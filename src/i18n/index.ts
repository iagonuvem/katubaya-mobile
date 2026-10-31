/**
 * i18n configuration. Default: Portuguese (Brazil).
 * Each screen keeps its strings in its own file under locales/<lang>/; the files are merged here.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

type Tree = { [key: string]: string | Tree };

const merge = (files: Record<string, { default: Tree }>): Tree =>
  Object.values(files).reduce<Tree>((acc, mod) => ({ ...acc, ...mod.default }), {});

export const ptBR = merge(import.meta.glob<{ default: Tree }>('./locales/pt-BR/*.json', { eager: true }));
export const en = merge(import.meta.glob<{ default: Tree }>('./locales/en/*.json', { eager: true }));

export const resources = {
  'pt-BR': { translation: ptBR },
  en: { translation: en },
} as const;

const stored = typeof localStorage !== 'undefined' ? (() => { try { return localStorage.getItem('katubaya.lang'); } catch { return null; } })() : null;

i18n.use(initReactI18next).init({
  resources,
  lng: stored === 'en' ? 'en' : 'pt-BR',
  fallbackLng: 'pt-BR',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

i18n.on('languageChanged', lng => {
  document.documentElement.lang = lng;
  try { localStorage.setItem('katubaya.lang', lng); } catch { /* private mode */ }
});

export default i18n;
