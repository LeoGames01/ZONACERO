import React from 'react';
import {
  ARENA_HALF_X,
  ARENA_HALF_Z,
  ARENA_PLAYABLE_RADIUS,
  CAMPFIRE_SAFE_RADIUS,
  COLON_BUILDING_X,
  COLON_BUILDING_Z,
  COLON_ENTRANCE_X,
  COLON_ENTRANCE_Z,
  COLON_SAFE_RADIUS,
  getCampfireCoords,
} from '../game/models';
import { COLON_VEHICLE_BAY_POS } from '../game/colonInterior';
import { FASTFOOD_CENTER_X, FASTFOOD_CENTER_Z } from '../game/fastFoodBuilding';
import type { MapPresetId, PlacedWorldProp, RadarBlip, WorldZoneId } from '../game/types';

const RADAR_WORLD_SPAN = 132;

interface MiniMapProps {
  playerPos: { x: number; z: number };
  playerYaw: number;
  camYaw: number;
  enemies: RadarBlip[];
  nearCampfire: boolean;
  mobileLayout?: boolean;
  mapPreset?: MapPresetId;
  placedProps?: PlacedWorldProp[];
  backpackPos?: { x: number; z: number } | null;
  colonPos?: { x: number; z: number } | null;
  colonUnlocked?: boolean;
  activeZone?: WorldZoneId;
  currentFloor?: 0 | 1 | 2;
  allyPos?: { x: number; z: number } | null;
  baseUnlocked?: boolean;
  mechanicPos?: { x: number; z: number } | null;
  targetPos?: { x: number; z: number } | null;
  vehicleBayUnlocked?: boolean;
}

function worldToRadar(
  wx: number,
  wz: number,
  center: number,
  mapRadius: number,
  isSandbox = false,
): { rx: number; ry: number; clamped: boolean } {
  const span = isSandbox ? ARENA_PLAYABLE_RADIUS : RADAR_WORLD_SPAN;
  const dist = Math.hypot(wx, wz);
  const scale = dist > span ? span / dist : 1;
  const x = wx * scale;
  const z = wz * scale;
  return {
    rx: center + (x / span) * mapRadius,
    ry: center + (z / span) * mapRadius,
    clamped: dist > span,
  };
}

function colonToRadar(
  wx: number,
  wz: number,
  center: number,
  mapRadius: number,
): { rx: number; ry: number; clamped: boolean } {
  const nx = wx / 33;
  const nz = (wz + 2) / 33;
  const dist = Math.hypot(nx, nz);
  const scale = dist > 0.96 ? 0.96 / dist : 1;
  return {
    rx: center + nx * scale * mapRadius,
    ry: center + nz * scale * mapRadius,
    clamped: dist > 0.96,
  };
}

const MiniMapInner: React.FC<MiniMapProps> = ({
  playerPos,
  playerYaw,
  camYaw,
  enemies,
  nearCampfire,
  mobileLayout = false,
  mapPreset = 'buenos_aires',
  placedProps = [],
  backpackPos = null,
  colonPos = { x: COLON_ENTRANCE_X, z: COLON_ENTRANCE_Z },
  colonUnlocked = false,
  activeZone = 'exterior_9_julio',
  currentFloor = 0,
  allyPos = null,
  baseUnlocked = false,
  mechanicPos = null,
  targetPos = null,
  vehicleBayUnlocked = false,
}) => {
  const size = mobileLayout ? 78 : 108;
  const center = size / 2;
  const mapRadius = mobileLayout ? 35 : 49;
  const isSandbox = mapPreset === 'custom_sandbox';
  const isColonInterior = activeZone === 'colon_interior';
  const worldSpan = isSandbox ? ARENA_PLAYABLE_RADIUS : RADAR_WORLD_SPAN;
  const toRadar = (wx: number, wz: number, c: number, r: number) =>
    isColonInterior ? colonToRadar(wx, wz, c, r) : worldToRadar(wx, wz, c, r, isSandbox);

  const playerPt = toRadar(playerPos.x, playerPos.z, center, mapRadius);
  const cfCoords = getCampfireCoords(mapPreset);
  const campPt = worldToRadar(cfCoords.x, cfCoords.z, center, mapRadius, isSandbox);
  const obeliscoPt = worldToRadar(0, -2.2, center, mapRadius, isSandbox);
  const baPt = worldToRadar(0, 5.4, center, mapRadius, isSandbox);
  const colonBldgPt = worldToRadar(COLON_BUILDING_X, COLON_BUILDING_Z, center, mapRadius, isSandbox);
  const fastFoodPt = worldToRadar(FASTFOOD_CENTER_X, FASTFOOD_CENTER_Z, center, mapRadius, isSandbox);
  const colonTargetPt = colonPos
    ? worldToRadar(colonPos.x, colonPos.z, center, mapRadius, isSandbox)
    : null;
  const missionTargetPt = targetPos
    ? toRadar(targetPos.x, targetPos.z, center, mapRadius)
    : null;
  const backpackPt = backpackPos
    ? toRadar(backpackPos.x, backpackPos.z, center, mapRadius)
    : null;
  const workbenchPt = colonToRadar(27.6, 6.2, center, mapRadius);
  const vehicleBayPt = colonToRadar(
    COLON_VEHICLE_BAY_POS.x,
    COLON_VEHICLE_BAY_POS.z,
    center,
    mapRadius,
  );
  const interiorExitPt = colonToRadar(0, 28.8, center, mapRadius);
  const allyPt = allyPos ? colonToRadar(allyPos.x, allyPos.z, center, mapRadius) : null;
  const mechanicPt = mechanicPos
    ? toRadar(mechanicPos.x, mechanicPos.z, center, mapRadius)
    : null;

  const safeZoneR = (CAMPFIRE_SAFE_RADIUS / worldSpan) * mapRadius;
  const colonSafeR = (COLON_SAFE_RADIUS / worldSpan) * mapRadius;
  const metrobusLeftX = center + (-14.2 / worldSpan) * mapRadius;
  const metrobusRightX = center + (14.2 / worldSpan) * mapRadius;
  const plazaW = (20.4 / worldSpan) * mapRadius;
  const plazaH = (23.4 / worldSpan) * mapRadius;
  const colonW = (21.0 / worldSpan) * mapRadius;
  const colonH = (22.0 / worldSpan) * mapRadius;
  const fastFoodW = (23.0 / worldSpan) * mapRadius;
  const fastFoodH = (22.0 / worldSpan) * mapRadius;
  const perimW = ((ARENA_HALF_X * 2) / worldSpan) * mapRadius;
  const perimH = ((ARENA_HALF_Z * 2) / worldSpan) * mapRadius;
  const streetX9 = (36 / worldSpan) * mapRadius;
  const libertadX = center + (-70.5 / worldSpan) * mapRadius;
  const suipachaX = center + (70.5 / worldSpan) * mapRadius;
  const streetSideW = (11 / worldSpan) * mapRadius;
  const crossOffsets = [
    { z: 0, halfW: 7.5 },
    { z: -40, halfW: 5.0 },
    { z: -78, halfW: 5.0 },
    { z: 40, halfW: 5.0 },
    { z: 78, halfW: 5.0 },
  ];

  const camDeg = (-camYaw * 180) / Math.PI;
  const playerDeg = ((Math.PI - playerYaw) * 180) / Math.PI;

  return (
    <div
      aria-label="Minimapa táctico"
      className={`pointer-events-none fixed rounded-full bg-[#090c12]/72 border border-white/14 p-1 ${
        mobileLayout ? 'top-14 right-3 sm:right-5' : 'bottom-4 right-5'
      }`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="block rounded-full bg-[#070a0f]/85"
      >
        <defs>
          <radialGradient id="fovCone" cx="50%" cy="100%" r="85%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
          </radialGradient>
          <clipPath id="radarClip">
            <circle cx={center} cy={center} r={mapRadius - 0.5} />
          </clipPath>
        </defs>

        {isColonInterior ? (
          <>
            {/* Escenario Norte */}
            <rect
              x={center - (13 / 33) * mapRadius}
              y={center + (-26 / 33) * mapRadius}
              width={(26 / 33) * mapRadius}
              height={(11.5 / 33) * mapRadius}
              rx="2"
              fill="#451a03"
              fillOpacity="0.65"
              stroke="#b45309"
              strokeOpacity="0.55"
              strokeWidth="0.7"
            />
            {/* Platea / Salón Principal */}
            <rect
              x={center - (14 / 33) * mapRadius}
              y={center + (-14 / 33) * mapRadius}
              width={(28 / 33) * mapRadius}
              height={(30 / 33) * mapRadius}
              rx="4"
              fill="#7f1d1d"
              fillOpacity="0.38"
              stroke="#f59e0b"
              strokeOpacity="0.45"
              strokeWidth="0.7"
            />
            {/* Foyer Sur */}
            <rect
              x={center - (21 / 33) * mapRadius}
              y={center + (17 / 33) * mapRadius}
              width={(42 / 33) * mapRadius}
              height={(13 / 33) * mapRadius}
              rx="2"
              fill="#334155"
              fillOpacity="0.42"
            />
            {/* Sala de Máquinas / Calderas (NW) */}
            <rect
              x={center + (-30 / 33) * mapRadius}
              y={center + (-30 / 33) * mapRadius}
              width={(12 / 33) * mapRadius}
              height={(13 / 33) * mapRadius}
              rx="1.5"
              fill="#1e293b"
              fillOpacity="0.75"
              stroke="#38bdf8"
              strokeOpacity="0.45"
              strokeWidth="0.7"
            />
            {/* Sala Dorada / Base Permanente (E) */}
            <rect
              x={center + (21.5 / 33) * mapRadius}
              y={center + (-2 / 33) * mapRadius}
              width={(9.5 / 33) * mapRadius}
              height={(16 / 33) * mapRadius}
              rx="1.5"
              fill={baseUnlocked ? '#064e3b' : '#422006'}
              fillOpacity="0.72"
              stroke={baseUnlocked ? '#34d399' : '#f59e0b'}
              strokeOpacity="0.75"
              strokeWidth="0.8"
            />
            {/* Taller Mecánico / Bahía de Vehículos (NE) */}
            <rect
              x={center + (21.5 / 33) * mapRadius}
              y={center + (-24 / 33) * mapRadius}
              width={(9.5 / 33) * mapRadius}
              height={(18 / 33) * mapRadius}
              rx="1.5"
              fill={vehicleBayUnlocked ? '#1e3a8a' : '#1e293b'}
              fillOpacity={vehicleBayUnlocked ? 0.72 : 0.45}
              stroke={vehicleBayUnlocked ? '#f59e0b' : '#475569'}
              strokeOpacity={vehicleBayUnlocked ? 0.85 : 0.45}
              strokeWidth="0.8"
            />
            {/* Escaleras Principales PB ↔ P1 */}
            <rect
              x={center + (-13.2 / 33) * mapRadius}
              y={center + (16.0 / 33) * mapRadius}
              width={(4.2 / 33) * mapRadius}
              height={(10.2 / 33) * mapRadius}
              rx="0.8"
              fill="#f59e0b"
              fillOpacity="0.45"
              stroke="#fde68a"
              strokeWidth="0.6"
            />
            <rect
              x={center + (9.0 / 33) * mapRadius}
              y={center + (16.0 / 33) * mapRadius}
              width={(4.2 / 33) * mapRadius}
              height={(10.2 / 33) * mapRadius}
              rx="0.8"
              fill="#f59e0b"
              fillOpacity="0.45"
              stroke="#fde68a"
              strokeWidth="0.6"
            />
            {/* Escaleras Superiores P1 ↔ P2 */}
            <rect
              x={center + (-25.4 / 33) * mapRadius}
              y={center + (2.0 / 33) * mapRadius}
              width={(3.6 / 33) * mapRadius}
              height={(12.0 / 33) * mapRadius}
              rx="0.8"
              fill="#38bdf8"
              fillOpacity="0.38"
              stroke="#bae6fd"
              strokeWidth="0.6"
            />
            <rect
              x={center + (21.8 / 33) * mapRadius}
              y={center + (2.0 / 33) * mapRadius}
              width={(3.6 / 33) * mapRadius}
              height={(12.0 / 33) * mapRadius}
              rx="0.8"
              fill="#38bdf8"
              fillOpacity="0.38"
              stroke="#bae6fd"
              strokeWidth="0.6"
            />
          </>
        ) : isSandbox ? (
          <>
            <line
              x1={center}
              y1={6}
              x2={center}
              y2={size - 6}
              stroke="#334155"
              strokeOpacity="0.55"
              strokeWidth="0.7"
              strokeDasharray="2 2"
            />
            <line
              x1={6}
              y1={center}
              x2={size - 6}
              y2={center}
              stroke="#334155"
              strokeOpacity="0.55"
              strokeWidth="0.7"
              strokeDasharray="2 2"
            />
            <circle
              cx={center}
              cy={center}
              r={mapRadius * 0.55}
              fill="none"
              stroke="#334155"
              strokeOpacity="0.45"
              strokeWidth="0.7"
            />
          </>
        ) : (
          <g clipPath="url(#radarClip)">
            {/* Av. 9 de Julio wide carriageway + Libertad & Suipacha parallel streets */}
            <rect
              x={center - streetX9}
              y={center - perimH * 0.5}
              width={streetX9 * 2}
              height={perimH}
              fill="#1e293b"
              fillOpacity="0.42"
            />
            <rect
              x={libertadX - streetSideW * 0.5}
              y={center - perimH * 0.5}
              width={streetSideW}
              height={perimH}
              fill="#1e293b"
              fillOpacity="0.3"
            />
            <rect
              x={suipachaX - streetSideW * 0.5}
              y={center - perimH * 0.5}
              width={streetSideW}
              height={perimH}
              fill="#1e293b"
              fillOpacity="0.3"
            />
            {/* Av. Corrientes, Lavalle, Córdoba, Sarmiento & Rivadavia cross-streets */}
            {crossOffsets.map((cs) => (
              <rect
                key={cs.z}
                x={center - perimW * 0.5}
                y={center + ((cs.z - cs.halfW) / worldSpan) * mapRadius}
                width={perimW}
                height={((cs.halfW * 2) / worldSpan) * mapRadius}
                fill="#1e293b"
                fillOpacity={cs.z === 0 ? 0.38 : 0.28}
              />
            ))}

            {/* Metrobus 9 de Julio lanes */}
            <line
              x1={metrobusLeftX}
              y1={center - perimH * 0.5}
              x2={metrobusLeftX}
              y2={center + perimH * 0.5}
              stroke="#eab308"
              strokeOpacity="0.45"
              strokeWidth="1.2"
              strokeDasharray="2.5 1.8"
            />
            <line
              x1={metrobusRightX}
              y1={center - perimH * 0.5}
              x2={metrobusRightX}
              y2={center + perimH * 0.5}
              stroke="#eab308"
              strokeOpacity="0.45"
              strokeWidth="1.2"
              strokeDasharray="2.5 1.8"
            />

            {/* Plaza de la República */}
            <rect
              x={center - plazaW * 0.5}
              y={center - plazaH * 0.5}
              width={plazaW}
              height={plazaH}
              rx="1.6"
              fill="#334155"
              fillOpacity="0.6"
              stroke="#64748b"
              strokeOpacity="0.45"
              strokeWidth="0.65"
            />

            {/* Teatro Colón landmark footprint (W block 1 North) */}
            <rect
              x={colonBldgPt.rx - colonW * 0.5}
              y={colonBldgPt.ry - colonH * 0.5}
              width={colonW}
              height={colonH}
              rx="1.4"
              fill={colonUnlocked ? '#064e3b' : '#451a03'}
              fillOpacity="0.72"
              stroke={colonUnlocked ? '#34d399' : '#f59e0b'}
              strokeOpacity="0.75"
              strokeWidth="0.75"
            />

            {/* Mc-Porteño 24H Fast Food corner restaurant (SE block) */}
            <rect
              x={fastFoodPt.rx - fastFoodW * 0.5}
              y={fastFoodPt.ry - fastFoodH * 0.5}
              width={fastFoodW}
              height={fastFoodH}
              rx="1.4"
              fill="#7f1d1d"
              fillOpacity="0.74"
              stroke="#fbbf24"
              strokeOpacity="0.82"
              strokeWidth="0.75"
            />

            {/* Blocked street mouths (bocacalles) at outer city grid edges */}
            {[
              { x1: -36, y1: -ARENA_HALF_Z, x2: 36, y2: -ARENA_HALF_Z },
              { x1: -36, y1: ARENA_HALF_Z, x2: 36, y2: ARENA_HALF_Z },
              { x1: -76, y1: -ARENA_HALF_Z, x2: -65, y2: -ARENA_HALF_Z },
              { x1: 65, y1: -ARENA_HALF_Z, x2: 76, y2: -ARENA_HALF_Z },
              { x1: -76, y1: ARENA_HALF_Z, x2: -65, y2: ARENA_HALF_Z },
              { x1: 65, y1: ARENA_HALF_Z, x2: 76, y2: ARENA_HALF_Z },
              { x1: -ARENA_HALF_X, y1: -8, x2: -ARENA_HALF_X, y2: 8 },
              { x1: ARENA_HALF_X, y1: -8, x2: ARENA_HALF_X, y2: 8 },
              { x1: -ARENA_HALF_X, y1: -45, x2: -ARENA_HALF_X, y2: -35 },
              { x1: ARENA_HALF_X, y1: -45, x2: ARENA_HALF_X, y2: -35 },
              { x1: -ARENA_HALF_X, y1: 35, x2: -ARENA_HALF_X, y2: 45 },
              { x1: ARENA_HALF_X, y1: 35, x2: ARENA_HALF_X, y2: 45 },
              { x1: -ARENA_HALF_X, y1: -83, x2: -ARENA_HALF_X, y2: -73 },
              { x1: ARENA_HALF_X, y1: -83, x2: ARENA_HALF_X, y2: -73 },
              { x1: -ARENA_HALF_X, y1: 73, x2: -ARENA_HALF_X, y2: 83 },
              { x1: ARENA_HALF_X, y1: 73, x2: ARENA_HALF_X, y2: 83 },
            ].map((b, idx) => (
              <line
                key={idx}
                x1={center + (b.x1 / worldSpan) * mapRadius}
                y1={center + (b.y1 / worldSpan) * mapRadius}
                x2={center + (b.x2 / worldSpan) * mapRadius}
                y2={center + (b.y2 / worldSpan) * mapRadius}
                stroke="#ef4444"
                strokeOpacity="0.82"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            ))}
          </g>
        )}

        <circle
          cx={center}
          cy={center}
          r={mapRadius}
          fill="none"
          stroke="#475569"
          strokeOpacity="0.75"
          strokeWidth="1"
        />

        <text
          x={center}
          y={8}
          textAnchor="middle"
          fill="#64748b"
          fontSize="7"
          fontWeight="700"
        >
          N
        </text>

        {isColonInterior && (
          <text
            x={center}
            y={size - 4.5}
            textAnchor="middle"
            fill="#fbbf24"
            fontSize="6.5"
            fontWeight="700"
          >
            {currentFloor === 0 ? 'PB' : currentFloor === 1 ? 'P1' : 'P2'}
          </text>
        )}

        {!isColonInterior && !isSandbox && (
          <>
            {/* El Obelisco & Gran BA markers */}
            <rect
              x={obeliscoPt.rx - 2.0}
              y={obeliscoPt.ry - 2.0}
              width={4.0}
              height={4.0}
              transform={`rotate(45 ${obeliscoPt.rx} ${obeliscoPt.ry})`}
              fill="#f8fafc"
              fillOpacity="0.88"
            />
            <rect
              x={baPt.rx - 3.2}
              y={baPt.ry - 1.0}
              width={6.4}
              height={2.0}
              rx="0.7"
              fill="#4ade80"
              fillOpacity="0.85"
            />
          </>
        )}

        {!isColonInterior &&
          placedProps.map((prop) => {
            const pt = worldToRadar(prop.x, prop.z, center, mapRadius, isSandbox);
            return (
              <rect
                key={prop.instanceId}
                x={pt.rx - 1.4}
                y={pt.ry - 1.4}
                width={2.8}
                height={2.8}
                rx="0.5"
                fill="#38bdf8"
                fillOpacity={pt.clamped ? 0.45 : 0.85}
              />
            );
          })}

        {!isColonInterior && (
          <>
            <circle
              cx={campPt.rx}
              cy={campPt.ry}
              r={safeZoneR}
              fill={nearCampfire ? 'rgba(245, 158, 11, 0.16)' : 'rgba(245, 158, 11, 0.06)'}
              stroke="#f59e0b"
              strokeOpacity="0.5"
              strokeWidth="0.9"
            />
            <polygon
              points={`${campPt.rx},${campPt.ry - 3.4} ${campPt.rx + 2.5},${campPt.ry + 2.2} ${campPt.rx - 2.5},${campPt.ry + 2.2}`}
              fill="#fb923c"
            />
            <circle cx={campPt.rx} cy={campPt.ry + 0.5} r="1.1" fill="#fef08a" />
          </>
        )}

        {isColonInterior && baseUnlocked && (
          <>
            {/* Mesa Química de Sofía */}
            <polygon
              points={`${workbenchPt.rx},${workbenchPt.ry - 3.2} ${workbenchPt.rx + 2.8},${workbenchPt.ry} ${workbenchPt.rx},${workbenchPt.ry + 3.2} ${workbenchPt.rx - 2.8},${workbenchPt.ry}`}
              fill="#34d399"
              stroke="#ecfdf5"
              strokeWidth="0.6"
            />
            {/* Taller Mecánico de Mateo */}
            {vehicleBayUnlocked && (
              <polygon
                points={`${vehicleBayPt.rx},${vehicleBayPt.ry - 3.2} ${vehicleBayPt.rx + 2.8},${vehicleBayPt.ry} ${vehicleBayPt.rx},${vehicleBayPt.ry + 3.2} ${vehicleBayPt.rx - 2.8},${vehicleBayPt.ry}`}
                fill="#f59e0b"
                stroke="#fef3c7"
                strokeWidth="0.6"
              />
            )}
            {/* Salida a Av. 9 de Julio */}
            <rect
              x={interiorExitPt.rx - 3.5}
              y={interiorExitPt.ry - 2}
              width={7}
              height={4}
              rx="1"
              fill="#38bdf8"
              stroke="#e0f2fe"
              strokeWidth="0.6"
            />
          </>
        )}

        {allyPt && (
          <circle
            cx={allyPt.rx}
            cy={allyPt.ry}
            r={2.8}
            fill="#22d3ee"
            stroke="#ecfeff"
            strokeWidth="0.8"
          />
        )}

        {mechanicPt && (
          <g>
            <circle
              cx={mechanicPt.rx}
              cy={mechanicPt.ry}
              r={4.2}
              fill="rgba(250, 204, 21, 0.2)"
              stroke="#facc15"
              strokeWidth="0.7"
            />
            <circle
              cx={mechanicPt.rx}
              cy={mechanicPt.ry}
              r={2.5}
              fill="#38bdf8"
              stroke="#fef08a"
              strokeWidth="0.8"
            />
          </g>
        )}

        {/* Teatro Colón refuge target */}
        {!isColonInterior && colonTargetPt && (
          <g>
            <circle
              cx={colonTargetPt.rx}
              cy={colonTargetPt.ry}
              r={Math.max(4.5, colonSafeR)}
              fill={colonUnlocked ? 'rgba(16, 185, 129, 0.24)' : 'rgba(245, 158, 11, 0.1)'}
              stroke={colonUnlocked ? '#34d399' : '#fbbf24'}
              strokeOpacity={colonUnlocked ? 0.95 : 0.55}
              strokeWidth={colonUnlocked ? 1.2 : 0.8}
            />
            <polygon
              points={`${colonTargetPt.rx},${colonTargetPt.ry - 3.5} ${colonTargetPt.rx + 3.1},${colonTargetPt.ry} ${colonTargetPt.rx},${colonTargetPt.ry + 3.5} ${colonTargetPt.rx - 3.1},${colonTargetPt.ry}`}
              fill={colonUnlocked ? '#10b981' : '#f59e0b'}
              stroke="#ecfdf5"
              strokeWidth="0.7"
            />
          </g>
        )}

        {/* Mission 3 active waypoint (Mc-Porteño 24H / Salida / Rescate) */}
        {missionTargetPt && !colonUnlocked && (
          <g>
            <circle
              cx={missionTargetPt.rx}
              cy={missionTargetPt.ry}
              r={5}
              fill="rgba(251, 191, 36, 0.18)"
              stroke="#fbbf24"
              strokeWidth="0.9"
            />
            <polygon
              points={`${missionTargetPt.rx},${missionTargetPt.ry - 3.2} ${missionTargetPt.rx + 2.8},${missionTargetPt.ry} ${missionTargetPt.rx},${missionTargetPt.ry + 3.2} ${missionTargetPt.rx - 2.8},${missionTargetPt.ry}`}
              fill="#facc15"
              stroke="#451a03"
              strokeWidth="0.65"
            />
          </g>
        )}

        {backpackPt && (
          <g>
            <circle
              cx={backpackPt.rx}
              cy={backpackPt.ry}
              r={4.2}
              fill="rgba(34, 211, 238, 0.22)"
              stroke="#22d3ee"
              strokeWidth="0.9"
            />
            <rect
              x={backpackPt.rx - 2.1}
              y={backpackPt.ry - 2.1}
              width={4.2}
              height={4.2}
              rx="0.9"
              fill="#06b6d4"
              stroke="#ecfeff"
              strokeWidth="0.7"
            />
          </g>
        )}

        {enemies.map((e) => {
          const pt = toRadar(e.x, e.z, center, mapRadius);
          const isHeavyGendarme = e.role === 'gendarme_heavy';
          const isGendarme = e.role === 'gendarme';
          const isPolice = e.role === 'police';
          const color = isHeavyGendarme
            ? '#facc15'
            : isGendarme
              ? '#4ade80'
              : isPolice
                ? '#38bdf8'
                : e.kind === 'brute'
                  ? '#f97316'
                  : e.kind === 'spitter'
                    ? '#84cc16'
                    : e.kind === 'runner'
                      ? '#fb7185'
                      : e.kind === 'biter'
                        ? '#b91c1c'
                        : '#ef4444';
          const radius = isHeavyGendarme
            ? 3.4
            : e.kind === 'brute'
              ? 3.0
              : e.kind === 'spitter' || isGendarme || isPolice
                ? 2.4
                : e.kind === 'runner'
                  ? 2.0
                  : 2.2;
          const enemyFloor = e.y !== undefined && e.y >= 6.8 ? 2 : e.y !== undefined && e.y >= 2.8 ? 1 : 0;
          const diffFloor = isColonInterior && enemyFloor !== currentFloor;
          return (
            <g key={e.id}>
              {isHeavyGendarme && (
                <circle
                  cx={pt.rx}
                  cy={pt.ry}
                  r={radius + 1.5}
                  fill="none"
                  stroke="#fde047"
                  strokeOpacity={diffFloor ? 0.3 : 0.85}
                  strokeWidth="0.8"
                />
              )}
              <circle
                cx={pt.rx}
                cy={pt.ry}
                r={radius}
                fill={color}
                fillOpacity={diffFloor ? 0.35 : pt.clamped ? 0.55 : 0.92}
                stroke={diffFloor ? '#94a3b8' : '#080b10'}
                strokeWidth="0.75"
              />
            </g>
          );
        })}

        <g transform={`translate(${playerPt.rx}, ${playerPt.ry})`}>
          <g transform={`rotate(${camDeg})`}>
            <polygon points="0,0 -9,-20 9,-20" fill="url(#fovCone)" />
          </g>
          <g transform={`rotate(${playerDeg})`}>
            <polygon
              points="0,-4.8 3.4,3.4 0,1.5 -3.4,3.4"
              fill="#f8fafc"
              stroke="#0f172a"
              strokeWidth="0.9"
            />
          </g>
        </g>
      </svg>
    </div>
  );
};

export const MiniMap = React.memo(MiniMapInner);

