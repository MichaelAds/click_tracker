"use client";

import { useState } from "react";

export type ButtonKey = "A" | "B" | "C" | "D";

type Props = {
  label: ButtonKey;
  count: number;
  durationSeconds: number;
  onPress: () => void;
  onRelease: () => void;
  colorClass: string;
  excluded?: boolean;
};

export default function ClickButton({
  label,
  count,
  durationSeconds,
  onPress,
  onRelease,
  colorClass,
  excluded = false,
}: Props) {
  const [pulse, setPulse] = useState(false);
  const [pressed, setPressed] = useState(false);

  const handleDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (pressed) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* not fatal — capture is a hint */
    }
    setPressed(true);
    setPulse(false);
    requestAnimationFrame(() => setPulse(true));
    onPress();
  };

  const handleUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!pressed) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    setPressed(false);
    onRelease();
  };

  const handleCancel = () => {
    if (!pressed) return;
    setPressed(false);
    onRelease();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onPointerDown={handleDown}
        onPointerUp={handleUp}
        onPointerCancel={handleCancel}
        onContextMenu={(e) => e.preventDefault()}
        onAnimationEnd={() => setPulse(false)}
        className={[
          "relative select-none w-32 h-32 rounded-2xl text-4xl font-bold text-white",
          "border border-white/10 shadow-lg transition-all duration-100 touch-none",
          "active:scale-[0.92] hover:brightness-110",
          colorClass,
          pressed ? "ring-2 ring-white/70 scale-[0.94]" : "",
          pulse ? "animate-pulseGlow" : "",
        ].join(" ")}
        aria-label={`Botão ${label}`}
        aria-pressed={pressed}
      >
        {label}
        {excluded && (
          <span className="absolute -top-2 -right-2 bg-yellow-400 text-black text-[10px] font-mono px-1.5 py-0.5 rounded-full">
            EXC
          </span>
        )}
      </button>

      <div className="text-center font-mono">
        <div className="text-2xl text-white">{count}x</div>
        <div
          className={[
            "text-xs tabular-nums",
            pressed ? "text-amber-300" : "text-white/60",
          ].join(" ")}
        >
          {durationSeconds.toFixed(1)}s
        </div>
      </div>

      {excluded && (
        <div className="text-[10px] text-white/40 font-mono text-center max-w-[8rem]">
          Não entra nas sequências
        </div>
      )}
    </div>
  );
}
