export type GameState =
  | 'TITLE_MENU'
  | 'INTRO_CUTSCENE'
  | 'ALLY_RESCUE_CUTSCENE'
  | 'PLAYING'
  | 'PAUSED'
  | 'GAME_OVER'
  | 'MISSION_COMPLETE';

export type DifficultyId = 'pilgrim' | 'warden' | 'ascendant';

export type WorldZoneId = 'exterior_9_julio' | 'colon_interior';

export type StoryMissionId = 1 | 2 | 3;

export type BaseCraftRecipeId = 'molotov' | 'nail_bomb' | 'bandage' | 'fal_ammo';

export type VehicleModuleId = 'engine' | 'tires' | 'armor' | 'fuel';

export type VehicleRepairState = Record<VehicleModuleId, boolean>;

export type FastTravelDestinationId = 'colon_door' | 'obelisco' | 'fastfood_corner';

export interface BaseProvisions {
  chemicals: number;
  scrap: number;
  powder: number;
}

export type WeaponKind = 'unarmed' | 'stick' | 'baton' | 'bow' | 'pistol' | 'rifle';

export type CustomEquipmentId = 'helmet' | 'vest' | 'bow' | 'arrow' | 'stick' | 'baton';

export interface UnlockedWeapons {
  stick: boolean;
  baton: boolean;
  bow: boolean;
  pistol: boolean;
  rifle: boolean;
}

export type DistractionKind = 'bottle' | 'can' | 'brick' | 'decoy_rat';

export type ThrowableKind = 'molotov' | 'nail_bomb' | 'grenade' | DistractionKind;

export type EquippedThrowableKind = 'molotov' | 'nail_bomb' | DistractionKind;

export type MovementStance = 'idle' | 'walk' | 'run' | 'crouch' | 'jump';

export type EnemyKind = 'runner' | 'stalker' | 'biter' | 'spitter' | 'brute';

export type EnemyRole = 'civilian' | 'police' | 'gendarme' | 'gendarme_heavy';

export interface EnemyCarriedGear {
  revolver?: boolean;
  pistolAmmo?: number;
  baton?: boolean;
  rifle?: boolean;
  rifleMags?: number;
  helmet?: boolean;
  vest?: boolean;
}

export type LootKind =
  | 'ember'
  | 'wood'
  | 'bandage'
  | 'food'
  | 'fal_ammo'
  | 'pistol_ammo'
  | 'stick'
  | 'baton'
  | 'bow'
  | 'arrows'
  | 'pistol'
  | 'rifle'
  | 'helmet'
  | 'vest'
  | 'backpack'
  | 'molotov'
  | 'nail_bomb'
  | 'bottle'
  | 'can'
  | 'brick'
  | 'chemicals'
  | 'scrap'
  | 'powder';

export type InventoryItemKind =
  | 'bandage'
  | 'food'
  | 'molotov'
  | 'nail_bomb'
  | 'wood'
  | 'ember';

export interface InventorySlot {
  kind: InventoryItemKind;
  count: number;
}

export type WorldObjectOverrideGroup = 'crates' | 'interactables' | 'map_objects';

export type WorldObjectOverrideId =
  | 'crate_timber'
  | 'crate_sunstone'
  | 'campfire'
  | 'loot_backpack'
  | 'loot_molotov'
  | 'loot_nail_bomb'
  | 'loot_bottle'
  | 'loot_can'
  | 'loot_brick'
  | 'loot_bandage'
  | 'loot_food'
  | 'loot_fal_ammo'
  | 'loot_pistol_ammo'
  | 'loot_wood'
  | 'loot_ember'
  | 'obelisco'
  | 'ba_monument'
  | 'metrobus_station'
  | 'bus'
  | 'concrete_barrier'
  | 'streetlamp'
  | 'tree'
  | 'building'
  | 'teatro_colon';

export type WorldPropCategory = 'vehicle' | 'tank' | 'building' | 'tree' | 'foliage' | 'prop';

export type TextureTargetId = 'ground' | 'stone' | 'bark';

export type MapPresetId = 'buenos_aires' | 'custom_sandbox';

export interface RadarBlip {
  id: number;
  x: number;
  z: number;
  y?: number;
  kind: EnemyKind;
  role?: EnemyRole;
}

export interface ModelCacheMeta {
  name: string;
  byteLength: number;
  updatedAt: number;
}

export type ZombieTargetKind =
  | EnemyKind
  | 'police'
  | 'gendarme'
  | 'gendarme_heavy'
  | 'all';

export interface ZombieModelSlot {
  id: string;
  name: string;
  byteLength: number;
  updatedAt: number;
  targetKind: ZombieTargetKind;
  spawnCount?: number;
}

export interface WorldPropSlot {
  id: string;
  category: WorldPropCategory;
  name: string;
  byteLength: number;
  updatedAt: number;
}

export interface PlacedWorldProp {
  instanceId: string;
  slotId: string;
  category: WorldPropCategory;
  name: string;
  x: number;
  yOffset: number;
  z: number;
  scale: number;
  rotationY: number;
  solid: boolean;
}

export interface MapMaterialSettings {
  mapPreset: MapPresetId;
  terrainScale: number;
  fogDensity: number;
  fogDynamic: boolean;
  dayNightEnabled: boolean;
  cycleSpeed: number;
  timeOfDay: number; // 0..1 (0 = medianoche, 0.25 = amanecer, 0.5 = mediodía, 0.75 = atardecer)
  showDefaultRuins: boolean;
  showDefaultForest: boolean;
  groundTint: string;
  groundRoughness: number;
  groundMetalness: number;
  groundRepeat: number;
  stoneTint: string;
  stoneRoughness: number;
  stoneMetalness: number;
  barkTint: string;
  barkRoughness: number;
  customGroundTexName: string | null;
  customStoneTexName: string | null;
  customBarkTexName: string | null;
}

export type PostProcessPreset = 'cinematic' | 'horror' | 'natural' | 'crisp';

export interface PostProcessSettings {
  enabled: boolean;
  preset: PostProcessPreset;
  bloomEnabled: boolean;
  bloomStrength: number;
  bloomThreshold: number;
  vignette: number;
  chromaticAberration: number;
  filmGrain: number;
  saturation: number;
  contrast: number;
  exposure: number;
}

export type ControlButtonId =
  | 'crouch'
  | 'weapon'
  | 'reload'
  | 'grenade'
  | 'molotov'
  | 'nail_bomb'
  | 'aim'
  | 'jump'
  | 'fire'
  | 'heal'
  | 'eat';

export interface ControlButtonConfig {
  id: ControlButtonId;
  label: string;
  xPct: number; // 4..96 (% from left)
  yPct: number; // 12..95 (% from top)
  scale: number; // 0.65..1.65
  opacity: number; // 0.2..1.0
  visible: boolean;
}

export type TouchLayoutConfig = Record<ControlButtonId, ControlButtonConfig>;

export type CameraPresetId = 'shoulder' | 'close' | 'wide';

export interface CameraSettings {
  preset: CameraPresetId;
  normalDistance: number;
  normalFov: number;
  normalShoulderOffset: number;
  normalHeight: number;
  normalPitch: number;
  aimDistance: number;
  aimFov: number;
  aimShoulderOffset: number;
  aimHeight: number;
}

export type MissionPhaseId =
  | 'clear_plaza_wave'
  | 'clear_corridor_wave'
  | 'secure_colon'
  | 'clear_theater'
  | 'rescue_ally'
  | 'base_free_roam'
  | 'scavenge_9_julio'
  | 'm3_briefing'
  | 'm3_go_fastfood'
  | 'm3_defend_fastfood'
  | 'm3_help_mechanic'
  | 'm3_escort_colon'
  | 'tutorial_training';

export type TutorialStepId =
  | 'move_crouch'
  | 'pickup_stick'
  | 'melee_dummy'
  | 'throw_distraction'
  | 'bow_shot'
  | 'police_gun'
  | 'completed';

export interface TutorialHudState {
  active: boolean;
  stepIndex: number;
  totalSteps: number;
  stepId: TutorialStepId;
  title: string;
  instruction: string;
  hint: string;
  progressText: string;
  completed: boolean;
}

export interface MissionObjectiveHud {
  missionNumber: number;
  missionTitle: string;
  subtitle: string;
  phase: MissionPhaseId;
  objectiveText: string;
  detailText: string;
  killsCurrent: number;
  killsTarget: number;
  totalMissionKills: number;
  totalMissionTarget: number;
  waveIndex: number;
  totalWaves: number;
  colonUnlocked: boolean;
  colonPos: { x: number; z: number };
  distanceToColon: number;
  targetPos?: { x: number; z: number } | null;
  targetLabel?: string | null;
  distanceToTarget?: number;
  radioSpeaker: string | null;
  radioMessage: string | null;
}

export interface IntroCutsceneCaption {
  tag: string;
  title: string;
  text: string;
}

export type AttachmentTargetScope = 'player' | 'zombie' | (string & {});

export type CharacterEntityKind = 'player' | 'npc' | 'zombie' | 'custom';

export type CharacterAnimationTag =
  | 'player'
  | 'survivor'
  | 'ally_chispa'
  | 'npc_mateo'
  | 'zombie'
  | 'zombie_walker'
  | 'zombie_runner'
  | 'zombie_crawler'
  | 'zombie_brute'
  | 'zombie_spitter'
  | 'zombie_police'
  | 'zombie_gendarme'
  | 'npc'
  | 'custom';

export type StandardAnimationAction =
  | 'idle'
  | 'walk'
  | 'run'
  | 'attack'
  | 'hit'
  | 'death';

export interface NativeAnimationDictionaryInfo {
  tag: CharacterAnimationTag;
  mappedClips: Partial<Record<StandardAnimationAction, string>>;
  availableActions: StandardAnimationAction[];
  allClipNames: string[];
}

export interface CustomCharacterSlot {
  id: string;
  name: string;
  byteLength: number;
  updatedAt: number;
  role: 'npc' | 'ally' | 'custom';
}

export interface CharacterEntityDescriptor {
  id: string;
  label: string;
  kind: CharacterEntityKind;
  animationTag?: CharacterAnimationTag;
  customGlbName: string | null;
  supportedItems: PlayerAttachableId[];
  defaultItem: PlayerAttachableId;
  isZombiePresetGroup?: boolean;
  zombieSlotId?: string;
  customCharacterSlotId?: string;
}

export type PlayerAttachableId =
  | 'helmet'
  | 'vest'
  | 'backpack'
  | 'rifle'
  | 'pistol'
  | 'bow'
  | 'arrow'
  | 'stick'
  | 'baton'
  | 'molotov'
  | 'nail_bomb'
  | 'grenade'
  | 'bottle'
  | 'can'
  | 'brick';

export type ZombieAttachableId = 'helmet' | 'vest' | 'rifle' | 'pistol' | 'baton';

export type AttachableItemId = PlayerAttachableId | ZombieAttachableId;

export type PreviewPoseId = 'unarmed' | 'one_handed' | 'rifle';

export interface AttachmentTransform {
  scale: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  posX: number;
  posY: number;
  posZ: number;
  rotX: number;
  rotY: number;
  rotZ: number;
}

export interface AttachmentTransformsState {
  player: Record<PlayerAttachableId, AttachmentTransform>;
  zombie: Record<ZombieAttachableId, AttachmentTransform>;
  entities: Record<string, Partial<Record<PlayerAttachableId, AttachmentTransform>>>;
}

export interface RemoteAssetErrorDetail {
  file: string;
  reason: string;
}

export interface RemoteManifestSyncInfo {
  url: string;
  version: number | null;
  lastSyncedAt: number | null;
  status: 'idle' | 'syncing' | 'ready' | 'offline' | 'error';
  downloadedAssets: number;
  declaredAssets?: number;
  appliedAssets?: number;
  failedAssets?: RemoteAssetErrorDetail[];
  errorMessage: string | null;
}

export interface HudSnapshot {
  gameState: GameState;
  hp: number;
  maxHp: number;
  helmetArmor: number;
  helmetMaxArmor: number;
  vestArmor: number;
  vestMaxArmor: number;
  stamina: number;
  maxStamina: number;
  weapon: WeaponKind;
  unlockedWeapons: UnlockedWeapons;
  stance: MovementStance;
  isAiming: boolean;
  isFiring: boolean;
  isMoving: boolean;
  isReloading: boolean;
  crosshairSpread: number;
  bowDrawProgress: number;
  stealthActive: boolean;
  stealthInGrass: boolean;
  stealthState: 'hidden' | 'caution' | 'detected';
  stealthNoiseLevel: number;
  arrows: number;
  pistolAmmo: number;
  pistolMaxAmmo: number;
  pistolReserveAmmo: number;
  rifleAmmo: number;
  rifleMaxAmmo: number;
  rifleReserveAmmo: number;
  bandages: number;
  food: number;
  flareCharge: number; // 0..100
  wood: number;
  hasBackpack: boolean;
  inventory: (InventorySlot | null)[];
  selectedInventorySlot: number;
  molotovCount: number;
  nailBombCount: number;
  distractionCounts: Record<DistractionKind, number>;
  totalDistractions: number;
  activeDistractionKind: DistractionKind;
  ratCount: number;
  chapitasCount: number;
  nearTrashSpot: boolean;
  activeDecoyRats: number;
  molotovLit: boolean;
  nailBombLit: boolean;
  equippedThrowable: EquippedThrowableKind | null;
  aimingThrowable: ThrowableKind | null;
  inventoryNotice: string | null;
  backpackPos: { x: number; z: number } | null;
  score: number;
  bestScore: number;
  combo: number;
  survivalTime: number;
  enemiesRemaining: number;
  alertedZombies: number;
  kills: number;
  nearCampfire: boolean;
  pointerLocked: boolean;
  playerPos: { x: number; z: number };
  playerYaw: number;
  camYaw: number;
  radarEntities: RadarBlip[];
  difficulty: DifficultyId;
  muted: boolean;
  hurtFlash: number;
  damageSeq: number;
  lastDamage: number;
  timeOfDay: number;
  isDaytime: boolean;
  clockLabel: string;
  fogLevel: number;
  editorMode: boolean;
  activePlacementSlotId: string | null;
  selectedPropId: string | null;
  propSlots: WorldPropSlot[];
  placedProps: PlacedWorldProp[];
  mapSettings: MapMaterialSettings;
  postProcess: PostProcessSettings;
  cameraSettings: CameraSettings;
  customModelName: string | null;
  customZombieName: string | null;
  customZombieSlots: ZombieModelSlot[];
  customNpcNames: { ally_chispa: string | null; npc_mateo: string | null };
  customCharacterSlots: CustomCharacterSlot[];
  characterCatalog: CharacterEntityDescriptor[];
  customRifleName: string | null;
  customPistolName: string | null;
  customEquipmentNames: Partial<Record<CustomEquipmentId, string>>;
  objectOverrides: Partial<Record<WorldObjectOverrideId, string>>;
  attachmentTransforms: AttachmentTransformsState;
  remoteManifest?: RemoteManifestSyncInfo;
  modelError: string | null;
  introCutsceneProgress: number;
  introCutsceneCaption: IntroCutsceneCaption | null;
  activeZone: WorldZoneId;
  currentFloor: 0 | 1 | 2;
  allyRescued: boolean;
  baseUnlocked: boolean;
  nearWorkbench: boolean;
  nearExteriorExit: boolean;
  nearColonEntrance: boolean;
  provisions: BaseProvisions;
  allyPos: { x: number; z: number } | null;
  mission2Unlocked: boolean;
  mission3Unlocked: boolean;
  mechanicRescued: boolean;
  mechanicPos: { x: number; z: number } | null;
  mechanicHp: number;
  mechanicMaxHp: number;
  mechanicLimping: boolean;
  nearMechanicHelp: boolean;
  nearVehicleBay: boolean;
  vehicleBayUnlocked: boolean;
  vehicleState: VehicleRepairState;
  mission: MissionObjectiveHud;
  tutorial: TutorialHudState;
}
