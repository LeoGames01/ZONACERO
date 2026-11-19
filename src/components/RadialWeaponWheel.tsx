import React, { useEffect, useRef, useState } from 'react';
import { Bomb, Flame, FlaskConical, Hand, Lock, Volume2 } from 'lucide-react';
import type {
  DistractionKind,
  EquippedThrowableKind,
  UnlockedWeapons,
  WeaponKind,
} from '../game/types';
import { WeaponIcon } from './WeaponCarousel';

export type RadialSlotId =
  | 'rifle'
  | 'pistol'
  | 'bow'
  | 'baton'
  | 'stick'
  | 'unarmed'
  | 'molotov'
  | 'nail_bomb'
  | 'distraction';

interface RadialWeaponWheelProps {
  weapon: WeaponKind;
  unlockedWeapons: UnlockedWeapons;
  arrows: number;
  equippedThrowable: EquippedThrowableKind | null;
  molotovLit: boolean;
  nailBombLit: boolean;
  pistolAmmo: number;
  pistolMaxAmmo: number;
  rifleAmmo: number;
  rifleMaxAmmo: number;
  hasBackpack: boolean;
  molotovCount: number;
  nailBombCount: number;
  totalDistractions: number;
  activeDistractionKind: DistractionKind;
  style?: React.CSSProperties;
  onSelectWeapon: (weapon: WeaponKind) => void;
  onEquipThrowable: (kind: EquippedThrowableKind) => void;
}

interface WheelOptionMeta {
  id: RadialSlotId;
  label: string;
  angleDeg: number; // -90 top, clockwise every 40 deg (9 sectors)
  accentBorder: string;
  accentBg: string;
  accentText: string;
}

const WHEEL_OPTIONS: WheelOptionMeta[] = [
  {
    id: 'rifle',
    label: 'Fusil FAL',
    angleDeg: -90,
    accentBorder: 'border-amber-300',
    accentBg: 'bg-amber-500/35',
    accentText: 'text-amber-100',
  },
  {
    id: 'molotov',
    label: 'Molotov',
    angleDeg: -50,
    accentBorder: 'border-orange-300',
    accentBg: 'bg-orange-500/35',
    accentText: 'text-orange-100',
  },
  {
    id: 'nail_bomb',
    label: 'B. Clavos',
    angleDeg: -10,
    accentBorder: 'border-sky-300',
    accentBg: 'bg-sky-500/35',
    accentText: 'text-sky-100',
  },
  {
    id: 'distraction',
    label: 'Distracción',
    angleDeg: 30,
    accentBorder: 'border-lime-300',
    accentBg: 'bg-lime-500/35',
    accentText: 'text-lime-100',
  },
  {
    id: 'unarmed',
    label: 'Puños (Sigilo)',
    angleDeg: 70,
    accentBorder: 'border-emerald-300',
    accentBg: 'bg-emerald-500/35',
    accentText: 'text-emerald-100',
  },
  {
    id: 'stick',
    label: 'Palo',
    angleDeg: 110,
    accentBorder: 'border-orange-300',
    accentBg: 'bg-orange-500/30',
    accentText: 'text-orange-100',
  },
  {
    id: 'baton',
    label: 'Bastón policía',
    angleDeg: 150,
    accentBorder: 'border-blue-300',
    accentBg: 'bg-blue-500/35',
    accentText: 'text-blue-100',
  },
  {
    id: 'bow',
    label: 'Arco',
    angleDeg: 190,
    accentBorder: 'border-teal-300',
    accentBg: 'bg-teal-500/35',
    accentText: 'text-teal-100',
  },
  {
    id: 'pistol',
    label: 'Revólver',
    angleDeg: -130,
    accentBorder: 'border-sky-300',
    accentBg: 'bg-sky-500/35',
    accentText: 'text-sky-100',
  },
];

const WHEEL_RADIUS = 122;
const NODE_ORBIT_RADIUS = 82;
const SLIDE_DEADZONE = 16;

function safeSetCapture(el: Element | null | undefined, pointerId: number) {
  if (!el || typeof el.setPointerCapture !== 'function') return;
  try {
    if (typeof el.hasPointerCapture === 'function' && el.hasPointerCapture(pointerId)) return;
    el.setPointerCapture(pointerId);
  } catch {
    // Ignore when capture isn't supported
  }
}

function getDistractionShortLabel(kind: DistractionKind): string {
  if (kind === 'bottle') return 'Botella';
  if (kind === 'can') return 'Lata';
  if (kind === 'decoy_rat') return 'Rata señuelo';
  return 'Ladrillo';
}

export const RadialWeaponWheel: React.FC<RadialWeaponWheelProps> = ({
  weapon,
  unlockedWeapons,
  arrows,
  equippedThrowable,
  molotovLit,
  nailBombLit,
  pistolAmmo,
  pistolMaxAmmo,
  rifleAmmo,
  rifleMaxAmmo,
  hasBackpack,
  molotovCount,
  nailBombCount,
  totalDistractions,
  activeDistractionKind,
  style,
  onSelectWeapon,
  onEquipThrowable,
}) => {
  const [open, setOpen] = useState(false);
  const [wheelCenter, setWheelCenter] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hoveredSlot, setHoveredSlot] = useState<RadialSlotId | null>(null);
  const [pointerOffset, setPointerOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const pointerIdRef = useRef<number | null>(null);
  const originRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const wheelCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const hoveredRef = useRef<RadialSlotId | null>(null);
  const activeDistractionRef = useRef<DistractionKind>(activeDistractionKind);
  activeDistractionRef.current = activeDistractionKind;
  const callbacksRef = useRef({ onSelectWeapon, onEquipThrowable });
  callbacksRef.current = { onSelectWeapon, onEquipThrowable };

  const activeSlot: RadialSlotId =
    equippedThrowable === 'molotov'
      ? 'molotov'
      : equippedThrowable === 'nail_bomb'
        ? 'nail_bomb'
        : equippedThrowable === 'bottle' ||
            equippedThrowable === 'can' ||
            equippedThrowable === 'brick' ||
            equippedThrowable === 'decoy_rat'
          ? 'distraction'
          : weapon;

  const isWeaponLocked = (id: RadialSlotId): boolean => {
    if (id === 'stick') return !unlockedWeapons.stick;
    if (id === 'baton') return !unlockedWeapons.baton;
    if (id === 'bow') return !unlockedWeapons.bow;
    if (id === 'pistol') return !unlockedWeapons.pistol;
    if (id === 'rifle') return !unlockedWeapons.rifle;
    return false;
  };

  const isOptionAvailable = (id: RadialSlotId): boolean => {
    if (isWeaponLocked(id)) return false;
    if (id === 'molotov') return hasBackpack && molotovCount > 0;
    if (id === 'nail_bomb') return hasBackpack && nailBombCount > 0;
    if (id === 'distraction') return totalDistractions > 0;
    return true;
  };

  const getOptionCountLabel = (id: RadialSlotId): string => {
    if (isWeaponLocked(id)) return 'Bloq.';
    if (id === 'rifle') return `${rifleAmmo}/${rifleMaxAmmo}`;
    if (id === 'pistol') return `${pistolAmmo}/${pistolMaxAmmo}`;
    if (id === 'bow') return `${arrows} fl.`;
    if (id === 'stick' || id === 'baton') return 'Melee';
    if (id === 'unarmed') return 'Sigilo';
    if (id === 'molotov') return hasBackpack ? `×${molotovCount}` : '0';
    if (id === 'nail_bomb') return hasBackpack ? `×${nailBombCount}` : '0';
    return `×${totalDistractions}`;
  };

  const commitAndClose = (chosen: RadialSlotId | null) => {
    pointerIdRef.current = null;
    hoveredRef.current = null;
    setOpen(false);
    setHoveredSlot(null);
    setPointerOffset({ x: 0, y: 0 });
    if (!chosen) return;
    if (
      chosen === 'rifle' ||
      chosen === 'pistol' ||
      chosen === 'bow' ||
      chosen === 'baton' ||
      chosen === 'stick' ||
      chosen === 'unarmed'
    ) {
      callbacksRef.current.onSelectWeapon(chosen);
    } else if (chosen === 'distraction') {
      callbacksRef.current.onEquipThrowable(activeDistractionRef.current);
    } else {
      callbacksRef.current.onEquipThrowable(chosen);
    }
  };

  useEffect(() => {
    const handleGlobalUp = (e: PointerEvent) => {
      if (pointerIdRef.current === e.pointerId) {
        commitAndClose(hoveredRef.current);
      }
    };
    const handleCancelAll = () => {
      if (pointerIdRef.current !== null) {
        commitAndClose(null);
      }
    };
    window.addEventListener('pointerup', handleGlobalUp);
    window.addEventListener('pointercancel', handleGlobalUp);
    window.addEventListener('blur', handleCancelAll);
    return () => {
      window.removeEventListener('pointerup', handleGlobalUp);
      window.removeEventListener('pointercancel', handleGlobalUp);
      window.removeEventListener('blur', handleCancelAll);
    };
  }, []);

  const resolveHoveredSlot = (clientX: number, clientY: number): RadialSlotId | null => {
    // 1. Direct proximity hit to any rendered sector icon around wheelCenter
    const cx = wheelCenterRef.current.x;
    const cy = wheelCenterRef.current.y;
    let closestId: RadialSlotId | null = null;
    let closestDist = 34;
    for (const opt of WHEEL_OPTIONS) {
      const rad = (opt.angleDeg * Math.PI) / 180;
      const nx = cx + Math.cos(rad) * NODE_ORBIT_RADIUS;
      const ny = cy + Math.sin(rad) * NODE_ORBIT_RADIUS;
      const d = Math.hypot(clientX - nx, clientY - ny);
      if (d < closestDist) {
        closestDist = d;
        closestId = opt.id;
      }
    }
    if (closestId) return closestId;

    // 2. Directional 8-sector angular swipe from initial touch origin
    const dx = clientX - originRef.current.x;
    const dy = clientY - originRef.current.y;
    const dist = Math.hypot(dx, dy);
    if (dist < SLIDE_DEADZONE) return null;

    const angle = Math.atan2(dy, dx);
    let bestId: RadialSlotId = 'unarmed';
    let bestAngularDiff = Infinity;
    for (const opt of WHEEL_OPTIONS) {
      const optRad = (opt.angleDeg * Math.PI) / 180;
      const diff = Math.abs(Math.atan2(Math.sin(angle - optRad), Math.cos(angle - optRad)));
      if (diff < bestAngularDiff) {
        bestAngularDiff = diff;
        bestId = opt.id;
      }
    }
    return bestId;
  };

  const renderSlotIcon = (id: RadialSlotId, cls: string) => {
    if (id === 'rifle') return <WeaponIcon weapon="rifle" className={cls} />;
    if (id === 'pistol') return <WeaponIcon weapon="pistol" className={cls} />;
    if (id === 'bow') return <WeaponIcon weapon="bow" className={cls} />;
    if (id === 'baton') return <WeaponIcon weapon="baton" className={cls} />;
    if (id === 'stick') return <WeaponIcon weapon="stick" className={cls} />;
    if (id === 'unarmed') return <Hand className={cls} />;
    if (id === 'distraction') return <Volume2 className={cls} />;
    if (id === 'molotov') {
      return molotovLit ? <Flame className={cls} /> : <FlaskConical className={cls} />;
    }
    return <Bomb className={cls} />;
  };

  const activeButtonLabel =
    equippedThrowable === 'molotov'
      ? `×${molotovCount}`
      : equippedThrowable === 'nail_bomb'
        ? `×${nailBombCount}`
        : equippedThrowable === 'bottle' ||
            equippedThrowable === 'can' ||
            equippedThrowable === 'brick' ||
            equippedThrowable === 'decoy_rat'
          ? `×${totalDistractions}`
          : weapon === 'pistol'
            ? `${pistolAmmo}`
            : weapon === 'rifle'
              ? `${rifleAmmo}`
              : weapon === 'bow'
                ? `${arrows}`
                : weapon === 'baton'
                  ? 'Bastón'
                  : weapon === 'stick'
                    ? 'Palo'
                    : 'Sigilo';

  const activeButtonRing =
    equippedThrowable === 'molotov'
      ? molotovLit
        ? 'border-orange-300/90 text-orange-200 bg-orange-950/65'
        : 'border-orange-400/55 text-orange-200 bg-[#090d14]/60'
      : equippedThrowable === 'nail_bomb'
        ? nailBombLit
          ? 'border-sky-300/90 text-sky-100 bg-sky-950/65'
          : 'border-sky-400/55 text-sky-200 bg-[#090d14]/60'
        : equippedThrowable === 'bottle' ||
            equippedThrowable === 'can' ||
            equippedThrowable === 'brick' ||
            equippedThrowable === 'decoy_rat'
          ? 'border-lime-300/75 text-lime-100 bg-lime-950/55'
          : weapon === 'pistol'
            ? 'border-sky-300/55 text-sky-100 bg-[#090d14]/60'
            : weapon === 'bow'
              ? 'border-teal-300/60 text-teal-100 bg-teal-950/55'
              : weapon === 'baton'
                ? 'border-blue-300/65 text-blue-100 bg-blue-950/55'
                : weapon === 'stick'
                  ? 'border-orange-300/60 text-orange-100 bg-orange-950/50'
                  : weapon === 'unarmed'
                    ? 'border-emerald-300/65 text-emerald-100 bg-emerald-950/55'
                    : 'border-amber-300/60 text-amber-100 bg-[#090d14]/60';

  const hoveredMeta = hoveredSlot
    ? WHEEL_OPTIONS.find((o) => o.id === hoveredSlot) ?? null
    : null;

  const hoveredLabel =
    hoveredMeta?.id === 'distraction'
      ? getDistractionShortLabel(activeDistractionKind)
      : hoveredMeta?.label;

  return (
    <>
      <button
        type="button"
        style={style}
        aria-label="Selector radial de armas (mantener y deslizar)"
        aria-expanded={open}
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const rect = e.currentTarget.getBoundingClientRect();
          const btnCx = rect.left + rect.width * 0.5;
          const btnCy = rect.top + rect.height * 0.5;
          const safeX = Math.max(
            WHEEL_RADIUS + 14,
            Math.min(vw - WHEEL_RADIUS - 14, btnCx - 42),
          );
          const safeY = Math.max(
            WHEEL_RADIUS + 14,
            Math.min(vh - WHEEL_RADIUS - 14, btnCy - 58),
          );

          pointerIdRef.current = e.pointerId;
          originRef.current = { x: e.clientX, y: e.clientY };
          wheelCenterRef.current = { x: safeX, y: safeY };
          hoveredRef.current = null;
          setWheelCenter({ x: safeX, y: safeY });
          setHoveredSlot(null);
          setPointerOffset({ x: 0, y: 0 });
          setOpen(true);
          safeSetCapture(e.currentTarget, e.pointerId);
        }}
        onPointerMove={(e) => {
          if (pointerIdRef.current !== e.pointerId) return;
          e.stopPropagation();
          const nextHover = resolveHoveredSlot(e.clientX, e.clientY);
          if (nextHover !== hoveredRef.current) {
            hoveredRef.current = nextHover;
            setHoveredSlot(nextHover);
          }
          const dx = e.clientX - originRef.current.x;
          const dy = e.clientY - originRef.current.y;
          const dist = Math.hypot(dx, dy);
          const clampDist = Math.min(dist, 36);
          setPointerOffset(
            dist > 1 ? { x: (dx / dist) * clampDist, y: (dy / dist) * clampDist } : { x: 0, y: 0 },
          );
        }}
        onPointerUp={(e) => {
          if (pointerIdRef.current !== e.pointerId) return;
          e.stopPropagation();
          commitAndClose(hoveredRef.current);
        }}
        onPointerCancel={(e) => {
          if (pointerIdRef.current !== e.pointerId) return;
          e.stopPropagation();
          commitAndClose(null);
        }}
        className={`pointer-events-auto fixed z-30 flex h-13 w-13 flex-col items-center justify-center rounded-full border backdrop-blur-md transition-transform duration-100 cursor-pointer touch-none shadow-[0_4px_14px_rgba(0,0,0,0.45)] ${
          open ? 'scale-95 ring-2 ring-amber-300/60' : 'active:scale-90'
        } ${activeButtonRing}`}
      >
        {renderSlotIcon(activeSlot, 'h-5 w-5')}
        <span className="mt-0.5 text-[9px] font-mono-tabular leading-none opacity-85">
          {activeButtonLabel}
        </span>
      </button>

      {open && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-40">
          <div
            style={{
              left: `${wheelCenter.x}px`,
              top: `${wheelCenter.y}px`,
              width: `${WHEEL_RADIUS * 2}px`,
              height: `${WHEEL_RADIUS * 2}px`,
              transform: 'translate(-50%, -50%)',
            }}
            className="fixed rounded-full border border-white/15 bg-[#070a10]/82 backdrop-blur-md shadow-[0_12px_40px_rgba(0,0,0,0.75)]"
          >
            {/* 9-sector divider ring */}
            <svg viewBox="0 0 244 244" className="absolute inset-0 h-full w-full">
              <circle
                cx="122"
                cy="122"
                r="116"
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="1"
              />
              <circle
                cx="122"
                cy="122"
                r="35"
                fill="rgba(9,13,20,0.82)"
                stroke="rgba(255,255,255,0.14)"
                strokeWidth="1"
              />
              {[-70, -30, 10, 50, 90, 130, 170, 210, 250].map((deg) => {
                const r = (deg * Math.PI) / 180;
                return (
                  <line
                    key={deg}
                    x1={122 + Math.cos(r) * 36}
                    y1={122 + Math.sin(r) * 36}
                    x2={122 + Math.cos(r) * 115}
                    y2={122 + Math.sin(r) * 115}
                    stroke="rgba(255,255,255,0.09)"
                    strokeWidth="1"
                  />
                );
              })}
            </svg>

            {/* Radial weapon nodes */}
            {WHEEL_OPTIONS.map((opt) => {
              const rad = (opt.angleDeg * Math.PI) / 180;
              const nx = WHEEL_RADIUS + Math.cos(rad) * NODE_ORBIT_RADIUS;
              const ny = WHEEL_RADIUS + Math.sin(rad) * NODE_ORBIT_RADIUS;
              const isHovered = hoveredSlot === opt.id;
              const isEquipped = activeSlot === opt.id;
              const locked = isWeaponLocked(opt.id);
              const available = isOptionAvailable(opt.id);

              return (
                <div
                  key={opt.id}
                  style={{
                    left: `${nx}px`,
                    top: `${ny}px`,
                    transform: `translate(-50%, -50%) scale(${isHovered ? 1.16 : 1})`,
                  }}
                  className={`absolute flex h-11 w-11 flex-col items-center justify-center rounded-full border transition-all duration-100 ${
                    isHovered
                      ? locked
                        ? 'border-rose-400/60 bg-rose-950/60 text-rose-200 ring-2 ring-rose-400/35'
                        : `${opt.accentBorder} ${opt.accentBg} ${opt.accentText} shadow-[0_0_20px_rgba(251,191,36,0.3)] ring-2 ring-white/35`
                      : isEquipped
                        ? 'border-white/50 bg-white/15 text-white'
                        : available
                          ? 'border-white/14 bg-slate-900/78 text-slate-200'
                          : 'border-white/8 bg-slate-950/65 text-slate-500 opacity-45'
                  }`}
                >
                  {locked && (
                    <Lock className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-[#090d14] p-0.5 text-slate-400" />
                  )}
                  {renderSlotIcon(opt.id, 'h-4 w-4')}
                  <span className="mt-0.5 text-[8px] font-mono-tabular leading-none">
                    {getOptionCountLabel(opt.id)}
                  </span>
                </div>
              );
            })}

            {/* Center hub */}
            <div className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center text-center">
              <div
                style={{
                  transform: `translate(${pointerOffset.x * 0.35}px, ${pointerOffset.y * 0.35}px)`,
                }}
                className="flex flex-col items-center justify-center transition-transform duration-75"
              >
                <span className="text-[9.5px] font-semibold leading-tight text-slate-100">
                  {hoveredLabel ?? 'Desliza'}
                </span>
                {hoveredMeta && (
                  <span
                    className={`mt-0.5 text-[9px] font-mono-tabular leading-none ${
                      isWeaponLocked(hoveredMeta.id) ? 'text-rose-300' : 'text-amber-300'
                    }`}
                  >
                    {getOptionCountLabel(hoveredMeta.id)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
