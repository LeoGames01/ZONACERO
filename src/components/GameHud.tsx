import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRightLeft,
  Backpack,
  Bandage,
  Bomb,
  BookOpen,
  Building2,
  Check,
  Copy,
  Crosshair,
  DoorOpen,
  Flame,
  FlaskConical,
  Gamepad2,
  Hammer,
  Hand,
  Image as ImageIcon,
  Info,
  Layers,
  Lock,
  MapPin,
  Moon,
  Navigation,
  Package,
  Pause,
  Play,
  Radio,
  RotateCcw,
  ShieldCheck,
  SkipForward,
  Sparkles,
  Sun,
  Target,
  Trash2,
  Truck,
  Upload,
  Utensils,
  Volume2,
  VolumeX,
  Wrench,
  X,
} from 'lucide-react';
import { INVENTORY_ITEM_META, PROP_CATEGORIES } from '../game/settingsDefaults';
import type {
  BaseCraftRecipeId,
  DifficultyId,
  EquippedThrowableKind,
  FastTravelDestinationId,
  HudSnapshot,
  InventoryItemKind,
  MapMaterialSettings,
  PlacedWorldProp,
  TextureTargetId,
  ThrowableKind,
  TouchLayoutConfig,
  VehicleModuleId,
  WeaponKind,
  WorldPropCategory,
} from '../game/types';
import { BloodSplatterOverlay } from './BloodSplatterOverlay';
import { MiniMap } from './MiniMap';
import { MobileControls } from './MobileControls';
import type { StudioTab } from './StudioModal';
import { TitleBillboardMenu } from './TitleBillboardMenu';
import { TutorialModal } from './TutorialModal';

interface GameHudProps {
  hud: HudSnapshot;
  touchLayout: TouchLayoutConfig;
  mobileControlsEnabled: boolean;
  studioOpen?: boolean;
  pinModalOpen?: boolean;
  onToggleMobileControls: () => void;
  onMobileMove: (x: number, y: number, sprint?: boolean) => void;
  onMobileCameraVelocity: (yawVel: number, pitchVel: number) => void;
  onMobileRotateCamera: (deltaYaw: number, deltaPitch: number) => void;
  onMobileCenterCamera: () => void;
  onMobileFireChange: (active: boolean) => void;
  onMobileAimChange: (active: boolean) => void;
  onMobileJump: () => void;
  onMobileToggleCrouch: () => void;
  onMobileReload: () => void;
  onBeginThrowable: (kind: ThrowableKind, slotIndex?: number) => void;
  onReleaseThrowable: (kind?: ThrowableKind) => void;
  onSelectWeapon: (weapon: WeaponKind) => void;
  onEquipThrowable: (kind: EquippedThrowableKind) => void;
  onCycleDistraction: () => void;
  onSearchTrash: () => void;
  onCraftDecoyRat: () => void;
  onUseBandage: () => void;
  onUseFood: () => void;
  onUseInventorySlot: (index: number) => void;
  onMoveInventorySlot: (fromIndex: number, toIndex: number) => void;
  onDropInventorySlot: (index: number) => void;
  onStart: () => void;
  onStartTutorial: () => void;
  onAdvanceTutorialStep: () => void;
  onStartMission2: () => void;
  onContinueToMission2: () => void;
  onStartMission3: () => void;
  onContinueToMission3: () => void;
  onHelpMechanic: () => void;
  onRepairVehicleModule: (moduleId: VehicleModuleId) => { ok: boolean; message: string };
  onFastTravelWithVehicle: (dest: FastTravelDestinationId) => void;
  onSkipCutscene: () => void;
  onSkipAllyCutscene: () => void;
  onEnterColonBase: () => void;
  onCraftAtBase: (recipeId: BaseCraftRecipeId) => { ok: boolean; message: string };
  onTravelToExterior: () => void;
  onReturnToColonBase: () => void;
  onResume: () => void;
  onPause: () => void;
  onReturnToTitle: () => void;
  onSelectDifficulty: (diff: DifficultyId) => void;
  onToggleMute: () => void;
  onOpenStudio: (tab?: StudioTab) => void;
  onExitEditorMode: () => void;
  onSelectPlacementSlot: (slotId: string | null) => void;
  onPlacePropNearPlayer: (slotId: string) => void;
  onUpdatePlacedProp: (instanceId: string, patch: Partial<PlacedWorldProp>) => void;
  onDuplicatePlacedProp: (instanceId: string) => void;
  onRemovePlacedProp: (instanceId: string) => void;
  onClearAllPlacedProps: () => void;
  onUpdateMapSettings: (patch: Partial<MapMaterialSettings>) => void;
  onUploadWorldPropGlb: (category: WorldPropCategory, file: File) => void;
  onUploadTexture: (target: TextureTargetId, file: File) => void;
}

const DIFFICULTIES: { id: DifficultyId; label: string; detail: string }[] = [
  { id: 'pilgrim', label: 'Superviviente', detail: '125 HP · Moderado' },
  { id: 'warden', label: 'Veterano', detail: '100 HP · Equilibrado' },
  { id: 'ascendant', label: 'Pesadilla', detail: '85 HP · Horda Feroz' },
];

function formatSurvivalTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const GameHud: React.FC<GameHudProps> = ({
  hud,
  touchLayout,
  mobileControlsEnabled,
  studioOpen = false,
  pinModalOpen = false,
  onToggleMobileControls,
  onMobileMove,
  onMobileCameraVelocity,
  onMobileRotateCamera,
  onMobileCenterCamera,
  onMobileFireChange,
  onMobileAimChange,
  onMobileJump,
  onMobileToggleCrouch,
  onMobileReload,
  onBeginThrowable,
  onReleaseThrowable,
  onSelectWeapon,
  onEquipThrowable,
  onCycleDistraction,
  onSearchTrash,
  onCraftDecoyRat,
  onUseBandage,
  onUseFood,
  onUseInventorySlot,
  onMoveInventorySlot,
  onDropInventorySlot,
  onStart,
  onStartTutorial,
  onAdvanceTutorialStep,
  onStartMission2,
  onContinueToMission2,
  onStartMission3,
  onContinueToMission3,
  onHelpMechanic,
  onRepairVehicleModule,
  onFastTravelWithVehicle,
  onSkipCutscene,
  onSkipAllyCutscene,
  onEnterColonBase,
  onCraftAtBase,
  onTravelToExterior,
  onReturnToColonBase,
  onResume,
  onPause,
  onReturnToTitle,
  onSelectDifficulty,
  onToggleMute,
  onOpenStudio,
  onExitEditorMode,
  onSelectPlacementSlot,
  onPlacePropNearPlayer,
  onUpdatePlacedProp,
  onDuplicatePlacedProp,
  onRemovePlacedProp,
  onClearAllPlacedProps,
  onUpdateMapSettings,
  onUploadWorldPropGlb,
  onUploadTexture,
}) => {
  const [canDismissDeath, setCanDismissDeath] = useState(false);
  const [editorPropCategory, setEditorPropCategory] = useState<WorldPropCategory>('building');
  const [infoExpanded, setInfoExpanded] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(() => !mobileControlsEnabled);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [workbenchOpen, setWorkbenchOpen] = useState(false);
  const [vehicleBayOpen, setVehicleBayOpen] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [craftFeedback, setCraftFeedback] = useState<string | null>(null);
  const [vehicleFeedback, setVehicleFeedback] = useState<string | null>(null);
  const [activeSlotIdx, setActiveSlotIdx] = useState<number | null>(null);
  const [movingFromIdx, setMovingFromIdx] = useState<number | null>(null);
  const [draggedSlotIdx, setDraggedSlotIdx] = useState<number | null>(null);
  const [dismissedNoticeKey, setDismissedNoticeKey] = useState<string | null>(null);
  const editorGlbRef = useRef<HTMLInputElement>(null);
  const editorGroundTexRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onOpenWorkbench = () => {
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
      setInventoryOpen(false);
      setVehicleBayOpen(false);
      setCraftFeedback(null);
      setWorkbenchOpen((prev) => !prev);
    };
    const onOpenVehicleBay = () => {
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
      setInventoryOpen(false);
      setWorkbenchOpen(false);
      setVehicleFeedback(null);
      setVehicleBayOpen((prev) => !prev);
    };
    window.addEventListener('zona-cero-open-workbench', onOpenWorkbench);
    window.addEventListener('zona-cero-open-vehicle-bay', onOpenVehicleBay);
    return () => {
      window.removeEventListener('zona-cero-open-workbench', onOpenWorkbench);
      window.removeEventListener('zona-cero-open-vehicle-bay', onOpenVehicleBay);
    };
  }, []);

  useEffect(() => {
    if (hud.gameState !== 'GAME_OVER') {
      setCanDismissDeath(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setCanDismissDeath(true);
    }, 1800);
    return () => window.clearTimeout(timer);
  }, [hud.gameState]);

  useEffect(() => {
    if (!hud.hasBackpack || hud.gameState !== 'PLAYING') {
      setInventoryOpen(false);
      setMovingFromIdx(null);
      setActiveSlotIdx(null);
    }
    if (hud.gameState !== 'PLAYING' || !hud.baseUnlocked) {
      setWorkbenchOpen(false);
    }
    if (hud.gameState !== 'PLAYING' || !hud.vehicleBayUnlocked) {
      setVehicleBayOpen(false);
    }
  }, [hud.hasBackpack, hud.gameState, hud.baseUnlocked, hud.vehicleBayUnlocked]);

  useEffect(() => {
    if (mobileControlsEnabled) {
      setMapExpanded(false);
    }
  }, [mobileControlsEnabled]);

  const activeToastText = hud.inventoryNotice || hud.mission.radioMessage || null;
  useEffect(() => {
    if (!activeToastText) return;
    setDismissedNoticeKey(null);
  }, [activeToastText]);

  const hpRatio = Math.max(0, Math.min(1, hud.hp / Math.max(1, hud.maxHp)));
  const hpPct = hpRatio * 100;
  const staminaRatio = Math.max(0, Math.min(1, hud.stamina / Math.max(1, hud.maxStamina)));
  const staminaPct = staminaRatio * 100;
  const missingHpRatio = 1 - hpRatio;
  const activeAmmo = hud.weapon === 'pistol' ? hud.pistolAmmo : hud.rifleAmmo;
  const activeMaxAmmo = hud.weapon === 'pistol' ? hud.pistolMaxAmmo : hud.rifleMaxAmmo;
  const activeReserve = hud.weapon === 'pistol' ? hud.pistolReserveAmmo : hud.rifleReserveAmmo;
  const occupiedSlotsCount = hud.inventory.filter((s) => s !== null).length;

  const hurtFlicker =
    hud.hurtFlash > 0
      ? (0.45 + 0.55 * Math.abs(Math.sin(hud.hurtFlash * Math.PI * 3.5))) * hud.hurtFlash
      : 0;
  const lowHpEdgeIntensity = missingHpRatio > 0.12 ? Math.pow(missingHpRatio, 1.35) * 0.58 : 0;
  const flashEdgeIntensity = hurtFlicker * (0.42 + missingHpRatio * 0.55);
  const vignetteOpacity =
    hud.gameState === 'PLAYING' && !hud.editorMode
      ? Math.min(0.95, lowHpEdgeIntensity + flashEdgeIntensity)
      : 0;

  const crosshairGap = Math.max(
    3.5,
    Math.min(44, 3.5 + hud.crosshairSpread * 25 + (hud.isFiring ? 3.5 : 0)),
  );
  const crosshairTickLen = hud.isAiming ? 8 : hud.weapon === 'pistol' ? 10 : 11;
  const crosshairHighSpread = hud.crosshairSpread > 0.72 || hud.isFiring;

  const selectedProp =
    hud.placedProps.find((p) => p.instanceId === hud.selectedPropId) ?? null;

  const showActiveGameplayHud =
    (hud.gameState === 'PLAYING' || hud.gameState === 'PAUSED') && !hud.editorMode;
  const missionPct = Math.min(
    100,
    Math.round(
      (hud.mission.killsCurrent / Math.max(1, hud.mission.killsTarget)) * 100,
    ),
  );
  const showFloatingNotice =
    hud.gameState === 'PLAYING' &&
    !hud.editorMode &&
    Boolean(activeToastText) &&
    dismissedNoticeKey !== activeToastText;

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between">
      {/* SCREEN-SPACE BLOOD SPLATTER OVERLAY ON DAMAGE */}
      <BloodSplatterOverlay
        damageSeq={hud.damageSeq}
        lastDamage={hud.lastDamage}
        hpRatio={hpRatio}
        gameState={hud.gameState}
        editorMode={hud.editorMode}
      />

      {/* VIÑETA ROJA DE DAÑO EN LOS BORDES */}
      {vignetteOpacity > 0.01 && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 -z-10 transition-opacity duration-75"
          style={{
            opacity: vignetteOpacity,
            background:
              'radial-gradient(circle at 50% 50%, rgba(185, 28, 28, 0) 44%, rgba(220, 38, 38, 0.38) 76%, rgba(153, 27, 27, 0.92) 100%)',
            boxShadow: `inset 0 0 ${Math.round(55 + missingHpRatio * 75)}px rgba(220, 38, 38, ${
              0.35 + missingHpRatio * 0.45
            })`,
          }}
        />
      )}

      {/* EDITOR 3D DEL MAPA (MODO INTERACTIVO) */}
      {hud.editorMode && (
        <div className="pointer-events-none fixed inset-0 z-30 flex flex-col justify-between p-3 sm:p-5">
          <input
            ref={editorGlbRef}
            type="file"
            accept=".glb"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUploadWorldPropGlb(editorPropCategory, f);
              e.target.value = '';
            }}
          />
          <input
            ref={editorGroundTexRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUploadTexture('ground', f);
              e.target.value = '';
            }}
          />

          <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-2 rounded-xl border border-sky-400/35 bg-[#090c12]/88 px-4 py-2.5 shadow-xl">
            <div className="text-xs text-slate-200">
              <span className="font-semibold text-sky-300">Editor 3D del Mapa:</span>{' '}
              Clic izquierdo coloca objeto · Arrastra para mover · Clic derecho / Shift orbita · WASD mueve cámara · Rueda hace zoom
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-lg border border-white/15 bg-slate-950/80 p-0.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => onUpdateMapSettings({ mapPreset: 'buenos_aires' })}
                  className={`rounded-md px-2.5 py-1 font-medium cursor-pointer transition-colors ${
                    hud.mapSettings.mapPreset === 'buenos_aires'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Av. 9 de Julio
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateMapSettings({ mapPreset: 'custom_sandbox' })}
                  className={`rounded-md px-2.5 py-1 font-medium cursor-pointer transition-colors ${
                    hud.mapSettings.mapPreset === 'custom_sandbox'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Terreno Simple
                </button>
              </div>
              <button
                type="button"
                onClick={() => onOpenStudio('map')}
                className="rounded-lg border border-white/15 bg-slate-800/75 px-3 py-1.5 text-xs font-medium text-slate-100 hover:border-amber-400/60 cursor-pointer"
              >
                Estudio
              </button>
              <button
                type="button"
                onClick={onExitEditorMode}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-slate-950 cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Listo</span>
              </button>
            </div>
          </div>

          <div className="pointer-events-auto mx-auto w-full max-w-4xl rounded-xl border border-white/15 bg-[#090c12]/88 p-3.5 shadow-2xl space-y-2.5">
            {/* Quick import row for building custom maps directly from simple terrain */}
            <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 font-medium">
                <Layers className="h-3.5 w-3.5" />
                <span>Construcción rápida:</span>
              </div>
              <select
                value={editorPropCategory}
                onChange={(e) => setEditorPropCategory(e.target.value as WorldPropCategory)}
                className="rounded-lg border border-white/15 bg-slate-950 px-2 py-1 text-[11px] text-slate-100"
              >
                {PROP_CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => editorGlbRef.current?.click()}
                className="flex items-center gap-1 rounded-lg bg-amber-500 hover:bg-amber-400 px-2.5 py-1 text-[11px] font-semibold text-slate-950 cursor-pointer"
              >
                <Upload className="h-3 w-3" />
                <span>Importar .glb</span>
              </button>
              <button
                type="button"
                onClick={() => editorGroundTexRef.current?.click()}
                className="flex items-center gap-1 rounded-lg border border-sky-400/50 bg-sky-500/15 hover:bg-sky-500/25 px-2.5 py-1 text-[11px] font-medium text-sky-100 cursor-pointer"
              >
                <ImageIcon className="h-3 w-3" />
                <span>Textura Suelo</span>
              </button>
              {hud.placedProps.length > 0 && (
                <button
                  type="button"
                  onClick={onClearAllPlacedProps}
                  className="ml-auto flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-950/60 px-2.5 py-1 text-[11px] text-rose-200 hover:bg-rose-900/70 cursor-pointer"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Vaciar ({hud.placedProps.length})</span>
                </button>
              )}
            </div>

            {hud.propSlots.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-400 mr-1">Slot activo:</span>
                {hud.propSlots.map((slot) => {
                  const active = hud.activePlacementSlotId === slot.id;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => onSelectPlacementSlot(slot.id)}
                      className={`rounded-lg border px-2.5 py-1 text-[11px] cursor-pointer ${
                        active
                          ? 'border-amber-400 bg-amber-500/20 text-amber-100'
                          : 'border-white/12 bg-slate-900 text-slate-300'
                      }`}
                    >
                      {slot.name}
                    </button>
                  );
                })}
                {hud.activePlacementSlotId && (
                  <button
                    type="button"
                    onClick={() => onPlacePropNearPlayer(hud.activePlacementSlotId!)}
                    className="ml-auto rounded-lg bg-amber-500 hover:bg-amber-400 px-2.5 py-1 text-[11px] font-semibold text-slate-950 cursor-pointer"
                  >
                    + Colocar frente al jugador
                  </button>
                )}
              </div>
            )}

            {selectedProp ? (
              <div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-2.5 text-xs">
                <span className="font-semibold text-sky-300 truncate max-w-[140px]">
                  {selectedProp.name}
                </span>
                {hud.propSlots.length > 1 && (
                  <select
                    value={selectedProp.slotId}
                    onChange={(e) => {
                      const nextSlot = hud.propSlots.find((s) => s.id === e.target.value);
                      if (nextSlot) {
                        onUpdatePlacedProp(selectedProp.instanceId, {
                          slotId: nextSlot.id,
                          category: nextSlot.category,
                          name: nextSlot.name,
                        });
                      }
                    }}
                    title="Cambiar modelo .glb del objeto seleccionado"
                    className="rounded-lg border border-white/15 bg-slate-950 px-2 py-1 text-[11px] text-sky-200 max-w-[150px]"
                  >
                    {hud.propSlots.map((slot) => (
                      <option key={slot.id} value={slot.id}>
                        {slot.name}
                      </option>
                    ))}
                  </select>
                )}
                <label className="flex items-center gap-1.5 text-slate-200">
                  <span>Escala {selectedProp.scale.toFixed(2)}x</span>
                  <input
                    type="range"
                    min={0.25}
                    max={5}
                    step={0.05}
                    value={selectedProp.scale}
                    onChange={(e) =>
                      onUpdatePlacedProp(selectedProp.instanceId, {
                        scale: Number(e.target.value),
                      })
                    }
                    className="w-20 accent-amber-400"
                  />
                </label>
                <label className="flex items-center gap-1.5 text-slate-200">
                  <span>Rot {Math.round(selectedProp.rotationY)}°</span>
                  <input
                    type="range"
                    min={0}
                    max={360}
                    step={5}
                    value={selectedProp.rotationY}
                    onChange={(e) =>
                      onUpdatePlacedProp(selectedProp.instanceId, {
                        rotationY: Number(e.target.value),
                      })
                    }
                    className="w-20 accent-amber-400"
                  />
                </label>
                <label className="flex items-center gap-1.5 text-slate-200">
                  <span>Y {selectedProp.yOffset.toFixed(1)}m</span>
                  <input
                    type="range"
                    min={-1.5}
                    max={6}
                    step={0.1}
                    value={selectedProp.yOffset}
                    onChange={(e) =>
                      onUpdatePlacedProp(selectedProp.instanceId, {
                        yOffset: Number(e.target.value),
                      })
                    }
                    className="w-16 accent-amber-400"
                  />
                </label>
                <label className="flex items-center gap-1.5 text-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedProp.solid}
                    onChange={(e) =>
                      onUpdatePlacedProp(selectedProp.instanceId, {
                        solid: e.target.checked,
                      })
                    }
                    className="accent-amber-400"
                  />
                  <span>Sólido</span>
                </label>
                <div className="ml-auto flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onDuplicatePlacedProp(selectedProp.instanceId)}
                    className="flex items-center gap-1 rounded-lg border border-sky-400/40 bg-sky-500/15 px-2.5 py-1 text-[11px] text-sky-100 hover:bg-sky-500/25 cursor-pointer"
                  >
                    <Copy className="h-3 w-3" />
                    <span>Duplicar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemovePlacedProp(selectedProp.instanceId)}
                    className="flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-950/60 px-2.5 py-1 text-[11px] text-rose-200 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Eliminar</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-t border-white/10 pt-2 text-[11px] text-slate-400">
                Haz clic en el terreno para colocar el modelo activo, o usa &quot;Importar .glb&quot; y &quot;Textura Suelo&quot; arriba.
              </div>
            )}
          </div>
        </div>
      )}

      {/* CENTER OVER-THE-SHOULDER DYNAMIC CROSSHAIR DURING PLAY */}
      {hud.gameState === 'PLAYING' && !hud.editorMode && (
        <div
          aria-hidden="true"
          className={`pointer-events-none fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-150 ${
            hud.isReloading ? 'opacity-45' : 'opacity-100'
          }`}
        >
          <div className="relative flex h-28 w-28 items-center justify-center">
            {hud.aimingThrowable !== null ? (
              <>
                <span
                  className={`h-1.5 w-1.5 rounded-full shadow-[0_0_2px_rgba(0,0,0,0.95)] ${
                    hud.aimingThrowable === 'nail_bomb' ? 'bg-sky-300' : 'bg-amber-300'
                  }`}
                />
                <span
                  className={`h-7 w-7 rounded-full border-[1.5px] border-dashed animate-pulse shadow-[0_0_4px_rgba(0,0,0,0.85)] ${
                    hud.aimingThrowable === 'nail_bomb'
                      ? 'border-sky-300/90'
                      : 'border-amber-300/90'
                  }`}
                />
              </>
            ) : hud.weapon === 'unarmed' || hud.weapon === 'stick' || hud.weapon === 'baton' ? (
              <>
                <span
                  className={`h-1 w-1 rounded-full shadow-[0_0_2px_rgba(0,0,0,0.95)] ${
                    hud.weapon === 'baton'
                      ? 'bg-sky-200'
                      : hud.weapon === 'stick'
                        ? 'bg-amber-200'
                        : 'bg-white/80'
                  }`}
                />
                <span
                  className={`absolute h-2.5 w-1 rounded-l-full border-l-[1.5px] shadow-[0_0_2px_rgba(0,0,0,0.9)] transition-transform duration-75 ease-out ${
                    hud.weapon === 'baton'
                      ? 'border-sky-300/90'
                      : hud.weapon === 'stick'
                        ? 'border-amber-300/85'
                        : 'border-white/75'
                  }`}
                  style={{ transform: `translateX(-${Math.round(crosshairGap * 0.65 + 4)}px)` }}
                />
                <span
                  className={`absolute h-2.5 w-1 rounded-r-full border-r-[1.5px] shadow-[0_0_2px_rgba(0,0,0,0.9)] transition-transform duration-75 ease-out ${
                    hud.weapon === 'baton'
                      ? 'border-sky-300/90'
                      : hud.weapon === 'stick'
                        ? 'border-amber-300/85'
                        : 'border-white/75'
                  }`}
                  style={{ transform: `translateX(${Math.round(crosshairGap * 0.65 + 4)}px)` }}
                />
              </>
            ) : hud.weapon === 'bow' ? (
              <>
                <svg
                  viewBox="0 0 44 44"
                  className="absolute h-11 w-11 -rotate-90 overflow-visible"
                >
                  <circle
                    cx="22"
                    cy="22"
                    r="16"
                    fill="none"
                    stroke="rgba(255,255,255,0.16)"
                    strokeWidth="1.6"
                  />
                  {hud.bowDrawProgress > 0.02 && (
                    <circle
                      cx="22"
                      cy="22"
                      r="16"
                      fill="none"
                      stroke={hud.bowDrawProgress >= 0.88 ? '#34d399' : '#2dd4bf'}
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 16}
                      strokeDashoffset={
                        2 * Math.PI * 16 * (1 - Math.min(1, Math.max(0, hud.bowDrawProgress)))
                      }
                    />
                  )}
                </svg>
                <span
                  className={`h-1.5 w-1.5 rounded-full shadow-[0_0_2px_rgba(0,0,0,0.95)] transition-colors ${
                    hud.bowDrawProgress >= 0.88
                      ? 'bg-emerald-300'
                      : hud.arrows <= 0
                        ? 'bg-rose-400'
                        : 'bg-teal-200'
                  }`}
                />
              </>
            ) : (
              <>
                <span
                  className={`h-1 w-1 rounded-full shadow-[0_0_2px_rgba(0,0,0,0.95)] transition-colors duration-100 ${
                    hud.isAiming
                      ? 'bg-amber-300'
                      : crosshairHighSpread
                        ? 'bg-amber-200'
                        : 'bg-white/95'
                  }`}
                />
                <span
                  className={`absolute h-[2px] rounded-full shadow-[0_0_2px_rgba(0,0,0,0.95)] transition-transform duration-75 ease-out ${
                    hud.isAiming
                      ? 'bg-amber-300'
                      : crosshairHighSpread
                        ? 'bg-amber-300/90'
                        : 'bg-white/90'
                  }`}
                  style={{
                    width: `${crosshairTickLen}px`,
                    transform: `translateX(-${crosshairGap + crosshairTickLen * 0.5}px)`,
                  }}
                />
                <span
                  className={`absolute h-[2px] rounded-full shadow-[0_0_2px_rgba(0,0,0,0.95)] transition-transform duration-75 ease-out ${
                    hud.isAiming
                      ? 'bg-amber-300'
                      : crosshairHighSpread
                        ? 'bg-amber-300/90'
                        : 'bg-white/90'
                  }`}
                  style={{
                    width: `${crosshairTickLen}px`,
                    transform: `translateX(${crosshairGap + crosshairTickLen * 0.5}px)`,
                  }}
                />
                <span
                  className={`absolute w-[2px] rounded-full shadow-[0_0_2px_rgba(0,0,0,0.95)] transition-transform duration-75 ease-out ${
                    hud.isAiming
                      ? 'bg-amber-300'
                      : crosshairHighSpread
                        ? 'bg-amber-300/90'
                        : 'bg-white/90'
                  }`}
                  style={{
                    height: `${crosshairTickLen}px`,
                    transform: `translateY(-${crosshairGap + crosshairTickLen * 0.5}px)`,
                  }}
                />
                <span
                  className={`absolute w-[2px] rounded-full shadow-[0_0_2px_rgba(0,0,0,0.95)] transition-transform duration-75 ease-out ${
                    hud.isAiming
                      ? 'bg-amber-300'
                      : crosshairHighSpread
                        ? 'bg-amber-300/90'
                        : 'bg-white/90'
                  }`}
                  style={{
                    height: `${crosshairTickLen}px`,
                    transform: `translateY(${crosshairGap + crosshairTickLen * 0.5}px)`,
                  }}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* MINIMALIST TOP HUD BAR (SOLO DURANTE PARTIDA / PAUSA) */}
      {showActiveGameplayHud && (
        <header className="flex items-start justify-between gap-2 px-3.5 pt-3 sm:px-5 sm:pt-4">
          {/* Top-Left: Barras ultra-minimalistas de Vida y Estamina + munición sutil sin burbujas */}
          <div className="flex flex-col gap-1.5 pt-0.5">
            <div className="flex items-center gap-2">
              <div className="h-[4px] w-28 sm:w-32 rounded-full bg-black/50 overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.85)]">
                <div
                  className={`h-full transition-[width] duration-150 ${
                    hpPct > 50
                      ? 'bg-emerald-400'
                      : hpPct > 25
                        ? 'bg-amber-400'
                        : 'bg-rose-500'
                  }`}
                  style={{ width: `${hpPct}%` }}
                />
              </div>
              <span className="font-mono-tabular text-[10px] font-semibold leading-none text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                {hud.hp}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="h-[3px] w-22 sm:w-28 rounded-full bg-black/45 overflow-hidden shadow-[0_1px_4px_rgba(0,0,0,0.85)]">
                <div
                  className={`h-full transition-[width] duration-100 ${
                    staminaPct < 22 ? 'bg-amber-400/90' : 'bg-sky-300/90'
                  }`}
                  style={{ width: `${staminaPct}%` }}
                />
              </div>
            </div>

            {(hud.helmetArmor > 0 || hud.vestArmor > 0) && (
              <div className="flex items-center gap-2.5 text-[9.5px] font-mono-tabular leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                {hud.helmetArmor > 0 && (
                  <div className="flex items-center gap-1 text-sky-200">
                    <span>Casco</span>
                    <div className="h-[3px] w-11 rounded-full bg-black/50 overflow-hidden">
                      <div
                        className="h-full bg-sky-400 transition-[width] duration-150"
                        style={{
                          width: `${Math.min(100, Math.round((hud.helmetArmor / Math.max(1, hud.helmetMaxArmor)) * 100))}%`,
                        }}
                      />
                    </div>
                    <span>{Math.ceil(hud.helmetArmor)}</span>
                  </div>
                )}
                {hud.vestArmor > 0 && (
                  <div className="flex items-center gap-1 text-emerald-200">
                    <span>Chaleco</span>
                    <div className="h-[3px] w-12 rounded-full bg-black/50 overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 transition-[width] duration-150"
                        style={{
                          width: `${Math.min(100, Math.round((hud.vestArmor / Math.max(1, hud.vestMaxArmor)) * 100))}%`,
                        }}
                      />
                    </div>
                    <span>{Math.ceil(hud.vestArmor)}</span>
                  </div>
                )}
              </div>
            )}

            {hud.mission.missionNumber === 3 &&
              hud.mechanicPos &&
              hud.activeZone === 'exterior_9_julio' && (
                <div className="flex items-center gap-1.5 text-[9.5px] font-mono-tabular leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                  <span className="text-amber-300 font-semibold">
                    Mateo{hud.mechanicLimping ? ' (Rengo)' : ''}
                  </span>
                  <div className="h-[3px] w-16 rounded-full bg-black/55 overflow-hidden">
                    <div
                      className={`h-full transition-[width] duration-150 ${
                        hud.mechanicHp > 50
                          ? 'bg-sky-400'
                          : hud.mechanicHp > 25
                            ? 'bg-amber-400'
                            : 'bg-rose-500'
                      }`}
                      style={{
                        width: `${Math.max(
                          0,
                          Math.min(100, Math.round((hud.mechanicHp / Math.max(1, hud.mechanicMaxHp)) * 100)),
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="text-slate-200">{Math.ceil(hud.mechanicHp)}</span>
                </div>
              )}

            <div className="mt-0.5 flex items-center gap-2 text-[10px] font-mono-tabular leading-none text-slate-200/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
              {hud.equippedThrowable === 'molotov' ? (
                <span className="text-orange-300">
                  Molotov ×{hud.molotovCount}
                  {hud.molotovLit ? ' · Encendida' : ''}
                </span>
              ) : hud.equippedThrowable === 'nail_bomb' ? (
                <span className="text-sky-300">
                  Clavos ×{hud.nailBombCount}
                  {hud.nailBombLit ? ' · Encendida' : ''}
                </span>
              ) : hud.equippedThrowable === 'bottle' ||
                hud.equippedThrowable === 'can' ||
                hud.equippedThrowable === 'brick' ||
                hud.equippedThrowable === 'decoy_rat' ? (
                <span className="text-lime-300">
                  {hud.equippedThrowable === 'bottle'
                    ? `Botella ×${hud.distractionCounts.bottle}`
                    : hud.equippedThrowable === 'can'
                      ? `Lata ×${hud.distractionCounts.can}`
                      : hud.equippedThrowable === 'brick'
                        ? `Ladrillo ×${hud.distractionCounts.brick}`
                        : `Rata señuelo ×${hud.distractionCounts.decoy_rat}`}
                </span>
              ) : hud.weapon === 'unarmed' ? (
                <span className="text-emerald-300">
                  {hud.stealthActive ? 'Puños · Eliminación sigilosa' : 'Puños · Sin arma'}
                </span>
              ) : hud.weapon === 'stick' ? (
                <span className="text-orange-300">
                  {hud.stealthActive ? 'Palo · Ataque sigiloso' : 'Palo de madera · Melee'}
                </span>
              ) : hud.weapon === 'baton' ? (
                <span className="text-sky-300">
                  {hud.stealthActive ? 'Bastón · Ataque sigiloso' : 'Bastón policía · Melee'}
                </span>
              ) : hud.weapon === 'bow' ? (
                <span className={hud.arrows <= 0 ? 'text-rose-300' : 'text-teal-300'}>
                  Arco · {hud.arrows} {hud.arrows === 1 ? 'flecha' : 'flechas'}
                  {hud.bowDrawProgress > 0.05 ? ' · Tensando' : ''}
                </span>
              ) : (
                <span>
                  {hud.weapon === 'pistol' ? 'Revólver' : 'FAL'} ·{' '}
                  {hud.isReloading ? 'Recargando' : `${activeAmmo}/${activeReserve}`}
                </span>
              )}
            </div>

            {/* Indicador ultra-minimalista de Sigilo, Ruido y Distracciones */}
            {(hud.stealthActive ||
              hud.stealthState !== 'hidden' ||
              hud.totalDistractions > 0 ||
              hud.ratCount > 0 ||
              hud.chapitasCount > 0 ||
              hud.activeDecoyRats > 0) && (
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[9.5px] font-mono-tabular leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                {(hud.stealthActive || hud.stealthInGrass || hud.stealthState !== 'hidden') && (
                  <span className="flex items-center gap-1.5">
                    <span
                      className={
                        hud.stealthState === 'detected'
                          ? 'text-rose-400 font-semibold'
                          : hud.stealthState === 'caution'
                            ? 'text-amber-300 font-semibold'
                            : hud.stealthInGrass
                              ? 'text-lime-300 font-semibold'
                              : 'text-emerald-300 font-semibold'
                      }
                    >
                      {hud.stealthState === 'detected'
                        ? 'DETECTADO'
                        : hud.stealthState === 'caution'
                          ? hud.stealthInGrass
                            ? 'PASTIZAL · PRECAUCIÓN'
                            : 'PRECAUCIÓN'
                          : hud.stealthInGrass
                            ? 'PASTIZAL · OCULTO'
                            : 'SIGILO · OCULTO'}
                    </span>
                    <span className="inline-block h-[2.5px] w-10 rounded-full bg-black/50 overflow-hidden">
                      <span
                        className={`block h-full transition-[width] duration-100 ${
                          hud.stealthNoiseLevel > 0.65
                            ? 'bg-rose-400'
                            : hud.stealthNoiseLevel > 0.25
                              ? 'bg-amber-300'
                              : 'bg-emerald-400'
                        }`}
                        style={{ width: `${Math.round(hud.stealthNoiseLevel * 100)}%` }}
                      />
                    </span>
                  </span>
                )}
                {hud.totalDistractions > 0 && (
                  <button
                    type="button"
                    onClick={onCycleDistraction}
                    title="Cambiar / equipar distracción (Z)"
                    className="pointer-events-auto text-lime-300/90 hover:text-lime-200 cursor-pointer"
                  >
                    {`B:${hud.distractionCounts.bottle} · L:${hud.distractionCounts.can} · Ld:${hud.distractionCounts.brick} · R:${hud.distractionCounts.decoy_rat}`}
                  </button>
                )}
                {(hud.ratCount > 0 || hud.chapitasCount > 0 || hud.activeDecoyRats > 0) && (
                  <span className="flex items-center gap-1.5">
                    <span className="text-amber-200/90">
                      {`Ratas:${hud.ratCount} · Chapitas:${hud.chapitasCount}`}
                    </span>
                    {hud.ratCount >= 1 && hud.chapitasCount >= 1 && (
                      <button
                        type="button"
                        onClick={onCraftDecoyRat}
                        title="Atar chapitas a una rata para crear rata señuelo (K)"
                        className="pointer-events-auto rounded-full border border-lime-300/60 bg-lime-950/75 hover:bg-lime-900/80 px-2 py-0.5 text-[9px] font-semibold text-lime-200 cursor-pointer active:scale-95"
                      >
                        Atar chapitas (K)
                      </button>
                    )}
                    {hud.activeDecoyRats > 0 && (
                      <span className="text-lime-300 font-semibold">
                        · Señuelo activo ×{hud.activeDecoyRats}
                      </span>
                    )}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Top-Right: Botones minimalistas y panel de información desplegable */}
          <div className="relative flex flex-col items-end gap-2">
            <div className="pointer-events-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setInfoExpanded((prev) => !prev)}
                aria-expanded={infoExpanded}
                aria-label="Desplegar información táctica y misión"
                title="Información y Misión"
                className={`flex h-9 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-mono-tabular backdrop-blur-md transition-all active:scale-95 cursor-pointer ${
                  infoExpanded
                    ? 'border-amber-300/75 bg-[#090d14]/85 text-amber-200'
                    : hud.mission.colonUnlocked
                      ? 'border-emerald-400/50 bg-[#090d14]/50 text-emerald-200'
                      : 'border-white/15 bg-[#090d14]/45 text-slate-100'
                }`}
              >
                <Info className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {hud.tutorial.active
                    ? hud.tutorial.completed
                      ? 'Práctica 6/6'
                      : `Práctica ${hud.tutorial.stepIndex + 1}/${hud.tutorial.totalSteps}`
                    : hud.mission.phase === 'base_free_roam'
                      ? hud.vehicleBayUnlocked
                        ? 'Base · Taller'
                        : 'Base Colón'
                      : hud.mission.missionNumber === 3
                        ? hud.mission.phase === 'm3_defend_fastfood'
                          ? `Mc-Porteño: ${hud.mission.killsCurrent}/${hud.mission.killsTarget}`
                          : hud.mission.phase === 'm3_help_mechanic'
                            ? 'Asistir a Mateo'
                            : hud.mission.phase === 'm3_briefing'
                              ? 'Salir de Base'
                              : `${hud.mission.distanceToTarget ?? hud.mission.distanceToColon}m`
                        : hud.mission.missionNumber === 2 && hud.mission.phase === 'clear_theater'
                          ? `Zombies en el teatro: ${Math.min(hud.kills, hud.mission.totalMissionTarget)}/${hud.mission.totalMissionTarget}`
                          : hud.mission.colonUnlocked
                            ? `${hud.mission.distanceToColon}m`
                            : `${hud.kills}/${hud.mission.totalMissionTarget}`}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMapExpanded((prev) => !prev)}
                aria-expanded={mapExpanded}
                aria-label="Mostrar u ocultar minimapa"
                title="Minimapa"
                className={`flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-md transition-all active:scale-95 cursor-pointer ${
                  mapExpanded
                    ? 'border-amber-300/75 bg-[#090d14]/85 text-amber-200'
                    : 'border-white/15 bg-[#090d14]/45 text-slate-200'
                }`}
              >
                <MapPin className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={hud.gameState === 'PAUSED' ? onResume : onPause}
                aria-label={hud.gameState === 'PAUSED' ? 'Reanudar partida' : 'Pausar partida'}
                title="Pausa"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-[#090d14]/45 text-slate-100 backdrop-blur-md transition-all active:scale-95 cursor-pointer"
              >
                {hud.gameState === 'PAUSED' ? (
                  <Play className="h-4 w-4" />
                ) : (
                  <Pause className="h-4 w-4" />
                )}
              </button>
            </div>

            {/* PANEL DESPLEGABLE DE INFORMACIÓN SECUNDARIA */}
            {infoExpanded && (
              <div className="pointer-events-auto w-64 sm:w-72 rounded-2xl border border-white/15 bg-[#090d14]/90 p-3.5 text-xs text-slate-200 backdrop-blur-md shadow-2xl">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-semibold text-amber-300">
                    <Target className="h-3.5 w-3.5" />
                    <span>Misión {hud.mission.missionNumber}</span>
                  </span>
                  <span className="font-mono-tabular text-[11px] text-slate-400">
                    {hud.activeZone === 'colon_interior'
                      ? hud.currentFloor === 0
                        ? 'PB · Salón'
                        : hud.currentFloor === 1
                          ? 'Piso 1 · Palcos'
                          : 'Piso 2 · Cazuela'
                      : hud.mission.targetLabel
                        ? `${hud.mission.targetLabel} · ${hud.mission.distanceToTarget ?? hud.mission.distanceToColon}m`
                        : hud.mission.colonUnlocked
                          ? `Colón · ${hud.mission.distanceToColon}m`
                          : `Oleada ${hud.mission.waveIndex}/${hud.mission.totalWaves}`}
                  </span>
                </div>

                <div className="mt-1.5 font-medium text-slate-100 leading-snug">
                  {hud.mission.objectiveText}
                </div>
                <div className="mt-1.5 h-1 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-[width] duration-200 ${
                      hud.mission.colonUnlocked ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                    style={{ width: `${hud.mission.colonUnlocked ? 100 : missionPct}%` }}
                  />
                </div>
                <div className="mt-1 text-[11px] text-slate-400 leading-snug">
                  {hud.mission.detailText}
                </div>

                {hud.mechanicPos && hud.activeZone === 'exterior_9_julio' && (
                  <div className="mt-2 flex items-center justify-between rounded-lg border border-sky-400/25 bg-sky-950/35 px-2.5 py-1.5 text-[11px]">
                    <span className="text-sky-200 font-medium">
                      Mateo {hud.mechanicLimping ? '(Rengo)' : ''}
                    </span>
                    <span className="font-mono-tabular text-amber-300">
                      Salud {Math.ceil(hud.mechanicHp)}%
                    </span>
                  </div>
                )}

                {(hud.allyRescued || hud.mission.missionNumber >= 2) && (
                  <div className="mt-2.5 grid grid-cols-3 gap-1.5 border-t border-white/10 pt-2 text-[10px] font-mono-tabular">
                    <div className="rounded-lg bg-slate-900/80 px-2 py-1">
                      <div className="text-slate-400">Químicos</div>
                      <div className="text-orange-300 font-semibold">{hud.provisions.chemicals}</div>
                    </div>
                    <div className="rounded-lg bg-slate-900/80 px-2 py-1">
                      <div className="text-slate-400">Chatarra</div>
                      <div className="text-sky-300 font-semibold">{hud.provisions.scrap}</div>
                    </div>
                    <div className="rounded-lg bg-slate-900/80 px-2 py-1">
                      <div className="text-slate-400">Pólvora</div>
                      <div className="text-amber-300 font-semibold">{hud.provisions.powder}</div>
                    </div>
                  </div>
                )}

                <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 border-t border-white/10 pt-2.5 font-mono-tabular text-[11px] text-slate-300">
                  <span className="flex items-center gap-1">
                    {hud.isDaytime ? (
                      <Sun className="h-3 w-3 text-amber-300" />
                    ) : (
                      <Moon className="h-3 w-3 text-sky-300" />
                    )}
                    {hud.clockLabel}
                  </span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span>{formatSurvivalTime(hud.survivalTime)}</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span>{hud.enemiesRemaining} Activos</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-amber-300">{hud.score.toLocaleString()} pts</span>
                </div>

                {hud.mission.radioMessage && (
                  <div className="mt-2.5 border-t border-white/10 pt-2 text-[11px] text-slate-300 leading-snug">
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-300">
                      <Radio className="h-3 w-3" />
                      <span>{hud.mission.radioSpeaker ?? 'Ricardo López'}</span>
                    </div>
                    <p className="mt-0.5">{hud.mission.radioMessage}</p>
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between gap-1.5 border-t border-white/10 pt-2.5">
                  <button
                    type="button"
                    onClick={onToggleMute}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-white/10 bg-slate-900/80 py-1.5 text-[11px] text-slate-200 hover:border-amber-400/50 cursor-pointer"
                  >
                    {hud.muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                    <span>{hud.muted ? 'Mudo' : 'Audio'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onToggleMobileControls}
                    className={`flex flex-1 items-center justify-center gap-1 rounded-lg border py-1.5 text-[11px] cursor-pointer ${
                      mobileControlsEnabled
                        ? 'border-amber-400/50 bg-amber-500/15 text-amber-200'
                        : 'border-white/10 bg-slate-900/80 text-slate-200'
                    }`}
                  >
                    <Gamepad2 className="h-3.5 w-3.5" />
                    <span>Táctil</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>
      )}

      {/* CINEMÁTICA DE INTRODUCCIÓN O RESCATE DE ALIADA (MODO HISTORIA 2050) */}
      {(hud.gameState === 'INTRO_CUTSCENE' || hud.gameState === 'ALLY_RESCUE_CUTSCENE') &&
        !hud.editorMode && (
          <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between">
            {/* Letterbox superior */}
            <div className="flex h-14 sm:h-20 w-full items-center justify-between bg-[#05070b] border-b border-white/10 px-5 sm:px-10">
              <div className="text-[11px] font-mono-tabular tracking-[0.2em] uppercase text-amber-300/90">
                {hud.gameState === 'ALLY_RESCUE_CUTSCENE'
                  ? 'BUENOS AIRES · 2050 · MISIÓN 02 · TEATRO COLÓN'
                  : 'BUENOS AIRES · 2050 · MISIÓN 01'}
              </div>
              <button
                type="button"
                onClick={
                  hud.gameState === 'ALLY_RESCUE_CUTSCENE' ? onSkipAllyCutscene : onSkipCutscene
                }
                className="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-white/15 bg-slate-900/90 hover:border-amber-400/60 hover:bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-slate-100 transition-colors cursor-pointer"
              >
                <span>Saltar cinemática</span>
                <SkipForward className="h-3.5 w-3.5 text-amber-300" />
              </button>
            </div>

            {/* Letterbox inferior con subtítulos narrativos */}
            <div className="w-full bg-[#05070b] border-t border-white/10 px-5 py-4 sm:px-10 sm:py-5">
              {hud.introCutsceneCaption && (
                <div className="mx-auto max-w-3xl">
                  <div className="flex items-center justify-between gap-2 text-[11px] font-mono-tabular uppercase tracking-[0.18em] text-amber-300">
                    <span>{hud.introCutsceneCaption.tag}</span>
                    <span className="text-slate-400">{hud.introCutsceneCaption.title}</span>
                  </div>
                  <p className="mt-1.5 text-sm sm:text-base text-slate-100 leading-relaxed">
                    {hud.introCutsceneCaption.text}
                  </p>
                </div>
              )}
              <div className="mx-auto mt-3 h-0.5 max-w-3xl rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-[width] duration-100"
                  style={{ width: `${Math.round(hud.introCutsceneProgress * 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

      {/* PANTALLA DE TÍTULO (ESTILO CARTEL METÁLICO DESGASTADO + SELECTORES DESLIZABLES) */}
      {hud.gameState === 'TITLE_MENU' && !hud.editorMode && (
        <TitleBillboardMenu
          difficulty={hud.difficulty}
          difficulties={DIFFICULTIES}
          bestScore={hud.bestScore}
          muted={hud.muted}
          onSelectDifficulty={onSelectDifficulty}
          onStartMission1={onStart}
          onStartMission2={onStartMission2}
          onStartMission3={onStartMission3}
          onOpenTutorial={() => setTutorialOpen(true)}
          onOpenStudio={onOpenStudio}
          onToggleMute={onToggleMute}
        />
      )}

      {/* MODAL DE PAUSA */}
      {hud.gameState === 'PAUSED' && !hud.editorMode && !studioOpen && !pinModalOpen && (
        <div className="pointer-events-auto fixed inset-0 flex items-center justify-center bg-[#07090e]/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-[#0c1017]/88 border border-white/15 p-7 shadow-2xl">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-2xl text-amber-200">Pausa</h2>
              <button
                type="button"
                onClick={() => onOpenStudio('models')}
                aria-label="Versión C-50"
                className="font-mono-tabular text-[10px] text-slate-600/70 hover:text-slate-400 transition-colors cursor-pointer select-none"
              >
                v2050 · C-50
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-400 font-mono-tabular">
              {hud.clockLabel} · Tiempo {formatSurvivalTime(hud.survivalTime)} · Puntos{' '}
              {hud.score.toLocaleString()} · {hud.kills} Bajas
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onResume}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-semibold text-sm py-2.5 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition-all active:scale-[0.98] cursor-pointer"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Reanudar</span>
              </button>
              <button
                type="button"
                onClick={() => setTutorialOpen(true)}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-950/65 hover:bg-emerald-900/70 border border-emerald-400/40 text-emerald-100 font-medium text-sm py-2.5 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all active:scale-[0.98] cursor-pointer"
              >
                <BookOpen className="h-4 w-4 text-emerald-300" />
                <span>Tutorial y Controles</span>
              </button>
              <button
                type="button"
                onClick={
                  hud.tutorial.active
                    ? onStartTutorial
                    : hud.mission.missionNumber === 3
                      ? onStartMission3
                      : hud.mission.missionNumber === 2
                        ? onStartMission2
                        : onStart
                }
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-white/12 text-slate-200 font-medium text-sm py-2.5 px-4 transition-all active:scale-[0.98] cursor-pointer"
              >
                <RotateCcw className="h-4 w-4 text-slate-300" />
                <span>
                  {hud.tutorial.active
                    ? 'Reiniciar Tutorial 3D'
                    : `Reiniciar Misión ${hud.mission.missionNumber}`}
                </span>
              </button>
              <button
                type="button"
                onClick={onReturnToTitle}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-transparent hover:bg-white/5 text-slate-400 hover:text-slate-200 text-sm py-2 px-4 transition-all active:scale-[0.98] cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Menú Principal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PANTALLA DE VICTORIA / MISIÓN COMPLETADA */}
      {hud.gameState === 'MISSION_COMPLETE' && !hud.editorMode && (
        <div className="pointer-events-auto fixed inset-0 z-20 flex items-center justify-center bg-[#07090e]/55 p-4">
          <div className="w-full max-w-md rounded-xl border border-emerald-400/40 bg-[#090d12]/94 p-6 sm:p-7 shadow-2xl">
            {hud.mission.missionNumber === 3 ? (
              <>
                <div className="text-[11px] font-mono-tabular uppercase tracking-[0.2em] text-amber-300">
                  MISIÓN 03 COMPLETADA · TALLER MECÁNICO
                </div>
                <h2 className="mt-1.5 font-display text-2xl sm:text-3xl text-slate-50">
                  Mateo Rescatado — Taller Desbloqueado
                </h2>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
                  Ricardo limpia el local <strong className="text-amber-300">Mc-Porteño 24H</strong>,
                  libera a <strong className="text-sky-300">Mateo</strong> de la estantería y lo
                  escolta sano y salvo hasta el Colón. Al llegar, Mateo se incorpora como mecánico
                  experto y habilita la bahía noreste para reparar la camioneta{' '}
                  <strong className="text-emerald-300">«La Porteña»</strong> y desplegar viajes rápidos.
                </p>
              </>
            ) : hud.mission.missionNumber === 2 ? (
              <>
                <div className="text-[11px] font-mono-tabular uppercase tracking-[0.2em] text-emerald-300">
                  MISIÓN 02 COMPLETADA · BASE PERMANENTE
                </div>
                <h2 className="mt-1.5 font-display text-2xl sm:text-3xl text-slate-50">
                  Teatro Colón Asegurado
                </h2>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
                  Ricardo elimina a todos los infectados del teatro y rescata a{' '}
                  <strong className="text-cyan-300">Sofía «Chispa» Méndez</strong> de la Sala de
                  Máquinas. La <strong className="text-amber-300">Sala Dorada</strong> queda
                  establecida como Base Permanente para armar Molotovs, bombas de clavos y explorar la
                  Av. 9 de Julio.
                </p>
              </>
            ) : (
              <>
                <div className="text-[11px] font-mono-tabular uppercase tracking-[0.2em] text-emerald-300">
                  MISIÓN 01 COMPLETADA · BUENOS AIRES 2050
                </div>
                <h2 className="mt-1.5 font-display text-2xl sm:text-3xl text-slate-50">
                  Acceso al Teatro Colón Asegurado
                </h2>
                <p className="mt-2.5 text-sm leading-relaxed text-slate-300">
                  Ricardo López despeja la Avenida 9 de Julio y alcanza la escalinata del Teatro
                  Colón. Ahora debe ingresar al edificio para limpiar los tres niveles y asegurar el
                  refugio desde adentro.
                </p>
              </>
            )}

            <div className="mt-5 grid grid-cols-2 gap-2.5 border-y border-white/10 py-3.5 text-xs">
              <div>
                <div className="text-slate-400">Infectados abatidos</div>
                <div className="mt-0.5 font-mono-tabular text-base font-semibold text-emerald-300">
                  {hud.kills}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Tiempo de misión</div>
                <div className="mt-0.5 font-mono-tabular text-base font-semibold text-slate-100">
                  {formatSurvivalTime(hud.survivalTime)}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Puntuación final</div>
                <div className="mt-0.5 font-mono-tabular text-base font-semibold text-amber-300">
                  {hud.score.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-slate-400">Mejor récord</div>
                <div className="mt-0.5 font-mono-tabular text-base font-semibold text-slate-100">
                  {hud.bestScore.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2.5">
              {hud.mission.missionNumber === 3 ? (
                <button
                  type="button"
                  onClick={onEnterColonBase}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-sm py-3 px-4 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Wrench className="h-4 w-4" />
                  <span>Entrar a la Base y Taller de Vehículos</span>
                </button>
              ) : hud.mission.missionNumber === 2 ? (
                <>
                  <button
                    type="button"
                    onClick={onContinueToMission3}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-sm py-3 px-4 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span>Continuar a Misión 3: Encargo de Chispa</span>
                  </button>
                  <button
                    type="button"
                    onClick={onEnterColonBase}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm py-2.5 px-4 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>Entrar a la Base Permanente (Sala Dorada)</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onContinueToMission2}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm py-3 px-4 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>Continuar a Misión 2: Interior del Colón</span>
                </button>
              )}
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={
                    hud.mission.missionNumber === 3
                      ? onStartMission3
                      : hud.mission.missionNumber === 2
                        ? onStartMission2
                        : onStart
                  }
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-slate-900 hover:bg-slate-800 text-slate-200 font-medium text-sm py-2.5 px-4 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Repetir</span>
                </button>
                <button
                  type="button"
                  onClick={onReturnToTitle}
                  className="flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-slate-900 hover:bg-slate-800 text-slate-200 font-medium text-sm py-2.5 px-4 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Menú</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MENSAJE DE MUERTE SIN FONDO */}
      {hud.gameState === 'GAME_OVER' && !hud.editorMode && (
        <div
          onClick={() => {
            if (canDismissDeath) onStart();
          }}
          className={`fixed inset-0 flex items-center justify-center p-4 bg-transparent select-none ${
            canDismissDeath ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'
          }`}
        >
          <h2 className="font-death death-blood-text text-center text-3xl sm:text-5xl md:text-6xl tracking-[0.08em] leading-tight uppercase">
            ESTÁS MUERTO
          </h2>
        </div>
      )}

      {/* NOTIFICACIÓN COLAPSABLE BREVE (DESAPARECE O SE PUEDE CERRAR AL TOCAR) */}
      {showFloatingNotice && activeToastText && (
        <div className="pointer-events-auto fixed top-14 left-1/2 -translate-x-1/2 z-20 px-3 max-w-[90vw]">
          <button
            type="button"
            onClick={() => setDismissedNoticeKey(activeToastText)}
            title="Tocar para ocultar"
            className="flex items-center gap-2 rounded-full border border-white/15 bg-[#090d14]/80 px-3 py-1 text-[11px] text-slate-100 backdrop-blur-md shadow-lg cursor-pointer"
          >
            <span className="truncate max-w-[68vw] sm:max-w-md">{activeToastText}</span>
            <X className="h-3 w-3 shrink-0 text-slate-400" />
          </button>
        </div>
      )}

      {/* MINIMAPA DESPLEGABLE, MOCHILA DINÁMICA Y CONTROLES MÓVILES */}
      {hud.gameState === 'PLAYING' && !hud.editorMode && (
        <>
          {mapExpanded && (
            <MiniMap
              playerPos={hud.playerPos}
              playerYaw={hud.playerYaw}
              camYaw={hud.camYaw}
              enemies={hud.radarEntities}
              nearCampfire={hud.nearCampfire}
              mobileLayout={mobileControlsEnabled}
              mapPreset={hud.mapSettings.mapPreset}
              placedProps={hud.placedProps}
              backpackPos={hud.backpackPos}
              colonPos={hud.mission.colonPos}
              colonUnlocked={hud.mission.colonUnlocked}
              activeZone={hud.activeZone}
              currentFloor={hud.currentFloor}
              allyPos={hud.allyPos}
              baseUnlocked={hud.baseUnlocked}
              mechanicPos={hud.mechanicPos}
              targetPos={hud.mission.targetPos}
              vehicleBayUnlocked={hud.vehicleBayUnlocked}
            />
          )}

          {/* ICONO DE MOCHILA: COMPLETAMENTE INVISIBLE HASTA ENCONTRARLA EN EL MUNDO */}
          {hud.hasBackpack && !inventoryOpen && (
            <button
              type="button"
              onClick={() => {
                setInventoryOpen(true);
                setMovingFromIdx(null);
                setActiveSlotIdx(null);
              }}
              aria-label="Abrir mochila e inventario"
              title="Mochila (8 espacios)"
              className={`pointer-events-auto fixed left-3.5 sm:left-5 z-30 flex h-11 w-11 items-center justify-center rounded-full border border-cyan-300/45 bg-[#090d14]/65 text-cyan-200 backdrop-blur-md shadow-[0_4px_14px_rgba(0,0,0,0.45)] transition-transform active:scale-90 cursor-pointer touch-none ${
                hud.helmetArmor > 0 || hud.vestArmor > 0 ? 'top-20' : 'top-14'
              }`}
            >
              <Backpack className="h-5 w-5" />
              {occupiedSlotsCount > 0 && (
                <span className="absolute -bottom-1 -right-1 rounded-full border border-white/15 bg-slate-950 px-1 text-[9px] font-mono-tabular text-cyan-200 leading-tight">
                  {occupiedSlotsCount}
                </span>
              )}
            </button>
          )}

          {/* INTERFAZ DESPLEGABLE DE INVENTARIO (MOVER, USAR Y ATRÁS) */}
          {hud.hasBackpack && inventoryOpen && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
            >
              <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#090d14]/92 p-4 text-slate-100 shadow-2xl backdrop-blur-md">
                <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Backpack className="h-4 w-4 text-cyan-300" />
                    <span className="text-sm font-semibold">Mochila</span>
                    <span className="font-mono-tabular text-xs text-slate-400">
                      {occupiedSlotsCount}/8
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setInventoryOpen(false);
                      setMovingFromIdx(null);
                    }}
                    className="flex items-center gap-1 rounded-lg border border-white/15 bg-slate-900/90 hover:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-100 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Atrás</span>
                  </button>
                </div>

                {movingFromIdx !== null && (
                  <div className="mt-2.5 flex items-center justify-between rounded-lg border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 text-[11px] text-amber-100">
                    <span>Toca el espacio destino para mover</span>
                    <button
                      type="button"
                      onClick={() => setMovingFromIdx(null)}
                      className="font-semibold text-amber-300 hover:underline cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                )}

                <div className="mt-3 grid grid-cols-4 gap-2">
                  {hud.inventory.map((slot, idx) => {
                    const meta = slot ? INVENTORY_ITEM_META[slot.kind] : null;
                    const isSelected = activeSlotIdx === idx;
                    const isMoveSource = movingFromIdx === idx;
                    const isMoveTarget = movingFromIdx !== null && movingFromIdx !== idx;

                    const renderIcon = (kind: InventoryItemKind) => {
                      switch (kind) {
                        case 'bandage':
                          return <Bandage className="h-5 w-5 text-rose-300" />;
                        case 'food':
                          return <Utensils className="h-5 w-5 text-amber-300" />;
                        case 'molotov':
                          return <FlaskConical className="h-5 w-5 text-orange-300" />;
                        case 'nail_bomb':
                          return <Bomb className="h-5 w-5 text-sky-300" />;
                        case 'wood':
                          return <Package className="h-5 w-5 text-emerald-300" />;
                        case 'ember':
                          return <Flame className="h-5 w-5 text-yellow-300" />;
                      }
                    };

                    return (
                      <button
                        key={idx}
                        type="button"
                        draggable={Boolean(slot)}
                        onDragStart={() => {
                          if (slot) setDraggedSlotIdx(idx);
                        }}
                        onDragOver={(e) => {
                          if (draggedSlotIdx !== null) e.preventDefault();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedSlotIdx !== null && draggedSlotIdx !== idx) {
                            onMoveInventorySlot(draggedSlotIdx, idx);
                            setActiveSlotIdx(idx);
                          }
                          setDraggedSlotIdx(null);
                        }}
                        onClick={() => {
                          if (movingFromIdx !== null) {
                            if (movingFromIdx !== idx) {
                              onMoveInventorySlot(movingFromIdx, idx);
                              setActiveSlotIdx(idx);
                            }
                            setMovingFromIdx(null);
                            return;
                          }
                          setActiveSlotIdx(slot ? (isSelected ? null : idx) : null);
                        }}
                        className={`relative flex h-16 flex-col items-center justify-center rounded-xl border transition-all cursor-pointer ${
                          isMoveSource
                            ? 'border-amber-300 bg-amber-500/25 ring-2 ring-amber-400/50'
                            : isMoveTarget
                              ? 'border-cyan-400/60 bg-cyan-500/10 hover:bg-cyan-500/20'
                              : isSelected
                                ? 'border-amber-400 bg-amber-500/20'
                                : slot
                                  ? 'border-white/15 bg-slate-900/80 hover:border-white/30'
                                  : 'border-white/8 bg-slate-950/55'
                        }`}
                      >
                        {slot && meta ? (
                          <>
                            {renderIcon(slot.kind)}
                            <span className="mt-1 text-[10px] leading-none text-slate-200 truncate max-w-[90%]">
                              {meta.shortLabel}
                            </span>
                            <span className="absolute top-1 right-1.5 font-mono-tabular text-[10px] font-semibold text-amber-200 leading-none">
                              {slot.count}
                            </span>
                          </>
                        ) : (
                          <span className="font-mono-tabular text-[10px] text-slate-600">
                            {idx + 1}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Acciones para el objeto seleccionado */}
                {activeSlotIdx !== null && hud.inventory[activeSlotIdx] && movingFromIdx === null && (
                  (() => {
                    const selSlot = hud.inventory[activeSlotIdx]!;
                    const selMeta = INVENTORY_ITEM_META[selSlot.kind];
                    const isThrowableItem =
                      selSlot.kind === 'molotov' || selSlot.kind === 'nail_bomb';
                    return (
                      <div className="mt-3 border-t border-white/10 pt-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-100">{selMeta.label}</span>
                          <span className="text-[11px] text-slate-400">{selMeta.actionHint}</span>
                        </div>
                        <div className="mt-2.5 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (isThrowableItem) {
                                onEquipThrowable(selSlot.kind as 'molotov' | 'nail_bomb');
                                setInventoryOpen(false);
                              } else {
                                onUseInventorySlot(activeSlotIdx);
                              }
                            }}
                            className="flex-1 rounded-lg bg-amber-400 hover:bg-amber-300 py-2 text-xs font-semibold text-slate-950 transition-colors cursor-pointer"
                          >
                            {isThrowableItem ? 'Equipar' : 'Usar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setMovingFromIdx(activeSlotIdx)}
                            className="flex items-center justify-center gap-1 rounded-lg border border-white/15 bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-medium text-slate-100 cursor-pointer"
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5" />
                            <span>Mover</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onDropInventorySlot(activeSlotIdx);
                              if (selSlot.count <= 1) setActiveSlotIdx(null);
                            }}
                            className="rounded-lg border border-rose-400/35 bg-rose-950/60 hover:bg-rose-900/70 px-3 py-2 text-xs font-medium text-rose-200 cursor-pointer"
                          >
                            Soltar
                          </button>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          )}

          {/* PROMPTS CONTEXTUALES DE INTERACCIÓN EN BASE PERMANENTE, RESCATE Y VIAJE */}
          {!workbenchOpen &&
            !vehicleBayOpen &&
            !inventoryOpen &&
            (hud.nearWorkbench ||
              hud.nearExteriorExit ||
              hud.nearColonEntrance ||
              hud.nearMechanicHelp ||
              hud.nearTrashSpot ||
              (hud.nearVehicleBay && hud.vehicleBayUnlocked)) && (
              <div className="pointer-events-auto fixed bottom-24 sm:bottom-20 left-1/2 -translate-x-1/2 z-30 flex flex-wrap items-center justify-center gap-2">
                {hud.nearTrashSpot && (
                  <button
                    type="button"
                    onClick={onSearchTrash}
                    className="flex items-center gap-2 rounded-full border border-lime-300/70 bg-[#090d14]/92 hover:bg-lime-950/90 px-4 py-2 text-xs font-semibold text-lime-100 shadow-2xl backdrop-blur-md cursor-pointer active:scale-95"
                  >
                    <Trash2 className="h-4 w-4 text-lime-300" />
                    <span>Buscar en la basura (E)</span>
                  </button>
                )}
                {hud.nearMechanicHelp && (
                  <button
                    type="button"
                    onClick={onHelpMechanic}
                    className="flex items-center gap-2 rounded-full border border-amber-300/75 bg-[#090d14]/92 hover:bg-amber-950/90 px-4 py-2 text-xs font-semibold text-amber-100 shadow-2xl backdrop-blur-md cursor-pointer active:scale-95"
                  >
                    <Hand className="h-4 w-4 text-amber-300" />
                    <span>Levantar estantería y ayudar a Mateo (E)</span>
                  </button>
                )}
                {hud.nearWorkbench && hud.baseUnlocked && (
                  <button
                    type="button"
                    onClick={() => {
                      setCraftFeedback(null);
                      setWorkbenchOpen(true);
                    }}
                    className="flex items-center gap-2 rounded-full border border-emerald-300/60 bg-[#090d14]/90 hover:bg-emerald-950/90 px-4 py-2 text-xs font-semibold text-emerald-100 shadow-2xl backdrop-blur-md cursor-pointer active:scale-95"
                  >
                    <Hammer className="h-4 w-4 text-emerald-300" />
                    <span>Taller Químico de Chispa (E)</span>
                  </button>
                )}
                {hud.nearVehicleBay && hud.vehicleBayUnlocked && (
                  <button
                    type="button"
                    onClick={() => {
                      setVehicleFeedback(null);
                      setVehicleBayOpen(true);
                    }}
                    className="flex items-center gap-2 rounded-full border border-amber-300/65 bg-[#090d14]/90 hover:bg-amber-950/90 px-4 py-2 text-xs font-semibold text-amber-100 shadow-2xl backdrop-blur-md cursor-pointer active:scale-95"
                  >
                    <Wrench className="h-4 w-4 text-amber-300" />
                    <span>Taller Mecánico de Mateo (E)</span>
                  </button>
                )}
                {hud.nearExteriorExit && hud.baseUnlocked && (
                  <button
                    type="button"
                    onClick={onTravelToExterior}
                    className="flex items-center gap-2 rounded-full border border-sky-300/60 bg-[#090d14]/90 hover:bg-sky-950/90 px-4 py-2 text-xs font-semibold text-sky-100 shadow-2xl backdrop-blur-md cursor-pointer active:scale-95"
                  >
                    <DoorOpen className="h-4 w-4 text-sky-300" />
                    <span>
                      {hud.mission.phase === 'm3_briefing'
                        ? 'Salir hacia Mc-Porteño 24H (E)'
                        : 'Salir a Av. 9 de Julio (E)'}
                    </span>
                  </button>
                )}
                {hud.nearColonEntrance && hud.mission.phase === 'scavenge_9_julio' && (
                  <button
                    type="button"
                    onClick={onReturnToColonBase}
                    className="flex items-center gap-2 rounded-full border border-emerald-300/60 bg-[#090d14]/90 hover:bg-emerald-950/90 px-4 py-2 text-xs font-semibold text-emerald-100 shadow-2xl backdrop-blur-md cursor-pointer active:scale-95"
                  >
                    <Building2 className="h-4 w-4 text-emerald-300" />
                    <span>Volver a la Base del Colón (E)</span>
                  </button>
                )}
              </div>
            )}

          {/* TALLER QUÍMICO DE SOFÍA «CHISPA» MÉNDEZ — BASE PERMANENTE (SALA DORADA) */}
          {workbenchOpen && hud.baseUnlocked && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs"
            >
              <div className="w-full max-w-md rounded-2xl border border-emerald-400/35 bg-[#090d14]/95 p-5 text-slate-100 shadow-2xl">
                <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-emerald-300">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      <span>Base Permanente · Sala Dorada</span>
                    </div>
                    <h3 className="mt-1 text-base font-semibold text-slate-50">
                      Taller Químico de Sofía «Chispa» Méndez
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Explosivos caseros, Molotovs y granadas de clavos
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWorkbenchOpen(false)}
                    className="rounded-lg border border-white/15 bg-slate-900 hover:bg-slate-800 p-1.5 text-slate-300 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Provisiones recolectadas */}
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl border border-orange-400/25 bg-orange-950/25 p-2">
                    <div className="text-[10px] text-slate-400">Alcohol / Químicos</div>
                    <div className="mt-0.5 font-mono-tabular text-base font-bold text-orange-300">
                      {hud.provisions.chemicals}
                    </div>
                  </div>
                  <div className="rounded-xl border border-sky-400/25 bg-sky-950/25 p-2">
                    <div className="text-[10px] text-slate-400">Chatarra / Clavos</div>
                    <div className="mt-0.5 font-mono-tabular text-base font-bold text-sky-300">
                      {hud.provisions.scrap}
                    </div>
                  </div>
                  <div className="rounded-xl border border-amber-400/25 bg-amber-950/25 p-2">
                    <div className="text-[10px] text-slate-400">Pólvora</div>
                    <div className="mt-0.5 font-mono-tabular text-base font-bold text-amber-300">
                      {hud.provisions.powder}
                    </div>
                  </div>
                </div>

                {craftFeedback && (
                  <div className="mt-2.5 rounded-lg border border-emerald-400/35 bg-emerald-950/45 px-3 py-1.5 text-[11px] text-emerald-100">
                    {craftFeedback}
                  </div>
                )}

                {/* Recetas de crafteo */}
                <div className="mt-3 space-y-2">
                  {[
                    {
                      id: 'molotov' as BaseCraftRecipeId,
                      name: 'Bomba Molotov',
                      costLabel: '2 Químicos + 1 Pólvora',
                      canCraft: hud.provisions.chemicals >= 2 && hud.provisions.powder >= 1,
                      icon: <FlaskConical className="h-4 w-4 text-orange-300" />,
                    },
                    {
                      id: 'nail_bomb' as BaseCraftRecipeId,
                      name: 'Granada de Clavos',
                      costLabel: '2 Chatarra + 1 Pólvora',
                      canCraft: hud.provisions.scrap >= 2 && hud.provisions.powder >= 1,
                      icon: <Bomb className="h-4 w-4 text-sky-300" />,
                    },
                    {
                      id: 'bandage' as BaseCraftRecipeId,
                      name: 'Vendaje Antiséptico',
                      costLabel: '2 Químicos',
                      canCraft: hud.provisions.chemicals >= 2,
                      icon: <Bandage className="h-4 w-4 text-rose-300" />,
                    },
                    {
                      id: 'fal_ammo' as BaseCraftRecipeId,
                      name: 'Cargador FAL (+20 balas)',
                      costLabel: '2 Chatarra + 2 Pólvora',
                      canCraft: hud.provisions.scrap >= 2 && hud.provisions.powder >= 2,
                      icon: <Sparkles className="h-4 w-4 text-amber-300" />,
                    },
                  ].map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-900/75 px-3 py-2"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 border border-white/10">
                          {r.icon}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-100">{r.name}</div>
                          <div className="text-[11px] text-slate-400">{r.costLabel}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={!r.canCraft}
                        onClick={() => {
                          const res = onCraftAtBase(r.id);
                          setCraftFeedback(res.message);
                        }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                          r.canCraft
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer active:scale-95'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        Armar
                      </button>
                    </div>
                  ))}
                </div>

                {/* Salida al exterior, encargo de Chispa y Taller Mecánico */}
                <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setWorkbenchOpen(false);
                      onTravelToExterior();
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs py-2.5 px-4 cursor-pointer active:scale-[0.98]"
                  >
                    <DoorOpen className="h-4 w-4" />
                    <span>
                      {hud.mission.phase === 'm3_briefing'
                        ? 'Salir hacia Mc-Porteño 24H (Misión 3)'
                        : 'Viajar a Av. 9 de Julio (Buscar provisiones)'}
                    </span>
                  </button>

                  {!hud.mechanicRescued && hud.mission.missionNumber !== 3 && (
                    <button
                      type="button"
                      onClick={() => {
                        setWorkbenchOpen(false);
                        onContinueToMission3();
                      }}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-amber-400/60 bg-amber-500/15 hover:bg-amber-500/25 text-amber-100 font-semibold text-xs py-2.5 px-4 cursor-pointer active:scale-[0.98]"
                    >
                      <Bomb className="h-4 w-4 text-amber-300" />
                      <span>Misión 3: Suministros en Mc-Porteño 24H (Encargo de Chispa)</span>
                    </button>
                  )}

                  {hud.vehicleBayUnlocked && (
                    <button
                      type="button"
                      onClick={() => {
                        setWorkbenchOpen(false);
                        setVehicleFeedback(null);
                        setVehicleBayOpen(true);
                      }}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-amber-400/50 bg-amber-950/45 hover:bg-amber-900/55 text-amber-100 font-semibold text-xs py-2.5 px-4 cursor-pointer active:scale-[0.98]"
                    >
                      <Wrench className="h-4 w-4 text-amber-300" />
                      <span>Abrir Taller Mecánico de Mateo (Camioneta)</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TALLER MECÁNICO DE MATEO — BAHÍA DE VEHÍCULOS (NORESTE DEL COLÓN) */}
          {vehicleBayOpen && hud.vehicleBayUnlocked && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs"
            >
              <div className="w-full max-w-md rounded-2xl border border-amber-400/40 bg-[#090d14]/95 p-5 text-slate-100 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-amber-300">
                      <Wrench className="h-3.5 w-3.5" />
                      <span>Base Permanente · Bahía Noreste</span>
                    </div>
                    <h3 className="mt-1 text-base font-semibold text-slate-50">
                      Taller Mecánico de Mateo
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Reparación de camioneta blindada «La Porteña» y despliegue rápido
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVehicleBayOpen(false)}
                    className="rounded-lg border border-white/15 bg-slate-900 hover:bg-slate-800 p-1.5 text-slate-300 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Provisiones disponibles */}
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl border border-orange-400/25 bg-orange-950/25 p-2">
                    <div className="text-[10px] text-slate-400">Químicos</div>
                    <div className="mt-0.5 font-mono-tabular text-base font-bold text-orange-300">
                      {hud.provisions.chemicals}
                    </div>
                  </div>
                  <div className="rounded-xl border border-sky-400/25 bg-sky-950/25 p-2">
                    <div className="text-[10px] text-slate-400">Chatarra</div>
                    <div className="mt-0.5 font-mono-tabular text-base font-bold text-sky-300">
                      {hud.provisions.scrap}
                    </div>
                  </div>
                  <div className="rounded-xl border border-amber-400/25 bg-amber-950/25 p-2">
                    <div className="text-[10px] text-slate-400">Pólvora</div>
                    <div className="mt-0.5 font-mono-tabular text-base font-bold text-amber-300">
                      {hud.provisions.powder}
                    </div>
                  </div>
                </div>

                {vehicleFeedback && (
                  <div className="mt-2.5 rounded-lg border border-amber-400/40 bg-amber-950/45 px-3 py-1.5 text-[11px] text-amber-100">
                    {vehicleFeedback}
                  </div>
                )}

                {/* Módulos de reparación de La Porteña */}
                <div className="mt-3 space-y-2">
                  {[
                    {
                      id: 'engine' as VehicleModuleId,
                      name: 'Motor V8 y Batería',
                      costLabel: '2 Chatarra + 1 Químicos',
                      installed: hud.vehicleState.engine,
                      canRepair: hud.provisions.scrap >= 2 && hud.provisions.chemicals >= 1,
                    },
                    {
                      id: 'tires' as VehicleModuleId,
                      name: 'Ruedas Todo-Terreno',
                      costLabel: '2 Chatarra + 1 Químicos',
                      installed: hud.vehicleState.tires,
                      canRepair: hud.provisions.scrap >= 2 && hud.provisions.chemicals >= 1,
                    },
                    {
                      id: 'armor' as VehicleModuleId,
                      name: 'Blindaje de Chasis (+Chaleco)',
                      costLabel: '3 Chatarra + 1 Pólvora',
                      installed: hud.vehicleState.armor,
                      canRepair: hud.provisions.scrap >= 3 && hud.provisions.powder >= 1,
                    },
                    {
                      id: 'fuel' as VehicleModuleId,
                      name: 'Combustible e Inyección',
                      costLabel: '1 Chatarra + 2 Químicos + 2 Pólvora',
                      installed: hud.vehicleState.fuel,
                      canRepair:
                        hud.provisions.scrap >= 1 &&
                        hud.provisions.chemicals >= 2 &&
                        hud.provisions.powder >= 2,
                    },
                  ].map((mod) => (
                    <div
                      key={mod.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-slate-900/75 px-3 py-2"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 border border-white/10">
                          <Truck
                            className={`h-4 w-4 ${
                              mod.installed ? 'text-emerald-300' : 'text-amber-300'
                            }`}
                          />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-slate-100">{mod.name}</div>
                          <div className="text-[11px] text-slate-400">{mod.costLabel}</div>
                        </div>
                      </div>
                      {mod.installed ? (
                        <span className="flex items-center gap-1 rounded-lg border border-emerald-400/40 bg-emerald-950/60 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
                          <Check className="h-3.5 w-3.5" />
                          <span>Listo</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={!mod.canRepair}
                          onClick={() => {
                            const res = onRepairVehicleModule(mod.id);
                            setVehicleFeedback(res.message);
                          }}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                            mod.canRepair
                              ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 cursor-pointer active:scale-95'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          Reparar
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Despliegue Rápido con La Porteña */}
                <div className="mt-4 border-t border-white/10 pt-3">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-200 mb-2">
                    <span className="flex items-center gap-1.5">
                      <Navigation className="h-3.5 w-3.5 text-sky-300" />
                      <span>Despliegue Rápido (Viaje Rápido)</span>
                    </span>
                    <span className="font-mono-tabular text-[10px] text-slate-400">
                      {hud.vehicleState.engine && hud.vehicleState.tires
                        ? 'Vehículo operativo'
                        : 'Requiere Motor + Ruedas'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { id: 'colon_door', label: 'Puerta Colón' },
                        { id: 'obelisco', label: 'Obelisco' },
                        { id: 'fastfood_corner', label: 'Mc-Porteño' },
                      ] as { id: FastTravelDestinationId; label: string }[]
                    ).map((dest) => {
                      const ready = hud.vehicleState.engine && hud.vehicleState.tires;
                      return (
                        <button
                          key={dest.id}
                          type="button"
                          disabled={!ready}
                          onClick={() => {
                            setVehicleBayOpen(false);
                            onFastTravelWithVehicle(dest.id);
                          }}
                          className={`rounded-xl border px-2.5 py-2 text-[11px] font-semibold transition-all ${
                            ready
                              ? 'border-sky-400/50 bg-sky-500/15 hover:bg-sky-500/25 text-sky-100 cursor-pointer active:scale-95'
                              : 'border-white/8 bg-slate-950/60 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          {dest.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* GUÍA EN VIVO DEL TUTORIAL INTERACTIVO 3D */}
          {hud.tutorial.active && hud.gameState === 'PLAYING' && (
            <div className="pointer-events-none fixed top-14 sm:top-4 left-1/2 -translate-x-1/2 z-20 w-[min(92vw,440px)]">
              <div className="pointer-events-auto rounded-xl border border-emerald-400/45 bg-[#080d14]/88 px-3.5 py-2.5 backdrop-blur-md shadow-2xl">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono-tabular uppercase tracking-wider text-emerald-300 font-semibold">
                    {hud.tutorial.completed
                      ? 'Tutorial Completado'
                      : `Tutorial 3D · Paso ${hud.tutorial.stepIndex + 1}/${hud.tutorial.totalSteps}`}
                  </span>
                  <span className="text-[10px] font-mono-tabular text-amber-300">
                    {hud.tutorial.progressText}
                  </span>
                </div>
                <div className="mt-1 text-xs sm:text-sm font-semibold text-white">
                  {hud.tutorial.title}
                </div>
                <p className="mt-0.5 text-[11px] text-slate-300 leading-snug">
                  {hud.tutorial.instruction}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-1.5">
                  <span className="text-[10px] text-slate-400">{hud.tutorial.hint}</span>
                  <div className="flex items-center gap-1.5">
                    {!hud.tutorial.completed ? (
                      <button
                        type="button"
                        onClick={onAdvanceTutorialStep}
                        className="rounded-md border border-white/15 bg-slate-900/90 hover:border-amber-400/60 px-2 py-1 text-[10px] font-medium text-slate-200 cursor-pointer"
                      >
                        Saltar paso
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={onStart}
                        className="rounded-md bg-amber-400 hover:bg-amber-300 px-2.5 py-1 text-[10px] font-semibold text-slate-950 cursor-pointer"
                      >
                        Iniciar Misión 1
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onReturnToTitle}
                      className="rounded-md border border-white/10 bg-transparent hover:bg-white/10 px-2 py-1 text-[10px] text-slate-300 cursor-pointer"
                    >
                      Menú
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* INDICADOR BREVE AL APUNTAR ARROJABLES */}
          {(hud.aimingThrowable || hud.molotovLit || hud.nailBombLit) && (
            <div className="pointer-events-none fixed bottom-28 left-1/2 -translate-x-1/2 z-20">
              <div className="rounded-full border border-orange-400/45 bg-[#090d14]/82 px-3 py-1 text-[10px] font-medium text-amber-200 backdrop-blur-md">
                {hud.aimingThrowable === 'decoy_rat'
                  ? 'Apuntando rata señuelo — Suelta para soltarla'
                  : hud.aimingThrowable === 'bottle' ||
                      hud.aimingThrowable === 'can' ||
                      hud.aimingThrowable === 'brick'
                    ? 'Apuntando distracción — Suelta para lanzar'
                  : hud.aimingThrowable
                    ? 'Apuntando — Suelta para lanzar'
                    : 'Mecha encendida — Mantén disparo para apuntar'}
              </div>
            </div>
          )}

          {mobileControlsEnabled && (
            <MobileControls
              weapon={hud.weapon}
              unlockedWeapons={hud.unlockedWeapons}
              arrows={hud.arrows}
              bowDrawProgress={hud.bowDrawProgress}
              stance={hud.stance}
              stealthState={hud.stealthState}
              isAiming={hud.isAiming}
              isReloading={hud.isReloading}
              pistolAmmo={hud.pistolAmmo}
              pistolMaxAmmo={hud.pistolMaxAmmo}
              rifleAmmo={hud.rifleAmmo}
              rifleMaxAmmo={hud.rifleMaxAmmo}
              hasBackpack={hud.hasBackpack}
              molotovCount={hud.molotovCount}
              nailBombCount={hud.nailBombCount}
              distractionCounts={hud.distractionCounts}
              totalDistractions={hud.totalDistractions}
              activeDistractionKind={hud.activeDistractionKind}
              molotovLit={hud.molotovLit}
              nailBombLit={hud.nailBombLit}
              equippedThrowable={hud.equippedThrowable}
              aimingThrowable={hud.aimingThrowable}
              touchLayout={touchLayout}
              onMove={onMobileMove}
              onCameraVelocity={onMobileCameraVelocity}
              onRotateCamera={onMobileRotateCamera}
              onFireChange={onMobileFireChange}
              onAimChange={onMobileAimChange}
              onJump={onMobileJump}
              onToggleCrouch={onMobileToggleCrouch}
              onReload={onMobileReload}
              onBeginThrowable={onBeginThrowable}
              onReleaseThrowable={onReleaseThrowable}
              onSelectWeapon={onSelectWeapon}
              onEquipThrowable={onEquipThrowable}
              onCycleDistraction={onCycleDistraction}
            />
          )}
        </>
      )}

      <TutorialModal
        open={tutorialOpen}
        onClose={() => setTutorialOpen(false)}
        onStartInteractive3D={onStartTutorial}
      />
    </div>
  );
};
