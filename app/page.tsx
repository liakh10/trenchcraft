"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { GAME_CONFIG, X_URL, CA, TICKER } from "./config";

export default function Home() {
  const { connected, publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const router = useRouter();
  const bgRef = useRef<HTMLDivElement>(null);
  const [blink, setBlink] = useState(true);
  const [hoverEnter, setHoverEnter] = useState(false);

  // Live voxel background
  useEffect(() => {
    let dispose: (() => void) | null = null;
    let killed = false;
    import("./play/engine/preview").then(({ createPreview }) => {
      if (killed || !bgRef.current) return;
      dispose = createPreview(bgRef.current);
    });
    return () => { killed = true; dispose?.(); };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setBlink((b) => !b), 600);
    return () => clearInterval(t);
  }, []);

  return (
    <main className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center"
      style={{ background: "radial-gradient(ellipse at 50% 35%, #131a33 0%, #0a0e1c 55%, #05070f 100%)" }}>

      {/* Voxel world background */}
      <div ref={bgRef} className="absolute inset-0 z-0 opacity-70" />
      {/* Darkening vignette so text reads */}
      <div className="absolute inset-0 z-[1] pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 40%, transparent 30%, rgba(5,7,15,0.7) 100%)" }} />
      {/* Scanlines */}
      <div className="absolute inset-0 z-[2] pointer-events-none"
        style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)" }} />

      <div className="relative z-10 flex flex-col items-center gap-6 px-4 w-full max-w-md">

        {/* LOGO */}
        <div className="text-center select-none mt-2">
          <div className="text-4xl md:text-5xl font-bold leading-none animate-float"
            style={{
              color: "#c9a36a",
              textShadow: "0 2px 0 #6e4a22, 0 4px 0 #4a3015, 4px 6px 8px rgba(0,0,0,0.6)",
              letterSpacing: "0.04em",
            }}>
            TRENCH
          </div>
          <div className="text-5xl md:text-6xl font-bold leading-none mt-1 animate-glow"
            style={{ color: "#FFC21E", letterSpacing: "0.02em" }}>
            CRAFT
          </div>
        </div>

        {/* ENTER */}
        <button
          onClick={() => router.push("/play")}
          onMouseEnter={() => setHoverEnter(true)}
          onMouseLeave={() => setHoverEnter(false)}
          className="px-14 py-4 text-base font-bold text-black cursor-pointer active:scale-95 transition-all mt-2"
          style={{
            fontFamily: "'Press Start 2P', monospace",
            background: hoverEnter
              ? "linear-gradient(180deg,#FFE07A,#FFB300)"
              : "linear-gradient(180deg,#FFD24D,#FFA800)",
            border: "3px solid #7a4d00",
            boxShadow: hoverEnter
              ? "0 0 40px #FFB30099, 5px 5px 0 #5a3000"
              : "0 0 24px #FFB30055, 5px 5px 0 #5a3000",
            transform: hoverEnter ? "translateY(-2px)" : "none",
          }}>
          ENTER
        </button>

        {/* Slogan */}
        <div className="text-[9px] tracking-[0.35em] text-yellow-500/80"
          style={{ opacity: blink ? 1 : 0.45, transition: "opacity 0.2s" }}>
          MINE • BUILD • SURVIVE
        </div>

        {/* Wallet (optional) */}
        <button
          onClick={() => {
            if (connected && publicKey) router.push("/play");
            else setVisible(true);
          }}
          className="text-[9px] px-5 py-2 cursor-pointer transition-all hover:opacity-80"
          style={{
            color: connected ? "#fff" : "#9945FF",
            background: connected ? "linear-gradient(90deg,#7b2fff,#9945FF)" : "transparent",
            border: "2px solid #9945FF",
          }}>
          {connected ? `✓ ${publicKey?.toBase58().slice(0, 4)}…${publicKey?.toBase58().slice(-4)}` : "◈ CONNECT WALLET"}
        </button>

        {/* Ticker + CA + X */}
        <div className="flex flex-col items-center gap-3 mt-2">
          <div className="text-lg" style={{ color: "#FFC21E", textShadow: "0 0 14px #FFB30066" }}>
            {TICKER}
          </div>
          <CADisplay />
          <a href={X_URL} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 transition-all hover:opacity-80 cursor-pointer"
            style={{ fontSize: 9, color: "#9aa3b2", textDecoration: "none" }}>
            <XIcon />
            <span>FOLLOW ON X</span>
          </a>
          <div className="text-[8px] text-gray-700 text-center">
            {GAME_CONFIG.subtitle} • {GAME_CONFIG.network}
          </div>
        </div>
      </div>
    </main>
  );
}

// ── CA: plain when SOON, click-to-copy when real ──
function CADisplay() {
  const [copied, setCopied] = useState(false);
  const isReal = CA !== "SOON" && CA !== "";

  function copy() {
    if (!isReal) return;
    navigator.clipboard.writeText(CA);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="text-center">
      <span className="text-[7px] text-gray-700">CA: </span>
      <span
        onClick={copy}
        className={isReal ? "text-[7px] cursor-pointer transition-opacity hover:opacity-70" : "text-[7px]"}
        style={{ color: copied ? "#FFD700" : isReal ? "#44AA44" : "#666622" }}
        title={isReal ? "Click to copy" : undefined}>
        {copied ? "COPIED!" : CA}
      </span>
    </div>
  );
}

function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
