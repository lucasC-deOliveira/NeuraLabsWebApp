// slug único estilo Zettelkasten: timestamp de criação + título normalizado.
// Compartilhado entre as actions e os backends de armazenamento do grafo.
export function buildNotaSlug(titulo: string, when: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp =
    `${when.getFullYear()}${pad(when.getMonth() + 1)}${pad(when.getDate())}` +
    `${pad(when.getHours())}${pad(when.getMinutes())}${pad(when.getSeconds())}`;
  const slugTitulo = titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slugTitulo ? `${stamp}-${slugTitulo}` : stamp;
}
