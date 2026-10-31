import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider, useTheme } from 'next-themes';
import { useLiveQuery } from 'dexie-react-hooks';
import { settingsRepository } from '@/data/repositories';
import { GameToast, MochilaProvider } from '@/components/game/Shell';
import MapPage from './pages/MapPage';
const HarvestPage = lazy(() => import('./pages/HarvestPage'));
const PaiolPage = lazy(() => import('./pages/PaiolPage'));
const AdjustPage = lazy(() => import('./pages/AdjustPage'));
const TracePage = lazy(() => import('./pages/TracePage'));
const FeiraPage = lazy(() => import('./pages/FeiraPage'));
const StallPage = lazy(() => import('./pages/StallPage'));
const CollectionPage = lazy(() => import('./pages/CollectionPage'));
const CardPage = lazy(() => import('./pages/CardPage'));
const HerdPage = lazy(() => import('./pages/HerdPage'));
const AnimalLotPage = lazy(() => import('./pages/AnimalLotPage'));
const AnimalLotFormPage = lazy(() => import('./pages/AnimalLotFormPage'));
const AdjustHeadsPage = lazy(() => import('./pages/AdjustHeadsPage'));
const ProcessPage = lazy(() => import('./pages/ProcessPage'));
const PlotPage = lazy(() => import('./pages/PlotPage'));
const PlantPage = lazy(() => import('./pages/PlantPage'));
const NewPlotPage = lazy(() => import('./pages/NewPlotPage'));
const ObservePage = lazy(() => import('./pages/ObservePage'));
const NoticesPage = lazy(() => import('./pages/NoticesPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const RulesPage = lazy(() => import('./pages/RulesPage'));
const NotFound = lazy(() => import('./pages/NotFound'));

/** Appearance follows the system unless Ajustes › Aparência says otherwise */
function ThemeSync() {
  const settings = useLiveQuery(() => settingsRepository.get(), []);
  const { setTheme } = useTheme();
  useEffect(() => {
    if (settings) setTheme(settings.theme);
  }, [settings, setTheme]);
  return null;
}

/** Each screen starts at the top, like a native push */
function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <ThemeSync />
    <BrowserRouter>
      <ScrollTop />
      <MochilaProvider>
        <Suspense fallback={<main className="kb-screen kb-screen-flow" aria-busy="true" />}>
        <Routes>
          <Route path="/" element={<MapPage />} />
          <Route path="/colher" element={<HarvestPage />} />
          <Route path="/paiol" element={<PaiolPage />} />
          <Route path="/paiol/ajustar" element={<AdjustPage />} />
          <Route path="/paiol/lote/:lotId" element={<TracePage />} />
          <Route path="/feira" element={<FeiraPage />} />
          <Route path="/feira/banca" element={<StallPage />} />
          <Route path="/produtos" element={<CollectionPage />} />
          <Route path="/produtos/nova" element={<CardPage />} />
          <Route path="/produtos/:id" element={<CardPage />} />
          <Route path="/animais" element={<HerdPage />} />
          <Route path="/animais/novo" element={<AnimalLotFormPage />} />
          <Route path="/animais/:id" element={<AnimalLotPage />} />
          <Route path="/animais/:id/editar" element={<AnimalLotFormPage />} />
          <Route path="/animais/:id/ajustar" element={<AdjustHeadsPage />} />
          <Route path="/processar" element={<ProcessPage />} />
          <Route path="/talhao/novo" element={<NewPlotPage />} />
          <Route path="/talhao/:id" element={<PlotPage />} />
          <Route path="/talhao/:id/plantar" element={<PlantPage />} />
          <Route path="/observar" element={<ObservePage />} />
          <Route path="/avisos" element={<NoticesPage />} />
          <Route path="/ajustes" element={<SettingsPage />} />
          <Route path="/regras" element={<RulesPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        <GameToast />
      </MochilaProvider>
    </BrowserRouter>
  </ThemeProvider>
);

export default App;
