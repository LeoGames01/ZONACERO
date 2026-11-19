import type {
  AttachmentTransform,
  AttachmentTransformsState,
  CameraPresetId,
  CameraSettings,
  ControlButtonId,
  InventoryItemKind,
  MapMaterialSettings,
  PlacedWorldProp,
  PlayerAttachableId,
  PostProcessPreset,
  PostProcessSettings,
  PreviewPoseId,
  TouchLayoutConfig,
  WorldObjectOverrideGroup,
  WorldObjectOverrideId,
  WorldPropCategory,
  ZombieAttachableId,
} from './types';

export const DEFAULT_MAP_SETTINGS: MapMaterialSettings = {
  mapPreset: 'buenos_aires',
  terrainScale: 1.0,
  fogDensity: 1.0,
  fogDynamic: true,
  dayNightEnabled: true,
  cycleSpeed: 1.0,
  timeOfDay: 0.42, // Mañana nublada postapocalíptica (cielo cubierto) con ciclo día/noche
  showDefaultRuins: true,
  showDefaultForest: true,
  groundTint: '#ffffff',
  groundRoughness: 0.92,
  groundMetalness: 0.05,
  groundRepeat: 18,
  stoneTint: '#ffffff',
  stoneRoughness: 0.88,
  stoneMetalness: 0.1,
  barkTint: '#5c4635',
  barkRoughness: 0.92,
  customGroundTexName: null,
  customStoneTexName: null,
  customBarkTexName: null,
};

export const POST_PROCESS_PRESETS: Record<
  PostProcessPreset,
  Omit<PostProcessSettings, 'enabled' | 'preset'>
> = {
  cinematic: {
    bloomEnabled: true,
    bloomStrength: 0.16,
    bloomThreshold: 1.22,
    vignette: 0.28,
    chromaticAberration: 0.08,
    filmGrain: 0.045,
    saturation: 1.03,
    contrast: 1.06,
    exposure: 1.0,
  },
  horror: {
    bloomEnabled: true,
    bloomStrength: 0.24,
    bloomThreshold: 1.12,
    vignette: 0.46,
    chromaticAberration: 0.2,
    filmGrain: 0.11,
    saturation: 0.88,
    contrast: 1.12,
    exposure: 0.96,
  },
  natural: {
    bloomEnabled: true,
    bloomStrength: 0.1,
    bloomThreshold: 1.28,
    vignette: 0.1,
    chromaticAberration: 0,
    filmGrain: 0,
    saturation: 1.04,
    contrast: 1.02,
    exposure: 1.02,
  },
  crisp: {
    bloomEnabled: false,
    bloomStrength: 0,
    bloomThreshold: 1.4,
    vignette: 0.06,
    chromaticAberration: 0,
    filmGrain: 0,
    saturation: 1.06,
    contrast: 1.05,
    exposure: 1.04,
  },
};

export const DEFAULT_POST_PROCESS: PostProcessSettings = {
  enabled: true,
  preset: 'cinematic',
  ...POST_PROCESS_PRESETS.cinematic,
};

export const CAMERA_PRESETS: Record<CameraPresetId, Omit<CameraSettings, 'preset'>> = {
  shoulder: {
    normalDistance: 4.05,
    normalFov: 54,
    normalShoulderOffset: 0.38,
    normalHeight: 1.5,
    normalPitch: 0.2,
    aimDistance: 1.56,
    aimFov: 38,
    aimShoulderOffset: 0.54,
    aimHeight: 1.53,
  },
  close: {
    normalDistance: 2.85,
    normalFov: 48,
    normalShoulderOffset: 0.48,
    normalHeight: 1.54,
    normalPitch: 0.16,
    aimDistance: 1.18,
    aimFov: 30,
    aimShoulderOffset: 0.58,
    aimHeight: 1.56,
  },
  wide: {
    normalDistance: 5.5,
    normalFov: 62,
    normalShoulderOffset: 0.22,
    normalHeight: 1.62,
    normalPitch: 0.26,
    aimDistance: 1.95,
    aimFov: 44,
    aimShoulderOffset: 0.46,
    aimHeight: 1.52,
  },
};

export const DEFAULT_CAMERA_SETTINGS: CameraSettings = {
  preset: 'shoulder',
  ...CAMERA_PRESETS.shoulder,
};

export const DEFAULT_TOUCH_LAYOUT: TouchLayoutConfig = {
  crouch: {
    id: 'crouch',
    label: 'Agachar',
    xPct: 8,
    yPct: 89,
    scale: 0.9,
    opacity: 0.85,
    visible: true,
  },
  heal: {
    id: 'heal',
    label: 'Vendaje',
    xPct: 14,
    yPct: 91,
    scale: 0.9,
    opacity: 0.85,
    visible: false,
  },
  eat: {
    id: 'eat',
    label: 'Comida',
    xPct: 22,
    yPct: 91,
    scale: 0.9,
    opacity: 0.85,
    visible: false,
  },
  weapon: {
    id: 'weapon',
    label: 'Rueda Armas',
    xPct: 72,
    yPct: 85,
    scale: 1,
    opacity: 0.92,
    visible: true,
  },
  reload: {
    id: 'reload',
    label: 'Recargar',
    xPct: 73,
    yPct: 68,
    scale: 0.88,
    opacity: 0.88,
    visible: true,
  },
  grenade: {
    id: 'grenade',
    label: 'Granada',
    xPct: 91,
    yPct: 74,
    scale: 0.9,
    opacity: 0.85,
    visible: false,
  },
  molotov: {
    id: 'molotov',
    label: 'Molotov',
    xPct: 60,
    yPct: 74,
    scale: 0.9,
    opacity: 0.85,
    visible: false,
  },
  nail_bomb: {
    id: 'nail_bomb',
    label: 'Bomba Clavos',
    xPct: 50,
    yPct: 74,
    scale: 0.9,
    opacity: 0.85,
    visible: false,
  },
  aim: {
    id: 'aim',
    label: 'Apuntar',
    xPct: 89,
    yPct: 64,
    scale: 0.92,
    opacity: 0.9,
    visible: true,
  },
  jump: {
    id: 'jump',
    label: 'Saltar',
    xPct: 59,
    yPct: 89,
    scale: 0.9,
    opacity: 0.88,
    visible: true,
  },
  fire: {
    id: 'fire',
    label: 'Disparar / Acción',
    xPct: 88,
    yPct: 83,
    scale: 1.08,
    opacity: 0.96,
    visible: true,
  },
};

export const CONTROL_BUTTON_ORDER: ControlButtonId[] = [
  'fire',
  'weapon',
  'aim',
  'jump',
  'crouch',
  'reload',
];

export const PROP_CATEGORIES: {
  id: WorldPropCategory;
  label: string;
  solidDefault: boolean;
}[] = [
  { id: 'vehicle', label: 'Autos y Vehículos', solidDefault: true },
  { id: 'tank', label: 'Tanques de Fierro', solidDefault: true },
  { id: 'building', label: 'Edificaciones', solidDefault: true },
  { id: 'tree', label: 'Árboles', solidDefault: true },
  { id: 'foliage', label: 'Follaje y Maleza', solidDefault: false },
  { id: 'prop', label: 'Otros Objetos', solidDefault: true },
];

export interface WorldObjectOverrideDef {
  id: WorldObjectOverrideId;
  group: WorldObjectOverrideGroup;
  label: string;
  description: string;
  targetSize: number;
  fitMode: 'height' | 'maxDim';
}

export const WORLD_OBJECT_OVERRIDE_DEFS: WorldObjectOverrideDef[] = [
  {
    id: 'crate_timber',
    group: 'crates',
    label: 'Cajas de Suministros (Madera)',
    description: 'Cajas destructibles con botín y madera',
    targetSize: 1.15,
    fitMode: 'maxDim',
  },
  {
    id: 'crate_sunstone',
    group: 'crates',
    label: 'Cajas / Bidones de Combustible',
    description: 'Contenedores dorados con brasas y explosivos',
    targetSize: 1.2,
    fitMode: 'height',
  },
  {
    id: 'campfire',
    group: 'crates',
    label: 'Fogata / Barril Central',
    description: 'Zona segura de curación y fuego central',
    targetSize: 1.35,
    fitMode: 'maxDim',
  },
  {
    id: 'loot_backpack',
    group: 'interactables',
    label: 'Mochila (8 Espacios)',
    description: 'Objeto interactuable que habilita el inventario',
    targetSize: 0.62,
    fitMode: 'maxDim',
  },
  {
    id: 'loot_molotov',
    group: 'interactables',
    label: 'Bomba Molotov',
    description: 'Arma lanzable incendiaria (1.5m · 5s)',
    targetSize: 0.48,
    fitMode: 'height',
  },
  {
    id: 'loot_nail_bomb',
    group: 'interactables',
    label: 'Bomba de Clavos',
    description: 'Explosivo de metralla en 1.5m (25% daño)',
    targetSize: 0.44,
    fitMode: 'maxDim',
  },
  {
    id: 'loot_bottle',
    group: 'interactables',
    label: 'Botella de Vidrio (Distracción)',
    description: 'Objeto arrojadizo ruidoso que atrae infectados al romperse',
    targetSize: 0.42,
    fitMode: 'height',
  },
  {
    id: 'loot_can',
    group: 'interactables',
    label: 'Lata Metálica (Distracción)',
    description: 'Objeto metálico que rebota y distrae infectados cercanos',
    targetSize: 0.36,
    fitMode: 'maxDim',
  },
  {
    id: 'loot_brick',
    group: 'interactables',
    label: 'Ladrillo (Distracción / Aturdidor)',
    description: 'Objeto pesado que distrae y aturde si impacta a un infectado',
    targetSize: 0.38,
    fitMode: 'maxDim',
  },
  {
    id: 'loot_bandage',
    group: 'interactables',
    label: 'Vendaje Médico',
    description: 'Botiquín interactuable (+40 HP)',
    targetSize: 0.45,
    fitMode: 'maxDim',
  },
  {
    id: 'loot_food',
    group: 'interactables',
    label: 'Ración de Comida',
    description: 'Lata de víveres (+25 HP y calor)',
    targetSize: 0.4,
    fitMode: 'maxDim',
  },
  {
    id: 'loot_fal_ammo',
    group: 'interactables',
    label: 'Munición de Fusil FAL',
    description: 'Caja de cargadores 7.62mm (+20)',
    targetSize: 0.48,
    fitMode: 'maxDim',
  },
  {
    id: 'loot_pistol_ammo',
    group: 'interactables',
    label: 'Munición de Revólver',
    description: 'Caja de balas .38 / 9mm (+15)',
    targetSize: 0.4,
    fitMode: 'maxDim',
  },
  {
    id: 'loot_wood',
    group: 'interactables',
    label: 'Madera / Leña',
    description: 'Recurso interactuable para la fogata',
    targetSize: 0.45,
    fitMode: 'maxDim',
  },
  {
    id: 'loot_ember',
    group: 'interactables',
    label: 'Brasa / Energía Ígnea',
    description: 'Carga térmica para granada termobárica',
    targetSize: 0.45,
    fitMode: 'maxDim',
  },
  {
    id: 'obelisco',
    group: 'map_objects',
    label: 'Obelisco Central',
    description: 'Monumento principal de Plaza de la República',
    targetSize: 34.0,
    fitMode: 'height',
  },
  {
    id: 'ba_monument',
    group: 'map_objects',
    label: 'Monumento Letras BA',
    description: 'Escultura verde frente al Obelisco',
    targetSize: 6.8,
    fitMode: 'maxDim',
  },
  {
    id: 'metrobus_station',
    group: 'map_objects',
    label: 'Paradas de Metrobus (x4)',
    description: 'Estaciones y techos de la avenida',
    targetSize: 9.6,
    fitMode: 'maxDim',
  },
  {
    id: 'bus',
    group: 'map_objects',
    label: 'Colectivos Porteños (x2)',
    description: 'Autobuses en los carriles centrales',
    targetSize: 8.2,
    fitMode: 'maxDim',
  },
  {
    id: 'concrete_barrier',
    group: 'map_objects',
    label: 'Barreras de Hormigón (x8)',
    description: 'Separadores viales de la avenida',
    targetSize: 3.6,
    fitMode: 'maxDim',
  },
  {
    id: 'streetlamp',
    group: 'map_objects',
    label: 'Farolas de Iluminación (x8)',
    description: 'Postes de luz del mapa',
    targetSize: 5.2,
    fitMode: 'height',
  },
  {
    id: 'tree',
    group: 'map_objects',
    label: 'Árboles del Mapa (x32)',
    description: 'Jacarandás y plátanos de la avenida',
    targetSize: 6.0,
    fitMode: 'height',
  },
  {
    id: 'building',
    group: 'map_objects',
    label: 'Edificios Perimetrales (x24)',
    description: 'Torres y fachadas alrededor del mapa',
    targetSize: 1.0,
    fitMode: 'height',
  },
  {
    id: 'teatro_colon',
    group: 'map_objects',
    label: 'Teatro Colón (Refugio Misión 1)',
    description: 'Edificio histórico y base temporal de Ricardo',
    targetSize: 22.0,
    fitMode: 'maxDim',
  },
];

export const INVENTORY_ITEM_META: Record<
  InventoryItemKind,
  { label: string; shortLabel: string; maxStack: number; actionHint: string }
> = {
  bandage: { label: 'Vendaje', shortLabel: 'Vendaje', maxStack: 3, actionHint: 'Curar +40 HP' },
  food: { label: 'Comida', shortLabel: 'Comida', maxStack: 3, actionHint: '+25 HP / Calor' },
  molotov: { label: 'Bomba Molotov', shortLabel: 'Molotov', maxStack: 3, actionHint: '1º Encender · 2º Mantener y soltar' },
  nail_bomb: { label: 'Bomba de Clavos', shortLabel: 'Clavos', maxStack: 3, actionHint: 'Mantener y soltar (1.5m · 25%)' },
  wood: { label: 'Madera', shortLabel: 'Madera', maxStack: 5, actionHint: 'Avivar fogata (+10 HP)' },
  ember: { label: 'Brasa Ígnea', shortLabel: 'Brasa', maxStack: 5, actionHint: 'Cargar bengala (+15%)' },
};

export function cloneTouchLayout(src: TouchLayoutConfig): TouchLayoutConfig {
  const copy = {} as TouchLayoutConfig;
  (Object.keys(DEFAULT_TOUCH_LAYOUT) as ControlButtonId[]).forEach((key) => {
    const base = DEFAULT_TOUCH_LAYOUT[key];
    const entry = src?.[key];
    copy[key] = {
      ...base,
      ...(entry ?? {}),
      id: key,
      label: base.label,
    };
  });
  return copy;
}

export function sanitizePlacedProps(raw: unknown): PlacedWorldProp[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is PlacedWorldProp =>
      Boolean(item) &&
      typeof item === 'object' &&
      typeof (item as PlacedWorldProp).instanceId === 'string' &&
      typeof (item as PlacedWorldProp).slotId === 'string' &&
      Number.isFinite((item as PlacedWorldProp).x) &&
      Number.isFinite((item as PlacedWorldProp).z),
  );
}

export const DEFAULT_ATTACHMENT_TRANSFORM: AttachmentTransform = {
  scale: 1,
  scaleX: 1,
  scaleY: 1,
  scaleZ: 1,
  posX: 0,
  posY: 0,
  posZ: 0,
  rotX: 0,
  rotY: 0,
  rotZ: 0,
};

export interface PlayerAttachableDef {
  id: PlayerAttachableId;
  label: string;
  category: 'Equipo y Armadura' | 'Armas' | 'Arrojadizos y Distracciones';
  defaultPose: PreviewPoseId;
  description: string;
}

export const PLAYER_ATTACHABLE_DEFS: PlayerAttachableDef[] = [
  {
    id: 'helmet',
    label: 'Casco Táctico',
    category: 'Equipo y Armadura',
    defaultPose: 'unarmed',
    description: 'Anclado al cráneo / hueso de cabeza',
  },
  {
    id: 'vest',
    label: 'Chaleco Balístico',
    category: 'Equipo y Armadura',
    defaultPose: 'unarmed',
    description: 'Anclado al torso / columna',
  },
  {
    id: 'backpack',
    label: 'Mochila Táctica',
    category: 'Equipo y Armadura',
    defaultPose: 'unarmed',
    description: 'Anclada en la espalda superior',
  },
  {
    id: 'rifle',
    label: 'Fusil FAL',
    category: 'Armas',
    defaultPose: 'rifle',
    description: 'Arma larga a dos manos',
  },
  {
    id: 'pistol',
    label: 'Revólver',
    category: 'Armas',
    defaultPose: 'one_handed',
    description: 'Arma corta en mano derecha',
  },
  {
    id: 'bow',
    label: 'Arco Recurvo',
    category: 'Armas',
    defaultPose: 'rifle',
    description: 'Arco sujeto con mano izquierda',
  },
  {
    id: 'arrow',
    label: 'Flecha Encordada',
    category: 'Armas',
    defaultPose: 'rifle',
    description: 'Flecha montada en el arco',
  },
  {
    id: 'stick',
    label: 'Palo de Madera',
    category: 'Armas',
    defaultPose: 'one_handed',
    description: 'Arma cuerpo a cuerpo en mano derecha',
  },
  {
    id: 'baton',
    label: 'Bastón Policial',
    category: 'Armas',
    defaultPose: 'one_handed',
    description: 'Tonfa en mano derecha',
  },
  {
    id: 'molotov',
    label: 'Bomba Molotov',
    category: 'Arrojadizos y Distracciones',
    defaultPose: 'one_handed',
    description: 'Arrojadizo incendiario en mano derecha',
  },
  {
    id: 'nail_bomb',
    label: 'Bomba de Clavos',
    category: 'Arrojadizos y Distracciones',
    defaultPose: 'one_handed',
    description: 'Explosivo de metralla en mano derecha',
  },
  {
    id: 'grenade',
    label: 'Granada Ígnea',
    category: 'Arrojadizos y Distracciones',
    defaultPose: 'one_handed',
    description: 'Granada termobárica en mano derecha',
  },
  {
    id: 'bottle',
    label: 'Botella de Vidrio',
    category: 'Arrojadizos y Distracciones',
    defaultPose: 'one_handed',
    description: 'Distracción sonora en mano derecha',
  },
  {
    id: 'can',
    label: 'Lata Metálica',
    category: 'Arrojadizos y Distracciones',
    defaultPose: 'one_handed',
    description: 'Distracción liviana en mano derecha',
  },
  {
    id: 'brick',
    label: 'Ladrillo',
    category: 'Arrojadizos y Distracciones',
    defaultPose: 'one_handed',
    description: 'Proyectil aturdidor en mano derecha',
  },
];

export interface ZombieAttachableDef {
  id: ZombieAttachableId;
  label: string;
  description: string;
}

export const ZOMBIE_ATTACHABLE_DEFS: ZombieAttachableDef[] = [
  {
    id: 'helmet',
    label: 'Casco (Gendarme / Zombie)',
    description: 'Casco balístico sobre cabeza de zombie',
  },
  {
    id: 'vest',
    label: 'Chaleco (Gendarme / Zombie)',
    description: 'Chaleco antibalas en torso de zombie',
  },
  {
    id: 'rifle',
    label: 'Fusil FAL (Gendarme)',
    description: 'Fusil portado en mano derecha',
  },
  {
    id: 'pistol',
    label: 'Revólver (Policía)',
    description: 'Revólver portado en mano derecha',
  },
  {
    id: 'baton',
    label: 'Bastón Policial (Policía)',
    description: 'Bastón en mano derecha o izquierda',
  },
];

export interface ZombiePreviewPresetDef {
  id: string;
  label: string;
  kind: 'runner' | 'stalker' | 'biter' | 'spitter' | 'brute';
  role: 'civilian' | 'police' | 'gendarme' | 'gendarme_heavy';
}

export const ZOMBIE_PREVIEW_PRESETS: ZombiePreviewPresetDef[] = [
  {
    id: 'preset:gendarme_heavy',
    label: 'Gendarme Equipado (Casco + Chaleco)',
    kind: 'brute',
    role: 'gendarme_heavy',
  },
  {
    id: 'preset:gendarme',
    label: 'Gendarme (Fusil FAL)',
    kind: 'stalker',
    role: 'gendarme',
  },
  {
    id: 'preset:police',
    label: 'Policía (Revólver + Bastón)',
    kind: 'stalker',
    role: 'police',
  },
  {
    id: 'preset:runner',
    label: 'Runner / Corredor',
    kind: 'runner',
    role: 'civilian',
  },
  {
    id: 'preset:stalker',
    label: 'Asechador',
    kind: 'stalker',
    role: 'civilian',
  },
  {
    id: 'preset:biter',
    label: 'Mordedor',
    kind: 'biter',
    role: 'civilian',
  },
  {
    id: 'preset:spitter',
    label: 'Escupidor',
    kind: 'spitter',
    role: 'civilian',
  },
];

function clampNum(val: unknown, fallback: number, min: number, max: number): number {
  const n = typeof val === 'number' && Number.isFinite(val) ? val : fallback;
  return Math.max(min, Math.min(max, n));
}

export function sanitizeAttachmentTransform(raw: unknown): AttachmentTransform {
  const obj = raw && typeof raw === 'object' ? (raw as Partial<AttachmentTransform>) : {};
  return {
    scale: clampNum(obj.scale, 1, 0.2, 3.0),
    scaleX: clampNum(obj.scaleX, 1, 0.2, 3.0),
    scaleY: clampNum(obj.scaleY, 1, 0.2, 3.0),
    scaleZ: clampNum(obj.scaleZ, 1, 0.2, 3.0),
    posX: clampNum(obj.posX, 0, -0.8, 0.8),
    posY: clampNum(obj.posY, 0, -0.8, 0.8),
    posZ: clampNum(obj.posZ, 0, -0.8, 0.8),
    rotX: clampNum(obj.rotX, 0, -180, 180),
    rotY: clampNum(obj.rotY, 0, -180, 180),
    rotZ: clampNum(obj.rotZ, 0, -180, 180),
  };
}

export function createDefaultAttachmentTransforms(): AttachmentTransformsState {
  const player = {} as Record<PlayerAttachableId, AttachmentTransform>;
  PLAYER_ATTACHABLE_DEFS.forEach((d) => {
    player[d.id] = { ...DEFAULT_ATTACHMENT_TRANSFORM };
  });
  const zombie = {} as Record<ZombieAttachableId, AttachmentTransform>;
  ZOMBIE_ATTACHABLE_DEFS.forEach((d) => {
    zombie[d.id] = { ...DEFAULT_ATTACHMENT_TRANSFORM };
  });
  return { player, zombie, entities: {} };
}

export function sanitizeAttachmentTransforms(raw: unknown): AttachmentTransformsState {
  const base = createDefaultAttachmentTransforms();
  if (!raw || typeof raw !== 'object') return base;
  const src = raw as {
    player?: Partial<Record<PlayerAttachableId, unknown>>;
    zombie?: Partial<Record<ZombieAttachableId, unknown>>;
    entities?: Record<string, Record<string, unknown>>;
  };
  if (src.player && typeof src.player === 'object') {
    PLAYER_ATTACHABLE_DEFS.forEach((d) => {
      if (src.player && src.player[d.id] !== undefined) {
        base.player[d.id] = sanitizeAttachmentTransform(src.player[d.id]);
      }
    });
  }
  if (src.zombie && typeof src.zombie === 'object') {
    ZOMBIE_ATTACHABLE_DEFS.forEach((d) => {
      if (src.zombie && src.zombie[d.id] !== undefined) {
        base.zombie[d.id] = sanitizeAttachmentTransform(src.zombie[d.id]);
      }
    });
  }
  if (src.entities && typeof src.entities === 'object') {
    const validIds = new Set<string>(PLAYER_ATTACHABLE_DEFS.map((d) => d.id));
    Object.entries(src.entities).forEach(([entityId, itemMap]) => {
      if (!entityId || !itemMap || typeof itemMap !== 'object') return;
      const sanitizedMap: Partial<Record<PlayerAttachableId, AttachmentTransform>> = {};
      Object.entries(itemMap).forEach(([itemId, val]) => {
        if (validIds.has(itemId) && val !== undefined) {
          sanitizedMap[itemId as PlayerAttachableId] = sanitizeAttachmentTransform(val);
        }
      });
      if (Object.keys(sanitizedMap).length > 0) {
        base.entities[entityId] = sanitizedMap;
      }
    });
  }
  return base;
}

export function isAttachmentTransformModified(t: AttachmentTransform | undefined): boolean {
  if (!t) return false;
  return (
    Math.abs(t.scale - 1) > 0.002 ||
    Math.abs(t.scaleX - 1) > 0.002 ||
    Math.abs(t.scaleY - 1) > 0.002 ||
    Math.abs(t.scaleZ - 1) > 0.002 ||
    Math.abs(t.posX) > 0.001 ||
    Math.abs(t.posY) > 0.001 ||
    Math.abs(t.posZ) > 0.001 ||
    Math.abs(t.rotX) > 0.2 ||
    Math.abs(t.rotY) > 0.2 ||
    Math.abs(t.rotZ) > 0.2
  );
}
