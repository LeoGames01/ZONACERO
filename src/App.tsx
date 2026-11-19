import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import { StudioModal, type StudioTab } from './components/StudioModal';
import { StudioPinModal } from './components/StudioPinModal';
import { SurvivalGameEngine, type StudioPreviewSubject } from './game/engine';
import {
  COLON_ENTRANCE_X,
  COLON_ENTRANCE_Z,
  PLAYER_SPAWN_X,
  PLAYER_SPAWN_Z,
} from './game/models';
import {
  cargarStudioPinLocal,
  cargarTouchLayoutLocal,
  type CustomNpcTargetId,
  guardarAttachmentTransformsLocal,
  guardarStudioPinLocal,
  guardarTouchLayoutLocal,
} from './game/modelCache';
import {
  cloneTouchLayout,
  createDefaultAttachmentTransforms,
  DEFAULT_CAMERA_SETTINGS,
  DEFAULT_MAP_SETTINGS,
  DEFAULT_POST_PROCESS,
  DEFAULT_TOUCH_LAYOUT,
} from './game/settingsDefaults';
import { getRemoteManifestUrl } from './game/remoteAssets';
import type {
  AttachmentTargetScope,
  AttachmentTransform,
  BaseCraftRecipeId,
  CameraPresetId,
  CameraSettings,
  CustomEquipmentId,
  DifficultyId,
  EquippedThrowableKind,
  FastTravelDestinationId,
  HudSnapshot,
  MapMaterialSettings,
  PlacedWorldProp,
  PostProcessPreset,
  PostProcessSettings,
  RemoteManifestSyncInfo,
  TextureTargetId,
  ThrowableKind,
  TouchLayoutConfig,
  VehicleModuleId,
  WeaponKind,
  WorldObjectOverrideId,
  WorldPropCategory,
  ZombieAttachableId,
  ZombieTargetKind,
} from './game/types';

const INITIAL_HUD: HudSnapshot = {
  gameState: 'TITLE_MENU',
  hp: 100,
  maxHp: 100,
  stamina: 100,
  maxStamina: 100,
  weapon: 'unarmed',
  unlockedWeapons: {
    stick: false,
    baton: false,
    bow: false,
    pistol: false,
    rifle: false,
  },
  helmetArmor: 0,
  helmetMaxArmor: 80,
  vestArmor: 0,
  vestMaxArmor: 120,
  stance: 'idle',
  isAiming: false,
  isFiring: false,
  isMoving: false,
  isReloading: false,
  crosshairSpread: 0.24,
  bowDrawProgress: 0,
  stealthActive: false,
  stealthInGrass: false,
  stealthState: 'hidden',
  stealthNoiseLevel: 0,
  arrows: 0,
  pistolAmmo: 0,
  pistolMaxAmmo: 8,
  pistolReserveAmmo: 0,
  rifleAmmo: 0,
  rifleMaxAmmo: 20,
  rifleReserveAmmo: 0,
  bandages: 1,
  food: 1,
  flareCharge: 45,
  wood: 0,
  hasBackpack: false,
  inventory: Array(8).fill(null),
  selectedInventorySlot: 0,
  molotovCount: 0,
  nailBombCount: 0,
  distractionCounts: { bottle: 1, can: 1, brick: 1, decoy_rat: 0 },
  totalDistractions: 3,
  activeDistractionKind: 'bottle',
  molotovLit: false,
  nailBombLit: false,
  equippedThrowable: null,
  aimingThrowable: null,
  inventoryNotice: null,
  ratCount: 0,
  chapitasCount: 0,
  nearTrashSpot: false,
  activeDecoyRats: 0,
  backpackPos: null,
  score: 0,
  bestScore: 0,
  combo: 1,
  survivalTime: 0,
  enemiesRemaining: 0,
  alertedZombies: 0,
  kills: 0,
  nearCampfire: true,
  activeZone: 'exterior_9_julio',
  currentFloor: 0,
  allyRescued: false,
  baseUnlocked: false,
  nearWorkbench: false,
  nearExteriorExit: false,
  nearColonEntrance: false,
  provisions: { chemicals: 0, scrap: 0, powder: 0 },
  allyPos: null,
  mission2Unlocked: false,
  mission3Unlocked: false,
  mechanicRescued: false,
  mechanicPos: null,
  mechanicHp: 100,
  mechanicMaxHp: 100,
  mechanicLimping: false,
  nearMechanicHelp: false,
  nearVehicleBay: false,
  vehicleBayUnlocked: false,
  vehicleState: {
    engine: false,
    tires: false,
    armor: false,
    fuel: false,
  },
  pointerLocked: false,
  playerPos: { x: PLAYER_SPAWN_X, z: PLAYER_SPAWN_Z },
  playerYaw: Math.PI,
  camYaw: 0,
  radarEntities: [],
  difficulty: 'warden',
  muted: false,
  hurtFlash: 0,
  damageSeq: 0,
  lastDamage: 0,
  timeOfDay: DEFAULT_MAP_SETTINGS.timeOfDay,
  isDaytime: true,
  clockLabel: '08:38',
  fogLevel: 0.0172,
  editorMode: false,
  activePlacementSlotId: null,
  selectedPropId: null,
  propSlots: [],
  placedProps: [],
  mapSettings: { ...DEFAULT_MAP_SETTINGS },
  postProcess: { ...DEFAULT_POST_PROCESS },
  cameraSettings: { ...DEFAULT_CAMERA_SETTINGS },
  customModelName: null,
  customZombieName: null,
  customZombieSlots: [],
  customNpcNames: { ally_chispa: null, npc_mateo: null },
  customCharacterSlots: [],
  characterCatalog: [],
  customRifleName: null,
  customPistolName: null,
  customEquipmentNames: {},
  objectOverrides: {},
  attachmentTransforms: createDefaultAttachmentTransforms(),
  remoteManifest: {
    url: getRemoteManifestUrl(),
    version: null,
    lastSyncedAt: null,
    status: 'idle',
    downloadedAssets: 0,
    declaredAssets: 0,
    appliedAssets: 0,
    failedAssets: [],
    errorMessage: null,
  },
  modelError: null,
  introCutsceneProgress: 0,
  introCutsceneCaption: null,
  mission: {
    missionNumber: 1,
    missionTitle: 'Refugio en el Colón',
    subtitle: 'Buenos Aires, 2050 · Av. 9 de Julio',
    phase: 'clear_plaza_wave',
    objectiveText: 'Eliminar zombies: 0/15',
    detailText: 'Oleada 1/2 · Jaurías en Plaza de la República (0/7)',
    killsCurrent: 0,
    killsTarget: 15,
    totalMissionKills: 0,
    totalMissionTarget: 15,
    waveIndex: 1,
    totalWaves: 2,
    colonUnlocked: false,
    colonPos: { x: COLON_ENTRANCE_X, z: COLON_ENTRANCE_Z },
    distanceToColon: 54,
    radioSpeaker: null,
    radioMessage: null,
  },
  tutorial: {
    active: false,
    stepIndex: 0,
    totalSteps: 6,
    stepId: 'move_crouch',
    title: '',
    instruction: '',
    hint: '',
    progressText: '',
    completed: false,
  },
};

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<SurvivalGameEngine | null>(null);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioTab, setStudioTab] = useState<StudioTab>('models');
  const [studioPin, setStudioPin] = useState<string>(() => cargarStudioPinLocal());
  const [studioPinOpen, setStudioPinOpen] = useState(false);
  const [pendingStudioTab, setPendingStudioTab] = useState<StudioTab>('models');
  const [touchLayout, setTouchLayout] = useState<TouchLayoutConfig>(() => cargarTouchLayoutLocal());
  const [mobileControlsEnabled, setMobileControlsEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia?.('(pointer: coarse)')?.matches ||
      navigator.maxTouchPoints > 0 ||
      window.innerWidth < 1024
    );
  });

  const hudMetaRef = useRef({
    gameState: hud.gameState,
    editorMode: hud.editorMode,
  });
  hudMetaRef.current.gameState = hud.gameState;
  hudMetaRef.current.editorMode = hud.editorMode;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const engine = new SurvivalGameEngine(container, (snapshot) => {
      setHud(snapshot);
    });
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const handleOpenStudio = useCallback((tab: StudioTab = 'models') => {
    if (typeof document !== 'undefined' && document.pointerLockElement) {
      document.exitPointerLock();
    }
    if (hudMetaRef.current.gameState === 'PLAYING' && !hudMetaRef.current.editorMode) {
      engineRef.current?.pauseGame();
    }
    if (hudMetaRef.current.editorMode) {
      setStudioTab(tab);
      setStudioOpen(true);
      return;
    }
    setPendingStudioTab(tab);
    setStudioPinOpen(true);
  }, []);

  const handleCloseStudio = useCallback(() => {
    setStudioOpen(false);
  }, []);

  const handleCloseStudioPin = useCallback(() => {
    setStudioPinOpen(false);
  }, []);

  const handleVerifyStudioPin = useCallback(
    (enteredPin: string): boolean => {
      if (enteredPin !== studioPin) return false;
      setStudioPinOpen(false);
      setStudioTab(pendingStudioTab);
      setStudioOpen(true);
      return true;
    },
    [pendingStudioTab, studioPin],
  );

  const handleUpdateStudioPin = useCallback((newPin: string): boolean => {
    if (!guardarStudioPinLocal(newPin)) return false;
    setStudioPin(newPin.trim());
    return true;
  }, []);

  const handleToggleMobileControls = useCallback(() => {
    setMobileControlsEnabled((prev) => !prev);
  }, []);

  const handleUpdateTouchLayout = useCallback((next: TouchLayoutConfig) => {
    const cloned = cloneTouchLayout(next);
    setTouchLayout(cloned);
    guardarTouchLayoutLocal(cloned);
  }, []);

  const handleResetTouchLayout = useCallback(() => {
    const reset = cloneTouchLayout(DEFAULT_TOUCH_LAYOUT);
    setTouchLayout(reset);
    guardarTouchLayoutLocal(reset);
  }, []);

  const handleOpenMapEditorWithSlot = useCallback((slotId: string | null) => {
    setStudioOpen(false);
    engineRef.current?.setActivePlacementSlot(slotId);
    engineRef.current?.setEditorMode(true);
  }, []);

  const handleStart = useCallback(() => {
    setStudioPinOpen(false);
    setStudioOpen(false);
    engineRef.current?.startNewRun();
  }, []);

  const handleStartTutorial = useCallback(() => {
    setStudioPinOpen(false);
    setStudioOpen(false);
    engineRef.current?.startTutorialMode();
  }, []);

  const handleAdvanceTutorialStep = useCallback(() => {
    engineRef.current?.advanceTutorialStep();
  }, []);

  const handleResume = useCallback(() => {
    setStudioPinOpen(false);
    setStudioOpen(false);
    engineRef.current?.resumeGame();
  }, []);

  const handlePause = useCallback(() => {
    engineRef.current?.pauseGame();
  }, []);

  const handleReturnToTitle = useCallback(() => {
    setStudioPinOpen(false);
    setStudioOpen(false);
    engineRef.current?.returnToTitle();
  }, []);

  const handleSelectDifficulty = useCallback((diff: DifficultyId) => {
    engineRef.current?.setDifficulty(diff);
  }, []);

  const handleToggleMute = useCallback(() => {
    engineRef.current?.toggleMute();
  }, []);

  const handleMobileMove = useCallback((x: number, y: number, sprint?: boolean) => {
    engineRef.current?.setVirtualMove(x, y, sprint);
  }, []);

  const handleMobileCameraVelocity = useCallback((yawVel: number, pitchVel: number) => {
    engineRef.current?.setVirtualCameraVelocity(yawVel, pitchVel);
  }, []);

  const handleMobileRotateCamera = useCallback((dyaw: number, dpitch: number) => {
    engineRef.current?.rotateCameraBy(dyaw, dpitch);
  }, []);

  const handleMobileCenterCamera = useCallback(() => {
    engineRef.current?.centerCameraBehindPlayer();
  }, []);

  const handleMobileFireChange = useCallback((active: boolean) => {
    engineRef.current?.setVirtualFire(active);
  }, []);

  const handleMobileAimChange = useCallback((active: boolean) => {
    engineRef.current?.setVirtualAim(active);
  }, []);

  const handleMobileJump = useCallback(() => {
    engineRef.current?.triggerJump();
  }, []);

  const handleMobileToggleCrouch = useCallback(() => {
    engineRef.current?.toggleCrouch();
  }, []);

  const handleMobileReload = useCallback(() => {
    engineRef.current?.triggerReload();
  }, []);

  const handleBeginThrowable = useCallback((kind: ThrowableKind, slotIdx?: number) => {
    engineRef.current?.beginThrowableAction(kind, slotIdx);
  }, []);

  const handleReleaseThrowable = useCallback((kind?: ThrowableKind) => {
    engineRef.current?.releaseThrowableAction(kind);
  }, []);

  const handleSelectWeapon = useCallback((weapon: WeaponKind) => {
    engineRef.current?.switchWeapon(weapon);
  }, []);

  const handleEquipThrowable = useCallback((kind: EquippedThrowableKind) => {
    engineRef.current?.equipThrowable(kind);
  }, []);

  const handleCycleDistraction = useCallback(() => {
    engineRef.current?.cycleDistraction(true);
  }, []);

  const handleSearchTrash = useCallback(() => {
    engineRef.current?.searchTrashSpot();
  }, []);

  const handleCraftDecoyRat = useCallback(() => {
    engineRef.current?.craftDecoyRat(true);
  }, []);

  const handleUseBandage = useCallback(() => {
    engineRef.current?.useBandage();
  }, []);

  const handleUseFood = useCallback(() => {
    engineRef.current?.useFood();
  }, []);

  const handleUseInventorySlot = useCallback((index: number) => {
    engineRef.current?.useInventorySlot(index);
  }, []);

  const handleMoveInventorySlot = useCallback((fromIndex: number, toIndex: number) => {
    engineRef.current?.moveInventorySlot(fromIndex, toIndex);
  }, []);

  const handleDropInventorySlot = useCallback((index: number) => {
    engineRef.current?.dropInventorySlot(index);
  }, []);

  const handleSkipCutscene = useCallback(() => {
    engineRef.current?.skipIntroCutscene();
  }, []);

  const handleStartMission2 = useCallback(() => {
    setStudioOpen(false);
    engineRef.current?.startMission2(false);
  }, []);

  const handleContinueToMission2 = useCallback(() => {
    setStudioOpen(false);
    engineRef.current?.continueToMission2();
  }, []);

  const handleSkipAllyCutscene = useCallback(() => {
    engineRef.current?.skipAllyCutscene();
  }, []);

  const handleEnterColonBase = useCallback(() => {
    setStudioOpen(false);
    engineRef.current?.enterColonBase();
  }, []);

  const handleCraftAtBase = useCallback((recipeId: BaseCraftRecipeId) => {
    return (
      engineRef.current?.craftAtBase(recipeId) ?? {
        ok: false,
        message: 'Motor no inicializado.',
      }
    );
  }, []);

  const handleTravelToExterior = useCallback(() => {
    engineRef.current?.travelToExterior9Julio();
  }, []);

  const handleReturnToColonBase = useCallback(() => {
    engineRef.current?.returnToColonBase();
  }, []);

  const handleStartMission3 = useCallback(() => {
    setStudioOpen(false);
    engineRef.current?.startMission3(false);
  }, []);

  const handleContinueToMission3 = useCallback(() => {
    setStudioOpen(false);
    engineRef.current?.continueToMission3();
  }, []);

  const handleHelpMechanic = useCallback(() => {
    engineRef.current?.helpPinnedMechanic();
  }, []);

  const handleRepairVehicleModule = useCallback((moduleId: VehicleModuleId) => {
    return (
      engineRef.current?.repairVehicleModule(moduleId) ?? {
        ok: false,
        message: 'Motor no inicializado.',
      }
    );
  }, []);

  const handleFastTravelWithVehicle = useCallback((dest: FastTravelDestinationId) => {
    engineRef.current?.fastTravelWithVehicle(dest);
  }, []);

  const handleExitEditorMode = useCallback(() => {
    engineRef.current?.setEditorMode(false);
  }, []);

  const handleSelectPlacementSlot = useCallback((slotId: string | null) => {
    engineRef.current?.setActivePlacementSlot(slotId);
  }, []);

  const handleUploadPlayerGlb = useCallback((file: File) => {
    void engineRef.current?.loadCustomGlbFile(file);
  }, []);

  const handleResetPlayerGlb = useCallback(() => {
    void engineRef.current?.resetToDefaultCharacter();
  }, []);

  const handleUploadNpcGlb = useCallback((target: CustomNpcTargetId, file: File) => {
    void engineRef.current?.loadCustomNpcGlbFile(target, file);
  }, []);

  const handleResetNpcGlb = useCallback((target: CustomNpcTargetId) => {
    void engineRef.current?.resetCustomNpcGlb(target);
  }, []);

  const handleUploadCustomCharacters = useCallback((files: File[]) => {
    void engineRef.current?.loadCustomCharacterSlotFiles(files);
  }, []);

  const handleDeleteCustomCharacter = useCallback((slotId: string) => {
    void engineRef.current?.deleteCustomCharacterSlot(slotId);
  }, []);

  const handleUploadZombieGlbs = useCallback((files: File[]) => {
    void engineRef.current?.loadCustomZombieGlbFiles(files);
  }, []);

  const handleUpdateZombieSlotKind = useCallback(
    (slotId: string, targetKind: ZombieTargetKind) => {
      void engineRef.current?.setZombieSlotTargetKind(slotId, targetKind);
    },
    [],
  );

  const handleUpdateZombieSlotCount = useCallback((slotId: string, spawnCount: number) => {
    void engineRef.current?.setZombieSlotSpawnCount(slotId, spawnCount);
  }, []);

  const handleDeleteZombieSlot = useCallback((slotId: string) => {
    void engineRef.current?.deleteCustomZombieSlot(slotId);
  }, []);

  const handleResetZombieGlb = useCallback(() => {
    void engineRef.current?.resetToDefaultZombie();
  }, []);

  const handleUploadRifleGlb = useCallback((file: File) => {
    void engineRef.current?.loadCustomRifleGlbFile(file);
  }, []);

  const handleResetRifleGlb = useCallback(() => {
    void engineRef.current?.resetToDefaultRifle();
  }, []);

  const handleUploadPistolGlb = useCallback((file: File) => {
    void engineRef.current?.loadCustomPistolGlbFile(file);
  }, []);

  const handleResetPistolGlb = useCallback(() => {
    void engineRef.current?.resetToDefaultPistol();
  }, []);

  const handleUploadEquipmentGlb = useCallback((kind: CustomEquipmentId, file: File) => {
    void engineRef.current?.loadCustomEquipmentGlbFile(kind, file);
  }, []);

  const handleResetEquipmentGlb = useCallback((kind: CustomEquipmentId) => {
    void engineRef.current?.resetToDefaultEquipment(kind);
  }, []);

  const handleUploadObjectOverrideGlb = useCallback(
    (targetId: WorldObjectOverrideId, file: File) => {
      void engineRef.current?.loadObjectOverrideGlb(targetId, file);
    },
    [],
  );

  const handleResetObjectOverride = useCallback((targetId: WorldObjectOverrideId) => {
    void engineRef.current?.resetObjectOverride(targetId);
  }, []);

  const handleResetAllObjectOverrides = useCallback(() => {
    void engineRef.current?.resetAllObjectOverrides();
  }, []);

  const handleUploadWorldPropGlb = useCallback((category: WorldPropCategory, file: File) => {
    void engineRef.current?.uploadWorldPropGlb(category, file);
  }, []);

  const handleDeleteWorldPropSlot = useCallback((slotId: string) => {
    void engineRef.current?.deleteWorldPropSlot(slotId);
  }, []);

  const handlePlaceWorldPropNearPlayer = useCallback((slotId: string) => {
    engineRef.current?.placeWorldPropNearPlayer(slotId);
  }, []);

  const handleSelectPlacedProp = useCallback((instanceId: string | null) => {
    engineRef.current?.selectPlacedProp(instanceId);
  }, []);

  const handleUpdatePlacedProp = useCallback(
    (instanceId: string, patch: Partial<PlacedWorldProp>) => {
      engineRef.current?.updatePlacedProp(instanceId, patch);
    },
    [],
  );

  const handleDuplicatePlacedProp = useCallback((instanceId: string) => {
    engineRef.current?.duplicatePlacedProp(instanceId);
  }, []);

  const handleRemovePlacedProp = useCallback((instanceId: string) => {
    engineRef.current?.removePlacedProp(instanceId);
  }, []);

  const handleClearAllPlacedProps = useCallback(() => {
    engineRef.current?.clearAllPlacedProps();
  }, []);

  const handleUpdateMapSettings = useCallback((patch: Partial<MapMaterialSettings>) => {
    engineRef.current?.setMapSettings(patch);
  }, []);

  const handleUploadTexture = useCallback((target: TextureTargetId, file: File) => {
    void engineRef.current?.loadCustomTextureFile(target, file);
  }, []);

  const handleResetTexture = useCallback((target: TextureTargetId) => {
    void engineRef.current?.resetCustomTexture(target);
  }, []);

  const handleUpdatePostProcess = useCallback((patch: Partial<PostProcessSettings>) => {
    engineRef.current?.setPostProcessSettings(patch);
  }, []);

  const handleSelectPostProcessPreset = useCallback((preset: PostProcessPreset) => {
    engineRef.current?.applyPostProcessPreset(preset);
  }, []);

  const handleUpdateCameraSettings = useCallback((patch: Partial<CameraSettings>) => {
    engineRef.current?.setCameraSettings(patch);
  }, []);

  const handleSelectCameraPreset = useCallback((preset: CameraPresetId) => {
    engineRef.current?.applyCameraPreset(preset);
  }, []);

  const handleResetCameraSettings = useCallback(() => {
    engineRef.current?.resetCameraSettings();
  }, []);

  const handleSetCameraPreview = useCallback((active: boolean, aim = false) => {
    engineRef.current?.setCameraPreview(active, aim);
  }, []);

  const handleSetAttachmentTransform = useCallback(
    (scope: AttachmentTargetScope, itemId: string, patch: Partial<AttachmentTransform>) => {
      engineRef.current?.setAttachmentTransform(scope, itemId, patch);
    },
    [],
  );

  const handleResetAttachmentTransform = useCallback(
    (scope: AttachmentTargetScope, itemId: string) => {
      engineRef.current?.resetAttachmentTransform(scope, itemId);
    },
    [],
  );

  const handleResetAllAttachmentTransforms = useCallback((scope?: AttachmentTargetScope) => {
    engineRef.current?.resetAllAttachmentTransforms(scope);
  }, []);

  const handleSaveAttachmentTransforms = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.flushAttachmentTransformsPersistence();
    } else {
      guardarAttachmentTransformsLocal(hud.attachmentTransforms);
    }
  }, [hud.attachmentTransforms]);

  const handleSuspendMainRender = useCallback((suspended: boolean) => {
    engineRef.current?.setRenderSuspended(suspended);
  }, []);

  const handleCreateAttachmentPreview = useCallback(
    async (
      scope: AttachmentTargetScope,
      zombieModelId: string,
      selectedZombieItem: ZombieAttachableId,
    ): Promise<StudioPreviewSubject | null> => {
      if (!engineRef.current) return null;
      return engineRef.current.createStudioPreviewSubject(scope, zombieModelId, selectedZombieItem);
    },
    [],
  );

  const handleSyncRemoteAssets = useCallback(
    async (customUrl?: string): Promise<RemoteManifestSyncInfo | null> => {
      if (!engineRef.current) {
        const msg = 'El motor 3D aún no se ha inicializado. Intenta nuevamente en un momento.';
        return {
          url: customUrl ?? getRemoteManifestUrl(),
          version: null,
          lastSyncedAt: null,
          status: 'error',
          downloadedAssets: 0,
          declaredAssets: 0,
          appliedAssets: 0,
          failedAssets: [{ file: 'Motor 3D', reason: msg }],
          errorMessage: msg,
        };
      }
      return engineRef.current.syncRemoteAssetsNow(customUrl);
    },
    [],
  );

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#0b0e14]">
      <div ref={mountRef} className="absolute inset-0 h-full w-full" />

      <GameHud
        hud={hud}
        touchLayout={touchLayout}
        mobileControlsEnabled={mobileControlsEnabled}
        studioOpen={studioOpen}
        pinModalOpen={studioPinOpen}
        onToggleMobileControls={handleToggleMobileControls}
        onMobileMove={handleMobileMove}
        onMobileCameraVelocity={handleMobileCameraVelocity}
        onMobileRotateCamera={handleMobileRotateCamera}
        onMobileCenterCamera={handleMobileCenterCamera}
        onMobileFireChange={handleMobileFireChange}
        onMobileAimChange={handleMobileAimChange}
        onMobileJump={handleMobileJump}
        onMobileToggleCrouch={handleMobileToggleCrouch}
        onMobileReload={handleMobileReload}
        onBeginThrowable={handleBeginThrowable}
        onReleaseThrowable={handleReleaseThrowable}
        onSelectWeapon={handleSelectWeapon}
        onEquipThrowable={handleEquipThrowable}
        onCycleDistraction={handleCycleDistraction}
        onSearchTrash={handleSearchTrash}
        onCraftDecoyRat={handleCraftDecoyRat}
        onUseBandage={handleUseBandage}
        onUseFood={handleUseFood}
        onUseInventorySlot={handleUseInventorySlot}
        onMoveInventorySlot={handleMoveInventorySlot}
        onDropInventorySlot={handleDropInventorySlot}
        onStart={handleStart}
        onStartTutorial={handleStartTutorial}
        onAdvanceTutorialStep={handleAdvanceTutorialStep}
        onStartMission2={handleStartMission2}
        onContinueToMission2={handleContinueToMission2}
        onStartMission3={handleStartMission3}
        onContinueToMission3={handleContinueToMission3}
        onHelpMechanic={handleHelpMechanic}
        onRepairVehicleModule={handleRepairVehicleModule}
        onFastTravelWithVehicle={handleFastTravelWithVehicle}
        onSkipCutscene={handleSkipCutscene}
        onSkipAllyCutscene={handleSkipAllyCutscene}
        onEnterColonBase={handleEnterColonBase}
        onCraftAtBase={handleCraftAtBase}
        onTravelToExterior={handleTravelToExterior}
        onReturnToColonBase={handleReturnToColonBase}
        onResume={handleResume}
        onPause={handlePause}
        onReturnToTitle={handleReturnToTitle}
        onSelectDifficulty={handleSelectDifficulty}
        onToggleMute={handleToggleMute}
        onOpenStudio={handleOpenStudio}
        onExitEditorMode={handleExitEditorMode}
        onSelectPlacementSlot={handleSelectPlacementSlot}
        onPlacePropNearPlayer={handlePlaceWorldPropNearPlayer}
        onUpdatePlacedProp={handleUpdatePlacedProp}
        onDuplicatePlacedProp={handleDuplicatePlacedProp}
        onRemovePlacedProp={handleRemovePlacedProp}
        onClearAllPlacedProps={handleClearAllPlacedProps}
        onUpdateMapSettings={handleUpdateMapSettings}
        onUploadWorldPropGlb={handleUploadWorldPropGlb}
        onUploadTexture={handleUploadTexture}
      />

      {studioOpen && (
        <StudioModal
          open={studioOpen}
          initialTab={studioTab}
          hud={hud}
          touchLayout={touchLayout}
          onClose={handleCloseStudio}
          onUploadPlayerGlb={handleUploadPlayerGlb}
          onResetPlayerGlb={handleResetPlayerGlb}
          onUploadNpcGlb={handleUploadNpcGlb}
          onResetNpcGlb={handleResetNpcGlb}
          onUploadCustomCharacters={handleUploadCustomCharacters}
          onDeleteCustomCharacter={handleDeleteCustomCharacter}
          onUploadZombieGlbs={handleUploadZombieGlbs}
          onUpdateZombieSlotKind={handleUpdateZombieSlotKind}
          onUpdateZombieSlotCount={handleUpdateZombieSlotCount}
          onDeleteZombieSlot={handleDeleteZombieSlot}
          onResetZombieGlb={handleResetZombieGlb}
          onUploadRifleGlb={handleUploadRifleGlb}
          onResetRifleGlb={handleResetRifleGlb}
          onUploadPistolGlb={handleUploadPistolGlb}
          onResetPistolGlb={handleResetPistolGlb}
          onUploadEquipmentGlb={handleUploadEquipmentGlb}
          onResetEquipmentGlb={handleResetEquipmentGlb}
          onUploadObjectOverrideGlb={handleUploadObjectOverrideGlb}
          onResetObjectOverride={handleResetObjectOverride}
          onResetAllObjectOverrides={handleResetAllObjectOverrides}
          onUploadWorldPropGlb={handleUploadWorldPropGlb}
          onDeleteWorldPropSlot={handleDeleteWorldPropSlot}
          onPlaceWorldPropNearPlayer={handlePlaceWorldPropNearPlayer}
          onOpenMapEditorWithSlot={handleOpenMapEditorWithSlot}
          onSelectPlacedProp={handleSelectPlacedProp}
          onUpdatePlacedProp={handleUpdatePlacedProp}
          onDuplicatePlacedProp={handleDuplicatePlacedProp}
          onRemovePlacedProp={handleRemovePlacedProp}
          onClearAllPlacedProps={handleClearAllPlacedProps}
          onUpdateMapSettings={handleUpdateMapSettings}
          onUploadTexture={handleUploadTexture}
          onResetTexture={handleResetTexture}
          onUpdatePostProcess={handleUpdatePostProcess}
          onSelectPostProcessPreset={handleSelectPostProcessPreset}
          onUpdateCameraSettings={handleUpdateCameraSettings}
          onSelectCameraPreset={handleSelectCameraPreset}
          onResetCameraSettings={handleResetCameraSettings}
          onSetCameraPreview={handleSetCameraPreview}
          onUpdateTouchLayout={handleUpdateTouchLayout}
          onResetTouchLayout={handleResetTouchLayout}
          onSetAttachmentTransform={handleSetAttachmentTransform}
          onResetAttachmentTransform={handleResetAttachmentTransform}
          onResetAllAttachmentTransforms={handleResetAllAttachmentTransforms}
          onSaveAttachmentTransforms={handleSaveAttachmentTransforms}
          onCreateAttachmentPreview={handleCreateAttachmentPreview}
          onSuspendMainRender={handleSuspendMainRender}
          onSyncRemoteAssets={handleSyncRemoteAssets}
          studioPin={studioPin}
          onUpdateStudioPin={handleUpdateStudioPin}
        />
      )}

      <StudioPinModal
        open={studioPinOpen}
        onVerify={handleVerifyStudioPin}
        onClose={handleCloseStudioPin}
      />
    </main>
  );
}
