import * as THREE from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import {
  createBuenosAiresTextures,
  createMoonTexture,
  getAwarenessIconTextures,
  getWaterPuddleTexture,
} from './textures';
import {
  buildFastFoodLandmark,
  FASTFOOD_CENTER_X,
  FASTFOOD_CENTER_Z,
  type FastFoodLandmark,
} from './fastFoodBuilding';
import {
  BaseCharacter,
  applyAttachmentOffsetToNode,
  captureBoneRest,
  createClipController,
  extractHumanoidBones,
  findNodeByUniversalName,
  optimizeAnimationClipOnce,
  registerSharedMeshyClips,
  resolveZombieAnimationTag,
  tagCanonicalBoneNames,
  type BoneRest,
  type CharacterAnimationTag,
  type CharacterClipRole,
  type ClipController,
  type FingerCurlBone,
  type HumanoidBoneMap,
  type StandardAnimationAction,
} from './baseCharacter';
import type {
  AttachmentTransform,
  CustomEquipmentId,
  EnemyCarriedGear,
  EnemyKind,
  EnemyRole,
  LootKind,
  MapPresetId,
  PlayerAttachableId,
  ThrowableKind,
  WorldObjectOverrideId,
  WorldPropCategory,
  ZombieAttachableId,
} from './types';

export {
  BaseCharacter,
  applyAttachmentOffsetToNode,
  captureBoneRest,
  createClipController,
  extractHumanoidBones,
  findNodeByUniversalName,
  resolveZombieAnimationTag,
  tagCanonicalBoneNames,
};
export type {
  BoneRest,
  CharacterAnimationTag,
  CharacterClipRole,
  ClipController,
  FingerCurlBone,
  HumanoidBoneMap,
  StandardAnimationAction,
};

if (typeof window !== 'undefined') {
  THREE.Cache.enabled = true;
}

export function isMobileRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    window.matchMedia?.('(pointer: coarse)')?.matches ||
      navigator.maxTouchPoints > 0 ||
      window.innerWidth < 960,
  );
}

let sharedGltfLoader: GLTFLoader | null = null;
let sharedDracoLoader: DRACOLoader | null = null;

function markShared<T extends { userData: Record<string, unknown> }>(res: T): T {
  res.userData.isSharedResource = true;
  return res;
}

function sniffImageMime(bytes: Uint8Array): string {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return 'image/png';
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  if (bytes.length >= 4 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return 'image/gif';
  }
  return 'image/png';
}

let fallbackWhiteCanvas: HTMLCanvasElement | null = null;
function getFallbackWhiteCanvas(): HTMLCanvasElement {
  if (!fallbackWhiteCanvas) {
    fallbackWhiteCanvas = document.createElement('canvas');
    fallbackWhiteCanvas.width = 1;
    fallbackWhiteCanvas.height = 1;
    const ctx = fallbackWhiteCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 1, 1);
    }
  }
  return fallbackWhiteCanvas;
}

class ResilientGltfTextureLoader extends THREE.Loader {
  public readonly isImageBitmapLoader = false;

  override load(
    url: string,
    onLoad: (tex: THREE.Texture) => void,
    _onProgress?: (event: ProgressEvent) => void,
    _onError?: (err: unknown) => void,
  ): THREE.Texture {
    const tex = new THREE.Texture();
    const img = new Image();
    img.crossOrigin = this.crossOrigin || 'anonymous';
    let settled = false;

    const finishWithImage = (source: TexImageSource) => {
      if (settled) return;
      settled = true;
      tex.image = source;
      tex.needsUpdate = true;
      onLoad(tex);
    };

    const finishWithFallback = () => {
      finishWithImage(getFallbackWhiteCanvas());
    };

    const tryMagicByteDecode = async () => {
      if (!url.startsWith('blob:') && !url.startsWith('data:')) {
        finishWithFallback();
        return;
      }
      try {
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        const bytes = new Uint8Array(buf);
        const mime = sniffImageMime(bytes);
        const fixedBlob = new Blob([bytes], { type: mime });
        if (typeof createImageBitmap === 'function') {
          const bitmap = await createImageBitmap(fixedBlob);
          finishWithImage(bitmap);
          return;
        }
        const fixedUrl = URL.createObjectURL(fixedBlob);
        const retryImg = new Image();
        retryImg.onload = () => {
          URL.revokeObjectURL(fixedUrl);
          finishWithImage(retryImg);
        };
        retryImg.onerror = () => {
          URL.revokeObjectURL(fixedUrl);
          finishWithFallback();
        };
        retryImg.src = fixedUrl;
      } catch {
        finishWithFallback();
      }
    };

    img.onload = () => {
      finishWithImage(img);
    };
    img.onerror = () => {
      void tryMagicByteDecode();
    };
    img.src = this.manager.resolveURL(url);
    return tex;
  }
}

function getSharedGltfLoader(): GLTFLoader {
  if (!sharedGltfLoader) {
    sharedGltfLoader = new GLTFLoader();
    sharedDracoLoader = new DRACOLoader();
    sharedDracoLoader.setDecoderPath('/draco/');
    sharedGltfLoader.setDRACOLoader(sharedDracoLoader);
    sharedGltfLoader.setMeshoptDecoder(MeshoptDecoder);
    sharedGltfLoader.register((parser) => ({
      name: 'resilient_gltf_texture_loader',
      beforeRoot() {
        const p = parser as unknown as {
          textureLoader: THREE.Loader;
          options: { manager: THREE.LoadingManager; crossOrigin: string };
        };
        const safeLoader = new ResilientGltfTextureLoader(p.options.manager);
        safeLoader.setCrossOrigin(p.options.crossOrigin);
        p.textureLoader = safeLoader;
        return null;
      },
    }));
  }
  return sharedGltfLoader;
}

function hashArrayBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let hash = 2166136261 >>> 0;
  const step = Math.max(1, Math.floor(bytes.length / 4096));
  for (let i = 0; i < bytes.length; i += step) {
    hash ^= bytes[i];
    hash = Math.imul(hash, 16777619);
  }
  return `${bytes.length}:${hash >>> 0}`;
}

interface CachedGlbEntry {
  key: string;
  promise: Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }>;
  refCount: number;
  resolved: { scene: THREE.Group; animations: THREE.AnimationClip[] } | null;
}

const glbParseCache = new Map<string, CachedGlbEntry>();

export async function acquireParsedGlb(
  buffer: ArrayBuffer,
  cacheTag: string,
): Promise<{
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
  release: () => void;
}> {
  const key = `${cacheTag}:${hashArrayBuffer(buffer)}`;
  let entry = glbParseCache.get(key);
  if (!entry) {
    const loader = getSharedGltfLoader();
    const promise = new Promise<GLTF>((resolve, reject) => {
      loader.parse(buffer, '', resolve, reject);
    }).then((gltf) => {
      const mobile = isMobileRuntime();
      optimizeGltfSceneResources(gltf.scene, {
        maxTextureSize: mobile ? 768 : 1024,
        maxDataTextureSize: mobile ? 512 : 1024,
      });
      for (let i = 0; i < gltf.animations.length; i++) {
        optimizeAnimationClipOnce(gltf.animations[i]);
      }
      if (gltf.animations.length > 0) {
        registerSharedMeshyClips(gltf.animations);
      }
      const resolved = { scene: gltf.scene, animations: gltf.animations };
      if (entry) entry.resolved = resolved;
      return resolved;
    });

    entry = {
      key,
      promise,
      refCount: 0,
      resolved: null,
    };
    glbParseCache.set(key, entry);
  }

  entry.refCount += 1;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    const current = glbParseCache.get(key);
    if (!current) return;
    current.refCount = Math.max(0, current.refCount - 1);
    if (current.refCount === 0) {
      glbParseCache.delete(key);
      if (current.resolved) {
        disposeObject3DResources(current.resolved.scene, true, true);
        current.resolved = null;
      } else {
        void current.promise
          .then((res) => {
            disposeObject3DResources(res.scene, true, true);
          })
          .catch(() => {});
      }
    }
  };

  try {
    const parsed = await entry.promise;
    const clonedScene = SkeletonUtils.clone(parsed.scene) as THREE.Group;
    return {
      scene: clonedScene,
      animations: parsed.animations,
      release,
    };
  } catch (err) {
    release();
    throw err;
  }
}

const COLOR_TEXTURE_SLOTS = ['map', 'emissiveMap'] as const;
const DATA_TEXTURE_SLOTS = [
  'normalMap',
  'roughnessMap',
  'metalnessMap',
  'aoMap',
  'alphaMap',
  'bumpMap',
  'displacementMap',
  'specularMap',
  'envMap',
] as const;
const MATERIAL_TEXTURE_SLOTS = [...COLOR_TEXTURE_SLOTS, ...DATA_TEXTURE_SLOTS] as const;

function downscaleTextureIfNeeded(
  tex: THREE.Texture,
  maxDim: number,
  maxAniso: number,
  cache: Map<THREE.Texture, THREE.Texture>,
  bitmapsToClose: Set<ImageBitmap>,
): THREE.Texture {
  const cached = cache.get(tex);
  if (cached) return cached;

  const img = tex.image as
    | (HTMLImageElement & { naturalWidth?: number; naturalHeight?: number })
    | ImageBitmap
    | HTMLCanvasElement
    | undefined;
  if (!img) {
    tex.anisotropy = Math.min(maxAniso, tex.anisotropy || maxAniso);
    cache.set(tex, tex);
    return tex;
  }

  const w = (img as HTMLImageElement).naturalWidth || img.width || 0;
  const h = (img as HTMLImageElement).naturalHeight || img.height || 0;
  if (w <= maxDim && h <= maxDim) {
    tex.anisotropy = Math.min(maxAniso, tex.anisotropy || maxAniso);
    cache.set(tex, tex);
    return tex;
  }

  const scale = maxDim / Math.max(w, h);
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement('canvas');
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    cache.set(tex, tex);
    return tex;
  }
  ctx.drawImage(img as CanvasImageSource, 0, 0, tw, th);

  const resized = new THREE.CanvasTexture(canvas);
  resized.name = tex.name;
  resized.colorSpace = tex.colorSpace;
  resized.wrapS = tex.wrapS;
  resized.wrapT = tex.wrapT;
  resized.flipY = tex.flipY;
  resized.repeat.copy(tex.repeat);
  resized.offset.copy(tex.offset);
  resized.center.copy(tex.center);
  resized.rotation = tex.rotation;
  resized.magFilter = tex.magFilter;
  resized.minFilter = tex.minFilter;
  resized.generateMipmaps = tex.generateMipmaps;
  resized.anisotropy = Math.min(maxAniso, tex.anisotropy || maxAniso);
  resized.needsUpdate = true;

  if (typeof ImageBitmap !== 'undefined' && img instanceof ImageBitmap) {
    bitmapsToClose.add(img);
  }
  tex.dispose();
  cache.set(tex, resized);
  return resized;
}

function optimizeGltfSceneResources(
  root: THREE.Object3D,
  options: {
    maxTextureSize?: number;
    maxDataTextureSize?: number;
    freezeStaticChildren?: boolean;
  } = {},
) {
  const mobile = isMobileRuntime();
  const maxTexSize = Math.min(1024, options.maxTextureSize ?? (mobile ? 768 : 1024));
  const maxDataSize = Math.min(1024, options.maxDataTextureSize ?? (mobile ? 512 : 1024));
  const maxAniso = mobile ? 2 : 4;
  const texCache = new Map<THREE.Texture, THREE.Texture>();
  const visitedMats = new Set<THREE.Material>();
  const bitmapsToClose = new Set<ImageBitmap>();

  root.traverse((child) => {
    if (options.freezeStaticChildren && child !== root) {
      child.updateMatrix();
      child.matrixAutoUpdate = false;
    }
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((mat) => {
        if (!mat || visitedMats.has(mat)) return;
        visitedMats.add(mat);
        const rec = mat as unknown as Record<string, unknown>;
        for (let i = 0; i < COLOR_TEXTURE_SLOTS.length; i++) {
          const slot = COLOR_TEXTURE_SLOTS[i];
          const val = rec[slot];
          if (val && (val as THREE.Texture).isTexture) {
            rec[slot] = downscaleTextureIfNeeded(
              val as THREE.Texture,
              maxTexSize,
              maxAniso,
              texCache,
              bitmapsToClose,
            );
          }
        }
        for (let i = 0; i < DATA_TEXTURE_SLOTS.length; i++) {
          const slot = DATA_TEXTURE_SLOTS[i];
          const val = rec[slot];
          if (val && (val as THREE.Texture).isTexture) {
            rec[slot] = downscaleTextureIfNeeded(
              val as THREE.Texture,
              maxDataSize,
              maxAniso,
              texCache,
              bitmapsToClose,
            );
          }
        }
        mat.needsUpdate = true;
      });
    }
  });

  bitmapsToClose.forEach((bmp) => {
    try {
      bmp.close();
    } catch {
      // Ignore already-closed ImageBitmap
    }
  });
}

function freezeObjectStaticHierarchy(root: THREE.Object3D) {
  root.traverse((child) => {
    if (child !== root) {
      child.updateMatrix();
      child.matrixAutoUpdate = false;
    }
  });
}

export function disposeObject3DResources(
  root: THREE.Object3D,
  disposeTextures = true,
  forceShared = false,
) {
  const geos = new Set<THREE.BufferGeometry>();
  const mats = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();

  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry && (forceShared || !mesh.geometry.userData?.isSharedResource)) {
        geos.add(mesh.geometry);
      }
      const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      list.forEach((mat) => {
        if (!mat) return;
        if (!forceShared && mat.userData?.isSharedResource) return;
        mats.add(mat);
        if (disposeTextures) {
          const rec = mat as unknown as Record<string, unknown>;
          for (let i = 0; i < MATERIAL_TEXTURE_SLOTS.length; i++) {
            const val = rec[MATERIAL_TEXTURE_SLOTS[i]];
            if (val && (val as THREE.Texture).isTexture) {
              textures.add(val as THREE.Texture);
            }
          }
        }
      });
    }
  });

  textures.forEach((t) => {
    if (typeof ImageBitmap !== 'undefined' && t.image instanceof ImageBitmap) {
      try {
        t.image.close();
      } catch {
        // Ignore already-closed ImageBitmap
      }
    }
    t.dispose();
  });
  mats.forEach((m) => m.dispose());
  geos.forEach((g) => g.dispose());
}

export const ARENA_HALF_X = 104;
export const ARENA_HALF_Z = 114;
export const ARENA_PLAYABLE_RADIUS = 118;
export const WORLD_TERRAIN_SIZE = 380;
export const CAMPFIRE_X = 6.2;
export const CAMPFIRE_Z = 8.4;
export const CAMPFIRE_SAFE_RADIUS = 7.4;
export const PLAYER_SPAWN_X = 0;
export const PLAYER_SPAWN_Z = 14.5;
export const COLON_ENTRANCE_X = -38.8;
export const COLON_ENTRANCE_Z = -22.5;
export const COLON_BUILDING_X = -52.5;
export const COLON_BUILDING_Z = -22.5;
export const COLON_SAFE_RADIUS = 4.4;

let terrainReliefScale = 1.0;
let activeMapPreset: MapPresetId = 'buenos_aires';

export function setTerrainReliefScale(scale: number) {
  terrainReliefScale = THREE.MathUtils.clamp(scale, 0, 2.2);
}

export function setActiveMapPreset(preset: MapPresetId) {
  activeMapPreset = preset;
}

export function getActiveMapPreset(): MapPresetId {
  return activeMapPreset;
}

export function getCampfireCoords(preset: MapPresetId = activeMapPreset): { x: number; z: number } {
  if (preset === 'custom_sandbox') {
    return { x: 0, z: 0 };
  }
  return { x: CAMPFIRE_X, z: CAMPFIRE_Z };
}

export function getPlayerSpawnCoords(preset: MapPresetId = activeMapPreset): { x: number; z: number } {
  if (preset === 'custom_sandbox') {
    return { x: 0, z: 4.8 };
  }
  return { x: PLAYER_SPAWN_X, z: PLAYER_SPAWN_Z };
}

function isCrossStreetZ(az: number): boolean {
  return (
    az < 7.5 ||
    (az >= 35.0 && az <= 45.0) ||
    (az >= 73.0 && az <= 83.0) ||
    (az >= 106.5 && az <= 115.0)
  );
}

export interface StreetPothole {
  x: number;
  z: number;
  radius: number;
  depth: number;
}

export interface MissingAsphaltPatch {
  x: number;
  z: number;
  rx: number;
  rz: number;
  rotY: number;
  kind: 'dirt' | 'cobble';
}

export const STREET_POTHOLES: StreetPothole[] = [
  // Av. 9 de Julio Southbound & Northbound lanes + Plaza approaches
  { x: -25.5, z: 18.2, radius: 1.95, depth: 0.21 },
  { x: -29.2, z: -14.8, radius: 2.15, depth: 0.22 },
  { x: -22.8, z: -29.5, radius: 1.75, depth: 0.18 },
  { x: -26.5, z: 48.0, radius: 2.25, depth: 0.23 },
  { x: -31.0, z: -56.0, radius: 1.85, depth: 0.19 },
  { x: -24.5, z: 86.0, radius: 2.1, depth: 0.2 },
  { x: -29.5, z: -92.0, radius: 1.9, depth: 0.19 },
  { x: 25.0, z: 10.5, radius: 1.85, depth: 0.2 },
  { x: 29.8, z: -18.5, radius: 2.2, depth: 0.22 },
  { x: 22.6, z: 32.0, radius: 1.7, depth: 0.17 },
  { x: 27.4, z: -48.0, radius: 2.3, depth: 0.23 },
  { x: 31.8, z: 62.0, radius: 1.95, depth: 0.2 },
  { x: 23.8, z: -84.0, radius: 2.05, depth: 0.21 },
  { x: 28.5, z: 95.0, radius: 1.85, depth: 0.18 },
  // Center Avenue around Obelisco approaches (clear of spawn & campfire)
  { x: -5.4, z: 22.5, radius: 1.8, depth: 0.19 },
  { x: 4.8, z: -22.0, radius: 1.9, depth: 0.2 },
  { x: -4.6, z: -41.5, radius: 2.1, depth: 0.21 },
  { x: 5.5, z: 42.5, radius: 2.0, depth: 0.2 },
  { x: -6.2, z: 68.0, radius: 1.85, depth: 0.18 },
  { x: 5.2, z: -72.0, radius: 2.05, depth: 0.21 },
  // Cross-streets (Corrientes, Lavalle, Sarmiento) & Side Streets (Libertad / Suipacha)
  { x: -46.0, z: -1.8, radius: 1.95, depth: 0.2 },
  { x: 46.5, z: 2.4, radius: 1.85, depth: 0.19 },
  { x: -70.5, z: -26.0, radius: 2.05, depth: 0.21 },
  { x: -70.5, z: 28.0, radius: 1.9, depth: 0.19 },
  { x: 70.5, z: -28.0, radius: 2.0, depth: 0.2 },
  { x: 70.5, z: 48.0, radius: 2.15, depth: 0.21 },
];

export const MISSING_ASPHALT_PATCHES: MissingAsphaltPatch[] = [
  { x: -23.5, z: 5.5, rx: 2.4, rz: 1.7, rotY: 0.35, kind: 'cobble' },
  { x: -30.5, z: 23.0, rx: 2.8, rz: 1.9, rotY: -0.4, kind: 'dirt' },
  { x: -21.8, z: -11.5, rx: 2.2, rz: 1.6, rotY: 0.8, kind: 'cobble' },
  { x: -27.5, z: -38.5, rx: 3.1, rz: 2.1, rotY: 0.15, kind: 'dirt' },
  { x: -24.0, z: 58.0, rx: 2.6, rz: 1.8, rotY: -0.6, kind: 'cobble' },
  { x: -30.8, z: -74.0, rx: 2.9, rz: 2.0, rotY: 0.52, kind: 'dirt' },
  { x: 22.8, z: -3.5, rx: 2.5, rz: 1.7, rotY: -0.28, kind: 'cobble' },
  { x: 28.6, z: 18.0, rx: 2.9, rz: 2.0, rotY: 0.48, kind: 'dirt' },
  { x: 23.2, z: -26.0, rx: 2.3, rz: 1.6, rotY: -0.75, kind: 'cobble' },
  { x: 30.2, z: 44.0, rx: 2.7, rz: 1.9, rotY: 0.22, kind: 'dirt' },
  { x: 24.8, z: -66.0, rx: 2.5, rz: 1.8, rotY: -0.45, kind: 'cobble' },
  { x: -4.2, z: 15.8, rx: 2.1, rz: 1.4, rotY: 0.42, kind: 'cobble' },
  { x: 3.5, z: -15.5, rx: 2.2, rz: 1.5, rotY: -0.35, kind: 'dirt' },
  { x: -3.8, z: -33.0, rx: 2.6, rz: 1.7, rotY: 0.65, kind: 'cobble' },
  { x: 4.5, z: 36.5, rx: 2.4, rz: 1.6, rotY: -0.5, kind: 'dirt' },
  { x: -41.5, z: 2.2, rx: 2.3, rz: 1.7, rotY: 0.2, kind: 'cobble' },
  { x: 41.0, z: -2.5, rx: 2.5, rz: 1.8, rotY: -0.3, kind: 'dirt' },
  { x: -70.5, z: -4.0, rx: 2.4, rz: 1.8, rotY: 0.55, kind: 'cobble' },
  { x: 70.5, z: 2.0, rx: 2.5, rz: 1.7, rotY: -0.62, kind: 'dirt' },
  { x: -70.5, z: 54.0, rx: 2.6, rz: 1.9, rotY: 0.3, kind: 'dirt' },
  { x: 70.5, z: -56.0, rx: 2.4, rz: 1.8, rotY: -0.4, kind: 'cobble' },
  { x: -84.0, z: -39.5, rx: 2.5, rz: 1.7, rotY: 0.12, kind: 'dirt' },
  { x: 84.0, z: 40.5, rx: 2.4, rz: 1.7, rotY: -0.18, kind: 'cobble' },
];

export function isOnPotholeOrPatch(x: number, z: number): boolean {
  if (activeMapPreset === 'custom_sandbox') return false;
  for (let i = 0; i < STREET_POTHOLES.length; i++) {
    const p = STREET_POTHOLES[i];
    const dx = x - p.x;
    const dz = z - p.z;
    if (dx * dx + dz * dz <= (p.radius + 0.35) * (p.radius + 0.35)) return true;
  }
  for (let i = 0; i < MISSING_ASPHALT_PATCHES.length; i++) {
    const pa = MISSING_ASPHALT_PATCHES[i];
    const dx = x - pa.x;
    const dz = z - pa.z;
    const r = Math.max(pa.rx, pa.rz);
    if (dx * dx + dz * dz <= r * r) return true;
  }
  return false;
}

export interface WaterPuddle {
  x: number;
  z: number;
  rx: number;
  rz: number;
  rotY: number;
}

export const WATER_PUDDLES: WaterPuddle[] = [
  // Rainwater puddles settled inside Av. 9 de Julio potholes & near sidewalks/curbs
  { x: -25.5, z: 18.2, rx: 1.48, rz: 1.24, rotY: 0.35 },
  { x: -29.2, z: -14.8, rx: 1.65, rz: 1.38, rotY: -0.45 },
  { x: -22.8, z: -29.5, rx: 1.32, rz: 1.12, rotY: 0.8 },
  { x: -26.5, z: 48.0, rx: 1.72, rz: 1.42, rotY: -0.2 },
  { x: -24.5, z: 86.0, rx: 1.55, rz: 1.3, rotY: 0.6 },
  { x: 25.0, z: 10.5, rx: 1.42, rz: 1.18, rotY: -0.5 },
  { x: 29.8, z: -18.5, rx: 1.68, rz: 1.38, rotY: 0.4 },
  { x: 22.6, z: 32.0, rx: 1.32, rz: 1.1, rotY: -0.75 },
  { x: 27.4, z: -48.0, rx: 1.75, rz: 1.45, rotY: 0.25 },
  { x: -5.4, z: 22.5, rx: 1.38, rz: 1.15, rotY: 0.55 },
  { x: 4.8, z: -22.0, rx: 1.44, rz: 1.22, rotY: -0.35 },
  { x: -4.6, z: -41.5, rx: 1.58, rz: 1.32, rotY: 0.9 },
  { x: 5.5, z: 42.5, rx: 1.5, rz: 1.25, rotY: -0.6 },
  { x: -13.2, z: 15.2, rx: 1.35, rz: 0.95, rotY: 0.15 },
  { x: 13.4, z: 14.5, rx: 1.4, rz: 0.92, rotY: -0.18 },
  { x: -18.8, z: -6.5, rx: 1.25, rz: 0.88, rotY: 0.12 },
  { x: 19.2, z: 22.4, rx: 1.3, rz: 0.92, rotY: -0.1 },
  { x: -46.0, z: -1.8, rx: 1.48, rz: 1.24, rotY: 0.7 },
  { x: 46.5, z: 2.4, rx: 1.42, rz: 1.18, rotY: -0.4 },
  { x: -37.8, z: -19.2, rx: 1.35, rz: 0.95, rotY: 0.22 },
];

export function isPointInWaterPuddle(x: number, z: number): boolean {
  if (activeMapPreset === 'custom_sandbox') return false;
  for (let i = 0; i < WATER_PUDDLES.length; i++) {
    const p = WATER_PUDDLES[i];
    const dx = x - p.x;
    const dz = z - p.z;
    const maxR = Math.max(p.rx, p.rz) + 0.18;
    if (dx * dx + dz * dz > maxR * maxR) continue;
    const cos = Math.cos(p.rotY);
    const sin = Math.sin(p.rotY);
    const lx = dx * cos - dz * sin;
    const lz = dx * sin + dz * cos;
    const nx = lx / p.rx;
    const nz = lz / p.rz;
    if (nx * nx + nz * nz <= 1.0) return true;
  }
  return false;
}

export function isPointInPlazaTallGrass(x: number, z: number): boolean {
  if (activeMapPreset === 'custom_sandbox') return false;
  if (Math.abs(x) > 7.25) return false;
  const inNorthLawn = z >= -10.75 && z <= -4.45;
  const inSouthLawn = z >= 2.65 && z <= 8.95;
  if (!inNorthLawn && !inSouthLawn) return false;
  if (inSouthLawn) {
    // Exclude solid "BA" monument plinth footprint
    if (Math.abs(x) < 3.45 && Math.abs(z - 5.4) < 1.08) return false;
    // Exclude campfire stones & hearth pit
    const cdx = x - CAMPFIRE_X;
    const cdz = z - CAMPFIRE_Z;
    if (cdx * cdx + cdz * cdz < 1.55 * 1.55) return false;
  }
  return true;
}

export type LooseLightPropKind = 'can' | 'bottle' | 'cone' | 'box';

export interface LooseLightPropSeed {
  kind: LooseLightPropKind;
  x: number;
  z: number;
  rotY: number;
  scale: number;
}

export const LOOSE_LIGHT_PROP_SEEDS: LooseLightPropSeed[] = [
  // Cans & bottles scattered along Plaza edges, curbs, crosswalks & Metrobus lanes
  { kind: 'can', x: -3.2, z: 14.8, rotY: 0.5, scale: 1.0 },
  { kind: 'bottle', x: 3.4, z: 15.6, rotY: 1.1, scale: 1.0 },
  { kind: 'can', x: -7.8, z: 16.4, rotY: 2.1, scale: 0.95 },
  { kind: 'bottle', x: 7.4, z: 13.8, rotY: 0.2, scale: 1.05 },
  { kind: 'cone', x: -12.8, z: 12.2, rotY: 0.4, scale: 1.0 },
  { kind: 'cone', x: 12.8, z: 11.8, rotY: -0.3, scale: 1.0 },
  { kind: 'box', x: -14.2, z: 8.6, rotY: 0.25, scale: 1.0 },
  { kind: 'box', x: 14.4, z: 6.4, rotY: -0.4, scale: 0.92 },
  { kind: 'can', x: -16.2, z: 2.5, rotY: 1.7, scale: 1.0 },
  { kind: 'bottle', x: -18.5, z: -12.4, rotY: 0.9, scale: 1.0 },
  { kind: 'cone', x: -20.6, z: 17.5, rotY: 0.15, scale: 1.0 },
  { kind: 'cone', x: -21.2, z: -19.5, rotY: -0.25, scale: 1.0 },
  { kind: 'can', x: -23.5, z: 11.4, rotY: 2.6, scale: 1.05 },
  { kind: 'bottle', x: -27.2, z: -4.8, rotY: 1.4, scale: 1.0 },
  { kind: 'box', x: -29.8, z: 24.5, rotY: 0.72, scale: 1.05 },
  { kind: 'cone', x: 20.8, z: 16.2, rotY: 0.35, scale: 1.0 },
  { kind: 'cone', x: 21.5, z: -16.8, rotY: -0.45, scale: 1.0 },
  { kind: 'can', x: 24.2, z: 6.8, rotY: 0.8, scale: 1.0 },
  { kind: 'bottle', x: 26.8, z: -8.5, rotY: 2.3, scale: 1.05 },
  { kind: 'box', x: 32.4, z: 14.2, rotY: -0.55, scale: 0.95 },
  { kind: 'can', x: -11.6, z: -15.4, rotY: 1.3, scale: 1.0 },
  { kind: 'bottle', x: 11.2, z: -16.2, rotY: 2.8, scale: 1.0 },
  { kind: 'box', x: -6.4, z: -18.5, rotY: 0.48, scale: 1.0 },
  { kind: 'can', x: 6.5, z: -20.2, rotY: 0.15, scale: 1.0 },
  { kind: 'cone', x: -14.8, z: -24.5, rotY: 0.9, scale: 1.0 },
  { kind: 'cone', x: 14.5, z: -25.2, rotY: -0.6, scale: 1.0 },
  { kind: 'bottle', x: -24.5, z: -32.0, rotY: 1.9, scale: 1.0 },
  { kind: 'can', x: 25.4, z: -34.2, rotY: 0.65, scale: 1.0 },
  { kind: 'box', x: -38.4, z: -6.2, rotY: 0.3, scale: 1.0 },
  { kind: 'can', x: -39.5, z: 12.4, rotY: 2.1, scale: 1.0 },
  { kind: 'bottle', x: -41.2, z: -22.5, rotY: 0.4, scale: 1.0 },
  { kind: 'cone', x: -44.2, z: -16.5, rotY: 0.2, scale: 1.0 },
  { kind: 'box', x: -47.5, z: 8.5, rotY: -0.35, scale: 1.05 },
  { kind: 'can', x: 38.6, z: -8.4, rotY: 1.5, scale: 1.0 },
  { kind: 'bottle', x: 40.2, z: 14.6, rotY: 2.4, scale: 1.0 },
  { kind: 'cone', x: 42.8, z: -19.5, rotY: -0.2, scale: 1.0 },
  { kind: 'box', x: 46.5, z: -12.4, rotY: 0.6, scale: 0.98 },
  { kind: 'can', x: -28.0, z: 36.5, rotY: 1.1, scale: 1.0 },
  { kind: 'bottle', x: 28.4, z: 38.2, rotY: 0.75, scale: 1.0 },
  { kind: 'box', x: -12.5, z: 32.8, rotY: -0.25, scale: 1.0 },
  { kind: 'cone', x: 12.8, z: 34.0, rotY: 0.42, scale: 1.0 },
  { kind: 'can', x: -5.2, z: 29.4, rotY: 2.9, scale: 1.0 },
  { kind: 'bottle', x: 5.8, z: 31.2, rotY: 1.6, scale: 1.0 },
  { kind: 'box', x: -33.5, z: -26.5, rotY: 0.18, scale: 1.0 },
  { kind: 'can', x: -55.2, z: -26.0, rotY: 0.9, scale: 1.0 },
  { kind: 'bottle', x: -58.4, z: -29.2, rotY: 2.2, scale: 1.0 },
  { kind: 'cone', x: -64.0, z: -24.5, rotY: 0.5, scale: 1.0 },
  { kind: 'box', x: 56.2, z: 22.5, rotY: -0.45, scale: 1.0 },
];

export function groundHeightAt(x: number, z: number): number {
  if (activeMapPreset === 'custom_sandbox') {
    const dist = Math.hypot(x, z);
    if (dist <= ARENA_PLAYABLE_RADIUS + 4) {
      return 0;
    }
    return THREE.MathUtils.smoothstep(dist, 114, 155) * 3.4 * terrainReliefScale;
  }

  const ax = Math.abs(x);
  const az = Math.abs(z);

  // Plaza de la República central esplanade (wider granite boulevard island)
  const plazaDx = Math.max(0, ax - 10.0);
  const plazaDz = Math.max(0, az - 11.5);
  const plazaDist = Math.hypot(plazaDx, plazaDz);
  const plazaStep = (1 - THREE.MathUtils.smoothstep(plazaDist, 0.0, 0.7)) * 0.1;

  // Metrobus 9 de Julio boarding island platforms along all 3 North & 3 South blocks
  const onMbZ =
    Math.abs(az - 20.5) < 5.0 ||
    Math.abs(az - 58.0) < 5.0 ||
    Math.abs(az - 96.0) < 5.0;
  const mbIsland = Math.abs(ax - 14.2) < 1.65 && onMbZ ? 0.14 : 0;

  // Urban block sidewalks (Cerrito/Pellegrini 1st block ring & Libertad/Suipacha 2nd block ring)
  let sidewalkStep = 0;
  if (!isCrossStreetZ(az)) {
    if (ax >= 36.0 && ax <= 65.0) {
      const innerEdge = THREE.MathUtils.smoothstep(ax, 35.8, 36.5);
      const outerEdge = 1 - THREE.MathUtils.smoothstep(ax, 64.5, 65.2);
      sidewalkStep = Math.min(innerEdge, outerEdge) * 0.12;
    } else if (ax >= 76.0 && ax <= 100.0) {
      const innerEdge = THREE.MathUtils.smoothstep(ax, 75.8, 76.5);
      const outerEdge = 1 - THREE.MathUtils.smoothstep(ax, 99.5, 100.2);
      sidewalkStep = Math.min(innerEdge, outerEdge) * 0.12;
    }
  }

  const relief = THREE.MathUtils.clamp(terrainReliefScale, 0.5, 1.8);
  const raised = Math.max(plazaStep, mbIsland, sidewalkStep);
  if (raised > 0.02) {
    return raised * relief;
  }

  let potholeDip = 0;
  for (let i = 0; i < STREET_POTHOLES.length; i++) {
    const p = STREET_POTHOLES[i];
    const dx = x - p.x;
    const dz = z - p.z;
    const dSq = dx * dx + dz * dz;
    if (dSq < p.radius * p.radius) {
      const d = Math.sqrt(dSq);
      const t = 1 - THREE.MathUtils.smoothstep(d, p.radius * 0.18, p.radius);
      potholeDip = Math.min(potholeDip, -p.depth * t);
    }
  }
  return potholeDip * relief;
}

// Bone mapping & universal hand calibration live in ./baseCharacter.ts

export interface RifleInstance {
  group: THREE.Group;
  foregripTarget: THREE.Object3D;
  muzzleNode: THREE.Object3D;
  dispose: () => void;
}

export interface CustomRifleTemplate {
  scene: THREE.Group;
  foregripPos: THREE.Vector3;
  muzzlePos: THREE.Vector3;
  dispose: () => void;
}

let sharedDefaultRifleRes: {
  gunMetalMat: THREE.MeshStandardMaterial;
  gripMat: THREE.MeshStandardMaterial;
  handguardMat: THREE.MeshStandardMaterial;
  sightMat: THREE.MeshStandardMaterial;
  stockGeo: THREE.BoxGeometry;
  buttPadGeo: THREE.BoxGeometry;
  pistolGripGeo: THREE.BoxGeometry;
  triggerGuardGeo: THREE.BoxGeometry;
  receiverGeo: THREE.BoxGeometry;
  handguardGeo: THREE.BoxGeometry;
  angledForegripGeo: THREE.BoxGeometry;
  barrelGeo: THREE.CylinderGeometry;
  muzzleBrakeGeo: THREE.CylinderGeometry;
  magGeo: THREE.BoxGeometry;
  opticGeo: THREE.BoxGeometry;
  dispose: () => void;
} | null = null;

function getSharedDefaultRifleRes() {
  if (!sharedDefaultRifleRes) {
    const gunMetalMat = markShared(
      new THREE.MeshStandardMaterial({
        color: 0x1b1f25,
        roughness: 0.26,
        metalness: 0.88,
      }),
    );
    const gripMat = markShared(
      new THREE.MeshStandardMaterial({
        color: 0x18181b,
        roughness: 0.85,
        metalness: 0.08,
      }),
    );
    const handguardMat = markShared(
      new THREE.MeshStandardMaterial({
        color: 0x2a2f36,
        roughness: 0.65,
        metalness: 0.35,
      }),
    );
    const sightMat = markShared(
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: new THREE.Color(0xf59e0b),
        emissiveIntensity: 1.7,
        roughness: 0.2,
      }),
    );
    const stockGeo = markShared(new THREE.BoxGeometry(0.056, 0.104, 0.165));
    const buttPadGeo = markShared(new THREE.BoxGeometry(0.062, 0.118, 0.028));
    const pistolGripGeo = markShared(new THREE.BoxGeometry(0.042, 0.116, 0.056));
    const triggerGuardGeo = markShared(new THREE.BoxGeometry(0.024, 0.032, 0.048));
    const receiverGeo = markShared(new THREE.BoxGeometry(0.072, 0.098, 0.275));
    const handguardGeo = markShared(new THREE.BoxGeometry(0.064, 0.082, 0.225));
    const angledForegripGeo = markShared(new THREE.BoxGeometry(0.042, 0.056, 0.072));
    const barrelGeo = markShared(new THREE.CylinderGeometry(0.017, 0.021, 0.32, 8));
    barrelGeo.rotateX(Math.PI / 2);
    const muzzleBrakeGeo = markShared(new THREE.CylinderGeometry(0.023, 0.023, 0.055, 8));
    muzzleBrakeGeo.rotateX(Math.PI / 2);
    const magGeo = markShared(new THREE.BoxGeometry(0.048, 0.168, 0.074));
    const opticGeo = markShared(new THREE.BoxGeometry(0.04, 0.044, 0.105));

    sharedDefaultRifleRes = {
      gunMetalMat,
      gripMat,
      handguardMat,
      sightMat,
      stockGeo,
      buttPadGeo,
      pistolGripGeo,
      triggerGuardGeo,
      receiverGeo,
      handguardGeo,
      angledForegripGeo,
      barrelGeo,
      muzzleBrakeGeo,
      magGeo,
      opticGeo,
      dispose: () => {
        [
          stockGeo,
          buttPadGeo,
          pistolGripGeo,
          triggerGuardGeo,
          receiverGeo,
          handguardGeo,
          angledForegripGeo,
          barrelGeo,
          muzzleBrakeGeo,
          magGeo,
          opticGeo,
        ].forEach((g) => g.dispose());
        [gunMetalMat, gripMat, handguardMat, sightMat].forEach((m) => m.dispose());
      },
    };
  }
  return sharedDefaultRifleRes;
}

export function buildDefaultRifleInstance(): RifleInstance {
  const res = getSharedDefaultRifleRes();
  const group = new THREE.Group();
  // Origin (0,0,0) = pistol grip held squarely inside Right Hand palm; +Z = barrel forward, +Y = up
  const stock = new THREE.Mesh(res.stockGeo, res.gripMat);
  stock.position.set(0, 0.048, -0.132);
  stock.castShadow = true;

  const buttPad = new THREE.Mesh(res.buttPadGeo, res.handguardMat);
  buttPad.position.set(0, 0.044, -0.215);
  buttPad.castShadow = true;

  const pistolGrip = new THREE.Mesh(res.pistolGripGeo, res.gripMat);
  pistolGrip.position.set(0, -0.008, -0.006);
  pistolGrip.rotation.x = 0.28;
  pistolGrip.castShadow = true;

  const triggerGuard = new THREE.Mesh(res.triggerGuardGeo, res.gunMetalMat);
  triggerGuard.position.set(0, 0.024, 0.044);

  const receiver = new THREE.Mesh(res.receiverGeo, res.gunMetalMat);
  receiver.position.set(0, 0.068, 0.078);
  receiver.castShadow = true;

  const handguard = new THREE.Mesh(res.handguardGeo, res.handguardMat);
  handguard.position.set(0, 0.068, 0.275);
  handguard.castShadow = true;

  const angledForegrip = new THREE.Mesh(res.angledForegripGeo, res.gripMat);
  angledForegrip.position.set(0, 0.016, 0.255);
  angledForegrip.rotation.x = -0.2;
  angledForegrip.castShadow = true;

  const barrel = new THREE.Mesh(res.barrelGeo, res.gunMetalMat);
  barrel.position.set(0, 0.076, 0.52);
  barrel.castShadow = true;

  const muzzleBrake = new THREE.Mesh(res.muzzleBrakeGeo, res.handguardMat);
  muzzleBrake.position.set(0, 0.076, 0.69);

  const magazine = new THREE.Mesh(res.magGeo, res.gripMat);
  magazine.position.set(0, -0.052, 0.135);
  magazine.rotation.x = -0.08;

  const optic = new THREE.Mesh(res.opticGeo, res.sightMat);
  optic.position.set(0, 0.138, 0.065);

  const foregripTarget = new THREE.Object3D();
  foregripTarget.position.set(0, 0.004, 0.255);

  const muzzleNode = new THREE.Object3D();
  muzzleNode.position.set(0, 0.076, 0.725);

  group.add(
    stock,
    buttPad,
    pistolGrip,
    triggerGuard,
    receiver,
    handguard,
    angledForegrip,
    barrel,
    muzzleBrake,
    magazine,
    optic,
    foregripTarget,
    muzzleNode,
  );
  group.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.frustumCulled = false;
    }
  });

  return {
    group,
    foregripTarget,
    muzzleNode,
    dispose: () => {},
  };
}

function buildCustomRifleInstance(template: CustomRifleTemplate): RifleInstance {
  const group = new THREE.Group();
  const cloned = template.scene.clone(true);
  group.add(cloned);

  const foregripTarget = new THREE.Object3D();
  foregripTarget.position.copy(template.foregripPos);

  const muzzleNode = new THREE.Object3D();
  muzzleNode.position.copy(template.muzzlePos);

  group.add(foregripTarget, muzzleNode);

  return {
    group,
    foregripTarget,
    muzzleNode,
    dispose: () => {
      // Shared template geometries/materials/textures are owned by CustomRifleTemplate
      group.remove(cloned);
    },
  };
}

function orientGunModelBarrelForwardZ(wrapper: THREE.Group, model: THREE.Object3D) {
  model.updateMatrixWorld(true);
  const rawBox = new THREE.Box3().setFromObject(model);
  const rawSize = rawBox.getSize(new THREE.Vector3());

  // In Three.js right-handed Y-up: rotation.y = -PI/2 aligns +X to +Z
  if (rawSize.x > rawSize.z * 1.12 && rawSize.x >= rawSize.y * 0.95) {
    model.rotation.y = -Math.PI / 2;
  } else if (rawSize.y > rawSize.z * 1.35 && rawSize.y > rawSize.x * 1.35) {
    model.rotation.x = Math.PI / 2;
  }
  wrapper.updateMatrixWorld(true);

  // Measure front (+Z barrel tip 22%) vs rear (-Z grip/stock 42%) Y span to guarantee barrel faces +Z
  const box = new THREE.Box3().setFromObject(wrapper);
  const size = box.getSize(new THREE.Vector3());
  if (size.z > 0.001 && size.y > 0.001) {
    const backCut = box.min.z + size.z * 0.42;
    const frontCut = box.min.z + size.z * 0.78;
    let backMinY = Infinity;
    let backMaxY = -Infinity;
    let frontMinY = Infinity;
    let frontMaxY = -Infinity;
    let backCount = 0;
    let frontCount = 0;
    const v = new THREE.Vector3();

    wrapper.traverse((obj) => {
      if (!(obj as THREE.Mesh).isMesh) return;
      const mesh = obj as THREE.Mesh;
      const pos = mesh.geometry?.getAttribute('position');
      if (!pos) return;
      const step = Math.max(1, Math.floor(pos.count / 900));
      for (let i = 0; i < pos.count; i += step) {
        v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
        if (v.z <= backCut) {
          if (v.y < backMinY) backMinY = v.y;
          if (v.y > backMaxY) backMaxY = v.y;
          backCount++;
        }
        if (v.z >= frontCut) {
          if (v.y < frontMinY) frontMinY = v.y;
          if (v.y > frontMaxY) frontMaxY = v.y;
          frontCount++;
        }
      }
    });

    if (backCount > 2 && frontCount > 2) {
      const backSpanY = backMaxY - backMinY;
      const frontSpanY = frontMaxY - frontMinY;
      const barrelIsAtMinusZ =
        frontSpanY > backSpanY * 1.18 ||
        (frontMinY < backMinY - size.y * 0.14 && frontSpanY >= backSpanY * 0.85);
      if (barrelIsAtMinusZ) {
        model.rotation.y += Math.PI;
        wrapper.updateMatrixWorld(true);
      }
    }
  }
}

export async function parseGlbRifleTemplate(buffer: ArrayBuffer): Promise<CustomRifleTemplate> {
  const parsed = await acquireParsedGlb(buffer, 'rifle');
  try {
    const wrapper = new THREE.Group();
    const model = parsed.scene;
    wrapper.add(model);

    orientGunModelBarrelForwardZ(wrapper, model);

    const orientedBox = new THREE.Box3().setFromObject(wrapper);
    const orientedSize = orientedBox.getSize(new THREE.Vector3());
    const maxDim = Math.max(orientedSize.z, orientedSize.x, orientedSize.y, 0.05);
    const scaleFactor = THREE.MathUtils.clamp(0.98 / maxDim, 0.005, 50);
    model.scale.multiplyScalar(scaleFactor);
    wrapper.updateMatrixWorld(true);

    const scaledBox = new THREE.Box3().setFromObject(wrapper);
    const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
    const scaledSize = scaledBox.getSize(new THREE.Vector3());

    // Center X, place grip/trigger region (~26% forward from buttstock) at origin (0, 0, 0)
    model.position.x -= scaledCenter.x;
    model.position.y -= scaledBox.min.y + scaledSize.y * 0.34;
    model.position.z -= scaledBox.min.z + scaledSize.z * 0.26;
    wrapper.updateMatrixWorld(true);

    const finalBox = new THREE.Box3().setFromObject(wrapper);
    const finalSize = finalBox.getSize(new THREE.Vector3());
    const foregripPos = new THREE.Vector3(
      0,
      THREE.MathUtils.clamp(finalBox.min.y + finalSize.y * 0.3, -0.04, 0.04),
      THREE.MathUtils.clamp(finalBox.max.z * 0.36, 0.16, 0.36),
    );
    const muzzlePos = new THREE.Vector3(
      0,
      THREE.MathUtils.clamp(finalBox.min.y + finalSize.y * 0.62, 0.02, 0.12),
      Math.max(0.42, finalBox.max.z),
    );

    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          if (m && 'envMapIntensity' in m) {
            (m as THREE.MeshStandardMaterial).envMapIntensity = 1.0;
          }
        });
      }
    });

    return {
      scene: wrapper,
      foregripPos,
      muzzlePos,
      dispose: () => {
        parsed.release();
      },
    };
  } catch (err) {
    parsed.release();
    throw err;
  }
}

export interface PistolInstance {
  group: THREE.Group;
  muzzleNode: THREE.Object3D;
  dispose: () => void;
}

export interface CustomPistolTemplate {
  scene: THREE.Group;
  muzzlePos: THREE.Vector3;
  dispose: () => void;
}

let sharedDefaultPistolRes: {
  gunMetalMat: THREE.MeshStandardMaterial;
  cylinderMat: THREE.MeshStandardMaterial;
  gripMat: THREE.MeshStandardMaterial;
  sightMat: THREE.MeshStandardMaterial;
  pistolGripGeo: THREE.BoxGeometry;
  frameGeo: THREE.BoxGeometry;
  triggerGuardGeo: THREE.BoxGeometry;
  drumGeo: THREE.CylinderGeometry;
  barrelGeo: THREE.BoxGeometry;
  hammerGeo: THREE.BoxGeometry;
  pistolSightGeo: THREE.BoxGeometry;
  dispose: () => void;
} | null = null;

function getSharedDefaultPistolRes() {
  if (!sharedDefaultPistolRes) {
    const gunMetalMat = markShared(
      new THREE.MeshStandardMaterial({
        color: 0x262c34,
        roughness: 0.24,
        metalness: 0.88,
      }),
    );
    const cylinderMat = markShared(
      new THREE.MeshStandardMaterial({
        color: 0x4b5563,
        roughness: 0.28,
        metalness: 0.9,
      }),
    );
    const gripMat = markShared(
      new THREE.MeshStandardMaterial({
        color: 0x4a2c18,
        roughness: 0.78,
        metalness: 0.08,
      }),
    );
    const sightMat = markShared(
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: new THREE.Color(0xf59e0b),
        emissiveIntensity: 1.7,
        roughness: 0.2,
      }),
    );
    const pistolGripGeo = markShared(new THREE.BoxGeometry(0.044, 0.118, 0.062));
    const frameGeo = markShared(new THREE.BoxGeometry(0.046, 0.056, 0.145));
    const triggerGuardGeo = markShared(new THREE.BoxGeometry(0.022, 0.032, 0.048));
    const drumGeo = markShared(new THREE.CylinderGeometry(0.034, 0.034, 0.068, 8));
    drumGeo.rotateX(Math.PI / 2);
    const barrelGeo = markShared(new THREE.BoxGeometry(0.032, 0.042, 0.185));
    const hammerGeo = markShared(new THREE.BoxGeometry(0.018, 0.026, 0.026));
    const pistolSightGeo = markShared(new THREE.BoxGeometry(0.014, 0.02, 0.026));

    sharedDefaultPistolRes = {
      gunMetalMat,
      cylinderMat,
      gripMat,
      sightMat,
      pistolGripGeo,
      frameGeo,
      triggerGuardGeo,
      drumGeo,
      barrelGeo,
      hammerGeo,
      pistolSightGeo,
      dispose: () => {
        [
          pistolGripGeo,
          frameGeo,
          triggerGuardGeo,
          drumGeo,
          barrelGeo,
          hammerGeo,
          pistolSightGeo,
        ].forEach((g) => g.dispose());
        [gunMetalMat, cylinderMat, gripMat, sightMat].forEach((m) => m.dispose());
      },
    };
  }
  return sharedDefaultPistolRes;
}

export function buildDefaultPistolInstance(): PistolInstance {
  const res = getSharedDefaultPistolRes();
  const group = new THREE.Group();
  // Origin (0,0,0) = center of revolver grip inside the closed fist; +Z = barrel forward, +Y = up
  const pistolGrip = new THREE.Mesh(res.pistolGripGeo, res.gripMat);
  pistolGrip.position.set(0, -0.012, -0.004);
  pistolGrip.rotation.x = 0.28;
  pistolGrip.castShadow = true;

  const frame = new THREE.Mesh(res.frameGeo, res.gunMetalMat);
  frame.position.set(0, 0.064, 0.065);
  frame.castShadow = true;

  const triggerGuard = new THREE.Mesh(res.triggerGuardGeo, res.gunMetalMat);
  triggerGuard.position.set(0, 0.024, 0.046);

  const drum = new THREE.Mesh(res.drumGeo, res.cylinderMat);
  drum.position.set(0, 0.076, 0.074);
  drum.castShadow = true;

  const barrel = new THREE.Mesh(res.barrelGeo, res.gunMetalMat);
  barrel.position.set(0, 0.088, 0.195);
  barrel.castShadow = true;

  const hammer = new THREE.Mesh(res.hammerGeo, res.cylinderMat);
  hammer.position.set(0, 0.095, -0.004);
  hammer.rotation.x = -0.35;

  const pistolSight = new THREE.Mesh(res.pistolSightGeo, res.sightMat);
  pistolSight.position.set(0, 0.116, 0.272);

  const muzzleNode = new THREE.Object3D();
  muzzleNode.position.set(0, 0.088, 0.292);

  group.add(pistolGrip, frame, triggerGuard, drum, barrel, hammer, pistolSight, muzzleNode);
  group.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.frustumCulled = false;
    }
  });

  return {
    group,
    muzzleNode,
    dispose: () => {},
  };
}

function buildCustomPistolInstance(template: CustomPistolTemplate): PistolInstance {
  const group = new THREE.Group();
  const cloned = template.scene.clone(true);
  group.add(cloned);

  const muzzleNode = new THREE.Object3D();
  muzzleNode.position.copy(template.muzzlePos);
  group.add(muzzleNode);

  return {
    group,
    muzzleNode,
    dispose: () => {
      group.remove(cloned);
    },
  };
}

export async function parseGlbPistolTemplate(buffer: ArrayBuffer): Promise<CustomPistolTemplate> {
  const parsed = await acquireParsedGlb(buffer, 'pistol');
  try {
    const wrapper = new THREE.Group();
    const model = parsed.scene;
    wrapper.add(model);

    orientGunModelBarrelForwardZ(wrapper, model);

    const orientedBox = new THREE.Box3().setFromObject(wrapper);
    const orientedSize = orientedBox.getSize(new THREE.Vector3());
    const maxDim = Math.max(orientedSize.z, orientedSize.x, orientedSize.y, 0.05);
    const scaleFactor = THREE.MathUtils.clamp(0.35 / maxDim, 0.005, 50);
    model.scale.multiplyScalar(scaleFactor);
    wrapper.updateMatrixWorld(true);

    const scaledBox = new THREE.Box3().setFromObject(wrapper);
    const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
    const scaledSize = scaledBox.getSize(new THREE.Vector3());

    model.position.x -= scaledCenter.x;
    model.position.y -= scaledBox.min.y + scaledSize.y * 0.28;
    model.position.z -= scaledBox.min.z + scaledSize.z * 0.2;
    wrapper.updateMatrixWorld(true);

    const finalBox = new THREE.Box3().setFromObject(wrapper);
    const finalSize = finalBox.getSize(new THREE.Vector3());
    const muzzlePos = new THREE.Vector3(
      0,
      THREE.MathUtils.clamp(finalBox.min.y + finalSize.y * 0.68, 0.02, 0.1),
      Math.max(0.22, finalBox.max.z),
    );

    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          if (m && 'envMapIntensity' in m) {
            (m as THREE.MeshStandardMaterial).envMapIntensity = 1.0;
          }
        });
      }
    });

    return {
      scene: wrapper,
      muzzlePos,
      dispose: () => {
        parsed.release();
      },
    };
  } catch (err) {
    parsed.release();
    throw err;
  }
}

export interface StickInstance {
  group: THREE.Group;
  dispose: () => void;
}

export interface BatonInstance {
  group: THREE.Group;
  dispose: () => void;
}

export interface BowInstance {
  group: THREE.Group;
  stringUpperPivot: THREE.Group;
  stringLowerPivot: THREE.Group;
  nockedArrow: THREE.Group;
  nockedArrowOffset: THREE.Group;
  dispose: () => void;
}

let sharedStickRes: {
  barkMat: THREE.MeshStandardMaterial;
  woodTipMat: THREE.MeshStandardMaterial;
  wrapMat: THREE.MeshStandardMaterial;
  shaftGeo: THREE.CylinderGeometry;
  tipGeo: THREE.CylinderGeometry;
  gripGeo: THREE.CylinderGeometry;
  knotGeo: THREE.DodecahedronGeometry;
  dispose: () => void;
} | null = null;

function getSharedStickRes() {
  if (!sharedStickRes) {
    const barkMat = markShared(
      new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.88, metalness: 0.04 }),
    );
    const woodTipMat = markShared(
      new THREE.MeshStandardMaterial({ color: 0xc29563, roughness: 0.78, metalness: 0.02 }),
    );
    const wrapMat = markShared(new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.9 }));
    const shaftGeo = markShared(new THREE.CylinderGeometry(0.022, 0.032, 0.86, 8));
    const tipGeo = markShared(new THREE.CylinderGeometry(0.014, 0.022, 0.14, 7));
    const gripGeo = markShared(new THREE.CylinderGeometry(0.026, 0.027, 0.18, 8));
    const knotGeo = markShared(new THREE.DodecahedronGeometry(0.034, 0));
    sharedStickRes = {
      barkMat,
      woodTipMat,
      wrapMat,
      shaftGeo,
      tipGeo,
      gripGeo,
      knotGeo,
      dispose: () => {
        [shaftGeo, tipGeo, gripGeo, knotGeo].forEach((g) => g.dispose());
        [barkMat, woodTipMat, wrapMat].forEach((m) => m.dispose());
      },
    };
  }
  return sharedStickRes;
}

export function buildStickWeaponInstance(): StickInstance {
  const res = getSharedStickRes();
  const group = new THREE.Group();
  const holder = new THREE.Group();
  holder.rotation.x = 0.22;
  group.add(holder);

  const shaft = new THREE.Mesh(res.shaftGeo, res.barkMat);
  shaft.position.set(0, 0.28, 0);
  shaft.castShadow = true;

  const tip = new THREE.Mesh(res.tipGeo, res.woodTipMat);
  tip.position.set(0, 0.76, 0);
  tip.castShadow = true;

  const grip = new THREE.Mesh(res.gripGeo, res.wrapMat);
  grip.position.set(0, 0.0, 0);

  const knot = new THREE.Mesh(res.knotGeo, res.barkMat);
  knot.position.set(0.012, 0.44, 0.01);

  holder.add(shaft, tip, grip, knot);
  group.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.frustumCulled = false;
    }
  });

  return { group, dispose: () => {} };
}

let sharedBatonRes: {
  shaftMat: THREE.MeshStandardMaterial;
  handleMat: THREE.MeshStandardMaterial;
  collarMat: THREE.MeshStandardMaterial;
  tipCapMat: THREE.MeshStandardMaterial;
  shaftGeo: THREE.CylinderGeometry;
  handleGeo: THREE.CylinderGeometry;
  guardGeo: THREE.CylinderGeometry;
  sideHandleGeo: THREE.CylinderGeometry;
  tipGeo: THREE.CylinderGeometry;
  dispose: () => void;
} | null = null;

function getSharedBatonRes() {
  if (!sharedBatonRes) {
    const shaftMat = markShared(
      new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.42, metalness: 0.28 }),
    );
    const handleMat = markShared(
      new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.85, metalness: 0.08 }),
    );
    const collarMat = markShared(
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.25, metalness: 0.85 }),
    );
    const tipCapMat = markShared(
      new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.35, metalness: 0.5 }),
    );
    const shaftGeo = markShared(new THREE.CylinderGeometry(0.022, 0.024, 0.64, 10));
    const handleGeo = markShared(new THREE.CylinderGeometry(0.025, 0.025, 0.16, 10));
    const guardGeo = markShared(new THREE.CylinderGeometry(0.036, 0.036, 0.025, 10));
    const sideHandleGeo = markShared(new THREE.CylinderGeometry(0.017, 0.017, 0.13, 8));
    const tipGeo = markShared(new THREE.CylinderGeometry(0.023, 0.023, 0.045, 10));
    sharedBatonRes = {
      shaftMat,
      handleMat,
      collarMat,
      tipCapMat,
      shaftGeo,
      handleGeo,
      guardGeo,
      sideHandleGeo,
      tipGeo,
      dispose: () => {
        [shaftGeo, handleGeo, guardGeo, sideHandleGeo, tipGeo].forEach((g) => g.dispose());
        [shaftMat, handleMat, collarMat, tipCapMat].forEach((m) => m.dispose());
      },
    };
  }
  return sharedBatonRes;
}

export function buildBatonWeaponInstance(): BatonInstance {
  const res = getSharedBatonRes();
  const group = new THREE.Group();
  const holder = new THREE.Group();
  holder.rotation.x = 0.22;
  group.add(holder);

  const shaft = new THREE.Mesh(res.shaftGeo, res.shaftMat);
  shaft.position.set(0, 0.26, 0);
  shaft.castShadow = true;

  const handle = new THREE.Mesh(res.handleGeo, res.handleMat);
  handle.position.set(0, -0.02, 0);

  const guard = new THREE.Mesh(res.guardGeo, res.collarMat);
  guard.position.set(0, 0.07, 0);

  const sideHandle = new THREE.Mesh(res.sideHandleGeo, res.handleMat);
  sideHandle.rotation.x = Math.PI / 2;
  sideHandle.position.set(0, 0.12, -0.07);

  const tip = new THREE.Mesh(res.tipGeo, res.tipCapMat);
  tip.position.set(0, 0.59, 0);

  holder.add(shaft, handle, guard, sideHandle, tip);
  group.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.frustumCulled = false;
    }
  });

  return { group, dispose: () => {} };
}

let sharedArmorRes: {
  kevlarMat: THREE.MeshStandardMaterial;
  plateMat: THREE.MeshStandardMaterial;
  trimMat: THREE.MeshStandardMaterial;
  visorMat: THREE.MeshStandardMaterial;
  packFabricMat: THREE.MeshStandardMaterial;
  packStrapMat: THREE.MeshStandardMaterial;
  packAccentMat: THREE.MeshStandardMaterial;
  domeGeo: THREE.SphereGeometry;
  rimGeo: THREE.TorusGeometry;
  browVisorGeo: THREE.BoxGeometry;
  nvgMountGeo: THREE.BoxGeometry;
  sideRailGeo: THREE.BoxGeometry;
  gendarmeBadgeGeo: THREE.BoxGeometry;
  vestBodyGeo: THREE.BoxGeometry;
  frontPlateGeo: THREE.BoxGeometry;
  sideCummerbundGeo: THREE.BoxGeometry;
  pouchGeo: THREE.BoxGeometry;
  adminPouchGeo: THREE.BoxGeometry;
  shoulderPadGeo: THREE.BoxGeometry;
  collarGeo: THREE.CylinderGeometry;
  packBodyGeo: THREE.BoxGeometry;
  packPocketGeo: THREE.BoxGeometry;
  packFlapGeo: THREE.BoxGeometry;
  packBedrollGeo: THREE.CylinderGeometry;
  packStrapGeo: THREE.BoxGeometry;
  packBuckleGeo: THREE.BoxGeometry;
  packAntennaGeo: THREE.CylinderGeometry;
  dispose: () => void;
} | null = null;

function getSharedArmorRes() {
  if (!sharedArmorRes) {
    const kevlarMat = markShared(
      new THREE.MeshStandardMaterial({ color: 0x2f3e28, roughness: 0.62, metalness: 0.2 }),
    );
    const plateMat = markShared(
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.44, metalness: 0.52 }),
    );
    const trimMat = markShared(
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.38, metalness: 0.62 }),
    );
    const visorMat = markShared(
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.72 }),
    );
    const packFabricMat = markShared(
      new THREE.MeshStandardMaterial({ color: 0x3b4834, roughness: 0.82, metalness: 0.06 }),
    );
    const packStrapMat = markShared(
      new THREE.MeshStandardMaterial({ color: 0x1b2128, roughness: 0.74, metalness: 0.14 }),
    );
    const packAccentMat = markShared(
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.32, metalness: 0.74 }),
    );

    // Helmet sculpted to real cranium scale (~0.256m W x 0.285m D x 0.17m H), brow rim at y = 0
    const domeGeo = markShared(
      new THREE.SphereGeometry(0.128, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
    );
    const rimGeo = markShared(new THREE.TorusGeometry(0.125, 0.013, 8, 18));
    const browVisorGeo = markShared(new THREE.BoxGeometry(0.155, 0.03, 0.056));
    const nvgMountGeo = markShared(new THREE.BoxGeometry(0.038, 0.044, 0.022));
    const sideRailGeo = markShared(new THREE.BoxGeometry(0.016, 0.022, 0.11));
    const gendarmeBadgeGeo = markShared(new THREE.BoxGeometry(0.036, 0.03, 0.016));

    // Tactical plate carrier sculpted to real human ribcage (~0.305m W x 0.33m H x 0.205m D), centered at (0,0,0)
    const vestBodyGeo = markShared(new THREE.BoxGeometry(0.305, 0.33, 0.205));
    const frontPlateGeo = markShared(new THREE.BoxGeometry(0.22, 0.245, 0.03));
    const sideCummerbundGeo = markShared(new THREE.BoxGeometry(0.028, 0.135, 0.185));
    const pouchGeo = markShared(new THREE.BoxGeometry(0.062, 0.092, 0.04));
    const adminPouchGeo = markShared(new THREE.BoxGeometry(0.13, 0.062, 0.024));
    const shoulderPadGeo = markShared(new THREE.BoxGeometry(0.072, 0.03, 0.16));
    const collarGeo = markShared(new THREE.CylinderGeometry(0.104, 0.118, 0.042, 12, 1, true));

    // Tactical assault backpack (~0.255m W x 0.34m H x 0.135m D), front contact plane at z = 0 extending into -Z
    const packBodyGeo = markShared(new THREE.BoxGeometry(0.255, 0.34, 0.135));
    const packPocketGeo = markShared(new THREE.BoxGeometry(0.205, 0.13, 0.055));
    const packFlapGeo = markShared(new THREE.BoxGeometry(0.265, 0.072, 0.145));
    const packBedrollGeo = markShared(new THREE.CylinderGeometry(0.034, 0.034, 0.235, 10));
    const packStrapGeo = markShared(new THREE.BoxGeometry(0.042, 0.29, 0.028));
    const packBuckleGeo = markShared(new THREE.BoxGeometry(0.036, 0.024, 0.016));
    const packAntennaGeo = markShared(new THREE.CylinderGeometry(0.005, 0.008, 0.22, 6));

    sharedArmorRes = {
      kevlarMat,
      plateMat,
      trimMat,
      visorMat,
      packFabricMat,
      packStrapMat,
      packAccentMat,
      domeGeo,
      rimGeo,
      browVisorGeo,
      nvgMountGeo,
      sideRailGeo,
      gendarmeBadgeGeo,
      vestBodyGeo,
      frontPlateGeo,
      sideCummerbundGeo,
      pouchGeo,
      adminPouchGeo,
      shoulderPadGeo,
      collarGeo,
      packBodyGeo,
      packPocketGeo,
      packFlapGeo,
      packBedrollGeo,
      packStrapGeo,
      packBuckleGeo,
      packAntennaGeo,
      dispose: () => {
        [
          domeGeo,
          rimGeo,
          browVisorGeo,
          nvgMountGeo,
          sideRailGeo,
          gendarmeBadgeGeo,
          vestBodyGeo,
          frontPlateGeo,
          sideCummerbundGeo,
          pouchGeo,
          adminPouchGeo,
          shoulderPadGeo,
          collarGeo,
          packBodyGeo,
          packPocketGeo,
          packFlapGeo,
          packBedrollGeo,
          packStrapGeo,
          packBuckleGeo,
          packAntennaGeo,
        ].forEach((g) => g.dispose());
        [
          kevlarMat,
          plateMat,
          trimMat,
          visorMat,
          packFabricMat,
          packStrapMat,
          packAccentMat,
        ].forEach((m) => m.dispose());
      },
    };
  }
  return sharedArmorRes;
}

export interface CustomEquipmentTemplate {
  kind: CustomEquipmentId;
  scene: THREE.Group;
  dispose: () => void;
}

function finalizeCustomEquipmentModelMaterial(model: THREE.Object3D) {
  model.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => {
        if (m && 'envMapIntensity' in m) {
          (m as THREE.MeshStandardMaterial).envMapIntensity = 1.0;
        }
      });
    }
  });
}

function measureArrowEndSpread(wrapper: THREE.Group): {
  backTailSpread: number;
  frontTipSpread: number;
  count: number;
} {
  const box = new THREE.Box3().setFromObject(wrapper);
  const size = box.getSize(new THREE.Vector3());
  const midX = (box.min.x + box.max.x) * 0.5;
  const midY = (box.min.y + box.max.y) * 0.5;
  const backCut = box.min.z + size.z * 0.14;
  const frontCut = box.max.z - size.z * 0.14;
  let backSum = 0;
  let backCount = 0;
  let frontSum = 0;
  let frontCount = 0;
  const v = new THREE.Vector3();

  wrapper.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return;
    const mesh = obj as THREE.Mesh;
    const pos = mesh.geometry?.getAttribute('position');
    if (!pos) return;
    const step = Math.max(1, Math.floor(pos.count / 900));
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      const r = Math.hypot(v.x - midX, v.y - midY);
      if (v.z <= backCut) {
        backSum += r;
        backCount++;
      } else if (v.z >= frontCut) {
        frontSum += r;
        frontCount++;
      }
    }
  });

  return {
    backTailSpread: backCount > 0 ? backSum / backCount : 0,
    frontTipSpread: frontCount > 0 ? frontSum / frontCount : 0,
    count: Math.min(backCount, frontCount),
  };
}

function orientBowLimbsMinusZ(wrapper: THREE.Group, model: THREE.Object3D) {
  wrapper.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(wrapper);
  const size = box.getSize(new THREE.Vector3());
  if (size.y < 0.001 || size.z < 0.001) return;

  const midY = (box.min.y + box.max.y) * 0.5;
  let gripZ = 0;
  let gripCount = 0;
  let tipsZ = 0;
  let tipsCount = 0;
  const v = new THREE.Vector3();

  wrapper.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return;
    const mesh = obj as THREE.Mesh;
    const pos = mesh.geometry?.getAttribute('position');
    if (!pos) return;
    const step = Math.max(1, Math.floor(pos.count / 900));
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
      const dyNorm = Math.abs(v.y - midY) / size.y;
      if (dyNorm <= 0.16) {
        gripZ += v.z;
        gripCount++;
      } else if (dyNorm >= 0.34) {
        tipsZ += v.z;
        tipsCount++;
      }
    }
  });

  if (gripCount > 2 && tipsCount > 2) {
    const avgGripZ = gripZ / gripCount;
    const avgTipsZ = tipsZ / tipsCount;
    if (avgTipsZ > avgGripZ + size.z * 0.04) {
      model.rotation.y += Math.PI;
      wrapper.updateMatrixWorld(true);
    }
  }
}

export async function parseGlbEquipmentTemplate(
  buffer: ArrayBuffer,
  kind: CustomEquipmentId,
): Promise<CustomEquipmentTemplate> {
  const parsed = await acquireParsedGlb(buffer, `equip_${kind}`);
  try {
    const wrapper = new THREE.Group();
    const model = parsed.scene.clone(true);
    wrapper.add(model);
    wrapper.updateMatrixWorld(true);

    const rawBox = new THREE.Box3().setFromObject(wrapper);
    const rawSize = rawBox.getSize(new THREE.Vector3());

    if (kind === 'stick' || kind === 'baton') {
      if (rawSize.z > rawSize.y * 1.15 && rawSize.z >= rawSize.x) {
        model.rotation.x = -Math.PI / 2;
      } else if (rawSize.x > rawSize.y * 1.15 && rawSize.x > rawSize.z) {
        model.rotation.z = Math.PI / 2;
      }
      wrapper.updateMatrixWorld(true);

      if (kind === 'baton') {
        const bBox = new THREE.Box3().setFromObject(wrapper);
        const bSize = bBox.getSize(new THREE.Vector3());
        if (bSize.y > 0.001) {
          const midX = (bBox.min.x + bBox.max.x) * 0.5;
          const midZ = (bBox.min.z + bBox.max.z) * 0.5;
          const lowCut = bBox.min.y + bSize.y * 0.4;
          const highCut = bBox.max.y - bSize.y * 0.4;
          let lowMaxR = 0;
          let highMaxR = 0;
          const v = new THREE.Vector3();
          wrapper.traverse((obj) => {
            if (!(obj as THREE.Mesh).isMesh) return;
            const pos = (obj as THREE.Mesh).geometry?.getAttribute('position');
            if (!pos) return;
            const step = Math.max(1, Math.floor(pos.count / 800));
            for (let i = 0; i < pos.count; i += step) {
              v.fromBufferAttribute(pos, i).applyMatrix4(obj.matrixWorld);
              const r = Math.hypot(v.x - midX, v.z - midZ);
              if (v.y <= lowCut && r > lowMaxR) lowMaxR = r;
              else if (v.y >= highCut && r > highMaxR) highMaxR = r;
            }
          });
          if (highMaxR > lowMaxR * 1.45 && highMaxR > bSize.y * 0.08) {
            model.rotation.x += Math.PI;
            wrapper.updateMatrixWorld(true);
          }
        }
      }

      const oBox = new THREE.Box3().setFromObject(wrapper);
      const oSize = oBox.getSize(new THREE.Vector3());
      const targetLen = kind === 'stick' ? 0.96 : 0.72;
      const scaleFactor = THREE.MathUtils.clamp(targetLen / Math.max(oSize.y, 0.05), 0.005, 50);
      model.scale.multiplyScalar(scaleFactor);
      wrapper.updateMatrixWorld(true);

      const sBox = new THREE.Box3().setFromObject(wrapper);
      const sCenter = sBox.getCenter(new THREE.Vector3());
      const sSize = sBox.getSize(new THREE.Vector3());
      const gripFrac = kind === 'stick' ? 0.16 : 0.14;
      model.position.x -= sCenter.x;
      model.position.z -= sCenter.z;
      model.position.y -= sBox.min.y + sSize.y * gripFrac;
      wrapper.rotation.x = 0.22;
      wrapper.updateMatrixWorld(true);
    } else if (kind === 'bow') {
      if (rawSize.x > rawSize.y * 1.15 && rawSize.x >= rawSize.z) {
        model.rotation.z = Math.PI / 2;
      } else if (rawSize.z > rawSize.y * 1.15 && rawSize.z > rawSize.x) {
        model.rotation.x = Math.PI / 2;
      }
      orientBowLimbsMinusZ(wrapper, model);

      const oBox = new THREE.Box3().setFromObject(wrapper);
      const oSize = oBox.getSize(new THREE.Vector3());
      const scaleFactor = THREE.MathUtils.clamp(1.12 / Math.max(oSize.y, 0.05), 0.005, 50);
      model.scale.multiplyScalar(scaleFactor);
      wrapper.updateMatrixWorld(true);

      const sBox = new THREE.Box3().setFromObject(wrapper);
      const sCenter = sBox.getCenter(new THREE.Vector3());
      const sSize = sBox.getSize(new THREE.Vector3());
      let gripZSum = 0;
      let gripZCount = 0;
      const v = new THREE.Vector3();
      wrapper.traverse((obj) => {
        if (!(obj as THREE.Mesh).isMesh) return;
        const pos = (obj as THREE.Mesh).geometry?.getAttribute('position');
        if (!pos) return;
        const step = Math.max(1, Math.floor(pos.count / 800));
        for (let i = 0; i < pos.count; i += step) {
          v.fromBufferAttribute(pos, i).applyMatrix4(obj.matrixWorld);
          if (Math.abs(v.y - sCenter.y) <= sSize.y * 0.14) {
            gripZSum += v.z;
            gripZCount++;
          }
        }
      });
      const gripZ = gripZCount > 0 ? gripZSum / gripZCount : sCenter.z;
      model.position.x -= sCenter.x;
      model.position.y -= sCenter.y;
      model.position.z -= gripZ;
      wrapper.updateMatrixWorld(true);
    } else if (kind === 'arrow') {
      if (rawSize.y > rawSize.z * 1.15 && rawSize.y >= rawSize.x) {
        model.rotation.x = Math.PI / 2;
      } else if (rawSize.x > rawSize.z * 1.15 && rawSize.x > rawSize.y) {
        model.rotation.y = -Math.PI / 2;
      }
      wrapper.updateMatrixWorld(true);

      const spread = measureArrowEndSpread(wrapper);
      if (spread.count > 2 && spread.frontTipSpread > spread.backTailSpread * 1.25) {
        model.rotation.y += Math.PI;
        wrapper.updateMatrixWorld(true);
      }

      const oBox = new THREE.Box3().setFromObject(wrapper);
      const oSize = oBox.getSize(new THREE.Vector3());
      const scaleFactor = THREE.MathUtils.clamp(0.78 / Math.max(oSize.z, 0.05), 0.005, 50);
      model.scale.multiplyScalar(scaleFactor);
      wrapper.updateMatrixWorld(true);

      const sBox = new THREE.Box3().setFromObject(wrapper);
      const sCenter = sBox.getCenter(new THREE.Vector3());
      model.position.sub(sCenter);
      wrapper.updateMatrixWorld(true);
    } else if (kind === 'helmet') {
      if (rawSize.y < Math.min(rawSize.x, rawSize.z) * 0.45) {
        model.rotation.x = -Math.PI / 2;
        wrapper.updateMatrixWorld(true);
      }
      const postBox = new THREE.Box3().setFromObject(wrapper);
      const postSize = postBox.getSize(new THREE.Vector3());
      if (postSize.x > postSize.z * 1.15) {
        model.rotation.y = -Math.PI / 2;
        wrapper.updateMatrixWorld(true);
      }

      const oBox = new THREE.Box3().setFromObject(wrapper);
      const oSize = oBox.getSize(new THREE.Vector3());
      const scaleX = 0.256 / Math.max(oSize.x, 0.05);
      const scaleZ = 0.285 / Math.max(oSize.z, 0.05);
      const scaleY = 0.175 / Math.max(oSize.y, 0.05);
      const scaleFactor = THREE.MathUtils.clamp(
        Math.min((scaleX + scaleZ) * 0.5, scaleY * 1.12),
        0.005,
        50,
      );
      model.scale.multiplyScalar(scaleFactor);
      wrapper.updateMatrixWorld(true);

      const sBox = new THREE.Box3().setFromObject(wrapper);
      const sCenter = sBox.getCenter(new THREE.Vector3());
      model.position.x -= sCenter.x;
      model.position.z -= sCenter.z;
      model.position.y -= sBox.min.y + 0.025;
      wrapper.updateMatrixWorld(true);
    } else {
      // vest: centered around ribcage origin (0,0,0) matching buildDefaultVestContent()
      if (rawSize.y < Math.min(rawSize.x, rawSize.z) * 0.5) {
        model.rotation.x = -Math.PI / 2;
        wrapper.updateMatrixWorld(true);
      }
      const postBox = new THREE.Box3().setFromObject(wrapper);
      const postSize = postBox.getSize(new THREE.Vector3());
      if (postSize.z > postSize.x * 1.12) {
        model.rotation.y = Math.PI / 2;
        wrapper.updateMatrixWorld(true);
      }

      const oBox = new THREE.Box3().setFromObject(wrapper);
      const oSize = oBox.getSize(new THREE.Vector3());
      const scaleY = 0.33 / Math.max(oSize.y, 0.05);
      const scaleX = 0.305 / Math.max(oSize.x, 0.05);
      const scaleZ = 0.205 / Math.max(oSize.z, 0.05);
      const scaleFactor = THREE.MathUtils.clamp(
        (scaleX + scaleY + scaleZ) / 3,
        0.005,
        50,
      );
      model.scale.multiplyScalar(scaleFactor);
      wrapper.updateMatrixWorld(true);

      const sBox = new THREE.Box3().setFromObject(wrapper);
      const sCenter = sBox.getCenter(new THREE.Vector3());
      model.position.sub(sCenter);
      wrapper.updateMatrixWorld(true);
    }

    finalizeCustomEquipmentModelMaterial(wrapper);

    return {
      kind,
      scene: wrapper,
      dispose: () => {
        parsed.release();
      },
    };
  } catch (err) {
    parsed.release();
    throw err;
  }
}

function buildCustomStickInstance(template: CustomEquipmentTemplate): StickInstance {
  const group = template.scene.clone(true);
  return {
    group,
    dispose: () => {
      group.clear();
    },
  };
}

function buildCustomBatonInstance(template: CustomEquipmentTemplate): BatonInstance {
  const group = template.scene.clone(true);
  return {
    group,
    dispose: () => {
      group.clear();
    },
  };
}

function buildDefaultHelmetContent(): THREE.Group {
  const res = getSharedArmorRes();
  const content = new THREE.Group();
  const dome = new THREE.Mesh(res.domeGeo, res.kevlarMat);
  dome.position.set(0, 0.018, 0);
  dome.scale.set(1.0, 1.04, 1.11);
  dome.castShadow = true;

  const rim = new THREE.Mesh(res.rimGeo, res.plateMat);
  rim.rotation.x = Math.PI / 2;
  rim.scale.set(1.0, 1.11, 1.0);
  rim.position.set(0, -0.014, 0.004);

  const browVisor = new THREE.Mesh(res.browVisorGeo, res.visorMat);
  browVisor.position.set(0, 0.006, 0.122);
  browVisor.rotation.x = 0.15;

  const nvgMount = new THREE.Mesh(res.nvgMountGeo, res.trimMat);
  nvgMount.position.set(0, 0.048, 0.133);
  nvgMount.rotation.x = -0.18;

  const railL = new THREE.Mesh(res.sideRailGeo, res.trimMat);
  railL.position.set(0.122, 0.012, 0.005);
  railL.rotation.z = -0.1;

  const railR = new THREE.Mesh(res.sideRailGeo, res.trimMat);
  railR.position.set(-0.122, 0.012, 0.005);
  railR.rotation.z = 0.1;

  const gendarmeBadge = new THREE.Mesh(res.gendarmeBadgeGeo, res.trimMat);
  gendarmeBadge.position.set(0, 0.088, 0.118);
  gendarmeBadge.rotation.x = -0.35;

  content.add(dome, rim, browVisor, nvgMount, railL, railR, gendarmeBadge);
  content.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.frustumCulled = false;
    }
  });
  return content;
}

function buildDefaultVestContent(): THREE.Group {
  const res = getSharedArmorRes();
  const content = new THREE.Group();
  const vestBody = new THREE.Mesh(res.vestBodyGeo, res.kevlarMat);
  vestBody.castShadow = true;

  const frontPlate = new THREE.Mesh(res.frontPlateGeo, res.plateMat);
  frontPlate.position.set(0, 0.012, 0.104);

  const backPlate = new THREE.Mesh(res.frontPlateGeo, res.plateMat);
  backPlate.position.set(0, 0.012, -0.104);

  const sideL = new THREE.Mesh(res.sideCummerbundGeo, res.plateMat);
  sideL.position.set(0.154, -0.04, 0);
  const sideR = new THREE.Mesh(res.sideCummerbundGeo, res.plateMat);
  sideR.position.set(-0.154, -0.04, 0);

  const pouchL = new THREE.Mesh(res.pouchGeo, res.trimMat);
  pouchL.position.set(0.078, -0.062, 0.122);
  const pouchR = new THREE.Mesh(res.pouchGeo, res.trimMat);
  pouchR.position.set(-0.078, -0.062, 0.122);
  const pouchC = new THREE.Mesh(res.pouchGeo, res.trimMat);
  pouchC.position.set(0, -0.062, 0.122);

  const adminPouch = new THREE.Mesh(res.adminPouchGeo, res.trimMat);
  adminPouch.position.set(0, 0.062, 0.122);

  const padL = new THREE.Mesh(res.shoulderPadGeo, res.plateMat);
  padL.position.set(0.112, 0.172, 0);
  const padR = new THREE.Mesh(res.shoulderPadGeo, res.plateMat);
  padR.position.set(-0.112, 0.172, 0);

  const collar = new THREE.Mesh(res.collarGeo, res.plateMat);
  collar.position.set(0, 0.178, 0);

  content.add(
    vestBody,
    frontPlate,
    backPlate,
    sideL,
    sideR,
    pouchL,
    pouchR,
    pouchC,
    adminPouch,
    padL,
    padR,
    collar,
  );
  content.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.frustumCulled = false;
    }
  });
  return content;
}

function buildDefaultBackpackContent(): THREE.Group {
  const res = getSharedArmorRes();
  const content = new THREE.Group();

  // Back contact surface sits at z = 0; pack extends backwards (-Z)
  const mainBody = new THREE.Mesh(res.packBodyGeo, res.packFabricMat);
  mainBody.position.set(0, 0, -0.07);
  mainBody.castShadow = true;

  const lowerPocket = new THREE.Mesh(res.packPocketGeo, res.packStrapMat);
  lowerPocket.position.set(0, -0.075, -0.155);
  lowerPocket.castShadow = true;

  const topFlap = new THREE.Mesh(res.packFlapGeo, res.packFabricMat);
  topFlap.position.set(0, 0.142, -0.074);
  topFlap.castShadow = true;

  const bedroll = new THREE.Mesh(res.packBedrollGeo, res.packStrapMat);
  bedroll.rotation.z = Math.PI / 2;
  bedroll.position.set(0, 0.198, -0.076);
  bedroll.castShadow = true;

  const strapL = new THREE.Mesh(res.packStrapGeo, res.packStrapMat);
  strapL.position.set(0.088, 0.015, 0.008);
  const strapR = new THREE.Mesh(res.packStrapGeo, res.packStrapMat);
  strapR.position.set(-0.088, 0.015, 0.008);

  const buckleL = new THREE.Mesh(res.packBuckleGeo, res.packAccentMat);
  buckleL.position.set(0.068, 0.095, -0.145);
  const buckleR = new THREE.Mesh(res.packBuckleGeo, res.packAccentMat);
  buckleR.position.set(-0.068, 0.095, -0.145);

  const antenna = new THREE.Mesh(res.packAntennaGeo, res.visorMat);
  antenna.position.set(0.092, 0.25, -0.11);

  content.add(
    mainBody,
    lowerPocket,
    topFlap,
    bedroll,
    strapL,
    strapR,
    buckleL,
    buckleR,
    antenna,
  );
  content.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.frustumCulled = false;
    }
  });
  return content;
}

function buildCustomBackpackContent(template: CustomObjectTemplate): THREE.Group {
  const holder = new THREE.Group();
  const clone = template.scene.clone(true);
  clone.traverse((child) => {
    child.matrixAutoUpdate = true;
    if ((child as THREE.Mesh).isMesh) {
      child.frustumCulled = false;
    }
  });
  clone.updateMatrixWorld(true);

  const rawBox = new THREE.Box3().setFromObject(clone);
  const rawSize = rawBox.getSize(new THREE.Vector3());
  // Ensure pack is oriented upright with its broad face spanning X and depth along Z
  if (rawSize.y < Math.max(rawSize.x, rawSize.z) * 0.65) {
    clone.rotation.x = Math.PI / 2;
    clone.updateMatrixWorld(true);
  }
  const postBox = new THREE.Box3().setFromObject(clone);
  const postSize = postBox.getSize(new THREE.Vector3());
  if (postSize.z > postSize.x * 1.15) {
    clone.rotation.y = Math.PI / 2;
    clone.updateMatrixWorld(true);
  }

  // Scale to match buildDefaultBackpackContent() reference box (0.255m W x 0.34m H x 0.135m D)
  // so attachCalibratedArmorSockets packScaleVec scales default & custom packs identically.
  const normBox = new THREE.Box3().setFromObject(clone);
  const normSize = normBox.getSize(new THREE.Vector3());
  const fitX = 0.255 / Math.max(normSize.x, 0.05);
  const fitY = 0.34 / Math.max(normSize.y, 0.05);
  const fitZ = 0.175 / Math.max(normSize.z, 0.05);
  const fitScale = THREE.MathUtils.clamp((fitX + fitY) * 0.5, 0.1, 12);
  const depthCapped = THREE.MathUtils.clamp(Math.min(fitScale, fitZ * 1.35), 0.1, 12);
  clone.scale.multiplyScalar(depthCapped);
  clone.updateMatrixWorld(true);

  // Center X using median/centroid of vertices so asymmetric side pouches don't pull the pack off-spine
  const xs: number[] = [];
  const zs: number[] = [];
  const v = new THREE.Vector3();
  clone.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return;
    const pos = (obj as THREE.Mesh).geometry?.getAttribute('position');
    if (!pos || pos.count === 0) return;
    const step = Math.max(1, Math.floor(pos.count / 600));
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i).applyMatrix4(obj.matrixWorld);
      if (Number.isFinite(v.x) && Number.isFinite(v.z)) {
        xs.push(v.x);
        zs.push(v.z);
      }
    }
  });

  const box = new THREE.Box3().setFromObject(clone);
  const center = box.getCenter(new THREE.Vector3());
  let anchorX = center.x;
  let anchorFrontZ = box.max.z;
  if (xs.length >= 8) {
    xs.sort((a, b) => a - b);
    zs.sort((a, b) => a - b);
    // Trimmed mean over the inner 60% avoids single protruding straps/buckles skewing spine alignment
    const lo = Math.floor(xs.length * 0.2);
    const hi = Math.max(lo + 1, Math.ceil(xs.length * 0.8));
    let sumX = 0;
    for (let i = lo; i < hi; i++) sumX += xs[i];
    anchorX = sumX / (hi - lo);
    anchorFrontZ = zs[Math.min(zs.length - 1, Math.floor(zs.length * 0.94))];
  }

  clone.position.x -= anchorX;
  clone.position.y -= center.y;
  clone.position.z -= anchorFrontZ;
  clone.updateMatrixWorld(true);
  holder.add(clone);
  return holder;
}

export function buildPlayerArmorMeshes(): {
  helmetGroup: THREE.Group;
  helmetOffsetGroup: THREE.Group;
  vestGroup: THREE.Group;
  vestOffsetGroup: THREE.Group;
  backpackGroup: THREE.Group;
  backpackOffsetGroup: THREE.Group;
  dispose: () => void;
} {
  const helmetGroup = new THREE.Group();
  helmetGroup.visible = false;
  const helmetOffsetGroup = new THREE.Group();
  helmetOffsetGroup.add(buildDefaultHelmetContent());
  helmetGroup.add(helmetOffsetGroup);

  const vestGroup = new THREE.Group();
  vestGroup.visible = false;
  const vestOffsetGroup = new THREE.Group();
  vestOffsetGroup.add(buildDefaultVestContent());
  vestGroup.add(vestOffsetGroup);

  const backpackGroup = new THREE.Group();
  backpackGroup.visible = false;
  const backpackOffsetGroup = new THREE.Group();
  backpackOffsetGroup.add(buildDefaultBackpackContent());
  backpackGroup.add(backpackOffsetGroup);

  return {
    helmetGroup,
    helmetOffsetGroup,
    vestGroup,
    vestOffsetGroup,
    backpackGroup,
    backpackOffsetGroup,
    dispose: () => {},
  };
}

let sharedBowRes: {
  riserMat: THREE.MeshStandardMaterial;
  limbMat: THREE.MeshStandardMaterial;
  gripMat: THREE.MeshStandardMaterial;
  stringMat: THREE.MeshStandardMaterial;
  shaftMat: THREE.MeshStandardMaterial;
  headMat: THREE.MeshStandardMaterial;
  fletchMat: THREE.MeshStandardMaterial;
  riserGeo: THREE.BoxGeometry;
  leatherGeo: THREE.BoxGeometry;
  limbGeo: THREE.BoxGeometry;
  tipGeo: THREE.BoxGeometry;
  stringHalfGeo: THREE.CylinderGeometry;
  arrowShaftGeo: THREE.CylinderGeometry;
  arrowHeadGeo: THREE.ConeGeometry;
  fletchGeo: THREE.BoxGeometry;
  dispose: () => void;
} | null = null;

function getSharedBowRes() {
  if (!sharedBowRes) {
    const riserMat = markShared(
      new THREE.MeshStandardMaterial({ color: 0x5c361e, roughness: 0.68, metalness: 0.12 }),
    );
    const limbMat = markShared(
      new THREE.MeshStandardMaterial({ color: 0x262626, roughness: 0.45, metalness: 0.35 }),
    );
    const gripMat = markShared(new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.9 }));
    const stringMat = markShared(
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 }),
    );
    const shaftMat = markShared(
      new THREE.MeshStandardMaterial({ color: 0xd6a674, roughness: 0.72 }),
    );
    const headMat = markShared(
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.25, metalness: 0.9 }),
    );
    const fletchMat = markShared(
      new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: new THREE.Color(0x991b1b),
        emissiveIntensity: 0.25,
        roughness: 0.6,
      }),
    );
    const riserGeo = markShared(new THREE.BoxGeometry(0.038, 0.26, 0.048));
    const leatherGeo = markShared(new THREE.BoxGeometry(0.044, 0.13, 0.054));
    const limbGeo = markShared(new THREE.BoxGeometry(0.028, 0.34, 0.032));
    const tipGeo = markShared(new THREE.BoxGeometry(0.022, 0.16, 0.024));
    const stringHalfGeo = markShared(new THREE.CylinderGeometry(0.0045, 0.0045, 0.56, 5));
    const arrowShaftGeo = markShared(new THREE.CylinderGeometry(0.006, 0.006, 0.72, 6));
    arrowShaftGeo.rotateX(Math.PI / 2);
    const arrowHeadGeo = markShared(new THREE.ConeGeometry(0.016, 0.065, 4));
    arrowHeadGeo.rotateX(Math.PI / 2);
    const fletchGeo = markShared(new THREE.BoxGeometry(0.026, 0.004, 0.075));
    sharedBowRes = {
      riserMat,
      limbMat,
      gripMat,
      stringMat,
      shaftMat,
      headMat,
      fletchMat,
      riserGeo,
      leatherGeo,
      limbGeo,
      tipGeo,
      stringHalfGeo,
      arrowShaftGeo,
      arrowHeadGeo,
      fletchGeo,
      dispose: () => {
        [
          riserGeo,
          leatherGeo,
          limbGeo,
          tipGeo,
          stringHalfGeo,
          arrowShaftGeo,
          arrowHeadGeo,
          fletchGeo,
        ].forEach((g) => g.dispose());
        [riserMat, limbMat, gripMat, stringMat, shaftMat, headMat, fletchMat].forEach((m) =>
          m.dispose(),
        );
      },
    };
  }
  return sharedBowRes;
}

export function buildBowWeaponInstance(
  customBowTemplate: CustomEquipmentTemplate | null = null,
  customArrowTemplate: CustomEquipmentTemplate | null = null,
): BowInstance {
  const res = getSharedBowRes();
  const group = new THREE.Group();
  const stringUpperPivot = new THREE.Group();
  const stringLowerPivot = new THREE.Group();

  if (customBowTemplate) {
    group.add(customBowTemplate.scene.clone(true));
    group.add(stringUpperPivot, stringLowerPivot);
  } else {
    const riser = new THREE.Mesh(res.riserGeo, res.riserMat);
    riser.castShadow = true;

    const leather = new THREE.Mesh(res.leatherGeo, res.gripMat);
    group.add(riser, leather);

    const upperLimb = new THREE.Mesh(res.limbGeo, res.limbMat);
    upperLimb.position.set(0, 0.27, -0.028);
    upperLimb.rotation.x = 0.22;
    upperLimb.castShadow = true;

    const lowerLimb = new THREE.Mesh(res.limbGeo, res.limbMat);
    lowerLimb.position.set(0, -0.27, -0.028);
    lowerLimb.rotation.x = -0.22;
    lowerLimb.castShadow = true;

    const upperTip = new THREE.Mesh(res.tipGeo, res.riserMat);
    upperTip.position.set(0, 0.49, -0.085);
    upperTip.rotation.x = 0.44;

    const lowerTip = new THREE.Mesh(res.tipGeo, res.riserMat);
    lowerTip.position.set(0, -0.49, -0.085);
    lowerTip.rotation.x = -0.44;

    group.add(upperLimb, lowerLimb, upperTip, lowerTip);

    const upperStrMesh = new THREE.Mesh(res.stringHalfGeo, res.stringMat);
    upperStrMesh.position.y = -0.28;
    stringUpperPivot.position.set(0, 0.56, -0.115);
    stringUpperPivot.add(upperStrMesh);

    const lowerStrMesh = new THREE.Mesh(res.stringHalfGeo, res.stringMat);
    lowerStrMesh.position.y = 0.28;
    stringLowerPivot.position.set(0, -0.56, -0.115);
    stringLowerPivot.add(lowerStrMesh);

    group.add(stringUpperPivot, stringLowerPivot);
  }

  const nockedArrow = new THREE.Group();
  nockedArrow.position.set(-0.024, 0.06, 0);
  const nockedArrowOffset = new THREE.Group();
  nockedArrow.add(nockedArrowOffset);
  if (customArrowTemplate) {
    const customNocked = customArrowTemplate.scene.clone(true);
    customNocked.position.set(0, 0, 0.24);
    nockedArrowOffset.add(customNocked);
  } else {
    const arrowShaft = new THREE.Mesh(res.arrowShaftGeo, res.shaftMat);
    arrowShaft.position.z = 0.24;

    const arrowHead = new THREE.Mesh(res.arrowHeadGeo, res.headMat);
    arrowHead.position.z = 0.62;

    const fletchA = new THREE.Mesh(res.fletchGeo, res.fletchMat);
    fletchA.position.z = -0.07;
    const fletchB = new THREE.Mesh(res.fletchGeo, res.fletchMat);
    fletchB.position.z = -0.07;
    fletchB.rotation.z = Math.PI / 2;

    nockedArrowOffset.add(arrowShaft, arrowHead, fletchA, fletchB);
  }
  nockedArrow.visible = false;
  group.add(nockedArrow);

  group.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.frustumCulled = false;
    }
  });

  return {
    group,
    stringUpperPivot,
    stringLowerPivot,
    nockedArrow,
    nockedArrowOffset,
    dispose: () => {
      group.clear();
    },
  };
}

export interface HandArrowInstance {
  group: THREE.Group;
  offsetGroup: THREE.Group;
  dispose: () => void;
}

export function buildHandArrowInstance(
  customArrowTemplate: CustomEquipmentTemplate | null = null,
): HandArrowInstance {
  const res = getSharedBowRes();
  const group = new THREE.Group();
  const offsetGroup = new THREE.Group();
  group.add(offsetGroup);

  if (customArrowTemplate) {
    const customArrow = customArrowTemplate.scene.clone(true);
    customArrow.position.set(0, 0, 0.34);
    offsetGroup.add(customArrow);
  } else {
    // Nock pinched at right-hand grip origin (z = 0); shaft & broadhead extend along +Z toward bow rest
    const arrowShaft = new THREE.Mesh(res.arrowShaftGeo, res.shaftMat);
    arrowShaft.position.z = 0.34;

    const arrowHead = new THREE.Mesh(res.arrowHeadGeo, res.headMat);
    arrowHead.position.z = 0.72;

    const fletchA = new THREE.Mesh(res.fletchGeo, res.fletchMat);
    fletchA.position.z = 0.04;
    const fletchB = new THREE.Mesh(res.fletchGeo, res.fletchMat);
    fletchB.position.z = 0.04;
    fletchB.rotation.z = Math.PI / 2;

    offsetGroup.add(arrowShaft, arrowHead, fletchA, fletchB);
  }

  group.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      child.frustumCulled = false;
    }
  });

  return {
    group,
    offsetGroup,
    dispose: () => {
      group.clear();
    },
  };
}

let sharedArrowProjRes: {
  shaftGeo: THREE.CylinderGeometry;
  headGeo: THREE.ConeGeometry;
  fletchGeo: THREE.BoxGeometry;
  shaftMat: THREE.MeshStandardMaterial;
  headMat: THREE.MeshStandardMaterial;
  fletchMat: THREE.MeshStandardMaterial;
  dispose: () => void;
} | null = null;

function getSharedArrowProjRes() {
  if (!sharedArrowProjRes) {
    const shaftMat = markShared(
      new THREE.MeshStandardMaterial({ color: 0xd6a674, roughness: 0.7 }),
    );
    const headMat = markShared(
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.22, metalness: 0.9 }),
    );
    const fletchMat = markShared(
      new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: new THREE.Color(0xdc2626),
        emissiveIntensity: 0.45,
        roughness: 0.45,
      }),
    );
    const shaftGeo = markShared(new THREE.CylinderGeometry(0.009, 0.009, 0.76, 6));
    shaftGeo.rotateX(Math.PI / 2);
    const headGeo = markShared(new THREE.ConeGeometry(0.024, 0.09, 4));
    headGeo.rotateX(Math.PI / 2);
    const fletchGeo = markShared(new THREE.BoxGeometry(0.042, 0.005, 0.11));
    sharedArrowProjRes = {
      shaftGeo,
      headGeo,
      fletchGeo,
      shaftMat,
      headMat,
      fletchMat,
      dispose: () => {
        [shaftGeo, headGeo, fletchGeo].forEach((g) => g.dispose());
        [shaftMat, headMat, fletchMat].forEach((m) => m.dispose());
      },
    };
  }
  return sharedArrowProjRes;
}

export function buildArrowProjectileMesh(
  customArrowTemplate: CustomEquipmentTemplate | null = null,
): THREE.Group {
  if (customArrowTemplate) {
    const arrowGroup = new THREE.Group();
    arrowGroup.add(customArrowTemplate.scene.clone(true));
    return arrowGroup;
  }
  const res = getSharedArrowProjRes();
  const arrowGroup = new THREE.Group();
  const shaft = new THREE.Mesh(res.shaftGeo, res.shaftMat);
  const head = new THREE.Mesh(res.headGeo, res.headMat);
  head.position.z = 0.41;

  const f1 = new THREE.Mesh(res.fletchGeo, res.fletchMat);
  f1.position.z = -0.31;
  const f2 = new THREE.Mesh(res.fletchGeo, res.fletchMat);
  f2.position.z = -0.31;
  f2.rotation.z = Math.PI / 2;
  arrowGroup.add(shaft, head, f1, f2);
  return arrowGroup;
}

export interface CharacterRig {
  character: BaseCharacter;
  root: THREE.Group;
  bodyPivot: THREE.Group;
  isCustomGlb: boolean;
  bones: HumanoidBoneMap;
  pistolMount: THREE.Group;
  pistolMesh: THREE.Group;
  pistolMuzzle: THREE.Object3D;
  disposePistolInstance: () => void;
  rifleMount: THREE.Group;
  rifleMesh: THREE.Group;
  rifleForegrip: THREE.Object3D;
  rifleMuzzle: THREE.Object3D;
  disposeRifleInstance: () => void;
  stickMount: THREE.Group;
  stickMesh: THREE.Group;
  disposeStickInstance: () => void;
  batonMount: THREE.Group;
  batonMesh: THREE.Group;
  disposeBatonInstance: () => void;
  bowMount: THREE.Group;
  bowMesh: THREE.Group;
  bowStringUpper: THREE.Group;
  bowStringLower: THREE.Group;
  bowNockedArrow: THREE.Group;
  bowNockedArrowOffset?: THREE.Group;
  disposeBowInstance: () => void;
  arrowMount: THREE.Group;
  arrowMesh: THREE.Group;
  disposeArrowInstance: () => void;
  throwableMount: THREE.Group;
  equipHelmetMesh: THREE.Group;
  equipHelmetOffset?: THREE.Group;
  equipVestMesh: THREE.Group;
  equipVestOffset?: THREE.Group;
  equipBackpackMesh: THREE.Group;
  equipBackpackOffset?: THREE.Group;
  equipBackpackBasePos?: THREE.Vector3;
  equipBackpackVestOffset?: THREE.Vector3;
  disposeArmorVisuals: () => void;
  visorMat?: THREE.MeshStandardMaterial;
  mixer?: THREE.AnimationMixer | null;
  clips?: Record<string, THREE.AnimationAction>;
  playClip?: (name: string, fadeSec?: number, timeScale?: number, forceRestart?: boolean) => boolean;
  resetClips?: () => void;
  dispose: () => void;
}

export function registerCharacterRigAttachments(character: BaseCharacter, rig: CharacterRig): void {
  character.setSocket('pistol', rig.pistolMount);
  character.setSocket('rifle', rig.rifleMount);
  character.setSocket('stick', rig.stickMount);
  character.setSocket('baton', rig.batonMount);
  character.setSocket('bow', rig.bowMount);
  character.setSocket('arrow', rig.arrowMount);
  character.setSocket('throwable', rig.throwableMount);
  character.setSocket('helmet', rig.equipHelmetMesh);
  character.setSocket('vest', rig.equipVestMesh);
  character.setSocket('backpack', rig.equipBackpackMesh);

  character.clearAttachmentsForItem('helmet');
  character.clearAttachmentsForItem('vest');
  character.clearAttachmentsForItem('backpack');
  character.clearAttachmentsForItem('rifle');
  character.clearAttachmentsForItem('pistol');
  character.clearAttachmentsForItem('bow');
  character.clearAttachmentsForItem('arrow');
  character.clearAttachmentsForItem('stick');
  character.clearAttachmentsForItem('baton');

  character.registerAttachment('helmet', rig.equipHelmetOffset ?? rig.equipHelmetMesh);
  character.registerAttachment('vest', rig.equipVestOffset ?? rig.equipVestMesh);
  character.registerAttachment('backpack', rig.equipBackpackOffset ?? rig.equipBackpackMesh);
  character.registerAttachment('rifle', rig.rifleMesh);
  character.registerAttachment('pistol', rig.pistolMesh);
  character.registerAttachment('bow', rig.bowMesh);
  character.registerAttachment('arrow', rig.bowNockedArrowOffset ?? rig.arrowMesh);
  character.registerAttachment('stick', rig.stickMesh);
  character.registerAttachment('baton', rig.batonMesh);
}

export function applyPlayerAttachmentTransformsToRig(
  rig: CharacterRig,
  transforms?: Partial<Record<PlayerAttachableId, AttachmentTransform>> | null,
  heldThrowables?: Partial<
    Record<'molotov' | 'nail_bomb' | 'grenade' | 'bottle' | 'can' | 'brick', THREE.Object3D | null>
  >,
): void {
  const map = transforms ?? {};
  rig.character.applyAttachmentTransforms(map);
  if (heldThrowables) {
    applyAttachmentOffsetToNode(heldThrowables.molotov, map.molotov);
    applyAttachmentOffsetToNode(heldThrowables.nail_bomb, map.nail_bomb);
    applyAttachmentOffsetToNode(heldThrowables.grenade, map.grenade);
    applyAttachmentOffsetToNode(heldThrowables.bottle, map.bottle);
    applyAttachmentOffsetToNode(heldThrowables.can, map.can);
    applyAttachmentOffsetToNode(heldThrowables.brick, map.brick);
  }
}

export function applyPistolToRig(
  rig: CharacterRig,
  customTemplate: CustomPistolTemplate | null,
) {
  const wasVisible = rig.pistolMesh.visible;
  rig.pistolMount.remove(rig.pistolMesh);
  rig.disposePistolInstance();

  const next = customTemplate
    ? buildCustomPistolInstance(customTemplate)
    : buildDefaultPistolInstance();
  next.group.visible = wasVisible;
  rig.pistolMesh = next.group;
  rig.pistolMuzzle = next.muzzleNode;
  rig.disposePistolInstance = next.dispose;
  rig.pistolMount.add(next.group);
  rig.character.clearAttachmentsForItem('pistol');
  rig.character.registerAttachment('pistol', next.group);
}

export function applyRifleToRig(
  rig: CharacterRig,
  customTemplate: CustomRifleTemplate | null,
) {
  const wasVisible = rig.rifleMesh.visible;
  rig.rifleMount.remove(rig.rifleMesh);
  rig.disposeRifleInstance();

  const next = customTemplate
    ? buildCustomRifleInstance(customTemplate)
    : buildDefaultRifleInstance();
  next.group.visible = wasVisible;
  rig.rifleMesh = next.group;
  rig.rifleForegrip = next.foregripTarget;
  rig.rifleMuzzle = next.muzzleNode;
  rig.disposeRifleInstance = next.dispose;
  rig.rifleMount.add(next.group);
  rig.character.clearAttachmentsForItem('rifle');
  rig.character.registerAttachment('rifle', next.group);
}

export function applyEquipmentToRig(
  rig: CharacterRig,
  kind: CustomEquipmentId,
  customTemplate: CustomEquipmentTemplate | null,
  customArrowTemplate: CustomEquipmentTemplate | null = null,
) {
  if (kind === 'helmet') {
    const target = rig.equipHelmetOffset ?? rig.equipHelmetMesh;
    target.clear();
    target.add(customTemplate ? customTemplate.scene.clone(true) : buildDefaultHelmetContent());
  } else if (kind === 'vest') {
    const target = rig.equipVestOffset ?? rig.equipVestMesh;
    target.clear();
    target.add(customTemplate ? customTemplate.scene.clone(true) : buildDefaultVestContent());
  } else if (kind === 'stick') {
    const wasVisible = rig.stickMesh.visible;
    rig.stickMount.remove(rig.stickMesh);
    rig.disposeStickInstance();
    const next = customTemplate
      ? buildCustomStickInstance(customTemplate)
      : buildStickWeaponInstance();
    next.group.visible = wasVisible;
    rig.stickMesh = next.group;
    rig.disposeStickInstance = next.dispose;
    rig.stickMount.add(next.group);
    rig.character.clearAttachmentsForItem('stick');
    rig.character.registerAttachment('stick', next.group);
  } else if (kind === 'baton') {
    const wasVisible = rig.batonMesh.visible;
    rig.batonMount.remove(rig.batonMesh);
    rig.disposeBatonInstance();
    const next = customTemplate
      ? buildCustomBatonInstance(customTemplate)
      : buildBatonWeaponInstance();
    next.group.visible = wasVisible;
    rig.batonMesh = next.group;
    rig.disposeBatonInstance = next.dispose;
    rig.batonMount.add(next.group);
    rig.character.clearAttachmentsForItem('baton');
    rig.character.registerAttachment('baton', next.group);
  } else if (kind === 'bow') {
    const wasVisible = rig.bowMesh.visible;
    rig.bowMount.remove(rig.bowMesh);
    rig.disposeBowInstance();
    const next = buildBowWeaponInstance(customTemplate, null);
    next.group.visible = wasVisible;
    next.nockedArrow.visible = false;
    rig.bowMesh = next.group;
    rig.bowStringUpper = next.stringUpperPivot;
    rig.bowStringLower = next.stringLowerPivot;
    rig.disposeBowInstance = next.dispose;
    rig.bowMount.add(next.group);
    rig.character.clearAttachmentsForItem('bow');
    rig.character.registerAttachment('bow', next.group);
    if (customArrowTemplate) {
      applyEquipmentToRig(rig, 'arrow', customArrowTemplate);
    }
  } else if (kind === 'arrow') {
    const arrowWasVisible = rig.arrowMesh.visible;
    rig.arrowMount.remove(rig.arrowMesh);
    rig.disposeArrowInstance();
    const nextArrow = buildHandArrowInstance(customTemplate);
    nextArrow.group.visible = arrowWasVisible;
    rig.arrowMesh = nextArrow.group;
    rig.bowNockedArrow = nextArrow.group;
    rig.bowNockedArrowOffset = nextArrow.offsetGroup;
    rig.disposeArrowInstance = nextArrow.dispose;
    rig.arrowMount.add(nextArrow.group);
    rig.character.clearAttachmentsForItem('arrow');
    rig.character.registerAttachment('arrow', nextArrow.offsetGroup);
  }
}

export function applyBackpackOverrideToRig(
  rig: CharacterRig,
  customTemplate: CustomObjectTemplate | null,
) {
  const target = rig.equipBackpackOffset ?? rig.equipBackpackMesh;
  target.clear();
  target.add(
    customTemplate ? buildCustomBackpackContent(customTemplate) : buildDefaultBackpackContent(),
  );
}

export function buildDefaultSurvivor(
  customRifleTemplate: CustomRifleTemplate | null = null,
  customPistolTemplate: CustomPistolTemplate | null = null,
): CharacterRig {
  const root = new THREE.Group();
  root.name = 'ApocalypseSurvivor';
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const bootMat = new THREE.MeshStandardMaterial({
    color: 0x1b1917,
    roughness: 0.88,
    metalness: 0.06,
  });
  const cargoMat = new THREE.MeshStandardMaterial({
    color: 0x3f433a,
    roughness: 0.85,
    metalness: 0.04,
  });
  const vestMat = new THREE.MeshStandardMaterial({
    color: 0x242b33,
    roughness: 0.62,
    metalness: 0.25,
  });
  const packMat = new THREE.MeshStandardMaterial({
    color: 0x5c4732,
    roughness: 0.78,
    metalness: 0.06,
  });
  const helmetMat = new THREE.MeshStandardMaterial({
    color: 0x2c333c,
    roughness: 0.42,
    metalness: 0.48,
  });
  const gunMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1b1f25,
    roughness: 0.26,
    metalness: 0.88,
  });
  const gloveMat = new THREE.MeshStandardMaterial({
    color: 0x1c1e22,
    roughness: 0.8,
    metalness: 0.12,
  });
  const visorMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: new THREE.Color(0xf59e0b),
    emissiveIntensity: 1.7,
    roughness: 0.18,
    metalness: 0.15,
  });

  const hipsGroup = new THREE.Group();
  hipsGroup.position.set(0, 0.86, 0);
  bodyPivot.add(hipsGroup);

  const hipJointGeo = new THREE.SphereGeometry(0.104, 8, 8);
  const kneeJointGeo = new THREE.SphereGeometry(0.096, 8, 8);
  const ankleJointGeo = new THREE.SphereGeometry(0.076, 8, 8);
  const shoulderJointGeo = new THREE.SphereGeometry(0.082, 8, 8);
  const elbowJointGeo = new THREE.SphereGeometry(0.066, 8, 8);
  const wristJointGeo = new THREE.SphereGeometry(0.054, 8, 8);

  const thighGeo = new THREE.CylinderGeometry(0.115, 0.098, 0.42, 10);
  thighGeo.translate(0, -0.21, 0);
  const shinGeo = new THREE.CylinderGeometry(0.094, 0.078, 0.36, 10);
  shinGeo.translate(0, -0.18, 0);
  const bootGeo = new THREE.BoxGeometry(0.165, 0.13, 0.27);

  const makeLeg = (xOffset: number) => {
    const hipPivot = new THREE.Group();
    hipPivot.position.set(xOffset, 0, 0);

    const hipCap = new THREE.Mesh(hipJointGeo, cargoMat);
    hipCap.castShadow = true;
    hipPivot.add(hipCap);

    const thigh = new THREE.Mesh(thighGeo, cargoMat);
    thigh.castShadow = true;
    hipPivot.add(thigh);

    const kneePivot = new THREE.Group();
    kneePivot.position.set(0, -0.42, 0);
    hipPivot.add(kneePivot);

    const kneeCap = new THREE.Mesh(kneeJointGeo, vestMat);
    kneeCap.castShadow = true;
    kneePivot.add(kneeCap);

    const shin = new THREE.Mesh(shinGeo, cargoMat);
    shin.castShadow = true;
    kneePivot.add(shin);

    const anklePivot = new THREE.Group();
    anklePivot.position.set(0, -0.36, 0);
    kneePivot.add(anklePivot);

    const ankleBall = new THREE.Mesh(ankleJointGeo, bootMat);
    anklePivot.add(ankleBall);

    const boot = new THREE.Mesh(bootGeo, bootMat);
    boot.position.set(0, -0.02, 0.055);
    boot.castShadow = true;
    anklePivot.add(boot);

    return { hipPivot, kneePivot, anklePivot };
  };

  // Character faces +Z with +Y up: +X is anatomical LEFT, -X is anatomical RIGHT
  const legL = makeLeg(0.145);
  const legR = makeLeg(-0.145);
  hipsGroup.add(legL.hipPivot, legR.hipPivot);

  const torsoGroup = new THREE.Group();
  torsoGroup.position.set(0, 0.04, 0);
  hipsGroup.add(torsoGroup);

  const waistGeo = new THREE.BoxGeometry(0.43, 0.25, 0.26);
  const waistMesh = new THREE.Mesh(waistGeo, cargoMat);
  waistMesh.position.y = 0.12;
  waistMesh.castShadow = true;
  waistMesh.receiveShadow = true;
  torsoGroup.add(waistMesh);

  const chestGroup = new THREE.Group();
  chestGroup.position.set(0, 0.24, 0);
  torsoGroup.add(chestGroup);

  const torsoGeo = new THREE.BoxGeometry(0.48, 0.38, 0.29);
  const torso = new THREE.Mesh(torsoGeo, vestMat);
  torso.position.y = 0.19;
  torso.castShadow = true;
  torso.receiveShadow = true;
  chestGroup.add(torso);

  const neckPivot = new THREE.Group();
  neckPivot.position.set(0, 0.38, 0);
  chestGroup.add(neckPivot);

  const neckGeo = new THREE.CylinderGeometry(0.068, 0.078, 0.09, 8);
  const neckMesh = new THREE.Mesh(neckGeo, gloveMat);
  neckMesh.position.y = 0.025;
  neckPivot.add(neckMesh);

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.04, 0);
  neckPivot.add(headPivot);

  const helmetGeo = new THREE.SphereGeometry(0.205, 14, 12);
  const helmet = new THREE.Mesh(helmetGeo, helmetMat);
  helmet.position.set(0, 0.19, 0);
  helmet.scale.set(1, 1.05, 1.08);
  helmet.castShadow = true;
  headPivot.add(helmet);

  const visorGeo = new THREE.BoxGeometry(0.26, 0.085, 0.14);
  const visor = new THREE.Mesh(visorGeo, visorMat);
  visor.position.set(0, 0.19, 0.18);
  headPivot.add(visor);

  const maskGeo = new THREE.CylinderGeometry(0.072, 0.072, 0.12, 8);
  const maskFilter = new THREE.Mesh(maskGeo, gunMetalMat);
  maskFilter.rotation.x = Math.PI / 2;
  maskFilter.position.set(0, 0.08, 0.21);
  headPivot.add(maskFilter);

  // Articulated 3-segment Human Arms (Shoulder -> Elbow/ForeArm -> Wrist/Hand with Palm & Curling Fingers)
  const upperArmGeo = new THREE.CylinderGeometry(0.076, 0.066, 0.31, 8);
  upperArmGeo.translate(0, -0.155, 0);
  const foreArmGeo = new THREE.CylinderGeometry(0.064, 0.052, 0.29, 8);
  foreArmGeo.translate(0, -0.145, 0);
  // Hand geometry in anatomical hanging rest: fingers (-Y), palm inward (+X right arm / -X left arm), thumb front (+Z)
  const handGeo = new THREE.BoxGeometry(0.044, 0.082, 0.072);
  const fingersWrapGeo = new THREE.BoxGeometry(0.036, 0.058, 0.064);
  fingersWrapGeo.translate(0, -0.029, 0);
  const thumbWrapGeo = new THREE.BoxGeometry(0.028, 0.052, 0.026);
  const _rightCurlAxis = new THREE.Vector3(0, 0, 1);
  const _leftCurlAxis = new THREE.Vector3(0, 0, -1);

  const makeArm = (xOffset: number) => {
    const isLeftArm = xOffset > 0;
    const palmSign = isLeftArm ? -1 : 1;
    const shoulderPivot = new THREE.Group();
    shoulderPivot.position.set(xOffset, 0.54, 0.02);

    const shoulderBall = new THREE.Mesh(shoulderJointGeo, vestMat);
    shoulderPivot.add(shoulderBall);

    const upperMesh = new THREE.Mesh(upperArmGeo, cargoMat);
    upperMesh.castShadow = true;
    shoulderPivot.add(upperMesh);

    const elbowPivot = new THREE.Group();
    elbowPivot.position.set(0, -0.31, 0);
    shoulderPivot.add(elbowPivot);

    const elbowBall = new THREE.Mesh(elbowJointGeo, vestMat);
    elbowPivot.add(elbowBall);

    const foreMesh = new THREE.Mesh(foreArmGeo, cargoMat);
    foreMesh.castShadow = true;
    elbowPivot.add(foreMesh);

    const handPivot = new THREE.Group();
    handPivot.position.set(0, -0.29, 0);
    elbowPivot.add(handPivot);

    const wristBall = new THREE.Mesh(wristJointGeo, gloveMat);
    handPivot.add(wristBall);

    const glove = new THREE.Mesh(handGeo, gloveMat);
    glove.position.set(0, -0.042, 0);
    glove.castShadow = true;
    handPivot.add(glove);

    // Hinged fingers pivot at knuckles so fingers curl cleanly around pistol/rifle grips & throwables
    const fingerPivot = new THREE.Group();
    fingerPivot.position.set(palmSign * 0.004, -0.078, 0);
    handPivot.add(fingerPivot);

    const fingersWrap = new THREE.Mesh(fingersWrapGeo, gloveMat);
    fingersWrap.castShadow = true;
    fingerPivot.add(fingersWrap);

    const thumbPivot = new THREE.Group();
    thumbPivot.position.set(palmSign * 0.014, -0.036, 0.036);
    thumbPivot.rotation.set(0.32, 0, palmSign * -0.18);
    handPivot.add(thumbPivot);

    const thumbWrap = new THREE.Mesh(thumbWrapGeo, gloveMat);
    thumbWrap.position.set(0, -0.022, 0.006);
    thumbWrap.castShadow = true;
    thumbPivot.add(thumbWrap);

    const curlAxis = isLeftArm ? _leftCurlAxis : _rightCurlAxis;
    const fingerBones: FingerCurlBone[] = [
      {
        node: fingerPivot,
        restQuat: fingerPivot.quaternion.clone(),
        localCurlAxis: curlAxis.clone(),
        weight: 1.0,
        isThumb: false,
      },
      {
        node: thumbPivot,
        restQuat: thumbPivot.quaternion.clone(),
        localCurlAxis: new THREE.Vector3(0.45, 0, palmSign * 0.89).normalize(),
        weight: 0.45,
        isThumb: true,
      },
    ];

    return { shoulderPivot, elbowPivot, handPivot, fingerBones };
  };

  // +X is anatomical LEFT arm, -X is anatomical RIGHT arm
  const armL = makeArm(0.305);
  const armR = makeArm(-0.305);
  armL.shoulderPivot.position.set(0.305, 0.30, 0.02);
  armR.shoulderPivot.position.set(-0.305, 0.30, 0.02);
  chestGroup.add(armL.shoulderPivot, armR.shoulderPivot);

  // Calibrated grip frames matching custom GLB skeletons:
  // Right hand: [+palmIn=(1,0,0), +thumb=(0,0,1), +finger=(0,-1,0)]
  // Left hand:  [+palmIn=(-1,0,0), +finger=(0,-1,0), +thumb=(0,0,1)]
  const rightGripMat = new THREE.Matrix4().makeBasis(
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, -1, 0),
  );
  const rightGripLocalQ = new THREE.Quaternion().setFromRotationMatrix(rightGripMat);
  const rightGunTiltQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.14);

  const leftGripMat = new THREE.Matrix4().makeBasis(
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(0, 0, 1),
  );
  const leftGripLocalQ = new THREE.Quaternion().setFromRotationMatrix(leftGripMat);

  // Mount weapons squarely inside Right Hand palm pocket (+X palm side & -Y knuckle pocket)
  const rightPalmOffset = new THREE.Vector3(0.026, -0.052, 0.008);

  const pistolMount = new THREE.Group();
  pistolMount.position.copy(rightPalmOffset);
  pistolMount.quaternion.copy(rightGripLocalQ).multiply(rightGunTiltQ);
  armR.handPivot.add(pistolMount);

  const pistol = customPistolTemplate
    ? buildCustomPistolInstance(customPistolTemplate)
    : buildDefaultPistolInstance();
  pistol.group.visible = false;
  pistolMount.add(pistol.group);

  const rifleMount = new THREE.Group();
  rifleMount.position.copy(rightPalmOffset);
  rifleMount.quaternion.copy(rightGripLocalQ).multiply(rightGunTiltQ);
  armR.handPivot.add(rifleMount);

  const rifle = customRifleTemplate
    ? buildCustomRifleInstance(customRifleTemplate)
    : buildDefaultRifleInstance();
  rifleMount.add(rifle.group);

  const stickMount = new THREE.Group();
  stickMount.position.copy(rightPalmOffset);
  stickMount.quaternion.copy(rightGripLocalQ);
  armR.handPivot.add(stickMount);

  const stick = buildStickWeaponInstance();
  stick.group.visible = false;
  stickMount.add(stick.group);

  const batonMount = new THREE.Group();
  batonMount.position.copy(rightPalmOffset);
  batonMount.quaternion.copy(rightGripLocalQ);
  armR.handPivot.add(batonMount);

  const baton = buildBatonWeaponInstance();
  baton.group.visible = false;
  batonMount.add(baton.group);

  const playerArmor = buildPlayerArmorMeshes();
  playerArmor.helmetGroup.position.set(0, 0.19, 0.005);
  playerArmor.helmetGroup.scale.set(1.76, 1.68, 1.76);
  headPivot.add(playerArmor.helmetGroup);

  playerArmor.vestGroup.position.set(0, 0.11, 0);
  playerArmor.vestGroup.scale.set(1.68, 1.48, 1.62);
  chestGroup.add(playerArmor.vestGroup);

  const backpackBasePos = new THREE.Vector3(0, 0.15, -0.145);
  const backpackVestOffset = new THREE.Vector3(0, 0, -0.042);
  playerArmor.backpackGroup.position.copy(backpackBasePos);
  playerArmor.backpackGroup.scale.set(1.38, 1.28, 1.36);
  chestGroup.add(playerArmor.backpackGroup);

  // Bow mounts on LEFT hand so right hand draws the string back
  // In leftGripLocalQ frame: X = palmIn, Y = finger (forward when aiming), Z = thumb (up when aiming)
  const leftBowAlignMat = new THREE.Matrix4().makeBasis(
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, 1, 0),
  );
  const leftBowAlignQ = new THREE.Quaternion().setFromRotationMatrix(leftBowAlignMat);
  const leftPalmOffset = new THREE.Vector3(-0.026, -0.052, 0.008);
  const bowMount = new THREE.Group();
  bowMount.position.copy(leftPalmOffset);
  bowMount.quaternion.copy(leftGripLocalQ).multiply(leftBowAlignQ);
  armL.handPivot.add(bowMount);

  const bow = buildBowWeaponInstance();
  bow.group.visible = false;
  bowMount.add(bow.group);

  // Drawn arrow mounts directly on RIGHT hand palm/pinch pocket (+Z points forward toward bow)
  const arrowMount = new THREE.Group();
  arrowMount.position.copy(rightPalmOffset);
  arrowMount.quaternion.copy(rightGripLocalQ);
  armR.handPivot.add(arrowMount);

  const handArrow = buildHandArrowInstance();
  handArrow.group.visible = false;
  arrowMount.add(handArrow.group);

  const throwableMount = new THREE.Group();
  throwableMount.position.set(0.028, -0.048, 0.01);
  throwableMount.quaternion.copy(rightGripLocalQ);
  armR.handPivot.add(throwableMount);

  const bones: HumanoidBoneMap = {
    hips: captureBoneRest(hipsGroup),
    spine: captureBoneRest(torsoGroup),
    chest: captureBoneRest(chestGroup),
    neck: captureBoneRest(neckPivot),
    head: captureBoneRest(headPivot),
    leftUpLeg: captureBoneRest(legL.hipPivot),
    leftLeg: captureBoneRest(legL.kneePivot),
    leftFoot: captureBoneRest(legL.anklePivot),
    rightUpLeg: captureBoneRest(legR.hipPivot),
    rightLeg: captureBoneRest(legR.kneePivot),
    rightFoot: captureBoneRest(legR.anklePivot),
    leftArm: captureBoneRest(armL.shoulderPivot),
    leftForeArm: captureBoneRest(armL.elbowPivot),
    leftHandRest: captureBoneRest(armL.handPivot),
    rightArm: captureBoneRest(armR.shoulderPivot),
    rightForeArm: captureBoneRest(armR.elbowPivot),
    rightHandRest: captureBoneRest(armR.handPivot),
    rightHand: armR.handPivot,
    leftHand: armL.handPivot,
    armDropAngle: 0,
    rightGripLocalQ,
    leftGripLocalQ,
    rightPalmOffset,
    leftPalmOffset,
    rightArmBendLocal: new THREE.Vector3(0, 0, -1),
    leftArmBendLocal: new THREE.Vector3(0, 0, -1),
    rightForeArmPalmLocal: new THREE.Vector3(1, 0, 0),
    leftForeArmPalmLocal: new THREE.Vector3(-1, 0, 0),
    rightFingers: armR.fingerBones,
    leftFingers: armL.fingerBones,
  };

  const geometries = [
    hipJointGeo,
    kneeJointGeo,
    ankleJointGeo,
    shoulderJointGeo,
    elbowJointGeo,
    wristJointGeo,
    thighGeo,
    shinGeo,
    bootGeo,
    waistGeo,
    torsoGeo,
    neckGeo,
    helmetGeo,
    visorGeo,
    maskGeo,
    upperArmGeo,
    foreArmGeo,
    handGeo,
    fingersWrapGeo,
    thumbWrapGeo,
  ];
  const materials = [
    bootMat,
    cargoMat,
    vestMat,
    packMat,
    helmetMat,
    gunMetalMat,
    gloveMat,
    visorMat,
  ];

  const baseCharacter = new BaseCharacter({
    entityId: 'player',
    label: 'Ricardo López (Protagonista)',
    role: 'player',
    tag: 'player',
    root,
    bodyPivot,
    modelRoot: bodyPivot,
    isCustomGlb: false,
    bones,
  });

  const rig: CharacterRig = {
    character: baseCharacter,
    root,
    bodyPivot,
    isCustomGlb: false,
    bones,
    pistolMount,
    pistolMesh: pistol.group,
    pistolMuzzle: pistol.muzzleNode,
    disposePistolInstance: pistol.dispose,
    rifleMount,
    rifleMesh: rifle.group,
    rifleForegrip: rifle.foregripTarget,
    rifleMuzzle: rifle.muzzleNode,
    disposeRifleInstance: rifle.dispose,
    stickMount,
    stickMesh: stick.group,
    disposeStickInstance: stick.dispose,
    batonMount,
    batonMesh: baton.group,
    disposeBatonInstance: baton.dispose,
    bowMount,
    bowMesh: bow.group,
    bowStringUpper: bow.stringUpperPivot,
    bowStringLower: bow.stringLowerPivot,
    bowNockedArrow: handArrow.group,
    bowNockedArrowOffset: handArrow.offsetGroup,
    disposeBowInstance: bow.dispose,
    arrowMount,
    arrowMesh: handArrow.group,
    disposeArrowInstance: handArrow.dispose,
    throwableMount,
    equipHelmetMesh: playerArmor.helmetGroup,
    equipHelmetOffset: playerArmor.helmetOffsetGroup,
    equipVestMesh: playerArmor.vestGroup,
    equipVestOffset: playerArmor.vestOffsetGroup,
    equipBackpackMesh: playerArmor.backpackGroup,
    equipBackpackOffset: playerArmor.backpackOffsetGroup,
    equipBackpackBasePos: backpackBasePos,
    equipBackpackVestOffset: backpackVestOffset,
    disposeArmorVisuals: playerArmor.dispose,
    visorMat,
    dispose: () => {
      baseCharacter.dispose();
      rig.disposePistolInstance();
      rig.disposeRifleInstance();
      rig.disposeStickInstance();
      rig.disposeBatonInstance();
      rig.disposeBowInstance();
      rig.disposeArrowInstance();
      rig.disposeArmorVisuals();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };

  registerCharacterRigAttachments(baseCharacter, rig);
  prepareActorHierarchy(root, false);

  return rig;
}

export function prepareActorHierarchy(root: THREE.Object3D, sanitizeOpaqueBlend = false) {
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      // SkinnedMesh and bone-driven limbs deform outside their static bind-pose bounding sphere;
      // disabling frustum culling avoids sub-meshes popping out in parts while walking.
      mesh.frustumCulled = false;

      if (!sanitizeOpaqueBlend) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => {
        if (!m) return;
        const stdMat = m as THREE.MeshStandardMaterial;
        const hasAlphaMap = 'alphaMap' in stdMat && Boolean(stdMat.alphaMap);
        if (m.transparent && m.opacity >= 0.98 && !hasAlphaMap) {
          m.transparent = false;
          m.depthWrite = true;
          m.depthTest = true;
          if ('map' in stdMat && stdMat.map) {
            m.alphaTest = Math.max(m.alphaTest || 0, 0.35);
          }
          m.needsUpdate = true;
        } else if (!m.transparent) {
          m.depthWrite = true;
          m.depthTest = true;
        }
      });
    }
  });
}

export function normalizeModelToHeight(
  model: THREE.Object3D,
  targetHeight: number,
  isCharacter = false,
) {
  model.updateMatrixWorld(true);
  const rawBox = new THREE.Box3().setFromObject(model);
  const size = rawBox.getSize(new THREE.Vector3());
  const center = rawBox.getCenter(new THREE.Vector3());

  const maxHeight = Math.max(size.y, 0.01);
  const scaleFactor = THREE.MathUtils.clamp(targetHeight / maxHeight, 0.01, 100);
  model.scale.multiplyScalar(scaleFactor);
  model.updateMatrixWorld(true);

  const scaledBox = new THREE.Box3().setFromObject(model);
  const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
  model.position.x -= scaledCenter.x;
  model.position.z -= scaledCenter.z;
  model.position.y -= scaledBox.min.y;

  if (!Number.isFinite(model.position.y)) {
    model.position.set(-center.x, 0, -center.z);
  }

  model.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => {
        if (m && 'envMapIntensity' in m) {
          (m as THREE.MeshStandardMaterial).envMapIntensity = 0.9;
        }
      });
    }
  });
  prepareActorHierarchy(model, isCharacter);
}

// ClipController & animation helpers live in ./baseCharacter.ts

export function attachCalibratedArmorSockets(
  model: THREE.Object3D,
  bodyPivot: THREE.Group,
  bones: HumanoidBoneMap,
  armor: {
    helmetGroup: THREE.Group;
    vestGroup: THREE.Group;
    backpackGroup: THREE.Group;
  },
  scaleMult = 1.0,
): { backpackBasePos: THREE.Vector3; backpackVestOffset: THREE.Vector3 } {
  bodyPivot.updateMatrixWorld(true);
  const charLeft = (bones.charLeft ?? new THREE.Vector3(1, 0, 0)).clone().normalize();
  const charUp = (bones.charUp ?? new THREE.Vector3(0, 1, 0)).clone().normalize();
  const charForward = (bones.charForward ?? new THREE.Vector3(0, 0, 1)).clone().normalize();
  const charBasisQ = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(charLeft, charUp, charForward),
  );
  const invCharBasisQ = charBasisQ.clone().invert();

  const boneWorldPos = (node: THREE.Object3D | null): THREE.Vector3 | null => {
    if (!node) return null;
    const p = new THREE.Vector3();
    node.getWorldPosition(p);
    return p;
  };

  const headPos = boneWorldPos(bones.head?.node ?? null);
  const neckPos = boneWorldPos(bones.neck?.node ?? null);
  const spinePos = boneWorldPos(bones.spine?.node ?? null);
  const hipsPos = boneWorldPos(bones.hips?.node ?? null);
  const leftArmPos = boneWorldPos(bones.leftArm?.node ?? null);
  const rightArmPos = boneWorldPos(bones.rightArm?.node ?? null);

  const midX = spinePos ? spinePos.x : headPos ? headPos.x : 0;
  const midZ = spinePos ? spinePos.z : headPos ? headPos.z : 0;
  const shoulderMid =
    leftArmPos && rightArmPos
      ? leftArmPos.clone().add(rightArmPos).multiplyScalar(0.5)
      : new THREE.Vector3(
          midX,
          spinePos ? spinePos.y + 0.14 * scaleMult : 1.44 * scaleMult,
          midZ,
        );
  const shoulderHalfSpan =
    leftArmPos && rightArmPos
      ? THREE.MathUtils.clamp(leftArmPos.distanceTo(rightArmPos) * 0.5, 0.14 * scaleMult, 0.3 * scaleMult)
      : 0.195 * scaleMult;

  const headMinY =
    neckPos && headPos
      ? Math.max(neckPos.y + 0.015 * scaleMult, headPos.y - 0.03 * scaleMult)
      : headPos
        ? headPos.y - 0.03 * scaleMult
        : shoulderMid.y + 0.12 * scaleMult;

  const chestTopY = shoulderMid.y + 0.04 * scaleMult;
  const chestBotY = hipsPos
    ? Math.max(hipsPos.y + 0.08 * scaleMult, shoulderMid.y - 0.38 * scaleMult)
    : shoulderMid.y - 0.36 * scaleMult;
  const chestScanMinY = chestBotY + 0.04 * scaleMult;
  const chestScanMaxY = shoulderMid.y - 0.015 * scaleMult;

  const shoulderMidChar = shoulderMid.clone().applyQuaternion(invCharBasisQ);
  const spinePosChar = spinePos
    ? spinePos.clone().applyQuaternion(invCharBasisQ)
    : shoulderMidChar.clone();
  const torsoAxisCharX = spinePos
    ? spinePosChar.x * 0.65 + shoulderMidChar.x * 0.35
    : shoulderMidChar.x;

  // Scan actual SkinnedMesh/Mesh rest vertices in character space for outer clothing & cranium fit
  const headRadiusMax = 0.23 * scaleMult;
  const torsoRadiusXMax = shoulderHalfSpan * 0.98;
  const headCenterRefX = headPos ? headPos.x : shoulderMid.x;
  const headCenterRefZ = headPos ? headPos.z : shoulderMid.z;

  const headSamples: THREE.Vector3[] = [];
  const torsoSamples: THREE.Vector3[] = [];
  const vLocal = new THREE.Vector3();
  const vChar = new THREE.Vector3();

  model.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return;
    const mesh = obj as THREE.Mesh;
    const posAttr = mesh.geometry?.getAttribute('position');
    if (!posAttr || posAttr.count === 0) return;
    if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) {
      (mesh as THREE.SkinnedMesh).skeleton?.update();
    }
    const step = Math.max(1, Math.floor(posAttr.count / 1100));
    for (let i = 0; i < posAttr.count; i += step) {
      mesh.getVertexPosition(i, vLocal);
      vLocal.applyMatrix4(mesh.matrixWorld);
      if (!Number.isFinite(vLocal.x) || !Number.isFinite(vLocal.y) || !Number.isFinite(vLocal.z)) {
        continue;
      }
      if (
        vLocal.y >= headMinY &&
        Math.hypot(vLocal.x - headCenterRefX, vLocal.z - headCenterRefZ) <= headRadiusMax
      ) {
        vChar.copy(vLocal).applyQuaternion(invCharBasisQ);
        headSamples.push(vChar.clone());
      } else if (vLocal.y >= chestScanMinY && vLocal.y <= chestScanMaxY) {
        vChar.copy(vLocal).applyQuaternion(invCharBasisQ);
        if (Math.abs(vChar.x - torsoAxisCharX) <= torsoRadiusXMax) {
          torsoSamples.push(vChar.clone());
        }
      }
    }
  });

  // 1. Cranium bounds -> Head socket (Helmet anchored downward from crown so hair & brow fit cleanly)
  const headCenterChar = new THREE.Vector3(
    headCenterRefX,
    headPos ? headPos.y + 0.08 * scaleMult : 1.72 * scaleMult,
    headCenterRefZ,
  ).applyQuaternion(invCharBasisQ);

  let helmetScaleVec = new THREE.Vector3(1.18 * scaleMult, 1.2 * scaleMult, 1.18 * scaleMult);
  let craniumAnchorChar = new THREE.Vector3(
    headCenterChar.x,
    headCenterChar.y - 0.02 * scaleMult,
    headCenterChar.z - 0.008 * scaleMult,
  );

  if (headSamples.length >= 10) {
    const headYs = headSamples.map((s) => s.y).sort((a, b) => a - b);
    const headCrownY = headYs[Math.min(headYs.length - 1, Math.floor(headYs.length * 0.98))];
    const upperCutY = headCrownY - 0.145 * scaleMult;

    const uXs: number[] = [];
    const uZs: number[] = [];
    for (const s of headSamples) {
      if (s.y < upperCutY) continue;
      uXs.push(s.x);
      uZs.push(s.z);
    }
    if (uXs.length >= 6) {
      uXs.sort((a, b) => a - b);
      uZs.sort((a, b) => a - b);
      const lo = Math.floor(uXs.length * 0.03);
      const hi = Math.min(uXs.length - 1, Math.floor(uXs.length * 0.97));
      const craniumW = Math.max(0.16 * scaleMult, uXs[hi] - uXs[lo]);
      const craniumD = Math.max(0.18 * scaleMult, uZs[hi] - uZs[lo]);

      // Ballistic Kevlar shell + inner suspension pad clearance over hair
      const targetW = THREE.MathUtils.clamp(craniumW * 1.3, 0.285 * scaleMult, 0.355 * scaleMult);
      const targetD = THREE.MathUtils.clamp(craniumD * 1.26, 0.315 * scaleMult, 0.385 * scaleMult);
      const targetH = THREE.MathUtils.clamp(targetW * 0.67, 0.19 * scaleMult, 0.235 * scaleMult);

      const sX = targetW / 0.256;
      const sZ = targetD / 0.285;
      const sY = targetH / 0.165;
      const horizAvg = THREE.MathUtils.clamp((sX + sZ) * 0.5, 1.06 * scaleMult, 1.38 * scaleMult);
      helmetScaleVec.set(
        THREE.MathUtils.clamp(sX, horizAvg * 0.92, horizAvg * 1.08),
        THREE.MathUtils.clamp(sY, horizAvg * 0.9, horizAvg * 1.12),
        THREE.MathUtils.clamp(sZ, horizAvg * 0.92, horizAvg * 1.08),
      );

      // Dome crown sits at local y = 0.151 * sY; anchor so outer shell cups ~1.2cm over hair crown
      const anchorY = headCrownY + 0.014 * scaleMult - 0.134 * helmetScaleVec.y;
      const midUX = (uXs[lo] + uXs[hi]) * 0.5;
      const midUZ = (uZs[lo] + uZs[hi]) * 0.5;
      craniumAnchorChar.set(
        midUX * 0.55 + headCenterChar.x * 0.45,
        anchorY,
        midUZ - 0.008 * scaleMult,
      );
    }
  }

  // 2. Ribcage & outer clothing bounds -> Spine/Chest socket (Vest & Backpack)
  let torsoWidth = THREE.MathUtils.clamp(shoulderHalfSpan * 1.9, 0.32 * scaleMult, 0.44 * scaleMult);
  let torsoDepth = 0.245 * scaleMult;
  let torsoCenterZ = shoulderMidChar.z;
  let torsoBackZ = torsoCenterZ - torsoDepth * 0.5;
  const chestHeight = THREE.MathUtils.clamp(chestTopY - chestBotY, 0.33 * scaleMult, 0.44 * scaleMult);

  if (torsoSamples.length >= 12) {
    const absDx = torsoSamples.map((s) => Math.abs(s.x - torsoAxisCharX)).sort((a, b) => a - b);
    const tZs = torsoSamples.map((s) => s.z).sort((a, b) => a - b);
    const pLow = Math.floor(tZs.length * 0.04);
    const pHigh = Math.min(tZs.length - 1, Math.floor(tZs.length * 0.96));
    const halfW = absDx[Math.min(absDx.length - 1, Math.floor(absDx.length * 0.94))];

    torsoWidth = THREE.MathUtils.clamp(halfW * 2, 0.3 * scaleMult, 0.44 * scaleMult);
    torsoDepth = THREE.MathUtils.clamp(tZs[pHigh] - tZs[pLow], 0.2 * scaleMult, 0.32 * scaleMult);
    torsoCenterZ = (tZs[pLow] + tZs[pHigh]) * 0.5;
    torsoBackZ = tZs[pLow];
  }

  // Vest wraps cleanly outside hoodie/jacket fabric
  const vestTargetW = THREE.MathUtils.clamp(torsoWidth + 0.068 * scaleMult, 0.355 * scaleMult, 0.48 * scaleMult);
  const vestTargetH = THREE.MathUtils.clamp(chestHeight * 1.06, 0.365 * scaleMult, 0.45 * scaleMult);
  const vestTargetD = THREE.MathUtils.clamp(torsoDepth + 0.064 * scaleMult, 0.255 * scaleMult, 0.345 * scaleMult);
  const vestScaleVec = new THREE.Vector3(
    vestTargetW / 0.305,
    vestTargetH / 0.33,
    vestTargetD / 0.205,
  );

  // Backpack spans across the upper-to-mid back (right below hood/shoulder line)
  const packTargetW = THREE.MathUtils.clamp(torsoWidth * 0.88, 0.315 * scaleMult, 0.39 * scaleMult);
  const packTargetH = THREE.MathUtils.clamp(chestHeight * 1.15, 0.415 * scaleMult, 0.49 * scaleMult);
  const packTargetD = THREE.MathUtils.clamp(packTargetW * 0.56, 0.18 * scaleMult, 0.24 * scaleMult);
  const packScaleVec = new THREE.Vector3(
    packTargetW / 0.255,
    packTargetH / 0.34,
    packTargetD / 0.135,
  );

  // Convert character-space world anchor into target bone local space with exact basis alignment
  const attachToBoneOrPivot = (
    group: THREE.Group,
    boneNode: THREE.Object3D | null,
    charAnchor: THREE.Vector3,
    worldScaleVec: THREE.Vector3,
    extraLocalTiltX = 0,
  ) => {
    const worldAnchor = charAnchor.clone().applyQuaternion(charBasisQ);
    const tiltQ =
      extraLocalTiltX !== 0
        ? new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), extraLocalTiltX)
        : null;
    const targetWorldQ = tiltQ ? charBasisQ.clone().multiply(tiltQ) : charBasisQ;

    if (boneNode) {
      boneNode.updateMatrixWorld(true);
      const bWorldQ = new THREE.Quaternion();
      const bWorldS = new THREE.Vector3();
      boneNode.getWorldQuaternion(bWorldQ);
      boneNode.getWorldScale(bWorldS);
      group.scale.set(
        worldScaleVec.x / Math.max(0.001, bWorldS.x),
        worldScaleVec.y / Math.max(0.001, bWorldS.y),
        worldScaleVec.z / Math.max(0.001, bWorldS.z),
      );
      group.quaternion.copy(bWorldQ).invert().multiply(targetWorldQ);
      group.position.copy(worldAnchor);
      boneNode.worldToLocal(group.position);
      boneNode.add(group);
    } else {
      group.scale.copy(worldScaleVec);
      group.quaternion.copy(targetWorldQ);
      group.position.copy(worldAnchor);
      bodyPivot.worldToLocal(group.position);
      bodyPivot.add(group);
    }
  };

  // Slight backward tilt (-0.05 rad) keeps brow rim horizontal above eyes & cups nape
  attachToBoneOrPivot(
    armor.helmetGroup,
    bones.head?.node ?? null,
    craniumAnchorChar,
    helmetScaleVec,
    -0.05,
  );

  const torsoAttachBone = bones.chest?.node ?? bones.spine?.node ?? null;
  const vestAnchorChar = new THREE.Vector3(
    torsoAxisCharX,
    shoulderMidChar.y - vestTargetH * 0.47,
    torsoCenterZ,
  );
  attachToBoneOrPivot(armor.vestGroup, torsoAttachBone, vestAnchorChar, vestScaleVec);

  const packAnchorChar = new THREE.Vector3(
    torsoAxisCharX,
    shoulderMidChar.y - packTargetH * 0.44,
    torsoBackZ - 0.008 * scaleMult,
  );
  attachToBoneOrPivot(armor.backpackGroup, torsoAttachBone, packAnchorChar, packScaleVec);

  const backpackBasePos = armor.backpackGroup.position.clone();
  const vestRearClearance = Math.max(0.028 * scaleMult, (torsoCenterZ - vestTargetD * 0.5) - torsoBackZ - 0.012 * scaleMult);
  const packVestShiftWorld = charForward.clone().multiplyScalar(-vestRearClearance);
  const backpackVestOffset = new THREE.Vector3();
  const spineParent = torsoAttachBone ?? bodyPivot;
  const pAnchorW = packAnchorChar.clone().applyQuaternion(charBasisQ);
  const pShiftedW = pAnchorW.clone().add(packVestShiftWorld);
  spineParent.worldToLocal(pAnchorW);
  spineParent.worldToLocal(pShiftedW);
  backpackVestOffset.subVectors(pShiftedW, pAnchorW);

  return { backpackBasePos, backpackVestOffset };
}

export interface CustomCharacterTemplate {
  name: string;
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
  height: number;
  dispose: () => void;
}

export async function parseGlbCharacterTemplate(
  buffer: ArrayBuffer,
  fileName = 'custom_character.glb',
  targetHeight = 1.9,
): Promise<CustomCharacterTemplate> {
  const parsed = await acquireParsedGlb(buffer, 'character');
  try {
    const model = parsed.scene;
    normalizeModelToHeight(model, targetHeight, true);
    const box = new THREE.Box3().setFromObject(model);
    const height = Math.max(1.4, box.getSize(new THREE.Vector3()).y);
    return {
      name: fileName,
      scene: model,
      animations: parsed.animations,
      height,
      dispose: () => {
        parsed.release();
      },
    };
  } catch (err) {
    parsed.release();
    throw err;
  }
}

/**
 * Wraps any humanoid BaseCharacter (or cloned GLB model) with the full universal attachment rig
 * (armor sockets, rifle, pistol, bow, stick, baton, throwable mount) so Ricardo, Chispa, Mateo,
 * or any newly uploaded custom character can equip accessories & poses identically.
 */
export function equipModelWithCharacterRig(params: {
  entityId: string;
  label: string;
  role: CharacterClipRole;
  tag?: CharacterAnimationTag;
  model: THREE.Object3D;
  animations?: THREE.AnimationClip[];
  isCustomGlb: boolean;
  customRifleTemplate?: CustomRifleTemplate | null;
  customPistolTemplate?: CustomPistolTemplate | null;
  onDispose?: () => void;
}): CharacterRig {
  const root = new THREE.Group();
  root.name = `CharacterRig_${params.entityId}`;
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);
  bodyPivot.add(params.model);

  const character = BaseCharacter.fromModelNode({
    entityId: params.entityId,
    label: params.label,
    role: params.role,
    tag: params.tag,
    root,
    bodyPivot,
    model: params.model,
    animations: params.animations,
    isCustomGlb: params.isCustomGlb,
    onDispose: params.onDispose,
  });
  const bones = character.bones;

  const pistolMount = new THREE.Group();
  const pistol = params.customPistolTemplate
    ? buildCustomPistolInstance(params.customPistolTemplate)
    : buildDefaultPistolInstance();
  pistol.group.visible = false;
  pistolMount.add(pistol.group);

  const rifleMount = new THREE.Group();
  const rifle = params.customRifleTemplate
    ? buildCustomRifleInstance(params.customRifleTemplate)
    : buildDefaultRifleInstance();
  rifleMount.add(rifle.group);

  const stickMount = new THREE.Group();
  const stick = buildStickWeaponInstance();
  stick.group.visible = false;
  stickMount.add(stick.group);

  const batonMount = new THREE.Group();
  const baton = buildBatonWeaponInstance();
  baton.group.visible = false;
  batonMount.add(baton.group);

  const bowMount = new THREE.Group();
  const bow = buildBowWeaponInstance();
  bow.group.visible = false;
  bowMount.add(bow.group);

  const arrowMount = new THREE.Group();
  const handArrow = buildHandArrowInstance();
  handArrow.group.visible = false;
  arrowMount.add(handArrow.group);

  const throwableMount = new THREE.Group();

  const playerArmor = buildPlayerArmorMeshes();
  const { backpackBasePos, backpackVestOffset } = attachCalibratedArmorSockets(
    params.model,
    bodyPivot,
    bones,
    playerArmor,
    1.0,
  );

  if (bones.rightHand) {
    const worldScale = new THREE.Vector3();
    bones.rightHand.getWorldScale(worldScale);
    const invScale = 1 / Math.max(0.01, worldScale.x);
    pistolMount.scale.setScalar(invScale);
    rifleMount.scale.setScalar(invScale);
    stickMount.scale.setScalar(invScale);
    batonMount.scale.setScalar(invScale);
    arrowMount.scale.setScalar(invScale);
    throwableMount.scale.setScalar(invScale);

    if (bones.rightPalmOffset) {
      pistolMount.position.copy(bones.rightPalmOffset);
      rifleMount.position.copy(bones.rightPalmOffset);
      stickMount.position.copy(bones.rightPalmOffset);
      batonMount.position.copy(bones.rightPalmOffset);
      arrowMount.position.copy(bones.rightPalmOffset);
      throwableMount.position.copy(bones.rightPalmOffset);
    }

    const baseGripQ = bones.rightGripLocalQ ?? new THREE.Quaternion();
    const gunTiltQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.14);
    pistolMount.quaternion.copy(baseGripQ).multiply(gunTiltQ);
    rifleMount.quaternion.copy(baseGripQ).multiply(gunTiltQ);
    stickMount.quaternion.copy(baseGripQ);
    batonMount.quaternion.copy(baseGripQ);
    arrowMount.quaternion.copy(baseGripQ);
    throwableMount.quaternion.copy(baseGripQ);

    bones.rightHand.add(pistolMount, rifleMount, stickMount, batonMount, arrowMount, throwableMount);
  } else {
    pistolMount.position.set(-0.28, 1.15, 0.35);
    rifleMount.position.set(-0.24, 1.15, 0.35);
    stickMount.position.set(-0.26, 1.15, 0.35);
    batonMount.position.set(-0.26, 1.15, 0.35);
    arrowMount.position.set(-0.26, 1.15, 0.35);
    throwableMount.position.set(-0.26, 1.15, 0.35);
    bodyPivot.add(pistolMount, rifleMount, stickMount, batonMount, arrowMount, throwableMount);
  }

  if (bones.leftHand) {
    const leftScale = new THREE.Vector3();
    bones.leftHand.getWorldScale(leftScale);
    bowMount.scale.setScalar(1 / Math.max(0.01, leftScale.x));
    if (bones.leftPalmOffset) {
      bowMount.position.copy(bones.leftPalmOffset);
    }
    const baseLeftGripQ = bones.leftGripLocalQ ?? new THREE.Quaternion();
    const bowAlignMat = new THREE.Matrix4().makeBasis(
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 1, 0),
    );
    const bowAlignQ = new THREE.Quaternion().setFromRotationMatrix(bowAlignMat);
    bowMount.quaternion.copy(baseLeftGripQ).multiply(bowAlignQ);
    bones.leftHand.add(bowMount);
  } else {
    bowMount.position.set(0.28, 1.25, 0.36);
    bodyPivot.add(bowMount);
  }

  const rig: CharacterRig = {
    character,
    root,
    bodyPivot,
    isCustomGlb: params.isCustomGlb,
    bones,
    pistolMount,
    pistolMesh: pistol.group,
    pistolMuzzle: pistol.muzzleNode,
    disposePistolInstance: pistol.dispose,
    rifleMount,
    rifleMesh: rifle.group,
    rifleForegrip: rifle.foregripTarget,
    rifleMuzzle: rifle.muzzleNode,
    disposeRifleInstance: rifle.dispose,
    stickMount,
    stickMesh: stick.group,
    disposeStickInstance: stick.dispose,
    batonMount,
    batonMesh: baton.group,
    disposeBatonInstance: baton.dispose,
    bowMount,
    bowMesh: bow.group,
    bowStringUpper: bow.stringUpperPivot,
    bowStringLower: bow.stringLowerPivot,
    bowNockedArrow: handArrow.group,
    bowNockedArrowOffset: handArrow.offsetGroup,
    disposeBowInstance: bow.dispose,
    arrowMount,
    arrowMesh: handArrow.group,
    disposeArrowInstance: handArrow.dispose,
    throwableMount,
    equipHelmetMesh: playerArmor.helmetGroup,
    equipHelmetOffset: playerArmor.helmetOffsetGroup,
    equipVestMesh: playerArmor.vestGroup,
    equipVestOffset: playerArmor.vestOffsetGroup,
    equipBackpackMesh: playerArmor.backpackGroup,
    equipBackpackOffset: playerArmor.backpackOffsetGroup,
    equipBackpackBasePos: backpackBasePos,
    equipBackpackVestOffset: backpackVestOffset,
    disposeArmorVisuals: playerArmor.dispose,
    mixer: character.mixer,
    clips: character.clips,
    playClip: (name, fadeSec, timeScale, forceRestart) =>
      character.playClip(name, fadeSec, timeScale, forceRestart),
    resetClips: () => character.resetClips(),
    dispose: () => {
      rig.disposePistolInstance();
      rig.disposeRifleInstance();
      rig.disposeStickInstance();
      rig.disposeBatonInstance();
      rig.disposeBowInstance();
      rig.disposeArrowInstance();
      rig.disposeArmorVisuals();
      character.dispose();
    },
  };

  registerCharacterRigAttachments(character, rig);
  return rig;
}

export function buildCharacterRigFromTemplate(
  template: CustomCharacterTemplate,
  opts: {
    entityId: string;
    label: string;
    role?: CharacterClipRole;
    tag?: CharacterAnimationTag;
    customRifleTemplate?: CustomRifleTemplate | null;
    customPistolTemplate?: CustomPistolTemplate | null;
  },
): CharacterRig {
  const cloned = SkeletonUtils.clone(template.scene) as THREE.Group;
  return equipModelWithCharacterRig({
    entityId: opts.entityId,
    label: opts.label,
    role: opts.role ?? 'npc',
    tag: opts.tag,
    model: cloned,
    animations: template.animations,
    isCustomGlb: true,
    customRifleTemplate: opts.customRifleTemplate,
    customPistolTemplate: opts.customPistolTemplate,
  });
}

// Loads custom Player .glb, matches recognized animation clips via tag dictionary ('player'),
// and calibrates palm grip frames + finger curl axes for weapon IK and throwables!
export async function parseGlbCharacter(
  buffer: ArrayBuffer,
  customRifleTemplate: CustomRifleTemplate | null = null,
  customPistolTemplate: CustomPistolTemplate | null = null,
): Promise<CharacterRig> {
  const parsed = await acquireParsedGlb(buffer, 'player');
  try {
    const model = parsed.scene;
    normalizeModelToHeight(model, 1.9, true);
    return equipModelWithCharacterRig({
      entityId: 'player',
      label: 'Ricardo López (Protagonista)',
      role: 'player',
      tag: 'player',
      model,
      animations: parsed.animations,
      isCustomGlb: true,
      customRifleTemplate,
      customPistolTemplate,
      onDispose: parsed.release,
    });
  } catch (err) {
    parsed.release();
    throw err;
  }
}

// Custom Zombie GLB template (preserves Meshy animations for instanced playback + skeleton bones for procedural fallback)
export interface CustomZombieTemplate {
  name: string;
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
  height: number;
  dispose: () => void;
}

export async function parseGlbZombieTemplate(
  buffer: ArrayBuffer,
  fileName = 'custom_zombie.glb',
): Promise<CustomZombieTemplate> {
  const parsed = await acquireParsedGlb(buffer, 'zombie');
  try {
    const model = parsed.scene;
    normalizeModelToHeight(model, 1.95, true);
    const box = new THREE.Box3().setFromObject(model);
    const height = Math.max(1.5, box.getSize(new THREE.Vector3()).y);

    return {
      name: fileName,
      scene: model,
      animations: parsed.animations,
      height,
      dispose: () => {
        parsed.release();
      },
    };
  } catch (err) {
    parsed.release();
    throw err;
  }
}

export interface CustomObjectTemplate {
  scene: THREE.Group;
  size: THREE.Vector3;
  dispose: () => void;
}

export async function parseGlbObjectTemplate(
  buffer: ArrayBuffer,
  targetSize: number,
  fitMode: 'height' | 'maxDim' = 'maxDim',
): Promise<CustomObjectTemplate> {
  const parsed = await acquireParsedGlb(buffer, 'object');
  try {
    const wrapper = new THREE.Group();
    const model = parsed.scene;
    wrapper.add(model);
    wrapper.updateMatrixWorld(true);

    const rawBox = new THREE.Box3().setFromObject(model);
    const rawSize = rawBox.getSize(new THREE.Vector3());
    const refDim =
      fitMode === 'height'
        ? Math.max(rawSize.y, 0.01)
        : Math.max(rawSize.x, rawSize.y, rawSize.z, 0.01);
    const scaleFactor = THREE.MathUtils.clamp(targetSize / refDim, 0.004, 120);
    model.scale.multiplyScalar(scaleFactor);
    wrapper.updateMatrixWorld(true);

    const scaledBox = new THREE.Box3().setFromObject(wrapper);
    const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
    const scaledSize = scaledBox.getSize(new THREE.Vector3());

    // Bottom-center pivot at (0, 0, 0) so replacements align flush with ground & coordinates
    model.position.x -= scaledCenter.x;
    model.position.y -= scaledBox.min.y;
    model.position.z -= scaledCenter.z;
    wrapper.updateMatrixWorld(true);

    freezeObjectStaticHierarchy(model);

    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          if (m && 'envMapIntensity' in m) {
            (m as THREE.MeshStandardMaterial).envMapIntensity = 1.0;
          }
        });
      }
    });

    return {
      scene: wrapper,
      size: scaledSize,
      dispose: () => {
        parsed.release();
      },
    };
  } catch (err) {
    parsed.release();
    throw err;
  }
}

export function createDropletLatheGeometry(
  radius = 0.036,
  length = 0.13,
  radialSegments = 7,
): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const steps = 11;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps; // 0 = pointed tail (-Y), 1 = rounded droplet head (+Y)
    const y = (t - 0.58) * length;
    let r: number;
    if (t <= 0.72) {
      const k = t / 0.72;
      // Smooth concave-to-convex teardrop neck swelling into bulb
      r = radius * Math.pow(Math.sin(k * Math.PI * 0.5), 1.42);
    } else {
      const k = (t - 0.72) / 0.28;
      // Rounded front cap
      r = radius * Math.sqrt(Math.max(0, 1 - k * k));
    }
    pts.push(new THREE.Vector2(Math.max(0.0001, r), y));
  }
  const geo = new THREE.LatheGeometry(pts, radialSegments);
  geo.computeVertexNormals();
  return geo;
}

export interface FlameCluster {
  group: THREE.Group;
  update: (elapsed: number, scaleXZ?: number, scaleY?: number, fade?: number) => void;
  dispose: () => void;
}

function buildSingleMergedFlameGeometry(
  tongues: {
    x: number;
    y: number;
    z: number;
    width: number;
    height: number;
    rotY: number;
    tiltX: number;
    tiltZ: number;
    seed: number;
    heightFactor: number;
    crossed?: boolean;
  }[],
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const seeds: number[] = [];
  const hFactors: number[] = [];
  const indices: number[] = [];
  let vertexOffset = 0;

  const dummy = new THREE.Object3D();
  const vec = new THREE.Vector3();

  const appendPlane = (
    w: number,
    h: number,
    ox: number,
    oy: number,
    oz: number,
    ry: number,
    tx: number,
    tz: number,
    seed: number,
    hFactor: number,
  ) => {
    const segW = 2;
    const segH = 8;
    const plane = new THREE.PlaneGeometry(w, h, segW, segH);
    plane.translate(0, h * 0.5, 0);
    // Slight natural S-curve across height
    const pAttr = plane.attributes.position as THREE.BufferAttribute;
    const uAttr = plane.attributes.uv as THREE.BufferAttribute;
    dummy.position.set(ox, oy, oz);
    dummy.rotation.set(tx, ry, tz);
    dummy.updateMatrix();

    for (let i = 0; i < pAttr.count; i++) {
      const vyNorm = uAttr.getY(i);
      vec.set(
        pAttr.getX(i),
        pAttr.getY(i),
        pAttr.getZ(i) + Math.sin(vyNorm * Math.PI + seed) * (w * 0.16),
      );
      vec.applyMatrix4(dummy.matrix);
      positions.push(vec.x, vec.y, vec.z);
      uvs.push(uAttr.getX(i), vyNorm);
      seeds.push(seed);
      hFactors.push(hFactor);
    }

    const idxAttr = plane.index;
    if (idxAttr) {
      for (let i = 0; i < idxAttr.count; i++) {
        indices.push(idxAttr.getX(i) + vertexOffset);
      }
    }
    vertexOffset += pAttr.count;
    plane.dispose();
  };

  for (let i = 0; i < tongues.length; i++) {
    const t = tongues[i];
    appendPlane(
      t.width,
      t.height,
      t.x,
      t.y,
      t.z,
      t.rotY,
      t.tiltX,
      t.tiltZ,
      t.seed,
      t.heightFactor,
    );
    if (t.crossed) {
      appendPlane(
        t.width * 0.92,
        t.height * 0.95,
        t.x,
        t.y,
        t.z,
        t.rotY + Math.PI * 0.44,
        -t.tiltX * 0.8,
        t.tiltZ * 0.7,
        t.seed + 0.73,
        t.heightFactor * 0.96,
      );
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setAttribute('aSeed', new THREE.Float32BufferAttribute(seeds, 1));
  geo.setAttribute('aTongueScale', new THREE.Float32BufferAttribute(hFactors, 1));
  geo.setIndex(indices);
  geo.computeBoundingSphere();
  return geo;
}

function createFireShaderMaterial(
  isCore: boolean,
  speed: number,
  sharedTimeUniform?: { value: number },
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: sharedTimeUniform ?? { value: 0 },
      uSpeed: { value: speed },
      uScaleXZ: { value: 1.0 },
      uScaleY: { value: 1.0 },
      uFade: { value: 1.0 },
      uIsCore: { value: isCore ? 1.0 : 0.0 },
    },
    vertexShader: `
      attribute float aSeed;
      attribute float aTongueScale;
      uniform float uTime;
      uniform float uSpeed;
      uniform float uScaleXZ;
      uniform float uScaleY;
      varying vec2 vUv;
      varying float vSeed;
      varying float vH;

      void main() {
        vUv = uv;
        vSeed = aSeed;
        float h = clamp(uv.y, 0.0, 1.0);
        vH = h;
        vec3 pos = position;
        pos.x *= uScaleXZ;
        pos.z *= uScaleXZ;
        pos.y *= uScaleY;

        float t = uTime * uSpeed + aSeed * 6.2831;
        float bend = pow(h, 1.32);
        float swayX = sin(t * 2.4 + h * 5.0) * 0.14 + sin(t * 5.1 - h * 7.6 + aSeed) * 0.07;
        float swayZ = cos(t * 2.0 + h * 4.4 + aSeed * 1.7) * 0.14 + cos(t * 4.4 - h * 6.8) * 0.07;
        float windLean = (0.07 + 0.05 * sin(uTime * 1.35)) * bend;
        pos.x += (swayX * aTongueScale + windLean) * bend;
        pos.z += (swayZ * aTongueScale + windLean * 0.45) * bend;
        pos.y *= 0.84 + 0.28 * sin(t * 3.5 + aSeed * 3.1) * h;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uSpeed;
      uniform float uFade;
      uniform float uIsCore;
      varying vec2 vUv;
      varying float vSeed;
      varying float vH;

      float hash21(vec2 p) {
        p = fract(p * vec2(127.1, 311.7));
        p += dot(p, p + 34.5);
        return fract(p.x * p.y);
      }
      float vnoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
          mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.52;
        for (int i = 0; i < 3; i++) {
          v += a * vnoise(p);
          p = p * 2.08 + vec2(13.7, 7.3);
          a *= 0.5;
        }
        return v;
      }

      void main() {
        float h = clamp(vH, 0.0, 1.0);
        float t = uTime * uSpeed;
        vec2 nUv = vec2(vUv.x * 2.8 + vSeed * 11.3, h * 2.5 - t * 2.2 + vSeed * 5.7);
        float n1 = fbm(nUv);
        float n2 = vnoise(vec2(vUv.x * 5.5 - t * 0.95, h * 4.6 - t * 3.5 + vSeed * 9.1));
        float turb = n1 * 0.68 + n2 * 0.32;

        float distFromCenter = abs(vUv.x - 0.5) * 2.0;
        float baseWidth = mix(0.96, 0.16, pow(h, 0.72));
        float edgeMask = 1.0 - smoothstep(
          baseWidth * 0.36,
          baseWidth + 0.18,
          distFromCenter + (1.0 - turb) * 0.44
        );
        float tipCutoff = smoothstep(1.04, 0.28, h + (1.0 - turb) * 0.48);
        float baseFade = smoothstep(0.0, 0.09, h);
        float intensity = edgeMask * tipCutoff * baseFade;

        if (intensity < 0.04) discard;

        vec3 colTip = vec3(0.84, 0.14, 0.02);
        vec3 colMid = vec3(1.0, 0.46, 0.05);
        vec3 colHot = vec3(1.0, 0.88, 0.36);
        vec3 colWhite = vec3(1.0, 0.98, 0.86);

        float heat = clamp(intensity * (1.22 - h * 0.6) + (turb - 0.4) * 0.26, 0.0, 1.0);
        vec3 col = mix(colTip, colMid, smoothstep(0.08, 0.45, heat));
        col = mix(col, colHot, smoothstep(0.42, 0.78, heat));
        if (uIsCore > 0.5) {
          col = mix(col, colWhite, smoothstep(0.62, 0.95, heat));
        }

        float alpha = clamp(intensity * (uIsCore > 0.5 ? 0.92 : 0.96), 0.0, 1.0) * uFade;
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: isCore ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
}

export function buildFlameCluster(options: {
  radius: number;
  minHeight: number;
  maxHeight: number;
  minWidth: number;
  maxWidth: number;
  outerCount: number;
  coreCount: number;
  speed?: number;
  seedOffset?: number;
  sharedTimeUniform?: { value: number };
}): FlameCluster {
  const {
    radius,
    minHeight,
    maxHeight,
    minWidth,
    maxWidth,
    outerCount,
    coreCount,
    speed = 1.45,
    seedOffset = 0,
    sharedTimeUniform,
  } = options;

  const rnd = (idx: number) => {
    const v = Math.sin((idx + seedOffset + 1) * 91.37) * 43758.5453;
    return v - Math.floor(v);
  };

  const outerSpecs = [];
  for (let i = 0; i < outerCount; i++) {
    const a = (i / Math.max(1, outerCount)) * Math.PI * 2 + (rnd(i * 3) - 0.5) * 0.75;
    const dist = radius * Math.sqrt(rnd(i * 3 + 1));
    const h = THREE.MathUtils.lerp(minHeight, maxHeight, Math.pow(rnd(i * 3 + 2), 0.85));
    const w = THREE.MathUtils.lerp(minWidth, maxWidth, rnd(i * 5 + 4));
    outerSpecs.push({
      x: Math.cos(a) * dist,
      y: -0.02 + rnd(i * 7 + 1) * 0.04,
      z: Math.sin(a) * dist,
      width: w,
      height: h,
      rotY: a + rnd(i * 11) * 2.4,
      tiltX: (rnd(i * 13) - 0.5) * 0.28,
      tiltZ: (rnd(i * 17) - 0.5) * 0.28,
      seed: 1.7 + i * 2.31 + seedOffset,
      heightFactor: h / Math.max(0.1, maxHeight),
      crossed: i % 2 === 0,
    });
  }

  const coreSpecs = [];
  for (let i = 0; i < coreCount; i++) {
    const a = (i / Math.max(1, coreCount)) * Math.PI * 2 + rnd(i * 19 + 40) * 0.9;
    const dist = radius * 0.58 * rnd(i * 23 + 41);
    const h = THREE.MathUtils.lerp(minHeight * 0.68, maxHeight * 0.84, rnd(i * 29 + 42));
    const w = THREE.MathUtils.lerp(minWidth * 0.62, maxWidth * 0.78, rnd(i * 31 + 43));
    coreSpecs.push({
      x: Math.cos(a) * dist,
      y: 0.0,
      z: Math.sin(a) * dist,
      width: w,
      height: h,
      rotY: a + rnd(i * 37 + 44) * 3.1,
      tiltX: (rnd(i * 41 + 45) - 0.5) * 0.18,
      tiltZ: (rnd(i * 43 + 46) - 0.5) * 0.18,
      seed: 19.3 + i * 3.17 + seedOffset,
      heightFactor: h / Math.max(0.1, maxHeight),
      crossed: true,
    });
  }

  const outerGeo = buildSingleMergedFlameGeometry(outerSpecs);
  const coreGeo = buildSingleMergedFlameGeometry(coreSpecs);
  const outerMat = createFireShaderMaterial(false, speed, sharedTimeUniform);
  const coreMat = createFireShaderMaterial(true, speed * 1.12, sharedTimeUniform);

  const outerMesh = new THREE.Mesh(outerGeo, outerMat);
  outerMesh.renderOrder = 2;
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  coreMesh.renderOrder = 3;

  const group = new THREE.Group();
  group.add(outerMesh, coreMesh);

  return {
    group,
    update: (elapsed: number, scaleXZ = 1.0, scaleY = 1.0, fade = 1.0) => {
      if (!sharedTimeUniform) {
        outerMat.uniforms.uTime.value = elapsed;
        coreMat.uniforms.uTime.value = elapsed;
      }
      outerMat.uniforms.uScaleXZ.value = scaleXZ;
      outerMat.uniforms.uScaleY.value = scaleY;
      outerMat.uniforms.uFade.value = fade;
      coreMat.uniforms.uScaleXZ.value = scaleXZ;
      coreMat.uniforms.uScaleY.value = scaleY;
      coreMat.uniforms.uFade.value = fade;
    },
    dispose: () => {
      outerGeo.dispose();
      coreGeo.dispose();
      outerMat.dispose();
      coreMat.dispose();
    },
  };
}

export interface CampfireVisuals {
  group: THREE.Group;
  flameCluster: FlameCluster;
  warmthRing: THREE.Mesh;
  applyOverride: (template: CustomObjectTemplate | null) => void;
  dispose: () => void;
}

export function buildCampfireGroup(
  stoneTex: THREE.CanvasTexture,
  barkTex?: THREE.CanvasTexture,
): CampfireVisuals {
  const group = new THREE.Group();
  const baseStructureGroup = new THREE.Group();
  const overrideHolder = new THREE.Group();
  group.add(baseStructureGroup, overrideHolder);

  const barrelMat = new THREE.MeshStandardMaterial({
    color: 0x693424,
    roughness: 0.72,
    metalness: 0.55,
  });
  const concreteMat = new THREE.MeshStandardMaterial({
    map: stoneTex,
    roughness: 0.9,
    metalness: 0.05,
  });
  const logMat = new THREE.MeshStandardMaterial({
    map: barkTex ?? null,
    color: 0x2a1d14,
    roughness: 0.92,
    metalness: 0.04,
  });
  const emberMat = new THREE.MeshStandardMaterial({
    color: 0xff6b1a,
    emissive: new THREE.Color(0xff5500),
    emissiveIntensity: 2.2,
    roughness: 0.4,
  });

  const barrelGeo = new THREE.CylinderGeometry(0.62, 0.65, 1.15, 14);
  const barrel = new THREE.Mesh(barrelGeo, barrelMat);
  barrel.position.y = 0.58;
  barrel.castShadow = true;
  barrel.receiveShadow = true;
  baseStructureGroup.add(barrel);

  const rimGeo = new THREE.TorusGeometry(0.62, 0.042, 8, 18);
  rimGeo.rotateX(Math.PI / 2);
  const rim = new THREE.Mesh(rimGeo, barrelMat);
  rim.position.y = 1.14;
  baseStructureGroup.add(rim);

  const blockGeo = new THREE.BoxGeometry(0.68, 0.32, 0.42);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const block = new THREE.Mesh(blockGeo, concreteMat);
    block.position.set(Math.cos(a) * 1.18, 0.16, Math.sin(a) * 1.18);
    block.rotation.y = -a + Math.PI / 2;
    block.castShadow = true;
    block.receiveShadow = true;
    baseStructureGroup.add(block);
  }

  const logGeo = new THREE.CylinderGeometry(0.08, 0.1, 0.92, 6);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.35;
    const log = new THREE.Mesh(logGeo, logMat);
    log.position.set(Math.cos(a) * 0.16, 1.24, Math.sin(a) * 0.16);
    log.rotation.set(Math.sin(a) * 0.72, a, Math.cos(a) * 0.72);
    log.castShadow = true;
    baseStructureGroup.add(log);
  }

  const ashBed = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 12), emberMat);
  ashBed.position.y = 1.12;
  baseStructureGroup.add(ashBed);

  const flameCluster = buildFlameCluster({
    radius: 0.42,
    minHeight: 0.68,
    maxHeight: 1.48,
    minWidth: 0.36,
    maxWidth: 0.68,
    outerCount: 14,
    coreCount: 9,
    speed: 1.55,
  });
  flameCluster.group.position.y = 1.12;
  group.add(flameCluster.group);

  const ringGeo = new THREE.RingGeometry(
    CAMPFIRE_SAFE_RADIUS - 0.16,
    CAMPFIRE_SAFE_RADIUS + 0.1,
    64,
  );
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const warmthRing = new THREE.Mesh(ringGeo, ringMat);
  warmthRing.position.y = 0.03;
  group.add(warmthRing);
  group.position.set(CAMPFIRE_X, groundHeightAt(CAMPFIRE_X, CAMPFIRE_Z), CAMPFIRE_Z);

  const applyOverride = (template: CustomObjectTemplate | null) => {
    while (overrideHolder.children.length > 0) {
      overrideHolder.remove(overrideHolder.children[0]);
    }
    if (template) {
      baseStructureGroup.visible = false;
      overrideHolder.add(template.scene.clone(true));
    } else {
      baseStructureGroup.visible = true;
    }
  };

  return {
    group,
    flameCluster,
    warmthRing,
    applyOverride,
    dispose: () => {
      while (overrideHolder.children.length > 0) {
        overrideHolder.remove(overrideHolder.children[0]);
      }
      barrelGeo.dispose();
      rimGeo.dispose();
      blockGeo.dispose();
      logGeo.dispose();
      ashBed.geometry.dispose();
      flameCluster.dispose();
      ringGeo.dispose();
      barrelMat.dispose();
      concreteMat.dispose();
      logMat.dispose();
      emberMat.dispose();
      ringMat.dispose();
    },
  };
}

export interface HitFlashMeshEntry {
  mesh: THREE.Mesh;
  origMat: THREE.Material | THREE.Material[];
}

export interface EnemyMeshBundle {
  character: BaseCharacter;
  group: THREE.Group;
  bodyPivot: THREE.Group;
  hitFlashEntries: HitFlashMeshEntry[];
  glowMeshes: THREE.Mesh[];
  glowIdleMat?: THREE.MeshStandardMaterial;
  glowAlertMat?: THREE.MeshStandardMaterial;
  isHitFlashing: boolean;
  isGlowAlerted: boolean;
  telegraphRing: THREE.Mesh;
  hpBarGroup: THREE.Group;
  hpFillMesh: THREE.Mesh;
  awarenessIcon: THREE.Sprite;
  awarenessBaseY: number;
  bones: HumanoidBoneMap;
  isCustomGlb: boolean;
  hasClips: boolean;
  helmetArmorGroup?: THREE.Group;
  vestArmorGroup?: THREE.Group;
  attachSockets?: Partial<Record<ZombieAttachableId, THREE.Object3D[]>>;
  mouthAnchor?: THREE.Object3D;
  jawNode?: THREE.Object3D;
  spitSacNodes?: THREE.Object3D[];
  preferWalkClip?: string;
  mixer?: THREE.AnimationMixer | null;
  clips?: Record<string, THREE.AnimationAction>;
  playClip?: (name: string, fadeSec?: number, timeScale?: number, forceRestart?: boolean) => boolean;
  resetClips?: () => void;
  dispose: () => void;
}

export function applyZombieAttachmentTransformsToBundle(
  bundle: EnemyMeshBundle,
  transforms?: Partial<Record<ZombieAttachableId, AttachmentTransform>> | null,
): void {
  const sockets = bundle.attachSockets;
  if (!sockets) return;
  const map = transforms ?? {};
  (['helmet', 'vest', 'rifle', 'pistol', 'baton'] as ZombieAttachableId[]).forEach((id) => {
    const nodes = sockets[id];
    if (!nodes || nodes.length === 0) return;
    const t = map[id];
    for (let i = 0; i < nodes.length; i++) {
      applyAttachmentOffsetToNode(nodes[i], t);
    }
  });
}

const sharedHpBarGeos = new Map<number, { bg: THREE.PlaneGeometry; fill: THREE.PlaneGeometry }>();
let sharedHpBarMats: {
  bg: THREE.MeshBasicMaterial;
  green: THREE.MeshBasicMaterial;
  amber: THREE.MeshBasicMaterial;
  red: THREE.MeshBasicMaterial;
} | null = null;

function getSharedHpBarResources(width: number) {
  const key = Math.round(width * 100);
  let geos = sharedHpBarGeos.get(key);
  if (!geos) {
    const bg = markShared(new THREE.PlaneGeometry(width + 0.08, 0.14));
    const fill = markShared(new THREE.PlaneGeometry(width, 0.085));
    fill.translate(width / 2, 0, 0);
    geos = { bg, fill };
    sharedHpBarGeos.set(key, geos);
  }
  if (!sharedHpBarMats) {
    sharedHpBarMats = {
      bg: markShared(
        new THREE.MeshBasicMaterial({
          color: 0x090d14,
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide,
          depthTest: true,
        }),
      ),
      green: markShared(new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide })),
      amber: markShared(new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide })),
      red: markShared(new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide })),
    };
  }
  return { geos, mats: sharedHpBarMats };
}

export function setEnemyHpBarColor(hpFillMesh: THREE.Mesh, hpRatio: number) {
  if (!sharedHpBarMats) return;
  const targetMat =
    hpRatio > 0.5
      ? sharedHpBarMats.green
      : hpRatio > 0.25
        ? sharedHpBarMats.amber
        : sharedHpBarMats.red;
  if (hpFillMesh.material !== targetMat) {
    hpFillMesh.material = targetMat;
  }
}

let sharedHitFlashMat: THREE.MeshBasicMaterial | null = null;
function getSharedHitFlashMaterial(): THREE.MeshBasicMaterial {
  if (!sharedHitFlashMat) {
    sharedHitFlashMat = markShared(new THREE.MeshBasicMaterial({ color: 0xffffff }));
  }
  return sharedHitFlashMat;
}

export function setEnemyHitFlashVisual(bundle: EnemyMeshBundle, active: boolean) {
  if (bundle.isHitFlashing === active) return;
  bundle.isHitFlashing = active;
  const entries = bundle.hitFlashEntries;
  if (active) {
    const flashMat = getSharedHitFlashMaterial();
    for (let i = 0; i < entries.length; i++) {
      entries[i].mesh.material = flashMat;
    }
  } else {
    for (let i = 0; i < entries.length; i++) {
      entries[i].mesh.material = entries[i].origMat;
    }
    if (bundle.glowMeshes.length > 0 && bundle.glowIdleMat && bundle.glowAlertMat) {
      const glowMat = bundle.isGlowAlerted ? bundle.glowAlertMat : bundle.glowIdleMat;
      for (let i = 0; i < bundle.glowMeshes.length; i++) {
        bundle.glowMeshes[i].material = glowMat;
      }
    }
  }
}

export function setEnemyGlowAlertVisual(bundle: EnemyMeshBundle, alerted: boolean) {
  if (bundle.isGlowAlerted === alerted) return;
  bundle.isGlowAlerted = alerted;
  if (bundle.isHitFlashing || bundle.glowMeshes.length === 0) return;
  const targetMat = alerted ? bundle.glowAlertMat : bundle.glowIdleMat;
  if (!targetMat) return;
  for (let i = 0; i < bundle.glowMeshes.length; i++) {
    bundle.glowMeshes[i].material = targetMat;
  }
}

let sharedTelRingGeo: THREE.RingGeometry | null = null;
function getSharedTelRingGeo(): THREE.RingGeometry {
  if (!sharedTelRingGeo) {
    sharedTelRingGeo = markShared(new THREE.RingGeometry(0.75, 0.96, 28));
    sharedTelRingGeo.rotateX(-Math.PI / 2);
  }
  return sharedTelRingGeo;
}

const sharedZombieGeoPool = new Map<string, THREE.BufferGeometry>();
const sharedZombieMatPool = new Map<string, THREE.MeshStandardMaterial>();

function getSharedZombieGeo(
  key: string,
  factory: () => THREE.BufferGeometry,
): THREE.BufferGeometry {
  let geo = sharedZombieGeoPool.get(key);
  if (!geo) {
    geo = markShared(factory());
    sharedZombieGeoPool.set(key, geo);
  }
  return geo;
}

function getSharedZombieMat(
  key: string,
  factory: () => THREE.MeshStandardMaterial,
): THREE.MeshStandardMaterial {
  let mat = sharedZombieMatPool.get(key);
  if (!mat) {
    mat = markShared(factory());
    sharedZombieMatPool.set(key, mat);
  }
  return mat;
}

function attachWorldHealthBar(
  parent: THREE.Group,
  heightOffset: number,
  width = 1.1,
): {
  hpBarGroup: THREE.Group;
  hpFillMesh: THREE.Mesh;
} {
  const hpBarGroup = new THREE.Group();
  hpBarGroup.position.set(0, heightOffset, 0);
  hpBarGroup.visible = false;

  const { geos, mats } = getSharedHpBarResources(width);
  const bgMesh = new THREE.Mesh(geos.bg, mats.bg);
  hpBarGroup.add(bgMesh);

  const hpFillMesh = new THREE.Mesh(geos.fill, mats.green);
  hpFillMesh.position.set(-width / 2, 0, 0.01);
  hpBarGroup.add(hpFillMesh);

  parent.add(hpBarGroup);
  return { hpBarGroup, hpFillMesh };
}

export function buildEnemyMesh(
  kind: EnemyKind,
  customTemplate: CustomZombieTemplate | null = null,
  carriedWeapon: 'pistol' | 'rifle' | null = null,
  enemyRole: EnemyRole = 'civilian',
  carriedGear?: EnemyCarriedGear,
  zombieAttachTransforms?: Partial<Record<ZombieAttachableId, AttachmentTransform>> | null,
): EnemyMeshBundle {
  const effectiveRole: EnemyRole =
    enemyRole !== 'civilian'
      ? enemyRole
      : carriedGear?.helmet || carriedGear?.vest
        ? 'gendarme_heavy'
        : carriedGear?.rifle || (carriedGear?.rifleMags ?? 0) > 0 || carriedWeapon === 'rifle'
          ? 'gendarme'
          : carriedGear?.revolver || carriedGear?.baton || carriedWeapon === 'pistol'
            ? 'police'
            : 'civilian';

  const gear: EnemyCarriedGear = {
    revolver: carriedGear?.revolver ?? (effectiveRole === 'police' && carriedWeapon === 'pistol'),
    baton: carriedGear?.baton ?? false,
    rifle:
      carriedGear?.rifle ??
      ((effectiveRole === 'gendarme' || effectiveRole === 'gendarme_heavy') &&
        carriedWeapon === 'rifle'),
    rifleMags: carriedGear?.rifleMags ?? (effectiveRole === 'gendarme' ? 1 : 0),
    helmet: carriedGear?.helmet ?? effectiveRole === 'gendarme_heavy',
    vest: carriedGear?.vest ?? effectiveRole === 'gendarme_heavy',
  };

  const group = new THREE.Group();
  const bodyPivot = new THREE.Group();
  group.add(bodyPivot);

  const hitFlashEntries: HitFlashMeshEntry[] = [];
  const glowMeshes: THREE.Mesh[] = [];
  let glowIdleMat: THREE.MeshStandardMaterial | undefined;
  let glowAlertMat: THREE.MeshStandardMaterial | undefined;
  const weaponDisposers: Array<() => void> = [];
  let helmetArmorGroup: THREE.Group | undefined;
  let vestArmorGroup: THREE.Group | undefined;
  const attachSockets: Partial<Record<ZombieAttachableId, THREE.Object3D[]>> = {};
  const registerAttachSocket = (id: ZombieAttachableId, node: THREE.Object3D) => {
    const arr = attachSockets[id];
    if (arr) arr.push(node);
    else attachSockets[id] = [node];
  };
  let mouthAnchor: THREE.Object3D | undefined;
  let jawNode: THREE.Object3D | undefined;
  let spitSacNodes: THREE.Object3D[] | undefined;

  let isCustomGlb = false;
  let zombieClipCtrl: ReturnType<typeof createClipController> | null = null;
  const isCrawlerTemplate = Boolean(
    customTemplate && /crawl|crawling|crawler|arrastr/i.test(customTemplate.name),
  );
  const zombieAnimationTag: CharacterAnimationTag = resolveZombieAnimationTag(
    kind,
    effectiveRole,
    isCrawlerTemplate,
  );
  let bones: HumanoidBoneMap = {
    hips: null,
    spine: null,
    neck: null,
    head: null,
    leftUpLeg: null,
    leftLeg: null,
    leftFoot: null,
    rightUpLeg: null,
    rightLeg: null,
    rightFoot: null,
    leftArm: null,
    leftForeArm: null,
    leftHandRest: null,
    rightArm: null,
    rightForeArm: null,
    rightHandRest: null,
    rightHand: null,
    leftHand: null,
    armDropAngle: 0,
  };

  let barHeight =
    effectiveRole === 'gendarme_heavy' ? 2.58 : kind === 'brute' ? 2.65 : 2.15;

  if (customTemplate) {
    isCustomGlb = true;
    const cloned = SkeletonUtils.clone(customTemplate.scene) as THREE.Group;
    const scaleMult =
      effectiveRole === 'gendarme_heavy'
        ? 1.24
        : kind === 'brute'
          ? 1.32
          : kind === 'spitter'
            ? 1.05
            : kind === 'runner'
              ? 0.95
              : kind === 'biter'
                ? 0.99
                : 0.96;
    cloned.scale.multiplyScalar(scaleMult);
    bodyPivot.add(cloned);
    barHeight = customTemplate.height * scaleMult + 0.35;

    cloned.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const m = child as THREE.Mesh;
        if (m.material) {
          hitFlashEntries.push({ mesh: m, origMat: m.material });
        }
      }
    });

    zombieClipCtrl = createClipController(
      cloned,
      customTemplate.animations,
      'zombie',
      zombieAnimationTag,
    );
    bones = extractHumanoidBones(cloned);

    const rightHandAttach = gear.rifle
      ? 'rifle'
      : gear.revolver
        ? 'pistol'
        : gear.baton
          ? 'baton'
          : null;
    if (rightHandAttach) {
      const wInst =
        rightHandAttach === 'rifle'
          ? buildDefaultRifleInstance()
          : rightHandAttach === 'pistol'
            ? buildDefaultPistolInstance()
            : buildBatonWeaponInstance();
      weaponDisposers.push(wInst.dispose);
      if (bones.rightHand) {
        const ws = new THREE.Vector3();
        bones.rightHand.getWorldScale(ws);
        wInst.group.scale.setScalar(1 / Math.max(0.01, ws.x));
        if (bones.rightPalmOffset) wInst.group.position.copy(bones.rightPalmOffset);
        if (bones.rightGripLocalQ) wInst.group.quaternion.copy(bones.rightGripLocalQ);
        bones.rightHand.add(wInst.group);
      } else {
        wInst.group.position.set(-0.28, 1.15, 0.35);
        bodyPivot.add(wInst.group);
      }
      registerAttachSocket(rightHandAttach, wInst.group);
    }
    if (gear.baton && gear.revolver && bones.leftHand) {
      const batonInst = buildBatonWeaponInstance();
      weaponDisposers.push(batonInst.dispose);
      const ls = new THREE.Vector3();
      bones.leftHand.getWorldScale(ls);
      batonInst.group.scale.setScalar(1 / Math.max(0.01, ls.x));
      if (bones.leftGripLocalQ) batonInst.group.quaternion.copy(bones.leftGripLocalQ);
      bones.leftHand.add(batonInst.group);
      registerAttachSocket('baton', batonInst.group);
    }
    if (gear.helmet || gear.vest) {
      const armMeshes = buildPlayerArmorMeshes();
      weaponDisposers.push(armMeshes.dispose);
      attachCalibratedArmorSockets(cloned, bodyPivot, bones, armMeshes, scaleMult);
      if (gear.helmet) {
        helmetArmorGroup = armMeshes.helmetGroup;
        helmetArmorGroup.visible = true;
        registerAttachSocket('helmet', armMeshes.helmetOffsetGroup);
      } else {
        armMeshes.helmetGroup.parent?.remove(armMeshes.helmetGroup);
      }
      if (gear.vest) {
        vestArmorGroup = armMeshes.vestGroup;
        vestArmorGroup.visible = true;
        registerAttachSocket('vest', armMeshes.vestOffsetGroup);
      } else {
        armMeshes.vestGroup.parent?.remove(armMeshes.vestGroup);
      }
      armMeshes.backpackGroup.parent?.remove(armMeshes.backpackGroup);
    }
  } else {
    const isPolice = effectiveRole === 'police';
    const isGendarme = effectiveRole === 'gendarme';
    const isHeavyGendarme = effectiveRole === 'gendarme_heavy';
    const useHeavyHumanoidBody = isHeavyGendarme;

    const skinKey = `skin:${kind}:${isHeavyGendarme ? 'hg' : 'std'}`;
    const zombieSkin = getSharedZombieMat(
      skinKey,
      () =>
        new THREE.MeshStandardMaterial({
          color:
            kind === 'spitter'
              ? 0x4d6b47
              : kind === 'runner'
                ? 0x6d5755
                : kind === 'biter'
                  ? 0x636b52
                  : isHeavyGendarme
                    ? 0x4e594c
                    : kind === 'brute'
                      ? 0x4b5349
                      : 0x5c6b58,
          roughness: 0.84,
          metalness: 0.04,
        }),
    );
    const clothKey = `cloth:${kind}:${effectiveRole}`;
    const tatteredCloth = getSharedZombieMat(
      clothKey,
      () =>
        new THREE.MeshStandardMaterial({
          color: isPolice
            ? 0x1b365d
            : isGendarme
              ? 0x2d3f25
              : isHeavyGendarme
                ? 0x233021
                : kind === 'brute'
                  ? 0x252a34
                  : kind === 'spitter'
                    ? 0x2e3b2f
                    : kind === 'runner'
                      ? 0x4a2323
                      : kind === 'biter'
                        ? 0x3b2a27
                        : 0x38322e,
          roughness: isPolice || isGendarme || isHeavyGendarme ? 0.7 : 0.9,
          metalness: isPolice || isGendarme || isHeavyGendarme ? 0.16 : 0.08,
        }),
    );

    const glowKey = `glow:${kind}:${isHeavyGendarme ? 'hg' : 'std'}`;
    const glowColor =
      kind === 'spitter'
        ? 0xa3e635
        : isHeavyGendarme
          ? 0xf59e0b
          : kind === 'runner'
            ? 0xff5a1f
            : kind === 'biter'
              ? 0xdc2626
              : 0xf43f5e;
    const glowEmissive =
      kind === 'spitter'
        ? 0x84cc16
        : kind === 'runner'
          ? 0xea580c
          : 0xe11d48;
    glowIdleMat = getSharedZombieMat(
      `${glowKey}:idle`,
      () =>
        new THREE.MeshStandardMaterial({
          color: glowColor,
          emissive: new THREE.Color(glowEmissive),
          emissiveIntensity: 0.85,
          roughness: 0.25,
        }),
    );
    glowAlertMat = getSharedZombieMat(
      `${glowKey}:alert`,
      () =>
        new THREE.MeshStandardMaterial({
          color: glowColor,
          emissive: new THREE.Color(glowEmissive),
          emissiveIntensity: 1.9,
          roughness: 0.25,
        }),
    );
    const infectedGlow = glowIdleMat;

    const addFlashMesh = (mesh: THREE.Mesh, isGlow = false) => {
      hitFlashEntries.push({ mesh, origMat: mesh.material });
      if (isGlow) glowMeshes.push(mesh);
      return mesh;
    };

    let leftArm: THREE.Object3D | null = null;
    let rightArm: THREE.Object3D | null = null;
    let leftForeArm: THREE.Object3D | null = null;
    let rightForeArm: THREE.Object3D | null = null;
    let leftUpLeg: THREE.Object3D | null = null;
    let rightUpLeg: THREE.Object3D | null = null;
    let leftKnee: THREE.Object3D | null = null;
    let rightKnee: THREE.Object3D | null = null;
    let leftFoot: THREE.Object3D | null = null;
    let rightFoot: THREE.Object3D | null = null;
    let torsoNode: THREE.Object3D | null = null;
    let neckNode: THREE.Object3D | null = null;
    let headNode: THREE.Object3D | null = null;

    if (kind === 'stalker' || kind === 'runner' || kind === 'biter' || useHeavyHumanoidBody) {
      const thighGeo = getSharedZombieGeo('stalker_thigh', () => {
        const g = new THREE.CylinderGeometry(0.095, 0.082, 0.36, 7);
        g.translate(0, -0.18, 0);
        return g;
      });
      const shinGeo = getSharedZombieGeo('stalker_shin', () => {
        const g = new THREE.CylinderGeometry(0.08, 0.068, 0.34, 7);
        g.translate(0, -0.17, 0);
        return g;
      });
      const footGeo = getSharedZombieGeo(
        'stalker_foot',
        () => new THREE.BoxGeometry(0.14, 0.1, 0.22),
      );

      const makeZLeg = (lx: number) => {
        const up = new THREE.Group();
        up.position.set(lx, 0.72, 0);
        const tMesh = addFlashMesh(new THREE.Mesh(thighGeo, tatteredCloth));
        tMesh.castShadow = true;
        up.add(tMesh);

        const knee = new THREE.Group();
        knee.position.set(0, -0.36, 0);
        const sMesh = addFlashMesh(new THREE.Mesh(shinGeo, tatteredCloth));
        sMesh.castShadow = true;
        knee.add(sMesh);

        const foot = new THREE.Group();
        foot.position.set(0, -0.34, 0);
        const fMesh = addFlashMesh(new THREE.Mesh(footGeo, tatteredCloth));
        fMesh.position.set(0, 0.01, 0.045);
        fMesh.castShadow = true;
        foot.add(fMesh);
        knee.add(foot);

        up.add(knee);
        bodyPivot.add(up);
        return { up, knee, foot };
      };
      const zLegL = makeZLeg(0.14);
      const zLegR = makeZLeg(-0.14);
      leftUpLeg = zLegL.up;
      leftKnee = zLegL.knee;
      leftFoot = zLegL.foot;
      rightUpLeg = zLegR.up;
      rightKnee = zLegR.knee;
      rightFoot = zLegR.foot;

      torsoNode = new THREE.Group();
      torsoNode.position.set(0, 0.72, 0);
      bodyPivot.add(torsoNode);

      const torsoGeo = getSharedZombieGeo(
        'stalker_torso',
        () => new THREE.BoxGeometry(0.46, 0.62, 0.28),
      );
      const torsoMesh = addFlashMesh(new THREE.Mesh(torsoGeo, tatteredCloth));
      torsoMesh.position.set(0, 0.31, 0.02);
      torsoMesh.castShadow = true;
      torsoNode.add(torsoMesh);

      neckNode = new THREE.Group();
      neckNode.position.set(0, 0.61, 0.04);
      torsoNode.add(neckNode);

      const zNeckGeo = getSharedZombieGeo(
        'stalker_neck',
        () => new THREE.CylinderGeometry(0.068, 0.078, 0.09, 7),
      );
      const zNeckMesh = addFlashMesh(new THREE.Mesh(zNeckGeo, zombieSkin));
      zNeckMesh.position.set(0, 0.025, 0.01);
      neckNode.add(zNeckMesh);

      headNode = new THREE.Group();
      headNode.position.set(0, 0.05, 0.02);
      neckNode.add(headNode);

      const headGeo = getSharedZombieGeo('stalker_head', () => new THREE.SphereGeometry(0.2, 10, 8));
      const headMesh = addFlashMesh(new THREE.Mesh(headGeo, zombieSkin));
      headMesh.position.set(0, 0.14, 0.02);
      headMesh.castShadow = true;
      headNode.add(headMesh);

      const eyeGeo = getSharedZombieGeo(
        'stalker_eye',
        () => new THREE.BoxGeometry(0.22, 0.06, 0.08),
      );
      const eyes = addFlashMesh(new THREE.Mesh(eyeGeo, infectedGlow), true);
      eyes.position.set(0, 0.16, 0.18);
      headNode.add(eyes);

      const shGeo = getSharedZombieGeo('stalker_sh', () => new THREE.SphereGeometry(0.078, 7, 7));
      const upArmGeo = getSharedZombieGeo('stalker_upArm', () => {
        const g = new THREE.CylinderGeometry(0.072, 0.06, 0.3, 7);
        g.translate(0, -0.15, 0);
        return g;
      });
      const elGeo = getSharedZombieGeo('stalker_el', () => new THREE.SphereGeometry(0.062, 7, 7));
      const foreGeo = getSharedZombieGeo('stalker_fore', () => {
        const g = new THREE.CylinderGeometry(0.058, 0.044, 0.28, 7);
        g.translate(0, -0.14, 0);
        return g;
      });

      const makeZArm = (ax: number) => {
        const sh = new THREE.Group();
        sh.position.set(ax, 0.56, 0.03);
        const shBall = addFlashMesh(new THREE.Mesh(shGeo, tatteredCloth));
        sh.add(shBall);
        const uMesh = addFlashMesh(
          new THREE.Mesh(upArmGeo, isHeavyGendarme ? tatteredCloth : zombieSkin),
        );
        uMesh.castShadow = true;
        sh.add(uMesh);

        const el = new THREE.Group();
        el.position.set(0, -0.29, 0);
        const elBall = addFlashMesh(new THREE.Mesh(elGeo, zombieSkin));
        el.add(elBall);
        const fMesh = addFlashMesh(new THREE.Mesh(foreGeo, zombieSkin));
        fMesh.castShadow = true;
        el.add(fMesh);
        sh.add(el);
        torsoNode!.add(sh);
        return { sh, el };
      };
      const zArmL = makeZArm(0.29);
      const zArmR = makeZArm(-0.29);
      leftArm = zArmL.sh;
      leftForeArm = zArmL.el;
      rightArm = zArmR.sh;
      rightForeArm = zArmR.el;

      if (useHeavyHumanoidBody) {
        bodyPivot.scale.set(1.26, 1.2, 1.24);
      } else if (kind === 'runner' && effectiveRole === 'civilian') {
        bodyPivot.scale.set(0.92, 0.98, 0.92);
      } else if (kind === 'biter' && effectiveRole === 'civilian') {
        bodyPivot.scale.set(1.05, 0.94, 1.06);
        const biterJawGeo = getSharedZombieGeo(
          'biter_jaw',
          () => new THREE.BoxGeometry(0.19, 0.075, 0.14),
        );
        const biterJawMat = getSharedZombieMat(
          'biter_jaw_mat',
          () =>
            new THREE.MeshStandardMaterial({
              color: 0x6f1116,
              roughness: 0.35,
              metalness: 0.08,
            }),
        );
        const biterJawPivot = new THREE.Group();
        biterJawPivot.position.set(0, 0.03, 0.09);
        const biterJaw = addFlashMesh(new THREE.Mesh(biterJawGeo, biterJawMat));
        biterJaw.position.set(0, -0.015, 0.08);
        biterJawPivot.add(biterJaw);
        headNode.add(biterJawPivot);
        jawNode = biterJawPivot;
      }
    } else if (kind === 'spitter') {
      const thighGeo = getSharedZombieGeo('spitter_thigh', () => {
        const g = new THREE.CylinderGeometry(0.11, 0.095, 0.32, 7);
        g.translate(0, -0.16, 0);
        return g;
      });
      const shinGeo = getSharedZombieGeo('spitter_shin', () => {
        const g = new THREE.CylinderGeometry(0.092, 0.075, 0.3, 7);
        g.translate(0, -0.15, 0);
        return g;
      });
      const makeSpitterLeg = (lx: number) => {
        const up = new THREE.Group();
        up.position.set(lx, 0.62, 0);
        const tMesh = addFlashMesh(new THREE.Mesh(thighGeo, tatteredCloth));
        tMesh.castShadow = true;
        up.add(tMesh);
        const knee = new THREE.Group();
        knee.position.set(0, -0.32, 0);
        const sMesh = addFlashMesh(new THREE.Mesh(shinGeo, tatteredCloth));
        sMesh.castShadow = true;
        knee.add(sMesh);
        up.add(knee);
        bodyPivot.add(up);
        return { up, knee };
      };
      const spLegL = makeSpitterLeg(0.18);
      const spLegR = makeSpitterLeg(-0.18);
      leftUpLeg = spLegL.up;
      leftKnee = spLegL.knee;
      rightUpLeg = spLegR.up;
      rightKnee = spLegR.knee;

      torsoNode = new THREE.Group();
      torsoNode.position.set(0, 0.62, 0);
      bodyPivot.add(torsoNode);

      const torsoGeo = getSharedZombieGeo(
        'spitter_torso',
        () => new THREE.DodecahedronGeometry(0.42, 0),
      );
      const torsoMesh = addFlashMesh(new THREE.Mesh(torsoGeo, zombieSkin));
      torsoMesh.position.set(0, 0.4, 0);
      torsoMesh.scale.set(1.05, 1.15, 0.95);
      torsoMesh.castShadow = true;
      torsoNode.add(torsoMesh);

      const sacGeo = getSharedZombieGeo('spitter_sac', () => new THREE.SphereGeometry(0.22, 8, 8));
      const sac1 = addFlashMesh(new THREE.Mesh(sacGeo, infectedGlow), true);
      sac1.position.set(-0.26, 0.53, -0.15);
      const sac2 = addFlashMesh(new THREE.Mesh(sacGeo, infectedGlow), true);
      sac2.scale.setScalar(0.8);
      sac2.position.set(0.28, 0.36, 0.14);
      const throatSac = addFlashMesh(new THREE.Mesh(sacGeo, infectedGlow), true);
      throatSac.scale.set(0.68, 0.58, 0.72);
      throatSac.position.set(0, 0.73, 0.16);
      torsoNode.add(sac1, sac2, throatSac);
      spitSacNodes = [sac1, sac2, throatSac];

      headNode = new THREE.Group();
      headNode.position.set(0, 0.82, 0.1);
      torsoNode.add(headNode);

      const headGeo = getSharedZombieGeo(
        'spitter_head',
        () => new THREE.SphereGeometry(0.22, 10, 8),
      );
      const headMesh = addFlashMesh(new THREE.Mesh(headGeo, zombieSkin));
      headMesh.position.set(0, 0.1, 0.02);
      headMesh.castShadow = true;
      headNode.add(headMesh);

      const jawGeo = getSharedZombieGeo(
        'spitter_jaw',
        () => new THREE.BoxGeometry(0.21, 0.085, 0.15),
      );
      const droolGeo = getSharedZombieGeo('spitter_drool', () => {
        const g = createDropletLatheGeometry(0.025, 0.11, 6);
        g.rotateX(Math.PI);
        g.translate(0, -0.05, 0);
        return g;
      });
      const jawPivot = new THREE.Group();
      jawPivot.position.set(0, 0.035, 0.1);
      const jaw = addFlashMesh(new THREE.Mesh(jawGeo, infectedGlow), true);
      jaw.position.set(0, -0.015, 0.09);
      const droolL = addFlashMesh(new THREE.Mesh(droolGeo, infectedGlow), true);
      droolL.position.set(-0.045, -0.045, 0.14);
      const droolR = addFlashMesh(new THREE.Mesh(droolGeo, infectedGlow), true);
      droolR.position.set(0.05, -0.04, 0.13);
      droolR.scale.setScalar(0.8);
      jawPivot.add(jaw, droolL, droolR);
      headNode.add(jawPivot);
      jawNode = jawPivot;

      mouthAnchor = new THREE.Object3D();
      mouthAnchor.position.set(0, 0.045, 0.25);
      headNode.add(mouthAnchor);

      const sArmGeo = getSharedZombieGeo('spitter_arm', () => {
        const g = new THREE.CylinderGeometry(0.068, 0.056, 0.28, 7);
        g.translate(0, -0.14, 0);
        return g;
      });
      const sForeGeo = getSharedZombieGeo('spitter_fore', () => {
        const g = new THREE.CylinderGeometry(0.054, 0.04, 0.26, 7);
        g.translate(0, -0.13, 0);
        return g;
      });

      const makeSpitterArm = (ax: number) => {
        const sh = new THREE.Group();
        sh.position.set(ax, 0.62, 0.06);
        const uMesh = addFlashMesh(new THREE.Mesh(sArmGeo, zombieSkin));
        uMesh.castShadow = true;
        sh.add(uMesh);
        const el = new THREE.Group();
        el.position.set(0, -0.27, 0);
        const fMesh = addFlashMesh(new THREE.Mesh(sForeGeo, zombieSkin));
        fMesh.castShadow = true;
        el.add(fMesh);
        sh.add(el);
        torsoNode!.add(sh);
        return { sh, el };
      };
      const spArmL = makeSpitterArm(0.41);
      const spArmR = makeSpitterArm(-0.41);
      leftArm = spArmL.sh;
      leftForeArm = spArmL.el;
      rightArm = spArmR.sh;
      rightForeArm = spArmR.el;
    } else {
      const thighGeo = getSharedZombieGeo('brute_thigh', () => {
        const g = new THREE.BoxGeometry(0.36, 0.42, 0.36);
        g.translate(0, -0.21, 0);
        return g;
      });
      const shinGeo = getSharedZombieGeo('brute_shin', () => {
        const g = new THREE.BoxGeometry(0.33, 0.38, 0.34);
        g.translate(0, -0.19, 0);
        return g;
      });
      const makeBruteLeg = (lx: number) => {
        const up = new THREE.Group();
        up.position.set(lx, 0.8, 0);
        const tMesh = addFlashMesh(new THREE.Mesh(thighGeo, tatteredCloth));
        tMesh.castShadow = true;
        up.add(tMesh);
        const knee = new THREE.Group();
        knee.position.set(0, -0.42, 0);
        const sMesh = addFlashMesh(new THREE.Mesh(shinGeo, tatteredCloth));
        sMesh.castShadow = true;
        knee.add(sMesh);
        up.add(knee);
        bodyPivot.add(up);
        return { up, knee };
      };
      const brLegL = makeBruteLeg(0.34);
      const brLegR = makeBruteLeg(-0.34);
      leftUpLeg = brLegL.up;
      leftKnee = brLegL.knee;
      rightUpLeg = brLegR.up;
      rightKnee = brLegR.knee;

      torsoNode = new THREE.Group();
      torsoNode.position.set(0, 0.8, 0);
      bodyPivot.add(torsoNode);

      const chestGeo = getSharedZombieGeo(
        'brute_chest',
        () => new THREE.BoxGeometry(1.18, 1.05, 0.78),
      );
      const chestMesh = addFlashMesh(new THREE.Mesh(chestGeo, tatteredCloth));
      chestMesh.position.y = 0.52;
      chestMesh.castShadow = true;
      torsoNode.add(chestMesh);

      const pauldronGeo = getSharedZombieGeo(
        'brute_pauldron',
        () => new THREE.DodecahedronGeometry(0.4, 0),
      );
      [-0.68, 0.68].forEach((px) => {
        const p = addFlashMesh(new THREE.Mesh(pauldronGeo, zombieSkin));
        p.position.set(px, 0.88, 0);
        p.castShadow = true;
        torsoNode!.add(p);
      });

      const bUpArmGeo = getSharedZombieGeo('brute_upArm', () => {
        const g = new THREE.BoxGeometry(0.32, 0.46, 0.32);
        g.translate(0, -0.22, 0);
        return g;
      });
      const bForeGeo = getSharedZombieGeo('brute_fore', () => {
        const g = new THREE.BoxGeometry(0.28, 0.44, 0.28);
        g.translate(0, -0.22, 0);
        return g;
      });

      const makeBruteArm = (ax: number) => {
        const sh = new THREE.Group();
        sh.position.set(ax, 0.82, 0.06);
        const uMesh = addFlashMesh(new THREE.Mesh(bUpArmGeo, zombieSkin));
        uMesh.castShadow = true;
        sh.add(uMesh);
        const el = new THREE.Group();
        el.position.set(0, -0.44, 0);
        const fMesh = addFlashMesh(new THREE.Mesh(bForeGeo, zombieSkin));
        fMesh.castShadow = true;
        el.add(fMesh);
        sh.add(el);
        torsoNode!.add(sh);
        return { sh, el };
      };
      const bArmL = makeBruteArm(0.74);
      const bArmR = makeBruteArm(-0.74);
      leftArm = bArmL.sh;
      leftForeArm = bArmL.el;
      rightArm = bArmR.sh;
      rightForeArm = bArmR.el;

      headNode = new THREE.Group();
      headNode.position.set(0, 1.08, 0.06);
      torsoNode.add(headNode);

      const headGeo = getSharedZombieGeo('brute_head', () => new THREE.BoxGeometry(0.46, 0.44, 0.46));
      const headMesh = addFlashMesh(new THREE.Mesh(headGeo, tatteredCloth));
      headMesh.position.set(0, 0.18, 0);
      headMesh.castShadow = true;
      headNode.add(headMesh);

      const visorGeo = getSharedZombieGeo(
        'brute_visor',
        () => new THREE.BoxGeometry(0.38, 0.12, 0.12),
      );
      const visor = addFlashMesh(new THREE.Mesh(visorGeo, infectedGlow), true);
      visor.position.set(0, 0.2, 0.22);
      headNode.add(visor);
    }

    // Policía (gorra, placa, cinturón, revólver y/o bastón policía)
    if (isPolice && torsoNode && headNode) {
      const capMat = getSharedZombieMat(
        'police_cap',
        () => new THREE.MeshStandardMaterial({ color: 0x0f2342, roughness: 0.65, metalness: 0.14 }),
      );
      const visorMat = getSharedZombieMat(
        'police_visor',
        () => new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.3, metalness: 0.4 }),
      );
      const badgeMat = getSharedZombieMat(
        'police_badge',
        () =>
          new THREE.MeshStandardMaterial({
            color: 0xfacc15,
            emissive: new THREE.Color(0xca8a04),
            emissiveIntensity: 0.45,
            roughness: 0.25,
            metalness: 0.88,
          }),
      );

      const beltGeo = getSharedZombieGeo('police_belt', () => new THREE.BoxGeometry(0.49, 0.08, 0.31));
      const belt = new THREE.Mesh(beltGeo, visorMat);
      belt.position.set(0, 0.06, 0.02);
      torsoNode.add(belt);

      const badgeGeo = getSharedZombieGeo('police_badge', () => new THREE.BoxGeometry(0.08, 0.09, 0.03));
      const chestBadge = new THREE.Mesh(badgeGeo, badgeMat);
      chestBadge.position.set(0.11, 0.44, 0.16);
      torsoNode.add(chestBadge);

      const capCrownGeo = getSharedZombieGeo(
        'police_crown',
        () => new THREE.CylinderGeometry(0.225, 0.195, 0.12, 12),
      );
      const capCrown = new THREE.Mesh(capCrownGeo, capMat);
      capCrown.position.set(0, 0.31, 0.01);
      capCrown.rotation.x = -0.12;
      headNode.add(capCrown);

      const capBrimGeo = getSharedZombieGeo(
        'police_brim',
        () => new THREE.BoxGeometry(0.25, 0.025, 0.14),
      );
      const capBrim = new THREE.Mesh(capBrimGeo, visorMat);
      capBrim.position.set(0, 0.25, 0.19);
      capBrim.rotation.x = 0.16;
      headNode.add(capBrim);

      const capShieldGeo = getSharedZombieGeo(
        'police_shield',
        () => new THREE.BoxGeometry(0.06, 0.06, 0.025),
      );
      const capShield = new THREE.Mesh(capShieldGeo, badgeMat);
      capShield.position.set(0, 0.31, 0.21);
      headNode.add(capShield);

      if (gear.revolver && rightForeArm) {
        const wInst = buildDefaultPistolInstance();
        weaponDisposers.push(wInst.dispose);
        wInst.group.position.set(0.02, -0.27, 0.02);
        wInst.group.rotation.set(Math.PI / 2 - 0.15, 0, 0);
        rightForeArm.add(wInst.group);
        registerAttachSocket('pistol', wInst.group);
      }
      if (gear.baton) {
        const batonInst = buildBatonWeaponInstance();
        weaponDisposers.push(batonInst.dispose);
        if (!gear.revolver && rightForeArm) {
          batonInst.group.position.set(0.02, -0.27, 0.02);
          batonInst.group.rotation.set(Math.PI / 2 - 0.1, 0, 0);
          rightForeArm.add(batonInst.group);
          registerAttachSocket('baton', batonInst.group);
        } else if (leftForeArm) {
          batonInst.group.position.set(-0.02, -0.27, 0.02);
          batonInst.group.rotation.set(Math.PI / 2 - 0.1, 0, 0);
          leftForeArm.add(batonInst.group);
          registerAttachSocket('baton', batonInst.group);
        }
      }
    }

    // Gendarme estándar (uniforme verde oliva, boina verde, chaleco porta-cargadores FAL, Fusil y/o cargadores)
    if (isGendarme && torsoNode && headNode) {
      const beretMat = getSharedZombieMat(
        'gend_beret',
        () => new THREE.MeshStandardMaterial({ color: 0x164e2e, roughness: 0.72, metalness: 0.08 }),
      );
      const harnessMat = getSharedZombieMat(
        'gend_harness',
        () => new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.7, metalness: 0.25 }),
      );
      const magMat = getSharedZombieMat(
        'gend_mag',
        () => new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.45, metalness: 0.65 }),
      );
      const cockadeMat = getSharedZombieMat(
        'gend_cockade',
        () => new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.28, metalness: 0.8 }),
      );

      const beltGeo = getSharedZombieGeo('gend_belt', () => new THREE.BoxGeometry(0.49, 0.08, 0.31));
      const belt = new THREE.Mesh(beltGeo, harnessMat);
      belt.position.set(0, 0.06, 0.02);
      torsoNode.add(belt);

      const rigChestGeo = getSharedZombieGeo(
        'gend_rig',
        () => new THREE.BoxGeometry(0.47, 0.28, 0.31),
      );
      const rigChest = new THREE.Mesh(rigChestGeo, harnessMat);
      rigChest.position.set(0, 0.34, 0.02);
      torsoNode.add(rigChest);

      const magPouchGeo = getSharedZombieGeo(
        'gend_pouch',
        () => new THREE.BoxGeometry(0.085, 0.16, 0.055),
      );
      const magCount = Math.max(2, gear.rifleMags ?? 1);
      for (let mIdx = 0; mIdx < Math.min(3, magCount + 1); mIdx++) {
        const pouch = new THREE.Mesh(magPouchGeo, magMat);
        pouch.position.set((mIdx - 1) * 0.11, 0.27, 0.185);
        torsoNode.add(pouch);
      }

      const beretGeo = getSharedZombieGeo(
        'gend_beret',
        () => new THREE.CylinderGeometry(0.22, 0.19, 0.1, 12),
      );
      const beret = new THREE.Mesh(beretGeo, beretMat);
      beret.position.set(0.03, 0.31, 0.01);
      beret.rotation.set(-0.08, 0, -0.18);
      headNode.add(beret);

      const cockadeGeo = getSharedZombieGeo('gend_cockade', () => {
        const g = new THREE.CylinderGeometry(0.032, 0.032, 0.02, 8);
        g.rotateX(Math.PI / 2);
        return g;
      });
      const cockade = new THREE.Mesh(cockadeGeo, cockadeMat);
      cockade.position.set(-0.04, 0.3, 0.21);
      headNode.add(cockade);

      if (gear.rifle && rightForeArm) {
        const wInst = buildDefaultRifleInstance();
        weaponDisposers.push(wInst.dispose);
        wInst.group.position.set(0.02, -0.27, 0.02);
        wInst.group.rotation.set(Math.PI / 2 - 0.15, 0, 0);
        rightForeArm.add(wInst.group);
        registerAttachSocket('rifle', wInst.group);
      } else if ((gear.rifleMags ?? 0) > 0 && leftForeArm) {
        const extraMagGeo = getSharedZombieGeo(
          'gend_extraMag',
          () => new THREE.BoxGeometry(0.045, 0.15, 0.075),
        );
        const extraMag = new THREE.Mesh(extraMagGeo, magMat);
        extraMag.position.set(0, -0.26, 0.02);
        leftForeArm.add(extraMag);
      }
    }

    // Gendarme Pesado con Casco Balístico y Chaleco Antibalas (piezas desmontables al romperse)
    if (isHeavyGendarme && torsoNode && headNode) {
      const beltGeo = getSharedZombieGeo('hg_belt', () => new THREE.BoxGeometry(0.5, 0.09, 0.32));
      const beltMat = getSharedZombieMat(
        'hg_belt',
        () => new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.65, metalness: 0.35 }),
      );
      const belt = new THREE.Mesh(beltGeo, beltMat);
      belt.position.set(0, 0.06, 0.02);
      torsoNode.add(belt);

      const armMeshes = buildPlayerArmorMeshes();
      weaponDisposers.push(armMeshes.dispose);

      if (gear.helmet) {
        helmetArmorGroup = armMeshes.helmetGroup;
        helmetArmorGroup.visible = true;
        helmetArmorGroup.position.set(0, 0.175, 0.02);
        helmetArmorGroup.scale.setScalar(1.78);
        headNode.add(helmetArmorGroup);
        registerAttachSocket('helmet', armMeshes.helmetOffsetGroup);
      }
      if (gear.vest) {
        vestArmorGroup = armMeshes.vestGroup;
        vestArmorGroup.visible = true;
        vestArmorGroup.position.set(0, 0.35, 0.02);
        vestArmorGroup.scale.set(1.62, 1.44, 1.52);
        torsoNode.add(vestArmorGroup);
        registerAttachSocket('vest', armMeshes.vestOffsetGroup);
      }

      if (gear.rifle && rightForeArm) {
        const wInst = buildDefaultRifleInstance();
        weaponDisposers.push(wInst.dispose);
        wInst.group.position.set(0.02, -0.27, 0.02);
        wInst.group.rotation.set(Math.PI / 2 - 0.15, 0, 0);
        rightForeArm.add(wInst.group);
        registerAttachSocket('rifle', wInst.group);
      }
    }

    bones = {
      hips: null,
      spine: captureBoneRest(torsoNode),
      chest: null,
      neck: captureBoneRest(neckNode),
      head: captureBoneRest(headNode),
      leftUpLeg: captureBoneRest(leftUpLeg),
      leftLeg: captureBoneRest(leftKnee),
      leftFoot: captureBoneRest(leftFoot),
      rightUpLeg: captureBoneRest(rightUpLeg),
      rightLeg: captureBoneRest(rightKnee),
      rightFoot: captureBoneRest(rightFoot),
      leftArm: captureBoneRest(leftArm),
      leftForeArm: captureBoneRest(leftForeArm),
      leftHandRest: null,
      rightArm: captureBoneRest(rightArm),
      rightForeArm: captureBoneRest(rightForeArm),
      rightHandRest: null,
      rightHand: null,
      leftHand: null,
      armDropAngle: 0,
    };
  }

  prepareActorHierarchy(bodyPivot, false);

  const bar = attachWorldHealthBar(
    group,
    barHeight,
    effectiveRole === 'gendarme_heavy' || kind === 'brute' ? 1.45 : 1.05,
  );

  const telMat = new THREE.MeshBasicMaterial({
    color:
      kind === 'spitter' ? 0x84cc16 : effectiveRole === 'gendarme_heavy' ? 0xf59e0b : 0xef4444,
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const telegraphRing = new THREE.Mesh(getSharedTelRingGeo(), telMat);
  telegraphRing.position.y = 0.04;
  group.add(telegraphRing);

  const iconTextures = getAwarenessIconTextures();
  const awarenessBaseY = barHeight - 0.04;
  const iconMat = new THREE.SpriteMaterial({
    map: iconTextures.question,
    color: 0x7dd3fc,
    transparent: true,
    opacity: 0.85,
    depthTest: true,
    depthWrite: false,
  });
  const awarenessIcon = new THREE.Sprite(iconMat);
  awarenessIcon.position.set(0, awarenessBaseY, 0);
  awarenessIcon.scale.set(0.36, 0.36, 1);
  awarenessIcon.visible = false;
  group.add(awarenessIcon);

  const hasClips = Boolean(zombieClipCtrl?.mixer && Object.keys(zombieClipCtrl.clips).length > 0);
  const zombieCharacter = new BaseCharacter({
    entityId: `zombie:${kind}:${effectiveRole}`,
    label: customTemplate?.name ?? `Zombie (${effectiveRole})`,
    role: 'zombie',
    tag: zombieAnimationTag,
    root: group,
    bodyPivot,
    modelRoot: bodyPivot,
    isCustomGlb,
    bones,
    clipController: zombieClipCtrl,
  });
  Object.entries(attachSockets).forEach(([itemKey, nodes]) => {
    if (!nodes) return;
    nodes.forEach((n) => zombieCharacter.registerAttachment(itemKey as PlayerAttachableId, n));
  });

  const bundle: EnemyMeshBundle = {
    character: zombieCharacter,
    group,
    bodyPivot,
    hitFlashEntries,
    glowMeshes,
    glowIdleMat,
    glowAlertMat,
    isHitFlashing: false,
    isGlowAlerted: false,
    telegraphRing,
    hpBarGroup: bar.hpBarGroup,
    hpFillMesh: bar.hpFillMesh,
    awarenessIcon,
    awarenessBaseY,
    bones,
    isCustomGlb,
    hasClips,
    helmetArmorGroup,
    vestArmorGroup,
    attachSockets,
    mouthAnchor,
    jawNode,
    spitSacNodes,
    preferWalkClip: customTemplate && /riber/i.test(customTemplate.name) ? 'errante' : undefined,
    mixer: zombieClipCtrl?.mixer ?? null,
    clips: zombieClipCtrl?.clips,
    playClip: zombieClipCtrl?.playClip,
    resetClips: zombieClipCtrl?.resetClips,
    dispose: () => {
      zombieCharacter.dispose();
      weaponDisposers.forEach((fn) => fn());
      telMat.dispose();
      iconMat.dispose();
    },
  };

  if (zombieAttachTransforms) {
    applyZombieAttachmentTransformsToBundle(bundle, zombieAttachTransforms);
  }

  return bundle;
}

export type LimbId =
  | 'head'
  | 'leftShoulder'
  | 'leftElbow'
  | 'rightShoulder'
  | 'rightElbow'
  | 'leftHip'
  | 'leftKnee'
  | 'rightHip'
  | 'rightKnee';

interface CachedBloodStumpResources {
  geo: THREE.CylinderGeometry;
  mat: THREE.MeshStandardMaterial;
  boneGeo: THREE.CylinderGeometry;
  boneMat: THREE.MeshStandardMaterial;
}
let cachedBloodStumpRes: CachedBloodStumpResources | null = null;

export function buildBloodStumpMesh(radius = 0.045): {
  mesh: THREE.Mesh;
  dispose: () => void;
} {
  if (!cachedBloodStumpRes) {
    cachedBloodStumpRes = {
      geo: new THREE.CylinderGeometry(0.92, 0.65, 0.44, 8),
      mat: new THREE.MeshStandardMaterial({
        color: 0x5c070b,
        roughness: 0.2,
        metalness: 0.05,
        emissive: new THREE.Color(0x200204),
        emissiveIntensity: 0.35,
      }),
      boneGeo: new THREE.CylinderGeometry(0.22, 0.28, 0.48, 6),
      boneMat: new THREE.MeshStandardMaterial({
        color: 0xe2dac4,
        roughness: 0.58,
        metalness: 0.02,
      }),
    };
  }
  const mesh = new THREE.Mesh(cachedBloodStumpRes.geo, cachedBloodStumpRes.mat);
  mesh.scale.setScalar(radius);
  mesh.castShadow = false;
  mesh.frustumCulled = false;

  const boneNub = new THREE.Mesh(cachedBloodStumpRes.boneGeo, cachedBloodStumpRes.boneMat);
  boneNub.position.y = -0.18;
  boneNub.frustumCulled = false;
  mesh.add(boneNub);

  return {
    mesh,
    dispose: () => {},
  };
}

interface CachedGoreChunkResources {
  meatGeo: THREE.DodecahedronGeometry;
  meatMat: THREE.MeshStandardMaterial;
  boneGeo: THREE.CylinderGeometry;
  boneMat: THREE.MeshStandardMaterial;
}
let cachedGoreChunkRes: CachedGoreChunkResources | null = null;

export function buildGoreChunkMesh(scale = 1.0): {
  group: THREE.Group;
  dispose: () => void;
} {
  if (!cachedGoreChunkRes) {
    cachedGoreChunkRes = {
      meatGeo: new THREE.DodecahedronGeometry(0.055, 0),
      meatMat: new THREE.MeshStandardMaterial({
        color: 0x6a090e,
        roughness: 0.22,
        metalness: 0.06,
        emissive: new THREE.Color(0x220204),
        emissiveIntensity: 0.4,
      }),
      boneGeo: new THREE.CylinderGeometry(0.014, 0.018, 0.075, 5),
      boneMat: new THREE.MeshStandardMaterial({
        color: 0xe6dec8,
        roughness: 0.55,
      }),
    };
  }
  const group = new THREE.Group();
  const meat = new THREE.Mesh(cachedGoreChunkRes.meatGeo, cachedGoreChunkRes.meatMat);
  meat.scale.set(1.2, 0.8, 0.9);
  meat.castShadow = false;

  const bone = new THREE.Mesh(cachedGoreChunkRes.boneGeo, cachedGoreChunkRes.boneMat);
  bone.position.set(0.03, 0.02, 0);
  bone.rotation.z = 0.8;
  group.add(meat, bone);
  group.scale.setScalar(scale);

  return {
    group,
    dispose: () => {},
  };
}

const severedLimbPrototypeCache = new Map<string, THREE.Group>();
let severedLimbSharedMats: {
  skin: Record<EnemyKind, THREE.MeshStandardMaterial>;
  cloth: Record<EnemyKind, THREE.MeshStandardMaterial>;
  flesh: THREE.MeshStandardMaterial;
  bone: THREE.MeshStandardMaterial;
} | null = null;

function getSeveredLimbMats() {
  if (!severedLimbSharedMats) {
    severedLimbSharedMats = {
      skin: {
        runner: new THREE.MeshStandardMaterial({ color: 0x6d5755, roughness: 0.82, metalness: 0.04 }),
        stalker: new THREE.MeshStandardMaterial({ color: 0x5c6b58, roughness: 0.82, metalness: 0.04 }),
        biter: new THREE.MeshStandardMaterial({ color: 0x636b52, roughness: 0.82, metalness: 0.04 }),
        spitter: new THREE.MeshStandardMaterial({ color: 0x4d6b47, roughness: 0.82, metalness: 0.04 }),
        brute: new THREE.MeshStandardMaterial({ color: 0x4b5349, roughness: 0.82, metalness: 0.04 }),
      },
      cloth: {
        runner: new THREE.MeshStandardMaterial({ color: 0x4a2323, roughness: 0.9, metalness: 0.08 }),
        stalker: new THREE.MeshStandardMaterial({ color: 0x38322e, roughness: 0.9, metalness: 0.08 }),
        biter: new THREE.MeshStandardMaterial({ color: 0x3b2a27, roughness: 0.9, metalness: 0.08 }),
        spitter: new THREE.MeshStandardMaterial({ color: 0x2e3b2f, roughness: 0.9, metalness: 0.08 }),
        brute: new THREE.MeshStandardMaterial({ color: 0x252a34, roughness: 0.9, metalness: 0.08 }),
      },
      flesh: new THREE.MeshStandardMaterial({
        color: 0x7a0b10,
        roughness: 0.16,
        metalness: 0.08,
        emissive: new THREE.Color(0x2c0305),
        emissiveIntensity: 0.5,
      }),
      bone: new THREE.MeshStandardMaterial({
        color: 0xe5dec9,
        roughness: 0.55,
        metalness: 0.02,
      }),
    };
  }
  return severedLimbSharedMats;
}

export function buildSeveredLimbMesh(
  limb: LimbId,
  kind: EnemyKind,
  distalAlreadyGone = false,
): { group: THREE.Group; dispose: () => void } {
  const cacheKey = `${limb}_${kind}_${distalAlreadyGone ? 1 : 0}`;
  const existing = severedLimbPrototypeCache.get(cacheKey);
  if (existing) {
    return {
      group: existing.clone(true),
      dispose: () => {},
    };
  }

  const group = new THREE.Group();
  const mats = getSeveredLimbMats();
  const skinMat = mats.skin[kind];
  const clothMat = mats.cloth[kind];
  const fleshMat = mats.flesh;
  const boneMat = mats.bone;

  const scaleMult = kind === 'brute' ? 1.38 : kind === 'spitter' ? 1.04 : 1.0;

  if (limb === 'head') {
    const headGeo = new THREE.SphereGeometry(0.19 * scaleMult, 10, 8);
    const head = new THREE.Mesh(headGeo, skinMat);
    const stumpGeo = new THREE.CylinderGeometry(0.095 * scaleMult, 0.11 * scaleMult, 0.09 * scaleMult, 8);
    const stump = new THREE.Mesh(stumpGeo, fleshMat);
    stump.position.y = -0.15 * scaleMult;
    const boneTipGeo = new THREE.CylinderGeometry(0.03 * scaleMult, 0.035 * scaleMult, 0.07 * scaleMult, 6);
    const boneTip = new THREE.Mesh(boneTipGeo, boneMat);
    boneTip.position.y = -0.19 * scaleMult;
    group.add(head, stump, boneTip);
  } else if (limb === 'leftShoulder' || limb === 'rightShoulder') {
    const upperGeo = new THREE.CylinderGeometry(0.072 * scaleMult, 0.06 * scaleMult, 0.28 * scaleMult, 7);
    const upper = new THREE.Mesh(upperGeo, skinMat);
    const stumpTopGeo = new THREE.SphereGeometry(0.075 * scaleMult, 7, 6);
    const stumpTop = new THREE.Mesh(stumpTopGeo, fleshMat);
    stumpTop.position.y = 0.14 * scaleMult;
    const boneTopGeo = new THREE.CylinderGeometry(0.022 * scaleMult, 0.025 * scaleMult, 0.065 * scaleMult, 6);
    const boneTop = new THREE.Mesh(boneTopGeo, boneMat);
    boneTop.position.y = 0.18 * scaleMult;
    group.add(upper, stumpTop, boneTop);

    if (distalAlreadyGone) {
      const stumpBot = new THREE.Mesh(stumpTopGeo, fleshMat);
      stumpBot.scale.setScalar(0.84);
      stumpBot.position.y = -0.14 * scaleMult;
      group.add(stumpBot);
    } else {
      const foreGeo = new THREE.CylinderGeometry(0.056 * scaleMult, 0.044 * scaleMult, 0.26 * scaleMult, 7);
      const fore = new THREE.Mesh(foreGeo, skinMat);
      fore.position.set(0, -0.25 * scaleMult, 0.05 * scaleMult);
      fore.rotation.x = 0.28;
      const handGeo = new THREE.BoxGeometry(0.078 * scaleMult, 0.095 * scaleMult, 0.072 * scaleMult);
      const hand = new THREE.Mesh(handGeo, skinMat);
      hand.position.set(0, -0.39 * scaleMult, 0.09 * scaleMult);
      group.add(fore, hand);
    }
  } else if (limb === 'leftElbow' || limb === 'rightElbow') {
    const foreGeo = new THREE.CylinderGeometry(0.058 * scaleMult, 0.044 * scaleMult, 0.28 * scaleMult, 7);
    const fore = new THREE.Mesh(foreGeo, skinMat);
    const handGeo = new THREE.BoxGeometry(0.078 * scaleMult, 0.095 * scaleMult, 0.072 * scaleMult);
    const hand = new THREE.Mesh(handGeo, skinMat);
    hand.position.y = -0.17 * scaleMult;
    const stumpGeo = new THREE.SphereGeometry(0.062 * scaleMult, 7, 6);
    const stump = new THREE.Mesh(stumpGeo, fleshMat);
    stump.position.y = 0.14 * scaleMult;
    const boneTipGeo = new THREE.CylinderGeometry(0.02 * scaleMult, 0.024 * scaleMult, 0.065 * scaleMult, 6);
    const boneTip = new THREE.Mesh(boneTipGeo, boneMat);
    boneTip.position.y = 0.18 * scaleMult;
    group.add(fore, hand, stump, boneTip);
  } else if (limb === 'leftHip' || limb === 'rightHip') {
    const thighGeo = new THREE.CylinderGeometry(0.095 * scaleMult, 0.08 * scaleMult, 0.34 * scaleMult, 7);
    const thigh = new THREE.Mesh(thighGeo, clothMat);
    const stumpTopGeo = new THREE.SphereGeometry(0.096 * scaleMult, 7, 6);
    const stumpTop = new THREE.Mesh(stumpTopGeo, fleshMat);
    stumpTop.position.y = 0.17 * scaleMult;
    const boneTopGeo = new THREE.CylinderGeometry(0.028 * scaleMult, 0.032 * scaleMult, 0.07 * scaleMult, 6);
    const boneTop = new THREE.Mesh(boneTopGeo, boneMat);
    boneTop.position.y = 0.21 * scaleMult;
    group.add(thigh, stumpTop, boneTop);

    if (distalAlreadyGone) {
      const stumpBot = new THREE.Mesh(stumpTopGeo, fleshMat);
      stumpBot.scale.setScalar(0.84);
      stumpBot.position.y = -0.17 * scaleMult;
      group.add(stumpBot);
    } else {
      const shinGeo = new THREE.CylinderGeometry(0.078 * scaleMult, 0.064 * scaleMult, 0.34 * scaleMult, 7);
      const shin = new THREE.Mesh(shinGeo, clothMat);
      shin.position.set(0, -0.32 * scaleMult, -0.04 * scaleMult);
      shin.rotation.x = -0.18;
      const footGeo = new THREE.BoxGeometry(0.13 * scaleMult, 0.092 * scaleMult, 0.21 * scaleMult);
      const foot = new THREE.Mesh(footGeo, clothMat);
      foot.position.set(0, -0.49 * scaleMult, -0.02 * scaleMult);
      group.add(shin, foot);
    }
  } else {
    // leftKnee / rightKnee
    const shinGeo = new THREE.CylinderGeometry(0.08 * scaleMult, 0.064 * scaleMult, 0.34 * scaleMult, 7);
    const shin = new THREE.Mesh(shinGeo, clothMat);
    const footGeo = new THREE.BoxGeometry(0.13 * scaleMult, 0.092 * scaleMult, 0.21 * scaleMult);
    const foot = new THREE.Mesh(footGeo, clothMat);
    foot.position.set(0, -0.18 * scaleMult, 0.045 * scaleMult);
    const stumpGeo = new THREE.SphereGeometry(0.084 * scaleMult, 7, 6);
    const stump = new THREE.Mesh(stumpGeo, fleshMat);
    stump.position.y = 0.17 * scaleMult;
    const boneTipGeo = new THREE.CylinderGeometry(0.026 * scaleMult, 0.028 * scaleMult, 0.068 * scaleMult, 6);
    const boneTip = new THREE.Mesh(boneTipGeo, boneMat);
    boneTip.position.y = 0.21 * scaleMult;
    group.add(shin, foot, stump, boneTip);
  }

  severedLimbPrototypeCache.set(cacheKey, group);
  return {
    group: group.clone(true),
    dispose: () => {},
  };
}

export interface HarvestNode {
  id: number;
  kind: 'timber' | 'sunstone';
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  respawnTimer: number;
  group: THREE.Group;
  baseHolder: THREE.Group;
  visualHolder: THREE.Group;
  hitFlash: number;
}

export interface WorldCollider {
  x: number;
  z: number;
  radius: number;
  height: number;
  source?: 'ruin' | 'tree' | 'lamp' | 'prop';
}

export interface WorldBoxCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  maxY: number;
  blocksSight?: boolean;
  source?: 'ruin' | 'tree' | 'lamp' | 'prop';
}

export interface LooseRockSeed {
  x: number;
  z: number;
  sx: number;
  sy: number;
  sz: number;
  rotY: number;
  radius: number;
  colorHex: number;
}

export interface WorldTrashSpot {
  id: string;
  x: number;
  z: number;
  searchedCooldown: number;
  indicatorMat: THREE.MeshBasicMaterial;
  group: THREE.Group;
}

export interface WorldEnvironment {
  harvestNodes: HarvestNode[];
  trashSpots: WorldTrashSpot[];
  baseColliders: WorldCollider[];
  colliders: WorldCollider[];
  baseBoxColliders: WorldBoxCollider[];
  boxColliders: WorldBoxCollider[];
  looseRockInst: THREE.InstancedMesh;
  looseRockSeeds: LooseRockSeed[];
  terrain: THREE.Mesh;
  terrainMat: THREE.MeshStandardMaterial;
  plazaMat: THREE.MeshStandardMaterial;
  pillarMat: THREE.MeshStandardMaterial;
  barrierMat: THREE.MeshStandardMaterial;
  rockMat: THREE.MeshStandardMaterial;
  trunkMat: THREE.MeshStandardMaterial;
  crateMat: THREE.MeshStandardMaterial;
  skyDome: THREE.Mesh;
  skyMat: THREE.ShaderMaterial;
  sunDisc: THREE.Mesh;
  sunHalo: THREE.Mesh;
  moonMesh: THREE.Mesh;
  moonHalo: THREE.Mesh;
  stars: THREE.Points;
  starMat: THREE.ShaderMaterial;
  lampGlowMat: THREE.MeshStandardMaterial;
  lampPoints: THREE.PointLight[];
  nightGlowMats: { mat: THREE.MeshStandardMaterial; dayIntensity: number; nightIntensity: number }[];
  ruinObjects: THREE.Object3D[];
  forestObjects: THREE.Object3D[];
  citySurfaceObjects: THREE.Object3D[];
  editorGrid: THREE.GridHelper;
  fastFood: FastFoodLandmark;
  windTimeUniform: { value: number };
  burningSpots: { x: number; y: number; z: number; radius: number }[];
  rebuildTerrainHeights: (newScale: number, preset?: MapPresetId) => void;
  applyObjectOverride: (targetId: WorldObjectOverrideId, template: CustomObjectTemplate | null) => void;
  updateColonBeacon: (unlocked: boolean, elapsed: number) => void;
  setExteriorVisible: (visible: boolean) => void;
  dispose: () => void;
}

export interface CustomPropTemplate {
  scene: THREE.Group;
  baseRadius: number;
  baseHeight: number;
  category: WorldPropCategory;
  dispose: () => void;
}

export async function parseGlbPropTemplate(
  buffer: ArrayBuffer,
  category: WorldPropCategory,
): Promise<CustomPropTemplate> {
  const parsed = await acquireParsedGlb(buffer, 'prop');
  try {
    const wrapper = new THREE.Group();
    const model = parsed.scene;
    wrapper.add(model);
    wrapper.updateMatrixWorld(true);

    const rawBox = new THREE.Box3().setFromObject(model);
    const rawSize = rawBox.getSize(new THREE.Vector3());
    const maxDim = Math.max(rawSize.x, rawSize.y, rawSize.z, 0.05);

    const targetSize =
      category === 'building'
        ? 7.2
        : category === 'vehicle'
          ? 4.4
          : category === 'tank'
            ? 3.2
            : category === 'tree'
              ? 5.6
              : category === 'foliage'
                ? 1.8
                : 2.2;

    const scaleFactor = THREE.MathUtils.clamp(targetSize / maxDim, 0.01, 80);
    model.scale.multiplyScalar(scaleFactor);
    wrapper.updateMatrixWorld(true);

    const scaledBox = new THREE.Box3().setFromObject(wrapper);
    const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
    const scaledSize = scaledBox.getSize(new THREE.Vector3());

    // Pivot squarely at bottom-center (0, 0, 0) so the prop sits flush on terrain
    model.position.x -= scaledCenter.x;
    model.position.y -= scaledBox.min.y;
    model.position.z -= scaledCenter.z;

    freezeObjectStaticHierarchy(model);

    const shouldCastShadow = category !== 'foliage';
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = shouldCastShadow;
        mesh.receiveShadow = true;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => {
          if (m && 'envMapIntensity' in m) {
            (m as THREE.MeshStandardMaterial).envMapIntensity = 1.05;
          }
        });
      }
    });

    const baseRadius = Math.max(0.45, Math.min(scaledSize.x, scaledSize.z) * 0.45);
    const baseHeight = Math.max(0.6, scaledSize.y);

    return {
      scene: wrapper,
      baseRadius,
      baseHeight,
      category,
      dispose: () => {
        parsed.release();
      },
    };
  } catch (err) {
    parsed.release();
    throw err;
  }
}

export function instantiatePropFromTemplate(template: CustomPropTemplate): THREE.Group {
  return template.scene.clone(true);
}

const proceduralLootPrototypeCache = new Map<LootKind, THREE.Group>();

export function buildLootMeshGroup(
  kind: LootKind,
  customTemplate?: CustomObjectTemplate | null,
  equipmentFallback?: CustomEquipmentTemplate | null,
): {
  group: THREE.Group;
  dispose: () => void;
} {
  if (customTemplate) {
    const group = new THREE.Group();
    const clone = customTemplate.scene.clone(true);
    clone.position.y -= Math.min(0.24, customTemplate.size.y * 0.42);
    group.add(clone);
    return {
      group,
      dispose: () => {
        // Shared template geometries/materials/textures are owned by CustomObjectTemplate
        group.remove(clone);
      },
    };
  }

  if (equipmentFallback) {
    const group = new THREE.Group();
    const clone = equipmentFallback.scene.clone(true);
    if (kind === 'helmet') {
      clone.scale.setScalar(1.28);
      clone.position.y -= 0.04;
    } else if (kind === 'vest') {
      clone.scale.setScalar(1.15);
    } else if (kind === 'stick' || kind === 'baton') {
      clone.rotation.set(0, 0, Math.PI / 2 - 0.18);
      clone.position.set(-0.22, -0.02, 0);
    } else if (kind === 'bow') {
      clone.rotation.set(Math.PI / 2, 0.3, Math.PI / 2);
      clone.scale.setScalar(0.86);
    }
    group.add(clone);
    return {
      group,
      dispose: () => {
        group.remove(clone);
      },
    };
  }

  const cached = proceduralLootPrototypeCache.get(kind);
  if (cached) {
    return {
      group: cached.clone(true),
      dispose: () => {},
    };
  }

  const group = new THREE.Group();

  if (kind === 'backpack') {
    const packMat = new THREE.MeshStandardMaterial({
      color: 0x3b4d34,
      roughness: 0.78,
      metalness: 0.08,
    });
    const trimMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      emissive: new THREE.Color(0xf59e0b),
      emissiveIntensity: 0.55,
      roughness: 0.4,
      metalness: 0.45,
    });
    const strapMat = new THREE.MeshStandardMaterial({
      color: 0x1e242b,
      roughness: 0.72,
      metalness: 0.12,
    });
    const mainGeo = new THREE.BoxGeometry(0.42, 0.52, 0.24);
    const pocketGeo = new THREE.BoxGeometry(0.32, 0.24, 0.1);
    const flapGeo = new THREE.BoxGeometry(0.44, 0.14, 0.26);
    const strapGeo = new THREE.BoxGeometry(0.08, 0.46, 0.05);
    const buckleGeo = new THREE.BoxGeometry(0.12, 0.06, 0.04);

    const main = new THREE.Mesh(mainGeo, packMat);
    const pocket = new THREE.Mesh(pocketGeo, strapMat);
    pocket.position.set(0, -0.09, 0.15);
    const flap = new THREE.Mesh(flapGeo, packMat);
    flap.position.set(0, 0.23, 0.02);
    const strapL = new THREE.Mesh(strapGeo, strapMat);
    strapL.position.set(-0.13, 0.02, -0.14);
    const strapR = new THREE.Mesh(strapGeo, strapMat);
    strapR.position.set(0.13, 0.02, -0.14);
    const buckle = new THREE.Mesh(buckleGeo, trimMat);
    buckle.position.set(0, 0.08, 0.18);

    group.add(main, pocket, flap, strapL, strapR, buckle);
  } else if (kind === 'molotov') {
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      emissive: new THREE.Color(0x166534),
      emissiveIntensity: 0.28,
      roughness: 0.18,
      metalness: 0.25,
      transparent: true,
      opacity: 0.9,
    });
    const fuelMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: new THREE.Color(0xea580c),
      emissiveIntensity: 0.75,
      roughness: 0.3,
    });
    const ragMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      roughness: 0.88,
    });
    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0xff8c1a,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const sparkCoreMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const bodyGeo = new THREE.CylinderGeometry(0.11, 0.12, 0.28, 10);
    const neckGeo = new THREE.CylinderGeometry(0.042, 0.095, 0.16, 10);
    const fuelGeo = new THREE.CylinderGeometry(0.096, 0.105, 0.17, 10);
    const ragGeo = new THREE.BoxGeometry(0.075, 0.14, 0.075);
    const flameGeoA = new THREE.PlaneGeometry(0.085, 0.15, 2, 4);
    flameGeoA.translate(0, 0.07, 0);
    const flameGeoB = new THREE.PlaneGeometry(0.065, 0.115, 2, 3);
    flameGeoB.translate(0, 0.052, 0);

    const body = new THREE.Mesh(bodyGeo, glassMat);
    body.position.y = -0.04;
    const fuel = new THREE.Mesh(fuelGeo, fuelMat);
    fuel.position.y = -0.08;
    const neck = new THREE.Mesh(neckGeo, glassMat);
    neck.position.y = 0.18;
    const rag = new THREE.Mesh(ragGeo, ragMat);
    rag.position.set(0.02, 0.29, 0);
    rag.rotation.z = -0.25;

    const sparkA = new THREE.Mesh(flameGeoA, sparkMat);
    sparkA.position.set(0.036, 0.34, 0);
    sparkA.rotation.set(0.08, 0.2, -0.18);
    const sparkB = new THREE.Mesh(flameGeoB, sparkCoreMat);
    sparkB.position.set(0.045, 0.34, 0.01);
    sparkB.rotation.set(-0.06, 1.35, 0.12);

    group.add(body, fuel, neck, rag, sparkA, sparkB);
  } else if (kind === 'nail_bomb') {
    const casingMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.48,
      metalness: 0.72,
    });
    const bandMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      emissive: new THREE.Color(0xef4444),
      emissiveIntensity: 0.65,
      roughness: 0.4,
    });
    const nailMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.25,
      metalness: 0.9,
    });

    const bodyGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.3, 10);
    const bandGeo = new THREE.CylinderGeometry(0.126, 0.126, 0.09, 10);
    const capGeo = new THREE.CylinderGeometry(0.05, 0.07, 0.08, 8);
    const nailGeo = new THREE.CylinderGeometry(0.01, 0.002, 0.13, 5);

    const body = new THREE.Mesh(bodyGeo, casingMat);
    const band = new THREE.Mesh(bandGeo, bandMat);
    const cap = new THREE.Mesh(capGeo, bandMat);
    cap.position.y = 0.18;
    group.add(body, band, cap);

    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const nail = new THREE.Mesh(nailGeo, nailMat);
      nail.position.set(Math.cos(a) * 0.14, (i % 2 === 0 ? 0.05 : -0.05), Math.sin(a) * 0.14);
      nail.rotation.z = -Math.cos(a) * (Math.PI / 2);
      nail.rotation.x = Math.sin(a) * (Math.PI / 2);
      group.add(nail);
    }
  } else if (kind === 'bottle') {
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: new THREE.Color(0x14532d),
      emissiveIntensity: 0.32,
      roughness: 0.14,
      metalness: 0.18,
      transparent: true,
      opacity: 0.86,
    });
    const labelMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      roughness: 0.72,
    });
    const corkMat = new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.84,
    });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.112, 0.27, 12), glassMat);
    body.position.y = -0.05;
    const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.105, 0.11, 12), glassMat);
    shoulder.position.y = 0.14;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.042, 0.11, 10), glassMat);
    neck.position.y = 0.24;
    const label = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.12, 12), labelMat);
    label.position.y = -0.04;
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.028, 0.055, 8), corkMat);
    cork.position.y = 0.31;
    group.add(body, shoulder, neck, label, cork);
  } else if (kind === 'can') {
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      emissive: new THREE.Color(0x475569),
      emissiveIntensity: 0.22,
      roughness: 0.26,
      metalness: 0.86,
    });
    const bandMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: new THREE.Color(0x0369a1),
      emissiveIntensity: 0.32,
      roughness: 0.42,
      metalness: 0.45,
    });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.25, 14), metalMat);
    const label = new THREE.Mesh(new THREE.CylinderGeometry(0.118, 0.118, 0.14, 14), bandMat);
    const topRim = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.014, 6, 14), metalMat);
    topRim.rotation.x = Math.PI / 2;
    topRim.position.y = 0.125;
    const botRim = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.014, 6, 14), metalMat);
    botRim.rotation.x = Math.PI / 2;
    botRim.position.y = -0.125;
    const tab = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.012, 0.032), metalMat);
    tab.position.set(0.02, 0.132, 0);
    group.add(body, label, topRim, botRim, tab);
  } else if (kind === 'brick') {
    const clayMat = new THREE.MeshStandardMaterial({
      color: 0xb44c2e,
      emissive: new THREE.Color(0x7c2d12),
      emissiveIntensity: 0.24,
      roughness: 0.9,
      metalness: 0.06,
    });
    const mortarMat = new THREE.MeshStandardMaterial({
      color: 0xd6d3d1,
      roughness: 0.94,
    });
    const holeMat = new THREE.MeshStandardMaterial({
      color: 0x451a03,
      roughness: 0.95,
    });
    const brickBody = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.15, 0.18), clayMat);
    const mortarEdge = new THREE.Mesh(new THREE.BoxGeometry(0.348, 0.035, 0.186), mortarMat);
    mortarEdge.position.y = -0.055;
    group.add(brickBody, mortarEdge);
    const holeGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.03, 8);
    for (const hx of [-0.09, 0, 0.09]) {
      const hole = new THREE.Mesh(holeGeo, holeMat);
      hole.position.set(hx, 0.068, 0);
      group.add(hole);
    }
  } else if (kind === 'wood') {
    const barkMat = new THREE.MeshStandardMaterial({
      color: 0x78492a,
      roughness: 0.88,
      metalness: 0.04,
    });
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xd6a674,
      roughness: 0.72,
    });
    const logGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.44, 8);
    logGeo.rotateZ(Math.PI / 2);
    const endGeo = new THREE.CylinderGeometry(0.078, 0.078, 0.45, 8);
    endGeo.rotateZ(Math.PI / 2);

    const l1 = new THREE.Mesh(logGeo, barkMat);
    l1.position.set(0, -0.05, 0.07);
    const l2 = new THREE.Mesh(logGeo, barkMat);
    l2.position.set(0, -0.05, -0.07);
    const l3 = new THREE.Mesh(logGeo, barkMat);
    l3.position.set(0, 0.09, 0);
    const c3 = new THREE.Mesh(endGeo, coreMat);
    c3.position.copy(l3.position);
    group.add(l1, l2, l3, c3);
  } else if (kind === 'ember') {
    const emberMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: new THREE.Color(0xf97316),
      emissiveIntensity: 1.45,
      roughness: 0.3,
    });
    const coreGeo = new THREE.OctahedronGeometry(0.18, 0);
    const shardGeo = new THREE.OctahedronGeometry(0.1, 0);
    const core = new THREE.Mesh(coreGeo, emberMat);
    const s1 = new THREE.Mesh(shardGeo, emberMat);
    s1.position.set(0.14, 0.08, 0.08);
    const s2 = new THREE.Mesh(shardGeo, emberMat);
    s2.position.set(-0.14, -0.06, -0.08);
    group.add(core, s1, s2);
  } else if (kind === 'bandage') {
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      emissive: new THREE.Color(0x94a3b8),
      emissiveIntensity: 0.25,
      roughness: 0.65,
    });
    const crossMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: new THREE.Color(0xdc2626),
      emissiveIntensity: 0.9,
      roughness: 0.35,
    });
    const rollGeo = new THREE.BoxGeometry(0.42, 0.2, 0.32);
    const barAGeo = new THREE.BoxGeometry(0.2, 0.22, 0.07);
    const barBGeo = new THREE.BoxGeometry(0.07, 0.22, 0.2);
    const roll = new THREE.Mesh(rollGeo, bodyMat);
    const barA = new THREE.Mesh(barAGeo, crossMat);
    const barB = new THREE.Mesh(barBGeo, crossMat);
    group.add(roll, barA, barB);
  } else if (kind === 'food') {
    const tinMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      emissive: new THREE.Color(0xb45309),
      emissiveIntensity: 0.35,
      roughness: 0.45,
      metalness: 0.55,
    });
    const labelMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      roughness: 0.6,
    });
    const tinGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.28, 12);
    const bandGeo = new THREE.CylinderGeometry(0.186, 0.186, 0.15, 12);
    const tin = new THREE.Mesh(tinGeo, tinMat);
    const band = new THREE.Mesh(bandGeo, labelMat);
    group.add(tin, band);
  } else if (kind === 'fal_ammo') {
    const boxMat = new THREE.MeshStandardMaterial({
      color: 0x365314,
      emissive: new THREE.Color(0x4d7c0f),
      emissiveIntensity: 0.35,
      roughness: 0.55,
      metalness: 0.45,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: new THREE.Color(0xd97706),
      emissiveIntensity: 0.9,
      roughness: 0.28,
      metalness: 0.85,
    });
    const caseGeo = new THREE.BoxGeometry(0.46, 0.24, 0.28);
    const stripGeo = new THREE.BoxGeometry(0.32, 0.08, 0.12);
    const box = new THREE.Mesh(caseGeo, boxMat);
    const strip = new THREE.Mesh(stripGeo, brassMat);
    strip.position.y = 0.14;
    group.add(box, strip);
  } else if (kind === 'chemicals') {
    const flaskMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: new THREE.Color(0x0891b2),
      emissiveIntensity: 0.72,
      roughness: 0.2,
      metalness: 0.15,
      transparent: true,
      opacity: 0.9,
    });
    const amberMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      emissive: new THREE.Color(0xb45309),
      emissiveIntensity: 0.35,
      roughness: 0.28,
    });
    const capMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
    const flask = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.13, 0.28, 10), flaskMat);
    flask.position.set(-0.07, 0.0, 0);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.045, 0.12, 8), capMat);
    neck.position.set(-0.07, 0.18, 0);
    const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.085, 0.24, 10), amberMat);
    bottle.position.set(0.11, -0.02, 0.04);
    const cap2 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 8), capMat);
    cap2.position.set(0.11, 0.12, 0.04);
    group.add(flask, neck, bottle, cap2);
  } else if (kind === 'scrap') {
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.38,
      metalness: 0.82,
    });
    const rustMat = new THREE.MeshStandardMaterial({
      color: 0x9a3412,
      emissive: new THREE.Color(0x7c2d12),
      emissiveIntensity: 0.25,
      roughness: 0.65,
      metalness: 0.45,
    });
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.26), rustMat);
    const gear = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.032, 8, 14), metalMat);
    gear.rotation.x = Math.PI / 2;
    gear.position.set(0.04, 0.1, 0);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.34, 6), metalMat);
    rod.rotation.z = Math.PI / 2.2;
    rod.position.set(-0.04, 0.11, 0.05);
    group.add(box, gear, rod);
  } else if (kind === 'powder') {
    const canMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      emissive: new THREE.Color(0xdc2626),
      emissiveIntensity: 0.38,
      roughness: 0.45,
      metalness: 0.48,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: new THREE.Color(0xd97706),
      emissiveIntensity: 0.55,
      roughness: 0.32,
      metalness: 0.72,
    });
    const tin = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.28, 10), canMat);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.138, 0.138, 0.08, 10), goldMat);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.06, 10), goldMat);
    lid.position.y = 0.16;
    group.add(tin, band, lid);
  } else if (kind === 'stick') {
    const barkMat = new THREE.MeshStandardMaterial({
      color: 0x7c4a24,
      emissive: new THREE.Color(0x78350f),
      emissiveIntensity: 0.25,
      roughness: 0.86,
    });
    const tipMat = new THREE.MeshStandardMaterial({
      color: 0xd9b382,
      emissive: new THREE.Color(0xb45309),
      emissiveIntensity: 0.22,
      roughness: 0.72,
    });
    const ribbonMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: new THREE.Color(0xd97706),
      emissiveIntensity: 0.75,
      roughness: 0.4,
    });
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.052, 0.92, 8), barkMat);
    shaft.rotation.z = Math.PI / 2 - 0.18;
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.036, 0.18, 8), tipMat);
    tip.position.set(0.5, 0.09, 0);
    tip.rotation.z = Math.PI / 2 - 0.18;
    const tape = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.054, 0.14, 8), ribbonMat);
    tape.position.set(-0.24, -0.04, 0);
    tape.rotation.z = Math.PI / 2 - 0.18;
    group.add(shaft, tip, tape);
  } else if (kind === 'baton') {
    const batonInst = buildBatonWeaponInstance();
    batonInst.group.scale.setScalar(1.18);
    batonInst.group.rotation.set(0.25, 0.4, Math.PI / 2 - 0.22);
    batonInst.group.position.set(0.24, -0.02, 0);
    const glowRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.06, 0.012, 6, 14),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: new THREE.Color(0x0284c7),
        emissiveIntensity: 0.85,
      }),
    );
    glowRing.rotation.y = Math.PI / 2;
    glowRing.position.set(-0.08, 0.05, 0);
    group.add(batonInst.group, glowRing);
  } else if (kind === 'helmet') {
    const kevlarMat = new THREE.MeshStandardMaterial({
      color: 0x2f3e28,
      emissive: new THREE.Color(0x14532d),
      emissiveIntensity: 0.28,
      roughness: 0.55,
      metalness: 0.3,
    });
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: new THREE.Color(0x0284c7),
      emissiveIntensity: 0.65,
      roughness: 0.35,
      metalness: 0.6,
    });
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62),
      kevlarMat,
    );
    dome.position.y = -0.04;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.275, 0.026, 6, 14), rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = -0.09;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.14), kevlarMat);
    visor.position.set(0, -0.06, 0.25);
    group.add(dome, rim, visor);
  } else if (kind === 'vest') {
    const vestMat = new THREE.MeshStandardMaterial({
      color: 0x2f3e28,
      emissive: new THREE.Color(0x166534),
      emissiveIntensity: 0.25,
      roughness: 0.58,
      metalness: 0.28,
    });
    const plateMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      emissive: new THREE.Color(0x0ea5e9),
      emissiveIntensity: 0.45,
      roughness: 0.4,
      metalness: 0.6,
    });
    const vestBody = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.22), vestMat);
    const frontPlate = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.05), plateMat);
    frontPlate.position.z = 0.115;
    const backPlate = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.05), plateMat);
    backPlate.position.z = -0.115;
    group.add(vestBody, frontPlate, backPlate);
  } else if (kind === 'bow') {
    const bowInst = buildBowWeaponInstance();
    bowInst.group.scale.setScalar(0.86);
    bowInst.group.rotation.set(Math.PI / 2, 0.3, Math.PI / 2);
    bowInst.nockedArrow.visible = true;
    group.add(bowInst.group);
  } else if (kind === 'arrows') {
    const quiverMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      emissive: new THREE.Color(0x451a03),
      emissiveIntensity: 0.25,
      roughness: 0.75,
    });
    const shaftMat = new THREE.MeshStandardMaterial({ color: 0xe7cba9, roughness: 0.65 });
    const fletchMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: new THREE.Color(0xdc2626),
      emissiveIntensity: 0.65,
      roughness: 0.45,
    });
    const quiver = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.075, 0.44, 10), quiverMat);
    quiver.rotation.z = 0.28;
    group.add(quiver);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const arr = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.56, 6), shaftMat);
      arr.position.set(Math.cos(a) * 0.038 - 0.03, 0.08, Math.sin(a) * 0.038);
      arr.rotation.z = 0.28;
      const fl = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.085, 0.014), fletchMat);
      fl.position.set(Math.cos(a) * 0.038 - 0.09, 0.32, Math.sin(a) * 0.038);
      fl.rotation.z = 0.28;
      group.add(arr, fl);
    }
  } else if (kind === 'pistol') {
    const pistolInst = buildDefaultPistolInstance();
    pistolInst.group.scale.setScalar(1.45);
    pistolInst.group.rotation.set(0, Math.PI / 4, Math.PI / 8);
    pistolInst.group.position.set(0, 0.04, -0.14);
    group.add(pistolInst.group);
  } else if (kind === 'rifle') {
    const rifleInst = buildDefaultRifleInstance();
    rifleInst.group.scale.setScalar(1.1);
    rifleInst.group.rotation.set(0.18, Math.PI / 5, 0.1);
    rifleInst.group.position.set(-0.08, 0.02, -0.22);
    group.add(rifleInst.group);
  } else {
    // pistol_ammo
    const boxMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a8a,
      emissive: new THREE.Color(0x2563eb),
      emissiveIntensity: 0.45,
      roughness: 0.45,
      metalness: 0.4,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: new THREE.Color(0xeab308),
      emissiveIntensity: 0.85,
      roughness: 0.28,
      metalness: 0.85,
    });
    const caseGeo = new THREE.BoxGeometry(0.34, 0.18, 0.24);
    const trimGeo = new THREE.BoxGeometry(0.24, 0.06, 0.14);
    const box = new THREE.Mesh(caseGeo, boxMat);
    const trim = new THREE.Mesh(trimGeo, brassMat);
    trim.position.y = 0.11;
    group.add(box, trim);
  }

  proceduralLootPrototypeCache.set(kind, group);
  return {
    group: group.clone(true),
    dispose: () => {},
  };
}

export interface DecoyRatVisuals {
  group: THREE.Group;
  headPivot: THREE.Group;
  tailPivot: THREE.Group;
  chapitasPivot: THREE.Group;
  legPivots: THREE.Group[];
  dispose: () => void;
}

export function buildDecoyRatMesh(): DecoyRatVisuals {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x6b5b4d,
    roughness: 0.88,
    metalness: 0.04,
  });
  const bellyMat = new THREE.MeshStandardMaterial({
    color: 0x9b8b7c,
    roughness: 0.9,
  });
  const earTailMat = new THREE.MeshStandardMaterial({
    color: 0xd49b94,
    roughness: 0.72,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x0b0b0e,
    roughness: 0.2,
    metalness: 0.3,
  });
  const twineMat = new THREE.MeshStandardMaterial({
    color: 0xc29b61,
    roughness: 0.92,
  });
  const capMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.22,
    metalness: 0.92,
    emissive: new THREE.Color(0x94a3b8),
    emissiveIntensity: 0.25,
  });

  const bodyGeo = new THREE.SphereGeometry(0.11, 10, 8);
  const headGeo = new THREE.SphereGeometry(0.068, 9, 8);
  const snoutGeo = new THREE.ConeGeometry(0.038, 0.08, 7);
  snoutGeo.rotateX(Math.PI / 2);
  const noseGeo = new THREE.SphereGeometry(0.015, 6, 6);
  const earGeo = new THREE.SphereGeometry(0.028, 7, 6);
  const eyeGeo = new THREE.SphereGeometry(0.012, 6, 6);
  const tailGeo = new THREE.CylinderGeometry(0.014, 0.006, 0.28, 6);
  tailGeo.rotateX(Math.PI / 2);
  tailGeo.translate(0, 0, -0.14);
  const legGeo = new THREE.BoxGeometry(0.024, 0.055, 0.032);
  legGeo.translate(0, -0.026, 0);
  const harnessGeo = new THREE.TorusGeometry(0.088, 0.0085, 6, 14);
  const capGeo = new THREE.CylinderGeometry(0.028, 0.026, 0.01, 10);

  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.scale.set(0.86, 0.78, 1.38);
  body.position.set(0, 0.085, 0);
  body.castShadow = true;
  group.add(body);

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.098, 0.13);
  group.add(headPivot);

  const head = new THREE.Mesh(headGeo, bodyMat);
  head.scale.set(0.9, 0.84, 1.05);
  headPivot.add(head);

  const snout = new THREE.Mesh(snoutGeo, bellyMat);
  snout.position.set(0, -0.005, 0.068);
  headPivot.add(snout);

  const nose = new THREE.Mesh(noseGeo, earTailMat);
  nose.position.set(0, -0.004, 0.106);
  headPivot.add(nose);

  [-1, 1].forEach((s) => {
    const ear = new THREE.Mesh(earGeo, earTailMat);
    ear.scale.set(0.42, 1.0, 0.92);
    ear.position.set(s * 0.044, 0.05, -0.012);
    ear.rotation.z = -s * 0.35;
    headPivot.add(ear);

    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(s * 0.034, 0.014, 0.044);
    headPivot.add(eye);
  });

  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.078, -0.145);
  tailPivot.rotation.x = 0.22;
  group.add(tailPivot);
  const tail = new THREE.Mesh(tailGeo, earTailMat);
  tailPivot.add(tail);

  const legPositions: [number, number, number][] = [
    [-0.058, 0.06, 0.075],
    [0.058, 0.06, 0.075],
    [-0.062, 0.062, -0.075],
    [0.062, 0.062, -0.075],
  ];
  const legPivots: THREE.Group[] = [];
  legPositions.forEach(([lx, ly, lz]) => {
    const lp = new THREE.Group();
    lp.position.set(lx, ly, lz);
    const lm = new THREE.Mesh(legGeo, earTailMat);
    lp.add(lm);
    group.add(lp);
    legPivots.push(lp);
  });

  // Twine belt around the rat + gleaming bottle caps (chapitas)
  const harness = new THREE.Mesh(harnessGeo, twineMat);
  harness.position.set(0, 0.088, -0.015);
  harness.scale.set(0.95, 0.85, 1.0);
  group.add(harness);

  const chapitasPivot = new THREE.Group();
  chapitasPivot.position.set(0, 0.082, -0.025);
  group.add(chapitasPivot);

  [
    { x: -0.095, y: -0.025, z: -0.01, rz: 0.45 },
    { x: 0.095, y: -0.022, z: 0.01, rz: -0.45 },
    { x: 0.0, y: 0.082, z: -0.025, rz: 0.15 },
  ].forEach((c) => {
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(c.x, c.y, c.z);
    cap.rotation.set(Math.PI * 0.42, 0, c.rz);
    chapitasPivot.add(cap);
  });

  return {
    group,
    headPivot,
    tailPivot,
    chapitasPivot,
    legPivots,
    dispose: () => {
      [
        bodyGeo,
        headGeo,
        snoutGeo,
        noseGeo,
        earGeo,
        eyeGeo,
        tailGeo,
        legGeo,
        harnessGeo,
        capGeo,
      ].forEach((g) => g.dispose());
      [bodyMat, bellyMat, earTailMat, eyeMat, twineMat, capMat].forEach((m) => m.dispose());
    },
  };
}

export function buildThrownThrowableMesh(
  kind: ThrowableKind,
  customTemplate?: CustomObjectTemplate | null,
): { group: THREE.Group; dispose: () => void } {
  if (kind === 'decoy_rat') {
    const built = buildDecoyRatMesh();
    built.group.scale.setScalar(0.82);
    return {
      group: built.group,
      dispose: built.dispose,
    };
  }
  if (kind === 'grenade') {
    const group = new THREE.Group();
    const bodyGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.24, 10);
    const capGeo = new THREE.CylinderGeometry(0.06, 0.09, 0.07, 10);
    const coreGeo = new THREE.SphereGeometry(0.13, 10, 8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.4,
      metalness: 0.78,
    });
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: new THREE.Color(0xf97316),
      emissiveIntensity: 2.2,
      roughness: 0.2,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    const cap = new THREE.Mesh(capGeo, bodyMat);
    cap.position.y = 0.15;
    const core = new THREE.Mesh(coreGeo, glowMat);
    group.add(body, cap, core);
    return {
      group,
      dispose: () => {
        [bodyGeo, capGeo, coreGeo].forEach((g) => g.dispose());
        [bodyMat, glowMat].forEach((m) => m.dispose());
      },
    };
  }
  const built = buildLootMeshGroup(kind, customTemplate);
  const scale =
    customTemplate
      ? 0.65
      : kind === 'brick'
        ? 0.76
        : kind === 'can'
          ? 0.72
          : kind === 'bottle'
            ? 0.74
            : 0.72;
  built.group.scale.setScalar(scale);
  return built;
}

let sharedFireZoneRes: {
  scorchGeo: THREE.CircleGeometry;
  scorchMat: THREE.MeshBasicMaterial;
  ringGeos: Map<string, THREE.RingGeometry>;
  dispose: () => void;
} | null = null;

function getSharedFireZoneRes(radius: number) {
  if (!sharedFireZoneRes) {
    const scorchGeo = markShared(new THREE.CircleGeometry(1, 20));
    scorchGeo.rotateX(-Math.PI / 2);
    const scorchMat = markShared(
      new THREE.MeshBasicMaterial({
        color: 0x1c0f08,
        transparent: true,
        opacity: 0.56,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    );
    const ringGeos = new Map<string, THREE.RingGeometry>();
    sharedFireZoneRes = {
      scorchGeo,
      scorchMat,
      ringGeos,
      dispose: () => {
        scorchGeo.dispose();
        scorchMat.dispose();
        ringGeos.forEach((g) => g.dispose());
        ringGeos.clear();
      },
    };
  }
  const rKey = radius.toFixed(2);
  let ringGeo = sharedFireZoneRes.ringGeos.get(rKey);
  if (!ringGeo) {
    ringGeo = markShared(new THREE.RingGeometry(Math.max(0.1, radius - 0.11), radius, 24));
    ringGeo.rotateX(-Math.PI / 2);
    sharedFireZoneRes.ringGeos.set(rKey, ringGeo);
  }
  return { res: sharedFireZoneRes, ringGeo };
}

export function buildFireZoneVisuals(radius = 1.5, withLight = true): {
  group: THREE.Group;
  flameCluster: FlameCluster;
  ringMat: THREE.MeshBasicMaterial;
  pointLight: THREE.PointLight | null;
  dispose: () => void;
} {
  const group = new THREE.Group();
  const { res, ringGeo } = getSharedFireZoneRes(radius);

  const scorch = new THREE.Mesh(res.scorchGeo, res.scorchMat);
  scorch.scale.set(radius, 1, radius);
  scorch.position.y = 0.03;
  group.add(scorch);

  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xf97316,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = 0.05;
  group.add(ring);

  const flameCluster = buildFlameCluster({
    radius: Math.max(0.4, radius * 0.78),
    minHeight: 0.48,
    maxHeight: 1.24,
    minWidth: 0.34,
    maxWidth: 0.72,
    outerCount: 16,
    coreCount: 10,
    speed: 1.75,
    seedOffset: Math.round(radius * 13),
  });
  flameCluster.group.position.y = 0.02;
  group.add(flameCluster.group);

  let pointLight: THREE.PointLight | null = null;
  if (withLight) {
    pointLight = new THREE.PointLight(0xff6b1a, 5.2, 6.8, 1.5);
    pointLight.position.set(0, 0.85, 0);
    group.add(pointLight);
  }

  return {
    group,
    flameCluster,
    ringMat,
    pointLight,
    dispose: () => {
      flameCluster.dispose();
      ringMat.dispose();
      pointLight?.dispose();
    },
  };
}

export function disposeAllSharedModelPools(): void {
  sharedDefaultRifleRes?.dispose();
  sharedDefaultRifleRes = null;
  sharedDefaultPistolRes?.dispose();
  sharedDefaultPistolRes = null;
  sharedStickRes?.dispose();
  sharedStickRes = null;
  sharedBatonRes?.dispose();
  sharedBatonRes = null;
  sharedArmorRes?.dispose();
  sharedArmorRes = null;
  sharedBowRes?.dispose();
  sharedBowRes = null;
  sharedArrowProjRes?.dispose();
  sharedArrowProjRes = null;
  sharedFireZoneRes?.dispose();
  sharedFireZoneRes = null;

  sharedHpBarGeos.forEach(({ bg, fill }) => {
    bg.dispose();
    fill.dispose();
  });
  sharedHpBarGeos.clear();
  if (sharedHpBarMats) {
    sharedHpBarMats.bg.dispose();
    sharedHpBarMats.green.dispose();
    sharedHpBarMats.amber.dispose();
    sharedHpBarMats.red.dispose();
    sharedHpBarMats = null;
  }
  sharedHitFlashMat?.dispose();
  sharedHitFlashMat = null;
  sharedTelRingGeo?.dispose();
  sharedTelRingGeo = null;

  sharedZombieGeoPool.forEach((g) => g.dispose());
  sharedZombieGeoPool.clear();
  sharedZombieMatPool.forEach((m) => m.dispose());
  sharedZombieMatPool.clear();

  if (cachedBloodStumpRes) {
    cachedBloodStumpRes.geo.dispose();
    cachedBloodStumpRes.mat.dispose();
    cachedBloodStumpRes.boneGeo.dispose();
    cachedBloodStumpRes.boneMat.dispose();
    cachedBloodStumpRes = null;
  }
  if (cachedGoreChunkRes) {
    cachedGoreChunkRes.meatGeo.dispose();
    cachedGoreChunkRes.meatMat.dispose();
    cachedGoreChunkRes.boneGeo.dispose();
    cachedGoreChunkRes.boneMat.dispose();
    cachedGoreChunkRes = null;
  }
  severedLimbPrototypeCache.forEach((grp) => disposeObject3DResources(grp, false, true));
  severedLimbPrototypeCache.clear();
  if (severedLimbSharedMats) {
    Object.values(severedLimbSharedMats.skin).forEach((m) => m.dispose());
    Object.values(severedLimbSharedMats.cloth).forEach((m) => m.dispose());
    severedLimbSharedMats.flesh.dispose();
    severedLimbSharedMats.bone.dispose();
    severedLimbSharedMats = null;
  }
  proceduralLootPrototypeCache.forEach((grp) => disposeObject3DResources(grp, false, true));
  proceduralLootPrototypeCache.clear();
  if (cachedSlimySpitRes) {
    cachedSlimySpitRes.coreGeo.dispose();
    cachedSlimySpitRes.tailGeo.dispose();
    cachedSlimySpitRes.dropGeo.dispose();
    cachedSlimySpitRes.mucusMat.dispose();
    cachedSlimySpitRes.slimeMat.dispose();
    cachedSlimySpitRes = null;
  }

  sharedDracoLoader?.dispose();
  sharedDracoLoader = null;
  sharedGltfLoader = null;
  THREE.Cache.clear();
}

let cachedSlimySpitRes: {
  coreGeo: THREE.BufferGeometry;
  tailGeo: THREE.BufferGeometry;
  dropGeo: THREE.BufferGeometry;
  mucusMat: THREE.MeshPhysicalMaterial;
  slimeMat: THREE.MeshPhysicalMaterial;
} | null = null;

export function buildSlimySpitGlobMesh(): THREE.Group {
  if (!cachedSlimySpitRes) {
    // Sculpted glossy viscous teardrop acid droplet (+Z rounded bulb, -Z tapered tail)
    const coreGeo = createDropletLatheGeometry(0.145, 0.44, 10);
    coreGeo.rotateX(Math.PI / 2);

    const tailGeo = createDropletLatheGeometry(0.082, 0.34, 8);
    tailGeo.rotateX(Math.PI / 2);
    tailGeo.translate(0, 0, -0.26);

    const dropGeo = createDropletLatheGeometry(0.05, 0.16, 7);
    dropGeo.rotateX(Math.PI / 2);

    const mucusMat = new THREE.MeshPhysicalMaterial({
      color: 0x76b824,
      emissive: new THREE.Color(0x36680a),
      emissiveIntensity: 0.78,
      roughness: 0.06,
      metalness: 0.04,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      transparent: true,
      opacity: 0.92,
    });

    const slimeMat = new THREE.MeshPhysicalMaterial({
      color: 0xb7e44c,
      emissive: new THREE.Color(0x528812),
      emissiveIntensity: 0.68,
      roughness: 0.05,
      metalness: 0.02,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      transparent: true,
      opacity: 0.78,
    });

    cachedSlimySpitRes = { coreGeo, tailGeo, dropGeo, mucusMat, slimeMat };
  }

  const group = new THREE.Group();
  const core = new THREE.Mesh(cachedSlimySpitRes.coreGeo, cachedSlimySpitRes.mucusMat);
  const tail = new THREE.Mesh(cachedSlimySpitRes.tailGeo, cachedSlimySpitRes.slimeMat);
  const drop1 = new THREE.Mesh(cachedSlimySpitRes.dropGeo, cachedSlimySpitRes.slimeMat);
  drop1.position.set(0.055, -0.025, -0.34);
  drop1.scale.setScalar(0.88);
  const drop2 = new THREE.Mesh(cachedSlimySpitRes.dropGeo, cachedSlimySpitRes.slimeMat);
  drop2.position.set(-0.048, 0.032, -0.49);
  drop2.scale.setScalar(0.62);
  const drop3 = new THREE.Mesh(cachedSlimySpitRes.dropGeo, cachedSlimySpitRes.slimeMat);
  drop3.position.set(0.022, -0.015, -0.62);
  drop3.scale.setScalar(0.42);
  group.add(core, tail, drop1, drop2, drop3);
  return group;
}

export function buildNailShrapnelResources(): {
  geo: THREE.BufferGeometry;
  mat: THREE.MeshStandardMaterial;
} {
  const geo = new THREE.CylinderGeometry(0.016, 0.003, 0.24, 5);
  geo.rotateX(Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    emissive: new THREE.Color(0x94a3b8),
    emissiveIntensity: 0.45,
    roughness: 0.25,
    metalness: 0.92,
  });
  return { geo, mat };
}

function safeMergeGeometries(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const normalized: THREE.BufferGeometry[] = [];
  for (let i = 0; i < parts.length; i++) {
    const raw = parts[i];
    const g = raw.index ? raw.toNonIndexed() : raw.clone();
    if (!g.getAttribute('normal')) {
      g.computeVertexNormals();
    }
    if (!g.getAttribute('uv')) {
      const count = g.getAttribute('position').count;
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
    }
    normalized.push(g);
    raw.dispose();
  }
  const merged = BufferGeometryUtils.mergeGeometries(normalized, false);
  normalized.forEach((g) => g.dispose());
  if (!merged) {
    return new THREE.BoxGeometry(0.1, 0.1, 0.1);
  }
  return merged;
}

type WindFoliageMode = 'grass' | 'canopy' | 'ba_plant';

function createWindFoliageMaterial(
  params: THREE.MeshStandardMaterialParameters,
  windTimeUniform: { value: number },
  mode: WindFoliageMode,
): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial(params);
  mat.customProgramCacheKey = () => `ba_wind_foliage_${mode}_v1`;
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uWindTime = windTimeUniform;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
uniform float uWindTime;`,
    );

    const windSnippet =
      mode === 'grass'
        ? `#include <begin_vertex>
vec3 windOrigin = vec3(0.0);
#ifdef USE_INSTANCING
  windOrigin = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
#endif
vec3 windPos = windOrigin + transformed;
float grassH = max(0.0, transformed.y);
float grassBend = pow(grassH, 1.45);
float gustWave = sin(uWindTime * 1.85 + windPos.x * 0.22 + windPos.z * 0.16);
float tuftFlutter = sin(uWindTime * 4.4 + windPos.x * 1.45 - windPos.z * 1.25);
float crossGust = cos(uWindTime * 2.45 + windPos.z * 0.36 - windPos.x * 0.24);
float swayX = (0.12 + 0.15 * gustWave + 0.048 * tuftFlutter) * grassBend;
float swayZ = (0.06 + 0.085 * crossGust + 0.032 * tuftFlutter) * grassBend;
transformed.x += swayX;
transformed.z += swayZ;
transformed.y -= (swayX * swayX + swayZ * swayZ) * 0.26;`
        : mode === 'canopy'
          ? `#include <begin_vertex>
vec3 windOrigin = vec3(0.0);
#ifdef USE_INSTANCING
  windOrigin = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
#endif
float treePhase = windOrigin.x * 0.37 + windOrigin.z * 0.29;
float crownLift = max(0.0, transformed.y - 2.6) * 0.24;
float canopySwayX = sin(uWindTime * 1.35 + treePhase + transformed.y * 0.42) * (0.05 + crownLift * 0.065);
float canopySwayZ = cos(uWindTime * 1.12 + treePhase * 1.3 + transformed.x * 0.38) * (0.035 + crownLift * 0.048);
float leafRustle = sin(uWindTime * 4.6 + transformed.x * 3.1 + transformed.z * 2.7 + treePhase) * 0.026;
transformed.x += canopySwayX + leafRustle;
transformed.z += canopySwayZ + leafRustle * 0.72;
transformed.y += sin(uWindTime * 3.5 + transformed.x * 2.4 + treePhase) * 0.02;`
          : `#include <begin_vertex>
vec3 windOrigin = vec3(0.0);
#ifdef USE_INSTANCING
  windOrigin = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
#endif
float plantPhase = windOrigin.x * 2.1 + windOrigin.y * 2.5 + windOrigin.z * 1.9;
float tipWeight = clamp(length(transformed) * 2.6, 0.0, 1.25);
float leafSway = sin(uWindTime * 3.2 + plantPhase) * 0.038 + sin(uWindTime * 5.6 + plantPhase * 1.6) * 0.014;
transformed.x += leafSway * tipWeight;
transformed.z += cos(uWindTime * 2.7 + plantPhase) * 0.026 * tipWeight;`;

    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', windSnippet);
  };
  return mat;
}

function buildFineGrassTuftGeo(): THREE.BufferGeometry {
  const blades: THREE.BufferGeometry[] = [];
  const bladeCount = 11;
  for (let i = 0; i < bladeCount; i++) {
    const angle = (i / bladeCount) * Math.PI * 2 + Math.sin(i * 4.3) * 0.35;
    const h = 0.46 + ((i * 37) % 10) * 0.052;
    const rBot = 0.015 - (i % 3) * 0.002;
    const rTop = 0.0028;
    const blade = new THREE.CylinderGeometry(rTop, rBot, h, 4, 4);
    blade.translate(0, h * 0.5, 0);

    // Organic parabolic arch & slight outward splay along height segments
    const pos = blade.attributes.position as THREE.BufferAttribute;
    const archAmount = 0.08 + (i % 4) * 0.045;
    const rootRadius = i < 3 ? 0.018 : 0.038 + (i % 4) * 0.024;
    const rootX = Math.cos(angle) * rootRadius;
    const rootZ = Math.sin(angle) * rootRadius;
    const bendX = Math.cos(angle + Math.sin(i * 1.7) * 0.25);
    const bendZ = Math.sin(angle + Math.sin(i * 1.7) * 0.25);

    for (let v = 0; v < pos.count; v++) {
      const vx = pos.getX(v);
      const vy = pos.getY(v);
      const vz = pos.getZ(v);
      const t = THREE.MathUtils.clamp(vy / h, 0, 1);
      const curve = t * t * archAmount;
      pos.setXYZ(
        v,
        vx + rootX + bendX * curve,
        vy * (1 - t * t * 0.08),
        vz + rootZ + bendZ * curve,
      );
    }
    blade.computeVertexNormals();
    blades.push(blade);
  }
  return safeMergeGeometries(blades);
}

function buildBaPlantRosetteGeo(): THREE.BufferGeometry {
  const fronds: THREE.BufferGeometry[] = [];
  const frondCount = 9;
  for (let i = 0; i < frondCount; i++) {
    const az = (i / frondCount) * Math.PI * 2 + (i % 2) * 0.22;
    const len = i < 3 ? 0.2 : 0.25 + (i % 3) * 0.04;
    const leaf = new THREE.CylinderGeometry(0.004, 0.032, len, 4, 3);
    leaf.scale(1.05, 1.0, 0.34);
    leaf.translate(0, len * 0.5, 0);
    const tilt = i < 3 ? 0.24 : 0.62 + (i % 3) * 0.16;
    leaf.rotateX(tilt);
    leaf.rotateY(az);
    leaf.computeVertexNormals();
    fronds.push(leaf);
  }
  const core = new THREE.IcosahedronGeometry(0.055, 0);
  core.translate(0, 0.04, 0);
  core.computeVertexNormals();
  fronds.push(core);
  return safeMergeGeometries(fronds);
}

function buildDetailedTreeTrunkGeo(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  // Main gnarled bark trunk
  const main = new THREE.CylinderGeometry(0.21, 0.41, 3.5, 8, 2);
  main.translate(0, 1.75, 0);
  parts.push(main);

  // Flared root buttresses gripping the planter soil
  for (let r = 0; r < 4; r++) {
    const ang = (r / 4) * Math.PI * 2 + 0.35;
    const root = new THREE.CylinderGeometry(0.07, 0.21, 1.05, 5);
    root.translate(0, 0.52, 0);
    root.rotateZ(-0.56);
    root.rotateY(ang);
    root.translate(Math.cos(ang) * 0.14, 0, Math.sin(ang) * 0.14);
    parts.push(root);
  }

  // Forked upper primary & secondary branches spreading into the canopy
  const limbs = [
    { az: 0.2, tilt: 0.52, len: 2.25, yBase: 2.65, rBot: 0.16, rTop: 0.055 },
    { az: 1.55, tilt: 0.58, len: 2.4, yBase: 2.8, rBot: 0.15, rTop: 0.05 },
    { az: 2.85, tilt: 0.48, len: 2.15, yBase: 2.7, rBot: 0.14, rTop: 0.05 },
    { az: 4.15, tilt: 0.62, len: 2.35, yBase: 2.85, rBot: 0.15, rTop: 0.05 },
    { az: 5.35, tilt: 0.44, len: 2.05, yBase: 2.95, rBot: 0.13, rTop: 0.045 },
  ];
  limbs.forEach((lb, idx) => {
    const limb = new THREE.CylinderGeometry(lb.rTop, lb.rBot, lb.len, 6);
    limb.translate(0, lb.len * 0.5, 0);
    limb.rotateZ(-lb.tilt);
    limb.rotateY(lb.az);
    limb.translate(0, lb.yBase, 0);
    parts.push(limb);

    // Secondary twig fork extending further out into the outer leaf boughs
    const twig = new THREE.CylinderGeometry(0.025, 0.065, 1.35, 5);
    twig.translate(0, 0.675, 0);
    twig.rotateZ(-(lb.tilt + 0.34));
    twig.rotateY(lb.az + (idx % 2 === 0 ? 0.38 : -0.35));
    const midR = Math.sin(lb.tilt) * lb.len * 0.68;
    const midY = lb.yBase + Math.cos(lb.tilt) * lb.len * 0.68;
    twig.translate(Math.cos(lb.az) * midR, midY, -Math.sin(lb.az) * midR);
    parts.push(twig);
  });

  const merged = safeMergeGeometries(parts);
  merged.computeVertexNormals();
  return merged;
}

interface CanopyLobeSpec {
  x: number;
  y: number;
  z: number;
  r: number;
  sx?: number;
  sy?: number;
  sz?: number;
}

function buildOrganicFoliageClusterGeo(
  lobes: CanopyLobeSpec[],
  seedBase: number,
): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  lobes.forEach((lb, idx) => {
    const puff = new THREE.IcosahedronGeometry(lb.r, 2);
    const pos = puff.attributes.position as THREE.BufferAttribute;
    const s = seedBase + idx * 1.73;
    for (let v = 0; v < pos.count; v++) {
      const vx = pos.getX(v);
      const vy = pos.getY(v);
      const vz = pos.getZ(v);
      const len = Math.max(0.001, Math.hypot(vx, vy, vz));
      const nx = vx / len;
      const ny = vy / len;
      const nz = vz / len;
      // Multi-harmonic bumpy leafy botanical surface relief
      const bump =
        1.0 +
        0.16 * Math.sin(nx * 4.1 + s) * Math.cos(ny * 3.6 - s * 0.7) +
        0.11 * Math.cos(nz * 5.3 + nx * 2.9 + s * 1.3) +
        0.065 * Math.sin(ny * 7.1 + nz * 6.4 - s);
      pos.setXYZ(
        v,
        vx * bump * (lb.sx ?? 1.0) + lb.x,
        vy * bump * (lb.sy ?? 0.82) + lb.y,
        vz * bump * (lb.sz ?? 1.0) + lb.z,
      );
    }
    puff.computeVertexNormals();
    parts.push(puff);
  });
  const merged = safeMergeGeometries(parts);
  merged.computeVertexNormals();
  return merged;
}

function isPointInPolygon2D(px: number, py: number, pts: THREE.Vector2[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x;
    const yi = pts[i].y;
    const xj = pts[j].x;
    const yj = pts[j].y;
    const intersect =
      yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function buildGiantBaMonument(
  verticalGardenTex: THREE.CanvasTexture,
  foliageLeafTex: THREE.CanvasTexture,
  stoneTex: THREE.CanvasTexture,
  windTimeUniform: { value: number },
  disposables: { dispose: () => void }[],
): THREE.Group {
  const group = new THREE.Group();

  // Weathered cracked concrete planter pedestal on south Plaza de la República mound
  const plinthMat = new THREE.MeshStandardMaterial({
    map: stoneTex,
    color: 0x868a84,
    roughness: 0.88,
    metalness: 0.06,
  });
  const soilMat = new THREE.MeshStandardMaterial({
    color: 0x1b2b16,
    roughness: 0.96,
    metalness: 0.02,
  });
  const steelFrameMat = new THREE.MeshStandardMaterial({
    color: 0x1f2421,
    roughness: 0.58,
    metalness: 0.65,
  });
  const mossMat = new THREE.MeshStandardMaterial({
    map: verticalGardenTex,
    color: 0x8aa37c,
    roughness: 0.94,
    metalness: 0.02,
  });
  const baPlantMat = createWindFoliageMaterial(
    {
      map: foliageLeafTex,
      color: 0xffffff,
      roughness: 0.88,
      metalness: 0.02,
    },
    windTimeUniform,
    'ba_plant',
  );
  const baGrassMat = createWindFoliageMaterial(
    {
      color: 0xffffff,
      roughness: 0.92,
      metalness: 0.02,
    },
    windTimeUniform,
    'grass',
  );
  disposables.push(plinthMat, soilMat, steelFrameMat, mossMat, baPlantMat, baGrassMat);

  const plinthGeo = new THREE.BoxGeometry(6.9, 0.44, 2.2);
  plinthGeo.translate(0, 0.22, 0);
  const plinth = new THREE.Mesh(plinthGeo, plinthMat);
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  group.add(plinth);
  disposables.push(plinthGeo);

  const bedGeo = new THREE.BoxGeometry(6.4, 0.16, 1.75);
  bedGeo.translate(0, 0.46, 0);
  const bed = new THREE.Mesh(bedGeo, soilMat);
  bed.receiveShadow = true;
  group.add(bed);
  disposables.push(bedGeo);

  // Fine wind-swaying grass blade tufts filling the BA planter base & curling around plinth
  const baGrassTuftGeo = buildFineGrassTuftGeo();
  disposables.push(baGrassTuftGeo);
  const baGrassSpots: { x: number; y: number; z: number; sx: number; sy: number; rotY: number; col: number }[] = [];
  for (let i = 0; i < 84; i++) {
    const gx = -3.05 + ((i * 0.73) % 6.1) + Math.sin(i * 3.1) * 0.16;
    const gz = (i % 2 === 0 ? 1 : -1) * (0.42 + ((i * 19) % 10) * 0.042);
    baGrassSpots.push({
      x: gx,
      y: 0.5,
      z: gz,
      sx: 0.75 + (i % 4) * 0.22,
      sy: 0.55 + (i % 5) * 0.2,
      rotY: i * 1.37,
      col: i % 3 === 0 ? 0x355c24 : i % 3 === 1 ? 0x4b7430 : 0x2a491d,
    });
  }
  const baGrassInst = new THREE.InstancedMesh(baGrassTuftGeo, baGrassMat, baGrassSpots.length);
  const baTmpDummy = new THREE.Object3D();
  const baTmpCol = new THREE.Color();
  baGrassSpots.forEach((gs, idx) => {
    baTmpDummy.position.set(gs.x, gs.y, gs.z);
    baTmpDummy.rotation.set(0, gs.rotY, 0);
    baTmpDummy.scale.set(gs.sx, gs.sy, gs.sx);
    baTmpDummy.updateMatrix();
    baGrassInst.setMatrixAt(idx, baTmpDummy.matrix);
    baTmpCol.setHex(gs.col);
    baGrassInst.setColorAt(idx, baTmpCol);
  });
  baGrassInst.computeBoundingSphere();
  group.add(baGrassInst);

  // Sculpted "B" Shape (height 3.1m, width ~2.1m)
  const shapeB = new THREE.Shape();
  shapeB.moveTo(-1.05, 0);
  shapeB.lineTo(0.2, 0);
  shapeB.quadraticCurveTo(1.08, 0.05, 1.08, 0.78);
  shapeB.quadraticCurveTo(1.08, 1.38, 0.45, 1.54);
  shapeB.quadraticCurveTo(0.98, 1.72, 0.98, 2.34);
  shapeB.quadraticCurveTo(0.98, 3.05, 0.15, 3.1);
  shapeB.lineTo(-1.05, 3.1);
  shapeB.closePath();

  const bHoleTop = new THREE.Path();
  bHoleTop.moveTo(-0.42, 1.82);
  bHoleTop.lineTo(0.08, 1.82);
  bHoleTop.quadraticCurveTo(0.42, 1.86, 0.42, 2.24);
  bHoleTop.quadraticCurveTo(0.42, 2.58, 0.08, 2.62);
  bHoleTop.lineTo(-0.42, 2.62);
  bHoleTop.closePath();
  shapeB.holes.push(bHoleTop);

  const bHoleBot = new THREE.Path();
  bHoleBot.moveTo(-0.42, 0.48);
  bHoleBot.lineTo(0.14, 0.48);
  bHoleBot.quadraticCurveTo(0.5, 0.52, 0.5, 0.88);
  bHoleBot.quadraticCurveTo(0.5, 1.24, 0.14, 1.28);
  bHoleBot.lineTo(-0.42, 1.28);
  bHoleBot.closePath();
  shapeB.holes.push(bHoleBot);

  // Sculpted "A" Shape (height 3.1m, width ~2.35m)
  const shapeA = new THREE.Shape();
  shapeA.moveTo(-1.18, 0);
  shapeA.lineTo(-0.56, 0);
  shapeA.lineTo(-0.36, 0.72);
  shapeA.lineTo(0.36, 0.72);
  shapeA.lineTo(0.56, 0);
  shapeA.lineTo(1.18, 0);
  shapeA.lineTo(0.36, 3.1);
  shapeA.lineTo(-0.36, 3.1);
  shapeA.closePath();

  const aHole = new THREE.Path();
  aHole.moveTo(-0.22, 1.24);
  aHole.lineTo(0.22, 1.24);
  aHole.lineTo(0, 2.28);
  aHole.closePath();
  shapeA.holes.push(aHole);

  const plantTransforms: { pos: THREE.Vector3; rot: THREE.Euler; scale: number; col: number }[] = [];
  const plantPalette = [0x29521e, 0x356425, 0x44752e, 0x204218, 0x528236, 0x3a6a28];

  const buildLetterWithLivingPlants = (shape: THREE.Shape, offsetX: number, seedOff: number) => {
    // Structural dark iron planter-cage backing
    const outerGeo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.38,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.03,
      bevelSegments: 2,
      curveSegments: 14,
    });
    outerGeo.translate(0, 0, -0.19);
    const outerMesh = new THREE.Mesh(outerGeo, steelFrameMat);
    outerMesh.position.set(offsetX, 0.5, 0);
    outerMesh.castShadow = true;
    outerMesh.receiveShadow = true;

    const innerGeo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.44,
      bevelEnabled: false,
      curveSegments: 14,
    });
    innerGeo.translate(0, 0, -0.22);
    const innerMesh = new THREE.Mesh(innerGeo, mossMat);
    innerMesh.scale.set(0.97, 0.98, 1);
    innerMesh.position.set(offsetX, 0.52, 0);
    innerMesh.castShadow = true;
    innerMesh.receiveShadow = true;

    disposables.push(outerGeo, innerGeo);
    group.add(outerMesh, innerMesh);

    // Sample living 3D plant rosettes densely across the entire front face, back face, and outer edge contours of the letter
    const extracted = shape.extractPoints(18);
    const outerPts = extracted.shape;
    const holePolys = extracted.holes;
    const isInsideLetter = (lx: number, ly: number) =>
      isPointInPolygon2D(lx, ly, outerPts) &&
      !holePolys.some((hp) => isPointInPolygon2D(lx, ly, hp));

    let sampleIdx = seedOff;
    for (let gy = 0.14; gy <= 2.98; gy += 0.22) {
      for (let gx = -1.1; gx <= 1.1; gx += 0.22) {
        const jx = gx + Math.sin(sampleIdx * 7.3) * 0.05;
        const jy = gy + Math.cos(sampleIdx * 5.9) * 0.05;
        sampleIdx++;
        if (!isInsideLetter(jx, jy)) continue;

        const baseScale = 0.82 + (sampleIdx % 5) * 0.12;
        // Front face living plant sprig (+Z outward)
        plantTransforms.push({
          pos: new THREE.Vector3(offsetX + jx, 0.5 + jy, 0.22),
          rot: new THREE.Euler(
            Math.PI * 0.5 + Math.sin(sampleIdx * 2.1) * 0.26,
            Math.cos(sampleIdx * 1.7) * 0.24,
            sampleIdx * 1.1,
          ),
          scale: baseScale,
          col: plantPalette[sampleIdx % plantPalette.length],
        });
        // Back face living plant sprig (-Z outward)
        plantTransforms.push({
          pos: new THREE.Vector3(offsetX + jx, 0.5 + jy, -0.22),
          rot: new THREE.Euler(
            -Math.PI * 0.5 + Math.sin(sampleIdx * 3.1) * 0.26,
            Math.cos(sampleIdx * 2.3) * 0.24,
            sampleIdx * 0.9,
          ),
          scale: baseScale * 0.96,
          col: plantPalette[(sampleIdx + 2) % plantPalette.length],
        });
      }
    }

    // Perimeter rim sprigs wrapping the side walls and top crown of the letter
    for (let i = 0; i < outerPts.length; i += 2) {
      const p = outerPts[i];
      const next = outerPts[(i + 1) % outerPts.length];
      const dx = next.x - p.x;
      const dy = next.y - p.y;
      const outLen = Math.max(0.001, Math.hypot(dx, dy));
      const outX = dy / outLen;
      const outY = -dx / outLen;
      const rimZ = (i % 2 === 0 ? 1 : -1) * 0.09;
      plantTransforms.push({
        pos: new THREE.Vector3(offsetX + p.x, 0.5 + p.y, rimZ),
        rot: new THREE.Euler(
          Math.atan2(rimZ, Math.max(0.15, outY)) * 0.5,
          0,
          Math.atan2(-outX, outY),
        ),
        scale: 0.9 + (i % 3) * 0.14,
        col: plantPalette[(i + seedOff) % plantPalette.length],
      });
    }
  };

  buildLetterWithLivingPlants(shapeB, -1.42, 11);
  buildLetterWithLivingPlants(shapeA, 1.44, 97);

  const baPlantGeo = buildBaPlantRosetteGeo();
  disposables.push(baPlantGeo);
  const baPlantsInst = new THREE.InstancedMesh(baPlantGeo, baPlantMat, plantTransforms.length);
  baPlantsInst.castShadow = true;
  baPlantsInst.receiveShadow = true;
  plantTransforms.forEach((pt, idx) => {
    baTmpDummy.position.copy(pt.pos);
    baTmpDummy.rotation.copy(pt.rot);
    baTmpDummy.scale.setScalar(pt.scale);
    baTmpDummy.updateMatrix();
    baPlantsInst.setMatrixAt(idx, baTmpDummy.matrix);
    baTmpCol.setHex(pt.col);
    baPlantsInst.setColorAt(idx, baTmpCol);
  });
  baPlantsInst.computeBoundingSphere();
  group.add(baPlantsInst);

  return group;
}

function buildObeliscoMonument(
  stoneTex: THREE.CanvasTexture,
  disposables: { dispose: () => void }[],
): { group: THREE.Group; plaqueGlowMat: THREE.MeshStandardMaterial } {
  const group = new THREE.Group();

  const whiteStoneMat = new THREE.MeshStandardMaterial({
    map: stoneTex,
    color: 0xc2c0b6,
    roughness: 0.84,
    metalness: 0.05,
  });
  const plinthGraniteMat = new THREE.MeshStandardMaterial({
    map: stoneTex,
    color: 0x6b6f6a,
    roughness: 0.9,
    metalness: 0.06,
  });
  const sootMat = new THREE.MeshStandardMaterial({
    map: stoneTex,
    color: 0x222522,
    roughness: 0.96,
    metalness: 0.04,
  });
  const vineMat = new THREE.MeshStandardMaterial({
    color: 0x223b1b,
    roughness: 0.9,
    metalness: 0.02,
  });
  const vineLeafMat = new THREE.MeshStandardMaterial({
    color: 0x2e4e23,
    roughness: 0.88,
    metalness: 0.02,
  });
  const bronzePlaqueMat = new THREE.MeshStandardMaterial({
    color: 0x332d25,
    roughness: 0.56,
    metalness: 0.68,
  });
  const darkWindowMat = new THREE.MeshStandardMaterial({
    color: 0x101316,
    roughness: 0.35,
    metalness: 0.45,
  });
  const metalSpireMat = new THREE.MeshStandardMaterial({
    color: 0x646b68,
    roughness: 0.48,
    metalness: 0.78,
  });
  const plaqueGlowMat = new THREE.MeshStandardMaterial({
    color: 0x9ca398,
    emissive: new THREE.Color(0x8a7d5c),
    emissiveIntensity: 0.08,
    roughness: 0.5,
  });
  disposables.push(
    whiteStoneMat,
    plinthGraniteMat,
    sootMat,
    vineMat,
    vineLeafMat,
    bronzePlaqueMat,
    darkWindowMat,
    metalSpireMat,
    plaqueGlowMat,
  );

  // Stepped base plinth
  const step1Geo = new THREE.BoxGeometry(4.4, 0.55, 4.4);
  step1Geo.translate(0, 0.275, 0);
  const step2Geo = new THREE.BoxGeometry(3.6, 0.65, 3.6);
  step2Geo.translate(0, 0.875, 0);
  const step3Geo = new THREE.BoxGeometry(2.95, 1.25, 2.95);
  step3Geo.translate(0, 1.825, 0);
  const s1 = new THREE.Mesh(step1Geo, plinthGraniteMat);
  const s2 = new THREE.Mesh(step2Geo, plinthGraniteMat);
  const s3 = new THREE.Mesh(step3Geo, whiteStoneMat);
  [s1, s2, s3].forEach((m) => {
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  });
  disposables.push(step1Geo, step2Geo, step3Geo);

  // 4 weathered bronze plaques on plinth sides
  const plaqueGeo = new THREE.BoxGeometry(1.55, 0.82, 0.08);
  const floodStripGeo = new THREE.BoxGeometry(1.4, 0.08, 0.14);
  disposables.push(plaqueGeo, floodStripGeo);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const p = new THREE.Mesh(plaqueGeo, bronzePlaqueMat);
    p.position.set(Math.sin(a) * 1.49, 1.82, Math.cos(a) * 1.49);
    p.rotation.y = a;
    group.add(p);

    const fl = new THREE.Mesh(floodStripGeo, plaqueGlowMat);
    fl.position.set(Math.sin(a) * 1.65, 1.22, Math.cos(a) * 1.65);
    fl.rotation.y = a;
    group.add(fl);
  }

  // Iconic tapered square stone shaft
  const shaftGeo = new THREE.CylinderGeometry(1.05, 1.82, 27.5, 4);
  shaftGeo.rotateY(Math.PI / 4);
  shaftGeo.translate(0, 2.45 + 13.75, 0);
  const shaft = new THREE.Mesh(shaftGeo, whiteStoneMat);
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  group.add(shaft);
  disposables.push(shaftGeo);

  // Heavy upper shaft fire-soot / scorch bands (matching darkened upper masonry in reference photo)
  const scorchBandGeo = new THREE.CylinderGeometry(1.13, 1.37, 8.6, 4);
  scorchBandGeo.rotateY(Math.PI / 4);
  scorchBandGeo.translate(0, 24.4, 0);
  const scorchBand = new THREE.Mesh(scorchBandGeo, sootMat);
  scorchBand.castShadow = true;
  group.add(scorchBand);
  disposables.push(scorchBandGeo);

  // Vertical soot/weathering streak patches on mid-upper shaft
  const patchGeo = new THREE.BoxGeometry(1.05, 4.4, 0.16);
  disposables.push(patchGeo);
  [
    { y: 18.2, a: 0, ox: 0.25 },
    { y: 20.6, a: Math.PI * 0.5, ox: -0.2 },
    { y: 17.4, a: Math.PI, ox: 0.18 },
    { y: 21.8, a: Math.PI * 1.5, ox: -0.22 },
  ].forEach((sp) => {
    const t = (sp.y - 2.45) / 27.5;
    const faceR = THREE.MathUtils.lerp(1.28, 0.74, t);
    const patch = new THREE.Mesh(patchGeo, sootMat);
    patch.position.set(
      Math.sin(sp.a) * faceR + Math.cos(sp.a) * sp.ox,
      sp.y,
      Math.cos(sp.a) * faceR - Math.sin(sp.a) * sp.ox,
    );
    patch.rotation.y = sp.a;
    group.add(patch);
  });

  // Horizontal stone masonry seam rings along shaft
  const seamGeo = new THREE.BoxGeometry(2.55, 0.07, 2.55);
  disposables.push(seamGeo);
  for (let h = 6; h <= 27; h += 4.2) {
    const t = (h - 2.45) / 27.5;
    const wScale = THREE.MathUtils.lerp(1.01, 0.59, t);
    const seam = new THREE.Mesh(seamGeo, plinthGraniteMat);
    seam.position.y = h;
    seam.scale.set(wScale, 1, wScale);
    group.add(seam);
  }

  // Dense climbing ivy & wild vines creeping up the base and lower 13m of the Obelisco shaft
  const ivyClumpGeo = new THREE.DodecahedronGeometry(0.42, 0);
  disposables.push(ivyClumpGeo);
  for (let v = 0; v < 5; v++) {
    const baseAngle = v * 1.28 + 0.35;
    const maxH = 8.5 + (v % 3) * 3.1;
    const pts: THREE.Vector3[] = [];
    for (let s = 0; s <= 7; s++) {
      const frac = s / 7;
      const vy = 0.3 + frac * maxH;
      const shaftT = Math.max(0, (vy - 2.45) / 27.5);
      const r = vy < 2.45 ? 1.65 : THREE.MathUtils.lerp(1.36, 0.92, shaftT);
      const ang = baseAngle + Math.sin(frac * 4.5 + v) * 0.42;
      const px = Math.sin(ang) * (r + 0.08);
      const pz = Math.cos(ang) * (r + 0.08);
      pts.push(new THREE.Vector3(px, vy, pz));

      const leafCluster = new THREE.Mesh(ivyClumpGeo, s % 2 === 0 ? vineLeafMat : vineMat);
      leafCluster.position.set(px, vy, pz);
      const sc = THREE.MathUtils.lerp(1.45, 0.55, frac);
      leafCluster.scale.set(sc * 1.25, sc * 1.4, sc * 1.0);
      leafCluster.rotation.set(frac * 1.1, ang, s * 0.5);
      leafCluster.castShadow = true;
      group.add(leafCluster);
    }
    const vineCurve = new THREE.CatmullRomCurve3(pts);
    const vineTubeGeo = new THREE.TubeGeometry(vineCurve, 14, 0.085, 5, false);
    const vineMesh = new THREE.Mesh(vineTubeGeo, vineMat);
    group.add(vineMesh);
    disposables.push(vineTubeGeo);
  }

  // Pyramidal apex with scorched lower collar
  const apexGeo = new THREE.CylinderGeometry(0.03, 1.05, 3.1, 4);
  apexGeo.rotateY(Math.PI / 4);
  apexGeo.translate(0, 29.95 + 1.55, 0);
  const apex = new THREE.Mesh(apexGeo, whiteStoneMat);
  apex.castShadow = true;
  group.add(apex);
  disposables.push(apexGeo);

  const apexScorchGeo = new THREE.CylinderGeometry(0.45, 1.07, 1.6, 4);
  apexScorchGeo.rotateY(Math.PI / 4);
  apexScorchGeo.translate(0, 30.72, 0);
  const apexScorch = new THREE.Mesh(apexScorchGeo, sootMat);
  group.add(apexScorch);
  disposables.push(apexScorchGeo);

  // 4 signature observation windows near the base of the pyramidal apex
  const winGeo = new THREE.BoxGeometry(0.32, 0.46, 0.14);
  disposables.push(winGeo);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const win = new THREE.Mesh(winGeo, darkWindowMat);
    win.position.set(Math.sin(a) * 0.62, 30.55, Math.cos(a) * 0.62);
    win.rotation.y = a;
    win.rotation.x = i === 0 ? -0.22 : i === 2 ? 0.22 : 0;
    group.add(win);
  }

  // Lightning rod spire at the very peak
  const spireGeo = new THREE.CylinderGeometry(0.02, 0.055, 2.6, 6);
  spireGeo.translate(0, 33.0 + 1.3, 0);
  const spire = new THREE.Mesh(spireGeo, metalSpireMat);
  group.add(spire);
  disposables.push(spireGeo);

  // Weathered perimeter granite bollards around the monument (a couple knocked slightly askew)
  const bollardGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.72, 8);
  bollardGeo.translate(0, 0.36, 0);
  disposables.push(bollardGeo);
  for (let i = 0; i < 12; i++) {
    if (i === 4 || i === 9) continue;
    const a = (i / 12) * Math.PI * 2;
    const bx = Math.cos(a) * 3.15;
    const bz = Math.sin(a) * 3.15;
    const bollard = new THREE.Mesh(bollardGeo, plinthGraniteMat);
    bollard.position.set(bx, 0, bz);
    if (i % 4 === 1) {
      bollard.rotation.z = 0.18;
      bollard.rotation.x = -0.1;
    }
    bollard.castShadow = false;
    bollard.receiveShadow = true;
    group.add(bollard);
  }

  return { group, plaqueGlowMat };
}

function buildMetrobusStation(
  x: number,
  z: number,
  facingEast: boolean,
  stoneTex: THREE.CanvasTexture,
  metrobusSignTex: THREE.CanvasTexture,
  signGlowMat: THREE.MeshStandardMaterial,
  disposables: { dispose: () => void }[],
): { group: THREE.Group; colliders: WorldCollider[]; signPanelMat: THREE.MeshStandardMaterial } {
  const group = new THREE.Group();
  const y = groundHeightAt(x, z);
  group.position.set(x, 0, z);
  const colliders: WorldCollider[] = [];

  const platformMat = new THREE.MeshStandardMaterial({
    map: stoneTex,
    color: 0x6c737d,
    roughness: 0.85,
    metalness: 0.08,
  });
  const tactileYellowMat = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    roughness: 0.62,
    metalness: 0.1,
  });
  const frameSteelMat = new THREE.MeshStandardMaterial({
    color: 0x262d37,
    roughness: 0.42,
    metalness: 0.75,
  });
  const glassCanopyMat = new THREE.MeshStandardMaterial({
    color: 0x1e3a4c,
    roughness: 0.18,
    metalness: 0.45,
    transparent: true,
    opacity: 0.62,
  });
  const signPanelMat = new THREE.MeshStandardMaterial({
    map: metrobusSignTex,
    emissive: new THREE.Color(0xfef08a),
    emissiveMap: metrobusSignTex,
    emissiveIntensity: 0.35,
    roughness: 0.35,
  });
  const benchMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.38,
    metalness: 0.7,
  });
  disposables.push(
    platformMat,
    tactileYellowMat,
    frameSteelMat,
    glassCanopyMat,
    signPanelMat,
    benchMat,
  );

  // Raised concrete boarding platform (3.1m x 9.6m)
  const platGeo = new THREE.BoxGeometry(3.1, 0.24, 9.6);
  platGeo.translate(0, 0.12, 0);
  const plat = new THREE.Mesh(platGeo, platformMat);
  plat.receiveShadow = true;
  plat.castShadow = true;
  group.add(plat);
  disposables.push(platGeo);

  // Yellow tactile boarding edge stripe facing the bus lane
  const edgeOffsetX = facingEast ? 1.42 : -1.42;
  const edgeGeo = new THREE.BoxGeometry(0.24, 0.25, 9.5);
  edgeGeo.translate(edgeOffsetX, 0.125, 0);
  const edge = new THREE.Mesh(edgeGeo, tactileYellowMat);
  edge.receiveShadow = true;
  group.add(edge);
  disposables.push(edgeGeo);

  // 4 steel support columns + glass canopy roof
  const postGeo = new THREE.CylinderGeometry(0.08, 0.09, 2.95, 8);
  postGeo.translate(0, 1.48, 0);
  disposables.push(postGeo);
  const postOffsetX = facingEast ? -0.95 : 0.95;
  [-3.2, -1.05, 1.05, 3.2].forEach((pz) => {
    const post = new THREE.Mesh(postGeo, frameSteelMat);
    post.position.set(postOffsetX, 0.2, pz);
    post.castShadow = true;
    group.add(post);
  });

  const roofGeo = new THREE.BoxGeometry(2.85, 0.12, 8.2);
  const roof = new THREE.Mesh(roofGeo, glassCanopyMat);
  roof.position.set(facingEast ? 0.15 : -0.15, 3.12, 0);
  roof.rotation.z = facingEast ? -0.08 : 0.08;
  roof.castShadow = true;
  group.add(roof);
  disposables.push(roofGeo);

  const roofTrimGeo = new THREE.BoxGeometry(2.94, 0.16, 0.22);
  const trimA = new THREE.Mesh(roofTrimGeo, frameSteelMat);
  trimA.position.set(facingEast ? 0.15 : -0.15, 3.12, -4.05);
  const trimB = trimA.clone();
  trimB.position.z = 4.05;
  group.add(trimA, trimB);
  disposables.push(roofTrimGeo);

  // Illuminated LED strip under canopy
  const stripGeo = new THREE.BoxGeometry(0.18, 0.06, 7.6);
  const strip = new THREE.Mesh(stripGeo, signGlowMat);
  strip.position.set(0, 3.02, 0);
  group.add(strip);
  disposables.push(stripGeo);

  // Tall Metrobus Totem Sign on north end of platform
  const totemGeo = new THREE.BoxGeometry(0.68, 3.35, 0.22);
  const totem = new THREE.Mesh(totemGeo, signPanelMat);
  totem.position.set(0, 1.85, -4.25);
  totem.castShadow = true;
  group.add(totem);
  disposables.push(totemGeo);

  // Stainless steel passenger bench
  const benchGeo = new THREE.BoxGeometry(0.55, 0.48, 2.4);
  const bench = new THREE.Mesh(benchGeo, benchMat);
  bench.position.set(facingEast ? -0.45 : 0.45, 0.44, 0.8);
  bench.castShadow = true;
  bench.receiveShadow = true;
  group.add(bench);
  disposables.push(benchGeo);

  // Compact colliders for totem + canopy pillars + bench
  colliders.push(
    { x, z: z - 4.25, radius: 0.65, height: 3.4, source: 'ruin' },
    { x: x + (facingEast ? -0.45 : 0.45), z: z + 0.8, radius: 0.72, height: 1.0, source: 'ruin' },
    { x: x + postOffsetX, z: z - 2.6, radius: 0.42, height: 3.2, source: 'ruin' },
    { x: x + postOffsetX, z: z + 2.6, radius: 0.42, height: 3.2, source: 'ruin' },
  );

  void y;
  return { group, colliders, signPanelMat };
}

function buildPortenoBus(
  x: number,
  z: number,
  facingSouth: boolean,
  busLiveryTex: THREE.CanvasTexture,
  disposables: { dispose: () => void }[],
): { group: THREE.Group; colliders: WorldCollider[] } {
  const group = new THREE.Group();
  const y = groundHeightAt(x, z);
  group.position.set(x, y, z);
  group.rotation.y = facingSouth ? 0 : Math.PI;

  const bodyMat = new THREE.MeshStandardMaterial({
    map: busLiveryTex,
    roughness: 0.42,
    metalness: 0.28,
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.55,
    metalness: 0.2,
  });
  const darkGlassMat = new THREE.MeshStandardMaterial({
    color: 0x0f1b28,
    roughness: 0.16,
    metalness: 0.65,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x16191e,
    roughness: 0.9,
    metalness: 0.08,
  });
  const hubMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.32,
    metalness: 0.85,
  });
  const ledMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: new THREE.Color(0xf59e0b),
    emissiveIntensity: 1.1,
    roughness: 0.3,
  });
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: new THREE.Color(0xdc2626),
    emissiveIntensity: 0.95,
    roughness: 0.3,
  });
  disposables.push(bodyMat, roofMat, darkGlassMat, tireMat, hubMat, ledMat, tailMat);

  // Main bus chassis + livery shell
  const hullGeo = new THREE.BoxGeometry(2.38, 2.35, 8.2);
  const hull = new THREE.Mesh(hullGeo, bodyMat);
  hull.position.y = 1.56;
  hull.castShadow = true;
  hull.receiveShadow = true;
  group.add(hull);
  disposables.push(hullGeo);

  // Roof + AC units
  const capGeo = new THREE.BoxGeometry(2.34, 0.18, 8.1);
  const cap = new THREE.Mesh(capGeo, roofMat);
  cap.position.y = 2.82;
  group.add(cap);
  const acGeo = new THREE.BoxGeometry(1.5, 0.26, 2.1);
  const ac1 = new THREE.Mesh(acGeo, roofMat);
  ac1.position.set(0, 3.0, -1.1);
  const ac2 = ac1.clone();
  ac2.position.z = 1.8;
  group.add(ac1, ac2);
  disposables.push(capGeo, acGeo);

  // Front panoramic windshield + destination LED display
  const windshieldGeo = new THREE.BoxGeometry(2.14, 1.12, 0.08);
  const windshield = new THREE.Mesh(windshieldGeo, darkGlassMat);
  windshield.position.set(0, 1.9, 4.11);
  const destGeo = new THREE.BoxGeometry(1.55, 0.24, 0.09);
  const dest = new THREE.Mesh(destGeo, ledMat);
  dest.position.set(0, 2.58, 4.11);
  group.add(windshield, dest);
  disposables.push(windshieldGeo, destGeo);

  // Headlights & taillights
  const lampGeo = new THREE.BoxGeometry(0.32, 0.18, 0.08);
  [-0.82, 0.82].forEach((lx) => {
    const hl = new THREE.Mesh(lampGeo, ledMat);
    hl.position.set(lx, 0.74, 4.11);
    const tl = new THREE.Mesh(lampGeo, tailMat);
    tl.position.set(lx, 0.82, -4.11);
    group.add(hl, tl);
  });
  disposables.push(lampGeo);

  // 4 rubber wheels with metallic hubs
  const tireGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.34, 14);
  tireGeo.rotateZ(Math.PI / 2);
  const hubGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.36, 10);
  hubGeo.rotateZ(Math.PI / 2);
  disposables.push(tireGeo, hubGeo);
  [
    [-1.12, 2.35],
    [1.12, 2.35],
    [-1.12, -2.35],
    [1.12, -2.35],
  ].forEach(([wx, wz]) => {
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.position.set(wx, 0.46, wz);
    tire.castShadow = true;
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.position.set(wx, 0.46, wz);
    group.add(tire, hub);
  });

  // 3 overlapping circular colliders covering bus length so bullets & actors collide cleanly
  const dirZ = facingSouth ? 1 : -1;
  const colliders: WorldCollider[] = [-2.5, 0, 2.5].map((oz) => ({
    x,
    z: z + oz * dirZ,
    radius: 1.38,
    height: 3.1,
    source: 'ruin',
  }));

  return { group, colliders };
}

function buildTeatroColonLandmark(
  stoneTex: THREE.CanvasTexture,
  colonMarqueeTex: THREE.CanvasTexture,
  disposables: { dispose: () => void }[],
): {
  root: THREE.Group;
  baseGroup: THREE.Group;
  overrideHolder: THREE.Group;
  colliders: WorldCollider[];
  beaconRingMat: THREE.MeshBasicMaterial;
  beaconBeamMat: THREE.MeshBasicMaterial;
  beaconBeam: THREE.Mesh;
  beaconRing: THREE.Mesh;
  beaconLight: THREE.PointLight;
  glassArchMat: THREE.MeshStandardMaterial;
  marqueeMat: THREE.MeshStandardMaterial;
} {
  const root = new THREE.Group();
  const gy = groundHeightAt(COLON_BUILDING_X, COLON_BUILDING_Z);
  root.position.set(COLON_BUILDING_X, gy, COLON_BUILDING_Z);

  const baseGroup = new THREE.Group();
  const overrideHolder = new THREE.Group();
  root.add(baseGroup, overrideHolder);

  const travertineMat = new THREE.MeshStandardMaterial({
    map: stoneTex,
    color: 0xddd2be,
    roughness: 0.72,
    metalness: 0.06,
  });
  const plinthMat = new THREE.MeshStandardMaterial({
    map: stoneTex,
    color: 0xa29a8d,
    roughness: 0.84,
    metalness: 0.08,
  });
  const roofCopperMat = new THREE.MeshStandardMaterial({
    color: 0x3b6e60,
    roughness: 0.44,
    metalness: 0.48,
  });
  const mansardDarkMat = new THREE.MeshStandardMaterial({
    color: 0x222933,
    roughness: 0.56,
    metalness: 0.36,
  });
  const glassArchMat = new THREE.MeshStandardMaterial({
    color: 0x1c2530,
    emissive: new THREE.Color(0xfbbf24),
    emissiveIntensity: 0.35,
    roughness: 0.25,
    metalness: 0.55,
  });
  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.32,
    metalness: 0.85,
  });
  const marqueeMat = new THREE.MeshStandardMaterial({
    map: colonMarqueeTex,
    emissive: new THREE.Color(0xfde68a),
    emissiveMap: colonMarqueeTex,
    emissiveIntensity: 0.72,
    roughness: 0.3,
  });
  const woodBoardMat = new THREE.MeshStandardMaterial({
    color: 0x5c422c,
    roughness: 0.88,
    metalness: 0.04,
  });
  disposables.push(
    travertineMat,
    plinthMat,
    roofCopperMat,
    mansardDarkMat,
    glassArchMat,
    goldTrimMat,
    marqueeMat,
    woodBoardMat,
  );

  // Main monumental palace volume (centered at local 0, facing +X toward Av. 9 de Julio)
  const podiumGeo = new THREE.BoxGeometry(16.6, 1.4, 21.6);
  podiumGeo.translate(0, 0.7, 0);
  const podium = new THREE.Mesh(podiumGeo, plinthMat);
  podium.castShadow = true;
  podium.receiveShadow = true;
  baseGroup.add(podium);

  const mainBodyGeo = new THREE.BoxGeometry(15.2, 14.5, 20.4);
  mainBodyGeo.translate(-0.6, 8.65, 0);
  const mainBody = new THREE.Mesh(mainBodyGeo, travertineMat);
  mainBody.castShadow = true;
  mainBody.receiveShadow = true;
  baseGroup.add(mainBody);

  // Grand stone steps descending East (+X) toward Av. 9 de Julio / Cerrito
  for (let s = 0; s < 4; s++) {
    const stepGeo = new THREE.BoxGeometry(1.1, 0.35, 11.4 - s * 0.4);
    const step = new THREE.Mesh(stepGeo, plinthMat);
    step.position.set(8.6 + s * 0.9, 1.22 - s * 0.34, 0);
    step.receiveShadow = true;
    step.castShadow = true;
    baseGroup.add(step);
    disposables.push(stepGeo);
  }

  // Portico colonnade (6 fluted neoclassical columns on east face)
  const colGeo = new THREE.CylinderGeometry(0.38, 0.46, 9.6, 12);
  const capGeo = new THREE.BoxGeometry(1.05, 0.55, 1.05);
  disposables.push(colGeo, capGeo);
  [-6.4, -3.85, -1.3, 1.3, 3.85, 6.4].forEach((cz) => {
    const col = new THREE.Mesh(colGeo, travertineMat);
    col.position.set(8.1, 6.2, cz);
    col.castShadow = true;
    col.receiveShadow = true;
    const cap = new THREE.Mesh(capGeo, goldTrimMat);
    cap.position.set(8.1, 11.1, cz);
    baseGroup.add(col, cap);
  });

  // Entablature & classical pediment facing East
  const entablatureGeo = new THREE.BoxGeometry(3.2, 1.65, 15.8);
  const entablature = new THREE.Mesh(entablatureGeo, travertineMat);
  entablature.position.set(7.4, 12.1, 0);
  entablature.castShadow = true;
  baseGroup.add(entablature);

  const pedShape = new THREE.Shape();
  pedShape.moveTo(-7.8, 0);
  pedShape.lineTo(7.8, 0);
  pedShape.lineTo(0, 2.9);
  pedShape.closePath();
  const pedGeo = new THREE.ExtrudeGeometry(pedShape, {
    depth: 2.2,
    bevelEnabled: true,
    bevelSize: 0.12,
    bevelThickness: 0.12,
  });
  pedGeo.rotateY(Math.PI / 2);
  const pediment = new THREE.Mesh(pedGeo, travertineMat);
  pediment.position.set(6.2, 12.9, 0);
  pediment.castShadow = true;
  baseGroup.add(pediment);

  // Illuminated Teatro Colón marquee banner on the portico
  const marqueeGeo = new THREE.BoxGeometry(0.32, 1.5, 6.8);
  const marquee = new THREE.Mesh(marqueeGeo, marqueeMat);
  marquee.position.set(9.12, 12.1, 0);
  baseGroup.add(marquee);

  // Grand arched windows on East facade + side flanks
  const archWinGeo = new THREE.BoxGeometry(0.28, 3.6, 1.55);
  disposables.push(archWinGeo);
  [-7.8, -4.6, -1.6, 1.6, 4.6, 7.8].forEach((wz) => {
    const w = new THREE.Mesh(archWinGeo, glassArchMat);
    w.position.set(7.05, 8.2, wz);
    baseGroup.add(w);
  });

  // Barricaded double theater doors at center entrance
  const doorGeo = new THREE.BoxGeometry(0.4, 3.8, 3.4);
  const door = new THREE.Mesh(doorGeo, mansardDarkMat);
  door.position.set(7.08, 3.3, 0);
  baseGroup.add(door);
  const plankGeo = new THREE.BoxGeometry(0.14, 0.24, 3.7);
  disposables.push(plankGeo);
  [2.1, 3.1].forEach((py, idx) => {
    const plank = new THREE.Mesh(plankGeo, woodBoardMat);
    plank.position.set(7.32, py, 0);
    plank.rotation.x = idx === 0 ? 0.08 : -0.11;
    baseGroup.add(plank);
  });

  // Mansard roof + iconic copper cupola dome
  const mansardGeo = new THREE.CylinderGeometry(8.2, 10.6, 4.2, 4);
  mansardGeo.rotateY(Math.PI / 4);
  const mansard = new THREE.Mesh(mansardGeo, mansardDarkMat);
  mansard.position.set(-0.6, 17.9, 0);
  mansard.scale.set(0.95, 1, 1.25);
  mansard.castShadow = true;
  baseGroup.add(mansard);

  const cupolaDrumGeo = new THREE.CylinderGeometry(3.4, 3.8, 2.8, 12);
  const cupolaDrum = new THREE.Mesh(cupolaDrumGeo, travertineMat);
  cupolaDrum.position.set(-0.6, 20.6, 0);
  const cupolaDomeGeo = new THREE.SphereGeometry(3.55, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.54);
  const cupolaDome = new THREE.Mesh(cupolaDomeGeo, roofCopperMat);
  cupolaDome.position.set(-0.6, 21.8, 0);
  baseGroup.add(cupolaDrum, cupolaDome);

  disposables.push(
    podiumGeo,
    mainBodyGeo,
    entablatureGeo,
    pedGeo,
    marqueeGeo,
    doorGeo,
    mansardGeo,
    cupolaDrumGeo,
    cupolaDomeGeo,
  );

  // Refuge extraction beacon located at COLON_ENTRANCE_X / COLON_ENTRANCE_Z (relative to root)
  const localEntranceX = COLON_ENTRANCE_X - COLON_BUILDING_X;
  const localEntranceZ = COLON_ENTRANCE_Z - COLON_BUILDING_Z;
  const beaconRingGeo = new THREE.RingGeometry(2.8, 3.4, 32);
  beaconRingGeo.rotateX(-Math.PI / 2);
  const beaconRingMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.72,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const beaconRing = new THREE.Mesh(beaconRingGeo, beaconRingMat);
  beaconRing.position.set(localEntranceX, 0.14, localEntranceZ);
  root.add(beaconRing);

  const beaconBeamGeo = new THREE.CylinderGeometry(1.1, 2.2, 11.5, 18, 1, true);
  beaconBeamGeo.translate(0, 5.75, 0);
  const beaconBeamMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.16,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const beaconBeam = new THREE.Mesh(beaconBeamGeo, beaconBeamMat);
  beaconBeam.position.set(localEntranceX, 0.1, localEntranceZ);
  root.add(beaconBeam);

  const beaconLight = new THREE.PointLight(0xf59e0b, 0, 22, 1.4);
  beaconLight.visible = false;
  beaconLight.position.set(localEntranceX, 3.8, localEntranceZ);
  root.add(beaconLight);
  disposables.push(beaconRingGeo, beaconRingMat, beaconBeamGeo, beaconBeamMat);

  // Solid podium body + individual portico columns (leaving the East grand steps & entrance beacon clear)
  const colliders: WorldCollider[] = [
    ...[-6.4, -3.85, -1.3, 1.3, 3.85, 6.4].map((cz) => ({
      x: COLON_BUILDING_X + 8.1,
      z: COLON_BUILDING_Z + cz,
      radius: 0.56,
      height: 11.2,
      source: 'ruin' as const,
    })),
  ];

  return {
    root,
    baseGroup,
    overrideHolder,
    colliders,
    beaconRingMat,
    beaconBeamMat,
    beaconBeam,
    beaconRing,
    beaconLight,
    glassArchMat,
    marqueeMat,
  };
}

function buildUrbanChaosProps(
  scene: THREE.Scene,
  stoneTex: THREE.CanvasTexture,
  quarantineSignTex: THREE.CanvasTexture,
  sceneObjects: THREE.Object3D[],
  ruinObjects: THREE.Object3D[],
  colliders: WorldCollider[],
  disposables: { dispose: () => void }[],
) {
  const taxiYellowMat = new THREE.MeshStandardMaterial({
    color: 0xeab308,
    roughness: 0.52,
    metalness: 0.35,
  });
  const carBlackMat = new THREE.MeshStandardMaterial({
    color: 0x181b22,
    roughness: 0.45,
    metalness: 0.45,
  });
  const sedanSlateMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.58,
    metalness: 0.38,
  });
  const rustSedanMat = new THREE.MeshStandardMaterial({
    color: 0x6c4637,
    roughness: 0.78,
    metalness: 0.28,
  });
  const glassBrokenMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.18,
    metalness: 0.7,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x15181e,
    roughness: 0.92,
    metalness: 0.05,
  });
  const dumpsterMat = new THREE.MeshStandardMaterial({
    color: 0x2d4a36,
    roughness: 0.74,
    metalness: 0.32,
  });
  const trashBagMat = new THREE.MeshStandardMaterial({
    color: 0x171a20,
    roughness: 0.85,
    metalness: 0.05,
  });
  const signPostMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.48,
    metalness: 0.78,
  });
  const quarantineMat = new THREE.MeshStandardMaterial({
    map: quarantineSignTex,
    roughness: 0.52,
    metalness: 0.15,
  });
  const rubbleMat = new THREE.MeshStandardMaterial({
    map: stoneTex,
    color: 0x6b7280,
    roughness: 0.92,
    metalness: 0.06,
  });

  disposables.push(
    taxiYellowMat,
    carBlackMat,
    sedanSlateMat,
    rustSedanMat,
    glassBrokenMat,
    tireMat,
    dumpsterMat,
    trashBagMat,
    signPostMat,
    quarantineMat,
    rubbleMat,
  );

  // Shared car geometries
  const carHullGeo = new THREE.BoxGeometry(1.78, 0.68, 4.1);
  const carCabinGeo = new THREE.BoxGeometry(1.56, 0.58, 2.05);
  const carWindGeo = new THREE.BoxGeometry(1.42, 0.46, 2.1);
  const taxiCapGeo = new THREE.BoxGeometry(0.55, 0.18, 0.28);
  const wheelGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.24, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  disposables.push(carHullGeo, carCabinGeo, carWindGeo, taxiCapGeo, wheelGeo);

  const carSpecs: { x: number; z: number; rotY: number; taxi: boolean; rusty?: boolean; tilt?: number }[] = [
    { x: -24.5, z: 12.0, rotY: 0.26, taxi: true, tilt: 0.03 },
    { x: 25.8, z: -8.5, rotY: -2.75, taxi: true },
    { x: -28.2, z: -22.5, rotY: 0.58, taxi: false, rusty: true },
    { x: 24.2, z: -31.5, rotY: 2.95, taxi: false },
    { x: -23.8, z: 29.5, rotY: -0.42, taxi: false, rusty: true },
    { x: 29.0, z: 24.5, rotY: 0.15, taxi: true },
    { x: -6.8, z: -24.5, rotY: 1.18, taxi: true, tilt: -0.04 },
    { x: -31.8, z: 4.5, rotY: -0.38, taxi: true },
    { x: 23.2, z: 13.8, rotY: 0.62, taxi: false, rusty: true },
    { x: -25.4, z: -6.5, rotY: 1.75, taxi: true, tilt: 0.02 },
    { x: 31.0, z: -18.5, rotY: -0.95, taxi: false, rusty: true },
    // Extended grid street wrecks (Lavalle, Sarmiento, Córdoba, Rivadavia, Libertad, Suipacha)
    { x: -25.0, z: -56.0, rotY: 0.42, taxi: true },
    { x: 26.5, z: -61.0, rotY: -0.35, taxi: false, rusty: true },
    { x: -28.0, z: 62.0, rotY: 2.65, taxi: false },
    { x: 24.5, z: 66.0, rotY: 0.85, taxi: true },
    { x: -70.5, z: -18.0, rotY: 0.22, taxi: true },
    { x: -70.5, z: 38.0, rotY: 1.48, taxi: false, rusty: true },
    { x: 70.5, z: -40.0, rotY: -1.35, taxi: true },
    { x: 70.5, z: 54.0, rotY: 0.12, taxi: false },
    { x: -51.0, z: -78.0, rotY: 1.65, taxi: true },
    { x: 52.0, z: 78.0, rotY: -1.45, taxi: false, rusty: true },
  ];

  carSpecs.forEach((cs) => {
    const gy = groundHeightAt(cs.x, cs.z);
    const car = new THREE.Group();
    car.position.set(cs.x, gy, cs.z);
    car.rotation.y = cs.rotY;
    if (cs.tilt) car.rotation.z = cs.tilt;

    const bodyMat = cs.taxi ? carBlackMat : cs.rusty ? rustSedanMat : sedanSlateMat;
    const roofMat = cs.taxi ? taxiYellowMat : bodyMat;

    const hull = new THREE.Mesh(carHullGeo, bodyMat);
    hull.position.y = 0.62;
    hull.castShadow = true;
    hull.receiveShadow = true;
    const cabin = new THREE.Mesh(carCabinGeo, roofMat);
    cabin.position.set(0, 1.22, -0.15);
    cabin.castShadow = true;
    const glass = new THREE.Mesh(carWindGeo, glassBrokenMat);
    glass.position.set(0, 1.2, -0.15);
    car.add(hull, cabin, glass);

    if (cs.taxi) {
      const cap = new THREE.Mesh(taxiCapGeo, taxiYellowMat);
      cap.position.set(0, 1.58, 0.15);
      car.add(cap);
    }

    [
      [-0.86, 1.26],
      [0.86, 1.26],
      [-0.86, -1.26],
      [0.86, -1.26],
    ].forEach(([wx, wz]) => {
      const w = new THREE.Mesh(wheelGeo, tireMat);
      w.position.set(wx, 0.33, wz);
      w.castShadow = true;
      car.add(w);
    });

    scene.add(car);
    sceneObjects.push(car);
    ruinObjects.push(car);
    colliders.push({ x: cs.x, z: cs.z, radius: 1.85, height: 1.6, source: 'ruin' });
  });

  // Tactical low concrete rubble piles & collapsed debris mounds across intersections
  const coverRockGeo = new THREE.DodecahedronGeometry(0.62, 0);
  const coverSlabGeo = new THREE.BoxGeometry(2.1, 0.36, 1.35);
  disposables.push(coverRockGeo, coverSlabGeo);
  const tacticalCoverSpots = [
    { x: -20.8, z: -2.0, rotY: 0.4 },
    { x: 20.8, z: 3.5, rotY: -0.5 },
    { x: -29.5, z: 18.0, rotY: 0.9 },
    { x: 29.0, z: -15.5, rotY: 1.2 },
    { x: -6.5, z: 19.5, rotY: 0.25 },
    { x: 6.5, z: -19.5, rotY: -0.35 },
  ];
  tacticalCoverSpots.forEach((tc, idx) => {
    const gy = groundHeightAt(tc.x, tc.z);
    const cg = new THREE.Group();
    cg.position.set(tc.x, gy, tc.z);
    cg.rotation.y = tc.rotY;
    const slab = new THREE.Mesh(coverSlabGeo, rubbleMat);
    slab.position.set(0, 0.32, 0);
    slab.rotation.set(0.18, 0.2, -0.22);
    slab.castShadow = true;
    slab.receiveShadow = true;
    cg.add(slab);
    for (let r = 0; r < 3; r++) {
      const rk = new THREE.Mesh(coverRockGeo, rubbleMat);
      rk.position.set((r - 1) * 0.72, 0.28 + (r % 2) * 0.16, ((r + idx) % 2 === 0 ? 0.35 : -0.35));
      rk.scale.set(1.2, 0.72, 0.95);
      rk.castShadow = true;
      cg.add(rk);
    }
    scene.add(cg);
    sceneObjects.push(cg);
    ruinObjects.push(cg);
    colliders.push({ x: tc.x, z: tc.z, radius: 1.35, height: 1.1, source: 'ruin' });
  });

  // Overturned Buenos Aires dumpsters (contenedores volcados) + searchable trash sacks
  const dumpBodyGeo = new THREE.BoxGeometry(1.35, 1.05, 1.85);
  const dumpLidGeo = new THREE.BoxGeometry(1.42, 0.14, 1.92);
  const bagGeo = new THREE.DodecahedronGeometry(0.32, 0);
  const trashRingGeo = new THREE.RingGeometry(0.42, 0.56, 20);
  trashRingGeo.rotateX(-Math.PI / 2);
  disposables.push(dumpBodyGeo, dumpLidGeo, bagGeo, trashRingGeo);

  const trashSpots: WorldTrashSpot[] = [];

  const dumpsterSpots = [
    { x: -20.4, z: 7.5, rotY: 0.85, tipped: true },
    { x: 20.4, z: -12.0, rotY: -1.2, tipped: true },
    { x: -35.4, z: -14.5, rotY: 0.3, tipped: false },
    { x: 35.4, z: 16.5, rotY: 2.2, tipped: true },
    { x: -20.6, z: -32.5, rotY: -0.65, tipped: true },
    { x: 20.8, z: 31.0, rotY: 1.4, tipped: false },
    { x: -66.5, z: -38.5, rotY: 0.9, tipped: true },
    { x: 66.5, z: 38.5, rotY: -0.9, tipped: true },
    { x: -35.4, z: 76.0, rotY: 1.1, tipped: false },
    { x: 35.4, z: -76.0, rotY: 2.1, tipped: true },
  ];

  dumpsterSpots.forEach((ds, idx) => {
    const gy = groundHeightAt(ds.x, ds.z);
    const g = new THREE.Group();
    g.position.set(ds.x, gy, ds.z);
    g.rotation.y = ds.rotY;

    const body = new THREE.Mesh(dumpBodyGeo, dumpsterMat);
    const lid = new THREE.Mesh(dumpLidGeo, trashBagMat);
    if (ds.tipped) {
      body.position.set(0, 0.65, 0);
      body.rotation.z = 1.28;
      lid.position.set(0.55, 0.42, 0.12);
      lid.rotation.z = 1.62;
    } else {
      body.position.set(0, 0.55, 0);
      lid.position.set(0, 1.12, 0);
    }
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body, lid);

    for (let b = 0; b < 3; b++) {
      const sack = new THREE.Mesh(bagGeo, trashBagMat);
      const ang = idx * 1.4 + b * 1.9;
      sack.position.set(Math.cos(ang) * 0.95, 0.24, Math.sin(ang) * 0.95);
      sack.scale.set(1.1, 0.72, 0.95);
      g.add(sack);
    }

    const indicatorMat = new THREE.MeshBasicMaterial({
      color: 0xa3e635,
      transparent: true,
      opacity: 0.48,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    disposables.push(indicatorMat);
    const ring = new THREE.Mesh(trashRingGeo, indicatorMat);
    ring.position.set(0, 0.05, 0);
    ring.scale.setScalar(2.4);
    g.add(ring);

    scene.add(g);
    sceneObjects.push(g);
    ruinObjects.push(g);
    colliders.push({ x: ds.x, z: ds.z, radius: 1.15, height: 1.2, source: 'ruin' });
    trashSpots.push({
      id: `dumpster_${idx}`,
      x: ds.x,
      z: ds.z,
      searchedCooldown: 0,
      indicatorMat,
      group: g,
    });
  });

  // Extra street trash bag piles close to Plaza / 9 de Julio
  const streetTrashPiles = [
    { x: -11.5, z: -5.5 },
    { x: 11.8, z: -16.0 },
  ];
  streetTrashPiles.forEach((tp, idx) => {
    const gy = groundHeightAt(tp.x, tp.z);
    const g = new THREE.Group();
    g.position.set(tp.x, gy, tp.z);
    for (let b = 0; b < 4; b++) {
      const sack = new THREE.Mesh(bagGeo, trashBagMat);
      const ang = idx * 1.1 + b * 1.55;
      const rad = b === 0 ? 0.12 : 0.44;
      sack.position.set(Math.cos(ang) * rad, 0.2 + (b === 0 ? 0.14 : 0), Math.sin(ang) * rad);
      sack.scale.set(1.05, 0.74, 0.92);
      sack.castShadow = true;
      g.add(sack);
    }
    const indicatorMat = new THREE.MeshBasicMaterial({
      color: 0xa3e635,
      transparent: true,
      opacity: 0.48,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    disposables.push(indicatorMat);
    const ring = new THREE.Mesh(trashRingGeo, indicatorMat);
    ring.position.set(0, 0.05, 0);
    ring.scale.setScalar(1.6);
    g.add(ring);

    scene.add(g);
    sceneObjects.push(g);
    ruinObjects.push(g);
    trashSpots.push({
      id: `trash_pile_${idx}`,
      x: tp.x,
      z: tp.z,
      searchedCooldown: 0,
      indicatorMat,
      group: g,
    });
  });

  // Damaged Quarantine Warning Signs & Rubble Piles
  const postGeo = new THREE.CylinderGeometry(0.045, 0.055, 2.2, 6);
  postGeo.translate(0, 1.1, 0);
  const boardGeo = new THREE.BoxGeometry(1.45, 1.05, 0.08);
  const rubbleChunkGeo = new THREE.DodecahedronGeometry(0.45, 0);
  disposables.push(postGeo, boardGeo, rubbleChunkGeo);

  const signSpots = [
    { x: -20.5, z: -9.5, rotY: 0.4, tilt: 0.14 },
    { x: 20.5, z: 9.5, rotY: -2.6, tilt: -0.18 },
    { x: -34.0, z: -31.0, rotY: 0.72, tilt: 0.11 },
    { x: 6.8, z: -15.5, rotY: 0.12, tilt: -0.15 },
    { x: -64.0, z: -6.5, rotY: 1.4, tilt: 0.1 },
    { x: 64.0, z: 6.5, rotY: -1.4, tilt: -0.12 },
    { x: -10.0, z: -96.0, rotY: 0.15, tilt: 0.12 },
    { x: 10.0, z: 96.0, rotY: 3.0, tilt: -0.14 },
  ];

  signSpots.forEach((ss, idx) => {
    const gy = groundHeightAt(ss.x, ss.z);
    const sg = new THREE.Group();
    sg.position.set(ss.x, gy, ss.z);
    sg.rotation.y = ss.rotY;
    sg.rotation.z = ss.tilt;

    const post = new THREE.Mesh(postGeo, signPostMat);
    post.castShadow = true;
    const board = new THREE.Mesh(boardGeo, quarantineMat);
    board.position.set(0, 1.72, 0);
    board.castShadow = true;
    sg.add(post, board);

    for (let r = 0; r < 4; r++) {
      const rock = new THREE.Mesh(rubbleChunkGeo, rubbleMat);
      const a = idx + r * 1.55;
      rock.position.set(Math.cos(a) * 0.75, 0.18, Math.sin(a) * 0.75);
      rock.scale.set(1 + (r % 2) * 0.4, 0.55, 0.9);
      rock.rotation.set(r * 0.5, a, 0.3);
      sg.add(rock);
    }

    scene.add(sg);
    sceneObjects.push(sg);
    ruinObjects.push(sg);
    colliders.push({ x: ss.x, z: ss.z, radius: 0.68, height: 2.1, source: 'ruin' });
  });

  return { trashSpots };
}

function buildPerimeterBarricades(
  scene: THREE.Scene,
  stoneTex: THREE.CanvasTexture,
  sceneObjects: THREE.Object3D[],
  ruinObjects: THREE.Object3D[],
  colliders: WorldCollider[],
  disposables: { dispose: () => void }[],
  windTimeUniform: { value: number },
  burningSpots: { x: number; y: number; z: number; radius: number }[],
) {
  const root = new THREE.Group();
  const dummy = new THREE.Object3D();

  // Shared post-apocalyptic barricade materials
  const burntHullMat = new THREE.MeshStandardMaterial({
    color: 0x1b1d20,
    roughness: 0.9,
    metalness: 0.25,
  });
  const scorchedRustMat = new THREE.MeshStandardMaterial({
    color: 0x4b2a1e,
    roughness: 0.86,
    metalness: 0.3,
  });
  const carSlateMat = new THREE.MeshStandardMaterial({
    color: 0x3b4452,
    roughness: 0.68,
    metalness: 0.35,
  });
  const taxiRoofMat = new THREE.MeshStandardMaterial({
    color: 0xc29315,
    roughness: 0.6,
    metalness: 0.25,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x121417,
    roughness: 0.95,
    metalness: 0.04,
  });
  const concreteRubbleMat = new THREE.MeshStandardMaterial({
    map: stoneTex,
    color: 0x626973,
    roughness: 0.94,
    metalness: 0.06,
  });
  const collapsedWallMat = new THREE.MeshStandardMaterial({
    map: stoneTex,
    color: 0x766e64,
    roughness: 0.92,
    metalness: 0.05,
  });
  const rebarSteelMat = new THREE.MeshStandardMaterial({
    color: 0x5c3628,
    roughness: 0.62,
    metalness: 0.72,
  });
  const emberGlowMat = new THREE.MeshStandardMaterial({
    color: 0xff6a1a,
    emissive: new THREE.Color(0xff4d0a),
    emissiveIntensity: 2.1,
    roughness: 0.4,
  });
  disposables.push(
    burntHullMat,
    scorchedRustMat,
    carSlateMat,
    taxiRoofMat,
    tireMat,
    concreteRubbleMat,
    collapsedWallMat,
    rebarSteelMat,
    emberGlowMat,
  );

  // 1. BURNT & OVERTURNED COLECTIVOS blocking major street exits
  const busSpecs: {
    x: number;
    z: number;
    rotY: number;
    rollZ: number;
    pitchX: number;
    lit?: boolean;
  }[] = [
    // North Av. 9 de Julio exit (z ~ -114)
    { x: -24.5, z: -115.0, rotY: 1.32, rollZ: 0.14, pitchX: 0.05, lit: true },
    { x: 1.5, z: -115.8, rotY: 1.68, rollZ: -1.38, pitchX: 0.04, lit: true },
    { x: 25.5, z: -114.6, rotY: 1.44, rollZ: -0.18, pitchX: -0.05 },
    // South Av. 9 de Julio exit (z ~ +114)
    { x: -23.0, z: 115.0, rotY: -1.42, rollZ: -1.35, pitchX: 0.04, lit: true },
    { x: 3.5, z: 115.4, rotY: 1.52, rollZ: 0.16, pitchX: -0.05, lit: true },
    { x: 26.5, z: 114.8, rotY: 1.72, rollZ: 0.22, pitchX: 0.04 },
    // Libertad & Suipacha N/S exits
    { x: -70.5, z: -115.2, rotY: 1.48, rollZ: 0.12, pitchX: 0 },
    { x: 70.5, z: -115.2, rotY: 1.66, rollZ: -1.36, pitchX: 0 },
    { x: -70.5, z: 115.2, rotY: -1.46, rollZ: -0.14, pitchX: 0 },
    { x: 70.5, z: 115.2, rotY: 1.58, rollZ: 1.32, pitchX: 0 },
    // West & East cross-street exits (Av. Corrientes, Lavalle, Sarmiento, Córdoba, Rivadavia)
    { x: -105.5, z: -1.8, rotY: 0.16, rollZ: 0.18, pitchX: 0.05, lit: true },
    { x: 105.5, z: 1.6, rotY: -0.14, rollZ: -1.34, pitchX: -0.04, lit: true },
    { x: -105.2, z: -40.0, rotY: -0.22, rollZ: 0.12, pitchX: 0 },
    { x: 105.2, z: -40.0, rotY: 0.24, rollZ: -0.16, pitchX: 0 },
    { x: -105.2, z: 40.0, rotY: 0.18, rollZ: -1.32, pitchX: 0 },
    { x: 105.2, z: 40.0, rotY: -0.18, rollZ: 0.14, pitchX: 0 },
    { x: -105.2, z: -78.0, rotY: 0.12, rollZ: 0.1, pitchX: 0 },
    { x: 105.2, z: 78.0, rotY: -0.15, rollZ: -0.15, pitchX: 0 },
  ];

  const busBodyGeo = new THREE.BoxGeometry(2.42, 2.38, 8.4);
  const busEmberGeo = new THREE.BoxGeometry(2.02, 0.55, 6.2);
  const busTireGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.34, 10);
  busTireGeo.rotateZ(Math.PI / 2);
  disposables.push(busBodyGeo, busEmberGeo, busTireGeo);

  const busHullInst = new THREE.InstancedMesh(busBodyGeo, burntHullMat, busSpecs.length);
  const busEmberInst = new THREE.InstancedMesh(busEmberGeo, emberGlowMat, busSpecs.length);
  const busTireInst = new THREE.InstancedMesh(busTireGeo, tireMat, busSpecs.length * 4);
  busHullInst.receiveShadow = true;

  let busTireIdx = 0;
  const qRot = new THREE.Quaternion();
  const eul = new THREE.Euler();
  const localPos = new THREE.Vector3();
  const matPos = new THREE.Vector3();
  const matScale = new THREE.Vector3(1, 1, 1);

  busSpecs.forEach((bs, idx) => {
    const gy = groundHeightAt(bs.x, bs.z);
    const yLift = Math.abs(bs.rollZ) > 0.8 ? 1.28 : 1.48;
    eul.set(bs.pitchX, bs.rotY, bs.rollZ, 'YXZ');
    qRot.setFromEuler(eul);

    matPos.set(bs.x, gy + yLift, bs.z);
    dummy.position.copy(matPos);
    dummy.quaternion.copy(qRot);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    busHullInst.setMatrixAt(idx, dummy.matrix);

    // Glowing burnt engine/interior ember core slightly visible through broken frame
    localPos.set(0, 0.18, 0).applyQuaternion(qRot).add(matPos);
    dummy.position.copy(localPos);
    dummy.scale.set(1.04, 0.9, 0.92);
    dummy.updateMatrix();
    busEmberInst.setMatrixAt(idx, dummy.matrix);

    const wheelOffsets: [number, number][] = [
      [-1.12, 2.45],
      [1.12, 2.45],
      [-1.12, -2.45],
      [1.12, -2.45],
    ];
    wheelOffsets.forEach(([wx, wz]) => {
      localPos.set(wx, -1.02, wz).applyQuaternion(qRot).add(matPos);
      dummy.position.copy(localPos);
      dummy.quaternion.copy(qRot);
      dummy.scale.copy(matScale);
      dummy.updateMatrix();
      busTireInst.setMatrixAt(busTireIdx++, dummy.matrix);
    });

    // Realistic uneven flames + ember glow + smoke spots on burning avenue blockades
    if (bs.lit) {
      const fireGlow = new THREE.PointLight(0xff5a18, 3.6, 18, 1.5);
      fireGlow.position.set(bs.x, gy + 2.2, bs.z);
      root.add(fireGlow);
      const busFire = buildFlameCluster({
        radius: 0.95,
        minHeight: 0.85,
        maxHeight: 2.15,
        minWidth: 0.55,
        maxWidth: 1.05,
        outerCount: 12,
        coreCount: 7,
        speed: 1.35,
        seedOffset: idx * 7 + 3,
        sharedTimeUniform: windTimeUniform,
      });
      busFire.group.position.set(bs.x, gy + 1.35, bs.z);
      root.add(busFire.group);
      disposables.push(busFire);
      burningSpots.push({ x: bs.x, y: gy + 1.85, z: bs.z, radius: 1.05 });
    }

    // 3 overlapping colliders along bus length
    const fwdX = Math.sin(bs.rotY);
    const fwdZ = Math.cos(bs.rotY);
    [-2.7, 0, 2.7].forEach((offset) => {
      colliders.push({
        x: bs.x + fwdX * offset,
        z: bs.z + fwdZ * offset,
        radius: 1.75,
        height: 3.1,
        source: 'ruin',
      });
    });
  });
  busHullInst.computeBoundingSphere();
  busEmberInst.computeBoundingSphere();
  busTireInst.computeBoundingSphere();
  root.add(busHullInst, busEmberInst, busTireInst);

  // 2. PILED-UP WRECKED CARS & TAXIS along the perimeter barricades
  interface PiledCarSpec {
    x: number;
    yOff: number;
    z: number;
    rotY: number;
    pitchX: number;
    rollZ: number;
    matIdx: 0 | 1 | 2;
  }
  const piledCars: PiledCarSpec[] = [];
  const addCarPileCluster = (cx: number, cz: number, alongX: boolean, seed: number) => {
    const offsets = alongX
      ? [
          { dx: -2.8, dz: 0.4, dy: 0, ry: 0.25, px: 0.04, rz: 0.08 },
          { dx: 0.6, dz: -0.5, dy: 0, ry: -0.32, px: -0.05, rz: -0.06 },
          { dx: 3.4, dz: 0.3, dy: 0, ry: 0.45, px: 0.02, rz: 0.12 },
          { dx: -0.9, dz: 0.1, dy: 0.92, ry: 0.72, px: 0.22, rz: -0.28 },
        ]
      : [
          { dx: 0.4, dz: -2.8, dy: 0, ry: Math.PI / 2 + 0.25, px: 0.05, rz: -0.09 },
          { dx: -0.5, dz: 0.6, dy: 0, ry: Math.PI / 2 - 0.35, px: -0.04, rz: 0.08 },
          { dx: 0.3, dz: 3.4, dy: 0, ry: Math.PI / 2 + 0.42, px: 0.03, rz: -0.11 },
          { dx: 0.1, dz: -0.8, dy: 0.92, ry: Math.PI / 2 + 0.78, px: -0.2, rz: 0.26 },
        ];
    offsets.forEach((o, i) => {
      piledCars.push({
        x: cx + o.dx,
        yOff: o.dy,
        z: cz + o.dz,
        rotY: o.ry + Math.sin(seed + i * 2.1) * 0.25,
        pitchX: o.px,
        rollZ: o.rz,
        matIdx: ((seed + i) % 3) as 0 | 1 | 2,
      });
    });
  };

  // Place piled car clusters ONLY at street mouths (bocacalles)
  // Av. 9 de Julio North (z = -114.6) & South (z = +114.6)
  addCarPileCluster(-33.5, -114.6, true, 1);
  addCarPileCluster(-13.5, -114.2, true, 2);
  addCarPileCluster(13.8, -114.6, true, 3);
  addCarPileCluster(33.5, -114.4, true, 4);
  addCarPileCluster(-33.5, 114.6, true, 5);
  addCarPileCluster(-14.0, 114.4, true, 6);
  addCarPileCluster(13.5, 114.6, true, 7);
  addCarPileCluster(33.5, 114.5, true, 8);

  // Calle Libertad & Calle Suipacha North/South bocacalles
  addCarPileCluster(-70.5, -114.2, true, 9);
  addCarPileCluster(70.5, -114.2, true, 10);
  addCarPileCluster(-70.5, 114.2, true, 11);
  addCarPileCluster(70.5, 114.2, true, 12);

  // Av. Corrientes West & East bocacalles
  addCarPileCluster(-104.8, -5.2, false, 13);
  addCarPileCluster(-104.8, 5.2, false, 14);
  addCarPileCluster(104.8, -5.2, false, 15);
  addCarPileCluster(104.8, 5.2, false, 16);

  // Lavalle, Córdoba, Sarmiento & Rivadavia West/East bocacalles
  addCarPileCluster(-104.8, -40.0, false, 17);
  addCarPileCluster(104.8, -40.0, false, 18);
  addCarPileCluster(-104.8, 40.0, false, 19);
  addCarPileCluster(104.8, 40.0, false, 20);
  addCarPileCluster(-104.8, -78.0, false, 21);
  addCarPileCluster(104.8, -78.0, false, 22);
  addCarPileCluster(-104.8, 78.0, false, 23);
  addCarPileCluster(104.8, 78.0, false, 24);

  // 4 outer corner street ends (x ~ ±101.5, z ~ ±111.5)
  addCarPileCluster(-102.0, -114.2, true, 25);
  addCarPileCluster(102.0, -114.2, true, 26);
  addCarPileCluster(-102.0, 114.2, true, 27);
  addCarPileCluster(102.0, 114.2, true, 28);

  const pCarHullGeo = new THREE.BoxGeometry(1.82, 0.72, 4.15);
  const pCarCabinGeo = new THREE.BoxGeometry(1.56, 0.56, 2.05);
  const pCarWheelGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.24, 8);
  pCarWheelGeo.rotateZ(Math.PI / 2);
  disposables.push(pCarHullGeo, pCarCabinGeo, pCarWheelGeo);

  const pHullRustInst = new THREE.InstancedMesh(pCarHullGeo, scorchedRustMat, piledCars.length);
  const pHullSlateInst = new THREE.InstancedMesh(pCarHullGeo, carSlateMat, piledCars.length);
  const pHullBurntInst = new THREE.InstancedMesh(pCarHullGeo, burntHullMat, piledCars.length);
  const pCabTaxiInst = new THREE.InstancedMesh(pCarCabinGeo, taxiRoofMat, piledCars.length);
  const pCabDarkInst = new THREE.InstancedMesh(pCarCabinGeo, burntHullMat, piledCars.length);
  const pCarWheelInst = new THREE.InstancedMesh(pCarWheelGeo, tireMat, piledCars.length * 4);

  let rCount = 0;
  let sCount = 0;
  let bCount = 0;
  let ctCount = 0;
  let cdCount = 0;
  let pwCount = 0;

  piledCars.forEach((pc) => {
    const gy = groundHeightAt(pc.x, pc.z);
    eul.set(pc.pitchX, pc.rotY, pc.rollZ, 'YXZ');
    qRot.setFromEuler(eul);
    matPos.set(pc.x, gy + 0.62 + pc.yOff, pc.z);

    dummy.position.copy(matPos);
    dummy.quaternion.copy(qRot);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    if (pc.matIdx === 0) pHullRustInst.setMatrixAt(rCount++, dummy.matrix);
    else if (pc.matIdx === 1) pHullSlateInst.setMatrixAt(sCount++, dummy.matrix);
    else pHullBurntInst.setMatrixAt(bCount++, dummy.matrix);

    localPos.set(0, 0.58, -0.12).applyQuaternion(qRot).add(matPos);
    dummy.position.copy(localPos);
    dummy.updateMatrix();
    if (pc.matIdx === 2) pCabTaxiInst.setMatrixAt(ctCount++, dummy.matrix);
    else pCabDarkInst.setMatrixAt(cdCount++, dummy.matrix);

    [
      [-0.86, 1.25],
      [0.86, 1.25],
      [-0.86, -1.25],
      [0.86, -1.25],
    ].forEach(([wx, wz]) => {
      localPos.set(wx, -0.28, wz).applyQuaternion(qRot).add(matPos);
      dummy.position.copy(localPos);
      dummy.updateMatrix();
      pCarWheelInst.setMatrixAt(pwCount++, dummy.matrix);
    });

    if (pc.yOff === 0) {
      colliders.push({ x: pc.x, z: pc.z, radius: 1.85, height: 1.65, source: 'ruin' });
    }
  });

  pHullRustInst.count = rCount;
  pHullSlateInst.count = sCount;
  pHullBurntInst.count = bCount;
  pCabTaxiInst.count = ctCount;
  pCabDarkInst.count = cdCount;
  pCarWheelInst.count = pwCount;
  [pHullRustInst, pHullSlateInst, pHullBurntInst, pCabTaxiInst, pCabDarkInst, pCarWheelInst].forEach((inst) => {
    inst.computeBoundingSphere();
    root.add(inst);
  });

  // 3. CONCRETE JERSEY BARRIERS, HEAVY RUBBLE & COLLAPSED CORNER STRUCTURES ONLY AT BOCACALLES
  const jerseyGeo = new THREE.BoxGeometry(0.95, 1.35, 3.8);
  const rubbleBoulderGeo = new THREE.DodecahedronGeometry(1.15, 0);
  const slabGeo = new THREE.BoxGeometry(7.2, 1.1, 4.8);
  const ruinHuskGeo = new THREE.BoxGeometry(10.5, 12.0, 9.5);
  const rebarGeo = new THREE.BoxGeometry(0.16, 4.2, 0.16);
  disposables.push(jerseyGeo, rubbleBoulderGeo, slabGeo, ruinHuskGeo, rebarGeo);

  const barrierPlacements: { x: number; z: number; rotY: number }[] = [];
  const rubblePlacements: { x: number; y: number; z: number; sx: number; sy: number; sz: number; rx: number; ry: number; rz: number }[] = [];
  const collapsedBuildings: { x: number; z: number; sx: number; sy: number; sz: number; rx: number; ry: number; rz: number }[] = [];

  const sealBocacalleEW = (zPos: number, xStart: number, xEnd: number, inwardSign: number) => {
    for (let x = xStart; x <= xEnd; x += 3.1) {
      const jitterZ = Math.sin(x * 0.43 + zPos) * 0.45;
      const yaw = Math.PI / 2 + Math.sin(x * 0.57) * 0.16;
      barrierPlacements.push({ x, z: zPos + jitterZ, rotY: yaw });
      colliders.push({ x, z: zPos + jitterZ, radius: 2.1, height: 3.4, source: 'ruin' });
      rubblePlacements.push({
        x: x + Math.sin(x * 0.9) * 0.65,
        y: 0.45,
        z: zPos + inwardSign * 1.35,
        sx: 1.3 + (Math.abs(Math.round(x)) % 3) * 0.3,
        sy: 0.78 + (Math.abs(Math.round(x)) % 2) * 0.42,
        sz: 1.4,
        rx: x * 0.4,
        ry: x * 0.7,
        rz: inwardSign * 0.4,
      });
    }
  };

  const sealBocacalleNS = (xPos: number, zStart: number, zEnd: number, inwardSign: number) => {
    for (let z = zStart; z <= zEnd; z += 3.1) {
      const jitterX = Math.sin(z * 0.41 + xPos) * 0.45;
      const yaw = Math.sin(z * 0.51) * 0.16;
      barrierPlacements.push({ x: xPos + jitterX, z, rotY: yaw });
      colliders.push({ x: xPos + jitterX, z, radius: 2.1, height: 3.4, source: 'ruin' });
      rubblePlacements.push({
        x: xPos + inwardSign * 1.35,
        y: 0.45,
        z: z + Math.cos(z * 0.85) * 0.65,
        sx: 1.4,
        sy: 0.8 + (Math.abs(Math.round(z)) % 2) * 0.4,
        sz: 1.3 + (Math.abs(Math.round(z)) % 3) * 0.3,
        rx: z * 0.35,
        ry: z * 0.65,
        rz: inwardSign * 0.4,
      });
    }
  };

  // North & South Bocacalles: Av. 9 de Julio, Calle Libertad, Calle Suipacha & Outer Corner Alleys
  [-114.6, 114.6].forEach((bz) => {
    const inward = bz < 0 ? 1 : -1;
    sealBocacalleEW(bz, -36.5, 36.5, inward); // Av. 9 de Julio
    sealBocacalleEW(bz, -76.5, -64.5, inward); // Calle Libertad
    sealBocacalleEW(bz, 64.5, 76.5, inward); // Calle Suipacha
    sealBocacalleEW(bz, -105.5, -98.5, inward); // Calle exterior Oeste
    sealBocacalleEW(bz, 98.5, 105.5, inward); // Calle exterior Este
  });

  // West & East Bocacalles: Av. Corrientes, Lavalle, Córdoba, Sarmiento, Rivadavia & Outer Corner Streets
  [-104.8, 104.8].forEach((bx) => {
    const inward = bx < 0 ? 1 : -1;
    sealBocacalleNS(bx, -8.5, 8.5, inward); // Av. Corrientes
    sealBocacalleNS(bx, -46.0, -34.0, inward); // Lavalle
    sealBocacalleNS(bx, -84.0, -72.0, inward); // Córdoba
    sealBocacalleNS(bx, 34.0, 46.0, inward); // Sarmiento
    sealBocacalleNS(bx, 72.0, 84.0, inward); // Rivadavia
    sealBocacalleNS(bx, -114.5, -107.0, inward); // Esquina Norte
    sealBocacalleNS(bx, 107.0, 114.5, inward); // Esquina Sur
  });

  // Collapsed corner-building structures spilling rubble ONLY at main avenue bocacalles (9 de Julio & Corrientes)
  const cornerRuins = [
    { x: -37.5, z: -119.0, sx: 1.05, sy: 0.85, sz: 0.95, rx: 0.25, ry: 0.22, rz: -0.18 },
    { x: 37.5, z: -119.0, sx: 1.05, sy: 0.78, sz: 0.95, rx: 0.22, ry: -0.24, rz: 0.2 },
    { x: -37.5, z: 119.0, sx: 1.05, sy: 0.82, sz: 0.95, rx: -0.24, ry: -0.18, rz: -0.16 },
    { x: 37.5, z: 119.0, sx: 1.05, sy: 0.88, sz: 0.95, rx: -0.26, ry: 0.2, rz: 0.22 },
    { x: -109.5, z: -9.5, sx: 0.95, sy: 0.8, sz: 1.05, rx: 0.18, ry: 0.24, rz: -0.26 },
    { x: 109.5, z: 9.5, sx: 0.95, sy: 0.84, sz: 1.05, rx: -0.2, ry: -0.22, rz: 0.26 },
  ];
  collapsedBuildings.push(...cornerRuins);

  const jerseyInst = new THREE.InstancedMesh(jerseyGeo, concreteRubbleMat, barrierPlacements.length);
  barrierPlacements.forEach((bp, i) => {
    const gy = groundHeightAt(bp.x, bp.z);
    dummy.position.set(bp.x, gy + 0.66, bp.z);
    dummy.rotation.set(0, bp.rotY, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    jerseyInst.setMatrixAt(i, dummy.matrix);
  });
  jerseyInst.computeBoundingSphere();
  root.add(jerseyInst);

  const rubbleInst = new THREE.InstancedMesh(rubbleBoulderGeo, concreteRubbleMat, rubblePlacements.length);
  rubblePlacements.forEach((rp, i) => {
    const gy = groundHeightAt(rp.x, rp.z);
    dummy.position.set(rp.x, gy + rp.y, rp.z);
    dummy.rotation.set(rp.rx, rp.ry, rp.rz);
    dummy.scale.set(rp.sx, rp.sy, rp.sz);
    dummy.updateMatrix();
    rubbleInst.setMatrixAt(i, dummy.matrix);
  });
  rubbleInst.computeBoundingSphere();
  root.add(rubbleInst);

  const ruinHuskInst = new THREE.InstancedMesh(ruinHuskGeo, collapsedWallMat, collapsedBuildings.length);
  const slabInst = new THREE.InstancedMesh(slabGeo, concreteRubbleMat, collapsedBuildings.length * 2);
  const rebarInst = new THREE.InstancedMesh(rebarGeo, rebarSteelMat, collapsedBuildings.length * 3);
  let slabIdx = 0;
  let rebarIdx = 0;

  collapsedBuildings.forEach((cb, i) => {
    const gy = groundHeightAt(cb.x, cb.z);
    eul.set(cb.rx, cb.ry, cb.rz, 'YXZ');
    qRot.setFromEuler(eul);

    dummy.position.set(cb.x, gy + cb.sy * 4.2, cb.z);
    dummy.quaternion.copy(qRot);
    dummy.scale.set(cb.sx, cb.sy, cb.sz);
    dummy.updateMatrix();
    ruinHuskInst.setMatrixAt(i, dummy.matrix);

    // Tilted collapsed concrete roof/floor slabs jutting toward the playable boundary
    for (let s = 0; s < 2; s++) {
      const inwardX = cb.x > 80 ? -3.8 : cb.x < -80 ? 3.8 : (s === 0 ? -2.2 : 2.2);
      const inwardZ = cb.z > 85 ? -3.8 : cb.z < -85 ? 3.8 : (s === 0 ? -2.2 : 2.2);
      dummy.position.set(cb.x + inwardX, gy + 1.15 + s * 1.45, cb.z + inwardZ);
      dummy.rotation.set(cb.rx * 1.5 + s * 0.25, cb.ry + s * 0.7, cb.rz * 1.4 - s * 0.3);
      dummy.scale.set(1.0 + s * 0.22, 1, 1.0 + (1 - s) * 0.2);
      dummy.updateMatrix();
      slabInst.setMatrixAt(slabIdx++, dummy.matrix);
    }

    // Protruding twisted steel rebar beams
    for (let r = 0; r < 3; r++) {
      dummy.position.set(
        cb.x + (r - 1) * 2.1,
        gy + 2.4 + (r % 2) * 1.8,
        cb.z + ((r + i) % 2 === 0 ? 1.4 : -1.4),
      );
      dummy.rotation.set(0.45 + r * 0.25, i + r * 1.1, -0.38 + r * 0.2);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      rebarInst.setMatrixAt(rebarIdx++, dummy.matrix);
    }
  });
  ruinHuskInst.computeBoundingSphere();
  slabInst.count = slabIdx;
  slabInst.computeBoundingSphere();
  rebarInst.count = rebarIdx;
  rebarInst.computeBoundingSphere();
  root.add(ruinHuskInst, slabInst, rebarInst);

  scene.add(root);
  sceneObjects.push(root);
  ruinObjects.push(root);
}

export function buildWorldEnvironment(
  scene: THREE.Scene,
  groundTex: THREE.CanvasTexture,
  groundBumpTex: THREE.CanvasTexture,
  barkTex: THREE.CanvasTexture,
  stoneTex: THREE.CanvasTexture,
  skyTex: THREE.CanvasTexture,
): WorldEnvironment {
  const disposables: { dispose: () => void }[] = [];
  const windTimeUniform = { value: 0 };
  const burningSpots: { x: number; y: number; z: number; radius: number }[] = [];
  const sceneObjects: THREE.Object3D[] = [];
  const ruinObjects: THREE.Object3D[] = [];
  const forestObjects: THREE.Object3D[] = [];
  const citySurfaceObjects: THREE.Object3D[] = [];
  const nightGlowMats: {
    mat: THREE.MeshStandardMaterial;
    dayIntensity: number;
    nightIntensity: number;
  }[] = [];

  const baTex = createBuenosAiresTextures(8);
  disposables.push(baTex);

  void skyTex;
  // Overcast post-apocalyptic storm-cloud sky dome (layered FBM clouds during day, sunset glow & midnight night sky)
  const skyGeo = new THREE.SphereGeometry(320, 28, 18);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      uSunDir: { value: new THREE.Vector3(0.55, 0.72, 0.42).normalize() },
      uDayFactor: { value: 1.0 },
      uTwilight: { value: 0.0 },
      uTime: { value: 0.0 },
      uZenithColor: { value: new THREE.Color(0x2e3531) },
      uHorizonColor: { value: new THREE.Color(0x7c857c) },
      uSunGlowColor: { value: new THREE.Color(0x9fa89c) },
    },
    vertexShader: `
      varying vec3 vWorldDir;
      void main() {
        vWorldDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uSunDir;
      uniform float uDayFactor;
      uniform float uTwilight;
      uniform float uTime;
      uniform vec3 uZenithColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uSunGlowColor;
      varying vec3 vWorldDir;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }
      float vnoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        float a = hash21(i);
        float b = hash21(i + vec2(1.0, 0.0));
        float c = hash21(i + vec2(0.0, 1.0));
        float d = hash21(i + vec2(1.0, 1.0));
        return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
      }
      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 4; i++) {
          v += a * vnoise(p);
          p *= 2.08;
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec3 dir = normalize(vWorldDir);
        float h = clamp(dir.y, 0.0, 1.0);
        float grad = pow(1.0 - h, 1.85);
        vec3 col = mix(uZenithColor, uHorizonColor, grad);

        // Layered overcast storm clouds projected on sky plane
        vec2 cloudUv = dir.xz / (max(0.11, h + 0.11)) * 1.45 + vec2(uTime * 0.008, uTime * 0.004);
        float c1 = fbm(cloudUv);
        float c2 = fbm(cloudUv * 2.15 - vec2(uTime * 0.011, 0.0));
        float stormDensity = smoothstep(0.28, 0.82, c1 * 0.68 + c2 * 0.32);
        float cloudFade = smoothstep(0.01, 0.16, h);

        vec3 darkCloud = uZenithColor * 0.68;
        vec3 paleBreak = mix(uHorizonColor, vec3(0.72, 0.76, 0.71), 0.45);
        vec3 cloudCol = mix(paleBreak, darkCloud, stormDensity);
        col = mix(col, cloudCol, cloudFade * (0.18 + 0.74 * uDayFactor));

        float sunDot = max(dot(dir, normalize(uSunDir)), 0.0);
        float sunScatter = pow(sunDot, 4.2) * (0.14 * uDayFactor + 0.58 * uTwilight);
        float horizonGlow = pow(1.0 - abs(dir.y), 5.5) * (0.42 * uTwilight + 0.08 * (1.0 - uDayFactor));
        col += uSunGlowColor * (sunScatter + horizonGlow * (0.25 + pow(sunDot, 2.2) * 0.75));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const skyDome = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skyDome);
  sceneObjects.push(skyDome);
  disposables.push(skyGeo, skyMat);

  const sunGeo = new THREE.CircleGeometry(13.5, 24);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff3c4, fog: false });
  const sunDisc = new THREE.Mesh(sunGeo, sunMat);
  sunDisc.position.set(130, 155, 100);
  sunDisc.lookAt(0, 0, 0);
  scene.add(sunDisc);
  sceneObjects.push(sunDisc);
  disposables.push(sunGeo, sunMat);

  const sunHaloGeo = new THREE.CircleGeometry(40, 24);
  const sunHaloMat = new THREE.MeshBasicMaterial({
    color: 0xfdba74,
    transparent: true,
    opacity: 0.34,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  const sunHalo = new THREE.Mesh(sunHaloGeo, sunHaloMat);
  sunHalo.position.set(129, 154, 99);
  sunHalo.lookAt(0, 0, 0);
  scene.add(sunHalo);
  sceneObjects.push(sunHalo);
  disposables.push(sunHaloGeo, sunHaloMat);

  const moonTex = createMoonTexture();
  const moonGeo = new THREE.CircleGeometry(11.5, 24);
  const moonMat = new THREE.MeshBasicMaterial({ map: moonTex, color: 0xeaf2ff, fog: false });
  const moonMesh = new THREE.Mesh(moonGeo, moonMat);
  moonMesh.position.set(-130, 155, -100);
  moonMesh.lookAt(0, 0, 0);
  scene.add(moonMesh);
  sceneObjects.push(moonMesh);
  disposables.push(moonTex, moonGeo, moonMat);

  const moonHaloGeo = new THREE.CircleGeometry(32, 24);
  const moonHaloMat = new THREE.MeshBasicMaterial({
    color: 0x93c5fd,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  const moonHalo = new THREE.Mesh(moonHaloGeo, moonHaloMat);
  moonHalo.position.set(-129, 154, -99);
  moonHalo.lookAt(0, 0, 0);
  scene.add(moonHalo);
  sceneObjects.push(moonHalo);
  disposables.push(moonHaloGeo, moonHaloMat);

  // Realistic multi-color twinkling night sky starfield + subtle Milky Way band
  const starCount = 820;
  const starPositions = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);
  const starSizes = new Float32Array(starCount);
  const starPhases = new Float32Array(starCount);
  const cStarWarm = new THREE.Color(0xffe7b8);
  const cStarWhite = new THREE.Color(0xf8fafc);
  const cStarCool = new THREE.Color(0xa5cbff);
  const cStarTmp = new THREE.Color();

  for (let i = 0; i < starCount; i++) {
    const h1 = Math.abs((Math.sin(i * 12.9898 + 1.7) * 43758.5453) % 1);
    const h2 = Math.abs((Math.sin(i * 78.233 + 3.1) * 29431.7123) % 1);
    const h3 = Math.abs((Math.sin(i * 39.425 + 7.3) * 19283.4123) % 1);
    const theta = (i * 2.399963) % (Math.PI * 2);
    // Concentrate ~38% of stars along a tilted diagonal galactic band
    const inMilkyWay = i % 5 < 2;
    let phi: number;
    if (inMilkyWay) {
      const bandCenter = 0.62 + Math.sin(theta + 0.8) * 0.34;
      phi = THREE.MathUtils.clamp(bandCenter + (h1 - 0.5) * 0.28, 0.1, 1.48);
    } else {
      phi = 0.08 + Math.pow(h1, 0.72) * 1.4;
    }
    const rad = 294;
    starPositions[i * 3] = Math.cos(theta) * Math.cos(phi) * rad;
    starPositions[i * 3 + 1] = Math.sin(phi) * rad;
    starPositions[i * 3 + 2] = Math.sin(theta) * Math.cos(phi) * rad;

    if (h2 < 0.22) cStarTmp.copy(cStarWarm);
    else if (h2 < 0.65) cStarTmp.copy(cStarWhite);
    else cStarTmp.copy(cStarCool);
    const bright = inMilkyWay ? 0.65 + h3 * 0.35 : 0.78 + h3 * 0.22;
    starColors[i * 3] = cStarTmp.r * bright;
    starColors[i * 3 + 1] = cStarTmp.g * bright;
    starColors[i * 3 + 2] = cStarTmp.b * bright;

    starSizes[i] = i % 19 === 0 ? 4.2 + h3 * 2.0 : inMilkyWay ? 1.4 + h3 * 1.8 : 1.7 + h3 * 2.4;
    starPhases[i] = h2 * 10.0;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  starGeo.setAttribute('aColor', new THREE.BufferAttribute(starColors, 3));
  starGeo.setAttribute('aSize', new THREE.BufferAttribute(starSizes, 1));
  starGeo.setAttribute('aPhase', new THREE.BufferAttribute(starPhases, 1));

  const starMat = new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: { value: 0.9 },
      uTime: { value: 0.0 },
      uPixelRatio: { value: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1 },
    },
    vertexShader: `
      attribute float aSize;
      attribute float aPhase;
      attribute vec3 aColor;
      uniform float uTime;
      uniform float uPixelRatio;
      varying vec3 vColor;
      varying float vTwinkle;
      void main() {
        vColor = aColor;
        vTwinkle = 0.66 + 0.34 * sin(uTime * (1.25 + mod(aPhase, 2.4)) + aPhase * 6.28318);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = clamp(aSize * uPixelRatio * (340.0 / max(90.0, -mvPosition.z)), 1.4, 9.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying vec3 vColor;
      varying float vTwinkle;
      void main() {
        vec2 cxy = 2.0 * gl_PointCoord - 1.0;
        float r2 = dot(cxy, cxy);
        if (r2 > 1.0) discard;
        float core = exp(-r2 * 4.8);
        float halo = pow(1.0 - r2, 1.8) * 0.42;
        float alpha = clamp((core + halo) * uOpacity * vTwinkle, 0.0, 1.0);
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);
  sceneObjects.push(stars);
  disposables.push(starGeo, starMat);

  // Terrain mesh: wide Avenida 9 de Julio asphalt, Metrobus lanes, Plaza de la República & 3N/3S/2E/2W street grid
  const segs = 168;
  const terrainGeo = new THREE.PlaneGeometry(WORLD_TERRAIN_SIZE, WORLD_TERRAIN_SIZE, segs, segs);
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(posAttr.count * 3);
  const cAsphalt = new THREE.Color(0x1b1f21);
  const cMetrobus = new THREE.Color(0x252a2b);
  const cPlazaStone = new THREE.Color(0x454946);
  const cSidewalk = new THREE.Color(0x373c3a);
  const cGrass = new THREE.Color(0x1f361a);
  const cPotholeMud = new THREE.Color(0x29221a);
  const tmpColor = new THREE.Color();

  const paintBuenosAiresVertex = (vx: number, vz: number, vy: number) => {
    const ax = Math.abs(vx);
    const az = Math.abs(vz);
    const onCross = isCrossStreetZ(az);
    const onPlaza = ax < 10.5 && az < 12.0;
    const onPlazaLawn = ax < 8.4 && ((vz > -10.5 && vz < -6.0) || (vz > 4.2 && vz < 9.2));
    const onMetrobus = ax >= 11.2 && ax <= 18.2 && !onCross;
    const onBlockSidewalk =
      (!onCross &&
        ((ax >= 36.0 && ax <= 65.0) || (ax >= 76.0 && ax <= 100.0) || ax >= 104.5)) ||
      (az >= 115.0 && ax >= 36.0);

    if (onPlazaLawn) {
      tmpColor.copy(cGrass);
    } else if (onPlaza) {
      tmpColor.copy(cPlazaStone);
    } else if (onMetrobus) {
      tmpColor.copy(cMetrobus);
    } else if (onBlockSidewalk) {
      tmpColor.copy(cSidewalk);
    } else {
      tmpColor.copy(cAsphalt);
      if (vy < -0.025) {
        tmpColor.lerp(cPotholeMud, THREE.MathUtils.clamp(-vy * 4.5, 0, 0.85));
      }
    }
  };

  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    const vy = groundHeightAt(vx, vz);
    posAttr.setY(i, vy);
    paintBuenosAiresVertex(vx, vz, vy);
    colors[i * 3] = tmpColor.r;
    colors[i * 3 + 1] = tmpColor.g;
    colors[i * 3 + 2] = tmpColor.b;
  }
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const colorAttr = terrainGeo.attributes.color as THREE.BufferAttribute;
  const cSandboxInner = new THREE.Color(0xeef2f5);
  const cSandboxOuter = new THREE.Color(0xd2dae2);
  const applyTerrainAttributes = (preset: MapPresetId) => {
    setActiveMapPreset(preset);
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      const vy = groundHeightAt(vx, vz);
      posAttr.setY(i, vy);

      if (preset === 'custom_sandbox') {
        const edgeFade = THREE.MathUtils.smoothstep(Math.hypot(vx, vz), 85, 160);
        tmpColor.copy(cSandboxInner).lerp(cSandboxOuter, edgeFade);
      } else {
        paintBuenosAiresVertex(vx, vz, vy);
      }
      colorAttr.setXYZ(i, tmpColor.r, tmpColor.g, tmpColor.b);
    }
    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    terrainGeo.computeVertexNormals();
  };
  terrainGeo.computeVertexNormals();

  const terrainMat = new THREE.MeshStandardMaterial({
    map: groundTex,
    bumpMap: groundBumpTex,
    bumpScale: 0.11,
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.04,
  });
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.receiveShadow = true;
  scene.add(terrain);
  sceneObjects.push(terrain);
  disposables.push(terrainGeo, terrainMat);

  // Subtle alignment grid shown while building in 3D Editor mode
  const editorGrid = new THREE.GridHelper(210, 42, 0x38bdf8, 0x475569);
  editorGrid.position.set(0, 0.035, 0);
  if (Array.isArray(editorGrid.material)) {
    editorGrid.material.forEach((m) => {
      m.transparent = true;
      m.opacity = 0.28;
      disposables.push(m);
    });
  } else {
    editorGrid.material.transparent = true;
    editorGrid.material.opacity = 0.28;
    disposables.push(editorGrid.material);
  }
  editorGrid.visible = false;
  scene.add(editorGrid);
  sceneObjects.push(editorGrid);
  disposables.push(editorGrid.geometry);

  // Plaza de la República cracked weathered granite esplanade slab
  const plazaGeo = new THREE.BoxGeometry(20.4, 0.14, 23.4);
  const plazaMat = new THREE.MeshStandardMaterial({
    map: baTex.plazaPaver,
    bumpMap: groundBumpTex,
    bumpScale: 0.035,
    color: 0x808580,
    roughness: 0.88,
    metalness: 0.05,
  });
  const plaza = new THREE.Mesh(plazaGeo, plazaMat);
  plaza.position.set(0, 0.05, 0);
  plaza.receiveShadow = true;
  scene.add(plaza);
  sceneObjects.push(plaza);
  citySurfaceObjects.push(plaza);
  disposables.push(plazaGeo, plazaMat);

  // Overgrown landscaped lawn beds on north & south ends of Plaza de la República + wild weed mounds
  const lawnGeo = new THREE.BoxGeometry(14.4, 0.08, 6.2);
  const lawnMat = new THREE.MeshStandardMaterial({
    map: baTex.verticalGarden,
    color: 0x7a966c,
    roughness: 0.95,
    metalness: 0.02,
  });
  const northLawn = new THREE.Mesh(lawnGeo, lawnMat);
  northLawn.position.set(0, 0.135, -7.6);
  northLawn.receiveShadow = true;
  const southLawn = new THREE.Mesh(lawnGeo, lawnMat);
  southLawn.position.set(0, 0.135, 5.8);
  southLawn.receiveShadow = true;
  scene.add(northLawn, southLawn);
  sceneObjects.push(northLawn, southLawn);
  citySurfaceObjects.push(northLawn, southLawn);
  disposables.push(lawnGeo, lawnMat);

  // Instanced slender wind-swaying wild grass blade tufts across plazas, medians, curbs & sidewalk cracks
  const dummy = new THREE.Object3D();
  const weedGeo = buildFineGrassTuftGeo();
  const weedMat = createWindFoliageMaterial(
    {
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.02,
    },
    windTimeUniform,
    'grass',
  );
  const weedSpots: { x: number; z: number; sx: number; sy: number; rotY: number; col: number; yOff?: number }[] = [];
  // Dense, tall overgrown plaza grass blade tufts across North Lawn (-7.6) & South Lawn (+5.8 / BA) for crouch stealth
  const plazaGrassCols = [0x25481a, 0x325a21, 0x426d29, 0x537a30, 0x2a4d1d, 0x5f7e35];
  const addPlazaLawnTufts = (zCenter: number, checkSouth: boolean, cols: number, rows: number, seedBase: number) => {
    const spanX = 13.8;
    const spanZ = 5.75;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const idx = seedBase + row * cols + col;
        const jx = Math.sin(idx * 12.9898 + 1.7) * 0.44;
        const jz = Math.cos(idx * 78.233 + 3.1) * 0.44;
        const rx = -spanX * 0.5 + ((col + 0.5 + jx) / cols) * spanX;
        const rz = zCenter - spanZ * 0.5 + ((row + 0.5 + jz) / rows) * spanZ;
        if (checkSouth) {
          // Clear solid BA plinth footprint while hugging its sides & front edge
          if (Math.abs(rx) < 3.45 && Math.abs(rz - 5.4) < 1.08) continue;
          // Clear campfire pit at SE corner
          const cdx = rx - CAMPFIRE_X;
          const cdz = rz - CAMPFIRE_Z;
          if (cdx * cdx + cdz * cdz < 1.65 * 1.65) continue;
        }
        const nearBaFront = checkSouth && Math.abs(rx) < 3.55 && rz > 6.3 && rz < 7.15;
        const hHash = Math.abs(Math.sin(idx * 41.3 + 0.9));
        const wHash = Math.abs(Math.cos(idx * 23.7 + 2.1));
        const sy = nearBaFront
          ? 1.18 + hHash * 0.48
          : 1.48 + hHash * 0.84;
        const sx = 1.24 + wHash * 0.78;
        weedSpots.push({
          x: rx,
          z: rz,
          sx,
          sy,
          rotY: (idx * 2.399963) % (Math.PI * 2),
          col: plazaGrassCols[idx % plazaGrassCols.length],
          yOff: 0.045,
        });
      }
    }
  };
  addPlazaLawnTufts(-7.6, false, 24, 11, 1);
  addPlazaLawnTufts(5.8, true, 26, 12, 500);
  // Extra dense edge & interior tall cover clumps in the plaza lawns
  for (let i = 0; i < 84; i++) {
    const onSouth = i % 2 === 0;
    const rx = Math.sin(i * 19.73 + 0.4) * 6.6;
    const rz = (onSouth ? 5.8 : -7.6) + Math.cos(i * 31.17 + 1.2) * 2.65;
    if (onSouth) {
      if (Math.abs(rx) < 3.5 && Math.abs(rz - 5.4) < 1.12) continue;
      const cdx = rx - CAMPFIRE_X;
      const cdz = rz - CAMPFIRE_Z;
      if (cdx * cdx + cdz * cdz < 1.7 * 1.7) continue;
    }
    weedSpots.push({
      x: rx,
      z: rz,
      sx: 1.35 + (i % 4) * 0.22,
      sy: 1.62 + (i % 5) * 0.17,
      rotY: i * 1.37,
      col: plazaGrassCols[(i * 5) % plazaGrassCols.length],
      yOff: 0.045,
    });
  }
  // Wild swaying grass tufts sprouting along medians (x = ±11, ±18, 0), curbs (x = ±36.2) & cracked sidewalk seams
  [-36.2, -18.3, -11.0, 0, 11.0, 18.3, 36.2].forEach((wx, laneIdx) => {
    for (let z = -102; z <= 102; z += 3.2) {
      if (Math.abs(z) < 11.5 && Math.abs(wx) < 12) continue;
      if (isCrossStreetZ(Math.abs(z))) continue;
      const seed = laneIdx * 17 + z * 1.3;
      weedSpots.push({
        x: wx + Math.sin(seed * 0.43) * 0.72,
        z: z + Math.cos(seed * 0.71) * 0.95,
        sx: 0.85 + (Math.abs(Math.round(seed)) % 3) * 0.28,
        sy: 0.75 + (Math.abs(Math.round(seed)) % 4) * 0.26,
        rotY: seed * 0.8,
        col: Math.abs(Math.round(seed)) % 3 === 0 ? 0x315421 : Math.abs(Math.round(seed)) % 3 === 1 ? 0x486b2b : 0x5d7434,
      });
    }
  });
  // Extra wild grass tufts breaking through asphalt near foreground crosswalks & Obelisco base
  for (let i = 0; i < 42; i++) {
    const angle = (i / 42) * Math.PI * 2;
    const rad = 2.6 + (i % 3) * 0.65;
    weedSpots.push({
      x: Math.cos(angle) * rad,
      z: -2.2 + Math.sin(angle) * rad,
      sx: 0.85 + (i % 3) * 0.25,
      sy: 0.72 + (i % 4) * 0.24,
      rotY: angle * 1.4,
      col: i % 2 === 0 ? 0x395d24 : 0x4b6e2f,
    });
  }

  const weedInst = new THREE.InstancedMesh(weedGeo, weedMat, weedSpots.length);
  const weedCol = new THREE.Color();
  weedSpots.forEach((ws, idx) => {
    dummy.position.set(ws.x, groundHeightAt(ws.x, ws.z) + (ws.yOff ?? 0), ws.z);
    dummy.rotation.set(0, ws.rotY, 0);
    dummy.scale.set(ws.sx, ws.sy, ws.sx);
    dummy.updateMatrix();
    weedInst.setMatrixAt(idx, dummy.matrix);
    weedCol.setHex(ws.col);
    weedInst.setColorAt(idx, weedCol);
  });
  weedInst.computeBoundingSphere();
  scene.add(weedInst);
  sceneObjects.push(weedInst);
  forestObjects.push(weedInst);
  disposables.push(weedGeo, weedMat);

  const baseColliders: WorldCollider[] = [];
  const baseBoxColliders: WorldBoxCollider[] = [];

  // 3D Street Surface Defects: Physical Potholes (Pozos), Missing Asphalt Patches & Deep Cracks (Grietas)
  const potholeRimMat = new THREE.MeshStandardMaterial({
    map: groundTex,
    bumpMap: groundBumpTex,
    bumpScale: 0.1,
    color: 0x16191c,
    roughness: 0.96,
    metalness: 0.04,
  });
  const potholeDirtMat = new THREE.MeshStandardMaterial({
    map: stoneTex,
    bumpMap: groundBumpTex,
    bumpScale: 0.14,
    color: 0x3b3126,
    roughness: 0.98,
    metalness: 0.02,
  });
  const cobblePatchMat = new THREE.MeshStandardMaterial({
    map: baTex.plazaPaver,
    bumpMap: groundBumpTex,
    bumpScale: 0.12,
    color: 0x4b4c4a,
    roughness: 0.94,
    metalness: 0.06,
  });
  const crackStripMat = new THREE.MeshStandardMaterial({
    color: 0x090b0d,
    roughness: 0.98,
    metalness: 0.02,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  disposables.push(potholeRimMat, potholeDirtMat, cobblePatchMat, crackStripMat);

  // Sculpted pothole rim ring & recessed dirt/gravel basin per STREET_POTHOLES entry
  const potholeRimGeo = new THREE.RingGeometry(0.72, 1.08, 16, 1);
  potholeRimGeo.rotateX(-Math.PI / 2);
  const rimPos = potholeRimGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < rimPos.count; i++) {
    const px = rimPos.getX(i);
    const pz = rimPos.getZ(i);
    const ang = Math.atan2(pz, px);
    const r = Math.hypot(px, pz);
    const jag = 1 + Math.sin(ang * 5.0) * 0.08 + Math.cos(ang * 9.0) * 0.05;
    rimPos.setX(i, px * jag);
    rimPos.setZ(i, pz * jag);
    rimPos.setY(i, r < 0.85 ? -0.04 : 0.032);
  }
  potholeRimGeo.computeVertexNormals();
  const potholeBasinGeo = new THREE.CircleGeometry(0.84, 16);
  potholeBasinGeo.rotateX(-Math.PI / 2);
  const potholeRimInst = new THREE.InstancedMesh(potholeRimGeo, potholeRimMat, STREET_POTHOLES.length);
  const potholeBasinInst = new THREE.InstancedMesh(potholeBasinGeo, potholeDirtMat, STREET_POTHOLES.length);
  potholeRimInst.receiveShadow = true;
  potholeBasinInst.receiveShadow = true;
  STREET_POTHOLES.forEach((ph, idx) => {
    dummy.position.set(ph.x, 0.015, ph.z);
    dummy.rotation.set(0, idx * 0.9, 0);
    dummy.scale.set(ph.radius, 1, ph.radius * (0.86 + (idx % 3) * 0.1));
    dummy.updateMatrix();
    potholeRimInst.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(ph.x, groundHeightAt(ph.x, ph.z) + 0.018, ph.z);
    dummy.scale.set(ph.radius * 0.92, 1, ph.radius * 0.82);
    dummy.updateMatrix();
    potholeBasinInst.setMatrixAt(idx, dummy.matrix);
  });
  potholeRimInst.computeBoundingSphere();
  potholeBasinInst.computeBoundingSphere();
  scene.add(potholeRimInst, potholeBasinInst);
  sceneObjects.push(potholeRimInst, potholeBasinInst);
  citySurfaceObjects.push(potholeRimInst, potholeBasinInst);
  disposables.push(potholeRimGeo, potholeBasinGeo);

  // Missing asphalt patches exposing sub-base dirt or old Porteño granite cobblestones
  const patchGeo = new THREE.CylinderGeometry(1.0, 1.04, 0.045, 11);
  const patchBorderGeo = new THREE.RingGeometry(0.92, 1.12, 11);
  patchBorderGeo.rotateX(-Math.PI / 2);
  const dirtPatches = MISSING_ASPHALT_PATCHES.filter((p) => p.kind === 'dirt');
  const cobblePatches = MISSING_ASPHALT_PATCHES.filter((p) => p.kind === 'cobble');
  const dirtPatchInst = new THREE.InstancedMesh(patchGeo, potholeDirtMat, Math.max(1, dirtPatches.length));
  const cobblePatchInst = new THREE.InstancedMesh(patchGeo, cobblePatchMat, Math.max(1, cobblePatches.length));
  const patchLipInst = new THREE.InstancedMesh(patchBorderGeo, potholeRimMat, MISSING_ASPHALT_PATCHES.length);
  dirtPatchInst.receiveShadow = true;
  cobblePatchInst.receiveShadow = true;
  patchLipInst.receiveShadow = true;
  dirtPatches.forEach((pa, idx) => {
    dummy.position.set(pa.x, groundHeightAt(pa.x, pa.z) + 0.008, pa.z);
    dummy.rotation.set(0, pa.rotY, 0);
    dummy.scale.set(pa.rx, 1, pa.rz);
    dummy.updateMatrix();
    dirtPatchInst.setMatrixAt(idx, dummy.matrix);
  });
  cobblePatches.forEach((pa, idx) => {
    dummy.position.set(pa.x, groundHeightAt(pa.x, pa.z) + 0.012, pa.z);
    dummy.rotation.set(0, pa.rotY, 0);
    dummy.scale.set(pa.rx, 1, pa.rz);
    dummy.updateMatrix();
    cobblePatchInst.setMatrixAt(idx, dummy.matrix);
  });
  MISSING_ASPHALT_PATCHES.forEach((pa, idx) => {
    dummy.position.set(pa.x, groundHeightAt(pa.x, pa.z) + 0.024, pa.z);
    dummy.rotation.set(0, pa.rotY, 0);
    dummy.scale.set(pa.rx, 1, pa.rz);
    dummy.updateMatrix();
    patchLipInst.setMatrixAt(idx, dummy.matrix);
  });
  dirtPatchInst.computeBoundingSphere();
  cobblePatchInst.computeBoundingSphere();
  patchLipInst.computeBoundingSphere();
  scene.add(dirtPatchInst, cobblePatchInst, patchLipInst);
  sceneObjects.push(dirtPatchInst, cobblePatchInst, patchLipInst);
  citySurfaceObjects.push(dirtPatchInst, cobblePatchInst, patchLipInst);
  disposables.push(patchGeo, patchBorderGeo);

  // Glossy street rainwater puddles settled across potholes & curbs (trigger wet footsteps & footprints)
  const waterPuddleGeo = new THREE.PlaneGeometry(2, 2);
  waterPuddleGeo.rotateX(-Math.PI / 2);
  const waterPuddleMat = new THREE.MeshStandardMaterial({
    map: getWaterPuddleTexture(),
    color: 0x3b5868,
    roughness: 0.08,
    metalness: 0.36,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const waterPuddleInst = new THREE.InstancedMesh(waterPuddleGeo, waterPuddleMat, WATER_PUDDLES.length);
  waterPuddleInst.receiveShadow = true;
  WATER_PUDDLES.forEach((wp, idx) => {
    dummy.position.set(wp.x, groundHeightAt(wp.x, wp.z) + 0.024, wp.z);
    dummy.rotation.set(0, wp.rotY, 0);
    dummy.scale.set(wp.rx, 1, wp.rz);
    dummy.updateMatrix();
    waterPuddleInst.setMatrixAt(idx, dummy.matrix);
  });
  waterPuddleInst.computeBoundingSphere();
  scene.add(waterPuddleInst);
  sceneObjects.push(waterPuddleInst);
  citySurfaceObjects.push(waterPuddleInst);
  disposables.push(waterPuddleGeo, waterPuddleMat);

  // Physical 3D asphalt crack fracture segments across lanes & intersections
  const crackGeo = new THREE.BoxGeometry(0.11, 0.018, 1.0);
  const crackSpecs: { x: number; z: number; len: number; rotY: number; w: number }[] = [];
  for (let i = 0; i < 72; i++) {
    const lanePick = i % 5;
    const cx =
      lanePick === 0
        ? -26.5 + Math.sin(i * 2.3) * 6.5
        : lanePick === 1
          ? 26.5 + Math.cos(i * 1.9) * 6.5
          : lanePick === 2
            ? Math.sin(i * 3.1) * 7.5
            : lanePick === 3
              ? -70.5 + Math.sin(i * 2.7) * 3.2
              : 70.5 + Math.cos(i * 2.9) * 3.2;
    const cz = ((i * 29) % 200) - 100;
    if (Math.abs(cx) < 10.6 && Math.abs(cz) < 12.2) continue;
    const baseRot = Math.sin(i * 4.7) * 1.4;
    const segsInCrack = 3;
    let sx = cx;
    let sz = cz;
    for (let s = 0; s < segsInCrack; s++) {
      const len = 1.6 + ((i + s) % 3) * 0.9;
      const rot = baseRot + Math.sin(s * 2.4 + i) * 0.55;
      crackSpecs.push({ x: sx, z: sz, len, rotY: rot, w: 0.75 + (s % 2) * 0.45 });
      sx += Math.sin(rot) * (len * 0.85);
      sz += Math.cos(rot) * (len * 0.85);
    }
  }
  const crackInst = new THREE.InstancedMesh(crackGeo, crackStripMat, crackSpecs.length);
  crackInst.receiveShadow = true;
  crackSpecs.forEach((cs, idx) => {
    dummy.position.set(cs.x, groundHeightAt(cs.x, cs.z) + 0.012, cs.z);
    dummy.rotation.set(0, cs.rotY, 0);
    dummy.scale.set(cs.w, 1, cs.len);
    dummy.updateMatrix();
    crackInst.setMatrixAt(idx, dummy.matrix);
  });
  crackInst.computeBoundingSphere();
  scene.add(crackInst);
  sceneObjects.push(crackInst);
  citySurfaceObjects.push(crackInst);
  disposables.push(crackGeo);

  // Interactive Loose Rocks & Broken Asphalt Chunks (kicked/scattered when stepped on in engine.ts)
  const looseRockGeo = new THREE.DodecahedronGeometry(0.11, 0);
  const looseRockMat = new THREE.MeshStandardMaterial({
    map: stoneTex,
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.06,
  });
  const looseRockSeeds: LooseRockSeed[] = [];
  const rockPalette = [0x6e7378, 0x52565c, 0x7c7265, 0x3b3f44, 0x867b6c];

  // Cluster small loose rocks around every pothole & missing asphalt patch + curbs
  STREET_POTHOLES.forEach((ph, pIdx) => {
    const count = 4;
    for (let r = 0; r < count; r++) {
      const ang = pIdx * 1.7 + r * 1.55;
      const rad = ph.radius * (0.45 + ((r + pIdx) % 3) * 0.34);
      const rx = ph.x + Math.cos(ang) * rad;
      const rz = ph.z + Math.sin(ang) * rad;
      const sc = 0.65 + ((pIdx + r) % 4) * 0.28;
      looseRockSeeds.push({
        x: rx,
        z: rz,
        sx: sc * (0.95 + (r % 2) * 0.25),
        sy: sc * 0.68,
        sz: sc * (0.9 + ((r + 1) % 2) * 0.24),
        rotY: ang,
        radius: 0.11 * sc,
        colorHex: rockPalette[(pIdx + r) % rockPalette.length],
      });
    }
  });
  MISSING_ASPHALT_PATCHES.forEach((pa, pIdx) => {
    for (let r = 0; r < 3; r++) {
      const ang = pIdx * 2.1 + r * 2.05;
      const rx = pa.x + Math.cos(ang) * pa.rx * 0.62;
      const rz = pa.z + Math.sin(ang) * pa.rz * 0.62;
      const sc = 0.72 + ((pIdx + r) % 3) * 0.26;
      looseRockSeeds.push({
        x: rx,
        z: rz,
        sx: sc * 1.1,
        sy: sc * 0.65,
        sz: sc * 0.95,
        rotY: ang * 1.3,
        radius: 0.11 * sc,
        colorHex: rockPalette[(pIdx + r + 2) % rockPalette.length],
      });
    }
  });
  // Extra loose street pebbles near spawn/plaza approaches & Av. 9 de Julio curbs
  for (let i = 0; i < 36; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const rx = side * (3.5 + ((i * 7) % 28));
    const rz = -35 + ((i * 13) % 72);
    if (Math.abs(rx) < 11 && Math.abs(rz) < 12.5) continue;
    const sc = 0.68 + (i % 4) * 0.24;
    looseRockSeeds.push({
      x: rx,
      z: rz,
      sx: sc,
      sy: sc * 0.66,
      sz: sc * 0.92,
      rotY: i * 1.2,
      radius: 0.11 * sc,
      colorHex: rockPalette[i % rockPalette.length],
    });
  }

  const looseRockInst = new THREE.InstancedMesh(looseRockGeo, looseRockMat, looseRockSeeds.length);
  looseRockInst.castShadow = true;
  looseRockInst.receiveShadow = true;
  looseRockInst.frustumCulled = false;
  const rockTmpColor = new THREE.Color();
  looseRockSeeds.forEach((rs, idx) => {
    dummy.position.set(rs.x, groundHeightAt(rs.x, rs.z) + rs.sy * 0.055, rs.z);
    dummy.rotation.set(0, rs.rotY, 0);
    dummy.scale.set(rs.sx, rs.sy, rs.sz);
    dummy.updateMatrix();
    looseRockInst.setMatrixAt(idx, dummy.matrix);
    rockTmpColor.setHex(rs.colorHex);
    looseRockInst.setColorAt(idx, rockTmpColor);
  });
  looseRockInst.computeBoundingSphere();
  scene.add(looseRockInst);
  sceneObjects.push(looseRockInst);
  citySurfaceObjects.push(looseRockInst);
  disposables.push(looseRockGeo, looseRockMat);

  // Fallen broken dark tree limbs lying across medians & foreground crosswalks (like reference photo)
  const branchMat = new THREE.MeshStandardMaterial({
    map: barkTex,
    color: 0x332920,
    roughness: 0.94,
    metalness: 0.02,
  });
  const branchGeo = new THREE.CylinderGeometry(0.11, 0.22, 4.4, 6);
  branchGeo.rotateZ(Math.PI / 2);
  const branchSpots = [
    { x: -16.8, z: 10.2, rotY: 0.35, scale: 1.05 },
    { x: -3.2, z: 10.6, rotY: -0.28, scale: 0.95 },
    { x: 14.5, z: 13.8, rotY: 0.62, scale: 1.0 },
    { x: -24.5, z: 19.5, rotY: -0.52, scale: 0.85 },
    { x: 11.2, z: -15.5, rotY: 0.88, scale: 0.92 },
  ];
  const branchInst = new THREE.InstancedMesh(branchGeo, branchMat, branchSpots.length);
  branchInst.castShadow = true;
  branchInst.receiveShadow = true;
  branchSpots.forEach((bs, idx) => {
    dummy.position.set(bs.x, groundHeightAt(bs.x, bs.z) + 0.16, bs.z);
    dummy.rotation.set(0.04, bs.rotY, 0);
    dummy.scale.set(bs.scale, 1, bs.scale);
    dummy.updateMatrix();
    branchInst.setMatrixAt(idx, dummy.matrix);

    const cosR = Math.cos(bs.rotY);
    const sinR = -Math.sin(bs.rotY);
    [-1.15 * bs.scale, 1.15 * bs.scale].forEach((off) => {
      baseColliders.push({
        x: bs.x + cosR * off,
        z: bs.z + sinR * off,
        radius: 0.42 * bs.scale,
        height: 0.48,
        source: 'tree',
      });
    });
  });
  branchInst.computeBoundingSphere();
  scene.add(branchInst);
  sceneObjects.push(branchInst);
  forestObjects.push(branchInst);
  disposables.push(branchGeo, branchMat);

  // Instanced faded & cracked road lane markings: Av. 9 de Julio, cross-streets & crosswalks
  const whitePaintGeo = new THREE.PlaneGeometry(0.24, 3.0);
  whitePaintGeo.rotateX(-Math.PI / 2);
  const whitePaintMat = new THREE.MeshBasicMaterial({
    color: 0xc2c8c2,
    transparent: true,
    opacity: 0.46,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const whiteStripePositions: { x: number; z: number; rotY: number; sx: number; sz: number }[] = [];
  [-31.4, -27.0, -22.6, 22.6, 27.0, 31.4].forEach((lx) => {
    for (let z = -108; z <= 108; z += 7.5) {
      const az = Math.abs(z);
      if (az < 9.5 || (az > 33 && az < 47) || (az > 71 && az < 85)) continue;
      whiteStripePositions.push({ x: lx, z, rotY: 0, sx: 1, sz: 1 });
    }
  });
  [-2.8, 2.8, -40.0, 40.0, -78.0, 78.0].forEach((lz) => {
    for (let x = -100; x <= 100; x += 7.5) {
      const ax = Math.abs(x);
      if (ax < 19.5 || (ax > 63.5 && ax < 77.5)) continue;
      whiteStripePositions.push({ x, z: lz, rotY: Math.PI / 2, sx: 1, sz: 1 });
    }
  });
  [-70.5, 70.5].forEach((lx) => {
    for (let z = -106; z <= 106; z += 7.5) {
      const az = Math.abs(z);
      if (az < 9.5 || (az > 33 && az < 47) || (az > 71 && az < 85)) continue;
      whiteStripePositions.push({ x: lx, z, rotY: 0, sx: 1, sz: 1 });
    }
  });
  [-9.5, 9.5, -35.8, -44.2, 35.8, 44.2, -73.8, -82.2, 73.8, 82.2].forEach((cz) => {
    for (let x = -34.5; x <= 34.5; x += 1.7) {
      if (Math.abs(x) < 11.2) continue;
      whiteStripePositions.push({ x, z: cz, rotY: 0, sx: 2.3, sz: 0.72 });
    }
  });
  for (let z = -6.2; z <= 6.2; z += 1.65) {
    whiteStripePositions.push({ x: -19.2, z, rotY: Math.PI / 2, sx: 2.3, sz: 0.72 });
    whiteStripePositions.push({ x: 19.2, z, rotY: Math.PI / 2, sx: 2.3, sz: 0.72 });
    whiteStripePositions.push({ x: -64.5, z, rotY: Math.PI / 2, sx: 2.2, sz: 0.65 });
    whiteStripePositions.push({ x: 64.5, z, rotY: Math.PI / 2, sx: 2.2, sz: 0.65 });
  }
  const whiteStripeInst = new THREE.InstancedMesh(
    whitePaintGeo,
    whitePaintMat,
    whiteStripePositions.length,
  );
  whiteStripePositions.forEach((st, idx) => {
    dummy.position.set(st.x, groundHeightAt(st.x, st.z) + 0.025, st.z);
    dummy.rotation.set(0, st.rotY, 0);
    dummy.scale.set(st.sx, 1, st.sz);
    dummy.updateMatrix();
    whiteStripeInst.setMatrixAt(idx, dummy.matrix);
  });
  whiteStripeInst.computeBoundingSphere();
  scene.add(whiteStripeInst);
  sceneObjects.push(whiteStripeInst);
  citySurfaceObjects.push(whiteStripeInst);
  disposables.push(whitePaintGeo, whitePaintMat);

  // Muted weathered yellow Metrobus corridor lane borders
  const yellowLineGeo = new THREE.PlaneGeometry(0.24, 26);
  yellowLineGeo.rotateX(-Math.PI / 2);
  const yellowLineMat = new THREE.MeshBasicMaterial({
    color: 0xc29e24,
    transparent: true,
    opacity: 0.54,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const yellowSegZ = [-96, -59, -21, 21, 59, 96];
  const yellowX = [-18.2, -11.2, 11.2, 18.2];
  const yellowInst = new THREE.InstancedMesh(
    yellowLineGeo,
    yellowLineMat,
    yellowX.length * yellowSegZ.length,
  );
  let yIdx = 0;
  yellowX.forEach((lx) => {
    yellowSegZ.forEach((lz) => {
      dummy.position.set(lx, 0.028, lz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      yellowInst.setMatrixAt(yIdx++, dummy.matrix);
    });
  });
  yellowInst.count = yIdx;
  yellowInst.computeBoundingSphere();
  scene.add(yellowInst);
  sceneObjects.push(yellowInst);
  citySurfaceObjects.push(yellowInst);
  disposables.push(yellowLineGeo, yellowLineMat);

  // 1. EL OBELISCO DE BUENOS AIRES (center of Plaza de la República)
  const obelisco = buildObeliscoMonument(stoneTex, disposables);
  const obeliscoRoot = new THREE.Group();
  obeliscoRoot.position.set(0, groundHeightAt(0, -2.2), -2.2);
  const obeliscoOverride = new THREE.Group();
  obeliscoRoot.add(obelisco.group, obeliscoOverride);
  scene.add(obeliscoRoot);
  sceneObjects.push(obeliscoRoot);
  ruinObjects.push(obeliscoRoot);
  nightGlowMats.push({ mat: obelisco.plaqueGlowMat, dayIntensity: 0.12, nightIntensity: 1.45 });
  baseColliders.push({ x: 0, z: -2.2, radius: 2.35, height: 35, source: 'ruin' });

  // 2. LA GRAN "BA" VERDE (living 3D plant-covered sculpture on south lawn facing +Z)
  const baBase = buildGiantBaMonument(
    baTex.verticalGarden,
    baTex.foliageLeaf,
    stoneTex,
    windTimeUniform,
    disposables,
  );
  const baRoot = new THREE.Group();
  baRoot.position.set(0, groundHeightAt(0, 5.4), 5.4);
  const baOverride = new THREE.Group();
  baRoot.add(baBase, baOverride);
  scene.add(baRoot);
  sceneObjects.push(baRoot);
  ruinObjects.push(baRoot);
  baseColliders.push(
    { x: -1.6, z: 5.4, radius: 1.45, height: 3.8, source: 'ruin' },
    { x: 1.6, z: 5.4, radius: 1.45, height: 3.8, source: 'ruin' },
  );

  // 3. METROBUS 9 DE JULIO (12 Paradas across 3N/3S + 4 Porteño Colectivos)
  const lampGlowMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: new THREE.Color(0xf59e0b),
    emissiveIntensity: 2.2,
    roughness: 0.2,
  });
  disposables.push(lampGlowMat);

  const stationSpecs = [
    { x: -14.2, z: -96.0, facingEast: true },
    { x: -14.2, z: -58.0, facingEast: true },
    { x: -14.2, z: -20.5, facingEast: true },
    { x: -14.2, z: 20.5, facingEast: true },
    { x: -14.2, z: 58.0, facingEast: true },
    { x: -14.2, z: 96.0, facingEast: true },
    { x: 14.2, z: -96.0, facingEast: false },
    { x: 14.2, z: -58.0, facingEast: false },
    { x: 14.2, z: -20.5, facingEast: false },
    { x: 14.2, z: 20.5, facingEast: false },
    { x: 14.2, z: 58.0, facingEast: false },
    { x: 14.2, z: 96.0, facingEast: false },
  ];
  const stationEntries: {
    root: THREE.Group;
    baseGroup: THREE.Group;
    overrideHolder: THREE.Group;
    x: number;
    z: number;
    facingEast: boolean;
  }[] = [];
  stationSpecs.forEach((st, stIdx) => {
    const built = buildMetrobusStation(
      st.x,
      st.z,
      st.facingEast,
      stoneTex,
      baTex.metrobusSign,
      lampGlowMat,
      disposables,
    );
    if (stIdx === 0 || stIdx > 0) {
      nightGlowMats.push({ mat: built.signPanelMat, dayIntensity: 0.18, nightIntensity: 1.25 });
    }
    built.group.position.set(0, 0, 0);
    const stationRoot = new THREE.Group();
    stationRoot.position.set(st.x, groundHeightAt(st.x, st.z), st.z);
    const overrideHolder = new THREE.Group();
    stationRoot.add(built.group, overrideHolder);
    scene.add(stationRoot);
    sceneObjects.push(stationRoot);
    ruinObjects.push(stationRoot);
    baseColliders.push(...built.colliders);
    stationEntries.push({
      root: stationRoot,
      baseGroup: built.group,
      overrideHolder,
      x: st.x,
      z: st.z,
      facingEast: st.facingEast,
    });
  });

  // 4 Abandoned Porteño Colectivos (including white/red & red plaza buses from photo)
  const busSpecs = [
    { x: -14.2, z: 2.2, facingSouth: true, red: false, rotJitter: 0.04 },
    { x: 14.2, z: -3.4, facingSouth: false, red: true, rotJitter: -0.22 },
    { x: -14.2, z: -74.0, facingSouth: true, red: false, rotJitter: 0 },
    { x: 14.2, z: 75.0, facingSouth: false, red: true, rotJitter: 0.05 },
  ];
  const busEntries: {
    root: THREE.Group;
    baseGroup: THREE.Group;
    overrideHolder: THREE.Group;
    x: number;
    z: number;
  }[] = [];
  busSpecs.forEach((bs) => {
    const built = buildPortenoBus(
      bs.x,
      bs.z,
      bs.facingSouth,
      bs.red ? baTex.busLiveryRed : baTex.busLivery,
      disposables,
    );
    const busRoot = new THREE.Group();
    busRoot.position.copy(built.group.position);
    busRoot.rotation.copy(built.group.rotation);
    busRoot.rotation.y += bs.rotJitter;
    built.group.position.set(0, 0, 0);
    built.group.rotation.set(0, 0, 0);
    const overrideHolder = new THREE.Group();
    busRoot.add(built.group, overrideHolder);
    scene.add(busRoot);
    sceneObjects.push(busRoot);
    ruinObjects.push(busRoot);
    baseColliders.push(...built.colliders);
    busEntries.push({
      root: busRoot,
      baseGroup: built.group,
      overrideHolder,
      x: bs.x,
      z: bs.z,
    });
  });

  // Concrete Metrobus median dividers / safety barriers along x = ±11.0
  const barrierMat = new THREE.MeshStandardMaterial({
    map: stoneTex,
    bumpMap: groundBumpTex,
    bumpScale: 0.03,
    color: 0x7c838d,
    roughness: 0.84,
    metalness: 0.1,
  });
  const barrierGeo = new THREE.BoxGeometry(0.45, 0.56, 3.6);
  const barrierMeta: { x: number; z: number; rotY: number }[] = [];
  [-11.0, 11.0].forEach((bx) => {
    [-102, -90, -64, -52, -30, -24, 24, 30, 52, 64, 90, 102].forEach((bz) => {
      barrierMeta.push({ x: bx, z: bz, rotY: 0 });
    });
  });
  const barrierInst = new THREE.InstancedMesh(barrierGeo, barrierMat, barrierMeta.length);
  barrierInst.castShadow = true;
  barrierInst.receiveShadow = true;
  barrierMeta.forEach((bm, idx) => {
    dummy.position.set(bm.x, groundHeightAt(bm.x, bm.z) + 0.28, bm.z);
    dummy.rotation.set(0, bm.rotY, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    barrierInst.setMatrixAt(idx, dummy.matrix);
    baseBoxColliders.push({
      minX: bm.x - 0.26,
      maxX: bm.x + 0.26,
      minZ: bm.z - 1.82,
      maxZ: bm.z + 1.82,
      maxY: 0.62,
      blocksSight: false,
      source: 'ruin',
    });
  });
  barrierInst.computeBoundingSphere();
  const barrierOverrideGroup = new THREE.Group();
  barrierOverrideGroup.visible = false;
  scene.add(barrierInst, barrierOverrideGroup);
  sceneObjects.push(barrierInst, barrierOverrideGroup);
  ruinObjects.push(barrierInst, barrierOverrideGroup);
  disposables.push(barrierGeo, barrierMat);

  // 4. EDIFICIOS ALEDAÑOS (Post-apocalyptic 9 de Julio canyon matching reference photo disposition)
  const pillarMat = new THREE.MeshStandardMaterial({
    map: baTex.classicFacade,
    emissive: new THREE.Color(0x9c8661),
    emissiveMap: baTex.classicEmissive,
    emissiveIntensity: 0.25,
    roughness: 0.86,
    metalness: 0.06,
  });
  const whiteRatMat = new THREE.MeshStandardMaterial({
    map: baTex.whiteRationalist,
    emissive: new THREE.Color(0x8e7c5b),
    emissiveMap: baTex.whiteRationalistEmissive,
    emissiveIntensity: 0.22,
    roughness: 0.85,
    metalness: 0.05,
  });
  const glassTowerMat = new THREE.MeshStandardMaterial({
    map: baTex.modernGlass,
    emissive: new THREE.Color(0x7c97a1),
    emissiveMap: baTex.modernEmissive,
    emissiveIntensity: 0.28,
    roughness: 0.42,
    metalness: 0.58,
  });
  const brownTowerMat = new THREE.MeshStandardMaterial({
    map: baTex.modernGlass,
    color: 0x6b473b,
    roughness: 0.72,
    metalness: 0.18,
  });
  const mansardRoofMat = new THREE.MeshStandardMaterial({
    color: 0x1e2324,
    roughness: 0.68,
    metalness: 0.28,
  });
  const copperDomeMat = new THREE.MeshStandardMaterial({
    color: 0x355447,
    roughness: 0.56,
    metalness: 0.36,
  });
  const billboardMatA = new THREE.MeshStandardMaterial({
    map: baTex.billboardA,
    roughness: 0.78,
    metalness: 0.35,
  });
  const billboardMatB = new THREE.MeshStandardMaterial({
    map: baTex.billboardB,
    roughness: 0.62,
    metalness: 0.45,
  });
  const brokenScreenMat = new THREE.MeshStandardMaterial({
    map: baTex.brokenScreen,
    roughness: 0.58,
    metalness: 0.48,
  });
  const facadeIvyMat = new THREE.MeshStandardMaterial({
    color: 0x26441e,
    roughness: 0.92,
    metalness: 0.02,
  });
  const trussSteelMat = new THREE.MeshStandardMaterial({
    color: 0x1e2224,
    roughness: 0.55,
    metalness: 0.72,
  });
  const rockMat = new THREE.MeshStandardMaterial({
    map: stoneTex,
    color: 0x707572,
    roughness: 0.9,
    metalness: 0.06,
  });
  const medianeraMat = new THREE.MeshStandardMaterial({
    map: baTex.medianeraWall,
    roughness: 0.92,
    metalness: 0.04,
  });
  disposables.push(
    pillarMat,
    whiteRatMat,
    glassTowerMat,
    brownTowerMat,
    mansardRoofMat,
    copperDomeMat,
    billboardMatA,
    billboardMatB,
    brokenScreenMat,
    facadeIvyMat,
    trussSteelMat,
    rockMat,
    medianeraMat,
  );
  nightGlowMats.push(
    { mat: pillarMat, dayIntensity: 0.02, nightIntensity: 0.55 },
    { mat: whiteRatMat, dayIntensity: 0.02, nightIntensity: 0.48 },
    { mat: glassTowerMat, dayIntensity: 0.03, nightIntensity: 0.62 },
  );

  // Teatro Colón landmark on Cerrito & Av. 9 de Julio (West Block 1 North)
  const teatroColon = buildTeatroColonLandmark(stoneTex, baTex.colonMarquee, disposables);
  scene.add(teatroColon.root);
  sceneObjects.push(teatroColon.root);
  ruinObjects.push(teatroColon.root);
  baseColliders.push(...teatroColon.colliders);
  baseBoxColliders.push({
    minX: COLON_BUILDING_X - 8.4,
    maxX: COLON_BUILDING_X + 8.1,
    minZ: COLON_BUILDING_Z - 10.9,
    maxZ: COLON_BUILDING_Z + 10.9,
    maxY: 18,
    blocksSight: true,
    source: 'ruin',
  });
  nightGlowMats.push(
    { mat: teatroColon.glassArchMat, dayIntensity: 0.06, nightIntensity: 0.85 },
    { mat: teatroColon.marqueeMat, dayIntensity: 0.14, nightIntensity: 1.2 },
  );

  // Mc-Porteño 24H Fast-Food Corner Landmark (Carlos Pellegrini & Av. 9 de Julio SE corner at 53, 21)
  const fastFood = buildFastFoodLandmark(
    groundHeightAt(FASTFOOD_CENTER_X, FASTFOOD_CENTER_Z),
    stoneTex,
    glassTowerMat,
    pillarMat,
    nightGlowMats,
    disposables,
  );
  scene.add(fastFood.root);
  sceneObjects.push(fastFood.root);
  ruinObjects.push(fastFood.root);

  // 2050 Buenos Aires Urban Chaos Props (Abandoned Taxis, Rubble Cover, Overturned Dumpsters, Quarantine Signs)
  const { trashSpots } = buildUrbanChaosProps(
    scene,
    stoneTex,
    baTex.quarantineSign,
    sceneObjects,
    ruinObjects,
    baseColliders,
    disposables,
  );

  // Post-apocalyptic Closed Perimeter Barricades (Piled Cars, Burnt Buses, Heavy Rubble, Collapsed Ruins)
  buildPerimeterBarricades(
    scene,
    stoneTex,
    sceneObjects,
    ruinObjects,
    baseColliders,
    disposables,
    windTimeUniform,
    burningSpots,
  );

  const cityGroup = new THREE.Group();
  interface BuildingSpec {
    x: number;
    z: number;
    w: number;
    d: number;
    h: number;
    style: 'classic' | 'modern' | 'mid' | 'white_rationalist' | 'brown_tower';
    hasDome?: boolean;
    pitchedRoof?: boolean;
    ivy?: boolean;
    facadeScreen?: boolean;
    billboard?: 'A' | 'B';
    solid?: boolean;
  }
  const buildings: BuildingSpec[] = [
    // 1st Ring West (Cerrito, x = -53): (-52.5, -22.5) is Teatro Colón; exact skyline rhythm from reference photo
    { x: -53, z: -96, w: 20, d: 20, h: 29, style: 'classic', hasDome: true, ivy: true, solid: true },
    { x: -53, z: -59, w: 20, d: 22, h: 27, style: 'white_rationalist', facadeScreen: true, ivy: true, solid: true },
    { x: -53, z: 21, w: 20, d: 21, h: 32, style: 'modern', billboard: 'B', ivy: true, solid: true },
    { x: -53, z: 59, w: 20, d: 22, h: 26, style: 'white_rationalist', billboard: 'A', ivy: true, solid: true },
    { x: -53, z: 96, w: 20, d: 20, h: 28, style: 'modern', pitchedRoof: true, ivy: true, solid: true },

    // 1st Ring East (Carlos Pellegrini, x = +53); (53, 21) is Mc-Porteño 24H
    { x: 53, z: -96, w: 20, d: 20, h: 28, style: 'classic', ivy: true, solid: true },
    { x: 53, z: -59, w: 20, d: 22, h: 33, style: 'modern', billboard: 'B', solid: true },
    { x: 53, z: -21, w: 20, d: 21, h: 27, style: 'classic', hasDome: true, facadeScreen: true, solid: true },
    { x: 53, z: 59, w: 20, d: 22, h: 31, style: 'modern', billboard: 'A', ivy: true, solid: true },
    { x: 53, z: 96, w: 20, d: 20, h: 25, style: 'mid', solid: true },

    // 2nd Ring West (beyond Calle Libertad, x = -88) — includes tall terracotta corporate tower behind corner building
    { x: -88, z: -96, w: 18, d: 20, h: 30, style: 'mid', solid: true },
    { x: -88, z: -59, w: 18, d: 22, h: 26, style: 'classic', hasDome: true, solid: true },
    { x: -88, z: -21, w: 18, d: 21, h: 34, style: 'modern', solid: true },
    { x: -88, z: 21, w: 18, d: 21, h: 29, style: 'classic', solid: true },
    { x: -88, z: 59, w: 18, d: 22, h: 39, style: 'brown_tower', solid: true },
    { x: -88, z: 96, w: 18, d: 20, h: 34, style: 'white_rationalist', solid: true },

    // 2nd Ring East (beyond Calle Suipacha, x = +88)
    { x: 88, z: -96, w: 18, d: 20, h: 33, style: 'modern', solid: true },
    { x: 88, z: -59, w: 18, d: 22, h: 25, style: 'mid', solid: true },
    { x: 88, z: -21, w: 18, d: 21, h: 31, style: 'classic', hasDome: true, solid: true },
    { x: 88, z: 21, w: 18, d: 21, h: 35, style: 'modern', solid: true },
    { x: 88, z: 59, w: 18, d: 22, h: 27, style: 'classic', solid: true },
    { x: 88, z: 96, w: 18, d: 20, h: 31, style: 'mid', solid: true },

    // Perimeter City Blocks (North z = -125, South z = +125)
    { x: -88, z: -125, w: 23, d: 20, h: 29, style: 'classic', hasDome: true, solid: true },
    { x: -50.5, z: -125, w: 28, d: 20, h: 40, style: 'white_rationalist', solid: true },
    { x: 50.5, z: -125, w: 28, d: 20, h: 35, style: 'classic', solid: true },
    { x: 88, z: -125, w: 23, d: 20, h: 27, style: 'mid', solid: true },

    { x: -88, z: 125, w: 23, d: 20, h: 32, style: 'modern', solid: true },
    { x: -50.5, z: 125, w: 28, d: 20, h: 28, style: 'classic', hasDome: true, solid: true },
    { x: 50.5, z: 125, w: 28, d: 20, h: 34, style: 'modern', solid: true },
    { x: 88, z: 125, w: 23, d: 20, h: 26, style: 'classic', solid: true },

    // Perimeter City Blocks (West x = -116, East x = +116)
    { x: -116, z: -96, w: 22, d: 24, h: 31, style: 'mid', solid: true },
    { x: -116, z: -59, w: 22, d: 26, h: 36, style: 'modern', solid: true },
    { x: -116, z: -21, w: 22, d: 25, h: 28, style: 'classic', hasDome: true, solid: true },
    { x: -116, z: 21, w: 22, d: 25, h: 33, style: 'modern', solid: true },
    { x: -116, z: 59, w: 22, d: 26, h: 26, style: 'classic', solid: true },
    { x: -116, z: 96, w: 22, d: 24, h: 30, style: 'mid', solid: true },

    { x: 116, z: -96, w: 22, d: 24, h: 34, style: 'modern', solid: true },
    { x: 116, z: -59, w: 22, d: 26, h: 27, style: 'classic', solid: true },
    { x: 116, z: -21, w: 22, d: 25, h: 32, style: 'mid', solid: true },
    { x: 116, z: 21, w: 22, d: 25, h: 29, style: 'classic', hasDome: true, solid: true },
    { x: 116, z: 59, w: 22, d: 26, h: 35, style: 'modern', solid: true },
    { x: 116, z: 96, w: 22, d: 24, h: 28, style: 'classic', solid: true },

    // Outer Horizon Skyline Towers beyond the perimeter blocks
    { x: -48, z: -150, w: 22, d: 18, h: 42, style: 'modern' },
    { x: 48, z: -150, w: 22, d: 18, h: 38, style: 'classic' },
    { x: -48, z: 150, w: 22, d: 18, h: 36, style: 'classic' },
    { x: 48, z: 150, w: 22, d: 18, h: 44, style: 'modern' },
    { x: -140, z: -42, w: 18, d: 22, h: 40, style: 'modern' },
    { x: -140, z: 42, w: 18, d: 22, h: 34, style: 'mid' },
    { x: 140, z: -42, w: 18, d: 22, h: 35, style: 'classic' },
    { x: 140, z: 42, w: 18, d: 22, h: 41, style: 'modern' },
  ];

  const buildingEntries: {
    group: THREE.Group;
    baseGroup: THREE.Group;
    overrideHolder: THREE.Group;
    spec: BuildingSpec;
  }[] = [];

  const ivyClumpGeo = new THREE.DodecahedronGeometry(0.95, 0);
  disposables.push(ivyClumpGeo);

  buildings.forEach((b, idx) => {
    const bGroup = new THREE.Group();
    const bBaseGroup = new THREE.Group();
    const bOverrideHolder = new THREE.Group();
    bGroup.add(bBaseGroup, bOverrideHolder);
    const gy = groundHeightAt(b.x, b.z);
    bGroup.position.set(b.x, gy, b.z);

    const inShadowFrustum = Math.abs(b.x) <= 68 && Math.abs(b.z) <= 80;

    // Ground-floor Porteño colonnade / commercial podium
    const baseGeo = new THREE.BoxGeometry(b.w + 0.5, 4.2, b.d + 0.5);
    baseGeo.translate(0, 2.1, 0);
    const baseMesh = new THREE.Mesh(baseGeo, rockMat);
    baseMesh.castShadow = inShadowFrustum;
    baseMesh.receiveShadow = true;
    bBaseGroup.add(baseMesh);
    disposables.push(baseGeo);

    const bodyH = b.h - 4.2;
    const bodyGeo = new THREE.BoxGeometry(b.w, bodyH, b.d);
    bodyGeo.translate(0, 4.2 + bodyH * 0.5, 0);
    const bodyMat =
      b.style === 'modern'
        ? glassTowerMat
        : b.style === 'white_rationalist'
          ? whiteRatMat
          : b.style === 'brown_tower'
            ? brownTowerMat
            : pillarMat;
    const bodyMaterials =
      b.style === 'modern' || b.style === 'brown_tower'
        ? bodyMat
        : [bodyMat, bodyMat, rockMat, rockMat, medianeraMat, medianeraMat];
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMaterials);
    bodyMesh.castShadow = inShadowFrustum;
    bodyMesh.receiveShadow = true;
    bBaseGroup.add(bodyMesh);
    disposables.push(bodyGeo);

    // Top cornice ledge
    const corniceGeo = new THREE.BoxGeometry(b.w + 0.65, 0.6, b.d + 0.65);
    const cornice = new THREE.Mesh(corniceGeo, rockMat);
    cornice.position.y = b.h + 0.3;
    bBaseGroup.add(cornice);
    disposables.push(corniceGeo);

    if (b.pitchedRoof) {
      // Angled dark slate roof crown matching far-left building in reference photo
      const pitchGeo = new THREE.CylinderGeometry(b.w * 0.36, b.w * 0.72, 4.2, 4);
      pitchGeo.rotateY(Math.PI / 4);
      const pitchMesh = new THREE.Mesh(pitchGeo, mansardRoofMat);
      pitchMesh.position.y = b.h + 2.4;
      pitchMesh.scale.set(1, 1, b.d / b.w);
      bBaseGroup.add(pitchMesh);
      disposables.push(pitchGeo);
    } else if (b.style === 'classic') {
      const mansardGeo = new THREE.CylinderGeometry(
        Math.min(b.w, b.d) * 0.52,
        Math.min(b.w, b.d) * 0.68,
        3.2,
        4,
      );
      mansardGeo.rotateY(Math.PI / 4);
      const mansard = new THREE.Mesh(mansardGeo, mansardRoofMat);
      mansard.position.y = b.h + 2.1;
      mansard.scale.set(b.w / Math.min(b.w, b.d), 1, b.d / Math.min(b.w, b.d));
      bBaseGroup.add(mansard);
      disposables.push(mansardGeo);

      if (b.hasDome) {
        const domeX = b.x < 0 ? b.w * 0.34 : -b.w * 0.34;
        const domeZ = b.z < 0 ? b.d * 0.34 : -b.d * 0.34;
        const drumGeo = new THREE.CylinderGeometry(1.75, 1.9, 2.2, 12);
        const drum = new THREE.Mesh(drumGeo, rockMat);
        drum.position.set(domeX, b.h + 1.5, domeZ);
        const cupolaGeo = new THREE.SphereGeometry(1.85, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.56);
        const cupola = new THREE.Mesh(cupolaGeo, copperDomeMat);
        cupola.position.set(domeX, b.h + 2.5, domeZ);
        const spireGeo = new THREE.CylinderGeometry(0.04, 0.09, 2.0, 6);
        const spire = new THREE.Mesh(spireGeo, copperDomeMat);
        spire.position.set(domeX, b.h + 5.1, domeZ);
        bBaseGroup.add(drum, cupola, spire);
        disposables.push(drumGeo, cupolaGeo, spireGeo);
      }
    } else {
      const pentGeo = new THREE.BoxGeometry(b.w * 0.56, 2.2, b.d * 0.56);
      const pent = new THREE.Mesh(pentGeo, mansardRoofMat);
      pent.position.y = b.h + 1.4;
      bBaseGroup.add(pent);
      disposables.push(pentGeo);
    }

    const faceInX = b.x < 0 ? b.w * 0.48 : -b.w * 0.48;
    if (b.billboard) {
      // Torn rooftop steel truss + damaged billboard or shattered black LED screen
      const bbGeo = new THREE.BoxGeometry(0.38, 4.4, 11.4);
      const bbMat = b.billboard === 'A' ? billboardMatA : billboardMatB;
      const bb = new THREE.Mesh(bbGeo, bbMat);
      bb.position.set(faceInX, b.h + 3.0, 0);
      const strutGeo = new THREE.BoxGeometry(0.24, 1.6, 0.24);
      const stL = new THREE.Mesh(strutGeo, trussSteelMat);
      stL.position.set(faceInX, b.h + 0.9, -4.4);
      const stR = stL.clone();
      stR.position.z = 4.4;
      bBaseGroup.add(bb, stL, stR);
      disposables.push(bbGeo, strutGeo);
    }

    if (b.facadeScreen) {
      // Giant shattered vertical LED screen mounted onto the street-facing wall
      const fsGeo = new THREE.BoxGeometry(0.45, 9.6, 11.8);
      const fs = new THREE.Mesh(fsGeo, brokenScreenMat);
      fs.position.set(b.x < 0 ? b.w * 0.51 : -b.w * 0.51, b.h * 0.56, 0);
      bBaseGroup.add(fs);
      disposables.push(fsGeo);
    }

    if (b.ivy) {
      // Cascading creeping vines hanging down the street-facing edge & roof parapet
      const edgeX = b.x < 0 ? b.w * 0.51 : -b.w * 0.51;
      for (let v = 0; v < 8; v++) {
        const vineCluster = new THREE.Mesh(ivyClumpGeo, facadeIvyMat);
        const vy = b.h - 0.6 - v * (b.h * 0.095);
        const vz = (v % 2 === 0 ? 1 : -1) * (b.d * 0.34 - (v % 3) * 1.4);
        vineCluster.position.set(edgeX, vy, vz);
        vineCluster.scale.set(0.65, 1.45 + (v % 3) * 0.4, 1.15);
        bBaseGroup.add(vineCluster);
      }
    }

    cityGroup.add(bGroup);
    buildingEntries.push({
      group: bGroup,
      baseGroup: bBaseGroup,
      overrideHolder: bOverrideHolder,
      spec: b,
    });

    if (b.solid) {
      baseBoxColliders.push({
        minX: b.x - b.w * 0.5 - 0.25,
        maxX: b.x + b.w * 0.5 + 0.25,
        minZ: b.z - b.d * 0.5 - 0.25,
        maxZ: b.z + b.d * 0.5 + 0.25,
        maxY: b.h,
        blocksSight: true,
        source: 'ruin',
      });
    }
    void idx;
  });
  scene.add(cityGroup);
  sceneObjects.push(cityGroup);
  ruinObjects.push(cityGroup);

  // 5. CLASSIC BUENOS AIRES STREETLAMPS along wider Av. 9 de Julio, Plaza de la República & Cross Streets
  const lampPoleGeo = new THREE.CylinderGeometry(0.08, 0.13, 5.2, 8);
  lampPoleGeo.translate(0, 2.6, 0);
  const lampArmGeo = new THREE.BoxGeometry(0.1, 0.1, 1.15);
  const lampHeadGeo = new THREE.BoxGeometry(0.34, 0.15, 0.52);
  const lampBulbGeo = new THREE.SphereGeometry(0.15, 8, 8);
  const lampMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1e242d,
    roughness: 0.5,
    metalness: 0.78,
  });
  disposables.push(lampPoleGeo, lampArmGeo, lampHeadGeo, lampBulbGeo, lampMetalMat);

  const lampCoords = [
    { x: -9.8, z: -10.8, yaw: Math.PI * 0.25, lit: true },
    { x: 9.8, z: -10.8, yaw: -Math.PI * 0.25, lit: true },
    { x: -9.8, z: 10.8, yaw: Math.PI * 0.75, lit: true },
    { x: 9.8, z: 10.8, yaw: -Math.PI * 0.75, lit: true },
    { x: -37.2, z: -14.0, yaw: Math.PI / 2, lit: true },
    { x: 37.2, z: -14.0, yaw: -Math.PI / 2, lit: false },
    { x: -37.2, z: 14.0, yaw: Math.PI / 2, lit: false },
    { x: 37.2, z: 14.0, yaw: -Math.PI / 2, lit: true },
    { x: -37.2, z: -50.0, yaw: Math.PI / 2, lit: true },
    { x: 37.2, z: -50.0, yaw: -Math.PI / 2, lit: false },
    { x: -37.2, z: 50.0, yaw: Math.PI / 2, lit: false },
    { x: 37.2, z: 50.0, yaw: -Math.PI / 2, lit: true },
    { x: -37.2, z: -88.0, yaw: Math.PI / 2, lit: false },
    { x: 37.2, z: -88.0, yaw: -Math.PI / 2, lit: false },
    { x: -37.2, z: 88.0, yaw: Math.PI / 2, lit: false },
    { x: 37.2, z: 88.0, yaw: -Math.PI / 2, lit: false },
    { x: -65.5, z: -10.0, yaw: -Math.PI / 2, lit: false },
    { x: 65.5, z: 10.0, yaw: Math.PI / 2, lit: false },
  ];
  const lampGroups: {
    group: THREE.Group;
    baseGroup: THREE.Group;
    overrideHolder: THREE.Group;
    x: number;
    z: number;
  }[] = [];
  const lampPoints: THREE.PointLight[] = [];
  lampCoords.forEach((lc) => {
    const ly = groundHeightAt(lc.x, lc.z);
    const lampGroup = new THREE.Group();
    lampGroup.position.set(lc.x, ly, lc.z);
    lampGroup.rotation.y = lc.yaw;

    const baseGroup = new THREE.Group();
    const overrideHolder = new THREE.Group();
    lampGroup.add(baseGroup, overrideHolder);

    const pole = new THREE.Mesh(lampPoleGeo, lampMetalMat);
    pole.castShadow = Math.abs(lc.z) < 60;
    pole.receiveShadow = true;
    const arm = new THREE.Mesh(lampArmGeo, lampMetalMat);
    arm.position.set(0, 5.1, 0.48);
    const head = new THREE.Mesh(lampHeadGeo, lampMetalMat);
    head.position.set(0, 5.04, 0.96);
    const bulb = new THREE.Mesh(lampBulbGeo, lampGlowMat);
    bulb.position.set(0, 4.94, 0.98);
    baseGroup.add(pole, arm, head, bulb);

    if (lc.lit) {
      const point = new THREE.PointLight(0xffb85c, 2.3, 20, 1.4);
      point.position.set(0, 4.75, 1.0);
      lampGroup.add(point);
      lampPoints.push(point);
    }

    scene.add(lampGroup);
    sceneObjects.push(lampGroup);
    citySurfaceObjects.push(lampGroup);
    lampGroups.push({ group: lampGroup, baseGroup, overrideHolder, x: lc.x, z: lc.z });
    baseColliders.push({ x: lc.x, z: lc.z, radius: 0.36, height: 5.2, source: 'lamp' });
  });

  // 6. HARVEST / SUPPLY NODES (urban supply crates & fuel drums across the 3N/3S/2E/2W grid)
  const harvestNodes: HarvestNode[] = [];
  const crateGeo = new THREE.BoxGeometry(1.1, 1.05, 1.1);
  crateGeo.translate(0, 0.525, 0);
  const drumGeo = new THREE.CylinderGeometry(0.46, 0.46, 1.15, 12);
  drumGeo.translate(0, 0.575, 0);

  const crateMat = new THREE.MeshStandardMaterial({
    map: barkTex,
    color: 0x9a7b4f,
    roughness: 0.82,
    metalness: 0.08,
  });
  const drumMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: new THREE.Color(0xd97706),
    emissiveIntensity: 0.7,
    roughness: 0.32,
    metalness: 0.55,
  });
  disposables.push(crateGeo, drumGeo, crateMat, drumMat);

  const nodeSpots = [
    { x: -7.8, z: -9.4 },
    { x: 7.8, z: -9.4 },
    { x: -19.5, z: -13.5 },
    { x: 19.5, z: -13.5 },
    { x: -19.5, z: 14.5 },
    { x: 19.5, z: 14.5 },
    { x: -35.2, z: -5.5 },
    { x: 35.2, z: 5.5 },
    { x: -35.2, z: 24.0 },
    { x: 35.2, z: -24.0 },
    { x: -8.0, z: 29.5 },
    { x: 8.0, z: -29.5 },
    { x: -25.0, z: -55.0 },
    { x: 25.0, z: 55.0 },
    { x: -67.0, z: -38.0 },
    { x: 67.0, z: 38.0 },
    { x: -19.0, z: -92.0 },
    { x: 19.0, z: 92.0 },
  ];

  nodeSpots.forEach((spot, i) => {
    const y = groundHeightAt(spot.x, spot.z);
    const kind: 'timber' | 'sunstone' = i % 3 === 0 ? 'sunstone' : 'timber';
    const nodeGroup = new THREE.Group();
    nodeGroup.position.set(spot.x, y, spot.z);
    nodeGroup.rotation.y = i * 0.72;

    const baseHolder = new THREE.Group();
    const visualHolder = new THREE.Group();
    nodeGroup.add(baseHolder, visualHolder);

    if (kind === 'timber') {
      const box = new THREE.Mesh(crateGeo, crateMat);
      box.castShadow = true;
      box.receiveShadow = true;
      baseHolder.add(box);
    } else {
      const drum = new THREE.Mesh(drumGeo, drumMat);
      drum.castShadow = true;
      baseHolder.add(drum);
    }

    scene.add(nodeGroup);
    harvestNodes.push({
      id: i,
      kind,
      x: spot.x,
      z: spot.z,
      hp: kind === 'timber' ? 35 : 45,
      maxHp: kind === 'timber' ? 35 : 45,
      respawnTimer: 0,
      group: nodeGroup,
      baseHolder,
      visualHolder,
      hitFlash: 0,
    });
  });

  // 7. OVERGROWN POST-APOCALYPTIC BOULEVARD TREES (Detailed gnarled limbs & multi-lobe organic leafy canopies)
  const trunkGeo = buildDetailedTreeTrunkGeo();
  const trunkMat = new THREE.MeshStandardMaterial({
    map: barkTex,
    color: 0x3c2e22,
    roughness: 0.94,
    metalness: 0.03,
  });
  const canopyMainGeo = buildOrganicFoliageClusterGeo(
    [
      { x: 0.0, y: 4.35, z: 0.0, r: 1.55, sx: 1.15, sy: 0.85, sz: 1.15 },
      { x: -1.15, y: 4.15, z: 0.72, r: 1.25, sx: 1.05, sy: 0.8, sz: 1.05 },
      { x: 1.18, y: 4.2, z: -0.68, r: 1.28, sx: 1.08, sy: 0.82, sz: 1.02 },
      { x: 0.65, y: 4.55, z: 1.05, r: 1.18, sx: 1.02, sy: 0.84, sz: 1.08 },
      { x: -0.78, y: 4.5, z: -1.02, r: 1.22, sx: 1.06, sy: 0.8, sz: 1.04 },
      { x: 0.15, y: 3.65, z: -0.82, r: 0.98, sx: 1.1, sy: 0.76, sz: 1.05 },
      { x: -0.42, y: 3.7, z: 0.86, r: 0.95, sx: 1.08, sy: 0.75, sz: 1.08 },
    ],
    1.7,
  );
  const canopySideGeo = buildOrganicFoliageClusterGeo(
    [
      { x: 1.68, y: 3.85, z: 0.82, r: 1.15, sx: 1.12, sy: 0.78, sz: 1.06 },
      { x: -1.62, y: 3.92, z: -0.75, r: 1.12, sx: 1.1, sy: 0.78, sz: 1.05 },
      { x: 0.95, y: 4.08, z: -1.55, r: 1.08, sx: 1.05, sy: 0.76, sz: 1.12 },
      { x: -1.05, y: 3.82, z: 1.52, r: 1.1, sx: 1.08, sy: 0.75, sz: 1.1 },
      { x: 1.85, y: 4.45, z: -0.25, r: 0.96, sx: 1.06, sy: 0.82, sz: 1.02 },
      { x: -1.82, y: 4.35, z: 0.35, r: 0.98, sx: 1.05, sy: 0.82, sz: 1.04 },
    ],
    5.4,
  );
  const canopyTopGeo = buildOrganicFoliageClusterGeo(
    [
      { x: -0.45, y: 5.25, z: -0.25, r: 1.25, sx: 1.08, sy: 0.85, sz: 1.08 },
      { x: 0.68, y: 5.32, z: 0.32, r: 1.16, sx: 1.06, sy: 0.84, sz: 1.04 },
      { x: -0.95, y: 4.92, z: 0.65, r: 0.98, sx: 1.05, sy: 0.8, sz: 1.05 },
      { x: 0.12, y: 5.75, z: -0.42, r: 0.92, sx: 1.02, sy: 0.88, sz: 1.02 },
      { x: 0.88, y: 4.88, z: -0.82, r: 0.95, sx: 1.05, sy: 0.82, sz: 1.04 },
      { x: -0.28, y: 5.48, z: 0.85, r: 0.88, sx: 1.04, sy: 0.82, sz: 1.04 },
    ],
    9.2,
  );
  const foliageMat = createWindFoliageMaterial(
    {
      map: baTex.foliageLeaf,
      color: 0xffffff,
      roughness: 0.89,
      metalness: 0.02,
    },
    windTimeUniform,
    'canopy',
  );
  const planterGeo = new THREE.BoxGeometry(1.45, 0.28, 1.45);
  planterGeo.translate(0, 0.14, 0);

  const treeCoords: { x: number; z: number; jacaranda: boolean; scale: number; solid: boolean }[] = [
    // Hero South-East Plaza & Corner Broad-Canopy Trees (matching photo's dense green foreground grove)
    { x: 7.4, z: 7.4, jacaranda: false, scale: 1.55, solid: true },
    { x: 10.2, z: 11.4, jacaranda: false, scale: 1.38, solid: true },
    { x: -7.8, z: -4.5, jacaranda: false, scale: 1.05, solid: true },
    { x: 7.8, z: -4.5, jacaranda: false, scale: 1.12, solid: true },
    { x: -7.8, z: 4.0, jacaranda: false, scale: 1.0, solid: true },
    // Hero Giant Spreading Tree on Cerrito west corner overhanging the avenue (left-center in photo)
    { x: -37.8, z: 14.5, jacaranda: false, scale: 1.88, solid: true },
    { x: -37.8, z: 27.5, jacaranda: false, scale: 1.45, solid: true },
    // Metrobus & central median overgrown boulevard trees
    { x: -10.8, z: -15.5, jacaranda: false, scale: 1.15, solid: true },
    { x: 10.8, z: -15.5, jacaranda: false, scale: 1.18, solid: true },
    { x: -10.8, z: -27.5, jacaranda: false, scale: 1.2, solid: true },
    { x: 10.8, z: -27.5, jacaranda: false, scale: 1.15, solid: true },
    { x: -10.8, z: 15.5, jacaranda: false, scale: 1.12, solid: true },
    { x: -10.8, z: 27.5, jacaranda: false, scale: 1.15, solid: true },
    { x: 10.8, z: 27.5, jacaranda: false, scale: 1.15, solid: true },
    { x: 0, z: -18.5, jacaranda: false, scale: 1.1, solid: true },
    { x: 0, z: -29.5, jacaranda: false, scale: 1.14, solid: true },
    { x: 0, z: 21.5, jacaranda: false, scale: 1.15, solid: true },
    { x: 0, z: 31.5, jacaranda: false, scale: 1.18, solid: true },
    { x: 0, z: -53.0, jacaranda: false, scale: 1.22, solid: true },
    { x: 0, z: -65.0, jacaranda: false, scale: 1.16, solid: true },
    { x: 0, z: 53.0, jacaranda: false, scale: 1.18, solid: true },
    { x: 0, z: 65.0, jacaranda: false, scale: 1.22, solid: true },
    { x: 0, z: -90.0, jacaranda: false, scale: 1.2, solid: true },
    { x: 0, z: 90.0, jacaranda: false, scale: 1.2, solid: true },
    // Cerrito & Carlos Pellegrini wide boulevard sidewalk trees (3 blocks N & S)
    { x: -37.8, z: -12.0, jacaranda: false, scale: 1.28, solid: true },
    { x: -37.8, z: -31.0, jacaranda: false, scale: 1.2, solid: true },
    { x: -37.8, z: -52.0, jacaranda: false, scale: 1.24, solid: true },
    { x: -37.8, z: -66.0, jacaranda: false, scale: 1.18, solid: true },
    { x: -37.8, z: 52.0, jacaranda: false, scale: 1.25, solid: true },
    { x: -37.8, z: 66.0, jacaranda: false, scale: 1.18, solid: true },
    { x: -37.8, z: -90.0, jacaranda: false, scale: 1.22, solid: true },
    { x: -37.8, z: 90.0, jacaranda: false, scale: 1.2, solid: true },
    { x: 37.8, z: -12.0, jacaranda: false, scale: 1.22, solid: true },
    { x: 37.8, z: -26.0, jacaranda: false, scale: 1.25, solid: true },
    { x: 37.8, z: 12.0, jacaranda: false, scale: 1.24, solid: true },
    { x: 37.8, z: 26.0, jacaranda: false, scale: 1.22, solid: true },
    { x: 37.8, z: -52.0, jacaranda: false, scale: 1.2, solid: true },
    { x: 37.8, z: -66.0, jacaranda: false, scale: 1.18, solid: true },
    { x: 37.8, z: 52.0, jacaranda: false, scale: 1.18, solid: true },
    { x: 37.8, z: 66.0, jacaranda: false, scale: 1.2, solid: true },
    { x: 37.8, z: -90.0, jacaranda: false, scale: 1.18, solid: true },
    { x: 37.8, z: 90.0, jacaranda: false, scale: 1.2, solid: true },
    // Libertad & Suipacha side-street trees
    { x: -64.8, z: -22.0, jacaranda: false, scale: 1.12, solid: true },
    { x: -64.8, z: 22.0, jacaranda: false, scale: 1.12, solid: true },
    { x: -64.8, z: -60.0, jacaranda: false, scale: 1.14, solid: true },
    { x: -64.8, z: 60.0, jacaranda: false, scale: 1.14, solid: true },
    { x: 64.8, z: -22.0, jacaranda: false, scale: 1.12, solid: true },
    { x: 64.8, z: 22.0, jacaranda: false, scale: 1.12, solid: true },
    { x: 64.8, z: -60.0, jacaranda: false, scale: 1.14, solid: true },
    { x: 64.8, z: 60.0, jacaranda: false, scale: 1.14, solid: true },
  ];

  const treeCount = treeCoords.length;
  const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
  const canopyMainInst = new THREE.InstancedMesh(canopyMainGeo, foliageMat, treeCount);
  const canopySideInst = new THREE.InstancedMesh(canopySideGeo, foliageMat, treeCount);
  const canopyTopInst = new THREE.InstancedMesh(canopyTopGeo, foliageMat, treeCount);
  const planterInst = new THREE.InstancedMesh(planterGeo, barrierMat, treeCount);
  [trunkInst, canopyMainInst, canopySideInst, canopyTopInst, planterInst].forEach((inst) => {
    inst.castShadow = true;
    inst.receiveShadow = true;
  });

  const tintColor = new THREE.Color();
  treeCoords.forEach((tc, idx) => {
    const y = groundHeightAt(tc.x, tc.z);
    const rotY = idx * 1.13;
    dummy.position.set(tc.x, y, tc.z);
    dummy.rotation.set(0, rotY, 0);
    dummy.scale.setScalar(tc.scale);
    dummy.updateMatrix();
    trunkInst.setMatrixAt(idx, dummy.matrix);
    canopyMainInst.setMatrixAt(idx, dummy.matrix);
    canopySideInst.setMatrixAt(idx, dummy.matrix);
    canopyTopInst.setMatrixAt(idx, dummy.matrix);

    dummy.scale.setScalar(1);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    planterInst.setMatrixAt(idx, dummy.matrix);

    // Deep shaded inner crown -> olive mid-boughs -> sunlit outer leaf tips (modulated over foliageLeaf texture)
    if (idx % 3 === 0) {
      tintColor.setHex(0x6b935d).offsetHSL(((idx % 3) - 1) * 0.015, 0.03, 0);
      canopyMainInst.setColorAt(idx, tintColor);
      tintColor.setHex(0x82ab6d);
      canopySideInst.setColorAt(idx, tintColor);
      tintColor.setHex(0x9ac27e);
      canopyTopInst.setColorAt(idx, tintColor);
    } else if (idx % 2 === 0) {
      tintColor.setHex(0x7ba164).offsetHSL(((idx % 3) - 1) * 0.015, 0.03, 0);
      canopyMainInst.setColorAt(idx, tintColor);
      tintColor.setHex(0x90b673);
      canopySideInst.setColorAt(idx, tintColor);
      tintColor.setHex(0xa8ca85);
      canopyTopInst.setColorAt(idx, tintColor);
    } else {
      tintColor.setHex(0x5c8452).offsetHSL(((idx % 4) - 1.5) * 0.012, 0.02, 0);
      canopyMainInst.setColorAt(idx, tintColor);
      tintColor.offsetHSL(0, 0, 0.06);
      canopySideInst.setColorAt(idx, tintColor);
      tintColor.offsetHSL(0, 0, 0.08);
      canopyTopInst.setColorAt(idx, tintColor);
    }

    if (tc.solid) {
      baseColliders.push({
        x: tc.x,
        z: tc.z,
        radius: 0.75 * tc.scale,
        height: 4.5,
        source: 'tree',
      });
    }
  });
  [trunkInst, canopyMainInst, canopySideInst, canopyTopInst, planterInst].forEach((inst) => {
    inst.computeBoundingSphere();
    scene.add(inst);
    sceneObjects.push(inst);
    forestObjects.push(inst);
  });
  const treeOverrideGroup = new THREE.Group();
  treeOverrideGroup.visible = false;
  scene.add(treeOverrideGroup);
  sceneObjects.push(treeOverrideGroup);
  forestObjects.push(treeOverrideGroup);

  disposables.push(
    trunkGeo,
    trunkMat,
    canopyMainGeo,
    canopySideGeo,
    canopyTopGeo,
    foliageMat,
    planterGeo,
  );

  const clearHolder = (holder: THREE.Group) => {
    while (holder.children.length > 0) {
      holder.remove(holder.children[0]);
    }
  };

  const applyObjectOverride = (
    targetId: WorldObjectOverrideId,
    template: CustomObjectTemplate | null,
  ) => {
    if (targetId === 'obelisco') {
      clearHolder(obeliscoOverride);
      obelisco.group.visible = !template;
      if (template) {
        obeliscoOverride.add(template.scene.clone(true));
      }
      return;
    }

    if (targetId === 'ba_monument') {
      clearHolder(baOverride);
      baBase.visible = !template;
      if (template) {
        baOverride.add(template.scene.clone(true));
      }
      return;
    }

    if (targetId === 'metrobus_station') {
      stationEntries.forEach((st) => {
        clearHolder(st.overrideHolder);
        st.baseGroup.visible = !template;
        if (template) {
          const clone = template.scene.clone(true);
          clone.rotation.y = st.facingEast ? 0 : Math.PI;
          st.overrideHolder.add(clone);
        }
      });
      return;
    }

    if (targetId === 'bus') {
      busEntries.forEach((b) => {
        clearHolder(b.overrideHolder);
        b.baseGroup.visible = !template;
        if (template) {
          b.overrideHolder.add(template.scene.clone(true));
        }
      });
      return;
    }

    if (targetId === 'concrete_barrier') {
      clearHolder(barrierOverrideGroup);
      barrierInst.visible = !template;
      barrierOverrideGroup.visible = Boolean(template);
      if (template) {
        barrierMeta.forEach((bm) => {
          const clone = template.scene.clone(true);
          clone.position.set(bm.x, groundHeightAt(bm.x, bm.z), bm.z);
          clone.rotation.y = bm.rotY;
          barrierOverrideGroup.add(clone);
        });
      }
      return;
    }

    if (targetId === 'streetlamp') {
      lampGroups.forEach((lg) => {
        clearHolder(lg.overrideHolder);
        lg.baseGroup.visible = !template;
        if (template) {
          lg.overrideHolder.add(template.scene.clone(true));
        }
      });
      return;
    }

    if (targetId === 'crate_timber' || targetId === 'crate_sunstone') {
      const targetKind = targetId === 'crate_timber' ? 'timber' : 'sunstone';
      harvestNodes.forEach((hn) => {
        if (hn.kind !== targetKind) return;
        clearHolder(hn.visualHolder);
        hn.baseHolder.visible = !template;
        if (template) {
          hn.visualHolder.add(template.scene.clone(true));
        }
      });
      return;
    }

    if (targetId === 'tree') {
      clearHolder(treeOverrideGroup);
      const showBase = !template;
      trunkInst.visible = showBase;
      canopyMainInst.visible = showBase;
      canopySideInst.visible = showBase;
      canopyTopInst.visible = showBase;
      planterInst.visible = showBase;
      treeOverrideGroup.visible = Boolean(template);
      if (template) {
        treeCoords.forEach((tc, idx) => {
          const clone = template.scene.clone(true);
          clone.position.set(tc.x, groundHeightAt(tc.x, tc.z), tc.z);
          clone.rotation.y = idx * 1.13;
          clone.scale.setScalar(tc.scale);
          treeOverrideGroup.add(clone);
        });
      }
      return;
    }

    if (targetId === 'building') {
      buildingEntries.forEach((be) => {
        clearHolder(be.overrideHolder);
        be.baseGroup.visible = !template;
        if (template) {
          const clone = template.scene.clone(true);
          const sx = be.spec.w / Math.max(0.5, template.size.x);
          const sy = be.spec.h / Math.max(0.5, template.size.y);
          const sz = be.spec.d / Math.max(0.5, template.size.z);
          clone.scale.set(sx, sy, sz);
          be.overrideHolder.add(clone);
        }
      });
      return;
    }

    if (targetId === 'teatro_colon') {
      clearHolder(teatroColon.overrideHolder);
      teatroColon.baseGroup.visible = !template;
      if (template) {
        teatroColon.overrideHolder.add(template.scene.clone(true));
      }
    }
  };

  const updateColonBeacon = (unlocked: boolean, elapsed: number) => {
    const pulse = 0.72 + Math.sin(elapsed * (unlocked ? 4.2 : 2.1)) * 0.24;
    const hex = unlocked ? 0x10b981 : 0xf59e0b;
    teatroColon.beaconRingMat.color.setHex(hex);
    teatroColon.beaconRingMat.opacity = unlocked ? 0.55 + pulse * 0.35 : 0.3 + pulse * 0.2;
    teatroColon.beaconBeamMat.color.setHex(hex);
    teatroColon.beaconBeamMat.opacity = unlocked ? 0.22 * pulse : 0.08 * pulse;
    teatroColon.beaconLight.color.setHex(hex);
    teatroColon.beaconLight.visible = unlocked;
    teatroColon.beaconLight.intensity = unlocked ? 3.8 * pulse : 0;
    teatroColon.beaconRing.scale.setScalar(unlocked ? 0.96 + Math.sin(elapsed * 3.5) * 0.06 : 0.88);
  };

  const rebuildTerrainHeights = (newScale: number, preset: MapPresetId = activeMapPreset) => {
    setTerrainReliefScale(newScale);
    applyTerrainAttributes(preset);

    obeliscoRoot.position.y = groundHeightAt(0, -2.2);
    baRoot.position.y = groundHeightAt(0, 5.4);
    teatroColon.root.position.y = groundHeightAt(COLON_BUILDING_X, COLON_BUILDING_Z);
    fastFood.root.position.y = groundHeightAt(FASTFOOD_CENTER_X, FASTFOOD_CENTER_Z);
    stationEntries.forEach((st) => {
      st.root.position.y = groundHeightAt(st.x, st.z);
    });
    busEntries.forEach((b) => {
      b.root.position.y = groundHeightAt(b.x, b.z);
    });
    buildingEntries.forEach((be) => {
      be.group.position.y = groundHeightAt(be.spec.x, be.spec.z);
    });

    whiteStripePositions.forEach((st, idx) => {
      dummy.position.set(st.x, groundHeightAt(st.x, st.z) + 0.025, st.z);
      dummy.rotation.set(0, st.rotY, 0);
      dummy.scale.set(st.sx, 1, st.sz);
      dummy.updateMatrix();
      whiteStripeInst.setMatrixAt(idx, dummy.matrix);
    });
    whiteStripeInst.instanceMatrix.needsUpdate = true;

    barrierMeta.forEach((bm, idx) => {
      dummy.position.set(bm.x, groundHeightAt(bm.x, bm.z) + 0.28, bm.z);
      dummy.rotation.set(0, bm.rotY, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      barrierInst.setMatrixAt(idx, dummy.matrix);
      const ovChild = barrierOverrideGroup.children[idx];
      if (ovChild) {
        ovChild.position.y = groundHeightAt(bm.x, bm.z);
      }
    });
    barrierInst.instanceMatrix.needsUpdate = true;

    lampGroups.forEach((lg) => {
      lg.group.position.y = groundHeightAt(lg.x, lg.z);
    });
    harvestNodes.forEach((hn) => {
      hn.group.position.y = groundHeightAt(hn.x, hn.z);
    });

    treeCoords.forEach((tc, idx) => {
      const y = groundHeightAt(tc.x, tc.z);
      dummy.position.set(tc.x, y, tc.z);
      dummy.rotation.set(0, idx * 1.13, 0);
      dummy.scale.setScalar(tc.scale);
      dummy.updateMatrix();
      trunkInst.setMatrixAt(idx, dummy.matrix);
      canopyMainInst.setMatrixAt(idx, dummy.matrix);
      canopySideInst.setMatrixAt(idx, dummy.matrix);
      canopyTopInst.setMatrixAt(idx, dummy.matrix);

      dummy.scale.setScalar(1);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      planterInst.setMatrixAt(idx, dummy.matrix);

      const ovTree = treeOverrideGroup.children[idx];
      if (ovTree) {
        ovTree.position.y = y;
      }
    });
    trunkInst.instanceMatrix.needsUpdate = true;
    canopyMainInst.instanceMatrix.needsUpdate = true;
    canopySideInst.instanceMatrix.needsUpdate = true;
    canopyTopInst.instanceMatrix.needsUpdate = true;
    planterInst.instanceMatrix.needsUpdate = true;

    weedSpots.forEach((ws, idx) => {
      dummy.position.set(ws.x, groundHeightAt(ws.x, ws.z) + (ws.yOff ?? 0), ws.z);
      dummy.rotation.set(0, ws.rotY, 0);
      dummy.scale.set(ws.sx, ws.sy, ws.sx);
      dummy.updateMatrix();
      weedInst.setMatrixAt(idx, dummy.matrix);
    });
    weedInst.instanceMatrix.needsUpdate = true;

    STREET_POTHOLES.forEach((ph, idx) => {
      dummy.position.set(ph.x, 0.015, ph.z);
      dummy.rotation.set(0, idx * 0.9, 0);
      dummy.scale.set(ph.radius, 1, ph.radius * (0.86 + (idx % 3) * 0.1));
      dummy.updateMatrix();
      potholeRimInst.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(ph.x, groundHeightAt(ph.x, ph.z) + 0.018, ph.z);
      dummy.scale.set(ph.radius * 0.92, 1, ph.radius * 0.82);
      dummy.updateMatrix();
      potholeBasinInst.setMatrixAt(idx, dummy.matrix);
    });
    potholeRimInst.instanceMatrix.needsUpdate = true;
    potholeBasinInst.instanceMatrix.needsUpdate = true;

    dirtPatches.forEach((pa, idx) => {
      dummy.position.set(pa.x, groundHeightAt(pa.x, pa.z) + 0.008, pa.z);
      dummy.rotation.set(0, pa.rotY, 0);
      dummy.scale.set(pa.rx, 1, pa.rz);
      dummy.updateMatrix();
      dirtPatchInst.setMatrixAt(idx, dummy.matrix);
    });
    cobblePatches.forEach((pa, idx) => {
      dummy.position.set(pa.x, groundHeightAt(pa.x, pa.z) + 0.012, pa.z);
      dummy.rotation.set(0, pa.rotY, 0);
      dummy.scale.set(pa.rx, 1, pa.rz);
      dummy.updateMatrix();
      cobblePatchInst.setMatrixAt(idx, dummy.matrix);
    });
    MISSING_ASPHALT_PATCHES.forEach((pa, idx) => {
      dummy.position.set(pa.x, groundHeightAt(pa.x, pa.z) + 0.024, pa.z);
      dummy.rotation.set(0, pa.rotY, 0);
      dummy.scale.set(pa.rx, 1, pa.rz);
      dummy.updateMatrix();
      patchLipInst.setMatrixAt(idx, dummy.matrix);
    });
    dirtPatchInst.instanceMatrix.needsUpdate = true;
    cobblePatchInst.instanceMatrix.needsUpdate = true;
    patchLipInst.instanceMatrix.needsUpdate = true;

    crackSpecs.forEach((cs, idx) => {
      dummy.position.set(cs.x, groundHeightAt(cs.x, cs.z) + 0.012, cs.z);
      dummy.rotation.set(0, cs.rotY, 0);
      dummy.scale.set(cs.w, 1, cs.len);
      dummy.updateMatrix();
      crackInst.setMatrixAt(idx, dummy.matrix);
    });
    crackInst.instanceMatrix.needsUpdate = true;

    WATER_PUDDLES.forEach((wp, idx) => {
      dummy.position.set(wp.x, groundHeightAt(wp.x, wp.z) + 0.024, wp.z);
      dummy.rotation.set(0, wp.rotY, 0);
      dummy.scale.set(wp.rx, 1, wp.rz);
      dummy.updateMatrix();
      waterPuddleInst.setMatrixAt(idx, dummy.matrix);
    });
    waterPuddleInst.instanceMatrix.needsUpdate = true;
  };

  let exteriorVisibleState = true;
  const savedVisibility = new Map<THREE.Object3D, boolean>();
  const setExteriorVisible = (visible: boolean) => {
    if (visible === exteriorVisibleState) return;
    exteriorVisibleState = visible;
    if (!visible) {
      savedVisibility.clear();
      sceneObjects.forEach((obj) => {
        savedVisibility.set(obj, obj.visible);
        obj.visible = false;
      });
      harvestNodes.forEach((n) => {
        savedVisibility.set(n.group, n.group.visible);
        n.group.visible = false;
      });
    } else {
      sceneObjects.forEach((obj) => {
        const prev = savedVisibility.get(obj);
        if (prev !== undefined) obj.visible = prev;
      });
      harvestNodes.forEach((n) => {
        n.group.visible = n.hp > 0;
      });
      savedVisibility.clear();
    }
  };

  return {
    harvestNodes,
    trashSpots,
    baseColliders,
    colliders: [...baseColliders],
    baseBoxColliders,
    boxColliders: [...baseBoxColliders],
    looseRockInst,
    looseRockSeeds,
    terrain,
    terrainMat,
    plazaMat,
    pillarMat,
    barrierMat,
    rockMat,
    trunkMat,
    crateMat,
    skyDome,
    skyMat,
    sunDisc,
    sunHalo,
    moonMesh,
    moonHalo,
    stars,
    starMat,
    lampGlowMat,
    lampPoints,
    nightGlowMats,
    ruinObjects,
    forestObjects,
    citySurfaceObjects,
    editorGrid,
    fastFood,
    windTimeUniform,
    burningSpots,
    rebuildTerrainHeights,
    applyObjectOverride,
    updateColonBeacon,
    setExteriorVisible,
    dispose: () => {
      sceneObjects.forEach((obj) => scene.remove(obj));
      harvestNodes.forEach((n) => scene.remove(n.group));
      disposables.forEach((d) => d.dispose());
    },
  };
}
