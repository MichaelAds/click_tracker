"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import ClickButton, { ButtonKey } from "@/components/ClickButton";
import ExportButton from "@/components/ExportButton";

type ButtonStats = {
  count: number;
  firstClickTime: number | null;
  lastClickTime: number | null;
  accumulatedMs: number;
  pressStartedAt: number | null;
};

type Stats = Record<ButtonKey, ButtonStats>;

type SequenceGroup = {
  value: string;
  valid: boolean;
};

const EMPTY_STATS: Stats = {
  A: { count: 0, firstClickTime: null, lastClickTime: null, accumulatedMs: 0, pressStartedAt: null },
  B: { count: 0, firstClickTime: null, lastClickTime: null, accumulatedMs: 0, pressStartedAt: null },
  C: { count: 0, firstClickTime: null, lastClickTime: null, accumulatedMs: 0, pressStartedAt: null },
  D: { count: 0, firstClickTime: null, lastClickTime: null, accumulatedMs: 0, pressStartedAt: null },
};

const BUTTON_COLORS: Record<ButtonKey, string> = {
  A: "bg-[#0066ff]",
  B: "bg-[#00cc66]",
  C: "bg-[#ff6600]",
  D: "bg-[#888899]",
};

export default function Page() {
  const [sessionTitle, setSessionTitle] = useState<string>("");
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [sequenceBuffer, setSequenceBuffer] = useState<string[]>([]);
  const [sequenceGroups, setSequenceGroups] = useState<SequenceGroup[]>([]);
  const [now, setNow] = useState<number>(() => Date.now());

  // bufferRef is the synchronous source of truth for the in-progress group.
  // It exists so we can decide "did this click complete a group?" inside the
  // click handler instead of inside a setState updater — updaters can be
  // double-invoked in React StrictMode (dev), and calling setSequenceGroups
  // from within setSequenceBuffer's updater caused groups to register twice.
  const bufferRef = useRef<string[]>([]);

  const hasActivePress =
    stats.A.pressStartedAt !== null ||
    stats.B.pressStartedAt !== null ||
    stats.C.pressStartedAt !== null ||
    stats.D.pressStartedAt !== null;

  useEffect(() => {
    if (!hasActivePress) return;
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [hasActivePress]);

  const handlePress = useCallback((button: ButtonKey) => {
    const ts = Date.now();
    setNow(ts);

    setStats((prev) => {
      const current = prev[button];
      return {
        ...prev,
        [button]: {
          count: current.count + 1,
          firstClickTime: current.firstClickTime ?? ts,
          lastClickTime: ts,
          accumulatedMs: current.accumulatedMs,
          pressStartedAt: ts,
        },
      };
    });

    if (button === "A" || button === "B" || button === "C") {
      const next = [...bufferRef.current, button];
      if (next.length === 3) {
        const value = next.join("");
        const valid = new Set(next).size === 3;
        bufferRef.current = [];
        setSequenceBuffer([]);
        setSequenceGroups((prev) => [...prev, { value, valid }]);
      } else {
        bufferRef.current = next;
        setSequenceBuffer(next);
      }
    }
  }, []);

  const handleRelease = useCallback((button: ButtonKey) => {
    setStats((prev) => {
      const current = prev[button];
      if (current.pressStartedAt === null) return prev;
      const elapsed = Date.now() - current.pressStartedAt;
      return {
        ...prev,
        [button]: {
          ...current,
          accumulatedMs: current.accumulatedMs + Math.max(0, elapsed),
          pressStartedAt: null,
        },
      };
    });
  }, []);

  const handleReset = useCallback(() => {
    bufferRef.current = [];
    setStats(EMPTY_STATS);
    setSequenceBuffer([]);
    setSequenceGroups([]);
  }, []);

  const totalClicks = useMemo(
    () => stats.A.count + stats.B.count + stats.C.count + stats.D.count,
    [stats]
  );

  const durations = useMemo(() => {
    const calc = (s: ButtonStats) => {
      const active = s.pressStartedAt ? Math.max(0, now - s.pressStartedAt) : 0;
      return (s.accumulatedMs + active) / 1000;
    };
    return {
      A: calc(stats.A),
      B: calc(stats.B),
      C: calc(stats.C),
      D: calc(stats.D),
    };
  }, [stats, now]);

  const bufferDisplay = useMemo(() => {
    const slots: string[] = [];
    for (let i = 0; i < 3; i++) {
      slots.push(sequenceBuffer[i] ?? "_");
    }
    return slots.join("");
  }, [sequenceBuffer]);

  const exportToExcel = useCallback(() => {
    const wb = XLSX.utils.book_new();

    const validCount = sequenceGroups.filter((g) => g.valid).length;
    const invalidCount = sequenceGroups.length - validCount;

    const resumoData: (string | number)[][] = [
      ["Campo", "Valor"],
      ["Título da Sessão", sessionTitle || "Sem título"],
      ["Data/Hora", new Date().toLocaleString("pt-BR")],
      ["Total de Cliques", totalClicks],
      ["Cliques em A", stats.A.count],
      ["Cliques em B", stats.B.count],
      ["Cliques em C", stats.C.count],
      ["Cliques em D", stats.D.count],
      ["Sequências Válidas", validCount],
      ["Sequências Inválidas", invalidCount],
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(resumoData),
      "Resumo"
    );

    const tempoHeaders = [
      "Botão",
      "Total de Cliques",
      "Primeiro Clique",
      "Último Clique",
      "Tempo Pressionado (s)",
    ];
    const nowMs = Date.now();
    const tempoRows = (["A", "B", "C", "D"] as const).map((btn) => {
      const s = stats[btn];
      const activeMs = s.pressStartedAt ? Math.max(0, nowMs - s.pressStartedAt) : 0;
      const totalMs = s.accumulatedMs + activeMs;
      const duracao = (totalMs / 1000).toFixed(1);
      return [
        btn,
        s.count,
        s.firstClickTime
          ? new Date(s.firstClickTime).toLocaleTimeString("pt-BR")
          : "-",
        s.lastClickTime
          ? new Date(s.lastClickTime).toLocaleTimeString("pt-BR")
          : "-",
        duracao,
      ];
    });
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([tempoHeaders, ...tempoRows]),
      "Tempo por Botão"
    );

    const seqHeaders = ["#", "Sequência", "Posição", "Status"];
    const seqRows = sequenceGroups.map((group, i) => [
      i + 1,
      group.value,
      `${i * 3 + 1}–${i * 3 + 3}`,
      group.valid ? "Válida" : "Inválida (letra repetida)",
    ]);
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([seqHeaders, ...seqRows]),
      "Sequências"
    );

    const safeTitle = (sessionTitle || "sessao").replace(/[^a-z0-9_-]+/gi, "_");
    const filename = `${safeTitle}_${Date.now()}.xlsx`;
    XLSX.writeFile(wb, filename);
  }, [sessionTitle, stats, sequenceGroups, totalClicks]);

  return (
    <main className="min-h-screen p-6 md:p-10 flex justify-center">
      <div className="w-full max-w-4xl flex flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="flex items-center justify-center gap-3 text-2xl font-mono tracking-tight text-white/90">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 64 64"
            aria-hidden="true"
            className="h-9 w-9 text-emerald-300 sm:h-10 sm:w-10"
          >
            <circle cx="20" cy="18" r="8" fill="currentColor" opacity="0.85" />
            <circle cx="44" cy="18" r="8" fill="currentColor" opacity="0.85" />
            <circle cx="20" cy="18" r="3.5" fill="#0b1120" />
            <circle cx="44" cy="18" r="3.5" fill="#0b1120" />
            <ellipse
              cx="32"
              cy="38"
              rx="20"
              ry="18"
              fill="currentColor"
            />
            <circle cx="25" cy="36" r="2.2" fill="#0b1120" />
            <circle cx="39" cy="36" r="2.2" fill="#0b1120" />
            <ellipse cx="32" cy="44" rx="3.2" ry="2.2" fill="#0b1120" />
            <path
              d="M28 48 Q32 51 36 48"
              stroke="#0b1120"
              strokeWidth="1.6"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M14 42 Q6 44 4 50"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
            TamiMouse 3.0
          </h1>
          <p className="text-xs text-white/40 font-mono">
            painel de rastreamento · pressione e segure · sequências A·B·C
          </p>
        </header>

        <section className="bg-card border border-border rounded-2xl p-5">
          <label className="block text-xs font-mono text-white/50 mb-2">
            TÍTULO DA SESSÃO
          </label>
          <input
            type="text"
            value={sessionTitle}
            onChange={(e) => setSessionTitle(e.target.value)}
            placeholder="Digite o título da sessão..."
            className="w-full bg-black/40 border border-border rounded-lg px-4 py-3 text-white placeholder:text-white/30 font-mono outline-none focus:border-white/40 transition-colors"
          />
        </section>

        <section className="bg-card border border-border rounded-2xl p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 justify-items-center">
            <ClickButton
              label="A"
              count={stats.A.count}
              durationSeconds={durations.A}
              onPress={() => handlePress("A")}
              onRelease={() => handleRelease("A")}
              colorClass={BUTTON_COLORS.A}
            />
            <ClickButton
              label="B"
              count={stats.B.count}
              durationSeconds={durations.B}
              onPress={() => handlePress("B")}
              onRelease={() => handleRelease("B")}
              colorClass={BUTTON_COLORS.B}
            />
            <ClickButton
              label="C"
              count={stats.C.count}
              durationSeconds={durations.C}
              onPress={() => handlePress("C")}
              onRelease={() => handleRelease("C")}
              colorClass={BUTTON_COLORS.C}
            />
            <ClickButton
              label="D"
              count={stats.D.count}
              durationSeconds={durations.D}
              onPress={() => handlePress("D")}
              onRelease={() => handleRelease("D")}
              colorClass={BUTTON_COLORS.D}
              excluded
            />
          </div>
          <p className="text-center text-[10px] font-mono text-white/30 mt-5">
            o tempo de cada botão acumula apenas enquanto o botão estiver pressionado
          </p>
        </section>

        <section className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-xs font-mono text-white/50">
              SEQUÊNCIAS (A · B · C){" "}
              <span className="text-white/30">
                — verde: 3 letras distintas · vermelho: letra repetida
              </span>
            </h2>
            <span className="text-xs font-mono text-white/40">
              {sequenceGroups.length} grupo(s)
            </span>
          </div>

          <div className="font-mono text-lg leading-relaxed break-words">
            {sequenceGroups.length === 0 && sequenceBuffer.length === 0 ? (
              <span className="text-white/30">— sem registros ainda —</span>
            ) : (
              <>
                {sequenceGroups.map((g, i) => (
                  <span
                    key={i}
                    className={g.valid ? "text-emerald-400" : "text-red-400"}
                    title={
                      g.valid
                        ? "Sequência válida (letras distintas)"
                        : "Inválida (letra repetida)"
                    }
                  >
                    {g.value}
                    <span className="text-white/30"> / </span>
                  </span>
                ))}
              </>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-[10px] font-mono text-white/40 mb-1">
              BUFFER ATUAL
            </div>
            <div className="font-mono text-2xl tracking-[0.4em]">
              {bufferDisplay.split("").map((ch, i) => (
                <span
                  key={i}
                  className={
                    ch === "_" ? "text-white/20" : "text-amber-300"
                  }
                >
                  {ch}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="flex flex-col sm:flex-row gap-3 justify-between items-center">
          <button
            type="button"
            onClick={handleReset}
            className="px-5 py-3 rounded-xl font-mono text-sm border border-border bg-card hover:bg-white/5 text-white/80 transition-colors"
          >
            ↺ Resetar Sessão
          </button>

          <div className="flex flex-col items-end gap-1">
            <ExportButton onExport={exportToExcel} disabled={totalClicks === 0} />
            {totalClicks === 0 && (
              <span className="text-[10px] font-mono text-white/40">
                registre ao menos um clique para exportar
              </span>
            )}
          </div>
        </section>

        <footer className="text-center text-[10px] font-mono text-white/30 pt-2">
          total: {totalClicks} cliques · {sequenceGroups.length} sequências (
          <span className="text-emerald-400/70">
            {sequenceGroups.filter((g) => g.valid).length} válidas
          </span>
          {" / "}
          <span className="text-red-400/70">
            {sequenceGroups.filter((g) => !g.valid).length} inválidas
          </span>
          )
        </footer>
      </div>
    </main>
  );
}
