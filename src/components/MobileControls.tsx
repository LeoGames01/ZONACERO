import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  Bomb,
  ChevronDown,
  Crosshair,
  Flame,
  FlaskConical,
  Hand,
  RefreshCw,
  RotateCcw,
  Target,
  Volume2,
} from 'lucide-react';
import { DEFAULT_TOUCH_LAYOUT } from '../game/settingsDefaults';
import type {
  DistractionKind,
  EquippedThrowableKind,
  MovementStance,
  ThrowableKind,
  TouchLayoutConfig,
  UnlockedWeapons,
  WeaponKind,
} from '../game/types';
import { RadialWeaponWheel } from './RadialWeaponWheel';
import { WeaponIcon } from './WeaponCarousel';

interface MobileControlsProps {
  weapon: WeaponKind;
  unlockedWeapons: UnlockedWeapons;
  arrows: number;
  bowDrawProgress: number;
  stance: MovementStance;
  stealthState: 'hidden' | 'caution' | 'detected';
  isAiming: boolean;
  isReloading: boolean;
  pistolAmmo: number;
  pistolMaxAmmo: number;
  rifleAmmo: number;
  rifleMaxAmmo: number;
  hasBackpack: boolean;
  molotovCount: number;
  nailBombCount: number;
  distractionCounts: Record<DistractionKind, number>;
  totalDistractions: number;
  activeDistractionKind: DistractionKind;
  molotovLit: boolean;
  nailBombLit: boolean;
  equippedThrowable: EquippedThrowableKind | null;
  aimingThrowable: ThrowableKind | null;
  touchLayout: TouchLayoutConfig;
  onMove: (x: number, y: number, sprint?: boolean) => void;
  onCameraVelocity: (yawVel: number, pitchVel: number) => void;
  onRotateCamera: (deltaYaw: number, deltaPitch: number) => void;
  onFireChange: (active: boolean) => void;
  onAimChange: (active: boolean) => void;
  onJump: () => void;
  onToggleCrouch: () => void;
  onReload: () => void;
  onBeginThrowable: (kind: ThrowableKind) => void;
  onReleaseThrowable: (kind: ThrowableKind) => void;
  onSelectWeapon: (weapon: WeaponKind) => void;
  onEquipThrowable: (kind: EquippedThrowableKind) => void;
  onCycleDistraction: () => void;
}

const MOVE_DEADZONE = 6;
const MOVE_WALK_RADIUS = 44;
const MOVE_MAX_RADIUS = 74;

function safeSetPointerCapture(el: Element | null | undefined, pointerId: number) {
  if (!el || typeof el.setPointerCapture !== 'function') return;
  try {
    if (typeof el.hasPointerCapture === 'function' && el.hasPointerCapture(pointerId)) {
      return;
    }
    el.setPointerCapture(pointerId);
  } catch {
    // Ignore InvalidStateError when pointer is no longer active or cannot be captured
  }
}

const MobileControlsInner: React.FC<MobileControlsProps> = ({
  weapon,
  unlockedWeapons,
  arrows,
  bowDrawProgress,
  stance,
  stealthState,
  isAiming,
  isReloading,
  pistolAmmo,
  pistolMaxAmmo,
  rifleAmmo,
  rifleMaxAmmo,
  hasBackpack,
  molotovCount,
  nailBombCount,
  distractionCounts,
  totalDistractions,
  activeDistractionKind,
  molotovLit,
  nailBombLit,
  equippedThrowable,
  aimingThrowable,
  touchLayout,
  onMove,
  onCameraVelocity,
  onRotateCamera,
  onFireChange,
  onAimChange,
  onJump,
  onToggleCrouch,
  onReload,
  onBeginThrowable,
  onReleaseThrowable,
  onSelectWeapon,
  onEquipThrowable,
  onCycleDistraction,
}) => {
  const movePointerIdRef = useRef<number | null>(null);
  const moveOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const camPointerIdRef = useRef<number | null>(null);
  const camLastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const firePointerIdRef = useRef<number | null>(null);
  const fireCamLastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const fireThrowableModeRef = useRef<EquippedThrowableKind | null>(null);
  const [firing, setFiring] = useState(false);

  const cleanupCallbacksRef = useRef({
    onMove,
    onCameraVelocity,
    onRotateCamera,
    onFireChange,
    onAimChange,
    onReleaseThrowable,
  });
  cleanupCallbacksRef.current = {
    onMove,
    onCameraVelocity,
    onRotateCamera,
    onFireChange,
    onAimChange,
    onReleaseThrowable,
  };

  useEffect(() => {
    const resetAllTouches = () => {
      if (movePointerIdRef.current !== null) {
        movePointerIdRef.current = null;
        cleanupCallbacksRef.current.onMove(0, 0, false);
      }
      if (camPointerIdRef.current !== null) {
        camPointerIdRef.current = null;
        cleanupCallbacksRef.current.onCameraVelocity(0, 0);
      }
      if (firePointerIdRef.current !== null) {
        firePointerIdRef.current = null;
        setFiring(false);
        cleanupCallbacksRef.current.onFireChange(false);
        if (fireThrowableModeRef.current) {
          const kind = fireThrowableModeRef.current;
          fireThrowableModeRef.current = null;
          cleanupCallbacksRef.current.onReleaseThrowable(kind);
        }
      }
    };

    const handleGlobalPointerEnd = (e: PointerEvent) => {
      if (movePointerIdRef.current === e.pointerId) {
        movePointerIdRef.current = null;
        cleanupCallbacksRef.current.onMove(0, 0, false);
      }
      if (camPointerIdRef.current === e.pointerId) {
        camPointerIdRef.current = null;
      }
      if (firePointerIdRef.current === e.pointerId) {
        firePointerIdRef.current = null;
        setFiring(false);
        cleanupCallbacksRef.current.onFireChange(false);
        if (fireThrowableModeRef.current) {
          const kind = fireThrowableModeRef.current;
          fireThrowableModeRef.current = null;
          cleanupCallbacksRef.current.onReleaseThrowable(kind);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) resetAllTouches();
    };

    window.addEventListener('pointerup', handleGlobalPointerEnd);
    window.addEventListener('pointercancel', handleGlobalPointerEnd);
    window.addEventListener('blur', resetAllTouches);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerEnd);
      window.removeEventListener('pointercancel', handleGlobalPointerEnd);
      window.removeEventListener('blur', resetAllTouches);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cleanupCallbacksRef.current.onMove(0, 0, false);
      cleanupCallbacksRef.current.onCameraVelocity(0, 0);
      cleanupCallbacksRef.current.onFireChange(false);
      cleanupCallbacksRef.current.onAimChange(false);
    };
  }, []);

  const fireVisible = (touchLayout.fire ?? DEFAULT_TOUCH_LAYOUT.fire).visible;
  useEffect(() => {
    if (!fireVisible && (firing || firePointerIdRef.current !== null)) {
      firePointerIdRef.current = null;
      fireThrowableModeRef.current = null;
      setFiring(false);
      cleanupCallbacksRef.current.onFireChange(false);
    }
  }, [fireVisible, firing]);

  const updateFloatingMove = (clientX: number, clientY: number) => {
    let dx = clientX - moveOriginRef.current.x;
    let dy = clientY - moveOriginRef.current.y;
    let dist = Math.hypot(dx, dy);

    if (dist > MOVE_MAX_RADIUS) {
      const pull = (dist - MOVE_MAX_RADIUS) / dist;
      moveOriginRef.current.x += dx * pull;
      moveOriginRef.current.y += dy * pull;
      dx = clientX - moveOriginRef.current.x;
      dy = clientY - moveOriginRef.current.y;
      dist = MOVE_MAX_RADIUS;
    }

    if (dist <= MOVE_DEADZONE) {
      onMove(0, 0, false);
      return;
    }

    const ux = dx / dist;
    const uy = -dy / dist;

    if (dist <= MOVE_WALK_RADIUS) {
      const walkMag = 0.28 + ((dist - MOVE_DEADZONE) / (MOVE_WALK_RADIUS - MOVE_DEADZONE)) * 0.57;
      onMove(ux * walkMag, uy * walkMag, false);
    } else {
      onMove(ux, uy, true);
    }
  };

  const resetFloatingMove = () => {
    movePointerIdRef.current = null;
    onMove(0, 0, false);
  };

  const getCfg = (id: keyof TouchLayoutConfig) => touchLayout[id] ?? DEFAULT_TOUCH_LAYOUT[id];
  const btnStyle = (id: keyof TouchLayoutConfig): React.CSSProperties => {
    const cfg = getCfg(id);
    return {
      left: `${cfg.xPct}%`,
      top: `${cfg.yPct}%`,
      opacity: cfg.opacity,
      transform: `translate(-50%, -50%) scale(${cfg.scale})`,
    };
  };

  const subtleBtnBase =
    'pointer-events-auto fixed flex items-center justify-center rounded-full border backdrop-blur-sm transition-transform duration-100 active:scale-90 cursor-pointer touch-none shadow-[0_2px_10px_rgba(0,0,0,0.35)]';

  const isThrowableEquipped = equippedThrowable !== null;
  const isDistractionEquipped =
    equippedThrowable === 'bottle' ||
    equippedThrowable === 'can' ||
    equippedThrowable === 'brick' ||
    equippedThrowable === 'decoy_rat';
  const activeFuseLit =
    (equippedThrowable === 'molotov' && molotovLit) ||
    (equippedThrowable === 'nail_bomb' && nailBombLit);
  const isAimingActiveThrowable =
    equippedThrowable !== null && aimingThrowable === equippedThrowable;

  const fireBtnClasses = isThrowableEquipped
    ? isAimingActiveThrowable
      ? isDistractionEquipped
        ? 'bg-lime-400/90 border-lime-100 text-slate-950 scale-105 ring-4 ring-lime-400/35'
        : 'bg-orange-500/90 border-amber-100 text-slate-950 scale-105 ring-4 ring-orange-400/35'
      : activeFuseLit
        ? equippedThrowable === 'molotov'
          ? 'bg-orange-500/75 border-amber-200 text-slate-950 ring-2 ring-orange-400/50'
          : 'bg-sky-400/80 border-white text-slate-950 ring-2 ring-sky-300/50'
        : equippedThrowable === 'molotov'
          ? 'bg-orange-950/70 border-orange-300/65 text-orange-100'
          : equippedThrowable === 'nail_bomb'
            ? 'bg-sky-950/70 border-sky-300/65 text-sky-100'
            : 'bg-lime-950/75 border-lime-300/70 text-lime-100'
    : firing
      ? weapon === 'bow'
        ? bowDrawProgress >= 0.85
          ? 'bg-emerald-500/90 border-emerald-100 text-slate-950 scale-105 ring-4 ring-emerald-400/40'
          : 'bg-teal-500/85 border-teal-200 text-slate-950 scale-95 ring-2 ring-teal-300/40'
        : 'bg-rose-500/90 border-rose-200 text-white scale-95'
      : weapon === 'unarmed'
        ? 'bg-emerald-500/70 border-emerald-200/80 text-slate-950'
        : weapon === 'baton'
          ? 'bg-blue-500/75 border-blue-200/85 text-white'
          : weapon === 'stick'
            ? 'bg-orange-500/75 border-orange-200/80 text-slate-950'
            : weapon === 'bow'
              ? 'bg-teal-500/75 border-teal-200/80 text-slate-950'
              : 'bg-amber-500/75 border-amber-200/80 text-slate-950';

  return (
    <div
      className="pointer-events-none fixed inset-0 z-20 select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* INVISIBLE 360° LOWER-LEFT TOUCH PAD: WALK & RUN */}
      <div
        aria-label="Zona táctil de movimiento 360 grados"
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          movePointerIdRef.current = e.pointerId;
          moveOriginRef.current = { x: e.clientX, y: e.clientY };
          safeSetPointerCapture(e.currentTarget, e.pointerId);
          onMove(0, 0, false);
        }}
        onPointerMove={(e) => {
          if (movePointerIdRef.current !== e.pointerId) return;
          e.stopPropagation();
          updateFloatingMove(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (movePointerIdRef.current !== e.pointerId) return;
          e.stopPropagation();
          resetFloatingMove();
        }}
        onPointerCancel={(e) => {
          if (movePointerIdRef.current !== e.pointerId) return;
          e.stopPropagation();
          resetFloatingMove();
        }}
        className="pointer-events-auto fixed bottom-0 left-0 h-[52vh] w-[44vw] bg-transparent touch-none"
      />

      {/* INVISIBLE 360° LOWER-RIGHT TOUCH PAD: CAMERA LOOK */}
      <div
        aria-label="Zona táctil de cámara 360 grados"
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          camPointerIdRef.current = e.pointerId;
          camLastPosRef.current = { x: e.clientX, y: e.clientY };
          safeSetPointerCapture(e.currentTarget, e.pointerId);
        }}
        onPointerMove={(e) => {
          if (camPointerIdRef.current !== e.pointerId) return;
          e.stopPropagation();
          const dx = e.clientX - camLastPosRef.current.x;
          const dy = e.clientY - camLastPosRef.current.y;
          camLastPosRef.current = { x: e.clientX, y: e.clientY };
          const sens = isAiming ? 0.0044 : 0.0068;
          onRotateCamera(-dx * sens, dy * sens);
        }}
        onPointerUp={(e) => {
          if (camPointerIdRef.current !== e.pointerId) return;
          e.stopPropagation();
          camPointerIdRef.current = null;
        }}
        onPointerCancel={(e) => {
          if (camPointerIdRef.current !== e.pointerId) return;
          e.stopPropagation();
          camPointerIdRef.current = null;
        }}
        className="pointer-events-auto fixed bottom-0 right-0 h-[52vh] w-[56vw] bg-transparent touch-none"
      />

      {/* MINIMALIST FLOATING TOUCH CONTROLS */}
      <div className="pointer-events-none fixed inset-0 z-30 touch-none">
        {getCfg('crouch').visible && (
          <button
            type="button"
            title="Agacharse / Sigilo"
            aria-label="Agacharse (Sigilo)"
            style={btnStyle('crouch')}
            onPointerDown={(e) => {
              e.stopPropagation();
              onToggleCrouch();
            }}
            className={`h-11 w-11 ${subtleBtnBase} ${
              stance === 'crouch'
                ? stealthState === 'detected'
                  ? 'bg-rose-500/35 border-rose-300/85 text-rose-100'
                  : stealthState === 'caution'
                    ? 'bg-amber-500/35 border-amber-300/85 text-amber-100'
                    : 'bg-emerald-500/40 border-emerald-300/85 text-emerald-100 ring-2 ring-emerald-400/25'
                : 'bg-[#090d14]/45 border-white/15 text-slate-200'
            }`}
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        )}

        {getCfg('jump').visible && (
          <button
            type="button"
            style={btnStyle('jump')}
            onPointerDown={(e) => {
              e.stopPropagation();
              onJump();
            }}
            aria-label="Saltar"
            className={`h-11 w-11 ${subtleBtnBase} bg-[#090d14]/45 border-white/15 text-slate-100`}
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        )}

        {getCfg('reload').visible &&
          !isThrowableEquipped &&
          (weapon === 'pistol' || weapon === 'rifle') && (
          <button
            type="button"
            style={btnStyle('reload')}
            onPointerDown={(e) => {
              e.stopPropagation();
              onReload();
            }}
            aria-label="Recargar"
            className={`h-11 w-11 ${subtleBtnBase} ${
              isReloading
                ? 'bg-amber-500/35 border-amber-300 text-amber-100'
                : 'bg-[#090d14]/45 border-white/15 text-slate-200'
            }`}
          >
            <RotateCcw className={`h-4 w-4 ${isReloading ? 'animate-spin' : ''}`} />
          </button>
        )}

        {getCfg('aim').visible && !isThrowableEquipped && (
          <button
            type="button"
            style={btnStyle('aim')}
            onPointerDown={(e) => {
              e.stopPropagation();
              onAimChange(!isAiming);
            }}
            aria-label="Apuntar"
            className={`h-11 w-11 ${subtleBtnBase} ${
              isAiming
                ? 'bg-amber-500/35 border-amber-300 text-amber-100'
                : 'bg-[#090d14]/45 border-white/15 text-slate-100'
            }`}
          >
            <Target className="h-5 w-5" />
          </button>
        )}

        {/* SINGLE FLOATING WEAPON BUTTON WITH RADIAL WHEEL */}
        {getCfg('weapon').visible && (
          <RadialWeaponWheel
            weapon={weapon}
            unlockedWeapons={unlockedWeapons}
            arrows={arrows}
            equippedThrowable={equippedThrowable}
            molotovLit={molotovLit}
            nailBombLit={nailBombLit}
            pistolAmmo={pistolAmmo}
            pistolMaxAmmo={pistolMaxAmmo}
            rifleAmmo={rifleAmmo}
            rifleMaxAmmo={rifleMaxAmmo}
            hasBackpack={hasBackpack}
            molotovCount={molotovCount}
            nailBombCount={nailBombCount}
            totalDistractions={totalDistractions}
            activeDistractionKind={activeDistractionKind}
            style={btnStyle('weapon')}
            onSelectWeapon={onSelectWeapon}
            onEquipThrowable={onEquipThrowable}
          />
        )}

        {/* COMPACT DISTRACTION TYPE CHIP WHEN A DISTRACTION IS EQUIPPED */}
        {isDistractionEquipped && totalDistractions > 0 && (
          <button
            type="button"
            style={{
              left: `${Math.max(12, (getCfg('weapon').xPct ?? 72) - 10)}%`,
              top: `${Math.max(12, (getCfg('weapon').yPct ?? 64) - 9)}%`,
              transform: 'translate(-50%, -50%)',
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              onCycleDistraction();
            }}
            aria-label="Cambiar objeto de distracción"
            className="pointer-events-auto fixed z-30 flex items-center gap-1 rounded-full border border-lime-300/55 bg-[#090d14]/80 px-2.5 py-1 text-[10px] font-mono-tabular text-lime-100 backdrop-blur-md active:scale-95 cursor-pointer touch-none"
          >
            <RefreshCw className="h-3 w-3 text-lime-300" />
            <span>
              {activeDistractionKind === 'bottle'
                ? `Botella ×${distractionCounts.bottle}`
                : activeDistractionKind === 'can'
                  ? `Lata ×${distractionCounts.can}`
                  : activeDistractionKind === 'brick'
                    ? `Ladrillo ×${distractionCounts.brick}`
                    : `Rata señuelo ×${distractionCounts.decoy_rat}`}
            </span>
          </button>
        )}

        {/* MULTIFUNCTION FIRE / THROWABLE / INTEGRATED CAMERA DRAG BUTTON */}
        {getCfg('fire').visible && (
          <button
            type="button"
            style={btnStyle('fire')}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              firePointerIdRef.current = e.pointerId;
              fireCamLastPosRef.current = { x: e.clientX, y: e.clientY };
              safeSetPointerCapture(e.currentTarget, e.pointerId);

              if (equippedThrowable !== null) {
                fireThrowableModeRef.current = equippedThrowable;
                onBeginThrowable(equippedThrowable);
              } else {
                fireThrowableModeRef.current = null;
                setFiring(true);
                onFireChange(true);
              }
            }}
            onPointerMove={(e) => {
              if (firePointerIdRef.current !== e.pointerId) return;
              e.stopPropagation();
              const dx = e.clientX - fireCamLastPosRef.current.x;
              const dy = e.clientY - fireCamLastPosRef.current.y;
              fireCamLastPosRef.current = { x: e.clientX, y: e.clientY };
              const sens = isAiming || aimingThrowable ? 0.0042 : 0.0064;
              onRotateCamera(-dx * sens, dy * sens);
            }}
            onPointerUp={(e) => {
              e.stopPropagation();
              if (firePointerIdRef.current === e.pointerId || firePointerIdRef.current === null) {
                firePointerIdRef.current = null;
                setFiring(false);
                onFireChange(false);
                if (fireThrowableModeRef.current) {
                  const kind = fireThrowableModeRef.current;
                  fireThrowableModeRef.current = null;
                  onReleaseThrowable(kind);
                }
              }
            }}
            onPointerCancel={(e) => {
              e.stopPropagation();
              if (firePointerIdRef.current === e.pointerId || firePointerIdRef.current === null) {
                firePointerIdRef.current = null;
                setFiring(false);
                onFireChange(false);
                if (fireThrowableModeRef.current) {
                  const kind = fireThrowableModeRef.current;
                  fireThrowableModeRef.current = null;
                  onReleaseThrowable(kind);
                }
              }
            }}
            aria-label={
              equippedThrowable === 'molotov'
                ? activeFuseLit
                  ? 'Mantener para apuntar Molotov y soltar para lanzar'
                  : 'Encender Molotov'
                : equippedThrowable === 'nail_bomb'
                  ? activeFuseLit
                    ? 'Mantener para apuntar Bomba de clavos y soltar para lanzar'
                    : 'Encender Bomba de clavos'
                  : isDistractionEquipped
                    ? 'Mantener para apuntar distracción y soltar para lanzar'
                    : weapon === 'unarmed'
                      ? 'Golpear / Eliminación sigilosa'
                      : weapon === 'baton'
                        ? 'Golpear con bastón / Eliminación sigilosa'
                        : weapon === 'stick'
                          ? 'Golpear con palo / Eliminación sigilosa'
                          : weapon === 'bow'
                            ? 'Mantener para tensar arco y soltar para disparar'
                            : 'Disparar y mover cámara'
            }
            className={`pointer-events-auto fixed h-16 w-16 rounded-full border-2 flex items-center justify-center backdrop-blur-sm transition-all duration-100 cursor-pointer touch-none shadow-[0_6px_20px_rgba(0,0,0,0.45)] ${fireBtnClasses}`}
          >
            {equippedThrowable === 'molotov' ? (
              activeFuseLit ? (
                <Flame className="h-7 w-7 animate-pulse" />
              ) : (
                <FlaskConical className="h-6 w-6" />
              )
            ) : equippedThrowable === 'nail_bomb' ? (
              activeFuseLit ? (
                <Flame className="h-7 w-7 animate-pulse" />
              ) : (
                <Bomb className="h-6 w-6" />
              )
            ) : isDistractionEquipped ? (
              <Volume2 className="h-6 w-6" />
            ) : weapon === 'unarmed' ? (
              <Hand className="h-6 w-6" />
            ) : weapon === 'baton' ? (
              <WeaponIcon weapon="baton" className="h-6 w-6" />
            ) : weapon === 'stick' ? (
              <WeaponIcon weapon="stick" className="h-6 w-6" />
            ) : weapon === 'bow' ? (
              <WeaponIcon weapon="bow" className="h-7 w-7" />
            ) : (
              <Crosshair className="h-7 w-7" />
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export const MobileControls = React.memo(MobileControlsInner);
