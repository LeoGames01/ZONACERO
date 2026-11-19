import {
  cargarCustomCharacterSlotBuffers,
  cargarEquipmentBuffers,
  cargarModeloCache,
  cargarNpcGlbBuffers,
  cargarObjectOverrideBuffers,
  cargarPistolCache,
  cargarRemoteManifestMeta,
  cargarRifleCache,
  cargarZombieSlotBuffers,
  type CustomNpcTargetId,
  eliminarCustomCharacterSlotCache,
  eliminarZombieSlotCache,
  guardarAttachmentTransformsLocal,
  guardarCustomCharacterSlotCache,
  guardarEquipmentCache,
  guardarModeloCache,
  guardarNpcGlbCache,
  guardarObjectOverrideCache,
  guardarPistolCache,
  guardarRemoteManifestMeta,
  guardarRifleCache,
  guardarZombieSlotsBatchCache,
  hasAttachmentTransformsLocal,
  listarCustomCharacterSlotsCache,
  listarZombieSlotsCache,
} from './modelCache';
import {
  createDefaultAttachmentTransforms,
  sanitizeAttachmentTransforms,
} from './settingsDefaults';
import type {
  AttachmentTransformsState,
  CustomEquipmentId,
  HudSnapshot,
  RemoteAssetErrorDetail,
  RemoteManifestSyncInfo,
  WorldObjectOverrideId,
  ZombieTargetKind,
} from './types';

/**
 * URL configurable del manifiesto maestro remoto.
 * Puedes cambiarla aquí o desde Estudio -> Modelos .glb por una URL externa de GitHub Raw, por ejemplo:
 * "https://raw.githubusercontent.com/tu-usuario/tu-repo/main/models_manifest.json"
 */
export const REMOTE_MANIFEST_URL =
  (typeof import.meta !== 'undefined' &&
    (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_REMOTE_MANIFEST_URL) ||
  'https://raw.githubusercontent.com/LeoGames01/modelos-3d-juego./refs/heads/main/models_manifest.json';

const REMOTE_MANIFEST_URL_LS_KEY = 'zonacero_remote_manifest_url_v1';
const MANIFEST_FETCH_TIMEOUT_MS = 15000;
const GLB_FETCH_TIMEOUT_MS = 45000;
const MAX_CONCURRENT_DOWNLOADS = 4;
export const MIN_GLB_BYTE_LENGTH = 256;

export type RemoteAssetEntry =
  | string
  | {
      url: string;
      name?: string;
    };

export type RemoteZombieEntry =
  | string
  | {
      id?: string;
      url: string;
      name?: string;
      targetKind?: ZombieTargetKind;
      spawnCount?: number;
    };

export type RemoteCustomCharacterEntry =
  | string
  | {
      id?: string;
      url: string;
      name?: string;
      role?: 'npc' | 'ally' | 'custom';
    };

export interface RemoteModelsManifest {
  version: number;
  updatedAt?: string;
  assetsBaseUrl?: string;
  models: {
    player?: RemoteAssetEntry | null;
    npcs?: Partial<Record<CustomNpcTargetId, RemoteAssetEntry | null>>;
    customCharacters?: RemoteCustomCharacterEntry[];
    zombies?: RemoteZombieEntry[];
    weapons?: {
      rifle?: RemoteAssetEntry | null;
      pistol?: RemoteAssetEntry | null;
    };
    equipment?: Partial<Record<CustomEquipmentId, RemoteAssetEntry | null>>;
    objectOverrides?: Partial<Record<WorldObjectOverrideId, RemoteAssetEntry | null>>;
  };
  attachmentTransforms?: AttachmentTransformsState;
}

export interface RemoteSyncResult {
  info: RemoteManifestSyncInfo;
  updatedTransforms: AttachmentTransformsState | null;
  updatedAssets: boolean;
}

export function getRemoteManifestUrl(): string {
  try {
    const custom = localStorage.getItem(REMOTE_MANIFEST_URL_LS_KEY)?.trim();
    if (custom && custom !== './assets/models_manifest.json') return custom;
  } catch {
    // Ignore localStorage access errors
  }
  return REMOTE_MANIFEST_URL;
}

export function setRemoteManifestUrl(url: string | null): string {
  const trimmed = url?.trim() ?? '';
  try {
    if (!trimmed || trimmed === REMOTE_MANIFEST_URL) {
      localStorage.removeItem(REMOTE_MANIFEST_URL_LS_KEY);
      return REMOTE_MANIFEST_URL;
    }
    localStorage.setItem(REMOTE_MANIFEST_URL_LS_KEY, trimmed);
    return trimmed;
  } catch {
    return trimmed || REMOTE_MANIFEST_URL;
  }
}

function parseVersionNumber(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const n = Number.parseFloat(raw.trim());
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function formatErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message || err.name || 'Error desconocido';
  }
  if (typeof err === 'string' && err.trim()) return err;
  return 'Error desconocido';
}

function normalizeAssetEntry(entry: RemoteAssetEntry | null | undefined): {
  url: string;
  name: string;
} | null {
  if (!entry) return null;
  const rawUrl = typeof entry === 'string' ? entry.trim() : entry.url?.trim() ?? '';
  if (!rawUrl) return null;
  const explicitName = typeof entry === 'object' ? entry.name?.trim() : undefined;
  const fallbackName = rawUrl.split('?')[0].split('#')[0].split('/').pop() || 'model.glb';
  return {
    url: rawUrl,
    name: explicitName || fallbackName,
  };
}

function normalizeGitHubRawUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  const blobMatch = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/(?:blob|raw)\/(.+)$/i.exec(trimmed);
  if (blobMatch) {
    return `https://raw.githubusercontent.com/${blobMatch[1]}/${blobMatch[2]}/${blobMatch[3]}`;
  }
  return trimmed;
}

function resolveUrl(rawUrl: string, baseUrl: string): string {
  const normalized = normalizeGitHubRawUrl(rawUrl);
  try {
    return new URL(normalized, baseUrl).toString();
  } catch {
    return normalized;
  }
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
  init: RequestInit = {},
): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(`Tiempo de espera agotado (${Math.round(timeoutMs / 1000)}s)`);
    }
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Tiempo de espera agotado (${Math.round(timeoutMs / 1000)}s)`);
    }
    throw err;
  } finally {
    window.clearTimeout(timer);
  }
}

export function validateGlbOrGltfBuffer(
  buf: ArrayBuffer,
  label: string,
  url: string,
  expectedContentLength?: number | null,
): void {
  if (
    typeof expectedContentLength === 'number' &&
    Number.isFinite(expectedContentLength) &&
    expectedContentLength > 0 &&
    buf.byteLength < expectedContentLength
  ) {
    throw new Error(
      `Descarga incompleta para ${label}: se recibieron ${buf.byteLength} de ${expectedContentLength} bytes (${url})`,
    );
  }
  if (buf.byteLength < MIN_GLB_BYTE_LENGTH) {
    throw new Error(
      `Archivo vacío o demasiado pequeño (${buf.byteLength} bytes; mínimo ${MIN_GLB_BYTE_LENGTH} bytes) para ${label} (${url})`,
    );
  }
  const bytes = new Uint8Array(buf, 0, Math.min(buf.byteLength, 128));
  // Binary glTF (.glb) magic: "glTF" (0x67 0x6C 0x54 0x46)
  if (bytes[0] === 0x67 && bytes[1] === 0x6c && bytes[2] === 0x54 && bytes[3] === 0x46) {
    const view = new DataView(buf);
    const version = view.getUint32(4, true);
    const declaredLength = view.getUint32(8, true);
    if (version !== 2) {
      throw new Error(`Versión GLB no soportada (v${version}) para ${label} (${url})`);
    }
    if (declaredLength < MIN_GLB_BYTE_LENGTH || buf.byteLength < declaredLength) {
      throw new Error(
        `Archivo GLB truncado o incompleto (${buf.byteLength}/${declaredLength} bytes) para ${label} (${url})`,
      );
    }
    const chunk0Length = view.getUint32(12, true);
    const chunk0Type = view.getUint32(16, true);
    if (chunk0Type !== 0x4e4f534a || 20 + chunk0Length > declaredLength) {
      throw new Error(`Cabecera JSON interna dañada en GLB para ${label} (${url})`);
    }
    try {
      const jsonText = new TextDecoder('utf-8', { fatal: false }).decode(
        new Uint8Array(buf, 20, chunk0Length),
      );
      const parsed = JSON.parse(jsonText) as Record<string, unknown>;
      if (!parsed || typeof parsed !== 'object' || (!parsed.asset && !parsed.scenes && !parsed.meshes)) {
        throw new Error('sin metadatos glTF');
      }
    } catch {
      throw new Error(`Estructura JSON interna corrupta en GLB para ${label} (${url})`);
    }
    return;
  }
  // Allow JSON .gltf starting with '{'
  let firstNonWs = 0;
  while (
    firstNonWs < bytes.length &&
    (bytes[firstNonWs] === 0x20 ||
      bytes[firstNonWs] === 0x0a ||
      bytes[firstNonWs] === 0x0d ||
      bytes[firstNonWs] === 0x09)
  ) {
    firstNonWs += 1;
  }
  if (firstNonWs < bytes.length && bytes[firstNonWs] === 0x7b) {
    try {
      const text = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(buf));
      const parsed = JSON.parse(text) as Record<string, unknown>;
      if (!parsed || typeof parsed !== 'object' || (!parsed.asset && !parsed.scenes && !parsed.meshes)) {
        throw new Error('glTF sin escenas ni mallas');
      }
      return;
    } catch {
      throw new Error(`Archivo .gltf JSON corrupto o incompleto para ${label} (${url})`);
    }
  }
  const headText = new TextDecoder('utf-8', { fatal: false }).decode(bytes).trim();
  if (/^version\s+https:\/\/git-lfs\.github\.com/i.test(headText)) {
    throw new Error(
      `El enlace de ${label} apunta a un puntero Git LFS, no al binario .glb (${url})`,
    );
  }
  if (/^<(?:!doctype|html|head|body)/i.test(headText)) {
    throw new Error(
      `El servidor devolvió una página HTML en vez de un .glb para ${label} (${url})`,
    );
  }
  throw new Error(
    `El archivo descargado de ${label} no tiene cabecera .glb válida (${url})`,
  );
}

export function isValidCachedGlbBuffer(buf: ArrayBuffer | null | undefined): boolean {
  if (!buf || buf.byteLength < MIN_GLB_BYTE_LENGTH) return false;
  try {
    validateGlbOrGltfBuffer(buf, 'caché local', 'indexeddb');
    return true;
  } catch {
    return false;
  }
}

async function fetchGlbBuffer(url: string, label: string): Promise<ArrayBuffer> {
  let res: Response;
  try {
    res = await fetchWithTimeout(url, GLB_FETCH_TIMEOUT_MS, { cache: 'no-cache' });
  } catch (err) {
    throw new Error(`Error de red al descargar (${url}): ${formatErrorMessage(err)}`);
  }
  if (!res.ok) {
    throw new Error(
      `Error HTTP ${res.status}${res.statusText ? ` (${res.statusText})` : ''} (${url})`,
    );
  }
  const rawLen = res.headers.get('content-length');
  const expectedLen = rawLen ? Number.parseInt(rawLen, 10) : null;
  const buf = await res.arrayBuffer();
  validateGlbOrGltfBuffer(
    buf,
    label,
    url,
    Number.isFinite(expectedLen ?? NaN) ? expectedLen : null,
  );
  return buf;
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return;
  let cursor = 0;
  const workerCount = Math.min(limit, items.length);
  const runners = Array.from({ length: workerCount }, async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      await worker(items[idx]);
    }
  });
  await Promise.all(runners);
}

function countDeclaredAssets(manifest: RemoteModelsManifest): number {
  const models = manifest.models ?? {};
  let count = 0;
  if (normalizeAssetEntry(models.player)) count += 1;
  if (normalizeAssetEntry(models.weapons?.rifle)) count += 1;
  if (normalizeAssetEntry(models.weapons?.pistol)) count += 1;
  if (models.npcs && typeof models.npcs === 'object') {
    for (const npcId of ['ally_chispa', 'npc_mateo'] as const) {
      if (normalizeAssetEntry(models.npcs[npcId])) count += 1;
    }
  }
  if (Array.isArray(models.zombies)) {
    for (const rawEntry of models.zombies) {
      if (normalizeAssetEntry(rawEntry)) count += 1;
    }
  }
  if (Array.isArray(models.customCharacters)) {
    for (const rawEntry of models.customCharacters) {
      if (normalizeAssetEntry(rawEntry)) count += 1;
    }
  }
  if (models.equipment && typeof models.equipment === 'object') {
    for (const rawEntry of Object.values(models.equipment)) {
      if (normalizeAssetEntry(rawEntry)) count += 1;
    }
  }
  if (models.objectOverrides && typeof models.objectOverrides === 'object') {
    for (const rawEntry of Object.values(models.objectOverrides)) {
      if (normalizeAssetEntry(rawEntry)) count += 1;
    }
  }
  return count;
}

async function hasMissingDeclaredAssets(manifest: RemoteModelsManifest): Promise<boolean> {
  const models = manifest.models ?? {};
  try {
    const zombieIdsNeeded: string[] = [];
    if (Array.isArray(models.zombies)) {
      models.zombies.forEach((rawEntry, idx) => {
        if (!normalizeAssetEntry(rawEntry)) return;
        const obj = typeof rawEntry === 'object' ? rawEntry : null;
        zombieIdsNeeded.push(obj?.id?.trim() || `remote_zombie_${idx + 1}`);
      });
    }

    const charIdsNeeded: string[] = [];
    if (Array.isArray(models.customCharacters)) {
      models.customCharacters.forEach((rawEntry, idx) => {
        if (!normalizeAssetEntry(rawEntry)) return;
        const obj = typeof rawEntry === 'object' ? rawEntry : null;
        charIdsNeeded.push(obj?.id?.trim() || `remote_char_${idx + 1}`);
      });
    }

    const equipIdsNeeded: CustomEquipmentId[] = [];
    if (models.equipment && typeof models.equipment === 'object') {
      for (const [equipId, rawEntry] of Object.entries(models.equipment) as Array<
        [CustomEquipmentId, RemoteAssetEntry | null]
      >) {
        if (normalizeAssetEntry(rawEntry)) equipIdsNeeded.push(equipId);
      }
    }

    const overrideIdsNeeded: WorldObjectOverrideId[] = [];
    if (models.objectOverrides && typeof models.objectOverrides === 'object') {
      for (const [targetId, rawEntry] of Object.entries(models.objectOverrides) as Array<
        [WorldObjectOverrideId, RemoteAssetEntry | null]
      >) {
        if (normalizeAssetEntry(rawEntry)) overrideIdsNeeded.push(targetId);
      }
    }

    const [
      playerBuf,
      rifleBuf,
      pistolBuf,
      zombieSlots,
      zombieBufs,
      npcBufs,
      charBufs,
      equipBufs,
      overrideBufs,
    ] = await Promise.all([
      normalizeAssetEntry(models.player) ? cargarModeloCache() : Promise.resolve(null),
      normalizeAssetEntry(models.weapons?.rifle) ? cargarRifleCache() : Promise.resolve(null),
      normalizeAssetEntry(models.weapons?.pistol) ? cargarPistolCache() : Promise.resolve(null),
      zombieIdsNeeded.length > 0 ? listarZombieSlotsCache() : Promise.resolve([]),
      cargarZombieSlotBuffers(zombieIdsNeeded),
      models.npcs ? cargarNpcGlbBuffers() : Promise.resolve(new Map<CustomNpcTargetId, ArrayBuffer>()),
      cargarCustomCharacterSlotBuffers(charIdsNeeded),
      cargarEquipmentBuffers(equipIdsNeeded),
      cargarObjectOverrideBuffers(overrideIdsNeeded),
    ]);

    if (normalizeAssetEntry(models.player) && !isValidCachedGlbBuffer(playerBuf)) return true;
    if (normalizeAssetEntry(models.weapons?.rifle) && !isValidCachedGlbBuffer(rifleBuf)) return true;
    if (normalizeAssetEntry(models.weapons?.pistol) && !isValidCachedGlbBuffer(pistolBuf)) return true;

    if (models.npcs && typeof models.npcs === 'object') {
      for (const npcId of ['ally_chispa', 'npc_mateo'] as const) {
        if (normalizeAssetEntry(models.npcs[npcId]) && !isValidCachedGlbBuffer(npcBufs.get(npcId))) {
          return true;
        }
      }
    }

    const existingZombieSlotIds = new Set(zombieSlots.map((z) => z.id));
    for (const slotId of zombieIdsNeeded) {
      if (!existingZombieSlotIds.has(slotId) || !isValidCachedGlbBuffer(zombieBufs.get(slotId))) {
        return true;
      }
    }

    for (const slotId of charIdsNeeded) {
      if (!isValidCachedGlbBuffer(charBufs.get(slotId))) return true;
    }

    for (const equipId of equipIdsNeeded) {
      if (!isValidCachedGlbBuffer(equipBufs.get(equipId))) return true;
    }

    for (const targetId of overrideIdsNeeded) {
      if (!isValidCachedGlbBuffer(overrideBufs.get(targetId))) return true;
    }

    return false;
  } catch {
    return true;
  }
}

export async function syncRemoteAssetsIfNeeded(
  options: { force?: boolean } = {},
): Promise<RemoteSyncResult> {
  const force = Boolean(options.force);
  const manifestUrl = getRemoteManifestUrl().trim();
  const savedMeta = await cargarRemoteManifestMeta();

  if (!manifestUrl) {
    const err = 'La URL del manifiesto está vacía.';
    return {
      info: {
        url: manifestUrl,
        version: savedMeta?.version ?? null,
        lastSyncedAt: savedMeta?.syncedAt ?? null,
        status: 'error',
        downloadedAssets: 0,
        declaredAssets: 0,
        appliedAssets: 0,
        failedAssets: [{ file: 'models_manifest.json', reason: err }],
        errorMessage: err,
      },
      updatedTransforms: null,
      updatedAssets: false,
    };
  }

  try {
    const resolvedManifestUrl = resolveUrl(
      manifestUrl,
      typeof window !== 'undefined' ? window.location.href : 'http://localhost/',
    );

    let res: Response;
    try {
      res = await fetchWithTimeout(resolvedManifestUrl, MANIFEST_FETCH_TIMEOUT_MS, {
        cache: 'no-cache',
      });
    } catch (err) {
      const offlineHint =
        typeof navigator !== 'undefined' && navigator.onLine === false
          ? ' (Sin conexión a internet)'
          : '';
      const msg = `Error de red al descargar el JSON del manifiesto (${resolvedManifestUrl}): ${formatErrorMessage(err)}${offlineHint}`;
      return {
        info: {
          url: manifestUrl,
          version: savedMeta?.version ?? null,
          lastSyncedAt: savedMeta?.syncedAt ?? null,
          status: 'error',
          downloadedAssets: 0,
          declaredAssets: 0,
          appliedAssets: 0,
          failedAssets: [{ file: 'models_manifest.json', reason: msg }],
          errorMessage: msg,
        },
        updatedTransforms: null,
        updatedAssets: false,
      };
    }

    if (!res.ok) {
      const msg = `Error HTTP ${res.status}${res.statusText ? ` (${res.statusText})` : ''} al obtener el manifiesto JSON (${resolvedManifestUrl}).`;
      return {
        info: {
          url: manifestUrl,
          version: savedMeta?.version ?? null,
          lastSyncedAt: savedMeta?.syncedAt ?? null,
          status: 'error',
          downloadedAssets: 0,
          declaredAssets: 0,
          appliedAssets: 0,
          failedAssets: [{ file: 'models_manifest.json', reason: msg }],
          errorMessage: msg,
        },
        updatedTransforms: null,
        updatedAssets: false,
      };
    }

    let rawJsonText = '';
    try {
      rawJsonText = await res.text();
    } catch (err) {
      const msg = `Error al leer la respuesta del manifiesto JSON (${resolvedManifestUrl}): ${formatErrorMessage(err)}`;
      return {
        info: {
          url: manifestUrl,
          version: savedMeta?.version ?? null,
          lastSyncedAt: savedMeta?.syncedAt ?? null,
          status: 'error',
          downloadedAssets: 0,
          declaredAssets: 0,
          appliedAssets: 0,
          failedAssets: [{ file: 'models_manifest.json', reason: msg }],
          errorMessage: msg,
        },
        updatedTransforms: null,
        updatedAssets: false,
      };
    }

    let manifest: RemoteModelsManifest;
    try {
      const parsed = JSON.parse(rawJsonText) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        const msg = 'El manifiesto JSON está mal formado: la raíz debe ser un objeto JSON.';
        return {
          info: {
            url: manifestUrl,
            version: savedMeta?.version ?? null,
            lastSyncedAt: savedMeta?.syncedAt ?? null,
            status: 'error',
            downloadedAssets: 0,
            declaredAssets: 0,
            appliedAssets: 0,
            failedAssets: [{ file: 'models_manifest.json', reason: msg }],
            errorMessage: msg,
          },
          updatedTransforms: null,
          updatedAssets: false,
        };
      }
      manifest = parsed as RemoteModelsManifest;
    } catch (err) {
      const msg = `JSON mal formado en el manifiesto (${resolvedManifestUrl}): ${formatErrorMessage(err)}`;
      return {
        info: {
          url: manifestUrl,
          version: savedMeta?.version ?? null,
          lastSyncedAt: savedMeta?.syncedAt ?? null,
          status: 'error',
          downloadedAssets: 0,
          declaredAssets: 0,
          appliedAssets: 0,
          failedAssets: [{ file: 'models_manifest.json', reason: msg }],
          errorMessage: msg,
        },
        updatedTransforms: null,
        updatedAssets: false,
      };
    }

    const remoteVersion = parseVersionNumber(manifest.version);
    if (remoteVersion === null) {
      const msg = 'El manifiesto JSON no contiene una propiedad numérica "version" válida.';
      return {
        info: {
          url: manifestUrl,
          version: savedMeta?.version ?? null,
          lastSyncedAt: savedMeta?.syncedAt ?? null,
          status: 'error',
          downloadedAssets: 0,
          declaredAssets: 0,
          appliedAssets: 0,
          failedAssets: [{ file: 'models_manifest.json', reason: msg }],
          errorMessage: msg,
        },
        updatedTransforms: null,
        updatedAssets: false,
      };
    }

    if (
      manifest.models !== undefined &&
      (manifest.models === null ||
        typeof manifest.models !== 'object' ||
        Array.isArray(manifest.models))
    ) {
      const msg = 'La propiedad "models" del manifiesto JSON está mal formada.';
      return {
        info: {
          url: manifestUrl,
          version: savedMeta?.version ?? null,
          lastSyncedAt: savedMeta?.syncedAt ?? null,
          status: 'error',
          downloadedAssets: 0,
          declaredAssets: 0,
          appliedAssets: 0,
          failedAssets: [{ file: 'models_manifest.json', reason: msg }],
          errorMessage: msg,
        },
        updatedTransforms: null,
        updatedAssets: false,
      };
    }

    const declaredCount = countDeclaredAssets(manifest);
    if (declaredCount === 0) {
      const msg =
        'El manifiesto JSON no declara ningún modelo .glb válido para descargar (0 archivos declarados).';
      return {
        info: {
          url: manifestUrl,
          version: savedMeta?.version ?? null,
          lastSyncedAt: savedMeta?.syncedAt ?? null,
          status: 'error',
          downloadedAssets: 0,
          declaredAssets: 0,
          appliedAssets: 0,
          failedAssets: [{ file: 'models_manifest.json', reason: msg }],
          errorMessage: msg,
        },
        updatedTransforms: null,
        updatedAssets: false,
      };
    }

    const isFirstVisit = savedMeta === null || savedMeta.fromIdb === false;
    const isNewerVersion = savedMeta !== null && remoteVersion > savedMeta.version;
    const isDifferentManifestUrl = savedMeta !== null && savedMeta.url !== manifestUrl;
    const missingCachedAssets =
      !force && !isFirstVisit && !isNewerVersion && !isDifferentManifestUrl
        ? await hasMissingDeclaredAssets(manifest)
        : false;

    if (
      !force &&
      !isFirstVisit &&
      !isNewerVersion &&
      !isDifferentManifestUrl &&
      !missingCachedAssets
    ) {
      return {
        info: {
          url: manifestUrl,
          version: savedMeta.version,
          lastSyncedAt: savedMeta.syncedAt,
          status: 'ready',
          downloadedAssets: declaredCount,
          declaredAssets: declaredCount,
          appliedAssets: 0,
          failedAssets: [],
          errorMessage: null,
        },
        updatedTransforms: null,
        updatedAssets: false,
      };
    }

    const baseForAssets = manifest.assetsBaseUrl?.trim()
      ? resolveUrl(manifest.assetsBaseUrl.trim(), resolvedManifestUrl)
      : resolvedManifestUrl;

    const models = manifest.models ?? {};
    const downloadJobs: Array<{
      label: string;
      fileDisplay: string;
      url: string;
      onBuffer: (buf: ArrayBuffer) => Promise<void>;
    }> = [];
    let downloadedCount = 0;
    const failedAssets: RemoteAssetErrorDetail[] = [];

    const queueDownload = (
      label: string,
      fileDisplay: string,
      rawUrl: string,
      onSave: (buf: ArrayBuffer) => Promise<void>,
    ) => {
      const finalUrl = resolveUrl(rawUrl, baseForAssets);
      downloadJobs.push({
        label,
        fileDisplay,
        url: finalUrl,
        onBuffer: async (buf) => {
          try {
            await onSave(buf);
            downloadedCount += 1;
          } catch (err) {
            failedAssets.push({
              file: fileDisplay,
              reason: `Error al guardar en IndexedDB: ${formatErrorMessage(err)}`,
            });
          }
        },
      });
    };

    // 1. Player
    const playerEntry = normalizeAssetEntry(models.player);
    if (playerEntry) {
      queueDownload('player', `player (${playerEntry.name})`, playerEntry.url, (buf) =>
        guardarModeloCache(buf, playerEntry.name),
      );
    }

    // 2. NPCs (Chispa, Mateo)
    if (models.npcs && typeof models.npcs === 'object') {
      (['ally_chispa', 'npc_mateo'] as const).forEach((npcId) => {
        const entry = normalizeAssetEntry(models.npcs?.[npcId]);
        if (entry) {
          queueDownload(npcId, `${npcId} (${entry.name})`, entry.url, async (buf) => {
            await guardarNpcGlbCache(npcId, buf, entry.name);
          });
        }
      });
    }

    // 3. Custom Characters
    const remoteCharIds = new Set<string>();
    if (Array.isArray(models.customCharacters)) {
      models.customCharacters.forEach((rawEntry, idx) => {
        const entry = normalizeAssetEntry(rawEntry);
        if (!entry) return;
        const obj = typeof rawEntry === 'object' ? rawEntry : null;
        const slotId = obj?.id?.trim() || `remote_char_${idx + 1}`;
        const role = obj?.role ?? 'custom';
        remoteCharIds.add(slotId);
        queueDownload(`character:${entry.name}`, `character (${entry.name})`, entry.url, async (buf) => {
          await guardarCustomCharacterSlotCache(slotId, buf, entry.name, role);
        });
      });
    }

    // 4. Zombies (downloaded alongside other assets, then batch-saved into IndexedDB)
    const remoteZombieItems: Array<{
      slotId: string;
      arrayBuffer: ArrayBuffer;
      fileName: string;
      targetKind: ZombieTargetKind;
      spawnCount: number;
    }> = [];
    const remoteZombieIds = new Set<string>();
    if (Array.isArray(models.zombies)) {
      models.zombies.forEach((rawEntry, idx) => {
        const entry = normalizeAssetEntry(rawEntry);
        if (!entry) return;
        const obj = typeof rawEntry === 'object' ? rawEntry : null;
        const slotId = obj?.id?.trim() || `remote_zombie_${idx + 1}`;
        const targetKind: ZombieTargetKind = obj?.targetKind ?? 'all';
        const spawnCount =
          typeof obj?.spawnCount === 'number' && Number.isFinite(obj.spawnCount)
            ? Math.max(0, Math.min(25, Math.round(obj.spawnCount)))
            : 4;
        remoteZombieIds.add(slotId);
        const finalUrl = resolveUrl(entry.url, baseForAssets);
        downloadJobs.push({
          label: `zombie:${entry.name}`,
          fileDisplay: `zombie (${entry.name})`,
          url: finalUrl,
          onBuffer: async (buf) => {
            remoteZombieItems.push({
              slotId,
              arrayBuffer: buf,
              fileName: entry.name,
              targetKind,
              spawnCount,
            });
          },
        });
      });
    }

    // 5. Weapons (rifle, pistol)
    const rifleEntry = normalizeAssetEntry(models.weapons?.rifle);
    if (rifleEntry) {
      queueDownload('rifle', `rifle (${rifleEntry.name})`, rifleEntry.url, (buf) =>
        guardarRifleCache(buf, rifleEntry.name),
      );
    }
    const pistolEntry = normalizeAssetEntry(models.weapons?.pistol);
    if (pistolEntry) {
      queueDownload('pistol', `pistol (${pistolEntry.name})`, pistolEntry.url, (buf) =>
        guardarPistolCache(buf, pistolEntry.name),
      );
    }

    // 6. Equipment (helmet, vest, bow, arrow, stick, baton)
    if (models.equipment && typeof models.equipment === 'object') {
      (
        Object.entries(models.equipment) as Array<[CustomEquipmentId, RemoteAssetEntry | null]>
      ).forEach(([equipId, rawEntry]) => {
        const entry = normalizeAssetEntry(rawEntry);
        if (entry) {
          queueDownload(
            `equipment:${equipId}`,
            `equipment:${equipId} (${entry.name})`,
            entry.url,
            async (buf) => {
              await guardarEquipmentCache(equipId, buf, entry.name);
            },
          );
        }
      });
    }

    // 7. World Object Overrides (backpack, crates, buildings, etc.)
    if (models.objectOverrides && typeof models.objectOverrides === 'object') {
      (
        Object.entries(models.objectOverrides) as Array<
          [WorldObjectOverrideId, RemoteAssetEntry | null]
        >
      ).forEach(([targetId, rawEntry]) => {
        const entry = normalizeAssetEntry(rawEntry);
        if (entry) {
          queueDownload(
            `object:${targetId}`,
            `object:${targetId} (${entry.name})`,
            entry.url,
            async (buf) => {
              await guardarObjectOverrideCache(targetId, buf, entry.name);
            },
          );
        }
      });
    }

    await runWithConcurrency(downloadJobs, MAX_CONCURRENT_DOWNLOADS, async (job) => {
      let buf: ArrayBuffer;
      try {
        buf = await fetchGlbBuffer(job.url, job.label);
      } catch (err) {
        failedAssets.push({
          file: job.fileDisplay,
          reason: formatErrorMessage(err),
        });
        return;
      }
      await job.onBuffer(buf);
    });

    if (remoteZombieItems.length > 0) {
      try {
        await guardarZombieSlotsBatchCache(remoteZombieItems);
        downloadedCount += remoteZombieItems.length;
      } catch (err) {
        const reason = `Error al guardar lote de zombis en IndexedDB: ${formatErrorMessage(err)}`;
        remoteZombieItems.forEach((z) => {
          failedAssets.push({ file: `zombie (${z.fileName})`, reason });
        });
      }
    }

    if (Array.isArray(models.customCharacters)) {
      try {
        const existingChars = await listarCustomCharacterSlotsCache();
        for (const c of existingChars) {
          if (c.id.startsWith('remote_char_') && !remoteCharIds.has(c.id)) {
            await eliminarCustomCharacterSlotCache(c.id);
          }
        }
      } catch (err) {
        failedAssets.push({
          file: 'customCharacters (IndexedDB)',
          reason: `Error al limpiar personajes previos: ${formatErrorMessage(err)}`,
        });
      }
    }

    if (Array.isArray(models.zombies)) {
      try {
        const existingZombies = await listarZombieSlotsCache();
        for (const z of existingZombies) {
          if (z.id.startsWith('remote_zombie_') && !remoteZombieIds.has(z.id)) {
            await eliminarZombieSlotCache(z.id);
          }
        }
      } catch (err) {
        failedAssets.push({
          file: 'zombies (IndexedDB)',
          reason: `Error al limpiar zombis previos: ${formatErrorMessage(err)}`,
        });
      }
    }

    // 8. Attachment Transforms (defaults for helmet, backpack, vest, weapons, etc.)
    let updatedTransforms: AttachmentTransformsState | null = null;
    if (manifest.attachmentTransforms && typeof manifest.attachmentTransforms === 'object') {
      const sanitized = sanitizeAttachmentTransforms(manifest.attachmentTransforms);
      const shouldApplyTransforms =
        force || isNewerVersion || (isFirstVisit && !hasAttachmentTransformsLocal());
      if (shouldApplyTransforms) {
        guardarAttachmentTransformsLocal(sanitized);
        updatedTransforms = sanitized;
      }
    }

    const syncedAt = Date.now();
    if (failedAssets.length === 0 && downloadedCount > 0) {
      const metaSave = await guardarRemoteManifestMeta({
        version: remoteVersion,
        url: manifestUrl,
        syncedAt,
        lastManifest: manifest,
      });
      if (!metaSave.idbSaved) {
        failedAssets.push({
          file: 'models_manifest.json (IndexedDB)',
          reason: metaSave.idbError || 'No se pudo guardar la metadata del manifiesto en IndexedDB',
        });
      }
    } else if (downloadedCount === 0 && failedAssets.length === 0) {
      failedAssets.push({
        file: 'models_manifest.json',
        reason: 'No se descargó ni guardó ningún modelo .glb válido en IndexedDB.',
      });
    }

    const hasFailures = failedAssets.length > 0;
    const summaryMessage = hasFailures
      ? `${failedAssets.length} fallo(s) en la sincronización: ${failedAssets
          .slice(0, 2)
          .map((f) => `${f.file} -> ${f.reason}`)
          .join(' | ')}${failedAssets.length > 2 ? ` (+${failedAssets.length - 2} más)` : ''}`
      : null;

    return {
      info: {
        url: manifestUrl,
        version: !hasFailures ? remoteVersion : (savedMeta?.version ?? null),
        lastSyncedAt: syncedAt,
        status: hasFailures ? 'error' : 'ready',
        downloadedAssets: downloadedCount,
        declaredAssets: declaredCount,
        appliedAssets: 0,
        failedAssets,
        errorMessage: summaryMessage,
      },
      updatedTransforms,
      updatedAssets: downloadedCount > 0 || updatedTransforms !== null,
    };
  } catch (err) {
    const msg = `Error inesperado durante la sincronización: ${formatErrorMessage(err)}`;
    return {
      info: {
        url: manifestUrl,
        version: savedMeta?.version ?? null,
        lastSyncedAt: savedMeta?.syncedAt ?? null,
        status: 'error',
        downloadedAssets: 0,
        declaredAssets: 0,
        appliedAssets: 0,
        failedAssets: [{ file: 'models_manifest.json', reason: msg }],
        errorMessage: msg,
      },
      updatedTransforms: null,
      updatedAssets: false,
    };
  }
}

function toDefaultModelPath(fileName: string | null | undefined): string | null {
  if (!fileName) return null;
  const cleanName = fileName.split('/').pop()?.split('\\').pop()?.trim() || fileName.trim();
  return `./${cleanName}`;
}

export async function buildRootManifestForExport(
  hud: HudSnapshot,
  overrides?: {
    transforms?: AttachmentTransformsState;
    version?: number;
  },
): Promise<RemoteModelsManifest> {
  const savedMeta = await cargarRemoteManifestMeta();

  const baseVersion =
    typeof overrides?.version === 'number' && Number.isFinite(overrides.version)
      ? overrides.version
      : savedMeta?.version ?? hud.remoteManifest?.version ?? 1.0;

  const nextVersion =
    typeof overrides?.version === 'number'
      ? overrides.version
      : Number((baseVersion + 0.1).toFixed(2));

  const equipmentIds: CustomEquipmentId[] = ['helmet', 'vest', 'bow', 'arrow', 'stick', 'baton'];
  const equipmentMap: Partial<Record<CustomEquipmentId, string | null>> = {};
  for (const id of equipmentIds) {
    equipmentMap[id] = toDefaultModelPath(hud.customEquipmentNames?.[id] ?? null);
  }

  const objectOverridesMap: Partial<Record<WorldObjectOverrideId, string>> = {};
  (Object.entries(hud.objectOverrides ?? {}) as Array<[WorldObjectOverrideId, string]>).forEach(
    ([id, fileName]) => {
      if (!fileName) return;
      const path = toDefaultModelPath(fileName);
      if (path) {
        objectOverridesMap[id] = path;
      }
    },
  );

  const zombies = hud.customZombieSlots.map((slot, idx) => {
    const url = toDefaultModelPath(slot.name) ?? `./${slot.name}`;
    return {
      id: slot.id.startsWith('remote_zombie_') ? slot.id : `remote_zombie_${idx + 1}`,
      name: slot.name,
      url,
      targetKind: slot.targetKind,
      spawnCount: slot.spawnCount ?? 4,
    };
  });

  const customCharacters = (hud.customCharacterSlots ?? []).map((slot, idx) => {
    const url = toDefaultModelPath(slot.name) ?? `./${slot.name}`;
    return {
      id: slot.id.startsWith('remote_char_') ? slot.id : `remote_char_${idx + 1}`,
      name: slot.name,
      url,
      role: slot.role,
    };
  });

  const transforms = sanitizeAttachmentTransforms(
    overrides?.transforms ?? hud.attachmentTransforms ?? createDefaultAttachmentTransforms(),
  );

  return {
    version: nextVersion,
    updatedAt: new Date().toISOString(),
    models: {
      player: toDefaultModelPath(hud.customModelName),
      npcs: {
        ally_chispa: toDefaultModelPath(hud.customNpcNames?.ally_chispa ?? null),
        npc_mateo: toDefaultModelPath(hud.customNpcNames?.npc_mateo ?? null),
      },
      customCharacters,
      zombies,
      weapons: {
        rifle: toDefaultModelPath(hud.customRifleName),
        pistol: toDefaultModelPath(hud.customPistolName),
      },
      equipment: equipmentMap,
      objectOverrides: objectOverridesMap,
    },
    attachmentTransforms: transforms,
  };
}

export async function downloadRootManifestJson(
  hud: HudSnapshot,
  overrides?: {
    transforms?: AttachmentTransformsState;
    version?: number;
  },
): Promise<RemoteModelsManifest> {
  const manifest = await buildRootManifestForExport(hud, overrides);
  const jsonText = JSON.stringify(manifest, null, 2);
  const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });
  const blobUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = 'models_manifest.json';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
  return manifest;
}
