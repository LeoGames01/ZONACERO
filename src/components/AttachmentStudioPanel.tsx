import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Backpack,
  Box,
  Camera,
  Check,
  ChevronDown,
  Code2,
  Copy,
  Crosshair,
  Download,
  Eye,
  EyeOff,
  HardHat,
  Map as MapIcon,
  Maximize2,
  Move,
  RotateCcw,
  RotateCw,
  Save,
  Shield,
  Skull,
  Sliders,
  Sparkles,
  User,
  Wrench,
  X,
} from 'lucide-react';
import type { StudioPreviewSubject } from '../game/engine';
import { downloadRootManifestJson } from '../game/remoteAssets';
import {
  DEFAULT_ATTACHMENT_TRANSFORM,
  PLAYER_ATTACHABLE_DEFS,
  ZOMBIE_ATTACHABLE_DEFS,
  ZOMBIE_PREVIEW_PRESETS,
  isAttachmentTransformModified,
  sanitizeAttachmentTransform,
} from '../game/settingsDefaults';
import type {
  AttachmentTargetScope,
  AttachmentTransform,
  AttachmentTransformsState,
  CharacterEntityDescriptor,
  HudSnapshot,
  PlayerAttachableId,
  PreviewPoseId,
  ZombieAttachableId,
} from '../game/types';
import {
  AttachmentStudioViewport,
  type CameraCommand,
  type GizmoMode,
  type GizmoSpace,
  type ViewportCameraAction,
} from './AttachmentStudioViewport';
import type { StudioTab } from './StudioModal';

interface AttachmentStudioPanelProps {
  hud: HudSnapshot;
  onClose: () => void;
  onSelectStudioTab: (tab: StudioTab) => void;
  onSetAttachmentTransform: (
    scope: AttachmentTargetScope,
    itemId: string,
    patch: Partial<AttachmentTransform>,
  ) => void;
  onResetAttachmentTransform: (scope: AttachmentTargetScope, itemId: string) => void;
  onResetAllAttachmentTransforms: (scope?: AttachmentTargetScope) => void;
  onSaveAttachmentTransforms: () => void;
  onCreatePreview: (
    scope: AttachmentTargetScope,
    zombieModelId: string,
    selectedZombieItem: ZombieAttachableId,
  ) => Promise<StudioPreviewSubject | null>;
  onSuspendMainRender?: (suspended: boolean) => void;
}

type OpenMenuId = 'studio' | 'scope' | 'object' | 'pose' | 'camera' | null;

const POSE_OPTIONS: { id: PreviewPoseId; label: string; shortLabel: string; hint: string }[] = [
  {
    id: 'unarmed',
    label: 'De pie · Manos libres',
    shortLabel: 'Manos libres',
    hint: 'Pose 1: Idle estándar',
  },
  {
    id: 'one_handed',
    label: 'Parado · Una mano ocupada',
    shortLabel: 'Una mano',
    hint: 'Pose 2: Arma corta o cuerpo a cuerpo',
  },
  {
    id: 'rifle',
    label: 'Parado · Con fusil (2 manos)',
    shortLabel: 'Con fusil',
    hint: 'Pose 3: Arma larga a dos manos',
  },
];

const PLAYER_CATEGORIES: ('Equipo y Armadura' | 'Armas' | 'Arrojadizos y Distracciones')[] = [
  'Equipo y Armadura',
  'Armas',
  'Arrojadizos y Distracciones',
];

const STUDIO_NAV_ITEMS: {
  id: StudioTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'models', label: 'Modelos .glb', icon: Box },
  { id: 'map', label: 'Mapa y Texturas', icon: MapIcon },
  { id: 'camera', label: 'Cámara y Zoom', icon: Camera },
  { id: 'postfx', label: 'Postprocesado', icon: Sparkles },
  { id: 'controls', label: 'Controles HUD', icon: Sliders },
];

function roundVal(n: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(n * factor) / factor;
}

interface AxisSliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  decimals: number;
  accentClass?: string;
  onChange: (next: number) => void;
}

const AxisSliderRow: React.FC<AxisSliderRowProps> = ({
  label,
  value,
  min,
  max,
  step,
  unit = '',
  decimals,
  accentClass = 'accent-amber-400',
  onChange,
}) => {
  const clamp = (v: number) => Math.max(min, Math.min(max, roundVal(v, decimals)));
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      <span className="w-11 shrink-0 font-medium text-slate-300">{label}</span>
      <button
        type="button"
        onClick={() => onChange(clamp(value - step))}
        aria-label={`Disminuir ${label}`}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-white/15 bg-slate-900 text-slate-200 hover:border-amber-400/60 hover:text-amber-200 cursor-pointer"
      >
        -
      </button>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(clamp(Number(e.target.value)))}
        className={`flex-1 min-w-0 h-1.5 cursor-pointer ${accentClass}`}
      />
      <button
        type="button"
        onClick={() => onChange(clamp(value + step))}
        aria-label={`Aumentar ${label}`}
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded border border-white/15 bg-slate-900 text-slate-200 hover:border-amber-400/60 hover:text-amber-200 cursor-pointer"
      >
        +
      </button>
      <span className="w-14 shrink-0 text-right font-mono-tabular text-[10px] text-slate-200">
        {value.toFixed(decimals)}
        {unit}
      </span>
    </div>
  );
};

function getTransformForEntity(
  state: AttachmentTransformsState,
  entityId: string,
  itemId: PlayerAttachableId,
): AttachmentTransform {
  if (entityId === 'player') {
    return state.player[itemId] ?? DEFAULT_ATTACHMENT_TRANSFORM;
  }
  if (entityId === 'zombie') {
    return state.zombie[itemId as ZombieAttachableId] ?? DEFAULT_ATTACHMENT_TRANSFORM;
  }
  const entityOverride = state.entities?.[entityId]?.[itemId];
  if (entityOverride) return entityOverride;
  if (entityId.startsWith('zombie:')) {
    return state.zombie[itemId as ZombieAttachableId] ?? DEFAULT_ATTACHMENT_TRANSFORM;
  }
  return DEFAULT_ATTACHMENT_TRANSFORM;
}

const SLIDER_COMMIT_THROTTLE_MS = 65;

export const AttachmentStudioPanel: React.FC<AttachmentStudioPanelProps> = ({
  hud,
  onClose,
  onSelectStudioTab,
  onSetAttachmentTransform,
  onResetAttachmentTransform,
  onResetAllAttachmentTransforms,
  onSaveAttachmentTransforms,
  onCreatePreview,
  onSuspendMainRender,
}) => {
  const [entityId, setEntityId] = useState<string>('player');
  const [pose, setPose] = useState<PreviewPoseId>('unarmed');
  const [selectedItem, setSelectedItem] = useState<PlayerAttachableId>('helmet');
  const [zombieModelId, setZombieModelId] = useState<string>(ZOMBIE_PREVIEW_PRESETS[0].id);
  const [armorFlags, setArmorFlags] = useState({ helmet: true, vest: true, backpack: true });

  const [gizmoMode, setGizmoMode] = useState<GizmoMode>('translate');
  const [gizmoSpace, setGizmoSpace] = useState<GizmoSpace>('local');
  const [gizmoVisible, setGizmoVisible] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [cameraCommand, setCameraCommand] = useState<CameraCommand | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);

  const [openMenu, setOpenMenu] = useState<OpenMenuId>(null);
  const [fineTuneOpen, setFineTuneOpen] = useState(false);
  const [showPerAxisScale, setShowPerAxisScale] = useState(false);

  const [savedNotice, setSavedNotice] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);
  const [rootDownloadedNotice, setRootDownloadedNotice] = useState(false);

  // Local transform draft prevents 120Hz touch slider drags from re-rendering <App /> / <GameHud />
  const [draftTransforms, setDraftTransforms] = useState<AttachmentTransformsState>(
    () => hud.attachmentTransforms,
  );
  const pendingCommitsRef = useRef<
    Map<
      string,
      { scope: AttachmentTargetScope; itemId: string; patch: Partial<AttachmentTransform> }
    >
  >(new Map());
  const commitTimerRef = useRef<number | null>(null);
  const lastCommitTimeRef = useRef(0);
  const onSetRef = useRef(onSetAttachmentTransform);
  onSetRef.current = onSetAttachmentTransform;

  // Suspend heavy background Buenos Aires game engine while fullscreen 360 editor is open
  useEffect(() => {
    onSuspendMainRender?.(true);
    return () => {
      onSuspendMainRender?.(false);
    };
  }, [onSuspendMainRender]);

  // Sync external resets/updates when no local slider throttle commit is pending
  useEffect(() => {
    if (pendingCommitsRef.current.size === 0 && commitTimerRef.current === null) {
      setDraftTransforms(hud.attachmentTransforms);
    }
  }, [hud.attachmentTransforms]);

  const flushPendingSliderCommits = useCallback(() => {
    if (commitTimerRef.current !== null) {
      clearTimeout(commitTimerRef.current);
      commitTimerRef.current = null;
    }
    if (pendingCommitsRef.current.size === 0) return;
    lastCommitTimeRef.current = performance.now();
    const entries = Array.from(pendingCommitsRef.current.values());
    pendingCommitsRef.current.clear();
    for (let i = 0; i < entries.length; i++) {
      const e = entries[i];
      onSetRef.current(e.scope, e.itemId, e.patch);
    }
  }, []);

  useEffect(() => {
    return () => {
      flushPendingSliderCommits();
    };
  }, [flushPendingSliderCommits]);

  const applyDraftPatch = useCallback(
    (
      targetScope: AttachmentTargetScope,
      targetItemId: string,
      patch: Partial<AttachmentTransform>,
    ) => {
      setDraftTransforms((prev) => {
        if (targetScope === 'player') {
          const id = targetItemId as PlayerAttachableId;
          const cur = prev.player[id] ?? { ...DEFAULT_ATTACHMENT_TRANSFORM };
          const next = sanitizeAttachmentTransform({ ...cur, ...patch });
          return {
            ...prev,
            player: { ...prev.player, [id]: next },
          };
        }
        if (targetScope === 'zombie') {
          const id = targetItemId as ZombieAttachableId;
          const cur = prev.zombie[id] ?? { ...DEFAULT_ATTACHMENT_TRANSFORM };
          const next = sanitizeAttachmentTransform({ ...cur, ...patch });
          return {
            ...prev,
            zombie: { ...prev.zombie, [id]: next },
          };
        }
        const id = targetItemId as PlayerAttachableId;
        const prevMap = prev.entities?.[targetScope] ?? {};
        const base =
          targetScope.startsWith('zombie:')
            ? (prev.zombie[id as ZombieAttachableId] ?? DEFAULT_ATTACHMENT_TRANSFORM)
            : DEFAULT_ATTACHMENT_TRANSFORM;
        const cur = prevMap[id] ?? { ...base };
        const next = sanitizeAttachmentTransform({ ...cur, ...patch });
        return {
          ...prev,
          entities: {
            ...prev.entities,
            [targetScope]: {
              ...prevMap,
              [id]: next,
            },
          },
        };
      });
    },
    [],
  );

  const characterCatalog: CharacterEntityDescriptor[] = useMemo(() => {
    if (hud.characterCatalog && hud.characterCatalog.length > 0) {
      return hud.characterCatalog;
    }
    const allPlayerItems = PLAYER_ATTACHABLE_DEFS.map((d) => d.id);
    const allZombieItems: PlayerAttachableId[] = ZOMBIE_ATTACHABLE_DEFS.map((d) => d.id);
    return [
      {
        id: 'player',
        label: 'Ricardo López (Protagonista)',
        kind: 'player',
        customGlbName: hud.customModelName,
        supportedItems: allPlayerItems,
        defaultItem: 'helmet',
      },
      {
        id: 'npc:chispa',
        label: 'Chispa (Sofía Méndez)',
        kind: 'npc',
        customGlbName: hud.customNpcNames?.ally_chispa ?? null,
        supportedItems: allPlayerItems,
        defaultItem: 'helmet',
      },
      {
        id: 'npc:mateo',
        label: 'Mateo (Mecánico)',
        kind: 'npc',
        customGlbName: hud.customNpcNames?.npc_mateo ?? null,
        supportedItems: allPlayerItems,
        defaultItem: 'helmet',
      },
      {
        id: 'zombie',
        label: 'Zombis (Horda General)',
        kind: 'zombie',
        customGlbName: hud.customZombieName,
        supportedItems: allZombieItems,
        defaultItem: 'helmet',
        isZombiePresetGroup: true,
      },
    ];
  }, [
    hud.characterCatalog,
    hud.customModelName,
    hud.customNpcNames,
    hud.customZombieName,
  ]);

  const activeEntity = useMemo(
    () => characterCatalog.find((e) => e.id === entityId) ?? characterCatalog[0],
    [characterCatalog, entityId],
  );

  useEffect(() => {
    if (!characterCatalog.some((e) => e.id === entityId)) {
      setEntityId(characterCatalog[0]?.id ?? 'player');
    }
  }, [characterCatalog, entityId]);

  useEffect(() => {
    if (!activeEntity.supportedItems.includes(selectedItem)) {
      setSelectedItem(activeEntity.defaultItem ?? 'helmet');
    }
  }, [activeEntity, selectedItem]);

  const isZombieEntity = activeEntity.kind === 'zombie';

  const zombieModelOptions = useMemo(() => {
    const customOpts = hud.customZombieSlots.map((slot, idx) => ({
      id: slot.id,
      label: `GLB #${idx + 1}: ${slot.name}`,
    }));
    return [
      ...customOpts,
      ...ZOMBIE_PREVIEW_PRESETS.map((p) => ({ id: p.id, label: p.label })),
    ];
  }, [hud.customZombieSlots]);

  useEffect(() => {
    if (!zombieModelOptions.some((o) => o.id === zombieModelId)) {
      setZombieModelId(zombieModelOptions[0]?.id ?? ZOMBIE_PREVIEW_PRESETS[0].id);
    }
  }, [zombieModelOptions, zombieModelId]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (exportOpen) setExportOpen(false);
        else if (openMenu) setOpenMenu(null);
        else if (fineTuneOpen) setFineTuneOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [exportOpen, openMenu, fineTuneOpen]);

  const modelSignature = useMemo(() => {
    const equipSig = Object.entries(hud.customEquipmentNames || {})
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join('|');
    const overrideSig = Object.entries(hud.objectOverrides || {})
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join('|');
    const zSlotsSig = hud.customZombieSlots
      .map((s) => `${s.id}:${s.updatedAt}:${s.targetKind}`)
      .join('|');
    const cSlotsSig = (hud.customCharacterSlots ?? [])
      .map((s) => `${s.id}:${s.updatedAt}`)
      .join('|');
    return [
      hud.customModelName ?? 'default-player',
      hud.customNpcNames?.ally_chispa ?? 'default-chispa',
      hud.customNpcNames?.npc_mateo ?? 'default-mateo',
      hud.customRifleName ?? 'default-rifle',
      hud.customPistolName ?? 'default-pistol',
      hud.remoteManifest?.lastSyncedAt ?? 0,
      hud.remoteManifest?.appliedAssets ?? 0,
      overrideSig,
      equipSig,
      zSlotsSig,
      cSlotsSig,
    ].join('::');
  }, [
    hud.customModelName,
    hud.customNpcNames,
    hud.customRifleName,
    hud.customPistolName,
    hud.objectOverrides,
    hud.customEquipmentNames,
    hud.customZombieSlots,
    hud.customCharacterSlots,
    hud.remoteManifest?.lastSyncedAt,
    hud.remoteManifest?.appliedAssets,
  ]);

  const activeItemId = selectedItem;
  const activeSelectionRef = useRef({ scope: activeEntity.id, activeItemId });
  activeSelectionRef.current = { scope: activeEntity.id, activeItemId };

  const currentTransform: AttachmentTransform = getTransformForEntity(
    draftTransforms,
    activeEntity.id,
    selectedItem,
  );

  const activeItemMeta = isZombieEntity
    ? (ZOMBIE_ATTACHABLE_DEFS.find((d) => d.id === selectedItem) ??
      PLAYER_ATTACHABLE_DEFS.find((d) => d.id === selectedItem))
    : PLAYER_ATTACHABLE_DEFS.find((d) => d.id === selectedItem);

  const activePoseMeta = POSE_OPTIONS.find((p) => p.id === pose) ?? POSE_OPTIONS[0];
  const activeZombieMeta =
    zombieModelOptions.find((z) => z.id === zombieModelId) ?? zombieModelOptions[0];

  const handleSelectEntity = (nextEntityId: string) => {
    setEntityId(nextEntityId);
    const nextMeta = characterCatalog.find((e) => e.id === nextEntityId);
    if (nextMeta && !nextMeta.supportedItems.includes(selectedItem)) {
      setSelectedItem(nextMeta.defaultItem ?? 'helmet');
    }
    setOpenMenu(null);
  };

  const handleSelectItem = (itemId: PlayerAttachableId) => {
    setSelectedItem(itemId);
    if (!isZombieEntity) {
      const def = PLAYER_ATTACHABLE_DEFS.find((d) => d.id === itemId);
      if (def) {
        setPose(def.defaultPose);
      }
    }
    setOpenMenu(null);
  };

  const patchTransform = (patch: Partial<AttachmentTransform>) => {
    const curEntity = activeEntity.id;
    applyDraftPatch(curEntity, activeItemId, patch);
    const key = `${curEntity}:${activeItemId}`;
    const prevPending = pendingCommitsRef.current.get(key);
    pendingCommitsRef.current.set(key, {
      scope: curEntity,
      itemId: activeItemId,
      patch: prevPending ? { ...prevPending.patch, ...patch } : patch,
    });
    const elapsed = performance.now() - lastCommitTimeRef.current;
    if (elapsed >= SLIDER_COMMIT_THROTTLE_MS) {
      flushPendingSliderCommits();
    } else if (commitTimerRef.current === null) {
      commitTimerRef.current = window.setTimeout(() => {
        commitTimerRef.current = null;
        flushPendingSliderCommits();
      }, SLIDER_COMMIT_THROTTLE_MS - elapsed);
    }
  };

  const handleGizmoTransformChange = useCallback(
    (patch: Partial<AttachmentTransform>) => {
      const { scope: curScope, activeItemId: curItem } = activeSelectionRef.current;
      applyDraftPatch(curScope, curItem, patch);
      onSetRef.current(curScope, curItem, patch);
    },
    [applyDraftPatch],
  );

  const handleCanvasInteract = useCallback(() => {
    setOpenMenu(null);
  }, []);

  const handleResetCurrentItem = () => {
    flushPendingSliderCommits();
    applyDraftPatch(activeEntity.id, activeItemId, { ...DEFAULT_ATTACHMENT_TRANSFORM });
    onResetAttachmentTransform(activeEntity.id, activeItemId);
  };

  const handleResetAllForScope = () => {
    flushPendingSliderCommits();
    onResetAllAttachmentTransforms(activeEntity.id);
  };

  const triggerCamera = (action: ViewportCameraAction) => {
    setAutoRotate(false);
    setCameraCommand({ seq: Date.now() + Math.random(), action });
    setOpenMenu(null);
  };

  const handleSave = () => {
    flushPendingSliderCommits();
    onSaveAttachmentTransforms();
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2200);
  };

  const exportPayloadText = useMemo(() => {
    return JSON.stringify(
      {
        selected: {
          entityId: activeEntity.id,
          entityLabel: activeEntity.label,
          itemId: activeItemId,
          transform: currentTransform,
        },
        allTransforms: draftTransforms,
      },
      null,
      2,
    );
  }, [activeEntity.id, activeEntity.label, activeItemId, currentTransform, draftTransforms]);

  const copyExportToClipboard = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(exportPayloadText);
        setCopiedNotice(true);
        window.setTimeout(() => setCopiedNotice(false), 2200);
      }
    } catch {
      // Clipboard may be blocked without focus; modal remains visible for manual copy
    }
  };

  const handleExportClick = () => {
    flushPendingSliderCommits();
    setOpenMenu(null);
    setExportOpen(true);
    void copyExportToClipboard();
  };

  const handleExportRootManifest = async () => {
    flushPendingSliderCommits();
    onSaveAttachmentTransforms();
    await downloadRootManifestJson(hud, { transforms: draftTransforms });
    setRootDownloadedNotice(true);
    window.setTimeout(() => setRootDownloadedNotice(false), 2600);
  };

  const toggleMenu = (id: OpenMenuId) => {
    setOpenMenu((prev) => (prev === id ? null : id));
  };

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-[#090d14] text-slate-100 select-none">
      {/* FULL-SCREEN 3D VIEWPORT WITH GIZMOS ON CHOSEN OBJECT */}
      <AttachmentStudioViewport
        entityId={activeEntity.id}
        isZombieEntity={isZombieEntity}
        pose={pose}
        selectedItem={selectedItem}
        zombieModelId={zombieModelId}
        armorFlags={armorFlags}
        transforms={draftTransforms}
        modelSignature={modelSignature}
        gizmoMode={gizmoMode}
        gizmoSpace={gizmoSpace}
        gizmoVisible={gizmoVisible}
        autoRotate={autoRotate}
        cameraCommand={cameraCommand}
        onCreatePreview={onCreatePreview}
        onGizmoTransformChange={handleGizmoTransformChange}
        onCanvasInteract={handleCanvasInteract}
        onLoadingChange={setLoadingPreview}
      />

      {loadingPreview && (
        <div className="pointer-events-none fixed inset-0 z-10 flex items-center justify-center bg-[#090d14]/55 text-xs font-medium text-amber-200">
          Cargando modelo 3D y gizmos...
        </div>
      )}

      {/* TOP FLOATING DROPDOWN TOOLBAR */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-30 flex flex-wrap items-start justify-between gap-2 p-2.5 sm:p-3.5">
        {/* Left Cluster: Collapsible Dropdown Buttons for Estudio, Modelo, Objeto, Pose/Zombie */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
          {/* 1. Estudio Menu Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleMenu('studio')}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-lg transition-colors cursor-pointer ${
                openMenu === 'studio'
                  ? 'border-amber-400 bg-amber-500/25 text-amber-100'
                  : 'border-white/16 bg-[#0c111a]/92 text-slate-100 hover:border-amber-400/60'
              }`}
            >
              <Wrench className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden sm:inline">Estudio</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {openMenu === 'studio' && (
              <div className="absolute left-0 top-full mt-1.5 w-52 rounded-xl border border-white/18 bg-[#0c111a]/96 p-1.5 shadow-2xl space-y-0.5">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Ir a otra sección
                </div>
                {STUDIO_NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setOpenMenu(null);
                        onSelectStudioTab(item.id);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs text-slate-200 hover:bg-white/10 hover:text-amber-200 cursor-pointer"
                    >
                      <Icon className="h-3.5 w-3.5 text-amber-400" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Dynamic Character Entity Dropdown (Ricardo, Chispa, Mateo, Zombis, Custom GLBs) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleMenu('scope')}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-lg transition-colors cursor-pointer ${
                openMenu === 'scope'
                  ? 'border-amber-400 bg-amber-500/25 text-amber-100'
                  : isZombieEntity
                    ? 'border-rose-400/50 bg-[#0c111a]/92 text-rose-100 hover:border-rose-400'
                    : activeEntity.kind === 'npc' || activeEntity.kind === 'custom'
                      ? 'border-emerald-400/50 bg-[#0c111a]/92 text-emerald-100 hover:border-emerald-400'
                      : 'border-amber-400/45 bg-[#0c111a]/92 text-amber-100 hover:border-amber-400'
              }`}
            >
              {isZombieEntity ? (
                <Skull className="h-3.5 w-3.5 text-rose-400 shrink-0" />
              ) : activeEntity.kind === 'npc' || activeEntity.kind === 'custom' ? (
                <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              ) : (
                <User className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              )}
              <span className="max-w-[130px] sm:max-w-[180px] truncate">{activeEntity.label}</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-70 shrink-0" />
            </button>

            {openMenu === 'scope' && (
              <div className="absolute left-0 top-full mt-1.5 w-68 sm:w-72 max-h-[calc(100dvh-120px)] overflow-y-auto rounded-xl border border-white/18 bg-[#0c111a]/96 p-1.5 shadow-2xl space-y-1">
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Personajes y Entidades ({characterCatalog.length})
                </div>
                {characterCatalog.map((entry) => {
                  const active = entry.id === activeEntity.id;
                  const isZ = entry.kind === 'zombie';
                  const isNpcOrCustom = entry.kind === 'npc' || entry.kind === 'custom';
                  return (
                    <button
                      key={entry.id}
                      type="button"
                      onClick={() => handleSelectEntity(entry.id)}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-medium cursor-pointer ${
                        active
                          ? isZ
                            ? 'bg-rose-500/25 text-rose-100 border border-rose-400/50'
                            : isNpcOrCustom
                              ? 'bg-emerald-500/25 text-emerald-100 border border-emerald-400/50'
                              : 'bg-amber-500/25 text-amber-100 border border-amber-400/50'
                          : 'text-slate-200 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isZ ? (
                          <Skull className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                        ) : isNpcOrCustom ? (
                          <Sparkles className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                        ) : (
                          <User className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="truncate">{entry.label}</div>
                          {entry.customGlbName && (
                            <div className="text-[10px] text-slate-400 truncate">
                              {entry.customGlbName}
                            </div>
                          )}
                        </div>
                      </div>
                      {active && (
                        <Check
                          className={`h-3.5 w-3.5 shrink-0 ${
                            isZ ? 'text-rose-300' : isNpcOrCustom ? 'text-emerald-300' : 'text-amber-300'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Attachable Object Dropdown (Botón desplegable de objetos) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleMenu('object')}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-lg transition-colors cursor-pointer ${
                openMenu === 'object'
                  ? 'border-amber-400 bg-amber-500/25 text-amber-100'
                  : 'border-white/16 bg-[#0c111a]/92 text-slate-100 hover:border-amber-400/60'
              }`}
            >
              <span className="text-slate-400 font-normal hidden md:inline">Objeto:</span>
              <span className="max-w-[140px] sm:max-w-[190px] truncate text-amber-200">
                {activeItemMeta?.label ?? activeItemId}
              </span>
              {isAttachmentTransformModified(currentTransform) && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
              )}
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            </button>

            {openMenu === 'object' && (
              <div className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 max-h-[calc(100dvh-120px)] overflow-y-auto rounded-xl border border-white/18 bg-[#0c111a]/96 p-2.5 shadow-2xl space-y-2.5">
                {!isZombieEntity ? (
                  PLAYER_CATEGORIES.map((cat) => {
                    const itemsInCat = PLAYER_ATTACHABLE_DEFS.filter(
                      (d) => d.category === cat && activeEntity.supportedItems.includes(d.id),
                    );
                    if (itemsInCat.length === 0) return null;
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          {cat}
                        </div>
                        <div className="grid grid-cols-2 gap-1">
                          {itemsInCat.map((def) => {
                            const active = selectedItem === def.id;
                            const mod = isAttachmentTransformModified(
                              getTransformForEntity(draftTransforms, activeEntity.id, def.id),
                            );
                            return (
                              <button
                                key={def.id}
                                type="button"
                                onClick={() => handleSelectItem(def.id)}
                                className={`flex items-center justify-between gap-1 rounded-lg border px-2 py-1.5 text-left text-[11px] font-medium transition-colors cursor-pointer ${
                                  active
                                    ? 'border-amber-400 bg-amber-500/25 text-amber-100'
                                    : mod
                                      ? 'border-emerald-400/40 bg-emerald-500/12 text-emerald-200 hover:border-amber-400/50'
                                      : 'border-white/10 bg-slate-900/75 text-slate-200 hover:border-white/25'
                                }`}
                              >
                                <span className="truncate">{def.label}</span>
                                {mod && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="space-y-1">
                    <div className="px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Objetos de Zombie
                    </div>
                    {ZOMBIE_ATTACHABLE_DEFS.filter((d) =>
                      activeEntity.supportedItems.includes(d.id),
                    ).map((def) => {
                      const active = selectedItem === def.id;
                      const mod = isAttachmentTransformModified(
                        getTransformForEntity(draftTransforms, activeEntity.id, def.id),
                      );
                      return (
                        <button
                          key={def.id}
                          type="button"
                          onClick={() => handleSelectItem(def.id)}
                          className={`flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-colors cursor-pointer ${
                            active
                              ? 'border-rose-400 bg-rose-500/25 text-rose-100'
                              : mod
                                ? 'border-emerald-400/40 bg-emerald-500/12 text-emerald-200 hover:border-rose-400/50'
                                : 'border-white/10 bg-slate-900/75 text-slate-200 hover:border-white/25'
                          }`}
                        >
                          <span>{def.label}</span>
                          {mod && (
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. Pose & Armor Dropdown (Humanoid entities) OR Zombie Variant Dropdown (Zombie Preset Group) */}
          {(!isZombieEntity || activeEntity.isZombiePresetGroup) && (
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleMenu('pose')}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-lg transition-colors cursor-pointer ${
                  openMenu === 'pose'
                    ? 'border-amber-400 bg-amber-500/25 text-amber-100'
                    : 'border-white/16 bg-[#0c111a]/92 text-slate-100 hover:border-amber-400/60'
                }`}
              >
                <span className="text-slate-400 font-normal hidden md:inline">
                  {!isZombieEntity ? 'Pose:' : 'Variante:'}
                </span>
                <span className="max-w-[130px] sm:max-w-[175px] truncate">
                  {!isZombieEntity ? activePoseMeta.shortLabel : activeZombieMeta?.label}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              </button>

              {openMenu === 'pose' && (
                <div className="absolute left-0 top-full mt-1.5 w-72 max-h-[calc(100dvh-120px)] overflow-y-auto rounded-xl border border-white/18 bg-[#0c111a]/96 p-2.5 shadow-2xl space-y-2.5">
                  {!isZombieEntity ? (
                    <>
                      <div className="space-y-1">
                        <div className="px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Poses de Referencia (De Pie)
                        </div>
                        {POSE_OPTIONS.map((p) => {
                          const active = pose === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setPose(p.id);
                                setOpenMenu(null);
                              }}
                              className={`flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors cursor-pointer ${
                                active
                                  ? 'border-amber-400/75 bg-amber-500/22 text-amber-100'
                                  : 'border-white/10 bg-slate-900/70 text-slate-200 hover:border-white/25'
                              }`}
                            >
                              <div>
                                <div className="text-xs font-semibold">{p.label}</div>
                                <div className="text-[10px] text-slate-400">{p.hint}</div>
                              </div>
                              {active && <Check className="h-3.5 w-3.5 text-amber-300 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>

                      <div className="space-y-1.5 border-t border-white/10 pt-2">
                        <div className="px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                          Equipo Visible Simultáneo
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setArmorFlags((f) => ({ ...f, helmet: !f.helmet }))}
                            className={`flex items-center justify-center gap-1 rounded-lg border py-1.5 text-[11px] font-medium cursor-pointer ${
                              armorFlags.helmet
                                ? 'border-amber-400/60 bg-amber-500/20 text-amber-200'
                                : 'border-white/10 bg-slate-900 text-slate-400'
                            }`}
                          >
                            <HardHat className="h-3.5 w-3.5" />
                            <span>Casco</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setArmorFlags((f) => ({ ...f, vest: !f.vest }))}
                            className={`flex items-center justify-center gap-1 rounded-lg border py-1.5 text-[11px] font-medium cursor-pointer ${
                              armorFlags.vest
                                ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                                : 'border-white/10 bg-slate-900 text-slate-400'
                            }`}
                          >
                            <Shield className="h-3.5 w-3.5" />
                            <span>Chaleco</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setArmorFlags((f) => ({ ...f, backpack: !f.backpack }))}
                            className={`flex items-center justify-center gap-1 rounded-lg border py-1.5 text-[11px] font-medium cursor-pointer ${
                              armorFlags.backpack
                                ? 'border-sky-400/60 bg-sky-500/20 text-sky-200'
                                : 'border-white/10 bg-slate-900 text-slate-400'
                            }`}
                          >
                            <Backpack className="h-3.5 w-3.5" />
                            <span>Mochila</span>
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-1">
                      <div className="px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Modelo de Zombie a Inspeccionar
                      </div>
                      {zombieModelOptions.map((opt) => {
                        const active = zombieModelId === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setZombieModelId(opt.id);
                              setOpenMenu(null);
                            }}
                            className={`flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-medium cursor-pointer ${
                              active
                                ? 'border-rose-400 bg-rose-500/25 text-rose-100'
                                : 'border-white/10 bg-slate-900/75 text-slate-200 hover:border-white/25'
                            }`}
                          >
                            <span className="truncate">{opt.label}</span>
                            {active && <Check className="h-3.5 w-3.5 text-rose-300 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Cluster: Camera Dropdown, Fine-Tune Sliders Dropdown, Save, Export, Close */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
          {/* 5. Camera 360° Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggleMenu('camera')}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-lg transition-colors cursor-pointer ${
                openMenu === 'camera'
                  ? 'border-sky-400 bg-sky-500/25 text-sky-100'
                  : 'border-white/16 bg-[#0c111a]/92 text-slate-100 hover:border-sky-400/60'
              }`}
            >
              <Camera className="h-3.5 w-3.5 text-sky-400" />
              <span className="hidden md:inline">Cámara 360°</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {openMenu === 'camera' && (
              <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-white/18 bg-[#0c111a]/96 p-2 shadow-2xl space-y-1.5">
                <div className="px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Ángulos 360°
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <button
                    type="button"
                    onClick={() => triggerCamera('front')}
                    className="rounded-lg border border-white/12 bg-slate-900/85 hover:border-amber-400/60 px-2 py-1.5 text-xs text-slate-200 cursor-pointer"
                  >
                    Frente
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerCamera('back')}
                    className="rounded-lg border border-white/12 bg-slate-900/85 hover:border-amber-400/60 px-2 py-1.5 text-xs text-slate-200 cursor-pointer"
                  >
                    Espalda
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerCamera('right')}
                    className="rounded-lg border border-white/12 bg-slate-900/85 hover:border-amber-400/60 px-2 py-1.5 text-xs text-slate-200 cursor-pointer"
                  >
                    Derecha
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerCamera('left')}
                    className="rounded-lg border border-white/12 bg-slate-900/85 hover:border-amber-400/60 px-2 py-1.5 text-xs text-slate-200 cursor-pointer"
                  >
                    Izquierda
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => triggerCamera('focus_object')}
                  className="flex w-full items-center gap-2 rounded-lg border border-sky-400/40 bg-sky-500/15 hover:bg-sky-500/25 px-2.5 py-1.5 text-xs font-medium text-sky-200 cursor-pointer"
                >
                  <Crosshair className="h-3.5 w-3.5" />
                  <span>Enfocar Objeto Elegido</span>
                </button>

                <button
                  type="button"
                  onClick={() => triggerCamera('reset_view')}
                  className="flex w-full items-center gap-2 rounded-lg border border-white/12 bg-slate-900/85 hover:border-white/30 px-2.5 py-1.5 text-xs text-slate-200 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Vista Completa</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAutoRotate((prev) => !prev);
                    setOpenMenu(null);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium cursor-pointer ${
                    autoRotate
                      ? 'border-amber-400/70 bg-amber-500/25 text-amber-100'
                      : 'border-white/12 bg-slate-900/85 text-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <RotateCw className="h-3.5 w-3.5" />
                    Auto-rotar 360°
                  </span>
                  <span>{autoRotate ? 'ON' : 'OFF'}</span>
                </button>
              </div>
            )}
          </div>

          {/* 6. Precision Sliders Dropdown Button (Ajuste Fino X/Y/Z) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setOpenMenu(null);
                setFineTuneOpen((v) => !v);
              }}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold shadow-lg transition-colors cursor-pointer ${
                fineTuneOpen
                  ? 'border-amber-400 bg-amber-500/25 text-amber-100'
                  : 'border-white/16 bg-[#0c111a]/92 text-slate-100 hover:border-amber-400/60'
              }`}
            >
              <Sliders className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden sm:inline">Ajuste Fino</span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-slate-400 transition-transform ${
                  fineTuneOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {fineTuneOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-[310px] sm:w-[336px] max-h-[calc(100dvh-130px)] overflow-y-auto rounded-xl border border-white/18 bg-[#0c111a]/96 p-3 shadow-2xl space-y-2.5">
                <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-amber-200 truncate">
                      {activeItemMeta?.label ?? activeItemId}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Sincronizado con el gizmo 3D del objeto
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFineTuneOpen(false)}
                    aria-label="Ocultar ajuste fino"
                    className="rounded border border-white/12 bg-slate-900 p-1 text-slate-300 hover:text-white cursor-pointer shrink-0"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Position */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-200">
                      <Move className="h-3.5 w-3.5" />
                      <span>Posición (X, Y, Z)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => patchTransform({ posX: 0, posY: 0, posZ: 0 })}
                      className="text-[10px] text-slate-400 hover:text-amber-200 cursor-pointer"
                    >
                      Centrar
                    </button>
                  </div>
                  <AxisSliderRow
                    label="Pos X"
                    value={currentTransform.posX}
                    min={-0.8}
                    max={0.8}
                    step={0.005}
                    unit="m"
                    decimals={3}
                    onChange={(posX) => patchTransform({ posX })}
                  />
                  <AxisSliderRow
                    label="Pos Y"
                    value={currentTransform.posY}
                    min={-0.8}
                    max={0.8}
                    step={0.005}
                    unit="m"
                    decimals={3}
                    onChange={(posY) => patchTransform({ posY })}
                  />
                  <AxisSliderRow
                    label="Pos Z"
                    value={currentTransform.posZ}
                    min={-0.8}
                    max={0.8}
                    step={0.005}
                    unit="m"
                    decimals={3}
                    onChange={(posZ) => patchTransform({ posZ })}
                  />
                </div>

                {/* Rotation */}
                <div className="space-y-1 border-t border-white/8 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-sky-200">
                      <RotateCw className="h-3.5 w-3.5" />
                      <span>Rotación (Grados X, Y, Z)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => patchTransform({ rotX: 0, rotY: 0, rotZ: 0 })}
                      className="text-[10px] text-slate-400 hover:text-sky-200 cursor-pointer"
                    >
                      Reiniciar
                    </button>
                  </div>
                  <AxisSliderRow
                    label="Rot X"
                    value={currentTransform.rotX}
                    min={-180}
                    max={180}
                    step={1}
                    unit="°"
                    decimals={0}
                    accentClass="accent-sky-400"
                    onChange={(rotX) => patchTransform({ rotX })}
                  />
                  <AxisSliderRow
                    label="Rot Y"
                    value={currentTransform.rotY}
                    min={-180}
                    max={180}
                    step={1}
                    unit="°"
                    decimals={0}
                    accentClass="accent-sky-400"
                    onChange={(rotY) => patchTransform({ rotY })}
                  />
                  <AxisSliderRow
                    label="Rot Z"
                    value={currentTransform.rotZ}
                    min={-180}
                    max={180}
                    step={1}
                    unit="°"
                    decimals={0}
                    accentClass="accent-sky-400"
                    onChange={(rotZ) => patchTransform({ rotZ })}
                  />
                </div>

                {/* Scale */}
                <div className="space-y-1 border-t border-white/8 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-200">
                      <Maximize2 className="h-3.5 w-3.5" />
                      <span>Escala</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setShowPerAxisScale((v) => !v)}
                        className="text-[10px] text-emerald-300 hover:text-emerald-200 cursor-pointer"
                      >
                        {showPerAxisScale ? 'Ocultar X/Y/Z' : 'Ejes X/Y/Z'}
                      </button>
                      <button
                        type="button"
                        onClick={() => patchTransform({ scale: 1, scaleX: 1, scaleY: 1, scaleZ: 1 })}
                        className="text-[10px] text-slate-400 hover:text-emerald-200 cursor-pointer"
                      >
                        1.0x
                      </button>
                    </div>
                  </div>
                  <AxisSliderRow
                    label="General"
                    value={currentTransform.scale}
                    min={0.2}
                    max={3.0}
                    step={0.02}
                    unit="x"
                    decimals={2}
                    accentClass="accent-emerald-400"
                    onChange={(scale) => patchTransform({ scale })}
                  />

                  {showPerAxisScale && (
                    <div className="space-y-1 pt-1">
                      <AxisSliderRow
                        label="Esc X"
                        value={currentTransform.scaleX}
                        min={0.2}
                        max={3.0}
                        step={0.02}
                        unit="x"
                        decimals={2}
                        accentClass="accent-emerald-400"
                        onChange={(scaleX) => patchTransform({ scaleX })}
                      />
                      <AxisSliderRow
                        label="Esc Y"
                        value={currentTransform.scaleY}
                        min={0.2}
                        max={3.0}
                        step={0.02}
                        unit="x"
                        decimals={2}
                        accentClass="accent-emerald-400"
                        onChange={(scaleY) => patchTransform({ scaleY })}
                      />
                      <AxisSliderRow
                        label="Esc Z"
                        value={currentTransform.scaleZ}
                        min={0.2}
                        max={3.0}
                        step={0.02}
                        unit="x"
                        decimals={2}
                        accentClass="accent-emerald-400"
                        onChange={(scaleZ) => patchTransform({ scaleZ })}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-2">
                  <button
                    type="button"
                    onClick={handleResetCurrentItem}
                    className="flex items-center gap-1 rounded-lg border border-white/15 bg-slate-900 px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:border-amber-400/50 hover:text-amber-200 cursor-pointer"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Restablecer objeto</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetAllForScope}
                    className="rounded-lg border border-rose-500/35 bg-rose-950/40 px-2.5 py-1 text-[11px] font-medium text-rose-200 hover:bg-rose-900/50 cursor-pointer"
                  >
                    Restablecer todo
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-400/65 bg-emerald-600/35 hover:bg-emerald-500/45 px-2.5 py-1.5 text-xs font-semibold text-emerald-100 shadow-lg transition-colors cursor-pointer"
          >
            {savedNotice ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
            <span>{savedNotice ? '¡Guardado!' : 'Guardar'}</span>
          </button>

          {/* Export Root Manifest JSON Button */}
          <button
            type="button"
            onClick={() => void handleExportRootManifest()}
            title="Descargar models_manifest.json actualizado para subir a GitHub"
            className="flex items-center gap-1.5 rounded-lg border border-amber-400/60 bg-amber-500/20 hover:bg-amber-500/35 px-2.5 py-1.5 text-xs font-semibold text-amber-100 shadow-lg transition-colors cursor-pointer"
          >
            {rootDownloadedNotice ? (
              <Check className="h-3.5 w-3.5 text-emerald-300" />
            ) : (
              <Download className="h-3.5 w-3.5 text-amber-300" />
            )}
            <span>
              {rootDownloadedNotice
                ? '¡models_manifest.json descargado!'
                : 'Exportar Configuración Raíz (JSON)'}
            </span>
          </button>

          {/* Export Button */}
          <button
            type="button"
            onClick={handleExportClick}
            title="Ver y copiar coordenadas JSON"
            className="flex items-center gap-1.5 rounded-lg border border-sky-400/55 bg-sky-600/30 hover:bg-sky-500/40 px-2.5 py-1.5 text-xs font-semibold text-sky-100 shadow-lg transition-colors cursor-pointer"
          >
            <Code2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ver JSON</span>
          </button>

          {/* Close Fullscreen Editor */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar editor 360°"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/18 bg-[#0c111a]/92 text-slate-200 hover:border-amber-400/60 hover:text-amber-200 shadow-lg cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* BOTTOM FLOATING GIZMO MODE BAR (Controls the 3D gizmo directly on the chosen object) */}
      <div className="pointer-events-none fixed inset-x-0 bottom-3 z-20 flex flex-col items-center gap-1.5 px-3">
        <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1 rounded-xl border border-white/18 bg-[#0c111a]/94 px-2 py-1.5 shadow-2xl">
          <button
            type="button"
            onClick={() => {
              setGizmoVisible(true);
              setGizmoMode('translate');
            }}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
              gizmoVisible && gizmoMode === 'translate'
                ? 'border-amber-400 bg-amber-500/25 text-amber-100'
                : 'border-transparent text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Move className="h-3.5 w-3.5" />
            <span>Mover</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setGizmoVisible(true);
              setGizmoMode('rotate');
            }}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
              gizmoVisible && gizmoMode === 'rotate'
                ? 'border-sky-400 bg-sky-500/25 text-sky-100'
                : 'border-transparent text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <RotateCw className="h-3.5 w-3.5" />
            <span>Rotar</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setGizmoVisible(true);
              setGizmoMode('scale');
            }}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
              gizmoVisible && gizmoMode === 'scale'
                ? 'border-emerald-400 bg-emerald-500/25 text-emerald-100'
                : 'border-transparent text-slate-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span>Escalar</span>
          </button>

          <span className="mx-0.5 h-5 w-px bg-white/15" />

          <button
            type="button"
            onClick={() => setGizmoSpace((s) => (s === 'local' ? 'world' : 'local'))}
            title="Alternar ejes locales del objeto o globales del mundo"
            className="rounded-lg border border-white/12 bg-slate-900/90 hover:border-white/30 px-2 py-1 text-[11px] font-medium text-slate-200 cursor-pointer"
          >
            Ejes: {gizmoSpace === 'local' ? 'Local' : 'Mundo'}
          </button>

          <button
            type="button"
            onClick={() => triggerCamera('focus_object')}
            title="Acercar cámara al objeto elegido"
            className="flex items-center gap-1 rounded-lg border border-sky-400/35 bg-sky-500/15 hover:bg-sky-500/25 px-2 py-1 text-[11px] font-medium text-sky-200 cursor-pointer"
          >
            <Crosshair className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Enfocar</span>
          </button>

          <button
            type="button"
            onClick={() => setGizmoVisible((v) => !v)}
            title={gizmoVisible ? 'Ocultar gizmo 3D' : 'Mostrar gizmo 3D'}
            className="flex items-center gap-1 rounded-lg border border-white/12 bg-slate-900/90 hover:border-white/30 px-2 py-1 text-[11px] font-medium text-slate-200 cursor-pointer"
          >
            {gizmoVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>

          <button
            type="button"
            onClick={handleResetCurrentItem}
            title="Restablecer este objeto"
            className="flex items-center gap-1 rounded-lg border border-white/12 bg-slate-900/90 hover:border-rose-400/50 hover:text-rose-200 px-2 py-1 text-[11px] font-medium text-slate-300 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Live compact telemetry readout */}
        <div className="rounded-full border border-white/10 bg-[#0c111a]/82 px-3 py-0.5 font-mono-tabular text-[10px] text-slate-300">
          {activeItemMeta?.label ?? activeItemId} · Pos ({currentTransform.posX.toFixed(2)},{' '}
          {currentTransform.posY.toFixed(2)}, {currentTransform.posZ.toFixed(2)}) · Rot (
          {Math.round(currentTransform.rotX)}°, {Math.round(currentTransform.rotY)}°,{' '}
          {Math.round(currentTransform.rotZ)}°) · Esc {currentTransform.scale.toFixed(2)}x
        </div>
      </div>

      {/* Export Overlay Modal */}
      {exportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-sky-400/45 bg-[#080d16] p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-sky-200">
                Coordenadas Exportadas (Posición, Rotación y Escala)
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleExportRootManifest()}
                  className="flex items-center gap-1 rounded border border-amber-400/55 bg-amber-500/20 px-2.5 py-1 text-[11px] font-medium text-amber-100 hover:bg-amber-500/30 cursor-pointer"
                >
                  {rootDownloadedNotice ? <Check className="h-3 w-3" /> : <Download className="h-3 w-3" />}
                  <span>
                    {rootDownloadedNotice
                      ? '¡Descargado!'
                      : 'Exportar Configuración Raíz (JSON)'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => void copyExportToClipboard()}
                  className="flex items-center gap-1 rounded border border-sky-400/50 bg-sky-500/20 px-2.5 py-1 text-[11px] font-medium text-sky-100 hover:bg-sky-500/30 cursor-pointer"
                >
                  {copiedNotice ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{copiedNotice ? 'Copiado' : 'Copiar JSON'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setExportOpen(false)}
                  aria-label="Cerrar exportación"
                  className="rounded border border-white/12 bg-slate-900 p-1 text-slate-300 hover:text-white cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <textarea
              readOnly
              value={exportPayloadText}
              rows={12}
              className="w-full rounded-lg border border-white/10 bg-[#05080d] p-2.5 font-mono-tabular text-[11px] text-slate-200 focus:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
};
