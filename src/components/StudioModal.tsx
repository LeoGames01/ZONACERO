import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Box,
  Camera,
  CheckCircle2,
  Copy,
  Crosshair,
  Download,
  Eye,
  EyeOff,
  Globe,
  Hammer,
  HardHat,
  Image as ImageIcon,
  KeyRound,
  Layers,
  Map as MapIcon,
  Move,
  RefreshCw,
  RotateCcw,
  Shield,
  Skull,
  Sliders,
  Sparkles,
  Sun,
  Swords,
  Target,
  Trash2,
  Upload,
  User,
  Wrench,
  X,
} from 'lucide-react';
import type { StudioPreviewSubject } from '../game/engine';
import type { CustomNpcTargetId } from '../game/modelCache';
import { REMOTE_MANIFEST_URL, downloadRootManifestJson } from '../game/remoteAssets';
import {
  CONTROL_BUTTON_ORDER,
  DEFAULT_MAP_SETTINGS,
  DEFAULT_TOUCH_LAYOUT,
  PROP_CATEGORIES,
  WORLD_OBJECT_OVERRIDE_DEFS,
  cloneTouchLayout,
} from '../game/settingsDefaults';
import type {
  AttachmentTargetScope,
  AttachmentTransform,
  CameraPresetId,
  CameraSettings,
  ControlButtonId,
  CustomEquipmentId,
  HudSnapshot,
  MapMaterialSettings,
  PlacedWorldProp,
  PostProcessPreset,
  PostProcessSettings,
  RemoteManifestSyncInfo,
  TextureTargetId,
  TouchLayoutConfig,
  WorldObjectOverrideGroup,
  WorldObjectOverrideId,
  WorldPropCategory,
  ZombieAttachableId,
  ZombieTargetKind,
} from '../game/types';
import { AttachmentStudioPanel } from './AttachmentStudioPanel';

export type StudioTab = 'models' | 'attachments' | 'map' | 'camera' | 'postfx' | 'controls';

interface StudioModalProps {
  open: boolean;
  initialTab?: StudioTab;
  hud: HudSnapshot;
  touchLayout: TouchLayoutConfig;
  onClose: () => void;
  onUploadPlayerGlb: (file: File) => void;
  onResetPlayerGlb: () => void;
  onUploadNpcGlb: (target: CustomNpcTargetId, file: File) => void;
  onResetNpcGlb: (target: CustomNpcTargetId) => void;
  onUploadCustomCharacters: (files: File[]) => void;
  onDeleteCustomCharacter: (slotId: string) => void;
  onUploadZombieGlbs: (files: File[]) => void;
  onUpdateZombieSlotKind: (slotId: string, targetKind: ZombieTargetKind) => void;
  onUpdateZombieSlotCount: (slotId: string, spawnCount: number) => void;
  onDeleteZombieSlot: (slotId: string) => void;
  onResetZombieGlb: () => void;
  onUploadRifleGlb: (file: File) => void;
  onResetRifleGlb: () => void;
  onUploadPistolGlb: (file: File) => void;
  onResetPistolGlb: () => void;
  onUploadEquipmentGlb: (kind: CustomEquipmentId, file: File) => void;
  onResetEquipmentGlb: (kind: CustomEquipmentId) => void;
  onUploadObjectOverrideGlb: (targetId: WorldObjectOverrideId, file: File) => void;
  onResetObjectOverride: (targetId: WorldObjectOverrideId) => void;
  onResetAllObjectOverrides: () => void;
  onUploadWorldPropGlb: (category: WorldPropCategory, file: File) => void;
  onDeleteWorldPropSlot: (slotId: string) => void;
  onPlaceWorldPropNearPlayer: (slotId: string) => void;
  onOpenMapEditorWithSlot: (slotId: string | null) => void;
  onSelectPlacedProp: (instanceId: string | null) => void;
  onUpdatePlacedProp: (instanceId: string, patch: Partial<PlacedWorldProp>) => void;
  onDuplicatePlacedProp: (instanceId: string) => void;
  onRemovePlacedProp: (instanceId: string) => void;
  onClearAllPlacedProps: () => void;
  onUpdateMapSettings: (patch: Partial<MapMaterialSettings>) => void;
  onUploadTexture: (target: TextureTargetId, file: File) => void;
  onResetTexture: (target: TextureTargetId) => void;
  onUpdatePostProcess: (patch: Partial<PostProcessSettings>) => void;
  onSelectPostProcessPreset: (preset: PostProcessPreset) => void;
  onUpdateCameraSettings: (patch: Partial<CameraSettings>) => void;
  onSelectCameraPreset: (preset: CameraPresetId) => void;
  onResetCameraSettings: () => void;
  onSetCameraPreview: (active: boolean, aim?: boolean) => void;
  onUpdateTouchLayout: (next: TouchLayoutConfig) => void;
  onResetTouchLayout: () => void;
  onSetAttachmentTransform: (
    scope: AttachmentTargetScope,
    itemId: string,
    patch: Partial<AttachmentTransform>,
  ) => void;
  onResetAttachmentTransform: (scope: AttachmentTargetScope, itemId: string) => void;
  onResetAllAttachmentTransforms: (scope?: AttachmentTargetScope) => void;
  onSaveAttachmentTransforms: () => void;
  onCreateAttachmentPreview: (
    scope: AttachmentTargetScope,
    zombieModelId: string,
    selectedZombieItem: ZombieAttachableId,
  ) => Promise<StudioPreviewSubject | null>;
  onSuspendMainRender?: (suspended: boolean) => void;
  onSyncRemoteAssets?: (customUrl?: string) => Promise<RemoteManifestSyncInfo | null | void>;
  studioPin?: string;
  onUpdateStudioPin?: (newPin: string) => boolean;
}

const TAB_ITEMS: { id: StudioTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'models', label: 'Modelos .glb', icon: Box },
  { id: 'attachments', label: 'Equipamiento 360°', icon: Wrench },
  { id: 'map', label: 'Mapa y Texturas', icon: MapIcon },
  { id: 'camera', label: 'Cámara y Zoom', icon: Camera },
  { id: 'postfx', label: 'Postprocesado', icon: Sparkles },
  { id: 'controls', label: 'Controles HUD', icon: Sliders },
];

const CAMERA_PRESET_LABELS: { id: CameraPresetId; label: string }[] = [
  { id: 'shoulder', label: 'Sobre el Hombro' },
  { id: 'close', label: 'Táctico Cercano' },
  { id: 'wide', label: 'Vista Amplia' },
];

const PRESET_LABELS: { id: PostProcessPreset; label: string }[] = [
  { id: 'cinematic', label: 'Cinematográfico' },
  { id: 'horror', label: 'Horror Nocturno' },
  { id: 'natural', label: 'Natural' },
  { id: 'crisp', label: 'Nítido (Sin Bloom)' },
];

const EQUIPMENT_CARD_DEFS: {
  id: CustomEquipmentId;
  label: string;
  defaultLabel: string;
  accentClass: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'helmet',
    label: 'Casco',
    defaultLabel: 'Casco táctico base',
    accentClass: 'text-amber-300',
    icon: HardHat,
  },
  {
    id: 'vest',
    label: 'Chaleco',
    defaultLabel: 'Chaleco balístico base',
    accentClass: 'text-emerald-300',
    icon: Shield,
  },
  {
    id: 'bow',
    label: 'Arco',
    defaultLabel: 'Arco compuesto base',
    accentClass: 'text-lime-400',
    icon: Target,
  },
  {
    id: 'arrow',
    label: 'Flecha',
    defaultLabel: 'Flecha estándar base',
    accentClass: 'text-rose-300',
    icon: ArrowUpRight,
  },
  {
    id: 'stick',
    label: 'Palo',
    defaultLabel: 'Palo de madera base',
    accentClass: 'text-orange-300',
    icon: Hammer,
  },
  {
    id: 'baton',
    label: 'Bastón policial',
    defaultLabel: 'Tonfa policial base',
    accentClass: 'text-sky-300',
    icon: Swords,
  },
];

const StudioModalInner: React.FC<StudioModalProps> = ({
  open,
  initialTab = 'models',
  hud,
  touchLayout,
  onClose,
  onUploadPlayerGlb,
  onResetPlayerGlb,
  onUploadNpcGlb,
  onResetNpcGlb,
  onUploadCustomCharacters,
  onDeleteCustomCharacter,
  onUploadZombieGlbs,
  onUpdateZombieSlotKind,
  onUpdateZombieSlotCount,
  onDeleteZombieSlot,
  onResetZombieGlb,
  onUploadRifleGlb,
  onResetRifleGlb,
  onUploadPistolGlb,
  onResetPistolGlb,
  onUploadEquipmentGlb,
  onResetEquipmentGlb,
  onUploadObjectOverrideGlb,
  onResetObjectOverride,
  onResetAllObjectOverrides,
  onUploadWorldPropGlb,
  onDeleteWorldPropSlot,
  onPlaceWorldPropNearPlayer,
  onOpenMapEditorWithSlot,
  onSelectPlacedProp,
  onUpdatePlacedProp,
  onDuplicatePlacedProp,
  onRemovePlacedProp,
  onClearAllPlacedProps,
  onUpdateMapSettings,
  onUploadTexture,
  onResetTexture,
  onUpdatePostProcess,
  onSelectPostProcessPreset,
  onUpdateCameraSettings,
  onSelectCameraPreset,
  onResetCameraSettings,
  onSetCameraPreview,
  onUpdateTouchLayout,
  onResetTouchLayout,
  onSetAttachmentTransform,
  onResetAttachmentTransform,
  onResetAllAttachmentTransforms,
  onSaveAttachmentTransforms,
  onCreateAttachmentPreview,
  onSuspendMainRender,
  onSyncRemoteAssets,
  studioPin = '1988',
  onUpdateStudioPin,
}) => {
  const [activeTab, setActiveTab] = useState<StudioTab>(initialTab);
  const [previewAimMode, setPreviewAimMode] = useState(false);
  const [ultraTransparent, setUltraTransparent] = useState(false);
  const [propCategory, setPropCategory] = useState<WorldPropCategory>('vehicle');
  const [overrideGroup, setOverrideGroup] = useState<WorldObjectOverrideGroup>('crates');
  const [selectedControlId, setSelectedControlId] = useState<ControlButtonId>('fire');
  const [manifestUrlInput, setManifestUrlInput] = useState<string>(
    () => hud.remoteManifest?.url ?? REMOTE_MANIFEST_URL,
  );
  const [syncingManifest, setSyncingManifest] = useState(false);
  const [syncErrorText, setSyncErrorText] = useState<string | null>(null);
  const [syncSuccessText, setSyncSuccessText] = useState<string | null>(null);
  const [exportedRootNotice, setExportedRootNotice] = useState(false);
  const [pinEditorOpen, setPinEditorOpen] = useState(false);
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [showPinDigits, setShowPinDigits] = useState(false);
  const [pinFeedback, setPinFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const draggingBtnRef = useRef<ControlButtonId | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const pendingOverrideTargetRef = useRef<WorldObjectOverrideId | null>(null);
  const pendingEquipmentTargetRef = useRef<CustomEquipmentId | null>(null);
  const pendingNpcTargetRef = useRef<CustomNpcTargetId | null>(null);

  const playerFileRef = useRef<HTMLInputElement>(null);
  const npcFileRef = useRef<HTMLInputElement>(null);
  const customCharsFileRef = useRef<HTMLInputElement>(null);
  const zombieFileRef = useRef<HTMLInputElement>(null);
  const rifleFileRef = useRef<HTMLInputElement>(null);
  const pistolFileRef = useRef<HTMLInputElement>(null);
  const equipmentFileRef = useRef<HTMLInputElement>(null);
  const objectOverrideFileRef = useRef<HTMLInputElement>(null);
  const propFileRef = useRef<HTMLInputElement>(null);
  const groundTexRef = useRef<HTMLInputElement>(null);
  const stoneTexRef = useRef<HTMLInputElement>(null);
  const barkTexRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (open && hud.remoteManifest?.url) {
      setManifestUrlInput(hud.remoteManifest.url);
    }
    if (!open) {
      setPinEditorOpen(false);
      setNewPinInput('');
      setConfirmPinInput('');
      setPinFeedback(null);
      setShowPinDigits(false);
    }
  }, [open, hud.remoteManifest?.url]);

  useEffect(() => {
    if (open && activeTab === 'camera') {
      onSetCameraPreview(true, previewAimMode);
    } else {
      onSetCameraPreview(false, false);
    }
    return () => {
      onSetCameraPreview(false, false);
    };
  }, [open, activeTab, previewAimMode, onSetCameraPreview]);

  useEffect(() => {
    const clearDrag = () => {
      draggingBtnRef.current = null;
    };
    window.addEventListener('pointerup', clearDrag);
    window.addEventListener('pointercancel', clearDrag);
    window.addEventListener('blur', clearDrag);
    return () => {
      window.removeEventListener('pointerup', clearDrag);
      window.removeEventListener('pointercancel', clearDrag);
      window.removeEventListener('blur', clearDrag);
    };
  }, []);

  if (!open) return null;

  const selectedProp =
    hud.placedProps.find((p) => p.instanceId === hud.selectedPropId) ??
    hud.placedProps[hud.placedProps.length - 1] ??
    null;

  const selectedControl = touchLayout[selectedControlId];

  const moveButtonFromPointer = (clientX: number, clientY: number) => {
    const id = draggingBtnRef.current;
    const box = canvasRef.current?.getBoundingClientRect();
    if (!id || !box || box.width <= 0 || box.height <= 0) return;
    const xPct = Math.max(4, Math.min(96, ((clientX - box.left) / box.width) * 100));
    const yPct = Math.max(10, Math.min(95, ((clientY - box.top) / box.height) * 100));
    const next = cloneTouchLayout(touchLayout);
    next[id] = {
      ...next[id],
      xPct: Math.round(xPct),
      yPct: Math.round(yPct),
    };
    onUpdateTouchLayout(next);
  };

  const patchControl = (id: ControlButtonId, patch: Partial<TouchLayoutConfig[ControlButtonId]>) => {
    const next = cloneTouchLayout(touchLayout);
    next[id] = { ...next[id], ...patch };
    onUpdateTouchLayout(next);
  };

  const isFullscreenAttachments = activeTab === 'attachments';

  if (isFullscreenAttachments) {
    return (
      <div className="pointer-events-auto fixed inset-0 z-50">
        <AttachmentStudioPanel
          hud={hud}
          onClose={onClose}
          onSelectStudioTab={(tab) => setActiveTab(tab)}
          onSetAttachmentTransform={onSetAttachmentTransform}
          onResetAttachmentTransform={onResetAttachmentTransform}
          onResetAllAttachmentTransforms={onResetAllAttachmentTransforms}
          onSaveAttachmentTransforms={onSaveAttachmentTransforms}
          onCreatePreview={onCreateAttachmentPreview}
          onSuspendMainRender={onSuspendMainRender}
        />
      </div>
    );
  }

  return (
    <div
      className={`pointer-events-auto fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 transition-colors ${
        ultraTransparent ? 'bg-transparent' : 'bg-[#06080c]/20'
      }`}
    >
      <div
        className={`flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-white/18 text-slate-100 shadow-2xl transition-all ${
          ultraTransparent ? 'bg-[#0c1017]/42' : 'bg-[#0c1017]/92'
        }`}
      >
        {/* Hidden file inputs */}
        <input
          ref={playerFileRef}
          type="file"
          accept=".glb"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUploadPlayerGlb(f);
            e.target.value = '';
          }}
        />
        <input
          ref={npcFileRef}
          type="file"
          accept=".glb"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            const targetNpc = pendingNpcTargetRef.current;
            if (f && targetNpc) onUploadNpcGlb(targetNpc, f);
            pendingNpcTargetRef.current = null;
            e.target.value = '';
          }}
        />
        <input
          ref={customCharsFileRef}
          type="file"
          accept=".glb"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length > 0) onUploadCustomCharacters(files);
            e.target.value = '';
          }}
        />
        <input
          ref={zombieFileRef}
          type="file"
          accept=".glb"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length > 0) onUploadZombieGlbs(files);
            e.target.value = '';
          }}
        />
        <input
          ref={rifleFileRef}
          type="file"
          accept=".glb"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUploadRifleGlb(f);
            e.target.value = '';
          }}
        />
        <input
          ref={pistolFileRef}
          type="file"
          accept=".glb"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUploadPistolGlb(f);
            e.target.value = '';
          }}
        />
        <input
          ref={equipmentFileRef}
          type="file"
          accept=".glb"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            const targetId = pendingEquipmentTargetRef.current;
            if (f && targetId) onUploadEquipmentGlb(targetId, f);
            pendingEquipmentTargetRef.current = null;
            e.target.value = '';
          }}
        />
        <input
          ref={objectOverrideFileRef}
          type="file"
          accept=".glb"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            const targetId = pendingOverrideTargetRef.current;
            if (f && targetId) onUploadObjectOverrideGlb(targetId, f);
            pendingOverrideTargetRef.current = null;
            e.target.value = '';
          }}
        />
        <input
          ref={propFileRef}
          type="file"
          accept=".glb"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUploadWorldPropGlb(propCategory, f);
            e.target.value = '';
          }}
        />
        <input
          ref={groundTexRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUploadTexture('ground', f);
            e.target.value = '';
          }}
        />
        <input
          ref={stoneTexRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUploadTexture('stone', f);
            e.target.value = '';
          }}
        />
        <input
          ref={barkTexRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUploadTexture('bark', f);
            e.target.value = '';
          }}
        />

        {/* Header */}
        <div
          className={`flex shrink-0 items-center justify-between gap-2 border-b border-white/12 bg-[#090c12]/45 ${
            isFullscreenAttachments ? 'px-3 py-2 sm:px-5' : 'px-4 py-3 sm:px-6'
          }`}
        >
          <div className="min-w-0">
            <h2
              className={`font-display text-amber-200 truncate ${
                isFullscreenAttachments ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'
              }`}
            >
              {isFullscreenAttachments
                ? 'Editor Visual de Equipamiento 360°'
                : 'Estudio y Ajustes del Mundo'}
            </h2>
            {!isFullscreenAttachments && (
              <p className="text-xs text-slate-300/85">
                Modelos .glb, objetos en el mapa, cámara, texturas, ciclo día/noche y controles
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isFullscreenAttachments && onUpdateStudioPin && (
              <button
                type="button"
                onClick={() => {
                  setPinEditorOpen((prev) => !prev);
                  setPinFeedback(null);
                }}
                title={`Código de acceso actual: ${studioPin}`}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                  pinEditorOpen
                    ? 'border-amber-400/75 bg-amber-500/25 text-amber-100'
                    : 'border-white/15 bg-slate-900/50 text-slate-200 hover:border-amber-400/50'
                }`}
              >
                <KeyRound className="h-3.5 w-3.5 text-amber-300" />
                <span className="hidden sm:inline">Cambiar PIN</span>
              </button>
            )}
            {!isFullscreenAttachments && (
              <button
                type="button"
                onClick={() => setUltraTransparent((prev) => !prev)}
                title="Alternar transparencia extra para ver la escena 3D en vivo"
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                  ultraTransparent
                    ? 'border-sky-400/70 bg-sky-500/25 text-sky-100'
                    : 'border-white/15 bg-slate-900/50 text-slate-200 hover:border-amber-400/50'
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {ultraTransparent ? 'Panel Normal' : 'Más Transparente'}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar menú"
              className={`flex items-center justify-center rounded-lg border border-white/15 bg-slate-900/50 text-slate-200 hover:border-amber-400/60 hover:text-amber-200 cursor-pointer ${
                isFullscreenAttachments ? 'h-8 w-8' : 'h-9 w-9'
              }`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Inline 4-digit Studio PIN configuration panel */}
        {pinEditorOpen && onUpdateStudioPin && (
          <div className="shrink-0 border-b border-amber-400/25 bg-amber-950/25 px-4 py-3 sm:px-6">
            <div className="flex flex-wrap items-end gap-2.5">
              <div className="min-w-[140px]">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-200">
                  <KeyRound className="h-3.5 w-3.5 text-amber-300" />
                  <span>Código de Acceso al Estudio</span>
                </div>
                <div className="mt-0.5 text-[11px] text-slate-400 font-mono-tabular">
                  Actual: {showPinDigits ? studioPin : '••••'}
                </div>
              </div>

              <label className="flex flex-col gap-1 text-[11px] text-slate-300">
                <span>Nuevo PIN (4 dígitos)</span>
                <input
                  type={showPinDigits ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={newPinInput}
                  onChange={(e) => {
                    setPinFeedback(null);
                    setNewPinInput(e.target.value.replace(/\D/g, '').slice(0, 4));
                  }}
                  className="w-28 rounded-lg border border-white/15 bg-slate-950 px-2.5 py-1.5 font-mono-tabular text-xs tracking-[0.25em] text-slate-100 focus:border-amber-400/70 focus:outline-none"
                />
              </label>

              <label className="flex flex-col gap-1 text-[11px] text-slate-300">
                <span>Confirmar PIN</span>
                <input
                  type={showPinDigits ? 'text' : 'password'}
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="••••"
                  value={confirmPinInput}
                  onChange={(e) => {
                    setPinFeedback(null);
                    setConfirmPinInput(e.target.value.replace(/\D/g, '').slice(0, 4));
                  }}
                  className="w-28 rounded-lg border border-white/15 bg-slate-950 px-2.5 py-1.5 font-mono-tabular text-xs tracking-[0.25em] text-slate-100 focus:border-amber-400/70 focus:outline-none"
                />
              </label>

              <button
                type="button"
                onClick={() => setShowPinDigits((prev) => !prev)}
                title={showPinDigits ? 'Ocultar dígitos' : 'Mostrar dígitos'}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-slate-900 text-slate-300 hover:border-amber-400/50 cursor-pointer"
              >
                {showPinDigits ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!/^\d{4}$/.test(newPinInput)) {
                    setPinFeedback({ kind: 'err', text: 'Ingresa exactamente 4 dígitos numéricos.' });
                    return;
                  }
                  if (newPinInput !== confirmPinInput) {
                    setPinFeedback({ kind: 'err', text: 'Los códigos no coinciden.' });
                    return;
                  }
                  const saved = onUpdateStudioPin(newPinInput);
                  if (saved) {
                    setNewPinInput('');
                    setConfirmPinInput('');
                    setPinFeedback({ kind: 'ok', text: '¡Código de acceso actualizado!' });
                  } else {
                    setPinFeedback({ kind: 'err', text: 'No se pudo guardar el código.' });
                  }
                }}
                className="rounded-lg bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-semibold text-slate-950 cursor-pointer"
              >
                Guardar PIN
              </button>

              <button
                type="button"
                onClick={() => {
                  const saved = onUpdateStudioPin('1988');
                  if (saved) {
                    setNewPinInput('');
                    setConfirmPinInput('');
                    setPinFeedback({ kind: 'ok', text: 'PIN restablecido a 1988.' });
                  }
                }}
                className="rounded-lg border border-white/15 bg-slate-900 hover:border-amber-400/50 px-2.5 py-1.5 text-xs text-slate-300 cursor-pointer"
              >
                Restablecer (1988)
              </button>
            </div>

            {pinFeedback && (
              <div
                className={`mt-2 text-xs font-medium ${
                  pinFeedback.kind === 'ok' ? 'text-emerald-300' : 'text-rose-400'
                }`}
              >
                {pinFeedback.text}
              </div>
            )}
          </div>
        )}

        {/* Navigation Tabs */}
        <div
          className={`flex shrink-0 flex-wrap gap-1.5 border-b border-white/12 bg-[#090c12]/35 ${
            isFullscreenAttachments ? 'px-3 py-1.5 sm:px-5' : 'px-4 py-2.5 sm:px-6'
          }`}
        >
          {TAB_ITEMS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                  active
                    ? 'border-amber-400/70 bg-amber-500/25 text-amber-100'
                    : 'border-white/12 bg-slate-900/40 text-slate-200 hover:border-white/25 hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Body */}
        <div
          className={`flex-1 min-h-0 ${
            isFullscreenAttachments
              ? 'flex flex-col overflow-hidden p-2.5 sm:p-3.5'
              : 'overflow-y-auto p-4 sm:p-6 space-y-5'
          }`}
        >
          {hud.modelError && (
            <div className="rounded-lg border border-rose-500/40 bg-rose-950/50 px-3 py-2 text-xs text-rose-200">
              {hud.modelError}
            </div>
          )}

          {/* TAB 1: MODELOS .GLB Y OBJETOS DEL ENTORNO */}
          {activeTab === 'models' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-400/35 bg-amber-500/10 px-4 py-3">
                <div>
                  <div className="text-xs font-semibold text-amber-200">
                    Editor Visual de Equipamiento 360°
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Escala, mueve y rota cascos, mochilas, chalecos y armas sobre Ricardo, Chispa, Mateo, zombis o cualquier personaje cargado en vista orbital 360°.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('attachments')}
                  className="flex items-center gap-1.5 rounded-lg border border-amber-400/70 bg-amber-500/25 hover:bg-amber-500/35 px-3 py-1.5 text-xs font-semibold text-amber-100 transition-colors cursor-pointer shrink-0"
                >
                  <Wrench className="h-3.5 w-3.5" />
                  <span>Abrir Editor 360°</span>
                </button>
              </div>

              {/* Remote Manifest & IndexedDB Sync Card */}
              <div className="rounded-xl border border-sky-400/30 bg-sky-950/20 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-sky-400 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-sky-100">
                        Repositorio Remoto y Caché Automática (IndexedDB)
                      </div>
                      <p className="text-[11px] text-slate-300/85">
                        Al iniciar, el juego compara la versión del manifiesto JSON y descarga automáticamente los .glb nuevos en caché oculta.
                      </p>
                    </div>
                  </div>
                  <span className="rounded-md border border-sky-400/35 bg-sky-500/15 px-2 py-0.5 font-mono-tabular text-[11px] text-sky-200">
                    {hud.remoteManifest?.version !== null && hud.remoteManifest?.version !== undefined
                      ? `v${hud.remoteManifest.version}`
                      : 'Sin sincronizar'}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={manifestUrlInput}
                    onChange={(e) => setManifestUrlInput(e.target.value)}
                    placeholder={REMOTE_MANIFEST_URL}
                    className="flex-1 rounded-lg border border-white/15 bg-slate-950/85 px-3 py-1.5 font-mono-tabular text-xs text-slate-100 focus:border-sky-400 focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={syncingManifest}
                      onClick={async () => {
                        if (!onSyncRemoteAssets) {
                          setSyncSuccessText(null);
                          setSyncErrorText('El motor 3D no está listo para sincronizar.');
                          return;
                        }
                        setSyncingManifest(true);
                        setSyncErrorText(null);
                        setSyncSuccessText(null);
                        try {
                          const result = await onSyncRemoteAssets(manifestUrlInput);
                          if (!result) {
                            setSyncErrorText(
                              'La sincronización no devolvió confirmación ni estado válido.',
                            );
                            return;
                          }
                          if (result.url) {
                            setManifestUrlInput(result.url);
                          }
                          const resultFailedCount = result.failedAssets?.length ?? 0;
                          const resultApplied = result.appliedAssets ?? 0;
                          if (
                            result.errorMessage ||
                            result.status === 'error' ||
                            result.status === 'offline' ||
                            resultFailedCount > 0 ||
                            resultApplied <= 0
                          ) {
                            setSyncErrorText(
                              result.errorMessage ??
                                (resultApplied <= 0
                                  ? 'No se aplicó ningún modelo .glb válido en la escena.'
                                  : 'No se pudo completar la sincronización con el manifiesto remoto.'),
                            );
                          } else if (result.status === 'ready') {
                            const verText =
                              result.version !== null ? `v${result.version}` : 'sin versión';
                            setSyncSuccessText(
                              `Sincronización completada (${verText}): ${result.downloadedAssets} descargado(s) y ${resultApplied} modelo(s) aplicado(s) en la escena y visor 360°.`,
                            );
                          }
                        } catch (err) {
                          setSyncErrorText(
                            err instanceof Error
                              ? err.message
                              : 'Error inesperado al sincronizar modelos.',
                          );
                        } finally {
                          setSyncingManifest(false);
                        }
                      }}
                      className="flex items-center gap-1.5 rounded-lg border border-sky-400/55 bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-50 px-3 py-1.5 text-xs font-semibold text-sky-100 cursor-pointer"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${syncingManifest ? 'animate-spin' : ''}`} />
                      <span>{syncingManifest ? 'Sincronizando...' : 'Sincronizar'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void downloadRootManifestJson(hud).then(() => {
                          setExportedRootNotice(true);
                          window.setTimeout(() => setExportedRootNotice(false), 2600);
                        });
                      }}
                      className="flex items-center gap-1.5 rounded-lg border border-amber-400/60 bg-amber-500/20 hover:bg-amber-500/30 px-3 py-1.5 text-xs font-semibold text-amber-100 cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5 text-amber-300" />
                      <span>
                        {exportedRootNotice
                          ? '¡models_manifest.json descargado!'
                          : 'Exportar Configuración Raíz (JSON)'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Real live status metrics */}
                <div className="grid grid-cols-3 gap-2 text-[11px] font-mono-tabular">
                  <div className="rounded-lg border border-white/10 bg-slate-950/60 px-2.5 py-1.5">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">
                      Descargados
                    </div>
                    <div className="mt-0.5 text-xs font-semibold text-sky-200">
                      {hud.remoteManifest?.downloadedAssets ?? 0}
                      {hud.remoteManifest?.declaredAssets
                        ? ` / ${hud.remoteManifest.declaredAssets}`
                        : ''}
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-slate-950/60 px-2.5 py-1.5">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">
                      Aplicados en escena
                    </div>
                    <div className="mt-0.5 text-xs font-semibold text-emerald-300">
                      {hud.remoteManifest?.appliedAssets ?? 0}
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-slate-950/60 px-2.5 py-1.5">
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">
                      Fallidos
                    </div>
                    <div
                      className={`mt-0.5 text-xs font-semibold ${
                        (hud.remoteManifest?.failedAssets?.length ?? 0) > 0
                          ? 'text-rose-300'
                          : 'text-slate-300'
                      }`}
                    >
                      {hud.remoteManifest?.failedAssets?.length ?? 0}
                    </div>
                  </div>
                </div>

                {(() => {
                  const rm = hud.remoteManifest;
                  const isBusy = syncingManifest || rm?.status === 'syncing';
                  const failedList = rm?.failedAssets ?? [];
                  const appliedCount = rm?.appliedAssets ?? 0;
                  const downloadedCount = rm?.downloadedAssets ?? 0;
                  const hasFailureStatus =
                    rm?.status === 'error' || rm?.status === 'offline' || failedList.length > 0;
                  const effectiveError =
                    syncErrorText ||
                    rm?.errorMessage ||
                    (hasFailureStatus
                      ? 'La sincronización terminó con errores y no pudo validar todos los modelos.'
                      : null);

                  if (isBusy) {
                    return (
                      <div
                        role="status"
                        className="flex items-center gap-2 rounded-lg border border-sky-400/35 bg-sky-950/50 px-3 py-2 text-[11px] text-sky-200"
                      >
                        <RefreshCw className="h-3.5 w-3.5 animate-spin shrink-0 text-sky-300" />
                        <span>Descargando manifiesto, validando binarios .glb y aplicando en escena...</span>
                      </div>
                    );
                  }

                  if (effectiveError || failedList.length > 0) {
                    return (
                      <div
                        role="alert"
                        className="space-y-2 rounded-lg border border-rose-500/45 bg-rose-950/65 px-3 py-2.5 text-[11px] text-rose-100"
                      >
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
                          <span className="whitespace-pre-wrap break-words leading-relaxed font-medium">
                            {effectiveError}
                          </span>
                        </div>
                        {failedList.length > 0 && (
                          <ul className="space-y-1 border-t border-rose-500/25 pt-2 pl-1 text-[10px] text-rose-200/95">
                            {failedList.map((item, idx) => (
                              <li
                                key={`${item.file}-${idx}`}
                                className="flex items-start gap-1.5 break-all leading-snug"
                              >
                                <span className="text-rose-400 font-bold shrink-0">•</span>
                                <span>
                                  <strong className="text-rose-100">{item.file}:</strong>{' '}
                                  {item.reason}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    );
                  }

                  const isTrulyReady = rm?.status === 'ready' && appliedCount > 0;
                  if (isTrulyReady) {
                    const verText = rm.version !== null ? `v${rm.version}` : 'caché local';
                    const readyMessage =
                      syncSuccessText ||
                      `Sincronización lista (${verText}): ${downloadedCount} archivo(s) verificado(s) y ${appliedCount} modelo(s) aplicado(s) en la escena y visor 360°.`;
                    return (
                      <div
                        role="status"
                        className="flex items-start gap-2 rounded-lg border border-emerald-500/40 bg-emerald-950/50 px-3 py-2 text-[11px] text-emerald-200"
                      >
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                        <span className="leading-relaxed">{readyMessage}</span>
                      </div>
                    );
                  }

                  return null;
                })()}
              </div>

              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Personajes y Armamento (.glb en IndexedDB)
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {/* Survivor */}
                  <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3.5 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-100">
                        <User className="h-4 w-4 text-amber-400" />
                        <span>Superviviente</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-400 truncate">
                        {hud.customModelName || 'Modelo base articulado'}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => playerFileRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-white/12 bg-slate-800 hover:bg-slate-700 py-1.5 text-xs font-medium cursor-pointer"
                      >
                        <Upload className="h-3.5 w-3.5 text-amber-400" />
                        <span>Cargar .glb</span>
                      </button>
                      {hud.customModelName && (
                        <button
                          type="button"
                          onClick={onResetPlayerGlb}
                          title="Restaurar base"
                          className="rounded-lg border border-white/12 bg-slate-950 px-2.5 py-1.5 text-slate-300 hover:text-white cursor-pointer"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Zombie (multi-model) */}
                  <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3.5 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-100">
                        <div className="flex items-center gap-2">
                          <Skull className="h-4 w-4 text-rose-400" />
                          <span>Zombies (.glb)</span>
                        </div>
                        {hud.customZombieSlots.length > 0 && (
                          <span className="font-mono-tabular text-[11px] text-rose-300">
                            {hud.customZombieSlots.length} cargados
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-slate-400 truncate">
                        {hud.customZombieSlots.length === 0
                          ? 'Horda base (sube 1 o varios .glb)'
                          : hud.customZombieSlots.length === 1
                            ? hud.customZombieSlots[0].name
                            : `${hud.customZombieSlots.length} modelos en la horda`}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => zombieFileRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-white/12 bg-slate-800 hover:bg-slate-700 py-1.5 text-xs font-medium cursor-pointer"
                      >
                        <Upload className="h-3.5 w-3.5 text-rose-400" />
                        <span>
                          {hud.customZombieSlots.length > 0 ? 'Agregar .glb' : 'Subir .glb'}
                        </span>
                      </button>
                      {hud.customZombieSlots.length > 0 && (
                        <button
                          type="button"
                          onClick={onResetZombieGlb}
                          title="Restaurar horda base"
                          className="rounded-lg border border-white/12 bg-slate-950 px-2.5 py-1.5 text-slate-300 hover:text-white cursor-pointer"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Rifle */}
                  <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3.5 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-100">
                        <Crosshair className="h-4 w-4 text-emerald-400" />
                        <span>Fusil FAL</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-400 truncate">
                        {hud.customRifleName || 'Fusil táctico base'}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => rifleFileRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-white/12 bg-slate-800 hover:bg-slate-700 py-1.5 text-xs font-medium cursor-pointer"
                      >
                        <Upload className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Cargar .glb</span>
                      </button>
                      {hud.customRifleName && (
                        <button
                          type="button"
                          onClick={onResetRifleGlb}
                          title="Restaurar base"
                          className="rounded-lg border border-white/12 bg-slate-950 px-2.5 py-1.5 text-slate-300 hover:text-white cursor-pointer"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Revólver */}
                  <div className="rounded-lg border border-white/10 bg-slate-900/40 p-3.5 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-100">
                        <Crosshair className="h-4 w-4 text-sky-400" />
                        <span>Revólver</span>
                      </div>
                      <div className="mt-1 text-xs text-slate-400 truncate">
                        {hud.customPistolName || 'Revólver táctico base'}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => pistolFileRef.current?.click()}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-white/12 bg-slate-800 hover:bg-slate-700 py-1.5 text-xs font-medium cursor-pointer"
                      >
                        <Upload className="h-3.5 w-3.5 text-sky-400" />
                        <span>Cargar .glb</span>
                      </button>
                      {hud.customPistolName && (
                        <button
                          type="button"
                          onClick={onResetPistolGlb}
                          title="Restaurar revólver base"
                          className="rounded-lg border border-white/12 bg-slate-950 px-2.5 py-1.5 text-slate-300 hover:text-white cursor-pointer"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {EQUIPMENT_CARD_DEFS.map((item) => {
                    const ItemIcon = item.icon;
                    const activeName = hud.customEquipmentNames?.[item.id] ?? null;
                    return (
                      <div
                        key={item.id}
                        className="rounded-lg border border-white/10 bg-slate-900/40 p-3.5 flex flex-col justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-100">
                            <ItemIcon className={`h-4 w-4 ${item.accentClass}`} />
                            <span>{item.label}</span>
                          </div>
                          <div className="mt-1 text-xs text-slate-400 truncate">
                            {activeName || item.defaultLabel}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              pendingEquipmentTargetRef.current = item.id;
                              equipmentFileRef.current?.click();
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-white/12 bg-slate-800 hover:bg-slate-700 py-1.5 text-xs font-medium cursor-pointer"
                          >
                            <Upload className={`h-3.5 w-3.5 ${item.accentClass}`} />
                            <span>Cargar .glb</span>
                          </button>
                          {activeName && (
                            <button
                              type="button"
                              onClick={() => onResetEquipmentGlb(item.id)}
                              title={`Restaurar ${item.label.toLowerCase()} base`}
                              className="rounded-lg border border-white/12 bg-slate-950 px-2.5 py-1.5 text-slate-300 hover:text-white cursor-pointer"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Lista de modelos de zombie personalizados */}
                {hud.customZombieSlots.length > 0 && (
                  <div className="rounded-lg border border-rose-500/20 bg-slate-900/38 p-3.5 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-rose-200">
                        <Skull className="h-3.5 w-3.5 text-rose-400" />
                        <span>
                          Modelos de Zombie Activos ({hud.customZombieSlots.length})
                        </span>
                        <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-mono-tabular text-rose-200 border border-rose-400/25">
                          Total horda:{' '}
                          {hud.customZombieSlots.reduce(
                            (sum, s) => sum + Math.max(0, s.spawnCount ?? 4),
                            0,
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => zombieFileRef.current?.click()}
                          className="flex items-center gap-1 rounded-lg border border-rose-400/40 bg-rose-500/20 px-2.5 py-1 text-[11px] font-medium text-rose-100 hover:bg-rose-500/30 cursor-pointer"
                        >
                          <Upload className="h-3 w-3" />
                          <span>Agregar otro .glb</span>
                        </button>
                        <button
                          type="button"
                          onClick={onResetZombieGlb}
                          className="text-[11px] text-slate-400 hover:text-rose-300 cursor-pointer"
                        >
                          Restaurar base
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {hud.customZombieSlots.map((zSlot, idx) => {
                        const sizeLabel =
                          zSlot.byteLength >= 1024 * 1024
                            ? `${(zSlot.byteLength / (1024 * 1024)).toFixed(1)} MB`
                            : `${Math.max(1, Math.round(zSlot.byteLength / 1024))} KB`;
                        const count = Math.max(0, Math.min(25, zSlot.spawnCount ?? 4));
                        return (
                          <div
                            key={zSlot.id}
                            className="flex flex-col gap-2 rounded-lg border border-white/10 bg-slate-950/45 px-3 py-2.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium text-slate-100 truncate">
                                  #{idx + 1} {zSlot.name}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono-tabular">
                                  {sizeLabel}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => onDeleteZombieSlot(zSlot.id)}
                                title="Eliminar este modelo de zombie"
                                className="rounded-lg border border-white/10 bg-slate-900 p-1.5 text-slate-400 hover:text-rose-300 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-2">
                              <select
                                value={zSlot.targetKind || 'all'}
                                onChange={(e) =>
                                  onUpdateZombieSlotKind(
                                    zSlot.id,
                                    e.target.value as ZombieTargetKind,
                                  )
                                }
                                title="Tipo de zombie que usará este modelo"
                                className="rounded border border-white/12 bg-slate-900 px-2 py-1 text-[11px] text-slate-200 cursor-pointer"
                              >
                                <option value="all">Mezclar (Todos)</option>
                                <option value="runner">Solo Runner</option>
                                <option value="stalker">Solo Acechador</option>
                                <option value="biter">Solo Mordedor</option>
                                <option value="spitter">Solo Escupidor</option>
                                <option value="police">Solo Policía</option>
                                <option value="gendarme">Solo Gendarme</option>
                                <option value="gendarme_heavy">Solo Gendarme Equipado</option>
                                <option value="brute">Solo Bruto (Clásico)</option>
                              </select>

                              <div
                                className="flex items-center gap-1 rounded border border-white/12 bg-slate-900 px-1.5 py-0.5"
                                title="Cantidad de zombies de este modelo 3D en el mapa"
                              >
                                <span className="text-[10px] text-slate-400 mr-1">Cant.</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    onUpdateZombieSlotCount(zSlot.id, Math.max(0, count - 1))
                                  }
                                  className="h-5 w-5 rounded bg-slate-800 text-xs font-bold text-slate-200 hover:bg-slate-700 cursor-pointer"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min={0}
                                  max={25}
                                  value={count}
                                  onChange={(e) => {
                                    const parsed = Number.parseInt(e.target.value, 10);
                                    onUpdateZombieSlotCount(
                                      zSlot.id,
                                      Number.isNaN(parsed)
                                        ? 0
                                        : Math.max(0, Math.min(25, parsed)),
                                    );
                                  }}
                                  className="w-9 bg-transparent text-center text-[11px] font-mono-tabular font-semibold text-rose-200 focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={() =>
                                    onUpdateZombieSlotCount(zSlot.id, Math.min(25, count + 1))
                                  }
                                  className="h-5 w-5 rounded bg-slate-800 text-xs font-bold text-slate-200 hover:bg-slate-700 cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Aliados, NPCs y Nuevos Personajes (.glb) */}
                <div className="rounded-lg border border-emerald-500/25 bg-slate-900/38 p-3.5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-200">
                        <User className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Aliados, NPCs y Personajes Adicionales (.glb)</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Cualquier modelo cargado aquí hereda animaciones y huesos universales y queda disponible automáticamente en el Editor 360°.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => customCharsFileRef.current?.click()}
                      className="flex items-center gap-1.5 rounded-lg border border-emerald-400/45 bg-emerald-500/20 hover:bg-emerald-500/30 px-2.5 py-1.5 text-xs font-semibold text-emerald-100 cursor-pointer shrink-0"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Agregar Personaje .glb</span>
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {/* Chispa (Sofía Méndez) */}
                    <div className="rounded-lg border border-white/10 bg-slate-950/45 p-3 flex flex-col justify-between gap-2.5">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-100">
                          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Chispa (Sofía Méndez)</span>
                        </div>
                        <div className="mt-1 text-xs text-slate-400 truncate">
                          {hud.customNpcNames?.ally_chispa || 'Modelo articulado base'}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            pendingNpcTargetRef.current = 'ally_chispa';
                            npcFileRef.current?.click();
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-white/12 bg-slate-800 hover:bg-slate-700 py-1.5 text-xs font-medium cursor-pointer"
                        >
                          <Upload className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Cargar .glb</span>
                        </button>
                        {hud.customNpcNames?.ally_chispa && (
                          <button
                            type="button"
                            onClick={() => onResetNpcGlb('ally_chispa')}
                            title="Restaurar Chispa base"
                            className="rounded-lg border border-white/12 bg-slate-950 px-2.5 py-1.5 text-slate-300 hover:text-white cursor-pointer"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Mateo (Mecánico) */}
                    <div className="rounded-lg border border-white/10 bg-slate-950/45 p-3 flex flex-col justify-between gap-2.5">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-100">
                          <Wrench className="h-3.5 w-3.5 text-amber-400" />
                          <span>Mateo (Mecánico)</span>
                        </div>
                        <div className="mt-1 text-xs text-slate-400 truncate">
                          {hud.customNpcNames?.npc_mateo || 'Modelo articulado base'}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            pendingNpcTargetRef.current = 'npc_mateo';
                            npcFileRef.current?.click();
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-white/12 bg-slate-800 hover:bg-slate-700 py-1.5 text-xs font-medium cursor-pointer"
                        >
                          <Upload className="h-3.5 w-3.5 text-amber-400" />
                          <span>Cargar .glb</span>
                        </button>
                        {hud.customNpcNames?.npc_mateo && (
                          <button
                            type="button"
                            onClick={() => onResetNpcGlb('npc_mateo')}
                            title="Restaurar Mateo base"
                            className="rounded-lg border border-white/12 bg-slate-950 px-2.5 py-1.5 text-slate-300 hover:text-white cursor-pointer"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {(hud.customCharacterSlots?.length ?? 0) > 0 && (
                    <div className="grid gap-2 sm:grid-cols-2 pt-1">
                      {hud.customCharacterSlots.map((cSlot, idx) => {
                        const sizeLabel =
                          cSlot.byteLength >= 1024 * 1024
                            ? `${(cSlot.byteLength / (1024 * 1024)).toFixed(1)} MB`
                            : `${Math.max(1, Math.round(cSlot.byteLength / 1024))} KB`;
                        return (
                          <div
                            key={cSlot.id}
                            className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-slate-950/55 px-3 py-2"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-medium text-slate-100 truncate">
                                #{idx + 1} {cSlot.name}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono-tabular">
                                {sizeLabel} · Disponible en Editor 360°
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setActiveTab('attachments')}
                              title="Calibrar accesorios en 360°"
                              className="rounded-lg border border-emerald-400/35 bg-emerald-500/15 px-2 py-1 text-[11px] font-medium text-emerald-200 hover:bg-emerald-500/25 cursor-pointer"
                            >
                              360°
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteCustomCharacter(cSlot.id)}
                              title="Eliminar personaje personalizado"
                              className="rounded-lg border border-white/10 bg-slate-900 p-1.5 text-slate-400 hover:text-rose-300 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>

              {/* Reemplazar Objetos del Mapa, Cajas e Interactuables (.glb) */}
              <section className="space-y-3 border-t border-white/10 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Reemplazar Objetos del Mapa, Cajas e Interactuables (.glb)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Cambia el modelo 3D de cualquier caja, objeto recolectable o estructura del mapa por un archivo .glb guardado en caché.
                    </p>
                  </div>
                  {Object.keys(hud.objectOverrides).length > 0 && (
                    <button
                      type="button"
                      onClick={onResetAllObjectOverrides}
                      className="flex items-center gap-1.5 rounded-lg border border-rose-500/40 bg-rose-950/55 px-2.5 py-1 text-[11px] font-medium text-rose-200 hover:bg-rose-900/70 cursor-pointer"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Restaurar todos ({Object.keys(hud.objectOverrides).length})</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      { id: 'crates', label: 'Cajas y Fogata' },
                      { id: 'interactables', label: 'Objetos Interactuables' },
                      { id: 'map_objects', label: 'Objetos del Mapa' },
                    ] as { id: WorldObjectOverrideGroup; label: string }[]
                  ).map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setOverrideGroup(g.id)}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                        overrideGroup === g.id
                          ? 'border-amber-400/70 bg-amber-500/20 text-amber-100'
                          : 'border-white/12 bg-slate-900/60 text-slate-300 hover:border-white/25'
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  {WORLD_OBJECT_OVERRIDE_DEFS.filter((d) => d.group === overrideGroup).map(
                    (def) => {
                      const activeName = hud.objectOverrides[def.id] ?? null;
                      return (
                        <div
                          key={def.id}
                          className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 ${
                            activeName
                              ? 'border-amber-400/40 bg-amber-500/10'
                              : 'border-white/10 bg-slate-900/42'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-slate-100 truncate">
                              {def.label}
                            </div>
                            <div className="text-[11px] text-slate-400 truncate">
                              {activeName ? `Modelo: ${activeName}` : def.description}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                pendingOverrideTargetRef.current = def.id;
                                objectOverrideFileRef.current?.click();
                              }}
                              className="flex items-center gap-1 rounded-lg border border-white/15 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-[11px] font-medium text-slate-100 cursor-pointer"
                            >
                              <Upload className="h-3 w-3 text-amber-400" />
                              <span>{activeName ? 'Cambiar' : 'Cargar .glb'}</span>
                            </button>
                            {activeName && (
                              <button
                                type="button"
                                onClick={() => onResetObjectOverride(def.id)}
                                title="Restaurar modelo 3D original"
                                className="rounded-lg border border-white/12 bg-slate-950 p-1.5 text-slate-300 hover:text-white cursor-pointer"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </section>

              {/* World Prop Slots */}
              <section className="space-y-3 border-t border-white/10 pt-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Objetos 3D del Escenario (Autos, Tanques, Edificaciones, Árboles, Follaje)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Importa archivos .glb, guárdalos en caché y ubícalos con escala y rotación sobre el mapa.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateMapSettings({
                          mapPreset:
                            hud.mapSettings.mapPreset === 'custom_sandbox'
                              ? 'buenos_aires'
                              : 'custom_sandbox',
                        })
                      }
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                        hud.mapSettings.mapPreset === 'custom_sandbox'
                          ? 'border-emerald-400/70 bg-emerald-500/20 text-emerald-100'
                          : 'border-white/15 bg-slate-900/75 text-slate-200 hover:border-emerald-400/50'
                      }`}
                    >
                      <Layers className="h-3.5 w-3.5" />
                      <span>
                        {hud.mapSettings.mapPreset === 'custom_sandbox'
                          ? 'Terreno Simple Activo'
                          : 'Usar Terreno Simple'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenMapEditorWithSlot(hud.activePlacementSlotId)}
                      className="flex items-center gap-1.5 rounded-lg border border-sky-400/60 bg-sky-500/20 px-3 py-1.5 text-xs font-semibold text-sky-100 hover:bg-sky-500/30 cursor-pointer"
                    >
                      <Move className="h-3.5 w-3.5" />
                      <span>Abrir Editor 3D en Mapa</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-slate-900/38 p-3">
                  <label className="text-xs text-slate-300">Categoría:</label>
                  <select
                    value={propCategory}
                    onChange={(e) => setPropCategory(e.target.value as WorldPropCategory)}
                    className="rounded-lg border border-white/15 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-100"
                  >
                    {PROP_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => propFileRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-3 py-1.5 text-xs cursor-pointer"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Importar Objeto .glb</span>
                  </button>
                </div>

                {hud.propSlots.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-white/15 bg-slate-900/30 p-4 text-center text-xs text-slate-400">
                    Todavía no importaste modelos 3D para el mapa. Elige una categoría arriba y carga tus .glb (autos, tanques de fierro, edificios, árboles o follaje).
                  </div>
                ) : (
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {hud.propSlots.map((slot) => {
                      const catLabel =
                        PROP_CATEGORIES.find((c) => c.id === slot.category)?.label || slot.category;
                      return (
                        <div
                          key={slot.id}
                          className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-slate-900/45 px-3 py-2.5"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-100 truncate">
                              {slot.name}
                            </div>
                            <div className="text-[11px] text-slate-400">{catLabel}</div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => onPlaceWorldPropNearPlayer(slot.id)}
                              className="rounded-lg border border-emerald-400/40 bg-emerald-500/20 px-2.5 py-1 text-[11px] font-medium text-emerald-100 hover:bg-emerald-500/30 cursor-pointer"
                            >
                              Colocar
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenMapEditorWithSlot(slot.id)}
                              className="rounded-lg border border-sky-400/40 bg-sky-500/20 px-2.5 py-1 text-[11px] font-medium text-sky-100 hover:bg-sky-500/30 cursor-pointer"
                            >
                              En Mapa
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteWorldPropSlot(slot.id)}
                              title="Eliminar slot"
                              className="rounded-lg border border-white/10 bg-slate-950 p-1.5 text-slate-400 hover:text-rose-300 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Placed instances transform editor */}
                {hud.placedProps.length > 0 && (
                  <div className="rounded-lg border border-white/10 bg-slate-900/38 p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-slate-200">
                        Objetos Colocados en el Mapa ({hud.placedProps.length})
                      </div>
                      <button
                        type="button"
                        onClick={onClearAllPlacedProps}
                        className="text-[11px] text-rose-300 hover:text-rose-200 cursor-pointer"
                      >
                        Vaciar mapa
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {hud.placedProps.map((p, idx) => {
                        const isSel = selectedProp?.instanceId === p.instanceId;
                        return (
                          <button
                            key={p.instanceId}
                            type="button"
                            onClick={() => onSelectPlacedProp(p.instanceId)}
                            className={`rounded-lg border px-2.5 py-1 text-[11px] cursor-pointer ${
                              isSel
                                ? 'border-sky-400 bg-sky-500/25 text-sky-100'
                                : 'border-white/10 bg-slate-950 text-slate-300 hover:border-white/25'
                            }`}
                          >
                            #{idx + 1} {p.name}
                          </button>
                        );
                      })}
                    </div>

                    {selectedProp && (
                      <div className="grid gap-3 pt-2 border-t border-white/10 sm:grid-cols-2">
                        {hud.propSlots.length > 1 && (
                          <label className="space-y-1 text-xs sm:col-span-2">
                            <div className="text-slate-300">Cambiar Modelo 3D (.glb)</div>
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
                              className="w-full rounded-lg border border-white/15 bg-slate-950 px-2.5 py-1.5 text-xs text-sky-200"
                            >
                              {hud.propSlots.map((slot) => (
                                <option key={slot.id} value={slot.id}>
                                  {slot.name}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                        <label className="space-y-1 text-xs">
                          <div className="flex justify-between text-slate-300">
                            <span>Posición X</span>
                            <span className="font-mono-tabular">{selectedProp.x.toFixed(1)}m</span>
                          </div>
                          <input
                            type="range"
                            min={-42}
                            max={42}
                            step={0.5}
                            value={selectedProp.x}
                            onChange={(e) =>
                              onUpdatePlacedProp(selectedProp.instanceId, {
                                x: Number(e.target.value),
                              })
                            }
                            className="w-full accent-amber-400"
                          />
                        </label>

                        <label className="space-y-1 text-xs">
                          <div className="flex justify-between text-slate-300">
                            <span>Posición Z</span>
                            <span className="font-mono-tabular">{selectedProp.z.toFixed(1)}m</span>
                          </div>
                          <input
                            type="range"
                            min={-42}
                            max={42}
                            step={0.5}
                            value={selectedProp.z}
                            onChange={(e) =>
                              onUpdatePlacedProp(selectedProp.instanceId, {
                                z: Number(e.target.value),
                              })
                            }
                            className="w-full accent-amber-400"
                          />
                        </label>

                        <label className="space-y-1 text-xs">
                          <div className="flex justify-between text-slate-300">
                            <span>Escala</span>
                            <span className="font-mono-tabular">{selectedProp.scale.toFixed(2)}x</span>
                          </div>
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
                            className="w-full accent-amber-400"
                          />
                        </label>

                        <label className="space-y-1 text-xs">
                          <div className="flex justify-between text-slate-300">
                            <span>Rotación Y</span>
                            <span className="font-mono-tabular">{Math.round(selectedProp.rotationY)}°</span>
                          </div>
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
                            className="w-full accent-amber-400"
                          />
                        </label>

                        <label className="space-y-1 text-xs">
                          <div className="flex justify-between text-slate-300">
                            <span>Altura extra (Y)</span>
                            <span className="font-mono-tabular">{selectedProp.yOffset.toFixed(2)}m</span>
                          </div>
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
                            className="w-full accent-amber-400"
                          />
                        </label>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-3">
                          <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
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
                            <span>Colisión sólida</span>
                          </label>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onDuplicatePlacedProp(selectedProp.instanceId)}
                              className="flex items-center gap-1 rounded-lg border border-sky-400/40 bg-sky-500/15 px-2.5 py-1 text-xs text-sky-100 hover:bg-sky-500/25 cursor-pointer"
                            >
                              <Copy className="h-3.5 w-3.5" />
                              <span>Duplicar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onRemovePlacedProp(selectedProp.instanceId)}
                              className="flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-950/60 px-2.5 py-1 text-xs text-rose-200 hover:bg-rose-900/70 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Quitar</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          )}

          {/* TAB 2: MAPA, CICLO DÍA/NOCHE, NIEBLA DINÁMICA Y TEXTURAS */}
          {activeTab === 'map' && (
            <div className="space-y-5">
              {/* Base Map vs Custom Sandbox Terrain Selector */}
              <section className="rounded-lg border border-emerald-400/25 bg-slate-900/45 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                    <MapIcon className="h-4 w-4" />
                    <span>Modo del Escenario (Crear Mapa a Gusto)</span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Cambia en vivo sin perder tus objetos colocados
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => onUpdateMapSettings({ mapPreset: 'buenos_aires' })}
                    className={`rounded-lg border p-3 text-left transition-all cursor-pointer ${
                      hud.mapSettings.mapPreset === 'buenos_aires'
                        ? 'border-amber-400 bg-amber-500/15 text-amber-50 shadow-[0_0_0_1px_rgba(251,191,36,0.3)]'
                        : 'border-white/10 bg-slate-950/45 text-slate-300 hover:border-white/25'
                    }`}
                  >
                    <div className="text-xs font-semibold">Buenos Aires — Av. 9 de Julio</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Obelisco, Gran &quot;BA&quot;, Metrobus, Plaza de la República y edificios porteños.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdateMapSettings({ mapPreset: 'custom_sandbox' })}
                    className={`rounded-lg border p-3 text-left transition-all cursor-pointer ${
                      hud.mapSettings.mapPreset === 'custom_sandbox'
                        ? 'border-emerald-400 bg-emerald-500/15 text-emerald-50 shadow-[0_0_0_1px_rgba(52,211,153,0.35)]'
                        : 'border-white/10 bg-slate-950/45 text-slate-300 hover:border-white/25'
                    }`}
                  >
                    <div className="text-xs font-semibold">Terreno Simple (Crear a Gusto)</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Terreno despejado y plano para armar tu propio mapa con modelos 3D .glb y texturas importadas.
                    </div>
                  </button>
                </div>

                {hud.mapSettings.mapPreset === 'custom_sandbox' && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
                    <button
                      type="button"
                      onClick={() => onOpenMapEditorWithSlot(hud.activePlacementSlotId)}
                      className="flex items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 px-3 py-1.5 text-xs font-semibold text-slate-950 cursor-pointer"
                    >
                      <Move className="h-3.5 w-3.5" />
                      <span>Abrir Editor 3D y Colocar Modelos</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => propFileRef.current?.click()}
                      className="flex items-center gap-1.5 rounded-lg border border-amber-400/50 bg-amber-500/15 hover:bg-amber-500/25 px-3 py-1.5 text-xs font-medium text-amber-100 cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>Importar Modelo .glb</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => groundTexRef.current?.click()}
                      className="flex items-center gap-1.5 rounded-lg border border-sky-400/50 bg-sky-500/15 hover:bg-sky-500/25 px-3 py-1.5 text-xs font-medium text-sky-100 cursor-pointer"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      <span>Importar Textura del Suelo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onUpdateMapSettings({ terrainScale: 0 })}
                      className="rounded-lg border border-white/15 bg-slate-950/60 hover:border-white/30 px-2.5 py-1.5 text-[11px] text-slate-200 cursor-pointer"
                    >
                      Aplanar bordes (0x)
                    </button>
                  </div>
                )}
              </section>

              {/* Day/Night & Dynamic Fog */}
              <section className="rounded-lg border border-white/10 bg-slate-900/40 p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
                    <Sun className="h-4 w-4" />
                    <span>Ciclo Día / Noche y Niebla Dinámica</span>
                  </div>
                  <span className="font-mono-tabular text-xs text-slate-300">
                    {hud.clockLabel} · {hud.isDaytime ? 'Día (Zombies en reposo)' : 'Noche (Zombies activos)'}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Hora del día</span>
                      <span className="font-mono-tabular">{hud.clockLabel}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={0.99}
                      step={0.01}
                      value={hud.mapSettings.timeOfDay}
                      onChange={(e) =>
                        onUpdateMapSettings({ timeOfDay: Number(e.target.value) })
                      }
                      className="w-full accent-amber-400"
                    />
                    <div className="flex gap-1.5 pt-1">
                      {[
                        { label: 'Medianoche', val: 0.02 },
                        { label: 'Amanecer', val: 0.27 },
                        { label: 'Mediodía', val: 0.5 },
                        { label: 'Atardecer', val: 0.76 },
                      ].map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => onUpdateMapSettings({ timeOfDay: p.val })}
                          className="rounded border border-white/12 bg-slate-950 px-2 py-0.5 text-[11px] text-slate-300 hover:border-amber-400/50 cursor-pointer"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </label>

                  <label className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Velocidad del ciclo</span>
                      <span className="font-mono-tabular">{hud.mapSettings.cycleSpeed.toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min={0.2}
                      max={4.0}
                      step={0.2}
                      value={hud.mapSettings.cycleSpeed}
                      onChange={(e) =>
                        onUpdateMapSettings({ cycleSpeed: Number(e.target.value) })
                      }
                      className="w-full accent-amber-400"
                    />
                    <label className="flex items-center gap-2 pt-1.5 text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hud.mapSettings.dayNightEnabled}
                        onChange={(e) =>
                          onUpdateMapSettings({ dayNightEnabled: e.target.checked })
                        }
                        className="accent-amber-400"
                      />
                      <span>Avance automático de día y noche</span>
                    </label>
                  </label>

                  <label className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Densidad de niebla</span>
                      <span className="font-mono-tabular">{hud.mapSettings.fogDensity.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={2.6}
                      step={0.05}
                      value={hud.mapSettings.fogDensity}
                      onChange={(e) =>
                        onUpdateMapSettings({ fogDensity: Number(e.target.value) })
                      }
                      className="w-full accent-amber-400"
                    />
                  </label>

                  <div className="flex items-center">
                    <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={hud.mapSettings.fogDynamic}
                        onChange={(e) =>
                          onUpdateMapSettings({ fogDynamic: e.target.checked })
                        }
                        className="accent-amber-400"
                      />
                      <span>Niebla dinámica (oleadas de bruma)</span>
                    </label>
                  </div>
                </div>
              </section>

              {/* Map Topology */}
              <section className="rounded-lg border border-white/10 bg-slate-900/40 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                    <Layers className="h-4 w-4 text-emerald-400" />
                    <span>Terreno y Elementos del Mapa</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateMapSettings({ ...DEFAULT_MAP_SETTINGS })}
                    className="text-xs text-slate-400 hover:text-amber-300 cursor-pointer"
                  >
                    Restaurar mapa base
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>
                        {hud.mapSettings.mapPreset === 'custom_sandbox'
                          ? 'Relieve del borde exterior'
                          : 'Relieve del terreno'}
                      </span>
                      <span className="font-mono-tabular">{hud.mapSettings.terrainScale.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={2.2}
                      step={0.05}
                      value={hud.mapSettings.terrainScale}
                      onChange={(e) =>
                        onUpdateMapSettings({ terrainScale: Number(e.target.value) })
                      }
                      className="w-full accent-amber-400"
                    />
                  </label>

                  <label
                    className={`flex items-center gap-2 text-xs ${
                      hud.mapSettings.mapPreset === 'custom_sandbox'
                        ? 'text-slate-500 cursor-not-allowed'
                        : 'text-slate-200 cursor-pointer'
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={hud.mapSettings.mapPreset === 'custom_sandbox'}
                      checked={hud.mapSettings.showDefaultRuins}
                      onChange={(e) =>
                        onUpdateMapSettings({ showDefaultRuins: e.target.checked })
                      }
                      className="accent-amber-400"
                    />
                    <span>Mostrar ciudad / monumentos base</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 text-xs ${
                      hud.mapSettings.mapPreset === 'custom_sandbox'
                        ? 'text-slate-500 cursor-not-allowed'
                        : 'text-slate-200 cursor-pointer'
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={hud.mapSettings.mapPreset === 'custom_sandbox'}
                      checked={hud.mapSettings.showDefaultForest}
                      onChange={(e) =>
                        onUpdateMapSettings({ showDefaultForest: e.target.checked })
                      }
                      className="accent-amber-400"
                    />
                    <span>Mostrar arbolado base</span>
                  </label>
                </div>
              </section>

              {/* Materials & Imported Textures */}
              <section className="rounded-lg border border-white/10 bg-slate-900/40 p-4 space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                  <ImageIcon className="h-4 w-4 text-sky-400" />
                  <span>Texturas Importadas y Materiales PBR</span>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  {/* Ground */}
                  <div className="rounded-lg border border-white/10 bg-slate-950/42 p-3 space-y-2.5">
                    <div className="text-xs font-semibold text-slate-100">Suelo y Asfalto</div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {hud.mapSettings.customGroundTexName || 'Textura procedural base'}
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => groundTexRef.current?.click()}
                        className="flex-1 rounded border border-white/12 bg-slate-800 hover:bg-slate-700 py-1 text-[11px] font-medium cursor-pointer"
                      >
                        Importar imagen
                      </button>
                      {hud.mapSettings.customGroundTexName && (
                        <button
                          type="button"
                          onClick={() => onResetTexture('ground')}
                          className="rounded border border-white/12 bg-slate-900 px-2 py-1 text-[11px] text-slate-300 cursor-pointer"
                        >
                          Base
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-300">
                      <span>Tinte</span>
                      <input
                        type="color"
                        value={hud.mapSettings.groundTint}
                        onChange={(e) => onUpdateMapSettings({ groundTint: e.target.value })}
                        className="h-6 w-10 rounded bg-transparent cursor-pointer"
                      />
                    </div>
                    <label className="block text-[11px] text-slate-300">
                      <div className="flex justify-between">
                        <span>Rugosidad</span>
                        <span>{hud.mapSettings.groundRoughness.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0.1}
                        max={1}
                        step={0.02}
                        value={hud.mapSettings.groundRoughness}
                        onChange={(e) =>
                          onUpdateMapSettings({ groundRoughness: Number(e.target.value) })
                        }
                        className="w-full accent-amber-400"
                      />
                    </label>
                    <label className="block text-[11px] text-slate-300">
                      <div className="flex justify-between">
                        <span>Repetición UV</span>
                        <span>{hud.mapSettings.groundRepeat}x</span>
                      </div>
                      <input
                        type="range"
                        min={4}
                        max={40}
                        step={1}
                        value={hud.mapSettings.groundRepeat}
                        onChange={(e) =>
                          onUpdateMapSettings({ groundRepeat: Number(e.target.value) })
                        }
                        className="w-full accent-amber-400"
                      />
                    </label>
                  </div>

                  {/* Stone */}
                  <div className="rounded-lg border border-white/10 bg-slate-950/42 p-3 space-y-2.5">
                    <div className="text-xs font-semibold text-slate-100">Ruinas, Rocas y Plaza</div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {hud.mapSettings.customStoneTexName || 'Hormigón procedural base'}
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => stoneTexRef.current?.click()}
                        className="flex-1 rounded border border-white/12 bg-slate-800 hover:bg-slate-700 py-1 text-[11px] font-medium cursor-pointer"
                      >
                        Importar imagen
                      </button>
                      {hud.mapSettings.customStoneTexName && (
                        <button
                          type="button"
                          onClick={() => onResetTexture('stone')}
                          className="rounded border border-white/12 bg-slate-900 px-2 py-1 text-[11px] text-slate-300 cursor-pointer"
                        >
                          Base
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-300">
                      <span>Tinte</span>
                      <input
                        type="color"
                        value={hud.mapSettings.stoneTint}
                        onChange={(e) => onUpdateMapSettings({ stoneTint: e.target.value })}
                        className="h-6 w-10 rounded bg-transparent cursor-pointer"
                      />
                    </div>
                    <label className="block text-[11px] text-slate-300">
                      <div className="flex justify-between">
                        <span>Rugosidad</span>
                        <span>{hud.mapSettings.stoneRoughness.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0.1}
                        max={1}
                        step={0.02}
                        value={hud.mapSettings.stoneRoughness}
                        onChange={(e) =>
                          onUpdateMapSettings({ stoneRoughness: Number(e.target.value) })
                        }
                        className="w-full accent-amber-400"
                      />
                    </label>
                    <label className="block text-[11px] text-slate-300">
                      <div className="flex justify-between">
                        <span>Metálico</span>
                        <span>{hud.mapSettings.stoneMetalness.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={0.9}
                        step={0.02}
                        value={hud.mapSettings.stoneMetalness}
                        onChange={(e) =>
                          onUpdateMapSettings({ stoneMetalness: Number(e.target.value) })
                        }
                        className="w-full accent-amber-400"
                      />
                    </label>
                  </div>

                  {/* Bark */}
                  <div className="rounded-lg border border-white/10 bg-slate-950/42 p-3 space-y-2.5">
                    <div className="text-xs font-semibold text-slate-100">Madera y Troncos</div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {hud.mapSettings.customBarkTexName || 'Corteza procedural base'}
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => barkTexRef.current?.click()}
                        className="flex-1 rounded border border-white/12 bg-slate-800 hover:bg-slate-700 py-1 text-[11px] font-medium cursor-pointer"
                      >
                        Importar imagen
                      </button>
                      {hud.mapSettings.customBarkTexName && (
                        <button
                          type="button"
                          onClick={() => onResetTexture('bark')}
                          className="rounded border border-white/12 bg-slate-900 px-2 py-1 text-[11px] text-slate-300 cursor-pointer"
                        >
                          Base
                        </button>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-300">
                      <span>Tinte</span>
                      <input
                        type="color"
                        value={hud.mapSettings.barkTint}
                        onChange={(e) => onUpdateMapSettings({ barkTint: e.target.value })}
                        className="h-6 w-10 rounded bg-transparent cursor-pointer"
                      />
                    </div>
                    <label className="block text-[11px] text-slate-300">
                      <div className="flex justify-between">
                        <span>Rugosidad</span>
                        <span>{hud.mapSettings.barkRoughness.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0.1}
                        max={1}
                        step={0.02}
                        value={hud.mapSettings.barkRoughness}
                        onChange={(e) =>
                          onUpdateMapSettings({ barkRoughness: Number(e.target.value) })
                        }
                        className="w-full accent-amber-400"
                      />
                    </label>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* TAB 3: POSTPROCESADO */}
          {activeTab === 'postfx' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-900/40 p-4">
                <label className="flex items-center gap-2.5 text-sm font-medium text-slate-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hud.postProcess.enabled}
                    onChange={(e) => onUpdatePostProcess({ enabled: e.target.checked })}
                    className="h-4 w-4 accent-amber-400"
                  />
                  <span>Activar Postprocesado (Bloom, Viñeta y Corrección de Color)</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_LABELS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onSelectPostProcessPreset(p.id)}
                      className={`rounded-lg border px-2.5 py-1 text-xs cursor-pointer ${
                        hud.postProcess.preset === p.id
                          ? 'border-amber-400/70 bg-amber-500/20 text-amber-100'
                          : 'border-white/12 bg-slate-950 text-slate-300 hover:border-white/25'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 rounded-lg border border-white/10 bg-slate-900/40 p-4 sm:grid-cols-2">
                <div className="sm:col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="pp-bloom"
                    checked={hud.postProcess.bloomEnabled}
                    onChange={(e) => onUpdatePostProcess({ bloomEnabled: e.target.checked })}
                    className="accent-amber-400"
                  />
                  <label htmlFor="pp-bloom" className="text-xs font-medium text-slate-200 cursor-pointer">
                    Brillo Luminoso (Bloom en trazadoras, fogata y faroles)
                  </label>
                </div>

                {[
                  {
                    key: 'bloomStrength' as const,
                    label: 'Intensidad Bloom',
                    min: 0,
                    max: 1.4,
                    step: 0.02,
                  },
                  {
                    key: 'bloomThreshold' as const,
                    label: 'Umbral Bloom',
                    min: 0.5,
                    max: 2.0,
                    step: 0.02,
                  },
                  {
                    key: 'vignette' as const,
                    label: 'Viñeta Cinematográfica',
                    min: 0,
                    max: 0.85,
                    step: 0.02,
                  },
                  {
                    key: 'chromaticAberration' as const,
                    label: 'Aberración Cromática',
                    min: 0,
                    max: 0.8,
                    step: 0.02,
                  },
                  {
                    key: 'filmGrain' as const,
                    label: 'Grano de Película',
                    min: 0,
                    max: 0.5,
                    step: 0.02,
                  },
                  {
                    key: 'saturation' as const,
                    label: 'Saturación de Color',
                    min: 0.4,
                    max: 1.6,
                    step: 0.02,
                  },
                  {
                    key: 'contrast' as const,
                    label: 'Contraste',
                    min: 0.75,
                    max: 1.4,
                    step: 0.02,
                  },
                  {
                    key: 'exposure' as const,
                    label: 'Exposición',
                    min: 0.7,
                    max: 1.6,
                    step: 0.02,
                  },
                ].map((item) => (
                  <label key={item.key} className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>{item.label}</span>
                      <span className="font-mono-tabular">{hud.postProcess[item.key].toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min={item.min}
                      max={item.max}
                      step={item.step}
                      value={hud.postProcess[item.key]}
                      onChange={(e) =>
                        onUpdatePostProcess({ [item.key]: Number(e.target.value) })
                      }
                      className="w-full accent-amber-400"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3B: CÁMARA Y ZOOM DEL PERSONAJE Y APUNTADO */}
          {activeTab === 'camera' && (
            <div className="space-y-5">
              {/* Preview mode & Presets */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-900/40 p-3.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  {CAMERA_PRESET_LABELS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onSelectCameraPreset(p.id)}
                      className={`rounded-lg border px-2.5 py-1 text-xs cursor-pointer ${
                        hud.cameraSettings.preset === p.id
                          ? 'border-amber-400/70 bg-amber-500/20 text-amber-100'
                          : 'border-white/12 bg-slate-950 text-slate-300 hover:border-white/25'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={onResetCameraSettings}
                    className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-slate-950/55 px-2.5 py-1 text-xs text-slate-200 hover:border-amber-400/50 cursor-pointer"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Restablecer</span>
                  </button>
                </div>
              </div>

              {/* Live preview toggle between Normal and Aim */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-400/25 bg-amber-500/10 px-4 py-2.5">
                <div className="text-xs text-amber-100">
                  <span className="font-semibold">Vista previa en vivo:</span> ajusta los deslizadores mientras ves el encuadre detrás del menú.
                </div>
                <div className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-slate-950/90 p-1">
                  <button
                    type="button"
                    onClick={() => setPreviewAimMode(false)}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer ${
                      !previewAimMode
                        ? 'bg-amber-500/25 text-amber-100 border border-amber-400/50'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <User className="h-3.5 w-3.5" />
                    <span>Vista Normal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewAimMode(true)}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer ${
                      previewAimMode
                        ? 'bg-rose-500/25 text-rose-100 border border-rose-400/50'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Crosshair className="h-3.5 w-3.5" />
                    <span>Vista Apuntado</span>
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Normal Third-Person Camera */}
                <div className="space-y-3 rounded-lg border border-white/10 bg-slate-900/40 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
                      <User className="h-3.5 w-3.5" />
                      <span>Cámara del Personaje</span>
                    </h3>
                    {!previewAimMode && (
                      <span className="text-[11px] font-medium text-emerald-300">Previsualizando</span>
                    )}
                  </div>

                  <label className="block space-y-1 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Distancia / Alejamiento</span>
                      <span className="font-mono-tabular">
                        {hud.cameraSettings.normalDistance.toFixed(2)} m
                      </span>
                    </div>
                    <input
                      type="range"
                      min={2.0}
                      max={7.5}
                      step={0.05}
                      value={hud.cameraSettings.normalDistance}
                      onChange={(e) => {
                        setPreviewAimMode(false);
                        onUpdateCameraSettings({ normalDistance: Number(e.target.value) });
                      }}
                      className="w-full accent-amber-400"
                    />
                  </label>

                  <label className="block space-y-1 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Zoom / Campo de Visión (FOV)</span>
                      <span className="font-mono-tabular">
                        {Math.round(hud.cameraSettings.normalFov)}°
                      </span>
                    </div>
                    <input
                      type="range"
                      min={38}
                      max={78}
                      step={1}
                      value={hud.cameraSettings.normalFov}
                      onChange={(e) => {
                        setPreviewAimMode(false);
                        onUpdateCameraSettings({ normalFov: Number(e.target.value) });
                      }}
                      className="w-full accent-amber-400"
                    />
                  </label>

                  <label className="block space-y-1 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Desplazamiento Lateral (Hombro)</span>
                      <span className="font-mono-tabular">
                        {hud.cameraSettings.normalShoulderOffset > 0.04
                          ? `Der +${hud.cameraSettings.normalShoulderOffset.toFixed(2)} m`
                          : hud.cameraSettings.normalShoulderOffset < -0.04
                            ? `Izq ${hud.cameraSettings.normalShoulderOffset.toFixed(2)} m`
                            : 'Centrado 0.00 m'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-1.1}
                      max={1.2}
                      step={0.02}
                      value={hud.cameraSettings.normalShoulderOffset}
                      onChange={(e) => {
                        setPreviewAimMode(false);
                        onUpdateCameraSettings({ normalShoulderOffset: Number(e.target.value) });
                      }}
                      className="w-full accent-amber-400"
                    />
                  </label>

                  <label className="block space-y-1 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Altura de Cámara</span>
                      <span className="font-mono-tabular">
                        {hud.cameraSettings.normalHeight.toFixed(2)} m
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.8}
                      max={2.3}
                      step={0.02}
                      value={hud.cameraSettings.normalHeight}
                      onChange={(e) => {
                        setPreviewAimMode(false);
                        onUpdateCameraSettings({ normalHeight: Number(e.target.value) });
                      }}
                      className="w-full accent-amber-400"
                    />
                  </label>

                  <label className="block space-y-1 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Ángulo Vertical Inicial</span>
                      <span className="font-mono-tabular">
                        {Math.round((hud.cameraSettings.normalPitch * 180) / Math.PI)}°
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-0.2}
                      max={0.65}
                      step={0.01}
                      value={hud.cameraSettings.normalPitch}
                      onChange={(e) => {
                        setPreviewAimMode(false);
                        onUpdateCameraSettings({ normalPitch: Number(e.target.value) });
                      }}
                      className="w-full accent-amber-400"
                    />
                  </label>
                </div>

                {/* Aiming Over-the-Shoulder Camera */}
                <div className="space-y-3 rounded-lg border border-white/10 bg-slate-900/40 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-300">
                      <Crosshair className="h-3.5 w-3.5" />
                      <span>Cámara y Zoom de Apuntado</span>
                    </h3>
                    {previewAimMode && (
                      <span className="text-[11px] font-medium text-emerald-300">Previsualizando</span>
                    )}
                  </div>

                  <label className="block space-y-1 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Distancia al Apuntar</span>
                      <span className="font-mono-tabular">
                        {hud.cameraSettings.aimDistance.toFixed(2)} m
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.75}
                      max={3.5}
                      step={0.02}
                      value={hud.cameraSettings.aimDistance}
                      onChange={(e) => {
                        setPreviewAimMode(true);
                        onUpdateCameraSettings({ aimDistance: Number(e.target.value) });
                      }}
                      className="w-full accent-rose-400"
                    />
                  </label>

                  <label className="block space-y-1 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Zoom al Apuntar (FOV)</span>
                      <span className="font-mono-tabular">
                        {Math.round(hud.cameraSettings.aimFov)}° (
                        {(
                          hud.cameraSettings.normalFov /
                          Math.max(12, hud.cameraSettings.aimFov)
                        ).toFixed(2)}
                        x)
                      </span>
                    </div>
                    <input
                      type="range"
                      min={18}
                      max={56}
                      step={1}
                      value={hud.cameraSettings.aimFov}
                      onChange={(e) => {
                        setPreviewAimMode(true);
                        onUpdateCameraSettings({ aimFov: Number(e.target.value) });
                      }}
                      className="w-full accent-rose-400"
                    />
                  </label>

                  <label className="block space-y-1 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Hombro al Apuntar</span>
                      <span className="font-mono-tabular">
                        {hud.cameraSettings.aimShoulderOffset > 0.04
                          ? `Der +${hud.cameraSettings.aimShoulderOffset.toFixed(2)} m`
                          : hud.cameraSettings.aimShoulderOffset < -0.04
                            ? `Izq ${hud.cameraSettings.aimShoulderOffset.toFixed(2)} m`
                            : 'Centrado 0.00 m'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-1.0}
                      max={1.1}
                      step={0.02}
                      value={hud.cameraSettings.aimShoulderOffset}
                      onChange={(e) => {
                        setPreviewAimMode(true);
                        onUpdateCameraSettings({ aimShoulderOffset: Number(e.target.value) });
                      }}
                      className="w-full accent-rose-400"
                    />
                  </label>

                  <label className="block space-y-1 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Altura al Apuntar</span>
                      <span className="font-mono-tabular">
                        {hud.cameraSettings.aimHeight.toFixed(2)} m
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.9}
                      max={2.2}
                      step={0.02}
                      value={hud.cameraSettings.aimHeight}
                      onChange={(e) => {
                        setPreviewAimMode(true);
                        onUpdateCameraSettings({ aimHeight: Number(e.target.value) });
                      }}
                      className="w-full accent-rose-400"
                    />
                  </label>

                  <p className="pt-1 text-[11px] leading-relaxed text-slate-400">
                    Un FOV más bajo acerca la mira con mayor zoom óptico al mantener presionado el botón de apuntar o clic derecho.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: EDITOR VISUAL DE BOTONES DE MANDO Y ACCIÓN */}
          {activeTab === 'controls' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-slate-300">
                  Arrastra cada botón sobre la vista previa para mover su posición. Selecciona uno para ajustar tamaño, opacidad o visibilidad.
                </p>
                <button
                  type="button"
                  onClick={onResetTouchLayout}
                  className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 hover:border-amber-400/50 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Restablecer Posiciones</span>
                </button>
              </div>

              {/* Interactive preview canvas */}
              <div
                ref={canvasRef}
                onPointerMove={(e) => {
                  if (draggingBtnRef.current) moveButtonFromPointer(e.clientX, e.clientY);
                }}
                onPointerUp={() => {
                  draggingBtnRef.current = null;
                }}
                onPointerCancel={() => {
                  draggingBtnRef.current = null;
                }}
                className="relative h-56 sm:h-64 w-full overflow-hidden rounded-xl border border-white/15 bg-[#070a10]/50 select-none touch-none"
              >
                <div className="pointer-events-none absolute inset-y-0 left-0 w-[44%] border-r border-dashed border-white/10 flex items-center justify-center text-[11px] text-slate-500">
                  Zona táctil invisible 360° · Mover / Correr
                </div>
                <div className="pointer-events-none absolute inset-y-0 right-0 w-[56%] flex items-center justify-center text-[11px] text-slate-500">
                  Zona táctil invisible 360° · Cámara
                </div>

                {CONTROL_BUTTON_ORDER.map((id) => {
                  const cfg = touchLayout[id] ?? DEFAULT_TOUCH_LAYOUT[id];
                  const isSel = selectedControlId === id;
                  const baseSize = id === 'fire' ? 46 : id === 'aim' || id === 'jump' ? 38 : 34;
                  const pxSize = Math.round(baseSize * cfg.scale);
                  return (
                    <button
                      key={id}
                      type="button"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setSelectedControlId(id);
                        draggingBtnRef.current = id;
                        try {
                          if (!e.currentTarget.hasPointerCapture?.(e.pointerId)) {
                            e.currentTarget.setPointerCapture(e.pointerId);
                          }
                        } catch {
                          // Ignore InvalidStateError for inactive/synthetic pointers
                        }
                      }}
                      onPointerMove={(e) => {
                        if (draggingBtnRef.current === id) {
                          moveButtonFromPointer(e.clientX, e.clientY);
                        }
                      }}
                      onPointerUp={() => {
                        draggingBtnRef.current = null;
                      }}
                      style={{
                        left: `${cfg.xPct}%`,
                        top: `${cfg.yPct}%`,
                        width: `${pxSize}px`,
                        height: `${pxSize}px`,
                        opacity: cfg.visible ? cfg.opacity : 0.22,
                        transform: 'translate(-50%, -50%)',
                      }}
                      className={`absolute flex items-center justify-center rounded-full border text-[10px] font-semibold cursor-grab active:cursor-grabbing ${
                        isSel
                          ? 'border-amber-300 bg-amber-500/40 text-white ring-2 ring-amber-400/50'
                          : 'border-white/30 bg-slate-800/80 text-slate-200'
                      }`}
                    >
                      {cfg.label.split(' ')[0]}
                    </button>
                  );
                })}
              </div>

              {/* Button picker + sliders */}
              <div className="flex flex-wrap gap-1.5">
                {CONTROL_BUTTON_ORDER.map((id) => {
                  const cfg = touchLayout[id] ?? DEFAULT_TOUCH_LAYOUT[id];
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setSelectedControlId(id)}
                      className={`rounded-lg border px-2.5 py-1 text-xs cursor-pointer ${
                        selectedControlId === id
                          ? 'border-amber-400 bg-amber-500/20 text-amber-100'
                          : 'border-white/10 bg-slate-900 text-slate-300'
                      }`}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
              </div>

              {selectedControl && (
                <div className="grid gap-4 rounded-lg border border-white/10 bg-slate-900/40 p-4 sm:grid-cols-4">
                  <label className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Tamaño</span>
                      <span className="font-mono-tabular">{selectedControl.scale.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min={0.65}
                      max={1.65}
                      step={0.05}
                      value={selectedControl.scale}
                      onChange={(e) =>
                        patchControl(selectedControlId, { scale: Number(e.target.value) })
                      }
                      className="w-full accent-amber-400"
                    />
                  </label>

                  <label className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Opacidad</span>
                      <span className="font-mono-tabular">
                        {Math.round(selectedControl.opacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.2}
                      max={1}
                      step={0.05}
                      value={selectedControl.opacity}
                      onChange={(e) =>
                        patchControl(selectedControlId, { opacity: Number(e.target.value) })
                      }
                      className="w-full accent-amber-400"
                    />
                  </label>

                  <label className="space-y-1 text-xs">
                    <div className="flex justify-between text-slate-300">
                      <span>Horizontal (X)</span>
                      <span className="font-mono-tabular">{selectedControl.xPct}%</span>
                    </div>
                    <input
                      type="range"
                      min={4}
                      max={96}
                      step={1}
                      value={selectedControl.xPct}
                      onChange={(e) =>
                        patchControl(selectedControlId, { xPct: Number(e.target.value) })
                      }
                      className="w-full accent-amber-400"
                    />
                  </label>

                  <div className="flex flex-col justify-between gap-2 text-xs">
                    <label className="space-y-1">
                      <div className="flex justify-between text-slate-300">
                        <span>Vertical (Y)</span>
                        <span className="font-mono-tabular">{selectedControl.yPct}%</span>
                      </div>
                      <input
                        type="range"
                        min={12}
                        max={95}
                        step={1}
                        value={selectedControl.yPct}
                        onChange={(e) =>
                          patchControl(selectedControlId, { yPct: Number(e.target.value) })
                        }
                        className="w-full accent-amber-400"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        patchControl(selectedControlId, { visible: !selectedControl.visible })
                      }
                      className="flex items-center justify-center gap-1.5 rounded border border-white/15 bg-slate-950 py-1 text-[11px] text-slate-200 cursor-pointer"
                    >
                      {selectedControl.visible ? (
                        <>
                          <Eye className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Botón Visible</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3.5 w-3.5 text-slate-400" />
                          <span>Botón Oculto</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const StudioModal = React.memo(StudioModalInner);
