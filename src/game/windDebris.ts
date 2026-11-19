import * as THREE from 'three';
import { groundHeightAt } from './models';
import { createWindDebrisTextures, type WindDebrisTextures } from './textures';

type DebrisKind = 0 | 1 | 2; // 0 = newspaper, 1 = paper/flyer, 2 = dry leaf

interface WindDebrisItem {
  kind: DebrisKind;
  slotIndex: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  vrx: number;
  vry: number;
  vrz: number;
  scale: number;
  phase: number;
  flutterFreq: number;
  gustBias: number;
  skidTimer: number;
}

const _pos = new THREE.Vector3();
const _eul = new THREE.Euler();
const _quat = new THREE.Quaternion();
const _scl = new THREE.Vector3();
const _mat = new THREE.Matrix4();
const _tint = new THREE.Color();

function createBentPaperGeometry(width: number, height: number, curveZ: number): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(width, height, 2, 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i);
    const py = pos.getY(i);
    const nx = px / (width * 0.5);
    const ny = py / (height * 0.5);
    const bend = (1 - nx * nx) * curveZ + Math.sin(ny * 1.4) * (curveZ * 0.45);
    pos.setZ(i, bend);
  }
  geo.computeVertexNormals();
  return geo;
}

export class WindDebrisSystem {
  public readonly group = new THREE.Group();

  private readonly textures: WindDebrisTextures;
  private readonly newspaperInst: THREE.InstancedMesh;
  private readonly paperInst: THREE.InstancedMesh;
  private readonly leafInst: THREE.InstancedMesh;
  private readonly items: WindDebrisItem[] = [];
  private readonly radius = 34;
  private readonly disposables: { dispose: () => void }[] = [];
  private initializedOrigin = false;
  private lastAnchorX = 0;
  private lastAnchorZ = 0;

  constructor(isMobile: boolean) {
    this.textures = createWindDebrisTextures();

    const newspaperCount = isMobile ? 14 : 24;
    const paperCount = isMobile ? 18 : 30;
    const leafCount = isMobile ? 28 : 48;

    const npGeo = createBentPaperGeometry(0.44, 0.56, 0.055);
    const npMat = new THREE.MeshStandardMaterial({
      map: this.textures.newspaper,
      roughness: 0.9,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    this.newspaperInst = new THREE.InstancedMesh(npGeo, npMat, newspaperCount);
    this.newspaperInst.frustumCulled = false;

    const pGeo = createBentPaperGeometry(0.24, 0.3, 0.038);
    const pMat = new THREE.MeshStandardMaterial({
      map: this.textures.paper,
      alphaTest: 0.4,
      transparent: false,
      roughness: 0.88,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    this.paperInst = new THREE.InstancedMesh(pGeo, pMat, paperCount);
    this.paperInst.frustumCulled = false;

    const lGeo = createBentPaperGeometry(0.2, 0.2, 0.025);
    const lMat = new THREE.MeshStandardMaterial({
      map: this.textures.leaf,
      alphaTest: 0.42,
      transparent: false,
      roughness: 0.85,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
    this.leafInst = new THREE.InstancedMesh(lGeo, lMat, leafCount);
    this.leafInst.frustumCulled = false;

    this.disposables.push(npGeo, npMat, pGeo, pMat, lGeo, lMat, this.textures);
    this.group.add(this.newspaperInst, this.paperInst, this.leafInst);

    const paperPalette = [0xf5f0e4, 0xe8e0cc, 0xd8d2c5, 0xf2e7c9];
    const leafPalette = [0xb47b34, 0x9c5a25, 0xc7923e, 0x7c6a32, 0x8c4720, 0xaa8b42];

    const addBucket = (kind: DebrisKind, count: number) => {
      for (let i = 0; i < count; i++) {
        const angle = (i / Math.max(1, count)) * Math.PI * 2 + Math.random() * 0.9;
        const r = Math.sqrt(Math.random()) * this.radius;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        const gy = groundHeightAt(x, z);
        const startAir = Math.random() < 0.72;
        const item: WindDebrisItem = {
          kind,
          slotIndex: i,
          x,
          y: gy + (startAir ? 0.14 + Math.random() * 1.9 : 0.04),
          z,
          vx: 0,
          vy: 0,
          vz: 0,
          rx: Math.random() * Math.PI * 2,
          ry: Math.random() * Math.PI * 2,
          rz: Math.random() * Math.PI * 2,
          vrx: (Math.random() - 0.5) * 3.8,
          vry: (Math.random() - 0.5) * 4.2,
          vrz: (Math.random() - 0.5) * 3.4,
          scale: kind === 0 ? 0.85 + Math.random() * 0.35 : kind === 1 ? 0.82 + Math.random() * 0.42 : 0.75 + Math.random() * 0.55,
          phase: Math.random() * Math.PI * 2,
          flutterFreq: kind === 2 ? 4.2 + Math.random() * 3.2 : 2.2 + Math.random() * 2.4,
          gustBias: 0.7 + Math.random() * 0.65,
          skidTimer: Math.random() * 1.2,
        };
        this.items.push(item);

        if (kind === 0) {
          _tint.setHex(paperPalette[i % paperPalette.length]);
          this.newspaperInst.setColorAt(i, _tint);
        } else if (kind === 1) {
          _tint.setHex(paperPalette[(i + 1) % paperPalette.length]);
          this.paperInst.setColorAt(i, _tint);
        } else {
          _tint.setHex(leafPalette[i % leafPalette.length]);
          this.leafInst.setColorAt(i, _tint);
        }
      }
    };

    addBucket(0, newspaperCount);
    addBucket(1, paperCount);
    addBucket(2, leafCount);

    if (this.newspaperInst.instanceColor) this.newspaperInst.instanceColor.needsUpdate = true;
    if (this.paperInst.instanceColor) this.paperInst.instanceColor.needsUpdate = true;
    if (this.leafInst.instanceColor) this.leafInst.instanceColor.needsUpdate = true;
  }

  private respawnUpwind(
    item: WindDebrisItem,
    anchorX: number,
    anchorZ: number,
    windDirX: number,
    windDirZ: number,
  ) {
    // Spawn on upwind hemisphere/edge around the player so wind naturally carries debris across view
    const perpX = -windDirZ;
    const perpZ = windDirX;
    const lateral = (Math.random() * 2 - 1) * this.radius * 0.95;
    const back = this.radius * (0.45 + Math.random() * 0.52);
    item.x = anchorX - windDirX * back + perpX * lateral;
    item.z = anchorZ - windDirZ * back + perpZ * lateral;
    const gy = groundHeightAt(item.x, item.z);
    item.y = gy + 0.08 + Math.random() * 1.85;
    item.vy = (Math.random() - 0.35) * 0.6;
    item.skidTimer = 0;
  }

  public update(
    dt: number,
    elapsed: number,
    anchorX: number,
    anchorZ: number,
    visible: boolean,
  ) {
    this.group.visible = visible;
    if (!visible) return;

    if (!this.initializedOrigin) {
      this.initializedOrigin = true;
      this.lastAnchorX = anchorX;
      this.lastAnchorZ = anchorZ;
      for (let i = 0; i < this.items.length; i++) {
        const it = this.items[i];
        it.x += anchorX;
        it.z += anchorZ;
        it.y = groundHeightAt(it.x, it.z) + 0.1 + Math.random() * 1.8;
      }
    } else if (Math.hypot(anchorX - this.lastAnchorX, anchorZ - this.lastAnchorZ) > 22) {
      // Teleport / zone transition snap
      const dx = anchorX - this.lastAnchorX;
      const dz = anchorZ - this.lastAnchorZ;
      for (let i = 0; i < this.items.length; i++) {
        this.items[i].x += dx;
        this.items[i].z += dz;
        this.items[i].y = groundHeightAt(this.items[i].x, this.items[i].z) + 0.1 + Math.random() * 1.6;
      }
    }
    this.lastAnchorX = anchorX;
    this.lastAnchorZ = anchorZ;

    // Global urban wind direction sweeping through Av. 9 de Julio with organic gusts
    const windAngle =
      0.34 + Math.sin(elapsed * 0.16) * 0.42 + Math.cos(elapsed * 0.07) * 0.25;
    const windDirX = Math.sin(windAngle);
    const windDirZ = Math.cos(windAngle);
    const baseGust =
      4.4 +
      2.6 * Math.sin(elapsed * 0.48) +
      1.35 * Math.cos(elapsed * 1.07) +
      0.8 * Math.sin(elapsed * 2.1);

    const maxRadSq = this.radius * this.radius;

    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];
      // Localized eddy & street turbulence
      const eddy = Math.sin(it.x * 0.17 + it.z * 0.13 + elapsed * 1.35 + it.phase);
      const swirl = Math.cos(it.z * 0.19 - it.x * 0.11 + elapsed * 0.95 + it.phase);
      const localWind = Math.max(1.4, baseGust * it.gustBias + eddy * 1.6);

      const targetVx = windDirX * localWind + swirl * 1.35;
      const targetVz = windDirZ * localWind - eddy * 1.15;
      const drag = it.kind === 2 ? 4.2 : 2.9;
      it.vx += (targetVx - it.vx) * Math.min(1, drag * dt);
      it.vz += (targetVz - it.vz) * Math.min(1, drag * dt);

      const gy = groundHeightAt(it.x, it.z);
      const floorY = gy + (it.kind === 0 ? 0.045 : 0.03);

      // Vertical buoyancy: low-altitude ground skimming + occasional swirling updrafts
      const updraftWave = Math.sin(elapsed * it.flutterFreq * 0.35 + it.phase + it.x * 0.08);
      const gravity = it.kind === 2 ? 1.05 : it.kind === 1 ? 1.35 : 1.75;
      if (it.y <= floorY + 0.03 && updraftWave < 0.38) {
        // Skidding / scraping along asphalt
        it.y = floorY;
        it.vy = 0;
        it.vx *= 0.94;
        it.vz *= 0.94;
        it.skidTimer += dt;
        // Settle almost flat to the pavement while sliding
        it.rx += (-Math.PI * 0.5 - it.rx) * Math.min(1, 9 * dt);
        it.rz += (0 - it.rz) * Math.min(1, 9 * dt);
        it.ry += it.vry * 0.25 * dt;
        if (it.skidTimer > 0.65 && updraftWave > 0.12) {
          it.vy = 1.1 + Math.random() * 1.5;
          it.skidTimer = 0;
        }
      } else {
        const lift = (0.85 + Math.max(0, updraftWave) * 1.95) * (localWind * 0.18);
        it.vy += (lift - gravity) * dt;
        it.vy = THREE.MathUtils.clamp(it.vy, -2.4, 2.8);
        it.y += it.vy * dt;
        if (it.y < floorY) {
          it.y = floorY;
          it.vy = 0;
        } else if (it.y > gy + 3.4) {
          it.vy -= 2.2 * dt;
        }
        // Flutter & tumble rotation in midair
        it.rx += (it.vrx + Math.sin(elapsed * it.flutterFreq + it.phase) * 2.2) * dt;
        it.ry += it.vry * dt;
        it.rz += (it.vrz + Math.cos(elapsed * it.flutterFreq * 0.8 + it.phase) * 1.9) * dt;
      }

      it.x += it.vx * dt;
      it.z += it.vz * dt;

      const dx = it.x - anchorX;
      const dz = it.z - anchorZ;
      if (dx * dx + dz * dz > maxRadSq) {
        this.respawnUpwind(it, anchorX, anchorZ, windDirX, windDirZ);
      }

      _pos.set(it.x, it.y, it.z);
      _eul.set(it.rx, it.ry, it.rz);
      _quat.setFromEuler(_eul);
      _scl.setScalar(it.scale);
      _mat.compose(_pos, _quat, _scl);

      if (it.kind === 0) this.newspaperInst.setMatrixAt(it.slotIndex, _mat);
      else if (it.kind === 1) this.paperInst.setMatrixAt(it.slotIndex, _mat);
      else this.leafInst.setMatrixAt(it.slotIndex, _mat);
    }

    this.newspaperInst.instanceMatrix.needsUpdate = true;
    this.paperInst.instanceMatrix.needsUpdate = true;
    this.leafInst.instanceMatrix.needsUpdate = true;
  }

  public dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.disposables.length = 0;
  }
}
