// Detecta se o servidor está rodando dentro do app desktop (Electron).
// O processo do servidor Next é iniciado pelo Electron com DESKTOP_APP=1.
// O modo de armazenamento em ARQUIVOS (vault Markdown) só é permitido aqui:
// num web app hospedado, o "sistema de arquivos" é o do servidor, não o do
// usuário — então fica bloqueado.
export function isDesktopApp(): boolean {
  return process.env.DESKTOP_APP === "1";
}
