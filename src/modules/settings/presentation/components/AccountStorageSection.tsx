import { useEffect, useState } from "react";
import type { AccountStorageCategory, AccountStorageUsage } from "@contracts/account-storage";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/link";
import { getToken } from "@/lib/api";
import type { AccountStorageReader } from "../../application/ports/settings.port";
import { settingsHttp } from "../../infra/http";

const categories: Record<AccountStorageCategory, { label: string; color: string }> = {
  content: { label: "Conteúdo e imagens", color: "bg-sky-500" },
  study: { label: "Histórico e planos de estudo", color: "bg-emerald-500" },
  account: { label: "Conta e configurações", color: "bg-amber-500" },
  technical: { label: "Dados técnicos", color: "bg-violet-500" },
};

const byteUnits = ["B", "kB", "MB", "GB", "TB"];
const byteNumber = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

function formatStorageBytes(value: number): string {
  const unit = Math.min(byteUnits.length - 1, Math.floor(Math.log10(Math.max(1, value)) / 3));
  return `${byteNumber.format(value / 1000 ** unit)} ${byteUnits[unit]}`;
}

type StorageReading = { status: "loading" | "error" } | { status: "ready"; usage: AccountStorageUsage };

export function AccountStorageSection({
  reader = settingsHttp, signedIn = Boolean(getToken()),
}: { reader?: AccountStorageReader; signedIn?: boolean } = {}) {
  const [reading, setReading] = useState<StorageReading>({ status: "loading" });
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!signedIn) return;
    let active = true;
    reader.getStorageUsage()
      .then((usage) => { if (active) setReading({ status: "ready", usage }); })
      .catch(() => { if (active) setReading({ status: "error" }); });
    return () => { active = false; };
  }, [reader, refresh, signedIn]);

  function refreshUsage(): void {
    setReading({ status: "loading" });
    setRefresh((value) => value + 1);
  }

  return (
    <section className="space-y-4 rounded-xl border bg-card p-5">
      {!signedIn ? <StorageSignIn /> : <StorageReadingView reading={reading} refresh={refreshUsage} />}
    </section>
  );
}

function StorageSignIn() {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Entre na sua conta para consultar o uso no servidor.</p>
      <Button variant="outline" render={<Link href="/login?callbackUrl=%2Fsettings%2Farmazenamento" />}>Entrar no servidor</Button>
    </div>
  );
}

function StorageReadingView({ reading, refresh }: { reading: StorageReading; refresh: () => void }) {
  if (reading.status === "loading") return <p role="status" className="text-sm">Calculando espaço no servidor…</p>;
  if (reading.status === "error") return (
    <div className="space-y-3">
      <p role="alert" className="text-sm">Não foi possível consultar o servidor. Confira a conexão e tente novamente.</p>
      <Button variant="outline" size="sm" onClick={refresh}>Tentar de novo</Button>
    </div>
  );
  if (reading.status !== "ready") return null;
  return <StorageBreakdown usage={reading.usage} refresh={refresh} />;
}

function StorageBreakdown({ usage, refresh }: { usage: AccountStorageUsage; refresh: () => void }) {
  const entries = (Object.keys(categories) as AccountStorageCategory[]).map((category) => ({
    ...categories[category], category, bytes: usage.categories.find((entry) => entry.category === category)?.bytes ?? 0,
  }));
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm text-muted-foreground">Uso estimado</h2>
          <p className="text-3xl font-semibold tabular-nums">{formatStorageBytes(usage.totalBytes)}</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh}>Atualizar</Button>
      </div>
      {usage.totalBytes > 0 && (
        <div aria-hidden="true" className="flex h-2 overflow-hidden rounded-full bg-muted">
          {entries.map(({ category, color, bytes }) =>
            <div key={category} className={color} style={{ width: `${100 * bytes / usage.totalBytes}%` }} />)}
        </div>
      )}
      <dl className="space-y-2">
        {entries.map(({ category, label, color, bytes }) => (
          <div key={category} className="flex items-center justify-between gap-2 text-sm">
            <dt className="flex items-center gap-2"><span aria-hidden="true" className={`size-2 rounded-full ${color}`} />{label}</dt>
            <dd className="tabular-nums">{formatStorageBytes(bytes)}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted-foreground">Estimativa dos dados da conta no banco, sem considerar o vault local, índices ou backups.</p>
    </>
  );
}
