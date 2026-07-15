import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "@/app/globals.css";

import { StrictMode } from "react";
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

import DashboardPage from "@/app/page";
import FlashcardsPage from "@/app/flashcards/page";
import NewFlashcardPage from "@/app/flashcards/new/page";
import BaralhosPage from "@/app/baralhos/page";
import BaralhoDetailPage from "@/app/baralhos/[id]/page";
import NotesPage from "@/app/notes/page";
import NewNotePage from "@/app/notes/new/page";
import NoteDetailPage from "@/app/notes/[id]/page";
import GraphPage from "@/app/graph/page";
import GraphDetailPage from "@/app/graph/[id]/page";
import VRPage from "@/app/vr/[id]/page";
import SettingsPage from "@/app/settings/page";
import LoginPage from "@/app/login/page";
import RegisterPage from "@/app/register/page";
import QuestoesPage from "@/app/questions/page";
import NewQuestaoPage from "@/app/questions/new/page";
import ProvasPage from "@/app/provas/page";
import NewProvaPage from "@/app/provas/new/page";
import ProvaDetailPage from "@/app/provas/[id]/page";

const AUTH_PATHS = ["/login", "/register"];

// Gate de autenticação (substitui o middleware proxy.ts): sem token vai p/ login.
function RequireAuth({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
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

function App() {
  return (
    <AppShell authPaths={AUTH_PATHS}>
      <TooltipProvider>
        <Routes>
          <Route path="/login" element={<RedirectIfAuthed><LoginPage /></RedirectIfAuthed>} />
          <Route path="/register" element={<RedirectIfAuthed><RegisterPage /></RedirectIfAuthed>} />
          <Route path="/" element={<RequireAuth><DashboardPage /></RequireAuth>} />
          <Route path="/flashcards" element={<RequireAuth><FlashcardsPage /></RequireAuth>} />
          <Route path="/flashcards/new" element={<RequireAuth><NewFlashcardPage /></RequireAuth>} />
          <Route path="/baralhos" element={<RequireAuth><BaralhosPage /></RequireAuth>} />
          <Route path="/baralhos/:id" element={<RequireAuth><BaralhoDetailPage /></RequireAuth>} />
          <Route path="/notes" element={<RequireAuth><NotesPage /></RequireAuth>} />
          <Route path="/notes/new" element={<RequireAuth><NewNotePage /></RequireAuth>} />
          <Route path="/notes/:id" element={<RequireAuth><NoteDetailPage /></RequireAuth>} />
          <Route path="/graph" element={<RequireAuth><GraphPage /></RequireAuth>} />
          <Route path="/graph/:id" element={<RequireAuth><GraphDetailPage /></RequireAuth>} />
          <Route path="/vr/:id" element={<RequireAuth><VRPage /></RequireAuth>} />
          <Route path="/questions" element={<RequireAuth><QuestoesPage /></RequireAuth>} />
          <Route path="/questions/new" element={<RequireAuth><NewQuestaoPage /></RequireAuth>} />
          <Route path="/provas" element={<RequireAuth><ProvasPage /></RequireAuth>} />
          <Route path="/provas/new" element={<RequireAuth><NewProvaPage /></RequireAuth>} />
          <Route path="/provas/:id" element={<RequireAuth><ProvaDetailPage /></RequireAuth>} />
          <Route path="/settings" element={<RequireAuth><SettingsPage /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
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
