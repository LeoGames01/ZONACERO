import {
  cloneTouchLayout,
  createDefaultAttachmentTransforms,
  DEFAULT_CAMERA_SETTINGS,
  DEFAULT_MAP_SETTINGS,
  DEFAULT_POST_PROCESS,
  DEFAULT_TOUCH_LAYOUT,
  POST_PROCESS_PRESETS,
  sanitizeAttachmentTransforms,
  sanitizePlacedProps,
} from './settingsDefaults';
import type {
  AttachmentTransformsState,
  CameraSettings,
  CustomCharacterSlot,
  CustomEquipmentId,
  MapMaterialSettings,
  ModelCacheMeta,
  PlacedWorldProp,
  PostProcessSettings,
  TextureTargetId,
  TouchLayoutConfig,
  WorldObjectOverrideId,
  WorldPropCategory,
  WorldPropSlot,
  ZombieModelSlot,
  ZombieTargetKind,
} from './types';

// Configuración de IndexedDB para guardar modelos .glb, objetos del mapa y texturas de forma permanente
export const DB_NAME = 'SurvivalGameDB';
export const STORE_NAME = 'assets';
export const MODEL_KEY = 'meshy_character_glb';
const META_KEY = 'meshy_character_meta';

export const ZOMBIE_MODEL_KEY = 'meshy_zombie_glb';
const ZOMBIE_META_KEY = 'meshy_zombie_meta';
const ZOMBIE_SLOTS_META_KEY = 'meshy_zombies_slots_v1';
const ZOMBIE_BUFFER_PREFIX = 'meshy_zombie_glb_';

export const RIFLE_MODEL_KEY = 'meshy_rifle_glb';
const RIFLE_META_KEY = 'meshy_rifle_meta';

export const PISTOL_MODEL_KEY = 'meshy_pistol_glb';
const PISTOL_META_KEY = 'meshy_pistol_meta';

const CUSTOM_EQUIPMENT_META_MAP_KEY = 'meshy_equipment_meta_v1';
const CUSTOM_EQUIPMENT_BUF_PREFIX = 'meshy_equipment_glb_';

const OBJECT_OVERRIDE_META_MAP_KEY = 'world_object_override_meta_v1';
const OBJECT_OVERRIDE_BUF_PREFIX = 'world_object_override_glb_';

const PROP_SLOTS_META_KEY = 'world_prop_slots_meta_v1';
const PROP_BUFFER_PREFIX = 'world_prop_glb_';
const PLACED_PROPS_KEY = 'world_placed_props_v1';

const TEXTURE_META_PREFIX = 'custom_tex_meta_';
const TEXTURE_BUF_PREFIX = 'custom_tex_buf_';

const NPC_META_MAP_KEY = 'meshy_npc_meta_v1';
const NPC_BUFFER_PREFIX = 'meshy_npc_glb_';
const CUSTOM_CHAR_SLOTS_META_KEY = 'meshy_custom_chars_slots_v1';
const CUSTOM_CHAR_BUFFER_PREFIX = 'meshy_custom_char_glb_';

const MAP_SETTINGS_STORAGE_KEY = 'zonacero_map_settings_v1';
const LEGACY_POST_PROCESS_STORAGE_KEY = 'zonacero_postprocess_v1';
const POST_PROCESS_STORAGE_KEY = 'zonacero_postprocess_v2';
const TOUCH_LAYOUT_STORAGE_KEY = 'zonacero_touch_layout_v1';
const CAMERA_SETTINGS_STORAGE_KEY = 'zonacero_camera_settings_v1';
const ATTACHMENT_TRANSFORMS_STORAGE_KEY = 'zonacero_attachment_transforms_v1';

let cachedDbPromise: Promise<IDBDatabase> | null = null;

export function abrirBaseDeDatos(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB unavailable'));
  }
  if (cachedDbPromise) {
    return cachedDbPromise;
  }
  cachedDbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      db.onclose = () => {
        cachedDbPromise = null;
      };
      db.onversionchange = () => {
        db.close();
        cachedDbPromise = null;
      };
      resolve(db);
    };
    request.onerror = (e) => {
      cachedDbPromise = null;
      reject((e.target as IDBOpenDBRequest).error);
    };
    request.onblocked = () => {
      cachedDbPromise = null;
      reject(new Error('IndexedDB bloqueada por otra pestaña o versión pendiente'));
    };
  });
  return cachedDbPromise;
}

function txErrorOrFallback(tx: IDBTransaction, fallbackMsg: string): Error {
  const err = tx.error;
  if (err instanceof Error) return err;
  if (err && typeof (err as { message?: unknown }).message === 'string') {
    return new Error((err as { message: string }).message);
  }
  return new Error(fallbackMsg);
}

function wireWriteTx(
  tx: IDBTransaction,
  resolve: () => void,
  reject: (reason: Error) => void,
): void {
  let settled = false;
  tx.oncomplete = () => {
    if (settled) return;
    settled = true;
    resolve();
  };
  tx.onerror = () => {
    if (settled) return;
    settled = true;
    reject(txErrorOrFallback(tx, 'Error de escritura en IndexedDB'));
  };
  tx.onabort = () => {
    if (settled) return;
    settled = true;
    reject(txErrorOrFallback(tx, 'Transacción de IndexedDB abortada (posible falta de espacio)'));
  };
}

export async function guardarModeloCache(
  arrayBuffer: ArrayBuffer,
  fileName = 'custom_character.glb',
): Promise<void> {
  const db = await abrirBaseDeDatos();
  const meta: ModelCacheMeta = {
    name: fileName,
    byteLength: arrayBuffer.byteLength,
    updatedAt: Date.now(),
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(arrayBuffer, MODEL_KEY);
    store.put(meta, META_KEY);
    wireWriteTx(tx, resolve, reject);
  });
}

export async function cargarModeloCache(): Promise<ArrayBuffer | null> {
  try {
    const db = await abrirBaseDeDatos();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(MODEL_KEY);
      req.onsuccess = () => resolve((req.result as ArrayBuffer | undefined) || null);
      req.onerror = (e) => reject((e.target as IDBRequest).error);
    });
  } catch {
    return null;
  }
}

export async function cargarModeloMeta(): Promise<ModelCacheMeta | null> {
  try {
    const db = await abrirBaseDeDatos();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(META_KEY);
      req.onsuccess = () => resolve((req.result as ModelCacheMeta | undefined) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function eliminarModeloCache(): Promise<void> {
  try {
    const db = await abrirBaseDeDatos();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(MODEL_KEY);
      store.delete(META_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject((e.target as IDBTransaction).error);
    });
  } catch {
    // Ignore cleanup errors
  }
}

export async function guardarZombieCache(
  arrayBuffer: ArrayBuffer,
  fileName = 'custom_zombie.glb',
): Promise<void> {
  const db = await abrirBaseDeDatos();
  const meta: ModelCacheMeta = {
    name: fileName,
    byteLength: arrayBuffer.byteLength,
    updatedAt: Date.now(),
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(arrayBuffer, ZOMBIE_MODEL_KEY);
    store.put(meta, ZOMBIE_META_KEY);
    wireWriteTx(tx, resolve, reject);
  });
}

export async function cargarZombieCache(): Promise<ArrayBuffer | null> {
  try {
    const db = await abrirBaseDeDatos();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(ZOMBIE_MODEL_KEY);
      req.onsuccess = () => resolve((req.result as ArrayBuffer | undefined) || null);
      req.onerror = (e) => reject((e.target as IDBRequest).error);
    });
  } catch {
    return null;
  }
}

export async function cargarZombieMeta(): Promise<ModelCacheMeta | null> {
  try {
    const db = await abrirBaseDeDatos();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(ZOMBIE_META_KEY);
      req.onsuccess = () => resolve((req.result as ModelCacheMeta | undefined) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function eliminarZombieCache(): Promise<void> {
  try {
    const db = await abrirBaseDeDatos();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(ZOMBIE_MODEL_KEY);
      store.delete(ZOMBIE_META_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject((e.target as IDBTransaction).error);
    });
  } catch {
    // Ignore cleanup errors
  }
}

export async function listarZombieSlotsCache(): Promise<ZombieModelSlot[]> {
  try {
    const db = await abrirBaseDeDatos();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(ZOMBIE_SLOTS_META_KEY);
      req.onsuccess = () => {
        const list = req.result;
        if (!Array.isArray(list)) {
          resolve([]);
          return;
        }
        resolve(
          (list as ZombieModelSlot[]).map((s) => ({
            ...s,
            spawnCount:
              typeof s.spawnCount === 'number' && Number.isFinite(s.spawnCount)
                ? Math.max(0, Math.min(25, Math.round(s.spawnCount)))
                : 4,
          })),
        );
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function guardarZombieSlotCache(
  slotId: string,
  arrayBuffer: ArrayBuffer,
  fileName: string,
  targetKind: ZombieTargetKind = 'all',
  spawnCount = 4,
): Promise<ZombieModelSlot[]> {
  const existing = await listarZombieSlotsCache();
  const nextSlot: ZombieModelSlot = {
    id: slotId,
    name: fileName,
    byteLength: arrayBuffer.byteLength,
    updatedAt: Date.now(),
    targetKind,
    spawnCount: Math.max(0, Math.min(25, Math.round(spawnCount))),
  };
  const nextList = [...existing.filter((s) => s.id !== slotId), nextSlot];
  const db = await abrirBaseDeDatos();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(arrayBuffer, `${ZOMBIE_BUFFER_PREFIX}${slotId}`);
    store.put(nextList, ZOMBIE_SLOTS_META_KEY);
    wireWriteTx(tx, resolve, reject);
  });
  return nextList;
}

export async function guardarZombieSlotsBatchCache(
  items: Array<{
    slotId: string;
    arrayBuffer: ArrayBuffer;
    fileName: string;
    targetKind?: ZombieTargetKind;
    spawnCount?: number;
  }>,
): Promise<ZombieModelSlot[]> {
  if (items.length === 0) return listarZombieSlotsCache();
  const existing = await listarZombieSlotsCache();
  const itemIds = new Set(items.map((it) => it.slotId));
  const now = Date.now();
  const nextSlots: ZombieModelSlot[] = items.map((it, idx) => ({
    id: it.slotId,
    name: it.fileName,
    byteLength: it.arrayBuffer.byteLength,
    updatedAt: now + idx,
    targetKind: it.targetKind ?? 'all',
    spawnCount: Math.max(0, Math.min(25, Math.round(it.spawnCount ?? 4))),
  }));
  const nextList = [...existing.filter((s) => !itemIds.has(s.id)), ...nextSlots];
  const db = await abrirBaseDeDatos();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    items.forEach((it) => {
      store.put(it.arrayBuffer, `${ZOMBIE_BUFFER_PREFIX}${it.slotId}`);
    });
    store.put(nextList, ZOMBIE_SLOTS_META_KEY);
    wireWriteTx(tx, resolve, reject);
  });
  return nextList;
}

export async function cargarZombieSlotBuffer(slotId: string): Promise<ArrayBuffer | null> {
  try {
    const db = await abrirBaseDeDatos();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(`${ZOMBIE_BUFFER_PREFIX}${slotId}`);
      req.onsuccess = () => resolve((req.result as ArrayBuffer | undefined) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function cargarZombieSlotBuffers(slotIds: string[]): Promise<Map<string, ArrayBuffer>> {
  const result = new Map<string, ArrayBuffer>();
  if (slotIds.length === 0) return result;
  try {
    const db = await abrirBaseDeDatos();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      slotIds.forEach((slotId) => {
        const req = store.get(`${ZOMBIE_BUFFER_PREFIX}${slotId}`);
        req.onsuccess = () => {
          if (req.result) {
            result.set(slotId, req.result as ArrayBuffer);
          }
        };
      });
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => resolve(result);
    });
  } catch {
    return result;
  }
}

export async function actualizarZombieSlotTargetCache(
  slotId: string,
  targetKind: ZombieTargetKind,
): Promise<ZombieModelSlot[]> {
  const existing = await listarZombieSlotsCache();
  const nextList = existing.map((s) => (s.id === slotId ? { ...s, targetKind } : s));
  try {
    const db = await abrirBaseDeDatos();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(nextList, ZOMBIE_SLOTS_META_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject((e.target as IDBTransaction).error);
    });
  } catch {
    // Ignore
  }
  return nextList;
}

export async function actualizarZombieSlotCountCache(
  slotId: string,
  spawnCount: number,
): Promise<ZombieModelSlot[]> {
  const clamped = Math.max(0, Math.min(25, Math.round(spawnCount)));
  const existing = await listarZombieSlotsCache();
  const nextList = existing.map((s) => (s.id === slotId ? { ...s, spawnCount: clamped } : s));
  try {
    const db = await abrirBaseDeDatos();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(nextList, ZOMBIE_SLOTS_META_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject((e.target as IDBTransaction).error);
    });
  } catch {
    // Ignore
  }
  return nextList;
}

export async function eliminarZombieSlotCache(slotId: string): Promise<ZombieModelSlot[]> {
  const existing = await listarZombieSlotsCache();
  const nextList = existing.filter((s) => s.id !== slotId);
  try {
    const db = await abrirBaseDeDatos();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(`${ZOMBIE_BUFFER_PREFIX}${slotId}`);
      store.put(nextList, ZOMBIE_SLOTS_META_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject((e.target as IDBTransaction).error);
    });
  } catch {
    // Ignore
  }
  return nextList;
}

export async function limpiarTodosZombiesCache(): Promise<void> {
  const existing = await listarZombieSlotsCache();
  try {
    const db = await abrirBaseDeDatos();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(ZOMBIE_MODEL_KEY);
      store.delete(ZOMBIE_META_KEY);
      store.delete(ZOMBIE_SLOTS_META_KEY);
      existing.forEach((s) => store.delete(`${ZOMBIE_BUFFER_PREFIX}${s.id}`));
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject((e.target as IDBTransaction).error);
    });
  } catch {
    // Ignore cleanup errors
  }
}

// --- MODELOS .GLB PARA NPCs (Chispa, Mateo) Y PERSONAJES EXTRA ---

export type CustomNpcTargetId = 'ally_chispa' | 'npc_mateo';
export type CustomNpcMetaMap = Partial<Record<CustomNpcTargetId, ModelCacheMeta>>;

export async function listarNpcMetaCache(): Promise<CustomNpcMetaMap> {
  try {
    const db = await abrirBaseDeDatos();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(NPC_META_MAP_KEY);
      req.onsuccess = () => {
        const val = req.result;
        resolve(val && typeof val === 'object' ? (val as CustomNpcMetaMap) : {});
      };
      req.onerror = () => resolve({});
    });
  } catch {
    return {};
  }
}

export async function guardarNpcGlbCache(
  targetId: CustomNpcTargetId,
  arrayBuffer: ArrayBuffer,
  fileName: string,
): Promise<CustomNpcMetaMap> {
  const existing = await listarNpcMetaCache();
  const nextMap: CustomNpcMetaMap = {
    ...existing,
    [targetId]: {
      name: fileName,
      byteLength: arrayBuffer.byteLength,
      updatedAt: Date.now(),
    },
  };
  const db = await abrirBaseDeDatos();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(arrayBuffer, `${NPC_BUFFER_PREFIX}${targetId}`);
    store.put(nextMap, NPC_META_MAP_KEY);
    wireWriteTx(tx, resolve, reject);
  });
  return nextMap;
}

export async function cargarNpcGlbBuffers(): Promise<Map<CustomNpcTargetId, ArrayBuffer>> {
  const result = new Map<CustomNpcTargetId, ArrayBuffer>();
  try {
    const db = await abrirBaseDeDatos();
    const keys: CustomNpcTargetId[] = ['ally_chispa', 'npc_mateo'];
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      keys.forEach((k) => {
        const req = store.get(`${NPC_BUFFER_PREFIX}${k}`);
        req.onsuccess = () => {
          if (req.result) {
            result.set(k, req.result as ArrayBuffer);
          }
        };
      });
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => resolve(result);
    });
  } catch {
    return result;
  }
}

export async function eliminarNpcGlbCache(targetId: CustomNpcTargetId): Promise<CustomNpcMetaMap> {
  const existing = await listarNpcMetaCache();
  const nextMap: CustomNpcMetaMap = { ...existing };
  delete nextMap[targetId];
  try {
    const db = await abrirBaseDeDatos();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(`${NPC_BUFFER_PREFIX}${targetId}`);
      store.put(nextMap, NPC_META_MAP_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject((e.target as IDBTransaction).error);
    });
  } catch {
    // Ignore
  }
  return nextMap;
}

export async function listarCustomCharacterSlotsCache(): Promise<CustomCharacterSlot[]> {
  try {
    const db = await abrirBaseDeDatos();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(CUSTOM_CHAR_SLOTS_META_KEY);
      req.onsuccess = () => {
        const val = req.result;
        resolve(Array.isArray(val) ? (val as CustomCharacterSlot[]) : []);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function guardarCustomCharacterSlotCache(
  slotId: string,
  arrayBuffer: ArrayBuffer,
  fileName: string,
  role: CustomCharacterSlot['role'] = 'custom',
): Promise<CustomCharacterSlot[]> {
  const existing = await listarCustomCharacterSlotsCache();
  const nextSlot: CustomCharacterSlot = {
    id: slotId,
    name: fileName,
    byteLength: arrayBuffer.byteLength,
    updatedAt: Date.now(),
    role,
  };
  const nextList = [...existing.filter((s) => s.id !== slotId), nextSlot];
  const db = await abrirBaseDeDatos();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(arrayBuffer, `${CUSTOM_CHAR_BUFFER_PREFIX}${slotId}`);
    store.put(nextList, CUSTOM_CHAR_SLOTS_META_KEY);
    wireWriteTx(tx, resolve, reject);
  });
  return nextList;
}

export async function cargarCustomCharacterSlotBuffers(
  slotIds: string[],
): Promise<Map<string, ArrayBuffer>> {
  const result = new Map<string, ArrayBuffer>();
  if (slotIds.length === 0) return result;
  try {
    const db = await abrirBaseDeDatos();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      slotIds.forEach((slotId) => {
        const req = store.get(`${CUSTOM_CHAR_BUFFER_PREFIX}${slotId}`);
        req.onsuccess = () => {
          if (req.result) {
            result.set(slotId, req.result as ArrayBuffer);
          }
        };
      });
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => resolve(result);
    });
  } catch {
    return result;
  }
}

export async function eliminarCustomCharacterSlotCache(
  slotId: string,
): Promise<CustomCharacterSlot[]> {
  const existing = await listarCustomCharacterSlotsCache();
  const nextList = existing.filter((s) => s.id !== slotId);
  try {
    const db = await abrirBaseDeDatos();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(`${CUSTOM_CHAR_BUFFER_PREFIX}${slotId}`);
      store.put(nextList, CUSTOM_CHAR_SLOTS_META_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject((e.target as IDBTransaction).error);
    });
  } catch {
    // Ignore
  }
  return nextList;
}

export async function guardarRifleCache(
  arrayBuffer: ArrayBuffer,
  fileName = 'custom_rifle.glb',
): Promise<void> {
  const db = await abrirBaseDeDatos();
  const meta: ModelCacheMeta = {
    name: fileName,
    byteLength: arrayBuffer.byteLength,
    updatedAt: Date.now(),
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(arrayBuffer, RIFLE_MODEL_KEY);
    store.put(meta, RIFLE_META_KEY);
    wireWriteTx(tx, resolve, reject);
  });
}

export async function cargarRifleCache(): Promise<ArrayBuffer | null> {
  try {
    const db = await abrirBaseDeDatos();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(RIFLE_MODEL_KEY);
      req.onsuccess = () => resolve((req.result as ArrayBuffer | undefined) || null);
      req.onerror = (e) => reject((e.target as IDBRequest).error);
    });
  } catch {
    return null;
  }
}

export async function cargarRifleMeta(): Promise<ModelCacheMeta | null> {
  try {
    const db = await abrirBaseDeDatos();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(RIFLE_META_KEY);
      req.onsuccess = () => resolve((req.result as ModelCacheMeta | undefined) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function eliminarRifleCache(): Promise<void> {
  try {
    const db = await abrirBaseDeDatos();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(RIFLE_MODEL_KEY);
      store.delete(RIFLE_META_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject((e.target as IDBTransaction).error);
    });
  } catch {
    // Ignore cleanup errors
  }
}

export async function guardarPistolCache(
  arrayBuffer: ArrayBuffer,
  fileName = 'custom_pistol.glb',
): Promise<void> {
  const db = await abrirBaseDeDatos();
  const meta: ModelCacheMeta = {
    name: fileName,
    byteLength: arrayBuffer.byteLength,
    updatedAt: Date.now(),
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(arrayBuffer, PISTOL_MODEL_KEY);
    store.put(meta, PISTOL_META_KEY);
    wireWriteTx(tx, resolve, reject);
  });
}

export async function cargarPistolCache(): Promise<ArrayBuffer | null> {
  try {
    const db = await abrirBaseDeDatos();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(PISTOL_MODEL_KEY);
      req.onsuccess = () => resolve((req.result as ArrayBuffer | undefined) || null);
      req.onerror = (e) => reject((e.target as IDBRequest).error);
    });
  } catch {
    return null;
  }
}

export async function cargarPistolMeta(): Promise<ModelCacheMeta | null> {
  try {
    const db = await abrirBaseDeDatos();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(PISTOL_META_KEY);
      req.onsuccess = () => resolve((req.result as ModelCacheMeta | undefined) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function eliminarPistolCache(): Promise<void> {
  try {
    const db = await abrirBaseDeDatos();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(PISTOL_MODEL_KEY);
      store.delete(PISTOL_META_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject((e.target as IDBTransaction).error);
    });
  } catch {
    // Ignore cleanup errors
  }
}

// --- MODELOS .GLB PERSONALIZADOS DE EQUIPAMIENTO Y ARMAS (casco, chaleco, arco, flecha, palo, bastón) ---

export type CustomEquipmentMetaMap = Partial<Record<CustomEquipmentId, ModelCacheMeta>>;

export async function listarEquipmentMetaCache(): Promise<CustomEquipmentMetaMap> {
  try {
    const db = await abrirBaseDeDatos();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(CUSTOM_EQUIPMENT_META_MAP_KEY);
      req.onsuccess = () => {
        const val = req.result;
        resolve(val && typeof val === 'object' ? (val as CustomEquipmentMetaMap) : {});
      };
      req.onerror = () => resolve({});
    });
  } catch {
    return {};
  }
}

export async function guardarEquipmentCache(
  targetId: CustomEquipmentId,
  arrayBuffer: ArrayBuffer,
  fileName: string,
): Promise<CustomEquipmentMetaMap> {
  const existing = await listarEquipmentMetaCache();
  const nextMap: CustomEquipmentMetaMap = {
    ...existing,
    [targetId]: {
      name: fileName,
      byteLength: arrayBuffer.byteLength,
      updatedAt: Date.now(),
    },
  };
  const db = await abrirBaseDeDatos();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(arrayBuffer, `${CUSTOM_EQUIPMENT_BUF_PREFIX}${targetId}`);
    store.put(nextMap, CUSTOM_EQUIPMENT_META_MAP_KEY);
    wireWriteTx(tx, resolve, reject);
  });
  return nextMap;
}

export async function cargarEquipmentBuffers(
  targetIds: CustomEquipmentId[],
): Promise<Map<CustomEquipmentId, ArrayBuffer>> {
  const result = new Map<CustomEquipmentId, ArrayBuffer>();
  if (targetIds.length === 0) return result;
  try {
    const db = await abrirBaseDeDatos();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      targetIds.forEach((id) => {
        const req = store.get(`${CUSTOM_EQUIPMENT_BUF_PREFIX}${id}`);
        req.onsuccess = () => {
          if (req.result) {
            result.set(id, req.result as ArrayBuffer);
          }
        };
      });
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => resolve(result);
    });
  } catch {
    return result;
  }
}

export async function eliminarEquipmentCache(
  targetId: CustomEquipmentId,
): Promise<CustomEquipmentMetaMap> {
  const existing = await listarEquipmentMetaCache();
  const nextMap: CustomEquipmentMetaMap = { ...existing };
  delete nextMap[targetId];
  try {
    const db = await abrirBaseDeDatos();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(`${CUSTOM_EQUIPMENT_BUF_PREFIX}${targetId}`);
      store.put(nextMap, CUSTOM_EQUIPMENT_META_MAP_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject((e.target as IDBTransaction).error);
    });
  } catch {
    // Ignore cleanup errors
  }
  return nextMap;
}

// --- MODELOS .GLB DE REEMPLAZO PARA OBJETOS DEL MAPA, CAJAS E INTERACTUABLES ---

export type ObjectOverrideMetaMap = Partial<Record<WorldObjectOverrideId, ModelCacheMeta>>;

export async function listarObjectOverrideMetaCache(): Promise<ObjectOverrideMetaMap> {
  try {
    const db = await abrirBaseDeDatos();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(OBJECT_OVERRIDE_META_MAP_KEY);
      req.onsuccess = () => {
        const val = req.result;
        resolve(val && typeof val === 'object' ? (val as ObjectOverrideMetaMap) : {});
      };
      req.onerror = () => resolve({});
    });
  } catch {
    return {};
  }
}

export async function guardarObjectOverrideCache(
  targetId: WorldObjectOverrideId,
  arrayBuffer: ArrayBuffer,
  fileName: string,
): Promise<ObjectOverrideMetaMap> {
  const existing = await listarObjectOverrideMetaCache();
  const nextMap: ObjectOverrideMetaMap = {
    ...existing,
    [targetId]: {
      name: fileName,
      byteLength: arrayBuffer.byteLength,
      updatedAt: Date.now(),
    },
  };
  const db = await abrirBaseDeDatos();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(arrayBuffer, `${OBJECT_OVERRIDE_BUF_PREFIX}${targetId}`);
    store.put(nextMap, OBJECT_OVERRIDE_META_MAP_KEY);
    wireWriteTx(tx, resolve, reject);
  });
  return nextMap;
}

export async function cargarObjectOverrideBuffers(
  targetIds: WorldObjectOverrideId[],
): Promise<Map<WorldObjectOverrideId, ArrayBuffer>> {
  const result = new Map<WorldObjectOverrideId, ArrayBuffer>();
  if (targetIds.length === 0) return result;
  try {
    const db = await abrirBaseDeDatos();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      targetIds.forEach((id) => {
        const req = store.get(`${OBJECT_OVERRIDE_BUF_PREFIX}${id}`);
        req.onsuccess = () => {
          if (req.result) {
            result.set(id, req.result as ArrayBuffer);
          }
        };
      });
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => resolve(result);
    });
  } catch {
    return result;
  }
}

export async function eliminarObjectOverrideCache(
  targetId: WorldObjectOverrideId,
): Promise<ObjectOverrideMetaMap> {
  const existing = await listarObjectOverrideMetaCache();
  const nextMap: ObjectOverrideMetaMap = { ...existing };
  delete nextMap[targetId];
  try {
    const db = await abrirBaseDeDatos();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(`${OBJECT_OVERRIDE_BUF_PREFIX}${targetId}`);
      store.put(nextMap, OBJECT_OVERRIDE_META_MAP_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject((e.target as IDBTransaction).error);
    });
  } catch {
    // Ignore cleanup errors
  }
  return nextMap;
}

export async function limpiarTodosObjectOverridesCache(): Promise<void> {
  const existing = await listarObjectOverrideMetaCache();
  try {
    const db = await abrirBaseDeDatos();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      (Object.keys(existing) as WorldObjectOverrideId[]).forEach((id) => {
        store.delete(`${OBJECT_OVERRIDE_BUF_PREFIX}${id}`);
      });
      store.delete(OBJECT_OVERRIDE_META_MAP_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject((e.target as IDBTransaction).error);
    });
  } catch {
    // Ignore cleanup errors
  }
}

// --- SLOTS DE MODELOS 3D DE ENTORNO (.GLB: autos, tanques, edificaciones, árboles, follaje, props) ---

export async function listarPropSlotsCache(): Promise<WorldPropSlot[]> {
  try {
    const db = await abrirBaseDeDatos();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(PROP_SLOTS_META_KEY);
      req.onsuccess = () => {
        const list = req.result;
        resolve(Array.isArray(list) ? (list as WorldPropSlot[]) : []);
      };
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function guardarPropSlotCache(
  slotId: string,
  category: WorldPropCategory,
  arrayBuffer: ArrayBuffer,
  fileName: string,
): Promise<WorldPropSlot[]> {
  const existing = await listarPropSlotsCache();
  const nextSlot: WorldPropSlot = {
    id: slotId,
    category,
    name: fileName,
    byteLength: arrayBuffer.byteLength,
    updatedAt: Date.now(),
  };
  const nextList = [...existing.filter((s) => s.id !== slotId), nextSlot];
  const db = await abrirBaseDeDatos();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(arrayBuffer, `${PROP_BUFFER_PREFIX}${slotId}`);
    store.put(nextList, PROP_SLOTS_META_KEY);
    wireWriteTx(tx, resolve, reject);
  });
  return nextList;
}

export async function cargarPropSlotBuffer(slotId: string): Promise<ArrayBuffer | null> {
  try {
    const db = await abrirBaseDeDatos();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(`${PROP_BUFFER_PREFIX}${slotId}`);
      req.onsuccess = () => resolve((req.result as ArrayBuffer | undefined) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function cargarPropSlotBuffers(slotIds: string[]): Promise<Map<string, ArrayBuffer>> {
  const result = new Map<string, ArrayBuffer>();
  if (slotIds.length === 0) return result;
  try {
    const db = await abrirBaseDeDatos();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      slotIds.forEach((slotId) => {
        const req = store.get(`${PROP_BUFFER_PREFIX}${slotId}`);
        req.onsuccess = () => {
          if (req.result) {
            result.set(slotId, req.result as ArrayBuffer);
          }
        };
      });
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => resolve(result);
    });
  } catch {
    return result;
  }
}

export async function eliminarPropSlotCache(slotId: string): Promise<WorldPropSlot[]> {
  const existing = await listarPropSlotsCache();
  const nextList = existing.filter((s) => s.id !== slotId);
  try {
    const db = await abrirBaseDeDatos();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(`${PROP_BUFFER_PREFIX}${slotId}`);
      store.put(nextList, PROP_SLOTS_META_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject((e.target as IDBTransaction).error);
    });
  } catch {
    // Ignore
  }
  return nextList;
}

export async function guardarPlacedPropsCache(props: PlacedWorldProp[]): Promise<void> {
  try {
    const db = await abrirBaseDeDatos();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(props, PLACED_PROPS_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject((e.target as IDBTransaction).error);
    });
  } catch {
    // Ignore
  }
}

export async function cargarPlacedPropsCache(): Promise<PlacedWorldProp[]> {
  try {
    const db = await abrirBaseDeDatos();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(PLACED_PROPS_KEY);
      req.onsuccess = () => resolve(sanitizePlacedProps(req.result));
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

// --- TEXTURAS IMPORTADAS PERSONALIZADAS (.png / .jpg / .webp) ---

export interface CachedTextureRecord {
  name: string;
  mimeType: string;
  buffer: ArrayBuffer;
}

export async function guardarTextureCache(
  target: TextureTargetId,
  buffer: ArrayBuffer,
  fileName: string,
  mimeType: string,
): Promise<void> {
  const db = await abrirBaseDeDatos();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(buffer, `${TEXTURE_BUF_PREFIX}${target}`);
    store.put({ name: fileName, mimeType }, `${TEXTURE_META_PREFIX}${target}`);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject((e.target as IDBTransaction).error);
  });
}

export async function cargarTextureCache(
  target: TextureTargetId,
): Promise<CachedTextureRecord | null> {
  try {
    const db = await abrirBaseDeDatos();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const reqBuf = store.get(`${TEXTURE_BUF_PREFIX}${target}`);
      const reqMeta = store.get(`${TEXTURE_META_PREFIX}${target}`);
      let buf: ArrayBuffer | undefined;
      let meta: { name: string; mimeType: string } | undefined;
      reqBuf.onsuccess = () => {
        buf = reqBuf.result as ArrayBuffer | undefined;
      };
      reqMeta.onsuccess = () => {
        meta = reqMeta.result as { name: string; mimeType: string } | undefined;
      };
      tx.oncomplete = () => {
        if (buf && meta) {
          resolve({ name: meta.name, mimeType: meta.mimeType, buffer: buf });
        } else {
          resolve(null);
        }
      };
      tx.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function eliminarTextureCache(target: TextureTargetId): Promise<void> {
  try {
    const db = await abrirBaseDeDatos();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(`${TEXTURE_BUF_PREFIX}${target}`);
      store.delete(`${TEXTURE_META_PREFIX}${target}`);
      tx.oncomplete = () => resolve();
      tx.onerror = (e) => reject((e.target as IDBTransaction).error);
    });
  } catch {
    // Ignore
  }
}

// --- PREFERENCIAS PERSISTENTES (MAPA, POSTPROCESADO, CONTROLES) ---

export function cargarMapSettingsLocal(): MapMaterialSettings {
  try {
    const raw = localStorage.getItem(MAP_SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_MAP_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<MapMaterialSettings>;
    return { ...DEFAULT_MAP_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_MAP_SETTINGS };
  }
}

export function guardarMapSettingsLocal(settings: MapMaterialSettings): void {
  try {
    localStorage.setItem(MAP_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore
  }
}

export function cargarPostProcessLocal(): PostProcessSettings {
  try {
    const rawV2 = localStorage.getItem(POST_PROCESS_STORAGE_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as Partial<PostProcessSettings>;
      return { ...DEFAULT_POST_PROCESS, ...parsed };
    }
    const rawLegacy = localStorage.getItem(LEGACY_POST_PROCESS_STORAGE_KEY);
    if (!rawLegacy) return { ...DEFAULT_POST_PROCESS };
    const parsedLegacy = JSON.parse(rawLegacy) as Partial<PostProcessSettings>;
    const presetKey =
      parsedLegacy.preset && parsedLegacy.preset in POST_PROCESS_PRESETS
        ? parsedLegacy.preset
        : DEFAULT_POST_PROCESS.preset;
    const calibratedPreset = POST_PROCESS_PRESETS[presetKey];
    const migrated: PostProcessSettings = {
      ...DEFAULT_POST_PROCESS,
      ...parsedLegacy,
      bloomThreshold:
        typeof parsedLegacy.bloomThreshold === 'number' && parsedLegacy.bloomThreshold > 1.0
          ? parsedLegacy.bloomThreshold
          : calibratedPreset.bloomThreshold,
      bloomStrength:
        typeof parsedLegacy.bloomStrength === 'number' && parsedLegacy.bloomStrength <= 0.28
          ? parsedLegacy.bloomStrength
          : calibratedPreset.bloomStrength,
      exposure: calibratedPreset.exposure,
    };
    localStorage.setItem(POST_PROCESS_STORAGE_KEY, JSON.stringify(migrated));
    return migrated;
  } catch {
    return { ...DEFAULT_POST_PROCESS };
  }
}

export function guardarPostProcessLocal(settings: PostProcessSettings): void {
  try {
    localStorage.setItem(POST_PROCESS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore
  }
}

export function cargarTouchLayoutLocal(): TouchLayoutConfig {
  try {
    const raw = localStorage.getItem(TOUCH_LAYOUT_STORAGE_KEY);
    if (!raw) return cloneTouchLayout(DEFAULT_TOUCH_LAYOUT);
    const parsed = JSON.parse(raw) as TouchLayoutConfig;
    return cloneTouchLayout(parsed);
  } catch {
    return cloneTouchLayout(DEFAULT_TOUCH_LAYOUT);
  }
}

export function guardarTouchLayoutLocal(layout: TouchLayoutConfig): void {
  try {
    localStorage.setItem(TOUCH_LAYOUT_STORAGE_KEY, JSON.stringify(layout));
  } catch {
    // Ignore
  }
}

export function cargarCameraSettingsLocal(): CameraSettings {
  try {
    const raw = localStorage.getItem(CAMERA_SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CAMERA_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<CameraSettings>;
    return { ...DEFAULT_CAMERA_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_CAMERA_SETTINGS };
  }
}

export function guardarCameraSettingsLocal(settings: CameraSettings): void {
  try {
    localStorage.setItem(CAMERA_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore
  }
}

export function hasAttachmentTransformsLocal(): boolean {
  try {
    return localStorage.getItem(ATTACHMENT_TRANSFORMS_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export function cargarAttachmentTransformsLocal(): AttachmentTransformsState {
  try {
    const raw = localStorage.getItem(ATTACHMENT_TRANSFORMS_STORAGE_KEY);
    if (!raw) return createDefaultAttachmentTransforms();
    return sanitizeAttachmentTransforms(JSON.parse(raw));
  } catch {
    return createDefaultAttachmentTransforms();
  }
}

export function guardarAttachmentTransformsLocal(transforms: AttachmentTransformsState): void {
  try {
    localStorage.setItem(ATTACHMENT_TRANSFORMS_STORAGE_KEY, JSON.stringify(transforms));
  } catch {
    // Ignore
  }
}

// --- METADATOS DEL MANIFIESTO REMOTO EN INDEXEDDB + LOCALSTORAGE ---

const REMOTE_MANIFEST_META_IDB_KEY = 'remote_manifest_meta_v1';
const REMOTE_MANIFEST_META_LS_KEY = 'zonacero_remote_manifest_meta_v1';

export interface StoredRemoteManifestMeta {
  version: number;
  url: string;
  syncedAt: number;
  lastManifest?: unknown;
  fromIdb?: boolean;
}

export async function cargarRemoteManifestMeta(): Promise<StoredRemoteManifestMeta | null> {
  try {
    const db = await abrirBaseDeDatos();
    const idbVal = await new Promise<StoredRemoteManifestMeta | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(REMOTE_MANIFEST_META_IDB_KEY);
      req.onsuccess = () => {
        const res = req.result as StoredRemoteManifestMeta | undefined;
        resolve(res && typeof res.version === 'number' ? { ...res, fromIdb: true } : null);
      };
      req.onerror = () => resolve(null);
      tx.onabort = () => resolve(null);
    });
    if (idbVal) return idbVal;
  } catch {
    // Fallback to localStorage below
  }
  try {
    const raw = localStorage.getItem(REMOTE_MANIFEST_META_LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredRemoteManifestMeta;
    return parsed && typeof parsed.version === 'number' ? { ...parsed, fromIdb: false } : null;
  } catch {
    return null;
  }
}

export async function guardarRemoteManifestMeta(
  meta: StoredRemoteManifestMeta,
): Promise<{ idbSaved: boolean; idbError: string | null }> {
  try {
    localStorage.setItem(
      REMOTE_MANIFEST_META_LS_KEY,
      JSON.stringify({
        version: meta.version,
        url: meta.url,
        syncedAt: meta.syncedAt,
      }),
    );
  } catch {
    // Ignore localStorage quota errors
  }
  try {
    const db = await abrirBaseDeDatos();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(
        {
          version: meta.version,
          url: meta.url,
          syncedAt: meta.syncedAt,
          lastManifest: meta.lastManifest,
        },
        REMOTE_MANIFEST_META_IDB_KEY,
      );
      wireWriteTx(tx, resolve, reject);
    });
    return { idbSaved: true, idbError: null };
  } catch (err) {
    return {
      idbSaved: false,
      idbError: err instanceof Error ? err.message : String(err || 'Error al guardar en IndexedDB'),
    };
  }
}

export const DEFAULT_STUDIO_PIN = '1988';
const STUDIO_PIN_STORAGE_KEY = 'zonacero_studio_pin_v1';

export function isValidStudioPin(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

export function cargarStudioPinLocal(): string {
  try {
    const raw = localStorage.getItem(STUDIO_PIN_STORAGE_KEY);
    if (raw) {
      const clean = raw.trim();
      if (isValidStudioPin(clean)) return clean;
    }
  } catch {
    // Ignore localStorage read errors
  }
  return DEFAULT_STUDIO_PIN;
}

export function guardarStudioPinLocal(pin: string): boolean {
  const clean = pin.trim();
  if (!isValidStudioPin(clean)) return false;
  try {
    localStorage.setItem(STUDIO_PIN_STORAGE_KEY, clean);
    return true;
  } catch {
    return false;
  }
}

