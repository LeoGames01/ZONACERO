import * as THREE from 'three';

export function createGroundTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Post-apocalyptic cracked, damp Buenos Aires asphalt base
  ctx.fillStyle = '#1b1f21';
  ctx.fillRect(0, 0, size, size);

  // Damp asphalt patches, worn aggregate spots, oil grime & subtle moss stains
  for (let i = 0; i < 640; i++) {
    const x = Math.abs((Math.sin(i * 12.9898) * 43758.5453) % 1) * size;
    const y = Math.abs((Math.sin(i * 78.233) * 19341.123) % 1) * size;
    const radius = 5 + (i % 24);
    ctx.fillStyle =
      i % 7 === 0
        ? 'rgba(64, 52, 38, 0.24)'
        : i % 5 === 0
          ? 'rgba(34, 44, 30, 0.24)'
          : i % 4 === 0
            ? 'rgba(50, 55, 58, 0.22)'
            : i % 4 === 1
              ? 'rgba(9, 12, 14, 0.34)'
              : i % 4 === 2
                ? 'rgba(64, 68, 70, 0.16)'
                : 'rgba(24, 28, 31, 0.22)';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Branching tar-sealed & weed-stained asphalt cracks (grietas)
  for (let i = 0; i < 58; i++) {
    let cx = Math.abs((Math.sin(i * 91.1) * 18231.4) % 1) * size;
    let cy = Math.abs((Math.sin(i * 37.7) * 42183.9) % 1) * size;
    ctx.strokeStyle =
      i % 5 === 0
        ? 'rgba(36, 54, 26, 0.48)'
        : i % 3 === 0
          ? 'rgba(5, 7, 9, 0.78)'
          : 'rgba(10, 12, 14, 0.62)';
    ctx.lineWidth = i % 5 === 0 ? 2.1 : i % 3 === 0 ? 1.8 : 1.25;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    for (let s = 0; s < 7; s++) {
      const bx = cx;
      const by = cy;
      cx += Math.sin(i * 7 + s * 2.1) * 20;
      cy += Math.cos(i * 5 + s * 1.9) * 20;
      ctx.lineTo(cx, cy);
      if (s === 2 || s === 4) {
        ctx.moveTo(bx, by);
        ctx.lineTo(
          bx + Math.cos(i * 3.3 + s) * 14,
          by - Math.sin(i * 4.1 + s) * 14,
        );
        ctx.moveTo(cx, cy);
      }
    }
    ctx.stroke();
  }

  // Fine mineral aggregate grit, pebble flecks & damp streaks
  for (let i = 0; i < 3400; i++) {
    const px = Math.abs((Math.sin(i * 45.164) * 23421.63) % 1) * size;
    const py = Math.abs((Math.sin(i * 91.732) * 51234.19) % 1) * size;
    ctx.fillStyle =
      i % 7 === 0
        ? 'rgba(130, 122, 108, 0.09)'
        : i % 3 === 0
          ? 'rgba(255,255,255,0.055)'
          : 'rgba(0,0,0,0.2)';
    ctx.fillRect(px, py, i % 9 === 0 ? 3 : 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(28, 28);
  tex.anisotropy = Math.min(8, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

export function createSimpleTerrainTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Clean natural sandbox earth/grass-stone blend ready for custom textures or props
  ctx.fillStyle = '#5f6959';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 420; i++) {
    const x = Math.abs((Math.sin(i * 19.31) * 43758.5453) % 1) * size;
    const y = Math.abs((Math.sin(i * 63.17) * 19341.123) % 1) * size;
    const r = 8 + (i % 26);
    ctx.fillStyle =
      i % 3 === 0
        ? 'rgba(116, 128, 102, 0.16)'
        : i % 3 === 1
          ? 'rgba(72, 82, 66, 0.18)'
          : 'rgba(140, 146, 130, 0.1)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 1800; i++) {
    const px = Math.abs((Math.sin(i * 45.164) * 23421.63) % 1) * size;
    const py = Math.abs((Math.sin(i * 91.732) * 51234.19) % 1) * size;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.075)';
    ctx.fillRect(px, py, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(28, 28);
  tex.anisotropy = Math.min(8, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

export function createGroundBumpTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 1300; i++) {
    const px = Math.abs((Math.sin(i * 27.19) * 19384.2) % 1) * size;
    const py = Math.abs((Math.sin(i * 67.43) * 38192.5) % 1) * size;
    const v = i % 2 === 0 ? 195 : 55;
    ctx.fillStyle = `rgba(${v},${v},${v},0.36)`;
    ctx.fillRect(px, py, i % 5 === 0 ? 4 : 3, 3);
  }

  ctx.strokeStyle = 'rgba(18, 18, 18, 0.8)';
  ctx.lineWidth = 2.0;
  for (let i = 0; i < 28; i++) {
    let cx = Math.abs((Math.sin(i * 41.3) * 14111.2) % 1) * size;
    let cy = Math.abs((Math.sin(i * 83.9) * 29182.7) % 1) * size;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    for (let s = 0; s < 5; s++) {
      cx += Math.sin(i * 5.2 + s * 1.8) * 16;
      cy += Math.cos(i * 4.4 + s * 2.1) * 16;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(28, 28);
  tex.anisotropy = Math.min(8, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

export function createBarkTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Organic deep-ridged wood bark & weathered timber planks
  ctx.fillStyle = '#4f3a26';
  ctx.fillRect(0, 0, size, size);

  for (let x = 0; x < size; x += 5) {
    const ridge = Math.sin(x * 0.38) * 0.5 + Math.cos(x * 0.14) * 0.5;
    ctx.fillStyle =
      ridge > 0.2
        ? 'rgba(24, 15, 10, 0.36)'
        : ridge < -0.2
          ? 'rgba(118, 89, 59, 0.24)'
          : 'rgba(65, 48, 32, 0.2)';
    ctx.fillRect(x, 0, 3, size);
  }

  for (let i = 0; i < 140; i++) {
    const px = Math.abs((Math.sin(i * 17.7) * 32918.4) % 1) * size;
    const py = Math.abs((Math.sin(i * 53.3) * 18293.1) % 1) * size;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(40, 56, 36, 0.22)' : 'rgba(18, 12, 8, 0.35)';
    ctx.fillRect(px, py, 4, 12 + (i % 18));
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = Math.min(8, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

export function createStoneTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Weathered concrete blocks, moss stains & rubble grain
  ctx.fillStyle = '#4e5661';
  ctx.fillRect(0, 0, size, size);

  // Subtle concrete slab joints
  ctx.strokeStyle = 'rgba(20, 24, 30, 0.45)';
  ctx.lineWidth = 2;
  for (let y = 0; y < size; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  for (let i = 0; i < 420; i++) {
    const px = Math.abs((Math.sin(i * 19.31) * 91823.1) % 1) * size;
    const py = Math.abs((Math.sin(i * 63.17) * 41234.7) % 1) * size;
    const r = 3 + (i % 13);
    ctx.fillStyle =
      i % 5 === 0
        ? 'rgba(42, 64, 46, 0.18)'
        : i % 2 === 0
          ? 'rgba(24, 28, 34, 0.25)'
          : 'rgba(155, 162, 174, 0.16)';
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = Math.min(8, maxAnisotropy);
  tex.needsUpdate = true;
  return tex;
}

export function createSkyGradientTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 4;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.0, '#050812'); // Deep midnight zenith
  grad.addColorStop(0.32, '#0c1526'); // Indigo night sky
  grad.addColorStop(0.54, '#18273c'); // Cool twilight mist above horizon
  grad.addColorStop(0.66, '#131d2b'); // Horizon fog band
  grad.addColorStop(1.0, '#0c1118'); // Lower hemisphere

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 4, 256);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.08,
    size / 2,
    size / 2,
    size * 0.5,
  );
  grad.addColorStop(0, 'rgba(4, 6, 10, 0.78)');
  grad.addColorStop(0.55, 'rgba(4, 6, 10, 0.36)');
  grad.addColorStop(1, 'rgba(4, 6, 10, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

let cachedAwarenessIcons: {
  question: THREE.CanvasTexture;
  exclamation: THREE.CanvasTexture;
} | null = null;

function createAwarenessGlyphTexture(symbol: '?' | '!'): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, size, size);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 88px "Plus Jakarta Sans", system-ui, -apple-system, sans-serif';

  // Dark outer halo for contrast against both bright sky and dark forest
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.78)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  ctx.strokeStyle = 'rgba(6, 9, 14, 0.94)';
  ctx.lineWidth = 16;
  ctx.strokeText(symbol, size / 2, size / 2 + 4);

  // Pure white glyph so SpriteMaterial.color tints it cleanly
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(symbol, size / 2, size / 2 + 4);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function getAwarenessIconTextures(): {
  question: THREE.CanvasTexture;
  exclamation: THREE.CanvasTexture;
} {
  if (!cachedAwarenessIcons) {
    cachedAwarenessIcons = {
      question: createAwarenessGlyphTexture('?'),
      exclamation: createAwarenessGlyphTexture('!'),
    };
  }
  return cachedAwarenessIcons;
}

let cachedBloodTextures: THREE.CanvasTexture[] | null = null;
let cachedSmokePuffTexture: THREE.CanvasTexture | null = null;
let cachedWaterPuddleTexture: THREE.CanvasTexture | null = null;
let cachedFootprintTexture: THREE.CanvasTexture | null = null;

function drawTeardropSplash(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  length: number,
  width: number,
  angleRad: number,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angleRad);
  // Pointed tail trails toward -X (center of impact), rounded droplet bulb leads toward +X
  ctx.beginPath();
  ctx.moveTo(-length * 0.65, 0);
  ctx.bezierCurveTo(
    -length * 0.22,
    -width * 0.24,
    length * 0.05,
    -width * 0.56,
    length * 0.34,
    -width * 0.46,
  );
  ctx.bezierCurveTo(
    length * 0.58,
    -width * 0.36,
    length * 0.58,
    width * 0.36,
    length * 0.34,
    width * 0.46,
  );
  ctx.bezierCurveTo(
    length * 0.05,
    width * 0.56,
    -length * 0.22,
    width * 0.24,
    -length * 0.65,
    0,
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function createBloodPuddleTexture(seed: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, size, size);
  const cx = size / 2;
  const cy = size / 2;

  const rnd = (i: number) => {
    const v = Math.sin(seed * 91.7 + i * 37.13) * 43758.5453;
    return v - Math.floor(v);
  };

  // Main organic splash core built from overlapping glossy drop lobes
  const lobes = 8;
  for (let i = 0; i < lobes; i++) {
    const angle = (i / lobes) * Math.PI * 2 + rnd(i) * 0.72;
    const dist = i === 0 ? 0 : size * (0.05 + rnd(i + 10) * 0.11);
    const lx = cx + Math.cos(angle) * dist;
    const ly = cy + Math.sin(angle) * dist;
    const r = size * (i === 0 ? 0.22 : 0.11 + rnd(i + 20) * 0.1);

    const grad = ctx.createRadialGradient(lx, ly, r * 0.14, lx, ly, r);
    grad.addColorStop(0.0, 'rgba(62, 4, 8, 0.96)');
    grad.addColorStop(0.58, 'rgba(116, 8, 13, 0.92)');
    grad.addColorStop(0.86, 'rgba(58, 4, 7, 0.82)');
    grad.addColorStop(1.0, 'rgba(38, 2, 4, 0)');

    ctx.fillStyle = grad;
    if (i === 0) {
      ctx.beginPath();
      ctx.arc(lx, ly, r, 0, Math.PI * 2);
      ctx.fill();
    } else {
      drawTeardropSplash(ctx, lx, ly, r * 1.95, r * 1.25, angle);
    }
  }

  // Glossy deeper core
  const coreGrad = ctx.createRadialGradient(cx, cy, 3, cx, cy, size * 0.18);
  coreGrad.addColorStop(0, 'rgba(42, 2, 5, 0.96)');
  coreGrad.addColorStop(0.68, 'rgba(92, 6, 11, 0.7)');
  coreGrad.addColorStop(1, 'rgba(92, 6, 11, 0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.18, 0, Math.PI * 2);
  ctx.fill();

  // Scattered directional teardrop droplets radiating outward around the splash
  for (let i = 0; i < 34; i++) {
    const a = rnd(i + 40) * Math.PI * 2;
    const d = size * (0.2 + rnd(i + 70) * 0.26);
    const sx = cx + Math.cos(a) * d;
    const sy = cy + Math.sin(a) * d;
    const dropW = 4.2 + rnd(i + 100) * 9.5;
    const dropL = dropW * (1.55 + rnd(i + 130) * 0.95);
    ctx.fillStyle =
      i % 3 === 0
        ? 'rgba(128, 12, 16, 0.9)'
        : i % 2 === 0
          ? 'rgba(88, 6, 11, 0.88)'
          : 'rgba(52, 3, 7, 0.82)';
    drawTeardropSplash(ctx, sx, sy, dropL, dropW, a);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function getBloodPuddleTextures(): THREE.CanvasTexture[] {
  if (!cachedBloodTextures) {
    cachedBloodTextures = [
      createBloodPuddleTexture(1.37),
      createBloodPuddleTexture(4.91),
      createBloodPuddleTexture(8.53),
    ];
  }
  return cachedBloodTextures;
}

export function getSmokePuffTexture(): THREE.CanvasTexture {
  if (cachedSmokePuffTexture) return cachedSmokePuffTexture;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  const lobes: [number, number, number, number][] = [
    [0.5, 0.5, 0.44, 0.62],
    [0.37, 0.44, 0.3, 0.46],
    [0.64, 0.46, 0.28, 0.42],
    [0.48, 0.33, 0.26, 0.38],
    [0.42, 0.63, 0.27, 0.36],
    [0.6, 0.62, 0.24, 0.32],
  ];
  for (let i = 0; i < lobes.length; i++) {
    const [nx, ny, nr, alpha] = lobes[i];
    const cx = nx * size;
    const cy = ny * size;
    const r = nr * size;
    const grad = ctx.createRadialGradient(cx, cy, r * 0.08, cx, cy, r);
    grad.addColorStop(0.0, `rgba(255, 255, 255, ${alpha})`);
    grad.addColorStop(0.48, `rgba(245, 245, 245, ${(alpha * 0.64).toFixed(3)})`);
    grad.addColorStop(0.82, `rgba(225, 225, 225, ${(alpha * 0.18).toFixed(3)})`);
    grad.addColorStop(1.0, 'rgba(220, 220, 220, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedSmokePuffTexture = tex;
  return tex;
}

export function getWaterPuddleTexture(): THREE.CanvasTexture {
  if (cachedWaterPuddleTexture) return cachedWaterPuddleTexture;
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  const lobes: [number, number, number, number, number][] = [
    [0.5, 0.5, 0.34, 0.28, 0.25],
    [0.37, 0.46, 0.24, 0.21, -0.4],
    [0.64, 0.54, 0.23, 0.19, 0.6],
    [0.52, 0.35, 0.2, 0.17, 0.15],
    [0.44, 0.65, 0.21, 0.16, -0.2],
  ];

  for (let i = 0; i < lobes.length; i++) {
    const [nx, ny, rx, ry, rot] = lobes[i];
    ctx.save();
    ctx.translate(nx * size, ny * size);
    ctx.rotate(rot);
    const maxR = Math.max(rx, ry) * size;
    const grad = ctx.createRadialGradient(0, 0, maxR * 0.15, 0, 0, maxR);
    grad.addColorStop(0.0, 'rgba(130, 165, 185, 0.88)');
    grad.addColorStop(0.65, 'rgba(92, 128, 150, 0.78)');
    grad.addColorStop(0.88, 'rgba(56, 78, 92, 0.45)');
    grad.addColorStop(1.0, 'rgba(35, 50, 62, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * size, ry * size, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Subtle sky reflection sheen toward the center-top
  const sheen = ctx.createRadialGradient(cx - 18, cy - 18, 4, cx, cy, size * 0.28);
  sheen.addColorStop(0.0, 'rgba(215, 236, 248, 0.35)');
  sheen.addColorStop(0.6, 'rgba(175, 205, 224, 0.12)');
  sheen.addColorStop(1.0, 'rgba(175, 205, 224, 0)');
  ctx.fillStyle = sheen;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.28, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedWaterPuddleTexture = tex;
  return tex;
}

export function getFootprintTexture(): THREE.CanvasTexture {
  if (cachedFootprintTexture) return cachedFootprintTexture;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  const cx = size * 0.5;
  // Forefoot / ball of boot (oriented toward top = +Z forward when mapped to plane)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.beginPath();
  ctx.ellipse(cx - 2, size * 0.33, size * 0.175, size * 0.22, -0.06, 0, Math.PI * 2);
  ctx.fill();

  // Outer arch bridge
  ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
  ctx.beginPath();
  ctx.ellipse(cx + size * 0.055, size * 0.56, size * 0.08, size * 0.095, 0.14, 0, Math.PI * 2);
  ctx.fill();

  // Heel pad
  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
  ctx.beginPath();
  ctx.ellipse(cx + 1, size * 0.74, size * 0.135, size * 0.125, 0.04, 0, Math.PI * 2);
  ctx.fill();

  // Carve subtle boot sole tread grooves using destination-out
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  for (let y = size * 0.18; y <= size * 0.46; y += size * 0.065) {
    ctx.fillRect(cx - size * 0.2, y, size * 0.4, size * 0.02);
  }
  ctx.fillRect(cx - size * 0.16, size * 0.72, size * 0.32, size * 0.024);
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  cachedFootprintTexture = tex;
  return tex;
}

export function disposeSharedTextureCaches(): void {
  if (cachedAwarenessIcons) {
    cachedAwarenessIcons.question.dispose();
    cachedAwarenessIcons.exclamation.dispose();
    cachedAwarenessIcons = null;
  }
  if (cachedBloodTextures) {
    for (let i = 0; i < cachedBloodTextures.length; i++) {
      cachedBloodTextures[i].dispose();
    }
    cachedBloodTextures = null;
  }
  if (cachedSmokePuffTexture) {
    cachedSmokePuffTexture.dispose();
    cachedSmokePuffTexture = null;
  }
  if (cachedWaterPuddleTexture) {
    cachedWaterPuddleTexture.dispose();
    cachedWaterPuddleTexture = null;
  }
  if (cachedFootprintTexture) {
    cachedFootprintTexture.dispose();
    cachedFootprintTexture = null;
  }
}

export interface BuenosAiresTextures {
  classicFacade: THREE.CanvasTexture;
  classicEmissive: THREE.CanvasTexture;
  modernGlass: THREE.CanvasTexture;
  modernEmissive: THREE.CanvasTexture;
  whiteRationalist: THREE.CanvasTexture;
  whiteRationalistEmissive: THREE.CanvasTexture;
  verticalGarden: THREE.CanvasTexture;
  foliageLeaf: THREE.CanvasTexture;
  plazaPaver: THREE.CanvasTexture;
  metrobusSign: THREE.CanvasTexture;
  busLivery: THREE.CanvasTexture;
  busLiveryRed: THREE.CanvasTexture;
  billboardA: THREE.CanvasTexture;
  billboardB: THREE.CanvasTexture;
  brokenScreen: THREE.CanvasTexture;
  medianeraWall: THREE.CanvasTexture;
  quarantineSign: THREE.CanvasTexture;
  colonMarquee: THREE.CanvasTexture;
  dispose: () => void;
}

function paintWeatheringAndScorch(ctx: CanvasRenderingContext2D, w: number, h: number, seedOffset: number) {
  // Vertical rain-soot drip streaks from cornices and ledges
  for (let i = 0; i < 36; i++) {
    const x = Math.abs((Math.sin((i + seedOffset) * 21.7) * 4192.3) % 1) * w;
    const y = Math.abs((Math.cos((i + seedOffset) * 13.1) * 2831.7) % 1) * (h * 0.6);
    const sw = 5 + (i % 14);
    const sh = 40 + ((i * 19) % 130);
    const grad = ctx.createLinearGradient(x, y, x, y + sh);
    grad.addColorStop(0, 'rgba(18, 20, 19, 0.34)');
    grad.addColorStop(1, 'rgba(18, 20, 19, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, sw, sh);
  }
  // Blast/fire scorch smudges
  for (let b = 0; b < 4; b++) {
    const bx = w * (0.18 + ((b * 0.23 + seedOffset * 0.11) % 0.68));
    const by = h * (0.22 + ((b * 0.19 + seedOffset * 0.17) % 0.56));
    const br = 36 + (b % 3) * 22;
    const g = ctx.createRadialGradient(bx, by, 4, bx, by, br);
    g.addColorStop(0, 'rgba(12, 13, 12, 0.62)');
    g.addColorStop(0.55, 'rgba(24, 26, 23, 0.32)');
    g.addColorStop(1, 'rgba(24, 26, 23, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }
}

function makeFacadePair(
  maxAnisotropy: number,
  mode: 'classic' | 'modern' | 'white_rationalist',
): { map: THREE.CanvasTexture; emissive: THREE.CanvasTexture } {
  const w = 512;
  const h = 512;
  const cMap = document.createElement('canvas');
  cMap.width = w;
  cMap.height = h;
  const ctx = cMap.getContext('2d')!;

  const cEm = document.createElement('canvas');
  cEm.width = w;
  cEm.height = h;
  const ectx = cEm.getContext('2d')!;

  ectx.fillStyle = '#000000';
  ectx.fillRect(0, 0, w, h);

  if (mode === 'classic') {
    // Weathered French-academic cream/grey Porteño limestone & soot-stained stucco
    ctx.fillStyle = '#b4b0a5';
    ctx.fillRect(0, 0, w, h);

    // Horizontal stone cornice bands
    for (let y = 0; y < h; y += 64) {
      ctx.fillStyle = y % 128 === 0 ? '#8c897f' : '#9c988e';
      ctx.fillRect(0, y, w, 7);
    }

    const cols = 6;
    const rows = 8;
    const cellW = w / cols;
    const cellH = h / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const seed = Math.abs(Math.sin(r * 19.3 + c * 43.7) * 9182.3);
        const broken = (seed % 1) < 0.34;
        const lit = !broken && (seed % 1) > 0.86;
        const wx = c * cellW + 15;
        const wy = r * cellH + 14;
        const ww = cellW - 30;
        const wh = cellH - 24;

        ctx.fillStyle = '#4a4741';
        ctx.fillRect(wx - 3, wy - 3, ww + 6, wh + 6);

        ctx.fillStyle = broken ? '#0d1012' : lit ? '#594b34' : '#1b2226';
        ctx.fillRect(wx, wy, ww, wh);

        // Window mullion & wrought-iron balcony bar
        ctx.fillStyle = '#262421';
        ctx.fillRect(wx + ww * 0.5 - 1.5, wy, 3, wh);
        ctx.fillRect(wx - 4, wy + wh - 10, ww + 8, 3);

        if (lit) {
          ectx.fillStyle = (seed * 7) % 1 > 0.4 ? '#c49b5e' : '#9cb4bf';
          ectx.fillRect(wx + 2, wy + 2, ww - 4, wh - 4);
        }
      }
    }
    paintWeatheringAndScorch(ctx, w, h, 3);
  } else if (mode === 'white_rationalist') {
    // Iconic cream-white punched-window Rationalist Buenos Aires building (left skyline in photo)
    ctx.fillStyle = '#c4c0b4';
    ctx.fillRect(0, 0, w, h);

    // Subtle concrete horizontal reveal lines every 2 floors
    for (let y = 0; y < h; y += 64) {
      ctx.fillStyle = '#979489';
      ctx.fillRect(0, y, w, 4);
    }

    const cols = 7;
    const rows = 8;
    const cellW = w / cols;
    const cellH = h / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const seed = Math.abs(Math.sin(r * 27.1 + c * 59.3) * 6173.9);
        const missingGlass = (seed % 1) < 0.38;
        const lit = !missingGlass && (seed % 1) > 0.9;
        const wx = c * cellW + 14;
        const wy = r * cellH + 16;
        const ww = cellW - 28;
        const wh = cellH - 26;

        ctx.fillStyle = '#57554d';
        ctx.fillRect(wx - 2, wy - 2, ww + 4, wh + 4);
        ctx.fillStyle = missingGlass ? '#0b0e0f' : lit ? '#4f4634' : '#181f22';
        ctx.fillRect(wx, wy, ww, wh);
        // Thin crossbars
        if (!missingGlass) {
          ctx.fillStyle = '#313638';
          ctx.fillRect(wx + ww * 0.5 - 1, wy, 2, wh);
        }
        if (lit) {
          ectx.fillStyle = '#b5925c';
          ectx.fillRect(wx + 2, wy + 2, ww - 4, wh - 4);
        }
      }
    }
    paintWeatheringAndScorch(ctx, w, h, 11);
  } else {
    // Dark weathered post-apocalyptic concrete-grid & shattered glass tower
    ctx.fillStyle = '#2c3233';
    ctx.fillRect(0, 0, w, h);

    const cols = 8;
    const rows = 10;
    const cellW = w / cols;
    const cellH = h / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const seed = Math.abs(Math.sin(r * 31.1 + c * 17.9) * 4371.9);
        const shattered = (seed % 1) < 0.32;
        const lit = !shattered && (seed % 1) > 0.88;
        const wx = c * cellW + 5;
        const wy = r * cellH + 6;
        const ww = cellW - 10;
        const wh = cellH - 12;

        if (shattered) {
          ctx.fillStyle = '#090b0c';
          ctx.fillRect(wx, wy, ww, wh);
        } else {
          const g = ctx.createLinearGradient(wx, wy, wx + ww, wy + wh);
          if (lit) {
            g.addColorStop(0, '#46585e');
            g.addColorStop(1, '#2b393e');
          } else {
            g.addColorStop(0, '#233036');
            g.addColorStop(1, '#141c20');
          }
          ctx.fillStyle = g;
          ctx.fillRect(wx, wy, ww, wh);
        }

        if (lit) {
          ectx.fillStyle = (seed * 3) % 1 > 0.5 ? '#8ca8b0' : '#bfa26d';
          ectx.fillRect(wx + 2, wy + 2, ww - 4, wh - 4);
        }
      }
    }

    // Concrete horizontal/vertical ribs matching the far-left & mid gridded towers
    ctx.fillStyle = '#474e4d';
    for (let r = 0; r < rows; r++) {
      ctx.fillRect(0, r * cellH, w, 6);
    }
    for (let c = 0; c < cols; c++) {
      ctx.fillRect(c * cellW, 0, 4, h);
    }
    paintWeatheringAndScorch(ctx, w, h, 19);
  }

  const map = new THREE.CanvasTexture(cMap);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = Math.min(8, maxAnisotropy);
  map.needsUpdate = true;

  const emissive = new THREE.CanvasTexture(cEm);
  emissive.colorSpace = THREE.SRGBColorSpace;
  emissive.wrapS = THREE.RepeatWrapping;
  emissive.wrapT = THREE.RepeatWrapping;
  emissive.anisotropy = Math.min(8, maxAnisotropy);
  emissive.needsUpdate = true;

  return { map, emissive };
}

export function createBuenosAiresTextures(maxAnisotropy: number): BuenosAiresTextures {
  const classic = makeFacadePair(maxAnisotropy, 'classic');
  const modern = makeFacadePair(maxAnisotropy, 'modern');
  const whiteRat = makeFacadePair(maxAnisotropy, 'white_rationalist');

  // Overgrown wild olive-moss foliage texture for the giant "BA" and plaza mounds
  const vgCanvas = document.createElement('canvas');
  vgCanvas.width = 256;
  vgCanvas.height = 256;
  const vgCtx = vgCanvas.getContext('2d')!;
  vgCtx.fillStyle = '#1d3819';
  vgCtx.fillRect(0, 0, 256, 256);
  const greens = ['#23441d', '#2e5725', '#3d6b2d', '#172d14', '#4d7635', '#274b20'];
  for (let i = 0; i < 1800; i++) {
    const px = Math.abs((Math.sin(i * 17.13) * 43758.5) % 1) * 256;
    const py = Math.abs((Math.sin(i * 61.79) * 29312.7) % 1) * 256;
    const rx = 2.5 + (i % 5);
    const ry = 2.0 + ((i * 3) % 4);
    vgCtx.fillStyle = greens[i % greens.length];
    vgCtx.beginPath();
    vgCtx.ellipse(px, py, rx, ry, (i * 0.7) % Math.PI, 0, Math.PI * 2);
    vgCtx.fill();
  }
  const verticalGarden = new THREE.CanvasTexture(vgCanvas);
  verticalGarden.colorSpace = THREE.SRGBColorSpace;
  verticalGarden.wrapS = THREE.RepeatWrapping;
  verticalGarden.wrapT = THREE.RepeatWrapping;
  verticalGarden.repeat.set(2, 2);
  verticalGarden.anisotropy = Math.min(8, maxAnisotropy);
  verticalGarden.needsUpdate = true;

  // High-detail layered leaf cluster texture for urban boulevard tree canopies
  const flCanvas = document.createElement('canvas');
  flCanvas.width = 256;
  flCanvas.height = 256;
  const flCtx = flCanvas.getContext('2d')!;
  flCtx.fillStyle = '#152911';
  flCtx.fillRect(0, 0, 256, 256);
  const darkLeaves = ['#193314', '#1f3d18', '#24471b', '#13260f'];
  const midLeaves = ['#2b5420', '#336126', '#3d6e2b', '#274c1d'];
  const lightLeaves = ['#4b7a32', '#57873a', '#649241', '#426e2c'];
  // Layer 1: deep shadowed interior foliage clusters
  for (let i = 0; i < 650; i++) {
    const px = Math.abs((Math.sin(i * 19.37) * 43758.5) % 1) * 256;
    const py = Math.abs((Math.sin(i * 71.13) * 19341.7) % 1) * 256;
    const rx = 5 + (i % 7);
    const ry = 2.6 + ((i * 3) % 4);
    flCtx.fillStyle = darkLeaves[i % darkLeaves.length];
    flCtx.beginPath();
    flCtx.ellipse(px, py, rx, ry, (i * 0.85) % Math.PI, 0, Math.PI * 2);
    flCtx.fill();
  }
  // Layer 2: mid-tone individual elongated Tipa/Ficus leaves
  for (let i = 0; i < 950; i++) {
    const px = Math.abs((Math.sin(i * 31.71 + 2.4) * 31982.3) % 1) * 256;
    const py = Math.abs((Math.sin(i * 53.19 + 1.1) * 27143.9) % 1) * 256;
    const rx = 3.6 + (i % 5);
    const ry = 1.6 + (i % 3) * 0.6;
    const ang = ((i * 1.17) % Math.PI);
    flCtx.fillStyle = midLeaves[i % midLeaves.length];
    flCtx.beginPath();
    flCtx.ellipse(px, py, rx, ry, ang, 0, Math.PI * 2);
    flCtx.fill();
  }
  // Layer 3: sunlit outer leaf tips & twig depth
  for (let i = 0; i < 420; i++) {
    const px = Math.abs((Math.sin(i * 47.23 + 5.7) * 51234.1) % 1) * 256;
    const py = Math.abs((Math.sin(i * 83.41 + 3.3) * 18429.6) % 1) * 256;
    const rx = 2.8 + (i % 4);
    const ry = 1.2 + (i % 2) * 0.7;
    const ang = ((i * 0.93) % Math.PI);
    flCtx.fillStyle = lightLeaves[i % lightLeaves.length];
    flCtx.beginPath();
    flCtx.ellipse(px, py, rx, ry, ang, 0, Math.PI * 2);
    flCtx.fill();
  }
  const foliageLeaf = new THREE.CanvasTexture(flCanvas);
  foliageLeaf.colorSpace = THREE.SRGBColorSpace;
  foliageLeaf.wrapS = THREE.RepeatWrapping;
  foliageLeaf.wrapT = THREE.RepeatWrapping;
  foliageLeaf.repeat.set(3, 3);
  foliageLeaf.anisotropy = Math.min(8, maxAnisotropy);
  foliageLeaf.needsUpdate = true;

  // Cracked & moss-weathered Plaza de la República granite stone pavers
  const plCanvas = document.createElement('canvas');
  plCanvas.width = 256;
  plCanvas.height = 256;
  const plCtx = plCanvas.getContext('2d')!;
  plCtx.fillStyle = '#5c615d';
  plCtx.fillRect(0, 0, 256, 256);
  const tile = 32;
  for (let ty = 0; ty < 256; ty += tile) {
    for (let tx = 0; tx < 256; tx += tile) {
      const n = Math.sin(tx * 0.37 + ty * 0.71) * 7;
      const shade = ((tx / tile + ty / tile) % 2 === 0 ? 1 : -1) * 7 + n;
      plCtx.fillStyle = `rgb(${94 + shade}, ${98 + shade}, ${94 + shade})`;
      plCtx.fillRect(tx + 1, ty + 1, tile - 2, tile - 2);
      if ((tx + ty) % 96 === 0) {
        plCtx.fillStyle = 'rgba(34, 52, 26, 0.38)';
        plCtx.fillRect(tx, ty, tile, 2);
      }
    }
  }
  const plazaPaver = new THREE.CanvasTexture(plCanvas);
  plazaPaver.colorSpace = THREE.SRGBColorSpace;
  plazaPaver.wrapS = THREE.RepeatWrapping;
  plazaPaver.wrapT = THREE.RepeatWrapping;
  plazaPaver.repeat.set(6, 6);
  plazaPaver.anisotropy = Math.min(8, maxAnisotropy);
  plazaPaver.needsUpdate = true;

  // Weathered Metrobus totem sign ("METROBUS 9 DE JULIO")
  const mbCanvas = document.createElement('canvas');
  mbCanvas.width = 256;
  mbCanvas.height = 512;
  const mbCtx = mbCanvas.getContext('2d')!;
  mbCtx.fillStyle = '#192129';
  mbCtx.fillRect(0, 0, 256, 512);
  mbCtx.fillStyle = '#b48a14';
  mbCtx.fillRect(0, 0, 256, 76);
  mbCtx.fillStyle = '#0c7bb0';
  mbCtx.fillRect(0, 76, 256, 18);
  mbCtx.fillStyle = '#0f172a';
  mbCtx.font = '900 32px system-ui, sans-serif';
  mbCtx.textAlign = 'center';
  mbCtx.fillText('METROBUS', 128, 50);
  mbCtx.fillStyle = '#cbd5e1';
  mbCtx.font = '700 24px system-ui, sans-serif';
  mbCtx.fillText('9 DE JULIO', 128, 138);
  mbCtx.fillStyle = '#2d82ab';
  mbCtx.fillRect(28, 166, 200, 4);
  mbCtx.fillStyle = '#94a3b8';
  mbCtx.font = '800 26px system-ui, sans-serif';
  mbCtx.fillText('OBELISCO', 128, 218);
  const lines = ['9', '10', '17', '45', '59', '67', '70', '100'];
  lines.forEach((ln, idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    const bx = 36 + col * 96;
    const by = 255 + row * 52;
    mbCtx.fillStyle = idx % 3 === 0 ? '#b8941e' : '#2a85b0';
    mbCtx.fillRect(bx, by, 84, 38);
    mbCtx.fillStyle = '#0f172a';
    mbCtx.font = '900 22px system-ui, sans-serif';
    mbCtx.fillText(ln, bx + 42, by + 27);
  });
  paintWeatheringAndScorch(mbCtx, 256, 512, 5);
  const metrobusSign = new THREE.CanvasTexture(mbCanvas);
  metrobusSign.colorSpace = THREE.SRGBColorSpace;
  metrobusSign.anisotropy = Math.min(8, maxAnisotropy);
  metrobusSign.needsUpdate = true;

  // Weathered White & Red-stripe Porteño Colectivo (matching foreground bus in photo)
  const busCanvas = document.createElement('canvas');
  busCanvas.width = 512;
  busCanvas.height = 256;
  const bCtx = busCanvas.getContext('2d')!;
  bCtx.fillStyle = '#c8cdc9';
  bCtx.fillRect(0, 0, 512, 256);
  bCtx.fillStyle = '#8b2420';
  bCtx.fillRect(0, 0, 512, 26);
  bCtx.fillRect(0, 146, 512, 34);
  bCtx.fillStyle = '#1b2024';
  bCtx.fillRect(0, 180, 512, 76);
  // Broken / dusty passenger windows
  for (let wx = 24; wx < 472; wx += 74) {
    bCtx.fillStyle = wx % 148 === 24 ? '#080b0d' : '#162029';
    bCtx.fillRect(wx, 38, 62, 92);
  }
  bCtx.fillStyle = '#d4d4d8';
  bCtx.font = '900 18px system-ui, sans-serif';
  bCtx.textAlign = 'center';
  bCtx.fillText('LÍNEA 59 · CONSTITUCIÓN - OBELISCO', 256, 168);
  paintWeatheringAndScorch(bCtx, 512, 256, 7);
  const busLivery = new THREE.CanvasTexture(busCanvas);
  busLivery.colorSpace = THREE.SRGBColorSpace;
  busLivery.anisotropy = Math.min(8, maxAnisotropy);
  busLivery.needsUpdate = true;

  // Weathered Red Porteño Tourist / Double-decker style Bus (matching red bus near plaza in photo)
  const redBusCanvas = document.createElement('canvas');
  redBusCanvas.width = 512;
  redBusCanvas.height = 256;
  const rbCtx = redBusCanvas.getContext('2d')!;
  rbCtx.fillStyle = '#7c211d';
  rbCtx.fillRect(0, 0, 512, 256);
  rbCtx.fillStyle = '#d4a11e';
  rbCtx.fillRect(0, 140, 512, 18);
  rbCtx.fillStyle = '#241817';
  rbCtx.fillRect(0, 194, 512, 62);
  for (let wx = 26; wx < 470; wx += 72) {
    rbCtx.fillStyle = wx % 144 === 26 ? '#090b0d' : '#182128';
    rbCtx.fillRect(wx, 32, 58, 88);
  }
  paintWeatheringAndScorch(rbCtx, 512, 256, 13);
  const busLiveryRed = new THREE.CanvasTexture(redBusCanvas);
  busLiveryRed.colorSpace = THREE.SRGBColorSpace;
  busLiveryRed.anisotropy = Math.min(8, maxAnisotropy);
  busLiveryRed.needsUpdate = true;

  // Shattered/torn rooftop billboard A (steel truss lattice + ripped weathered banner + jagged hole)
  const bbACanvas = document.createElement('canvas');
  bbACanvas.width = 512;
  bbACanvas.height = 192;
  const baCtx = bbACanvas.getContext('2d')!;
  baCtx.fillStyle = '#0d1012';
  baCtx.fillRect(0, 0, 512, 192);
  // Exposed dark steel support lattice behind torn vinyl
  baCtx.strokeStyle = '#333b3e';
  baCtx.lineWidth = 3;
  for (let gx = 16; gx < 512; gx += 32) {
    baCtx.beginPath();
    baCtx.moveTo(gx, 0);
    baCtx.lineTo(gx, 192);
    baCtx.stroke();
  }
  for (let gy = 16; gy < 192; gy += 32) {
    baCtx.beginPath();
    baCtx.moveTo(0, gy);
    baCtx.lineTo(512, gy);
    baCtx.stroke();
  }
  // Remaining torn faded gray-blue billboard canvas on left & top
  baCtx.fillStyle = '#5c666c';
  baCtx.beginPath();
  baCtx.moveTo(0, 0);
  baCtx.lineTo(492, 0);
  baCtx.lineTo(486, 86);
  baCtx.lineTo(410, 128);
  baCtx.lineTo(368, 72);
  baCtx.lineTo(306, 165);
  baCtx.lineTo(240, 118);
  baCtx.lineTo(185, 186);
  baCtx.lineTo(0, 186);
  baCtx.closePath();
  baCtx.fill();
  // Faded silhouette print + rust drips
  baCtx.fillStyle = 'rgba(20, 26, 30, 0.35)';
  baCtx.fillRect(36, 28, 170, 96);
  baCtx.fillStyle = '#9aa4a8';
  baCtx.font = '800 28px system-ui, sans-serif';
  baCtx.fillText('BS AS 2050', 48, 152);
  paintWeatheringAndScorch(baCtx, 512, 192, 23);
  const billboardA = new THREE.CanvasTexture(bbACanvas);
  billboardA.colorSpace = THREE.SRGBColorSpace;
  billboardA.anisotropy = Math.min(8, maxAnisotropy);
  billboardA.needsUpdate = true;

  // Shattered dead black LED jumbotron B / broken giant facade screen
  const makeBrokenLedTexture = (variant: 'rooftop' | 'facade') => {
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = variant === 'rooftop' ? 224 : 384;
    const c = cv.getContext('2d')!;
    const ch = cv.height;

    // Dead dark matte LED cabinet grid
    c.fillStyle = '#121518';
    c.fillRect(0, 0, 512, ch);
    c.strokeStyle = '#22272c';
    c.lineWidth = 2;
    for (let x = 0; x < 512; x += 32) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, ch);
      c.stroke();
    }
    for (let y = 0; y < ch; y += 32) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(512, y);
      c.stroke();
    }

    // Faded burned-in commercial outline remnant
    c.fillStyle = 'rgba(85, 68, 48, 0.14)';
    c.fillRect(210, 42, 250, ch - 84);
    c.fillStyle = 'rgba(130, 110, 82, 0.22)';
    c.font = '700 26px system-ui, sans-serif';
    c.textAlign = 'center';
    c.fillText('ZONA CERO', 330, ch * 0.52);

    // Massive jagged caved-in hole exposing dark interior frame & dangling wires
    c.fillStyle = '#050607';
    c.beginPath();
    if (variant === 'rooftop') {
      c.moveTo(90, ch);
      c.lineTo(132, ch * 0.56);
      c.lineTo(220, ch * 0.62);
      c.lineTo(290, ch * 0.44);
      c.lineTo(395, ch * 0.58);
      c.lineTo(448, ch);
    } else {
      c.moveTo(18, 22);
      c.lineTo(178, 34);
      c.lineTo(144, ch * 0.36);
      c.lineTo(212, ch * 0.54);
      c.lineTo(156, ch * 0.82);
      c.lineTo(22, ch * 0.92);
    }
    c.closePath();
    c.fill();

    // Jagged steel frame border
    c.strokeStyle = '#3a4044';
    c.lineWidth = 10;
    c.strokeRect(5, 5, 502, ch - 10);

    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, maxAnisotropy);
    t.needsUpdate = true;
    return t;
  };

  const billboardB = makeBrokenLedTexture('rooftop');
  const brokenScreen = makeBrokenLedTexture('facade');

  // Authentic Porteño medianera (party wall with weathered stucco, exposed brick & 2050 graffiti)
  const medCanvas = document.createElement('canvas');
  medCanvas.width = 512;
  medCanvas.height = 512;
  const mCtx = medCanvas.getContext('2d')!;
  mCtx.fillStyle = '#6f6a61';
  mCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 42; i++) {
    const sx = Math.abs((Math.sin(i * 19.3) * 4375.5) % 1) * 460;
    const sy = Math.abs((Math.sin(i * 41.7) * 2911.3) % 1) * 460;
    const sw = 38 + (i % 5) * 18;
    const sh = 26 + (i % 4) * 16;
    mCtx.fillStyle = i % 3 === 0 ? '#5c554e' : i % 3 === 1 ? '#7c766d' : '#4a433d';
    mCtx.fillRect(sx, sy, sw, sh);
  }
  mCtx.fillStyle = '#6b382c';
  mCtx.fillRect(110, 210, 148, 124);
  mCtx.strokeStyle = '#8b8072';
  mCtx.lineWidth = 2;
  for (let by = 216; by < 334; by += 12) {
    mCtx.beginPath();
    mCtx.moveTo(110, by);
    mCtx.lineTo(258, by);
    mCtx.stroke();
  }
  mCtx.fillStyle = 'rgba(20, 22, 26, 0.28)';
  for (let i = 0; i < 9; i++) {
    const ax = 48 + i * 52;
    mCtx.fillRect(ax, 120 + (i % 3) * 85, 22, 14);
    mCtx.fillRect(ax + 5, 134 + (i % 3) * 85, 10, 55);
  }
  paintWeatheringAndScorch(mCtx, 512, 512, 31);
  mCtx.fillStyle = 'rgba(155, 28, 28, 0.72)';
  mCtx.font = '900 26px system-ui, sans-serif';
  mCtx.fillText('ZONA ROJA · 2050', 48, 430);
  mCtx.fillStyle = 'rgba(214, 142, 18, 0.75)';
  mCtx.font = '800 22px system-ui, sans-serif';
  mCtx.fillText('REFUGIO EN EL COLÓN ↑', 48, 468);
  const medianeraWall = new THREE.CanvasTexture(medCanvas);
  medianeraWall.colorSpace = THREE.SRGBColorSpace;
  medianeraWall.wrapS = THREE.RepeatWrapping;
  medianeraWall.wrapT = THREE.RepeatWrapping;
  medianeraWall.anisotropy = Math.min(8, maxAnisotropy);
  medianeraWall.needsUpdate = true;

  // Quarantine / Damaged Outbreak Warning Sign
  const qCanvas = document.createElement('canvas');
  qCanvas.width = 256;
  qCanvas.height = 192;
  const qCtx = qCanvas.getContext('2d')!;
  qCtx.fillStyle = '#ca970c';
  qCtx.fillRect(0, 0, 256, 192);
  qCtx.fillStyle = '#18181b';
  for (let sx = -32; sx < 280; sx += 36) {
    qCtx.beginPath();
    qCtx.moveTo(sx, 0);
    qCtx.lineTo(sx + 18, 0);
    qCtx.lineTo(sx - 6, 26);
    qCtx.lineTo(sx - 24, 26);
    qCtx.closePath();
    qCtx.fill();
    qCtx.beginPath();
    qCtx.moveTo(sx, 166);
    qCtx.lineTo(sx + 18, 166);
    qCtx.lineTo(sx - 6, 192);
    qCtx.lineTo(sx - 24, 192);
    qCtx.closePath();
    qCtx.fill();
  }
  qCtx.fillStyle = '#111827';
  qCtx.fillRect(10, 32, 236, 128);
  qCtx.fillStyle = '#dc2626';
  qCtx.font = '900 24px system-ui, sans-serif';
  qCtx.textAlign = 'center';
  qCtx.fillText('CUARENTENA 2050', 128, 70);
  qCtx.fillStyle = '#eab308';
  qCtx.font = '700 17px system-ui, sans-serif';
  qCtx.fillText('BROTE C-50 · NO PASAR', 128, 102);
  qCtx.fillStyle = '#94a3b8';
  qCtx.font = '700 15px system-ui, sans-serif';
  qCtx.fillText('EVACUACIÓN AV. 9 DE JULIO', 128, 134);
  const quarantineSign = new THREE.CanvasTexture(qCanvas);
  quarantineSign.colorSpace = THREE.SRGBColorSpace;
  quarantineSign.anisotropy = Math.min(8, maxAnisotropy);
  quarantineSign.needsUpdate = true;

  // Teatro Colón neoclassical golden marquee sign
  const tcCanvas = document.createElement('canvas');
  tcCanvas.width = 512;
  tcCanvas.height = 128;
  const tCtx = tcCanvas.getContext('2d')!;
  tCtx.fillStyle = '#291c12';
  tCtx.fillRect(0, 0, 512, 128);
  tCtx.strokeStyle = '#d4af37';
  tCtx.lineWidth = 6;
  tCtx.strokeRect(8, 8, 496, 112);
  tCtx.fillStyle = '#fef3c7';
  tCtx.font = '700 48px Georgia, serif';
  tCtx.textAlign = 'center';
  tCtx.fillText('TEATRO COLÓN', 256, 72);
  tCtx.fillStyle = '#d4af37';
  tCtx.font = '600 18px system-ui, sans-serif';
  tCtx.fillText('BUENOS AIRES · REFUGIO SEGURO', 256, 104);
  const colonMarquee = new THREE.CanvasTexture(tcCanvas);
  colonMarquee.colorSpace = THREE.SRGBColorSpace;
  colonMarquee.anisotropy = Math.min(8, maxAnisotropy);
  colonMarquee.needsUpdate = true;

  return {
    classicFacade: classic.map,
    classicEmissive: classic.emissive,
    modernGlass: modern.map,
    modernEmissive: modern.emissive,
    whiteRationalist: whiteRat.map,
    whiteRationalistEmissive: whiteRat.emissive,
    verticalGarden,
    foliageLeaf,
    plazaPaver,
    metrobusSign,
    busLivery,
    busLiveryRed,
    billboardA,
    billboardB,
    brokenScreen,
    medianeraWall,
    quarantineSign,
    colonMarquee,
    dispose: () => {
      classic.map.dispose();
      classic.emissive.dispose();
      modern.map.dispose();
      modern.emissive.dispose();
      whiteRat.map.dispose();
      whiteRat.emissive.dispose();
      verticalGarden.dispose();
      foliageLeaf.dispose();
      plazaPaver.dispose();
      metrobusSign.dispose();
      busLivery.dispose();
      busLiveryRed.dispose();
      billboardA.dispose();
      billboardB.dispose();
      brokenScreen.dispose();
      medianeraWall.dispose();
      quarantineSign.dispose();
      colonMarquee.dispose();
    },
  };
}

export function createMoonTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#e2ecfa';
  ctx.fillRect(0, 0, size, size);

  const grad = ctx.createRadialGradient(size * 0.42, size * 0.38, 6, size * 0.5, size * 0.5, size * 0.52);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.96)');
  grad.addColorStop(0.7, 'rgba(214, 228, 248, 0.92)');
  grad.addColorStop(1.0, 'rgba(155, 178, 210, 0.85)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Subtle lunar maria & crater shading
  const maria = [
    { x: 44, y: 42, r: 19, a: 0.22 },
    { x: 74, y: 50, r: 22, a: 0.18 },
    { x: 56, y: 74, r: 16, a: 0.2 },
    { x: 84, y: 78, r: 12, a: 0.15 },
    { x: 36, y: 68, r: 10, a: 0.14 },
  ];
  maria.forEach((m) => {
    const mg = ctx.createRadialGradient(m.x, m.y, 1, m.x, m.y, m.r);
    mg.addColorStop(0, `rgba(110, 128, 158, ${m.a})`);
    mg.addColorStop(1, 'rgba(110, 128, 158, 0)');
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    ctx.fill();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export interface WindDebrisTextures {
  newspaper: THREE.CanvasTexture;
  paper: THREE.CanvasTexture;
  leaf: THREE.CanvasTexture;
  dispose: () => void;
}

export function createWindDebrisTextures(): WindDebrisTextures {
  // 1. Aged Porteño newspaper page
  const npCanvas = document.createElement('canvas');
  npCanvas.width = 128;
  npCanvas.height = 128;
  const npCtx = npCanvas.getContext('2d')!;
  npCtx.fillStyle = '#ddd6c4';
  npCtx.fillRect(2, 2, 124, 124);
  npCtx.strokeStyle = 'rgba(72, 62, 48, 0.35)';
  npCtx.lineWidth = 2;
  npCtx.strokeRect(4, 4, 120, 120);
  // Headline masthead & urgent outbreak headline
  npCtx.fillStyle = '#22262c';
  npCtx.fillRect(10, 10, 108, 14);
  npCtx.fillStyle = '#7f1d1d';
  npCtx.fillRect(10, 28, 108, 10);
  // Dual-column newsprint text lines + small greyscale photo box
  npCtx.fillStyle = 'rgba(40, 42, 46, 0.55)';
  npCtx.fillRect(10, 44, 50, 34);
  npCtx.fillStyle = 'rgba(45, 45, 48, 0.45)';
  for (let y = 45; y < 114; y += 7) {
    if (y < 82) {
      npCtx.fillRect(66, y, 52, 3);
    } else {
      npCtx.fillRect(10, y, 48, 3);
      npCtx.fillRect(66, y, 52, 3);
    }
  }
  // Weathering stain
  npCtx.fillStyle = 'rgba(116, 94, 62, 0.22)';
  npCtx.beginPath();
  npCtx.arc(92, 92, 20, 0, Math.PI * 2);
  npCtx.fill();

  const newspaper = new THREE.CanvasTexture(npCanvas);
  newspaper.colorSpace = THREE.SRGBColorSpace;
  newspaper.needsUpdate = true;

  // 2. Crumpled street flyer / loose paper
  const pCanvas = document.createElement('canvas');
  pCanvas.width = 64;
  pCanvas.height = 64;
  const pCtx = pCanvas.getContext('2d')!;
  pCtx.clearRect(0, 0, 64, 64);
  pCtx.fillStyle = '#ece6d8';
  pCtx.beginPath();
  pCtx.moveTo(6, 4);
  pCtx.lineTo(58, 7);
  pCtx.lineTo(55, 59);
  pCtx.lineTo(8, 56);
  pCtx.closePath();
  pCtx.fill();
  pCtx.fillStyle = 'rgba(52, 56, 64, 0.4)';
  for (let y = 14; y < 50; y += 8) {
    pCtx.fillRect(13, y, 36 - ((y * 3) % 12), 2.5);
  }
  pCtx.strokeStyle = 'rgba(130, 118, 98, 0.32)';
  pCtx.lineWidth = 1.5;
  pCtx.beginPath();
  pCtx.moveTo(8, 32);
  pCtx.lineTo(56, 28);
  pCtx.stroke();

  const paper = new THREE.CanvasTexture(pCanvas);
  paper.colorSpace = THREE.SRGBColorSpace;
  paper.needsUpdate = true;

  // 3. Dry autumnal leaf silhouette (tinted per instance)
  const lCanvas = document.createElement('canvas');
  lCanvas.width = 64;
  lCanvas.height = 64;
  const lCtx = lCanvas.getContext('2d')!;
  lCtx.clearRect(0, 0, 64, 64);
  lCtx.fillStyle = '#ffffff';
  lCtx.beginPath();
  lCtx.moveTo(32, 6);
  lCtx.bezierCurveTo(50, 16, 56, 36, 32, 56);
  lCtx.bezierCurveTo(8, 36, 14, 16, 32, 6);
  lCtx.fill();
  // Stem & veins
  lCtx.strokeStyle = 'rgba(70, 48, 28, 0.55)';
  lCtx.lineWidth = 2;
  lCtx.beginPath();
  lCtx.moveTo(32, 10);
  lCtx.lineTo(32, 61);
  lCtx.moveTo(32, 24);
  lCtx.lineTo(43, 18);
  lCtx.moveTo(32, 34);
  lCtx.lineTo(20, 27);
  lCtx.moveTo(32, 42);
  lCtx.lineTo(42, 36);
  lCtx.stroke();

  const leaf = new THREE.CanvasTexture(lCanvas);
  leaf.colorSpace = THREE.SRGBColorSpace;
  leaf.needsUpdate = true;

  return {
    newspaper,
    paper,
    leaf,
    dispose: () => {
      newspaper.dispose();
      paper.dispose();
      leaf.dispose();
    },
  };
}


