import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import {
  BaseCharacter,
  captureBoneRest,
  dampBoneRotCharSpace,
  type HumanoidBoneMap,
} from './baseCharacter';
import type { EnemyKind, EnemyRole, VehicleRepairState } from './types';

export const FASTFOOD_CENTER_X = 53.0;
export const FASTFOOD_CENTER_Z = 21.0;
export const FASTFOOD_ENTRANCE_X = 41.2;
export const FASTFOOD_ENTRANCE_Z = 18.2;
export const FASTFOOD_INTERIOR_BOUNDS = {
  minX: 41.8,
  maxX: 64.2,
  minZ: 10.2,
  maxZ: 31.8,
};
export const FASTFOOD_MECHANIC_POS = { x: 58.3, z: 24.4 };

export interface FastFoodWallBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
  blocksSight?: boolean;
}

export interface FastFoodSpawnPoint {
  kind: EnemyKind;
  x: number;
  z: number;
  role?: EnemyRole;
}

export interface FastFoodLandmark {
  root: THREE.Group;
  wallBoxes: FastFoodWallBox[];
  beaconRing: THREE.Mesh;
  beaconRingMat: THREE.MeshBasicMaterial;
  beaconBeam: THREE.Mesh;
  beaconBeamMat: THREE.MeshBasicMaterial;
  beaconLight: THREE.PointLight;
  shelfPivot: THREE.Group;
  hordeSpawns: FastFoodSpawnPoint[];
  supplySpots: Array<{ kind: 'chemicals' | 'scrap' | 'powder' | 'food' | 'bandage'; x: number; z: number }>;
  setShelfCollapse: (progress: number) => void;
  updateVisuals: (showBeacon: boolean, elapsed: number) => void;
  clampCameraSegment: (
    targetX: number,
    targetY: number,
    targetZ: number,
    camX: number,
    camY: number,
    camZ: number,
  ) => { x: number; y: number; z: number };
}

export interface NpcGlbTemplateSource {
  name?: string;
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}

export interface MechanicNpcRig {
  character: BaseCharacter;
  isCustomGlb: boolean;
  bones: HumanoidBoneMap;
  root: THREE.Group;
  bodyPivot: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  legL: { hip: THREE.Group; knee: THREE.Group };
  legR: { hip: THREE.Group; knee: THREE.Group };
  armL: { shoulder: THREE.Group; elbow: THREE.Group; hand: THREE.Group };
  armR: { shoulder: THREE.Group; elbow: THREE.Group; hand: THREE.Group };
  wrenchGroup: THREE.Group;
  beaconRing: THREE.Mesh;
  beaconMat: THREE.MeshBasicMaterial;
  dispose: () => void;
}

export type MechanicAnimMode =
  | 'fighting'
  | 'pinned'
  | 'limping_idle'
  | 'limping_walk'
  | 'working_garage';

export interface GarageVehicleRig {
  root: THREE.Group;
  engineGroup: THREE.Group;
  tiresGroup: THREE.Group;
  armorGroup: THREE.Group;
  fuelGroup: THREE.Group;
  jackStandsGroup: THREE.Group;
  headlightGlowMat: THREE.MeshStandardMaterial;
  engineGlowMat: THREE.MeshStandardMaterial;
  applyRepairState: (state: VehicleRepairState, elapsed: number) => void;
  dispose: () => void;
}

function createFastFoodTextures(maxAniso: number) {
  const safeAniso = Math.max(1, Math.min(4, maxAniso));
  const disposables: THREE.Texture[] = [];

  // 1. Checkered Fast-Food Ceramic Tile Floor (512x512)
  const tileCanvas = document.createElement('canvas');
  tileCanvas.width = 512;
  tileCanvas.height = 512;
  const tctx = tileCanvas.getContext('2d')!;
  const step = 64;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const dark = (x + y) % 2 === 0;
      tctx.fillStyle = dark ? '#cfc7bc' : '#9b3a2f';
      tctx.fillRect(x * step, y * step, step, step);
      tctx.fillStyle = 'rgba(0,0,0,0.08)';
      if ((x * 7 + y * 13) % 5 === 0) {
        tctx.fillRect(x * step + 8, y * step + 10, 22, 16);
      }
      tctx.strokeStyle = 'rgba(30, 25, 22, 0.42)';
      tctx.lineWidth = 2;
      tctx.strokeRect(x * step, y * step, step, step);
    }
  }
  const tileTex = new THREE.CanvasTexture(tileCanvas);
  tileTex.wrapS = THREE.RepeatWrapping;
  tileTex.wrapT = THREE.RepeatWrapping;
  tileTex.repeat.set(5, 5);
  tileTex.colorSpace = THREE.SRGBColorSpace;
  tileTex.anisotropy = safeAniso;
  disposables.push(tileTex);

  // 2. Iconic Golden Arches "M" Logo Sign (256x256)
  const logoCanvas = document.createElement('canvas');
  logoCanvas.width = 256;
  logoCanvas.height = 256;
  const lctx = logoCanvas.getContext('2d')!;
  lctx.fillStyle = '#b91c1c';
  lctx.fillRect(0, 0, 256, 256);
  lctx.strokeStyle = '#facc15';
  lctx.lineWidth = 10;
  lctx.strokeRect(10, 10, 236, 236);
  // Stylized golden twin arches "M"
  lctx.strokeStyle = '#facc15';
  lctx.lineWidth = 22;
  lctx.lineCap = 'round';
  lctx.beginPath();
  lctx.moveTo(46, 198);
  lctx.quadraticCurveTo(82, 34, 128, 170);
  lctx.quadraticCurveTo(174, 34, 210, 198);
  lctx.stroke();
  lctx.fillStyle = '#fef08a';
  lctx.font = 'bold 24px system-ui, sans-serif';
  lctx.textAlign = 'center';
  lctx.fillText('MC-PORTEÑO 24H', 128, 228);
  const logoTex = new THREE.CanvasTexture(logoCanvas);
  logoTex.colorSpace = THREE.SRGBColorSpace;
  logoTex.anisotropy = safeAniso;
  disposables.push(logoTex);

  // 3. Illuminated Overhead Fast-Food Menu Board (512x256)
  const menuCanvas = document.createElement('canvas');
  menuCanvas.width = 512;
  menuCanvas.height = 256;
  const mctx = menuCanvas.getContext('2d')!;
  mctx.fillStyle = '#18181b';
  mctx.fillRect(0, 0, 512, 256);
  mctx.fillStyle = '#b91c1c';
  mctx.fillRect(0, 0, 512, 54);
  mctx.fillStyle = '#facc15';
  mctx.font = 'bold 28px system-ui, sans-serif';
  mctx.textAlign = 'left';
  mctx.fillText('MC-PORTEÑO  ·  MENÚ 2050', 22, 36);
  const items = [
    ['1. COMBO OBELISCO DOBLE', '$8.500', '#facc15'],
    ['2. CUARTO CRIOLLO + PAPAS', '$7.200', '#fde047'],
    ['3. MC-CAFÉ EXPRESS 24H', '$3.100', '#fed7aa'],
    ['4. CAJITA SUPERVIVIENTE', '$5.900', '#fca5a5'],
  ] as const;
  items.forEach(([label, price, col], idx) => {
    const y = 96 + idx * 38;
    mctx.fillStyle = '#f8fafc';
    mctx.font = 'bold 20px system-ui, sans-serif';
    mctx.textAlign = 'left';
    mctx.fillText(label, 24, y);
    mctx.fillStyle = col;
    mctx.textAlign = 'right';
    mctx.fillText(price, 486, y);
  });
  mctx.strokeStyle = '#facc15';
  mctx.lineWidth = 6;
  mctx.strokeRect(4, 4, 504, 248);
  const menuTex = new THREE.CanvasTexture(menuCanvas);
  menuTex.colorSpace = THREE.SRGBColorSpace;
  menuTex.anisotropy = safeAniso;
  disposables.push(menuTex);

  return {
    tileTex,
    logoTex,
    menuTex,
    dispose: () => disposables.forEach((t) => t.dispose()),
  };
}

export function buildFastFoodLandmark(
  baseY: number,
  stoneTex: THREE.CanvasTexture,
  glassTowerMat: THREE.MeshStandardMaterial,
  pillarMat: THREE.MeshStandardMaterial,
  nightGlowMats: { mat: THREE.MeshStandardMaterial; dayIntensity: number; nightIntensity: number }[],
  disposables: { dispose: () => void }[],
): FastFoodLandmark {
  const tex = createFastFoodTextures(4);
  disposables.push(tex);

  const root = new THREE.Group();
  root.name = 'McPortenoFastFood';
  root.position.set(FASTFOOD_CENTER_X, baseY, FASTFOOD_CENTER_Z);

  const wallBoxes: FastFoodWallBox[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposables.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposables.push(m);
    return m;
  };

  // PBR Materials
  const floorMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: tex.tileTex,
      roughness: 0.48,
      metalness: 0.06,
    }),
  );
  const redFasciaMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xb91c1c,
      roughness: 0.42,
      metalness: 0.14,
    }),
  );
  const yellowTrimMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: new THREE.Color(0xca8a04),
      emissiveIntensity: 0.25,
      roughness: 0.34,
      metalness: 0.22,
    }),
  );
  const creamWallMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: stoneTex,
      color: 0xe7dfd3,
      roughness: 0.78,
      metalness: 0.04,
    }),
  );
  const brickSillMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: stoneTex,
      color: 0x7c2d26,
      roughness: 0.86,
      metalness: 0.06,
    }),
  );
  const steelMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.28,
      metalness: 0.84,
    }),
  );
  const darkIronMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1e242d,
      roughness: 0.5,
      metalness: 0.65,
    }),
  );
  const counterMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.35,
      metalness: 0.12,
    }),
  );
  const tableTopMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x9a3412,
      roughness: 0.52,
      metalness: 0.08,
    }),
  );
  const windowGlassMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      roughness: 0.12,
      metalness: 0.25,
      transparent: true,
      opacity: 0.34,
    }),
  );
  const logoSignMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: tex.logoTex,
      emissiveMap: tex.logoTex,
      emissive: new THREE.Color(0xfef08a),
      emissiveIntensity: 0.65,
      roughness: 0.3,
    }),
  );
  const menuBoardMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: tex.menuTex,
      emissiveMap: tex.menuTex,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.82,
      roughness: 0.25,
    }),
  );
  const fryerOilMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: new THREE.Color(0xd97706),
      emissiveIntensity: 0.7,
      roughness: 0.25,
    }),
  );

  nightGlowMats.push(
    { mat: yellowTrimMat, dayIntensity: 0.18, nightIntensity: 0.72 },
    { mat: logoSignMat, dayIntensity: 0.35, nightIntensity: 1.45 },
    { mat: menuBoardMat, dayIntensity: 0.55, nightIntensity: 1.25 },
  );

  // Helper to add a box in local space (around FASTFOOD_CENTER_X/Z) and register world AABB collider
  const addBox = (
    lx1: number,
    lx2: number,
    ly1: number,
    ly2: number,
    lz1: number,
    lz2: number,
    mat: THREE.Material,
    collide = true,
    blocksSight = true,
    castShadow = true,
  ) => {
    const w = Math.abs(lx2 - lx1);
    const h = Math.abs(ly2 - ly1);
    const d = Math.abs(lz2 - lz1);
    const mesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w, h, d)), mat);
    mesh.position.set((lx1 + lx2) * 0.5, (ly1 + ly2) * 0.5, (lz1 + lz2) * 0.5);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = true;
    root.add(mesh);

    if (collide) {
      wallBoxes.push({
        minX: FASTFOOD_CENTER_X + Math.min(lx1, lx2),
        maxX: FASTFOOD_CENTER_X + Math.max(lx1, lx2),
        minZ: FASTFOOD_CENTER_Z + Math.min(lz1, lz2),
        maxZ: FASTFOOD_CENTER_Z + Math.max(lz1, lz2),
        minY: Math.min(ly1, ly2),
        maxY: Math.max(ly1, ly2),
        blocksSight,
      });
    }
    return mesh;
  };

  // =========================================================================
  // 1. FLOOR, CEILING & WALK-IN PERIMETER SHELL (x ∈ [-11.3, 11.3], z ∈ [-10.8, 10.8])
  // =========================================================================
  addBox(-11.4, 11.4, -0.08, 0.04, -10.8, 10.8, floorMat, false, false, false);
  // Commercial drop-ceiling slab
  addBox(-11.6, 11.6, 4.35, 4.65, -11.0, 11.0, creamWallMat, false, false, true);

  // West Entrance Wall (x = -11.3) — Wide open doorway at local z ∈ [-5.2, -0.4] (world z ∈ [15.8, 20.6])
  addBox(-11.55, -11.05, 0, 4.4, -11.0, -9.8, brickSillMat, true, true);
  addBox(-11.55, -11.05, 0, 0.95, -9.8, -5.2, brickSillMat, true, false);
  addBox(-11.45, -11.15, 0.95, 3.55, -9.8, -5.2, windowGlassMat, true, false, false);
  addBox(-11.55, -11.05, 3.55, 4.4, -9.8, -5.2, redFasciaMat, false, false);

  // Entrance lintel & propped open glass double doors
  addBox(-11.6, -11.0, 3.45, 4.4, -5.2, -0.4, redFasciaMat, false, false);
  const doorLeafGeo = trackGeo(new THREE.BoxGeometry(0.12, 3.2, 1.35));
  const doorL = new THREE.Mesh(doorLeafGeo, windowGlassMat);
  doorL.position.set(-10.65, 1.6, -5.05);
  doorL.rotation.y = Math.PI * 0.44;
  const doorR = new THREE.Mesh(doorLeafGeo, windowGlassMat);
  doorR.position.set(-10.65, 1.6, -0.55);
  doorR.rotation.y = -Math.PI * 0.44;
  root.add(doorL, doorR);

  // South-West storefront window + corner pier
  addBox(-11.55, -11.05, 0, 0.95, -0.4, 9.6, brickSillMat, true, false);
  addBox(-11.45, -11.15, 0.95, 3.55, -0.4, 9.6, windowGlassMat, true, false, false);
  addBox(-11.55, -11.05, 3.55, 4.4, -0.4, 9.6, redFasciaMat, false, false);
  addBox(-11.55, -11.05, 0, 4.4, 9.6, 11.0, brickSillMat, true, true);

  // North Storefront Wall (z = -10.8, facing Av. Corrientes) with panoramic glass windows
  addBox(-11.2, 11.4, 0, 0.95, -11.05, -10.55, brickSillMat, true, false);
  addBox(-10.2, 10.2, 0.95, 3.55, -10.95, -10.65, windowGlassMat, true, false, false);
  addBox(-11.2, 11.4, 3.55, 4.4, -11.05, -10.55, redFasciaMat, false, false);
  addBox(10.2, 11.5, 0, 4.4, -11.05, -10.55, brickSillMat, true, true);

  // East & South Solid Walls
  addBox(11.0, 11.6, 0, 4.4, -11.0, 11.0, creamWallMat, true, true);
  addBox(-11.2, 11.5, 0, 4.4, 10.55, 11.1, creamWallMat, true, true);

  // =========================================================================
  // 2. ICONIC MCDONALD'S-STYLE RED/YELLOW MANSARD FASCIA, TOWER & PYLON SIGN
  // =========================================================================
  // Slanted iconic red-and-yellow Mansard canopy band around ground-floor restaurant
  addBox(-12.2, 12.0, 4.45, 5.75, -11.6, 11.6, redFasciaMat, false, false, true);
  addBox(-12.35, 12.15, 4.3, 4.55, -11.75, 11.75, yellowTrimMat, false, false, false);
  addBox(-12.35, 12.15, 5.65, 5.88, -11.75, 11.75, yellowTrimMat, false, false, false);

  // Illuminated rooftop Golden Arches billboard facing NW (Obelisco & Av. 9 de Julio)
  const roofSign = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.45, 3.0, 4.2)), logoSignMat);
  roofSign.position.set(-11.8, 7.35, -3.2);
  root.add(roofSign);
  const roofSignNorth = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.2, 3.0, 0.45)), logoSignMat);
  roofSignNorth.position.set(-5.2, 7.35, -11.4);
  root.add(roofSignNorth);

  // Corner Sidewalk Pylon Totem ("M" Golden Arches visible down 9 de Julio)
  const pylonPole = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.24, 0.3, 8.6, 10)), darkIronMat);
  pylonPole.position.set(-13.4, 4.3, -12.6);
  pylonPole.castShadow = true;
  const pylonBox = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.6, 2.6, 0.65)), logoSignMat);
  pylonBox.position.set(-13.4, 8.8, -12.6);
  pylonBox.rotation.y = Math.PI * 0.25;
  root.add(pylonPole, pylonBox);
  wallBoxes.push({
    minX: FASTFOOD_CENTER_X - 13.85,
    maxX: FASTFOOD_CENTER_X - 12.95,
    minZ: FASTFOOD_CENTER_Z - 13.05,
    maxZ: FASTFOOD_CENTER_Z - 12.15,
    minY: 0,
    maxY: 6.0,
    blocksSight: false,
  });

  // Upper Buenos Aires commercial corner building rising cleanly above the restaurant (y = 5.9..24.5)
  const upperBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(20.6, 18.2, 19.6)), pillarMat);
  upperBody.position.set(0.4, 14.9, 0.4);
  upperBody.castShadow = true;
  upperBody.receiveShadow = true;
  const upperCrown = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(21.2, 0.8, 20.2)), glassTowerMat);
  upperCrown.position.set(0.4, 24.3, 0.4);
  root.add(upperBody, upperCrown);

  // =========================================================================
  // 3. DINING HALL: OVERTURNED TABLES, CHAIRS, COUNTER & MENU BOARDS
  // =========================================================================
  // Helper: Overturned / intact fast-food table cluster
  const addDiningTable = (lx: number, lz: number, overturned: boolean, rotY: number) => {
    const tg = new THREE.Group();
    tg.position.set(lx, 0, lz);
    tg.rotation.y = rotY;

    const topGeo = trackGeo(new THREE.BoxGeometry(1.55, 0.1, 1.05));
    const pedGeo = trackGeo(new THREE.CylinderGeometry(0.08, 0.12, 0.72, 8));
    const chairGeo = trackGeo(new THREE.BoxGeometry(0.46, 0.48, 0.46));

    if (overturned) {
      // Tipped onto its edge as chaotic cover!
      const tableBody = new THREE.Group();
      tableBody.position.set(0, 0.56, 0);
      tableBody.rotation.z = 1.38;
      const top = new THREE.Mesh(topGeo, tableTopMat);
      top.position.y = 0.36;
      top.castShadow = true;
      const ped = new THREE.Mesh(pedGeo, darkIronMat);
      tableBody.add(top, ped);
      tg.add(tableBody);

      const ch1 = new THREE.Mesh(chairGeo, redFasciaMat);
      ch1.position.set(-0.9, 0.24, 0.75);
      ch1.rotation.set(1.25, 0.4, 0.3);
      const ch2 = new THREE.Mesh(chairGeo, yellowTrimMat);
      ch2.position.set(0.75, 0.24, -0.78);
      ch2.rotation.set(-1.35, -0.5, 0.2);
      tg.add(ch1, ch2);
    } else {
      const top = new THREE.Mesh(topGeo, tableTopMat);
      top.position.y = 0.78;
      top.castShadow = true;
      const ped = new THREE.Mesh(pedGeo, darkIronMat);
      ped.position.y = 0.39;
      const ch1 = new THREE.Mesh(chairGeo, redFasciaMat);
      ch1.position.set(-0.62, 0.24, 0);
      const ch2 = new THREE.Mesh(chairGeo, yellowTrimMat);
      ch2.position.set(0.62, 0.24, 0);
      tg.add(top, ped, ch1, ch2);
    }
    root.add(tg);

    wallBoxes.push({
      minX: FASTFOOD_CENTER_X + lx - 0.85,
      maxX: FASTFOOD_CENTER_X + lx + 0.85,
      minZ: FASTFOOD_CENTER_Z + lz - 0.85,
      maxZ: FASTFOOD_CENTER_Z + lz + 0.85,
      minY: 0,
      maxY: 1.25,
      blocksSight: false,
    });
  };

  addDiningTable(-6.8, 2.8, true, 0.35);
  addDiningTable(-4.4, -7.2, true, -0.45);
  addDiningTable(-7.8, 7.4, false, 0.12);
  addDiningTable(-3.4, 6.4, true, 0.85);

  // Ordering Service Counter (local x = 0.2, z ∈ [-6.6, +6.6], leaving open N/S passages to kitchen!)
  addBox(-0.35, 0.85, 0, 1.08, -6.6, 6.6, counterMat, true, false, true);
  addBox(-0.42, 0.92, 1.02, 1.12, -6.68, 6.68, redFasciaMat, false, false, false);
  // Cash register POS terminals along counter
  for (const rz of [-4.2, -0.4, 3.6]) {
    const regBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.45, 0.26, 0.52)), darkIronMat);
    regBase.position.set(0.18, 1.24, rz);
    const regScreen = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.12, 0.32, 0.42)), steelMat);
    regScreen.position.set(0.05, 1.48, rz);
    regScreen.rotation.z = -0.3;
    root.add(regBase, regScreen);
  }

  // Hanging Illuminated Menu Boards above the counter
  const menuPanelL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.18, 1.15, 4.4)), menuBoardMat);
  menuPanelL.position.set(0.55, 3.1, -2.5);
  menuPanelL.rotation.z = 0.14;
  const menuPanelR = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.18, 1.15, 4.4)), menuBoardMat);
  menuPanelR.position.set(0.55, 3.1, 2.5);
  menuPanelR.rotation.z = 0.14;
  root.add(menuPanelL, menuPanelR);

  // =========================================================================
  // 4. INDUSTRIAL KITCHEN + COLLAPSING HEAVY SHELVING (local x ∈ [1.4, 10.8])
  // =========================================================================
  // Central Stainless Steel Kitchen Prep Island (local x ∈ [3.4, 5.4], z ∈ [-5.2, -1.8])
  addBox(3.4, 5.4, 0, 0.96, -5.2, -1.8, steelMat, true, false, true);
  // Overhead exhaust hood & flat-top burger grill along East kitchen wall
  addBox(8.6, 10.8, 0, 1.02, -7.2, 0.2, steelMat, true, false, true);
  addBox(8.8, 10.6, 1.02, 1.16, -3.2, -0.4, darkIronMat, false, false, false); // Grill grate
  addBox(8.2, 10.8, 2.55, 3.65, -7.4, 0.4, steelMat, false, false, true); // Exhaust hood
  // Deep fryers with glowing oil tubs
  const fryer1 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.85, 0.1, 0.95)), fryerOilMat);
  fryer1.position.set(9.4, 1.04, -5.4);
  const fryer2 = fryer1.clone();
  fryer2.position.set(9.4, 1.04, -4.1);
  root.add(fryer1, fryer2);

  // Walk-In Freezer ("CÁMARA FRÍA") double steel door on South-East corner
  addBox(10.65, 11.0, 0.05, 3.1, 5.6, 8.6, steelMat, false, false, false);
  addBox(6.8, 10.8, 0, 1.0, 8.2, 10.4, steelMat, true, false, true); // Rear sink/prep counter

  // COLLAPSING HEAVY INDUSTRIAL STORAGE SHELF (`estantería pesada`) at local (7.6, 3.4) -> world (60.6, 24.4)
  // Pivoted at bottom edge x = 7.2, z = 3.4 so when triggered, it tips -X toward Mateo at (5.3, 3.4)!
  const shelfPivot = new THREE.Group();
  shelfPivot.position.set(7.2, 0.04, 3.4);
  const shelfRackMat = darkIronMat;
  const crateMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xb45309,
      roughness: 0.82,
      metalness: 0.08,
    }),
  );
  const oilJugMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xeab308,
      roughness: 0.45,
      metalness: 0.1,
    }),
  );

  // 4 upright steel angle posts (height 2.55m, width 1.1m in X, depth 2.6m in Z)
  const postGeo = trackGeo(new THREE.BoxGeometry(0.09, 2.55, 0.09));
  [
    [0, -1.2],
    [0.95, -1.2],
    [0, 1.2],
    [0.95, 1.2],
  ].forEach(([px, pz]) => {
    const post = new THREE.Mesh(postGeo, shelfRackMat);
    post.position.set(px, 1.275, pz);
    post.castShadow = true;
    shelfPivot.add(post);
  });
  const tierGeo = trackGeo(new THREE.BoxGeometry(1.06, 0.07, 2.52));
  const boxCargoGeo = trackGeo(new THREE.BoxGeometry(0.68, 0.44, 0.85));
  const jugGeo = trackGeo(new THREE.CylinderGeometry(0.16, 0.18, 0.42, 8));
  [0.35, 1.05, 1.75, 2.42].forEach((sy, sIdx) => {
    const tier = new THREE.Mesh(tierGeo, steelMat);
    tier.position.set(0.475, sy, 0);
    tier.castShadow = true;
    shelfPivot.add(tier);
    if (sIdx < 3) {
      const box = new THREE.Mesh(boxCargoGeo, crateMat);
      box.position.set(0.48, sy + 0.25, -0.55 + (sIdx % 2) * 0.9);
      box.castShadow = true;
      const jug = new THREE.Mesh(jugGeo, oilJugMat);
      jug.position.set(0.46, sy + 0.24, 0.65 - (sIdx % 2) * 1.1);
      shelfPivot.add(box, jug);
    }
  });
  root.add(shelfPivot);

  // Small collider under the shelf base so actors don't stand directly inside the rack frame
  wallBoxes.push({
    minX: FASTFOOD_CENTER_X + 7.1,
    maxX: FASTFOOD_CENTER_X + 8.3,
    minZ: FASTFOOD_CENTER_Z + 2.1,
    maxZ: FASTFOOD_CENTER_Z + 4.7,
    minY: 0,
    maxY: 2.5,
    blocksSight: false,
  });

  // =========================================================================
  // 5. INTERIOR LIGHTING & ENTRANCE MISSION BEACON
  // =========================================================================
  const diningLight = new THREE.PointLight(0xffe8c2, 5.2, 20, 1.25);
  diningLight.position.set(-5.6, 3.85, -0.5);
  const kitchenLight = new THREE.PointLight(0xe0f2fe, 5.4, 20, 1.25);
  kitchenLight.position.set(5.8, 3.85, 0.5);
  const signLight = new THREE.PointLight(0xfacc15, 3.4, 16, 1.4);
  signLight.position.set(-13.4, 7.6, -12.2);
  root.add(diningLight, kitchenLight, signLight);

  const localEntX = FASTFOOD_ENTRANCE_X - FASTFOOD_CENTER_X;
  const localEntZ = FASTFOOD_ENTRANCE_Z - FASTFOOD_CENTER_Z;
  const beaconRingGeo = trackGeo(new THREE.RingGeometry(2.2, 2.75, 28));
  beaconRingGeo.rotateX(-Math.PI / 2);
  const beaconRingMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const beaconRing = new THREE.Mesh(beaconRingGeo, beaconRingMat);
  beaconRing.position.set(localEntX, 0.08, localEntZ);
  beaconRing.visible = false;
  root.add(beaconRing);

  const beaconBeamGeo = trackGeo(new THREE.CylinderGeometry(0.9, 1.8, 10.5, 18, 1, true));
  beaconBeamGeo.translate(0, 5.25, 0);
  const beaconBeamMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const beaconBeam = new THREE.Mesh(beaconBeamGeo, beaconBeamMat);
  beaconBeam.position.set(localEntX, 0.05, localEntZ);
  beaconBeam.visible = false;
  root.add(beaconBeam);

  const beaconLight = new THREE.PointLight(0xfacc15, 0, 18, 1.4);
  beaconLight.position.set(localEntX, 3.4, localEntZ);
  beaconLight.visible = false;
  root.add(beaconLight);

  const setShelfCollapse = (progress: number) => {
    const p = THREE.MathUtils.clamp(progress, 0, 1);
    // Tips -X toward Mateo's leg (rotation.z > 0 rotates +Y axis toward -X)
    shelfPivot.rotation.z = p * 1.24;
    shelfPivot.position.y = 0.04 + Math.sin(p * Math.PI) * 0.08;
  };

  const updateVisuals = (showBeacon: boolean, elapsed: number) => {
    beaconRing.visible = showBeacon;
    beaconBeam.visible = showBeacon;
    beaconLight.visible = showBeacon;
    if (showBeacon) {
      const pulse = 0.7 + Math.sin(elapsed * 4.2) * 0.25;
      beaconRingMat.opacity = 0.48 + pulse * 0.34;
      beaconBeamMat.opacity = 0.12 + pulse * 0.1;
      beaconLight.intensity = 3.2 * pulse;
      beaconRing.scale.setScalar(0.95 + Math.sin(elapsed * 3.6) * 0.07);
    } else {
      beaconLight.intensity = 0;
    }
  };

  const clampCameraSegment = (
    targetX: number,
    targetY: number,
    targetZ: number,
    camX: number,
    camY: number,
    camZ: number,
  ): { x: number; y: number; z: number } => {
    const inFastFood =
      targetX >= FASTFOOD_INTERIOR_BOUNDS.minX - 0.5 &&
      targetX <= FASTFOOD_INTERIOR_BOUNDS.maxX + 0.5 &&
      targetZ >= FASTFOOD_INTERIOR_BOUNDS.minZ - 0.5 &&
      targetZ <= FASTFOOD_INTERIOR_BOUNDS.maxZ + 0.5;
    if (!inFastFood) {
      return { x: camX, y: camY, z: camZ };
    }
    const maxRoofY = baseY + 4.05;
    let clampedY = Math.min(camY, maxRoofY);
    let bestT = 1.0;
    const dx = camX - targetX;
    const dy = clampedY - targetY;
    const dz = camZ - targetZ;
    const minY = Math.min(targetY, clampedY);
    const maxY = Math.max(targetY, clampedY);

    for (let i = 0; i < wallBoxes.length; i++) {
      const b = wallBoxes[i];
      if (!b.blocksSight) continue;
      if (baseY + b.maxY < minY - 0.2 || baseY + b.minY > maxY + 0.2) continue;
      const pad = 0.26;
      let tmin = 0;
      let tmax = 1;
      const axes: [number, number, number, number][] = [
        [dx, targetX, b.minX - pad, b.maxX + pad],
        [dy, targetY, baseY + b.minY - pad, baseY + b.maxY + pad],
        [dz, targetZ, b.minZ - pad, b.maxZ + pad],
      ];
      let hit = true;
      for (let a = 0; a < 3; a++) {
        const [dir, orig, bmin, bmax] = axes[a];
        if (Math.abs(dir) < 1e-6) {
          if (orig < bmin || orig > bmax) {
            hit = false;
            break;
          }
        } else {
          let t1 = (bmin - orig) / dir;
          let t2 = (bmax - orig) / dir;
          if (t1 > t2) {
            const tmp = t1;
            t1 = t2;
            t2 = tmp;
          }
          tmin = Math.max(tmin, t1);
          tmax = Math.min(tmax, t2);
          if (tmin > tmax) {
            hit = false;
            break;
          }
        }
      }
      if (hit && tmin > 0.05 && tmin < bestT) {
        bestT = Math.max(0.24, tmin - 0.04);
      }
    }

    clampedY = Math.min(targetY + dy * bestT, maxRoofY);
    return {
      x: targetX + dx * bestT,
      y: Math.max(baseY + 0.45, clampedY),
      z: targetZ + dz * bestT,
    };
  };

  // Horde zombies inside Fast Food local (dining area & industrial kitchen)
  const hordeSpawns: FastFoodSpawnPoint[] = [
    { kind: 'runner', x: 46.5, z: 16.5 },
    { kind: 'stalker', x: 48.2, z: 24.5, role: 'police' },
    { kind: 'spitter', x: 51.0, z: 14.0 },
    { kind: 'biter', x: 56.0, z: 16.5 },
    { kind: 'runner', x: 57.0, z: 27.5 },
    { kind: 'stalker', x: 61.5, z: 18.5 },
    { kind: 'brute', x: 61.0, z: 27.8, role: 'gendarme_heavy' },
  ];

  // Mission 3 provisions inside the Fast Food counter & kitchen for Chispa
  const supplySpots: Array<{
    kind: 'chemicals' | 'scrap' | 'powder' | 'food' | 'bandage';
    x: number;
    z: number;
  }> = [
    { kind: 'chemicals', x: 50.8, z: 21.0 },
    { kind: 'chemicals', x: 61.4, z: 14.2 },
    { kind: 'scrap', x: 55.6, z: 28.4 },
    { kind: 'scrap', x: 59.5, z: 21.8 },
    { kind: 'powder', x: 61.2, z: 27.2 },
    { kind: 'food', x: 47.4, z: 27.6 },
    { kind: 'bandage', x: 55.2, z: 13.0 },
  ];

  return {
    root,
    wallBoxes,
    beaconRing,
    beaconRingMat,
    beaconBeam,
    beaconBeamMat,
    beaconLight,
    shelfPivot,
    hordeSpawns,
    supplySpots,
    setShelfCollapse,
    updateVisuals,
    clampCameraSegment,
  };
}

export function resolveWallBoxes2D(
  x: number,
  y: number,
  z: number,
  radius: number,
  boxes: FastFoodWallBox[],
  baseY = 0,
): { x: number; z: number } {
  let rx = x;
  let rz = z;
  const entMinY = y + 0.1;
  const entMaxY = y + 1.65;

  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (baseY + b.maxY < entMinY || baseY + b.minY > entMaxY) continue;
      const nearX = THREE.MathUtils.clamp(rx, b.minX, b.maxX);
      const nearZ = THREE.MathUtils.clamp(rz, b.minZ, b.maxZ);
      const dx = rx - nearX;
      const dz = rz - nearZ;
      const dSq = dx * dx + dz * dz;
      if (dSq < radius * radius) {
        if (dSq > 0.00001) {
          const d = Math.sqrt(dSq);
          const push = radius - d;
          rx += (dx / d) * push;
          rz += (dz / d) * push;
        } else {
          const dLeft = Math.abs(rx - b.minX);
          const dRight = Math.abs(b.maxX - rx);
          const dFront = Math.abs(rz - b.minZ);
          const dBack = Math.abs(b.maxZ - rz);
          const m = Math.min(dLeft, dRight, dFront, dBack);
          if (m === dLeft) rx = b.minX - radius;
          else if (m === dRight) rx = b.maxX + radius;
          else if (m === dFront) rz = b.minZ - radius;
          else rz = b.maxZ + radius;
        }
      }
    }
  }
  return { x: rx, z: rz };
}

export function buildMechanicNpcRig(
  customTemplate?: NpcGlbTemplateSource | null,
): MechanicNpcRig {
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const root = new THREE.Group();
  root.name = 'AllyMechanicMateo';
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const ringGeo = track(new THREE.RingGeometry(0.65, 0.84, 28));
  ringGeo.rotateX(-Math.PI / 2);
  const beaconMat = track(
    new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const beaconRing = new THREE.Mesh(ringGeo, beaconMat);
  beaconRing.position.y = 0.04;
  root.add(beaconRing);

  const wrenchMat = track(
    new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.28, metalness: 0.88 }),
  );
  const wrenchGroup = new THREE.Group();
  const wHandle = new THREE.Mesh(track(new THREE.BoxGeometry(0.045, 0.42, 0.03)), wrenchMat);
  wHandle.position.y = 0.14;
  const wJaw = new THREE.Mesh(track(new THREE.BoxGeometry(0.12, 0.09, 0.045)), wrenchMat);
  wJaw.position.y = 0.36;
  wrenchGroup.add(wHandle, wJaw);

  if (customTemplate) {
    const model = SkeletonUtils.clone(customTemplate.scene) as THREE.Group;
    bodyPivot.add(model);
    const character = BaseCharacter.fromModelNode({
      entityId: 'npc:mateo',
      label: 'Mateo (Mecánico)',
      role: 'npc',
      tag: 'npc_mateo',
      root,
      bodyPivot,
      model,
      animations: customTemplate.animations,
      isCustomGlb: true,
    });
    const bones = character.bones;
    if (bones.rightHand) {
      const ws = new THREE.Vector3();
      bones.rightHand.getWorldScale(ws);
      wrenchGroup.scale.setScalar(1 / Math.max(0.01, ws.x));
      if (bones.rightPalmOffset) wrenchGroup.position.copy(bones.rightPalmOffset);
      if (bones.rightGripLocalQ) wrenchGroup.quaternion.copy(bones.rightGripLocalQ);
      bones.rightHand.add(wrenchGroup);
    } else {
      wrenchGroup.position.set(-0.24, 1.0, 0.25);
      wrenchGroup.rotation.x = Math.PI * 0.42;
      bodyPivot.add(wrenchGroup);
    }
    const dummy = new THREE.Group();
    return {
      character,
      isCustomGlb: true,
      bones,
      root,
      bodyPivot,
      hips: (bones.hips?.node as THREE.Group) ?? dummy,
      torso: (bones.spine?.node as THREE.Group) ?? dummy,
      head: (bones.head?.node as THREE.Group) ?? dummy,
      legL: {
        hip: (bones.leftUpLeg?.node as THREE.Group) ?? dummy,
        knee: (bones.leftLeg?.node as THREE.Group) ?? dummy,
      },
      legR: {
        hip: (bones.rightUpLeg?.node as THREE.Group) ?? dummy,
        knee: (bones.rightLeg?.node as THREE.Group) ?? dummy,
      },
      armL: {
        shoulder: (bones.leftArm?.node as THREE.Group) ?? dummy,
        elbow: (bones.leftForeArm?.node as THREE.Group) ?? dummy,
        hand: (bones.leftHand as THREE.Group) ?? dummy,
      },
      armR: {
        shoulder: (bones.rightArm?.node as THREE.Group) ?? dummy,
        elbow: (bones.rightForeArm?.node as THREE.Group) ?? dummy,
        hand: (bones.rightHand as THREE.Group) ?? dummy,
      },
      wrenchGroup,
      beaconRing,
      beaconMat,
      dispose: () => {
        character.dispose();
        disposables.forEach((d) => d.dispose());
      },
    };
  }

  const skinMat = track(new THREE.MeshStandardMaterial({ color: 0xdfb292, roughness: 0.65 }));
  const hairMat = track(new THREE.MeshStandardMaterial({ color: 0x1e1815, roughness: 0.78 }));
  const overallMat = track(new THREE.MeshStandardMaterial({ color: 0x1e40af, roughness: 0.78 }));
  const shirtMat = track(new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.74 }));
  const hiVisMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: new THREE.Color(0xd97706),
      emissiveIntensity: 0.22,
      roughness: 0.45,
    }),
  );
  const beltMat = track(new THREE.MeshStandardMaterial({ color: 0x3f2718, roughness: 0.85 }));
  const bootMat = track(new THREE.MeshStandardMaterial({ color: 0x111418, roughness: 0.88 }));
  const capMat = track(new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.72 }));

  const hips = new THREE.Group();
  hips.name = 'hips';
  hips.position.set(0, 0.84, 0);
  bodyPivot.add(hips);

  const thighGeo = track(new THREE.CylinderGeometry(0.092, 0.078, 0.4, 8));
  thighGeo.translate(0, -0.2, 0);
  const shinGeo = track(new THREE.CylinderGeometry(0.074, 0.06, 0.36, 8));
  shinGeo.translate(0, -0.18, 0);
  const bootGeo = track(new THREE.BoxGeometry(0.14, 0.11, 0.24));

  const makeLeg = (xOff: number, side: 'l' | 'r') => {
    const hip = new THREE.Group();
    hip.name = side === 'l' ? 'thigh_l' : 'thigh_r';
    hip.position.set(xOff, 0, 0);
    const thigh = new THREE.Mesh(thighGeo, overallMat);
    thigh.castShadow = true;
    hip.add(thigh);
    const knee = new THREE.Group();
    knee.name = side === 'l' ? 'shin_l' : 'shin_r';
    knee.position.set(0, -0.4, 0);
    hip.add(knee);
    const shin = new THREE.Mesh(shinGeo, overallMat);
    shin.castShadow = true;
    knee.add(shin);
    const boot = new THREE.Mesh(bootGeo, bootMat);
    boot.position.set(0, -0.37, 0.045);
    boot.castShadow = true;
    knee.add(boot);
    return { hip, knee };
  };

  const legL = makeLeg(0.115, 'l');
  const legR = makeLeg(-0.115, 'r');
  hips.add(legL.hip, legR.hip);

  const torso = new THREE.Group();
  torso.name = 'spine';
  torso.position.set(0, 0.04, 0);
  hips.add(torso);

  const core = new THREE.Mesh(track(new THREE.BoxGeometry(0.38, 0.56, 0.24)), overallMat);
  core.position.y = 0.28;
  core.castShadow = true;
  torso.add(core);

  // High-visibility safety stripe & mechanic tool belt
  const stripe = new THREE.Mesh(track(new THREE.BoxGeometry(0.4, 0.08, 0.255)), hiVisMat);
  stripe.position.y = 0.34;
  const belt = new THREE.Mesh(track(new THREE.BoxGeometry(0.41, 0.09, 0.265)), beltMat);
  belt.position.y = 0.06;
  const pouch = new THREE.Mesh(track(new THREE.BoxGeometry(0.12, 0.16, 0.18)), beltMat);
  pouch.position.set(0.24, 0.05, 0.03);
  torso.add(stripe, belt, pouch);

  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 0.62, 0);
  torso.add(head);

  const headMesh = new THREE.Mesh(track(new THREE.SphereGeometry(0.155, 14, 12)), skinMat);
  headMesh.position.y = 0.14;
  headMesh.castShadow = true;
  const hairMesh = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.162, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55)),
    hairMat,
  );
  hairMesh.position.set(0, 0.16, -0.02);
  const capCrown = new THREE.Mesh(
    track(new THREE.SphereGeometry(0.168, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45)),
    capMat,
  );
  capCrown.position.set(0, 0.19, 0);
  const capVisor = new THREE.Mesh(track(new THREE.BoxGeometry(0.2, 0.03, 0.14)), capMat);
  capVisor.position.set(0, 0.21, -0.17); // Backward mechanic cap
  head.add(headMesh, hairMesh, capCrown, capVisor);

  const upperArmGeo = track(new THREE.CylinderGeometry(0.058, 0.05, 0.28, 8));
  upperArmGeo.translate(0, -0.14, 0);
  const foreArmGeo = track(new THREE.CylinderGeometry(0.048, 0.04, 0.25, 8));
  foreArmGeo.translate(0, -0.125, 0);
  const handGeo = track(new THREE.SphereGeometry(0.044, 8, 8));

  const makeArm = (xOff: number, side: 'l' | 'r') => {
    const shoulder = new THREE.Group();
    shoulder.name = side === 'l' ? 'arm_l' : 'arm_r';
    shoulder.position.set(xOff, 0.52, 0);
    const upper = new THREE.Mesh(upperArmGeo, shirtMat);
    upper.castShadow = true;
    shoulder.add(upper);
    const elbow = new THREE.Group();
    elbow.name = side === 'l' ? 'forearm_l' : 'forearm_r';
    elbow.position.set(0, -0.28, 0);
    shoulder.add(elbow);
    const fore = new THREE.Mesh(foreArmGeo, skinMat);
    fore.castShadow = true;
    elbow.add(fore);
    const hand = new THREE.Group();
    hand.name = side === 'l' ? 'hand_l' : 'hand_r';
    hand.position.set(0, -0.26, 0);
    elbow.add(hand);
    const handMesh = new THREE.Mesh(handGeo, skinMat);
    hand.add(handMesh);
    return { shoulder, elbow, hand };
  };

  const armL = makeArm(0.25, 'l');
  const armR = makeArm(-0.25, 'r');
  torso.add(armL.shoulder, armR.shoulder);

  // Heavy steel monkey wrench in right hand
  wrenchGroup.position.set(0, 0, 0.12);
  wrenchGroup.rotation.x = Math.PI * 0.42;
  armR.hand.add(wrenchGroup);

  const bones: HumanoidBoneMap = {
    hips: captureBoneRest(hips),
    spine: captureBoneRest(torso),
    neck: null,
    head: captureBoneRest(head),
    leftUpLeg: captureBoneRest(legL.hip),
    leftLeg: captureBoneRest(legL.knee),
    leftFoot: null,
    rightUpLeg: captureBoneRest(legR.hip),
    rightLeg: captureBoneRest(legR.knee),
    rightFoot: null,
    leftArm: captureBoneRest(armL.shoulder),
    leftForeArm: captureBoneRest(armL.elbow),
    leftHandRest: captureBoneRest(armL.hand),
    rightArm: captureBoneRest(armR.shoulder),
    rightForeArm: captureBoneRest(armR.elbow),
    rightHandRest: captureBoneRest(armR.hand),
    rightHand: armR.hand,
    leftHand: armL.hand,
    armDropAngle: 0,
    charForward: new THREE.Vector3(0, 0, 1),
    charLeft: new THREE.Vector3(1, 0, 0),
    charUp: new THREE.Vector3(0, 1, 0),
  };

  const character = new BaseCharacter({
    entityId: 'npc:mateo',
    label: 'Mateo (Mecánico)',
    role: 'npc',
    tag: 'npc_mateo',
    root,
    bodyPivot,
    modelRoot: bodyPivot,
    isCustomGlb: false,
    bones,
  });

  return {
    character,
    isCustomGlb: false,
    bones,
    root,
    bodyPivot,
    hips,
    torso,
    head,
    legL,
    legR,
    armL,
    armR,
    wrenchGroup,
    beaconRing,
    beaconMat,
    dispose: () => {
      character.dispose();
      disposables.forEach((d) => d.dispose());
    },
  };
}

export function animateMechanicNpc(
  rig: MechanicNpcRig,
  elapsed: number,
  mode: MechanicAnimMode,
  dt = 0.016,
) {
  const safeDt = Math.min(0.05, Math.max(0.001, dt));
  const p = elapsed * 5.2;
  const stride = Math.sin(p);

  if (rig.character.mixer) {
    let played = false;
    let usingSitClip = false;
    if (rig.character.getCurrentAction() === 'hit' && rig.character.nativeActions.hit?.isRunning()) {
      played = true;
    } else if (mode === 'pinned') {
      if (rig.character.playClip('sit', 0.16, 1, false, true)) {
        played = true;
        usingSitClip = true;
      } else {
        played = rig.character.forceIdle(0.1);
      }
    } else if (mode === 'limping_walk') {
      played =
        rig.character.setAction('walk', { fadeSec: 0.16, timeScale: 0.72, interruptOneShot: true }) ||
        rig.character.forceIdle(0.1);
    } else if (mode === 'working_garage') {
      played =
        rig.character.playClip('work', 0.18, 1, false, true) ||
        rig.character.forceIdle(0.1);
    } else if (mode === 'fighting') {
      played =
        rig.character.setAction('attack', { fadeSec: 0.14, timeScale: 1.08, oneShot: false }) ||
        rig.character.playClip('punch', 0.14, 1.08) ||
        rig.character.forceIdle(0.1);
    } else {
      played = rig.character.forceIdle(0.1);
    }
    if (played) {
      rig.character.updateAnimation(safeDt);
      const targetY =
        mode === 'pinned'
          ? usingSitClip
            ? 0
            : -0.58
          : mode === 'limping_walk'
            ? -0.045 - Math.max(0, -stride) * 0.07
            : 0;
      rig.bodyPivot.position.y = THREE.MathUtils.damp(rig.bodyPivot.position.y, targetY, 12, safeDt);
      return;
    }
    rig.character.resetClips();
  }

  const b = rig.bones;
  const drop = rig.isCustomGlb ? b.armDropAngle : 0;
  const lam = mode === 'fighting' ? 18 : 13;

  const dampTorso = (px: number, py: number, pz: number) => {
    if (b.chest && b.spine) {
      dampBoneRotCharSpace(b.spine, px * 0.45, py * 0.35, pz * 0.45, lam, safeDt);
      dampBoneRotCharSpace(b.chest, px * 0.55, py * 0.65, pz * 0.55, lam, safeDt);
    } else {
      dampBoneRotCharSpace(b.spine, px, py, pz, lam, safeDt);
    }
  };

  rig.bodyPivot.rotation.x = THREE.MathUtils.damp(rig.bodyPivot.rotation.x, 0, 12, safeDt);
  rig.bodyPivot.rotation.z = THREE.MathUtils.damp(rig.bodyPivot.rotation.z, 0, 12, safeDt);

  if (mode === 'pinned') {
    // Sitting / collapsed on floor clutching injured right leg under fallen shelf
    rig.bodyPivot.position.y = THREE.MathUtils.damp(rig.bodyPivot.position.y, -0.58, 12, safeDt);
    dampBoneRotCharSpace(b.hips, -0.28, 0, 0, lam, safeDt);
    dampTorso(0.34, 0, 0.04);
    dampBoneRotCharSpace(b.leftUpLeg, -1.25, 0, 0.06, lam, safeDt);
    dampBoneRotCharSpace(b.leftLeg, 0.45, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.leftFoot, 0.12, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.rightUpLeg, -1.38, 0, -0.06, lam, safeDt);
    dampBoneRotCharSpace(b.rightLeg, 0.18, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.rightFoot, 0.18, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.leftArm, -0.85 + Math.sin(elapsed * 4.0) * 0.08, 0.14, -drop, lam, safeDt);
    dampBoneRotCharSpace(b.leftForeArm, -0.75, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.rightArm, -0.65, -0.1, drop, lam, safeDt);
    dampBoneRotCharSpace(b.rightForeArm, -0.55, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.neck, -0.1, Math.sin(elapsed * 2.4) * 0.08, 0, lam, safeDt);
    dampBoneRotCharSpace(b.head, -0.14, Math.sin(elapsed * 2.4) * 0.14, 0, lam, safeDt);
  } else if (mode === 'fighting') {
    const sw = Math.sin(elapsed * 6.5);
    const strike = Math.max(0, Math.sin(elapsed * 8.2));
    rig.bodyPivot.position.y = THREE.MathUtils.damp(rig.bodyPivot.position.y, Math.cos(elapsed * 13) * 0.02 - 0.01, 14, safeDt);
    dampBoneRotCharSpace(b.hips, 0, -0.14 + sw * 0.08, 0, lam, safeDt);
    dampTorso(0.12, sw * 0.22 + strike * 0.16, 0.04);
    dampBoneRotCharSpace(b.leftUpLeg, -0.22, 0, 0.05, lam, safeDt);
    dampBoneRotCharSpace(b.rightUpLeg, 0.25, 0, -0.05, lam, safeDt);
    dampBoneRotCharSpace(b.leftLeg, 0.3, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.rightLeg, 0.15, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.leftFoot, -0.08, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.rightFoot, -0.2, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.leftArm, -0.8, 0.22, 0.14 - drop, lam, safeDt);
    dampBoneRotCharSpace(b.leftForeArm, -0.85, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.rightArm, -1.35 + strike * 1.15, -0.14, -0.12 + drop, lam, safeDt);
    dampBoneRotCharSpace(b.rightForeArm, -0.55 + strike * 0.25, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.neck, 0.02, Math.sin(elapsed * 3.1) * 0.06, 0, lam, safeDt);
    dampBoneRotCharSpace(b.head, 0.04, Math.sin(elapsed * 3.1) * 0.1, 0, lam, safeDt);
  } else if (mode === 'limping_walk') {
    // Visible asymmetric limp ("rengo"): favors left leg, drags right leg with natural weight dip
    const limpDip = Math.max(0, -stride) * 0.085 + (1 - Math.cos(p * 2)) * 0.014;
    rig.bodyPivot.position.y = THREE.MathUtils.damp(rig.bodyPivot.position.y, -0.035 - limpDip, 13, safeDt);
    dampBoneRotCharSpace(b.hips, 0, stride * 0.12, stride * 0.045 + 0.035, lam, safeDt);
    dampTorso(0.14, -stride * 0.1, stride * 0.065 + 0.055);
    dampBoneRotCharSpace(b.leftUpLeg, stride * 0.48, 0, 0.02, lam, safeDt);
    dampBoneRotCharSpace(b.leftLeg, Math.max(0, -Math.sin(p - 0.3)) * 0.62 + 0.06, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.leftFoot, Math.sin(p - 0.5) * 0.22, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.rightUpLeg, -stride * 0.22 + 0.1, 0, -0.03, lam, safeDt);
    dampBoneRotCharSpace(b.rightLeg, 0.26 + Math.max(0, stride) * 0.1, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.rightFoot, -0.18, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.leftArm, -stride * 0.36, 0, 0.08 - drop, lam, safeDt);
    dampBoneRotCharSpace(b.leftForeArm, -0.4, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.rightArm, -0.45 + stride * 0.18, 0, -0.08 + drop, lam, safeDt);
    dampBoneRotCharSpace(b.rightForeArm, -0.85, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.neck, 0.04, Math.sin(elapsed * 1.8) * 0.04, 0, lam, safeDt);
    dampBoneRotCharSpace(b.head, 0.04, Math.sin(elapsed * 1.8) * 0.06, -0.04, lam, safeDt);
  } else if (mode === 'limping_idle') {
    const breath = Math.sin(elapsed * 2.0) * 0.015;
    rig.bodyPivot.position.y = THREE.MathUtils.damp(rig.bodyPivot.position.y, -0.035 + breath * 0.6, 12, safeDt);
    dampBoneRotCharSpace(b.hips, 0, -0.06, 0.04, lam, safeDt);
    dampTorso(0.08 + breath, 0.04, 0.06);
    dampBoneRotCharSpace(b.leftUpLeg, -0.03, 0, 0.025, lam, safeDt);
    dampBoneRotCharSpace(b.leftLeg, 0.06, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.leftFoot, -0.03, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.rightUpLeg, 0.14, 0, -0.03, lam, safeDt);
    dampBoneRotCharSpace(b.rightLeg, 0.3, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.rightFoot, -0.22, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.leftArm, -0.22 + breath, 0, 0.08 - drop, lam, safeDt);
    dampBoneRotCharSpace(b.leftForeArm, -0.42, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.rightArm, -0.35 - breath, 0, -0.08 + drop, lam, safeDt);
    dampBoneRotCharSpace(b.rightForeArm, -0.78, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.neck, 0, Math.sin(elapsed * 1.4) * 0.08, 0, lam, safeDt);
    dampBoneRotCharSpace(b.head, 0, Math.sin(elapsed * 1.4) * 0.14, 0, lam, safeDt);
  } else {
    // Working on the armored truck in Teatro Colón Garage Bay
    const wrenchPulse = Math.sin(elapsed * 5.2);
    const breath = Math.sin(elapsed * 2.2) * 0.015;
    rig.bodyPivot.position.y = THREE.MathUtils.damp(rig.bodyPivot.position.y, breath, 12, safeDt);
    dampBoneRotCharSpace(b.hips, 0, -0.05, 0, lam, safeDt);
    dampTorso(0.16 + breath, -0.08 + wrenchPulse * 0.04, 0);
    dampBoneRotCharSpace(b.leftUpLeg, -0.08, 0, 0.03, lam, safeDt);
    dampBoneRotCharSpace(b.rightUpLeg, 0.1, 0, -0.03, lam, safeDt);
    dampBoneRotCharSpace(b.leftLeg, 0.12, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.rightLeg, 0.12, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.leftFoot, -0.04, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.rightFoot, -0.08, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.leftArm, -0.78, 0.12, 0.1 - drop, lam, safeDt);
    dampBoneRotCharSpace(b.leftForeArm, -0.65, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.rightArm, -1.05 + wrenchPulse * 0.28, -0.1, -0.08 + drop, lam, safeDt);
    dampBoneRotCharSpace(b.rightForeArm, -0.85 + wrenchPulse * 0.3, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.neck, 0.06, Math.sin(elapsed * 1.1) * 0.06, 0, lam, safeDt);
    dampBoneRotCharSpace(b.head, 0.08, Math.sin(elapsed * 1.1) * 0.09, 0, lam, safeDt);
  }
}

export function buildGarageVehicleRig(): GarageVehicleRig {
  const disposables: { dispose: () => void }[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposables.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposables.push(m);
    return m;
  };

  const root = new THREE.Group();
  root.name = 'LaPortenaArmoredPickup';

  const bodyMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.56, metalness: 0.42 }),
  );
  const rustChassisMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.72, metalness: 0.55 }),
  );
  const armorSteelMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.36, metalness: 0.82 }),
  );
  const hazardMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.48, metalness: 0.32 }),
  );
  const tireMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.92, metalness: 0.08 }),
  );
  const rimMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.28, metalness: 0.85 }),
  );
  const glassMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x93c5fd,
      roughness: 0.15,
      metalness: 0.4,
      transparent: true,
      opacity: 0.55,
    }),
  );
  const headlightGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: new THREE.Color(0xfbbf24),
      emissiveIntensity: 0.2,
      roughness: 0.2,
    }),
  );
  const engineGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: new THREE.Color(0x0284c7),
      emissiveIntensity: 0.15,
      roughness: 0.35,
      metalness: 0.75,
    }),
  );

  // Base Pickup Body (frame, cab, cargo bed, popped hood)
  const frame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.05, 0.26, 4.65)), rustChassisMat);
  frame.position.set(0, 0.58, 0);
  frame.castShadow = true;
  const cab = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.96, 1.05, 1.72)), bodyMat);
  cab.position.set(0, 1.24, 0.35);
  cab.castShadow = true;
  const windshield = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.76, 0.62, 0.08)), glassMat);
  windshield.position.set(0, 1.38, 1.22);
  windshield.rotation.x = -0.25;
  const hood = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.92, 0.48, 1.25)), bodyMat);
  hood.position.set(0, 0.95, 1.82);
  hood.castShadow = true;
  const bedFloor = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.96, 0.46, 1.95)), bodyMat);
  bedFloor.position.set(0, 0.94, -1.48);
  bedFloor.castShadow = true;
  const headL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.32, 0.22, 0.1)), headlightGlowMat);
  headL.position.set(-0.68, 0.95, 2.46);
  const headR = headL.clone();
  headR.position.x = 0.68;
  root.add(frame, cab, windshield, hood, bedFloor, headL, headR);

  // Jack stands shown while tires aren't mounted yet
  const jackStandsGroup = new THREE.Group();
  const standGeo = trackGeo(new THREE.CylinderGeometry(0.1, 0.18, 0.48, 6));
  [
    [-0.85, 1.45],
    [0.85, 1.45],
    [-0.85, -1.45],
    [0.85, -1.45],
  ].forEach(([jx, jz]) => {
    const js = new THREE.Mesh(standGeo, hazardMat);
    js.position.set(jx, 0.24, jz);
    jackStandsGroup.add(js);
  });
  root.add(jackStandsGroup);

  // Module 1: Engine & Twin Exhaust Stacks
  const engineGroup = new THREE.Group();
  const engineBlock = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.88, 0.46, 0.84)), engineGlowMat);
  engineBlock.position.set(0, 1.24, 1.82);
  const stackGeo = trackGeo(new THREE.CylinderGeometry(0.065, 0.075, 1.35, 8));
  const stackL = new THREE.Mesh(stackGeo, rimMat);
  stackL.position.set(-0.92, 1.48, -0.58);
  const stackR = new THREE.Mesh(stackGeo, rimMat);
  stackR.position.set(0.92, 1.48, -0.58);
  engineGroup.add(engineBlock, stackL, stackR);
  root.add(engineGroup);

  // Module 2: Reinforced All-Terrain Tires & Rims
  const tiresGroup = new THREE.Group();
  const tireGeo = trackGeo(new THREE.CylinderGeometry(0.45, 0.45, 0.34, 14));
  tireGeo.rotateZ(Math.PI / 2);
  const rimGeo = trackGeo(new THREE.CylinderGeometry(0.24, 0.24, 0.36, 10));
  rimGeo.rotateZ(Math.PI / 2);
  [
    [-1.02, 1.48],
    [1.02, 1.48],
    [-1.02, -1.48],
    [1.02, -1.48],
  ].forEach(([wx, wz]) => {
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.position.set(wx, 0.45, wz);
    tire.castShadow = true;
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.set(wx, 0.45, wz);
    tiresGroup.add(tire, rim);
  });
  root.add(tiresGroup);

  // Module 3: Steel Armor Plates, Window Bars & Spiked Front Ram Bumper
  const armorGroup = new THREE.Group();
  const ramBar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.26, 0.56, 0.36)), armorSteelMat);
  ramBar.position.set(0, 0.78, 2.55);
  const ramStripe = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.28, 0.14, 0.38)), hazardMat);
  ramStripe.position.set(0, 0.96, 2.56);
  const sideArmorGeo = trackGeo(new THREE.BoxGeometry(0.08, 0.62, 3.65));
  const sideL = new THREE.Mesh(sideArmorGeo, armorSteelMat);
  sideL.position.set(-1.02, 1.02, 0.15);
  const sideR = new THREE.Mesh(sideArmorGeo, armorSteelMat);
  sideR.position.set(1.02, 1.02, 0.15);
  const roofRack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.78, 0.12, 1.42)), armorSteelMat);
  roofRack.position.set(0, 1.82, 0.35);
  armorGroup.add(ramBar, ramStripe, sideL, sideR, roofRack);
  root.add(armorGroup);

  // Module 4: Auxiliary Fuel Drums & Flare Beacon Bar on Cargo Bed
  const fuelGroup = new THREE.Group();
  const drumGeo = trackGeo(new THREE.CylinderGeometry(0.28, 0.28, 0.82, 12));
  drumGeo.rotateZ(Math.PI / 2);
  const drumMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.48, metalness: 0.42 }),
  );
  const drum1 = new THREE.Mesh(drumGeo, drumMat);
  drum1.position.set(-0.46, 1.44, -1.48);
  const drum2 = new THREE.Mesh(drumGeo, drumMat);
  drum2.position.set(0.46, 1.44, -1.48);
  const flareBar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.2, 0.14, 0.22)), hazardMat);
  flareBar.position.set(0, 1.92, 0.35);
  fuelGroup.add(drum1, drum2, flareBar);
  root.add(fuelGroup);

  const applyRepairState = (state: VehicleRepairState, elapsed: number) => {
    engineGroup.visible = state.engine;
    tiresGroup.visible = state.tires;
    jackStandsGroup.visible = !state.tires;
    armorGroup.visible = state.armor;
    fuelGroup.visible = state.fuel;
    root.position.y = state.tires ? 0.08 : 0.0;
    const ready = state.engine && state.tires;
    headlightGlowMat.emissiveIntensity = ready ? 1.35 + Math.sin(elapsed * 3.0) * 0.25 : 0.15;
    engineGlowMat.emissiveIntensity = state.engine ? 0.75 + Math.sin(elapsed * 5.0) * 0.2 : 0.1;
  };

  return {
    root,
    engineGroup,
    tiresGroup,
    armorGroup,
    fuelGroup,
    jackStandsGroup,
    headlightGlowMat,
    engineGlowMat,
    applyRepairState,
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}
