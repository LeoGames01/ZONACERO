import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import {
  BaseCharacter,
  captureBoneRest,
  dampBoneRotCharSpace,
  type HumanoidBoneMap,
} from './baseCharacter';
import {
  animateMechanicNpc,
  buildGarageVehicleRig,
  buildMechanicNpcRig,
  type GarageVehicleRig,
  type MechanicNpcRig,
  type NpcGlbTemplateSource,
} from './fastFoodBuilding';
import type { WorldCollider } from './models';
import type { EnemyCarriedGear, EnemyKind, EnemyRole, LootKind, VehicleRepairState } from './types';

export interface WalkableSurface {
  id: string;
  floor: 0 | 1 | 2;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  y: number;
  ramp?: {
    axis: 'x' | 'z';
    startVal: number;
    endVal: number;
    yStart: number;
    yEnd: number;
  };
}

export interface WallBoxCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
  blocksSight?: boolean;
}

export interface ColonSpawnPoint {
  kind: EnemyKind;
  x: number;
  y: number;
  z: number;
  floor: 0 | 1 | 2;
  zoneLabel: string;
  carriedWeapon?: 'pistol' | 'rifle';
  enemyRole?: EnemyRole;
  carriedGear?: EnemyCarriedGear;
}

export interface ColonProvisionSpot {
  kind: LootKind;
  x: number;
  y: number;
  z: number;
}

export interface AllyChemistRig {
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
  flaskGlow: THREE.Mesh;
  beaconRing: THREE.Mesh;
  dispose: () => void;
}

export const COLON_INTERIOR_SPAWN = { x: 0, y: 0, z: 25.2 };
export const COLON_INTERIOR_EXIT_POS = { x: 0, y: 0, z: 28.8 };
export const COLON_WORKBENCH_POS = { x: 27.6, y: 0, z: 6.2 };
export const COLON_ALLY_BASE_POS = { x: 26.8, y: 0, z: 6.8 };
export const COLON_BOILER_DOOR_POS = { x: -27.2, y: 0, z: -29.2 };
export const COLON_VEHICLE_BAY_POS = { x: 27.2, y: 0, z: -16.8 };
export const COLON_MECHANIC_BASE_POS = { x: 24.4, y: 0, z: -15.4 };

export interface ColonInteriorEnvironment {
  root: THREE.Group;
  surfaces: WalkableSurface[];
  wallBoxes: WallBoxCollider[];
  circleColliders: WorldCollider[];
  zombieSpawns: ColonSpawnPoint[];
  lootSpots: ColonProvisionSpot[];
  allyRig: AllyChemistRig;
  mechanicRig: MechanicNpcRig;
  vehicleRig: GarageVehicleRig;
  vehicleBayRing: THREE.Mesh;
  boilerDoorPivot: THREE.Group;
  workbenchRing: THREE.Mesh;
  exitBeaconRing: THREE.Mesh;
  exitBeaconBeam: THREE.Mesh;
  steamJets: Array<{ x: number; y: number; z: number; dx: number; dy: number; dz: number }>;
  chandelierGroup: THREE.Group;
  sconceLights: THREE.PointLight[];
  resolveFloorHeight: (x: number, z: number, refY: number) => number;
  getFloorIndex: (y: number) => 0 | 1 | 2;
  resolveCircleAndWalls: (x: number, y: number, z: number, radius: number) => { x: number; z: number };
  hasLineOfSight: (x1: number, y1: number, z1: number, x2: number, y2: number, z2: number) => boolean;
  clampCameraSegment: (
    targetX: number,
    targetY: number,
    targetZ: number,
    camX: number,
    camY: number,
    camZ: number,
  ) => { x: number; y: number; z: number };
  updateVisuals: (
    elapsed: number,
    baseUnlocked: boolean,
    allyRescued: boolean,
    vehicleBayUnlocked?: boolean,
    vehicleState?: VehicleRepairState,
    dt?: number,
  ) => void;
  replaceAllyRig: (customTemplate?: NpcGlbTemplateSource | null) => AllyChemistRig;
  replaceMechanicRig: (customTemplate?: NpcGlbTemplateSource | null) => MechanicNpcRig;
  dispose: () => void;
}

function createColonTextures(maxAniso: number) {
  const safeAniso = Math.max(1, Math.min(4, maxAniso));
  const disposables: THREE.Texture[] = [];

  // 1. Grand Foyer Checkered Carrara & Rosso Marble with Gold Border Inlay
  const marbleCanvas = document.createElement('canvas');
  marbleCanvas.width = 512;
  marbleCanvas.height = 512;
  const mctx = marbleCanvas.getContext('2d')!;
  const tile = 64;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const dark = (x + y) % 2 === 0;
      mctx.fillStyle = dark ? '#561b22' : '#e6ddd0';
      mctx.fillRect(x * tile, y * tile, tile, tile);
      // Subtle diagonal veining
      mctx.strokeStyle = dark ? 'rgba(232,190,175,0.22)' : 'rgba(115,98,86,0.2)';
      mctx.lineWidth = 1.6;
      mctx.beginPath();
      mctx.moveTo(x * tile, y * tile + ((x * 17) % tile));
      mctx.bezierCurveTo(
        x * tile + 20,
        y * tile + 14,
        x * tile + 44,
        y * tile + 50,
        (x + 1) * tile,
        y * tile + (((x + y) * 23) % tile),
      );
      mctx.stroke();
      // Fine brass/grout tile frame
      mctx.strokeStyle = 'rgba(195, 152, 74, 0.25)';
      mctx.lineWidth = 1.5;
      mctx.strokeRect(x * tile + 1, y * tile + 1, tile - 2, tile - 2);
    }
  }
  const marbleTex = new THREE.CanvasTexture(marbleCanvas);
  marbleTex.wrapS = THREE.RepeatWrapping;
  marbleTex.wrapT = THREE.RepeatWrapping;
  marbleTex.repeat.set(6, 6);
  marbleTex.colorSpace = THREE.SRGBColorSpace;
  marbleTex.anisotropy = safeAniso;
  disposables.push(marbleTex);

  // 2. Crimson Velvet Carpet & Baroque Damask
  const carpetCanvas = document.createElement('canvas');
  carpetCanvas.width = 256;
  carpetCanvas.height = 256;
  const cctx = carpetCanvas.getContext('2d')!;
  cctx.fillStyle = '#5a0e18';
  cctx.fillRect(0, 0, 256, 256);
  // Subtle pile variation
  for (let i = 0; i < 64; i += 8) {
    cctx.fillStyle = i % 16 === 0 ? 'rgba(255,200,200,0.03)' : 'rgba(0,0,0,0.06)';
    cctx.fillRect(0, i * 4, 256, 4);
  }
  cctx.strokeStyle = 'rgba(218, 168, 72, 0.34)';
  cctx.lineWidth = 2.5;
  for (let i = 0; i < 256; i += 64) {
    for (let j = 0; j < 256; j += 64) {
      cctx.strokeRect(i + 7, j + 7, 50, 50);
      cctx.beginPath();
      cctx.arc(i + 32, j + 32, 13, 0, Math.PI * 2);
      cctx.stroke();
      cctx.fillStyle = 'rgba(218, 168, 72, 0.18)';
      cctx.beginPath();
      cctx.arc(i + 32, j + 32, 4, 0, Math.PI * 2);
      cctx.fill();
    }
  }
  const carpetTex = new THREE.CanvasTexture(carpetCanvas);
  carpetTex.wrapS = THREE.RepeatWrapping;
  carpetTex.wrapT = THREE.RepeatWrapping;
  carpetTex.repeat.set(7, 7);
  carpetTex.colorSpace = THREE.SRGBColorSpace;
  carpetTex.anisotropy = maxAniso;
  disposables.push(carpetTex);

  // 2b. Imperial Crimson Stair Runner with Twin Gold Trim
  const runnerCanvas = document.createElement('canvas');
  runnerCanvas.width = 128;
  runnerCanvas.height = 256;
  const rctx = runnerCanvas.getContext('2d')!;
  rctx.fillStyle = '#7b111e';
  rctx.fillRect(0, 0, 128, 256);
  rctx.fillStyle = '#d9a441';
  rctx.fillRect(8, 0, 6, 256);
  rctx.fillRect(114, 0, 6, 256);
  rctx.fillStyle = 'rgba(245, 208, 122, 0.22)';
  for (let y = 0; y < 256; y += 32) {
    rctx.beginPath();
    rctx.arc(64, y + 16, 10, 0, Math.PI * 2);
    rctx.fill();
  }
  const runnerTex = new THREE.CanvasTexture(runnerCanvas);
  runnerTex.wrapS = THREE.ClampToEdgeWrapping;
  runnerTex.wrapT = THREE.RepeatWrapping;
  runnerTex.repeat.set(1, 5);
  runnerTex.colorSpace = THREE.SRGBColorSpace;
  runnerTex.anisotropy = maxAniso;
  disposables.push(runnerTex);

  // 3. Parquet Wood (Stage & Sala Dorada Base)
  const woodCanvas = document.createElement('canvas');
  woodCanvas.width = 256;
  woodCanvas.height = 256;
  const wctx = woodCanvas.getContext('2d')!;
  wctx.fillStyle = '#623a1e';
  wctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 16) {
    wctx.fillStyle = (y / 16) % 2 === 0 ? 'rgba(0,0,0,0.12)' : 'rgba(255,220,175,0.07)';
    wctx.fillRect(0, y, 256, 14);
    wctx.fillStyle = 'rgba(20,10,4,0.38)';
    wctx.fillRect(0, y + 14, 256, 2);
    for (let x = ((y / 16) % 2) * 32; x < 256; x += 64) {
      wctx.fillRect(x, y, 2, 14);
    }
  }
  const woodTex = new THREE.CanvasTexture(woodCanvas);
  woodTex.wrapS = THREE.RepeatWrapping;
  woodTex.wrapT = THREE.RepeatWrapping;
  woodTex.repeat.set(6, 6);
  woodTex.colorSpace = THREE.SRGBColorSpace;
  woodTex.anisotropy = maxAniso;
  disposables.push(woodTex);

  // 3b. Neoclassical Stucco & Ashlar Stone Wall Texture
  const plasterCanvas = document.createElement('canvas');
  plasterCanvas.width = 256;
  plasterCanvas.height = 256;
  const pctx = plasterCanvas.getContext('2d')!;
  pctx.fillStyle = '#c2a782';
  pctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 64) {
    pctx.fillStyle = 'rgba(72, 52, 34, 0.14)';
    pctx.fillRect(0, y, 256, 3);
    pctx.fillStyle = 'rgba(255, 240, 210, 0.12)';
    pctx.fillRect(0, y + 3, 256, 2);
    const offset = ((y / 64) % 2) * 64;
    for (let x = offset; x < 256; x += 128) {
      pctx.fillStyle = 'rgba(72, 52, 34, 0.12)';
      pctx.fillRect(x, y, 2, 64);
    }
  }
  const plasterTex = new THREE.CanvasTexture(plasterCanvas);
  plasterTex.wrapS = THREE.RepeatWrapping;
  plasterTex.wrapT = THREE.RepeatWrapping;
  plasterTex.repeat.set(5, 3);
  plasterTex.colorSpace = THREE.SRGBColorSpace;
  plasterTex.anisotropy = maxAniso;
  disposables.push(plasterTex);

  // 3c. Burgundy Baroque Damask Wallpaper
  const damaskCanvas = document.createElement('canvas');
  damaskCanvas.width = 256;
  damaskCanvas.height = 256;
  const dctx = damaskCanvas.getContext('2d')!;
  dctx.fillStyle = '#4a1018';
  dctx.fillRect(0, 0, 256, 256);
  dctx.strokeStyle = 'rgba(214, 165, 76, 0.22)';
  dctx.lineWidth = 2;
  for (let x = 32; x < 256; x += 64) {
    dctx.fillStyle = 'rgba(30, 5, 9, 0.25)';
    dctx.fillRect(x - 16, 0, 12, 256);
    for (let y = 32; y < 256; y += 64) {
      dctx.beginPath();
      dctx.ellipse(x, y, 14, 22, 0, 0, Math.PI * 2);
      dctx.stroke();
    }
  }
  const damaskTex = new THREE.CanvasTexture(damaskCanvas);
  damaskTex.wrapS = THREE.RepeatWrapping;
  damaskTex.wrapT = THREE.RepeatWrapping;
  damaskTex.repeat.set(4, 3);
  damaskTex.colorSpace = THREE.SRGBColorSpace;
  damaskTex.anisotropy = maxAniso;
  disposables.push(damaskTex);

  // 4. Painted Opera Cupola Fresco (Teatro Colón Berni/Soldi Homage)
  const frescoCanvas = document.createElement('canvas');
  frescoCanvas.width = 512;
  frescoCanvas.height = 512;
  const fctx = frescoCanvas.getContext('2d')!;
  const grad = fctx.createRadialGradient(256, 256, 18, 256, 256, 256);
  grad.addColorStop(0, '#fde68a');
  grad.addColorStop(0.22, '#c07a3e');
  grad.addColorStop(0.48, '#7c2d3e');
  grad.addColorStop(0.75, '#2b2d52');
  grad.addColorStop(1, '#1a1423');
  fctx.fillStyle = grad;
  fctx.fillRect(0, 0, 512, 512);
  fctx.strokeStyle = 'rgba(245, 198, 100, 0.65)';
  fctx.lineWidth = 4;
  for (let r = 56; r <= 236; r += 44) {
    fctx.beginPath();
    fctx.arc(256, 256, r, 0, Math.PI * 2);
    fctx.stroke();
  }
  const petalColors = ['#f59e0b', '#e11d48', '#38bdf8', '#fde047'];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    fctx.strokeStyle = 'rgba(245, 198, 100, 0.55)';
    fctx.lineWidth = 3;
    fctx.beginPath();
    fctx.moveTo(256 + Math.cos(a) * 40, 256 + Math.sin(a) * 40);
    fctx.lineTo(256 + Math.cos(a) * 242, 256 + Math.sin(a) * 242);
    fctx.stroke();

    fctx.fillStyle = petalColors[i % petalColors.length];
    fctx.globalAlpha = 0.42;
    fctx.beginPath();
    fctx.arc(256 + Math.cos(a + 0.19) * 142, 256 + Math.sin(a + 0.19) * 142, 16, 0, Math.PI * 2);
    fctx.fill();
    fctx.globalAlpha = 1;
  }
  const frescoTex = new THREE.CanvasTexture(frescoCanvas);
  frescoTex.colorSpace = THREE.SRGBColorSpace;
  frescoTex.anisotropy = maxAniso;
  disposables.push(frescoTex);

  // 5. Industrial Boiler Floor / Riveted Steel
  const steelCanvas = document.createElement('canvas');
  steelCanvas.width = 256;
  steelCanvas.height = 256;
  const sctx = steelCanvas.getContext('2d')!;
  sctx.fillStyle = '#252b33';
  sctx.fillRect(0, 0, 256, 256);
  sctx.strokeStyle = '#15191f';
  sctx.lineWidth = 3;
  for (let i = 0; i < 256; i += 64) {
    sctx.strokeRect(i, 0, 64, 256);
    sctx.strokeRect(0, i, 256, 64);
  }
  sctx.fillStyle = '#64748b';
  for (let y = 12; y < 256; y += 64) {
    for (let x = 12; x < 256; x += 64) {
      sctx.beginPath();
      sctx.arc(x, y, 2.5, 0, Math.PI * 2);
      sctx.arc(x + 40, y, 2.5, 0, Math.PI * 2);
      sctx.arc(x, y + 40, 2.5, 0, Math.PI * 2);
      sctx.arc(x + 40, y + 40, 2.5, 0, Math.PI * 2);
      sctx.fill();
    }
  }
  const steelTex = new THREE.CanvasTexture(steelCanvas);
  steelTex.wrapS = THREE.RepeatWrapping;
  steelTex.wrapT = THREE.RepeatWrapping;
  steelTex.repeat.set(4, 4);
  steelTex.colorSpace = THREE.SRGBColorSpace;
  steelTex.anisotropy = maxAniso;
  disposables.push(steelTex);

  // 6. Boiler Brass Pressure Gauge Dial
  const gaugeCanvas = document.createElement('canvas');
  gaugeCanvas.width = 128;
  gaugeCanvas.height = 128;
  const gctx = gaugeCanvas.getContext('2d')!;
  gctx.fillStyle = '#fef3c7';
  gctx.beginPath();
  gctx.arc(64, 64, 58, 0, Math.PI * 2);
  gctx.fill();
  gctx.strokeStyle = '#b45309';
  gctx.lineWidth = 8;
  gctx.stroke();
  gctx.strokeStyle = '#1e293b';
  gctx.lineWidth = 3;
  for (let a = -2.2; a <= 2.2; a += 0.44) {
    gctx.beginPath();
    gctx.moveTo(64 + Math.cos(a - Math.PI / 2) * 38, 64 + Math.sin(a - Math.PI / 2) * 38);
    gctx.lineTo(64 + Math.cos(a - Math.PI / 2) * 48, 64 + Math.sin(a - Math.PI / 2) * 48);
    gctx.stroke();
  }
  gctx.strokeStyle = '#dc2626';
  gctx.lineWidth = 4;
  gctx.beginPath();
  gctx.moveTo(64, 64);
  gctx.lineTo(94, 34);
  gctx.stroke();
  const gaugeTex = new THREE.CanvasTexture(gaugeCanvas);
  gaugeTex.colorSpace = THREE.SRGBColorSpace;
  gaugeTex.anisotropy = maxAniso;
  disposables.push(gaugeTex);

  const createPlaqueTexture = (title: string, subtitle: string, accent = '#fbbf24') => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#18110d';
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 112);
    ctx.fillStyle = accent;
    ctx.font = 'bold 34px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, 256, 48);
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText(subtitle, 256, 90);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAniso;
    disposables.push(tex);
    return tex;
  };

  return {
    marbleTex,
    carpetTex,
    runnerTex,
    woodTex,
    plasterTex,
    damaskTex,
    frescoTex,
    steelTex,
    gaugeTex,
    createPlaqueTexture,
    dispose: () => disposables.forEach((t) => t.dispose()),
  };
}

export function buildAllyChemistRig(
  customTemplate?: NpcGlbTemplateSource | null,
): AllyChemistRig {
  const disposables: { dispose: () => void }[] = [];
  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  const root = new THREE.Group();
  root.name = 'AllySofiaMendez';
  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  const flaskMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: new THREE.Color(0x10b981),
      emissiveIntensity: 1.35,
      roughness: 0.2,
      transparent: true,
      opacity: 0.9,
    }),
  );
  const flaskGeo = track(new THREE.CylinderGeometry(0.035, 0.052, 0.15, 8));
  const flaskGlow = new THREE.Mesh(flaskGeo, flaskMat);

  const ringGeo = track(new THREE.RingGeometry(0.62, 0.78, 28));
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = track(
    new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const beaconRing = new THREE.Mesh(ringGeo, ringMat);
  beaconRing.position.y = 0.04;
  root.add(beaconRing);

  if (customTemplate) {
    const model = SkeletonUtils.clone(customTemplate.scene) as THREE.Group;
    bodyPivot.add(model);
    const character = BaseCharacter.fromModelNode({
      entityId: 'npc:chispa',
      label: 'Chispa (Sofía Méndez)',
      role: 'npc',
      tag: 'ally_chispa',
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
      flaskGlow.scale.setScalar(1 / Math.max(0.01, ws.x));
      if (bones.rightPalmOffset) flaskGlow.position.copy(bones.rightPalmOffset);
      bones.rightHand.add(flaskGlow);
    } else {
      flaskGlow.position.set(-0.24, 1.05, 0.22);
      bodyPivot.add(flaskGlow);
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
      flaskGlow,
      beaconRing,
      dispose: () => {
        character.dispose();
        disposables.forEach((d) => d.dispose());
      },
    };
  }

  const skinMat = track(new THREE.MeshStandardMaterial({ color: 0xe6baa0, roughness: 0.62 }));
  const hairMat = track(new THREE.MeshStandardMaterial({ color: 0x241712, roughness: 0.72 }));
  const coatMat = track(new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.78 })); // Lab/field jacket
  const shirtMat = track(new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.68 })); // Teal tactical top
  const pantsMat = track(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.82 }));
  const bootMat = track(new THREE.MeshStandardMaterial({ color: 0x171412, roughness: 0.88 }));
  const goggleMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: new THREE.Color(0x0284c7),
      emissiveIntensity: 0.55,
      roughness: 0.2,
      metalness: 0.5,
    }),
  );

  const hips = new THREE.Group();
  hips.name = 'hips';
  hips.position.set(0, 0.84, 0);
  bodyPivot.add(hips);

  const thighGeo = track(new THREE.CylinderGeometry(0.088, 0.074, 0.4, 8));
  thighGeo.translate(0, -0.2, 0);
  const shinGeo = track(new THREE.CylinderGeometry(0.072, 0.058, 0.36, 8));
  shinGeo.translate(0, -0.18, 0);
  const bootGeo = track(new THREE.BoxGeometry(0.13, 0.11, 0.23));

  const makeLeg = (xOff: number, side: 'l' | 'r') => {
    const hip = new THREE.Group();
    hip.name = side === 'l' ? 'thigh_l' : 'thigh_r';
    hip.position.set(xOff, 0, 0);
    const thigh = new THREE.Mesh(thighGeo, pantsMat);
    thigh.castShadow = true;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.name = side === 'l' ? 'shin_l' : 'shin_r';
    knee.position.set(0, -0.4, 0);
    hip.add(knee);
    const shin = new THREE.Mesh(shinGeo, pantsMat);
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

  const coreGeo = track(new THREE.BoxGeometry(0.36, 0.56, 0.22));
  const core = new THREE.Mesh(coreGeo, shirtMat);
  core.position.y = 0.28;
  core.castShadow = true;
  torso.add(core);

  // Open field lab coat panels
  const coatBackGeo = track(new THREE.BoxGeometry(0.4, 0.68, 0.09));
  const coatBack = new THREE.Mesh(coatBackGeo, coatMat);
  coatBack.position.set(0, 0.22, -0.11);
  coatBack.castShadow = true;
  torso.add(coatBack);

  const coatSideGeo = track(new THREE.BoxGeometry(0.11, 0.64, 0.23));
  const coatL = new THREE.Mesh(coatSideGeo, coatMat);
  coatL.position.set(0.16, 0.22, 0.01);
  const coatR = new THREE.Mesh(coatSideGeo, coatMat);
  coatR.position.set(-0.16, 0.22, 0.01);
  torso.add(coatL, coatR);

  // Chemical satchel on hip
  const satchelGeo = track(new THREE.BoxGeometry(0.12, 0.22, 0.22));
  const satchel = new THREE.Mesh(satchelGeo, bootMat);
  satchel.position.set(0.24, 0.04, 0.02);
  torso.add(satchel);

  // Head + ponytail + chemistry goggles on forehead
  const head = new THREE.Group();
  head.name = 'head';
  head.position.set(0, 0.62, 0);
  torso.add(head);

  const headGeo = track(new THREE.SphereGeometry(0.155, 14, 12));
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.position.y = 0.14;
  headMesh.castShadow = true;
  head.add(headMesh);

  const hairCapGeo = track(new THREE.SphereGeometry(0.165, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62));
  const hairCap = new THREE.Mesh(hairCapGeo, hairMat);
  hairCap.position.set(0, 0.16, -0.02);
  hairCap.rotation.x = -0.25;
  head.add(hairCap);

  const ponytailGeo = track(new THREE.ConeGeometry(0.065, 0.26, 8));
  const ponytail = new THREE.Mesh(ponytailGeo, hairMat);
  ponytail.position.set(0, 0.11, -0.2);
  ponytail.rotation.x = -2.25;
  head.add(ponytail);

  const goggleGeo = track(new THREE.BoxGeometry(0.24, 0.065, 0.09));
  const goggles = new THREE.Mesh(goggleGeo, goggleMat);
  goggles.position.set(0, 0.23, 0.125);
  head.add(goggles);

  const upperArmGeo = track(new THREE.CylinderGeometry(0.056, 0.048, 0.28, 8));
  upperArmGeo.translate(0, -0.14, 0);
  const foreArmGeo = track(new THREE.CylinderGeometry(0.046, 0.038, 0.25, 8));
  foreArmGeo.translate(0, -0.125, 0);
  const handGeo = track(new THREE.SphereGeometry(0.042, 8, 8));

  const makeArm = (xOff: number, side: 'l' | 'r') => {
    const shoulder = new THREE.Group();
    shoulder.name = side === 'l' ? 'arm_l' : 'arm_r';
    shoulder.position.set(xOff, 0.52, 0);
    const upper = new THREE.Mesh(upperArmGeo, coatMat);
    upper.castShadow = true;
    shoulder.add(upper);
    const elbow = new THREE.Group();
    elbow.name = side === 'l' ? 'forearm_l' : 'forearm_r';
    elbow.position.set(0, -0.28, 0);
    shoulder.add(elbow);
    const fore = new THREE.Mesh(foreArmGeo, coatMat);
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

  const armL = makeArm(0.245, 'l');
  const armR = makeArm(-0.245, 'r');
  torso.add(armL.shoulder, armR.shoulder);

  // Glowing chemical vial in right hand
  flaskGlow.position.set(0, -0.02, 0.06);
  armR.hand.add(flaskGlow);

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
    entityId: 'npc:chispa',
    label: 'Chispa (Sofía Méndez)',
    role: 'npc',
    tag: 'ally_chispa',
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
    flaskGlow,
    beaconRing,
    dispose: () => {
      character.dispose();
      disposables.forEach((d) => d.dispose());
    },
  };
}

export function animateAllyChemist(
  rig: AllyChemistRig,
  elapsed: number,
  walking: boolean,
  waving = false,
  dt = 0.016,
) {
  const safeDt = Math.min(0.05, Math.max(0.001, dt));
  const p = elapsed * 7.2;
  const gaitVert = Math.cos(p * 2) * 0.024 - 0.008;

  if (rig.character.mixer) {
    let played = false;
    if (walking) {
      played =
        rig.character.setAction('walk', { fadeSec: 0.16, timeScale: 1.08, interruptOneShot: true }) ||
        rig.character.forceIdle(0.1);
    } else if (waving) {
      played =
        rig.character.playClip('wave', 0.18, 1, false, true) ||
        rig.character.forceIdle(0.1);
    } else {
      played = rig.character.forceIdle(0.1);
    }
    if (played) {
      rig.character.updateAnimation(safeDt);
      rig.bodyPivot.position.y = THREE.MathUtils.damp(
        rig.bodyPivot.position.y,
        walking ? gaitVert * 0.5 : 0,
        14,
        safeDt,
      );
      return;
    }
    rig.character.resetClips();
  }

  const b = rig.bones;
  const drop = rig.isCustomGlb ? b.armDropAngle : 0;
  const lam = 14;

  const dampTorso = (px: number, py: number, pz: number) => {
    if (b.chest && b.spine) {
      dampBoneRotCharSpace(b.spine, px * 0.45, py * 0.35, pz * 0.45, lam, safeDt);
      dampBoneRotCharSpace(b.chest, px * 0.55, py * 0.65, pz * 0.55, lam, safeDt);
    } else {
      dampBoneRotCharSpace(b.spine, px, py, pz, lam, safeDt);
    }
  };

  if (walking) {
    const sw = Math.sin(p) * 0.56;
    const hipYaw = sw * 0.22;
    const hipTilt = Math.cos(p) * 0.045;
    rig.bodyPivot.position.y = THREE.MathUtils.damp(rig.bodyPivot.position.y, gaitVert, 14, safeDt);

    dampBoneRotCharSpace(b.hips, 0, hipYaw, hipTilt, lam, safeDt);
    dampTorso(0.08, -hipYaw * 1.4, -hipTilt * 0.8);
    dampBoneRotCharSpace(b.leftUpLeg, sw, 0, 0.02, lam, safeDt);
    dampBoneRotCharSpace(b.rightUpLeg, -sw, 0, -0.02, lam, safeDt);
    dampBoneRotCharSpace(b.leftLeg, Math.max(0, -Math.sin(p - 0.35)) * 0.72 + 0.06, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.rightLeg, Math.max(0, Math.sin(p - 0.35)) * 0.72 + 0.06, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.leftFoot, Math.sin(p - 0.55) * 0.24, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.rightFoot, -Math.sin(p - 0.55) * 0.24, 0, 0, lam, safeDt);

    dampBoneRotCharSpace(b.leftArm, -sw * 0.65, 0, 0.06 - drop, lam, safeDt);
    dampBoneRotCharSpace(b.rightArm, sw * 0.42 - 0.34, 0, -0.06 + drop, lam, safeDt);
    dampBoneRotCharSpace(b.leftForeArm, -0.35 - Math.max(0, sw) * 0.22, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.rightForeArm, -0.75 + Math.cos(p) * 0.1, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.neck, -0.04, Math.sin(elapsed * 2.2) * 0.05, 0, lam, safeDt);
    dampBoneRotCharSpace(b.head, -0.04, Math.sin(elapsed * 2.2) * 0.08, 0, lam, safeDt);
  } else if (waving) {
    const breath = Math.sin(elapsed * 2.6) * 0.025;
    const waveOsc = Math.sin(elapsed * 7.2);
    rig.bodyPivot.position.y = THREE.MathUtils.damp(rig.bodyPivot.position.y, breath * 0.35, 12, safeDt);

    dampBoneRotCharSpace(b.hips, 0, -0.06, 0, lam, safeDt);
    dampTorso(-0.04 + breath, 0.12, -0.05);
    dampBoneRotCharSpace(b.leftUpLeg, -0.04, 0, 0.03, lam, safeDt);
    dampBoneRotCharSpace(b.rightUpLeg, 0.04, 0, -0.03, lam, safeDt);
    dampBoneRotCharSpace(b.leftLeg, 0.08, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.rightLeg, 0.08, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.leftFoot, -0.04, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.rightFoot, -0.04, 0, 0, lam, safeDt);

    dampBoneRotCharSpace(b.leftArm, -0.24, 0, 0.16 - drop, lam, safeDt);
    dampBoneRotCharSpace(b.leftForeArm, -0.5, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.rightArm, -2.18, 0, -0.34 + waveOsc * 0.24 + drop, 16, safeDt);
    dampBoneRotCharSpace(b.rightForeArm, -0.46 + waveOsc * 0.22, 0, 0, 16, safeDt);
    dampBoneRotCharSpace(b.neck, 0, Math.sin(elapsed * 1.8) * 0.06, 0, lam, safeDt);
    dampBoneRotCharSpace(b.head, -0.05, Math.sin(elapsed * 1.8) * 0.1, waveOsc * 0.04, lam, safeDt);
  } else {
    // Working gently with flasks at workbench / idle breathing
    const breath = Math.sin(elapsed * 2.1) * 0.025;
    rig.bodyPivot.position.y = THREE.MathUtils.damp(rig.bodyPivot.position.y, breath * 0.3, 12, safeDt);

    dampBoneRotCharSpace(b.hips, 0, 0.04, 0, lam, safeDt);
    dampTorso(0.06 + breath, -0.04, 0, );
    dampBoneRotCharSpace(b.leftUpLeg, -0.03, 0, 0.025, lam, safeDt);
    dampBoneRotCharSpace(b.rightUpLeg, 0.03, 0, -0.025, lam, safeDt);
    dampBoneRotCharSpace(b.leftLeg, 0.06, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.rightLeg, 0.06, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.leftFoot, -0.03, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.rightFoot, -0.03, 0, 0, lam, safeDt);

    dampBoneRotCharSpace(b.leftArm, -0.64 + Math.sin(elapsed * 2.4) * 0.08, 0.1, 0.12 - drop, lam, safeDt);
    dampBoneRotCharSpace(b.leftForeArm, -0.62, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.rightArm, -0.78 + Math.cos(elapsed * 2.8) * 0.12, -0.1, -0.14 + drop, lam, safeDt);
    dampBoneRotCharSpace(b.rightForeArm, -0.78 + Math.sin(elapsed * 3.6) * 0.14, 0, 0, lam, safeDt);
    dampBoneRotCharSpace(b.neck, 0.04, Math.sin(elapsed * 1.3) * 0.08, 0, lam, safeDt);
    dampBoneRotCharSpace(b.head, 0.05, Math.sin(elapsed * 1.3) * 0.14, 0, lam, safeDt);
  }
}

export function buildColonInteriorEnvironment(
  scene: THREE.Scene,
  maxAniso: number,
): ColonInteriorEnvironment {
  const disposables: { dispose: () => void }[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposables.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposables.push(m);
    return m;
  };

  const textures = createColonTextures(maxAniso);
  disposables.push(textures);

  const root = new THREE.Group();
  root.name = 'TeatroColonInterior';
  root.visible = false;
  scene.add(root);

  const surfaces: WalkableSurface[] = [];
  const wallBoxes: WallBoxCollider[] = [];
  const circleColliders: WorldCollider[] = [];
  const sconceLights: THREE.PointLight[] = [];

  // Shared PBR Materials (distinct roughness, metalness & procedural textures)
  const marbleFloorMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.marbleTex,
      roughness: 0.24,
      metalness: 0.1,
    }),
  );
  const marbleStepMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe7dfd3,
      roughness: 0.3,
      metalness: 0.08,
    }),
  );
  const carpetFloorMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.carpetTex,
      roughness: 0.9,
      metalness: 0.02,
    }),
  );
  const runnerMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.runnerTex,
      roughness: 0.86,
      metalness: 0.03,
    }),
  );
  const woodFloorMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.woodTex,
      roughness: 0.54,
      metalness: 0.06,
    }),
  );
  const steelFloorMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.steelTex,
      roughness: 0.44,
      metalness: 0.7,
    }),
  );
  const wallCreamMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.plasterTex,
      color: 0xd4be9e,
      roughness: 0.8,
      metalness: 0.04,
    }),
  );
  const wallDarkVelvetMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.damaskTex,
      color: 0x701a24,
      roughness: 0.84,
      metalness: 0.06,
    }),
  );
  const wallCorridorMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.plasterTex,
      color: 0x5c3e3c,
      roughness: 0.84,
      metalness: 0.08,
    }),
  );
  const boilerWallMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.steelTex,
      color: 0x45505c,
      roughness: 0.5,
      metalness: 0.65,
    }),
  );
  const goldMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xdba642,
      roughness: 0.25,
      metalness: 0.86,
    }),
  );
  const copperMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xb8582e,
      roughness: 0.32,
      metalness: 0.82,
    }),
  );
  const ironMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x1d232b,
      roughness: 0.42,
      metalness: 0.84,
    }),
  );
  const velvetSeatMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x881322,
      roughness: 0.9,
      metalness: 0.02,
    }),
  );
  const mirrorMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xbcd3e6,
      roughness: 0.12,
      metalness: 0.92,
    }),
  );
  const crystalMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfef9c3,
      emissive: new THREE.Color(0xfbbf24),
      emissiveIntensity: 0.65,
      roughness: 0.1,
      metalness: 0.25,
      transparent: true,
      opacity: 0.88,
    }),
  );
  const ceilingDomeMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.frescoTex,
      roughness: 0.72,
      metalness: 0.05,
      side: THREE.DoubleSide,
    }),
  );
  const warmGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: new THREE.Color(0xf59e0b),
      emissiveIntensity: 1.9,
      roughness: 0.2,
    }),
  );
  const furnaceGlowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xffedd5,
      emissive: new THREE.Color(0xea580c),
      emissiveIntensity: 2.35,
      roughness: 0.3,
    }),
  );
  const hazardMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.55,
      metalness: 0.35,
    }),
  );

  // Helper to create solid wall box with automatic collider registration
  const addBox = (
    x1: number,
    x2: number,
    y1: number,
    y2: number,
    z1: number,
    z2: number,
    mat: THREE.Material,
    collide = true,
    blocksSight = true,
    receiveShadow = true,
  ) => {
    const w = Math.abs(x2 - x1);
    const h = Math.abs(y2 - y1);
    const d = Math.abs(z2 - z1);
    const cx = (x1 + x2) * 0.5;
    const cy = (y1 + y2) * 0.5;
    const cz = (z1 + z2) * 0.5;
    const mesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(w, h, d)), mat);
    mesh.position.set(cx, cy, cz);
    mesh.receiveShadow = receiveShadow;
    mesh.castShadow = h > 1.2 && h < 6.0;
    root.add(mesh);
    if (collide) {
      wallBoxes.push({
        minX: Math.min(x1, x2),
        maxX: Math.max(x1, x2),
        minY: Math.min(y1, y2),
        maxY: Math.max(y1, y2),
        minZ: Math.min(z1, z2),
        maxZ: Math.max(z1, z2),
        blocksSight,
      });
    }
    return mesh;
  };

  // Helper to place ornate architectural brass plaque
  const addPlaque = (
    title: string,
    subtitle: string,
    x: number,
    y: number,
    z: number,
    rotY: number,
    width = 2.6,
    accent = '#fbbf24',
  ) => {
    const tex = textures.createPlaqueTexture(title, subtitle, accent);
    const mat = trackMat(
      new THREE.MeshStandardMaterial({
        map: tex,
        emissiveMap: tex,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.32,
        roughness: 0.35,
        metalness: 0.45,
      }),
    );
    const plaque = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(width, width * 0.25, 0.08)), mat);
    plaque.position.set(x, y, z);
    plaque.rotation.y = rotY;
    root.add(plaque);
  };

  // Helper to create composite Corinthian column (plinth + fluted shaft + gilded capital)
  const plinthGeo = trackGeo(new THREE.BoxGeometry(1.06, 0.55, 1.06));
  const shaftGeo = trackGeo(new THREE.CylinderGeometry(0.36, 0.42, 1, 14));
  const capitalGeo = trackGeo(new THREE.CylinderGeometry(0.56, 0.36, 0.48, 12));
  const addCorinthianColumn = (cx: number, yBase: number, height: number, cz: number, shaftMat: THREE.Material) => {
    const g = new THREE.Group();
    g.position.set(cx, yBase, cz);
    const plinth = new THREE.Mesh(plinthGeo, shaftMat);
    plinth.position.y = 0.275;
    const shaftH = Math.max(1, height - 1.0);
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.scale.y = shaftH;
    shaft.position.y = 0.55 + shaftH * 0.5;
    shaft.castShadow = true;
    const cap = new THREE.Mesh(capitalGeo, goldMat);
    cap.position.y = height - 0.24;
    const abacus = new THREE.Mesh(plinthGeo, goldMat);
    abacus.scale.set(1.05, 0.32, 1.05);
    abacus.position.y = height - 0.04;
    g.add(plinth, shaft, cap, abacus);
    root.add(g);
  };

  // Helper to build detailed open staircases with marble treads, brass stair rods, crimson runner,
  // spaced balusters, and an angled gilded handrail that NEVER walls in or visually blocks the stairs!
  const balusterGeo = trackGeo(new THREE.CylinderGeometry(0.045, 0.06, 0.92, 8));
  const newelGeo = trackGeo(new THREE.BoxGeometry(0.28, 1.15, 0.28));
  const globeGeo = trackGeo(new THREE.SphereGeometry(0.18, 12, 10));
  const buildDetailedStaircase = (
    x1: number,
    x2: number,
    zStart: number,
    zEnd: number,
    yStart: number,
    yEnd: number,
    steps: number,
    treadMat: THREE.Material,
    addGlobes: boolean,
  ) => {
    const cx = (x1 + x2) * 0.5;
    const w = Math.abs(x2 - x1);
    const zSpan = zEnd - zStart;
    const stepD = Math.abs(zSpan) / steps;
    const stepH = (yEnd - yStart) / steps;
    const runnerW = Math.min(w * 0.56, 2.2);

    // Individual solid steps + gilded nosing edge + crimson runner tread
    for (let i = 0; i < steps; i++) {
      const t = (i + 0.5) / steps;
      const cz = THREE.MathUtils.lerp(zStart, zEnd, t);
      const topY = yStart + (i + 1) * stepH;

      const stepMesh = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(w, stepH + 0.16, stepD + 0.05)),
        treadMat,
      );
      stepMesh.position.set(cx, topY - (stepH + 0.16) * 0.5, cz);
      stepMesh.receiveShadow = true;
      stepMesh.castShadow = true;
      root.add(stepMesh);

      // Crimson velvet runner overlay on each step
      const runnerMesh = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(runnerW, 0.035, stepD + 0.055)),
        runnerMat,
      );
      runnerMesh.position.set(cx, topY + 0.015, cz);
      runnerMesh.receiveShadow = true;
      root.add(runnerMesh);

      // Brass stair-rod on riser nose
      const dirSign = Math.sign(zSpan);
      const rod = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.022, 0.022, runnerW + 0.16, 6)),
        goldMat,
      );
      rod.rotation.z = Math.PI / 2;
      rod.position.set(cx, topY + 0.02, cz - dirSign * stepD * 0.48);
      root.add(rod);
    }

    // Open Balustrades (left & right sides): vertical balusters + sloped top rail + stepped low colliders
    const slopeLen = Math.hypot(zSpan, yEnd - yStart);
    const pitchAngle = Math.atan2(yEnd - yStart, zEnd - zStart);
    const sideOffsets = [x1 + 0.12, x2 - 0.12];
    const balCount = Math.max(6, Math.floor(steps * 0.75));

    for (const sx of sideOffsets) {
      // Sloped gilded handrail
      const rail = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.14, 0.1, slopeLen + 0.35)),
        goldMat,
      );
      rail.position.set(sx, (yStart + yEnd) * 0.5 + 0.96, (zStart + zEnd) * 0.5);
      // Orient box along Z/Y slope
      rail.rotation.x = -Math.atan2(yEnd - yStart, Math.abs(zSpan)) * Math.sign(zSpan);
      rail.castShadow = true;
      root.add(rail);

      // Sloped stone stringer beam along step edge
      const stringer = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.18, 0.24, slopeLen + 0.2)),
        treadMat,
      );
      stringer.position.set(sx, (yStart + yEnd) * 0.5 - 0.06, (zStart + zEnd) * 0.5);
      stringer.rotation.x = rail.rotation.x;
      root.add(stringer);

      // Balusters
      for (let b = 0; b <= balCount; b++) {
        const bt = b / balCount;
        const bz = THREE.MathUtils.lerp(zStart, zEnd, bt);
        const by = THREE.MathUtils.lerp(yStart, yEnd, bt);
        const bal = new THREE.Mesh(balusterGeo, goldMat);
        bal.position.set(sx, by + 0.46, bz);
        root.add(bal);
      }

      // Newel posts at foot and head of staircase (+ warm globe lamps!)
      for (const endPos of [
        { z: zStart, y: yStart },
        { z: zEnd, y: yEnd },
      ]) {
        const post = new THREE.Mesh(newelGeo, goldMat);
        post.position.set(sx, endPos.y + 0.56, endPos.z);
        root.add(post);
        if (addGlobes) {
          const globe = new THREE.Mesh(globeGeo, warmGlowMat);
          globe.position.set(sx, endPos.y + 1.24, endPos.z);
          root.add(globe);
        }
      }

      // Segmented low-profile handrail collision (1.05m above steps, never blocks sight or looks bulky)
      const colSegs = 4;
      for (let c = 0; c < colSegs; c++) {
        const t0 = c / colSegs;
        const t1 = (c + 1) / colSegs;
        const cz0 = THREE.MathUtils.lerp(zStart, zEnd, t0);
        const cz1 = THREE.MathUtils.lerp(zStart, zEnd, t1);
        const cyMin = Math.min(THREE.MathUtils.lerp(yStart, yEnd, t0), THREE.MathUtils.lerp(yStart, yEnd, t1));
        const cyMax = Math.max(THREE.MathUtils.lerp(yStart, yEnd, t0), THREE.MathUtils.lerp(yStart, yEnd, t1)) + 1.15;
        wallBoxes.push({
          minX: sx - 0.14,
          maxX: sx + 0.14,
          minZ: Math.min(cz0, cz1),
          maxZ: Math.max(cz0, cz1),
          minY: cyMin + 0.1,
          maxY: cyMax,
          blocksSight: false,
        });
      }
    }
    void pitchAngle;
  };

  // =========================================================================
  // 1. OUTER ENVELOPE, FLOORS & ROOF
  // =========================================================================
  // Grand Foyer Marble Floor (South)
  addBox(-22, 22, -0.2, 0.0, 16, 30.5, marbleFloorMat, false, false);
  // Main Hall Crimson Carpet (Platea)
  addBox(-16, 16, -0.2, 0.0, -18, 16.5, carpetFloorMat, false, false);
  // Side Corridors
  addBox(-32, -16, -0.2, 0.0, -18, 22, wallCorridorMat, false, false);
  addBox(16, 22.5, -0.2, 0.0, -28, 22, wallCorridorMat, false, false);
  // Sala Dorada (East Base) Parquet
  addBox(22, 32, -0.18, 0.02, -5.5, 16.5, woodFloorMat, false, false);
  // Boiler / Machine Room Steel Floor (Northwest)
  addBox(-32, -14, -0.18, 0.02, -34, -18, steelFloorMat, false, false);
  // North Backstage floor
  addBox(-14, 16, -0.2, 0.0, -34, -27, woodFloorMat, false, false);

  surfaces.push({
    id: 'ground_main',
    floor: 0,
    minX: -31.8,
    maxX: 31.8,
    minZ: -33.8,
    maxZ: 29.8,
    y: 0,
  });

  // Exterior Perimeter Walls (Y = 0..14.4)
  addBox(-32.6, -31.6, 0, 14.4, -34.4, 30.6, wallCreamMat); // West Outer
  addBox(31.6, 32.6, 0, 14.4, -34.4, 30.6, wallCreamMat); // East Outer
  addBox(-32.6, 32.6, 0, 14.4, -34.6, -33.6, wallCreamMat); // North Outer
  addBox(-32.6, 32.6, 0, 14.4, 30.0, 31.0, wallCreamMat); // South Outer

  // Grand Entrance Portal & Foyer Wainscoting Moldings
  addBox(-4.4, -3.5, 0, 4.6, 29.3, 30.2, goldMat, true, false);
  addBox(3.5, 4.4, 0, 4.6, 29.3, 30.2, goldMat, true, false);
  addBox(-4.6, 4.6, 4.4, 5.2, 29.2, 30.2, goldMat, false, false);
  addPlaque('TEATRO COLÓN', 'SALIDA A AV. 9 DE JULIO', 0, 4.78, 29.15, Math.PI, 3.6, '#34d399');

  // Grand Foyer Marble Runner Carpet & Velvet Stanchion Guides toward Center Aisle & Stairs
  addBox(-2.2, 2.2, 0.01, 0.035, 16.0, 29.4, runnerMat, false, false);
  for (const sx of [-2.4, 2.4]) {
    for (const sz of [27.5, 24.5, 21.5, 18.5]) {
      const post = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.05, 0.14, 0.95, 10)), goldMat);
      post.position.set(sx, 0.48, sz);
      root.add(post);
    }
  }

  // =========================================================================
  // 2. SALÓN PRINCIPAL (STAGE, AUDITORIUM SEATS, PROSCENIUM & CHANDELIER)
  // =========================================================================
  // Raised Stage Deck (Y = 1.2) + Footlights Apron
  addBox(-14.2, 14.2, 0.0, 1.2, -28.5, -16.5, woodFloorMat, false, false);
  addBox(-9.4, 9.4, 0.0, 1.2, -16.8, -16.2, goldMat, true, false);
  wallBoxes.push(
    { minX: -14.2, maxX: -12.6, minY: 0, maxY: 1.2, minZ: -16.8, maxZ: -16.2, blocksSight: false },
    { minX: 12.6, maxX: 14.2, minY: 0, maxY: 1.2, minZ: -16.8, maxZ: -16.2, blocksSight: false },
  );
  for (let fx = -7.5; fx <= 7.5; fx += 2.5) {
    const hood = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.45, 0.18, 0.28)), ironMat);
    hood.position.set(fx, 1.28, -16.65);
    const bulb = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.1, 8, 6)), warmGlowMat);
    bulb.position.set(fx, 1.29, -16.75);
    root.add(hood, bulb);
  }
  surfaces.push({
    id: 'stage_deck',
    floor: 0,
    minX: -14.2,
    maxX: 14.2,
    minZ: -28.5,
    maxZ: -16.5,
    y: 1.2,
  });

  // Left & Right Stage Stairs (z: -14.2 (Y=0) -> -16.5 (Y=1.2))
  buildDetailedStaircase(-12.6, -9.6, -14.2, -16.5, 0, 1.2, 5, marbleStepMat, false);
  buildDetailedStaircase(9.6, 12.6, -14.2, -16.5, 0, 1.2, 5, marbleStepMat, false);
  surfaces.push(
    {
      id: 'stage_ramp_l',
      floor: 0,
      minX: -12.6,
      maxX: -9.6,
      minZ: -16.6,
      maxZ: -14.1,
      y: 0,
      ramp: { axis: 'z', startVal: -14.1, endVal: -16.5, yStart: 0, yEnd: 1.2 },
    },
    {
      id: 'stage_ramp_r',
      floor: 0,
      minX: 9.6,
      maxX: 12.6,
      minZ: -16.6,
      maxZ: -14.1,
      y: 0,
      ramp: { axis: 'z', startVal: -14.1, endVal: -16.5, yStart: 0, yEnd: 1.2 },
    },
  );

  // Ornate Golden Proscenium Arch + Fluted Columns + Layered Crimson Velvet Curtains
  addBox(-15.2, -13.2, 0, 12.5, -17.4, -15.6, wallCreamMat, true, true);
  addBox(13.2, 15.2, 0, 12.5, -17.4, -15.6, wallCreamMat, true, true);
  addCorinthianColumn(-13.1, 1.2, 9.6, -15.7, goldMat);
  addCorinthianColumn(13.1, 1.2, 9.6, -15.7, goldMat);
  addBox(-15.2, 15.2, 10.6, 13.6, -17.4, -15.4, goldMat, false, false);
  // Central Golden Medallion Emblem above Proscenium
  const crest = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.15, 0.2, 10, 24)), goldMat);
  crest.position.set(0, 11.8, -15.35);
  const crestCore = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.9, 0.9, 0.25, 18)), wallDarkVelvetMat);
  crestCore.rotation.x = Math.PI / 2;
  crestCore.position.set(0, 11.8, -15.35);
  root.add(crest, crestCore);

  // Pleated Velvet Stage Curtains framing proscenium + Backstage Backdrop
  addBox(-13.2, -9.8, 1.2, 10.8, -17.0, -16.2, wallDarkVelvetMat, true, true);
  addBox(9.8, 13.2, 1.2, 10.8, -17.0, -16.2, wallDarkVelvetMat, true, true);
  for (let fx = -12.8; fx <= -10.1; fx += 0.55) {
    const foldL = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.28, 0.3, 9.5, 8)), velvetSeatMat);
    foldL.position.set(fx, 5.95, -16.15);
    root.add(foldL);
    const foldR = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.28, 0.3, 9.5, 8)), velvetSeatMat);
    foldR.position.set(-fx, 5.95, -16.15);
    root.add(foldR);
  }
  addBox(-14.2, 14.2, 1.2, 10.2, -28.5, -27.8, wallDarkVelvetMat, true, true);
  // Upper Curtain Pelmet / Valance Swags
  for (let px = -9.0; px <= 9.0; px += 3.0) {
    const swag = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.5, 0.36, 8, 16, Math.PI)), velvetSeatMat);
    swag.rotation.z = Math.PI;
    swag.position.set(px, 10.6, -16.1);
    root.add(swag);
  }

  // Concert Grand Piano on Stage (curved body + open lid + legs + keyboard + bench)
  const pianoGroup = new THREE.Group();
  pianoGroup.position.set(2.8, 1.2, -22.2);
  pianoGroup.rotation.y = -0.35;
  const pianoShape = new THREE.Shape();
  pianoShape.moveTo(-1.05, -0.75);
  pianoShape.lineTo(1.05, -0.75);
  pianoShape.bezierCurveTo(1.15, 0.0, 0.65, 0.95, -0.15, 0.95);
  pianoShape.bezierCurveTo(-0.85, 0.95, -1.05, 0.3, -1.05, -0.75);
  const pianoCaseGeo = trackGeo(
    new THREE.ExtrudeGeometry(pianoShape, { depth: 0.34, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 }),
  );
  pianoCaseGeo.rotateX(Math.PI / 2);
  const pianoCase = new THREE.Mesh(pianoCaseGeo, ironMat);
  pianoCase.position.y = 0.96;
  pianoCase.castShadow = true;
  const pianoLid = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.9, 0.06, 1.45)), ironMat);
  pianoLid.position.set(-0.08, 1.25, 0.05);
  pianoLid.rotation.z = 0.28;
  const pianoKeys = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.55, 0.08, 0.28)), marbleStepMat);
  pianoKeys.position.set(0, 0.78, -0.74);
  const legGeo = trackGeo(new THREE.CylinderGeometry(0.055, 0.04, 0.65, 8));
  for (const [lx, lz] of [
    [-0.85, -0.6],
    [0.85, -0.6],
    [0, 0.72],
  ]) {
    const pl = new THREE.Mesh(legGeo, ironMat);
    pl.position.set(lx, 0.325, lz);
    pianoGroup.add(pl);
  }
  const pianoBench = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.05, 0.46, 0.42)), woodFloorMat);
  pianoBench.position.set(0, 0.23, -1.28);
  pianoGroup.add(pianoCase, pianoLid, pianoKeys, pianoBench);
  root.add(pianoGroup);
  circleColliders.push({ x: 2.8, z: -22.2, radius: 1.32, height: 2.6, source: 'ruin' });

  // Warm Stage Theatrical Light
  const stageLight = new THREE.PointLight(0xffe0a3, 4.2, 24, 1.35);
  stageLight.position.set(0, 8.2, -21.5);
  root.add(stageLight);
  sconceLights.push(stageLight);

  // Instanced Crimson Velvet Auditorium Seats (Seat Cushion + Angled Backrest + Brass Armrest Standards)
  const seatBaseGeo = trackGeo(new THREE.BoxGeometry(0.68, 0.38, 0.58));
  const seatBackGeo = trackGeo(new THREE.BoxGeometry(0.68, 0.62, 0.14));
  const seatTrimGeo = trackGeo(new THREE.BoxGeometry(0.74, 0.08, 0.12));
  const seatSpots: { x: number; z: number }[] = [];
  const zRows = [-11.5, -8.5, -5.5, -2.5, 0.5, 3.5, 6.5, 9.5];
  for (const rz of zRows) {
    for (let sx = -9.6; sx <= -3.6; sx += 1.2) {
      seatSpots.push({ x: sx, z: rz });
    }
    for (let sx = 3.6; sx <= 9.6; sx += 1.2) {
      seatSpots.push({ x: sx, z: rz });
    }
  }
  const seatInst = new THREE.InstancedMesh(seatBaseGeo, velvetSeatMat, seatSpots.length);
  const backInst = new THREE.InstancedMesh(seatBackGeo, velvetSeatMat, seatSpots.length);
  const trimInst = new THREE.InstancedMesh(seatTrimGeo, goldMat, seatSpots.length);
  const dummy = new THREE.Object3D();
  seatSpots.forEach((sp, i) => {
    dummy.position.set(sp.x, 0.26, sp.z);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    seatInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(sp.x, 0.62, sp.z + 0.24);
    dummy.rotation.set(0.14, 0, 0);
    dummy.updateMatrix();
    backInst.setMatrixAt(i, dummy.matrix);

    dummy.position.set(sp.x, 0.94, sp.z + 0.27);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    trimInst.setMatrixAt(i, dummy.matrix);
  });
  [seatInst, backInst, trimInst].forEach((inst) => {
    inst.instanceMatrix.needsUpdate = true;
    inst.computeBoundingSphere();
    root.add(inst);
  });

  // Register clean block colliders for the two seat banks
  for (const rz of zRows) {
    wallBoxes.push({
      minX: -10.1,
      maxX: -3.2,
      minZ: rz - 0.36,
      maxZ: rz + 0.38,
      minY: 0,
      maxY: 1.0,
      blocksSight: false,
    });
    wallBoxes.push({
      minX: 3.2,
      maxX: 10.1,
      minZ: rz - 0.36,
      maxZ: rz + 0.38,
      minY: 0,
      maxY: 1.0,
      blocksSight: false,
    });
  }
  // Center Velvet Aisle Runner in Platea + Subtle Aisle Marker Lights
  addBox(-1.6, 1.6, 0.01, 0.035, -14.2, 15.8, runnerMat, false, false);
  for (const az of [-11.5, -5.5, 0.5, 6.5, 12.5]) {
    for (const ax of [-2.9, 2.9]) {
      const mLight = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.08, 6, 6)), warmGlowMat);
      mLight.position.set(ax, 0.14, az);
      root.add(mLight);
    }
  }

  // Painted Dome Ceiling & 3-Tier Imperial Chandelier (Araña del Colón)
  const ceilingSlab = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(66, 66)), wallCreamMat);
  ceilingSlab.rotation.x = Math.PI / 2;
  ceilingSlab.position.set(0, 14.35, -2);
  root.add(ceilingSlab);

  const cupolaDome = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(14.8, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.48)),
    ceilingDomeMat,
  );
  cupolaDome.scale.set(1, 0.34, 1.15);
  cupolaDome.position.set(0, 12.8, -1.5);
  root.add(cupolaDome);
  const cupolaRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(14.5, 0.35, 10, 42)), goldMat);
  cupolaRing.rotation.x = Math.PI / 2;
  cupolaRing.scale.set(1, 1.15, 1);
  cupolaRing.position.set(0, 12.9, -1.5);
  root.add(cupolaRing);

  const chandelierGroup = new THREE.Group();
  chandelierGroup.position.set(0, 11.4, -1.5);
  const chandRod = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.14, 0.14, 4.0, 10)), goldMat);
  chandRod.position.y = 2.0;
  const chandRingTop = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(3.1, 0.14, 10, 32)), goldMat);
  chandRingTop.rotation.x = Math.PI / 2;
  chandRingTop.position.y = 0.55;
  const chandRingMid = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(2.1, 0.12, 10, 26)), goldMat);
  chandRingMid.rotation.x = Math.PI / 2;
  chandRingMid.position.y = -0.35;
  const chandRingLow = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.1, 0.1, 8, 20)), goldMat);
  chandRingLow.rotation.x = Math.PI / 2;
  chandRingLow.position.y = -1.15;
  const chandFinial = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.45, 0)), crystalMat);
  chandFinial.position.y = -1.75;
  chandelierGroup.add(chandRod, chandRingTop, chandRingMid, chandRingLow, chandFinial);

  const chandBulbGeo = trackGeo(new THREE.SphereGeometry(0.14, 8, 8));
  const prismGeo = trackGeo(new THREE.OctahedronGeometry(0.11, 0));
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const bulb = new THREE.Mesh(chandBulbGeo, warmGlowMat);
    bulb.position.set(Math.cos(a) * 3.1, 0.72, Math.sin(a) * 3.1);
    const prism = new THREE.Mesh(prismGeo, crystalMat);
    prism.scale.set(0.8, 1.8, 0.8);
    prism.position.set(Math.cos(a) * 3.1, 0.24, Math.sin(a) * 3.1);
    chandelierGroup.add(bulb, prism);
  }
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.18;
    const bulb = new THREE.Mesh(chandBulbGeo, warmGlowMat);
    bulb.position.set(Math.cos(a) * 2.1, -0.18, Math.sin(a) * 2.1);
    const prism = new THREE.Mesh(prismGeo, crystalMat);
    prism.scale.set(0.7, 1.6, 0.7);
    prism.position.set(Math.cos(a) * 2.1, -0.65, Math.sin(a) * 2.1);
    chandelierGroup.add(bulb, prism);
  }
  const chandLight = new THREE.PointLight(0xffd284, 5.6, 40, 1.2);
  chandLight.position.set(0, -0.4, 0);
  chandelierGroup.add(chandLight);
  sconceLights.push(chandLight);
  root.add(chandelierGroup);

  // =========================================================================
  // 3. GRAND STAIRS (LEVEL 0 -> LEVEL 1) — OPEN CUT-OUT STAIRWELLS + BALUSTRADES
  // =========================================================================
  // Left & Right Grand Staircases: z = 26.2 (Y=0) -> z = 16.0 (Y=4.2), 16 wide marble steps + crimson runner
  buildDetailedStaircase(-13.2, -9.0, 26.2, 16.0, 0, 4.2, 16, marbleStepMat, true);
  buildDetailedStaircase(9.0, 13.2, 26.2, 16.0, 0, 4.2, 16, marbleStepMat, true);
  surfaces.push(
    {
      id: 'grand_stair_w',
      floor: 1,
      minX: -13.2,
      maxX: -9.0,
      minZ: 15.8,
      maxZ: 26.4,
      y: 0,
      ramp: { axis: 'z', startVal: 26.2, endVal: 16.0, yStart: 0, yEnd: 4.2 },
    },
    {
      id: 'grand_stair_e',
      floor: 1,
      minX: 9.0,
      maxX: 13.2,
      minZ: 15.8,
      maxZ: 26.4,
      y: 0,
      ramp: { axis: 'z', startVal: 26.2, endVal: 16.0, yStart: 0, yEnd: 4.2 },
    },
  );
  // Sloped underside blockers ONLY on Ground Level below the upper half of stairs (never overlaps step top!)
  wallBoxes.push(
    { minX: -13.2, maxX: -9.0, minZ: 16.0, maxZ: 18.6, minY: 0, maxY: 2.75, blocksSight: false },
    { minX: -13.2, maxX: -9.0, minZ: 18.6, maxZ: 21.4, minY: 0, maxY: 1.65, blocksSight: false },
    { minX: 9.0, maxX: 13.2, minZ: 16.0, maxZ: 18.6, minY: 0, maxY: 2.75, blocksSight: false },
    { minX: 9.0, maxX: 13.2, minZ: 18.6, maxZ: 21.4, minY: 0, maxY: 1.65, blocksSight: false },
  );

  // Dedicated Foyer / Grand Stairs Warm Light
  const foyerLight = new THREE.PointLight(0xffdca3, 4.4, 28, 1.3);
  foyerLight.position.set(0, 7.6, 22.8);
  root.add(foyerLight);
  sconceLights.push(foyerLight);

  // PISO 1 PALCOS & GALERÍA (Y = 4.2) — CLEANLY CUT AROUND BOTH GRAND STAIRWELLS (x ∈ [-13.4,-8.8] & [8.8,13.4])
  addBox(-21.5, 21.5, 3.85, 4.2, 14.0, 16.0, carpetFloorMat, false, false); // North Piso 1 Landing Bridge
  addBox(-21.5, -13.4, 3.85, 4.2, 16.0, 22.5, carpetFloorMat, false, false); // South-West Wing
  addBox(-8.8, 8.8, 3.85, 4.2, 16.0, 22.5, carpetFloorMat, false, false); // South Center Balcony
  addBox(13.4, 21.5, 3.85, 4.2, 16.0, 22.5, carpetFloorMat, false, false); // South-East Wing
  addBox(-21.5, -14.0, 3.85, 4.2, -16.0, 14.0, carpetFloorMat, false, false); // West Piso 1
  addBox(14.0, 21.5, 3.85, 4.2, -16.0, 14.0, carpetFloorMat, false, false); // East Piso 1
  surfaces.push(
    { id: 'piso1_south_bridge', floor: 1, minX: -21.5, maxX: 21.5, minZ: 14.0, maxZ: 16.0, y: 4.2 },
    { id: 'piso1_south_w', floor: 1, minX: -21.5, maxX: -13.4, minZ: 16.0, maxZ: 22.5, y: 4.2 },
    { id: 'piso1_south_c', floor: 1, minX: -8.8, maxX: 8.8, minZ: 16.0, maxZ: 22.5, y: 4.2 },
    { id: 'piso1_south_e', floor: 1, minX: 13.4, maxX: 21.5, minZ: 16.0, maxZ: 22.5, y: 4.2 },
    { id: 'piso1_west', floor: 1, minX: -21.5, maxX: -14.0, minZ: -16.0, maxZ: 14.0, y: 4.2 },
    { id: 'piso1_east', floor: 1, minX: 14.0, maxX: 21.5, minZ: -16.0, maxZ: 14.0, y: 4.2 },
  );

  // Ornate Piso 1 Balcony Facade (gold lower cornice + crimson velvet parapet + gilded upper rail)
  const addBalconyParapet = (x1: number, x2: number, z1: number, z2: number, floorY: number) => {
    const isHorizontal = Math.abs(x2 - x1) > Math.abs(z2 - z1);
    const pad = 0.04;
    // Lower gilded molding below slab edge
    addBox(x1, x2, floorY - 0.35, floorY + 0.05, z1, z2, goldMat, false, false);
    // Velvet parapet wall
    addBox(x1, x2, floorY + 0.05, floorY + 0.94, z1, z2, velvetSeatMat, true, false);
    // Brass handrail cap
    addBox(x1 - (isHorizontal ? 0 : pad), x2 + (isHorizontal ? 0 : pad), floorY + 0.94, floorY + 1.08, z1 - (isHorizontal ? pad : 0), z2 + (isHorizontal ? pad : 0), goldMat, false, false);
  };
  addBalconyParapet(-14.2, 14.2, 13.8, 14.2, 4.2);
  addBalconyParapet(-14.2, -13.8, -16.0, 14.0, 4.2);
  addBalconyParapet(13.8, 14.2, -16.0, 14.0, 4.2);
  // Stairwell cut-out guardrails on Piso 1 (so you see straight down to the stairs without falling off the wing!)
  addBalconyParapet(-13.55, -13.25, 16.0, 22.5, 4.2);
  addBalconyParapet(-8.95, -8.65, 16.0, 22.5, 4.2);
  addBalconyParapet(8.65, 8.95, 16.0, 22.5, 4.2);
  addBalconyParapet(13.25, 13.55, 16.0, 22.5, 4.2);

  // Decorative Gold Escutcheons along Piso 1 Balcony Facades
  const medallionGeo = trackGeo(new THREE.CylinderGeometry(0.32, 0.32, 0.08, 12));
  for (let mx = -12; mx <= 12; mx += 4) {
    const med = new THREE.Mesh(medallionGeo, goldMat);
    med.rotation.x = Math.PI / 2;
    med.position.set(mx, 4.65, 13.76);
    root.add(med);
  }
  for (let mz = -12; mz <= 10; mz += 4) {
    const medL = new THREE.Mesh(medallionGeo, goldMat);
    medL.rotation.z = Math.PI / 2;
    medL.position.set(-13.76, 4.65, mz);
    const medR = new THREE.Mesh(medallionGeo, goldMat);
    medR.rotation.z = Math.PI / 2;
    medR.position.set(13.76, 4.65, mz);
    root.add(medL, medR);
  }

  // Piso 1 North guardrails & South back wall
  addBalconyParapet(-21.5, -14.0, -16.2, -15.8, 4.2);
  addBalconyParapet(14.0, 21.5, -16.2, -15.8, 4.2);
  addBox(-21.5, 21.5, 4.2, 8.2, 22.4, 22.8, wallCreamMat, true, true);

  // Piso 1 Outer Galleries (OPEN Arched Colonnade overlooking Upper Stairwells at z ∈ [2, 14] + Wide Portal at z ∈ [14.2, 17.6]!)
  addBox(-21.9, -21.4, 4.2, 8.2, -16.0, 2.0, wallDarkVelvetMat, true, true);
  addBox(-21.9, -21.4, 4.2, 8.2, 17.6, 22.5, wallDarkVelvetMat, true, true);
  addBox(21.4, 21.9, 4.2, 8.2, -16.0, 2.0, wallDarkVelvetMat, true, true);
  addBox(21.4, 21.9, 4.2, 8.2, 17.6, 22.5, wallDarkVelvetMat, true, true);
  // Open waist-high balustrade along z:2..14 so player sees the entire staircase from Piso 1!
  addBalconyParapet(-21.8, -21.5, 2.0, 14.0, 4.2);
  addBalconyParapet(21.5, 21.8, 2.0, 14.0, 4.2);
  addBox(-21.9, -21.4, 7.6, 8.3, 14.0, 17.8, goldMat, false, false);
  addBox(21.4, 21.9, 7.6, 8.3, 14.0, 17.8, goldMat, false, false);
  addPlaque('PISO 2 · CAZUELA', 'SUBIR POR AQUÍ ↑', -21.3, 7.2, 15.9, Math.PI / 2, 2.4, '#fbbf24');
  addPlaque('PISO 2 · CAZUELA', '↑ SUBIR POR AQUÍ', 21.3, 7.2, 15.9, -Math.PI / 2, 2.4, '#fbbf24');

  // Palco Box Dividers & Curtains on Piso 1 (short velvet partitions + draped curtains)
  for (const bz of [-10, -2, 6]) {
    addBox(-16.2, -14.1, 4.2, 5.5, bz - 0.15, bz + 0.15, wallDarkVelvetMat, true, false);
    addBox(14.1, 16.2, 4.2, 5.5, bz - 0.15, bz + 0.15, wallDarkVelvetMat, true, false);
    // Framed box curtains
    addBox(-14.25, -13.95, 5.5, 8.2, bz - 0.3, bz + 0.3, velvetSeatMat, false, false);
    addBox(13.95, 14.25, 5.5, 8.2, bz - 0.3, bz + 0.3, velvetSeatMat, false, false);
  }

  // =========================================================================
  // UPPER STAIRS (PISO 1 Y=4.2 -> PISO 2 Y=8.4) — ALIGNED FLAT LANDINGS & OPEN VIEW
  // =========================================================================
  // Bottom Landings at z ∈ [14.0, 17.8] (Y=4.2) — matches Piso 1 open archway z ∈ [14.2, 17.6]!
  addBox(-25.4, -21.4, 3.85, 4.2, 14.0, 17.8, marbleFloorMat, false, false);
  addBox(21.4, 25.4, 3.85, 4.2, 14.0, 17.8, marbleFloorMat, false, false);
  // Top Landings at z ∈ [-1.6, 2.0] (Y=8.4) — matches Piso 2 open archway z ∈ [-1.4, 2.0]!
  addBox(-25.4, -21.4, 8.05, 8.4, -1.6, 2.0, marbleFloorMat, false, false);
  addBox(21.4, 25.4, 8.05, 8.4, -1.6, 2.0, marbleFloorMat, false, false);

  buildDetailedStaircase(-25.1, -21.7, 14.0, 2.0, 4.2, 8.4, 16, marbleStepMat, true);
  buildDetailedStaircase(21.7, 25.1, 14.0, 2.0, 4.2, 8.4, 16, marbleStepMat, true);

  surfaces.push(
    { id: 'stair12_bot_w', floor: 1, minX: -25.4, maxX: -21.3, minZ: 14.0, maxZ: 17.8, y: 4.2 },
    { id: 'stair12_bot_e', floor: 1, minX: 21.3, maxX: 25.4, minZ: 14.0, maxZ: 17.8, y: 4.2 },
    {
      id: 'stair12_w',
      floor: 2,
      minX: -25.3,
      maxX: -21.5,
      minZ: 2.0,
      maxZ: 14.0,
      y: 4.2,
      ramp: { axis: 'z', startVal: 14.0, endVal: 2.0, yStart: 4.2, yEnd: 8.4 },
    },
    {
      id: 'stair12_e',
      floor: 2,
      minX: 21.5,
      maxX: 25.3,
      minZ: 2.0,
      maxZ: 14.0,
      y: 4.2,
      ramp: { axis: 'z', startVal: 14.0, endVal: 2.0, yStart: 4.2, yEnd: 8.4 },
    },
    { id: 'stair12_top_w', floor: 2, minX: -25.4, maxX: -21.3, minZ: -1.6, maxZ: 2.0, y: 8.4 },
    { id: 'stair12_top_e', floor: 2, minX: 21.3, maxX: 25.4, minZ: -1.6, maxZ: 2.0, y: 8.4 },
  );

  // Stairwell outer cream stucco walls + overhead ceiling & warm sconce lights inside both upper stairwells
  addBox(-25.7, -25.35, 4.2, 13.8, -1.8, 18.0, wallCreamMat, true, true);
  addBox(25.35, 25.7, 4.2, 13.8, -1.8, 18.0, wallCreamMat, true, true);
  addBox(-25.7, -21.4, 4.2, 13.8, -1.9, -1.5, wallCreamMat, true, true);
  addBox(21.4, 25.7, 4.2, 13.8, -1.9, -1.5, wallCreamMat, true, true);
  addBox(-25.7, -21.4, 4.2, 12.6, 17.85, 18.25, wallCreamMat, true, true);
  addBox(21.4, 25.7, 4.2, 12.6, 17.85, 18.25, wallCreamMat, true, true);

  // Stairwell Ceiling Lights (make upper stairways bright & unmistakable!)
  const stairLightW = new THREE.PointLight(0xffe0a8, 3.8, 22, 1.3);
  stairLightW.position.set(-23.4, 9.6, 8.5);
  const stairLightE = new THREE.PointLight(0xffe0a8, 3.8, 22, 1.3);
  stairLightE.position.set(23.4, 9.6, 8.5);
  root.add(stairLightW, stairLightE);
  sconceLights.push(stairLightW, stairLightE);

  // PISO 2 PALCOS / CAZUELA (Y = 8.4)
  addBox(-21.5, 21.5, 8.05, 8.4, 14.2, 22.0, carpetFloorMat, false, false);
  addBox(-21.5, -14.2, 8.05, 8.4, -16.0, 14.2, carpetFloorMat, false, false);
  addBox(14.2, 21.5, 8.05, 8.4, -16.0, 14.2, carpetFloorMat, false, false);
  surfaces.push(
    { id: 'piso2_south', floor: 2, minX: -21.5, maxX: 21.5, minZ: 14.2, maxZ: 22.0, y: 8.4 },
    { id: 'piso2_west', floor: 2, minX: -21.5, maxX: -14.2, minZ: -16.0, maxZ: 14.2, y: 8.4 },
    { id: 'piso2_east', floor: 2, minX: 14.2, maxX: 21.5, minZ: -16.0, maxZ: 14.2, y: 8.4 },
  );
  // Piso 2 Railings & Back Walls (doorways at z: -1.4..2.0 connecting cleanly to stair12_top!)
  addBalconyParapet(-14.4, 14.4, 14.0, 14.4, 8.4);
  addBalconyParapet(-14.4, -14.0, -16.0, 14.2, 8.4);
  addBalconyParapet(14.0, 14.4, -16.0, 14.2, 8.4);
  addBalconyParapet(-21.5, -14.0, -16.2, -15.8, 8.4);
  addBalconyParapet(14.0, 21.5, -16.2, -15.8, 8.4);
  addBox(-21.5, 21.5, 8.4, 13.8, 21.9, 22.3, wallCreamMat, true, true);
  addBox(-21.9, -21.4, 8.4, 13.8, -16.0, -1.4, wallDarkVelvetMat, true, true);
  addBox(-21.9, -21.4, 8.4, 13.8, 2.0, 22.0, wallDarkVelvetMat, true, true);
  addBox(21.4, 21.9, 8.4, 13.8, -16.0, -1.4, wallDarkVelvetMat, true, true);
  addBox(21.4, 21.9, 8.4, 13.8, 2.0, 22.0, wallDarkVelvetMat, true, true);
  addBalconyParapet(-21.8, -21.5, 2.0, 14.0, 8.4);
  addBalconyParapet(21.5, 21.8, 2.0, 14.0, 8.4);
  addPlaque('PISO 1 · PALCOS', 'ESCALERA ABAJO ↓', -21.3, 11.4, 0.3, Math.PI / 2, 2.4, '#fbbf24');
  addPlaque('PISO 1 · PALCOS', '↓ ESCALERA ABAJO', 21.3, 11.4, 0.3, -Math.PI / 2, 2.4, '#fbbf24');

  // =========================================================================
  // 4. LEVEL 0 ROOM PARTITIONS, DARK CORRIDORS, SALA DORADA & BOILER ROOM
  // =========================================================================
  // West Partition separating Platea from Pasillo Oeste (x = -15.6, doorways at z:4..8 & z:-12..-8)
  addBox(-15.9, -15.3, 0, 3.9, 8.5, 16.0, wallDarkVelvetMat);
  addBox(-15.9, -15.3, 0, 3.9, -7.5, 4.0, wallDarkVelvetMat);
  addBox(-15.9, -15.3, 0, 3.9, -17.5, -12.0, wallDarkVelvetMat);
  // East Partition separating Platea from Pasillo Este (x = 15.6, doorways at z:4..8 & z:-12..-8)
  addBox(15.3, 15.9, 0, 3.9, 8.5, 16.0, wallDarkVelvetMat);
  addBox(15.3, 15.9, 0, 3.9, -7.5, 4.0, wallDarkVelvetMat);
  addBox(15.3, 15.9, 0, 3.9, -17.5, -12.0, wallDarkVelvetMat);

  // SALA DORADA (BASE PERMANENTE) — East side room: x ∈ [22.2, 31.6], z ∈ [-5.0, 16.0]
  addBox(21.9, 22.5, 0, 4.2, -5.2, 4.2, wallCreamMat);
  addBox(21.9, 22.5, 0, 4.2, 8.8, 16.2, wallCreamMat);
  addBox(21.9, 22.5, 3.2, 4.2, 4.2, 8.8, goldMat, false, false);
  addBox(22.2, 31.8, 0, 4.2, -5.3, -4.8, wallCreamMat);
  addBox(22.2, 31.8, 0, 4.2, 15.8, 16.3, wallCreamMat);
  addBox(22.0, 31.8, 4.0, 4.3, -5.2, 16.2, wallCreamMat, false, false);
  addPlaque('SALA DORADA', 'REFUGIO & TALLER QUÍMICO', 21.85, 3.65, 6.5, -Math.PI / 2, 3.0, '#34d399');

  // Arched Gilded Mirrors & Wainscot Moldings inside Sala Dorada
  for (const mz of [-1.2, 12.2]) {
    const mirrorFrame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.14, 2.4, 1.8)), goldMat);
    mirrorFrame.position.set(31.5, 2.0, mz);
    const mirrorGlass = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.16, 2.1, 1.5)), mirrorMat);
    mirrorGlass.position.set(31.46, 2.0, mz);
    root.add(mirrorFrame, mirrorGlass);
  }
  const sofaBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.1, 0.52, 2.8)), velvetSeatMat);
  sofaBase.position.set(24.2, 0.26, 0.2);
  const sofaBack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 0.95, 2.8)), goldMat);
  sofaBack.position.set(23.72, 0.48, 0.2);
  root.add(sofaBase, sofaBack);
  wallBoxes.push({ minX: 23.5, maxX: 24.8, minZ: -1.3, maxZ: 1.7, minY: 0, maxY: 1.0, blocksSight: false });

  // Chemistry & Explosives Workbench inside Sala Dorada
  const benchGroup = new THREE.Group();
  benchGroup.position.set(COLON_WORKBENCH_POS.x, 0, COLON_WORKBENCH_POS.z);
  const benchTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.8, 0.14, 1.25)), woodFloorMat);
  benchTop.position.y = 0.92;
  benchTop.castShadow = true;
  const benchBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.5, 0.86, 1.05)), ironMat);
  benchBase.position.y = 0.43;
  // Lab condenser stand + reagent flasks + explosive crate + schematic board
  const standPole = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.025, 0.025, 0.72, 8)), goldMat);
  standPole.position.set(-0.85, 1.32, -0.2);
  const flask1 = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.06, 0.14, 0.34, 10)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.78, transparent: true, opacity: 0.86 })),
  );
  flask1.position.set(-0.62, 1.15, 0.12);
  const flask2 = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.05, 0.12, 0.28, 10)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 0.88, transparent: true, opacity: 0.9 })),
  );
  flask2.position.set(-0.22, 1.12, -0.15);
  const flask3 = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.04, 0.09, 0.24, 10)),
    trackMat(new THREE.MeshStandardMaterial({ color: 0x34d399, emissive: 0x10b981, emissiveIntensity: 0.95, transparent: true, opacity: 0.9 })),
  );
  flask3.position.set(0.15, 1.1, 0.18);
  const crateAmmo = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.62, 0.34, 0.44)), copperMat);
  crateAmmo.position.set(0.8, 1.16, 0);
  const lampHead = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.18, 0.22, 10)), goldMat);
  lampHead.position.set(1.05, 1.48, -0.35);
  lampHead.rotation.z = 0.4;
  benchGroup.add(benchTop, benchBase, standPole, flask1, flask2, flask3, crateAmmo, lampHead);

  const wbRingGeo = trackGeo(new THREE.RingGeometry(1.5, 1.85, 32));
  wbRingGeo.rotateX(-Math.PI / 2);
  const wbRingMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const workbenchRing = new THREE.Mesh(wbRingGeo, wbRingMat);
  workbenchRing.position.set(0, 0.05, 0.4);
  workbenchRing.visible = false;
  benchGroup.add(workbenchRing);
  root.add(benchGroup);
  wallBoxes.push({
    minX: COLON_WORKBENCH_POS.x - 1.4,
    maxX: COLON_WORKBENCH_POS.x + 1.4,
    minZ: COLON_WORKBENCH_POS.z - 0.68,
    maxZ: COLON_WORKBENCH_POS.z + 0.68,
    minY: 0,
    maxY: 1.4,
    blocksSight: false,
  });

  // Warm light inside Sala Dorada
  const baseLight = new THREE.PointLight(0xffd28a, 4.8, 18, 1.3);
  baseLight.position.set(27.0, 3.6, 5.5);
  root.add(baseLight);
  sconceLights.push(baseLight);

  // BAHÍA DE VEHÍCULOS / TALLER MECÁNICO DE MATEO (North-East Service Bay: x ∈ [22.2, 31.5], z ∈ [-26.5, -6.5])
  addBox(22.0, 31.6, -0.16, 0.02, -26.5, -6.5, steelFloorMat, false, false);
  addBox(22.0, 31.6, 4.4, 4.7, -26.5, -6.5, boilerWallMat, false, false);
  addBox(21.9, 22.4, 0, 4.5, -26.5, -21.5, boilerWallMat);
  addBox(21.9, 22.4, 0, 4.5, -13.5, -6.2, boilerWallMat);
  addBox(21.9, 22.4, 3.5, 4.5, -21.5, -13.5, hazardMat, false, false);
  addBox(22.0, 31.8, 0, 4.5, -26.8, -26.2, boilerWallMat);
  addBox(22.0, 31.8, 0, 4.5, -6.8, -6.2, boilerWallMat);
  addBox(22.4, 31.2, 0.02, 0.04, -21.2, -20.8, hazardMat, false, false);
  addBox(22.4, 31.2, 0.02, 0.04, -12.8, -12.4, hazardMat, false, false);
  addPlaque('TALLER MECÁNICO', 'BAHÍA DE VEHÍCULOS · MATEO', 21.85, 3.9, -17.5, -Math.PI / 2, 3.2, '#f59e0b');

  // Tool cart + spare tires stack in NE bay corner
  const toolCartMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4, metalness: 0.55 }));
  const toolCart = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.1, 0.92, 2.2)), toolCartMat);
  toolCart.position.set(30.6, 0.46, -10.5);
  toolCart.castShadow = true;
  root.add(toolCart);
  wallBoxes.push({ minX: 29.9, maxX: 31.3, minZ: -11.7, maxZ: -9.3, minY: 0, maxY: 1.2, blocksSight: false });

  // Armored Pickup Truck Rig ("La Porteña") + Mechanic Interaction Ring
  const vehicleRig = buildGarageVehicleRig();
  vehicleRig.root.position.set(COLON_VEHICLE_BAY_POS.x, 0, COLON_VEHICLE_BAY_POS.z);
  vehicleRig.root.rotation.y = -Math.PI * 0.5;
  vehicleRig.root.visible = false;
  root.add(vehicleRig.root);
  wallBoxes.push({
    minX: COLON_VEHICLE_BAY_POS.x - 2.4,
    maxX: COLON_VEHICLE_BAY_POS.x + 2.4,
    minZ: COLON_VEHICLE_BAY_POS.z - 1.25,
    maxZ: COLON_VEHICLE_BAY_POS.z + 1.25,
    minY: 0,
    maxY: 2.1,
    blocksSight: false,
  });

  const vbRingGeo = trackGeo(new THREE.RingGeometry(1.75, 2.15, 32));
  vbRingGeo.rotateX(-Math.PI / 2);
  const vbRingMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const vehicleBayRing = new THREE.Mesh(vbRingGeo, vbRingMat);
  vehicleBayRing.position.set(COLON_MECHANIC_BASE_POS.x, 0.05, COLON_VEHICLE_BAY_POS.z);
  vehicleBayRing.visible = false;
  root.add(vehicleBayRing);

  let mechanicRig = buildMechanicNpcRig();
  mechanicRig.root.position.set(COLON_MECHANIC_BASE_POS.x, 0, COLON_MECHANIC_BASE_POS.z);
  mechanicRig.root.rotation.y = Math.PI * 0.65;
  mechanicRig.root.visible = false;
  mechanicRig.beaconRing.visible = false;
  root.add(mechanicRig.root);

  const garageLight = new THREE.PointLight(0xe0f2fe, 4.2, 20, 1.3);
  garageLight.position.set(26.8, 3.9, -16.8);
  root.add(garageLight);
  sconceLights.push(garageLight);

  // CAMERINOS OESTE (West Dressing Room: x ∈ [-31.6, -22.2], z ∈ [-6.0, 14.0])
  addBox(-22.5, -21.9, 0, 4.2, -6.2, 1.2, wallCorridorMat);
  addBox(-22.5, -21.9, 0, 4.2, 5.8, 14.2, wallCorridorMat);
  addBox(-31.8, -22.0, 0, 4.2, -6.3, -5.8, wallCorridorMat);
  addBox(-31.8, -22.0, 0, 4.2, 13.8, 14.3, wallCorridorMat);
  addBox(-31.8, -22.0, 4.0, 4.3, -6.0, 14.0, wallCorridorMat, false, false);
  // Vanity tables & illuminated makeup mirrors inside Camerinos Oeste
  for (const vz of [-2.2, 9.8]) {
    const table = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.0, 0.78, 2.2)), woodFloorMat);
    table.position.set(-30.9, 0.39, vz);
    const vMirror = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.12, 1.25, 1.8)), mirrorMat);
    vMirror.position.set(-31.35, 1.45, vz);
    for (let bz = -0.75; bz <= 0.75; bz += 0.5) {
      const mb = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.06, 6, 6)), warmGlowMat);
      mb.position.set(-31.26, 2.02, vz + bz);
      root.add(mb);
    }
    root.add(table, vMirror);
  }

  // =========================================================================
  // 5. SALA DE MÁQUINAS / CALDERAS (NORTHWEST: x ∈ [-31.6, -15.4], z ∈ [-33.6, -18.0])
  // =========================================================================
  addBox(-31.8, -21.0, 0, 5.6, -18.3, -17.7, boilerWallMat);
  addBox(-16.8, -15.3, 0, 5.6, -18.3, -17.7, boilerWallMat);
  addBox(-21.0, -16.8, 3.6, 5.6, -18.3, -17.7, boilerWallMat, false, false);
  addPlaque('SALA DE MÁQUINAS', 'CALDERAS & MANTENIMIENTO', -18.9, 3.3, -17.62, 0, 2.8, '#fb923c');
  addBox(-15.7, -15.1, 0, 5.6, -21.8, -18.0, boilerWallMat);
  addBox(-15.7, -15.1, 0, 5.6, -33.8, -26.2, boilerWallMat);
  addBox(-31.8, -15.2, 5.5, 5.8, -33.8, -17.8, boilerWallMat, false, false);

  // Giant Industrial Boilers (Calderas #1 & #2) + Pressure Gauges + Red Valve Wheels + Steam Pipes
  const gaugeMat = trackMat(new THREE.MeshBasicMaterial({ map: textures.gaugeTex }));
  const valveMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4, metalness: 0.55 }));
  const buildBoiler = (bx: number, bz: number) => {
    const bg = new THREE.Group();
    bg.position.set(bx, 0, bz);
    const drum = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.45, 1.45, 3.5, 18)), ironMat);
    drum.rotation.z = Math.PI / 2;
    drum.position.y = 1.95;
    drum.castShadow = true;
    const capL = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(1.45, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5)), ironMat);
    capL.rotation.z = Math.PI / 2;
    capL.position.set(-1.75, 1.95, 0);
    const capR = capL.clone();
    capR.rotation.z = -Math.PI / 2;
    capR.position.set(1.75, 1.95, 0);
    const copperBand1 = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(1.48, 0.08, 8, 24)), copperMat);
    copperBand1.rotation.y = Math.PI / 2;
    copperBand1.position.set(-0.9, 1.95, 0);
    const copperBand2 = copperBand1.clone();
    copperBand2.position.set(0.9, 1.95, 0);
    const stand1 = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.45, 1.2, 2.2)), boilerWallMat);
    stand1.position.set(-1.1, 0.6, 0);
    const stand2 = stand1.clone();
    stand2.position.set(1.1, 0.6, 0);
    const firebox = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.88, 0.76, 0.25)), furnaceGlowMat);
    firebox.position.set(0, 1.15, 1.38);
    // Brass pressure dial + red valve handwheel
    const gauge = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 16)), gaugeMat);
    gauge.rotation.x = Math.PI / 2;
    gauge.position.set(-1.05, 2.45, 1.42);
    const valveWheel = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.24, 0.045, 8, 16)), valveMat);
    valveWheel.position.set(1.0, 2.15, 1.46);
    const chimney = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.32, 0.36, 2.6, 10)), copperMat);
    chimney.position.set(0.6, 4.2, 0);
    bg.add(drum, capL, capR, copperBand1, copperBand2, stand1, stand2, firebox, gauge, valveWheel, chimney);
    root.add(bg);
    circleColliders.push({ x: bx, z: bz, radius: 1.95, height: 4.5, source: 'ruin' });
  };
  buildBoiler(-27.2, -22.2);
  buildBoiler(-21.2, -30.2);

  // Overhead Steam Pipes running across Boiler Room
  const pipeLong = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.2, 0.2, 15.5, 10)), copperMat);
  pipeLong.rotation.z = Math.PI / 2;
  pipeLong.position.set(-23.5, 4.6, -24.5);
  const pipeCross = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.18, 0.18, 14.0, 10)), ironMat);
  pipeCross.rotation.x = Math.PI / 2;
  pipeCross.position.set(-24.8, 4.35, -25.8);
  root.add(pipeLong, pipeCross);

  const steamJets = [
    { x: -25.5, y: 2.3, z: -22.2, dx: 0.4, dy: 1.4, dz: 0.2 },
    { x: -20.5, y: 2.5, z: -28.6, dx: -0.3, dy: 1.5, dz: 0.3 },
    { x: -24.8, y: 4.2, z: -25.8, dx: 0.2, dy: -0.6, dz: 0.5 },
  ];

  // Sofía's Barricaded Maintenance Door inside Boiler Room
  addBox(-31.6, -28.9, 0, 4.2, -31.0, -28.0, boilerWallMat);
  addBox(-29.2, -26.5, 0.02, 0.04, -28.2, -27.7, hazardMat, false, false);
  const boilerDoorPivot = new THREE.Group();
  boilerDoorPivot.position.set(-28.8, 0, -28.2);
  const doorSlab = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.9, 2.5, 0.18)), ironMat);
  doorSlab.position.set(0.95, 1.25, 0);
  const doorBar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.6, 0.14, 0.26)), copperMat);
  doorBar.position.set(0.95, 1.35, 0.08);
  boilerDoorPivot.add(doorSlab, doorBar);
  root.add(boilerDoorPivot);

  const boilerLight = new THREE.PointLight(0xff7838, 4.6, 19, 1.35);
  boilerLight.position.set(-24.5, 3.8, -25.5);
  root.add(boilerLight);
  sconceLights.push(boilerLight);

  // =========================================================================
  // 6. CORRIDOR WALL SCONCES & ARCHITECTURAL CORINTHIAN COLUMNS
  // =========================================================================
  const colPositions: [number, number][] = [
    [-14.2, 14.2],
    [14.2, 14.2],
    [-14.2, 4.0],
    [14.2, 4.0],
    [-14.2, -6.0],
    [14.2, -6.0],
    [-14.2, -14.8],
    [14.2, -14.8],
  ];
  colPositions.forEach(([cx, cz]) => {
    addCorinthianColumn(cx, 0, 8.4, cz, goldMat);
  });

  // Grand Foyer Flanking Corinthian Columns
  addCorinthianColumn(-5.6, 0, 4.2, 23.5, wallCreamMat);
  addCorinthianColumn(5.6, 0, 4.2, 23.5, wallCreamMat);

  // Dim Sconce Lights in dark corridors, Piso 1/2 balconies & foyer
  const sconceCoords: [number, number, number, number][] = [
    [0, 3.8, 24.5, 0xffd699],
    [-18.8, 3.2, 6.0, 0xfb923c],
    [-18.8, 3.2, -9.0, 0xef4444], // index 2 -> flickering emergency red tint
    [18.8, 3.2, 6.0, 0xfb923c],
    [-17.8, 6.8, 0.0, 0xfcd34d],
    [17.8, 6.8, 0.0, 0xfcd34d],
    [0, 11.2, 18.0, 0xfde68a],
  ];
  const sconceBulbGeo = trackGeo(new THREE.SphereGeometry(0.14, 8, 8));
  let emergencySconceLight: THREE.PointLight | null = null;
  sconceCoords.forEach(([lx, ly, lz, col]) => {
    const bulb = new THREE.Mesh(sconceBulbGeo, warmGlowMat);
    bulb.position.set(lx, ly, lz);
    root.add(bulb);
    const pl = new THREE.PointLight(col, 2.7, 17, 1.45);
    pl.position.set(lx, ly - 0.15, lz);
    root.add(pl);
    sconceLights.push(pl);
    if (col === 0xef4444) emergencySconceLight = pl;
  });

  // Exit Portal Beacon at Foyer Main Doors (x=0, z=28.8)
  const exitRingGeo = trackGeo(new THREE.RingGeometry(1.2, 1.55, 32));
  exitRingGeo.rotateX(-Math.PI / 2);
  const exitRingMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const exitBeaconRing = new THREE.Mesh(exitRingGeo, exitRingMat);
  exitBeaconRing.position.set(COLON_INTERIOR_EXIT_POS.x, 0.04, COLON_INTERIOR_EXIT_POS.z);
  exitBeaconRing.visible = false;
  root.add(exitBeaconRing);

  const exitBeamGeo = trackGeo(new THREE.CylinderGeometry(0.95, 1.35, 3.8, 20, 1, true));
  const exitBeamMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const exitBeaconBeam = new THREE.Mesh(exitBeamGeo, exitBeamMat);
  exitBeaconBeam.position.set(COLON_INTERIOR_EXIT_POS.x, 1.9, COLON_INTERIOR_EXIT_POS.z);
  exitBeaconBeam.visible = false;
  root.add(exitBeaconBeam);

  // =========================================================================
  // 7. ALLY NPC (SOFÍA MÉNDEZ)
  // =========================================================================
  let allyRig = buildAllyChemistRig();
  allyRig.root.position.set(COLON_BOILER_DOOR_POS.x, 0, COLON_BOILER_DOOR_POS.z);
  allyRig.root.visible = false;
  root.add(allyRig.root);

  // =========================================================================
  // 8. ZOMBIE SPAWN ROSTER (12 ZOMBIES ACROSS ALL LEVELS & ROOMS)
  // =========================================================================
  const zombieSpawns: ColonSpawnPoint[] = [
    // Salón Principal / Platea & Escenario (4)
    {
      kind: 'stalker',
      x: -1.5,
      y: 0,
      z: 4.5,
      floor: 0,
      zoneLabel: 'Salón Principal',
      carriedWeapon: 'pistol',
      enemyRole: 'police',
      carriedGear: { revolver: true, baton: true },
    },
    { kind: 'runner', x: 1.8, y: 0, z: -4.5, floor: 0, zoneLabel: 'Salón Principal' },
    { kind: 'spitter', x: -11.5, y: 0, z: -11.5, floor: 0, zoneLabel: 'Pasillo Platea' },
    { kind: 'biter', x: -2.0, y: 1.2, z: -21.5, floor: 0, zoneLabel: 'Escenario' },
    // Pasillos Oscuros, Camerinos & Sala de Máquinas (3)
    { kind: 'stalker', x: -18.8, y: 0, z: -2.0, floor: 0, zoneLabel: 'Pasillo Oscuro Oeste' },
    {
      kind: 'stalker',
      x: 18.8,
      y: 0,
      z: 2.0,
      floor: 0,
      zoneLabel: 'Pasillo Este',
      carriedWeapon: 'rifle',
      enemyRole: 'gendarme',
      carriedGear: { rifle: true, rifleMags: 1 },
    },
    { kind: 'spitter', x: -23.5, y: 0, z: -23.5, floor: 0, zoneLabel: 'Sala de Máquinas' },
    // Primer Piso de Palcos (3)
    {
      kind: 'stalker',
      x: -17.5,
      y: 4.2,
      z: 3.0,
      floor: 1,
      zoneLabel: 'Palcos Piso 1 Oeste',
      enemyRole: 'police',
      carriedGear: { baton: true, pistolAmmo: 1 },
    },
    { kind: 'spitter', x: 17.5, y: 4.2, z: -4.5, floor: 1, zoneLabel: 'Palcos Piso 1 Este' },
    { kind: 'runner', x: 0.0, y: 4.2, z: 17.8, floor: 1, zoneLabel: 'Galería Piso 1 Sur' },
    // Segundo Piso de Palcos (2)
    {
      kind: 'stalker',
      x: -17.5,
      y: 8.4,
      z: -4.0,
      floor: 2,
      zoneLabel: 'Palcos Piso 2 Oeste',
      enemyRole: 'gendarme',
      carriedGear: { rifleMags: 2 },
    },
    {
      kind: 'brute',
      x: 17.5,
      y: 8.4,
      z: 5.5,
      floor: 2,
      zoneLabel: 'Palcos Piso 2 Este',
      enemyRole: 'gendarme_heavy',
      carriedGear: { helmet: true, vest: true, rifleMags: 1 },
    },
  ];

  // Supplies & Chemical Provisions scattered inside Teatro Colón
  const lootSpots: ColonProvisionSpot[] = [
    { kind: 'stick', x: -3.2, y: 0, z: 22.8 }, // Gran Foyer Oeste
    { kind: 'stick', x: 20.2, y: 0, z: 15.5 }, // Hall Este
    { kind: 'bow', x: -18.2, y: 4.2, z: 14.0 }, // Palcos Piso 1 Oeste
    { kind: 'arrows', x: -2.5, y: 0, z: 14.5 }, // Pasillo Platea
    { kind: 'arrows', x: 18.2, y: 4.2, z: 12.0 }, // Palcos Piso 1 Este
    { kind: 'chemicals', x: -26.5, y: 0, z: 4.0 }, // Camerinos
    { kind: 'chemicals', x: -24.5, y: 0, z: -27.2 }, // Sala de Máquinas
    { kind: 'scrap', x: -19.0, y: 0, z: -20.5 }, // Sala de Máquinas
    { kind: 'powder', x: 5.5, y: 1.2, z: -24.5 }, // Escenario
    { kind: 'fal_ammo', x: 0.0, y: 0, z: 12.5 }, // Pasillo Platea
    { kind: 'pistol_ammo', x: 18.6, y: 0, z: 11.5 }, // Pasillo Este
    { kind: 'bandage', x: -18.5, y: 4.2, z: 10.5 }, // Piso 1 Oeste
    { kind: 'chemicals', x: 17.8, y: 4.2, z: -10.5 }, // Piso 1 Este
    { kind: 'scrap', x: -17.5, y: 8.4, z: -11.5 }, // Piso 2 Oeste
    { kind: 'powder', x: 17.5, y: 8.4, z: -9.0 }, // Piso 2 Este
    { kind: 'food', x: 25.2, y: 0, z: 11.5 }, // Sala Dorada
    { kind: 'molotov', x: -6.0, y: 4.2, z: 18.5 }, // Galería Piso 1
    // Objetos arrojadizos de distracción repartidos por todo el Teatro Colón
    { kind: 'bottle', x: -5.5, y: 0, z: 22.0 }, // Gran Foyer Oeste
    { kind: 'brick', x: 6.2, y: 0, z: 20.5 }, // Gran Foyer Este
    { kind: 'can', x: -8.5, y: 0, z: 7.5 }, // Platea Oeste
    { kind: 'bottle', x: 8.8, y: 0, z: -3.5 }, // Platea Este
    { kind: 'brick', x: -18.5, y: 0, z: -10.5 }, // Pasillo Oscuro Oeste
    { kind: 'can', x: -22.0, y: 0, z: -19.5 }, // Antesala de Calderas
    { kind: 'bottle', x: 23.0, y: 0, z: 1.5 }, // Sala Dorada
    { kind: 'can', x: -17.5, y: 4.2, z: 14.5 }, // Palcos Piso 1 Oeste
    { kind: 'bottle', x: 17.5, y: 4.2, z: 8.5 }, // Palcos Piso 1 Este
    { kind: 'brick', x: 17.5, y: 8.4, z: 13.0 }, // Palcos Piso 2 Este
    { kind: 'can', x: -17.5, y: 8.4, z: 10.5 }, // Palcos Piso 2 Oeste
  ];

  // =========================================================================
  // 9. MULTI-FLOOR HEIGHT & COLLISION HELPERS
  // =========================================================================
  const resolveFloorHeight = (x: number, z: number, refY: number): number => {
    let bestY = 0;
    const maxStepUp = refY + 0.65;
    for (let i = 0; i < surfaces.length; i++) {
      const s = surfaces[i];
      if (x < s.minX || x > s.maxX || z < s.minZ || z > s.maxZ) continue;
      let sy = s.y;
      if (s.ramp) {
        const coord = s.ramp.axis === 'z' ? z : x;
        const t = THREE.MathUtils.clamp(
          (coord - s.ramp.startVal) / (s.ramp.endVal - s.ramp.startVal),
          0,
          1,
        );
        sy = THREE.MathUtils.lerp(s.ramp.yStart, s.ramp.yEnd, t);
      }
      if (sy <= maxStepUp && sy > bestY) {
        bestY = sy;
      }
    }
    return bestY;
  };

  const getFloorIndex = (y: number): 0 | 1 | 2 => {
    if (y >= 6.8) return 2;
    if (y >= 2.8) return 1;
    return 0;
  };

  const resolveCircleAndWalls = (
    x: number,
    y: number,
    z: number,
    radius: number,
  ): { x: number; z: number } => {
    let rx = THREE.MathUtils.clamp(x, -31.2, 31.2);
    let rz = THREE.MathUtils.clamp(z, -33.2, 29.6);

    const entMinY = y + 0.12;
    const entMaxY = y + 1.65;

    for (let pass = 0; pass < 3; pass++) {
      for (let i = 0; i < wallBoxes.length; i++) {
        const b = wallBoxes[i];
        if (b.maxY < entMinY || b.minY > entMaxY) continue;
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
            // Inside box fallback: push out along closest axis
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

      for (let i = 0; i < circleColliders.length; i++) {
        const c = circleColliders[i];
        if (c.height < entMinY) continue;
        const dx = rx - c.x;
        const dz = rz - c.z;
        const minD = c.radius + radius;
        const dSq = dx * dx + dz * dz;
        if (dSq < minD * minD && dSq > 0.00001) {
          const d = Math.sqrt(dSq);
          rx = c.x + (dx / d) * minD;
          rz = c.z + (dz / d) * minD;
        }
      }
    }

    return { x: rx, z: rz };
  };

  const segmentIntersectsBox2D = (
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    b: WallBoxCollider,
  ): boolean => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    let t0 = 0;
    let t1 = 1;
    const checks: [number, number][] = [
      [-dx, x1 - b.minX],
      [dx, b.maxX - x1],
      [-dz, z1 - b.minZ],
      [dz, b.maxZ - z1],
    ];
    for (let i = 0; i < 4; i++) {
      const p = checks[i][0];
      const q = checks[i][1];
      if (Math.abs(p) < 1e-6) {
        if (q < 0) return false;
      } else {
        const r = q / p;
        if (p < 0) {
          if (r > t1) return false;
          if (r > t0) t0 = r;
        } else {
          if (r < t0) return false;
          if (r < t1) t1 = r;
        }
      }
    }
    return t0 <= t1;
  };

  const hasLineOfSight = (
    x1: number,
    y1: number,
    z1: number,
    x2: number,
    y2: number,
    z2: number,
  ): boolean => {
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    for (let i = 0; i < wallBoxes.length; i++) {
      const b = wallBoxes[i];
      if (!b.blocksSight) continue;
      if (b.maxY < minY || b.minY > maxY) continue;
      if (segmentIntersectsBox2D(x1, z1, x2, z2, b)) return false;
    }
    return true;
  };

  const clampCameraSegment = (
    targetX: number,
    targetY: number,
    targetZ: number,
    camX: number,
    camY: number,
    camZ: number,
  ): { x: number; y: number; z: number } => {
    let bestT = 1.0;
    const dx = camX - targetX;
    const dy = camY - targetY;
    const dz = camZ - targetZ;
    const minY = Math.min(targetY, camY);
    const maxY = Math.max(targetY, camY);

    for (let i = 0; i < wallBoxes.length; i++) {
      const b = wallBoxes[i];
      if (!b.blocksSight) continue;
      if (b.maxY < minY - 0.25 || b.minY > maxY + 0.25) continue;
      // Expand box slightly so camera keeps clear of wall surface
      const pad = 0.28;
      let tmin = 0;
      let tmax = 1;
      const axes: [number, number, number, number][] = [
        [dx, targetX, b.minX - pad, b.maxX + pad],
        [dy, targetY, b.minY - pad, b.maxY + pad],
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
        bestT = Math.max(0.22, tmin - 0.04);
      }
    }

    const outX = THREE.MathUtils.clamp(targetX + dx * bestT, -31.1, 31.1);
    const outY = THREE.MathUtils.clamp(targetY + dy * bestT, 0.45, 13.7);
    const outZ = THREE.MathUtils.clamp(targetZ + dz * bestT, -33.1, 29.4);
    return { x: outX, y: outY, z: outZ };
  };

  const updateVisuals = (
    elapsed: number,
    baseUnlocked: boolean,
    allyRescued: boolean,
    vehicleBayUnlocked = false,
    vehicleState?: VehicleRepairState,
    dt = 0.016,
  ) => {
    const pulse = 0.65 + Math.sin(elapsed * 3.8) * 0.25;
    workbenchRing.visible = baseUnlocked;
    if (baseUnlocked) {
      wbRingMat.opacity = 0.35 + pulse * 0.32;
      workbenchRing.scale.setScalar(0.95 + Math.sin(elapsed * 3.0) * 0.06);
    }

    exitBeaconRing.visible = baseUnlocked;
    exitBeaconBeam.visible = baseUnlocked;
    if (baseUnlocked) {
      exitRingMat.opacity = 0.42 + pulse * 0.36;
      exitBeamMat.opacity = 0.1 + pulse * 0.12;
      exitBeaconRing.scale.setScalar(0.96 + Math.sin(elapsed * 3.2) * 0.06);
    }

    allyRig.beaconRing.visible = allyRescued;
    if (allyRescued) {
      allyRig.beaconRing.scale.setScalar(0.94 + Math.sin(elapsed * 3.5) * 0.06);
    }

    vehicleRig.root.visible = vehicleBayUnlocked;
    mechanicRig.root.visible = vehicleBayUnlocked;
    vehicleBayRing.visible = vehicleBayUnlocked;
    if (vehicleBayUnlocked) {
      vbRingMat.opacity = 0.4 + pulse * 0.32;
      vehicleBayRing.scale.setScalar(0.95 + Math.sin(elapsed * 3.1) * 0.06);
      if (vehicleState) {
        vehicleRig.applyRepairState(vehicleState, elapsed);
      }
      animateMechanicNpc(mechanicRig, elapsed, 'working_garage', dt);
    }

    // Subtle flicker on west dark corridor emergency sconce
    if (emergencySconceLight) {
      emergencySconceLight.intensity =
        2.1 + Math.sin(elapsed * 19.0) * 0.5 + Math.cos(elapsed * 7.3) * 0.35;
    }
  };

  const env: ColonInteriorEnvironment = {
    root,
    surfaces,
    wallBoxes,
    circleColliders,
    zombieSpawns,
    lootSpots,
    allyRig,
    mechanicRig,
    vehicleRig,
    vehicleBayRing,
    boilerDoorPivot,
    workbenchRing,
    exitBeaconRing,
    exitBeaconBeam,
    steamJets,
    chandelierGroup,
    sconceLights,
    resolveFloorHeight,
    getFloorIndex,
    resolveCircleAndWalls,
    hasLineOfSight,
    clampCameraSegment,
    updateVisuals,
    replaceAllyRig: (customTemplate?: NpcGlbTemplateSource | null) => {
      const prevPos = allyRig.root.position.clone();
      const prevRotY = allyRig.root.rotation.y;
      const prevVisible = allyRig.root.visible;
      const prevBeaconVisible = allyRig.beaconRing.visible;
      root.remove(allyRig.root);
      allyRig.dispose();

      allyRig = buildAllyChemistRig(customTemplate);
      allyRig.root.position.copy(prevPos);
      allyRig.root.rotation.y = prevRotY;
      allyRig.root.visible = prevVisible;
      allyRig.beaconRing.visible = prevBeaconVisible;
      root.add(allyRig.root);
      env.allyRig = allyRig;
      return allyRig;
    },
    replaceMechanicRig: (customTemplate?: NpcGlbTemplateSource | null) => {
      const prevPos = mechanicRig.root.position.clone();
      const prevRotY = mechanicRig.root.rotation.y;
      const prevVisible = mechanicRig.root.visible;
      const prevBeaconVisible = mechanicRig.beaconRing.visible;
      root.remove(mechanicRig.root);
      mechanicRig.dispose();

      mechanicRig = buildMechanicNpcRig(customTemplate);
      mechanicRig.root.position.copy(prevPos);
      mechanicRig.root.rotation.y = prevRotY;
      mechanicRig.root.visible = prevVisible;
      mechanicRig.beaconRing.visible = prevBeaconVisible;
      root.add(mechanicRig.root);
      env.mechanicRig = mechanicRig;
      return mechanicRig;
    },
    dispose: () => {
      scene.remove(root);
      allyRig.dispose();
      mechanicRig.dispose();
      vehicleRig.dispose();
      disposables.forEach((d) => d.dispose());
    },
  };
  return env;
}
