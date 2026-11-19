import React, { useEffect, useRef, useState } from 'react';
import type { GameState } from '../game/types';

interface BloodSplatterOverlayProps {
  damageSeq: number;
  lastDamage: number;
  hpRatio: number;
  gameState: GameState;
  editorMode: boolean;
}

interface SplatterDecal {
  id: string;
  variant: number;
  leftPct: number;
  topPct: number;
  sizePx: number;
  rotationDeg: number;
  maxOpacity: number;
  delayMs: number;
  durationMs: number;
}

interface DripStreak {
  id: string;
  leftPct: number;
  heightPx: number;
  widthPx: number;
  delayMs: number;
  durationMs: number;
  opacity: number;
}

interface BloodBurst {
  id: number;
  severity: number;
  decals: SplatterDecal[];
  drips: DripStreak[];
  durationMs: number;
}

interface PerimeterAnchor {
  leftMin: number;
  leftMax: number;
  topMin: number;
  topMax: number;
  rotMin: number;
  rotMax: number;
}

interface DropSpec {
  cx: number;
  cy: number;
  scaleX: number;
  scaleY: number;
  angleDeg: number;
  opacity: number;
}

const PERIMETER_ANCHORS: PerimeterAnchor[] = [
  // Top-left corner
  { leftMin: -4, leftMax: 18, topMin: -5, topMax: 18, rotMin: -35, rotMax: 45 },
  // Top-right corner
  { leftMin: 74, leftMax: 96, topMin: -5, topMax: 18, rotMin: -45, rotMax: 35 },
  // Bottom-left corner
  { leftMin: -4, leftMax: 20, topMin: 70, topMax: 94, rotMin: -30, rotMax: 50 },
  // Bottom-right corner
  { leftMin: 72, leftMax: 95, topMin: 70, topMax: 94, rotMin: -50, rotMax: 30 },
  // Left edge mid
  { leftMin: -5, leftMax: 12, topMin: 26, topMax: 64, rotMin: -25, rotMax: 35 },
  // Right edge mid
  { leftMin: 80, leftMax: 96, topMin: 26, topMax: 64, rotMin: -35, rotMax: 25 },
  // Top edge peripheral
  { leftMin: 22, leftMax: 70, topMin: -6, topMax: 10, rotMin: -20, rotMax: 20 },
  // Bottom edge peripheral
  { leftMin: 24, leftMax: 68, topMin: 80, topMax: 95, rotMin: -25, rotMax: 25 },
];

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

// Sculpted SVG teardrop pointing along -Y (tail at y=-1.35, rounded bulb centered near y=+0.38)
const TEARDROP_PATH =
  'M 0 -1.38 C 0.24 -0.78, 0.72 -0.22, 0.76 0.28 C 0.80 0.76, 0.44 1.06, 0 1.06 C -0.44 1.06, -0.80 0.76, -0.76 0.28 C -0.72 -0.22, -0.24 -0.78, 0 -1.38 Z';

const SPLATTER_DROP_VARIANTS: DropSpec[][] = [
  // Variant 0: Heavy clustered arterial droplet burst radiating outward
  [
    { cx: 108, cy: 106, scaleX: 28, scaleY: 36, angleDeg: 18, opacity: 0.94 },
    { cx: 88, cy: 84, scaleX: 19, scaleY: 28, angleDeg: -42, opacity: 0.9 },
    { cx: 136, cy: 82, scaleX: 16, scaleY: 26, angleDeg: 44, opacity: 0.88 },
    { cx: 146, cy: 128, scaleX: 18, scaleY: 30, angleDeg: 118, opacity: 0.9 },
    { cx: 92, cy: 146, scaleX: 15, scaleY: 32, angleDeg: 174, opacity: 0.88 },
    { cx: 66, cy: 116, scaleX: 14, scaleY: 24, angleDeg: -96, opacity: 0.84 },
    { cx: 168, cy: 62, scaleX: 10, scaleY: 19, angleDeg: 52, opacity: 0.82 },
    { cx: 182, cy: 104, scaleX: 9, scaleY: 18, angleDeg: 86, opacity: 0.78 },
    { cx: 162, cy: 166, scaleX: 11, scaleY: 21, angleDeg: 136, opacity: 0.82 },
    { cx: 116, cy: 184, scaleX: 9.5, scaleY: 24, angleDeg: 176, opacity: 0.85 },
    { cx: 52, cy: 158, scaleX: 8.5, scaleY: 16, angleDeg: -138, opacity: 0.78 },
    { cx: 42, cy: 76, scaleX: 9, scaleY: 17, angleDeg: -58, opacity: 0.8 },
    { cx: 112, cy: 42, scaleX: 8, scaleY: 16, angleDeg: 4, opacity: 0.76 },
  ],
  // Variant 1: Directional slash spray of elongated high-velocity drops
  [
    { cx: 98, cy: 104, scaleX: 23, scaleY: 38, angleDeg: 128, opacity: 0.94 },
    { cx: 128, cy: 126, scaleX: 18, scaleY: 34, angleDeg: 132, opacity: 0.9 },
    { cx: 74, cy: 82, scaleX: 15, scaleY: 28, angleDeg: -50, opacity: 0.88 },
    { cx: 152, cy: 96, scaleX: 14, scaleY: 26, angleDeg: 78, opacity: 0.86 },
    { cx: 164, cy: 156, scaleX: 13, scaleY: 28, angleDeg: 136, opacity: 0.88 },
    { cx: 186, cy: 178, scaleX: 8.5, scaleY: 19, angleDeg: 138, opacity: 0.82 },
    { cx: 48, cy: 56, scaleX: 9, scaleY: 18, angleDeg: -48, opacity: 0.8 },
    { cx: 112, cy: 64, scaleX: 10, scaleY: 20, angleDeg: 18, opacity: 0.82 },
    { cx: 88, cy: 154, scaleX: 11, scaleY: 23, angleDeg: 168, opacity: 0.84 },
    { cx: 42, cy: 118, scaleX: 7.5, scaleY: 15, angleDeg: -98, opacity: 0.78 },
    { cx: 182, cy: 62, scaleX: 7, scaleY: 14, angleDeg: 58, opacity: 0.76 },
  ],
  // Variant 2: Dense mist & multi-drop splatter cluster
  [
    { cx: 110, cy: 110, scaleX: 25, scaleY: 32, angleDeg: 175, opacity: 0.92 },
    { cx: 82, cy: 96, scaleX: 16, scaleY: 23, angleDeg: -72, opacity: 0.88 },
    { cx: 140, cy: 98, scaleX: 15, scaleY: 22, angleDeg: 68, opacity: 0.88 },
    { cx: 122, cy: 150, scaleX: 14, scaleY: 30, angleDeg: 178, opacity: 0.9 },
    { cx: 74, cy: 144, scaleX: 12, scaleY: 21, angleDeg: -144, opacity: 0.84 },
    { cx: 164, cy: 136, scaleX: 12, scaleY: 20, angleDeg: 122, opacity: 0.84 },
    { cx: 108, cy: 62, scaleX: 11, scaleY: 20, angleDeg: -6, opacity: 0.82 },
    { cx: 52, cy: 64, scaleX: 9.5, scaleY: 16, angleDeg: -46, opacity: 0.8 },
    { cx: 170, cy: 58, scaleX: 9, scaleY: 16, angleDeg: 48, opacity: 0.8 },
    { cx: 184, cy: 164, scaleX: 8.5, scaleY: 17, angleDeg: 134, opacity: 0.78 },
    { cx: 46, cy: 168, scaleX: 8, scaleY: 15, angleDeg: -136, opacity: 0.78 },
    { cx: 122, cy: 192, scaleX: 7.5, scaleY: 18, angleDeg: 180, opacity: 0.82 },
    { cx: 142, cy: 36, scaleX: 6.5, scaleY: 13, angleDeg: 24, opacity: 0.74 },
  ],
  // Variant 3: Wide diagonal sweep with heavy trailing droplets
  [
    { cx: 92, cy: 108, scaleX: 24, scaleY: 34, angleDeg: 96, opacity: 0.94 },
    { cx: 132, cy: 96, scaleX: 19, scaleY: 29, angleDeg: 78, opacity: 0.9 },
    { cx: 64, cy: 132, scaleX: 16, scaleY: 28, angleDeg: -118, opacity: 0.88 },
    { cx: 98, cy: 154, scaleX: 13, scaleY: 29, angleDeg: 172, opacity: 0.88 },
    { cx: 162, cy: 118, scaleX: 13, scaleY: 24, angleDeg: 102, opacity: 0.84 },
    { cx: 104, cy: 66, scaleX: 11, scaleY: 21, angleDeg: 8, opacity: 0.82 },
    { cx: 188, cy: 84, scaleX: 8.5, scaleY: 17, angleDeg: 82, opacity: 0.78 },
    { cx: 156, cy: 166, scaleX: 9.5, scaleY: 19, angleDeg: 142, opacity: 0.8 },
    { cx: 36, cy: 94, scaleX: 8, scaleY: 16, angleDeg: -82, opacity: 0.78 },
    { cx: 74, cy: 190, scaleX: 8.5, scaleY: 19, angleDeg: -168, opacity: 0.82 },
    { cx: 52, cy: 52, scaleX: 7, scaleY: 14, angleDeg: -42, opacity: 0.75 },
  ],
];

const renderSplatterDropsSvg = (variant: number, gradId: string) => {
  const drops = SPLATTER_DROP_VARIANTS[variant % SPLATTER_DROP_VARIANTS.length];
  return (
    <svg viewBox="0 0 220 220" className="h-full w-full overflow-visible">
      <defs>
        <radialGradient id={gradId} cx="46%" cy="56%" r="58%">
          <stop offset="0%" stopColor="#3b0404" stopOpacity="0.96" />
          <stop offset="52%" stopColor="#991b1b" stopOpacity="0.92" />
          <stop offset="86%" stopColor="#dc2626" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0.58" />
        </radialGradient>
      </defs>
      {drops.map((d, idx) => (
        <g
          key={idx}
          transform={`translate(${d.cx} ${d.cy}) rotate(${d.angleDeg}) scale(${d.scaleX} ${d.scaleY})`}
          opacity={d.opacity}
        >
          <path d={TEARDROP_PATH} fill={`url(#${gradId})`} />
          {d.scaleX >= 12 && (
            <ellipse
              cx="-0.22"
              cy="0.24"
              rx="0.16"
              ry="0.28"
              fill="#fca5a5"
              opacity="0.18"
            />
          )}
        </g>
      ))}
    </svg>
  );
};

export const BloodSplatterOverlay: React.FC<BloodSplatterOverlayProps> = ({
  damageSeq,
  lastDamage,
  hpRatio,
  gameState,
  editorMode,
}) => {
  const [bursts, setBursts] = useState<BloodBurst[]>([]);
  const lastSeqRef = useRef<number>(damageSeq);
  const nextBurstIdRef = useRef<number>(1);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    return () => {
      for (const id of timersRef.current) {
        window.clearTimeout(id);
      }
      timersRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (damageSeq === 0 || gameState === 'TITLE_MENU' || editorMode) {
      lastSeqRef.current = damageSeq;
      setBursts([]);
      return;
    }

    if (damageSeq > lastSeqRef.current) {
      lastSeqRef.current = damageSeq;
      const severity = Math.max(0.45, Math.min(1.4, (lastDamage || 16) / 24));
      const decalCount = severity > 1.0 ? 5 : severity > 0.7 ? 4 : 3;
      const durationMs = Math.round(1650 + severity * 500);

      const shuffledIndices = [...PERIMETER_ANCHORS.keys()].sort(() => Math.random() - 0.5);
      const chosenAnchors = shuffledIndices.slice(0, decalCount);

      const decals: SplatterDecal[] = chosenAnchors.map((anchorIdx, idx) => {
        const anchor = PERIMETER_ANCHORS[anchorIdx];
        const sizePx = Math.round(randRange(145, 235) * (0.78 + severity * 0.3));
        return {
          id: `${nextBurstIdRef.current}-d-${idx}`,
          variant: Math.floor(Math.random() * SPLATTER_DROP_VARIANTS.length),
          leftPct: randRange(anchor.leftMin, anchor.leftMax),
          topPct: randRange(anchor.topMin, anchor.topMax),
          sizePx,
          rotationDeg: Math.round(randRange(anchor.rotMin, anchor.rotMax)),
          maxOpacity: Math.min(0.92, randRange(0.62, 0.85) * (0.8 + severity * 0.2)),
          delayMs: idx * 24,
          durationMs: Math.round(durationMs * randRange(0.88, 1.05)),
        };
      });

      const dripCount = severity >= 0.8 ? 3 : 2;
      const drips: DripStreak[] = Array.from({ length: dripCount }, (_, idx) => ({
        id: `${nextBurstIdRef.current}-s-${idx}`,
        leftPct:
          idx === 0
            ? randRange(6, 26)
            : idx === 1
              ? randRange(72, 92)
              : randRange(38, 62),
        heightPx: Math.round(randRange(64, 122) * (0.8 + severity * 0.25)),
        widthPx: Math.round(randRange(11, 18)),
        delayMs: 30 + idx * 50,
        durationMs: Math.round(durationMs * 1.05),
        opacity: Math.min(0.88, 0.58 + severity * 0.22),
      }));

      const burstId = nextBurstIdRef.current++;
      const newBurst: BloodBurst = {
        id: burstId,
        severity,
        decals,
        drips,
        durationMs,
      };

      setBursts((prev) => [...prev.slice(-3), newBurst]);

      const removeTimer = window.setTimeout(() => {
        setBursts((prev) => prev.filter((b) => b.id !== burstId));
        timersRef.current = timersRef.current.filter((t) => t !== removeTimer);
      }, durationMs + 140);
      timersRef.current.push(removeTimer);
    }
  }, [damageSeq, lastDamage, gameState, editorMode]);

  if (editorMode || (gameState !== 'PLAYING' && gameState !== 'GAME_OVER')) {
    return null;
  }

  const missingHpRatio = Math.max(0, 1 - hpRatio);
  const persistentLowHpBlood =
    gameState === 'PLAYING' && missingHpRatio > 0.35
      ? Math.min(0.55, (missingHpRatio - 0.35) * 0.85)
      : 0;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Persistent critical-health corner blood streaks when HP is low */}
      {persistentLowHpBlood > 0.02 && (
        <div
          className="absolute inset-0 transition-opacity duration-300"
          style={{
            opacity: persistentLowHpBlood,
            background:
              'radial-gradient(ellipse at center, rgba(127, 29, 29, 0) 56%, rgba(127, 29, 29, 0.48) 84%, rgba(69, 10, 10, 0.88) 100%)',
          }}
        />
      )}

      {bursts.map((burst) => (
        <React.Fragment key={burst.id}>
          {/* Fast peripheral arterial shock flash */}
          <div
            className="animate-blood-edge absolute inset-0"
            style={{
              background: `radial-gradient(circle at 50% 50%, rgba(185, 28, 28, 0) 48%, rgba(185, 28, 28, ${
                0.28 + Math.min(0.24, burst.severity * 0.18)
              }) 82%, rgba(127, 29, 29, ${
                0.6 + Math.min(0.28, burst.severity * 0.2)
              }) 100%)`,
            }}
          />

          {/* Top-edge teardrop blood drips */}
          {burst.drips.map((drip) => {
            const dripGradId = `drip-grad-${drip.id}`;
            return (
              <div
                key={drip.id}
                className="animate-blood-drip absolute top-0"
                style={{
                  left: `${drip.leftPct}%`,
                  width: `${drip.widthPx}px`,
                  height: `${drip.heightPx}px`,
                  opacity: drip.opacity,
                  animationDelay: `${drip.delayMs}ms`,
                  animationDuration: `${drip.durationMs}ms`,
                  filter: 'drop-shadow(0 2px 3px rgba(0, 0, 0, 0.65))',
                }}
              >
                <svg
                  viewBox="0 0 24 120"
                  preserveAspectRatio="none"
                  className="h-full w-full overflow-visible"
                >
                  <defs>
                    <linearGradient id={dripGradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#450a0a" stopOpacity="0.96" />
                      <stop offset="64%" stopColor="#991b1b" stopOpacity="0.92" />
                      <stop offset="92%" stopColor="#dc2626" stopOpacity="0.86" />
                      <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0.9" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 10.5 0 L 13.5 0 C 14 34, 14.5 68, 19.5 92 C 22 104, 18.5 118, 12 118 C 5.5 118, 2 104, 4.5 92 C 9.5 68, 10 34, 10.5 0 Z"
                    fill={`url(#${dripGradId})`}
                  />
                  <ellipse cx="9.2" cy="102" rx="1.9" ry="4.5" fill="#fca5a5" opacity="0.2" />
                </svg>
              </div>
            );
          })}

          {/* Screen-space droplet-cluster SVG splatters framing the edges */}
          {burst.decals.map((decal) => {
            const gradId = `blood-grad-${decal.id}`;
            return (
              <div
                key={decal.id}
                className="animate-blood-splatter absolute"
                style={{
                  left: `${decal.leftPct}%`,
                  top: `${decal.topPct}%`,
                  width: `${decal.sizePx}px`,
                  height: `${decal.sizePx}px`,
                  animationDelay: `${decal.delayMs}ms`,
                  animationDuration: `${decal.durationMs}ms`,
                  filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.6))',
                }}
              >
                <div
                  className="h-full w-full"
                  style={{
                    opacity: decal.maxOpacity,
                    transform: `rotate(${decal.rotationDeg}deg)`,
                  }}
                >
                  {renderSplatterDropsSvg(decal.variant, gradId)}
                </div>
              </div>
            );
          })}
        </React.Fragment>
      ))}
    </div>
  );
};
