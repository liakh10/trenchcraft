"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { HOTBAR, BLOCK_DEFS } from "./engine/blocks";
import type { GameHandle } from "./engine/game";

const BLOCK_COLORS: Record<number, string> = {
  1: "#6a9c3a", 2: "#7a5836", 3: "#808086", 4: "#decc8c",
  5: "#6e522e", 6: "#367a30", 7: "#b28c58", 8: "#f0c440",
};

export default function PlayPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<GameHandle | null>(null);
  const [locked, setLocked] = useState(false);
  const [hotbar, setHotbar] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let handle: GameHandle | null = null;
    let disposed = false;

    import("./engine/game").then(({ createGame }) => {
      if (disposed || !containerRef.current) return;
      handle = createGame(containerRef.current);
      handleRef.current = handle;
      handle.onLockChange(setLocked);
      handle.onHotbarChange(setHotbar);
      setReady(true);
    });

    return () => {
      disposed = true;
      handle?.dispose();
      handleRef.current = null;
    };
  }, []);

  return (
    <div className="fixed inset-0 bg-[#88bdf2] overflow-hidden select-none">
      {/* 3D canvas mount */}
      <div ref={containerRef} className="absolute inset-0" />

      {/* Crosshair */}
      {locked && <div className="crosshair" />}

      {/* Click-to-play overlay */}
      {!locked && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center"
          style={{ background: "rgba(6,10,18,0.82)" }}>
          <div className="text-yellow-400 text-2xl mb-2" style={{ textShadow: "0 0 20px #FFB30088, 3px 3px 0 #5a3000" }}>
            TRENCHCRAFT
          </div>
          <div className="text-[9px] text-gray-400 mb-8">$TCRAFT • voxel sandbox</div>

          <button
            onClick={() => handleRef.current?.lock()}
            disabled={!ready}
            className="px-10 py-4 text-sm text-black font-bold cursor-pointer active:scale-95 transition-transform disabled:opacity-40"
            style={{ background: "linear-gradient(180deg,#FFD24D,#FFA800)", boxShadow: "0 0 30px #FFB30066, 4px 4px 0 #5a3000" }}
          >
            {ready ? "▶ CLICK TO PLAY" : "LOADING WORLD…"}
          </button>

          <div className="mt-10 text-[8px] text-gray-400 leading-relaxed text-center">
            <div className="text-gray-300 mb-2">CONTROLS</div>
            <div>WASD — move &nbsp;•&nbsp; MOUSE — look &nbsp;•&nbsp; SPACE — jump &nbsp;•&nbsp; SHIFT — sprint</div>
            <div className="mt-1">LEFT CLICK — break &nbsp;•&nbsp; RIGHT CLICK — place &nbsp;•&nbsp; 1–8 / WHEEL — select block</div>
            <div className="mt-1 text-gray-600">ESC — release cursor</div>
          </div>

          <button onClick={() => router.push("/")}
            className="mt-10 text-[8px] text-gray-600 hover:text-gray-400 cursor-pointer">
            ◀ BACK TO MENU
          </button>
        </div>
      )}

      {/* Hotbar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-1 pointer-events-none">
        {HOTBAR.map((id, i) => (
          <div key={id}
            className="w-11 h-11 flex items-center justify-center relative"
            style={{
              background: BLOCK_COLORS[id] || "#888",
              border: i === hotbar ? "3px solid #fff" : "3px solid #00000055",
              boxShadow: i === hotbar ? "0 0 12px #ffffffaa" : "none",
              imageRendering: "pixelated",
            }}>
            <span className="absolute top-0 left-0.5 text-[7px] text-white/80" style={{ textShadow: "1px 1px 0 #000" }}>
              {i + 1}
            </span>
          </div>
        ))}
      </div>

      {/* Selected block label */}
      {locked && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 text-[8px] text-white pointer-events-none"
          style={{ textShadow: "1px 1px 0 #000" }}>
          {BLOCK_DEFS[HOTBAR[hotbar]]?.name}
        </div>
      )}
    </div>
  );
}
