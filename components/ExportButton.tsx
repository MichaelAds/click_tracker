"use client";

type Props = {
  onExport: () => void;
  disabled: boolean;
};

export default function ExportButton({ onExport, disabled }: Props) {
  return (
    <button
      type="button"
      onClick={onExport}
      disabled={disabled}
      className={[
        "px-6 py-3 rounded-xl font-mono text-sm font-semibold",
        "border transition-all duration-150",
        disabled
          ? "bg-white/5 border-white/10 text-white/30 cursor-not-allowed"
          : "bg-emerald-600 border-emerald-400 text-white hover:bg-emerald-500 active:scale-[0.97]",
      ].join(" ")}
      title={disabled ? "Registre ao menos um clique para exportar" : "Exportar para Excel"}
    >
      ⬇ Exportar Excel
    </button>
  );
}
