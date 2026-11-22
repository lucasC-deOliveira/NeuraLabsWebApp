import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "@/app/globals.css";

import { lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { ColorThemeProvider } from "@/components/color-theme-provider";
import { CardStyleProvider } from "@/components/flashcard/CardStyleProvider";
import { PomodoroProvider } from "@/components/page-header/PomodoroProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/app-shell";
import { getToken } from "@/lib/api";
import { isDesktop } from "@/lib/vault-bridge";

import DashboardPage from "@/app/page";
import FlashcardsPage from "@/app/flashcards/page";
import NewFlashcardPage from "@/app/flashcards/new/page";
import BaralhosPage from "@/app/baralhos/page";
import BaralhoDetailPage from "@/app/baralhos/[id]/page";
import OfflineBaralhosPage from "@/app/baralhos/offline/page";
import NotesPage from "@/app/notes/page";
import NewNotePage from "@/app/notes/new/page";
import NoteDetailPage from "@/app/notes/[id]/page";
import GraphPage from "@/app/graph/page";
import GraphDetailPage from "@/app/graph/[id]/page";
import VRPage from "@/app/vr/[id]/page";
import SettingsPage from "@/app/settings/page";
import SettingsSectionPage from "@/app/settings/[secao]/page";
import LoginPage from "@/app/login/page";
import RegisterPage from "@/app/register/page";
import QuestoesPage from "@/app/questions/page";
import NewQuestaoPage from "@/app/questions/new/page";
import ProvasPage from "@/app/provas/page";
import NewProvaPage from "@/app/provas/new/page";
import ProvaDetailPage from "@/app/provas/[id]/page";
import AnalyticsPage from "@/app/analytics/page";
import EstudoPage from "@/app/estudo/page";
import { VaultStudySyncPrompt } from "@/modules/study/presentation/VaultStudySyncPrompt";

const AUTH_PATHS = ["/login", "/register"];

// Gate de autenticação (substitui o middleware proxy.ts): sem token vai p/ login.
function RequireAuth({ children, desktopLocal = false }: { children: React.ReactNode; desktopLocal?: boolean }) {
  const loc = useLocation();
  if (desktopLocal && isDesktop()) return <>{children}</>;
  if (!getToken()) {
    const callbackUrl = encodeURIComponent(loc.pathname);
    return <Navigate to={`/login?callbackUrl=${callbackUrl}`} replace />;
  }
  return <>{children}</>;
}

// Já autenticado não deve ver login/registro.
function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  if (getToken()) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const BibliographyReaderPage = lazy(() => import("@/modules/reader/presentation/BibliographyReaderPage"));

function App() {
  const { pathname } = useLocation();
  const pauseSyncPrompt = AUTH_PATHS.includes(pathname)
    || pathname === "/settings" || pathname.startsWith("/settings/");
  return (
    <AppShell authPaths={AUTH_PATHS}>
      <TooltipProvider>
        <Routes>
          <Route path="/login" element={<RedirectIfAuthed><LoginPage /></RedirectIfAuthed>} />
          <Route path="/register" element={<RedirectIfAuthed><RegisterPage /></RedirectIfAuthed>} />
          <Route path="/" element={<RequireAuth desktopLocal><DashboardPage /></RequireAuth>} />
          <Route path="/flashcards" element={<RequireAuth desktopLocal><FlashcardsPage /></RequireAuth>} />
          <Route path="/flashcards/new" element={<RequireAuth desktopLocal><NewFlashcardPage /></RequireAuth>} />
          <Route path="/estudo" element={<RequireAuth desktopLocal><EstudoPage /></RequireAuth>} />
          <Route path="/baralhos" element={<RequireAuth desktopLocal><BaralhosPage /></RequireAuth>} />
          <Route path="/baralhos/offline" element={<RequireAuth><OfflineBaralhosPage /></RequireAuth>} />
          <Route path="/baralhos/:id" element={<RequireAuth desktopLocal><BaralhoDetailPage /></RequireAuth>} />
          <Route path="/biblioteca" element={<RequireAuth desktopLocal><Suspense fallback={<p role="status" className="p-6">Abrindo biblioteca…</p>}><BibliographyReaderPage /></Suspense></RequireAuth>} />
          <Route path="/notes" element={<RequireAuth><NotesPage /></RequireAuth>} />
          <Route path="/notes/new" element={<RequireAuth><NewNotePage /></RequireAuth>} />
          <Route path="/notes/:id" element={<RequireAuth><NoteDetailPage /></RequireAuth>} />
          <Route path="/graph" element={<RequireAuth desktopLocal><GraphPage /></RequireAuth>} />
          <Route path="/graph/:id" element={<RequireAuth desktopLocal><GraphDetailPage /></RequireAuth>} />
          <Route path="/vr/:id" element={<RequireAuth><VRPage /></RequireAuth>} />
          <Route path="/questions" element={<RequireAuth><QuestoesPage /></RequireAuth>} />
          <Route path="/questions/new" element={<RequireAuth><NewQuestaoPage /></RequireAuth>} />
          <Route path="/provas" element={<RequireAuth><ProvasPage /></RequireAuth>} />
          <Route path="/provas/new" element={<RequireAuth><NewProvaPage /></RequireAuth>} />
          <Route path="/provas/:id" element={<RequireAuth><ProvaDetailPage /></RequireAuth>} />
          <Route path="/analytics" element={<RequireAuth><AnalyticsPage /></RequireAuth>} />
          <Route path="/settings" element={<RequireAuth desktopLocal><SettingsPage /></RequireAuth>} />
          <Route path="/settings/:secao" element={<RequireAuth desktopLocal><SettingsSectionPage /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        {isDesktop() && <VaultStudySyncPrompt paused={pauseSyncPrompt} />}
        <Toaster />
      </TooltipProvider>
    </AppShell>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <ColorThemeProvider>
          <CardStyleProvider>
            {/* Acima do App: o pomodoro do header não pode zerar ao navegar. */}
            <PomodoroProvider>
              <App />
            </PomodoroProvider>
          </CardStyleProvider>
        </ColorThemeProvider>
      </ThemeProvider>
    </HashRouter>
  </StrictMode>,
);
