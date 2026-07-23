// dd/mm curto para eixos de tempo (as datas vêm como YYYY-MM-DD).
export function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}
