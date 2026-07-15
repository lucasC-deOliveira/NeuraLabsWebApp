// Download de um JSON gerado no cliente (export dos baralhos). Vive na camada de
// apresentação por ser puro efeito de DOM — a montagem do payload é domain/.

/** Dispara o download de `data` serializado como JSON, com o nome dado. */
export function downloadJson(fileName: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

/** Lê um arquivo escolhido pelo usuário e devolve o JSON já parseado. */
export async function readJsonFile(file: File): Promise<unknown> {
  return JSON.parse(await file.text());
}
