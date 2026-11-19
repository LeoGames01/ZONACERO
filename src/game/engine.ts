import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import {
  type FootstepSurface,
  GameAudio,
  type SpatialAmbienceFrame,
  type ZombieBreathCandidate,
} from './audio';
import { dampBoneRotCharSpace, type HumanoidBoneMap } from './baseCharacter';
import {
  animateAllyChemist,
  buildAllyChemistRig,
  buildColonInteriorEnvironment,
  COLON_ALLY_BASE_POS,
  COLON_BOILER_DOOR_POS,
  COLON_INTERIOR_EXIT_POS,
  COLON_INTERIOR_SPAWN,
  COLON_MECHANIC_BASE_POS,
  COLON_VEHICLE_BAY_POS,
  COLON_WORKBENCH_POS,
  type ColonInteriorEnvironment,
} from './colonInterior';
import {
  animateMechanicNpc,
  buildMechanicNpcRig,
  FASTFOOD_CENTER_X,
  FASTFOOD_CENTER_Z,
  FASTFOOD_ENTRANCE_X,
  FASTFOOD_ENTRANCE_Z,
  FASTFOOD_INTERIOR_BOUNDS,
  FASTFOOD_MECHANIC_POS,
  type MechanicAnimMode,
  type MechanicNpcRig,
  resolveWallBoxes2D,
} from './fastFoodBuilding';
import {
  actualizarZombieSlotCountCache,
  actualizarZombieSlotTargetCache,
  cargarAttachmentTransformsLocal,
  cargarCameraSettingsLocal,
  cargarCustomCharacterSlotBuffers,
  cargarEquipmentBuffers,
  cargarMapSettingsLocal,
  cargarModeloCache,
  cargarModeloMeta,
  cargarNpcGlbBuffers,
  cargarObjectOverrideBuffers,
  cargarPistolCache,
  cargarPistolMeta,
  cargarPlacedPropsCache,
  cargarPostProcessLocal,
  cargarPropSlotBuffer,
  cargarPropSlotBuffers,
  cargarRifleCache,
  cargarRifleMeta,
  cargarTextureCache,
  cargarZombieCache,
  cargarZombieMeta,
  cargarZombieSlotBuffer,
  cargarZombieSlotBuffers,
  type CustomNpcTargetId,
  eliminarCustomCharacterSlotCache,
  eliminarEquipmentCache,
  eliminarModeloCache,
  eliminarNpcGlbCache,
  eliminarObjectOverrideCache,
  eliminarPistolCache,
  eliminarPropSlotCache,
  eliminarRifleCache,
  eliminarTextureCache,
  eliminarZombieCache,
  eliminarZombieSlotCache,
  guardarAttachmentTransformsLocal,
  guardarCameraSettingsLocal,
  guardarCustomCharacterSlotCache,
  guardarEquipmentCache,
  guardarMapSettingsLocal,
  guardarModeloCache,
  guardarNpcGlbCache,
  guardarObjectOverrideCache,
  guardarPistolCache,
  guardarPlacedPropsCache,
  guardarPostProcessLocal,
  guardarPropSlotCache,
  guardarRifleCache,
  guardarTextureCache,
  guardarZombieSlotCache,
  guardarZombieSlotsBatchCache,
  limpiarTodosObjectOverridesCache,
  limpiarTodosZombiesCache,
  listarCustomCharacterSlotsCache,
  listarEquipmentMetaCache,
  listarNpcMetaCache,
  listarObjectOverrideMetaCache,
  listarPropSlotsCache,
  listarZombieSlotsCache,
} from './modelCache';
import {
  applyBackpackOverrideToRig,
  applyEquipmentToRig,
  applyPistolToRig,
  applyPlayerAttachmentTransformsToRig,
  applyRifleToRig,
  applyZombieAttachmentTransformsToBundle,
  ARENA_HALF_X,
  ARENA_HALF_Z,
  ARENA_PLAYABLE_RADIUS,
  type BoneRest,
  buildArrowProjectileMesh,
  buildBloodStumpMesh,
  buildCampfireGroup,
  buildCharacterRigFromTemplate,
  buildDecoyRatMesh,
  buildDefaultSurvivor,
  buildEnemyMesh,
  buildFireZoneVisuals,
  buildFlameCluster,
  buildGoreChunkMesh,
  buildLootMeshGroup,
  buildNailShrapnelResources,
  buildSeveredLimbMesh,
  buildSlimySpitGlobMesh,
  buildThrownThrowableMesh,
  buildWorldEnvironment,
  CAMPFIRE_SAFE_RADIUS,
  COLON_BUILDING_X,
  COLON_BUILDING_Z,
  COLON_ENTRANCE_X,
  COLON_ENTRANCE_Z,
  COLON_SAFE_RADIUS,
  type CampfireVisuals,
  type CharacterRig,
  createDropletLatheGeometry,
  type CustomCharacterTemplate,
  type CustomEquipmentTemplate,
  type CustomObjectTemplate,
  type CustomPistolTemplate,
  type CustomPropTemplate,
  type CustomRifleTemplate,
  type CustomZombieTemplate,
  type DecoyRatVisuals,
  disposeAllSharedModelPools,
  type EnemyMeshBundle,
  equipModelWithCharacterRig,
  type FingerCurlBone,
  type FlameCluster,
  getCampfireCoords,
  getPlayerSpawnCoords,
  groundHeightAt,
  instantiatePropFromTemplate,
  isMobileRuntime,
  isOnPotholeOrPatch,
  isPointInPlazaTallGrass,
  isPointInWaterPuddle,
  type LimbId,
  LOOSE_LIGHT_PROP_SEEDS,
  type LooseLightPropKind,
  type LooseRockSeed,
  parseGlbCharacter,
  parseGlbCharacterTemplate,
  parseGlbEquipmentTemplate,
  parseGlbObjectTemplate,
  parseGlbPistolTemplate,
  parseGlbPropTemplate,
  parseGlbRifleTemplate,
  parseGlbZombieTemplate,
  PLAYER_SPAWN_X,
  PLAYER_SPAWN_Z,
  setActiveMapPreset,
  setEnemyGlowAlertVisual,
  setEnemyHitFlashVisual,
  setEnemyHpBarColor,
  type WorldCollider,
  type WorldEnvironment,
  type WorldTrashSpot,
} from './models';
import {
  CAMERA_PRESETS,
  createDefaultAttachmentTransforms,
  DEFAULT_ATTACHMENT_TRANSFORM,
  DEFAULT_CAMERA_SETTINGS,
  DEFAULT_MAP_SETTINGS,
  DEFAULT_POST_PROCESS,
  INVENTORY_ITEM_META,
  PLAYER_ATTACHABLE_DEFS,
  POST_PROCESS_PRESETS,
  PROP_CATEGORIES,
  sanitizeAttachmentTransform,
  WORLD_OBJECT_OVERRIDE_DEFS,
  ZOMBIE_ATTACHABLE_DEFS,
  ZOMBIE_PREVIEW_PRESETS,
} from './settingsDefaults';
import {
  createBarkTexture,
  createContactShadowTexture,
  createGroundBumpTexture,
  createGroundTexture,
  createSimpleTerrainTexture,
  createSkyGradientTexture,
  createStoneTexture,
  disposeSharedTextureCaches,
  getAwarenessIconTextures,
  getBloodPuddleTextures,
  getFootprintTexture,
  getSmokePuffTexture,
} from './textures';
import {
  type AttachmentTargetScope,
  type AttachmentTransform,
  type AttachmentTransformsState,
  type BaseCraftRecipeId,
  type BaseProvisions,
  type CameraPresetId,
  type CameraSettings,
  type CharacterAnimationTag,
  type CharacterEntityDescriptor,
  type CustomCharacterSlot,
  type CustomEquipmentId,
  type DifficultyId,
  type DistractionKind,
  type EnemyCarriedGear,
  type EnemyKind,
  type EnemyRole,
  type EquippedThrowableKind,
  type FastTravelDestinationId,
  type GameState,
  type HudSnapshot,
  type IntroCutsceneCaption,
  type InventoryItemKind,
  type InventorySlot,
  type LootKind,
  type MapMaterialSettings,
  type MissionObjectiveHud,
  type MissionPhaseId,
  type MovementStance,
  type PlacedWorldProp,
  type PlayerAttachableId,
  type PostProcessPreset,
  type PostProcessSettings,
  type PreviewPoseId,
  type RemoteAssetErrorDetail,
  type RemoteManifestSyncInfo,
  type StoryMissionId,
  type TextureTargetId,
  type ThrowableKind,
  type TutorialHudState,
  type TutorialStepId,
  type UnlockedWeapons,
  type VehicleModuleId,
  type VehicleRepairState,
  type WeaponKind,
  type WorldObjectOverrideId,
  type WorldPropCategory,
  type WorldPropSlot,
  type WorldZoneId,
  type ZombieAttachableId,
  type ZombieModelSlot,
  type ZombieTargetKind,
} from './types';
import {
  getRemoteManifestUrl,
  isValidCachedGlbBuffer,
  setRemoteManifestUrl,
  syncRemoteAssetsIfNeeded,
} from './remoteAssets';
import { WindDebrisSystem } from './windDebris';

const _vec2 = new THREE.Vector2();
const _vec3 = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _quatB = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler();
const _color = new THREE.Color();
const _cNightSky = new THREE.Color(0x060b16);
const _cDuskSky = new THREE.Color(0x472d2d);
const _cDaySky = new THREE.Color(0x4d554f);
const _cSkyCol = new THREE.Color();
const _cNightZenith = new THREE.Color(0x03060f);
const _cDuskZenith = new THREE.Color(0x1f2238);
const _cDayZenith = new THREE.Color(0x2e3531);
const _cNightHorizon = new THREE.Color(0x0d182b);
const _cDuskHorizon = new THREE.Color(0x9a593d);
const _cDayHorizon = new THREE.Color(0x7c857c);
const _cSunGlowDusk = new THREE.Color(0xd9854a);
const _cSunGlowDay = new THREE.Color(0xa2aba0);
const _cLightNight = new THREE.Color(0x88aee6);
const _cLightDay = new THREE.Color(0xcdd5ca);
const _cLightDusk = new THREE.Color(0xe6945c);
const _cLightCol = new THREE.Color();
const _cHemiDay = new THREE.Color(0x8b968c);
const _cHemiGround = new THREE.Color(0x222721);
const _cFogNight = new THREE.Color(0x0b1322);
const _cFogDay = new THREE.Color(0x555e57);
const _cFogDusk = new THREE.Color(0x45312e);
const _cFogCol = new THREE.Color();
const _aimPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _rayHit = new THREE.Vector3();
const _frustum = new THREE.Frustum();
const _projScreenMatrix = new THREE.Matrix4();
const _frustumSphere = new THREE.Sphere(new THREE.Vector3(), 1.85);
const _rockDummy = new THREE.Object3D();
let activeEngineInstances = 0;

// Reusable IK & weapon-alignment scratch vectors/quaternions (zero per-frame allocations)
const _ikS = new THREE.Vector3();
const _ikE = new THREE.Vector3();
const _ikH = new THREE.Vector3();
const _ikT = new THREE.Vector3();
const _ikDir = new THREE.Vector3();
const _ikPole = new THREE.Vector3();
const _ikPoleR = new THREE.Vector3();
const _ikBend = new THREE.Vector3();
const _ikCurDir = new THREE.Vector3();
const _ikTargetDir = new THREE.Vector3();
const _ikTargetElbow = new THREE.Vector3();
const _ikParentQ = new THREE.Quaternion();
const _ikWorldQ = new THREE.Quaternion();
const _ikDeltaQ = new THREE.Quaternion();
const _ikLocalQ = new THREE.Quaternion();
const _chestCenter = new THREE.Vector3();
const _rightShoulderPos = new THREE.Vector3();
const _leftShoulderPos = new THREE.Vector3();
const _rightGripTarget = new THREE.Vector3();
const _weaponFwd = new THREE.Vector3();
const _weaponRight = new THREE.Vector3();
const _weaponAimDir = new THREE.Vector3();
const _basisX = new THREE.Vector3();
const _basisY = new THREE.Vector3();
const _basisZ = new THREE.Vector3();
const _worldUp = new THREE.Vector3(0, 1, 0);
const _alignMat = new THREE.Matrix4();
const _savedRArmQ = new THREE.Quaternion();
const _savedRForeQ = new THREE.Quaternion();
const _savedRHandQ = new THREE.Quaternion();
const _savedLArmQ = new THREE.Quaternion();
const _savedLForeQ = new THREE.Quaternion();
const _savedLHandQ = new THREE.Quaternion();
const _gripInvQ = new THREE.Quaternion();
const _gripTargetMat = new THREE.Matrix4();
const _palmCurWorld = new THREE.Vector3();
const _palmTgtWorld = new THREE.Vector3();
const _foreAxis = new THREE.Vector3();
const _fingerTargetQ = new THREE.Quaternion();
const _fingerDeltaQ = new THREE.Quaternion();
const _fallbackRightGripQ = new THREE.Quaternion().setFromRotationMatrix(
  new THREE.Matrix4().makeBasis(
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 0, 1),
    new THREE.Vector3(0, -1, 0),
  ),
);
const _fallbackLeftGripQ = new THREE.Quaternion().setFromRotationMatrix(
  new THREE.Matrix4().makeBasis(
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, -1, 0),
    new THREE.Vector3(0, 0, 1),
  ),
);
const _aimUpOrtho = new THREE.Vector3();
const _aimPalmWorld = new THREE.Vector3();
const _aimThumbWorld = new THREE.Vector3();
const _aimFingerWorld = new THREE.Vector3();

const _ikOrthoAxis = new THREE.Vector3();

function dampBoneRot(
  bone: BoneRest | null | undefined,
  ox: number,
  oy: number,
  oz: number,
  lambda: number,
  dt: number,
) {
  dampBoneRotCharSpace(bone, ox, oy, oz, lambda, dt);
}

function dampSpineAndChest(
  bones: HumanoidBoneMap,
  ox: number,
  oy: number,
  oz: number,
  lambda: number,
  dt: number,
  chestBiasY = 0.62,
) {
  if (bones.chest && bones.spine) {
    dampBoneRot(bones.spine, ox * 0.44, oy * (1 - chestBiasY), oz * 0.44, lambda, dt);
    dampBoneRot(bones.chest, ox * 0.56, oy * chestBiasY, oz * 0.56, lambda, dt);
  } else {
    dampBoneRot(bones.spine, ox, oy, oz, lambda, dt);
  }
}

function dampNeckAndHead(
  bones: HumanoidBoneMap,
  ox: number,
  oy: number,
  oz: number,
  lambda: number,
  dt: number,
) {
  if (bones.neck && bones.head) {
    dampBoneRot(bones.neck, ox * 0.36, oy * 0.36, oz * 0.3, lambda, dt);
    dampBoneRot(bones.head, ox * 0.64, oy * 0.64, oz * 0.7, lambda, dt);
  } else if (bones.head) {
    dampBoneRot(bones.head, ox, oy, oz, lambda, dt);
  }
}

function getPelvisLocalPerMeter(hips: BoneRest | null): number {
  if (!hips) return 1;
  if (hips.node.parent) {
    hips.node.parent.getWorldScale(_ikS);
    if (_ikS.y > 0.0005) {
      return 1 / _ikS.y;
    }
  }
  return Math.max(0.5, hips.restPos.y / 0.86);
}

function setUnitVectorsSafe(
  out: THREE.Quaternion,
  fromDir: THREE.Vector3,
  toDir: THREE.Vector3,
  fallbackAxis: THREE.Vector3 = _worldUp,
) {
  const dot = fromDir.dot(toDir);
  if (dot < -0.999) {
    _ikOrthoAxis.crossVectors(fallbackAxis, fromDir);
    if (_ikOrthoAxis.lengthSq() < 1e-5) {
      _ikOrthoAxis.set(1, 0, 0).cross(fromDir);
    }
    if (_ikOrthoAxis.lengthSq() < 1e-5) {
      _ikOrthoAxis.set(0, 0, 1);
    } else {
      _ikOrthoAxis.normalize();
    }
    out.setFromAxisAngle(_ikOrthoAxis, Math.PI);
  } else {
    out.setFromUnitVectors(fromDir, toDir);
  }
}

// Analytic 2-bone arm IK: aims upperArm -> foreArm -> handNode toward targetWorldPos
// Works across both procedural rigs and imported .glb skeletons regardless of local bone axis.
function solveTwoBoneArmIK(
  upperArm: THREE.Object3D,
  foreArm: THREE.Object3D,
  handNode: THREE.Object3D,
  targetWorldPos: THREE.Vector3,
  poleWorldDir: THREE.Vector3,
  dt: number,
  lambda = 38,
  armBendLocal?: THREE.Vector3 | null,
) {
  upperArm.updateMatrixWorld(true);
  upperArm.getWorldPosition(_ikS);
  foreArm.getWorldPosition(_ikE);
  handNode.getWorldPosition(_ikH);

  const l1 = Math.max(0.05, _ikS.distanceTo(_ikE));
  const l2 = Math.max(0.05, _ikE.distanceTo(_ikH));

  _ikT.copy(targetWorldPos).sub(_ikS);
  const rawDist = _ikT.length();
  if (rawDist < 0.001) return;

  const minReach = Math.abs(l1 - l2) + 0.02;
  const maxReach = l1 + l2 - 0.006;
  const d = THREE.MathUtils.clamp(rawDist, minReach, maxReach);
  _ikDir.copy(_ikT).divideScalar(rawDist);

  const cosAlpha = THREE.MathUtils.clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
  const sinAlpha = Math.sqrt(Math.max(0, 1 - cosAlpha * cosAlpha));

  // Orthogonalize pole direction against shoulder->target axis
  const proj = poleWorldDir.dot(_ikDir);
  _ikBend.copy(poleWorldDir).addScaledVector(_ikDir, -proj);
  if (_ikBend.lengthSq() < 0.0001) _ikBend.set(0, -1, 0);
  _ikBend.normalize();

  _ikTargetElbow
    .copy(_ikS)
    .addScaledVector(_ikDir, l1 * cosAlpha)
    .addScaledVector(_ikBend, l1 * sinAlpha);

  const slerpAlpha = lambda >= 400 ? 1 : 1 - Math.exp(-lambda * dt);

  // Rotate upperArm so current shoulder->elbow aligns with shoulder->targetElbow
  _ikCurDir.copy(_ikE).sub(_ikS);
  _ikTargetDir.copy(_ikTargetElbow).sub(_ikS);
  if (_ikCurDir.lengthSq() > 1e-6 && _ikTargetDir.lengthSq() > 1e-6 && upperArm.parent) {
    _ikCurDir.normalize();
    _ikTargetDir.normalize();
    setUnitVectorsSafe(_ikDeltaQ, _ikCurDir, _ikTargetDir, poleWorldDir);
    upperArm.getWorldQuaternion(_ikWorldQ);
    _ikWorldQ.premultiply(_ikDeltaQ);
    upperArm.parent.getWorldQuaternion(_ikParentQ).invert();
    _ikLocalQ.copy(_ikParentQ).multiply(_ikWorldQ);
    if (slerpAlpha >= 1) {
      upperArm.quaternion.copy(_ikLocalQ);
    } else {
      upperArm.quaternion.slerp(_ikLocalQ, slerpAlpha);
    }
    if (armBendLocal) {
      stabilizeUpperArmTwist(upperArm, foreArm, armBendLocal, _ikBend, dt, lambda);
    }
  }

  // Update world matrices & align foreArm->hand toward targetWorldPos
  upperArm.updateMatrixWorld(true);
  foreArm.getWorldPosition(_ikE);
  handNode.getWorldPosition(_ikH);
  _ikCurDir.copy(_ikH).sub(_ikE);
  _ikTargetDir.copy(targetWorldPos).sub(_ikE);
  if (_ikCurDir.lengthSq() > 1e-6 && _ikTargetDir.lengthSq() > 1e-6 && foreArm.parent) {
    _ikCurDir.normalize();
    _ikTargetDir.normalize();
    setUnitVectorsSafe(_ikDeltaQ, _ikCurDir, _ikTargetDir, _ikBend);
    foreArm.getWorldQuaternion(_ikWorldQ);
    _ikWorldQ.premultiply(_ikDeltaQ);
    foreArm.parent.getWorldQuaternion(_ikParentQ).invert();
    _ikLocalQ.copy(_ikParentQ).multiply(_ikWorldQ);
    if (slerpAlpha >= 1) {
      foreArm.quaternion.copy(_ikLocalQ);
    } else {
      foreArm.quaternion.slerp(_ikLocalQ, slerpAlpha);
    }
  }
}

// Aligns a single bone segment (bone -> childBone) toward a desired world direction
function orientBoneSegmentToWorldDir(
  bone: THREE.Object3D,
  childBone: THREE.Object3D,
  desiredWorldDir: THREE.Vector3,
  dt: number,
  lambda = 14,
) {
  if (!bone.parent || desiredWorldDir.lengthSq() < 0.0001) return;
  bone.updateMatrixWorld(true);
  bone.getWorldPosition(_ikS);
  childBone.getWorldPosition(_ikE);
  _ikCurDir.copy(_ikE).sub(_ikS);
  if (_ikCurDir.lengthSq() < 0.0001) return;
  _ikCurDir.normalize();
  _ikTargetDir.copy(desiredWorldDir).normalize();
  setUnitVectorsSafe(_ikDeltaQ, _ikCurDir, _ikTargetDir, _worldUp);
  bone.getWorldQuaternion(_ikWorldQ);
  _ikWorldQ.premultiply(_ikDeltaQ);
  bone.parent.getWorldQuaternion(_ikParentQ).invert();
  _ikLocalQ.copy(_ikParentQ).multiply(_ikWorldQ);
  if (lambda >= 400) {
    bone.quaternion.copy(_ikLocalQ);
  } else {
    bone.quaternion.slerp(_ikLocalQ, 1 - Math.exp(-lambda * dt));
  }
}

function addWorldAxisRotation(
  boneNode: THREE.Object3D,
  worldAxis: THREE.Vector3,
  angleRad: number,
) {
  if (Math.abs(angleRad) < 0.0005 || !boneNode.parent) return;
  boneNode.updateMatrixWorld(true);
  boneNode.getWorldQuaternion(_ikWorldQ);
  _ikDeltaQ.setFromAxisAngle(worldAxis, angleRad);
  _ikWorldQ.premultiply(_ikDeltaQ);
  boneNode.parent.getWorldQuaternion(_ikParentQ).invert();
  _ikLocalQ.copy(_ikParentQ).multiply(_ikWorldQ);
  boneNode.quaternion.copy(_ikLocalQ);
  boneNode.updateMatrixWorld(true);
}

// Smoothly rolls upperArm around shoulder->elbow axis so its anatomical olecranon pole matches desiredBendWorldDir,
// preventing shoulder flip and backwards-bending elbows.
function stabilizeUpperArmTwist(
  upperArmNode: THREE.Object3D,
  foreArmNode: THREE.Object3D,
  armBendLocal: THREE.Vector3 | null | undefined,
  desiredBendWorldDir: THREE.Vector3,
  dt: number,
  lambda = 32,
) {
  if (!armBendLocal || !upperArmNode.parent) return;
  upperArmNode.updateMatrixWorld(true);
  upperArmNode.getWorldPosition(_ikS);
  foreArmNode.getWorldPosition(_ikE);
  _foreAxis.subVectors(_ikE, _ikS);
  if (_foreAxis.lengthSq() < 1e-5) return;
  _foreAxis.normalize();

  upperArmNode.getWorldQuaternion(_ikWorldQ);
  _palmCurWorld.copy(armBendLocal).applyQuaternion(_ikWorldQ);
  _palmCurWorld.addScaledVector(_foreAxis, -_palmCurWorld.dot(_foreAxis));
  if (_palmCurWorld.lengthSq() < 1e-4) return;
  _palmCurWorld.normalize();

  _palmTgtWorld.copy(desiredBendWorldDir);
  _palmTgtWorld.addScaledVector(_foreAxis, -_palmTgtWorld.dot(_foreAxis));
  if (_palmTgtWorld.lengthSq() < 1e-4) return;
  _palmTgtWorld.normalize();

  _ikPoleR.crossVectors(_palmCurWorld, _palmTgtWorld);
  const sinA = _foreAxis.dot(_ikPoleR);
  const cosA = THREE.MathUtils.clamp(_palmCurWorld.dot(_palmTgtWorld), -1, 1);
  const angle = Math.atan2(sinA, cosA);
  if (Math.abs(angle) < 0.004) return;

  const alpha = lambda >= 400 ? 1 : 1 - Math.exp(-lambda * dt);
  addWorldAxisRotation(upperArmNode, _foreAxis, angle * alpha);
}

// Rotates handNode so (handWorldQ * gripLocalQ) matches orthogonal world basis [worldX, worldY, worldZ].
// Locks weapon barrel + up directly with the palm so weapons never spin or point backwards relative to the hand.
function alignHandGripFrameToWorldBasis(
  handNode: THREE.Object3D,
  gripLocalQ: THREE.Quaternion,
  worldX: THREE.Vector3,
  worldY: THREE.Vector3,
  worldZ: THREE.Vector3,
  dt: number,
  lambda = 40,
) {
  if (!handNode.parent) return;
  _gripTargetMat.makeBasis(worldX, worldY, worldZ);
  _ikWorldQ.setFromRotationMatrix(_gripTargetMat);
  _gripInvQ.copy(gripLocalQ).invert();
  _ikWorldQ.multiply(_gripInvQ);

  handNode.parent.getWorldQuaternion(_ikParentQ).invert();
  _ikLocalQ.copy(_ikParentQ).multiply(_ikWorldQ);
  if (lambda >= 400) {
    handNode.quaternion.copy(_ikLocalQ);
  } else {
    handNode.quaternion.slerp(_ikLocalQ, 1 - Math.exp(-lambda * dt));
  }
}

// Smoothly rolls foreArm around the elbow->wrist axis so its palm normal matches desiredPalmWorldDir,
// preventing wrist candy-wrapper skinning twist.
function stabilizeForeArmTwist(
  foreArmNode: THREE.Object3D,
  handNode: THREE.Object3D,
  foreArmPalmLocal: THREE.Vector3 | null | undefined,
  desiredPalmWorldDir: THREE.Vector3,
  dt: number,
  lambda = 28,
) {
  if (!foreArmPalmLocal || !foreArmNode.parent) return;
  foreArmNode.updateMatrixWorld(true);
  foreArmNode.getWorldPosition(_ikE);
  handNode.getWorldPosition(_ikH);
  _foreAxis.subVectors(_ikH, _ikE);
  if (_foreAxis.lengthSq() < 1e-5) return;
  _foreAxis.normalize();

  foreArmNode.getWorldQuaternion(_ikWorldQ);
  _palmCurWorld.copy(foreArmPalmLocal).applyQuaternion(_ikWorldQ);
  _palmCurWorld.addScaledVector(_foreAxis, -_palmCurWorld.dot(_foreAxis));
  if (_palmCurWorld.lengthSq() < 1e-4) return;
  _palmCurWorld.normalize();

  _palmTgtWorld.copy(desiredPalmWorldDir);
  _palmTgtWorld.addScaledVector(_foreAxis, -_palmTgtWorld.dot(_foreAxis));
  if (_palmTgtWorld.lengthSq() < 1e-4) return;
  _palmTgtWorld.normalize();

  _ikBend.crossVectors(_palmCurWorld, _palmTgtWorld);
  const sinA = _foreAxis.dot(_ikBend);
  const cosA = THREE.MathUtils.clamp(_palmCurWorld.dot(_palmTgtWorld), -1, 1);
  const angle = Math.atan2(sinA, cosA);
  if (Math.abs(angle) < 0.004) return;

  const alpha = lambda >= 400 ? 1 : 1 - Math.exp(-lambda * dt);
  addWorldAxisRotation(foreArmNode, _foreAxis, angle * alpha);
}

// Curls finger/thumb bones cleanly into the palm pocket (0 = open rest, 1 = full grip).
function applyHandFingerCurl(
  fingers: FingerCurlBone[] | undefined,
  amount: number,
  maxRad: number,
  dt: number,
  lambda = 26,
) {
  if (!fingers || fingers.length === 0) return;
  const alpha = 1 - Math.exp(-lambda * dt);
  for (let i = 0; i < fingers.length; i++) {
    const f = fingers[i];
    const theta = amount * maxRad * f.weight;
    if (Math.abs(theta) < 0.002) {
      f.node.quaternion.slerp(f.restQuat, alpha);
    } else {
      _fingerDeltaQ.setFromAxisAngle(f.localCurlAxis, theta);
      _fingerTargetQ.copy(f.restQuat).multiply(_fingerDeltaQ);
      f.node.quaternion.slerp(_fingerTargetQ, alpha);
    }
  }
}

const _mouthWorldPos = new THREE.Vector3();

interface Projectile {
  active: boolean;
  fromPlayer: boolean;
  isArrow?: boolean;
  isSpit?: boolean;
  spinSeed?: number;
  x: number;
  y: number;
  z: number;
  prevX: number;
  prevY: number;
  prevZ: number;
  vx: number;
  vy: number;
  vz: number;
  damage: number;
  life: number;
  radius: number;
  mesh: THREE.Object3D;
}

interface Pickup {
  active: boolean;
  kind: LootKind;
  x: number;
  y: number;
  z: number;
  vy: number;
  life: number;
  mesh: THREE.Object3D;
  disposeMesh?: () => void;
}

interface ThrownThrowable {
  kind: ThrowableKind;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  mesh: THREE.Group;
  disposeMesh: () => void;
}

interface FireZone {
  x: number;
  y: number;
  z: number;
  radius: number;
  age: number;
  life: number;
  maxLife: number;
  tickTimer: number;
  crateTickTimer: number;
  group: THREE.Group;
  flameCluster: FlameCluster;
  ringMat: THREE.MeshBasicMaterial;
  pointLight: THREE.PointLight | null;
  dispose: () => void;
}

interface NailShrapnel {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  mesh: THREE.Mesh;
}

interface NoiseRipple {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  age: number;
  duration: number;
  maxRadius: number;
}

type LimbTarget = LimbId | 'torso';

interface LimbHitVolume {
  limb: LimbTarget;
  x: number;
  y: number;
  z: number;
  radius: number;
}

interface EnemyEntity {
  id: number;
  kind: EnemyKind;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  yaw: number;
  hp: number;
  maxHp: number;
  speed: number;
  radius: number;
  damage: number;
  scoreValue: number;
  state: 'wander' | 'investigate' | 'chase' | 'windup' | 'lunge' | 'attack' | 'recover';
  stateTimer: number;
  attackDuration: number;
  hasHitThisAttack: boolean;
  attackCooldown: number;
  wanderX: number;
  wanderZ: number;
  wanderWait: number;
  investigateX: number;
  investigateZ: number;
  investigateTimer: number;
  distractedTimer: number;
  chasingRatId?: number | null;
  suspicion: number;
  aggroTimer: number;
  alertTimer: number;
  hitReactTimer: number;
  provoked: boolean;
  walkStyle: 'orco' | 'ogro' | 'inestable' | 'run';
  lungeDx: number;
  lungeDz: number;
  hitFlashTimer: number;
  squash: number;
  walkPhase: number;
  customSlotId?: string;
  limbHits: Record<LimbId, number>;
  severedLimbs: Set<LimbId>;
  bleedTimers: Record<LimbId, number>;
  stumpMeshes: Partial<Record<LimbId, { mesh: THREE.Mesh; dispose: () => void }>>;
  crawlFactor: number;
  burnTicksRemaining: number;
  burnTickTimer: number;
  carriedWeapon?: 'pistol' | 'rifle' | null;
  enemyRole: EnemyRole;
  carriedGear?: EnemyCarriedGear;
  armorHelmetHp: number;
  armorHelmetMaxHp: number;
  armorVestHp: number;
  armorVestMaxHp: number;
  bundle: EnemyMeshBundle;
  shadow: THREE.Mesh;
  mixerAccumDt: number;
  lastAwarenessTier: 'calm' | 'investigate' | 'alert';
  awarenessDisplayTimer: number;
  awarenessDisplayMax: number;
  poseInitialized: boolean;
  _cachedVols?: LimbHitVolume[];
  _cachedVolsFrame?: number;
}

interface DecoyRatEntity {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  yaw: number;
  age: number;
  maxLife: number;
  bounceCount: number;
  jingleTimer: number;
  squeakTimer: number;
  wanderAngle: number;
  rippleTimer: number;
  escapingTimer: number;
  targetCornerX: number | null;
  targetCornerZ: number | null;
  visuals: DecoyRatVisuals;
}

interface LooseRockState {
  homeX: number;
  homeZ: number;
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
  sx: number;
  sy: number;
  sz: number;
  radius: number;
  sleeping: boolean;
  audioCooldown: number;
}

interface DyingEnemy {
  bundle: EnemyMeshBundle;
  shadow: THREE.Mesh;
  x: number;
  y: number;
  z: number;
  yaw: number;
  baseShadowScale: number;
  fallDir: number;
  timer: number;
  duration: number;
  severedLimbs: Set<LimbId>;
  stumpMeshes: Partial<Record<LimbId, { mesh: THREE.Mesh; dispose: () => void }>>;
  crawlFactor: number;
}

interface Particle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  gravity: number;
  r: number;
  g: number;
  b: number;
}

interface BloodParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  splatted: boolean;
  splatChance: number;
  allowDecal: boolean;
  r: number;
  g: number;
  b: number;
}

interface SmokeParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  startSize: number;
  endSize: number;
  rot: number;
  vrot: number;
  r: number;
  g: number;
  b: number;
  maxOpacity: number;
}

interface BloodDecal {
  active: boolean;
  mesh: THREE.Mesh;
  geo: THREE.PlaneGeometry;
  mat: THREE.MeshStandardMaterial;
  baseXZ: Float32Array;
  x: number;
  z: number;
  age: number;
  duration: number;
  expandDuration: number;
  maxOpacity: number;
}

interface SeveredLimbChunk {
  group: THREE.Group;
  dispose: () => void;
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
  grounded: boolean;
  life: number;
  bleedTimer: number;
}

interface LooseLightPropEntity {
  kind: LooseLightPropKind;
  homeX: number;
  homeZ: number;
  homeRotY: number;
  scale: number;
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
  halfH: number;
  radius: number;
  mass: number;
  noiseRadius: number;
  sleeping: boolean;
  hitCooldown: number;
  group: THREE.Group;
}

type ShoeStainKind = 'blood' | 'water' | 'acid';

interface FootprintDecal {
  active: boolean;
  mesh: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  age: number;
  duration: number;
  maxOpacity: number;
}

const MAX_PARTICLES = 240;
const MAX_SMOKE_PARTICLES = 260;
const MAX_BLOOD_PARTICLES = 360;
const MAX_BLOOD_DECALS = 100;
const MAX_FOOTPRINT_DECALS = 96;
const BEST_SCORE_STORAGE_KEY = 'zona_cero_best_score';
const MISSION2_UNLOCKED_STORAGE_KEY = 'zona_cero_mission2_unlocked';
const MISSION3_UNLOCKED_STORAGE_KEY = 'zona_cero_mission3_unlocked';
const _cColonBg = new THREE.Color(0x0b080d);
const _cColonFog = new THREE.Color(0x0e0a10);

const CinematicGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTexelSize: { value: new THREE.Vector2(1 / 1280, 1 / 720) },
    uVignette: { value: 0.3 },
    uChromatic: { value: 0.12 },
    uGrain: { value: 0.055 },
    uSaturation: { value: 1.04 },
    uContrast: { value: 1.08 },
    uTime: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uTexelSize;
    uniform float uVignette;
    uniform float uChromatic;
    uniform float uGrain;
    uniform float uSaturation;
    uniform float uContrast;
    uniform float uTime;
    varying vec2 vUv;

    float rand(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 centered = vUv - 0.5;
      float dist = length(centered);

      vec3 col = texture2D(tDiffuse, vUv).rgb;

      // Edge-weighted optical chromatic aberration (center remains crisp)
      if (uChromatic > 0.005) {
        vec2 dir = dist > 0.0001 ? centered / dist : vec2(0.0);
        float shift = pow(dist, 1.65) * uChromatic * 0.0052;
        vec2 offset = dir * shift;
        col.r = texture2D(tDiffuse, clamp(vUv + offset, 0.001, 0.999)).r;
        col.b = texture2D(tDiffuse, clamp(vUv - offset, 0.001, 0.999)).b;
      }

      // Subtle Contrast-Adaptive Sharpening (CAS-style) for crisp silhouettes & textures
      vec3 n = texture2D(tDiffuse, vUv + vec2(0.0, uTexelSize.y)).rgb;
      vec3 s = texture2D(tDiffuse, vUv - vec2(0.0, uTexelSize.y)).rgb;
      vec3 e = texture2D(tDiffuse, vUv + vec2(uTexelSize.x, 0.0)).rgb;
      vec3 w = texture2D(tDiffuse, vUv - vec2(uTexelSize.x, 0.0)).rgb;
      vec3 minN = min(col, min(min(n, s), min(e, w)));
      vec3 maxN = max(col, max(max(n, s), max(e, w)));
      vec3 lap = (n + s + e + w) * 0.25 - col;
      float sharpAmt = clamp(0.18 + max(0.0, uContrast - 1.0) * 0.4, 0.14, 0.34);
      col = clamp(col - lap * sharpAmt, minN * 0.96, maxN);

      // Vibrance-aware saturation (protects already rich tones from clipping)
      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      float maxC = max(col.r, max(col.g, col.b));
      float minC = min(col.r, min(col.g, col.b));
      float curSat = maxC - minC;
      float satFactor = mix(uSaturation, 1.0 + (uSaturation - 1.0) * 0.55, curSat);
      col = mix(vec3(luma), col, satFactor);

      // Filmic S-curve contrast + subtle split-tone shadow/highlight separation
      vec3 contrasted = (col - 0.5) * uContrast + 0.5;
      vec3 smoothCurve = contrasted * contrasted * (3.0 - 2.0 * clamp(contrasted, 0.0, 1.0));
      float sCurveMix = clamp((uContrast - 0.95) * 0.75, 0.0, 0.26);
      col = mix(contrasted, smoothCurve, sCurveMix);

      float shadowWeight = pow(clamp(1.0 - luma, 0.0, 1.0), 2.2);
      float highlightWeight = pow(clamp(luma, 0.0, 1.0), 2.0) * (1.0 - luma);
      col += vec3(-0.008, 0.002, 0.016) * shadowWeight * sCurveMix * 2.0;
      col += vec3(0.010, 0.006, -0.004) * highlightWeight * sCurveMix * 1.4;

      // Optical lens vignette
      float vig = smoothstep(0.28, 0.96, dist * 1.14);
      col *= 1.0 - vig * vig * clamp(uVignette, 0.0, 0.95);

      // Luminance-weighted fine organic film grain (stronger in shadows, subtle in highlights)
      if (uGrain > 0.001) {
        float lumaWeight = 1.0 - smoothstep(0.15, 0.9, luma) * 0.6;
        vec2 grainUv = floor(vUv / max(uTexelSize, vec2(0.0004)));
        float n1 = rand(grainUv + vec2(fract(uTime * 17.3) * 193.1, fract(uTime * 11.7) * 241.7));
        float n2 = rand(grainUv * 0.5 + vec2(fract(uTime * 7.1) * 97.3, fract(uTime * 23.9) * 151.9));
        float grain = ((n1 * 0.65 + n2 * 0.35) - 0.5) * uGrain * 0.13 * lumaWeight;
        col += grain;
      }

      gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
    }
  `,
};

export interface StudioPreviewSubject {
  group: THREE.Group;
  getTargetNode: (itemId: string) => THREE.Object3D | null;
  applyTransforms: (transforms: AttachmentTransformsState) => void;
  setPlayerPose: (
    pose: PreviewPoseId,
    selectedItem: PlayerAttachableId,
    armor: { helmet: boolean; vest: boolean; backpack: boolean },
  ) => void;
  update: (dt: number) => void;
  dispose: () => void;
}

export class SurvivalGameEngine {
  private container: HTMLElement;
  private onHudUpdate: (snapshot: HudSnapshot) => void;
  private audio = new GameAudio();
  private spatialAmbienceState: SpatialAmbienceFrame = {
    dt: 0.016,
    elapsed: 0,
    gameState: 'TITLE_MENU',
    activeZone: 'exterior_9_julio',
    isSandbox: false,
    insideFastFood: false,
    dayFactor: 1,
    twilight: 0,
    playerX: 0,
    playerY: 0,
    playerZ: 0,
    listenerX: 0,
    listenerY: 2,
    listenerZ: 0,
    forwardX: 0,
    forwardY: 0,
    forwardZ: -1,
    upX: 0,
    upY: 1,
    upZ: 0,
    campfireX: 6.2,
    campfireY: 0,
    campfireZ: 8.4,
    campfireWarmth: 85,
    nearestFireX: 0,
    nearestFireY: 0,
    nearestFireZ: 0,
    hasActiveFire: false,
    colonEntranceX: COLON_ENTRANCE_X,
    colonEntranceY: 0,
    colonEntranceZ: COLON_ENTRANCE_Z,
    colonUnlocked: false,
    fastFoodX: FASTFOOD_CENTER_X,
    fastFoodY: 0,
    fastFoodZ: FASTFOOD_CENTER_Z,
    boilerX: COLON_BOILER_DOOR_POS.x,
    boilerY: COLON_BOILER_DOOR_POS.y,
    boilerZ: COLON_BOILER_DOOR_POS.z,
    alertedZombies: 0,
    nearestThreatX: 0,
    nearestThreatY: 0,
    nearestThreatZ: 0,
    hasThreatHint: false,
  };
  private looseRocks: LooseRockState[] = [];
  private looseLightProps: LooseLightPropEntity[] = [];
  private looseLightPropResources: Array<{ dispose: () => void }> = [];
  private looseNoiseCooldown = 0;
  private stealthNoiseBoostTimer = 0;
  private stealthNoiseBoostLevel = 0;
  private footstepDistAccum = 0;
  private footstepLeft = false;
  private playerShoeStain: { kind: ShoeStainKind; charges: number } = { kind: 'water', charges: 0 };
  private mechanicShoeStain: { kind: ShoeStainKind; charges: number } = { kind: 'water', charges: 0 };
  private allyShoeStain: { kind: ShoeStainKind; charges: number } = { kind: 'water', charges: 0 };
  private mechanicFootstepDistAccum = 0;
  private mechanicFootstepLeft = false;
  private mechanicPrevPos = { x: 0, z: 0, initialized: false };
  private allyFootstepDistAccum = 0;
  private allyFootstepLeft = false;
  private allyPrevPos = { x: 0, z: 0, initialized: false };
  private lastZombieAlertAudio = -10;
  private zombieBreathScratch: ZombieBreathCandidate[] = [];

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private raycaster = new THREE.Raycaster();
  private isSoftwareGl = false;
  private disposed = false;
  private renderSuspended = false;
  private frameId = 0;
  private lastTimestamp = 0;
  private attachmentSaveTimer: number | null = null;

  private composer: EffectComposer | null = null;
  private composerTarget: THREE.WebGLRenderTarget | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private gradePass: ShaderPass | null = null;

  private hemiLight!: THREE.HemisphereLight;
  private sunLight!: THREE.DirectionalLight;
  private rimLight!: THREE.DirectionalLight;
  private campfireLight!: THREE.PointLight;
  private campfireVisuals!: CampfireVisuals;
  private worldEnv!: WorldEnvironment;
  private colonInterior!: ColonInteriorEnvironment;
  private contactShadowTex!: THREE.CanvasTexture;
  private groundTex!: THREE.CanvasTexture;
  private simpleGroundTex!: THREE.CanvasTexture;
  private groundBumpTex!: THREE.CanvasTexture;
  private barkTex!: THREE.CanvasTexture;
  private stoneTex!: THREE.CanvasTexture;
  private skyTex!: THREE.CanvasTexture;
  private customGroundTex: THREE.Texture | null = null;
  private customStoneTex: THREE.Texture | null = null;
  private customBarkTex: THREE.Texture | null = null;

  private playerRig!: CharacterRig;
  private customPlayerBuffer: ArrayBuffer | null = null;
  private customZombieSlots: ZombieModelSlot[] = [];
  private customZombieTemplates = new Map<string, CustomZombieTemplate>();
  private customNpcTemplates = new Map<CustomNpcTargetId, CustomCharacterTemplate>();
  private customNpcNames: { ally_chispa: string | null; npc_mateo: string | null } = {
    ally_chispa: null,
    npc_mateo: null,
  };
  private customCharacterSlots: CustomCharacterSlot[] = [];
  private customCharacterTemplates = new Map<string, CustomCharacterTemplate>();
  private customRifleTemplate: CustomRifleTemplate | null = null;
  private customPistolTemplate: CustomPistolTemplate | null = null;
  private customEquipmentTemplates = new Map<CustomEquipmentId, CustomEquipmentTemplate>();
  private customEquipmentNames: Partial<Record<CustomEquipmentId, string>> = {};
  private objectOverrideTemplates = new Map<WorldObjectOverrideId, CustomObjectTemplate>();
  private objectOverrideNames: Partial<Record<WorldObjectOverrideId, string>> = {};
  private attachmentTransforms: AttachmentTransformsState = cargarAttachmentTransformsLocal();
  private remoteManifestInfo: RemoteManifestSyncInfo = {
    url: getRemoteManifestUrl(),
    version: null,
    lastSyncedAt: null,
    status: 'idle',
    downloadedAssets: 0,
    declaredAssets: 0,
    appliedAssets: 0,
    failedAssets: [],
    errorMessage: null,
  };
  private playerShadow!: THREE.Mesh;
  private aimReticle!: THREE.Mesh;
  private flareWaveMesh!: THREE.Mesh;
  private flareWaveTimer = 0;
  private muzzleFlashGroup!: THREE.Group;
  private muzzleFlashLight!: THREE.PointLight;
  private muzzleFlashDisposables: Array<{ dispose: () => void }> = [];
  private muzzleFlashTimer = 0;
  private muzzleFlashDuration = 0.06;
  private throwArcLine!: THREE.Line;
  private throwArcPositions!: Float32Array;
  private throwLandingRing!: THREE.Mesh;
  private heldMolotovGroup!: THREE.Group;
  private heldMolotovFlame: FlameCluster | null = null;
  private heldNailBombGroup!: THREE.Group;
  private heldGrenadeGroup!: THREE.Group;
  private heldBottleGroup!: THREE.Group;
  private heldCanGroup!: THREE.Group;
  private heldBrickGroup!: THREE.Group;
  private heldDecoyRatGroup!: THREE.Group;
  private disposeHeldMolotov: () => void = () => {};
  private disposeHeldNailBomb: () => void = () => {};
  private disposeHeldGrenade: () => void = () => {};
  private disposeHeldBottle: () => void = () => {};
  private disposeHeldCan: () => void = () => {};
  private disposeHeldBrick: () => void = () => {};
  private disposeHeldDecoyRat: () => void = () => {};

  private particleInst!: THREE.InstancedMesh;
  private particles: Particle[] = [];
  private smokeInst!: THREE.InstancedMesh;
  private smokeParticles: SmokeParticle[] = [];
  private smokeAlphaArray = new Float32Array(MAX_SMOKE_PARTICLES);
  private smokeAlphaAttr!: THREE.InstancedBufferAttribute;
  private campfireSmokeTimer = 0;
  private worldFireSmokeTimer = 0;
  private heldMolotovSmokeTimer = 0;
  private windDebris!: WindDebrisSystem;
  private sunOffsetX = 18;
  private sunOffsetY = 28;
  private sunOffsetZ = 16;
  private bloodInst!: THREE.InstancedMesh;
  private bloodParticles: BloodParticle[] = [];
  private bloodDecals: BloodDecal[] = [];
  private footprintDecals: FootprintDecal[] = [];
  private sharedFootprintGeo!: THREE.PlaneGeometry;
  private severedLimbChunks: SeveredLimbChunk[] = [];

  private projectiles: Projectile[] = [];
  private playerBoltPool: THREE.Object3D[] = [];
  private playerArrowPool: THREE.Object3D[] = [];
  private enemyBoltPool: THREE.Object3D[] = [];
  private pickups: Pickup[] = [];
  private thrownThrowables: ThrownThrowable[] = [];
  private decoyRats: DecoyRatEntity[] = [];
  private nextDecoyRatId = 1;
  private fireZones: FireZone[] = [];
  private nailShrapnels: NailShrapnel[] = [];
  private nailMeshPool: THREE.Mesh[] = [];
  private noiseRipples: NoiseRipple[] = [];
  private noiseRippleGeo!: THREE.RingGeometry;
  private enemies: EnemyEntity[] = [];
  private dyingEnemies: DyingEnemy[] = [];
  private nextEnemyId = 1;
  private frameCounter = 0;
  private isMobileHardware = isMobileRuntime();

  // HUD snapshot caches to minimize allocations & unnecessary React reconciliation
  private hudInventoryDirty = true;
  private hudCacheInventory: (InventorySlot | null)[] = Array.from({ length: 8 }, () => null);
  private hudCachePropSlotsSrc: WorldPropSlot[] | null = null;
  private hudCachePropSlots: WorldPropSlot[] = [];
  private hudCachePlacedPropsSrc: PlacedWorldProp[] | null = null;
  private hudCachePlacedProps: PlacedWorldProp[] = [];
  private hudCacheZombieSlotsSrc: ZombieModelSlot[] | null = null;
  private hudCacheZombieSlots: ZombieModelSlot[] = [];
  private hudCacheCustomCharacterSlotsSrc: CustomCharacterSlot[] | null = null;
  private hudCacheCustomCharacterSlots: CustomCharacterSlot[] = [];
  private hudCacheCustomNpcNamesSrc: { ally_chispa: string | null; npc_mateo: string | null } | null = null;
  private hudCacheCustomNpcNames: { ally_chispa: string | null; npc_mateo: string | null } = {
    ally_chispa: null,
    npc_mateo: null,
  };
  private hudCacheCharacterCatalog: CharacterEntityDescriptor[] = [];
  private hudCharacterCatalogDirty = true;
  private hudCacheMapSettingsSrc: MapMaterialSettings | null = null;
  private hudCacheMapSettings: MapMaterialSettings = { ...DEFAULT_MAP_SETTINGS };
  private hudCachePostProcessSrc: PostProcessSettings | null = null;
  private hudCachePostProcess: PostProcessSettings = { ...DEFAULT_POST_PROCESS };
  private hudCacheCameraSettingsSrc: CameraSettings | null = null;
  private hudCacheCameraSettings: CameraSettings = { ...DEFAULT_CAMERA_SETTINGS };
  private hudCacheOverridesSrc: Partial<Record<WorldObjectOverrideId, string>> | null = null;
  private hudCacheOverrides: Partial<Record<WorldObjectOverrideId, string>> = {};
  private hudCacheEquipmentNamesSrc: Partial<Record<CustomEquipmentId, string>> | null = null;
  private hudCacheEquipmentNames: Partial<Record<CustomEquipmentId, string>> = {};
  private hudCacheAttachmentTransformsSrc: AttachmentTransformsState | null = null;
  private hudCacheAttachmentTransforms: AttachmentTransformsState = createDefaultAttachmentTransforms();
  private readonly hudColonPos = { x: COLON_ENTRANCE_X, z: COLON_ENTRANCE_Z };

  private playerBoltGeo!: THREE.BufferGeometry;
  private playerBoltMat!: THREE.MeshBasicMaterial;
  private playerBoltTrailGeo!: THREE.BufferGeometry;
  private playerBoltTrailMat!: THREE.MeshBasicMaterial;
  private emberGeo!: THREE.BufferGeometry;
  private emberMat!: THREE.MeshStandardMaterial;
  private woodGeo!: THREE.BufferGeometry;
  private woodMat!: THREE.MeshStandardMaterial;
  private nailGeo!: THREE.BufferGeometry;
  private nailMat!: THREE.MeshStandardMaterial;
  private shadowGeo!: THREE.PlaneGeometry;
  private shadowMat!: THREE.MeshBasicMaterial;

  private gameState: GameState = 'TITLE_MENU';
  private difficulty: DifficultyId = 'warden';
  private elapsed = 0;
  private titleOrbitAngle = 0.6;
  private hitstopTimer = 0;
  private shakeTrauma = 0;

  // Free 3D position, velocity, jump & stance state
  private px = PLAYER_SPAWN_X;
  private py = 0;
  private pz = PLAYER_SPAWN_Z;
  private pvx = 0;
  private pvy = 0;
  private pvz = 0;
  private pyaw = Math.PI;
  private grounded = true;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private jumpWindupTimer = 0;
  private readonly jumpWindupDuration = 0.115;
  private isCrouching = false;
  private crouchFactor = 0;
  private stance: MovementStance = 'idle';

  // Third-person behind-player chase & free look camera
  private camYaw = 0;
  private camPitch = 0.2;
  private camDistCurrent = 4.25;
  private camShoulderOffset = 0.38;
  private camPivotHeight = 1.5;
  private manualCameraCooldown = 0;
  private recenterCamTimer = 0;
  private pointerLocked = false;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private hasLastPointer = false;

  // Weapons & Combat
  private weapon: WeaponKind = 'unarmed';
  private unlockedWeapons: UnlockedWeapons = {
    stick: false,
    baton: false,
    bow: false,
    pistol: false,
    rifle: false,
  };
  private arrows = 0;
  private bowDrawProgress = 0;
  private bowDrawSoundPlayed = false;
  private wasFiringBow = false;
  private pistolAmmo = 0;
  private pistolMaxAmmo = 8;
  private pistolReserveAmmo = 0;
  private rifleAmmo = 0;
  private rifleMaxAmmo = 20;
  private rifleReserveAmmo = 0;
  private bandages = 1;
  private food = 1;
  private hasBackpack = false;
  private inventory: (InventorySlot | null)[] = Array.from({ length: 8 }, () => null);
  private selectedInventorySlot = 0;
  private inventoryNotice: string | null = null;
  private inventoryNoticeTimer = 0;
  private playerBurnTickTimer = 0;
  private reloadTimer = 0;
  private isAiming = false;
  private aimPoint = new THREE.Vector3(0, 1.2, -10);

  private hp = 100;
  private maxHp = 100;
  private helmetArmor = 0;
  private readonly helmetMaxArmor = 80;
  private vestArmor = 0;
  private readonly vestMaxArmor = 120;
  private stamina = 100;
  private readonly maxStamina = 100;
  private staminaExhausted = false;
  private flareCharge = 45;
  private wood = 0;
  private score = 0;
  private bestScore = 0;
  private combo = 1;
  private comboTimer = 0;
  private survivalTime = 0;
  private kills = 0;
  private campfireWarmth = 100;

  private strikeCooldown = 0;
  private invulnTimer = 0;
  private hurtFlashTimer = 0;
  private damageSeq = 0;
  private lastDamage = 0;
  private walkPhase = 0;
  private squashY = 1;
  private recoilTimer = 0;
  private recoilKickAmount = 0;
  private camRecoilPitch = 0;
  private camRecoilYaw = 0;
  private fireBloom = 0;
  private crosshairSpread = 0.24;
  private meleeTimer = 0;
  private meleeDuration = 0.28;
  private meleeHandSign = 1;
  private throwAnimTimer = 0;
  private throwAnimTotal = 0.6;
  private playerHitAnimTimer = 0;
  private headYawOffset = 0;
  private headPitchOffset = 0;
  private deathAnimTimer = 0;
  private deathOrbitTimer = 0;
  private deathCamStartDist = 4.2;
  private deathCamStartHeight = 2.2;
  private deathFallDir = 1;

  // Story Mode: Buenos Aires 2050 — Misión 1 (9 de Julio), Misión 2 (Teatro Colón) y Misión 3 (Mc-Porteño & Mecánico)
  private activeZone: WorldZoneId = 'exterior_9_julio';
  private storyMission: StoryMissionId = 1;
  private missionPhase: MissionPhaseId = 'clear_plaza_wave';
  private readonly wave1Target = 7;
  private readonly wave2Target = 8;
  private readonly totalMissionTarget = 15;
  private readonly mission2Target = 12;
  private colonUnlocked = false;
  private mission2Unlocked = false;
  private mission3Unlocked = false;
  private allyRescued = false;
  private baseUnlocked = false;
  private mechanicRescued = false;
  private vehicleBayUnlocked = false;
  private vehicleState: VehicleRepairState = {
    engine: false,
    tires: false,
    armor: false,
    fuel: false,
  };
  private exteriorMechanicRig!: MechanicNpcRig;
  private mechanicPos = { x: FASTFOOD_MECHANIC_POS.x, z: FASTFOOD_MECHANIC_POS.z };
  private mechanicYaw = -Math.PI * 0.5;
  private mechanicHp = 100;
  private readonly mechanicMaxHp = 100;
  private mechanicPinned = false;
  private mechanicLimping = false;
  private nearMechanicHelp = false;
  private nearVehicleBay = false;
  private shelfCollapseProgress = 0;
  private shelfCollapsing = false;
  private fastFoodHordeIds = new Set<number>();
  private fastFoodTotalSpawned = 7;
  private escortAmbushSpawned = false;
  private mechanicAttackTimer = 0;
  private introCutsceneTimer = 0;
  private readonly introCutsceneDuration = 11.0;
  private allyCutsceneTimer = 0;
  private readonly allyCutsceneDuration = 9.5;
  private allySteamEmitTimer = 0;
  private missionCompleteTimer = 0;
  private provisions: BaseProvisions = { chemicals: 0, scrap: 0, powder: 0 };
  private nearWorkbench = false;
  private nearExteriorExit = false;
  private nearColonEntrance = false;
  private radioSpeaker: string | null = null;
  private radioMessage: string | null = null;
  private radioTimer = 0;

  // Interactive 3D Tutorial state
  private isTutorialMode = false;
  private tutorialStepIndex = 0;
  private tutorialMovedDist = 0;
  private tutorialCrouched = false;
  private tutorialMeleeDone = false;
  private tutorialDistractionDone = false;
  private tutorialBowHit = false;
  private tutorialGunFired = false;

  private customModelName: string | null = null;
  private customRifleName: string | null = null;
  private customPistolName: string | null = null;
  private modelError: string | null = null;

  private heldKeys = new Set<string>();
  private fireHeld = false;
  private aimHeld = false;
  private flareBufferTimer = 0;
  private molotovLit = false;
  private nailBombLit = false;
  private distractionCounts: Record<DistractionKind, number> = {
    bottle: 1,
    can: 1,
    brick: 1,
    decoy_rat: 0,
  };
  private ratCount = 0;
  private chapitasCount = 0;
  private nearTrashSpot: WorldTrashSpot | null = null;
  private activeDistractionKind: DistractionKind = 'bottle';
  private equippedThrowable: EquippedThrowableKind | null = null;
  private aimingThrowable: ThrowableKind | null = null;
  private aimingThrowableSlot: number | undefined = undefined;
  private throwArcOrigin = new THREE.Vector3();
  private throwArcVel = new THREE.Vector3();
  private throwArcLanding = new THREE.Vector3();
  private throwArcFlightTime = 0.6;

  // Mobile / Touch Virtual Controls State
  private virtualMoveX = 0;
  private virtualMoveY = 0;
  private virtualSprint = false;
  private virtualFire = false;
  private virtualAim = false;
  private virtualCamVelYaw = 0;
  private virtualCamVelPitch = 0;
  private activeCamPointerId: number | null = null;
  private lastPointerType: string = 'mouse';

  private hudSyncTimer = 0;
  private ambientEmberTimer = 0;

  // Map, Dynamic Fog, Day/Night, Post-Processing, Camera & 3D World Editor
  private mapSettings: MapMaterialSettings = cargarMapSettingsLocal();
  private postProcess: PostProcessSettings = cargarPostProcessLocal();
  private cameraSettings: CameraSettings = cargarCameraSettingsLocal();
  private cameraPreviewActive = false;
  private cameraPreviewAim = false;
  private currentFogLevel = 0.0172;
  private propSlots: WorldPropSlot[] = [];
  private propTemplates = new Map<string, CustomPropTemplate>();
  private placedProps: PlacedWorldProp[] = [];
  private placedPropMeshes = new Map<string, THREE.Group>();
  private activePlacementSlotId: string | null = null;
  private selectedPropId: string | null = null;
  private selectionRing!: THREE.Mesh;
  private editorMode = false;
  private editorYaw = 0.6;
  private editorPitch = 0.72;
  private editorDist = 20;
  private editorTarget = new THREE.Vector3(0, 0, 0);
  private editorDragMode: 'none' | 'orbit' | 'move' = 'none';
  private editorDragStart = { x: 0, y: 0 };
  private editorPointerMoved = false;

  constructor(container: HTMLElement, onHudUpdate: (snapshot: HudSnapshot) => void) {
    activeEngineInstances += 1;
    this.container = container;
    this.onHudUpdate = onHudUpdate;
    try {
      const saved = localStorage.getItem(BEST_SCORE_STORAGE_KEY);
      if (saved) this.bestScore = Number(saved) || 0;
      this.mission2Unlocked = localStorage.getItem(MISSION2_UNLOCKED_STORAGE_KEY) === '1';
      this.mission3Unlocked = localStorage.getItem(MISSION3_UNLOCKED_STORAGE_KEY) === '1';
    } catch {
      this.bestScore = 0;
      this.mission2Unlocked = false;
      this.mission3Unlocked = false;
    }

    this.initRendererAndScene();
    this.initPoolsAndVisuals();
    this.bindEvents();
    void this.restoreCachedModels();
    this.emitHud();

    this.lastTimestamp = performance.now();
    this.scheduleNextFrame();
  }

  private detectSoftwareWebGL(): boolean {
    try {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param) ?? '');
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    } catch {
      return true;
    }
  }

  private initRendererAndScene() {
    this.isSoftwareGl = this.detectSoftwareWebGL();
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && !this.isMobileHardware,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(
      this.isSoftwareGl
        ? 1
        : Math.min(window.devicePixelRatio || 1, this.isMobileHardware ? 1.5 : 2),
    );
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f1826);
    this.scene.fog = new THREE.FogExp2(0x111a26, 0.0172);

    this.camera = new THREE.PerspectiveCamera(56, width / height, 0.1, 540);
    this.camera.position.set(0, 6.2, 12.5);
    this.camera.lookAt(0, 1.3, 0);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.scene.environment = pmremGenerator.fromScene(roomEnv, 0.04).texture;
    this.scene.environmentIntensity = 0.28;
    roomEnv.dispose();
    pmremGenerator.dispose();

    this.hemiLight = new THREE.HemisphereLight(0x6d8fc2, 0x1a241b, 0.82);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xc4dcff, 1.55);
    this.sunLight.position.set(18, 28, 16);
    this.sunLight.castShadow = !this.isSoftwareGl;
    const shadowRes = this.isMobileHardware ? 512 : 1024;
    this.sunLight.shadow.mapSize.set(shadowRes, shadowRes);
    this.sunLight.shadow.camera.near = 4;
    this.sunLight.shadow.camera.far = 65;
    const d = 22;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.rimLight = new THREE.DirectionalLight(0xff9e5e, 0.42);
    this.rimLight.position.set(-16, 12, -18);
    this.scene.add(this.rimLight);

    setActiveMapPreset(this.mapSettings.mapPreset);
    const initialCf = this.getCampfirePos();
    const initialSpawn = this.getPlayerSpawnPos();
    this.px = initialSpawn.x;
    this.pz = initialSpawn.z;

    this.campfireLight = new THREE.PointLight(0xff7b1f, 6.8, 28, 1.4);
    this.campfireLight.position.set(
      initialCf.x,
      groundHeightAt(initialCf.x, initialCf.z) + 2.2,
      initialCf.z,
    );
    this.scene.add(this.campfireLight);

    const maxAniso = Math.min(
      this.isMobileHardware ? 2 : 4,
      this.renderer.capabilities.getMaxAnisotropy(),
    );
    this.groundTex = createGroundTexture(maxAniso);
    this.simpleGroundTex = createSimpleTerrainTexture(maxAniso);
    this.groundBumpTex = createGroundBumpTexture(maxAniso);
    this.barkTex = createBarkTexture(maxAniso);
    this.stoneTex = createStoneTexture(maxAniso);
    this.skyTex = createSkyGradientTexture();
    this.contactShadowTex = createContactShadowTexture();

    this.worldEnv = buildWorldEnvironment(
      this.scene,
      this.groundTex,
      this.groundBumpTex,
      this.barkTex,
      this.stoneTex,
      this.skyTex,
    );
    this.worldEnv.rebuildTerrainHeights(this.mapSettings.terrainScale, this.mapSettings.mapPreset);
    this.initLooseRocks();
    this.initLooseLightProps();
    this.campfireVisuals = buildCampfireGroup(this.stoneTex, this.barkTex);
    this.campfireVisuals.group.position.set(
      initialCf.x,
      groundHeightAt(initialCf.x, initialCf.z),
      initialCf.z,
    );
    this.scene.add(this.campfireVisuals.group);

    this.colonInterior = buildColonInteriorEnvironment(this.scene, maxAniso);
    this.colonInterior.root.visible = false;

    this.windDebris = new WindDebrisSystem(this.isMobileHardware);
    this.scene.add(this.windDebris.group);

    this.playerRig = buildDefaultSurvivor();
    this.py = groundHeightAt(this.px, this.pz);
    this.playerRig.root.position.set(this.px, this.py, this.pz);
    this.scene.add(this.playerRig.root);
    this.rebuildHeldThrowables();
    this.syncWeaponVisibility();
    this.applyAllAttachmentTransforms();

    const selRingGeo = new THREE.RingGeometry(1.05, 1.32, 32);
    selRingGeo.rotateX(-Math.PI / 2);
    const selRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.selectionRing = new THREE.Mesh(selRingGeo, selRingMat);
    this.selectionRing.visible = false;
    this.scene.add(this.selectionRing);

    this.initPostProcessing();
    this.applyMapSettingsVisuals();
    this.applyPostProcessUniforms();
    this.updateDayNightAndFog(0);
  }

  private initPostProcessing() {
    if (this.isSoftwareGl) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    const pixelRatio = this.renderer.getPixelRatio();
    const targetW = Math.max(1, Math.floor(width * pixelRatio));
    const targetH = Math.max(1, Math.floor(height * pixelRatio));
    const msaaSamples =
      !this.isMobileHardware && this.renderer.capabilities.isWebGL2
        ? Math.min(4, this.renderer.capabilities.maxSamples || 4)
        : 0;

    // HalfFloat HDR + hardware MSAA preserves bloom highlights and crisp character silhouettes
    const composerTarget = new THREE.WebGLRenderTarget(targetW, targetH, {
      type: THREE.HalfFloatType,
      samples: msaaSamples,
    });
    const composer = new EffectComposer(this.renderer, composerTarget);
    composer.setPixelRatio(pixelRatio);
    composer.setSize(width, height);
    composer.addPass(new RenderPass(this.scene, this.camera));

    const bloomScale = this.isMobileHardware ? 0.5 : 1;
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(Math.floor(width * bloomScale), Math.floor(height * bloomScale)),
      this.postProcess.bloomStrength,
      0.35,
      this.postProcess.bloomThreshold,
    );
    bloomPass.enabled = this.postProcess.bloomEnabled;
    composer.addPass(bloomPass);

    // OutputPass performs ACES tone mapping + Linear->sRGB conversion before sRGB color grading
    const outputPass = new OutputPass();
    outputPass.material.depthTest = false;
    outputPass.material.depthWrite = false;
    composer.addPass(outputPass);

    const gradePass = new ShaderPass(CinematicGradeShader);
    gradePass.material.depthTest = false;
    gradePass.material.depthWrite = false;
    gradePass.uniforms.uTexelSize.value.set(1 / targetW, 1 / targetH);
    composer.addPass(gradePass);

    this.composerTarget = composerTarget;
    this.composer = composer;
    this.bloomPass = bloomPass;
    this.gradePass = gradePass;
  }

  private initPoolsAndVisuals() {
    this.shadowGeo = new THREE.PlaneGeometry(1.5, 1.5);
    this.shadowGeo.rotateX(-Math.PI / 2);
    this.shadowMat = new THREE.MeshBasicMaterial({
      map: this.contactShadowTex,
      transparent: true,
      opacity: 0.54,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    this.playerShadow = new THREE.Mesh(this.shadowGeo, this.shadowMat);
    this.playerShadow.position.set(this.px, 0.025, this.pz);
    this.scene.add(this.playerShadow);

    const retGeo = new THREE.RingGeometry(0.22, 0.34, 20);
    retGeo.rotateX(-Math.PI / 2);
    const retMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.aimReticle = new THREE.Mesh(retGeo, retMat);
    this.aimReticle.visible = false;
    this.scene.add(this.aimReticle);

    const flareGeo = new THREE.RingGeometry(0.8, 1.25, 36);
    flareGeo.rotateX(-Math.PI / 2);
    const flareMat = new THREE.MeshBasicMaterial({
      color: 0xff7b24,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.flareWaveMesh = new THREE.Mesh(flareGeo, flareMat);
    this.flareWaveMesh.visible = false;
    this.scene.add(this.flareWaveMesh);

    this.noiseRippleGeo = new THREE.RingGeometry(0.84, 1.0, 32);
    this.noiseRippleGeo.rotateX(-Math.PI / 2);

    this.muzzleFlashGroup = new THREE.Group();
    const flashCoreGeo = new THREE.ConeGeometry(0.068, 0.38, 8);
    flashCoreGeo.rotateX(Math.PI / 2);
    flashCoreGeo.translate(0, 0, 0.18);
    const flashCoreMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(2.8, 2.2, 0.9),
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const flashCore = new THREE.Mesh(flashCoreGeo, flashCoreMat);

    const flashGlowGeo = new THREE.SphereGeometry(0.095, 8, 6);
    const flashGlowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(2.4, 1.4, 0.35),
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    const flashGlow = new THREE.Mesh(flashGlowGeo, flashGlowMat);
    flashGlow.position.set(0, 0, 0.035);

    const flashSpikeGeo = new THREE.PlaneGeometry(0.46, 0.11);
    const flashSpikeMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(2.6, 1.55, 0.4),
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const spikeA = new THREE.Mesh(flashSpikeGeo, flashSpikeMat);
    spikeA.position.set(0, 0, 0.035);
    const spikeB = new THREE.Mesh(flashSpikeGeo, flashSpikeMat);
    spikeB.position.set(0, 0, 0.035);
    spikeB.rotation.z = Math.PI / 2;
    const spikeC = new THREE.Mesh(flashSpikeGeo, flashSpikeMat);
    spikeC.position.set(0, 0, 0.035);
    spikeC.rotation.z = Math.PI / 4;
    spikeC.scale.set(0.76, 0.85, 1);

    this.muzzleFlashGroup.add(flashCore, flashGlow, spikeA, spikeB, spikeC);
    this.muzzleFlashGroup.visible = false;
    this.scene.add(this.muzzleFlashGroup);

    this.muzzleFlashLight = new THREE.PointLight(0xffa940, 0, 10, 2);
    this.scene.add(this.muzzleFlashLight);

    this.muzzleFlashDisposables.push(
      flashCoreGeo,
      flashCoreMat,
      flashGlowGeo,
      flashGlowMat,
      flashSpikeGeo,
      flashSpikeMat,
    );

    this.throwArcPositions = new Float32Array(22 * 3);
    const throwArcGeo = new THREE.BufferGeometry();
    throwArcGeo.setAttribute('position', new THREE.BufferAttribute(this.throwArcPositions, 3));
    const throwArcMat = new THREE.LineBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    this.throwArcLine = new THREE.Line(throwArcGeo, throwArcMat);
    this.throwArcLine.frustumCulled = false;
    this.throwArcLine.visible = false;
    this.scene.add(this.throwArcLine);

    const throwRingGeo = new THREE.RingGeometry(0.86, 1.0, 32);
    throwRingGeo.rotateX(-Math.PI / 2);
    const throwRingMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.throwLandingRing = new THREE.Mesh(throwRingGeo, throwRingMat);
    this.throwLandingRing.visible = false;
    this.scene.add(this.throwLandingRing);

    const partGeo = new THREE.OctahedronGeometry(0.068, 0);
    const partMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.particleInst = new THREE.InstancedMesh(partGeo, partMat, MAX_PARTICLES);
    this.particleInst.frustumCulled = false;
    this.scene.add(this.particleInst);

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        size: 1,
        gravity: 9.8,
        r: 1,
        g: 0.7,
        b: 0.2,
      });
      _mat4.makeScale(0, 0, 0);
      this.particleInst.setMatrixAt(i, _mat4);
      this.particleInst.setColorAt(i, _color.setRGB(1, 0.7, 0.2));
    }
    this.particleInst.instanceMatrix.needsUpdate = true;
    if (this.particleInst.instanceColor) this.particleInst.instanceColor.needsUpdate = true;

    const smokeGeo = new THREE.PlaneGeometry(1, 1);
    this.smokeAlphaAttr = new THREE.InstancedBufferAttribute(this.smokeAlphaArray, 1);
    this.smokeAlphaAttr.setUsage(THREE.DynamicDrawUsage);
    smokeGeo.setAttribute('aAlpha', this.smokeAlphaAttr);
    const smokeTex = getSmokePuffTexture();
    const smokeMat = new THREE.MeshBasicMaterial({
      map: smokeTex,
      color: 0xffffff,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });
    smokeMat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aAlpha;\nvarying float vAlpha;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvAlpha = aAlpha;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vAlpha;')
        .replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.a *= vAlpha;');
    };
    smokeMat.customProgramCacheKey = () => 'instanced_smoke_alpha_v1';
    this.smokeInst = new THREE.InstancedMesh(smokeGeo, smokeMat, MAX_SMOKE_PARTICLES);
    this.smokeInst.frustumCulled = false;
    this.smokeInst.renderOrder = 6;
    this.scene.add(this.smokeInst);

    for (let i = 0; i < MAX_SMOKE_PARTICLES; i++) {
      this.smokeParticles.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        startSize: 0.4,
        endSize: 1.8,
        rot: 0,
        vrot: 0,
        r: 0.16,
        g: 0.16,
        b: 0.18,
        maxOpacity: 0.44,
      });
      this.smokeAlphaArray[i] = 0;
      _mat4.makeScale(0, 0, 0);
      this.smokeInst.setMatrixAt(i, _mat4);
      this.smokeInst.setColorAt(i, _color.setRGB(0.18, 0.18, 0.2));
    }
    this.smokeInst.instanceMatrix.needsUpdate = true;
    if (this.smokeInst.instanceColor) this.smokeInst.instanceColor.needsUpdate = true;
    this.smokeAlphaAttr.needsUpdate = true;

    const bloodGeo = createDropletLatheGeometry(0.036, 0.135, 7);
    const bloodMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.08,
      metalness: 0.04,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      emissive: new THREE.Color(0x160204),
      emissiveIntensity: 0.2,
    });
    this.bloodInst = new THREE.InstancedMesh(bloodGeo, bloodMat, MAX_BLOOD_PARTICLES);
    this.bloodInst.frustumCulled = false;
    this.scene.add(this.bloodInst);

    for (let i = 0; i < MAX_BLOOD_PARTICLES; i++) {
      this.bloodParticles.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 1,
        size: 1,
        splatted: false,
        splatChance: 0.35,
        allowDecal: true,
        r: 0.52,
        g: 0.03,
        b: 0.04,
      });
      _mat4.makeScale(0, 0, 0);
      this.bloodInst.setMatrixAt(i, _mat4);
      this.bloodInst.setColorAt(i, _color.setRGB(0.52, 0.03, 0.04));
    }
    this.bloodInst.instanceMatrix.needsUpdate = true;
    if (this.bloodInst.instanceColor) this.bloodInst.instanceColor.needsUpdate = true;

    this.playerBoltGeo = new THREE.CylinderGeometry(0.014, 0.024, 0.44, 6);
    this.playerBoltGeo.rotateX(Math.PI / 2);
    this.playerBoltGeo.translate(0, 0, 0.22);
    this.playerBoltMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(2.4, 1.55, 0.25),
      toneMapped: false,
    });
    this.playerBoltTrailGeo = new THREE.CylinderGeometry(0.042, 0.012, 0.95, 6);
    this.playerBoltTrailGeo.rotateX(Math.PI / 2);
    this.playerBoltTrailGeo.translate(0, 0, -0.34);
    this.playerBoltTrailMat = new THREE.MeshBasicMaterial({
      color: 0xff7b00,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });

    const puddleTextures = getBloodPuddleTextures();
    for (let i = 0; i < MAX_BLOOD_DECALS; i++) {
      const geo = new THREE.PlaneGeometry(1, 1, 4, 4);
      geo.rotateX(-Math.PI / 2);
      const posAttr = geo.attributes.position as THREE.BufferAttribute;
      const baseXZ = new Float32Array(posAttr.count * 2);
      for (let v = 0; v < posAttr.count; v++) {
        baseXZ[v * 2] = posAttr.getX(v);
        baseXZ[v * 2 + 1] = posAttr.getZ(v);
      }
      const mat = new THREE.MeshStandardMaterial({
        map: puddleTextures[0],
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        roughness: 0.12,
        metalness: 0.08,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.bloodDecals.push({
        active: false,
        mesh,
        geo,
        mat,
        baseXZ,
        x: 0,
        z: 0,
        age: 0,
        duration: 48,
        expandDuration: 1.1,
        maxOpacity: 0.9,
      });
    }

    const footprintTex = getFootprintTexture();
    this.sharedFootprintGeo = new THREE.PlaneGeometry(0.24, 0.44);
    this.sharedFootprintGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < MAX_FOOTPRINT_DECALS; i++) {
      const mat = new THREE.MeshStandardMaterial({
        map: footprintTex,
        color: 0x5c090c,
        transparent: true,
        opacity: 0,
        roughness: 0.25,
        metalness: 0.05,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3,
      });
      const mesh = new THREE.Mesh(this.sharedFootprintGeo, mat);
      mesh.visible = false;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      this.footprintDecals.push({
        active: false,
        mesh,
        mat,
        age: 0,
        duration: 18,
        maxOpacity: 0.72,
      });
    }

    this.emberGeo = new THREE.OctahedronGeometry(0.24, 0);
    this.emberMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: new THREE.Color(0xf59e0b),
      emissiveIntensity: 1.9,
      roughness: 0.2,
    });
    this.woodGeo = new THREE.BoxGeometry(0.36, 0.24, 0.36);
    this.woodMat = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: new THREE.Color(0x059669),
      emissiveIntensity: 0.75,
      roughness: 0.4,
    });
    const nailRes = buildNailShrapnelResources();
    this.nailGeo = nailRes.geo;
    this.nailMat = nailRes.mat;

    this.exteriorMechanicRig = buildMechanicNpcRig();
    this.exteriorMechanicRig.root.visible = false;
    this.scene.add(this.exteriorMechanicRig.root);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  private formatSyncError(err: unknown): string {
    if (err instanceof Error) return err.message || err.name || 'Error desconocido';
    if (typeof err === 'string' && err.trim()) return err;
    return 'Error desconocido';
  }

  private mergeRemoteAndRestoreState(
    baseInfo: RemoteManifestSyncInfo,
    restoreResult: { appliedAssets: number; failedAssets: RemoteAssetErrorDetail[] },
  ): RemoteManifestSyncInfo {
    const remoteFailures = baseInfo.failedAssets ?? [];
    const allFailures = [...remoteFailures, ...restoreResult.failedAssets];
    const hasRemoteFailure = baseInfo.status === 'error' || baseInfo.status === 'offline';
    const appliedAssets = restoreResult.appliedAssets;

    const messages: string[] = [];
    if (baseInfo.errorMessage) {
      messages.push(baseInfo.errorMessage);
    }
    if (restoreResult.failedAssets.length > 0) {
      const restoreSummary = restoreResult.failedAssets
        .slice(0, 2)
        .map((f) => `${f.file} -> ${f.reason}`)
        .join(' | ');
      const extra =
        restoreResult.failedAssets.length > 2
          ? ` (+${restoreResult.failedAssets.length - 2} más)`
          : '';
      messages.push(`Error al aplicar modelos en la escena: ${restoreSummary}${extra}`);
    }

    if (!hasRemoteFailure && allFailures.length === 0 && appliedAssets === 0) {
      const noModelMsg =
        'No se aplicó ningún modelo .glb válido en la escena 3D ni se encontró caché válida en IndexedDB.';
      allFailures.push({ file: 'Escena 3D', reason: noModelMsg });
      messages.push(noModelMsg);
    }

    const finalHasFailure = hasRemoteFailure || allFailures.length > 0 || appliedAssets === 0;
    const finalStatus: RemoteManifestSyncInfo['status'] =
      baseInfo.status === 'offline' ? 'offline' : finalHasFailure ? 'error' : 'ready';

    this.modelError = allFailures.length > 0 ? `${allFailures[0].file}: ${allFailures[0].reason}` : null;

    return {
      ...baseInfo,
      status: finalStatus,
      appliedAssets,
      failedAssets: allFailures,
      errorMessage: finalHasFailure
        ? messages.join(' — ') || 'La sincronización no pudo aplicar ningún modelo válido.'
        : null,
    };
  }

  public async syncRemoteAssetsNow(customUrl?: string): Promise<RemoteManifestSyncInfo> {
    if (typeof customUrl === 'string') {
      const nextUrl = setRemoteManifestUrl(customUrl);
      this.remoteManifestInfo = { ...this.remoteManifestInfo, url: nextUrl };
    }
    this.remoteManifestInfo = {
      ...this.remoteManifestInfo,
      status: 'syncing',
      failedAssets: [],
      errorMessage: null,
    };
    this.emitHud();

    try {
      const syncResult = await syncRemoteAssetsIfNeeded({ force: true });
      if (this.disposed) return syncResult.info;

      if (syncResult.updatedTransforms) {
        this.attachmentTransforms = syncResult.updatedTransforms;
      }

      const restoreResult = await this.restoreCachedModels({ skipRemoteSync: true });
      if (this.disposed) return syncResult.info;

      this.remoteManifestInfo = this.mergeRemoteAndRestoreState(syncResult.info, restoreResult);
      this.applyAllAttachmentTransforms();
      this.emitHud();
      return {
        ...this.remoteManifestInfo,
        failedAssets: [...(this.remoteManifestInfo.failedAssets ?? [])],
      };
    } catch (err) {
      const msg = this.formatSyncError(err);
      this.remoteManifestInfo = {
        ...this.remoteManifestInfo,
        status: 'error',
        failedAssets: [{ file: 'Sincronización', reason: msg }],
        errorMessage: msg,
      };
      if (!this.disposed) {
        this.emitHud();
      }
      return {
        ...this.remoteManifestInfo,
        failedAssets: [...(this.remoteManifestInfo.failedAssets ?? [])],
      };
    }
  }

  private async restoreCachedModels(
    options: { skipRemoteSync?: boolean } = {},
  ): Promise<{ appliedAssets: number; failedAssets: RemoteAssetErrorDetail[] }> {
    let remoteBaseInfo: RemoteManifestSyncInfo = this.remoteManifestInfo;
    if (!options.skipRemoteSync) {
      this.remoteManifestInfo = {
        ...this.remoteManifestInfo,
        url: getRemoteManifestUrl(),
        status: 'syncing',
        failedAssets: [],
        errorMessage: null,
      };
      this.emitHud();
      try {
        const syncResult = await syncRemoteAssetsIfNeeded();
        if (this.disposed) return { appliedAssets: 0, failedAssets: [] };
        remoteBaseInfo = syncResult.info;
        if (syncResult.updatedTransforms) {
          this.attachmentTransforms = syncResult.updatedTransforms;
        }
      } catch (err) {
        if (this.disposed) return { appliedAssets: 0, failedAssets: [] };
        const msg = this.formatSyncError(err);
        remoteBaseInfo = {
          ...this.remoteManifestInfo,
          status: 'error',
          downloadedAssets: 0,
          declaredAssets: 0,
          appliedAssets: 0,
          failedAssets: [{ file: 'models_manifest.json', reason: msg }],
          errorMessage: `Error al sincronizar manifiesto remoto al iniciar: ${msg}`,
        };
      }
    }

    let appliedAssets = 0;
    const restoreFailures: RemoteAssetErrorDetail[] = [];

    try {
      const [
        charBuffer,
        charMeta,
        legacyZombieBuffer,
        legacyZombieMeta,
        loadedZombieSlots,
        npcMetaMap,
        loadedCustomCharSlots,
        rifleBuffer,
        rifleMeta,
        pistolBuffer,
        pistolMeta,
        equipmentMetaMap,
        overrideMetaMap,
        slots,
        placed,
        texGround,
        texStone,
        texBark,
      ] = await Promise.all([
        cargarModeloCache(),
        cargarModeloMeta(),
        cargarZombieCache(),
        cargarZombieMeta(),
        listarZombieSlotsCache(),
        listarNpcMetaCache(),
        listarCustomCharacterSlotsCache(),
        cargarRifleCache(),
        cargarRifleMeta(),
        cargarPistolCache(),
        cargarPistolMeta(),
        listarEquipmentMetaCache(),
        listarObjectOverrideMetaCache(),
        listarPropSlotsCache(),
        cargarPlacedPropsCache(),
        cargarTextureCache('ground'),
        cargarTextureCache('stone'),
        cargarTextureCache('bark'),
      ]);
      if (this.disposed) return { appliedAssets: 0, failedAssets: [] };

      let zombieSlots = loadedZombieSlots;
      if (zombieSlots.length === 0 && legacyZombieBuffer && !this.disposed) {
        try {
          zombieSlots = await guardarZombieSlotCache(
            'zombie_legacy_1',
            legacyZombieBuffer,
            legacyZombieMeta?.name || 'Zombie.glb',
            'all',
          );
          await eliminarZombieCache();
        } catch (err) {
          restoreFailures.push({
            file: legacyZombieMeta?.name || 'Zombie.glb',
            reason: `Error al migrar caché de zombi previo: ${this.formatSyncError(err)}`,
          });
        }
      }

      const equipIds = Object.keys(equipmentMetaMap) as CustomEquipmentId[];
      const overrideIds = Object.keys(overrideMetaMap) as WorldObjectOverrideId[];
      const npcIds = Object.keys(npcMetaMap) as CustomNpcTargetId[];
      const [
        zombieBuffers,
        npcBuffers,
        customCharBuffers,
        propBuffers,
        overrideBuffers,
        equipmentBuffers,
      ] = await Promise.all([
        cargarZombieSlotBuffers(zombieSlots.map((z) => z.id)),
        cargarNpcGlbBuffers(),
        cargarCustomCharacterSlotBuffers(loadedCustomCharSlots.map((c) => c.id)),
        cargarPropSlotBuffers(slots.map((s) => s.id)),
        cargarObjectOverrideBuffers(overrideIds),
        cargarEquipmentBuffers(equipIds),
      ]);
      if (this.disposed) return { appliedAssets: 0, failedAssets: [] };

      // 1. Weapons first (rifle & pistol) using the exact same applicator as local import
      const riflePromise = rifleBuffer
        ? (async () => {
            const label = rifleMeta?.name || 'Fusil.glb';
            if (!isValidCachedGlbBuffer(rifleBuffer)) {
              restoreFailures.push({
                file: `rifle (${label})`,
                reason: `Archivo en caché vacío o corrupto (${rifleBuffer.byteLength} bytes).`,
              });
              return;
            }
            try {
              await this.applyRifleGlbBuffer(rifleBuffer, label, { silentHud: true });
              appliedAssets += 1;
            } catch (err) {
              restoreFailures.push({
                file: `rifle (${label})`,
                reason: this.formatSyncError(err),
              });
            }
          })()
        : rifleMeta
          ? Promise.resolve().then(() => {
              restoreFailures.push({
                file: `rifle (${rifleMeta.name})`,
                reason: 'Falta el archivo binario .glb del fusil en IndexedDB.',
              });
            })
          : Promise.resolve();

      const pistolPromise = pistolBuffer
        ? (async () => {
            const label = pistolMeta?.name || 'Revólver.glb';
            if (!isValidCachedGlbBuffer(pistolBuffer)) {
              restoreFailures.push({
                file: `pistol (${label})`,
                reason: `Archivo en caché vacío o corrupto (${pistolBuffer.byteLength} bytes).`,
              });
              return;
            }
            try {
              await this.applyPistolGlbBuffer(pistolBuffer, label, { silentHud: true });
              appliedAssets += 1;
            } catch (err) {
              restoreFailures.push({
                file: `pistol (${label})`,
                reason: this.formatSyncError(err),
              });
            }
          })()
        : pistolMeta
          ? Promise.resolve().then(() => {
              restoreFailures.push({
                file: `pistol (${pistolMeta.name})`,
                reason: 'Falta el archivo binario .glb del revólver en IndexedDB.',
              });
            })
          : Promise.resolve();

      await Promise.all([riflePromise, pistolPromise]);
      if (this.disposed) return { appliedAssets: 0, failedAssets: [] };

      // 2. Player using the exact same applicator as local import
      const charPromise = charBuffer
        ? (async () => {
            const label = charMeta?.name || 'Superviviente.glb';
            if (!isValidCachedGlbBuffer(charBuffer)) {
              restoreFailures.push({
                file: `player (${label})`,
                reason: `Archivo en caché vacío o corrupto (${charBuffer.byteLength} bytes).`,
              });
              return;
            }
            try {
              await this.applyGlbBuffer(charBuffer, label, { silentHud: true });
              appliedAssets += 1;
            } catch (err) {
              restoreFailures.push({
                file: `player (${label})`,
                reason: this.formatSyncError(err),
              });
            }
          })()
        : charMeta
          ? Promise.resolve().then(() => {
              restoreFailures.push({
                file: `player (${charMeta.name})`,
                reason: 'Falta el archivo binario .glb del jugador en IndexedDB.',
              });
            })
          : Promise.resolve();

      // 3. Zombies: prune stale templates and load each slot with full error tracking
      this.customZombieSlots = zombieSlots;
      const validZombieIds = new Set(zombieSlots.map((s) => s.id));
      for (const oldId of Array.from(this.customZombieTemplates.keys())) {
        if (!validZombieIds.has(oldId)) {
          this.customZombieTemplates.get(oldId)?.dispose();
          this.customZombieTemplates.delete(oldId);
        }
      }
      const zombiePromises = zombieSlots.map(async (zSlot) => {
        const buf = zombieBuffers.get(zSlot.id) ?? (await cargarZombieSlotBuffer(zSlot.id));
        if (this.disposed) return;
        if (!buf) {
          restoreFailures.push({
            file: `zombie (${zSlot.name})`,
            reason: 'Falta el binario .glb del zombi en IndexedDB.',
          });
          return;
        }
        if (!isValidCachedGlbBuffer(buf)) {
          restoreFailures.push({
            file: `zombie (${zSlot.name})`,
            reason: `Archivo .glb de zombi corrupto o incompleto (${buf.byteLength} bytes).`,
          });
          return;
        }
        try {
          const tmpl = await parseGlbZombieTemplate(buf, zSlot.name);
          if (this.disposed) {
            tmpl.dispose();
            return;
          }
          this.customZombieTemplates.get(zSlot.id)?.dispose();
          this.customZombieTemplates.set(zSlot.id, tmpl);
          appliedAssets += 1;
        } catch (err) {
          restoreFailures.push({
            file: `zombie (${zSlot.name})`,
            reason: this.formatSyncError(err),
          });
        }
      });

      // 4. NPCs (Chispa, Mateo) via unified applyNpcGlbBuffer
      const npcPromises = npcIds.map(async (npcId) => {
        const buf = npcBuffers.get(npcId);
        const name = npcMetaMap[npcId]?.name ?? `${npcId}.glb`;
        if (this.disposed) return;
        if (!buf) {
          restoreFailures.push({
            file: `${npcId} (${name})`,
            reason: 'Falta el binario .glb del NPC en IndexedDB.',
          });
          return;
        }
        if (!isValidCachedGlbBuffer(buf)) {
          restoreFailures.push({
            file: `${npcId} (${name})`,
            reason: `Archivo .glb del NPC corrupto o incompleto (${buf.byteLength} bytes).`,
          });
          return;
        }
        try {
          await this.applyNpcGlbBuffer(npcId, buf, name, { silentHud: true });
          appliedAssets += 1;
        } catch (err) {
          restoreFailures.push({
            file: `${npcId} (${name})`,
            reason: this.formatSyncError(err),
          });
        }
      });

      // 5. Custom Characters via unified applyCustomCharacterSlotBuffer
      this.customCharacterSlots = loadedCustomCharSlots;
      const validCharIds = new Set(loadedCustomCharSlots.map((c) => c.id));
      for (const oldId of Array.from(this.customCharacterTemplates.keys())) {
        if (!validCharIds.has(oldId)) {
          this.customCharacterTemplates.get(oldId)?.dispose();
          this.customCharacterTemplates.delete(oldId);
        }
      }
      const customCharPromises = loadedCustomCharSlots.map(async (cSlot) => {
        const buf = customCharBuffers.get(cSlot.id);
        if (this.disposed) return;
        if (!buf) {
          restoreFailures.push({
            file: `character (${cSlot.name})`,
            reason: 'Falta el binario .glb del personaje extra en IndexedDB.',
          });
          return;
        }
        if (!isValidCachedGlbBuffer(buf)) {
          restoreFailures.push({
            file: `character (${cSlot.name})`,
            reason: `Archivo .glb de personaje extra corrupto o incompleto (${buf.byteLength} bytes).`,
          });
          return;
        }
        try {
          await this.applyCustomCharacterSlotBuffer(cSlot.id, buf, cSlot.name);
          appliedAssets += 1;
        } catch (err) {
          restoreFailures.push({
            file: `character (${cSlot.name})`,
            reason: this.formatSyncError(err),
          });
        }
      });

      // 6. World Props
      this.propSlots = slots;
      const propPromises = slots.map(async (slot) => {
        const buf = propBuffers.get(slot.id) ?? (await cargarPropSlotBuffer(slot.id));
        if (this.disposed) return;
        if (!buf) {
          restoreFailures.push({
            file: `prop (${slot.name})`,
            reason: 'Falta el binario .glb del prop en IndexedDB.',
          });
          return;
        }
        if (!isValidCachedGlbBuffer(buf)) {
          restoreFailures.push({
            file: `prop (${slot.name})`,
            reason: `Archivo .glb de prop corrupto o incompleto (${buf.byteLength} bytes).`,
          });
          return;
        }
        try {
          const tmpl = await parseGlbPropTemplate(buf, slot.category);
          if (this.disposed) {
            tmpl.dispose();
            return;
          }
          this.propTemplates.get(slot.id)?.dispose();
          this.propTemplates.set(slot.id, tmpl);
          appliedAssets += 1;
        } catch (err) {
          restoreFailures.push({
            file: `prop (${slot.name})`,
            reason: this.formatSyncError(err),
          });
        }
      });

      // 7. World Object Overrides via unified applyObjectOverrideGlbBuffer
      const overridePromises = overrideIds.map(async (targetId) => {
        const buf = overrideBuffers.get(targetId);
        const def = WORLD_OBJECT_OVERRIDE_DEFS.find((d) => d.id === targetId);
        const label = overrideMetaMap[targetId]?.name ?? `${targetId}.glb`;
        if (!def || this.disposed) return;
        if (!buf) {
          restoreFailures.push({
            file: `object:${targetId} (${label})`,
            reason: 'Falta el binario .glb en IndexedDB.',
          });
          return;
        }
        if (!isValidCachedGlbBuffer(buf)) {
          restoreFailures.push({
            file: `object:${targetId} (${label})`,
            reason: `Archivo .glb corrupto o incompleto (${buf.byteLength} bytes).`,
          });
          return;
        }
        try {
          await this.applyObjectOverrideGlbBuffer(targetId, buf, label, { silentHud: true });
          appliedAssets += 1;
        } catch (err) {
          restoreFailures.push({
            file: `object:${targetId} (${label})`,
            reason: this.formatSyncError(err),
          });
        }
      });

      // 8. Equipment via unified applyEquipmentGlbBuffer
      const equipmentPromises = equipIds.map(async (equipId) => {
        const buf = equipmentBuffers.get(equipId);
        const label = equipmentMetaMap[equipId]?.name ?? `${equipId}.glb`;
        if (this.disposed) return;
        if (!buf) {
          restoreFailures.push({
            file: `equipment:${equipId} (${label})`,
            reason: 'Falta el binario .glb en IndexedDB.',
          });
          return;
        }
        if (!isValidCachedGlbBuffer(buf)) {
          restoreFailures.push({
            file: `equipment:${equipId} (${label})`,
            reason: `Archivo .glb corrupto o incompleto (${buf.byteLength} bytes).`,
          });
          return;
        }
        try {
          await this.applyEquipmentGlbBuffer(equipId, buf, label, { silentHud: true });
          appliedAssets += 1;
        } catch (err) {
          restoreFailures.push({
            file: `equipment:${equipId} (${label})`,
            reason: this.formatSyncError(err),
          });
        }
      });

      const texTasks: Promise<void>[] = [];
      if (texGround) {
        texTasks.push(
          this.applyImportedTextureBuffer(
            'ground',
            texGround.buffer,
            texGround.name,
            texGround.mimeType,
          ).catch((err) => {
            restoreFailures.push({
              file: `texture:ground (${texGround.name})`,
              reason: this.formatSyncError(err),
            });
          }),
        );
      }
      if (texStone) {
        texTasks.push(
          this.applyImportedTextureBuffer(
            'stone',
            texStone.buffer,
            texStone.name,
            texStone.mimeType,
          ).catch((err) => {
            restoreFailures.push({
              file: `texture:stone (${texStone.name})`,
              reason: this.formatSyncError(err),
            });
          }),
        );
      }
      if (texBark) {
        texTasks.push(
          this.applyImportedTextureBuffer(
            'bark',
            texBark.buffer,
            texBark.name,
            texBark.mimeType,
          ).catch((err) => {
            restoreFailures.push({
              file: `texture:bark (${texBark.name})`,
              reason: this.formatSyncError(err),
            });
          }),
        );
      }

      await Promise.all([
        charPromise,
        ...zombiePromises,
        ...npcPromises,
        ...customCharPromises,
        ...propPromises,
        ...overridePromises,
        ...equipmentPromises,
        ...texTasks,
      ]);
      if (this.disposed) return { appliedAssets: 0, failedAssets: [] };

      this.hudCharacterCatalogDirty = true;
      this.objectOverrideNames = { ...this.objectOverrideNames };
      this.customEquipmentNames = { ...this.customEquipmentNames };
      if (this.customEquipmentTemplates.has('arrow')) {
        this.playerArrowPool = [];
      }
      this.applyAllCustomGearToPlayerRig();
      this.syncWeaponVisibility();
      this.applyAllAttachmentTransforms();
      (['helmet', 'vest', 'bow', 'stick', 'baton'] as const).forEach((id) => {
        if (this.customEquipmentTemplates.has(id)) {
          this.refreshEquipmentPickupsVisuals(id);
        }
      });

      if (this.customZombieTemplates.size > 0 || this.enemies.length > 0) {
        this.rebuildActiveEnemiesMeshes();
        this.syncEnemiesToCustomSlotCounts();
      }

      if (slots.length > 0 && !this.activePlacementSlotId) {
        this.activePlacementSlotId = slots[0].id;
      }

      this.placedProps = placed.filter((p) => this.propTemplates.has(p.slotId));
      this.placedProps.forEach((p) => {
        if (!this.placedPropMeshes.has(p.instanceId)) {
          this.spawnPlacedPropMesh(p);
        }
      });
      this.rebuildActiveColliders();

      if (!this.isSoftwareGl) {
        this.renderer.compile(this.scene, this.camera);
      }
    } catch (err) {
      if (this.disposed) return { appliedAssets: 0, failedAssets: [] };
      const msg = this.formatSyncError(err);
      restoreFailures.push({
        file: 'IndexedDB',
        reason: `Error al restaurar modelos desde caché: ${msg}`,
      });
    }

    if (!this.disposed && !options.skipRemoteSync) {
      this.remoteManifestInfo = this.mergeRemoteAndRestoreState(remoteBaseInfo, {
        appliedAssets,
        failedAssets: restoreFailures,
      });
      this.emitHud();
    }

    return { appliedAssets, failedAssets: restoreFailures };
  }

  public async loadCustomGlbFile(file: File): Promise<void> {
    this.modelError = null;
    try {
      const buffer = await file.arrayBuffer();
      await this.applyGlbBuffer(buffer, file.name);
      await guardarModeloCache(buffer, file.name);
      if (!this.isSoftwareGl && !this.disposed) {
        this.renderer.compile(this.scene, this.camera);
      }
      this.emitHud();
    } catch (err) {
      this.modelError =
        err instanceof Error ? `Archivo .glb inválido: ${err.message}` : 'Error al cargar el .glb.';
      this.emitHud();
    }
  }

  public async loadCustomZombieGlbFile(file: File): Promise<void> {
    await this.loadCustomZombieGlbFiles([file]);
  }

  public async loadCustomZombieGlbFiles(files: File[]): Promise<void> {
    if (files.length === 0) return;
    this.modelError = null;
    const baseTs = Date.now();

    const settled = await Promise.allSettled(
      files.map(async (file, i) => {
        const buffer = await file.arrayBuffer();
        const template = await parseGlbZombieTemplate(buffer, file.name);
        if (this.disposed) {
          template.dispose();
          return null;
        }
        const slotId = `zombie_${baseTs}_${Math.random().toString(36).slice(2, 7)}_${i}`;
        return { slotId, buffer, fileName: file.name, template };
      }),
    );

    const parsedItems: Array<{
      slotId: string;
      buffer: ArrayBuffer;
      fileName: string;
      template: CustomZombieTemplate;
    }> = [];

    for (let i = 0; i < settled.length; i++) {
      const res = settled[i];
      if (res.status === 'fulfilled' && res.value) {
        parsedItems.push(res.value);
      } else if (res.status === 'rejected') {
        const fileName = files[i]?.name ?? 'zombie.glb';
        const reason = res.reason;
        this.modelError =
          reason instanceof Error
            ? `Zombie .glb inválido (${fileName}): ${reason.message}`
            : `Error al cargar zombie .glb (${fileName}).`;
      }
    }

    if (this.disposed) {
      parsedItems.forEach((it) => it.template.dispose());
      return;
    }

    if (parsedItems.length > 0) {
      parsedItems.forEach((it) => {
        this.customZombieTemplates.set(it.slotId, it.template);
      });
      this.customZombieSlots = await guardarZombieSlotsBatchCache(
        parsedItems.map((it) => ({
          slotId: it.slotId,
          arrayBuffer: it.buffer,
          fileName: it.fileName,
          targetKind: 'all',
        })),
      );
      this.hudCharacterCatalogDirty = true;
      if (!this.disposed) {
        this.rebuildActiveEnemiesMeshes();
        this.syncEnemiesToCustomSlotCounts();
        if (!this.isSoftwareGl) {
          this.renderer.compile(this.scene, this.camera);
        }
      }
    }
    this.emitHud();
  }

  private rebuildExteriorMechanicRig(template: CustomCharacterTemplate | null): void {
    const prevPos = this.exteriorMechanicRig.root.position.clone();
    const prevRotY = this.exteriorMechanicRig.root.rotation.y;
    const prevVisible = this.exteriorMechanicRig.root.visible;
    const prevBeaconVisible = this.exteriorMechanicRig.beaconRing.visible;
    const prevBeaconColor = this.exteriorMechanicRig.beaconMat.color.getHex();
    this.scene.remove(this.exteriorMechanicRig.root);
    this.exteriorMechanicRig.dispose();

    this.exteriorMechanicRig = buildMechanicNpcRig(template);
    this.exteriorMechanicRig.root.position.copy(prevPos);
    this.exteriorMechanicRig.root.rotation.y = prevRotY;
    this.exteriorMechanicRig.root.visible = prevVisible;
    this.exteriorMechanicRig.beaconRing.visible = prevBeaconVisible;
    this.exteriorMechanicRig.beaconMat.color.setHex(prevBeaconColor);
    this.scene.add(this.exteriorMechanicRig.root);
  }

  private rebuildNpcVisuals(target: CustomNpcTargetId): void {
    const tmpl = this.customNpcTemplates.get(target) ?? null;
    if (target === 'ally_chispa') {
      this.colonInterior.replaceAllyRig(tmpl);
    } else if (target === 'npc_mateo') {
      this.colonInterior.replaceMechanicRig(tmpl);
      this.rebuildExteriorMechanicRig(tmpl);
    }
  }

  private async applyNpcGlbBuffer(
    target: CustomNpcTargetId,
    buffer: ArrayBuffer,
    fileName: string,
    options: { silentHud?: boolean } = {},
  ): Promise<void> {
    const template = await parseGlbCharacterTemplate(buffer, fileName, 1.86);
    if (this.disposed) {
      template.dispose();
      return;
    }
    this.customNpcTemplates.get(target)?.dispose();
    this.customNpcTemplates.set(target, template);
    this.customNpcNames = { ...this.customNpcNames, [target]: fileName };
    this.rebuildNpcVisuals(target);
    this.hudCharacterCatalogDirty = true;
    this.modelError = null;
    if (!options.silentHud) {
      this.emitHud();
    }
  }

  private async applyCustomCharacterSlotBuffer(
    slotId: string,
    buffer: ArrayBuffer,
    fileName: string,
  ): Promise<void> {
    const template = await parseGlbCharacterTemplate(buffer, fileName, 1.9);
    if (this.disposed) {
      template.dispose();
      return;
    }
    this.customCharacterTemplates.get(slotId)?.dispose();
    this.customCharacterTemplates.set(slotId, template);
    this.hudCharacterCatalogDirty = true;
  }

  public async loadCustomNpcGlbFile(target: CustomNpcTargetId, file: File): Promise<void> {
    this.modelError = null;
    try {
      const buffer = await file.arrayBuffer();
      await this.applyNpcGlbBuffer(target, buffer, file.name, { silentHud: true });
      if (this.disposed) return;
      await guardarNpcGlbCache(target, buffer, file.name);
      if (!this.isSoftwareGl && !this.disposed) {
        this.renderer.compile(this.scene, this.camera);
      }
      this.emitHud();
    } catch (err) {
      this.modelError =
        err instanceof Error
          ? `Personaje .glb inválido: ${err.message}`
          : 'Error al cargar personaje .glb.';
      this.emitHud();
    }
  }

  public async resetCustomNpcGlb(target: CustomNpcTargetId): Promise<void> {
    await eliminarNpcGlbCache(target);
    if (this.disposed) return;
    this.customNpcTemplates.get(target)?.dispose();
    this.customNpcTemplates.delete(target);
    this.customNpcNames = { ...this.customNpcNames, [target]: null };
    this.rebuildNpcVisuals(target);
    this.hudCharacterCatalogDirty = true;
    this.modelError = null;
    this.emitHud();
  }

  public async loadCustomCharacterSlotFiles(files: File[]): Promise<void> {
    if (files.length === 0) return;
    this.modelError = null;
    const baseTs = Date.now();
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const buffer = await file.arrayBuffer();
        const slotId = `char_${baseTs}_${Math.random().toString(36).slice(2, 7)}_${i}`;
        await this.applyCustomCharacterSlotBuffer(slotId, buffer, file.name);
        if (this.disposed) return;
        this.customCharacterSlots = await guardarCustomCharacterSlotCache(
          slotId,
          buffer,
          file.name,
          'custom',
        );
      } catch (err) {
        this.modelError =
          err instanceof Error
            ? `Personaje .glb inválido (${file.name}): ${err.message}`
            : `Error al cargar personaje .glb (${file.name}).`;
      }
    }
    this.hudCharacterCatalogDirty = true;
    this.emitHud();
  }

  public async deleteCustomCharacterSlot(slotId: string): Promise<void> {
    this.customCharacterSlots = await eliminarCustomCharacterSlotCache(slotId);
    if (this.disposed) return;
    const old = this.customCharacterTemplates.get(slotId);
    if (old) {
      this.customCharacterTemplates.delete(slotId);
      old.dispose();
    }
    this.hudCharacterCatalogDirty = true;
    this.modelError = null;
    this.emitHud();
  }

  private buildCharacterCatalog(): CharacterEntityDescriptor[] {
    const playerItems = PLAYER_ATTACHABLE_DEFS.map((d) => d.id);
    const zombieItems: PlayerAttachableId[] = ZOMBIE_ATTACHABLE_DEFS.map((d) => d.id);

    const catalog: CharacterEntityDescriptor[] = [
      {
        id: 'player',
        label: 'Ricardo López (Protagonista)',
        kind: 'player',
        animationTag: 'player',
        customGlbName: this.customModelName,
        supportedItems: playerItems,
        defaultItem: 'helmet',
      },
      {
        id: 'npc:chispa',
        label: 'Chispa (Sofía Méndez)',
        kind: 'npc',
        animationTag: 'ally_chispa',
        customGlbName: this.customNpcNames.ally_chispa,
        supportedItems: playerItems,
        defaultItem: 'helmet',
      },
      {
        id: 'npc:mateo',
        label: 'Mateo (Mecánico)',
        kind: 'npc',
        animationTag: 'npc_mateo',
        customGlbName: this.customNpcNames.npc_mateo,
        supportedItems: playerItems,
        defaultItem: 'helmet',
      },
      {
        id: 'zombie',
        label: 'Zombis (Horda General)',
        kind: 'zombie',
        animationTag: 'zombie',
        customGlbName: this.getCustomZombieSummary(),
        supportedItems: zombieItems,
        defaultItem: 'helmet',
        isZombiePresetGroup: true,
      },
    ];

    for (let i = 0; i < this.customZombieSlots.length; i++) {
      const zSlot = this.customZombieSlots[i];
      const isCrawlerName = /crawl|crawling|crawler|arrastr/i.test(zSlot.name);
      const zTag = isCrawlerName
        ? 'zombie_crawler'
        : zSlot.targetKind === 'police'
          ? 'zombie_police'
          : zSlot.targetKind === 'gendarme'
            ? 'zombie_gendarme'
            : zSlot.targetKind === 'gendarme_heavy' || zSlot.targetKind === 'brute'
              ? 'zombie_brute'
              : zSlot.targetKind === 'runner'
                ? 'zombie_runner'
                : zSlot.targetKind === 'spitter'
                  ? 'zombie_spitter'
                  : zSlot.targetKind === 'biter' || zSlot.targetKind === 'stalker'
                    ? 'zombie_walker'
                    : 'zombie';
      catalog.push({
        id: `zombie:${zSlot.id}`,
        label: `Zombie · ${zSlot.name.replace(/\.glb$/i, '')}`,
        kind: 'zombie',
        animationTag: zTag,
        customGlbName: zSlot.name,
        supportedItems: zombieItems,
        defaultItem: 'helmet',
        zombieSlotId: zSlot.id,
      });
    }

    for (let i = 0; i < this.customCharacterSlots.length; i++) {
      const cSlot = this.customCharacterSlots[i];
      catalog.push({
        id: `custom:${cSlot.id}`,
        label: cSlot.name.replace(/\.glb$/i, ''),
        kind: 'custom',
        animationTag:
          cSlot.role === 'ally' ? 'survivor' : cSlot.role === 'npc' ? 'npc' : 'custom',
        customGlbName: cSlot.name,
        supportedItems: playerItems,
        defaultItem: 'helmet',
        customCharacterSlotId: cSlot.id,
      });
    }

    return catalog;
  }

  public async loadCustomRifleGlbFile(file: File): Promise<void> {
    this.modelError = null;
    try {
      const buffer = await file.arrayBuffer();
      await this.applyRifleGlbBuffer(buffer, file.name);
      await guardarRifleCache(buffer, file.name);
      if (!this.isSoftwareGl && !this.disposed) {
        this.renderer.compile(this.scene, this.camera);
      }
      this.emitHud();
    } catch (err) {
      this.modelError =
        err instanceof Error ? `Fusil .glb inválido: ${err.message}` : 'Error al cargar fusil .glb.';
      this.emitHud();
    }
  }

  public async loadCustomPistolGlbFile(file: File): Promise<void> {
    this.modelError = null;
    try {
      const buffer = await file.arrayBuffer();
      await this.applyPistolGlbBuffer(buffer, file.name);
      await guardarPistolCache(buffer, file.name);
      if (!this.isSoftwareGl && !this.disposed) {
        this.renderer.compile(this.scene, this.camera);
      }
      this.emitHud();
    } catch (err) {
      this.modelError =
        err instanceof Error ? `Revólver .glb inválido: ${err.message}` : 'Error al cargar revólver .glb.';
      this.emitHud();
    }
  }

  private getLootKindForEquipment(kind: CustomEquipmentId): LootKind {
    return kind === 'arrow' ? 'arrows' : kind;
  }

  private getEquipmentTemplateForLoot(kind: LootKind): CustomEquipmentTemplate | null {
    if (
      kind === 'helmet' ||
      kind === 'vest' ||
      kind === 'bow' ||
      kind === 'stick' ||
      kind === 'baton'
    ) {
      return this.customEquipmentTemplates.get(kind) ?? null;
    }
    return null;
  }

  private applyAllCustomGearToPlayerRig(): void {
    if (this.customRifleTemplate) {
      applyRifleToRig(this.playerRig, this.customRifleTemplate);
    }
    if (this.customPistolTemplate) {
      applyPistolToRig(this.playerRig, this.customPistolTemplate);
    }
    const helmetTmpl = this.customEquipmentTemplates.get('helmet') ?? null;
    const vestTmpl = this.customEquipmentTemplates.get('vest') ?? null;
    const stickTmpl = this.customEquipmentTemplates.get('stick') ?? null;
    const batonTmpl = this.customEquipmentTemplates.get('baton') ?? null;
    const bowTmpl = this.customEquipmentTemplates.get('bow') ?? null;
    const arrowTmpl = this.customEquipmentTemplates.get('arrow') ?? null;

    if (helmetTmpl) applyEquipmentToRig(this.playerRig, 'helmet', helmetTmpl);
    if (vestTmpl) applyEquipmentToRig(this.playerRig, 'vest', vestTmpl);
    if (stickTmpl) applyEquipmentToRig(this.playerRig, 'stick', stickTmpl);
    if (batonTmpl) applyEquipmentToRig(this.playerRig, 'baton', batonTmpl);
    if (bowTmpl || arrowTmpl) {
      applyEquipmentToRig(this.playerRig, 'bow', bowTmpl, arrowTmpl);
    }
    const backpackTmpl = this.objectOverrideTemplates.get('loot_backpack') ?? null;
    if (backpackTmpl) {
      applyBackpackOverrideToRig(this.playerRig, backpackTmpl);
    }
    this.syncWeaponVisibility();
    this.syncArmorVisibility();
    this.applyAllAttachmentTransforms();
  }

  private refreshEquipmentPickupsVisuals(kind: CustomEquipmentId): void {
    const lootKind = this.getLootKindForEquipment(kind);
    const equipFallback = this.getEquipmentTemplateForLoot(lootKind);
    const overrideTmpl =
      this.objectOverrideTemplates.get(`loot_${lootKind}` as WorldObjectOverrideId) ?? null;
    if (overrideTmpl) return;
    for (let i = 0; i < this.pickups.length; i++) {
      const p = this.pickups[i];
      if (!p.active || p.kind !== lootKind) continue;
      this.scene.remove(p.mesh);
      p.disposeMesh?.();
      const rebuilt = this.buildPickupVisual(lootKind, null, equipFallback);
      rebuilt.mesh.position.set(p.x, p.y, p.z);
      rebuilt.mesh.rotation.copy(p.mesh.rotation);
      p.mesh = rebuilt.mesh;
      p.disposeMesh = rebuilt.disposeMesh;
      this.scene.add(p.mesh);
    }
  }

  private async applyEquipmentGlbBuffer(
    kind: CustomEquipmentId,
    buffer: ArrayBuffer,
    fileName: string,
    options: { silentHud?: boolean } = {},
  ): Promise<void> {
    const template = await parseGlbEquipmentTemplate(buffer, kind);
    if (this.disposed) {
      template.dispose();
      return;
    }
    this.customEquipmentTemplates.get(kind)?.dispose();
    this.customEquipmentTemplates.set(kind, template);
    this.customEquipmentNames = {
      ...this.customEquipmentNames,
      [kind]: fileName,
    };

    if (kind === 'arrow') {
      this.playerArrowPool = [];
      applyEquipmentToRig(
        this.playerRig,
        'bow',
        this.customEquipmentTemplates.get('bow') ?? null,
        template,
      );
    } else if (kind === 'bow') {
      applyEquipmentToRig(
        this.playerRig,
        'bow',
        template,
        this.customEquipmentTemplates.get('arrow') ?? null,
      );
    } else {
      applyEquipmentToRig(this.playerRig, kind, template);
    }
    this.syncWeaponVisibility();
    this.syncArmorVisibility();
    this.applyAllAttachmentTransforms();
    this.refreshEquipmentPickupsVisuals(kind);
    this.modelError = null;
    if (!options.silentHud) {
      this.emitHud();
    }
  }

  public async loadCustomEquipmentGlbFile(kind: CustomEquipmentId, file: File): Promise<void> {
    this.modelError = null;
    try {
      const buffer = await file.arrayBuffer();
      await this.applyEquipmentGlbBuffer(kind, buffer, file.name, { silentHud: true });
      if (this.disposed) return;
      await guardarEquipmentCache(kind, buffer, file.name);
      if (!this.isSoftwareGl && !this.disposed) {
        this.renderer.compile(this.scene, this.camera);
      }
      this.emitHud();
    } catch (err) {
      this.modelError =
        err instanceof Error
          ? `Modelo .glb inválido (${kind}): ${err.message}`
          : `Error al cargar modelo .glb (${kind}).`;
      this.emitHud();
    }
  }

  public async resetToDefaultEquipment(kind: CustomEquipmentId): Promise<void> {
    await eliminarEquipmentCache(kind);
    if (this.disposed) return;
    this.customEquipmentTemplates.get(kind)?.dispose();
    this.customEquipmentTemplates.delete(kind);
    const nextNames = { ...this.customEquipmentNames };
    delete nextNames[kind];
    this.customEquipmentNames = nextNames;
    this.modelError = null;

    if (kind === 'arrow') {
      this.playerArrowPool = [];
      applyEquipmentToRig(
        this.playerRig,
        'bow',
        this.customEquipmentTemplates.get('bow') ?? null,
        null,
      );
    } else if (kind === 'bow') {
      applyEquipmentToRig(
        this.playerRig,
        'bow',
        null,
        this.customEquipmentTemplates.get('arrow') ?? null,
      );
    } else {
      applyEquipmentToRig(this.playerRig, kind, null);
    }
    this.syncWeaponVisibility();
    this.syncArmorVisibility();
    this.applyAllAttachmentTransforms();
    this.refreshEquipmentPickupsVisuals(kind);
    this.emitHud();
  }

  private async applyObjectOverrideGlbBuffer(
    targetId: WorldObjectOverrideId,
    buffer: ArrayBuffer,
    fileName: string,
    options: { silentHud?: boolean } = {},
  ): Promise<void> {
    const def = WORLD_OBJECT_OVERRIDE_DEFS.find((d) => d.id === targetId);
    if (!def) return;
    const template = await parseGlbObjectTemplate(buffer, def.targetSize, def.fitMode);
    if (this.disposed) {
      template.dispose();
      return;
    }
    const prev = this.objectOverrideTemplates.get(targetId);
    this.objectOverrideTemplates.set(targetId, template);
    this.objectOverrideNames = { ...this.objectOverrideNames, [targetId]: fileName };
    this.applyWorldObjectOverrideVisual(targetId, template);
    prev?.dispose();
    this.modelError = null;
    if (!options.silentHud) {
      this.emitHud();
    }
  }

  public async loadObjectOverrideGlb(targetId: WorldObjectOverrideId, file: File): Promise<void> {
    this.modelError = null;
    const def = WORLD_OBJECT_OVERRIDE_DEFS.find((d) => d.id === targetId);
    if (!def) return;
    try {
      const buffer = await file.arrayBuffer();
      await this.applyObjectOverrideGlbBuffer(targetId, buffer, file.name, { silentHud: true });
      if (this.disposed) return;
      await guardarObjectOverrideCache(targetId, buffer, file.name);
      if (!this.isSoftwareGl && !this.disposed) {
        this.renderer.compile(this.scene, this.camera);
      }
      this.emitHud();
    } catch (err) {
      this.modelError =
        err instanceof Error
          ? `Modelo .glb inválido (${def.label}): ${err.message}`
          : `Error al cargar modelo para ${def.label}.`;
      this.emitHud();
    }
  }

  public async resetObjectOverride(targetId: WorldObjectOverrideId): Promise<void> {
    await eliminarObjectOverrideCache(targetId);
    if (this.disposed) return;
    const prev = this.objectOverrideTemplates.get(targetId);
    this.objectOverrideTemplates.delete(targetId);
    const nextNames = { ...this.objectOverrideNames };
    delete nextNames[targetId];
    this.objectOverrideNames = nextNames;
    this.applyWorldObjectOverrideVisual(targetId, null);
    prev?.dispose();
    this.modelError = null;
    this.emitHud();
  }

  public async resetAllObjectOverrides(): Promise<void> {
    await limpiarTodosObjectOverridesCache();
    if (this.disposed) return;
    const oldEntries = Array.from(this.objectOverrideTemplates.entries());
    this.objectOverrideTemplates.clear();
    this.objectOverrideNames = {};
    oldEntries.forEach(([id, tmpl]) => {
      this.applyWorldObjectOverrideVisual(id, null);
      tmpl.dispose();
    });
    this.modelError = null;
    this.emitHud();
  }

  private attachHeldThrowablesToRig() {
    if (
      !this.heldMolotovGroup ||
      !this.heldNailBombGroup ||
      !this.heldGrenadeGroup ||
      !this.heldBottleGroup ||
      !this.heldCanGroup ||
      !this.heldBrickGroup ||
      !this.heldDecoyRatGroup
    ) {
      return;
    }
    this.playerRig.throwableMount.add(
      this.heldMolotovGroup,
      this.heldNailBombGroup,
      this.heldGrenadeGroup,
      this.heldBottleGroup,
      this.heldCanGroup,
      this.heldBrickGroup,
      this.heldDecoyRatGroup,
    );
  }

  private rebuildHeldThrowables() {
    if (this.heldMolotovGroup) {
      this.heldMolotovGroup.parent?.remove(this.heldMolotovGroup);
      this.disposeHeldMolotov();
    }
    if (this.heldNailBombGroup) {
      this.heldNailBombGroup.parent?.remove(this.heldNailBombGroup);
      this.disposeHeldNailBomb();
    }
    if (this.heldGrenadeGroup) {
      this.heldGrenadeGroup.parent?.remove(this.heldGrenadeGroup);
      this.disposeHeldGrenade();
    }
    if (this.heldBottleGroup) {
      this.heldBottleGroup.parent?.remove(this.heldBottleGroup);
      this.disposeHeldBottle();
    }
    if (this.heldCanGroup) {
      this.heldCanGroup.parent?.remove(this.heldCanGroup);
      this.disposeHeldCan();
    }
    if (this.heldBrickGroup) {
      this.heldBrickGroup.parent?.remove(this.heldBrickGroup);
      this.disposeHeldBrick();
    }
    if (this.heldDecoyRatGroup) {
      this.heldDecoyRatGroup.parent?.remove(this.heldDecoyRatGroup);
      this.disposeHeldDecoyRat();
    }

    const molTmpl = this.objectOverrideTemplates.get('loot_molotov') ?? null;
    const molBuilt = buildThrownThrowableMesh('molotov', molTmpl);
    molBuilt.group.scale.setScalar(molTmpl ? 0.56 : 0.78);
    molBuilt.group.position.set(0, -0.02, 0);
    const flame = buildFlameCluster({
      radius: 0.022,
      minHeight: 0.09,
      maxHeight: 0.17,
      minWidth: 0.048,
      maxWidth: 0.078,
      outerCount: 4,
      coreCount: 3,
      speed: 2.35,
      seedOffset: 7.4,
    });
    flame.group.position.set(0, molTmpl ? 0.22 : 0.24, 0);
    molBuilt.group.add(flame.group);
    molBuilt.group.visible = false;
    this.heldMolotovGroup = molBuilt.group;
    this.heldMolotovFlame = flame;
    this.disposeHeldMolotov = () => {
      flame.dispose();
      molBuilt.dispose();
    };

    const nailTmpl = this.objectOverrideTemplates.get('loot_nail_bomb') ?? null;
    const nailBuilt = buildThrownThrowableMesh('nail_bomb', nailTmpl);
    nailBuilt.group.scale.setScalar(nailTmpl ? 0.56 : 0.72);
    nailBuilt.group.position.set(0, -0.01, 0);
    nailBuilt.group.visible = false;
    this.heldNailBombGroup = nailBuilt.group;
    this.disposeHeldNailBomb = nailBuilt.dispose;

    const grenBuilt = buildThrownThrowableMesh('grenade', null);
    grenBuilt.group.scale.setScalar(0.62);
    grenBuilt.group.position.set(0, 0, 0);
    grenBuilt.group.visible = false;
    this.heldGrenadeGroup = grenBuilt.group;
    this.disposeHeldGrenade = grenBuilt.dispose;

    const botTmpl = this.objectOverrideTemplates.get('loot_bottle') ?? null;
    const botBuilt = buildThrownThrowableMesh('bottle', botTmpl);
    botBuilt.group.scale.setScalar(botTmpl ? 0.54 : 0.72);
    botBuilt.group.position.set(0, -0.02, 0);
    botBuilt.group.visible = false;
    this.heldBottleGroup = botBuilt.group;
    this.disposeHeldBottle = botBuilt.dispose;

    const canTmpl = this.objectOverrideTemplates.get('loot_can') ?? null;
    const canBuilt = buildThrownThrowableMesh('can', canTmpl);
    canBuilt.group.scale.setScalar(canTmpl ? 0.54 : 0.68);
    canBuilt.group.position.set(0, 0, 0);
    canBuilt.group.visible = false;
    this.heldCanGroup = canBuilt.group;
    this.disposeHeldCan = canBuilt.dispose;

    const brickTmpl = this.objectOverrideTemplates.get('loot_brick') ?? null;
    const brickBuilt = buildThrownThrowableMesh('brick', brickTmpl);
    brickBuilt.group.scale.setScalar(brickTmpl ? 0.56 : 0.7);
    brickBuilt.group.position.set(0, 0, 0);
    brickBuilt.group.visible = false;
    this.heldBrickGroup = brickBuilt.group;
    this.disposeHeldBrick = brickBuilt.dispose;

    const ratBuilt = buildThrownThrowableMesh('decoy_rat', null);
    ratBuilt.group.scale.setScalar(0.76);
    ratBuilt.group.position.set(0, -0.04, 0.02);
    ratBuilt.group.visible = false;
    this.heldDecoyRatGroup = ratBuilt.group;
    this.disposeHeldDecoyRat = ratBuilt.dispose;

    this.attachHeldThrowablesToRig();
    this.applyAllAttachmentTransforms();
  }

  private getHeldThrowableNodeMap() {
    return {
      molotov: this.heldMolotovGroup,
      nail_bomb: this.heldNailBombGroup,
      grenade: this.heldGrenadeGroup,
      bottle: this.heldBottleGroup,
      can: this.heldCanGroup,
      brick: this.heldBrickGroup,
    };
  }

  private getZombieTransformsForSlot(
    slotId?: string,
  ): Partial<Record<ZombieAttachableId, AttachmentTransform>> {
    if (!slotId) return this.attachmentTransforms.zombie;
    const entityOverrides = this.attachmentTransforms.entities?.[`zombie:${slotId}`];
    if (!entityOverrides) return this.attachmentTransforms.zombie;
    return {
      ...this.attachmentTransforms.zombie,
      ...(entityOverrides as Partial<Record<ZombieAttachableId, AttachmentTransform>>),
    };
  }

  private applyAllAttachmentTransforms() {
    applyPlayerAttachmentTransformsToRig(
      this.playerRig,
      this.attachmentTransforms.player,
      this.getHeldThrowableNodeMap(),
    );
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      applyZombieAttachmentTransformsToBundle(
        e.bundle,
        this.getZombieTransformsForSlot(e.customSlotId),
      );
    }
  }

  private scheduleAttachmentTransformSave() {
    if (this.attachmentSaveTimer !== null) {
      clearTimeout(this.attachmentSaveTimer);
    }
    this.attachmentSaveTimer = window.setTimeout(() => {
      this.attachmentSaveTimer = null;
      guardarAttachmentTransformsLocal(this.attachmentTransforms);
    }, 350);
  }

  public flushAttachmentTransformsPersistence() {
    if (this.attachmentSaveTimer !== null) {
      clearTimeout(this.attachmentSaveTimer);
      this.attachmentSaveTimer = null;
    }
    guardarAttachmentTransformsLocal(this.attachmentTransforms);
  }

  public setRenderSuspended(suspended: boolean) {
    if (this.renderSuspended === suspended) return;
    this.renderSuspended = suspended;
    if (suspended) {
      cancelAnimationFrame(this.frameId);
      clearTimeout(this.frameId);
      this.frameId = 0;
    } else if (!this.disposed) {
      this.lastTimestamp = performance.now();
      this.scheduleNextFrame();
    }
  }

  public setAttachmentTransform(
    scope: AttachmentTargetScope,
    itemId: string,
    patch: Partial<AttachmentTransform>,
  ) {
    if (scope === 'player') {
      const id = itemId as PlayerAttachableId;
      const cur = this.attachmentTransforms.player[id] ?? { ...DEFAULT_ATTACHMENT_TRANSFORM };
      const next = sanitizeAttachmentTransform({ ...cur, ...patch });
      this.attachmentTransforms = {
        ...this.attachmentTransforms,
        player: {
          ...this.attachmentTransforms.player,
          [id]: next,
        },
      };
      applyPlayerAttachmentTransformsToRig(
        this.playerRig,
        this.attachmentTransforms.player,
        this.getHeldThrowableNodeMap(),
      );
    } else if (scope === 'zombie') {
      const id = itemId as ZombieAttachableId;
      const cur = this.attachmentTransforms.zombie[id] ?? { ...DEFAULT_ATTACHMENT_TRANSFORM };
      const next = sanitizeAttachmentTransform({ ...cur, ...patch });
      this.attachmentTransforms = {
        ...this.attachmentTransforms,
        zombie: {
          ...this.attachmentTransforms.zombie,
          [id]: next,
        },
      };
      for (let i = 0; i < this.enemies.length; i++) {
        const e = this.enemies[i];
        applyZombieAttachmentTransformsToBundle(
          e.bundle,
          this.getZombieTransformsForSlot(e.customSlotId),
        );
      }
    } else {
      const id = itemId as PlayerAttachableId;
      const prevEntityMap = this.attachmentTransforms.entities?.[scope] ?? {};
      const cur = prevEntityMap[id] ?? { ...DEFAULT_ATTACHMENT_TRANSFORM };
      const next = sanitizeAttachmentTransform({ ...cur, ...patch });
      this.attachmentTransforms = {
        ...this.attachmentTransforms,
        entities: {
          ...this.attachmentTransforms.entities,
          [scope]: {
            ...prevEntityMap,
            [id]: next,
          },
        },
      };
      if (scope.startsWith('zombie:')) {
        const targetSlotId = scope.slice('zombie:'.length);
        for (let i = 0; i < this.enemies.length; i++) {
          const e = this.enemies[i];
          if (e.customSlotId === targetSlotId) {
            applyZombieAttachmentTransformsToBundle(
              e.bundle,
              this.getZombieTransformsForSlot(e.customSlotId),
            );
          }
        }
      }
    }
    this.scheduleAttachmentTransformSave();
    this.emitHud();
  }

  public resetAttachmentTransform(scope: AttachmentTargetScope, itemId: string) {
    this.setAttachmentTransform(scope, itemId, { ...DEFAULT_ATTACHMENT_TRANSFORM });
    this.flushAttachmentTransformsPersistence();
  }

  public resetAllAttachmentTransforms(scope?: AttachmentTargetScope) {
    const defaults = createDefaultAttachmentTransforms();
    if (scope === 'player') {
      this.attachmentTransforms = {
        ...this.attachmentTransforms,
        player: defaults.player,
      };
    } else if (scope === 'zombie') {
      this.attachmentTransforms = {
        ...this.attachmentTransforms,
        zombie: defaults.zombie,
      };
    } else if (scope) {
      const nextEntities = { ...this.attachmentTransforms.entities };
      delete nextEntities[scope];
      this.attachmentTransforms = {
        ...this.attachmentTransforms,
        entities: nextEntities,
      };
    } else {
      this.attachmentTransforms = defaults;
    }
    this.flushAttachmentTransformsPersistence();
    this.applyAllAttachmentTransforms();
    this.emitHud();
  }

  public async createStudioPreviewSubject(
    scope: AttachmentTargetScope,
    zombieModelId: string,
    selectedZombieItem: ZombieAttachableId = 'helmet',
  ): Promise<StudioPreviewSubject> {
    const pvFwd = new THREE.Vector3(0, 0, 1);
    const pvRight = new THREE.Vector3(-1, 0, 0);
    const pvUp = new THREE.Vector3(0, 1, 0);
    const pvChest = new THREE.Vector3();
    const pvRSh = new THREE.Vector3();
    const pvLSh = new THREE.Vector3();
    const pvRGrip = new THREE.Vector3();
    const pvLGrip = new THREE.Vector3();
    const pvPoleR = new THREE.Vector3();
    const pvPoleL = new THREE.Vector3();
    const pvAimDir = new THREE.Vector3();
    const pvUpOrtho = new THREE.Vector3();
    const pvPalmW = new THREE.Vector3();
    const pvThumbW = new THREE.Vector3();
    const pvFingerW = new THREE.Vector3();
    const pvDirA = new THREE.Vector3();
    const pvDirB = new THREE.Vector3();
    const pvSavedRArmQ = new THREE.Quaternion();
    const pvSavedRForeQ = new THREE.Quaternion();
    const pvSavedRHandQ = new THREE.Quaternion();
    const pvSavedLArmQ = new THREE.Quaternion();
    const pvSavedLForeQ = new THREE.Quaternion();
    const pvSavedLHandQ = new THREE.Quaternion();

    const isZombieScope = scope === 'zombie' || scope.startsWith('zombie:');
    const resolvedZombieModelId = scope.startsWith('zombie:')
      ? scope.slice('zombie:'.length)
      : zombieModelId;

    if (!isZombieScope) {
      let rig: CharacterRig;
      if (scope === 'player') {
        rig = this.customPlayerBuffer
          ? await parseGlbCharacter(
              this.customPlayerBuffer,
              this.customRifleTemplate,
              this.customPistolTemplate,
            )
          : buildDefaultSurvivor(this.customRifleTemplate, this.customPistolTemplate);
      } else if (scope === 'npc:chispa') {
        const npcTmpl = this.customNpcTemplates.get('ally_chispa') ?? null;
        if (npcTmpl) {
          rig = buildCharacterRigFromTemplate(npcTmpl, {
            entityId: 'npc:chispa',
            label: 'Chispa (Sofía Méndez)',
            role: 'npc',
            tag: 'ally_chispa',
            customRifleTemplate: this.customRifleTemplate,
            customPistolTemplate: this.customPistolTemplate,
          });
        } else {
          const ally = buildAllyChemistRig();
          ally.flaskGlow.visible = false;
          rig = equipModelWithCharacterRig({
            entityId: 'npc:chispa',
            label: 'Chispa (Sofía Méndez)',
            role: 'npc',
            tag: 'ally_chispa',
            model: ally.bodyPivot,
            isCustomGlb: false,
            customRifleTemplate: this.customRifleTemplate,
            customPistolTemplate: this.customPistolTemplate,
            onDispose: () => ally.dispose(),
          });
        }
      } else if (scope === 'npc:mateo') {
        const npcTmpl = this.customNpcTemplates.get('npc_mateo') ?? null;
        if (npcTmpl) {
          rig = buildCharacterRigFromTemplate(npcTmpl, {
            entityId: 'npc:mateo',
            label: 'Mateo (Mecánico)',
            role: 'npc',
            tag: 'npc_mateo',
            customRifleTemplate: this.customRifleTemplate,
            customPistolTemplate: this.customPistolTemplate,
          });
        } else {
          const mech = buildMechanicNpcRig();
          mech.wrenchGroup.visible = false;
          rig = equipModelWithCharacterRig({
            entityId: 'npc:mateo',
            label: 'Mateo (Mecánico)',
            role: 'npc',
            tag: 'npc_mateo',
            model: mech.bodyPivot,
            isCustomGlb: false,
            customRifleTemplate: this.customRifleTemplate,
            customPistolTemplate: this.customPistolTemplate,
            onDispose: () => mech.dispose(),
          });
        }
      } else if (scope.startsWith('custom:')) {
        const slotId = scope.slice('custom:'.length);
        const charTmpl = this.customCharacterTemplates.get(slotId) ?? null;
        const cSlot = this.customCharacterSlots.find((s) => s.id === slotId);
        const customTag: CharacterAnimationTag =
          cSlot?.role === 'ally' ? 'survivor' : cSlot?.role === 'npc' ? 'npc' : 'custom';
        rig = charTmpl
          ? buildCharacterRigFromTemplate(charTmpl, {
              entityId: scope,
              label: charTmpl.name,
              role: 'npc',
              tag: customTag,
              customRifleTemplate: this.customRifleTemplate,
              customPistolTemplate: this.customPistolTemplate,
            })
          : buildDefaultSurvivor(this.customRifleTemplate, this.customPistolTemplate);
      } else {
        rig = buildDefaultSurvivor(this.customRifleTemplate, this.customPistolTemplate);
      }

      const helmetTmpl = this.customEquipmentTemplates.get('helmet') ?? null;
      const vestTmpl = this.customEquipmentTemplates.get('vest') ?? null;
      const stickTmpl = this.customEquipmentTemplates.get('stick') ?? null;
      const batonTmpl = this.customEquipmentTemplates.get('baton') ?? null;
      const bowTmpl = this.customEquipmentTemplates.get('bow') ?? null;
      const arrowTmpl = this.customEquipmentTemplates.get('arrow') ?? null;
      const backpackTmpl = this.objectOverrideTemplates.get('loot_backpack') ?? null;

      if (helmetTmpl) applyEquipmentToRig(rig, 'helmet', helmetTmpl);
      if (vestTmpl) applyEquipmentToRig(rig, 'vest', vestTmpl);
      if (stickTmpl) applyEquipmentToRig(rig, 'stick', stickTmpl);
      if (batonTmpl) applyEquipmentToRig(rig, 'baton', batonTmpl);
      if (bowTmpl || arrowTmpl) applyEquipmentToRig(rig, 'bow', bowTmpl, arrowTmpl);
      if (backpackTmpl) applyBackpackOverrideToRig(rig, backpackTmpl);

      const molTmpl = this.objectOverrideTemplates.get('loot_molotov') ?? null;
      const molBuilt = buildThrownThrowableMesh('molotov', molTmpl);
      molBuilt.group.scale.setScalar(molTmpl ? 0.56 : 0.78);
      molBuilt.group.position.set(0, -0.02, 0);
      const molFlame = buildFlameCluster({
        radius: 0.022,
        minHeight: 0.09,
        maxHeight: 0.17,
        minWidth: 0.048,
        maxWidth: 0.078,
        outerCount: 4,
        coreCount: 3,
        speed: 2.35,
        seedOffset: 7.4,
      });
      molFlame.group.position.set(0, molTmpl ? 0.22 : 0.24, 0);
      molBuilt.group.add(molFlame.group);
      molBuilt.group.visible = false;

      const nailTmpl = this.objectOverrideTemplates.get('loot_nail_bomb') ?? null;
      const nailBuilt = buildThrownThrowableMesh('nail_bomb', nailTmpl);
      nailBuilt.group.scale.setScalar(nailTmpl ? 0.56 : 0.72);
      nailBuilt.group.position.set(0, -0.01, 0);
      nailBuilt.group.visible = false;

      const grenBuilt = buildThrownThrowableMesh('grenade', null);
      grenBuilt.group.scale.setScalar(0.62);
      grenBuilt.group.visible = false;

      const botTmpl = this.objectOverrideTemplates.get('loot_bottle') ?? null;
      const botBuilt = buildThrownThrowableMesh('bottle', botTmpl);
      botBuilt.group.scale.setScalar(botTmpl ? 0.54 : 0.72);
      botBuilt.group.position.set(0, -0.02, 0);
      botBuilt.group.visible = false;

      const canTmpl = this.objectOverrideTemplates.get('loot_can') ?? null;
      const canBuilt = buildThrownThrowableMesh('can', canTmpl);
      canBuilt.group.scale.setScalar(canTmpl ? 0.54 : 0.68);
      canBuilt.group.visible = false;

      const brickTmpl = this.objectOverrideTemplates.get('loot_brick') ?? null;
      const brickBuilt = buildThrownThrowableMesh('brick', brickTmpl);
      brickBuilt.group.scale.setScalar(brickTmpl ? 0.56 : 0.7);
      brickBuilt.group.visible = false;

      rig.throwableMount.add(
        molBuilt.group,
        nailBuilt.group,
        grenBuilt.group,
        botBuilt.group,
        canBuilt.group,
        brickBuilt.group,
      );

      const heldMap = {
        molotov: molBuilt.group,
        nail_bomb: nailBuilt.group,
        grenade: grenBuilt.group,
        bottle: botBuilt.group,
        can: canBuilt.group,
        brick: brickBuilt.group,
      };

      rig.root.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });

      let curPose: PreviewPoseId = 'unarmed';
      let curItem: PlayerAttachableId = 'helmet';
      let curArmor = { helmet: true, vest: true, backpack: true };
      let previewTime = 0;

      const isArmorItem = (id: PlayerAttachableId) =>
        id === 'helmet' || id === 'vest' || id === 'backpack';
      const isThrowableItem = (id: PlayerAttachableId): id is keyof typeof heldMap =>
        id === 'molotov' ||
        id === 'nail_bomb' ||
        id === 'grenade' ||
        id === 'bottle' ||
        id === 'can' ||
        id === 'brick';

      const syncPreviewVisibility = () => {
        const showHelmet = curArmor.helmet || curItem === 'helmet';
        const showVest = curArmor.vest || curItem === 'vest';
        const showBackpack = curArmor.backpack || curItem === 'backpack';
        rig.equipHelmetMesh.visible = showHelmet;
        rig.equipVestMesh.visible = showVest;
        rig.equipBackpackMesh.visible = showBackpack;
        if (rig.equipBackpackBasePos) {
          rig.equipBackpackMesh.position.copy(rig.equipBackpackBasePos);
          if (showVest && rig.equipBackpackVestOffset) {
            rig.equipBackpackMesh.position.add(rig.equipBackpackVestOffset);
          }
        }

        rig.rifleMesh.visible = false;
        rig.pistolMesh.visible = false;
        rig.bowMesh.visible = false;
        rig.bowNockedArrow.visible = false;
        rig.arrowMesh.visible = false;
        rig.stickMesh.visible = false;
        rig.batonMesh.visible = false;
        molBuilt.group.visible = false;
        molFlame.group.visible = false;
        nailBuilt.group.visible = false;
        grenBuilt.group.visible = false;
        botBuilt.group.visible = false;
        canBuilt.group.visible = false;
        brickBuilt.group.visible = false;

        if (!isArmorItem(curItem)) {
          if (curItem === 'rifle') {
            rig.rifleMesh.visible = true;
          } else if (curItem === 'pistol') {
            rig.pistolMesh.visible = true;
          } else if (curItem === 'bow') {
            rig.bowMesh.visible = true;
            rig.arrowMesh.visible = true;
          } else if (curItem === 'arrow') {
            rig.bowMesh.visible = curPose === 'rifle';
            rig.arrowMesh.visible = true;
          } else if (curItem === 'stick') {
            rig.stickMesh.visible = true;
          } else if (curItem === 'baton') {
            rig.batonMesh.visible = true;
          } else if (isThrowableItem(curItem)) {
            heldMap[curItem].visible = true;
            if (curItem === 'molotov') {
              molFlame.group.visible = true;
            }
          }
        } else {
          if (curPose === 'one_handed') {
            rig.pistolMesh.visible = true;
          } else if (curPose === 'rifle') {
            rig.rifleMesh.visible = true;
          }
        }
      };

      const stepPose = (dt: number, snap = false) => {
        previewTime += dt;
        const { bones, bodyPivot, isCustomGlb } = rig;
        const idleSway = Math.sin(previewTime * 1.8) * 0.014;
        const breath = Math.sin(previewTime * 2.1) * 0.018;
        const lam = snap ? 500 : 18;
        const ikLam = snap ? 500 : 38;

        const hasClips = Boolean(rig.mixer && rig.clips && Object.keys(rig.clips).length > 0);
        const holdingSomething = curPose !== 'unarmed' || !isArmorItem(curItem);
        const activeRightItem: PlayerAttachableId = !isArmorItem(curItem)
          ? curItem
          : curPose === 'rifle'
            ? 'rifle'
            : curPose === 'one_handed'
              ? 'pistol'
              : 'helmet';

        let skipBodyToArms = false;
        if (hasClips && rig.mixer && rig.character.hasAction('idle')) {
          if (holdingSomething) {
            if (bones.rightArm) pvSavedRArmQ.copy(bones.rightArm.node.quaternion);
            if (bones.rightForeArm) pvSavedRForeQ.copy(bones.rightForeArm.node.quaternion);
            if (bones.rightHand) pvSavedRHandQ.copy(bones.rightHand.quaternion);
            if (bones.leftArm) pvSavedLArmQ.copy(bones.leftArm.node.quaternion);
            if (bones.leftForeArm) pvSavedLForeQ.copy(bones.leftForeArm.node.quaternion);
            if (bones.leftHand) pvSavedLHandQ.copy(bones.leftHand.quaternion);
          }
          rig.character.setAction('idle', { fadeSec: 0.12, timeScale: 1.0 });
          rig.character.updateAnimation(dt);
          rig.root.updateMatrixWorld(true);
          bodyPivot.position.set(0, 0, 0);
          bodyPivot.rotation.set(0, 0, 0);

          if (holdingSomething) {
            if (bones.rightArm) bones.rightArm.node.quaternion.copy(pvSavedRArmQ);
            if (bones.rightForeArm) bones.rightForeArm.node.quaternion.copy(pvSavedRForeQ);
            if (bones.rightHand) bones.rightHand.quaternion.copy(pvSavedRHandQ);
            if (bones.leftArm) bones.leftArm.node.quaternion.copy(pvSavedLArmQ);
            if (bones.leftForeArm) bones.leftForeArm.node.quaternion.copy(pvSavedLForeQ);
            if (bones.leftHand) bones.leftHand.quaternion.copy(pvSavedLHandQ);
            skipBodyToArms = true;
          } else {
            applyHandFingerCurl(bones.rightFingers, 0.12, isCustomGlb ? 0.78 : 0.96, dt, lam);
            applyHandFingerCurl(bones.leftFingers, 0.12, isCustomGlb ? 0.78 : 0.96, dt, lam);
            rig.root.updateMatrixWorld(true);
            return;
          }
        } else {
          rig.resetClips?.();
        }

        if (!skipBodyToArms) {
          bodyPivot.position.set(0, 0, 0);
          bodyPivot.rotation.set(0, 0, 0);
          if (bones.hips) {
            bones.hips.node.position.copy(bones.hips.restPos);
            dampBoneRot(bones.hips, 0, 0, 0, lam, dt);
          }
          if (bones.leftUpLeg && bones.rightUpLeg) {
            dampBoneRot(bones.leftUpLeg, 0, 0, 0.03, lam, dt);
            dampBoneRot(bones.rightUpLeg, 0, 0, -0.03, lam, dt);
            dampBoneRot(bones.leftLeg, 0.04, 0, 0, lam, dt);
            dampBoneRot(bones.rightLeg, 0.04, 0, 0, lam, dt);
            dampBoneRot(bones.leftFoot, -0.02, 0, 0, lam, dt);
            dampBoneRot(bones.rightFoot, -0.02, 0, 0, lam, dt);
          }
          dampNeckAndHead(bones, breath * 0.4, 0, 0, lam, dt);
          if (bones.spine) {
            const spineTwist =
              curPose === 'rifle'
                ? activeRightItem === 'bow' || activeRightItem === 'arrow'
                  ? 0.24
                  : -0.2
                : 0;
            dampSpineAndChest(bones, breath, spineTwist, 0, lam, dt);
          }
        }

        let rightFingerCurl = 0.14;
        let leftFingerCurl = 0.14;
        const maxFingerCurlRad = isCustomGlb ? 0.78 : 0.96;

        if (bones.rightArm && bones.leftArm) {
          const rightGripQ = bones.rightGripLocalQ ?? _fallbackRightGripQ;
          const leftGripQ = bones.leftGripLocalQ ?? _fallbackLeftGripQ;

          if (curPose === 'rifle' && (activeRightItem === 'bow' || activeRightItem === 'arrow')) {
            rig.bowStringUpper.rotation.x = 0.14;
            rig.bowStringUpper.scale.y = 1.03;
            rig.bowStringLower.rotation.x = -0.14;
            rig.bowStringLower.scale.y = 1.03;

            leftFingerCurl = 0.92;
            rightFingerCurl = 0.68;
            if (bones.leftForeArm && bones.leftHand && bones.rightForeArm && bones.rightHand) {
              rig.root.updateMatrixWorld(true);
              bones.rightArm.node.getWorldPosition(pvRSh);
              bones.leftArm.node.getWorldPosition(pvLSh);
              pvChest.copy(pvRSh).add(pvLSh).multiplyScalar(0.5);

              pvAimDir.copy(pvFwd).multiplyScalar(0.88).addScaledVector(pvRight, 0.32);
              pvAimDir.y = 0.02 + idleSway * 0.3;
              pvAimDir.normalize();

              pvLGrip.copy(pvChest).addScaledVector(pvRight, -0.16).addScaledVector(pvFwd, 0.42);
              pvLGrip.y += 0.04 + idleSway;
              pvPoleL.copy(pvRight).multiplyScalar(-0.78).addScaledVector(pvFwd, -0.18);
              pvPoleL.y -= 0.75;
              pvPoleL.normalize();
              solveTwoBoneArmIK(bones.leftArm.node, bones.leftForeArm.node, bones.leftHand, pvLGrip, pvPoleL, dt, ikLam, bones.leftArmBendLocal);

              pvThumbW.copy(pvUp);
              pvFingerW.copy(pvAimDir);
              pvPalmW.crossVectors(pvFingerW, pvThumbW).normalize();
              pvThumbW.crossVectors(pvPalmW, pvFingerW).normalize();
              stabilizeForeArmTwist(bones.leftForeArm.node, bones.leftHand, bones.leftForeArmPalmLocal, pvPalmW, dt, ikLam);
              alignHandGripFrameToWorldBasis(bones.leftHand, leftGripQ, pvPalmW, pvFingerW, pvThumbW, dt, ikLam);

              pvRGrip.copy(pvLGrip).addScaledVector(pvAimDir, -0.28).addScaledVector(pvRight, 0.06);
              pvRGrip.y += 0.03 + idleSway * 0.4;
              pvPoleR.copy(pvRight).multiplyScalar(0.82).addScaledVector(pvFwd, -0.35);
              pvPoleR.y -= 0.25;
              pvPoleR.normalize();
              solveTwoBoneArmIK(bones.rightArm.node, bones.rightForeArm.node, bones.rightHand, pvRGrip, pvPoleR, dt, ikLam, bones.rightArmBendLocal);

              bones.leftHand.updateMatrixWorld(true);
              rig.bowMount.getWorldPosition(pvDirA);
              pvDirA.y += 0.06;
              bones.rightArm.node.updateMatrixWorld(true);
              bones.rightHand.getWorldPosition(pvDirB);
              pvFingerW.subVectors(pvDirA, pvDirB);
              if (pvFingerW.lengthSq() < 0.002) pvFingerW.copy(pvAimDir);
              else pvFingerW.normalize();
              pvThumbW.copy(pvUp);
              pvPalmW.crossVectors(pvThumbW, pvFingerW).normalize();
              pvThumbW.crossVectors(pvFingerW, pvPalmW).normalize();
              stabilizeForeArmTwist(bones.rightForeArm.node, bones.rightHand, bones.rightForeArmPalmLocal, pvPalmW, dt, ikLam);
              alignHandGripFrameToWorldBasis(bones.rightHand, rightGripQ, pvPalmW, pvThumbW, pvFingerW, dt, ikLam);
            }
          } else if (curPose === 'rifle') {
            rightFingerCurl = 0.92;
            if (bones.rightForeArm && bones.rightHand) {
              rig.root.updateMatrixWorld(true);
              bones.rightArm.node.getWorldPosition(pvRSh);
              bones.leftArm.node.getWorldPosition(pvLSh);
              pvChest.copy(pvRSh).add(pvLSh).multiplyScalar(0.5);

              pvRGrip.copy(pvChest).addScaledVector(pvRight, 0.165).addScaledVector(pvFwd, 0.285);
              pvRGrip.y += -0.055 + idleSway * 0.35;
              pvPoleR.copy(pvRight).multiplyScalar(0.78).addScaledVector(pvFwd, -0.28);
              pvPoleR.y -= 0.88;
              pvPoleR.normalize();
              solveTwoBoneArmIK(bones.rightArm.node, bones.rightForeArm.node, bones.rightHand, pvRGrip, pvPoleR, dt, ikLam, bones.rightArmBendLocal);

              bones.rightArm.node.updateMatrixWorld(true);
              pvAimDir.copy(pvFwd).multiplyScalar(0.9).addScaledVector(pvRight, -0.28);
              pvAimDir.y = -0.05 + idleSway * 0.4;
              pvAimDir.normalize();

              pvUpOrtho.copy(pvUp).addScaledVector(pvRight, -0.14).normalize();
              pvPalmW.crossVectors(pvUpOrtho, pvAimDir).normalize();
              pvThumbW.crossVectors(pvAimDir, pvPalmW).normalize();
              stabilizeForeArmTwist(bones.rightForeArm.node, bones.rightHand, bones.rightForeArmPalmLocal, pvPalmW, dt, ikLam);
              alignHandGripFrameToWorldBasis(bones.rightHand, rig.rifleMount.quaternion, pvPalmW, pvThumbW, pvAimDir, dt, ikLam);

              if (bones.leftForeArm && bones.leftHand) {
                bones.rightHand.updateMatrixWorld(true);
                rig.rifleForegrip.getWorldPosition(pvLGrip);
                pvThumbW.copy(pvAimDir);
                pvPalmW.copy(pvUp).multiplyScalar(0.78).addScaledVector(pvRight, 0.62).normalize();
                pvFingerW.crossVectors(pvThumbW, pvPalmW).normalize();
                pvPalmW.crossVectors(pvFingerW, pvThumbW).normalize();
                pvLGrip.addScaledVector(pvPalmW, -0.036);

                pvPoleL.copy(pvRight).multiplyScalar(-0.7).addScaledVector(pvFwd, -0.22);
                pvPoleL.y -= 0.92;
                pvPoleL.normalize();
                solveTwoBoneArmIK(bones.leftArm.node, bones.leftForeArm.node, bones.leftHand, pvLGrip, pvPoleL, dt, ikLam, bones.leftArmBendLocal);
                stabilizeForeArmTwist(bones.leftForeArm.node, bones.leftHand, bones.leftForeArmPalmLocal, pvPalmW, dt, ikLam);
                alignHandGripFrameToWorldBasis(bones.leftHand, leftGripQ, pvPalmW, pvFingerW, pvThumbW, dt, ikLam);
                leftFingerCurl = 0.78;
              }
            }
          } else if (curPose === 'one_handed') {
            // Left arm relaxed at side
            if (isCustomGlb && bones.leftForeArm) {
              pvDirA.copy(pvFwd).multiplyScalar(0.06).addScaledVector(pvRight, -0.18);
              pvDirA.y = -0.92;
              pvDirB.copy(pvFwd).multiplyScalar(0.24).addScaledVector(pvRight, -0.12);
              pvDirB.y = -0.84;
              this.poseCustomArmDirs(bones.leftArm.node, bones.leftForeArm.node, bones.leftHand, pvDirA, pvDirB, dt, lam, bones.leftArmBendLocal, pvPoleL.set(-0.4, -0.2, -0.9).normalize());
            } else {
              dampBoneRot(bones.leftArm, idleSway, 0, -0.07, lam, dt);
              dampBoneRot(bones.leftForeArm, -0.26, 0, 0, lam, dt);
              dampBoneRot(bones.leftHandRest, 0, 0, 0, lam, dt);
            }

            if (isThrowableItem(activeRightItem)) {
              if (bones.rightForeArm && bones.rightHand) {
                rig.root.updateMatrixWorld(true);
                bones.rightArm.node.getWorldPosition(pvRSh);
                bones.leftArm.node.getWorldPosition(pvLSh);
                pvChest.copy(pvRSh).add(pvLSh).multiplyScalar(0.5);

                pvRGrip.copy(pvChest).addScaledVector(pvRight, 0.24).addScaledVector(pvFwd, 0.34);
                pvRGrip.y += -0.02 + idleSway;
                pvPoleR.copy(pvRight).multiplyScalar(0.55).addScaledVector(pvFwd, -0.25);
                pvPoleR.y -= 0.85;
                pvPoleR.normalize();
                solveTwoBoneArmIK(bones.rightArm.node, bones.rightForeArm.node, bones.rightHand, pvRGrip, pvPoleR, dt, ikLam, bones.rightArmBendLocal);

                pvThumbW.copy(pvUp);
                pvFingerW.copy(pvFwd).addScaledVector(pvRight, -0.22).normalize();
                pvPalmW.crossVectors(pvThumbW, pvFingerW).normalize();
                pvFingerW.crossVectors(pvPalmW, pvThumbW).normalize();
                stabilizeForeArmTwist(bones.rightForeArm.node, bones.rightHand, bones.rightForeArmPalmLocal, pvPalmW, dt, ikLam);
                alignHandGripFrameToWorldBasis(bones.rightHand, rig.throwableMount.quaternion, pvPalmW, pvThumbW, pvFingerW, dt, ikLam);
                rightFingerCurl = 0.92;
              }
            } else if (activeRightItem === 'stick' || activeRightItem === 'baton') {
              if (isCustomGlb && bones.rightForeArm) {
                pvDirA.copy(pvFwd).multiplyScalar(0.25).addScaledVector(pvRight, 0.18);
                pvDirA.y = -0.78;
                pvDirB.copy(pvFwd).multiplyScalar(0.72);
                pvDirB.y = -0.18;
                this.poseCustomArmDirs(bones.rightArm.node, bones.rightForeArm.node, bones.rightHand, pvDirA, pvDirB, dt, lam, bones.rightArmBendLocal, pvPoleR.set(0.4, -0.2, -0.9).normalize());
              } else {
                dampBoneRot(bones.rightArm, -0.28 + idleSway, 0, 0.07, lam, dt);
                dampBoneRot(bones.rightForeArm, -0.78, 0, 0, lam, dt);
                dampBoneRot(bones.rightHandRest, 0, 0, 0, lam, dt);
              }
              rightFingerCurl = 0.95;
            } else if (activeRightItem === 'bow' || activeRightItem === 'arrow') {
              rig.root.updateMatrixWorld(true);
              bones.rightArm.node.getWorldPosition(pvRSh);
              bones.leftArm.node.getWorldPosition(pvLSh);
              pvChest.copy(pvRSh).add(pvLSh).multiplyScalar(0.5);

              if (activeRightItem === 'bow' && bones.leftForeArm && bones.leftHand) {
                pvLGrip.copy(pvChest).addScaledVector(pvRight, -0.22).addScaledVector(pvFwd, 0.28);
                pvLGrip.y += -0.08 + idleSway;
                pvPoleL.copy(pvRight).multiplyScalar(-0.75).addScaledVector(pvFwd, -0.2);
                pvPoleL.y -= 0.78;
                pvPoleL.normalize();
                solveTwoBoneArmIK(bones.leftArm.node, bones.leftForeArm.node, bones.leftHand, pvLGrip, pvPoleL, dt, ikLam, bones.leftArmBendLocal);
                pvThumbW.copy(pvUp);
                pvFingerW.copy(pvFwd).multiplyScalar(0.84).addScaledVector(pvRight, 0.32).normalize();
                pvPalmW.crossVectors(pvFingerW, pvThumbW).normalize();
                pvThumbW.crossVectors(pvPalmW, pvFingerW).normalize();
                stabilizeForeArmTwist(bones.leftForeArm.node, bones.leftHand, bones.leftForeArmPalmLocal, pvPalmW, dt, ikLam);
                alignHandGripFrameToWorldBasis(bones.leftHand, leftGripQ, pvPalmW, pvFingerW, pvThumbW, dt, ikLam);
                leftFingerCurl = 0.92;
              }
              if (bones.rightForeArm && bones.rightHand) {
                pvRGrip.copy(pvChest).addScaledVector(pvRight, 0.22).addScaledVector(pvFwd, 0.2);
                pvRGrip.y += -0.14 + idleSway;
                pvPoleR.copy(pvRight).multiplyScalar(0.55).addScaledVector(pvFwd, -0.25);
                pvPoleR.y -= 0.85;
                pvPoleR.normalize();
                solveTwoBoneArmIK(bones.rightArm.node, bones.rightForeArm.node, bones.rightHand, pvRGrip, pvPoleR, dt, ikLam, bones.rightArmBendLocal);
                pvThumbW.copy(pvUp);
                pvFingerW.copy(pvFwd).multiplyScalar(0.86).addScaledVector(pvRight, -0.28);
                pvFingerW.y = -0.14;
                pvFingerW.normalize();
                pvPalmW.crossVectors(pvThumbW, pvFingerW).normalize();
                pvThumbW.crossVectors(pvFingerW, pvPalmW).normalize();
                stabilizeForeArmTwist(bones.rightForeArm.node, bones.rightHand, bones.rightForeArmPalmLocal, pvPalmW, dt, ikLam);
                alignHandGripFrameToWorldBasis(bones.rightHand, rightGripQ, pvPalmW, pvThumbW, pvFingerW, dt, ikLam);
                rightFingerCurl = 0.58;
              }
            } else {
              // Pistol or default one-handed ready pose
              if (bones.rightForeArm && bones.rightHand) {
                rig.root.updateMatrixWorld(true);
                bones.rightArm.node.getWorldPosition(pvRSh);
                bones.leftArm.node.getWorldPosition(pvLSh);
                pvChest.copy(pvRSh).add(pvLSh).multiplyScalar(0.5);

                pvRGrip.copy(pvChest).addScaledVector(pvRight, 0.21).addScaledVector(pvFwd, 0.31);
                pvRGrip.y += -0.1 + idleSway;
                pvPoleR.copy(pvRight).multiplyScalar(0.52).addScaledVector(pvFwd, -0.24);
                pvPoleR.y -= 0.88;
                pvPoleR.normalize();
                solveTwoBoneArmIK(bones.rightArm.node, bones.rightForeArm.node, bones.rightHand, pvRGrip, pvPoleR, dt, ikLam, bones.rightArmBendLocal);

                bones.rightArm.node.updateMatrixWorld(true);
                pvAimDir.copy(pvFwd).addScaledVector(pvRight, -0.06);
                pvAimDir.y = -0.12 + idleSway * 0.45;
                pvAimDir.normalize();
                pvUpOrtho.copy(pvUp).addScaledVector(pvRight, -0.16).normalize();
                pvPalmW.crossVectors(pvUpOrtho, pvAimDir).normalize();
                pvThumbW.crossVectors(pvAimDir, pvPalmW).normalize();
                stabilizeForeArmTwist(bones.rightForeArm.node, bones.rightHand, bones.rightForeArmPalmLocal, pvPalmW, dt, ikLam);
                alignHandGripFrameToWorldBasis(bones.rightHand, rig.pistolMount.quaternion, pvPalmW, pvThumbW, pvAimDir, dt, ikLam);
                rightFingerCurl = 0.92;
              }
            }
          } else {
            // Standing unarmed / hands-free pose
            if (isCustomGlb && bones.rightForeArm && bones.leftForeArm) {
              pvDirA.copy(pvFwd).multiplyScalar(0.06).addScaledVector(pvRight, 0.18);
              pvDirA.y = -0.92;
              pvDirB.copy(pvFwd).multiplyScalar(0.24).addScaledVector(pvRight, 0.12);
              pvDirB.y = -0.84;
              this.poseCustomArmDirs(bones.rightArm.node, bones.rightForeArm.node, bones.rightHand, pvDirA, pvDirB, dt, lam);

              pvDirA.copy(pvFwd).multiplyScalar(0.06).addScaledVector(pvRight, -0.18);
              pvDirA.y = -0.92;
              pvDirB.copy(pvFwd).multiplyScalar(0.24).addScaledVector(pvRight, -0.12);
              pvDirB.y = -0.84;
              this.poseCustomArmDirs(bones.leftArm.node, bones.leftForeArm.node, bones.leftHand, pvDirA, pvDirB, dt, lam);
            } else {
              dampBoneRot(bones.rightArm, idleSway, 0, 0.07, lam, dt);
              dampBoneRot(bones.rightForeArm, -0.26, 0, 0, lam, dt);
              dampBoneRot(bones.leftArm, -idleSway, 0, -0.07, lam, dt);
              dampBoneRot(bones.leftForeArm, -0.26, 0, 0, lam, dt);
              dampBoneRot(bones.rightHandRest, 0, 0, 0, lam, dt);
              dampBoneRot(bones.leftHandRest, 0, 0, 0, lam, dt);
            }
            rightFingerCurl = !isArmorItem(curItem) ? 0.85 : 0.14;
            leftFingerCurl = curItem === 'bow' || curItem === 'arrow' ? 0.85 : 0.14;
          }
        }

        applyHandFingerCurl(bones.rightFingers, rightFingerCurl, maxFingerCurlRad, dt, lam);
        applyHandFingerCurl(bones.leftFingers, leftFingerCurl, maxFingerCurlRad, dt, lam);
        if (molBuilt.group.visible) {
          const flicker = 0.9 + Math.sin(previewTime * 22) * 0.14;
          molFlame.update(previewTime, 1.0, flicker, 1.0);
        }
        rig.root.updateMatrixWorld(true);
      };

      const resolveTransformsForEntity = (
        state: AttachmentTransformsState,
      ): Partial<Record<PlayerAttachableId, AttachmentTransform>> =>
        scope === 'player' ? state.player : (state.entities?.[scope] ?? {});

      syncPreviewVisibility();
      applyPlayerAttachmentTransformsToRig(
        rig,
        resolveTransformsForEntity(this.attachmentTransforms),
        heldMap,
      );
      stepPose(0.016, true);

      return {
        group: rig.root,
        getTargetNode: (itemId: string) => {
          switch (itemId as PlayerAttachableId) {
            case 'helmet':
              return rig.equipHelmetOffset ?? rig.equipHelmetMesh;
            case 'vest':
              return rig.equipVestOffset ?? rig.equipVestMesh;
            case 'backpack':
              return rig.equipBackpackOffset ?? rig.equipBackpackMesh;
            case 'rifle':
              return rig.rifleMesh;
            case 'pistol':
              return rig.pistolMesh;
            case 'bow':
              return rig.bowMesh;
            case 'arrow':
              return rig.bowNockedArrowOffset ?? rig.bowNockedArrow;
            case 'stick':
              return rig.stickMesh;
            case 'baton':
              return rig.batonMesh;
            case 'molotov':
            case 'nail_bomb':
            case 'grenade':
            case 'bottle':
            case 'can':
            case 'brick':
              return heldMap[itemId as keyof typeof heldMap] ?? null;
            default:
              return null;
          }
        },
        applyTransforms: (transforms) => {
          applyPlayerAttachmentTransformsToRig(
            rig,
            resolveTransformsForEntity(transforms),
            heldMap,
          );
          rig.root.updateMatrixWorld(true);
        },
        setPlayerPose: (pose, selectedItem, armor) => {
          const poseChanged = pose !== curPose || selectedItem !== curItem;
          curPose = pose;
          curItem = selectedItem;
          curArmor = { ...armor };
          syncPreviewVisibility();
          stepPose(0.016, poseChanged);
        },
        update: (dt) => {
          stepPose(Math.min(0.05, Math.max(0.001, dt)), false);
        },
        dispose: () => {
          molFlame.dispose();
          molBuilt.dispose();
          nailBuilt.dispose();
          grenBuilt.dispose();
          botBuilt.dispose();
          canBuilt.dispose();
          brickBuilt.dispose();
          rig.dispose();
        },
      };
    }

    // Zombie preview branch (supports both general zombie presets and individual custom zombie slots)
    const preset = ZOMBIE_PREVIEW_PRESETS.find((p) => p.id === resolvedZombieModelId);
    const customSlot = this.customZombieSlots.find((s) => s.id === resolvedZombieModelId);
    const customTemplate = customSlot
      ? (this.customZombieTemplates.get(customSlot.id) ?? null)
      : null;

    let kind: EnemyKind = preset?.kind ?? 'stalker';
    let role: EnemyRole = preset?.role ?? 'gendarme_heavy';

    if (customSlot) {
      if (customSlot.targetKind === 'police') {
        kind = 'stalker';
        role = 'police';
      } else if (customSlot.targetKind === 'gendarme') {
        kind = 'stalker';
        role = 'gendarme';
      } else if (customSlot.targetKind === 'gendarme_heavy') {
        kind = 'brute';
        role = 'gendarme_heavy';
      } else if (
        customSlot.targetKind === 'runner' ||
        customSlot.targetKind === 'stalker' ||
        customSlot.targetKind === 'biter' ||
        customSlot.targetKind === 'spitter' ||
        customSlot.targetKind === 'brute'
      ) {
        kind = customSlot.targetKind;
        role = 'civilian';
      }
    }

    const gear: EnemyCarriedGear = {
      helmet: selectedZombieItem === 'helmet' || role === 'gendarme_heavy',
      vest: selectedZombieItem === 'vest' || role === 'gendarme_heavy',
      rifle:
        selectedZombieItem === 'rifle' ||
        ((role === 'gendarme' || role === 'gendarme_heavy') &&
          selectedZombieItem !== 'pistol' &&
          selectedZombieItem !== 'baton'),
      revolver:
        selectedZombieItem === 'pistol' ||
        (role === 'police' && selectedZombieItem !== 'rifle' && selectedZombieItem !== 'baton'),
      baton:
        selectedZombieItem === 'baton' ||
        (role === 'police' && selectedZombieItem !== 'rifle'),
      rifleMags: 2,
      pistolAmmo: 1,
    };
    const carriedWeapon: 'pistol' | 'rifle' | null = gear.rifle
      ? 'rifle'
      : gear.revolver
        ? 'pistol'
        : null;

    const bundle = buildEnemyMesh(
      kind,
      customTemplate,
      carriedWeapon,
      role,
      gear,
      this.getZombieTransformsForSlot(scope.startsWith('zombie:') ? customSlot?.id : undefined),
    );
    bundle.hpBarGroup.visible = false;
    bundle.telegraphRing.visible = false;
    bundle.awarenessIcon.visible = false;
    bundle.group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });

    let zTime = 0;
    const stepZombie = (dt: number, snap = false) => {
      zTime += dt;
      const sway = Math.sin(zTime * 1.9) * 0.025;
      const lam = snap ? 500 : 12;
      if (bundle.hasClips && bundle.character.mixer) {
        const played =
          bundle.character.setAction('idle', { fadeSec: 0.12, timeScale: 0.45 }) ||
          bundle.character.setAction('walk', { fadeSec: 0.12, timeScale: 0.45 }) ||
          (bundle.clips ? bundle.character.playClip(Object.keys(bundle.clips)[0], 0.12, 0.45) : false);
        if (played) {
          bundle.character.updateAnimation(dt);
        }
      } else {
        const b = bundle.bones;
        if (b.spine) dampBoneRot(b.spine, 0.06 + sway * 0.4, 0, 0, lam, dt);
        if (b.head) dampBoneRot(b.head, -0.04 + sway * 0.5, 0, 0, lam, dt);
        if (b.rightArm) {
          dampBoneRot(
            b.rightArm,
            gear.rifle || gear.revolver || gear.baton ? -0.58 + sway : -0.35 + sway,
            0,
            0.08,
            lam,
            dt,
          );
        }
        if (b.rightForeArm) {
          dampBoneRot(
            b.rightForeArm,
            gear.rifle || gear.revolver || gear.baton ? -0.52 : -0.35,
            0,
            0,
            lam,
            dt,
          );
        }
        if (b.leftArm) {
          dampBoneRot(b.leftArm, gear.baton && gear.revolver ? -0.48 - sway : -0.25 - sway, 0, -0.08, lam, dt);
        }
        if (b.leftForeArm) {
          dampBoneRot(b.leftForeArm, -0.45, 0, 0, lam, dt);
        }
      }
      bundle.group.updateMatrixWorld(true);
    };

    stepZombie(0.016, true);

    return {
      group: bundle.group,
      getTargetNode: (itemId: string) => {
        const list = bundle.attachSockets?.[itemId as ZombieAttachableId];
        return list && list.length > 0 ? list[0] : null;
      },
      applyTransforms: (transforms) => {
        const resolved =
          scope.startsWith('zombie:') && customSlot
            ? {
                ...transforms.zombie,
                ...((transforms.entities?.[`zombie:${customSlot.id}`] ?? {}) as Partial<
                  Record<ZombieAttachableId, AttachmentTransform>
                >),
              }
            : transforms.zombie;
        applyZombieAttachmentTransformsToBundle(bundle, resolved);
        bundle.group.updateMatrixWorld(true);
      },
      setPlayerPose: () => {
        // Not applicable for zombie preview
      },
      update: (dt) => {
        stepZombie(Math.min(0.05, Math.max(0.001, dt)), false);
      },
      dispose: () => {
        bundle.dispose();
      },
    };
  }

  private applyWorldObjectOverrideVisual(
    targetId: WorldObjectOverrideId,
    template: CustomObjectTemplate | null,
  ) {
    if (targetId === 'campfire') {
      this.campfireVisuals.applyOverride(template);
      return;
    }
    if (targetId.startsWith('loot_')) {
      const lootKind = targetId.slice(5) as LootKind;
      this.refreshActivePickupsOfKind(lootKind);
      if (lootKind === 'backpack') {
        applyBackpackOverrideToRig(this.playerRig, template);
        this.syncArmorVisibility();
        this.applyAllAttachmentTransforms();
      }
      if (
        lootKind === 'molotov' ||
        lootKind === 'nail_bomb' ||
        lootKind === 'bottle' ||
        lootKind === 'can' ||
        lootKind === 'brick'
      ) {
        this.rebuildHeldThrowables();
      }
      return;
    }
    this.worldEnv.applyObjectOverride(targetId, template);
  }

  private refreshActivePickupsOfKind(kind: LootKind) {
    const tmpl = this.objectOverrideTemplates.get(`loot_${kind}` as WorldObjectOverrideId) ?? null;
    for (let i = 0; i < this.pickups.length; i++) {
      const pk = this.pickups[i];
      if (pk.kind !== kind) continue;
      this.scene.remove(pk.mesh);
      pk.disposeMesh?.();
      const next = this.buildPickupVisual(kind, tmpl);
      next.mesh.position.set(pk.x, pk.y, pk.z);
      next.mesh.rotation.copy(pk.mesh.rotation);
      this.scene.add(next.mesh);
      pk.mesh = next.mesh;
      pk.disposeMesh = next.disposeMesh;
    }
  }

  private async applyGlbBuffer(
    buffer: ArrayBuffer,
    fileName: string,
    options: { silentHud?: boolean } = {},
  ): Promise<void> {
    const newRig = await parseGlbCharacter(
      buffer,
      this.customRifleTemplate,
      this.customPistolTemplate,
    );
    if (this.disposed) {
      newRig.dispose();
      return;
    }
    if (this.heldMolotovGroup) this.heldMolotovGroup.parent?.remove(this.heldMolotovGroup);
    if (this.heldNailBombGroup) this.heldNailBombGroup.parent?.remove(this.heldNailBombGroup);
    if (this.heldGrenadeGroup) this.heldGrenadeGroup.parent?.remove(this.heldGrenadeGroup);
    if (this.heldBottleGroup) this.heldBottleGroup.parent?.remove(this.heldBottleGroup);
    if (this.heldCanGroup) this.heldCanGroup.parent?.remove(this.heldCanGroup);
    if (this.heldBrickGroup) this.heldBrickGroup.parent?.remove(this.heldBrickGroup);
    if (this.heldDecoyRatGroup) this.heldDecoyRatGroup.parent?.remove(this.heldDecoyRatGroup);
    this.scene.remove(this.playerRig.root);
    this.playerRig.dispose();
    this.playerRig = newRig;
    this.customPlayerBuffer = buffer;
    this.playerRig.root.position.set(this.px, this.py, this.pz);
    this.playerRig.root.rotation.y = this.pyaw;
    this.scene.add(this.playerRig.root);
    this.attachHeldThrowablesToRig();
    this.applyAllCustomGearToPlayerRig();
    this.customModelName = fileName;
    this.hudCharacterCatalogDirty = true;
    this.modelError = null;
    if (!options.silentHud) {
      this.emitHud();
    }
  }

  private async applyRifleGlbBuffer(
    buffer: ArrayBuffer,
    fileName: string,
    options: { silentHud?: boolean } = {},
  ): Promise<void> {
    const template = await parseGlbRifleTemplate(buffer);
    if (this.disposed) {
      template.dispose();
      return;
    }
    this.customRifleTemplate?.dispose();
    this.customRifleTemplate = template;
    this.customRifleName = fileName;
    this.modelError = null;
    applyRifleToRig(this.playerRig, this.customRifleTemplate);
    this.syncWeaponVisibility();
    this.applyAllAttachmentTransforms();
    if (!options.silentHud) {
      this.emitHud();
    }
  }

  private async applyPistolGlbBuffer(
    buffer: ArrayBuffer,
    fileName: string,
    options: { silentHud?: boolean } = {},
  ): Promise<void> {
    const template = await parseGlbPistolTemplate(buffer);
    if (this.disposed) {
      template.dispose();
      return;
    }
    this.customPistolTemplate?.dispose();
    this.customPistolTemplate = template;
    this.customPistolName = fileName;
    this.modelError = null;
    applyPistolToRig(this.playerRig, this.customPistolTemplate);
    this.syncWeaponVisibility();
    this.applyAllAttachmentTransforms();
    if (!options.silentHud) {
      this.emitHud();
    }
  }

  private getCustomZombieSummary(): string | null {
    if (this.customZombieSlots.length === 0) return null;
    if (this.customZombieSlots.length === 1) return this.customZombieSlots[0].name;
    return `${this.customZombieSlots.length} modelos de zombie`;
  }

  private getActiveZombieSlots(): ZombieModelSlot[] {
    return this.customZombieSlots.filter((s) => this.customZombieTemplates.has(s.id));
  }

  private pickCustomZombieSlotAndTemplate(
    kind: EnemyKind,
    enemyId: number,
    enemyRole: EnemyRole = 'civilian',
  ): { slotId?: string; template: CustomZombieTemplate | null } {
    const active = this.getActiveZombieSlots();
    if (active.length === 0) return { slotId: undefined, template: null };

    if (enemyRole !== 'civilian') {
      const roleSpecific = active.filter((s) => s.targetKind === enemyRole);
      if (roleSpecific.length > 0) {
        const slot = roleSpecific[Math.abs(enemyId - 1) % roleSpecific.length];
        return { slotId: slot.id, template: this.customZombieTemplates.get(slot.id) ?? null };
      }
    }

    const specific = active.filter((s) => s.targetKind === kind);
    if (specific.length > 0) {
      const slot = specific[Math.abs(enemyId - 1) % specific.length];
      return { slotId: slot.id, template: this.customZombieTemplates.get(slot.id) ?? null };
    }

    const shared = active.filter((s) => !s.targetKind || s.targetKind === 'all');
    if (shared.length > 0) {
      const slot = shared[Math.abs(enemyId - 1) % shared.length];
      return { slotId: slot.id, template: this.customZombieTemplates.get(slot.id) ?? null };
    }

    return { slotId: undefined, template: null };
  }

  private syncEnemiesToCustomSlotCounts() {
    if (this.disposed) return;
    if (this.gameState !== 'PLAYING' && this.gameState !== 'PAUSED') return;

    const active = this.getActiveZombieSlots();
    if (active.length === 0) return;

    const slotMap = new Map<string, ZombieModelSlot>();
    active.forEach((s) => slotMap.set(s.id, s));

    const keptCounts = new Map<string, number>();
    const waveTargetNow =
      this.missionPhase === 'clear_plaza_wave' ? this.wave1Target : this.totalMissionTarget;
    const minNeededForMission = !this.colonUnlocked ? Math.max(0, waveTargetNow - this.kills) : 0;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const slot = e.customSlotId ? slotMap.get(e.customSlotId) : undefined;
      const desired = slot ? Math.max(0, Math.min(25, slot.spawnCount ?? 4)) : 0;
      const seen = slot ? (keptCounts.get(slot.id) ?? 0) : 0;
      const wouldUnderflowWave = !this.colonUnlocked && this.enemies.length <= minNeededForMission;
      if ((!slot || seen >= desired) && !wouldUnderflowWave) {
        Object.values(e.stumpMeshes).forEach((s) => {
          if (s) {
            s.mesh.parent?.remove(s.mesh);
            s.dispose();
          }
        });
        this.scene.remove(e.bundle.group, e.shadow);
        e.bundle.dispose();
        this.enemies.splice(i, 1);
      } else if (slot) {
        keptCounts.set(slot.id, seen + 1);
      }
    }

    for (let i = 0; i < active.length; i++) {
      const slot = active[i];
      const desired = Math.max(0, Math.min(25, slot.spawnCount ?? 4));
      const current = keptCounts.get(slot.id) ?? 0;
      for (let k = current; k < desired; k++) {
        if (slot.targetKind === 'police') {
          this.spawnEnemy('stalker', true, slot.id, 'pistol', 'police', {
            revolver: true,
            pistolAmmo: 1,
            baton: true,
          });
        } else if (slot.targetKind === 'gendarme') {
          this.spawnEnemy('stalker', true, slot.id, 'rifle', 'gendarme', {
            rifle: true,
            rifleMags: 1,
          });
        } else if (slot.targetKind === 'gendarme_heavy') {
          this.spawnEnemy('brute', true, slot.id, null, 'gendarme_heavy', {
            helmet: true,
            vest: true,
            rifleMags: 2,
          });
        } else {
          const kind =
            slot.targetKind && slot.targetKind !== 'all'
              ? slot.targetKind
              : this.pickRandomKind();
          this.spawnEnemy(kind, true, slot.id);
        }
      }
    }
  }

  private clearDyingEnemies() {
    for (let i = 0; i < this.dyingEnemies.length; i++) {
      const d = this.dyingEnemies[i];
      this.scene.remove(d.bundle.group);
      this.scene.remove(d.shadow);
      Object.values(d.stumpMeshes).forEach((s) => s?.dispose());
      d.bundle.dispose();
    }
    this.dyingEnemies = [];
  }

  private rebuildActiveEnemiesMeshes() {
    const activeSlots = this.getActiveZombieSlots();
    const slotMap = new Map<string, ZombieModelSlot>();
    activeSlots.forEach((s) => slotMap.set(s.id, s));

    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      Object.values(e.stumpMeshes).forEach((s) => {
        if (s) s.mesh.parent?.remove(s.mesh);
      });
      this.scene.remove(e.bundle.group);
      e.bundle.dispose();

      let tmpl: CustomZombieTemplate | null = null;
      const ownSlot = e.customSlotId ? slotMap.get(e.customSlotId) : undefined;
      if (ownSlot) {
        if (ownSlot.targetKind === 'police') {
          e.enemyRole = 'police';
          e.kind = 'stalker';
          e.walkStyle = 'inestable';
          e.carriedWeapon = 'pistol';
          e.carriedGear = { revolver: true, pistolAmmo: 1, baton: true };
          e.armorHelmetHp = 0;
          e.armorHelmetMaxHp = 0;
          e.armorVestHp = 0;
          e.armorVestMaxHp = 0;
        } else if (ownSlot.targetKind === 'gendarme') {
          e.enemyRole = 'gendarme';
          e.kind = 'stalker';
          e.walkStyle = 'inestable';
          e.carriedWeapon = 'rifle';
          e.carriedGear = { rifle: true, rifleMags: 1 };
          e.armorHelmetHp = 0;
          e.armorHelmetMaxHp = 0;
          e.armorVestHp = 0;
          e.armorVestMaxHp = 0;
        } else if (ownSlot.targetKind === 'gendarme_heavy') {
          e.enemyRole = 'gendarme_heavy';
          e.kind = 'brute';
          e.walkStyle = 'ogro';
          e.carriedWeapon = null;
          e.carriedGear = { helmet: true, vest: true, rifleMags: 2 };
          const diffScale =
            this.difficulty === 'pilgrim' ? 0.85 : this.difficulty === 'warden' ? 1.0 : 1.25;
          if (e.armorHelmetMaxHp <= 0) {
            e.armorHelmetMaxHp = Math.round(90 * diffScale);
            e.armorHelmetHp = e.armorHelmetMaxHp;
          }
          if (e.armorVestMaxHp <= 0) {
            e.armorVestMaxHp = Math.round(140 * diffScale);
            e.armorVestHp = e.armorVestMaxHp;
          }
        } else if (ownSlot.targetKind && ownSlot.targetKind !== 'all') {
          e.kind = ownSlot.targetKind;
          e.enemyRole = 'civilian';
          e.carriedWeapon = null;
          e.carriedGear = undefined;
          e.armorHelmetHp = 0;
          e.armorHelmetMaxHp = 0;
          e.armorVestHp = 0;
          e.armorVestMaxHp = 0;
          e.walkStyle =
            e.kind === 'brute'
              ? 'ogro'
              : e.kind === 'spitter'
                ? 'orco'
                : e.kind === 'runner' || e.kind === 'biter'
                  ? 'run'
                  : 'inestable';
        }
        tmpl = this.customZombieTemplates.get(ownSlot.id) ?? null;
      } else {
        const picked = this.pickCustomZombieSlotAndTemplate(e.kind, e.id, e.enemyRole);
        e.customSlotId = picked.slotId;
        tmpl = picked.template;
      }

      e.bundle = buildEnemyMesh(
        e.kind,
        tmpl,
        e.carriedWeapon ?? null,
        e.enemyRole,
        e.carriedGear,
        this.getZombieTransformsForSlot(e.customSlotId),
      );
      if (e.bundle.helmetArmorGroup) {
        e.bundle.helmetArmorGroup.visible = e.armorHelmetHp > 0;
      }
      if (e.bundle.vestArmorGroup) {
        e.bundle.vestArmorGroup.visible = e.armorVestHp > 0;
      }
      e.bundle.group.position.set(e.x, groundHeightAt(e.x, e.z), e.z);
      e.bundle.group.rotation.y = e.yaw;
      e.poseInitialized = false;
      this.initializeEnemyIdlePose(e);
      e.bundle.hpFillMesh.scale.x = Math.max(0.001, e.hp / Math.max(1, e.maxHp));
      Object.values(e.stumpMeshes).forEach((s) => {
        if (s) e.bundle.bodyPivot.add(s.mesh);
      });
      this.scene.add(e.bundle.group);
    }
  }

  public async setZombieSlotTargetKind(
    slotId: string,
    targetKind: ZombieTargetKind,
  ): Promise<void> {
    this.customZombieSlots = await actualizarZombieSlotTargetCache(slotId, targetKind);
    if (this.disposed) return;
    this.rebuildActiveEnemiesMeshes();
    this.emitHud();
  }

  public async setZombieSlotSpawnCount(slotId: string, spawnCount: number): Promise<void> {
    this.customZombieSlots = await actualizarZombieSlotCountCache(slotId, spawnCount);
    if (this.disposed) return;
    this.syncEnemiesToCustomSlotCounts();
    this.emitHud();
  }

  public async deleteCustomZombieSlot(slotId: string): Promise<void> {
    this.customZombieSlots = await eliminarZombieSlotCache(slotId);
    if (this.disposed) return;
    this.clearDyingEnemies();
    const oldTemplate = this.customZombieTemplates.get(slotId);
    if (oldTemplate) {
      this.customZombieTemplates.delete(slotId);
    }
    this.hudCharacterCatalogDirty = true;
    this.rebuildActiveEnemiesMeshes();
    oldTemplate?.dispose();
    this.syncEnemiesToCustomSlotCounts();
    this.modelError = null;
    this.emitHud();
  }

  public async resetToDefaultCharacter(): Promise<void> {
    await eliminarModeloCache();
    if (this.disposed) return;
    if (this.heldMolotovGroup) this.heldMolotovGroup.parent?.remove(this.heldMolotovGroup);
    if (this.heldNailBombGroup) this.heldNailBombGroup.parent?.remove(this.heldNailBombGroup);
    if (this.heldGrenadeGroup) this.heldGrenadeGroup.parent?.remove(this.heldGrenadeGroup);
    if (this.heldBottleGroup) this.heldBottleGroup.parent?.remove(this.heldBottleGroup);
    if (this.heldCanGroup) this.heldCanGroup.parent?.remove(this.heldCanGroup);
    if (this.heldBrickGroup) this.heldBrickGroup.parent?.remove(this.heldBrickGroup);
    if (this.heldDecoyRatGroup) this.heldDecoyRatGroup.parent?.remove(this.heldDecoyRatGroup);
    this.scene.remove(this.playerRig.root);
    this.playerRig.dispose();
    this.customPlayerBuffer = null;
    this.playerRig = buildDefaultSurvivor(this.customRifleTemplate, this.customPistolTemplate);
    this.playerRig.root.position.set(this.px, this.py, this.pz);
    this.playerRig.root.rotation.y = this.pyaw;
    this.scene.add(this.playerRig.root);
    this.attachHeldThrowablesToRig();
    this.applyAllCustomGearToPlayerRig();
    this.customModelName = null;
    this.hudCharacterCatalogDirty = true;
    this.modelError = null;
    this.emitHud();
  }

  public async resetToDefaultRifle(): Promise<void> {
    await eliminarRifleCache();
    if (this.disposed) return;
    this.customRifleTemplate?.dispose();
    this.customRifleTemplate = null;
    this.customRifleName = null;
    this.modelError = null;
    applyRifleToRig(this.playerRig, null);
    this.syncWeaponVisibility();
    this.applyAllAttachmentTransforms();
    this.emitHud();
  }

  public async resetToDefaultPistol(): Promise<void> {
    await eliminarPistolCache();
    if (this.disposed) return;
    this.customPistolTemplate?.dispose();
    this.customPistolTemplate = null;
    this.customPistolName = null;
    this.modelError = null;
    applyPistolToRig(this.playerRig, null);
    this.syncWeaponVisibility();
    this.applyAllAttachmentTransforms();
    this.emitHud();
  }

  public async resetToDefaultZombie(): Promise<void> {
    await limpiarTodosZombiesCache();
    if (this.disposed) return;
    this.clearDyingEnemies();
    this.customZombieSlots = [];
    this.hudCharacterCatalogDirty = true;
    this.modelError = null;
    const oldTemplates = Array.from(this.customZombieTemplates.values());
    this.customZombieTemplates.clear();
    this.rebuildActiveEnemiesMeshes();
    oldTemplates.forEach((t) => t.dispose());
    this.emitHud();
  }

  private syncArmorVisibility() {
    const hasHelmet = this.helmetArmor > 0;
    const hasVest = this.vestArmor > 0;
    this.playerRig.equipHelmetMesh.visible = hasHelmet;
    this.playerRig.equipVestMesh.visible = hasVest;
    const packMesh = this.playerRig.equipBackpackMesh;
    packMesh.visible = this.hasBackpack;
    if (this.playerRig.equipBackpackBasePos) {
      packMesh.position.copy(this.playerRig.equipBackpackBasePos);
      if (hasVest && this.playerRig.equipBackpackVestOffset) {
        packMesh.position.add(this.playerRig.equipBackpackVestOffset);
      }
    }
  }

  private syncWeaponVisibility() {
    const holdingThrowable =
      this.equippedThrowable !== null ||
      this.molotovLit ||
      this.nailBombLit ||
      this.aimingThrowable !== null ||
      this.throwAnimTimer > 0;
    this.playerRig.pistolMesh.visible = this.weapon === 'pistol' && !holdingThrowable;
    this.playerRig.rifleMesh.visible = this.weapon === 'rifle' && !holdingThrowable;
    this.playerRig.stickMesh.visible = this.weapon === 'stick' && !holdingThrowable;
    this.playerRig.batonMesh.visible = this.weapon === 'baton' && !holdingThrowable;
    this.playerRig.bowMesh.visible = this.weapon === 'bow' && !holdingThrowable;
    this.playerRig.bowNockedArrow.visible = false;
    this.playerRig.arrowMesh.visible =
      this.weapon === 'bow' && !holdingThrowable && this.arrows > 0;
    if (this.heldMolotovGroup) {
      const showMol =
        this.gameState === 'PLAYING' &&
        (this.equippedThrowable === 'molotov' ||
          this.molotovLit ||
          this.aimingThrowable === 'molotov');
      this.heldMolotovGroup.visible = showMol;
      if (this.heldMolotovFlame) {
        this.heldMolotovFlame.group.visible =
          showMol && (this.molotovLit || this.aimingThrowable === 'molotov');
      }
    }
    if (this.heldNailBombGroup) {
      this.heldNailBombGroup.visible =
        this.gameState === 'PLAYING' &&
        (this.equippedThrowable === 'nail_bomb' ||
          this.nailBombLit ||
          this.aimingThrowable === 'nail_bomb');
    }
    if (this.heldGrenadeGroup) {
      this.heldGrenadeGroup.visible =
        this.gameState === 'PLAYING' && this.aimingThrowable === 'grenade';
    }
    if (this.heldBottleGroup) {
      this.heldBottleGroup.visible =
        this.gameState === 'PLAYING' &&
        (this.equippedThrowable === 'bottle' || this.aimingThrowable === 'bottle');
    }
    if (this.heldCanGroup) {
      this.heldCanGroup.visible =
        this.gameState === 'PLAYING' &&
        (this.equippedThrowable === 'can' || this.aimingThrowable === 'can');
    }
    if (this.heldBrickGroup) {
      this.heldBrickGroup.visible =
        this.gameState === 'PLAYING' &&
        (this.equippedThrowable === 'brick' || this.aimingThrowable === 'brick');
    }
    if (this.heldDecoyRatGroup) {
      this.heldDecoyRatGroup.visible =
        this.gameState === 'PLAYING' &&
        (this.equippedThrowable === 'decoy_rat' || this.aimingThrowable === 'decoy_rat');
    }
  }

  private cancelPendingThrowable(clearLit = false) {
    this.aimingThrowable = null;
    this.aimingThrowableSlot = undefined;
    this.throwArcLine.visible = false;
    this.throwLandingRing.visible = false;
    if (clearLit) {
      this.molotovLit = false;
      this.nailBombLit = false;
    }
    this.syncWeaponVisibility();
  }

  public switchWeapon(next: WeaponKind) {
    this.audio.unlock();
    if (next !== 'unarmed' && !this.unlockedWeapons[next]) {
      const lockedMsg =
        next === 'stick'
          ? 'Palo bloqueado. Recoge un palo tirado en el mapa.'
          : next === 'baton'
            ? 'Bastón policía bloqueado. Abate a un zombie policía para recogerlo.'
            : next === 'bow'
              ? 'Arco bloqueado. Encuentra el Arco Recurvo en el mapa.'
              : next === 'pistol'
                ? 'Revólver bloqueado. Abate a un zombie policía para recogerlo.'
                : 'Fusil FAL bloqueado. Abate a un gendarme armado con fusil.';
      this.setInventoryNotice(lockedMsg, 2.4);
      this.emitHud();
      return;
    }
    const hadPending =
      this.equippedThrowable !== null ||
      this.molotovLit ||
      this.nailBombLit ||
      this.aimingThrowable !== null;
    if (this.weapon === next && !hadPending) return;
    this.weapon = next;
    this.equippedThrowable = null;
    this.reloadTimer = 0;
    this.wasFiringBow = false;
    this.bowDrawProgress = 0;
    this.bowDrawSoundPlayed = false;
    this.cancelPendingThrowable(true);
    if (next !== 'unarmed') {
      this.audio.playReload();
    }
    this.emitHud();
  }

  private getTotalDistractions(): number {
    return (
      this.distractionCounts.bottle +
      this.distractionCounts.can +
      this.distractionCounts.brick +
      this.distractionCounts.decoy_rat
    );
  }

  private resolveAvailableDistractionKind(preferred?: DistractionKind): DistractionKind | null {
    const order: DistractionKind[] = ['bottle', 'can', 'brick', 'decoy_rat'];
    if (preferred && this.distractionCounts[preferred] > 0) return preferred;
    if (this.distractionCounts[this.activeDistractionKind] > 0) {
      return this.activeDistractionKind;
    }
    for (let i = 0; i < order.length; i++) {
      if (this.distractionCounts[order[i]] > 0) return order[i];
    }
    return null;
  }

  public cycleDistraction(equipAfter = true) {
    this.audio.unlock();
    if (this.gameState !== 'PLAYING' || this.editorMode) return;
    const order: DistractionKind[] = ['bottle', 'can', 'brick', 'decoy_rat'];
    const startIdx = order.indexOf(this.activeDistractionKind);
    let chosen: DistractionKind | null = null;
    for (let offset = 1; offset <= order.length; offset++) {
      const cand = order[(startIdx + offset) % order.length];
      if (this.distractionCounts[cand] > 0) {
        chosen = cand;
        break;
      }
    }
    if (!chosen) {
      this.setInventoryNotice('Sin distracciones (botellas, latas, ladrillos o ratas señuelo)', 2.4);
      this.emitHud();
      return;
    }
    this.activeDistractionKind = chosen;
    if (equipAfter) {
      this.equipThrowable(chosen);
    } else {
      this.emitHud();
    }
  }

  public equipThrowable(kind: EquippedThrowableKind) {
    this.audio.unlock();
    if (this.gameState !== 'PLAYING' || this.editorMode) return;
    if (kind === 'bottle' || kind === 'can' || kind === 'brick' || kind === 'decoy_rat') {
      const chosen = this.resolveAvailableDistractionKind(kind);
      if (!chosen) {
        this.setInventoryNotice(
          'Sin distracciones (busca basura para armar ratas señuelo o recoge botellas)',
          2.4,
        );
        this.emitHud();
        return;
      }
      this.activeDistractionKind = chosen;
      this.equippedThrowable = chosen;
      this.reloadTimer = 0;
      this.molotovLit = false;
      this.nailBombLit = false;
      this.cancelPendingThrowable(false);
      this.syncWeaponVisibility();
      this.emitHud();
      return;
    }

    if (!this.hasBackpack || this.getInventoryCount(kind) <= 0) {
      this.setInventoryNotice(
        kind === 'molotov'
          ? 'Sin Bombas Molotov disponibles en la mochila'
          : 'Sin Bombas de Clavos disponibles en la mochila',
        2.2,
      );
      this.emitHud();
      return;
    }
    this.equippedThrowable = kind;
    this.reloadTimer = 0;
    if (kind === 'molotov') {
      this.nailBombLit = false;
    } else {
      this.molotovLit = false;
    }
    this.cancelPendingThrowable(false);
    this.syncWeaponVisibility();
    this.emitHud();
  }

  private startReload() {
    if ((this.weapon !== 'pistol' && this.weapon !== 'rifle') || this.reloadTimer > 0) return;
    if (this.weapon === 'pistol') {
      if (this.pistolAmmo >= this.pistolMaxAmmo || this.pistolReserveAmmo <= 0) return;
    } else if (this.weapon === 'rifle') {
      if (this.rifleAmmo >= this.rifleMaxAmmo || this.rifleReserveAmmo <= 0) return;
    }
    this.reloadTimer = this.weapon === 'pistol' ? 0.8 : 1.15;
    this.audio.playReload();
    this.emitHud();
  }

  private setInventoryNotice(msg: string, duration = 3.0) {
    this.inventoryNotice = msg;
    this.inventoryNoticeTimer = duration;
  }

  private getInventoryCount(kind: InventoryItemKind): number {
    if (!this.hasBackpack) return 0;
    let total = 0;
    for (let i = 0; i < this.inventory.length; i++) {
      const slot = this.inventory[i];
      if (slot && slot.kind === kind) total += slot.count;
    }
    return total;
  }

  private syncInventoryCounters() {
    if (!this.hasBackpack) return;
    this.bandages = this.getInventoryCount('bandage');
    this.food = this.getInventoryCount('food');
    this.wood = this.getInventoryCount('wood');
  }

  private tryAddItemToInventory(kind: InventoryItemKind, amount = 1): boolean {
    if (!this.hasBackpack || amount <= 0) return false;
    const maxStack = INVENTORY_ITEM_META[kind].maxStack;
    let remaining = amount;

    for (let i = 0; i < this.inventory.length && remaining > 0; i++) {
      const slot = this.inventory[i];
      if (slot && slot.kind === kind && slot.count < maxStack) {
        const space = maxStack - slot.count;
        const add = Math.min(space, remaining);
        slot.count += add;
        remaining -= add;
      }
    }

    for (let i = 0; i < this.inventory.length && remaining > 0; i++) {
      if (!this.inventory[i]) {
        const add = Math.min(maxStack, remaining);
        this.inventory[i] = { kind, count: add };
        remaining -= add;
      }
    }

    if (remaining < amount) {
      this.hudInventoryDirty = true;
      this.syncInventoryCounters();
      return remaining === 0;
    }
    return false;
  }

  private consumeInventoryItem(kind: InventoryItemKind, preferredSlotIndex?: number): boolean {
    if (!this.hasBackpack) return false;
    if (
      preferredSlotIndex !== undefined &&
      preferredSlotIndex >= 0 &&
      preferredSlotIndex < this.inventory.length
    ) {
      const slot = this.inventory[preferredSlotIndex];
      if (slot && slot.kind === kind && slot.count > 0) {
        slot.count -= 1;
        if (slot.count <= 0) this.inventory[preferredSlotIndex] = null;
        this.hudInventoryDirty = true;
        this.syncInventoryCounters();
        return true;
      }
    }

    for (let i = this.inventory.length - 1; i >= 0; i--) {
      const slot = this.inventory[i];
      if (slot && slot.kind === kind && slot.count > 0) {
        slot.count -= 1;
        if (slot.count <= 0) this.inventory[i] = null;
        this.hudInventoryDirty = true;
        this.syncInventoryCounters();
        return true;
      }
    }
    return false;
  }

  private unlockBackpack() {
    if (this.hasBackpack) return;
    this.hasBackpack = true;
    const starterBandages = this.bandages;
    const starterFood = this.food;
    const starterWood = this.wood;
    this.inventory = Array.from({ length: 8 }, () => null);
    if (starterBandages > 0) this.tryAddItemToInventory('bandage', starterBandages);
    if (starterFood > 0) this.tryAddItemToInventory('food', starterFood);
    if (starterWood > 0) this.tryAddItemToInventory('wood', starterWood);
    this.hudInventoryDirty = true;
    this.syncInventoryCounters();
    this.syncArmorVisibility();
    this.audio.playBackpackEquip();
    this.setInventoryNotice('Mochila equipada: inventario de 8 espacios desbloqueado', 4.0);
  }

  public selectInventorySlot(index: number) {
    if (index < 0 || index >= this.inventory.length) return;
    this.selectedInventorySlot = index;
    this.emitHud();
  }

  public cycleInventorySlot() {
    if (!this.hasBackpack || this.gameState !== 'PLAYING') return;
    this.selectedInventorySlot = (this.selectedInventorySlot + 1) % this.inventory.length;
    this.emitHud();
  }

  public useInventorySlot(index: number) {
    this.audio.unlock();
    if (this.gameState !== 'PLAYING' || !this.hasBackpack) return;
    if (index < 0 || index >= this.inventory.length) return;
    this.selectedInventorySlot = index;
    const slot = this.inventory[index];
    if (!slot) {
      this.emitHud();
      return;
    }
    if (slot.kind === 'bandage') {
      this.useBandage(index);
    } else if (slot.kind === 'food') {
      this.useFood(index);
    } else if (slot.kind === 'molotov') {
      this.throwMolotov(index);
    } else if (slot.kind === 'nail_bomb') {
      this.throwNailBomb(index);
    } else if (slot.kind === 'wood') {
      const cf = this.getCampfirePos();
      const distToCamp = Math.hypot(this.px - cf.x, this.pz - cf.z);
      if (distToCamp <= CAMPFIRE_SAFE_RADIUS + 1.5) {
        if (this.consumeInventoryItem('wood', index)) {
          this.hp = Math.min(this.maxHp, this.hp + 10);
          this.campfireWarmth = Math.min(100, this.campfireWarmth + 18);
          this.score += 120;
          this.audio.playStoke();
          this.spawnBurst(
            cf.x,
            groundHeightAt(cf.x, cf.z) + 1.5,
            cf.z,
            16,
            1.0,
            0.72,
            0.16,
            7,
          );
          this.emitHud();
        }
      } else {
        this.setInventoryNotice('Acércate a la fogata para quemar la madera', 2.2);
        this.emitHud();
      }
    } else if (slot.kind === 'ember') {
      if (this.flareCharge < 100) {
        if (this.consumeInventoryItem('ember', index)) {
          this.flareCharge = Math.min(100, this.flareCharge + 15);
          this.audio.playPickup(this.combo);
          this.spawnBurst(this.px, this.py + 1.1, this.pz, 10, 1.0, 0.65, 0.15, 4.5);
          this.emitHud();
        }
      } else {
        this.setInventoryNotice('La bengala termobárica ya está al 100%', 2.2);
        this.emitHud();
      }
    }
  }

  public moveInventorySlot(fromIndex: number, toIndex: number) {
    if (this.gameState !== 'PLAYING' || !this.hasBackpack) return;
    if (
      fromIndex < 0 ||
      fromIndex >= this.inventory.length ||
      toIndex < 0 ||
      toIndex >= this.inventory.length ||
      fromIndex === toIndex
    ) {
      return;
    }
    const src = this.inventory[fromIndex];
    if (!src) return;
    const dst = this.inventory[toIndex];
    if (!dst) {
      this.inventory[toIndex] = src;
      this.inventory[fromIndex] = null;
    } else if (dst.kind === src.kind) {
      const maxStack = INVENTORY_ITEM_META[src.kind].maxStack;
      const space = maxStack - dst.count;
      if (space > 0) {
        const moveAmt = Math.min(space, src.count);
        dst.count += moveAmt;
        src.count -= moveAmt;
        if (src.count <= 0) this.inventory[fromIndex] = null;
      } else {
        this.inventory[toIndex] = src;
        this.inventory[fromIndex] = dst;
      }
    } else {
      this.inventory[toIndex] = src;
      this.inventory[fromIndex] = dst;
    }
    this.selectedInventorySlot = toIndex;
    this.hudInventoryDirty = true;
    this.emitHud();
  }

  public dropInventorySlot(index: number) {
    if (this.gameState !== 'PLAYING' || !this.hasBackpack) return;
    if (index < 0 || index >= this.inventory.length) return;
    const slot = this.inventory[index];
    if (!slot || slot.count <= 0) return;
    const kind = slot.kind;
    if (!this.consumeInventoryItem(kind, index)) return;
    if (kind === 'molotov' && this.getInventoryCount('molotov') <= 0) {
      if (this.equippedThrowable === 'molotov') this.equippedThrowable = null;
      this.cancelPendingThrowable(true);
    } else if (kind === 'nail_bomb' && this.getInventoryCount('nail_bomb') <= 0) {
      if (this.equippedThrowable === 'nail_bomb') this.equippedThrowable = null;
      this.cancelPendingThrowable(true);
    }
    const dropX = this.px + Math.sin(this.pyaw) * 1.45;
    const dropZ = this.pz + Math.cos(this.pyaw) * 1.45;
    this.spawnPickup(kind, dropX, dropZ, false, this.py);
    this.emitHud();
  }

  private floorAt(x: number, z: number, refY = this.py): number {
    if (this.activeZone === 'colon_interior') {
      return this.colonInterior.resolveFloorHeight(x, z, refY);
    }
    return groundHeightAt(x, z);
  }

  private segmentHitsFastFoodWalls(
    x1: number,
    y1: number,
    z1: number,
    x2: number,
    y2: number,
    z2: number,
    sightOnly = false,
  ): boolean {
    if (
      this.activeZone !== 'exterior_9_julio' ||
      this.mapSettings.mapPreset === 'custom_sandbox'
    ) {
      return false;
    }
    const minSegX = Math.min(x1, x2);
    const maxSegX = Math.max(x1, x2);
    const minSegZ = Math.min(z1, z2);
    const maxSegZ = Math.max(z1, z2);
    if (maxSegX < 36.0 || minSegX > 70.0 || maxSegZ < 5.0 || minSegZ > 37.0) {
      return false;
    }
    const baseY = groundHeightAt(FASTFOOD_CENTER_X, FASTFOOD_CENTER_Z);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    const boxes = this.worldEnv.fastFood.wallBoxes;
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (sightOnly && !b.blocksSight) continue;
      let tmin = 0;
      let tmax = 1;
      const axes: [number, number, number, number][] = [
        [dx, x1, b.minX, b.maxX],
        [dy, y1, baseY + b.minY, baseY + b.maxY],
        [dz, z1, b.minZ, b.maxZ],
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
      if (hit) return true;
    }
    return false;
  }

  private segmentHitsWorldBoxes(
    x1: number,
    y1: number,
    z1: number,
    x2: number,
    y2: number,
    z2: number,
    sightOnly = false,
  ): boolean {
    if (this.activeZone !== 'exterior_9_julio') return false;
    const boxes = this.worldEnv.boxColliders;
    if (!boxes || boxes.length === 0) return false;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (sightOnly && b.blocksSight === false) continue;
      const baseY = groundHeightAt((b.minX + b.maxX) * 0.5, (b.minZ + b.maxZ) * 0.5);
      let tmin = 0;
      let tmax = 1;
      let hit = true;
      // X slab
      if (Math.abs(dx) < 1e-6) {
        if (x1 < b.minX || x1 > b.maxX) hit = false;
      } else {
        let t1 = (b.minX - x1) / dx;
        let t2 = (b.maxX - x1) / dx;
        if (t1 > t2) {
          const tmp = t1;
          t1 = t2;
          t2 = tmp;
        }
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) hit = false;
      }
      if (!hit) continue;
      // Y slab
      const minY = baseY - 0.15;
      const maxY = baseY + b.maxY;
      if (Math.abs(dy) < 1e-6) {
        if (y1 < minY || y1 > maxY) hit = false;
      } else {
        let t1 = (minY - y1) / dy;
        let t2 = (maxY - y1) / dy;
        if (t1 > t2) {
          const tmp = t1;
          t1 = t2;
          t2 = tmp;
        }
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) hit = false;
      }
      if (!hit) continue;
      // Z slab
      if (Math.abs(dz) < 1e-6) {
        if (z1 < b.minZ || z1 > b.maxZ) hit = false;
      } else {
        let t1 = (b.minZ - z1) / dz;
        let t2 = (b.maxZ - z1) / dz;
        if (t1 > t2) {
          const tmp = t1;
          t1 = t2;
          t2 = tmp;
        }
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) hit = false;
      }
      if (hit) return true;
    }
    return false;
  }

  private resolveExteriorCollisions(
    x: number,
    y: number,
    z: number,
    radius: number,
    includeCampfire = true,
  ): { x: number; z: number } {
    let rx = x;
    let rz = z;
    const isSandbox = this.mapSettings.mapPreset === 'custom_sandbox';
    const cfPos = this.getCampfirePos();
    const entMinY = y + 0.12;
    const entMaxY = y + 1.65;

    for (let pass = 0; pass < 3; pass++) {
      if (includeCampfire) {
        const cfY = groundHeightAt(cfPos.x, cfPos.z);
        if (entMinY <= cfY + 1.35) {
          const campDx = rx - cfPos.x;
          const campDz = rz - cfPos.z;
          const minCampD = 0.8 + radius;
          const campDistSq = campDx * campDx + campDz * campDz;
          if (campDistSq < minCampD * minCampD && campDistSq > 0.000001) {
            const campDist = Math.sqrt(campDistSq);
            rx = cfPos.x + (campDx / campDist) * minCampD;
            rz = cfPos.z + (campDz / campDist) * minCampD;
          }
        }
      }

      for (let i = 0; i < this.worldEnv.colliders.length; i++) {
        const c = this.worldEnv.colliders[i];
        const baseY = groundHeightAt(c.x, c.z);
        if (entMaxY < baseY || entMinY > baseY + c.height) continue;
        const dx = rx - c.x;
        const dz = rz - c.z;
        const minD = c.radius + radius;
        const dSq = dx * dx + dz * dz;
        if (dSq < minD * minD && dSq > 0.000001) {
          const d = Math.sqrt(dSq);
          rx = c.x + (dx / d) * minD;
          rz = c.z + (dz / d) * minD;
        }
      }

      if (!isSandbox) {
        const nodes = this.worldEnv.harvestNodes;
        for (let i = 0; i < nodes.length; i++) {
          const n = nodes[i];
          if (n.hp <= 0) continue;
          const ny = groundHeightAt(n.x, n.z);
          if (entMaxY < ny || entMinY > ny + 1.35) continue;
          const dx = rx - n.x;
          const dz = rz - n.z;
          const minD = 0.58 + radius;
          const dSq = dx * dx + dz * dz;
          if (dSq < minD * minD && dSq > 0.000001) {
            const d = Math.sqrt(dSq);
            rx = n.x + (dx / d) * minD;
            rz = n.z + (dz / d) * minD;
          }
        }
      }

      const boxes = this.worldEnv.boxColliders;
      for (let i = 0; i < boxes.length; i++) {
        const b = boxes[i];
        const baseY = groundHeightAt((b.minX + b.maxX) * 0.5, (b.minZ + b.maxZ) * 0.5);
        if (entMinY > baseY + b.maxY) continue;
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

      if (!isSandbox && rx >= 36 && rx <= 70 && rz >= 5 && rz <= 37) {
        const ffRes = resolveWallBoxes2D(
          rx,
          y,
          rz,
          radius,
          this.worldEnv.fastFood.wallBoxes,
          groundHeightAt(FASTFOOD_CENTER_X, FASTFOOD_CENTER_Z),
        );
        rx = ffRes.x;
        rz = ffRes.z;
      }
    }

    if (isSandbox) {
      const r = Math.hypot(rx, rz);
      if (r > ARENA_PLAYABLE_RADIUS) {
        rx = (rx / r) * ARENA_PLAYABLE_RADIUS;
        rz = (rz / r) * ARENA_PLAYABLE_RADIUS;
      }
    } else {
      const maxPx = ARENA_HALF_X - 1.2;
      const maxPz = ARENA_HALF_Z - 1.2;
      rx = THREE.MathUtils.clamp(rx, -maxPx, maxPx);
      rz = THREE.MathUtils.clamp(rz, -maxPz, maxPz);
    }

    return { x: rx, z: rz };
  }

  private initLooseRocks() {
    this.looseRocks = [];
    const seeds: LooseRockSeed[] = this.worldEnv.looseRockSeeds ?? [];
    for (let i = 0; i < seeds.length; i++) {
      const s = seeds[i];
      const gy = groundHeightAt(s.x, s.z);
      this.looseRocks.push({
        homeX: s.x,
        homeZ: s.z,
        x: s.x,
        y: gy + s.sy * 0.055,
        z: s.z,
        vx: 0,
        vy: 0,
        vz: 0,
        rx: 0,
        ry: s.rotY,
        rz: 0,
        vrx: 0,
        vry: 0,
        vrz: 0,
        sx: s.sx,
        sy: s.sy,
        sz: s.sz,
        radius: s.radius,
        sleeping: true,
        audioCooldown: 0,
      });
    }
    this.syncAllLooseRockMatrices();
  }

  private resetLooseRocks() {
    for (let i = 0; i < this.looseRocks.length; i++) {
      const r = this.looseRocks[i];
      const s = this.worldEnv.looseRockSeeds[i];
      r.x = r.homeX;
      r.z = r.homeZ;
      r.y = groundHeightAt(r.x, r.z) + r.sy * 0.055;
      r.vx = 0;
      r.vy = 0;
      r.vz = 0;
      r.rx = 0;
      r.ry = s ? s.rotY : 0;
      r.rz = 0;
      r.vrx = 0;
      r.vry = 0;
      r.vrz = 0;
      r.sleeping = true;
      r.audioCooldown = 0;
    }
    this.syncAllLooseRockMatrices();
  }

  private syncAllLooseRockMatrices() {
    const inst = this.worldEnv?.looseRockInst;
    if (!inst) return;
    for (let i = 0; i < this.looseRocks.length; i++) {
      const r = this.looseRocks[i];
      _rockDummy.position.set(r.x, r.y, r.z);
      _rockDummy.rotation.set(r.rx, r.ry, r.rz);
      _rockDummy.scale.set(r.sx, r.sy, r.sz);
      _rockDummy.updateMatrix();
      inst.setMatrixAt(i, _rockDummy.matrix);
    }
    inst.instanceMatrix.needsUpdate = true;
  }

  private scatterLooseRocksExplosion(
    ex: number,
    ey: number,
    ez: number,
    blastRadius: number,
    impulse: number,
  ) {
    if (
      this.activeZone !== 'exterior_9_julio' ||
      this.mapSettings.mapPreset === 'custom_sandbox' ||
      this.looseRocks.length === 0
    ) {
      return;
    }
    const maxR = blastRadius + 2.4;
    const maxRSq = maxR * maxR;
    for (let i = 0; i < this.looseRocks.length; i++) {
      const r = this.looseRocks[i];
      if (Math.abs(r.y - ey) > 2.5) continue;
      const dx = r.x - ex;
      const dz = r.z - ez;
      const dSq = dx * dx + dz * dz;
      if (dSq > maxRSq) continue;
      const d = Math.max(0.15, Math.sqrt(dSq));
      const falloff = 1 - d / maxR;
      const spd = impulse * (0.45 + falloff * 0.9);
      r.vx += (dx / d) * spd + (Math.random() - 0.5) * 1.4;
      r.vz += (dz / d) * spd + (Math.random() - 0.5) * 1.4;
      r.vy = Math.max(r.vy, 2.2 + falloff * 3.8);
      r.vrx = (Math.random() - 0.5) * 16;
      r.vry = (Math.random() - 0.5) * 16;
      r.vrz = (Math.random() - 0.5) * 16;
      r.sleeping = false;
    }
  }

  private updateLooseRocks(dt: number) {
    if (
      this.activeZone !== 'exterior_9_julio' ||
      this.mapSettings.mapPreset === 'custom_sandbox' ||
      this.looseRocks.length === 0
    ) {
      return;
    }
    const inst = this.worldEnv.looseRockInst;
    if (!inst) return;

    const pSpeed = Math.hypot(this.pvx, this.pvz);
    const pMoving = this.grounded && pSpeed > 0.35;
    const kickPower = this.isCrouching ? 0.42 : this.stance === 'run' ? 1.35 : 0.85;
    const kickRadius = 0.52;
    let dirty = false;

    for (let i = 0; i < this.looseRocks.length; i++) {
      const r = this.looseRocks[i];
      if (r.audioCooldown > 0) r.audioCooldown = Math.max(0, r.audioCooldown - dt);

      // 1. Player foot collision kicks/rolls the rock
      if (pMoving && Math.abs(this.py - r.y) < 0.72) {
        const dx = r.x - this.px;
        const dz = r.z - this.pz;
        const touchR = kickRadius + r.radius;
        const dSq = dx * dx + dz * dz;
        if (dSq < touchR * touchR) {
          const d = Math.max(0.06, Math.sqrt(dSq));
          const nx = dx / d;
          const nz = dz / d;
          const fwdScale = Math.min(1.6, pSpeed * 0.19) * kickPower;
          r.vx += nx * (1.8 * kickPower) + (this.pvx / pSpeed) * (2.6 * fwdScale) + (Math.random() - 0.5) * 0.8;
          r.vz += nz * (1.8 * kickPower) + (this.pvz / pSpeed) * (2.6 * fwdScale) + (Math.random() - 0.5) * 0.8;
          r.vy = Math.max(r.vy, (0.95 + Math.random() * 1.15) * Math.max(0.55, kickPower));
          r.vrx = (Math.random() - 0.5) * 14 * kickPower;
          r.vry = (Math.random() - 0.5) * 12 * kickPower;
          r.vrz = (Math.random() - 0.5) * 14 * kickPower;
          r.sleeping = false;
          // Push slightly outside foot radius so it doesn't stick inside the shoe
          r.x = this.px + nx * (touchR + 0.04);
          r.z = this.pz + nz * (touchR + 0.04);
          if (r.audioCooldown <= 0) {
            r.audioCooldown = 0.35;
            this.audio.playRockKick(r.x, r.y, r.z, Math.min(1, 0.45 * kickPower + pSpeed * 0.05), true);
            if (!this.isCrouching || pSpeed > 2.6) {
              this.emitSoundAlertAt(r.x, r.y, r.z, this.stance === 'run' ? 7.5 : 5.4, 0x94a3b8);
            }
          }
        }
      }

      // 2. Fast-moving zombies also kick loose street rocks as they charge
      for (let eIdx = 0; eIdx < this.enemies.length; eIdx++) {
        const e = this.enemies[eIdx];
        if (Math.abs(e.y - r.y) > 0.75) continue;
        const eSpeedSq = e.vx * e.vx + e.vz * e.vz;
        if (eSpeedSq < 2.5) continue;
        const dx = r.x - e.x;
        const dz = r.z - e.z;
        const touchR = e.radius * 0.72 + r.radius;
        const dSq = dx * dx + dz * dz;
        if (dSq < touchR * touchR) {
          const d = Math.max(0.06, Math.sqrt(dSq));
          const nx = dx / d;
          const nz = dz / d;
          r.vx += nx * 1.6 + e.vx * 0.45;
          r.vz += nz * 1.6 + e.vz * 0.45;
          r.vy = Math.max(r.vy, 1.05 + Math.random() * 0.9);
          r.vrx = (Math.random() - 0.5) * 12;
          r.vry = (Math.random() - 0.5) * 10;
          r.vrz = (Math.random() - 0.5) * 12;
          r.sleeping = false;
          if (r.audioCooldown <= 0 && (this.px - r.x) * (this.px - r.x) + (this.pz - r.z) * (this.pz - r.z) < 400) {
            r.audioCooldown = 0.45;
            this.audio.playRockKick(r.x, r.y, r.z, 0.55, false);
          }
        }
      }

      if (r.sleeping) continue;

      r.vy -= 18.0 * dt;
      r.x += r.vx * dt;
      r.z += r.vz * dt;
      r.y += r.vy * dt;
      r.rx += r.vrx * dt;
      r.ry += r.vry * dt;
      r.rz += r.vrz * dt;

      // Clamp to playable exterior limits
      const maxX = ARENA_HALF_X - 1.0;
      const maxZ = ARENA_HALF_Z - 1.0;
      if (r.x < -maxX || r.x > maxX) {
        r.x = THREE.MathUtils.clamp(r.x, -maxX, maxX);
        r.vx *= -0.45;
      }
      if (r.z < -maxZ || r.z > maxZ) {
        r.z = THREE.MathUtils.clamp(r.z, -maxZ, maxZ);
        r.vz *= -0.45;
      }

      const gy = groundHeightAt(r.x, r.z) + r.sy * 0.055;
      if (r.y <= gy) {
        r.y = gy;
        if (r.vy < -1.35 && r.audioCooldown <= 0) {
          r.audioCooldown = 0.25;
          if ((this.px - r.x) * (this.px - r.x) + (this.pz - r.z) * (this.pz - r.z) < 320) {
            this.audio.playRockKick(r.x, r.y, r.z, Math.min(0.85, Math.abs(r.vy) * 0.18), true);
          }
        }
        if (Math.abs(r.vy) > 1.1) {
          r.vy = -r.vy * 0.34;
        } else {
          r.vy = 0;
        }
        const groundDrag = Math.exp(-7.5 * dt);
        r.vx *= groundDrag;
        r.vz *= groundDrag;
        r.vrx *= groundDrag;
        r.vry *= groundDrag;
        r.vrz *= groundDrag;
      } else {
        const airDrag = Math.exp(-1.1 * dt);
        r.vx *= airDrag;
        r.vz *= airDrag;
      }

      if (
        r.y <= gy + 0.004 &&
        Math.abs(r.vy) < 0.05 &&
        r.vx * r.vx + r.vz * r.vz < 0.008
      ) {
        r.vx = 0;
        r.vy = 0;
        r.vz = 0;
        r.vrx = 0;
        r.vry = 0;
        r.vrz = 0;
        r.y = gy;
        r.sleeping = true;
      }

      _rockDummy.position.set(r.x, r.y, r.z);
      _rockDummy.rotation.set(r.rx, r.ry, r.rz);
      _rockDummy.scale.set(r.sx, r.sy, r.sz);
      _rockDummy.updateMatrix();
      inst.setMatrixAt(i, _rockDummy.matrix);
      dirty = true;
    }

    if (dirty) {
      inst.instanceMatrix.needsUpdate = true;
    }
  }

  private initLooseLightProps() {
    this.looseLightProps.forEach((p) => this.scene.remove(p.group));
    this.looseLightProps = [];
    this.looseLightPropResources.forEach((r) => r.dispose());
    this.looseLightPropResources = [];

    const canBodyGeo = new THREE.CylinderGeometry(0.062, 0.062, 0.16, 10);
    const canLipGeo = new THREE.CylinderGeometry(0.058, 0.062, 0.025, 10);
    const canMatRed = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.34, metalness: 0.72 });
    const canMatBlue = new THREE.MeshStandardMaterial({ color: 0x0369a1, roughness: 0.34, metalness: 0.72 });
    const canSilverMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.25, metalness: 0.85 });

    const bottleBodyGeo = new THREE.CylinderGeometry(0.052, 0.056, 0.2, 10);
    const bottleNeckGeo = new THREE.CylinderGeometry(0.022, 0.048, 0.1, 8);
    const bottleMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.14,
      metalness: 0.12,
      transparent: true,
      opacity: 0.88,
    });

    const coneBaseGeo = new THREE.BoxGeometry(0.36, 0.05, 0.36);
    const coneBodyGeo = new THREE.ConeGeometry(0.145, 0.46, 12);
    const coneStripeGeo = new THREE.CylinderGeometry(0.072, 0.1, 0.1, 12, 1, true);
    const coneOrangeMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.48, metalness: 0.08 });
    const coneBaseMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.88, metalness: 0.05 });
    const coneWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.35, metalness: 0.1, side: THREE.DoubleSide });

    const boxGeo = new THREE.BoxGeometry(0.46, 0.32, 0.38);
    const boxTapeGeo = new THREE.BoxGeometry(0.47, 0.04, 0.09);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x8b6743, roughness: 0.92, metalness: 0.02 });
    const boxTapeMat = new THREE.MeshStandardMaterial({ color: 0x4b3826, roughness: 0.78, metalness: 0.04 });

    this.looseLightPropResources.push(
      canBodyGeo,
      canLipGeo,
      canMatRed,
      canMatBlue,
      canSilverMat,
      bottleBodyGeo,
      bottleNeckGeo,
      bottleMat,
      coneBaseGeo,
      coneBodyGeo,
      coneStripeGeo,
      coneOrangeMat,
      coneBaseMat,
      coneWhiteMat,
      boxGeo,
      boxTapeGeo,
      boxMat,
      boxTapeMat,
    );

    for (let i = 0; i < LOOSE_LIGHT_PROP_SEEDS.length; i++) {
      const seed = LOOSE_LIGHT_PROP_SEEDS[i];
      const g = new THREE.Group();
      let halfH = 0.08;
      let radius = 0.16;
      let mass = 0.7;
      let noiseRadius = 10.0;
      let initRx = 0;

      if (seed.kind === 'can') {
        const body = new THREE.Mesh(canBodyGeo, i % 2 === 0 ? canMatRed : canMatBlue);
        const top = new THREE.Mesh(canLipGeo, canSilverMat);
        top.position.y = 0.088;
        body.castShadow = true;
        g.add(body, top);
        halfH = 0.068 * seed.scale;
        radius = 0.14 * seed.scale;
        mass = 0.55;
        noiseRadius = 11.0;
        if (i % 3 !== 0) initRx = Math.PI * 0.5;
      } else if (seed.kind === 'bottle') {
        const body = new THREE.Mesh(bottleBodyGeo, bottleMat);
        const neck = new THREE.Mesh(bottleNeckGeo, bottleMat);
        neck.position.y = 0.145;
        body.castShadow = true;
        g.add(body, neck);
        halfH = 0.06 * seed.scale;
        radius = 0.15 * seed.scale;
        mass = 0.65;
        noiseRadius = 12.5;
        if (i % 2 === 0) initRx = Math.PI * 0.5;
        else halfH = 0.11 * seed.scale;
      } else if (seed.kind === 'cone') {
        const base = new THREE.Mesh(coneBaseGeo, coneBaseMat);
        base.position.y = -0.22;
        const body = new THREE.Mesh(coneBodyGeo, coneOrangeMat);
        body.position.y = 0.02;
        const stripe = new THREE.Mesh(coneStripeGeo, coneWhiteMat);
        stripe.position.y = 0.04;
        body.castShadow = true;
        base.castShadow = true;
        g.add(base, body, stripe);
        halfH = 0.245 * seed.scale;
        radius = 0.26 * seed.scale;
        mass = 1.05;
        noiseRadius = 9.5;
      } else {
        const box = new THREE.Mesh(boxGeo, boxMat);
        const tape = new THREE.Mesh(boxTapeGeo, boxTapeMat);
        tape.position.y = 0.15;
        box.castShadow = true;
        box.receiveShadow = true;
        g.add(box, tape);
        halfH = 0.16 * seed.scale;
        radius = 0.3 * seed.scale;
        mass = 1.2;
        noiseRadius = 8.5;
      }

      const gy = groundHeightAt(seed.x, seed.z) + halfH;
      g.position.set(seed.x, gy, seed.z);
      g.rotation.set(initRx, seed.rotY, 0);
      g.scale.setScalar(seed.scale);
      this.scene.add(g);

      this.looseLightProps.push({
        kind: seed.kind,
        homeX: seed.x,
        homeZ: seed.z,
        homeRotY: seed.rotY,
        scale: seed.scale,
        x: seed.x,
        y: gy,
        z: seed.z,
        vx: 0,
        vy: 0,
        vz: 0,
        rx: initRx,
        ry: seed.rotY,
        rz: 0,
        vrx: 0,
        vry: 0,
        vrz: 0,
        halfH,
        radius,
        mass,
        noiseRadius,
        sleeping: true,
        hitCooldown: 0,
        group: g,
      });
    }
    this.syncLooseLightPropsVisibility();
  }

  private resetLooseLightProps() {
    for (let i = 0; i < this.looseLightProps.length; i++) {
      const p = this.looseLightProps[i];
      p.x = p.homeX;
      p.z = p.homeZ;
      const gy = groundHeightAt(p.x, p.z) + p.halfH;
      p.y = gy;
      p.vx = 0;
      p.vy = 0;
      p.vz = 0;
      p.rx =
        (p.kind === 'can' && i % 3 !== 0) || (p.kind === 'bottle' && i % 2 === 0)
          ? Math.PI * 0.5
          : 0;
      p.ry = p.homeRotY;
      p.rz = 0;
      p.vrx = 0;
      p.vry = 0;
      p.vrz = 0;
      p.sleeping = true;
      p.hitCooldown = 0;
      p.group.position.set(p.x, p.y, p.z);
      p.group.rotation.set(p.rx, p.ry, p.rz);
    }
    this.syncLooseLightPropsVisibility();
  }

  private syncLooseLightPropsVisibility() {
    const show =
      this.activeZone === 'exterior_9_julio' && this.mapSettings.mapPreset !== 'custom_sandbox';
    for (let i = 0; i < this.looseLightProps.length; i++) {
      this.looseLightProps[i].group.visible = show;
    }
  }

  private emitSoundAlertAt(
    x: number,
    y: number,
    z: number,
    noiseRadius: number,
    rippleColor: number,
  ) {
    if (this.gameState !== 'PLAYING' || this.editorMode || noiseRadius <= 0.5) return;
    if (this.looseNoiseCooldown <= 0) {
      this.looseNoiseCooldown = 0.28;
      this.spawnNoiseRipple(x, y, z, Math.min(noiseRadius * 0.72, 9.5), rippleColor, 0.65);
    }
    this.stealthNoiseBoostTimer = Math.max(this.stealthNoiseBoostTimer, 0.85);
    this.stealthNoiseBoostLevel = Math.max(
      this.stealthNoiseBoostLevel,
      THREE.MathUtils.clamp(noiseRadius / 12.5, 0.35, 0.96),
    );

    const rSq = noiseRadius * noiseRadius;
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (e.state !== 'wander' && e.state !== 'investigate') continue;
      if (Math.abs(e.y - y) > 5.5) continue;
      const dx = e.x - x;
      const dz = e.z - z;
      if (dx * dx + dz * dz <= rSq) {
        e.state = 'investigate';
        e.provoked = false;
        e.investigateX = x;
        e.investigateZ = z;
        e.investigateTimer = Math.max(e.investigateTimer, 5.2);
        e.suspicion = Math.max(e.suspicion, 0.62);
        e.squash = 1.08;
        e.awarenessDisplayTimer = 2.8;
        e.awarenessDisplayMax = 2.8;
      }
    }
  }

  private updateLooseLightProps(dt: number) {
    if (
      this.activeZone !== 'exterior_9_julio' ||
      this.mapSettings.mapPreset === 'custom_sandbox' ||
      this.looseLightProps.length === 0
    ) {
      return;
    }

    const pSpeed = Math.hypot(this.pvx, this.pvz);
    const pRadius = 0.48;
    const kickScale = this.isCrouching ? 0.56 : this.stance === 'run' ? 1.38 : 0.95;

    for (let i = 0; i < this.looseLightProps.length; i++) {
      const p = this.looseLightProps[i];
      if (p.hitCooldown > 0) p.hitCooldown = Math.max(0, p.hitCooldown - dt);

      if (Math.abs(this.py - (p.y - p.halfH)) < 1.25) {
        const dx = p.x - this.px;
        const dz = p.z - this.pz;
        const touchR = pRadius + p.radius;
        const dSq = dx * dx + dz * dz;
        if (dSq < touchR * touchR) {
          const d = Math.max(0.05, Math.sqrt(dSq));
          const nx = dx / d;
          const nz = dz / d;
          const overlap = touchR - d;
          p.x += nx * (overlap + 0.04);
          p.z += nz * (overlap + 0.04);

          if (pSpeed > 0.25) {
            const invMass = 1 / p.mass;
            const impulse = (1.65 + pSpeed * 0.45) * kickScale * invMass;
            p.vx += nx * impulse + (this.pvx / pSpeed) * (pSpeed * 0.42 * invMass);
            p.vz += nz * impulse + (this.pvz / pSpeed) * (pSpeed * 0.42 * invMass);
            p.vy = Math.max(p.vy, (1.15 + Math.min(1.6, pSpeed * 0.16)) * Math.sqrt(invMass));
            p.vrx = (Math.random() - 0.5) * 11 * invMass;
            p.vry = (Math.random() - 0.5) * 9 * invMass;
            p.vrz = (Math.random() - 0.5) * 11 * invMass;
            p.sleeping = false;

            if (p.hitCooldown <= 0) {
              p.hitCooldown = 0.48;
              const intensity = THREE.MathUtils.clamp((0.35 + pSpeed * 0.07) * kickScale, 0.25, 1.0);
              this.audio.playLightPropHit(p.kind, { x: p.x, y: p.y, z: p.z }, intensity);
              const alertScale = this.isCrouching && pSpeed < 2.8 ? 0.58 : 1.0;
              const colorHex =
                p.kind === 'can'
                  ? 0xfacc15
                  : p.kind === 'bottle'
                    ? 0x86efac
                    : p.kind === 'cone'
                      ? 0xf97316
                      : 0xd6b084;
              this.emitSoundAlertAt(p.x, p.y, p.z, p.noiseRadius * alertScale, colorHex);
            }
          } else {
            p.group.position.set(p.x, p.y, p.z);
          }
        }
      }

      for (let eIdx = 0; eIdx < this.enemies.length; eIdx++) {
        const e = this.enemies[eIdx];
        if (Math.abs(e.y - (p.y - p.halfH)) > 1.2) continue;
        const eSpdSq = e.vx * e.vx + e.vz * e.vz;
        if (eSpdSq < 1.2) continue;
        const dx = p.x - e.x;
        const dz = p.z - e.z;
        const touchR = e.radius * 0.72 + p.radius;
        const dSq = dx * dx + dz * dz;
        if (dSq < touchR * touchR) {
          const d = Math.max(0.05, Math.sqrt(dSq));
          const nx = dx / d;
          const nz = dz / d;
          const invMass = 1 / p.mass;
          p.x = e.x + nx * (touchR + 0.03);
          p.z = e.z + nz * (touchR + 0.03);
          p.vx += nx * 1.4 * invMass + e.vx * 0.45 * invMass;
          p.vz += nz * 1.4 * invMass + e.vz * 0.45 * invMass;
          p.vy = Math.max(p.vy, 1.05 * invMass);
          p.vrx = (Math.random() - 0.5) * 9 * invMass;
          p.vry = (Math.random() - 0.5) * 7 * invMass;
          p.vrz = (Math.random() - 0.5) * 9 * invMass;
          p.sleeping = false;
          if (
            p.hitCooldown <= 0 &&
            (this.px - p.x) * (this.px - p.x) + (this.pz - p.z) * (this.pz - p.z) < 400
          ) {
            p.hitCooldown = 0.55;
            this.audio.playLightPropHit(p.kind, { x: p.x, y: p.y, z: p.z }, 0.55);
          }
        }
      }

      if (p.sleeping) continue;

      p.vy -= 18.0 * dt;
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      p.y += p.vy * dt;
      p.rx += p.vrx * dt;
      p.ry += p.vry * dt;
      p.rz += p.vrz * dt;

      const maxX = ARENA_HALF_X - 1.2;
      const maxZ = ARENA_HALF_Z - 1.2;
      if (p.x < -maxX || p.x > maxX) {
        p.x = THREE.MathUtils.clamp(p.x, -maxX, maxX);
        p.vx *= -0.45;
      }
      if (p.z < -maxZ || p.z > maxZ) {
        p.z = THREE.MathUtils.clamp(p.z, -maxZ, maxZ);
        p.vz *= -0.45;
      }

      const resolved = this.resolveExteriorCollisions(p.x, p.y, p.z, p.radius, false);
      if (Math.abs(resolved.x - p.x) > 0.004 || Math.abs(resolved.z - p.z) > 0.004) {
        p.x = resolved.x;
        p.z = resolved.z;
        p.vx *= -0.35;
        p.vz *= -0.35;
      }

      const tipFactor =
        p.kind === 'cone' && (Math.abs(Math.sin(p.rx)) > 0.45 || Math.abs(Math.sin(p.rz)) > 0.45)
          ? 0.52
          : 1.0;
      const gy = groundHeightAt(p.x, p.z) + p.halfH * tipFactor;
      if (p.y <= gy) {
        p.y = gy;
        if (p.vy < -1.6 && p.hitCooldown <= 0) {
          p.hitCooldown = 0.35;
          if ((this.px - p.x) * (this.px - p.x) + (this.pz - p.z) * (this.pz - p.z) < 340) {
            this.audio.playLightPropHit(
              p.kind,
              { x: p.x, y: p.y, z: p.z },
              Math.min(0.85, Math.abs(p.vy) * 0.2),
            );
          }
        }
        if (Math.abs(p.vy) > 1.25) {
          p.vy = -p.vy * 0.32;
        } else {
          p.vy = 0;
        }
        const drag = Math.exp((p.kind === 'box' ? -9.5 : -6.2) * dt);
        p.vx *= drag;
        p.vz *= drag;
        p.vrx *= drag;
        p.vry *= drag;
        p.vrz *= drag;
      } else {
        const airDrag = Math.exp(-1.1 * dt);
        p.vx *= airDrag;
        p.vz *= airDrag;
      }

      if (
        p.y <= gy + 0.005 &&
        Math.abs(p.vy) < 0.05 &&
        p.vx * p.vx + p.vz * p.vz < 0.01
      ) {
        p.vx = 0;
        p.vy = 0;
        p.vz = 0;
        p.vrx = 0;
        p.vry = 0;
        p.vrz = 0;
        p.y = gy;
        p.sleeping = true;
      }

      p.group.position.set(p.x, p.y, p.z);
      p.group.rotation.set(p.rx, p.ry, p.rz);
    }
  }

  private getFootstepSurfaceAt(x: number, y: number, z: number): FootstepSurface {
    if (this.activeZone === 'colon_interior') {
      if (y >= 0.9 && y <= 1.5 && z < -16.2) return 'wood';
      if (y < 0.5 && Math.abs(x) <= 2.35 && z >= -14.0) return 'carpet';
      if (y >= 3.5 && x <= -21.0 && z <= -20.0) return 'steel';
      if (y >= 3.5) return 'carpet';
      return 'marble';
    }
    const isSandbox = this.mapSettings.mapPreset === 'custom_sandbox';
    if (!isSandbox) {
      if (
        x >= FASTFOOD_INTERIOR_BOUNDS.minX &&
        x <= FASTFOOD_INTERIOR_BOUNDS.maxX &&
        z >= FASTFOOD_INTERIOR_BOUNDS.minZ &&
        z <= FASTFOOD_INTERIOR_BOUNDS.maxZ
      ) {
        return 'tile';
      }
      if (isPointInWaterPuddle(x, z)) {
        return 'water';
      }
      if (isOnPotholeOrPatch(x, z)) {
        return 'gravel';
      }
      if (isPointInPlazaTallGrass(x, z)) {
        return 'grass';
      }
      if (
        (Math.abs(x) < 11.5 && Math.abs(z) < 12.5) ||
        Math.abs(x - 22.8) < 2.2 ||
        Math.abs(x + 22.8) < 2.2 ||
        Math.abs(x) > 36.0
      ) {
        return 'plaza';
      }
    }
    return 'asphalt';
  }

  private getPlayerFootstepSurface(): FootstepSurface {
    return this.getFootstepSurfaceAt(this.px, this.py, this.pz);
  }

  private detectGroundStainAt(x: number, y: number, z: number): ShoeStainKind | null {
    for (let i = 0; i < this.bloodDecals.length; i++) {
      const d = this.bloodDecals[i];
      if (!d.active || d.mat.opacity < 0.12) continue;
      if (Math.abs(d.mesh.position.y - y) > 0.75) continue;
      const r = Math.max(0.28, d.mesh.scale.x * 0.65);
      const dx = x - d.x;
      const dz = z - d.z;
      if (dx * dx + dz * dz <= r * r) {
        return d.mat.color.g > 0.35 && d.mat.color.r < 0.65 ? 'acid' : 'blood';
      }
    }
    if (
      this.activeZone === 'exterior_9_julio' &&
      this.mapSettings.mapPreset !== 'custom_sandbox' &&
      isPointInWaterPuddle(x, z)
    ) {
      return 'water';
    }
    return null;
  }

  private spawnFootprintDecal(
    x: number,
    y: number,
    z: number,
    yaw: number,
    isLeft: boolean,
    stainKind: ShoeStainKind,
    fadeScale: number,
  ) {
    if (this.footprintDecals.length === 0) return;

    let slot: FootprintDecal | null = null;
    let oldest = this.footprintDecals[0];
    for (let i = 0; i < this.footprintDecals.length; i++) {
      const cand = this.footprintDecals[i];
      if (!cand.active) {
        slot = cand;
        break;
      }
      if (cand.age > oldest.age) {
        oldest = cand;
      }
    }
    if (!slot) slot = oldest;

    const gy = this.floorAt(x, z, y) + 0.028;
    const colorHex =
      stainKind === 'blood' ? 0x62080c : stainKind === 'acid' ? 0x4b6e20 : 0x182530;
    const maxOpacity = THREE.MathUtils.clamp(
      (stainKind === 'water' ? 0.56 : 0.78) * fadeScale,
      0.22,
      0.84,
    );

    slot.mat.color.setHex(colorHex);
    slot.mat.opacity = maxOpacity;
    slot.mesh.position.set(x, gy, z);
    slot.mesh.rotation.set(0, yaw, 0);
    slot.mesh.scale.set(isLeft ? 1 : -1, 1, 1);
    slot.mesh.visible = true;

    slot.active = true;
    slot.age = 0;
    slot.duration = stainKind === 'water' ? 12 : 20;
    slot.maxOpacity = maxOpacity;
  }

  private triggerActorFootstepVisual(
    x: number,
    y: number,
    z: number,
    yaw: number,
    isLeft: boolean,
    surface: FootstepSurface,
    mode: 'walk' | 'run' | 'crouch' | 'land',
    stainState: { kind: ShoeStainKind; charges: number },
  ) {
    const sideSign = isLeft ? -1 : 1;
    const rightX = Math.cos(yaw);
    const rightZ = -Math.sin(yaw);
    const fx = x + rightX * (0.14 * sideSign);
    const fz = z + rightZ * (0.14 * sideSign);
    const fy = this.floorAt(fx, fz, y);

    if (surface === 'water') {
      const dropCount = mode === 'land' ? 11 : mode === 'run' ? 8 : mode === 'crouch' ? 3 : 5;
      const spd = mode === 'land' ? 2.8 : mode === 'run' ? 2.35 : 1.55;
      this.spawnDropletSpray(fx, fy + 0.04, fz, dropCount, spd, 0.58, 0.76, 0.88, 0.28, 0.54, 1.9);
      this.spawnSmokePuff(
        fx,
        fy + 0.05,
        fz,
        (Math.random() - 0.5) * 0.3,
        0.38,
        (Math.random() - 0.5) * 0.3,
        0.38,
        0.22,
        0.58,
        0.72,
        0.8,
        0.86,
        0.24,
      );
    } else if (surface === 'gravel' || surface === 'asphalt') {
      if (mode !== 'crouch') {
        const puffOpacity = mode === 'land' ? 0.34 : mode === 'run' ? 0.28 : 0.16;
        const puffStart = mode === 'land' ? 0.24 : 0.16;
        const puffEnd = mode === 'land' ? 0.72 : mode === 'run' ? 0.62 : 0.45;
        this.spawnSmokePuff(
          fx,
          fy + 0.05,
          fz,
          (Math.random() - 0.5) * 0.35,
          0.32,
          (Math.random() - 0.5) * 0.35,
          0.42,
          puffStart,
          puffEnd,
          0.5,
          0.48,
          0.44,
          puffOpacity,
        );
      }
      if (mode === 'run' || mode === 'land' || (surface === 'gravel' && mode === 'walk')) {
        const gritCount = mode === 'land' ? 5 : mode === 'run' ? 3 : 2;
        this.spawnDropletSpray(
          fx,
          fy + 0.04,
          fz,
          gritCount,
          mode === 'land' ? 2.4 : 1.7,
          surface === 'gravel' ? 0.45 : 0.34,
          surface === 'gravel' ? 0.39 : 0.34,
          surface === 'gravel' ? 0.31 : 0.36,
          0.22,
          0.42,
          1.4,
        );
      }
    } else if (surface === 'plaza' || surface === 'tile' || surface === 'marble' || surface === 'wood') {
      if (mode === 'run' || mode === 'land') {
        this.spawnSmokePuff(
          fx,
          fy + 0.04,
          fz,
          (Math.random() - 0.5) * 0.25,
          0.28,
          (Math.random() - 0.5) * 0.25,
          0.36,
          0.16,
          0.52,
          0.62,
          0.6,
          0.56,
          mode === 'land' ? 0.26 : 0.18,
        );
      }
    } else if (surface === 'steel') {
      if (mode === 'run' || mode === 'land') {
        this.spawnSmokePuff(
          fx,
          fy + 0.04,
          fz,
          (Math.random() - 0.5) * 0.25,
          0.26,
          (Math.random() - 0.5) * 0.25,
          0.32,
          0.15,
          0.48,
          0.56,
          0.58,
          0.62,
          0.2,
        );
        if (mode === 'land') {
          this.spawnDropletSpray(fx, fy + 0.05, fz, 3, 2.6, 0.95, 0.72, 0.32, 0.2, 0.35, 1.5);
        }
      }
    } else if (surface === 'grass') {
      const fleckCount = mode === 'land' ? 6 : mode === 'run' ? 4 : mode === 'crouch' ? 1 : 2;
      this.spawnDropletSpray(
        fx,
        fy + 0.08,
        fz,
        fleckCount,
        mode === 'land' ? 2.1 : mode === 'run' ? 1.65 : 1.05,
        0.24,
        0.48,
        0.16,
        0.24,
        0.44,
        1.25,
      );
      if (mode === 'run' || mode === 'land') {
        this.spawnSmokePuff(
          fx,
          fy + 0.06,
          fz,
          (Math.random() - 0.5) * 0.25,
          0.24,
          (Math.random() - 0.5) * 0.25,
          0.34,
          0.14,
          0.46,
          0.34,
          0.44,
          0.26,
          0.16,
        );
      }
    } else if (surface === 'carpet' && mode === 'land') {
      this.spawnSmokePuff(fx, fy + 0.04, fz, 0, 0.22, 0, 0.34, 0.18, 0.48, 0.55, 0.36, 0.36, 0.16);
    }

    const touchedStain = this.detectGroundStainAt(fx, fy, fz);
    if (touchedStain) {
      stainState.kind = touchedStain;
      stainState.charges = touchedStain === 'water' ? 6 : 8;
      if (touchedStain === 'blood' || touchedStain === 'acid') {
        this.spawnDropletSpray(
          fx,
          fy + 0.04,
          fz,
          mode === 'run' || mode === 'land' ? 5 : 3,
          1.7,
          touchedStain === 'acid' ? 0.42 : 0.55,
          touchedStain === 'acid' ? 0.58 : 0.04,
          touchedStain === 'acid' ? 0.12 : 0.05,
          0.24,
          0.46,
          1.5,
        );
      }
      this.spawnFootprintDecal(fx, fy, fz, yaw, isLeft, touchedStain, 0.92);
    } else if (stainState.charges > 0) {
      const fadeScale = THREE.MathUtils.clamp(stainState.charges / 7, 0.28, 1.0);
      this.spawnFootprintDecal(fx, fy, fz, yaw, isLeft, stainState.kind, fadeScale);
      stainState.charges -= 1;
    }
  }

  private updateZombieBreathingFeed(dt: number) {
    const active =
      this.gameState === 'PLAYING' &&
      !this.editorMode &&
      this.enemies.length > 0;
    if (!active) {
      this.audio.updateZombieBreathing(this.zombieBreathScratch, false, dt);
      return;
    }

    const lx = this.spatialAmbienceState.listenerX;
    const ly = this.spatialAmbienceState.listenerY;
    const lz = this.spatialAmbienceState.listenerZ;
    const maxDistSq = 22 * 22;
    let count = 0;

    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      const dx = e.x - lx;
      const dy = e.y + 1.3 - ly;
      const dz = e.z - lz;
      const dSq = dx * dx + dy * dy + dz * dz;
      if (dSq > maxDistSq) continue;
      let slot = this.zombieBreathScratch[count];
      if (!slot) {
        slot = {
          id: 0,
          kind: 'stalker',
          state: 'wander',
          x: 0,
          y: 0,
          z: 0,
          distSq: 0,
          phaseOffset: 0,
        };
        this.zombieBreathScratch.push(slot);
      }
      slot.id = e.id;
      slot.kind = e.kind;
      slot.state = e.state;
      slot.x = e.x;
      slot.y = e.y;
      slot.z = e.z;
      slot.distSq = dSq;
      slot.phaseOffset = ((e.id * 0.371) % 1 + 1) % 1;
      count += 1;
    }
    this.zombieBreathScratch.length = count;
    this.audio.updateZombieBreathing(this.zombieBreathScratch, count > 0, dt);
  }

  private switchWorldZone(zone: WorldZoneId) {
    this.audio.resetZombieBreathing();
    this.activeZone = zone;
    const interior = zone === 'colon_interior';
    this.colonInterior.root.visible = interior;
    this.worldEnv.setExteriorVisible(!interior);
    this.campfireVisuals.group.visible = !interior;
    this.campfireLight.visible = !interior;
    if (interior) {
      this.campfireLight.intensity = 0;
      if (this.exteriorMechanicRig) {
        this.exteriorMechanicRig.root.visible = false;
      }
    }
    this.placedPropMeshes.forEach((m) => {
      m.visible = !interior;
    });
    this.syncLooseLightPropsVisibility();
    this.updateDayNightAndFog(0);
  }

  public startMission2(preserveLoadout = false) {
    this.audio.unlock();
    this.clearDynamicEntities();
    this.editorMode = false;
    this.worldEnv.editorGrid.visible = false;
    this.selectionRing.visible = false;

    this.storyMission = 2;
    this.isTutorialMode = false;
    this.mission2Unlocked = true;
    try {
      localStorage.setItem(MISSION2_UNLOCKED_STORAGE_KEY, '1');
    } catch {
      // Ignore storage write errors
    }

    this.switchWorldZone('colon_interior');

    this.px = COLON_INTERIOR_SPAWN.x;
    this.pz = COLON_INTERIOR_SPAWN.z;
    this.py = COLON_INTERIOR_SPAWN.y;
    this.pvx = 0;
    this.pvy = 0;
    this.pvz = 0;
    this.pyaw = Math.PI;
    this.camYaw = 0;
    this.camPitch = this.cameraSettings.normalPitch;
    this.camDistCurrent = this.cameraSettings.normalDistance;
    this.camShoulderOffset = this.cameraSettings.normalShoulderOffset;
    this.camPivotHeight = this.cameraSettings.normalHeight;
    this.camera.fov = this.cameraSettings.normalFov;
    this.camera.updateProjectionMatrix();
    this.cameraPreviewActive = false;
    this.cameraPreviewAim = false;
    this.manualCameraCooldown = 0;
    this.recenterCamTimer = 0;
    this.grounded = true;
    this.jumpWindupTimer = 0;
    this.isCrouching = false;
    this.crouchFactor = 0;
    this.stance = 'idle';

    this.maxHp = this.difficulty === 'pilgrim' ? 125 : this.difficulty === 'warden' ? 100 : 85;
    if (preserveLoadout) {
      this.hp = Math.max(this.hp, Math.round(this.maxHp * 0.85));
      if (!this.hasBackpack) {
        this.unlockBackpack();
      }
      if (!this.unlockedWeapons.stick) this.unlockedWeapons.stick = true;
      this.provisions = {
        chemicals: Math.max(1, this.provisions.chemicals),
        scrap: Math.max(1, this.provisions.scrap),
        powder: Math.max(1, this.provisions.powder),
      };
      if (this.getTotalDistractions() <= 0) {
        this.distractionCounts = { bottle: 1, can: 1, brick: 1, decoy_rat: 0 };
        this.activeDistractionKind = 'bottle';
      }
    } else {
      this.hp = this.maxHp;
      this.helmetArmor = 0;
      this.vestArmor = 0;
      this.unlockedWeapons = {
        stick: true,
        baton: false,
        bow: true,
        pistol: false,
        rifle: false,
      };
      this.weapon = 'stick';
      this.arrows = 12;
      this.pistolAmmo = 0;
      this.pistolReserveAmmo = 0;
      this.rifleAmmo = 0;
      this.rifleReserveAmmo = 0;
      this.hasBackpack = true;
      this.inventory = Array.from({ length: 8 }, () => null);
      this.inventory[0] = { kind: 'bandage', count: 2 };
      this.inventory[1] = { kind: 'food', count: 1 };
      this.inventory[2] = { kind: 'molotov', count: 1 };
      this.inventory[3] = { kind: 'nail_bomb', count: 1 };
      this.selectedInventorySlot = 0;
      this.hudInventoryDirty = true;
      this.syncInventoryCounters();
      this.provisions = { chemicals: 1, scrap: 1, powder: 1 };
      this.distractionCounts = { bottle: 1, can: 1, brick: 1, decoy_rat: 0 };
      this.activeDistractionKind = 'bottle';
      this.score = 0;
      this.survivalTime = 0;
    }

    this.bowDrawProgress = 0;
    this.bowDrawSoundPlayed = false;
    this.wasFiringBow = false;
    this.stamina = this.maxStamina;
    this.staminaExhausted = false;
    this.flareCharge = Math.max(50, this.flareCharge);
    this.combo = 1;
    this.comboTimer = 0;
    this.kills = 0;
    this.invulnTimer = 0;
    this.strikeCooldown = 0;
    this.hurtFlashTimer = 0;
    this.damageSeq = 0;
    this.lastDamage = 0;
    this.recoilTimer = 0;
    this.recoilKickAmount = 0;
    this.camRecoilPitch = 0;
    this.camRecoilYaw = 0;
    this.fireBloom = 0;
    this.crosshairSpread = 0.24;
    this.meleeTimer = 0;
    this.throwAnimTimer = 0;
    this.playerHitAnimTimer = 0;
    this.molotovLit = false;
    this.nailBombLit = false;
    this.equippedThrowable = null;
    this.aimingThrowable = null;
    this.aimingThrowableSlot = undefined;
    this.throwArcLine.visible = false;
    this.throwLandingRing.visible = false;
    this.heldMolotovGroup.visible = false;
    this.heldNailBombGroup.visible = false;
    this.heldGrenadeGroup.visible = false;
    this.heldBottleGroup.visible = false;
    this.heldCanGroup.visible = false;
    this.heldBrickGroup.visible = false;
    this.heldDecoyRatGroup.visible = false;
    this.playerBurnTickTimer = 0;
    this.reloadTimer = 0;
    this.isAiming = false;
    this.muzzleFlashTimer = 0;
    this.muzzleFlashGroup.visible = false;
    this.muzzleFlashLight.intensity = 0;
    this.syncWeaponVisibility();
    this.syncArmorVisibility();
    this.resetPlayerPoseTransforms();

    this.missionPhase = 'clear_theater';
    this.colonUnlocked = false;
    this.allyRescued = false;
    this.baseUnlocked = false;
    this.mechanicRescued = false;
    this.vehicleBayUnlocked = false;
    this.vehicleState = { engine: false, tires: false, armor: false, fuel: false };
    this.mechanicPinned = false;
    this.mechanicLimping = false;
    this.nearMechanicHelp = false;
    this.nearVehicleBay = false;
    this.shelfCollapsing = false;
    this.shelfCollapseProgress = 0;
    this.fastFoodHordeIds.clear();
    this.escortAmbushSpawned = false;
    this.worldEnv.fastFood.setShelfCollapse(0);
    this.worldEnv.fastFood.updateVisuals(false, this.elapsed);
    if (this.exteriorMechanicRig) {
      this.exteriorMechanicRig.root.visible = false;
    }
    this.allyCutsceneTimer = 0;
    this.missionCompleteTimer = 0;
    this.nearWorkbench = false;
    this.nearExteriorExit = false;
    this.nearColonEntrance = false;
    this.colonInterior.boilerDoorPivot.rotation.y = 0;
    this.colonInterior.allyRig.root.visible = false;

    this.colonInterior.zombieSpawns.forEach((sp) => {
      this.spawnEnemyAt(
        sp.kind,
        sp.x,
        sp.z,
        undefined,
        sp.y,
        sp.carriedWeapon ?? null,
        sp.enemyRole,
        sp.carriedGear,
      );
    });
    this.colonInterior.lootSpots.forEach((ls) => {
      this.spawnPickup(ls.kind, ls.x, ls.z, false, ls.y);
    });

    this.gameState = 'PLAYING';
    this.lastTimestamp = performance.now();
    this.camera.position.set(
      this.px + this.cameraSettings.normalShoulderOffset,
      this.py + this.cameraSettings.normalHeight + Math.sin(this.camPitch) * this.camDistCurrent,
      this.pz + Math.cos(this.camPitch) * this.camDistCurrent,
    );
    this.requestPointerLockSafe();
    this.setRadioTransmission(
      'Ricardo López',
      'Adentro del Teatro Colón. Hay 12 infectados entre la Platea, los palcos y la Sala de Máquinas. Hay que asegurar todo el edificio.',
      7.5,
    );
    this.emitHud();
  }

  public continueToMission2() {
    this.startMission2(true);
  }

  public skipAllyCutscene() {
    if (this.gameState !== 'ALLY_RESCUE_CUTSCENE') return;
    this.completeMission2();
  }

  public enterColonBase() {
    this.audio.unlock();
    this.clearDynamicEntities();
    this.switchWorldZone('colon_interior');
    if (this.storyMission !== 3) {
      this.storyMission = 2;
    }
    this.missionPhase = 'base_free_roam';
    this.allyRescued = true;
    this.baseUnlocked = true;
    this.colonUnlocked = true;
    this.nearMechanicHelp = false;
    this.nearVehicleBay = false;
    this.colonInterior.boilerDoorPivot.rotation.y = -1.65;
    this.colonInterior.allyRig.root.visible = true;
    this.colonInterior.allyRig.root.position.set(
      COLON_ALLY_BASE_POS.x,
      COLON_ALLY_BASE_POS.y,
      COLON_ALLY_BASE_POS.z,
    );
    this.colonInterior.allyRig.root.rotation.y = -Math.PI * 0.55;
    if (this.exteriorMechanicRig) {
      this.exteriorMechanicRig.root.visible = false;
    }

    if (this.vehicleBayUnlocked) {
      this.px = 23.0;
      this.py = 0;
      this.pz = -12.5;
      this.pyaw = Math.atan2(COLON_VEHICLE_BAY_POS.x - this.px, COLON_VEHICLE_BAY_POS.z - this.pz);
      this.camYaw = this.pyaw + Math.PI;
    } else {
      this.px = 24.4;
      this.py = 0;
      this.pz = 6.2;
      this.pyaw = Math.PI * 0.5;
      this.camYaw = -Math.PI * 0.5;
    }
    this.pvx = 0;
    this.pvy = 0;
    this.pvz = 0;
    this.grounded = true;
    this.playerRig.root.position.set(this.px, this.py, this.pz);
    this.playerRig.root.rotation.y = this.pyaw;

    this.gameState = 'PLAYING';
    this.lastTimestamp = performance.now();
    this.requestPointerLockSafe();
    this.setRadioTransmission(
      this.vehicleBayUnlocked ? 'Mateo (Mecánico)' : 'Sofía «Chispa» Méndez',
      this.vehicleBayUnlocked
        ? '¡Bienvenido al Taller Mecánico! Con chatarra, químicos y pólvora puedo reparar esta camioneta blindada para salir por toda la ciudad.'
        : 'Esta Sala Dorada será nuestra Base Permanente. En mi mesa química puedo armar Molotovs y bombas de clavos, y cuando quieras te encargo buscar más suministros.',
      8.0,
    );
    this.emitHud();
  }

  public startMission3(preserveLoadout = false) {
    this.audio.unlock();
    this.clearDynamicEntities();
    this.editorMode = false;
    this.worldEnv.editorGrid.visible = false;
    this.selectionRing.visible = false;

    this.storyMission = 3;
    this.isTutorialMode = false;
    this.mission2Unlocked = true;
    this.allyRescued = true;
    this.baseUnlocked = true;
    this.colonUnlocked = true;

    this.mechanicRescued = false;
    this.vehicleBayUnlocked = false;
    this.vehicleState = { engine: false, tires: false, armor: false, fuel: false };
    this.mechanicPos = { x: FASTFOOD_MECHANIC_POS.x, z: FASTFOOD_MECHANIC_POS.z };
    this.mechanicYaw = -Math.PI * 0.5;
    this.mechanicHp = this.mechanicMaxHp;
    this.mechanicPinned = false;
    this.mechanicLimping = false;
    this.nearMechanicHelp = false;
    this.nearVehicleBay = false;
    this.shelfCollapseProgress = 0;
    this.shelfCollapsing = false;
    this.fastFoodHordeIds.clear();
    this.escortAmbushSpawned = false;
    this.mechanicAttackTimer = 0;
    this.worldEnv.fastFood.setShelfCollapse(0);
    this.worldEnv.fastFood.updateVisuals(false, this.elapsed);

    this.switchWorldZone('colon_interior');
    this.missionPhase = 'm3_briefing';

    this.colonInterior.boilerDoorPivot.rotation.y = -1.65;
    this.colonInterior.allyRig.root.visible = true;
    this.colonInterior.allyRig.root.position.set(
      COLON_ALLY_BASE_POS.x,
      COLON_ALLY_BASE_POS.y,
      COLON_ALLY_BASE_POS.z,
    );
    this.colonInterior.allyRig.root.rotation.y = -Math.PI * 0.55;
    if (this.exteriorMechanicRig) {
      this.exteriorMechanicRig.root.visible = false;
    }

    this.px = 24.4;
    this.py = 0;
    this.pz = 6.2;
    this.pvx = 0;
    this.pvy = 0;
    this.pvz = 0;
    this.pyaw = Math.PI * 0.5;
    this.camYaw = -Math.PI * 0.5;
    this.camPitch = this.cameraSettings.normalPitch;
    this.camDistCurrent = this.cameraSettings.normalDistance;
    this.camShoulderOffset = this.cameraSettings.normalShoulderOffset;
    this.camPivotHeight = this.cameraSettings.normalHeight;
    this.camera.fov = this.cameraSettings.normalFov;
    this.camera.updateProjectionMatrix();
    this.cameraPreviewActive = false;
    this.cameraPreviewAim = false;
    this.manualCameraCooldown = 0;
    this.recenterCamTimer = 0;
    this.grounded = true;
    this.jumpWindupTimer = 0;
    this.isCrouching = false;
    this.crouchFactor = 0;
    this.stance = 'idle';

    this.maxHp = this.difficulty === 'pilgrim' ? 125 : this.difficulty === 'warden' ? 100 : 85;
    if (preserveLoadout) {
      this.hp = Math.max(this.hp, Math.round(this.maxHp * 0.9));
      if (!this.hasBackpack) {
        this.unlockBackpack();
      }
      if (!this.unlockedWeapons.stick) this.unlockedWeapons.stick = true;
      if (!this.unlockedWeapons.bow) {
        this.unlockedWeapons.bow = true;
        this.arrows = Math.max(10, this.arrows);
      }
      if (!this.unlockedWeapons.pistol) {
        this.unlockedWeapons.pistol = true;
        this.pistolAmmo = Math.max(8, this.pistolAmmo);
        this.pistolReserveAmmo = Math.max(12, this.pistolReserveAmmo);
      }
      this.provisions = {
        chemicals: Math.max(1, this.provisions.chemicals),
        scrap: Math.max(1, this.provisions.scrap),
        powder: Math.max(1, this.provisions.powder),
      };
    } else {
      this.hp = this.maxHp;
      this.helmetArmor = 0;
      this.vestArmor = 35;
      this.unlockedWeapons = {
        stick: true,
        baton: false,
        bow: true,
        pistol: true,
        rifle: false,
      };
      this.weapon = 'pistol';
      this.arrows = 12;
      this.pistolAmmo = 8;
      this.pistolReserveAmmo = 16;
      this.rifleAmmo = 0;
      this.rifleReserveAmmo = 0;
      this.hasBackpack = true;
      this.inventory = Array.from({ length: 8 }, () => null);
      this.inventory[0] = { kind: 'bandage', count: 2 };
      this.inventory[1] = { kind: 'food', count: 1 };
      this.inventory[2] = { kind: 'molotov', count: 1 };
      this.inventory[3] = { kind: 'nail_bomb', count: 1 };
      this.selectedInventorySlot = 0;
      this.hudInventoryDirty = true;
      this.syncInventoryCounters();
      this.provisions = { chemicals: 1, scrap: 1, powder: 1 };
      this.distractionCounts = { bottle: 1, can: 1, brick: 1, decoy_rat: 0 };
      this.activeDistractionKind = 'bottle';
      this.score = 0;
      this.survivalTime = 0;
      this.kills = 0;
    }

    this.stamina = this.maxStamina;
    this.staminaExhausted = false;
    this.flareCharge = Math.max(60, this.flareCharge);
    this.invulnTimer = 0;
    this.strikeCooldown = 0;
    this.hurtFlashTimer = 0;
    this.damageSeq = 0;
    this.lastDamage = 0;
    this.recoilTimer = 0;
    this.recoilKickAmount = 0;
    this.camRecoilPitch = 0;
    this.camRecoilYaw = 0;
    this.fireBloom = 0;
    this.crosshairSpread = 0.24;
    this.meleeTimer = 0;
    this.throwAnimTimer = 0;
    this.playerHitAnimTimer = 0;
    this.cancelPendingThrowable(true);
    this.reloadTimer = 0;
    this.isAiming = false;
    this.muzzleFlashTimer = 0;
    this.muzzleFlashGroup.visible = false;
    this.muzzleFlashLight.intensity = 0;
    this.syncWeaponVisibility();
    this.syncArmorVisibility();
    this.resetPlayerPoseTransforms();

    this.nearWorkbench = false;
    this.nearExteriorExit = false;
    this.playerRig.root.position.set(this.px, this.py, this.pz);
    this.playerRig.root.rotation.y = this.pyaw;

    this.gameState = 'PLAYING';
    this.lastTimestamp = performance.now();
    this.requestPointerLockSafe();
    this.setRadioTransmission(
      'Sofía «Chispa» Méndez',
      'Ricardo, necesito alcohol, chatarra y pólvora para fabricar más Molotovs y granadas de clavos. En la esquina SE hay un Mc-Porteño 24H con suministros. Sal por la puerta principal.',
      9.0,
    );
    this.emitHud();
  }

  public continueToMission3() {
    this.startMission3(true);
  }

  public enterMission3Exterior() {
    if (this.gameState !== 'PLAYING' || this.storyMission !== 3) return;
    this.clearDynamicEntities();
    this.switchWorldZone('exterior_9_julio');
    this.missionPhase = 'm3_go_fastfood';
    this.colonUnlocked = false;
    this.worldEnv.updateColonBeacon(false, this.elapsed);

    this.px = COLON_ENTRANCE_X + 3.4;
    this.pz = COLON_ENTRANCE_Z + 4.4;
    this.py = groundHeightAt(this.px, this.pz);
    this.pvx = 0;
    this.pvy = 0;
    this.pvz = 0;
    this.pyaw = 0.35;
    this.camYaw = Math.PI + 0.35;
    this.grounded = true;
    this.nearWorkbench = false;
    this.nearExteriorExit = false;
    this.nearColonEntrance = false;
    this.nearMechanicHelp = false;

    this.worldEnv.harvestNodes.forEach((n) => {
      n.hp = n.maxHp;
      n.respawnTimer = 0;
      n.group.visible = true;
      n.group.scale.setScalar(1);
    });

    this.shelfCollapseProgress = 0;
    this.shelfCollapsing = false;
    this.mechanicPinned = false;
    this.mechanicLimping = false;
    this.escortAmbushSpawned = false;
    this.mechanicHp = this.mechanicMaxHp;
    this.mechanicPos = { x: FASTFOOD_MECHANIC_POS.x, z: FASTFOOD_MECHANIC_POS.z };
    this.mechanicYaw = -Math.PI * 0.5;
    this.worldEnv.fastFood.setShelfCollapse(0);
    this.worldEnv.fastFood.updateVisuals(true, this.elapsed);

    const ffGroundY = groundHeightAt(this.mechanicPos.x, this.mechanicPos.z);
    this.exteriorMechanicRig.root.visible = true;
    this.exteriorMechanicRig.beaconRing.visible = true;
    this.exteriorMechanicRig.root.position.set(this.mechanicPos.x, ffGroundY, this.mechanicPos.z);
    this.exteriorMechanicRig.root.rotation.y = this.mechanicYaw;

    // Spawn the cornered horde inside Mc-Porteño 24H
    this.fastFoodHordeIds.clear();
    const spawns = this.worldEnv.fastFood.hordeSpawns;
    this.fastFoodTotalSpawned = spawns.length;
    for (let i = 0; i < spawns.length; i++) {
      const sp = spawns[i];
      const spawned = this.spawnEnemyAt(
        sp.kind,
        sp.x,
        sp.z,
        undefined,
        groundHeightAt(sp.x, sp.z),
        sp.role === 'police' ? 'pistol' : null,
        sp.role,
      );
      this.fastFoodHordeIds.add(spawned.id);
    }

    // Spawn supplies inside the fast food restaurant for Chispa
    this.worldEnv.fastFood.supplySpots.forEach((spot) => {
      this.spawnPickup(spot.kind, spot.x, spot.z, false, groundHeightAt(spot.x, spot.z));
    });

    // Light street resistance along 9 de Julio
    this.spawnMissionPack(18.0, 2.0, ['runner', 'biter', 'spitter']);

    this.setRadioTransmission(
      'Sofía «Chispa» Méndez',
      'Dirígete al local de comida rápida Mc-Porteño 24H en la esquina sudeste. Trae los químicos, chatarra y pólvora.',
      8.5,
    );
    this.emitHud();
  }

  public helpPinnedMechanic() {
    if (
      this.gameState !== 'PLAYING' ||
      this.storyMission !== 3 ||
      this.missionPhase !== 'm3_help_mechanic' ||
      !this.nearMechanicHelp
    ) {
      return;
    }
    this.mechanicPinned = false;
    this.mechanicLimping = true;
    this.nearMechanicHelp = false;
    this.mechanicHp = Math.max(65, Math.min(this.mechanicMaxHp, this.mechanicHp + 35));
    // Lift the fallen metal shelving partially aside
    this.worldEnv.fastFood.setShelfCollapse(0.56);
    this.shakeTrauma = Math.min(1, this.shakeTrauma + 0.25);
    this.audio.playStoke();
    const my = groundHeightAt(this.mechanicPos.x, this.mechanicPos.z);
    this.spawnBurst(this.mechanicPos.x, my + 0.9, this.mechanicPos.z, 18, 0.95, 0.78, 0.35, 6.2);

    this.missionPhase = 'm3_escort_colon';
    this.colonUnlocked = true;
    this.worldEnv.updateColonBeacon(true, this.elapsed);

    if (!this.escortAmbushSpawned) {
      this.escortAmbushSpawned = true;
      this.spawnMissionPack(18.5, 10.5, [
        'runner',
        { kind: 'stalker', enemyRole: 'police', carriedGear: { baton: true, revolver: true } },
      ]);
      this.spawnMissionPack(-5.5, -12.0, ['biter', 'spitter']);
    }

    this.setInventoryNotice('¡Mateo liberado! Escóltalo rengo de regreso al Teatro Colón', 3.6);
    this.setRadioTransmission(
      'Mateo (Sobreviviente)',
      '¡Gracias por sacarme de ahí! Soy Mateo, mecánico. Con la pierna golpeada camino lento, pero si me cubres llegamos al Teatro Colón.',
      9.0,
    );
    this.emitHud();
  }

  public repairVehicleModule(moduleId: VehicleModuleId): { ok: boolean; message: string } {
    if (!this.vehicleBayUnlocked || !this.mechanicRescued) {
      return { ok: false, message: 'Aún no rescataste al mecánico Mateo.' };
    }
    if (this.vehicleState[moduleId]) {
      return { ok: false, message: 'Ese módulo ya está instalado en La Porteña.' };
    }
    const costs: Record<VehicleModuleId, Partial<BaseProvisions>> = {
      engine: { scrap: 2, chemicals: 1 },
      tires: { scrap: 2, chemicals: 1 },
      armor: { scrap: 3, powder: 1 },
      fuel: { scrap: 1, chemicals: 2, powder: 2 },
    };
    const cost = costs[moduleId];
    if (
      this.provisions.chemicals < (cost.chemicals ?? 0) ||
      this.provisions.scrap < (cost.scrap ?? 0) ||
      this.provisions.powder < (cost.powder ?? 0)
    ) {
      return { ok: false, message: 'Faltan suministros para completar esta reparación.' };
    }

    this.provisions = {
      chemicals: this.provisions.chemicals - (cost.chemicals ?? 0),
      scrap: this.provisions.scrap - (cost.scrap ?? 0),
      powder: this.provisions.powder - (cost.powder ?? 0),
    };
    this.vehicleState = {
      ...this.vehicleState,
      [moduleId]: true,
    };
    this.score += 180;
    this.audio.playStoke();
    this.spawnBurst(
      COLON_VEHICLE_BAY_POS.x,
      COLON_VEHICLE_BAY_POS.y + 1.25,
      COLON_VEHICLE_BAY_POS.z,
      18,
      0.95,
      0.78,
      0.28,
      6.5,
    );

    const labels: Record<VehicleModuleId, string> = {
      engine: 'Motor V8 Diésel restaurado por Mateo',
      tires: 'Neumáticos Todoterreno reforzados instalados',
      armor: 'Blindaje de acero y ariete frontal soldados',
      fuel: 'Tanques auxiliares cargados para largo alcance',
    };
    const msg = labels[moduleId];
    this.setInventoryNotice(msg, 3.0);
    if (this.vehicleState.engine && this.vehicleState.tires) {
      this.setRadioTransmission(
        'Mateo (Mecánico)',
        '¡Motor y ruedas listos! La camioneta ya puede salir del Colón y hacer desplazamientos rápidos por Buenos Aires.',
        7.5,
      );
    }
    this.emitHud();
    return { ok: true, message: msg };
  }

  public fastTravelWithVehicle(dest: FastTravelDestinationId) {
    if (
      !this.vehicleBayUnlocked ||
      !this.vehicleState.engine ||
      !this.vehicleState.tires ||
      this.gameState !== 'PLAYING'
    ) {
      this.setInventoryNotice('Necesitas reparar Motor y Neumáticos antes de desplegar el vehículo.', 2.8);
      return;
    }
    this.travelToExterior9Julio();
    const coords: Record<FastTravelDestinationId, { x: number; z: number; label: string }> = {
      colon_door: {
        x: COLON_ENTRANCE_X + 3.4,
        z: COLON_ENTRANCE_Z + 4.4,
        label: 'Escalinata del Teatro Colón',
      },
      obelisco: {
        x: 6.5,
        z: 10.5,
        label: 'Plaza de la República (Obelisco)',
      },
      fastfood_corner: {
        x: 34.5,
        z: 18.2,
        label: 'Esquina Comercial Mc-Porteño 24H',
      },
    };
    const target = coords[dest];
    this.px = target.x;
    this.pz = target.z;
    this.py = groundHeightAt(this.px, this.pz);
    this.playerRig.root.position.set(this.px, this.py, this.pz);
    if (this.vehicleState.armor) {
      this.vestArmor = Math.min(this.vestMaxArmor, Math.max(this.vestArmor, 60));
      this.syncArmorVisibility();
    }
    if (this.vehicleState.fuel) {
      this.flareCharge = 100;
    }
    this.audio.playStoke();
    this.spawnBurst(this.px, this.py + 0.8, this.pz, 16, 0.45, 0.82, 0.96, 5.5);
    this.setRadioTransmission(
      'Mateo (Mecánico)',
      `Despliegue rápido en camioneta blindada completado: ${target.label}.`,
      6.5,
    );
    this.emitHud();
  }

  private damageMechanic(amount: number) {
    if (
      this.gameState !== 'PLAYING' ||
      this.storyMission !== 3 ||
      !this.exteriorMechanicRig.root.visible ||
      this.mechanicHp <= 0
    ) {
      return;
    }
    this.mechanicHp = Math.max(0, this.mechanicHp - amount);
    const my = groundHeightAt(this.mechanicPos.x, this.mechanicPos.z);
    this.spawnBloodSpray(
      this.mechanicPos.x,
      my + 1.0,
      this.mechanicPos.z,
      0,
      0.4,
      0,
      10,
      4.5,
      0.9,
      0.3,
      false,
    );
    if (this.mechanicHp <= 0) {
      this.setInventoryNotice('¡Mateo no resistió el ataque!', 4.0);
      this.invulnTimer = 0;
      this.hp = 0;
      this.hurtPlayer(999);
      return;
    }
    if (this.exteriorMechanicRig.character.hasAction('hit')) {
      this.exteriorMechanicRig.character.setAction('hit', {
        fadeSec: 0.08,
        timeScale: 1.05,
        forceRestart: true,
        oneShot: true,
      });
    }
    this.emitHud();
  }

  private updateMission3(dt: number) {
    if (
      this.gameState !== 'PLAYING' ||
      this.isTutorialMode ||
      this.storyMission !== 3 ||
      this.activeZone !== 'exterior_9_julio'
    ) {
      return;
    }

    const insideFastFood =
      this.px >= FASTFOOD_INTERIOR_BOUNDS.minX - 0.8 &&
      this.px <= FASTFOOD_INTERIOR_BOUNDS.maxX + 0.6 &&
      this.pz >= FASTFOOD_INTERIOR_BOUNDS.minZ - 0.6 &&
      this.pz <= FASTFOOD_INTERIOR_BOUNDS.maxZ + 0.6;

    // Step 1 -> Step 2: Entering Mc-Porteño or engaging the fast-food horde triggers the rescue defense
    if (this.missionPhase === 'm3_go_fastfood') {
      if (insideFastFood || this.fastFoodHordeIds.size < this.fastFoodTotalSpawned) {
        this.missionPhase = 'm3_defend_fastfood';
        this.worldEnv.fastFood.updateVisuals(false, this.elapsed);
        for (let i = 0; i < this.enemies.length; i++) {
          const e = this.enemies[i];
          if (this.fastFoodHordeIds.has(e.id)) {
            e.state = 'chase';
            e.provoked = true;
            e.aggroTimer = 10.0;
          }
        }
        this.setRadioTransmission(
          'Mateo (Sobreviviente)',
          '¡Por aquí atrás, en la cocina! ¡Ayúdame a limpiar estos infectados antes de que me rodeen!',
          7.5,
        );
        this.emitHud();
      }
    }

    // Animate heavy metal shelf collapse onto Mateo's leg during the climax of the kitchen brawl
    if (this.shelfCollapsing && this.shelfCollapseProgress < 1) {
      this.shelfCollapseProgress = Math.min(1, this.shelfCollapseProgress + dt / 0.55);
      this.worldEnv.fastFood.setShelfCollapse(this.shelfCollapseProgress);
      if (this.shelfCollapseProgress >= 1) {
        this.shelfCollapsing = false;
        this.mechanicPinned = true;
      }
    }

    if (this.missionPhase === 'm3_defend_fastfood') {
      // Trigger the collapsing heavy shelving unit when <= 2 horde zombies remain
      if (this.fastFoodHordeIds.size <= 2 && !this.shelfCollapsing && !this.mechanicPinned) {
        this.shelfCollapsing = true;
        this.shakeTrauma = Math.min(1, this.shakeTrauma + 0.55);
        this.audio.playShatter(true);
        const sy = groundHeightAt(FASTFOOD_CENTER_X + 7.2, FASTFOOD_CENTER_Z + 3.4);
        this.spawnBurst(
          FASTFOOD_CENTER_X + 7.2,
          sy + 1.1,
          FASTFOOD_CENTER_Z + 3.4,
          26,
          0.78,
          0.74,
          0.66,
          7.5,
        );
        this.setRadioTransmission(
          'Mateo (Sobreviviente)',
          '¡Cuidado! ¡La estantería metálica...! ¡Agh, me aplastó la pierna!',
          7.0,
        );
      }

      // Mateo defends himself with his wrench while still standing
      if (!this.mechanicPinned && !this.shelfCollapsing) {
        this.mechanicAttackTimer = Math.max(0, this.mechanicAttackTimer - dt);
        if (this.mechanicAttackTimer <= 0) {
          let nearest: EnemyEntity | null = null;
          let bestD = 2.6;
          for (let i = 0; i < this.enemies.length; i++) {
            const e = this.enemies[i];
            if (!this.fastFoodHordeIds.has(e.id)) continue;
            const d = Math.hypot(e.x - this.mechanicPos.x, e.z - this.mechanicPos.z);
            if (d < bestD) {
              bestD = d;
              nearest = e;
            }
          }
          if (nearest) {
            this.mechanicAttackTimer = 1.05;
            this.mechanicYaw = Math.atan2(
              nearest.x - this.mechanicPos.x,
              nearest.z - this.mechanicPos.z,
            );
            this.damageEnemy(
              nearest,
              10,
              Math.sin(this.mechanicYaw) * 4.5,
              Math.cos(this.mechanicYaw) * 4.5,
              'torso',
              { x: nearest.x, y: nearest.y + 0.9, z: nearest.z },
            );
          }
        }
      }

      if (this.fastFoodHordeIds.size === 0 && this.mechanicPinned) {
        this.missionPhase = 'm3_help_mechanic';
        this.setRadioTransmission(
          'Ricardo López',
          'Zona despejada. ¡Aguanta ahí, chico, ya voy a levantar esa estantería para sacarte!',
          7.5,
        );
        this.emitHud();
      }
    }

    // Determine Mateo proximity prompt during m3_help_mechanic
    const distToMech = Math.hypot(this.px - this.mechanicPos.x, this.pz - this.mechanicPos.z);
    this.nearMechanicHelp =
      this.missionPhase === 'm3_help_mechanic' && distToMech <= 3.8;

    // Step 4: Escort limping Mateo safely back to Teatro Colón
    let animMode: MechanicAnimMode = 'fighting';
    if (this.missionPhase === 'm3_help_mechanic' || this.mechanicPinned || this.shelfCollapsing) {
      animMode = 'pinned';
    } else if (this.missionPhase === 'm3_escort_colon') {
      // If Mateo is inside Mc-Porteño and Ricardo already exited, guide Mateo through the doorway first
      let targetX = this.px;
      let targetZ = this.pz;
      if (this.mechanicPos.x > FASTFOOD_INTERIOR_BOUNDS.minX + 0.4 && this.px < FASTFOOD_ENTRANCE_X - 0.6) {
        targetX = FASTFOOD_ENTRANCE_X - 1.4;
        targetZ = FASTFOOD_ENTRANCE_Z;
      }
      const dx = targetX - this.mechanicPos.x;
      const dz = targetZ - this.mechanicPos.z;
      const distTarget = Math.hypot(dx, dz);
      const stopDist = targetX === this.px && targetZ === this.pz ? 2.25 : 0.4;
      if (distTarget > stopDist) {
        const limpSpeed = 2.95;
        const step = Math.min(distTarget - stopDist, limpSpeed * dt);
        this.mechanicPos.x += (dx / distTarget) * step;
        this.mechanicPos.z += (dz / distTarget) * step;
        this.mechanicYaw = Math.atan2(dx, dz);
        animMode = 'limping_walk';
      } else {
        this.mechanicYaw = Math.atan2(this.px - this.mechanicPos.x, this.pz - this.mechanicPos.z);
        animMode = 'limping_idle';
      }

      const my = groundHeightAt(this.mechanicPos.x, this.mechanicPos.z);
      const resolvedMech = this.resolveExteriorCollisions(
        this.mechanicPos.x,
        my,
        this.mechanicPos.z,
        0.48,
        true,
      );
      this.mechanicPos.x = resolvedMech.x;
      this.mechanicPos.z = resolvedMech.z;

      const pColonDist = Math.hypot(this.px - COLON_ENTRANCE_X, this.pz - COLON_ENTRANCE_Z);
      const mColonDist = Math.hypot(
        this.mechanicPos.x - COLON_ENTRANCE_X,
        this.mechanicPos.z - COLON_ENTRANCE_Z,
      );
      if (pColonDist <= COLON_SAFE_RADIUS + 1.5 && mColonDist <= 9.5) {
        this.completeMission3();
        return;
      }
    }

    if (this.exteriorMechanicRig.root.visible) {
      const mGround = groundHeightAt(this.mechanicPos.x, this.mechanicPos.z);
      this.exteriorMechanicRig.root.position.set(this.mechanicPos.x, mGround, this.mechanicPos.z);
      this.exteriorMechanicRig.root.rotation.y = this.mechanicYaw;
      this.exteriorMechanicRig.beaconRing.visible =
        this.missionPhase === 'm3_help_mechanic' || this.missionPhase === 'm3_escort_colon';
      this.exteriorMechanicRig.beaconMat.color.setHex(
        this.missionPhase === 'm3_help_mechanic' ? 0xfacc15 : 0x22d3ee,
      );
      animateMechanicNpc(this.exteriorMechanicRig, this.elapsed, animMode, dt);

      if (!this.mechanicPrevPos.initialized) {
        this.mechanicPrevPos.x = this.mechanicPos.x;
        this.mechanicPrevPos.z = this.mechanicPos.z;
        this.mechanicPrevPos.initialized = true;
      }
      const mStepDist = Math.hypot(
        this.mechanicPos.x - this.mechanicPrevPos.x,
        this.mechanicPos.z - this.mechanicPrevPos.z,
      );
      this.mechanicPrevPos.x = this.mechanicPos.x;
      this.mechanicPrevPos.z = this.mechanicPos.z;
      if (animMode === 'limping_walk' && mStepDist > 0.002) {
        this.mechanicFootstepDistAccum += mStepDist;
        if (this.mechanicFootstepDistAccum >= 0.92) {
          this.mechanicFootstepDistAccum %= 0.92;
          this.mechanicFootstepLeft = !this.mechanicFootstepLeft;
          const mSurf = this.getFootstepSurfaceAt(this.mechanicPos.x, mGround, this.mechanicPos.z);
          this.triggerActorFootstepVisual(
            this.mechanicPos.x,
            mGround,
            this.mechanicPos.z,
            this.mechanicYaw,
            this.mechanicFootstepLeft,
            mSurf,
            'walk',
            this.mechanicShoeStain,
          );
          if (Math.hypot(this.mechanicPos.x - this.px, this.mechanicPos.z - this.pz) <= 14) {
            this.audio.playFootstep('walk', mSurf, this.mechanicFootstepLeft, 0.58);
          }
        }
      } else {
        this.mechanicFootstepDistAccum = 0;
      }
    }
  }

  private completeMission3() {
    if (this.gameState !== 'PLAYING' || this.storyMission !== 3) return;
    this.score += 3500;
    this.mission3Unlocked = true;
    this.mechanicRescued = true;
    this.vehicleBayUnlocked = true;
    this.mechanicLimping = false;
    this.nearMechanicHelp = false;
    this.missionPhase = 'base_free_roam';
    this.provisions = {
      chemicals: this.provisions.chemicals + 2,
      scrap: this.provisions.scrap + 3,
      powder: this.provisions.powder + 2,
    };
    if (this.exteriorMechanicRig) {
      this.exteriorMechanicRig.root.visible = false;
    }
    this.worldEnv.fastFood.updateVisuals(false, this.elapsed);
    try {
      localStorage.setItem(MISSION3_UNLOCKED_STORAGE_KEY, '1');
    } catch {
      // Ignore storage write errors
    }
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      try {
        localStorage.setItem(BEST_SCORE_STORAGE_KEY, String(this.bestScore));
      } catch {
        // Ignore storage write errors
      }
    }
    this.gameState = 'MISSION_COMPLETE';
    this.missionCompleteTimer = 0;
    this.isAiming = false;
    this.reloadTimer = 0;
    this.cancelPendingThrowable(true);
    this.muzzleFlashGroup.visible = false;
    this.muzzleFlashLight.intensity = 0;
    this.heldKeys.clear();
    this.clearVirtualControls();
    this.exitPointerLockSafe();
    this.audio.playStoke();
    this.spawnBurst(
      COLON_ENTRANCE_X,
      groundHeightAt(COLON_ENTRANCE_X, COLON_ENTRANCE_Z) + 1.4,
      COLON_ENTRANCE_Z,
      28,
      0.22,
      0.92,
      0.78,
      9.0,
    );
    this.emitHud();
  }

  public travelToExterior9Julio() {
    if (!this.baseUnlocked || this.gameState !== 'PLAYING') return;
    if (this.storyMission === 3 && this.missionPhase === 'm3_briefing') {
      this.enterMission3Exterior();
      return;
    }
    this.clearDynamicEntities();
    this.switchWorldZone('exterior_9_julio');
    this.missionPhase = 'scavenge_9_julio';
    this.colonUnlocked = true;
    this.worldEnv.updateColonBeacon(true, this.elapsed);
    this.worldEnv.fastFood.updateVisuals(false, this.elapsed);

    this.px = COLON_ENTRANCE_X + 3.4;
    this.pz = COLON_ENTRANCE_Z + 4.4;
    this.py = groundHeightAt(this.px, this.pz);
    this.pvx = 0;
    this.pvy = 0;
    this.pvz = 0;
    this.pyaw = 0.25;
    this.camYaw = Math.PI + 0.25;
    this.grounded = true;
    this.nearWorkbench = false;
    this.nearExteriorExit = false;
    this.nearColonEntrance = false;
    this.nearVehicleBay = false;

    this.worldEnv.harvestNodes.forEach((n) => {
      n.hp = n.maxHp;
      n.respawnTimer = 0;
      n.group.visible = true;
      n.group.scale.setScalar(1);
    });

    this.spawnMissionPack(12.5, -14.0, [
      { kind: 'stalker', enemyRole: 'police', carriedGear: { baton: true, revolver: true } },
      'runner',
      'spitter',
    ]);
    this.spawnMissionPack(-14.5, -8.5, [
      { kind: 'stalker', enemyRole: 'gendarme', carriedGear: { rifle: true, rifleMags: 1 } },
      'spitter',
      {
        kind: 'brute',
        enemyRole: 'gendarme_heavy',
        carriedGear: { helmet: true, vest: true, rifleMags: 2 },
      },
    ]);
    this.spawnMissionPack(8.0, 14.0, [
      { kind: 'stalker', enemyRole: 'gendarme', carriedGear: { rifleMags: 2 } },
      'biter',
      'spitter',
      'stalker',
    ]);

    const scavengeSpots: Array<{ kind: LootKind; x: number; z: number }> = [
      { kind: 'chemicals', x: -16.5, z: -18.5 },
      { kind: 'chemicals', x: 15.2, z: -16.0 },
      { kind: 'chemicals', x: -6.5, z: 9.2 },
      { kind: 'scrap', x: 16.5, z: 4.5 },
      { kind: 'scrap', x: -18.0, z: 2.5 },
      { kind: 'scrap', x: 5.5, z: -22.0 },
      { kind: 'powder', x: -4.2, z: -14.8 },
      { kind: 'powder', x: 18.8, z: 14.2 },
      { kind: 'powder', x: -16.2, z: 15.6 },
      { kind: 'fal_ammo', x: 0.4, z: -5.4 },
      { kind: 'pistol_ammo', x: -7.5, z: -4.2 },
      { kind: 'bandage', x: 6.2, z: 6.8 },
      { kind: 'food', x: -21.0, z: -5.5 },
      { kind: 'bottle', x: 8.5, z: -8.0 },
      { kind: 'can', x: -9.5, z: -11.5 },
      { kind: 'brick', x: 13.0, z: 10.5 },
      { kind: 'bottle', x: -13.5, z: 9.0 },
      { kind: 'can', x: 2.5, z: -19.5 },
      { kind: 'brick', x: -3.5, z: 16.5 },
      // Provisiones en calles transversales y paralelas expandidas (3N/3S/2E/2W)
      { kind: 'chemicals', x: -70.5, z: -40.0 },
      { kind: 'scrap', x: 70.5, z: -40.0 },
      { kind: 'powder', x: -70.5, z: 40.0 },
      { kind: 'chemicals', x: 70.5, z: 40.0 },
      { kind: 'scrap', x: -24.0, z: -78.0 },
      { kind: 'powder', x: 24.0, z: -78.0 },
      { kind: 'chemicals', x: -24.0, z: 78.0 },
      { kind: 'scrap', x: 24.0, z: 78.0 },
      { kind: 'fal_ammo', x: 0.0, z: -78.0 },
      { kind: 'pistol_ammo', x: 0.0, z: 78.0 },
      { kind: 'bandage', x: -70.5, z: 0.0 },
      { kind: 'food', x: 70.5, z: 0.0 },
    ];
    scavengeSpots.forEach((s) => this.spawnPickup(s.kind, s.x, s.z, false));

    this.setRadioTransmission(
      'Sofía Méndez',
      'Saliste a la 9 de Julio. Recolecta químicos, chatarra y pólvora. Cuando quieras volver al taller, regresa a la escalinata del Colón.',
      7.5,
    );
    this.emitHud();
  }

  public returnToColonBase() {
    if (!this.baseUnlocked || this.gameState !== 'PLAYING') return;
    this.clearDynamicEntities();
    this.switchWorldZone('colon_interior');
    this.missionPhase = 'base_free_roam';
    this.colonInterior.boilerDoorPivot.rotation.y = -1.65;
    this.colonInterior.allyRig.root.visible = true;
    this.colonInterior.allyRig.root.position.set(
      COLON_ALLY_BASE_POS.x,
      COLON_ALLY_BASE_POS.y,
      COLON_ALLY_BASE_POS.z,
    );
    this.colonInterior.allyRig.root.rotation.y = -Math.PI * 0.55;

    this.px = COLON_INTERIOR_SPAWN.x;
    this.py = COLON_INTERIOR_SPAWN.y;
    this.pz = COLON_INTERIOR_SPAWN.z;
    this.pvx = 0;
    this.pvy = 0;
    this.pvz = 0;
    this.pyaw = Math.PI;
    this.camYaw = 0;
    this.grounded = true;
    this.nearWorkbench = false;
    this.nearExteriorExit = false;
    this.nearColonEntrance = false;
    this.nearVehicleBay = false;

    this.setRadioTransmission(
      this.vehicleBayUnlocked ? 'Mateo (Mecánico)' : 'Sofía Méndez',
      this.vehicleBayUnlocked
        ? 'De vuelta en el Teatro Colón. Pasa por la Mesa Química o el Taller Mecánico para mejorar la camioneta.'
        : 'De vuelta en el Teatro Colón. Acércate a la Mesa Química en la Sala Dorada para fabricar explosivos.',
      6.5,
    );
    this.emitHud();
  }

  public craftAtBase(recipeId: BaseCraftRecipeId): { ok: boolean; message: string } {
    if (!this.allyRescued || !this.baseUnlocked) {
      return { ok: false, message: 'Aún no rescataste a Sofía Méndez.' };
    }
    const costs: Record<BaseCraftRecipeId, Partial<BaseProvisions>> = {
      molotov: { chemicals: 2, powder: 1 },
      nail_bomb: { scrap: 2, powder: 1 },
      bandage: { chemicals: 2 },
      fal_ammo: { scrap: 2, powder: 2 },
    };
    const cost = costs[recipeId];
    if (
      this.provisions.chemicals < (cost.chemicals ?? 0) ||
      this.provisions.scrap < (cost.scrap ?? 0) ||
      this.provisions.powder < (cost.powder ?? 0)
    ) {
      return { ok: false, message: 'Faltan provisiones para esa receta.' };
    }

    if (recipeId === 'molotov' || recipeId === 'nail_bomb' || recipeId === 'bandage') {
      if (!this.hasBackpack) {
        this.unlockBackpack();
      }
      if (!this.tryAddItemToInventory(recipeId, 1)) {
        return { ok: false, message: 'Mochila llena (8/8). Haz espacio primero.' };
      }
    } else if (recipeId === 'fal_ammo') {
      this.rifleReserveAmmo += 20;
    }

    this.provisions = {
      chemicals: this.provisions.chemicals - (cost.chemicals ?? 0),
      scrap: this.provisions.scrap - (cost.scrap ?? 0),
      powder: this.provisions.powder - (cost.powder ?? 0),
    };
    this.score += 75;
    this.audio.playStoke();
    this.spawnBurst(
      COLON_WORKBENCH_POS.x,
      COLON_WORKBENCH_POS.y + 1.15,
      COLON_WORKBENCH_POS.z,
      14,
      0.22,
      0.92,
      0.65,
      5.5,
    );
    const labelMap: Record<BaseCraftRecipeId, string> = {
      molotov: '+1 Bomba Molotov fabricada por Sofía',
      nail_bomb: '+1 Bomba de Clavos fabricada por Sofía',
      bandage: '+1 Vendaje estéril preparado',
      fal_ammo: '+20 cartuchos 7.62mm para el FAL',
    };
    const msg = labelMap[recipeId];
    this.setInventoryNotice(msg, 2.5);
    this.emitHud();
    return { ok: true, message: msg };
  }

  public beginThrowableAction(kind: ThrowableKind, preferredSlotIndex?: number) {
    this.audio.unlock();
    if (this.gameState !== 'PLAYING' || this.editorMode) return;

    if (kind === 'molotov') {
      if (!this.hasBackpack) {
        this.setInventoryNotice('Necesitas la Mochila para guardar y lanzar Bombas Molotov', 2.6);
        this.emitHud();
        return;
      }
      if (this.getInventoryCount('molotov') <= 0) {
        if (this.equippedThrowable === 'molotov') this.equippedThrowable = null;
        this.cancelPendingThrowable(true);
        this.setInventoryNotice('Sin Bombas Molotov en la mochila', 2.0);
        this.emitHud();
        return;
      }
      this.equippedThrowable = 'molotov';
      this.nailBombLit = false;
      // Acción 1: al presionar una vez, enciende la mecha de la Molotov
      if (!this.molotovLit) {
        this.molotovLit = true;
        this.aimingThrowable = null;
        this.syncWeaponVisibility();
        this.audio.playStoke();
        this.setInventoryNotice(
          'Mecha encendida — Mantén pulsado para apuntar y suelta para lanzar',
          2.5,
        );
        this.emitHud();
        return;
      }
      // Acción 2: manteniendo apretado apunta; al soltar lanza
      this.aimingThrowable = 'molotov';
      this.aimingThrowableSlot = preferredSlotIndex;
      this.syncWeaponVisibility();
      this.updateThrowableArcPreview();
      this.emitHud();
      return;
    }

    if (kind === 'nail_bomb') {
      if (!this.hasBackpack) {
        this.setInventoryNotice('Necesitas la Mochila para guardar y lanzar Bombas de Clavos', 2.6);
        this.emitHud();
        return;
      }
      if (this.getInventoryCount('nail_bomb') <= 0) {
        if (this.equippedThrowable === 'nail_bomb') this.equippedThrowable = null;
        this.cancelPendingThrowable(true);
        this.setInventoryNotice('Sin Bombas de Clavos en la mochila', 2.0);
        this.emitHud();
        return;
      }
      this.equippedThrowable = 'nail_bomb';
      this.molotovLit = false;
      // Acción 1: al presionar una vez, enciende la mecha de la Bomba de Clavos
      if (!this.nailBombLit) {
        this.nailBombLit = true;
        this.aimingThrowable = null;
        this.syncWeaponVisibility();
        this.audio.playStoke();
        this.setInventoryNotice(
          'Mecha encendida — Mantén pulsado para apuntar y suelta para lanzar',
          2.5,
        );
        this.emitHud();
        return;
      }
      // Acción 2: manteniendo apretado apunta; al soltar lanza
      this.aimingThrowable = 'nail_bomb';
      this.aimingThrowableSlot = preferredSlotIndex;
      this.syncWeaponVisibility();
      this.updateThrowableArcPreview();
      this.emitHud();
      return;
    }

    if (
      kind === 'bottle' ||
      kind === 'can' ||
      kind === 'brick' ||
      kind === 'decoy_rat'
    ) {
      if (this.distractionCounts[kind] <= 0) {
        if (kind === 'decoy_rat' && this.ratCount >= 1 && this.chapitasCount >= 1) {
          this.craftDecoyRat(false);
        }
      }
      if (this.distractionCounts[kind] <= 0) {
        const fallback = this.resolveAvailableDistractionKind();
        if (!fallback) {
          if (
            this.equippedThrowable === 'bottle' ||
            this.equippedThrowable === 'can' ||
            this.equippedThrowable === 'brick' ||
            this.equippedThrowable === 'decoy_rat'
          ) {
            this.equippedThrowable = null;
          }
          this.cancelPendingThrowable(false);
          this.setInventoryNotice(
            'Sin objetos de distracción (busca basura para armar ratas señuelo o recoge botellas)',
            2.4,
          );
          this.emitHud();
          return;
        }
        kind = fallback;
      }
      this.activeDistractionKind = kind;
      this.equippedThrowable = kind;
      this.molotovLit = false;
      this.nailBombLit = false;
      this.aimingThrowable = kind;
      this.aimingThrowableSlot = undefined;
      this.syncWeaponVisibility();
      this.updateThrowableArcPreview();
      this.emitHud();
      return;
    }

    // Granada Termobárica: mantener apretado para apuntar y soltar para lanzar
    if (this.flareCharge < 100) {
      this.setInventoryNotice(
        `Granada termobárica cargando (${Math.floor(this.flareCharge)}%)`,
        2.0,
      );
      this.emitHud();
      return;
    }
    this.aimingThrowable = 'grenade';
    this.aimingThrowableSlot = undefined;
    this.syncWeaponVisibility();
    this.updateThrowableArcPreview();
    this.emitHud();
  }

  public releaseThrowableAction(kind?: ThrowableKind) {
    if (!this.aimingThrowable) return;
    if (kind && this.aimingThrowable !== kind) return;
    const activeKind = this.aimingThrowable;
    const slot = this.aimingThrowableSlot;
    this.aimingThrowable = null;
    this.aimingThrowableSlot = undefined;
    this.throwArcLine.visible = false;
    this.throwLandingRing.visible = false;

    if (this.gameState !== 'PLAYING' || this.editorMode) {
      this.syncWeaponVisibility();
      this.emitHud();
      return;
    }

    this.updateThrowableArcPreview(activeKind);

    if (activeKind === 'molotov') {
      if (!this.hasBackpack || !this.consumeInventoryItem('molotov', slot)) {
        this.molotovLit = false;
        if (this.equippedThrowable === 'molotov') this.equippedThrowable = null;
        this.heldMolotovGroup.visible = false;
        this.syncWeaponVisibility();
        this.setInventoryNotice('Sin Bombas Molotov en la mochila', 2.0);
        this.emitHud();
        return;
      }
      this.molotovLit = false;
      this.heldMolotovGroup.visible = false;
      this.launchThrowable('molotov');
      if (this.getInventoryCount('molotov') <= 0 && this.equippedThrowable === 'molotov') {
        this.equippedThrowable = null;
      }
    } else if (activeKind === 'nail_bomb') {
      if (!this.hasBackpack || !this.consumeInventoryItem('nail_bomb', slot)) {
        this.nailBombLit = false;
        if (this.equippedThrowable === 'nail_bomb') this.equippedThrowable = null;
        this.heldNailBombGroup.visible = false;
        this.syncWeaponVisibility();
        this.setInventoryNotice('Sin Bombas de Clavos en la mochila', 2.0);
        this.emitHud();
        return;
      }
      this.nailBombLit = false;
      this.heldNailBombGroup.visible = false;
      this.launchThrowable('nail_bomb');
      if (this.getInventoryCount('nail_bomb') <= 0 && this.equippedThrowable === 'nail_bomb') {
        this.equippedThrowable = null;
      }
    } else if (
      activeKind === 'bottle' ||
      activeKind === 'can' ||
      activeKind === 'brick' ||
      activeKind === 'decoy_rat'
    ) {
      if (this.distractionCounts[activeKind] <= 0) {
        if (this.equippedThrowable === activeKind) this.equippedThrowable = null;
        this.syncWeaponVisibility();
        this.emitHud();
        return;
      }
      this.distractionCounts[activeKind] -= 1;
      this.launchThrowable(activeKind);
      if (this.distractionCounts[activeKind] <= 0) {
        const nextKind = this.resolveAvailableDistractionKind();
        if (nextKind) {
          this.activeDistractionKind = nextKind;
          if (this.equippedThrowable === activeKind) {
            this.equippedThrowable = nextKind;
          }
        } else if (this.equippedThrowable === activeKind) {
          this.equippedThrowable = null;
        }
      }
    } else if (activeKind === 'grenade') {
      if (this.flareCharge >= 100) {
        this.flareCharge = 0;
        this.launchThrowable('grenade');
      }
    }
    this.syncWeaponVisibility();
    this.emitHud();
  }

  public throwMolotov(preferredSlotIndex?: number) {
    this.beginThrowableAction('molotov', preferredSlotIndex);
  }

  public throwNailBomb(preferredSlotIndex?: number) {
    this.beginThrowableAction('nail_bomb', preferredSlotIndex);
  }

  private updateThrowableArcPreview(overrideKind?: ThrowableKind) {
    const kind = overrideKind ?? this.aimingThrowable;
    if (!kind) {
      this.throwArcLine.visible = false;
      this.throwLandingRing.visible = false;
      return;
    }

    const fwdX = Math.sin(this.pyaw);
    const fwdZ = Math.cos(this.pyaw);
    const rightX = -Math.cos(this.pyaw);
    const rightZ = Math.sin(this.pyaw);
    const startX = this.px + fwdX * 0.44 + rightX * 0.16;
    const startY = this.py + (1.52 - this.crouchFactor * 0.35);
    const startZ = this.pz + fwdZ * 0.44 + rightZ * 0.16;

    const dxAim = this.aimPoint.x - startX;
    const dzAim = this.aimPoint.z - startZ;
    const aimYaw =
      Math.hypot(dxAim, dzAim) > 0.15 ? Math.atan2(dxAim, dzAim) : this.camYaw + Math.PI;
    const dirX = Math.sin(aimYaw);
    const dirZ = Math.cos(aimYaw);

    const pitchDist = THREE.MathUtils.clamp(12.2 - this.camPitch * 18.5, 3.2, 21.0);
    const aimHorizontalDist = THREE.MathUtils.clamp(Math.hypot(dxAim, dzAim), 3.2, 21.0);
    const throwDist = THREE.MathUtils.lerp(pitchDist, aimHorizontalDist, 0.45);

    const targetX = startX + dirX * throwDist;
    const targetZ = startZ + dirZ * throwDist;
    const targetY = this.floorAt(targetX, targetZ, this.py) + 0.12;

    const flightTime = THREE.MathUtils.clamp(throwDist / 13.8, 0.3, 1.15);
    const gravity = 19.0;
    const vx = (targetX - startX) / flightTime;
    const vz = (targetZ - startZ) / flightTime;
    const vy = (targetY - startY + 0.5 * gravity * flightTime * flightTime) / flightTime;

    this.throwArcOrigin.set(startX, startY, startZ);
    this.throwArcVel.set(vx, vy, vz);
    this.throwArcLanding.set(targetX, targetY, targetZ);
    this.throwArcFlightTime = flightTime;

    if (!overrideKind) {
      const steps = 21;
      for (let i = 0; i <= steps; i++) {
        const t = (i / steps) * flightTime;
        const idx = i * 3;
        this.throwArcPositions[idx] = startX + vx * t;
        this.throwArcPositions[idx + 1] = startY + vy * t - 0.5 * gravity * t * t;
        this.throwArcPositions[idx + 2] = startZ + vz * t;
      }
      const attr = this.throwArcLine.geometry.getAttribute('position') as THREE.BufferAttribute;
      attr.needsUpdate = true;

      const colorHex =
        kind === 'molotov'
          ? 0xf97316
          : kind === 'nail_bomb'
            ? 0x38bdf8
            : kind === 'bottle'
              ? 0x34d399
              : kind === 'can'
                ? 0x67e8f9
                : kind === 'brick'
                  ? 0xfb923c
                  : 0xfbbf24;
      (this.throwArcLine.material as THREE.LineBasicMaterial).color.setHex(colorHex);
      (this.throwLandingRing.material as THREE.MeshBasicMaterial).color.setHex(colorHex);

      const previewRadius =
        kind === 'grenade'
          ? 9.0
          : kind === 'bottle'
            ? 2.2
            : kind === 'can' || kind === 'brick'
              ? 1.7
              : 1.5;
      this.throwLandingRing.scale.setScalar(previewRadius);
      this.throwLandingRing.position.set(targetX, targetY + 0.06, targetZ);
      this.throwArcLine.visible = true;
      this.throwLandingRing.visible = true;
    }
  }

  private launchThrowable(kind: ThrowableKind) {
    const throwClip = this.playerRig.clips?.['throw'];
    if (throwClip && this.playerRig.mixer) {
      const rawDur = Math.max(0.35, throwClip.getClip().duration || 0.88);
      const timeScale = THREE.MathUtils.clamp(rawDur / 0.62, 1.0, 2.0);
      this.playerRig.playClip?.('throw', 0.05, timeScale, true);
      const releaseTime = rawDur * 0.2;
      throwClip.time = releaseTime;
      throwClip.paused = false;
      this.throwAnimTotal = rawDur / timeScale;
      this.throwAnimTimer = Math.max(0.28, (rawDur - releaseTime) / timeScale);
    } else {
      this.throwAnimTotal = 0.34;
      this.throwAnimTimer = 0.34;
    }

    // Spawn thrown projectile directly from calibrated hand position if valid, else throwArcOrigin
    this.playerRig.root.updateMatrixWorld(true);
    let startX = this.throwArcOrigin.x;
    let startY = this.throwArcOrigin.y;
    let startZ = this.throwArcOrigin.z;
    if (this.playerRig.throwableMount) {
      this.playerRig.throwableMount.getWorldPosition(_vec3);
      if (Number.isFinite(_vec3.x) && Number.isFinite(_vec3.y) && Number.isFinite(_vec3.z)) {
        startX = _vec3.x;
        startY = _vec3.y;
        startZ = _vec3.z;
      }
    }
    const vx = this.throwArcVel.x;
    const vy = this.throwArcVel.y;
    const vz = this.throwArcVel.z;

    const tmpl =
      kind === 'molotov'
        ? (this.objectOverrideTemplates.get('loot_molotov') ?? null)
        : kind === 'nail_bomb'
          ? (this.objectOverrideTemplates.get('loot_nail_bomb') ?? null)
          : kind === 'bottle'
            ? (this.objectOverrideTemplates.get('loot_bottle') ?? null)
            : kind === 'can'
              ? (this.objectOverrideTemplates.get('loot_can') ?? null)
              : kind === 'brick'
                ? (this.objectOverrideTemplates.get('loot_brick') ?? null)
                : null;
    const built = buildThrownThrowableMesh(kind, tmpl);
    built.group.position.set(startX, startY, startZ);
    this.scene.add(built.group);

    this.thrownThrowables.push({
      kind,
      x: startX,
      y: startY,
      z: startZ,
      vx,
      vy,
      vz,
      age: 0,
      mesh: built.group,
      disposeMesh: built.dispose,
    });
    if (
      this.isTutorialMode &&
      (kind === 'bottle' || kind === 'can' || kind === 'brick' || kind === 'decoy_rat')
    ) {
      this.tutorialDistractionDone = true;
    }
    this.audio.playJump();
  }

  public useBandage(preferredSlotIndex?: number) {
    this.audio.unlock();
    if (this.gameState !== 'PLAYING' || this.bandages <= 0 || this.hp >= this.maxHp) return;
    if (this.hasBackpack) {
      if (!this.consumeInventoryItem('bandage', preferredSlotIndex)) return;
    } else {
      this.bandages -= 1;
    }
    this.hp = Math.min(this.maxHp, this.hp + 40);
    this.audio.playStoke();
    this.spawnBurst(this.px, this.py + 1.0, this.pz, 10, 0.25, 0.92, 0.45, 4.2);
    this.emitHud();
  }

  public useFood(preferredSlotIndex?: number) {
    this.audio.unlock();
    if (
      this.gameState !== 'PLAYING' ||
      this.food <= 0 ||
      (this.hp >= this.maxHp && this.campfireWarmth >= 98 && this.stamina >= 98)
    ) {
      return;
    }
    if (this.hasBackpack) {
      if (!this.consumeInventoryItem('food', preferredSlotIndex)) return;
    } else {
      this.food -= 1;
    }
    this.hp = Math.min(this.maxHp, this.hp + 25);
    this.stamina = Math.min(this.maxStamina, this.stamina + 35);
    this.staminaExhausted = false;
    this.campfireWarmth = Math.min(100, this.campfireWarmth + 28);
    this.audio.playPickup(this.combo);
    this.spawnBurst(this.px, this.py + 1.0, this.pz, 10, 0.96, 0.76, 0.24, 4.0);
    this.emitHud();
  }

  // --- MUNDO, SLOTS DE OBJETOS (.GLB), TEXTURAS, EDITOR 3D Y POSTPROCESADO ---

  public async uploadWorldPropGlb(category: WorldPropCategory, file: File): Promise<void> {
    this.modelError = null;
    try {
      const buffer = await file.arrayBuffer();
      const template = await parseGlbPropTemplate(buffer, category);
      if (this.disposed) {
        template.dispose();
        return;
      }
      const slotId = `prop_${category}_${Date.now()}_${Math.floor(Math.random() * 999)}`;
      this.propTemplates.set(slotId, template);
      this.propSlots = await guardarPropSlotCache(slotId, category, buffer, file.name);
      this.activePlacementSlotId = slotId;
      if (!this.isSoftwareGl && !this.disposed) {
        this.renderer.compile(this.scene, this.camera);
      }
      this.emitHud();
    } catch (err) {
      this.modelError =
        err instanceof Error ? `Objeto .glb inválido: ${err.message}` : 'Error al cargar objeto .glb.';
      this.emitHud();
    }
  }

  public async deleteWorldPropSlot(slotId: string): Promise<void> {
    this.propSlots = await eliminarPropSlotCache(slotId);
    const tmpl = this.propTemplates.get(slotId);
    tmpl?.dispose();
    this.propTemplates.delete(slotId);

    const remaining: PlacedWorldProp[] = [];
    for (let i = 0; i < this.placedProps.length; i++) {
      const p = this.placedProps[i];
      if (p.slotId === slotId) {
        this.removePlacedPropMesh(p.instanceId);
        if (this.selectedPropId === p.instanceId) this.selectedPropId = null;
      } else {
        remaining.push(p);
      }
    }
    this.placedProps = remaining;
    await guardarPlacedPropsCache(this.placedProps);
    if (this.activePlacementSlotId === slotId) {
      this.activePlacementSlotId = this.propSlots[0]?.id ?? null;
    }
    this.rebuildActiveColliders();
    this.emitHud();
  }

  public setActivePlacementSlot(slotId: string | null) {
    this.activePlacementSlotId = slotId;
    this.emitHud();
  }

  private getCampfirePos(): { x: number; z: number } {
    return getCampfireCoords(this.mapSettings.mapPreset);
  }

  private getPlayerSpawnPos(): { x: number; z: number } {
    return getPlayerSpawnCoords(this.mapSettings.mapPreset);
  }

  public setEditorMode(enabled: boolean) {
    this.editorMode = enabled;
    this.editorDragMode = 'none';
    this.worldEnv.editorGrid.visible = enabled;
    if (enabled) {
      this.cancelPendingThrowable(true);
      this.exitPointerLockSafe();
      this.heldKeys.clear();
      this.clearVirtualControls();
      this.editorTarget.set(this.px, this.py, this.pz);
      if (this.selectedPropId) {
        const sel = this.placedProps.find((p) => p.instanceId === this.selectedPropId);
        if (sel) this.syncSelectionRing(sel);
      } else {
        this.selectionRing.visible = false;
      }
    } else {
      this.selectionRing.visible = false;
    }
    this.emitHud();
  }

  public placeWorldPropNearPlayer(slotId: string) {
    const fwdX = Math.sin(this.pyaw);
    const fwdZ = Math.cos(this.pyaw);
    const isSandbox = this.mapSettings.mapPreset === 'custom_sandbox';
    const maxX = (isSandbox ? ARENA_PLAYABLE_RADIUS : ARENA_HALF_X) - 1.5;
    const maxZ = (isSandbox ? ARENA_PLAYABLE_RADIUS : ARENA_HALF_Z) - 1.5;
    const tx = THREE.MathUtils.clamp(this.px + fwdX * 3.8, -maxX, maxX);
    const tz = THREE.MathUtils.clamp(this.pz + fwdZ * 3.8, -maxZ, maxZ);
    this.placeWorldPropAt(slotId, tx, tz);
  }

  public placeWorldPropAt(slotId: string, x: number, z: number) {
    const slot = this.propSlots.find((s) => s.id === slotId);
    const tmpl = this.propTemplates.get(slotId);
    if (!slot || !tmpl) return;

    const catMeta = PROP_CATEGORIES.find((c) => c.id === slot.category);
    const instanceId = `inst_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
    let px = x;
    let pz = z;
    if (this.mapSettings.mapPreset === 'custom_sandbox') {
      const clampedR = Math.hypot(x, z);
      if (clampedR > ARENA_PLAYABLE_RADIUS + 10) {
        px = (x / clampedR) * (ARENA_PLAYABLE_RADIUS + 10);
        pz = (z / clampedR) * (ARENA_PLAYABLE_RADIUS + 10);
      }
    } else {
      px = THREE.MathUtils.clamp(x, -ARENA_HALF_X, ARENA_HALF_X);
      pz = THREE.MathUtils.clamp(z, -ARENA_HALF_Z, ARENA_HALF_Z);
    }

    const placed: PlacedWorldProp = {
      instanceId,
      slotId,
      category: slot.category,
      name: slot.name,
      x: Number(px.toFixed(2)),
      yOffset: 0,
      z: Number(pz.toFixed(2)),
      scale: 1,
      rotationY: 0,
      solid: catMeta ? catMeta.solidDefault : true,
    };
    this.placedProps = [...this.placedProps, placed];
    this.spawnPlacedPropMesh(placed);
    this.selectedPropId = instanceId;
    this.syncSelectionRing(placed);
    this.rebuildActiveColliders();
    void guardarPlacedPropsCache(this.placedProps);
    this.emitHud();
  }

  public duplicatePlacedProp(instanceId: string) {
    const src = this.placedProps.find((p) => p.instanceId === instanceId);
    if (!src) return;
    if (!this.propTemplates.has(src.slotId)) return;
    const nextId = `inst_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
    let nx = src.x + 1.5;
    let nz = src.z + 1.5;
    if (this.mapSettings.mapPreset === 'custom_sandbox') {
      const rad = Math.hypot(nx, nz);
      if (rad > ARENA_PLAYABLE_RADIUS + 10) {
        nx = (nx / rad) * (ARENA_PLAYABLE_RADIUS + 10);
        nz = (nz / rad) * (ARENA_PLAYABLE_RADIUS + 10);
      }
    } else {
      nx = THREE.MathUtils.clamp(nx, -ARENA_HALF_X, ARENA_HALF_X);
      nz = THREE.MathUtils.clamp(nz, -ARENA_HALF_Z, ARENA_HALF_Z);
    }
    const copy: PlacedWorldProp = {
      ...src,
      instanceId: nextId,
      x: Number(nx.toFixed(2)),
      z: Number(nz.toFixed(2)),
    };
    this.placedProps = [...this.placedProps, copy];
    this.spawnPlacedPropMesh(copy);
    this.selectedPropId = nextId;
    this.syncSelectionRing(copy);
    this.rebuildActiveColliders();
    void guardarPlacedPropsCache(this.placedProps);
    this.emitHud();
  }

  public selectPlacedProp(instanceId: string | null) {
    this.selectedPropId = instanceId;
    const found = instanceId ? this.placedProps.find((p) => p.instanceId === instanceId) : null;
    if (found) {
      this.syncSelectionRing(found);
      this.editorTarget.set(found.x, groundHeightAt(found.x, found.z), found.z);
    } else {
      this.selectionRing.visible = false;
    }
    this.emitHud();
  }

  public updatePlacedProp(instanceId: string, patch: Partial<PlacedWorldProp>) {
    const idx = this.placedProps.findIndex((p) => p.instanceId === instanceId);
    if (idx === -1) return;
    const prev = this.placedProps[idx];
    let slotNamePatch: Partial<PlacedWorldProp> = {};
    if (patch.slotId && patch.slotId !== prev.slotId) {
      const targetSlot = this.propSlots.find((s) => s.id === patch.slotId);
      if (targetSlot) {
        slotNamePatch = {
          category: targetSlot.category,
          name: targetSlot.name,
        };
      }
    }
    const next: PlacedWorldProp = {
      ...prev,
      ...patch,
      ...slotNamePatch,
      scale: THREE.MathUtils.clamp(patch.scale ?? prev.scale, 0.25, 5.0),
    };
    this.placedProps = this.placedProps.map((p, k) => (k === idx ? next : p));
    if (next.slotId !== prev.slotId) {
      this.spawnPlacedPropMesh(next);
    } else {
      const mesh = this.placedPropMeshes.get(instanceId);
      if (mesh) {
        mesh.position.set(next.x, groundHeightAt(next.x, next.z) + next.yOffset, next.z);
        mesh.scale.setScalar(next.scale);
        mesh.rotation.y = (next.rotationY * Math.PI) / 180;
      }
    }
    if (this.selectedPropId === instanceId) {
      this.syncSelectionRing(next);
    }
    this.rebuildActiveColliders();
    void guardarPlacedPropsCache(this.placedProps);
    this.emitHud();
  }

  public removePlacedProp(instanceId: string) {
    this.placedProps = this.placedProps.filter((p) => p.instanceId !== instanceId);
    this.removePlacedPropMesh(instanceId);
    if (this.selectedPropId === instanceId) {
      this.selectedPropId = null;
      this.selectionRing.visible = false;
    }
    this.rebuildActiveColliders();
    void guardarPlacedPropsCache(this.placedProps);
    this.emitHud();
  }

  public clearAllPlacedProps() {
    this.placedProps.forEach((p) => this.removePlacedPropMesh(p.instanceId));
    this.placedProps = [];
    this.selectedPropId = null;
    this.selectionRing.visible = false;
    this.rebuildActiveColliders();
    void guardarPlacedPropsCache([]);
    this.emitHud();
  }

  private spawnPlacedPropMesh(prop: PlacedWorldProp) {
    const tmpl = this.propTemplates.get(prop.slotId);
    if (!tmpl) return;
    this.removePlacedPropMesh(prop.instanceId);
    const group = instantiatePropFromTemplate(tmpl);
    group.userData.propInstanceId = prop.instanceId;
    group.traverse((child) => {
      child.userData.propInstanceId = prop.instanceId;
    });
    group.position.set(prop.x, groundHeightAt(prop.x, prop.z) + prop.yOffset, prop.z);
    group.scale.setScalar(prop.scale);
    group.rotation.y = (prop.rotationY * Math.PI) / 180;
    this.scene.add(group);
    this.placedPropMeshes.set(prop.instanceId, group);
  }

  private removePlacedPropMesh(instanceId: string) {
    const existing = this.placedPropMeshes.get(instanceId);
    if (existing) {
      this.scene.remove(existing);
      this.placedPropMeshes.delete(instanceId);
    }
  }

  private syncSelectionRing(prop: PlacedWorldProp) {
    const tmpl = this.propTemplates.get(prop.slotId);
    const r = Math.max(0.8, (tmpl?.baseRadius ?? 1.0) * prop.scale * 1.15);
    this.selectionRing.visible = this.editorMode;
    this.selectionRing.position.set(prop.x, groundHeightAt(prop.x, prop.z) + 0.08, prop.z);
    this.selectionRing.scale.setScalar(r);
  }

  private rebuildActiveColliders() {
    const isSandbox = this.mapSettings.mapPreset === 'custom_sandbox';
    const next: WorldCollider[] = [];
    if (!isSandbox) {
      for (let i = 0; i < this.worldEnv.baseColliders.length; i++) {
        const c = this.worldEnv.baseColliders[i];
        if (c.source === 'ruin' && !this.mapSettings.showDefaultRuins) continue;
        if (c.source === 'tree' && !this.mapSettings.showDefaultForest) continue;
        next.push(c);
      }
    }
    for (let i = 0; i < this.placedProps.length; i++) {
      const p = this.placedProps[i];
      if (!p.solid) continue;
      const tmpl = this.propTemplates.get(p.slotId);
      next.push({
        x: p.x,
        z: p.z,
        radius: Math.max(0.45, (tmpl?.baseRadius ?? 0.9) * p.scale),
        height: Math.max(0.8, (tmpl?.baseHeight ?? 2.0) * p.scale),
        source: 'prop',
      });
    }
    this.worldEnv.colliders = next;
    const nextBoxes = [];
    if (!isSandbox && this.worldEnv.baseBoxColliders) {
      for (let i = 0; i < this.worldEnv.baseBoxColliders.length; i++) {
        const b = this.worldEnv.baseBoxColliders[i];
        if (b.source === 'ruin' && !this.mapSettings.showDefaultRuins) continue;
        if (b.source === 'tree' && !this.mapSettings.showDefaultForest) continue;
        nextBoxes.push(b);
      }
    }
    this.worldEnv.boxColliders = nextBoxes;
  }

  public setMapSettings(patch: Partial<MapMaterialSettings>) {
    const prevRelief = this.mapSettings.terrainScale;
    const prevPreset = this.mapSettings.mapPreset;
    this.mapSettings = { ...this.mapSettings, ...patch };
    const presetChanged = this.mapSettings.mapPreset !== prevPreset;
    const reliefChanged = Math.abs(this.mapSettings.terrainScale - prevRelief) > 0.001;
    if (presetChanged || reliefChanged) {
      this.worldEnv.rebuildTerrainHeights(this.mapSettings.terrainScale, this.mapSettings.mapPreset);
      this.resetLooseRocks();
      this.resetLooseLightProps();
      const cf = this.getCampfirePos();
      const cfY = groundHeightAt(cf.x, cf.z);
      this.campfireVisuals.group.position.set(cf.x, cfY, cf.z);
      this.campfireLight.position.set(cf.x, cfY + 2.2, cf.z);

      if (presetChanged && this.gameState === 'TITLE_MENU') {
        const sp = this.getPlayerSpawnPos();
        this.px = sp.x;
        this.pz = sp.z;
        this.playerRig.root.position.x = sp.x;
        this.playerRig.root.position.z = sp.z;
        this.playerShadow.position.x = sp.x;
        this.playerShadow.position.z = sp.z;
      }

      const gy = groundHeightAt(this.px, this.pz);
      if (this.grounded) {
        this.py = gy;
        this.playerRig.root.position.y = gy;
        this.playerShadow.position.y = gy + 0.025;
      }
      this.placedProps.forEach((p) => {
        const m = this.placedPropMeshes.get(p.instanceId);
        if (m) m.position.y = groundHeightAt(p.x, p.z) + p.yOffset;
      });
      this.enemies.forEach((e) => {
        const ey = groundHeightAt(e.x, e.z);
        e.bundle.group.position.y = ey;
        e.shadow.position.y = ey + 0.025;
      });
      this.bloodDecals.forEach((d) => {
        if (d.active) {
          d.mesh.position.y = groundHeightAt(d.x, d.z);
        }
      });
      if (this.selectedPropId) {
        const sel = this.placedProps.find((p) => p.instanceId === this.selectedPropId);
        if (sel) this.syncSelectionRing(sel);
      }
    }
    this.applyMapSettingsVisuals();
    this.rebuildActiveColliders();
    this.updateDayNightAndFog(0);
    guardarMapSettingsLocal(this.mapSettings);
    this.emitHud();
  }

  private applyMapSettingsVisuals() {
    const isSandbox = this.mapSettings.mapPreset === 'custom_sandbox';
    this.worldEnv.citySurfaceObjects.forEach((o) => {
      o.visible = !isSandbox;
    });
    this.worldEnv.lampPoints.forEach((pt) => {
      pt.visible = !isSandbox;
    });
    this.worldEnv.ruinObjects.forEach((o) => {
      o.visible = !isSandbox && this.mapSettings.showDefaultRuins;
    });
    this.worldEnv.forestObjects.forEach((o) => {
      o.visible = !isSandbox && this.mapSettings.showDefaultForest;
    });

    const gMap = this.customGroundTex ?? (isSandbox ? this.simpleGroundTex : this.groundTex);
    gMap.repeat.set(this.mapSettings.groundRepeat, this.mapSettings.groundRepeat);
    gMap.needsUpdate = true;
    this.groundBumpTex.repeat.set(this.mapSettings.groundRepeat, this.mapSettings.groundRepeat);
    this.worldEnv.terrainMat.map = gMap;
    this.worldEnv.terrainMat.color.set(this.mapSettings.groundTint);
    this.worldEnv.terrainMat.roughness = this.mapSettings.groundRoughness;
    this.worldEnv.terrainMat.metalness = this.mapSettings.groundMetalness;
    this.worldEnv.terrainMat.needsUpdate = true;

    [this.worldEnv.barrierMat, this.worldEnv.rockMat].forEach((mat) => {
      if (this.customStoneTex) {
        mat.map = this.customStoneTex;
      } else {
        mat.map = this.stoneTex;
      }
      mat.roughness = this.mapSettings.stoneRoughness;
      mat.metalness = this.mapSettings.stoneMetalness;
      mat.color.set(this.mapSettings.stoneTint);
      mat.needsUpdate = true;
    });
    if (this.customStoneTex) {
      this.worldEnv.plazaMat.map = this.customStoneTex;
      this.worldEnv.pillarMat.map = this.customStoneTex;
    }
    this.worldEnv.plazaMat.roughness = this.mapSettings.stoneRoughness;
    this.worldEnv.plazaMat.needsUpdate = true;
    this.worldEnv.pillarMat.needsUpdate = true;

    const bMap = this.customBarkTex ?? this.barkTex;
    this.worldEnv.trunkMat.map = bMap;
    this.worldEnv.trunkMat.color.set(this.mapSettings.barkTint);
    this.worldEnv.trunkMat.roughness = this.mapSettings.barkRoughness;
    this.worldEnv.trunkMat.needsUpdate = true;
    this.worldEnv.crateMat.map = bMap;
    this.worldEnv.crateMat.needsUpdate = true;
  }

  public async loadCustomTextureFile(target: TextureTargetId, file: File): Promise<void> {
    this.modelError = null;
    try {
      const buffer = await file.arrayBuffer();
      await this.applyImportedTextureBuffer(target, buffer, file.name, file.type || 'image/png');
      await guardarTextureCache(target, buffer, file.name, file.type || 'image/png');
      if (target === 'ground') this.mapSettings.customGroundTexName = file.name;
      else if (target === 'stone') this.mapSettings.customStoneTexName = file.name;
      else this.mapSettings.customBarkTexName = file.name;
      guardarMapSettingsLocal(this.mapSettings);
      this.emitHud();
    } catch (err) {
      this.modelError =
        err instanceof Error ? `Textura inválida: ${err.message}` : 'No se pudo cargar la textura.';
      this.emitHud();
    }
  }

  public async resetCustomTexture(target: TextureTargetId): Promise<void> {
    await eliminarTextureCache(target);
    if (target === 'ground') {
      this.customGroundTex?.dispose();
      this.customGroundTex = null;
      this.mapSettings.customGroundTexName = null;
    } else if (target === 'stone') {
      this.customStoneTex?.dispose();
      this.customStoneTex = null;
      this.mapSettings.customStoneTexName = null;
    } else {
      this.customBarkTex?.dispose();
      this.customBarkTex = null;
      this.mapSettings.customBarkTexName = null;
    }
    this.applyMapSettingsVisuals();
    guardarMapSettingsLocal(this.mapSettings);
    this.emitHud();
  }

  private async applyImportedTextureBuffer(
    target: TextureTargetId,
    buffer: ArrayBuffer,
    fileName: string,
    mimeType: string,
  ): Promise<void> {
    const blob = new Blob([buffer], { type: mimeType || 'image/png' });
    const url = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('Imagen no compatible'));
        el.src = url;
      });
      const maxDim = this.isMobileHardware ? 768 : 1024;
      const srcW = img.naturalWidth || img.width || 512;
      const srcH = img.naturalHeight || img.height || 512;
      let tex: THREE.Texture;
      if (srcW > maxDim || srcH > maxDim) {
        const scale = maxDim / Math.max(srcW, srcH);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(srcW * scale));
        canvas.height = Math.max(1, Math.round(srcH * scale));
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          tex = new THREE.CanvasTexture(canvas);
        } else {
          tex = new THREE.Texture(img);
        }
      } else {
        tex = new THREE.Texture(img);
      }
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = Math.min(
        this.isMobileHardware ? 2 : 4,
        this.renderer.capabilities.getMaxAnisotropy(),
      );
      tex.needsUpdate = true;

      if (target === 'ground') {
        this.customGroundTex?.dispose();
        this.customGroundTex = tex;
        this.mapSettings.customGroundTexName = fileName;
      } else if (target === 'stone') {
        this.customStoneTex?.dispose();
        this.customStoneTex = tex;
        this.mapSettings.customStoneTexName = fileName;
      } else {
        this.customBarkTex?.dispose();
        this.customBarkTex = tex;
        this.mapSettings.customBarkTexName = fileName;
      }
      this.applyMapSettingsVisuals();
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  public setPostProcessSettings(patch: Partial<PostProcessSettings>) {
    this.postProcess = { ...this.postProcess, ...patch };
    this.applyPostProcessUniforms();
    guardarPostProcessLocal(this.postProcess);
    this.emitHud();
  }

  public applyPostProcessPreset(preset: PostProcessPreset) {
    this.postProcess = {
      ...this.postProcess,
      preset,
      ...POST_PROCESS_PRESETS[preset],
    };
    this.applyPostProcessUniforms();
    guardarPostProcessLocal(this.postProcess);
    this.emitHud();
  }

  public setCameraSettings(patch: Partial<CameraSettings>) {
    this.cameraSettings = { ...this.cameraSettings, ...patch };
    if (typeof patch.normalPitch === 'number') {
      this.camPitch = patch.normalPitch;
    }
    guardarCameraSettingsLocal(this.cameraSettings);
    this.emitHud();
  }

  public applyCameraPreset(preset: CameraPresetId) {
    this.cameraSettings = {
      preset,
      ...CAMERA_PRESETS[preset],
    };
    this.camPitch = this.cameraSettings.normalPitch;
    guardarCameraSettingsLocal(this.cameraSettings);
    this.emitHud();
  }

  public resetCameraSettings() {
    this.cameraSettings = { ...DEFAULT_CAMERA_SETTINGS };
    this.camPitch = this.cameraSettings.normalPitch;
    guardarCameraSettingsLocal(this.cameraSettings);
    this.emitHud();
  }

  public setCameraPreview(active: boolean, aim = false) {
    const entering = active && !this.cameraPreviewActive;
    this.cameraPreviewActive = active;
    this.cameraPreviewAim = active && aim;
    if (entering && this.gameState === 'TITLE_MENU') {
      this.camYaw = this.pyaw + Math.PI;
      this.camPitch = this.cameraSettings.normalPitch;
      this.camDistCurrent = this.cameraPreviewAim
        ? this.cameraSettings.aimDistance
        : this.cameraSettings.normalDistance;
      this.camShoulderOffset = this.cameraPreviewAim
        ? this.cameraSettings.aimShoulderOffset
        : this.cameraSettings.normalShoulderOffset;
      this.camPivotHeight = this.cameraPreviewAim
        ? this.cameraSettings.aimHeight
        : this.cameraSettings.normalHeight;
    }
    if (!active && this.gameState !== 'PLAYING') {
      this.camera.fov = this.cameraSettings.normalFov;
      this.camera.updateProjectionMatrix();
    }
  }

  private applyPostProcessUniforms() {
    this.renderer.toneMappingExposure = this.postProcess.enabled
      ? this.postProcess.exposure
      : 1.02;
    if (this.bloomPass) {
      this.bloomPass.enabled = this.postProcess.enabled && this.postProcess.bloomEnabled;
      this.bloomPass.strength = this.postProcess.bloomStrength;
      this.bloomPass.threshold = this.postProcess.bloomThreshold;
    }
    if (this.gradePass) {
      this.gradePass.enabled = this.postProcess.enabled;
      const u = this.gradePass.uniforms;
      u.uVignette.value = this.postProcess.vignette;
      u.uChromatic.value = this.postProcess.chromaticAberration;
      u.uGrain.value = this.postProcess.filmGrain;
      u.uSaturation.value = this.postProcess.saturation;
      u.uContrast.value = this.postProcess.contrast;
    }
  }

  private requestPointerLockSafe() {
    try {
      if (document.pointerLockElement !== this.renderer.domElement) {
        void this.renderer.domElement.requestPointerLock?.();
      }
    } catch {
      // Fallback pointer-move orbit works seamlessly if pointer lock is disallowed
    }
  }

  private exitPointerLockSafe() {
    try {
      if (document.pointerLockElement === this.renderer.domElement) {
        document.exitPointerLock?.();
      }
    } catch {
      // Ignore
    }
  }

  private handlePointerLockChange = () => {
    this.pointerLocked = document.pointerLockElement === this.renderer.domElement;
    this.hasLastPointer = false;
    this.emitHud();
  };

  private handleKeyDown = (e: KeyboardEvent) => {
    this.audio.unlock();
    const code = e.code;

    if (
      code === 'Space' ||
      code === 'ArrowUp' ||
      code === 'ArrowDown' ||
      code === 'ArrowLeft' ||
      code === 'ArrowRight'
    ) {
      if (this.gameState === 'PLAYING' || this.gameState === 'TITLE_MENU') {
        e.preventDefault();
      }
    }

    if (code === 'KeyM') {
      this.toggleMute();
      return;
    }

    if (code === 'Escape' || code === 'KeyP') {
      if (this.gameState === 'INTRO_CUTSCENE') {
        this.skipIntroCutscene();
      } else if (this.gameState === 'PLAYING') {
        this.pauseGame();
      } else if (this.gameState === 'PAUSED') {
        this.resumeGame();
      } else if (this.gameState === 'GAME_OVER' && code === 'Escape' && this.deathOrbitTimer > 1.2) {
        this.returnToTitle();
      } else if (this.gameState === 'MISSION_COMPLETE' && code === 'Escape') {
        this.returnToTitle();
      }
      return;
    }

    if (this.gameState === 'INTRO_CUTSCENE' && (code === 'Enter' || code === 'Space')) {
      e.preventDefault();
      this.skipIntroCutscene();
      return;
    }

    if (this.gameState === 'TITLE_MENU' && (code === 'Enter' || code === 'Space')) {
      this.startNewRun();
      return;
    }

    if (
      this.gameState === 'GAME_OVER' &&
      this.deathOrbitTimer > 1.2 &&
      (code === 'Enter' || code === 'Space')
    ) {
      this.startNewRun(true);
      return;
    }

    if (
      this.gameState === 'MISSION_COMPLETE' &&
      this.missionCompleteTimer > 1.0 &&
      (code === 'Enter' || code === 'Space')
    ) {
      this.startNewRun(false);
      return;
    }

    if (this.gameState === 'PLAYING' && !this.editorMode) {
      if (code === 'Tab') {
        e.preventDefault();
      }
      if (!e.repeat) {
        if (code === 'Space') {
          this.jumpBufferTimer = 0.14;
        }
        if (code === 'KeyC' || code === 'ControlLeft') {
          this.isCrouching = !this.isCrouching;
          if (this.isCrouching && this.isTutorialMode) {
            this.tutorialCrouched = true;
          }
          this.emitHud();
        }
        if (code === 'KeyZ') {
          this.cycleDistraction(true);
        }
        if (code === 'Digit1' || code === 'Digit0' || code === 'KeyX') {
          this.switchWeapon('unarmed');
        }
        if (code === 'Digit2') {
          if (this.unlockedWeapons.baton && (this.weapon === 'stick' || !this.unlockedWeapons.stick)) {
            this.switchWeapon('baton');
          } else {
            this.switchWeapon('stick');
          }
        }
        if (code === 'KeyV') {
          this.switchWeapon('baton');
        }
        if (code === 'Digit3') {
          this.switchWeapon('bow');
        }
        if (code === 'Digit4') {
          this.switchWeapon('pistol');
        }
        if (code === 'Digit5') {
          this.switchWeapon('rifle');
        }
        if (code === 'KeyG') {
          this.beginThrowableAction('molotov');
        }
        if (code === 'KeyT') {
          this.beginThrowableAction('nail_bomb');
        }
        if (code === 'Digit6') {
          this.beginThrowableAction('bottle');
        }
        if (code === 'Digit7') {
          this.beginThrowableAction('can');
        }
        if (code === 'Digit8') {
          this.beginThrowableAction('brick');
        }
        if (code === 'Digit9') {
          this.beginThrowableAction('decoy_rat');
        }
        if (code === 'KeyK') {
          this.craftDecoyRat(true);
        }
        if (code === 'Tab') {
          this.cycleInventorySlot();
        }
        if (code === 'KeyB') {
          const sel = this.inventory[this.selectedInventorySlot];
          if (sel && (sel.kind === 'molotov' || sel.kind === 'nail_bomb')) {
            this.beginThrowableAction(sel.kind, this.selectedInventorySlot);
          } else {
            this.useInventorySlot(this.selectedInventorySlot);
          }
        }
        if (code === 'KeyQ') {
          this.cycleWeapon();
        }
        if (code === 'KeyR') {
          this.startReload();
        }
        if (code === 'KeyE') {
          if (
            this.nearMechanicHelp &&
            this.missionPhase === 'm3_help_mechanic' &&
            this.activeZone === 'exterior_9_julio'
          ) {
            this.helpPinnedMechanic();
          } else if (
            this.nearVehicleBay &&
            this.vehicleBayUnlocked &&
            this.activeZone === 'colon_interior'
          ) {
            window.dispatchEvent(new CustomEvent('zona-cero-open-vehicle-bay'));
          } else if (
            this.nearExteriorExit &&
            this.baseUnlocked &&
            this.activeZone === 'colon_interior'
          ) {
            if (this.storyMission === 3 && this.missionPhase === 'm3_briefing') {
              this.enterMission3Exterior();
            } else {
              this.travelToExterior9Julio();
            }
          } else if (
            this.nearColonEntrance &&
            this.missionPhase === 'scavenge_9_julio' &&
            this.activeZone === 'exterior_9_julio'
          ) {
            this.returnToColonBase();
          } else if (
            this.nearWorkbench &&
            this.baseUnlocked &&
            this.activeZone === 'colon_interior'
          ) {
            window.dispatchEvent(new CustomEvent('zona-cero-open-workbench'));
          } else if (
            this.nearTrashSpot &&
            this.activeZone === 'exterior_9_julio'
          ) {
            this.searchTrashSpot();
          } else {
            this.beginThrowableAction('grenade');
          }
        }
        if (code === 'KeyH') {
          this.useBandage();
        }
        if (code === 'KeyJ') {
          this.useFood();
        }
        if (code === 'KeyF') {
          this.centerCameraBehindPlayer();
        }
      }
      this.heldKeys.add(code);
    } else if (this.editorMode) {
      this.heldKeys.add(code);
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.heldKeys.delete(e.code);
    if (e.code === 'KeyG') {
      this.releaseThrowableAction('molotov');
    } else if (e.code === 'KeyT') {
      this.releaseThrowableAction('nail_bomb');
    } else if (e.code === 'Digit6') {
      this.releaseThrowableAction('bottle');
    } else if (e.code === 'Digit7') {
      this.releaseThrowableAction('can');
    } else if (e.code === 'Digit8') {
      this.releaseThrowableAction('brick');
    } else if (e.code === 'Digit9') {
      this.releaseThrowableAction('decoy_rat');
    } else if (e.code === 'KeyE') {
      this.releaseThrowableAction('grenade');
    } else if (e.code === 'KeyB') {
      if (this.aimingThrowable === 'molotov' || this.aimingThrowable === 'nail_bomb') {
        this.releaseThrowableAction(this.aimingThrowable);
      }
    }
  };

  private handleBlur = () => {
    this.heldKeys.clear();
    this.cancelPendingThrowable(false);
    this.clearVirtualControls();
    this.hasLastPointer = false;
    this.editorDragMode = 'none';
  };

  private clearVirtualControls() {
    this.fireHeld = false;
    this.aimHeld = false;
    this.virtualMoveX = 0;
    this.virtualMoveY = 0;
    this.virtualSprint = false;
    this.virtualFire = false;
    this.virtualAim = false;
    this.virtualCamVelYaw = 0;
    this.virtualCamVelPitch = 0;
    this.activeCamPointerId = null;
  }

  private getCanvasNdc(clientX: number, clientY: number): THREE.Vector2 {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    const y = -((clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
    return _vec2.set(x, y);
  }

  private handleEditorPointerDown(e: PointerEvent) {
    this.editorDragStart = { x: e.clientX, y: e.clientY };
    this.editorPointerMoved = false;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    this.hasLastPointer = true;

    if (e.button === 2 || e.shiftKey) {
      this.editorDragMode = 'orbit';
      return;
    }

    const ndc = this.getCanvasNdc(e.clientX, e.clientY);
    this.raycaster.setFromCamera(ndc, this.camera);
    const propRoots = Array.from(this.placedPropMeshes.values());
    const hits = propRoots.length > 0 ? this.raycaster.intersectObjects(propRoots, true) : [];
    if (hits.length > 0) {
      const hitId = hits[0].object.userData?.propInstanceId as string | undefined;
      if (hitId) {
        this.selectPlacedProp(hitId);
        this.editorDragMode = 'move';
        return;
      }
    }
    this.editorDragMode = 'orbit';
  }

  private handleEditorPointerMove(e: PointerEvent) {
    if (this.editorDragMode === 'none') return;
    const dx = e.clientX - this.lastPointerX;
    const dy = e.clientY - this.lastPointerY;
    this.lastPointerX = e.clientX;
    this.lastPointerY = e.clientY;
    if (Math.hypot(e.clientX - this.editorDragStart.x, e.clientY - this.editorDragStart.y) > 5) {
      this.editorPointerMoved = true;
    }

    if (this.editorDragMode === 'move' && this.selectedPropId) {
      const ndc = this.getCanvasNdc(e.clientX, e.clientY);
      this.raycaster.setFromCamera(ndc, this.camera);
      const tHit = this.raycaster.intersectObject(this.worldEnv.terrain, false);
      if (tHit.length > 0) {
        const pt = tHit[0].point;
        let nx = pt.x;
        let nz = pt.z;
        if (this.mapSettings.mapPreset === 'custom_sandbox') {
          const clampedR = Math.hypot(pt.x, pt.z);
          const maxR = ARENA_PLAYABLE_RADIUS + 10;
          nx = clampedR > maxR ? (pt.x / clampedR) * maxR : pt.x;
          nz = clampedR > maxR ? (pt.z / clampedR) * maxR : pt.z;
        } else {
          nx = THREE.MathUtils.clamp(pt.x, -ARENA_HALF_X, ARENA_HALF_X);
          nz = THREE.MathUtils.clamp(pt.z, -ARENA_HALF_Z, ARENA_HALF_Z);
        }
        this.updatePlacedProp(this.selectedPropId, {
          x: Number(nx.toFixed(2)),
          z: Number(nz.toFixed(2)),
        });
      }
    } else if (this.editorDragMode === 'orbit') {
      this.editorYaw -= dx * 0.007;
      this.editorPitch = THREE.MathUtils.clamp(this.editorPitch + dy * 0.006, 0.22, 1.38);
    }
  }

  private handleEditorPointerUp(e: PointerEvent) {
    if (this.editorDragMode === 'orbit' && !this.editorPointerMoved && e.button === 0 && this.activePlacementSlotId) {
      const ndc = this.getCanvasNdc(e.clientX, e.clientY);
      this.raycaster.setFromCamera(ndc, this.camera);
      const tHit = this.raycaster.intersectObject(this.worldEnv.terrain, false);
      if (tHit.length > 0) {
        this.placeWorldPropAt(this.activePlacementSlotId, tHit[0].point.x, tHit[0].point.z);
      }
    }
    this.editorDragMode = 'none';
  }

  private handleWheel = (e: WheelEvent) => {
    if (!this.editorMode) return;
    e.preventDefault();
    this.editorDist = THREE.MathUtils.clamp(this.editorDist + e.deltaY * 0.02, 7, 85);
  };

  private handlePointerMove = (e: PointerEvent) => {
    this.lastPointerType = e.pointerType || 'mouse';

    if (this.editorMode) {
      this.handleEditorPointerMove(e);
      return;
    }

    if (this.gameState !== 'PLAYING') return;

    const sensitivity = this.isAiming ? 0.0017 : 0.0026;
    if (e.pointerType !== 'mouse') {
      if (this.activeCamPointerId !== e.pointerId) return;
      if (this.hasLastPointer) {
        const dx = e.clientX - this.lastPointerX;
        const dy = e.clientY - this.lastPointerY;
        this.rotateCameraBy(-dx * sensitivity * 1.6, dy * sensitivity * 1.45);
      }
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.hasLastPointer = true;
      return;
    }

    if (this.pointerLocked) {
      this.rotateCameraBy(-e.movementX * sensitivity, e.movementY * sensitivity);
    } else {
      if (this.hasLastPointer) {
        const dx = e.clientX - this.lastPointerX;
        const dy = e.clientY - this.lastPointerY;
        this.rotateCameraBy(-dx * sensitivity * 1.15, dy * sensitivity * 1.15);
      }
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.hasLastPointer = true;
    }
  };

  private handlePointerDown = (e: PointerEvent) => {
    this.audio.unlock();
    this.lastPointerType = e.pointerType || 'mouse';
    if (this.editorMode) {
      this.handleEditorPointerDown(e);
      return;
    }
    if (this.gameState !== 'PLAYING') return;

    if (e.pointerType === 'mouse') {
      this.requestPointerLockSafe();
      if (e.button === 0) {
        if (this.equippedThrowable !== null) {
          this.beginThrowableAction(this.equippedThrowable);
        } else {
          this.fireHeld = true;
        }
      } else if (e.button === 2) {
        this.aimHeld = true;
      }
    } else {
      // On touch devices, dragging the 3D viewport rotates the camera without triggering fire
      if (this.activeCamPointerId === null) {
        this.activeCamPointerId = e.pointerId;
        this.lastPointerX = e.clientX;
        this.lastPointerY = e.clientY;
        this.hasLastPointer = true;
      }
    }
  };

  private handlePointerUp = (e: PointerEvent) => {
    if (this.editorMode) {
      this.handleEditorPointerUp(e);
      return;
    }
    if (e.pointerType === 'mouse') {
      if (e.button === 0) {
        this.fireHeld = false;
        if (
          this.aimingThrowable === 'molotov' ||
          this.aimingThrowable === 'nail_bomb' ||
          this.aimingThrowable === 'bottle' ||
          this.aimingThrowable === 'can' ||
          this.aimingThrowable === 'brick'
        ) {
          this.releaseThrowableAction(this.aimingThrowable);
        }
      }
      if (e.button === 2) this.aimHeld = false;
    }
    if (this.activeCamPointerId === e.pointerId) {
      this.activeCamPointerId = null;
      this.hasLastPointer = false;
    }
  };

  private handleContextMenu = (e: MouseEvent) => {
    if (this.gameState === 'PLAYING' || this.editorMode) {
      e.preventDefault();
    }
  };

  private handleResize = () => {
    if (this.disposed) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    const pixelRatio = this.renderer.getPixelRatio();
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    if (this.composer) {
      this.composer.setPixelRatio(pixelRatio);
      this.composer.setSize(width, height);
    }
    if (this.bloomPass) {
      const bloomScale = this.isMobileHardware ? 0.5 : 1;
      this.bloomPass.resolution.set(
        Math.floor(width * bloomScale),
        Math.floor(height * bloomScale),
      );
    }
    if (this.gradePass) {
      this.gradePass.uniforms.uTexelSize.value.set(
        1 / Math.max(1, width * pixelRatio),
        1 / Math.max(1, height * pixelRatio),
      );
    }
  };

  private handleContextLost = (e: Event) => {
    e.preventDefault();
  };

  private bindEvents() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleBlur);
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('pointercancel', this.handlePointerUp);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);

    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    canvas.addEventListener('contextmenu', this.handleContextMenu);
    canvas.addEventListener('webglcontextlost', this.handleContextLost);
  }



  public setVirtualMove(x: number, y: number, sprint?: boolean) {
    this.virtualMoveX = THREE.MathUtils.clamp(x, -1, 1);
    this.virtualMoveY = THREE.MathUtils.clamp(y, -1, 1);
    if (typeof sprint === 'boolean') {
      this.virtualSprint = sprint;
    }
  }

  public setVirtualCameraVelocity(yawVel: number, pitchVel: number) {
    this.virtualCamVelYaw = yawVel;
    this.virtualCamVelPitch = pitchVel;
  }

  public rotateCameraBy(deltaYaw: number, deltaPitch: number) {
    if (this.gameState !== 'PLAYING') return;
    if (Math.abs(deltaYaw) > 0.0004 || Math.abs(deltaPitch) > 0.0004) {
      this.manualCameraCooldown = 0.65;
      this.recenterCamTimer = 0;
    }
    this.camYaw += deltaYaw;
    this.camPitch = THREE.MathUtils.clamp(this.camPitch + deltaPitch, -0.36, 0.78);
  }

  public centerCameraBehindPlayer() {
    if (this.gameState !== 'PLAYING') return;
    this.recenterCamTimer = 0.28;
    this.manualCameraCooldown = 0;
  }

  public setVirtualFire(active: boolean) {
    this.audio.unlock();
    this.virtualFire = active;
  }

  public setVirtualAim(active: boolean) {
    this.audio.unlock();
    this.virtualAim = active;
    this.emitHud();
  }

  public triggerJump() {
    this.audio.unlock();
    if (this.gameState === 'PLAYING') {
      this.jumpBufferTimer = 0.14;
    }
  }

  public toggleCrouch() {
    this.audio.unlock();
    if (this.gameState === 'PLAYING') {
      this.isCrouching = !this.isCrouching;
      this.emitHud();
    }
  }

  public triggerReload() {
    this.audio.unlock();
    if (this.gameState === 'PLAYING') {
      this.startReload();
    }
  }

  public triggerGrenade() {
    this.beginThrowableAction('grenade');
  }

  public cycleWeapon() {
    this.audio.unlock();
    if (this.gameState === 'PLAYING') {
      const all: WeaponKind[] = ['unarmed', 'stick', 'baton', 'bow', 'pistol', 'rifle'];
      const avail = all.filter((w) => w === 'unarmed' || this.unlockedWeapons[w]);
      const idx = Math.max(0, avail.indexOf(this.weapon));
      const next = avail[(idx + 1) % avail.length] ?? 'unarmed';
      this.switchWeapon(next);
    }
  }

  public setDifficulty(diff: DifficultyId) {
    this.difficulty = diff;
    this.emitHud();
  }

  public toggleMute() {
    this.audio.setMuted(!this.audio.muted);
    this.emitHud();
  }

  private pickRandomKind(): EnemyKind {
    const r = Math.random();
    if (r < 0.25) return 'runner';
    if (r < 0.48) return 'biter';
    if (r < 0.72) return 'stalker';
    if (r < 0.9) return 'spitter';
    return 'brute';
  }

  private setRadioTransmission(speaker: string, message: string, duration = 6.5) {
    this.radioSpeaker = speaker;
    this.radioMessage = message;
    this.radioTimer = duration;
  }

  public startNewRun(skipCutscene = false) {
    this.audio.unlock();
    this.audio.resetZombieBreathing();
    this.clearDynamicEntities();
    this.resetLooseRocks();
    this.resetLooseLightProps();
    this.footstepDistAccum = 0;
    this.editorMode = false;
    this.worldEnv.editorGrid.visible = false;
    this.selectionRing.visible = false;

    this.storyMission = 1;
    this.isTutorialMode = false;
    this.switchWorldZone('exterior_9_julio');
    this.allyRescued = false;
    this.baseUnlocked = false;
    this.mechanicRescued = false;
    this.vehicleBayUnlocked = false;
    this.vehicleState = { engine: false, tires: false, armor: false, fuel: false };
    this.mechanicPinned = false;
    this.mechanicLimping = false;
    this.nearMechanicHelp = false;
    this.nearVehicleBay = false;
    this.shelfCollapsing = false;
    this.shelfCollapseProgress = 0;
    this.fastFoodHordeIds.clear();
    this.escortAmbushSpawned = false;
    this.worldEnv.fastFood.setShelfCollapse(0);
    this.worldEnv.fastFood.updateVisuals(false, this.elapsed);
    if (this.exteriorMechanicRig) {
      this.exteriorMechanicRig.root.visible = false;
    }
    this.allyCutsceneTimer = 0;
    this.nearWorkbench = false;
    this.nearExteriorExit = false;
    this.nearColonEntrance = false;
    this.provisions = { chemicals: 0, scrap: 0, powder: 0 };
    this.colonInterior.boilerDoorPivot.rotation.y = 0;
    this.colonInterior.allyRig.root.visible = false;

    const sp = this.getPlayerSpawnPos();
    this.px = sp.x;
    this.pz = sp.z;
    this.py = groundHeightAt(this.px, this.pz);
    this.pvx = 0;
    this.pvy = 0;
    this.pvz = 0;
    this.pyaw = Math.PI;
    this.camYaw = 0;
    this.camPitch = this.cameraSettings.normalPitch;
    this.camDistCurrent = this.cameraSettings.normalDistance;
    this.camShoulderOffset = this.cameraSettings.normalShoulderOffset;
    this.camPivotHeight = this.cameraSettings.normalHeight;
    this.camera.fov = this.cameraSettings.normalFov;
    this.camera.updateProjectionMatrix();
    this.cameraPreviewActive = false;
    this.cameraPreviewAim = false;
    this.manualCameraCooldown = 0;
    this.recenterCamTimer = 0;
    this.grounded = true;
    this.jumpWindupTimer = 0;
    this.isCrouching = false;
    this.crouchFactor = 0;
    this.stance = 'idle';
    this.camera.position.set(
      this.px + this.cameraSettings.normalShoulderOffset,
      this.py + this.cameraSettings.normalHeight + Math.sin(this.camPitch) * this.camDistCurrent,
      this.pz + Math.cos(this.camPitch) * this.camDistCurrent,
    );

    this.unlockedWeapons = {
      stick: false,
      baton: false,
      bow: false,
      pistol: false,
      rifle: false,
    };
    this.weapon = 'unarmed';
    this.arrows = 0;
    this.bowDrawProgress = 0;
    this.bowDrawSoundPlayed = false;
    this.wasFiringBow = false;
    this.pistolAmmo = 0;
    this.pistolReserveAmmo = 0;
    this.rifleAmmo = 0;
    this.rifleReserveAmmo = 0;
    this.bandages = 1;
    this.food = 1;
    this.hasBackpack = false;
    this.inventory = Array.from({ length: 8 }, () => null);
    this.selectedInventorySlot = 0;
    this.inventoryNotice = null;
    this.inventoryNoticeTimer = 0;
    this.molotovLit = false;
    this.nailBombLit = false;
    this.distractionCounts = { bottle: 1, can: 1, brick: 1, decoy_rat: 0 };
    this.ratCount = 0;
    this.chapitasCount = 0;
    this.nearTrashSpot = null;
    for (let i = 0; i < this.worldEnv.trashSpots.length; i++) {
      this.worldEnv.trashSpots[i].searchedCooldown = 0;
    }
    this.activeDistractionKind = 'bottle';
    this.equippedThrowable = null;
    this.aimingThrowable = null;
    this.aimingThrowableSlot = undefined;
    this.throwArcLine.visible = false;
    this.throwLandingRing.visible = false;
    this.heldMolotovGroup.visible = false;
    this.heldNailBombGroup.visible = false;
    this.heldGrenadeGroup.visible = false;
    this.heldBottleGroup.visible = false;
    this.heldCanGroup.visible = false;
    this.heldBrickGroup.visible = false;
    this.heldDecoyRatGroup.visible = false;
    this.playerBurnTickTimer = 0;
    this.reloadTimer = 0;
    this.isAiming = false;
    this.throwAnimTimer = 0;

    this.maxHp = this.difficulty === 'pilgrim' ? 125 : this.difficulty === 'warden' ? 100 : 85;
    this.hp = this.maxHp;
    this.helmetArmor = 0;
    this.vestArmor = 0;
    this.syncWeaponVisibility();
    this.syncArmorVisibility();
    this.stamina = this.maxStamina;
    this.staminaExhausted = false;
    this.flareCharge = 50;
    this.wood = 0;
    this.score = 0;
    this.combo = 1;
    this.comboTimer = 0;
    this.survivalTime = 0;
    this.kills = 0;
    this.campfireWarmth = 100;
    this.invulnTimer = 0;
    this.strikeCooldown = 0;
    this.hurtFlashTimer = 0;
    this.damageSeq = 0;
    this.lastDamage = 0;
    this.recoilTimer = 0;
    this.recoilKickAmount = 0;
    this.camRecoilPitch = 0;
    this.camRecoilYaw = 0;
    this.fireBloom = 0;
    this.crosshairSpread = 0.24;
    this.meleeTimer = 0;
    this.throwAnimTimer = 0;
    this.playerHitAnimTimer = 0;
    this.deathAnimTimer = 0;
    this.deathOrbitTimer = 0;
    this.squashY = 1;
    this.shakeTrauma = 0;
    this.hitstopTimer = 0;
    this.flareWaveTimer = 0;
    this.flareWaveMesh.visible = false;
    this.muzzleFlashTimer = 0;
    this.muzzleFlashGroup.visible = false;
    this.muzzleFlashLight.intensity = 0;
    this.resetPlayerPoseTransforms();

    // Story Mode Mission 1 initialization
    this.missionPhase = 'clear_plaza_wave';
    this.colonUnlocked = false;
    this.introCutsceneTimer = 0;
    this.missionCompleteTimer = 0;
    this.radioSpeaker = null;
    this.radioMessage = null;
    this.radioTimer = 0;
    this.worldEnv.updateColonBeacon(false, this.elapsed);

    this.worldEnv.harvestNodes.forEach((n) => {
      n.hp = n.maxHp;
      n.respawnTimer = 0;
      n.group.visible = true;
      n.group.scale.setScalar(1);
    });

    // Spawn Wave 1 street packs (7 zombies) + initial supplies & backpack
    this.spawnMissionWave1Packs();
    this.spawnInitialSurvivalLoot();

    if (skipCutscene) {
      this.enterMissionPlayingState();
    } else {
      this.exitPointerLockSafe();
      this.gameState = 'INTRO_CUTSCENE';
      this.updateIntroCutsceneCamera(0);
    }

    this.emitHud();
  }

  private enterMissionPlayingState() {
    this.gameState = 'PLAYING';
    this.lastTimestamp = performance.now();
    this.camera.fov = this.cameraSettings.normalFov;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(
      this.px + this.cameraSettings.normalShoulderOffset,
      this.py + this.cameraSettings.normalHeight + Math.sin(this.camPitch) * this.camDistCurrent,
      this.pz + Math.cos(this.camPitch) * this.camDistCurrent,
    );
    this.requestPointerLockSafe();
    this.setRadioTransmission(
      'Ricardo López',
      'Año 2050. Sin armas encima. Recoge un palo del suelo para defenderte y quítale las armas a los policías infectados.',
      7.5,
    );
    this.emitHud();
  }

  public startTutorialMode() {
    this.startNewRun(true);
    this.clearDynamicEntities();

    this.isTutorialMode = true;
    this.tutorialStepIndex = 0;
    this.tutorialMovedDist = 0;
    this.tutorialCrouched = false;
    this.tutorialMeleeDone = false;
    this.tutorialDistractionDone = false;
    this.tutorialBowHit = false;
    this.tutorialGunFired = false;

    this.unlockedWeapons = {
      stick: false,
      baton: false,
      bow: false,
      pistol: false,
      rifle: false,
    };
    this.weapon = 'unarmed';
    this.helmetArmor = 0;
    this.vestArmor = 0;
    this.arrows = 0;
    this.pistolAmmo = 0;
    this.pistolReserveAmmo = 0;
    this.rifleAmmo = 0;
    this.rifleReserveAmmo = 0;
    this.distractionCounts = { bottle: 2, can: 1, brick: 1, decoy_rat: 0 };
    this.ratCount = 0;
    this.chapitasCount = 0;
    this.nearTrashSpot = null;
    this.activeDistractionKind = 'bottle';
    this.syncWeaponVisibility();
    this.syncArmorVisibility();

    this.missionPhase = 'tutorial_training';
    this.colonUnlocked = false;
    this.worldEnv.updateColonBeacon(false, this.elapsed);

    // Spawn training equipment directly along the north avenue ahead of Ricardo
    this.spawnPickup('stick', this.px - 1.6, this.pz - 3.6, false);
    this.spawnPickup('bottle', this.px + 1.8, this.pz - 3.6, false);
    this.spawnPickup('bow', this.px + 0.3, this.pz - 6.8, false);
    this.spawnPickup('arrows', this.px - 1.6, this.pz - 7.5, false);
    this.spawnPickup('arrows', this.px + 2.2, this.pz - 7.8, false);
    this.spawnPickup('backpack', this.px - 3.6, this.pz - 4.8, false);

    // Spawn 2 practice zombies + 1 Police Zombie carrying a Revolver
    this.spawnEnemyAt('stalker', this.px - 3.8, this.pz - 11.2);
    this.spawnEnemyAt('stalker', this.px + 5.6, this.pz - 14.2);
    this.spawnEnemyAt('stalker', this.px + 0.4, this.pz - 20.5, undefined, undefined, 'pistol');

    this.setRadioTransmission(
      'Tutorial Interactivo',
      'Bienvenido al campo de prácticas. Muévete con WASD (o joystick) y agáchate para activar el sigilo.',
      7.0,
    );
    this.emitHud();
  }

  public advanceTutorialStep() {
    if (!this.isTutorialMode) return;
    if (this.tutorialStepIndex >= 6) return;
    this.tutorialStepIndex = Math.min(6, this.tutorialStepIndex + 1);
    this.audio.playPickup(1);
    this.prepareCurrentTutorialStep();
    this.emitHud();
  }

  private prepareCurrentTutorialStep() {
    if (!this.isTutorialMode) return;
    if (this.tutorialStepIndex === 1) {
      if (!this.unlockedWeapons.stick) {
        const hasStickPickup = this.pickups.some((p) => p.kind === 'stick');
        if (!hasStickPickup) {
          this.spawnPickup('stick', this.px - Math.sin(this.pyaw) * 3.0, this.pz - Math.cos(this.pyaw) * 3.0, false);
        }
      }
      this.setInventoryNotice('Paso 2: Camina sobre el palo de madera para equiparlo', 3.0);
    } else if (this.tutorialStepIndex === 2) {
      if (this.enemies.length === 0) {
        this.spawnEnemyAt('stalker', this.px + Math.sin(this.pyaw) * 6.5, this.pz + Math.cos(this.pyaw) * 6.5);
      }
      this.setInventoryNotice('Paso 3: Golpea al infectado con el palo o por la espalda en sigilo', 3.2);
    } else if (this.tutorialStepIndex === 3) {
      if (this.getTotalDistractions() <= 0) {
        this.distractionCounts.bottle = 2;
      }
      this.setInventoryNotice('Paso 4: Equipa una distracción [Z] y lánzala para desviar zombies', 3.2);
    } else if (this.tutorialStepIndex === 4) {
      if (!this.unlockedWeapons.bow && !this.pickups.some((p) => p.kind === 'bow')) {
        this.spawnPickup('bow', this.px + Math.sin(this.pyaw) * 3.2, this.pz + Math.cos(this.pyaw) * 3.2, false);
      }
      if (this.unlockedWeapons.bow && this.arrows < 4) {
        this.arrows = 6;
        this.syncWeaponVisibility();
      }
      if (this.enemies.length === 0) {
        this.spawnEnemyAt('stalker', this.px + Math.sin(this.pyaw) * 10.5, this.pz + Math.cos(this.pyaw) * 10.5);
      }
      this.setInventoryNotice('Paso 5: Recoge el Arco, mantén Disparo para tensar y acierta una flecha', 3.4);
    } else if (this.tutorialStepIndex === 5) {
      const hasPoliceAlive = this.enemies.some((e) => e.carriedWeapon !== null);
      const hasPoliceDrop = this.pickups.some((p) => p.kind === 'pistol' || p.kind === 'rifle');
      if (!this.unlockedWeapons.pistol && !this.unlockedWeapons.rifle && !hasPoliceAlive && !hasPoliceDrop) {
        this.spawnEnemyAt(
          'stalker',
          this.px + Math.sin(this.pyaw) * 9.5,
          this.pz + Math.cos(this.pyaw) * 9.5,
          undefined,
          undefined,
          'pistol',
        );
      }
      this.setInventoryNotice('Paso Final: Derrota al Zombie Policía, recoge su arma y dispara', 3.6);
    } else if (this.tutorialStepIndex === 6) {
      this.audio.playStoke();
      this.setRadioTransmission(
        'Ricardo López',
        'Entrenamiento completo. Ya dominas el palo, el sigilo, las distracciones, el arco y el equipo policial.',
        8.0,
      );
      this.setInventoryNotice('¡Tutorial interactivo completado!', 4.0);
    }
  }

  private updateTutorialProgress() {
    if (!this.isTutorialMode || this.gameState !== 'PLAYING') return;

    if (this.isCrouching) {
      this.tutorialCrouched = true;
    }

    // Keep training resources topped up so player can never get stuck
    if (this.tutorialStepIndex === 3 && this.getTotalDistractions() <= 0) {
      this.distractionCounts.bottle = 2;
    }
    if (this.tutorialStepIndex === 4) {
      if (this.unlockedWeapons.bow && this.arrows <= 0) {
        this.arrows = 6;
        this.syncWeaponVisibility();
      }
      if (this.enemies.length === 0) {
        this.spawnEnemyAt(
          'stalker',
          this.px + Math.sin(this.pyaw) * 11.0,
          this.pz + Math.cos(this.pyaw) * 11.0,
        );
      }
    }
    if (this.tutorialStepIndex === 5) {
      if (
        (this.unlockedWeapons.pistol && this.pistolAmmo <= 0 && this.pistolReserveAmmo <= 0) ||
        (this.unlockedWeapons.rifle && this.rifleAmmo <= 0 && this.rifleReserveAmmo <= 0)
      ) {
        this.pistolReserveAmmo += 8;
        this.rifleReserveAmmo += 20;
      }
      const hasPoliceAlive = this.enemies.some((e) => e.carriedWeapon !== null);
      const hasPoliceDrop = this.pickups.some((p) => p.kind === 'pistol' || p.kind === 'rifle');
      if (!this.unlockedWeapons.pistol && !this.unlockedWeapons.rifle && !hasPoliceAlive && !hasPoliceDrop) {
        this.spawnEnemyAt(
          'stalker',
          this.px + Math.sin(this.pyaw) * 9.5,
          this.pz + Math.cos(this.pyaw) * 9.5,
          undefined,
          undefined,
          'pistol',
        );
      }
    }

    let advanced = false;
    if (this.tutorialStepIndex === 0 && this.tutorialMovedDist >= 2.0 && this.tutorialCrouched) {
      this.tutorialStepIndex = 1;
      advanced = true;
    } else if (this.tutorialStepIndex === 1 && this.unlockedWeapons.stick) {
      this.tutorialStepIndex = 2;
      advanced = true;
    } else if (this.tutorialStepIndex === 2 && this.tutorialMeleeDone) {
      this.tutorialStepIndex = 3;
      advanced = true;
    } else if (this.tutorialStepIndex === 3 && this.tutorialDistractionDone) {
      this.tutorialStepIndex = 4;
      advanced = true;
    } else if (this.tutorialStepIndex === 4 && this.tutorialBowHit) {
      this.tutorialStepIndex = 5;
      advanced = true;
    } else if (
      this.tutorialStepIndex === 5 &&
      (this.unlockedWeapons.pistol || this.unlockedWeapons.rifle) &&
      this.tutorialGunFired
    ) {
      this.tutorialStepIndex = 6;
      advanced = true;
    }

    if (advanced) {
      if (this.tutorialStepIndex < 6) {
        this.audio.playPickup(1);
      }
      this.prepareCurrentTutorialStep();
      this.emitHud();
    }
  }

  private getTutorialHudState(): TutorialHudState {
    if (!this.isTutorialMode) {
      return {
        active: false,
        stepIndex: 0,
        totalSteps: 6,
        stepId: 'move_crouch',
        title: '',
        instruction: '',
        hint: '',
        progressText: '',
        completed: false,
      };
    }
    const defs: {
      stepId: TutorialStepId;
      title: string;
      instruction: string;
      hint: string;
      progressText: string;
    }[] = [
      {
        stepId: 'move_crouch',
        title: 'Movimiento y Sigilo',
        instruction: 'Camina hacia adelante y agáchate para reducir el ruido de tus pasos.',
        hint: 'PC: WASD + C/Ctrl · Móvil: Joystick izquierdo + botón Agachar',
        progressText: `Mover: ${this.tutorialMovedDist >= 2.0 ? '✓' : `${Math.min(100, Math.round((this.tutorialMovedDist / 2.0) * 100))}%`} · Sigilo: ${this.tutorialCrouched ? '✓' : 'Pendiente'}`,
      },
      {
        stepId: 'pickup_stick',
        title: 'Defensa Inicial: Recoge el Palo',
        instruction: 'Acércate al palo de madera en el suelo frente a ti para recogerlo.',
        hint: 'Comienzas desarmado. El palo duplica tu alcance y daño cuerpo a cuerpo.',
        progressText: this.unlockedWeapons.stick ? '✓ Palo equipado' : 'Camina sobre el palo iluminado',
      },
      {
        stepId: 'melee_dummy',
        title: 'Combate Cuerpo a Cuerpo / Sigiloso',
        instruction: 'Golpea a un infectado cercano con el palo (o elimínalo por la espalda en sigilo).',
        hint: 'PC: Clic Izq · Móvil: Botón de Golpe (tecla 2 equipa el Palo)',
        progressText: this.tutorialMeleeDone ? '✓ Impacto logrado' : 'Golpea a un zombie cercano',
      },
      {
        stepId: 'throw_distraction',
        title: 'Objetos de Distracción',
        instruction: 'Equipa una botella/lata/ladrillo y lánzala para atraer a los zombies lejos de ti.',
        hint: 'PC: Z (o 6/7/8) + Clic Izq · Móvil: Rueda radial -> Distracción',
        progressText: this.tutorialDistractionDone ? '✓ Distracción lanzada' : 'Lanza una distracción',
      },
      {
        stepId: 'bow_shot',
        title: 'Arco Recurvo y Flechas',
        instruction: 'Recoge el Arco, mantén presionado Disparo para tensar y suelta sobre un zombie.',
        hint: 'Dispara casi sin hacer ruido (2.5 m). Cuanto más tenses, mayor daño.',
        progressText: !this.unlockedWeapons.bow
          ? 'Recoge el Arco del suelo'
          : `Arco listo (${this.arrows} fl.) · Acierta un disparo`,
      },
      {
        stepId: 'police_gun',
        title: 'Zombie Policía y Arma de Fuego',
        instruction: 'Abate al Zombie Policía (uniforme azul), recoge su Revólver o FAL y dispara.',
        hint: 'Los policías llevan gorra y arma en mano; al caer sueltan su arma y munición.',
        progressText: !(this.unlockedWeapons.pistol || this.unlockedWeapons.rifle)
          ? 'Derrota al Zombie Policía y recoge su arma'
          : '✓ Arma recogida · Realiza un disparo',
      },
      {
        stepId: 'completed',
        title: '¡Entrenamiento Completado!',
        instruction: 'Dominas el sigilo, el palo, las distracciones, el arco y el saqueo policial.',
        hint: 'Ya estás listo para sobrevivir en la Av. 9 de Julio y el Teatro Colón.',
        progressText: '6/6 completado',
      },
    ];
    const clampedIdx = Math.max(0, Math.min(defs.length - 1, this.tutorialStepIndex));
    const cur = defs[clampedIdx];
    return {
      active: true,
      stepIndex: clampedIdx,
      totalSteps: 6,
      stepId: cur.stepId,
      title: cur.title,
      instruction: cur.instruction,
      hint: cur.hint,
      progressText: cur.progressText,
      completed: clampedIdx >= 6,
    };
  }

  public skipIntroCutscene() {
    if (this.gameState !== 'INTRO_CUTSCENE') return;
    this.audio.unlock();
    this.enterMissionPlayingState();
  }

  public pauseGame() {
    if (this.gameState !== 'PLAYING') return;
    this.audio.resetZombieBreathing();
    this.heldKeys.clear();
    this.aimingThrowable = null;
    this.aimingThrowableSlot = undefined;
    this.throwArcLine.visible = false;
    this.throwLandingRing.visible = false;
    this.clearVirtualControls();
    this.exitPointerLockSafe();
    this.gameState = 'PAUSED';
    this.emitHud();
  }

  public resumeGame() {
    if (this.gameState !== 'PAUSED') return;
    this.editorMode = false;
    this.cameraPreviewActive = false;
    this.cameraPreviewAim = false;
    this.selectionRing.visible = false;
    this.gameState = 'PLAYING';
    this.lastTimestamp = performance.now();
    this.requestPointerLockSafe();
    this.emitHud();
  }

  public returnToTitle() {
    this.audio.resetZombieBreathing();
    this.clearDynamicEntities();
    this.resetLooseRocks();
    this.resetLooseLightProps();
    this.footstepDistAccum = 0;
    this.heldKeys.clear();
    this.clearVirtualControls();
    this.exitPointerLockSafe();
    this.editorMode = false;
    this.worldEnv.editorGrid.visible = false;
    this.cameraPreviewActive = false;
    this.cameraPreviewAim = false;
    this.selectionRing.visible = false;
    this.storyMission = 1;
    this.isTutorialMode = false;
    this.switchWorldZone('exterior_9_julio');
    this.allyRescued = false;
    this.baseUnlocked = false;
    this.mechanicRescued = false;
    this.vehicleBayUnlocked = false;
    this.vehicleState = { engine: false, tires: false, armor: false, fuel: false };
    this.mechanicPinned = false;
    this.mechanicLimping = false;
    this.nearMechanicHelp = false;
    this.nearVehicleBay = false;
    this.shelfCollapsing = false;
    this.shelfCollapseProgress = 0;
    this.fastFoodHordeIds.clear();
    this.escortAmbushSpawned = false;
    this.worldEnv.fastFood.setShelfCollapse(0);
    this.worldEnv.fastFood.updateVisuals(false, this.elapsed);
    if (this.exteriorMechanicRig) {
      this.exteriorMechanicRig.root.visible = false;
    }
    this.allyCutsceneTimer = 0;
    this.nearWorkbench = false;
    this.nearExteriorExit = false;
    this.nearColonEntrance = false;
    this.colonInterior.boilerDoorPivot.rotation.y = 0;
    this.colonInterior.allyRig.root.visible = false;
    const sp = this.getPlayerSpawnPos();
    this.px = sp.x;
    this.pz = sp.z;
    this.py = groundHeightAt(this.px, this.pz);
    this.pyaw = Math.PI;
    this.jumpWindupTimer = 0;
    this.isCrouching = false;
    this.crouchFactor = 0;
    this.isAiming = false;
    this.reloadTimer = 0;
    this.hurtFlashTimer = 0;
    this.damageSeq = 0;
    this.lastDamage = 0;
    this.recoilTimer = 0;
    this.recoilKickAmount = 0;
    this.camRecoilPitch = 0;
    this.camRecoilYaw = 0;
    this.fireBloom = 0;
    this.crosshairSpread = 0.24;
    this.meleeTimer = 0;
    this.throwAnimTimer = 0;
    this.playerHitAnimTimer = 0;
    this.deathAnimTimer = 0;
    this.deathOrbitTimer = 0;
    this.squashY = 1;
    this.flareWaveTimer = 0;
    this.flareWaveMesh.visible = false;
    this.muzzleFlashTimer = 0;
    this.muzzleFlashGroup.visible = false;
    this.muzzleFlashLight.intensity = 0;
    this.hasBackpack = false;
    this.inventory = Array.from({ length: 8 }, () => null);
    this.hudInventoryDirty = true;
    this.inventoryNotice = null;
    this.inventoryNoticeTimer = 0;
    this.molotovLit = false;
    this.nailBombLit = false;
    this.distractionCounts = { bottle: 1, can: 1, brick: 1, decoy_rat: 0 };
    this.ratCount = 0;
    this.chapitasCount = 0;
    this.nearTrashSpot = null;
    for (let i = 0; i < this.worldEnv.trashSpots.length; i++) {
      this.worldEnv.trashSpots[i].searchedCooldown = 0;
    }
    this.activeDistractionKind = 'bottle';
    this.equippedThrowable = null;
    this.aimingThrowable = null;
    this.stamina = this.maxStamina;
    this.staminaExhausted = false;
    this.aimingThrowableSlot = undefined;
    this.throwArcLine.visible = false;
    this.throwLandingRing.visible = false;
    this.heldMolotovGroup.visible = false;
    this.heldNailBombGroup.visible = false;
    this.heldGrenadeGroup.visible = false;
    this.heldBottleGroup.visible = false;
    this.heldCanGroup.visible = false;
    this.heldBrickGroup.visible = false;
    this.heldDecoyRatGroup.visible = false;
    this.missionPhase = 'clear_plaza_wave';
    this.colonUnlocked = false;
    this.introCutsceneTimer = 0;
    this.missionCompleteTimer = 0;
    this.radioSpeaker = null;
    this.radioMessage = null;
    this.radioTimer = 0;
    this.worldEnv.updateColonBeacon(false, this.elapsed);
    this.unlockedWeapons = {
      stick: false,
      baton: false,
      bow: false,
      pistol: false,
      rifle: false,
    };
    this.weapon = 'unarmed';
    this.helmetArmor = 0;
    this.vestArmor = 0;
    this.arrows = 0;
    this.bowDrawProgress = 0;
    this.bowDrawSoundPlayed = false;
    this.wasFiringBow = false;
    this.pistolAmmo = 0;
    this.pistolReserveAmmo = 0;
    this.rifleAmmo = 0;
    this.rifleReserveAmmo = 0;
    this.syncWeaponVisibility();
    this.syncArmorVisibility();
    this.resetPlayerPoseTransforms();
    this.playerRig.root.position.set(this.px, this.py, this.pz);
    this.playerRig.root.rotation.y = this.pyaw;
    this.gameState = 'TITLE_MENU';
    this.emitHud();
  }

  private resetPlayerPoseTransforms() {
    this.playerRig.resetClips?.();
    this.playerRig.root.scale.set(1, 1, 1);
    this.playerRig.bodyPivot.position.set(0, 0, 0);
    this.playerRig.bodyPivot.rotation.set(0, 0, 0);
    if (this.playerRig.bones.hips) {
      this.playerRig.bones.hips.node.position.copy(this.playerRig.bones.hips.restPos);
    }
  }

  private clearDynamicEntities() {
    this.enemies.forEach((e) => {
      this.scene.remove(e.bundle.group, e.shadow);
      Object.values(e.stumpMeshes).forEach((s) => s?.dispose());
      e.bundle.dispose();
    });
    this.enemies = [];

    this.dyingEnemies.forEach((d) => {
      this.scene.remove(d.bundle.group, d.shadow);
      Object.values(d.stumpMeshes).forEach((s) => s?.dispose());
      d.bundle.dispose();
    });
    this.dyingEnemies = [];

    for (let i = 0; i < this.projectiles.length; i++) {
      const p = this.projectiles[i];
      this.scene.remove(p.mesh);
      const pool = p.isArrow
        ? this.playerArrowPool
        : p.fromPlayer
          ? this.playerBoltPool
          : this.enemyBoltPool;
      if (pool.length < 48) pool.push(p.mesh);
    }
    this.projectiles = [];

    this.pickups.forEach((p) => {
      this.scene.remove(p.mesh);
      p.disposeMesh?.();
    });
    this.pickups = [];

    this.thrownThrowables.forEach((t) => {
      this.scene.remove(t.mesh);
      t.disposeMesh();
    });
    this.thrownThrowables = [];

    this.decoyRats.forEach((r) => {
      this.scene.remove(r.visuals.group);
      r.visuals.dispose();
    });
    this.decoyRats = [];

    this.fireZones.forEach((fz) => {
      this.scene.remove(fz.group);
      fz.dispose();
    });
    this.fireZones = [];

    for (let i = 0; i < this.nailShrapnels.length; i++) {
      const n = this.nailShrapnels[i];
      this.scene.remove(n.mesh);
      if (this.nailMeshPool.length < 64) this.nailMeshPool.push(n.mesh);
    }
    this.nailShrapnels = [];

    for (let i = 0; i < this.noiseRipples.length; i++) {
      const nr = this.noiseRipples[i];
      this.scene.remove(nr.mesh);
      nr.mat.dispose();
    }
    this.noiseRipples = [];

    for (let i = 0; i < MAX_BLOOD_PARTICLES; i++) {
      this.bloodParticles[i].active = false;
      _mat4.makeScale(0, 0, 0);
      this.bloodInst.setMatrixAt(i, _mat4);
    }
    this.bloodInst.instanceMatrix.needsUpdate = true;

    for (let i = 0; i < MAX_SMOKE_PARTICLES; i++) {
      this.smokeParticles[i].active = false;
      this.smokeAlphaArray[i] = 0;
      _mat4.makeScale(0, 0, 0);
      this.smokeInst.setMatrixAt(i, _mat4);
    }
    this.smokeInst.instanceMatrix.needsUpdate = true;
    this.smokeAlphaAttr.needsUpdate = true;

    for (let i = 0; i < this.bloodDecals.length; i++) {
      this.bloodDecals[i].active = false;
      this.bloodDecals[i].mesh.visible = false;
    }

    for (let i = 0; i < this.footprintDecals.length; i++) {
      this.footprintDecals[i].active = false;
      this.footprintDecals[i].mesh.visible = false;
    }
    this.playerShoeStain.charges = 0;
    this.mechanicShoeStain.charges = 0;
    this.allyShoeStain.charges = 0;
    this.mechanicFootstepDistAccum = 0;
    this.mechanicPrevPos.initialized = false;
    this.allyFootstepDistAccum = 0;
    this.allyPrevPos.initialized = false;
    this.looseNoiseCooldown = 0;
    this.stealthNoiseBoostTimer = 0;
    this.stealthNoiseBoostLevel = 0;

    this.severedLimbChunks.forEach((c) => {
      this.scene.remove(c.group);
      c.dispose();
    });
    this.severedLimbChunks = [];
  }

  private scheduleNextFrame() {
    if (this.disposed || this.renderSuspended) return;
    if (this.isSoftwareGl) {
      this.afterDraw(() => {
        if (!this.disposed && !this.renderSuspended) this.tick();
      });
    } else {
      this.frameId = requestAnimationFrame(() => this.tick());
    }
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync?.(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    if (!sync) {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    gl.flush();
    const poll = () => {
      if (this.disposed || this.renderSuspended) {
        gl.deleteSync(sync);
        return;
      }
      const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private isCurrentlyDaytime(): boolean {
    return this.mapSettings.timeOfDay >= 0.25 && this.mapSettings.timeOfDay <= 0.75;
  }

  private formatClockFromTimeOfDay(t: number): string {
    const totalMins = Math.floor(((t % 1) + 1) % 1 * 24 * 60);
    const hrs = Math.floor(totalMins / 60) % 24;
    const mins = totalMins % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  }

  private updateDayNightAndFog(dt: number) {
    if (this.activeZone === 'colon_interior') {
      if (this.scene.background instanceof THREE.Color) {
        this.scene.background.copy(_cColonBg);
      }
      this.sunLight.color.setHex(0xffd79e);
      this.sunLight.intensity = 0.28;
      this.sunLight.castShadow = false;
      this.rimLight.intensity = 0.22;
      this.hemiLight.color.setHex(0xb89668);
      this.hemiLight.groundColor.setHex(0x1f1419);
      this.hemiLight.intensity = 0.72;
      if (this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.color.copy(_cColonFog);
        this.scene.fog.density = 0.0085;
        this.currentFogLevel = 0.0085;
      }
      return;
    }
    this.sunLight.castShadow = !this.isSoftwareGl;

    if (this.mapSettings.dayNightEnabled && this.gameState === 'PLAYING' && !this.editorMode) {
      this.mapSettings.timeOfDay =
        (this.mapSettings.timeOfDay + dt * 0.0048 * this.mapSettings.cycleSpeed) % 1;
    }

    const t = this.mapSettings.timeOfDay;
    const sunAngle = (t - 0.25) * Math.PI * 2;
    const sunSin = Math.sin(sunAngle);
    const sunCos = Math.cos(sunAngle);
    const dayFactor = THREE.MathUtils.clamp((sunSin + 0.14) / 0.44, 0, 1);
    const twilight = Math.max(0, 1 - Math.abs(sunSin) * 3.8);

    _cSkyCol.copy(_cNightSky).lerp(_cDaySky, dayFactor).lerp(_cDuskSky, twilight * 0.48);

    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.copy(_cSkyCol);
    }

    const skyAnchorX = this.editorMode ? this.editorTarget.x : this.px;
    const skyAnchorZ = this.editorMode ? this.editorTarget.z : this.pz;

    // Keep sky dome & starfield centered on camera anchor so corners never clip
    this.worldEnv.skyDome.position.set(skyAnchorX, 0, skyAnchorZ);
    this.worldEnv.stars.position.set(skyAnchorX, 0, skyAnchorZ);
    this.worldEnv.stars.rotation.y = (t - 0.25) * 0.55;

    const skyU = this.worldEnv.skyMat.uniforms;
    (skyU.uSunDir.value as THREE.Vector3).set(sunCos, sunSin, 0.14).normalize();
    skyU.uDayFactor.value = dayFactor;
    skyU.uTwilight.value = twilight;
    if (skyU.uTime) skyU.uTime.value = this.elapsed;
    this.worldEnv.windTimeUniform.value = this.elapsed;
    (skyU.uZenithColor.value as THREE.Color)
      .copy(_cNightZenith)
      .lerp(_cDayZenith, dayFactor)
      .lerp(_cDuskZenith, twilight * 0.55);
    (skyU.uHorizonColor.value as THREE.Color)
      .copy(_cNightHorizon)
      .lerp(_cDayHorizon, dayFactor)
      .lerp(_cDuskHorizon, twilight * 0.62);
    (skyU.uSunGlowColor.value as THREE.Color)
      .copy(_cSunGlowDay)
      .lerp(_cSunGlowDusk, twilight * 0.85);

    const starOpacity = Math.pow(1 - dayFactor, 1.35) * 0.96;
    this.worldEnv.starMat.uniforms.uOpacity.value = starOpacity;
    this.worldEnv.starMat.uniforms.uTime.value = this.elapsed;
    this.worldEnv.stars.visible = starOpacity > 0.02;

    const orbitDist = 210;
    this.worldEnv.sunDisc.position.set(
      skyAnchorX + sunCos * orbitDist,
      sunSin * orbitDist,
      skyAnchorZ + 28,
    );
    this.worldEnv.sunDisc.lookAt(skyAnchorX, 0, skyAnchorZ);
    // Keep sun disc veiled behind heavy overcast storm clouds during day, visible only dimly at twilight
    this.worldEnv.sunDisc.visible = sunSin > -0.16 && twilight > 0.28;
    this.worldEnv.sunHalo.position.set(
      skyAnchorX + sunCos * (orbitDist - 1),
      sunSin * (orbitDist - 1),
      skyAnchorZ + 27.6,
    );
    this.worldEnv.sunHalo.lookAt(skyAnchorX, 0, skyAnchorZ);
    this.worldEnv.sunHalo.visible = sunSin > -0.18 && twilight > 0.18;

    this.worldEnv.moonMesh.position.set(
      skyAnchorX - sunCos * orbitDist,
      -sunSin * orbitDist,
      skyAnchorZ - 28,
    );
    this.worldEnv.moonMesh.lookAt(skyAnchorX, 0, skyAnchorZ);
    this.worldEnv.moonMesh.visible = -sunSin > -0.18;
    this.worldEnv.moonHalo.position.set(
      skyAnchorX - sunCos * (orbitDist - 1),
      -sunSin * (orbitDist - 1),
      skyAnchorZ - 27.6,
    );
    this.worldEnv.moonHalo.lookAt(skyAnchorX, 0, skyAnchorZ);
    this.worldEnv.moonHalo.visible = -sunSin > -0.18;

    // Dynamic directional sun/moon shadow vector across the day-night cycle
    const useSunVec = sunSin >= -0.04;
    const dirX = useSunVec ? sunCos : -sunCos;
    const dirY = Math.max(0.42, useSunVec ? sunSin : -sunSin);
    const dirZ = useSunVec ? 0.24 : -0.24;
    this.sunOffsetX = dirX * 32;
    this.sunOffsetY = dirY * 38;
    this.sunOffsetZ = dirZ * 32;
    if (this.editorMode || this.gameState !== 'PLAYING') {
      const targetY = this.editorMode ? this.editorTarget.y : this.py;
      this.sunLight.position.set(
        skyAnchorX + this.sunOffsetX,
        targetY + this.sunOffsetY,
        skyAnchorZ + this.sunOffsetZ,
      );
      this.sunLight.target.position.set(skyAnchorX, targetY, skyAnchorZ);
      this.sunLight.target.updateMatrixWorld();
    }

    _cLightCol.copy(_cLightNight).lerp(_cLightDay, dayFactor).lerp(_cLightDusk, twilight * 0.62);
    this.sunLight.color.copy(_cLightCol);
    this.sunLight.intensity = 0.34 + dayFactor * 1.18 + twilight * 0.18;
    this.rimLight.intensity = 0.24 + twilight * 0.34 + (1 - dayFactor) * 0.1;

    this.hemiLight.color.setHex(0x4b6a9c).lerp(_cHemiDay, dayFactor);
    this.hemiLight.groundColor.setHex(0x111722).lerp(_cHemiGround, dayFactor);
    this.hemiLight.intensity = 0.4 + dayFactor * 0.62;

    const nightLampScale = Math.pow(1 - dayFactor, 0.9);
    const isSandboxMap = this.mapSettings.mapPreset === 'custom_sandbox';
    const lampInt = 3.2 * nightLampScale;
    const lampsActive = !isSandboxMap && lampInt > 0.05;
    this.worldEnv.lampGlowMat.emissiveIntensity = 0.22 + nightLampScale * 2.4;
    for (let li = 0; li < this.worldEnv.lampPoints.length; li++) {
      const pt = this.worldEnv.lampPoints[li];
      pt.visible = lampsActive;
      pt.intensity = lampsActive ? lampInt : 0;
    }
    this.worldEnv.nightGlowMats.forEach((ng) => {
      ng.mat.emissiveIntensity = THREE.MathUtils.lerp(
        ng.nightIntensity,
        ng.dayIntensity,
        dayFactor,
      );
    });

    if (this.scene.fog instanceof THREE.FogExp2) {
      _cFogCol.copy(_cFogNight).lerp(_cFogDay, dayFactor).lerp(_cFogDusk, twilight * 0.42);
      this.scene.fog.color.copy(_cFogCol);

      const wave = this.mapSettings.fogDynamic
        ? 0.82 + 0.22 * Math.sin(this.elapsed * 0.19) + 0.12 * Math.cos(this.elapsed * 0.083)
        : 1.0;
      const baseTimeDensity = 0.0108 - dayFactor * 0.0052 + twilight * 0.0018;
      const density = THREE.MathUtils.clamp(
        baseTimeDensity * this.mapSettings.fogDensity * wave,
        0.001,
        0.055,
      );
      this.scene.fog.density = density;
      this.currentFogLevel = density;
    }
  }

  private updateEditorCamera(dt: number) {
    let panFwd = 0;
    let panRight = 0;
    if (this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp')) panFwd += 1;
    if (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown')) panFwd -= 1;
    if (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight')) panRight += 1;
    if (this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft')) panRight -= 1;

    if (panFwd !== 0 || panRight !== 0) {
      const spd = 24 * dt;
      const fx = -Math.sin(this.editorYaw);
      const fz = -Math.cos(this.editorYaw);
      const rx = Math.cos(this.editorYaw);
      const rz = -Math.sin(this.editorYaw);
      const isSandbox = this.mapSettings.mapPreset === 'custom_sandbox';
      const maxX = isSandbox ? ARENA_PLAYABLE_RADIUS : ARENA_HALF_X;
      const maxZ = isSandbox ? ARENA_PLAYABLE_RADIUS : ARENA_HALF_Z;
      this.editorTarget.x = THREE.MathUtils.clamp(
        this.editorTarget.x + (fx * panFwd + rx * panRight) * spd,
        -maxX,
        maxX,
      );
      this.editorTarget.z = THREE.MathUtils.clamp(
        this.editorTarget.z + (fz * panFwd + rz * panRight) * spd,
        -maxZ,
        maxZ,
      );
      this.editorTarget.y = groundHeightAt(this.editorTarget.x, this.editorTarget.z);
    }

    const horiz = Math.cos(this.editorPitch) * this.editorDist;
    const vert = Math.sin(this.editorPitch) * this.editorDist;
    const cx = this.editorTarget.x + Math.sin(this.editorYaw) * horiz;
    const cz = this.editorTarget.z + Math.cos(this.editorYaw) * horiz;
    const cy = Math.max(groundHeightAt(cx, cz) + 1.5, this.editorTarget.y + vert);
    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(this.editorTarget.x, this.editorTarget.y + 0.6, this.editorTarget.z);
  }

  private tick() {
    if (this.disposed || this.renderSuspended) return;

    this.frameCounter++;
    const now = performance.now();
    const rawDt = (now - this.lastTimestamp) / 1000;
    this.lastTimestamp = now;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

    this.elapsed += dt;
    this.updateDayNightAndFog(dt);
    const windAnchorX = this.editorMode ? this.editorTarget.x : this.px;
    const windAnchorZ = this.editorMode ? this.editorTarget.z : this.pz;
    this.windDebris.update(
      dt,
      this.elapsed,
      windAnchorX,
      windAnchorZ,
      this.activeZone === 'exterior_9_julio' && this.mapSettings.mapPreset === 'buenos_aires',
    );
    if (this.activeZone === 'colon_interior') {
      this.colonInterior.updateVisuals(
        this.elapsed,
        this.baseUnlocked,
        this.allyRescued,
        this.vehicleBayUnlocked,
        this.vehicleState,
        dt,
      );
      if (this.gameState === 'MISSION_COMPLETE' && this.allyRescued) {
        animateAllyChemist(this.colonInterior.allyRig, this.elapsed, false, false, dt);
      }
      this.updateCampfireAndParticles(dt);
    } else {
      this.updateCampfireAndParticles(dt);
      this.worldEnv.updateColonBeacon(this.colonUnlocked, this.elapsed);
      this.worldEnv.fastFood.updateVisuals(
        this.storyMission === 3 && this.missionPhase === 'm3_go_fastfood',
        this.elapsed,
      );
    }

    if (this.editorMode) {
      this.updateEditorCamera(dt);
      this.selectionRing.rotation.z += dt * 1.4;
    } else if (this.gameState === 'TITLE_MENU') {
      if (this.cameraPreviewActive) {
        this.aimPoint.set(
          this.px + Math.sin(this.pyaw) * 18,
          this.py + this.cameraSettings.aimHeight,
          this.pz + Math.cos(this.pyaw) * 18,
        );
        this.updateFreeCamera(dt);
        this.updatePlayerAnimation(dt, 0, false);
      } else {
        this.updateTitleCamera(dt);
        this.updatePlayerAnimation(dt, 0, false);
      }
    } else if (this.gameState === 'INTRO_CUTSCENE') {
      this.introCutsceneTimer += dt;
      this.updateIntroCutsceneCamera(this.introCutsceneTimer);
      this.updatePlayerAnimation(dt, 0, false);
      this.hudSyncTimer -= dt;
      if (this.hudSyncTimer <= 0) {
        this.hudSyncTimer = 0.06;
        this.emitHud();
      }
      if (this.introCutsceneTimer >= this.introCutsceneDuration) {
        this.enterMissionPlayingState();
      }
    } else if (this.gameState === 'ALLY_RESCUE_CUTSCENE') {
      this.updateAllyRescueCutscene(dt);
      this.updateBloodParticles(dt);
      this.updateBloodDecals(dt);
      this.updateFootprintDecals(dt);
      this.updateSeveredLimbs(dt);
      this.updateDyingEnemies(dt);
      this.updatePlayerAnimation(dt, 0, false);
      this.hudSyncTimer -= dt;
      if (this.hudSyncTimer <= 0) {
        this.hudSyncTimer = 0.06;
        this.emitHud();
      }
    } else if (this.gameState === 'PLAYING') {
      if (this.looseNoiseCooldown > 0) this.looseNoiseCooldown = Math.max(0, this.looseNoiseCooldown - dt);
      if (this.stealthNoiseBoostTimer > 0) {
        this.stealthNoiseBoostTimer = Math.max(0, this.stealthNoiseBoostTimer - dt);
        if (this.stealthNoiseBoostTimer <= 0) this.stealthNoiseBoostLevel = 0;
      }
      if (this.hitstopTimer > 0) {
        this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
        this.shakeTrauma = Math.max(0, this.shakeTrauma - dt * 1.9);
      } else {
        this.updatePlaying(dt);
        this.updateLooseRocks(dt);
        this.updateLooseLightProps(dt);
      }
      this.updateBloodParticles(dt);
      this.updateBloodDecals(dt);
      this.updateFootprintDecals(dt);
      this.updateSeveredLimbs(dt);
    } else if (this.gameState === 'MISSION_COMPLETE') {
      this.missionCompleteTimer += dt;
      this.shakeTrauma = Math.max(0, this.shakeTrauma - dt * 2.5);
      this.updateEffects(dt);
      this.updateDyingEnemies(dt);
      this.updateBloodParticles(dt);
      this.updateBloodDecals(dt);
      this.updateSeveredLimbs(dt);
      this.updatePlayerAnimation(dt, 0, false);
      this.updateMissionCompleteCamera(dt);
    } else if (this.gameState === 'GAME_OVER') {
      this.shakeTrauma = Math.max(0, this.shakeTrauma - dt * 2.5);
      if (this.hurtFlashTimer > 0) {
        this.hurtFlashTimer = Math.max(0, this.hurtFlashTimer - dt * 0.85);
        this.hudSyncTimer -= dt;
        if (this.hudSyncTimer <= 0) {
          this.hudSyncTimer = 0.04;
          this.emitHud();
        }
      }
      this.updateEffects(dt);
      this.updateDyingEnemies(dt);
      this.updateBloodParticles(dt);
      this.updateBloodDecals(dt);
      this.updateSeveredLimbs(dt);
      this.animatePlayerDeath(dt);
    } else {
      this.shakeTrauma = Math.max(0, this.shakeTrauma - dt * 2.5);
      if (this.cameraPreviewActive) {
        this.aimPoint.set(
          this.px - Math.sin(this.camYaw) * 18,
          this.py + this.cameraSettings.aimHeight - Math.sin(this.camPitch) * 12,
          this.pz - Math.cos(this.camYaw) * 18,
        );
        this.updateFreeCamera(dt);
        this.updatePlayerAnimation(dt, 0, false);
      }
    }

    this.updateSpatialAmbienceState(dt);
    this.audio.updateSpatialAmbience(this.spatialAmbienceState);
    this.updateZombieBreathingFeed(dt);

    if (this.gradePass) {
      this.gradePass.uniforms.uTime.value = this.elapsed;
    }
    if (!this.isSoftwareGl && this.postProcess.enabled && this.composer) {
      this.composer.render();
    } else {
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.scene, this.camera);
    }
    this.scheduleNextFrame();
  }

  private updateSpatialAmbienceState(dt: number) {
    const s = this.spatialAmbienceState;
    const isSandbox = this.mapSettings.mapPreset === 'custom_sandbox';
    const isExterior = this.activeZone === 'exterior_9_julio';
    const useCamPos =
      this.editorMode ||
      this.gameState === 'TITLE_MENU' ||
      this.gameState === 'INTRO_CUTSCENE';

    this.camera.getWorldDirection(_vec3);
    _vec3B.set(0, 1, 0).applyQuaternion(this.camera.quaternion).normalize();

    const sunAngle = (this.mapSettings.timeOfDay - 0.25) * Math.PI * 2;
    const sunSin = Math.sin(sunAngle);
    const dayFactor = THREE.MathUtils.clamp((sunSin + 0.14) / 0.44, 0, 1);
    const twilight = Math.max(0, 1 - Math.abs(sunSin) * 3.8);

    const refX = useCamPos ? this.camera.position.x : this.px;
    const refZ = useCamPos ? this.camera.position.z : this.pz;

    const insideFastFood =
      isExterior &&
      !isSandbox &&
      refX >= FASTFOOD_INTERIOR_BOUNDS.minX &&
      refX <= FASTFOOD_INTERIOR_BOUNDS.maxX &&
      refZ >= FASTFOOD_INTERIOR_BOUNDS.minZ &&
      refZ <= FASTFOOD_INTERIOR_BOUNDS.maxZ;

    const cf = this.getCampfirePos();
    let nearestFireX = 0;
    let nearestFireY = 0;
    let nearestFireZ = 0;
    let nearestFireDistSq = Infinity;
    let hasActiveFire = false;

    if (isExterior) {
      for (let i = 0; i < this.fireZones.length; i++) {
        const fz = this.fireZones[i];
        const dx = fz.x - refX;
        const dz = fz.z - refZ;
        const dSq = dx * dx + dz * dz;
        if (dSq < nearestFireDistSq) {
          nearestFireDistSq = dSq;
          nearestFireX = fz.x;
          nearestFireY = fz.y;
          nearestFireZ = fz.z;
          hasActiveFire = true;
        }
      }
      if (!isSandbox) {
        const spots = this.worldEnv.burningSpots;
        for (let i = 0; i < spots.length; i++) {
          const spot = spots[i];
          const dx = spot.x - refX;
          const dz = spot.z - refZ;
          const dSq = dx * dx + dz * dz;
          if (dSq < nearestFireDistSq) {
            nearestFireDistSq = dSq;
            nearestFireX = spot.x;
            nearestFireY = spot.y;
            nearestFireZ = spot.z;
            hasActiveFire = true;
          }
        }
      }
    }

    let alertedZombies = 0;
    let hasThreatHint = false;
    let nearestThreatX = 0;
    let nearestThreatY = 0;
    let nearestThreatZ = 0;
    let bestDistantThreatSq = Infinity;

    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (
        e.state === 'chase' ||
        e.state === 'windup' ||
        e.state === 'lunge' ||
        e.state === 'attack'
      ) {
        alertedZombies += 1;
      }
      const dx = e.x - refX;
      const dz = e.z - refZ;
      const dSq = dx * dx + dz * dz;
      if (dSq >= 196 && dSq < bestDistantThreatSq) {
        bestDistantThreatSq = dSq;
        nearestThreatX = e.x;
        nearestThreatY = e.y;
        nearestThreatZ = e.z;
        hasThreatHint = true;
      }
    }

    s.dt = dt;
    s.elapsed = this.elapsed;
    s.gameState = this.gameState;
    s.activeZone = this.activeZone;
    s.isSandbox = isSandbox;
    s.insideFastFood = insideFastFood;
    s.dayFactor = dayFactor;
    s.twilight = twilight;
    s.playerX = useCamPos ? this.camera.position.x : this.px;
    s.playerY = useCamPos ? this.camera.position.y : this.py + 1.4;
    s.playerZ = useCamPos ? this.camera.position.z : this.pz;
    s.listenerX = useCamPos
      ? this.camera.position.x
      : THREE.MathUtils.lerp(this.px, this.camera.position.x, 0.35);
    s.listenerY = useCamPos
      ? this.camera.position.y
      : THREE.MathUtils.lerp(this.py + 1.5, this.camera.position.y, 0.45);
    s.listenerZ = useCamPos
      ? this.camera.position.z
      : THREE.MathUtils.lerp(this.pz, this.camera.position.z, 0.35);
    s.forwardX = _vec3.x;
    s.forwardY = _vec3.y;
    s.forwardZ = _vec3.z;
    s.upX = _vec3B.x;
    s.upY = _vec3B.y;
    s.upZ = _vec3B.z;
    s.campfireX = cf.x;
    s.campfireY = groundHeightAt(cf.x, cf.z);
    s.campfireZ = cf.z;
    s.campfireWarmth = this.campfireWarmth;
    s.nearestFireX = nearestFireX;
    s.nearestFireY = nearestFireY;
    s.nearestFireZ = nearestFireZ;
    s.hasActiveFire = hasActiveFire;
    s.colonEntranceX = COLON_ENTRANCE_X;
    s.colonEntranceY = groundHeightAt(COLON_ENTRANCE_X, COLON_ENTRANCE_Z);
    s.colonEntranceZ = COLON_ENTRANCE_Z;
    s.colonUnlocked = this.colonUnlocked;
    s.fastFoodX = FASTFOOD_CENTER_X;
    s.fastFoodY = groundHeightAt(FASTFOOD_CENTER_X, FASTFOOD_CENTER_Z);
    s.fastFoodZ = FASTFOOD_CENTER_Z;
    s.boilerX = COLON_BOILER_DOOR_POS.x;
    s.boilerY = COLON_BOILER_DOOR_POS.y;
    s.boilerZ = COLON_BOILER_DOOR_POS.z;
    s.alertedZombies = alertedZombies;
    s.nearestThreatX = nearestThreatX;
    s.nearestThreatY = nearestThreatY;
    s.nearestThreatZ = nearestThreatZ;
    s.hasThreatHint = hasThreatHint;
  }

  private getIntroCutsceneCaption(t: number): IntroCutsceneCaption | null {
    if (this.gameState !== 'INTRO_CUTSCENE') return null;
    if (t < 3.7) {
      return {
        tag: 'BUENOS AIRES · AÑO 2050',
        title: 'COLAPSO DEL BROTE C-50',
        text: 'La vacuna experimental mutó al 90% de la población. Las calles del centro porteño quedaron bajo el dominio de las jaurías.',
      };
    }
    if (t < 7.4) {
      return {
        tag: 'AV. 9 DE JULIO · OBELISCO',
        title: 'RICARDO LÓPEZ',
        text: 'Sin provisiones tras perder su hogar en el Conurbano, Ricardo avanza hacia la Avenida 9 de Julio en busca de aliados y un refugio.',
      };
    }
    return {
      tag: 'MISIÓN 1 · OBJETIVO PRIORITARIO',
      title: 'REFUGIO EN EL TEATRO COLÓN',
      text: 'Despeja las jaurías infectadas que bloquean la plaza y asegura el acceso norte del Teatro Colón antes del anochecer.',
    };
  }

  private updateIntroCutsceneCamera(t: number) {
    this.aimReticle.visible = false;
    if (t < 3.7) {
      // Beat 1: High sweeping establishing shot across wide Av. 9 de Julio & El Obelisco
      const p = THREE.MathUtils.clamp(t / 3.7, 0, 1);
      const ease = p * p * (3 - 2 * p);
      this.camera.position.set(
        THREE.MathUtils.lerp(31, 16, ease),
        THREE.MathUtils.lerp(22, 11, ease),
        THREE.MathUtils.lerp(36, 15, ease),
      );
      this.camera.lookAt(0, 6.8, -4);
    } else if (t < 7.4) {
      // Beat 2: Dramatic low-angle push around Ricardo López facing north up 9 de Julio
      const p = THREE.MathUtils.clamp((t - 3.7) / 3.7, 0, 1);
      const ease = p * p * (3 - 2 * p);
      const ang = THREE.MathUtils.lerp(-0.95, 0.48, ease);
      const r = THREE.MathUtils.lerp(5.2, 3.6, ease);
      this.camera.position.set(
        this.px + Math.sin(ang) * r,
        this.py + THREE.MathUtils.lerp(1.9, 1.55, ease),
        this.pz + Math.cos(ang) * r,
      );
      this.camera.lookAt(this.px, this.py + 1.35, this.pz - 1.5);
    } else {
      // Beat 3: Pan across the wider 9 de Julio corridor revealing Teatro Colón refuge
      const p = THREE.MathUtils.clamp((t - 7.4) / 3.6, 0, 1);
      const ease = p * p * (3 - 2 * p);
      this.camera.position.set(
        THREE.MathUtils.lerp(-6, -24, ease),
        THREE.MathUtils.lerp(7.8, 9.2, ease),
        THREE.MathUtils.lerp(-8, -22, ease),
      );
      this.camera.lookAt(
        THREE.MathUtils.lerp(COLON_ENTRANCE_X + 8, COLON_BUILDING_X + 5, ease),
        4.2,
        COLON_BUILDING_Z,
      );
    }
  }

  private getAllyCutsceneCaption(t: number): IntroCutsceneCaption | null {
    if (this.gameState !== 'ALLY_RESCUE_CUTSCENE') return null;
    if (t < 3.0) {
      return {
        tag: 'SALA DE MÁQUINAS · TEATRO COLÓN',
        title: 'SOBREVIVIENTE ACORRALADA',
        text: 'Con el último infectado abatido, la puerta trabada de las calderas cede desde adentro entre nubes de vapor.',
      };
    }
    if (t < 6.4) {
      return {
        tag: 'SOFÍA MÉNDEZ · QUÍMICA Y EXPLOSIVOS',
        title: 'NUEVA ALIADA',
        text: 'Sofía Méndez logra salir de la sala de máquinas tras días resistiendo sola: «¡Gracias! Escuché los disparos en la Platea y supe que quedaba alguien vivo.»',
      };
    }
    return {
      tag: 'SALA DORADA · BASE PERMANENTE',
      title: 'TALLER DE EXPLOSIVOS CASEROS',
      text: '«Soy química. Si aseguramos la Sala Dorada como base y traes alcohol, chatarra y pólvora de la 9 de Julio, fabricaré Molotovs y bombas de clavos.»',
    };
  }

  private startAllyRescueCutscene() {
    this.gameState = 'ALLY_RESCUE_CUTSCENE';
    this.missionPhase = 'rescue_ally';
    this.allyCutsceneTimer = 0;
    this.allySteamEmitTimer = 0;
    this.allyRescued = true;
    this.baseUnlocked = true;
    this.mission2Unlocked = true;
    this.isAiming = false;
    this.reloadTimer = 0;
    this.cancelPendingThrowable(true);
    this.muzzleFlashGroup.visible = false;
    this.muzzleFlashLight.intensity = 0;
    this.aimReticle.visible = false;
    this.heldKeys.clear();
    this.clearVirtualControls();
    this.exitPointerLockSafe();

    // Place Ricardo near boiler room corridor facing the boiler door
    this.px = -21.0;
    this.py = 0;
    this.pz = -23.8;
    this.pvx = 0;
    this.pvy = 0;
    this.pvz = 0;
    this.pyaw = Math.atan2(COLON_BOILER_DOOR_POS.x - this.px, COLON_BOILER_DOOR_POS.z - this.pz);
    this.playerRig.root.position.set(this.px, this.py, this.pz);
    this.playerRig.root.rotation.y = this.pyaw;

    this.colonInterior.boilerDoorPivot.rotation.y = 0;
    this.colonInterior.allyRig.root.visible = true;
    this.colonInterior.allyRig.root.position.set(-28.4, 0, -29.8);
    this.colonInterior.allyRig.root.rotation.y = Math.atan2(
      this.px - -28.4,
      this.pz - -29.8,
    );
    this.audio.playStoke();
    this.emitHud();
  }

  private updateAllyRescueCutscene(dt: number) {
    this.allyCutsceneTimer += dt;
    const t = this.allyCutsceneTimer;
    this.aimReticle.visible = false;

    // Swing barricaded boiler door open between 0.4s and 2.3s
    const doorT = THREE.MathUtils.clamp((t - 0.4) / 1.9, 0, 1);
    const doorEase = doorT * doorT * (3 - 2 * doorT);
    this.colonInterior.boilerDoorPivot.rotation.y = -1.65 * doorEase;

    // Emit dramatic steam hiss from boiler jets during door opening
    this.allySteamEmitTimer -= dt;
    if (this.allySteamEmitTimer <= 0 && t < 5.2) {
      this.allySteamEmitTimer = 0.08;
      this.colonInterior.steamJets.forEach((jet) => {
        this.spawnParticle(
          jet.x,
          jet.y,
          jet.z,
          jet.dx * (1.2 + Math.random() * 0.8),
          jet.dy * 1.2 + Math.random() * 0.6,
          jet.dz * (1.2 + Math.random() * 0.8),
          0.32,
          0.55,
          0.3,
          0.86,
          0.9,
          0.95,
        );
      });
    }

    // Sofia walks out of boiler room between t=2.0 and t=5.6, then waves
    const walkT = THREE.MathUtils.clamp((t - 2.0) / 3.4, 0, 1);
    const sx = THREE.MathUtils.lerp(-28.4, -23.6, walkT);
    const sz = THREE.MathUtils.lerp(-29.8, -25.4, walkT);
    this.colonInterior.allyRig.root.position.set(sx, 0, sz);
    this.colonInterior.allyRig.root.rotation.y = Math.atan2(this.px - sx, this.pz - sz);
    const isWalking = walkT > 0 && walkT < 1;
    const isWaving = walkT >= 1;
    animateAllyChemist(this.colonInterior.allyRig, this.elapsed, isWalking, isWaving, dt);

    if (!this.allyPrevPos.initialized) {
      this.allyPrevPos.x = sx;
      this.allyPrevPos.z = sz;
      this.allyPrevPos.initialized = true;
    }
    const allyStepDist = Math.hypot(sx - this.allyPrevPos.x, sz - this.allyPrevPos.z);
    this.allyPrevPos.x = sx;
    this.allyPrevPos.z = sz;
    if (isWalking && allyStepDist > 0.002) {
      this.allyFootstepDistAccum += allyStepDist;
      if (this.allyFootstepDistAccum >= 0.95) {
        this.allyFootstepDistAccum %= 0.95;
        this.allyFootstepLeft = !this.allyFootstepLeft;
        const aSurf = this.getFootstepSurfaceAt(sx, 0, sz);
        this.triggerActorFootstepVisual(
          sx,
          0,
          sz,
          this.colonInterior.allyRig.root.rotation.y,
          this.allyFootstepLeft,
          aSurf,
          'walk',
          this.allyShoeStain,
        );
        this.audio.playFootstep('walk', aSurf, this.allyFootstepLeft, 0.55);
      }
    } else {
      this.allyFootstepDistAccum = 0;
    }

    // Cinematic camera movement inside Boiler corridor
    if (t < 3.0) {
      const p = THREE.MathUtils.clamp(t / 3.0, 0, 1);
      this.camera.position.set(
        THREE.MathUtils.lerp(-18.5, -20.5, p),
        THREE.MathUtils.lerp(2.7, 2.1, p),
        THREE.MathUtils.lerp(-20.2, -23.2, p),
      );
      this.camera.lookAt(-26.8, 1.35, -28.6);
    } else if (t < 6.4) {
      const p = THREE.MathUtils.clamp((t - 3.0) / 3.4, 0, 1);
      this.camera.position.set(
        THREE.MathUtils.lerp(-20.5, -20.2, p),
        THREE.MathUtils.lerp(2.0, 1.75, p),
        THREE.MathUtils.lerp(-26.5, -22.8, p),
      );
      this.camera.lookAt(sx, 1.35, sz);
    } else {
      const p = THREE.MathUtils.clamp((t - 6.4) / 3.1, 0, 1);
      this.camera.position.set(
        THREE.MathUtils.lerp(-20.2, -19.2, p),
        THREE.MathUtils.lerp(1.75, 2.35, p),
        THREE.MathUtils.lerp(-22.8, -21.2, p),
      );
      this.camera.lookAt((this.px + sx) * 0.5, 1.3, (this.pz + sz) * 0.5);
    }

    if (t >= this.allyCutsceneDuration) {
      this.completeMission2();
    }
  }

  private updateMissionCompleteCamera(dt: number) {
    this.aimReticle.visible = false;
    if (this.activeZone === 'colon_interior') {
      const orbit = this.missionCompleteTimer * 0.3;
      const cx = 0 + Math.sin(orbit) * 10.5;
      const cz = 6.0 + Math.cos(orbit * 0.7) * 5.0;
      const alpha = 1 - Math.exp(-3.5 * dt);
      this.camera.position.x += (cx - this.camera.position.x) * alpha;
      this.camera.position.y += (5.8 - this.camera.position.y) * alpha;
      this.camera.position.z += (cz - this.camera.position.z) * alpha;
      this.camera.lookAt(0, 3.2, -14);
      return;
    }
    const orbit = this.missionCompleteTimer * 0.35;
    const cx = COLON_ENTRANCE_X + 9.5 * Math.cos(orbit * 0.45);
    const cz = COLON_ENTRANCE_Z + 10.5 + 3.5 * Math.sin(orbit * 0.45);
    const cy = groundHeightAt(cx, cz) + 4.8;
    const alpha = 1 - Math.exp(-3.5 * dt);
    this.camera.position.x += (cx - this.camera.position.x) * alpha;
    this.camera.position.y += (cy - this.camera.position.y) * alpha;
    this.camera.position.z += (cz - this.camera.position.z) * alpha;
    this.camera.lookAt(COLON_BUILDING_X + 7, 3.8, COLON_BUILDING_Z);
  }

  private updateTitleCamera(dt: number) {
    this.titleOrbitAngle += dt * 0.1;
    const isSandbox = this.mapSettings.mapPreset === 'custom_sandbox';
    if (isSandbox) {
      const targetX = Math.sin(this.titleOrbitAngle) * 14.0;
      const targetZ = Math.cos(this.titleOrbitAngle) * 14.0;
      this.camera.position.set(targetX, 5.2, targetZ);
      this.camera.lookAt(0, 1.8, 0.5);
    } else {
      // Frame the post-apocalyptic 9 de Julio vista (Obelisco, overgrown BA, giant corner tree & broken screens)
      const driftX = Math.sin(this.titleOrbitAngle) * 6.0;
      const driftZ = Math.cos(this.titleOrbitAngle) * 5.0;
      this.camera.position.set(22.5 + driftX, 13.8, 28.5 + driftZ);
      this.camera.lookAt(-8.0, 9.6, -2.0);
    }
    this.aimReticle.visible = false;
  }

  private updateCampfireAndParticles(dt: number) {
    if (this.activeZone === 'exterior_9_julio') {
      const flicker =
        1 + Math.sin(this.elapsed * 11) * 0.08 + Math.cos(this.elapsed * 17.3) * 0.06;
      const warmthScale = 0.65 + (this.campfireWarmth / 100) * 0.55;
      this.campfireLight.intensity = 6.6 * flicker * warmthScale;
      this.campfireVisuals.flameCluster.update(
        this.elapsed,
        warmthScale,
        warmthScale * flicker,
        1.0,
      );

      this.ambientEmberTimer -= dt;
      if (this.ambientEmberTimer <= 0) {
        this.ambientEmberTimer = 0.14;
        const cf = this.getCampfirePos();
        this.spawnParticle(
          cf.x + (Math.random() - 0.5) * 0.85,
          groundHeightAt(cf.x, cf.z) + 1.55,
          cf.z + (Math.random() - 0.5) * 0.85,
          (Math.random() - 0.5) * 0.65,
          1.7 + Math.random() * 1.4,
          (Math.random() - 0.5) * 0.65,
          0.9 + Math.random() * 0.6,
          0.85,
          -0.4,
          1.0,
          0.52 + Math.random() * 0.35,
          0.1,
        );
      }

      this.campfireSmokeTimer -= dt;
      if (this.campfireSmokeTimer <= 0) {
        this.campfireSmokeTimer = 0.11;
        const cf = this.getCampfirePos();
        const shade = 0.13 + Math.random() * 0.08;
        this.spawnSmokePuff(
          cf.x + (Math.random() - 0.5) * 0.65,
          groundHeightAt(cf.x, cf.z) + 1.75 + Math.random() * 0.35,
          cf.z + (Math.random() - 0.5) * 0.65,
          0.22 + (Math.random() - 0.5) * 0.38,
          1.55 + Math.random() * 0.9,
          -0.14 + (Math.random() - 0.5) * 0.38,
          1.9 + Math.random() * 1.1,
          0.42 * warmthScale,
          2.2 * warmthScale,
          shade,
          shade,
          shade + 0.015,
          0.42,
        );
      }

      this.worldFireSmokeTimer -= dt;
      if (this.worldFireSmokeTimer <= 0 && this.worldEnv.burningSpots.length > 0) {
        this.worldFireSmokeTimer = 0.14;
        for (let b = 0; b < this.worldEnv.burningSpots.length; b++) {
          const spot = this.worldEnv.burningSpots[b];
          const dx = spot.x - this.px;
          const dz = spot.z - this.pz;
          if (dx * dx + dz * dz > 78 * 78) continue;
          const shade = 0.1 + Math.random() * 0.07;
          this.spawnSmokePuff(
            spot.x + (Math.random() - 0.5) * spot.radius,
            spot.y + 0.3 + Math.random() * 0.5,
            spot.z + (Math.random() - 0.5) * spot.radius,
            0.35 + (Math.random() - 0.5) * 0.55,
            1.95 + Math.random() * 1.05,
            -0.18 + (Math.random() - 0.5) * 0.55,
            2.2 + Math.random() * 1.2,
            0.75,
            3.25,
            shade,
            shade,
            shade + 0.02,
            0.46,
          );
        }
      }
    }

    let anyActive = false;
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      anyActive = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        _mat4.makeScale(0, 0, 0);
        this.particleInst.setMatrixAt(i, _mat4);
        continue;
      }
      p.vy -= p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      const t = p.life / p.maxLife;
      const s = p.size * t;
      _vec3.set(p.x, p.y, p.z);
      _euler.set(p.life * 4, p.life * 6, 0);
      _quat.setFromEuler(_euler);
      _scale.set(s, s, s);
      _mat4.compose(_vec3, _quat, _scale);
      this.particleInst.setMatrixAt(i, _mat4);
      _color.setRGB(p.r, p.g, p.b);
      this.particleInst.setColorAt(i, _color);
    }
    if (anyActive) {
      this.particleInst.instanceMatrix.needsUpdate = true;
      if (this.particleInst.instanceColor) this.particleInst.instanceColor.needsUpdate = true;
    }

    let anySmoke = false;
    for (let i = 0; i < MAX_SMOKE_PARTICLES; i++) {
      const s = this.smokeParticles[i];
      if (!s.active) continue;
      anySmoke = true;
      s.life -= dt;
      if (s.life <= 0) {
        s.active = false;
        this.smokeAlphaArray[i] = 0;
        _mat4.makeScale(0, 0, 0);
        this.smokeInst.setMatrixAt(i, _mat4);
        continue;
      }
      const ageNorm = 1 - s.life / s.maxLife;
      const drag = Math.exp(-0.55 * dt);
      s.vx = s.vx * drag + 0.14 * dt;
      s.vz = s.vz * drag - 0.08 * dt;
      s.vy += 0.25 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.z += s.vz * dt;
      s.rot += s.vrot * dt;

      const fadeIn = Math.min(1, ageNorm / 0.18);
      const fadeOut = Math.pow(Math.max(0, 1 - ageNorm), 1.35);
      this.smokeAlphaArray[i] = s.maxOpacity * fadeIn * fadeOut;

      const sz = s.startSize + (s.endSize - s.startSize) * Math.pow(ageNorm, 0.72);
      _vec3.set(s.x, s.y, s.z);
      _vec3B.set(0, 0, 1);
      _quatB.setFromAxisAngle(_vec3B, s.rot);
      _quat.copy(this.camera.quaternion).multiply(_quatB);
      _scale.set(sz, sz, 1);
      _mat4.compose(_vec3, _quat, _scale);
      this.smokeInst.setMatrixAt(i, _mat4);
      const warmLift = ageNorm * 0.1;
      _color.setRGB(
        Math.min(1, s.r + warmLift),
        Math.min(1, s.g + warmLift),
        Math.min(1, s.b + warmLift),
      );
      this.smokeInst.setColorAt(i, _color);
    }
    if (anySmoke) {
      this.smokeInst.instanceMatrix.needsUpdate = true;
      if (this.smokeInst.instanceColor) this.smokeInst.instanceColor.needsUpdate = true;
      this.smokeAlphaAttr.needsUpdate = true;
    }
  }

  private spawnSmokePuff(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    life: number,
    startSize: number,
    endSize: number,
    r: number,
    g: number,
    b: number,
    maxOpacity = 0.44,
  ) {
    let slot: SmokeParticle | null = null;
    let oldest = this.smokeParticles[0];
    for (let i = 0; i < MAX_SMOKE_PARTICLES; i++) {
      const candidate = this.smokeParticles[i];
      if (!candidate.active) {
        slot = candidate;
        break;
      }
      if (candidate.life < oldest.life) {
        oldest = candidate;
      }
    }
    const target = slot ?? oldest;
    target.active = true;
    target.x = x;
    target.y = y;
    target.z = z;
    target.vx = vx;
    target.vy = vy;
    target.vz = vz;
    target.life = life;
    target.maxLife = life;
    target.startSize = startSize;
    target.endSize = endSize;
    target.rot = Math.random() * Math.PI * 2;
    target.vrot = (Math.random() - 0.5) * 1.1;
    target.r = r;
    target.g = g;
    target.b = b;
    target.maxOpacity = maxOpacity;
  }

  private spawnParticle(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    life: number,
    size: number,
    gravity: number,
    r: number,
    g: number,
    b: number,
  ) {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.x = x;
        p.y = y;
        p.z = z;
        p.vx = vx;
        p.vy = vy;
        p.vz = vz;
        p.life = life;
        p.maxLife = life;
        p.size = size;
        p.gravity = gravity;
        p.r = r;
        p.g = g;
        p.b = b;
        return;
      }
    }
  }

  private spawnBurst(
    x: number,
    y: number,
    z: number,
    count: number,
    r: number,
    g: number,
    b: number,
    speed = 6,
  ) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = speed * (0.4 + Math.random() * 0.8);
      this.spawnParticle(
        x,
        y,
        z,
        Math.cos(a) * spd,
        2.2 + Math.random() * 3.8,
        Math.sin(a) * spd,
        0.35 + Math.random() * 0.35,
        0.9 + Math.random() * 0.7,
        11.0,
        r,
        g,
        b,
      );
    }
  }

  private spawnBloodDroplet(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    size: number,
    splatChance: number,
    isSpitter = false,
    allowDecal = true,
    customRgb?: [number, number, number],
  ) {
    for (let i = 0; i < MAX_BLOOD_PARTICLES; i++) {
      const p = this.bloodParticles[i];
      if (!p.active) {
        p.active = true;
        p.x = x;
        p.y = y;
        p.z = z;
        p.vx = vx;
        p.vy = vy;
        p.vz = vz;
        p.life = 0.65 + Math.random() * 0.55;
        p.maxLife = p.life;
        p.size = size;
        p.splatted = false;
        p.splatChance = splatChance;
        p.allowDecal = allowDecal;
        if (customRgb) {
          p.r = customRgb[0];
          p.g = customRgb[1];
          p.b = customRgb[2];
        } else if (isSpitter) {
          p.r = 0.28 + Math.random() * 0.14;
          p.g = 0.48 + Math.random() * 0.18;
          p.b = 0.08;
        } else {
          const shade = 0.72 + Math.random() * 0.42;
          p.r = 0.56 * shade;
          p.g = 0.025 * shade;
          p.b = 0.035 * shade;
        }
        return;
      }
    }
  }

  private spawnDropletSpray(
    x: number,
    y: number,
    z: number,
    count: number,
    speed: number,
    r: number,
    g: number,
    b: number,
    sizeMin = 0.45,
    sizeMax = 0.95,
    upBias = 2.6,
  ) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = speed * (0.35 + Math.random() * 0.85);
      const jitter = 0.82 + Math.random() * 0.32;
      this.spawnBloodDroplet(
        x + (Math.random() - 0.5) * 0.12,
        y + Math.random() * 0.1,
        z + (Math.random() - 0.5) * 0.12,
        Math.cos(a) * spd,
        upBias * (0.5 + Math.random() * 0.9),
        Math.sin(a) * spd,
        sizeMin + Math.random() * (sizeMax - sizeMin),
        0,
        false,
        false,
        [Math.min(1, r * jitter), Math.min(1, g * jitter), Math.min(1, b * jitter)],
      );
    }
  }

  private spawnBloodSpray(
    x: number,
    y: number,
    z: number,
    dirX: number,
    dirY: number,
    dirZ: number,
    count: number,
    speed: number,
    spread: number,
    splatChance = 0.34,
    isSpitter = false,
  ) {
    const dirLen = Math.hypot(dirX, dirY, dirZ);
    const nx = dirLen > 0.001 ? dirX / dirLen : 0;
    const ny = dirLen > 0.001 ? dirY / dirLen : 0.6;
    const nz = dirLen > 0.001 ? dirZ / dirLen : 1;

    for (let i = 0; i < count; i++) {
      const spd = speed * (0.42 + Math.random() * 0.92);
      const vx = (nx + (Math.random() - 0.5) * spread * 2.15) * spd;
      const vy = (ny + (Math.random() - 0.25) * spread * 1.55) * spd + 1.2 + Math.random() * 2.3;
      const vz = (nz + (Math.random() - 0.5) * spread * 2.15) * spd;
      this.spawnBloodDroplet(
        x + (Math.random() - 0.5) * 0.06,
        y + (Math.random() - 0.5) * 0.06,
        z + (Math.random() - 0.5) * 0.06,
        vx,
        vy,
        vz,
        0.52 + Math.random() * 0.62,
        splatChance,
        isSpitter,
      );
    }
  }

  private spawnBloodDecal(
    x: number,
    z: number,
    targetRadius: number,
    maxOpacity = 0.9,
    expandDuration = 1.1,
    duration = 48,
    isSpitter = false,
    refY = this.py,
  ) {
    if (this.bloodDecals.length === 0) return;

    let slot: BloodDecal | null = null;
    let oldestActive = this.bloodDecals[0];
    for (let i = 0; i < this.bloodDecals.length; i++) {
      const candidate = this.bloodDecals[i];
      if (!candidate.active) {
        slot = candidate;
        break;
      }
      if (candidate.age > oldestActive.age) {
        oldestActive = candidate;
      }
    }
    if (!slot) slot = oldestActive;

    const textures = getBloodPuddleTextures();
    const tex = textures[Math.floor(Math.random() * textures.length)];
    const rotY = Math.random() * Math.PI * 2;
    const cosR = Math.cos(rotY);
    const sinR = Math.sin(rotY);
    const centerY = this.floorAt(x, z, refY);
    const size = targetRadius * 2;

    const posAttr = slot.geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < posAttr.count; i++) {
      const lx = slot.baseXZ[i * 2] * size;
      const lz = slot.baseXZ[i * 2 + 1] * size;
      const wx = x + (lx * cosR + lz * sinR);
      const wz = z + (-lx * sinR + lz * cosR);
      posAttr.setXYZ(i, lx, this.floorAt(wx, wz, centerY) + 0.024 - centerY, lz);
    }
    posAttr.needsUpdate = true;
    slot.geo.computeBoundingSphere();

    slot.mat.map = tex;
    slot.mat.color.setHex(isSpitter ? 0x6f8f34 : 0xffffff);
    slot.mat.opacity = maxOpacity * 0.4;

    slot.mesh.position.set(x, centerY, z);
    slot.mesh.rotation.y = rotY;
    slot.mesh.scale.set(0.32, 1, 0.32);
    slot.mesh.visible = true;

    slot.active = true;
    slot.x = x;
    slot.z = z;
    slot.age = 0;
    slot.duration = duration;
    slot.expandDuration = Math.max(0.08, expandDuration);
    slot.maxOpacity = maxOpacity;
  }

  private updateBloodParticles(dt: number) {
    let anyDirty = false;
    for (let i = 0; i < MAX_BLOOD_PARTICLES; i++) {
      const p = this.bloodParticles[i];
      if (!p.active) continue;
      anyDirty = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        _mat4.makeScale(0, 0, 0);
        this.bloodInst.setMatrixAt(i, _mat4);
        continue;
      }

      if (!p.splatted) {
        p.vy -= 19.5 * dt;
        const drag = Math.exp(-1.75 * dt);
        p.vx *= drag;
        p.vz *= drag;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;

        const gy = this.floorAt(p.x, p.z, p.y);
        if (p.y <= gy + 0.02) {
          p.y = gy + 0.02;
          p.splatted = true;
          p.life = Math.min(p.life, 0.14);
          p.maxLife = 0.14;
          if (p.allowDecal && Math.random() < p.splatChance) {
            this.spawnBloodDecal(
              p.x,
              p.z,
              0.11 + Math.random() * 0.14,
              0.78,
              0.1,
              28,
              p.g > 0.25,
              gy,
            );
          }
        }
      }

      if (p.splatted) {
        const t = Math.max(0, p.life / p.maxLife);
        const s = p.size * (1.1 + (1 - t) * 0.55);
        _vec3.set(p.x, p.y, p.z);
        _quat.identity();
        _scale.set(s * 1.42, Math.max(0.06, s * 0.16 * t), s * 1.42);
        _mat4.compose(_vec3, _quat, _scale);
      } else {
        const speed = Math.hypot(p.vx, p.vy, p.vz);
        _vec3.set(p.x, p.y, p.z);
        if (speed > 0.05) {
          _vec3B.set(p.vx / speed, p.vy / speed, p.vz / speed);
          _quat.setFromUnitVectors(_worldUp, _vec3B);
        } else {
          _quat.identity();
        }
        const t = Math.max(0.25, p.life / p.maxLife);
        const radiusScale = p.size * (0.52 + t * 0.48);
        const stretch = radiusScale * (1.05 + Math.min(3.1, speed * 0.22));
        _scale.set(radiusScale * 0.62, stretch, radiusScale * 0.62);
        _mat4.compose(_vec3, _quat, _scale);
      }

      this.bloodInst.setMatrixAt(i, _mat4);
      _color.setRGB(p.r, p.g, p.b);
      this.bloodInst.setColorAt(i, _color);
    }

    if (anyDirty) {
      this.bloodInst.instanceMatrix.needsUpdate = true;
      if (this.bloodInst.instanceColor) this.bloodInst.instanceColor.needsUpdate = true;
    }
  }

  private updateBloodDecals(dt: number) {
    const fadeDuration = 5.0;
    for (let i = 0; i < this.bloodDecals.length; i++) {
      const d = this.bloodDecals[i];
      if (!d.active) continue;
      d.age += dt;

      if (d.age >= d.duration) {
        d.active = false;
        d.mesh.visible = false;
        continue;
      }

      if (d.age < d.expandDuration) {
        const p = d.age / d.expandDuration;
        const ease = 1 - Math.pow(1 - p, 2.2);
        const sc = 0.32 + 0.68 * ease;
        d.mesh.scale.set(sc, 1, sc);
        d.mat.opacity = d.maxOpacity * (0.45 + 0.55 * ease);
      } else if (d.age >= d.duration - fadeDuration) {
        d.mesh.scale.set(1, 1, 1);
        const remain = Math.max(0, d.duration - d.age) / fadeDuration;
        d.mat.opacity = d.maxOpacity * remain;
      } else {
        d.mesh.scale.set(1, 1, 1);
        d.mat.opacity = d.maxOpacity;
      }
    }
  }

  private updateFootprintDecals(dt: number) {
    const fadeDuration = 4.5;
    for (let i = 0; i < this.footprintDecals.length; i++) {
      const fp = this.footprintDecals[i];
      if (!fp.active) continue;
      fp.age += dt;
      if (fp.age >= fp.duration) {
        fp.active = false;
        fp.mesh.visible = false;
        continue;
      }
      if (fp.age >= fp.duration - fadeDuration) {
        const remain = Math.max(0, fp.duration - fp.age) / fadeDuration;
        fp.mat.opacity = fp.maxOpacity * remain;
      } else {
        fp.mat.opacity = fp.maxOpacity;
      }
    }
  }

  private updateSeveredLimbs(dt: number) {
    for (let i = this.severedLimbChunks.length - 1; i >= 0; i--) {
      const c = this.severedLimbChunks[i];
      c.life -= dt;
      if (c.life <= 0) {
        this.scene.remove(c.group);
        c.dispose();
        this.severedLimbChunks.splice(i, 1);
        continue;
      }

      if (!c.grounded) {
        c.vy -= 20.5 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        c.z += c.vz * dt;
        c.rx += c.vrx * dt;
        c.ry += c.vry * dt;
        c.rz += c.vrz * dt;

        if (c.bleedTimer > 0 && Math.random() < 0.7) {
          c.bleedTimer -= dt;
          this.spawnBloodDroplet(
            c.x,
            c.y,
            c.z,
            c.vx * 0.25 + (Math.random() - 0.5) * 1.5,
            c.vy * 0.25 + (Math.random() - 0.5) * 1.3,
            c.vz * 0.25 + (Math.random() - 0.5) * 1.5,
            0.55,
            0.3,
          );
        }

        const gy = this.floorAt(c.x, c.z, c.y) + 0.11;
        if (c.y <= gy) {
          c.y = gy;
          if (Math.abs(c.vy) > 2.4) {
            c.vy = -c.vy * 0.34;
            c.vx *= 0.52;
            c.vz *= 0.52;
            c.vrx *= 0.48;
            c.vry *= 0.48;
            c.vrz *= 0.48;
            this.spawnBloodDecal(c.x, c.z, 0.44 + Math.random() * 0.22, 0.85, 0.22, 34, false, gy);
          } else {
            c.vy = 0;
            c.vx = 0;
            c.vz = 0;
            c.grounded = true;
            this.spawnBloodDecal(c.x, c.z, 0.56 + Math.random() * 0.2, 0.88, 0.35, 38, false, gy);
          }
        }

        c.group.position.set(c.x, c.y, c.z);
        c.group.rotation.set(c.rx, c.ry, c.rz);
      } else if (c.life < 1.5) {
        const fade = Math.max(0.01, c.life / 1.5);
        c.group.scale.setScalar(fade);
      }
    }
  }

  private updatePlaying(dt: number) {
    this.survivalTime += dt;
    this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    this.flareBufferTimer = Math.max(0, this.flareBufferTimer - dt);
    this.strikeCooldown = Math.max(0, this.strikeCooldown - dt);
    this.invulnTimer = Math.max(0, this.invulnTimer - dt);
    this.hurtFlashTimer = Math.max(0, this.hurtFlashTimer - dt);
    this.recoilTimer = Math.max(0, this.recoilTimer - dt);
    this.recoilKickAmount *= Math.exp(-15 * dt);
    this.camRecoilPitch = THREE.MathUtils.damp(this.camRecoilPitch, 0, 13, dt);
    this.camRecoilYaw = THREE.MathUtils.damp(this.camRecoilYaw, 0, 14, dt);
    this.fireBloom = Math.max(0, this.fireBloom - dt * (this.isAiming ? 3.2 : 2.5));
    this.meleeTimer = Math.max(0, this.meleeTimer - dt);
    this.playerHitAnimTimer = Math.max(0, this.playerHitAnimTimer - dt);
    if (this.throwAnimTimer > 0) {
      this.throwAnimTimer = Math.max(0, this.throwAnimTimer - dt);
      if (this.throwAnimTimer === 0) {
        this.syncWeaponVisibility();
      }
    }
    this.manualCameraCooldown = Math.max(0, this.manualCameraCooldown - dt);
    this.shakeTrauma = Math.max(0, this.shakeTrauma - dt * 1.9);

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 1;
    }

    if (this.reloadTimer > 0) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.reloadTimer = 0;
        if (this.weapon === 'pistol' && this.pistolReserveAmmo > 0) {
          const needed = this.pistolMaxAmmo - this.pistolAmmo;
          const take = Math.min(needed, this.pistolReserveAmmo);
          this.pistolAmmo += take;
          this.pistolReserveAmmo -= take;
        } else if (this.weapon === 'rifle' && this.rifleReserveAmmo > 0) {
          const needed = this.rifleMaxAmmo - this.rifleAmmo;
          const take = Math.min(needed, this.rifleReserveAmmo);
          this.rifleAmmo += take;
          this.rifleReserveAmmo -= take;
        }
      }
    }

    // Continuous camera rotation from mobile touch camera buttons
    if (this.virtualCamVelYaw !== 0 || this.virtualCamVelPitch !== 0) {
      const rate = this.isAiming ? 1.55 : 2.35;
      this.rotateCameraBy(this.virtualCamVelYaw * rate * dt, this.virtualCamVelPitch * rate * dt);
    }

    // 1. Camera-relative WASD + Virtual Mobile Movement input
    let forwardIn = this.virtualMoveY;
    let rightIn = this.virtualMoveX;
    if (this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp')) forwardIn += 1;
    if (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown')) forwardIn -= 1;
    if (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight')) rightIn += 1;
    if (this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft')) rightIn -= 1;

    forwardIn = THREE.MathUtils.clamp(forwardIn, -1, 1);
    rightIn = THREE.MathUtils.clamp(rightIn, -1, 1);
    const inputMag = Math.min(1, Math.hypot(forwardIn, rightIn));

    const fwdX = -Math.sin(this.camYaw);
    const fwdZ = -Math.cos(this.camYaw);
    const rightX = Math.cos(this.camYaw);
    const rightZ = -Math.sin(this.camYaw);

    let moveX = fwdX * forwardIn + rightX * rightIn;
    let moveZ = fwdZ * forwardIn + rightZ * rightIn;
    const moveLen = Math.hypot(moveX, moveZ);
    if (moveLen > 0) {
      moveX = (moveX / moveLen) * inputMag;
      moveZ = (moveZ / moveLen) * inputMag;
    }

    const aimActiveInput = this.aimHeld || this.virtualAim || this.heldKeys.has('KeyV');
    const wantsSprint =
      (this.heldKeys.has('ShiftLeft') ||
        this.heldKeys.has('ShiftRight') ||
        this.virtualSprint) &&
      inputMag > 0.15 &&
      !aimActiveInput;
    const sprintHeld = wantsSprint && !this.staminaExhausted && this.stamina > 0;
    if (sprintHeld && this.isCrouching) {
      this.isCrouching = false;
    }
    if (sprintHeld) {
      this.stamina = Math.max(0, this.stamina - dt * 18);
      if (this.stamina <= 0.1) {
        this.staminaExhausted = true;
      }
    } else {
      const regenRate = inputMag < 0.1 ? 25 : 15;
      this.stamina = Math.min(this.maxStamina, this.stamina + dt * regenRate);
      if (this.staminaExhausted && this.stamina >= 18) {
        this.staminaExhausted = false;
      }
    }

    this.isAiming = aimActiveInput;
    this.crouchFactor = THREE.MathUtils.damp(
      this.crouchFactor,
      this.isCrouching ? 1 : 0,
      14,
      dt,
    );

    const unarmedBonus =
      this.weapon === 'unarmed' || this.weapon === 'stick' || this.weapon === 'baton' ? 0.6 : 0;
    const moveSpeed = this.isCrouching
      ? 2.85 + unarmedBonus * 0.55
      : sprintHeld
        ? 9.2 + unarmedBonus
        : this.isAiming || this.bowDrawProgress > 0.05
          ? 4.0
          : 5.5 + unarmedBonus;

    const targetVx = moveX * moveSpeed;
    const targetVz = moveZ * moveSpeed;
    const accel = 1 - Math.exp(-(this.grounded ? 15 : 6) * dt);
    this.pvx += (targetVx - this.pvx) * accel;
    this.pvz += (targetVz - this.pvz) * accel;
    if (inputMag === 0 && Math.hypot(this.pvx, this.pvz) < 0.08) {
      this.pvx = 0;
      this.pvz = 0;
    }

    this.px += this.pvx * dt;
    this.pz += this.pvz * dt;
    if (this.isTutorialMode) {
      this.tutorialMovedDist += Math.hypot(this.pvx * dt, this.pvz * dt);
    }

    // Soft-solid separation between player and living zombies before wall clamping
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (Math.abs(e.y - this.py) > 1.75) continue;
      const dx = this.px - e.x;
      const dz = this.pz - e.z;
      const minSep = e.radius + 0.52;
      const dSq = dx * dx + dz * dz;
      if (dSq < minSep * minSep && dSq > 0.000001) {
        const d = Math.sqrt(dSq);
        const push = ((minSep - d) * 0.5) / d;
        this.px += dx * push;
        this.pz += dz * push;
        e.x -= dx * push;
        e.z -= dz * push;
      }
    }

    // Colliders & playable radius
    const cfPos = this.getCampfirePos();
    if (this.activeZone === 'colon_interior') {
      const resolved = this.colonInterior.resolveCircleAndWalls(this.px, this.py, this.pz, 0.52);
      this.px = resolved.x;
      this.pz = resolved.z;
    } else {
      const resolvedExt = this.resolveExteriorCollisions(this.px, this.py, this.pz, 0.55, true);
      this.px = resolvedExt.x;
      this.pz = resolvedExt.z;
    }

    // 2. Jump Impulse Anticipation & Vertical Physics
    const groundY = this.floorAt(this.px, this.pz, this.py);
    if (this.grounded && this.py - groundY > 0.55) {
      this.grounded = false;
    }
    if (this.grounded) {
      this.coyoteTimer = 0.12;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - dt);
    }

    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0 && this.jumpWindupTimer <= 0) {
      this.jumpBufferTimer = 0;
      this.coyoteTimer = 0;
      this.isCrouching = false;
      this.jumpWindupTimer = this.jumpWindupDuration;
      this.squashY = 0.86;
    }

    if (this.jumpWindupTimer > 0) {
      this.jumpWindupTimer -= dt;
      if (this.jumpWindupTimer <= 0) {
        this.jumpWindupTimer = 0;
        this.grounded = false;
        this.pvy = 8.1;
        this.pvx *= 1.07;
        this.pvz *= 1.07;
        this.stamina = Math.max(0, this.stamina - 8);
        this.squashY = 1.18;
        this.audio.playJump();
        this.spawnDropletSpray(this.px, groundY + 0.08, this.pz, 7, 2.8, 0.34, 0.32, 0.28, 0.35, 0.62, 2.1);
      }
    }

    const wasGrounded = this.grounded;
    const preLandVy = this.pvy;
    if (!this.grounded) {
      this.pvy -= 21.0 * dt;
      this.py += this.pvy * dt;
      if (this.py <= groundY) {
        this.py = groundY;
        this.pvy = 0;
        this.grounded = true;
        this.squashY = 0.78;
        this.spawnDropletSpray(this.px, groundY + 0.08, this.pz, 9, 3.2, 0.32, 0.3, 0.26, 0.38, 0.68, 2.0);
        if (!wasGrounded) {
          this.footstepDistAccum = 0;
          const landSurface = this.getPlayerFootstepSurface();
          this.audio.playLandStep(
            landSurface,
            THREE.MathUtils.clamp(Math.abs(preLandVy) / 10, 0.5, 1.35),
          );
          this.triggerActorFootstepVisual(
            this.px,
            this.py,
            this.pz,
            this.pyaw,
            this.footstepLeft,
            landSurface,
            'land',
            this.playerShoeStain,
          );
        }
      }
    } else {
      this.py = groundY;
    }

    const horizSpeed = Math.hypot(this.pvx, this.pvz);
    if (!this.grounded) this.stance = 'jump';
    else if (this.isCrouching) this.stance = 'crouch';
    else if (sprintHeld && horizSpeed > 5.8) this.stance = 'run';
    else if (horizSpeed > 0.6) this.stance = 'walk';
    else this.stance = 'idle';

    if (this.grounded && horizSpeed > 0.45) {
      this.footstepDistAccum += horizSpeed * dt;
      const stepStride = this.isCrouching ? 0.92 : sprintHeld ? 1.72 : 1.32;
      if (this.footstepDistAccum >= stepStride) {
        this.footstepDistAccum %= stepStride;
        this.footstepLeft = !this.footstepLeft;
        const stepMode: 'walk' | 'run' | 'crouch' = this.isCrouching
          ? 'crouch'
          : sprintHeld
            ? 'run'
            : 'walk';
        const speedRef = this.isCrouching ? 3.2 : sprintHeld ? 9.5 : 5.8;
        const stepSurface = this.getPlayerFootstepSurface();
        const moveYaw = horizSpeed > 0.65 ? Math.atan2(this.pvx, this.pvz) : this.pyaw;
        this.audio.playFootstep(
          stepMode,
          stepSurface,
          this.footstepLeft,
          THREE.MathUtils.clamp(horizSpeed / speedRef, 0.55, 1.25),
        );
        this.triggerActorFootstepVisual(
          this.px,
          this.py,
          this.pz,
          moveYaw,
          this.footstepLeft,
          stepSurface,
          stepMode,
          this.playerShoeStain,
        );
      }
    } else if (!this.grounded) {
      this.footstepDistAccum = 0;
    }

    const moveRatio = THREE.MathUtils.clamp(horizSpeed / 9.2, 0, 1);
    let targetSpread: number;
    if (this.weapon === 'unarmed' || this.weapon === 'stick' || this.weapon === 'baton') {
      targetSpread =
        (this.grounded ? 0.1 : 0.55) + moveRatio * 0.48 + (this.meleeTimer > 0 ? 0.28 : 0);
    } else if (this.weapon === 'bow') {
      const bowIdle = this.isAiming ? 0.2 : 0.48;
      const drawTighten = this.bowDrawProgress * 0.44;
      const movePenalty = moveRatio * (this.isAiming ? 0.16 : 0.34);
      const airPenalty = this.grounded ? 0 : 0.38;
      targetSpread = THREE.MathUtils.clamp(
        bowIdle - drawTighten + movePenalty + airPenalty,
        0.03,
        1.2,
      );
    } else {
      const baseIdle = this.weapon === 'rifle' ? 0.22 : 0.26;
      const stanceBase = this.isAiming
        ? this.weapon === 'rifle'
          ? 0.04
          : 0.06
        : this.isCrouching
          ? 0.14
          : baseIdle;
      const movePenalty = moveRatio * (this.isAiming ? 0.22 : 0.68);
      const airPenalty = this.grounded ? 0 : 0.42;
      const bloomPenalty = this.fireBloom * (this.isAiming ? 0.36 : 0.58);
      targetSpread = THREE.MathUtils.clamp(
        stanceBase + movePenalty + airPenalty + bloomPenalty,
        0.04,
        1.45,
      );
    }
    const spreadLambda = targetSpread > this.crosshairSpread ? 28 : 14;
    this.crosshairSpread = THREE.MathUtils.damp(
      this.crosshairSpread,
      targetSpread,
      spreadLambda,
      dt,
    );

    this.playerRig.root.position.set(this.px, this.py, this.pz);
    this.playerShadow.position.set(this.px, groundY + 0.025, this.pz);
    const heightAboveGround = Math.max(0, this.py - groundY);
    this.playerShadow.scale.setScalar(Math.max(0.45, 1 - heightAboveGround * 0.18));

    // 3. Free Over-the-Shoulder Camera Update BEFORE raycasting crosshair
    this.updateFreeCamera(dt);

    // 4. Raycast exact 3D aim point directly under the center crosshair (prioritizing zombie limbs)
    this.raycaster.setFromCamera(_vec2.set(0, 0), this.camera);
    const ray = this.raycaster.ray;
    _aimPlane.constant = -groundY;
    if (ray.intersectPlane(_aimPlane, _rayHit)) {
      const distToHit = _rayHit.distanceTo(this.camera.position);
      if (distToHit > 2.5 && distToHit < 45) {
        this.aimPoint.copy(_rayHit);
        this.aimPoint.y += 0.9;
      } else {
        this.aimPoint.copy(ray.origin).addScaledVector(ray.direction, 26);
      }
    } else {
      this.aimPoint.copy(ray.origin).addScaledVector(ray.direction, 26);
    }

    let bestAimT = 44;
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      const roughDist = Math.hypot(e.x - this.px, e.z - this.pz);
      if (roughDist > 42) continue;
      const ey = this.activeZone === 'colon_interior' ? e.y : groundHeightAt(e.x, e.z);
      _vec3.set(e.x, ey + 1.0, e.z);
      const approxPerpSq = ray.distanceSqToPoint(_vec3);
      if (approxPerpSq > (e.radius + 1.5) * (e.radius + 1.5)) continue;

      const vols = this.getEnemyLimbHitVolumes(e);
      for (let v = 0; v < vols.length; v++) {
        const vol = vols[v];
        _vec3.set(vol.x, vol.y, vol.z);
        const effR = vol.radius * 1.15;
        const dSq = ray.distanceSqToPoint(_vec3);
        if (dSq <= effR * effR) {
          const projT = _vec3B.copy(_vec3).sub(ray.origin).dot(ray.direction);
          if (projT > 1.0 && projT < bestAimT) {
            bestAimT = projT;
            this.aimPoint.copy(ray.origin).addScaledVector(ray.direction, projT);
          }
        }
      }
    }

    const aimYaw = Math.atan2(this.aimPoint.x - this.px, this.aimPoint.z - this.pz);
    const isFiring = this.fireHeld || this.virtualFire;

    // Body orientation: faces aim when aiming/firing or aiming a throwable, or movement direction when free-running
    const targetBodyYaw =
      this.isAiming || isFiring || this.recoilTimer > 0 || this.aimingThrowable !== null
        ? aimYaw
        : horizSpeed > 0.5
          ? Math.atan2(this.pvx, this.pvz)
          : aimYaw;
    const bodyDiff = Math.atan2(
      Math.sin(targetBodyYaw - this.pyaw),
      Math.cos(targetBodyYaw - this.pyaw),
    );
    this.pyaw += bodyDiff * (1 - Math.exp(-14 * dt));
    this.playerRig.root.rotation.y = this.pyaw;

    // Chase-cam alignment: gently follows behind the player while moving unless manually orbiting or backpedaling
    if (this.recenterCamTimer > 0) {
      this.recenterCamTimer = Math.max(0, this.recenterCamTimer - dt);
      const behindYaw = this.pyaw + Math.PI;
      const err = Math.atan2(Math.sin(behindYaw - this.camYaw), Math.cos(behindYaw - this.camYaw));
      this.camYaw += err * (1 - Math.exp(-12 * dt));
      this.camPitch = THREE.MathUtils.damp(this.camPitch, this.cameraSettings.normalPitch, 9, dt);
    } else if (
      !this.isAiming &&
      !isFiring &&
      this.aimingThrowable === null &&
      this.manualCameraCooldown <= 0 &&
      horizSpeed > 0.7 &&
      forwardIn >= -0.15
    ) {
      const behindYaw = this.pyaw + Math.PI;
      const yawErr = Math.atan2(
        Math.sin(behindYaw - this.camYaw),
        Math.cos(behindYaw - this.camYaw),
      );
      const followLambda = sprintHeld
        ? 3.6 + Math.abs(rightIn) * 2.2
        : 2.4 + Math.abs(rightIn) * 1.8;
      this.camYaw += yawErr * (1 - Math.exp(-followLambda * dt));
    }

    // Head tracking: smoothly rotates toward where the camera aims
    const rawHeadYaw = Math.atan2(Math.sin(aimYaw - this.pyaw), Math.cos(aimYaw - this.pyaw));
    const targetHeadYaw = THREE.MathUtils.clamp(rawHeadYaw, -1.05, 1.05);
    const targetHeadPitch = THREE.MathUtils.clamp(-this.camPitch * 0.85, -0.55, 0.55);
    this.headYawOffset = THREE.MathUtils.damp(this.headYawOffset, targetHeadYaw, 15, dt);
    this.headPitchOffset = THREE.MathUtils.damp(this.headPitchOffset, targetHeadPitch, 15, dt);

    if (this.aimingThrowable !== null) {
      this.updateThrowableArcPreview();
    } else {
      this.throwArcLine.visible = false;
      this.throwLandingRing.visible = false;
    }

    const holdingThrowableNow =
      this.equippedThrowable !== null || this.aimingThrowable !== null;
    const canTriggerActionNow =
      isFiring &&
      !holdingThrowableNow &&
      this.strikeCooldown <= 0 &&
      this.reloadTimer <= 0;
    const willFireGun =
      canTriggerActionNow &&
      ((this.weapon === 'pistol' && this.pistolAmmo > 0) ||
        (this.weapon === 'rifle' && this.rifleAmmo > 0));

    let isDrawingBow = false;
    let shouldReleaseBow = false;
    if (this.weapon === 'bow' && !holdingThrowableNow) {
      if (isFiring && this.strikeCooldown <= 0 && this.reloadTimer <= 0) {
        if (this.arrows <= 0) {
          if (!this.wasFiringBow) {
            this.wasFiringBow = true;
            this.setInventoryNotice('Sin flechas. Recoge flechas en el mapa.', 2.0);
            this.emitHud();
          }
        } else {
          this.wasFiringBow = true;
          isDrawingBow = true;
          if (!this.bowDrawSoundPlayed) {
            this.bowDrawSoundPlayed = true;
            this.audio.playBowDraw();
          }
          this.bowDrawProgress = Math.min(1, this.bowDrawProgress + dt / 0.55);
        }
      } else if (this.wasFiringBow) {
        if (this.arrows > 0 && this.bowDrawProgress > 0.05) {
          shouldReleaseBow = true;
        }
        this.wasFiringBow = false;
      }
    } else {
      this.wasFiringBow = false;
      this.bowDrawProgress = 0;
      this.bowDrawSoundPlayed = false;
    }

    if (willFireGun || isDrawingBow || shouldReleaseBow) {
      // Snap body and arm toward crosshair target before reading barrel tip / bow shelf world position
      this.pyaw = aimYaw;
      this.playerRig.root.rotation.y = this.pyaw;
    }

    this.updatePlayerAnimation(
      dt,
      horizSpeed,
      sprintHeld,
      willFireGun || isDrawingBow || shouldReleaseBow,
    );

    if (shouldReleaseBow) {
      this.fireBowArrow(Math.max(0.28, this.bowDrawProgress));
      this.bowDrawProgress = 0;
      this.bowDrawSoundPlayed = false;
    }

    // 5. Shoot Revolver / Rifle or Silent Melee when Unarmed / Stick / Baton (paused while holding/aiming a throwable)
    if (canTriggerActionNow && this.weapon !== 'bow') {
      if (this.weapon === 'unarmed' || this.weapon === 'stick' || this.weapon === 'baton') {
        this.performMeleeStrike();
      } else {
        this.fireEquippedWeapon();
      }
    }

    // 6. Fallback buffered Thermobaric detonation
    if (this.flareBufferTimer > 0 && this.flareCharge >= 100 && this.aimingThrowable === null) {
      this.flareBufferTimer = 0;
      this.triggerThermobaricGrenade();
    }

    if (this.inventoryNoticeTimer > 0) {
      this.inventoryNoticeTimer -= dt;
      if (this.inventoryNoticeTimer <= 0) {
        this.inventoryNotice = null;
      }
    }
    if (this.radioTimer > 0) {
      this.radioTimer -= dt;
      if (this.radioTimer <= 0) {
        this.radioSpeaker = null;
        this.radioMessage = null;
      }
    }
    this.playerBurnTickTimer = Math.max(0, this.playerBurnTickTimer - dt);

    // 7. Central Burn Barrel safe zone (exterior) or Teatro Colón base triggers (interior)
    const distToCamp = Math.hypot(this.px - cfPos.x, this.pz - cfPos.z);
    const nearCamp = this.activeZone === 'exterior_9_julio' && distToCamp <= CAMPFIRE_SAFE_RADIUS;
    if (this.activeZone === 'colon_interior') {
      this.nearColonEntrance = false;
      this.nearMechanicHelp = false;
      if (this.baseUnlocked && this.allyRescued) {
        this.nearWorkbench =
          this.py < 2.2 &&
          Math.hypot(this.px - COLON_WORKBENCH_POS.x, this.pz - COLON_WORKBENCH_POS.z) <= 3.6;
        this.nearExteriorExit =
          this.py < 2.2 &&
          Math.hypot(this.px - COLON_INTERIOR_EXIT_POS.x, this.pz - COLON_INTERIOR_EXIT_POS.z) <= 3.6;
        this.nearVehicleBay =
          this.py < 2.2 &&
          this.vehicleBayUnlocked &&
          Math.hypot(this.px - COLON_VEHICLE_BAY_POS.x, this.pz - COLON_VEHICLE_BAY_POS.z) <= 4.6;
        this.flareCharge = Math.min(100, this.flareCharge + dt * 4.5);
        if (this.nearWorkbench) {
          this.hp = Math.min(this.maxHp, this.hp + dt * 2.0);
        }
        animateAllyChemist(this.colonInterior.allyRig, this.elapsed, false, false, dt);
      } else {
        this.nearWorkbench = false;
        this.nearExteriorExit = false;
        this.nearVehicleBay = false;
      }
    } else {
      this.nearWorkbench = false;
      this.nearExteriorExit = false;
      this.nearVehicleBay = false;
      this.nearColonEntrance =
        this.missionPhase === 'scavenge_9_julio' &&
        Math.hypot(this.px - COLON_ENTRANCE_X, this.pz - COLON_ENTRANCE_Z) <= COLON_SAFE_RADIUS + 0.6;
      if (nearCamp) {
        this.flareCharge = Math.min(100, this.flareCharge + dt * 6.5);
        this.hp = Math.min(this.maxHp, this.hp + dt * 2.5);
        if (this.wood > 0 && distToCamp <= 3.0) {
          const spent = this.wood;
          if (this.hasBackpack) {
            for (let i = 0; i < this.inventory.length; i++) {
              if (this.inventory[i]?.kind === 'wood') this.inventory[i] = null;
            }
            this.hudInventoryDirty = true;
            this.syncInventoryCounters();
          } else {
            this.wood = 0;
          }
          this.hp = Math.min(this.maxHp, this.hp + spent * 10);
          this.campfireWarmth = Math.min(100, this.campfireWarmth + spent * 18);
          this.score += spent * 120;
          this.audio.playStoke();
          this.spawnBurst(
            cfPos.x,
            groundHeightAt(cfPos.x, cfPos.z) + 1.5,
            cfPos.z,
            16,
            1.0,
            0.72,
            0.16,
            7,
          );
        }
      } else {
        this.campfireWarmth = Math.max(25, this.campfireWarmth - dt * 1.1);
      }
    }

    this.updateEffects(dt);
    if (this.activeZone === 'exterior_9_julio') {
      this.updateHarvestNodes(dt);
      this.updateTrashSpots(dt);
    } else {
      this.nearTrashSpot = null;
    }
    this.updateProjectiles(dt);
    this.updateThrownThrowables(dt);
    this.updateDecoyRats(dt);
    this.updateFireZones(dt);
    this.updateNailShrapnels(dt);
    this.updatePickups(dt);
    this.updateEnemies(dt);
    this.ensureMissionWaveIntegrity();
    this.updateBurningEnemies(dt);
    this.updateDyingEnemies(dt);
    this.checkMissionSafeHouseReached();
    if (this.storyMission === 3) {
      this.updateMission3(dt);
    }
    if (this.isTutorialMode) {
      this.updateTutorialProgress();
    }

    this.hudSyncTimer -= dt;
    const targetHudInterval =
      this.hurtFlashTimer > 0 ||
      this.recoilTimer > 0 ||
      this.fireBloom > 0.03 ||
      this.bowDrawProgress > 0
        ? 0.025
        : 0.05;
    if (this.hudSyncTimer <= 0) {
      this.hudSyncTimer = targetHudInterval;
      this.emitHud();
    }
  }

  private performMeleeStrike() {
    const isStick = this.weapon === 'stick';
    const isBaton = this.weapon === 'baton';
    const hasMeleeWeapon = isStick || isBaton;
    if (this.playerRig.character.hasAction('attack') && this.playerRig.mixer && !hasMeleeWeapon) {
      const rawDur = Math.max(0.32, this.playerRig.character.getActionDuration('attack') || 0.72);
      const timeScale = THREE.MathUtils.clamp(rawDur / 0.48, 1.0, 2.2);
      const dur = rawDur / timeScale;
      this.meleeDuration = dur;
      this.meleeTimer = dur;
      this.strikeCooldown = Math.max(0.42, dur * 0.86);
      this.playerRig.character.setAction('attack', {
        fadeSec: 0.06,
        timeScale,
        forceRestart: true,
        oneShot: true,
      });
    } else {
      this.strikeCooldown = isBaton ? 0.38 : isStick ? 0.46 : 0.42;
      this.meleeDuration = isBaton ? 0.29 : isStick ? 0.34 : 0.28;
      this.meleeTimer = this.meleeDuration;
    }
    this.meleeHandSign *= -1;

    const fwdX = Math.sin(this.pyaw);
    const fwdZ = Math.cos(this.pyaw);
    let landed = false;
    let stealthKillCount = 0;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (Math.abs(e.y - this.py) > 1.8) continue;
      const dx = e.x - this.px;
      const dz = e.z - this.pz;
      const dist = Math.hypot(dx, dz);
      const baseReach = isBaton ? 2.35 : isStick ? 2.15 : 1.55;
      const reach = this.isCrouching ? e.radius + baseReach + 0.22 : e.radius + baseReach;
      if (dist <= reach && dist > 0.001) {
        const dot = (dx / dist) * fwdX + (dz / dist) * fwdZ;
        if (dot > (hasMeleeWeapon ? 0.16 : 0.26)) {
          const isStealthTakedown =
            this.isCrouching && (e.state === 'wander' || e.state === 'investigate');
          if (isStealthTakedown) {
            const takedownDmg =
              e.kind === 'brute' || e.enemyRole === 'gendarme_heavy'
                ? isBaton
                  ? 110
                  : isStick
                    ? 95
                    : 75
                : e.maxHp;
            this.damageEnemy(
              e,
              takedownDmg,
              (dx / dist) * (isBaton ? 9.5 : isStick ? 8.2 : 6.5),
              (dz / dist) * (isBaton ? 9.5 : isStick ? 8.2 : 6.5),
              'torso',
              { x: e.x, y: e.y + 1.1, z: e.z },
              { x: dx / dist, y: 0.1, z: dz / dist },
              true,
              true,
            );
            stealthKillCount += 1;
          } else {
            this.damageEnemy(
              e,
              isBaton ? 46 : isStick ? 34 : 18,
              (dx / dist) * (isBaton ? 16 : isStick ? 14 : 11),
              (dz / dist) * (isBaton ? 16 : isStick ? 14 : 11),
              'torso',
              { x: e.x, y: e.y + 1.05, z: e.z },
              { x: dx / dist, y: 0.1, z: dz / dist },
              hasMeleeWeapon,
            );
          }
          landed = true;
        }
      }
    }
    if (this.isTutorialMode && landed) {
      this.tutorialMeleeDone = true;
    }

    const meleeAudioPos = { x: this.px, y: this.py + 1.1, z: this.pz };
    if (stealthKillCount > 0) {
      this.audio.playStealthTakedown(meleeAudioPos);
      this.score += 120 * stealthKillCount;
      this.setInventoryNotice('¡Eliminación sigilosa!', 2.0);
    } else if (isBaton && landed) {
      this.audio.playBatonHit(meleeAudioPos);
      this.shakeTrauma = Math.min(0.32, this.shakeTrauma + 0.11);
    } else if (isStick && landed) {
      this.audio.playStickHit(meleeAudioPos);
      this.shakeTrauma = Math.min(0.3, this.shakeTrauma + 0.08);
    } else {
      this.audio.playChop(meleeAudioPos);
    }

    if (!landed && this.activeZone === 'exterior_9_julio') {
      for (let k = 0; k < this.worldEnv.harvestNodes.length; k++) {
        const n = this.worldEnv.harvestNodes[k];
        if (n.hp > 0 && Math.hypot(n.x - this.px, n.z - this.pz) <= (hasMeleeWeapon ? 2.35 : 2.0)) {
          this.damageSupplyNode(n, isBaton ? 36 : isStick ? 28 : 18);
          break;
        }
      }
    }
  }

  private fireBowArrow(drawFactor: number) {
    if (this.arrows <= 0) return;
    this.arrows -= 1;
    this.strikeCooldown = 0.28;
    this.recoilTimer = 0.14;
    this.recoilKickAmount = 0.24;
    this.syncWeaponVisibility();

    this.playerRig.root.updateMatrixWorld(true);
    this.playerRig.bowMount.getWorldPosition(_vec3);
    const launchX = Number.isFinite(_vec3.x) ? _vec3.x : this.px + Math.sin(this.pyaw) * 0.65;
    const launchY = Number.isFinite(_vec3.y)
      ? _vec3.y + 0.06
      : this.py + (1.36 - this.crouchFactor * 0.42);
    const launchZ = Number.isFinite(_vec3.z) ? _vec3.z : this.pz + Math.cos(this.pyaw) * 0.65;
    this.audio.playBowRelease({ x: launchX, y: launchY, z: launchZ });

    const camFwd = this.raycaster.ray.direction;
    let dx = this.aimPoint.x - launchX;
    let dy = this.aimPoint.y - launchY;
    let dz = this.aimPoint.z - launchZ;
    let len = Math.hypot(dx, dy, dz);
    const fwdDot =
      len > 0.001 ? (dx * camFwd.x + dy * camFwd.y + dz * camFwd.z) / len : 0;
    if (len < 1.2 || fwdDot < 0.35) {
      dx = camFwd.x;
      dy = camFwd.y;
      dz = camFwd.z;
      len = Math.max(0.001, Math.hypot(dx, dy, dz));
    }

    const dirX = dx / len;
    const dirY = dy / len;
    const dirZ = dz / len;
    const speed = 24 + drawFactor * 26;
    const damage = Math.round(42 + drawFactor * 38);
    const spreadBase = 0.002 + this.crosshairSpread * 0.022;
    const baseYaw = Math.atan2(dirX, dirZ);
    const yaw = baseYaw + (Math.random() - 0.5) * spreadBase;
    const shotDirY = THREE.MathUtils.clamp(
      dirY + (Math.random() - 0.5) * spreadBase * 0.5 + 0.025 * (1 - drawFactor * 0.5),
      -0.96,
      0.96,
    );
    const horizFactor = Math.sqrt(Math.max(0.02, 1 - shotDirY * shotDirY));

    this.spawnProjectile(
      true,
      launchX,
      launchY,
      launchZ,
      Math.sin(yaw) * horizFactor * speed,
      shotDirY * speed,
      Math.cos(yaw) * horizFactor * speed,
      damage,
      2.4,
      0.24,
      yaw,
      true,
    );

    // Silent projectile: minimal noise radius so nearby patrol isn't alarmed across the plaza
    this.alertNearbyZombies(2.5);
    this.emitHud();
  }

  private fireEquippedWeapon() {
    const isRifle = this.weapon === 'rifle';
    if (this.weapon === 'pistol') {
      if (this.pistolAmmo <= 0) {
        this.startReload();
        return;
      }
      this.pistolAmmo -= 1;
      this.strikeCooldown = 0.28;
      if (this.pistolAmmo === 0) this.startReload();
    } else if (isRifle) {
      if (this.rifleAmmo <= 0) {
        this.startReload();
        return;
      }
      this.rifleAmmo -= 1;
      this.strikeCooldown = 0.082;
      if (this.rifleAmmo === 0) this.startReload();
    } else {
      return;
    }
    if (this.isTutorialMode) {
      this.tutorialGunFired = true;
    }

    this.playerRig.root.updateMatrixWorld(true);
    const muzzleObj = isRifle ? this.playerRig.rifleMuzzle : this.playerRig.pistolMuzzle;
    muzzleObj.getWorldPosition(_vec3);
    const muzzleX = Number.isFinite(_vec3.x) ? _vec3.x : this.px + Math.sin(this.pyaw) * 0.85;
    const muzzleY = Number.isFinite(_vec3.y)
      ? _vec3.y
      : this.py + (1.32 - this.crouchFactor * 0.42);
    const muzzleZ = Number.isFinite(_vec3.z) ? _vec3.z : this.pz + Math.cos(this.pyaw) * 0.85;
    if (isRifle) {
      this.audio.playRifleShot({ x: muzzleX, y: muzzleY, z: muzzleZ });
    } else {
      this.audio.playPistolShot({ x: muzzleX, y: muzzleY, z: muzzleZ });
    }

    // Apply physical weapon kick, torso snap, and camera recoil AFTER capturing aligned muzzle position
    this.recoilTimer = isRifle ? 0.11 : 0.16;
    this.recoilKickAmount = Math.min(1, this.recoilKickAmount + (isRifle ? 0.22 : 0.42));
    this.camRecoilPitch = Math.max(
      isRifle ? -0.1 : -0.085,
      this.camRecoilPitch - (isRifle ? 0.0145 : 0.025),
    );
    this.camRecoilYaw = THREE.MathUtils.clamp(
      this.camRecoilYaw + (Math.random() - 0.5) * (isRifle ? 0.014 : 0.012),
      -0.05,
      0.05,
    );

    const bloomStep = isRifle
      ? this.isAiming
        ? 0.16
        : 0.25
      : this.isAiming
        ? 0.24
        : 0.36;
    this.fireBloom = Math.min(1, this.fireBloom + bloomStep);
    this.crosshairSpread = Math.min(1.45, this.crosshairSpread + bloomStep * 0.48);
    this.hudSyncTimer = Math.min(this.hudSyncTimer, 0.006);
    this.shakeTrauma = Math.min(0.45, this.shakeTrauma + (isRifle ? 0.09 : 0.14));

    const camFwd = this.raycaster.ray.direction;
    let dx = this.aimPoint.x - muzzleX;
    let dy = this.aimPoint.y - muzzleY;
    let dz = this.aimPoint.z - muzzleZ;
    let len = Math.hypot(dx, dy, dz);
    const fwdDot =
      len > 0.001 ? (dx * camFwd.x + dy * camFwd.y + dz * camFwd.z) / len : 0;
    if (len < 1.2 || fwdDot < 0.35) {
      dx = camFwd.x;
      dy = camFwd.y;
      dz = camFwd.z;
      len = Math.max(0.001, Math.hypot(dx, dy, dz));
    }
    const dirX = dx / len;
    const dirY = dy / len;
    const dirZ = dz / len;

    // Muzzle flash cone + 4-point star + dynamic light + gunpowder puffs right at the barrel tip
    this.muzzleFlashDuration = isRifle ? 0.055 : 0.068;
    this.muzzleFlashTimer = this.muzzleFlashDuration;
    this.muzzleFlashGroup.visible = true;
    this.muzzleFlashGroup.position.set(muzzleX, muzzleY, muzzleZ);
    this.muzzleFlashGroup.lookAt(muzzleX + dirX, muzzleY + dirY, muzzleZ + dirZ);
    this.muzzleFlashGroup.rotateZ(Math.random() * Math.PI * 2);
    const flashBaseScale = (isRifle ? 1.18 : 0.96) * (0.9 + Math.random() * 0.24);
    this.muzzleFlashGroup.scale.setScalar(flashBaseScale);
    this.muzzleFlashLight.position.set(
      muzzleX + dirX * 0.14,
      muzzleY + dirY * 0.14,
      muzzleZ + dirZ * 0.14,
    );
    this.muzzleFlashLight.intensity = isRifle ? 4.8 : 3.6;

    for (let s = 0; s < 3; s++) {
      this.spawnParticle(
        muzzleX + dirX * 0.08,
        muzzleY + dirY * 0.08,
        muzzleZ + dirZ * 0.08,
        dirX * (3.2 + Math.random() * 2.5) + (Math.random() - 0.5) * 0.9,
        dirY * 2.2 + 0.55 + Math.random() * 0.85,
        dirZ * (3.2 + Math.random() * 2.5) + (Math.random() - 0.5) * 0.9,
        0.14 + Math.random() * 0.08,
        0.22 + Math.random() * 0.12,
        -0.8,
        0.92,
        0.72,
        0.48,
      );
    }

    // Rifle deals higher damage and fires faster than the 8-round revolver
    const bulletDmg = isRifle ? 34 : 24;
    const boltSpeed = isRifle ? 58 : 42;
    const spreadBase =
      (isRifle ? 0.004 : 0.006) +
      this.crosshairSpread * (isRifle ? 0.044 : 0.052);
    const baseYaw = Math.atan2(dirX, dirZ);
    const yaw = baseYaw + (Math.random() - 0.5) * spreadBase;
    const shotDirY = THREE.MathUtils.clamp(
      dirY + (Math.random() - 0.5) * spreadBase * 0.65,
      -0.96,
      0.96,
    );
    const horizFactor = Math.sqrt(Math.max(0.02, 1 - shotDirY * shotDirY));

    this.spawnProjectile(
      true,
      muzzleX,
      muzzleY,
      muzzleZ,
      Math.sin(yaw) * horizFactor * boltSpeed,
      shotDirY * boltSpeed,
      Math.cos(yaw) * horizFactor * boltSpeed,
      bulletDmg,
      0.95,
      0.34,
      yaw,
    );

    // Gunshot alerts nearby zombies (FAL is much louder than revolver; wakes resting daytime zombies too)
    this.alertNearbyZombies(isRifle ? 18.0 : 9.0);
  }

  private triggerZombieSpotAnim(e: EnemyEntity) {
    const spotClip = e.bundle.clips?.['habilidad1'] ?? e.bundle.clips?.['alert'];
    if (spotClip && e.enemyRole !== 'gendarme_heavy' && e.kind !== 'brute') {
      const clipDur = spotClip.getClip().duration ?? 0.85;
      e.alertTimer = Math.max(e.alertTimer, THREE.MathUtils.clamp(clipDur * 0.82, 0.55, 1.15));
    }
    if (this.elapsed - this.lastZombieAlertAudio > 0.28) {
      this.lastZombieAlertAudio = this.elapsed;
      this.audio.playZombieAlert(e.kind, { x: e.x, y: e.y + 1.5, z: e.z });
    }
  }

  private alertNearbyZombies(radius: number) {
    const outerRadius = radius * 1.65;
    const rSq = radius * radius;
    const outerSq = outerRadius * outerRadius;
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      const dx = e.x - this.px;
      const dz = e.z - this.pz;
      const distSq = dx * dx + dz * dz;
      if ((e.state === 'wander' || e.state === 'investigate') && distSq <= rSq) {
        e.state = 'chase';
        e.provoked = true;
        e.suspicion = 1;
        e.aggroTimer = 6.5;
        e.squash = 1.1;
        this.triggerZombieSpotAnim(e);
      } else if (e.state === 'wander' && distSq <= outerSq) {
        e.state = 'investigate';
        e.suspicion = Math.max(e.suspicion, 0.6);
        e.investigateX = this.px;
        e.investigateZ = this.pz;
        e.investigateTimer = 4.2;
      }
    }
  }

  private triggerThermobaricGrenade(x = this.px, z = this.pz) {
    this.flareCharge = 0;
    const radius = 9.0;
    const damage = 85;
    const groundY = this.floorAt(x, z, this.py);

    this.audio.playFlare({ x, y: groundY + 0.6, z });
    this.hitstopTimer = 0.058;
    this.shakeTrauma = Math.min(1, this.shakeTrauma + 0.78);
    this.invulnTimer = Math.max(this.invulnTimer, 0.45);
    this.scatterLooseRocksExplosion(x, groundY, z, radius, 6.8);

    this.flareWaveTimer = 0.4;
    this.flareWaveMesh.visible = true;
    this.flareWaveMesh.position.set(x, groundY + 0.2, z);
    this.flareWaveMesh.scale.setScalar(1);
    (this.flareWaveMesh.material as THREE.MeshBasicMaterial).opacity = 0.95;

    this.spawnBurst(x, groundY + 0.8, z, 36, 1.0, 0.56, 0.14, 14);
    for (let s = 0; s < 12; s++) {
      const a = (s / 12) * Math.PI * 2 + Math.random() * 0.4;
      const spd = 1.2 + Math.random() * 2.8;
      const shade = 0.14 + Math.random() * 0.12;
      this.spawnSmokePuff(
        x + Math.cos(a) * 0.6,
        groundY + 0.6 + Math.random() * 0.8,
        z + Math.sin(a) * 0.6,
        Math.cos(a) * spd,
        2.4 + Math.random() * 1.8,
        Math.sin(a) * spd,
        1.8 + Math.random() * 1.0,
        0.95,
        3.6,
        shade,
        shade,
        shade + 0.02,
        0.54,
      );
    }
    this.alertNearbyZombies(21.0);

    const rSq = radius * radius;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (Math.abs(e.y - groundY) > 2.8) continue;
      const dx = e.x - x;
      const dz = e.z - z;
      const distSq = dx * dx + dz * dz;
      if (distSq <= rSq) {
        const dist = Math.sqrt(distSq);
        const nx = dist > 0.01 ? dx / dist : 1;
        const nz = dist > 0.01 ? dz / dist : 0;
        this.damageEnemy(e, damage, nx * 16, nz * 16);
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (!p.fromPlayer) {
        const pdx = p.x - x;
        const pdz = p.z - z;
        if (pdx * pdx + pdz * pdz <= rSq) {
          this.scene.remove(p.mesh);
          if (this.enemyBoltPool.length < 48) this.enemyBoltPool.push(p.mesh);
          this.projectiles.splice(i, 1);
        }
      }
    }
  }

  private spawnProjectile(
    fromPlayer: boolean,
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    damage: number,
    life: number,
    radius: number,
    yaw = 0,
    isArrow = false,
  ) {
    const isSpit = !fromPlayer && !isArrow;
    const pool = isArrow
      ? this.playerArrowPool
      : fromPlayer
        ? this.playerBoltPool
        : this.enemyBoltPool;
    let mesh = pool.pop();
    if (!mesh) {
      if (isArrow) {
        mesh = buildArrowProjectileMesh(this.customEquipmentTemplates.get('arrow') ?? null);
      } else if (isSpit) {
        mesh = buildSlimySpitGlobMesh();
      } else {
        mesh = new THREE.Mesh(this.playerBoltGeo, this.playerBoltMat);
        const trail = new THREE.Mesh(this.playerBoltTrailGeo, this.playerBoltTrailMat);
        mesh.add(trail);
      }
    }
    mesh.scale.set(1, 1, 1);
    if (!isArrow && fromPlayer && mesh.children[0]) {
      mesh.children[0].scale.set(1, 1, 0.08);
    }
    mesh.position.set(x, y, z);
    if (vx * vx + vy * vy + vz * vz > 0.000001) {
      mesh.lookAt(x + vx, y + vy, z + vz);
    } else {
      mesh.rotation.set(0, yaw, 0);
    }
    this.scene.add(mesh);
    this.projectiles.push({
      active: true,
      fromPlayer,
      isArrow,
      isSpit,
      spinSeed: Math.random() * 10,
      x,
      y,
      z,
      prevX: x,
      prevY: y,
      prevZ: z,
      vx,
      vy,
      vz,
      damage,
      life,
      radius,
      mesh,
    });
  }

  private spawnInitialSurvivalLoot() {
    const spots: { kind: LootKind; x: number; z: number }[] = [
      // Palos de madera cercanos al inicio y en las veredas para defensa inicial
      { kind: 'stick', x: -1.8, z: 10.5 },
      { kind: 'stick', x: 3.4, z: 7.2 },
      { kind: 'stick', x: -8.2, z: -2.0 },
      { kind: 'stick', x: 9.5, z: -6.0 },
      { kind: 'stick', x: 0.5, z: -15.5 },
      // Arco Recurvo y carcajes de flechas en Av. 9 de Julio
      { kind: 'bow', x: -10.8, z: 5.5 },
      { kind: 'arrows', x: -4.8, z: 5.0 },
      { kind: 'arrows', x: 11.2, z: -3.5 },
      { kind: 'arrows', x: -12.0, z: -17.0 },
      // Mochila garantizada cerca de la Plaza de la República para desbloquear el inventario de 8 espacios
      { kind: 'backpack', x: -5.4, z: -5.4 },
      // Bombas lanzables iniciales en el sector
      { kind: 'molotov', x: -5.2, z: 3.2 },
      { kind: 'nail_bomb', x: 5.2, z: 3.2 },
      { kind: 'molotov', x: 15.5, z: -4.2 },
      { kind: 'nail_bomb', x: -15.5, z: 4.2 },
      { kind: 'bandage', x: -4.2, z: 8.8 },
      { kind: 'food', x: 4.5, z: -7.5 },
      { kind: 'fal_ammo', x: -6.8, z: 0.4 },
      { kind: 'pistol_ammo', x: 6.8, z: 0.6 },
      { kind: 'bandage', x: -16.2, z: -12.8 },
      { kind: 'fal_ammo', x: 16.5, z: -12.5 },
      { kind: 'food', x: -17.2, z: 13.8 },
      { kind: 'pistol_ammo', x: 17.0, z: 13.5 },
      { kind: 'fal_ammo', x: 0, z: -22.5 },
      { kind: 'bandage', x: -24.5, z: 1.5 },
      // Objetos arrojadizos de distracción distribuidos en todo el mapa 9 de Julio
      { kind: 'bottle', x: -3.2, z: 7.4 },
      { kind: 'can', x: 3.6, z: 8.1 },
      { kind: 'brick', x: -8.5, z: -2.6 },
      { kind: 'bottle', x: 9.8, z: -4.5 },
      { kind: 'can', x: -12.2, z: 12.6 },
      { kind: 'brick', x: 12.6, z: 10.4 },
      { kind: 'bottle', x: -20.4, z: -6.8 },
      { kind: 'can', x: 20.8, z: -8.2 },
      { kind: 'brick', x: 2.2, z: -15.2 },
      { kind: 'bottle', x: -8.4, z: -24.6 },
      { kind: 'can', x: 8.8, z: -27.4 },
      { kind: 'brick', x: -14.8, z: -36.5 },
      { kind: 'bottle', x: 14.2, z: -38.0 },
      { kind: 'can', x: -6.4, z: -46.8 },
      { kind: 'brick', x: 6.8, z: -48.5 },
      // Provisiones extra en las nuevas cuadras de la 9 de Julio, Libertad, Suipacha y transversales
      { kind: 'bandage', x: -24.5, z: -39.5 },
      { kind: 'food', x: 24.5, z: -40.5 },
      { kind: 'fal_ammo', x: 0.0, z: -78.0 },
      { kind: 'pistol_ammo', x: 0.0, z: 78.0 },
      { kind: 'arrows', x: -70.5, z: -40.0 },
      { kind: 'molotov', x: 70.5, z: -40.0 },
      { kind: 'nail_bomb', x: -70.5, z: 40.0 },
      { kind: 'bandage', x: 70.5, z: 40.0 },
      { kind: 'food', x: -24.0, z: 78.0 },
      { kind: 'fal_ammo', x: 24.0, z: 78.0 },
      { kind: 'bottle', x: -70.5, z: 0.0 },
      { kind: 'can', x: 70.5, z: 0.0 },
    ];
    spots.forEach((s) => this.spawnPickup(s.kind, s.x, s.z));
  }

  private pickRandomSurvivalLootKind(): Exclude<LootKind, 'ember' | 'wood' | 'backpack'> {
    const r = Math.random();
    if (r < 0.17) return 'fal_ammo';
    if (r < 0.32) return 'pistol_ammo';
    if (r < 0.41) return 'arrows';
    if (r < 0.54) return 'bandage';
    if (r < 0.66) return 'food';
    if (r < 0.77) return 'molotov';
    if (r < 0.87) return 'nail_bomb';
    if (r < 0.92) return 'bottle';
    if (r < 0.96) return 'can';
    return 'brick';
  }

  private buildPickupVisual(
    kind: LootKind,
    customTemplate?: CustomObjectTemplate | null,
    equipmentFallback?: CustomEquipmentTemplate | null,
  ): { mesh: THREE.Object3D; disposeMesh?: () => void } {
    if (!customTemplate && !equipmentFallback && kind === 'ember') {
      const m = new THREE.Mesh(this.emberGeo, this.emberMat);
      m.castShadow = true;
      return { mesh: m };
    }
    if (!customTemplate && !equipmentFallback && kind === 'wood') {
      const m = new THREE.Mesh(this.woodGeo, this.woodMat);
      m.castShadow = true;
      return { mesh: m };
    }
    const built = buildLootMeshGroup(kind, customTemplate, equipmentFallback);
    return { mesh: built.group, disposeMesh: built.dispose };
  }

  private spawnPickup(kind: LootKind, x: number, z: number, bounce = true, spawnY?: number) {
    const customTemplate =
      this.objectOverrideTemplates.get(`loot_${kind}` as WorldObjectOverrideId) ?? null;
    const equipFallback = customTemplate ? null : this.getEquipmentTemplateForLoot(kind);
    const { mesh, disposeMesh } = this.buildPickupVisual(kind, customTemplate, equipFallback);
    const y = (spawnY ?? this.floorAt(x, z, this.py)) + 0.5;
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this.pickups.push({
      active: true,
      kind,
      x,
      y,
      z,
      vy: bounce ? 3.5 : 0.8,
      life:
        kind === 'backpack'
          ? Number.POSITIVE_INFINITY
          : kind === 'helmet' || kind === 'vest' || kind === 'baton'
            ? 90
            : kind === 'ember' || kind === 'wood'
              ? 24
              : 45,
      mesh,
      disposeMesh,
    });
  }

  private pickWanderTarget(fromX: number, fromZ: number, fromY = 0): { x: number; z: number } {
    if (this.activeZone === 'colon_interior') {
      for (let attempt = 0; attempt < 16; attempt++) {
        const a = Math.random() * Math.PI * 2;
        const dist = 2.4 + Math.random() * 4.8;
        const tx = THREE.MathUtils.clamp(fromX + Math.cos(a) * dist, -29.0, 29.0);
        const tz = THREE.MathUtils.clamp(fromZ + Math.sin(a) * dist, -31.0, 27.0);
        if (Math.hypot(tx - fromX, tz - fromZ) < 1.6) continue;
        const ty = this.colonInterior.resolveFloorHeight(tx, tz, fromY);
        if (Math.abs(ty - fromY) > 1.4) continue;
        return { x: tx, z: tz };
      }
      return { x: fromX, z: fromZ };
    }
    const cf = this.getCampfirePos();
    const isSandbox = this.mapSettings.mapPreset === 'custom_sandbox';
    const maxWanderX = (isSandbox ? ARENA_PLAYABLE_RADIUS : ARENA_HALF_X) - 4;
    const maxWanderZ = (isSandbox ? ARENA_PLAYABLE_RADIUS : ARENA_HALF_Z) - 4;
    for (let attempt = 0; attempt < 20; attempt++) {
      // Roam in street packs near current patrol sector
      const a = Math.random() * Math.PI * 2;
      const dist = 5.0 + Math.random() * 10.5;
      const tx = THREE.MathUtils.clamp(fromX + Math.cos(a) * dist, -maxWanderX, maxWanderX);
      const tz = THREE.MathUtils.clamp(fromZ + Math.sin(a) * dist, -maxWanderZ, maxWanderZ);
      if (Math.hypot(tx - fromX, tz - fromZ) < 3.0) continue;
      if (Math.hypot(tx - cf.x, tz - cf.z) < 4.0) continue;
      const blocked = this.worldEnv.colliders.some(
        (c) => Math.hypot(c.x - tx, c.z - tz) < c.radius + 1.35,
      );
      if (!blocked) {
        return { x: tx, z: tz };
      }
    }
    return { x: fromX, z: fromZ };
  }

  private findClearSpawnNear(targetX: number, targetZ: number): { x: number; z: number } {
    const isSandbox = this.mapSettings.mapPreset === 'custom_sandbox';
    for (let attempt = 0; attempt < 18; attempt++) {
      const ang = attempt === 0 ? 0 : Math.random() * Math.PI * 2;
      const rad = attempt === 0 ? 0 : 1.4 + Math.random() * 3.8;
      const cx = targetX + Math.cos(ang) * rad;
      const cz = targetZ + Math.sin(ang) * rad;
      if (isSandbox) {
        if (Math.hypot(cx, cz) > ARENA_PLAYABLE_RADIUS - 2.5) continue;
      } else if (Math.abs(cx) > ARENA_HALF_X - 2.5 || Math.abs(cz) > ARENA_HALF_Z - 2.5) {
        continue;
      }
      if (Math.hypot(cx - this.px, cz - this.pz) < 7.5) continue;
      const blocked = this.worldEnv.colliders.some(
        (c) => Math.hypot(c.x - cx, c.z - cz) < c.radius + 1.25,
      );
      if (!blocked) return { x: cx, z: cz };
    }
    return { x: targetX, z: targetZ };
  }

  private spawnMissionPack(
    centerX: number,
    centerZ: number,
    specs: Array<
      | EnemyKind
      | {
          kind: EnemyKind;
          carriedWeapon?: 'pistol' | 'rifle' | null;
          enemyRole?: EnemyRole;
          carriedGear?: EnemyCarriedGear;
        }
    >,
  ) {
    const activeSlots = this.getActiveZombieSlots();
    for (let i = 0; i < specs.length; i++) {
      const entry = specs[i];
      const kind = typeof entry === 'string' ? entry : entry.kind;
      const carriedWeapon = typeof entry === 'string' ? null : (entry.carriedWeapon ?? null);
      const enemyRole = typeof entry === 'string' ? undefined : entry.enemyRole;
      const carriedGear = typeof entry === 'string' ? undefined : entry.carriedGear;
      const ang = (i / Math.max(1, specs.length)) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
      const rad = i === 0 ? 0.5 : 2.1 + Math.random() * 1.6;
      const pt = this.findClearSpawnNear(
        centerX + Math.cos(ang) * rad,
        centerZ + Math.sin(ang) * rad,
      );
      let preferredSlotId: string | undefined;
      if (activeSlots.length > 0) {
        const effectiveRole = enemyRole ?? 'civilian';
        const matching = activeSlots.filter(
          (s) =>
            s.targetKind === 'all' ||
            (effectiveRole !== 'civilian' && s.targetKind === effectiveRole) ||
            (effectiveRole === 'civilian' && s.targetKind === kind),
        );
        const pool = matching.length > 0 ? matching : activeSlots;
        preferredSlotId = pool[i % pool.length]?.id;
      }
      this.spawnEnemyAt(
        kind,
        pt.x,
        pt.z,
        preferredSlotId,
        undefined,
        carriedWeapon,
        enemyRole,
        carriedGear,
      );
    }
  }

  private spawnMissionWave1Packs() {
    // Jauría 1 (3 infectados: Policía con Revólver y Bastón + Runner + Escupidor): Bloqueo de taxis al este del Obelisco
    this.spawnMissionPack(16.5, 4.5, [
      {
        kind: 'stalker',
        carriedWeapon: 'pistol',
        enemyRole: 'police',
        carriedGear: { revolver: true, pistolAmmo: 1, baton: true },
      },
      'runner',
      'spitter',
    ]);
    // Jauría 2 (4 infectados: Policía con Bastón + Gendarme con cargadores de Fusil + Mordedor + Acechador): Corredor oeste Metrobús
    this.spawnMissionPack(-17.0, -5.5, [
      {
        kind: 'stalker',
        enemyRole: 'police',
        carriedGear: { baton: true, pistolAmmo: 1 },
      },
      {
        kind: 'stalker',
        enemyRole: 'gendarme',
        carriedGear: { rifleMags: 2 },
      },
      'biter',
      'stalker',
    ]);
  }

  private spawnMissionWave2Packs() {
    // Jauría 3 (4 infectados: Gendarme con Fusil FAL + Runner + Escupidor + Mordedor): Cruce norte de Av. 9 de Julio
    this.spawnMissionPack(13.5, -24.0, [
      {
        kind: 'stalker',
        carriedWeapon: 'rifle',
        enemyRole: 'gendarme',
        carriedGear: { rifle: true, rifleMags: 1 },
      },
      'runner',
      'spitter',
      'biter',
    ]);
    // Jauría 4 (4 infectados: Policía + Escupidor + Gendarme + Gendarme Equipado con Casco, Chaleco y Munición FAL): Acceso Plaza Lavalle hacia Colón
    this.spawnMissionPack(-16.5, -27.5, [
      {
        kind: 'stalker',
        carriedWeapon: 'pistol',
        enemyRole: 'police',
        carriedGear: { revolver: true, baton: true },
      },
      'spitter',
      {
        kind: 'stalker',
        carriedWeapon: 'rifle',
        enemyRole: 'gendarme',
        carriedGear: { rifle: true, rifleMags: 2 },
      },
      {
        kind: 'brute',
        enemyRole: 'gendarme_heavy',
        carriedGear: { helmet: true, vest: true, rifleMags: 2 },
      },
    ]);
  }

  private spawnEnemy(
    kind: EnemyKind,
    onPerimeter = true,
    preferredSlotId?: string,
    carriedWeapon: 'pistol' | 'rifle' | null = null,
    enemyRole?: EnemyRole,
    carriedGear?: EnemyCarriedGear,
  ) {
    let x = 21;
    let z = 22;
    const cf = this.getCampfirePos();
    const isSandbox = this.mapSettings.mapPreset === 'custom_sandbox';
    for (let attempt = 0; attempt < 28; attempt++) {
      let cx: number;
      let cz: number;
      if (isSandbox) {
        const angle = Math.random() * Math.PI * 2;
        const dist = onPerimeter
          ? ARENA_PLAYABLE_RADIUS - 2.0 - Math.random() * 6.0
          : 17.5 + Math.random() * (ARENA_PLAYABLE_RADIUS - 20.0);
        cx = Math.cos(angle) * dist;
        cz = Math.sin(angle) * dist;
      } else if (onPerimeter) {
        const edge = attempt % 4;
        const inset = 5.5 + Math.random() * 14.0;
        if (edge === 0) {
          cx = (Math.random() * 2 - 1) * (ARENA_HALF_X - 8);
          cz = -(ARENA_HALF_Z - inset);
        } else if (edge === 1) {
          cx = (Math.random() * 2 - 1) * (ARENA_HALF_X - 8);
          cz = ARENA_HALF_Z - inset;
        } else if (edge === 2) {
          cx = -(ARENA_HALF_X - inset);
          cz = (Math.random() * 2 - 1) * (ARENA_HALF_Z - 8);
        } else {
          cx = ARENA_HALF_X - inset;
          cz = (Math.random() * 2 - 1) * (ARENA_HALF_Z - 8);
        }
      } else {
        cx = (Math.random() * 2 - 1) * (ARENA_HALF_X - 8);
        cz = (Math.random() * 2 - 1) * (ARENA_HALF_Z - 8);
      }
      if (Math.hypot(cx - this.px, cz - this.pz) < 12.5) continue;
      if (Math.hypot(cx - cf.x, cz - cf.z) < 6.0) continue;
      const blocked = this.worldEnv.colliders.some(
        (c) => Math.hypot(c.x - cx, c.z - cz) < c.radius + 1.35,
      );
      if (!blocked) {
        x = cx;
        z = cz;
        break;
      }
    }
    this.spawnEnemyAt(kind, x, z, preferredSlotId, undefined, carriedWeapon, enemyRole, carriedGear);
  }

  private spawnEnemyAt(
    kind: EnemyKind,
    x: number,
    z: number,
    preferredSlotId?: string,
    spawnY?: number,
    carriedWeapon: 'pistol' | 'rifle' | null = null,
    enemyRole?: EnemyRole,
    carriedGear?: EnemyCarriedGear,
  ): EnemyEntity {
    const diffScale =
      this.difficulty === 'pilgrim' ? 0.85 : this.difficulty === 'warden' ? 1.0 : 1.25;

    const resolvedRole: EnemyRole =
      enemyRole ??
      (carriedWeapon === 'rifle'
        ? 'gendarme'
        : carriedWeapon === 'pistol'
          ? 'police'
          : 'civilian');
    const resolvedGear: EnemyCarriedGear | undefined =
      carriedGear ??
      (resolvedRole === 'police'
        ? { revolver: carriedWeapon === 'pistol', pistolAmmo: 1, baton: carriedWeapon === null }
        : resolvedRole === 'gendarme'
          ? { rifle: carriedWeapon === 'rifle', rifleMags: 1 }
          : resolvedRole === 'gendarme_heavy'
            ? { helmet: true, vest: true, rifleMags: 2 }
            : undefined);

    const enemyId = this.nextEnemyId++;
    let chosenSlotId = preferredSlotId;
    let chosenTemplate =
      chosenSlotId && this.customZombieTemplates.has(chosenSlotId)
        ? (this.customZombieTemplates.get(chosenSlotId) ?? null)
        : null;
    if (!chosenTemplate) {
      const picked = this.pickCustomZombieSlotAndTemplate(kind, enemyId, resolvedRole);
      chosenSlotId = picked.slotId;
      chosenTemplate = picked.template;
    }

    const initialY = spawnY ?? this.floorAt(x, z, this.py);
    const bundle = buildEnemyMesh(
      kind,
      chosenTemplate,
      carriedWeapon,
      resolvedRole,
      resolvedGear,
      this.getZombieTransformsForSlot(chosenSlotId),
    );
    bundle.group.position.set(x, initialY, z);
    this.scene.add(bundle.group);

    const shadow = new THREE.Mesh(this.shadowGeo, this.shadowMat);
    const shadowScale = resolvedRole === 'gendarme_heavy' ? 1.35 : kind === 'brute' ? 1.65 : 1.0;
    shadow.scale.setScalar(shadowScale);
    shadow.position.set(x, initialY + 0.025, z);
    this.scene.add(shadow);

    const stats =
      resolvedRole === 'gendarme_heavy'
        ? { hp: 210, speed: 1.88, radius: 0.92, damage: 28, score: 340 }
        : kind === 'brute'
          ? { hp: 130, speed: 2.35, radius: 1.05, damage: 24, score: 240 }
          : kind === 'spitter'
            ? { hp: 52, speed: 2.85, radius: 0.7, damage: 14, score: 140 }
            : kind === 'runner'
              ? { hp: 38, speed: 4.15, radius: 0.62, damage: 13, score: 120 }
              : kind === 'biter'
                ? { hp: 48, speed: 3.65, radius: 0.65, damage: 17, score: 130 }
                : { hp: 44, speed: 3.25, radius: 0.65, damage: 14, score: 100 };

    const maxHp = Math.round(stats.hp * diffScale);
    const armorHelmetMaxHp =
      resolvedRole === 'gendarme_heavy' && resolvedGear?.helmet ? Math.round(90 * diffScale) : 0;
    const armorVestMaxHp =
      resolvedRole === 'gendarme_heavy' && resolvedGear?.vest ? Math.round(140 * diffScale) : 0;
    const wanderTarget = this.pickWanderTarget(x, z, initialY);
    const initialYaw = Math.atan2(wanderTarget.x - x, wanderTarget.z - z);

    const walkStyle: 'orco' | 'ogro' | 'inestable' | 'run' =
      resolvedRole === 'gendarme_heavy' || kind === 'brute'
        ? 'ogro'
        : resolvedRole === 'police' || resolvedRole === 'gendarme'
          ? 'inestable'
          : kind === 'spitter'
            ? 'orco'
            : kind === 'runner' || kind === 'biter'
              ? 'run'
              : 'inestable';

    const entity: EnemyEntity = {
      id: enemyId,
      kind,
      x,
      y: initialY,
      z,
      vx: 0,
      vz: 0,
      yaw: initialYaw,
      hp: maxHp,
      maxHp,
      speed: stats.speed,
      radius: stats.radius,
      damage: Math.round(stats.damage * diffScale),
      scoreValue: stats.score,
      state: 'wander',
      stateTimer: 0,
      attackDuration: 0.46,
      hasHitThisAttack: false,
      attackCooldown: 0.5 + Math.random() * 0.5,
      wanderX: wanderTarget.x,
      wanderZ: wanderTarget.z,
      wanderWait: Math.random() * 1.4,
      investigateX: wanderTarget.x,
      investigateZ: wanderTarget.z,
      investigateTimer: 0,
      distractedTimer: 0,
      suspicion: 0,
      aggroTimer: 0,
      alertTimer: 0,
      hitReactTimer: 0,
      provoked: false,
      walkStyle,
      lungeDx: 0,
      lungeDz: 0,
      hitFlashTimer: 0,
      squash: 1,
      walkPhase: Math.random() * 6.28,
      customSlotId: chosenSlotId,
      limbHits: {
        head: 0,
        leftShoulder: 0,
        leftElbow: 0,
        rightShoulder: 0,
        rightElbow: 0,
        leftHip: 0,
        leftKnee: 0,
        rightHip: 0,
        rightKnee: 0,
      },
      severedLimbs: new Set<LimbId>(),
      bleedTimers: {
        head: 0,
        leftShoulder: 0,
        leftElbow: 0,
        rightShoulder: 0,
        rightElbow: 0,
        leftHip: 0,
        leftKnee: 0,
        rightHip: 0,
        rightKnee: 0,
      },
      stumpMeshes: {},
      crawlFactor: 0,
      burnTicksRemaining: 0,
      burnTickTimer: 0,
      carriedWeapon,
      enemyRole: resolvedRole,
      carriedGear: resolvedGear,
      armorHelmetHp: armorHelmetMaxHp,
      armorHelmetMaxHp,
      armorVestHp: armorVestMaxHp,
      armorVestMaxHp,
      bundle,
      shadow,
      mixerAccumDt: 0,
      lastAwarenessTier: 'calm',
      awarenessDisplayTimer: 0,
      awarenessDisplayMax: 2.5,
      poseInitialized: false,
    };
    this.initializeEnemyIdlePose(entity);
    this.enemies.push(entity);
    return entity;
  }

  private enemyHasLegLoss(e: EnemyEntity): boolean {
    return (
      e.severedLimbs.has('leftKnee') ||
      e.severedLimbs.has('leftHip') ||
      e.severedLimbs.has('rightKnee') ||
      e.severedLimbs.has('rightHip')
    );
  }

  private getEnemyLimbBoneNode(bundle: EnemyMeshBundle, limb: LimbId): THREE.Object3D | null {
    const b = bundle.bones;
    switch (limb) {
      case 'head':
        return b.head?.node ?? null;
      case 'leftShoulder':
        return b.leftArm?.node ?? null;
      case 'leftElbow':
        return b.leftForeArm?.node ?? null;
      case 'rightShoulder':
        return b.rightArm?.node ?? null;
      case 'rightElbow':
        return b.rightForeArm?.node ?? null;
      case 'leftHip':
        return b.leftUpLeg?.node ?? null;
      case 'leftKnee':
        return b.leftLeg?.node ?? null;
      case 'rightHip':
        return b.rightUpLeg?.node ?? null;
      case 'rightKnee':
        return b.rightLeg?.node ?? null;
    }
  }

  private getEnemyLimbHitVolumes(e: EnemyEntity): LimbHitVolume[] {
    if (e._cachedVols && e._cachedVolsFrame === this.frameCounter) {
      return e._cachedVols;
    }

    const ey = this.activeZone === 'colon_interior' ? e.y : groundHeightAt(e.x, e.z);
    const scaleH = e.kind === 'brute' ? 1.38 : e.kind === 'spitter' ? 1.05 : 1.0;
    const scaleW = e.kind === 'brute' ? 1.48 : e.kind === 'spitter' ? 1.12 : 1.0;
    const cf = e.crawlFactor;
    const crawlDrop = cf * 0.72;
    const cosY = Math.cos(e.yaw);
    const sinY = Math.sin(e.yaw);
    const rx = -cosY;
    const rz = sinY;
    const fwdShift = cf * 0.55;

    const volumes = (e._cachedVols ??= []);
    volumes.length = 0;
    const { bones } = e.bundle;
    e.bundle.group.updateMatrixWorld(true);

    if (!e.severedLimbs.has('head')) {
      if (bones.head) {
        bones.head.node.getWorldPosition(_vec3);
        volumes.push({
          limb: 'head',
          x: _vec3.x,
          y: _vec3.y + 0.1 * scaleH,
          z: _vec3.z,
          radius: 0.26 * scaleW,
        });
      } else {
        volumes.push({
          limb: 'head',
          x: e.x + sinY * fwdShift,
          y: ey + 1.58 * scaleH - crawlDrop * 1.15,
          z: e.z + cosY * fwdShift,
          radius: 0.26 * scaleW,
        });
      }
    }

    // Left Arm: Shoulder (upper arm) & Elbow (forearm/hand)
    if (!e.severedLimbs.has('leftShoulder')) {
      if (bones.leftArm && bones.leftForeArm) {
        bones.leftArm.node.getWorldPosition(_vec3);
        bones.leftForeArm.node.getWorldPosition(_vec3B);
        volumes.push({
          limb: 'leftShoulder',
          x: _vec3.x * 0.58 + _vec3B.x * 0.42,
          y: _vec3.y * 0.58 + _vec3B.y * 0.42,
          z: _vec3.z * 0.58 + _vec3B.z * 0.42,
          radius: 0.21 * scaleW,
        });
      } else {
        volumes.push({
          limb: 'leftShoulder',
          x: e.x - rx * 0.34 * scaleW + sinY * fwdShift * 0.7,
          y: ey + 1.24 * scaleH - crawlDrop,
          z: e.z - rz * 0.34 * scaleW + cosY * fwdShift * 0.7,
          radius: 0.21 * scaleW,
        });
      }

      if (!e.severedLimbs.has('leftElbow')) {
        if (bones.leftForeArm) {
          bones.leftForeArm.node.getWorldPosition(_vec3);
          if (bones.leftHand) {
            bones.leftHand.getWorldPosition(_vec3B);
            volumes.push({
              limb: 'leftElbow',
              x: (_vec3.x + _vec3B.x) * 0.5,
              y: (_vec3.y + _vec3B.y) * 0.5,
              z: (_vec3.z + _vec3B.z) * 0.5,
              radius: 0.21 * scaleW,
            });
          } else {
            volumes.push({
              limb: 'leftElbow',
              x: _vec3.x + sinY * 0.1 * scaleW,
              y: _vec3.y - 0.14 * scaleH * (1 - cf * 0.65),
              z: _vec3.z + cosY * 0.1 * scaleW,
              radius: 0.21 * scaleW,
            });
          }
        } else {
          volumes.push({
            limb: 'leftElbow',
            x: e.x - rx * 0.36 * scaleW + sinY * (0.2 + fwdShift),
            y: ey + 0.96 * scaleH - crawlDrop * 0.95,
            z: e.z - rz * 0.36 * scaleW + cosY * (0.2 + fwdShift),
            radius: 0.21 * scaleW,
          });
        }
      }
    }

    // Right Arm: Shoulder (upper arm) & Elbow (forearm/hand)
    if (!e.severedLimbs.has('rightShoulder')) {
      if (bones.rightArm && bones.rightForeArm) {
        bones.rightArm.node.getWorldPosition(_vec3);
        bones.rightForeArm.node.getWorldPosition(_vec3B);
        volumes.push({
          limb: 'rightShoulder',
          x: _vec3.x * 0.58 + _vec3B.x * 0.42,
          y: _vec3.y * 0.58 + _vec3B.y * 0.42,
          z: _vec3.z * 0.58 + _vec3B.z * 0.42,
          radius: 0.21 * scaleW,
        });
      } else {
        volumes.push({
          limb: 'rightShoulder',
          x: e.x + rx * 0.34 * scaleW + sinY * fwdShift * 0.7,
          y: ey + 1.24 * scaleH - crawlDrop,
          z: e.z + rz * 0.34 * scaleW + cosY * fwdShift * 0.7,
          radius: 0.21 * scaleW,
        });
      }

      if (!e.severedLimbs.has('rightElbow')) {
        if (bones.rightForeArm) {
          bones.rightForeArm.node.getWorldPosition(_vec3);
          if (bones.rightHand) {
            bones.rightHand.getWorldPosition(_vec3B);
            volumes.push({
              limb: 'rightElbow',
              x: (_vec3.x + _vec3B.x) * 0.5,
              y: (_vec3.y + _vec3B.y) * 0.5,
              z: (_vec3.z + _vec3B.z) * 0.5,
              radius: 0.21 * scaleW,
            });
          } else {
            volumes.push({
              limb: 'rightElbow',
              x: _vec3.x + sinY * 0.1 * scaleW,
              y: _vec3.y - 0.14 * scaleH * (1 - cf * 0.65),
              z: _vec3.z + cosY * 0.1 * scaleW,
              radius: 0.21 * scaleW,
            });
          }
        } else {
          volumes.push({
            limb: 'rightElbow',
            x: e.x + rx * 0.36 * scaleW + sinY * (0.2 + fwdShift),
            y: ey + 0.96 * scaleH - crawlDrop * 0.95,
            z: e.z + rz * 0.36 * scaleW + cosY * (0.2 + fwdShift),
            radius: 0.21 * scaleW,
          });
        }
      }
    }

    // Left Leg: Hip (thigh) & Knee (shin/foot)
    if (!e.severedLimbs.has('leftHip')) {
      if (bones.leftUpLeg && bones.leftLeg) {
        bones.leftUpLeg.node.getWorldPosition(_vec3);
        bones.leftLeg.node.getWorldPosition(_vec3B);
        volumes.push({
          limb: 'leftHip',
          x: (_vec3.x + _vec3B.x) * 0.5,
          y: (_vec3.y + _vec3B.y) * 0.5,
          z: (_vec3.z + _vec3B.z) * 0.5,
          radius: 0.23 * scaleW,
        });
      } else if (bones.leftUpLeg) {
        bones.leftUpLeg.node.getWorldPosition(_vec3);
        volumes.push({
          limb: 'leftHip',
          x: _vec3.x,
          y: _vec3.y - 0.16 * scaleH,
          z: _vec3.z,
          radius: 0.23 * scaleW,
        });
      } else {
        volumes.push({
          limb: 'leftHip',
          x: e.x - rx * 0.18 * scaleW,
          y: ey + 0.64 * scaleH - crawlDrop * 0.4,
          z: e.z - rz * 0.18 * scaleW,
          radius: 0.23 * scaleW,
        });
      }

      if (!e.severedLimbs.has('leftKnee')) {
        if (bones.leftLeg) {
          bones.leftLeg.node.getWorldPosition(_vec3);
          if (bones.leftFoot) {
            bones.leftFoot.node.getWorldPosition(_vec3B);
            volumes.push({
              limb: 'leftKnee',
              x: (_vec3.x + _vec3B.x) * 0.5,
              y: (_vec3.y + _vec3B.y) * 0.5,
              z: (_vec3.z + _vec3B.z) * 0.5,
              radius: 0.22 * scaleW,
            });
          } else {
            volumes.push({
              limb: 'leftKnee',
              x: _vec3.x - sinY * cf * 0.16,
              y: _vec3.y - 0.18 * scaleH * (1 - cf * 0.7),
              z: _vec3.z - cosY * cf * 0.16,
              radius: 0.22 * scaleW,
            });
          }
        } else {
          volumes.push({
            limb: 'leftKnee',
            x: e.x - rx * 0.18 * scaleW - sinY * cf * 0.35,
            y: ey + 0.28 * scaleH * (1 - cf * 0.45),
            z: e.z - rz * 0.18 * scaleW - cosY * cf * 0.35,
            radius: 0.22 * scaleW,
          });
        }
      }
    }

    // Right Leg: Hip (thigh) & Knee (shin/foot)
    if (!e.severedLimbs.has('rightHip')) {
      if (bones.rightUpLeg && bones.rightLeg) {
        bones.rightUpLeg.node.getWorldPosition(_vec3);
        bones.rightLeg.node.getWorldPosition(_vec3B);
        volumes.push({
          limb: 'rightHip',
          x: (_vec3.x + _vec3B.x) * 0.5,
          y: (_vec3.y + _vec3B.y) * 0.5,
          z: (_vec3.z + _vec3B.z) * 0.5,
          radius: 0.23 * scaleW,
        });
      } else if (bones.rightUpLeg) {
        bones.rightUpLeg.node.getWorldPosition(_vec3);
        volumes.push({
          limb: 'rightHip',
          x: _vec3.x,
          y: _vec3.y - 0.16 * scaleH,
          z: _vec3.z,
          radius: 0.23 * scaleW,
        });
      } else {
        volumes.push({
          limb: 'rightHip',
          x: e.x + rx * 0.18 * scaleW,
          y: ey + 0.64 * scaleH - crawlDrop * 0.4,
          z: e.z + rz * 0.18 * scaleW,
          radius: 0.23 * scaleW,
        });
      }

      if (!e.severedLimbs.has('rightKnee')) {
        if (bones.rightLeg) {
          bones.rightLeg.node.getWorldPosition(_vec3);
          if (bones.rightFoot) {
            bones.rightFoot.node.getWorldPosition(_vec3B);
            volumes.push({
              limb: 'rightKnee',
              x: (_vec3.x + _vec3B.x) * 0.5,
              y: (_vec3.y + _vec3B.y) * 0.5,
              z: (_vec3.z + _vec3B.z) * 0.5,
              radius: 0.22 * scaleW,
            });
          } else {
            volumes.push({
              limb: 'rightKnee',
              x: _vec3.x - sinY * cf * 0.16,
              y: _vec3.y - 0.18 * scaleH * (1 - cf * 0.7),
              z: _vec3.z - cosY * cf * 0.16,
              radius: 0.22 * scaleW,
            });
          }
        } else {
          volumes.push({
            limb: 'rightKnee',
            x: e.x + rx * 0.18 * scaleW - sinY * cf * 0.35,
            y: ey + 0.28 * scaleH * (1 - cf * 0.45),
            z: e.z + rz * 0.18 * scaleW - cosY * cf * 0.35,
            radius: 0.22 * scaleW,
          });
        }
      }
    }

    if (bones.spine) {
      bones.spine.node.getWorldPosition(_vec3);
      volumes.push({
        limb: 'torso',
        x: _vec3.x,
        y: _vec3.y + 0.14 * scaleH * (1 - cf * 0.55),
        z: _vec3.z,
        radius: e.radius * 0.54,
      });
    } else {
      volumes.push({
        limb: 'torso',
        x: e.x + sinY * fwdShift * 0.4,
        y: ey + 1.02 * scaleH - crawlDrop * 0.9,
        z: e.z + cosY * fwdShift * 0.4,
        radius: e.radius * 0.54,
      });
    }

    e._cachedVolsFrame = this.frameCounter;
    return volumes;
  }

  private detectProjectileLimbHit(
    e: EnemyEntity,
    x0: number,
    y0: number,
    z0: number,
    x1: number,
    y1: number,
    z1: number,
    projRadius: number,
  ): { limb: LimbTarget; hitX: number; hitY: number; hitZ: number } | null {
    const segDx = x1 - x0;
    const segDy = y1 - y0;
    const segDz = z1 - z0;
    const segLenSq = segDx * segDx + segDy * segDy + segDz * segDz;
    const vols = this.getEnemyLimbHitVolumes(e);

    let bestHit: { limb: LimbTarget; hitX: number; hitY: number; hitZ: number } | null = null;
    let bestScore = Infinity;

    for (let i = 0; i < vols.length; i++) {
      const v = vols[i];
      const t =
        segLenSq > 1e-6
          ? THREE.MathUtils.clamp(
              ((v.x - x0) * segDx + (v.y - y0) * segDy + (v.z - z0) * segDz) / segLenSq,
              0,
              1,
            )
          : 1;
      const cx = x0 + segDx * t;
      const cy = y0 + segDy * t;
      const cz = z0 + segDz * t;
      const dSq = (v.x - cx) * (v.x - cx) + (v.y - cy) * (v.y - cy) + (v.z - cz) * (v.z - cz);
      const hitR = v.radius + projRadius * 0.45;
      if (dSq <= hitR * hitR) {
        // Prefer headshots and limb joints over torso overlap
        const priorityBias = v.limb === 'head' ? -0.02 : v.limb === 'torso' ? 0.36 : 0;
        const score = t + priorityBias;
        if (score < bestScore) {
          bestScore = score;
          bestHit = { limb: v.limb, hitX: cx, hitY: cy, hitZ: cz };
        }
      }
    }

    return bestHit;
  }

  private applySeveredLimbPose(
    bundle: EnemyMeshBundle,
    severedLimbs: Set<LimbId>,
    stumpMeshes: Partial<Record<LimbId, { mesh: THREE.Mesh; dispose: () => void }>>,
    bleedTimers?: Record<LimbId, number>,
    dt = 0,
    isSpitter = false,
  ) {
    if (severedLimbs.size === 0) return;
    bundle.bodyPivot.updateMatrixWorld(true);

    severedLimbs.forEach((limb) => {
      const boneNode = this.getEnemyLimbBoneNode(bundle, limb);
      if (boneNode) {
        boneNode.scale.setScalar(0.0001);
        boneNode.updateMatrixWorld(true);
        boneNode.getWorldPosition(_vec3);
        const stump = stumpMeshes[limb];
        if (stump) {
          if (stump.mesh.parent !== bundle.bodyPivot) {
            bundle.bodyPivot.add(stump.mesh);
          }
          _vec3B.copy(_vec3);
          bundle.bodyPivot.worldToLocal(_vec3B);
          stump.mesh.position.copy(_vec3B);
        }
        if (bleedTimers && dt > 0 && bleedTimers[limb] > 0) {
          bleedTimers[limb] = Math.max(0, bleedTimers[limb] - dt);
          if (Math.random() < (limb === 'head' ? 0.78 : 0.48)) {
            this.spawnBloodDroplet(
              _vec3.x + (Math.random() - 0.5) * 0.05,
              _vec3.y,
              _vec3.z + (Math.random() - 0.5) * 0.05,
              (Math.random() - 0.5) * 2.1,
              (limb === 'head' ? 3.2 : 1.4) + Math.random() * 2.2,
              (Math.random() - 0.5) * 2.1,
              0.46 + Math.random() * 0.48,
              0.26,
              isSpitter,
            );
          }
        }
      }
    });
  }

  private severEnemyLimb(
    e: EnemyEntity,
    limb: LimbId,
    hitPos?: { x: number; y: number; z: number },
    shotDir?: { x: number; y: number; z: number },
  ) {
    if (e.severedLimbs.has(limb)) return;
    if (limb === 'leftElbow' && e.severedLimbs.has('leftShoulder')) return;
    if (limb === 'rightElbow' && e.severedLimbs.has('rightShoulder')) return;
    if (limb === 'leftKnee' && e.severedLimbs.has('leftHip')) return;
    if (limb === 'rightKnee' && e.severedLimbs.has('rightHip')) return;

    const hadLegLossBefore = this.enemyHasLegLoss(e);

    const distalMap: Partial<Record<LimbId, LimbId>> = {
      leftShoulder: 'leftElbow',
      rightShoulder: 'rightElbow',
      leftHip: 'leftKnee',
      rightHip: 'rightKnee',
    };
    const distalLimb = distalMap[limb];
    const distalAlreadyGone = distalLimb ? e.severedLimbs.has(distalLimb) : false;

    if (distalLimb) {
      e.severedLimbs.add(distalLimb);
      e.bleedTimers[distalLimb] = 0;
      const oldDistalStump = e.stumpMeshes[distalLimb];
      if (oldDistalStump) {
        oldDistalStump.mesh.parent?.remove(oldDistalStump.mesh);
        oldDistalStump.dispose();
        delete e.stumpMeshes[distalLimb];
      }
    }

    e.severedLimbs.add(limb);
    e.bleedTimers[limb] = limb === 'head' ? 1.8 : 4.0;

    e.bundle.group.updateMatrixWorld(true);
    const boneNode = this.getEnemyLimbBoneNode(e.bundle, limb);
    let sx = hitPos?.x ?? e.x;
    let sy = hitPos?.y ?? e.y + 1.1;
    let sz = hitPos?.z ?? e.z;
    if (boneNode) {
      boneNode.getWorldPosition(_vec3);
      sx = _vec3.x;
      sy = _vec3.y;
      sz = _vec3.z;
    }

    const scaleMult = e.kind === 'brute' ? 1.38 : e.kind === 'spitter' ? 1.04 : 1.0;
    const stumpRadius =
      (limb === 'head'
        ? 0.056
        : limb === 'leftHip' || limb === 'rightHip'
          ? 0.048
          : limb === 'leftKnee' || limb === 'rightKnee'
            ? 0.04
            : limb === 'leftShoulder' || limb === 'rightShoulder'
              ? 0.036
              : 0.03) * scaleMult;
    const stump = buildBloodStumpMesh(stumpRadius);
    e.bundle.bodyPivot.add(stump.mesh);
    e.stumpMeshes[limb] = stump;

    // Launch tumbling severed limb piece
    const chunkBuilt = buildSeveredLimbMesh(limb, e.kind, distalAlreadyGone);
    const outDirX = (shotDir?.x ?? sx - this.px) * 0.72 + (Math.random() - 0.5) * 0.9;
    const outDirZ = (shotDir?.z ?? sz - this.pz) * 0.72 + (Math.random() - 0.5) * 0.9;
    const outLen = Math.max(0.01, Math.hypot(outDirX, outDirZ));
    const launchSpd = (limb === 'head' ? 5.2 : 4.2) + Math.random() * 2.5;

    chunkBuilt.group.position.set(sx, sy, sz);
    chunkBuilt.group.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    this.scene.add(chunkBuilt.group);
    this.severedLimbChunks.push({
      group: chunkBuilt.group,
      dispose: chunkBuilt.dispose,
      x: sx,
      y: sy,
      z: sz,
      vx: (outDirX / outLen) * launchSpd,
      vy: (limb === 'head' ? 5.6 : 4.2) + Math.random() * 2.2,
      vz: (outDirZ / outLen) * launchSpd,
      rx: chunkBuilt.group.rotation.x,
      ry: chunkBuilt.group.rotation.y,
      rz: chunkBuilt.group.rotation.z,
      vrx: (Math.random() - 0.5) * 14,
      vry: (Math.random() - 0.5) * 14,
      vrz: (Math.random() - 0.5) * 14,
      grounded: false,
      life: 11.5,
      bleedTimer: 1.5,
    });

    // Launch 2-3 small flesh/bone gore fragments ("en pedazos")
    const goreCount = limb === 'head' ? 3 : 2;
    for (let g = 0; g < goreCount; g++) {
      const gore = buildGoreChunkMesh(scaleMult * (0.85 + Math.random() * 0.45));
      const gSpd = 3.2 + Math.random() * 3.2;
      const gx = outDirX / outLen + (Math.random() - 0.5) * 1.1;
      const gz = outDirZ / outLen + (Math.random() - 0.5) * 1.1;
      const gLen = Math.max(0.01, Math.hypot(gx, gz));
      gore.group.position.set(sx, sy, sz);
      gore.group.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      this.scene.add(gore.group);
      this.severedLimbChunks.push({
        group: gore.group,
        dispose: gore.dispose,
        x: sx + (Math.random() - 0.5) * 0.1,
        y: sy + (Math.random() - 0.5) * 0.1,
        z: sz + (Math.random() - 0.5) * 0.1,
        vx: (gx / gLen) * gSpd,
        vy: 3.4 + Math.random() * 3.0,
        vz: (gz / gLen) * gSpd,
        rx: gore.group.rotation.x,
        ry: gore.group.rotation.y,
        rz: gore.group.rotation.z,
        vrx: (Math.random() - 0.5) * 18,
        vry: (Math.random() - 0.5) * 18,
        vrz: (Math.random() - 0.5) * 18,
        grounded: false,
        life: 9.0,
        bleedTimer: 1.0,
      });
    }

    const isSpitter = e.kind === 'spitter';
    this.spawnBloodSpray(
      sx,
      sy,
      sz,
      outDirX / outLen,
      0.55,
      outDirZ / outLen,
      limb === 'head' ? 34 : 26,
      7.8,
      1.05,
      0.46,
      isSpitter,
    );
    this.spawnBloodDecal(e.x, e.z, 0.58 + Math.random() * 0.25, 0.85, 0.35, 38, isSpitter, e.y);

    // Tactical combat effects on the zombie
    if (limb === 'head') {
      e.hp = 0;
    } else if (
      limb === 'leftShoulder' ||
      limb === 'rightShoulder' ||
      limb === 'leftElbow' ||
      limb === 'rightElbow'
    ) {
      const dmgMult = limb === 'leftShoulder' || limb === 'rightShoulder' ? 0.72 : 0.84;
      e.damage = Math.max(4, Math.round(e.damage * dmgMult));
      if (e.state === 'windup' || e.state === 'lunge') {
        e.state = 'recover';
        e.stateTimer = 0.35;
      }
    } else if (
      limb === 'leftHip' ||
      limb === 'rightHip' ||
      limb === 'leftKnee' ||
      limb === 'rightKnee'
    ) {
      const leftLegLost = e.severedLimbs.has('leftKnee') || e.severedLimbs.has('leftHip');
      const rightLegLost = e.severedLimbs.has('rightKnee') || e.severedLimbs.has('rightHip');
      const legsLost = (leftLegLost ? 1 : 0) + (rightLegLost ? 1 : 0);
      e.walkStyle = 'inestable';
      e.speed = legsLost >= 2 ? Math.min(e.speed, 0.78) : Math.min(e.speed, 1.08);
      e.squash = 0.72;
      if (!hadLegLossBefore) {
        // Immediate knock-down onto the floor when losing first leg!
        e.crawlFactor = Math.max(e.crawlFactor, 0.35);
        e.vx *= 0.2;
        e.vz *= 0.2;
        if (e.state === 'windup' || e.state === 'lunge' || e.state === 'attack') {
          e.state = 'recover';
          e.stateTimer = 0.48;
        }
        this.spawnBloodDecal(e.x, e.z, 0.68, 0.86, 0.32, 42, isSpitter, e.y);
      }
    }

    this.applySeveredLimbPose(e.bundle, e.severedLimbs, e.stumpMeshes);
  }

  private damageEnemy(
    e: EnemyEntity,
    amount: number,
    knockVx: number,
    knockVz: number,
    hitLimb: LimbTarget = 'torso',
    hitPos?: { x: number; y: number; z: number },
    shotDir?: { x: number; y: number; z: number },
    allowKill = false,
    silentStealth = false,
  ) {
    const isHeadshot = hitLimb === 'head';
    const effectiveDmg = isHeadshot ? Math.round(amount * 2.2) : amount;
    const ey = e.y + 1.1;
    const bx = hitPos?.x ?? e.x;
    const by = hitPos?.y ?? ey;
    const bz = hitPos?.z ?? e.z;
    let hitArmor = false;
    let brokeArmor = false;

    if (isHeadshot && e.armorHelmetHp > 0) {
      hitArmor = true;
      e.armorHelmetHp = Math.max(0, e.armorHelmetHp - amount);
      const bleed = Math.max(1, Math.round(amount * 0.2));
      e.hp = Math.max(1, e.hp - bleed);
      this.spawnBurst(bx, by, bz, 12, 1.0, 0.85, 0.4, 6.2);
      if (e.armorHelmetHp <= 0) {
        brokeArmor = true;
        if (e.bundle.helmetArmorGroup) e.bundle.helmetArmorGroup.visible = false;
        this.spawnBurst(bx, by + 0.15, bz, 22, 0.55, 0.65, 0.48, 7.8);
        this.setInventoryNotice('¡Casco del Gendarme destruido! Cabeza expuesta', 2.6);
      }
    } else if (!isHeadshot && hitLimb === 'torso' && e.armorVestHp > 0) {
      hitArmor = true;
      const vestAbsorb = Math.max(1, Math.round(effectiveDmg * 0.72));
      e.armorVestHp = Math.max(0, e.armorVestHp - vestAbsorb);
      const bodyBleed = Math.max(1, effectiveDmg - vestAbsorb);
      e.hp = Math.max(1, e.hp - bodyBleed);
      this.spawnBurst(bx, by, bz, 12, 1.0, 0.82, 0.42, 5.8);
      if (e.armorVestHp <= 0) {
        brokeArmor = true;
        if (e.bundle.vestArmorGroup) e.bundle.vestArmorGroup.visible = false;
        this.spawnBurst(bx, by, bz, 22, 0.48, 0.58, 0.44, 7.5);
        this.setInventoryNotice('¡Chaleco antibalas del Gendarme destruido!', 2.6);
      }
    } else if (isHeadshot) {
      e.hp = 0;
    } else if (allowKill) {
      e.hp = Math.max(0, e.hp - effectiveDmg);
    } else {
      e.hp = Math.max(1, e.hp - effectiveDmg);
    }
    e.hitFlashTimer = 0.075;
    e.squash = hitArmor ? 1.07 : 1.18;
    const armorKnockMult = e.enemyRole === 'gendarme_heavy' ? 0.35 : 1.0;
    e.vx += knockVx * armorKnockMult;
    e.vz += knockVz * armorKnockMult;

    // Taking non-lethal or non-stealth damage provokes & alerts the zombie to chase the player
    if (!(silentStealth && e.hp <= 0)) {
      e.provoked = true;
      e.suspicion = 1;
      if (e.state === 'wander' || e.state === 'investigate') {
        e.state = 'chase';
        this.triggerZombieSpotAnim(e);
      }
      e.aggroTimer = 12.0;
    }

    // Trigger native 'hit' reaction clip when available for this zombie's tag/skeleton
    if (e.hp > 0 && e.bundle.character.hasAction('hit')) {
      const hitDur = e.bundle.character.getActionDuration('hit') || 0.65;
      e.hitReactTimer = THREE.MathUtils.clamp(hitDur, 0.35, 0.85);
      e.bundle.character.setAction('hit', {
        fadeSec: 0.08,
        timeScale: 1.15,
        forceRestart: true,
        oneShot: true,
      });
    }

    const isSpitter = e.kind === 'spitter';

    this.spawnBloodSpray(
      bx,
      by,
      bz,
      shotDir?.x ?? knockVx * 0.15,
      shotDir?.y ?? 0.35,
      shotDir?.z ?? knockVz * 0.15,
      hitArmor ? 6 : isHeadshot ? 24 : 14,
      isHeadshot && !hitArmor ? 7.2 : 5.6,
      0.95,
      0.34,
      isSpitter,
    );

    // Limb dismemberment occurs on the 3rd shot to the same limb sector
    if (hitLimb !== 'torso' && hitLimb !== 'head' && !e.severedLimbs.has(hitLimb)) {
      e.limbHits[hitLimb] += 1;
      if (e.limbHits[hitLimb] >= 3) {
        this.severEnemyLimb(e, hitLimb, hitPos, shotDir);
      }
    }

    const hpRatio = Math.max(0, e.hp / Math.max(1, e.maxHp));
    e.bundle.hpFillMesh.scale.x = Math.max(0.001, hpRatio);
    setEnemyHpBarColor(e.bundle.hpFillMesh, hpRatio);

    if (e.hp <= 0) {
      const idx = this.enemies.indexOf(e);
      if (idx !== -1) this.enemies.splice(idx, 1);
      this.fastFoodHordeIds.delete(e.id);

      // Transition into procedural death collapse animation instead of popping out
      e.bundle.hpBarGroup.visible = false;
      e.bundle.awarenessIcon.visible = false;
      e.bundle.telegraphRing.visible = false;
      e.bundle.group.scale.setScalar(1);
      setEnemyHitFlashVisual(e.bundle, false);
      setEnemyGlowAlertVisual(e.bundle, false);

      const fwdX = Math.sin(e.yaw);
      const fwdZ = Math.cos(e.yaw);
      const knockDot = knockVx * fwdX + knockVz * fwdZ;
      const fallDir = Math.abs(knockDot) > 0.5 ? (knockDot >= 0 ? -1 : 1) : Math.random() < 0.5 ? -1 : 1;

      let deathDuration = e.kind === 'brute' ? 1.05 : 0.82;
      if (e.crawlFactor >= 0.35 && e.bundle.character.hasTagAction('zombie_crawler', 'death')) {
        e.bundle.character.setAnimationTag('zombie_crawler');
      }
      if (e.bundle.character.hasAction('death')) {
        e.bundle.character.setAction('death', { fadeSec: 0.12, timeScale: 1.0 });
        const clipDur = e.bundle.character.getActionDuration('death') || 1.2;
        deathDuration = Math.max(0.95, Math.min(2.6, clipDur + 0.3));
      }

      this.dyingEnemies.push({
        bundle: e.bundle,
        shadow: e.shadow,
        x: e.x,
        y: e.y,
        z: e.z,
        yaw: e.yaw,
        baseShadowScale: e.enemyRole === 'gendarme_heavy' ? 1.35 : e.kind === 'brute' ? 1.65 : 1.0,
        fallDir,
        timer: 0,
        duration: deathDuration,
        severedLimbs: new Set(e.severedLimbs),
        stumpMeshes: e.stumpMeshes,
        crawlFactor: e.crawlFactor,
      });

      const heavy = e.kind === 'brute';
      if (!silentStealth) {
        this.audio.playShatter(heavy, { x: e.x, y: e.y + 0.9, z: e.z });
      }
      if (heavy) {
        this.hitstopTimer = 0.048;
        this.shakeTrauma = Math.min(1, this.shakeTrauma + (silentStealth ? 0.18 : 0.42));
      } else {
        this.shakeTrauma = Math.min(1, this.shakeTrauma + (silentStealth ? 0.06 : 0.12));
      }

      // Arterial death burst + expanding persistent blood pool decal on the ground
      this.spawnBloodSpray(
        bx,
        by,
        bz,
        shotDir?.x ?? 0,
        0.55,
        shotDir?.z ?? 0,
        heavy ? 46 : 32,
        heavy ? 8.6 : 6.8,
        1.35,
        0.5,
        isSpitter,
      );
      this.spawnBloodDecal(
        e.x,
        e.z,
        heavy ? 1.85 : 1.28,
        0.92,
        1.45,
        55,
        isSpitter,
        e.y,
      );

      this.kills += 1;
      this.combo = Math.min(8, this.combo + 1);
      this.comboTimer = 4.2;
      this.score += e.scoreValue * this.combo;
      if (this.score > this.bestScore) {
        this.bestScore = this.score;
        try {
          localStorage.setItem(BEST_SCORE_STORAGE_KEY, String(this.bestScore));
        } catch {
          // Ignore storage write errors
        }
      }

      this.flareCharge = Math.min(100, this.flareCharge + (heavy ? 18 : 10));
      if (e.enemyRole === 'police') {
        const dropRev = Boolean(e.carriedGear?.revolver || e.carriedWeapon === 'pistol');
        const dropBat = Boolean(e.carriedGear?.baton);
        const dropAmmo = dropRev || (e.carriedGear?.pistolAmmo ?? 0) > 0;
        if (dropRev) {
          this.spawnPickup('pistol', e.x - 0.3, e.z + 0.16, true, e.y);
        }
        if (dropAmmo) {
          this.spawnPickup('pistol_ammo', e.x + 0.28, e.z - 0.14, true, e.y);
        }
        if (dropBat) {
          this.spawnPickup('baton', e.x - 0.14, e.z - 0.3, true, e.y);
        }
        this.setInventoryNotice(
          dropRev && dropBat
            ? '¡Policía abatido! Recoge su Revólver, munición y Bastón'
            : dropBat
              ? '¡Policía abatido! Recoge su Bastón policía y munición'
              : dropRev
                ? '¡Policía abatido! Recoge su Revólver y munición'
                : '¡Policía abatido! Recoge su munición de Revólver',
          2.8,
        );
      } else if (e.enemyRole === 'gendarme') {
        const dropRifle = e.carriedGear?.rifle || e.carriedWeapon === 'rifle';
        const magCount = Math.max(dropRifle ? 1 : 1, e.carriedGear?.rifleMags ?? 1);
        if (dropRifle) {
          this.spawnPickup('rifle', e.x - 0.32, e.z + 0.18, true, e.y);
        }
        for (let mIdx = 0; mIdx < magCount; mIdx++) {
          this.spawnPickup(
            'fal_ammo',
            e.x + 0.28 + mIdx * 0.22,
            e.z - 0.16 + mIdx * 0.14,
            true,
            e.y,
          );
        }
        this.setInventoryNotice(
          dropRifle
            ? '¡Gendarme abatido! Recoge su Fusil FAL y cargadores'
            : '¡Gendarme abatido! Recoge sus cargadores de Fusil FAL',
          2.8,
        );
      } else if (e.enemyRole === 'gendarme_heavy') {
        this.spawnPickup('helmet', e.x - 0.36, e.z + 0.24, true, e.y);
        this.spawnPickup('vest', e.x + 0.36, e.z - 0.24, true, e.y);
        if (e.carriedGear?.rifle || e.carriedWeapon === 'rifle') {
          this.spawnPickup('rifle', e.x, e.z + 0.38, true, e.y);
        }
        const magCount = e.carriedGear?.rifleMags ?? 1;
        for (let mIdx = 0; mIdx < magCount; mIdx++) {
          this.spawnPickup('fal_ammo', e.x - 0.22 + mIdx * 0.24, e.z - 0.34, true, e.y);
        }
        this.setInventoryNotice(
          '¡Gendarme Pesado abatido! Equipa su Casco y Chaleco antibalas',
          3.4,
        );
      } else if (e.carriedWeapon) {
        const wKind: LootKind = e.carriedWeapon;
        const ammoKind: LootKind = e.carriedWeapon === 'rifle' ? 'fal_ammo' : 'pistol_ammo';
        this.spawnPickup(wKind, e.x - 0.28, e.z + 0.15, true, e.y);
        this.spawnPickup(ammoKind, e.x + 0.28, e.z - 0.15, true, e.y);
        this.setInventoryNotice(
          e.carriedWeapon === 'rifle'
            ? '¡Infectado armado abatido! Recoge su Fusil FAL'
            : '¡Policía abatido! Recoge su Revólver',
          2.8,
        );
      }
      if (this.activeZone === 'colon_interior') {
        const provKinds: LootKind[] = ['chemicals', 'scrap', 'powder'];
        if (heavy || Math.random() < 0.65) {
          this.spawnPickup(
            provKinds[Math.floor(Math.random() * provKinds.length)],
            e.x,
            e.z,
            true,
            e.y,
          );
        }
        if (Math.random() < (heavy ? 0.85 : 0.45)) {
          this.spawnPickup(this.pickRandomSurvivalLootKind(), e.x + 0.35, e.z + 0.25, true, e.y);
        }
      } else {
        this.spawnPickup('ember', e.x, e.z, true, e.y);
        if (this.missionPhase === 'scavenge_9_julio' && Math.random() < 0.72) {
          const provKinds: LootKind[] = ['chemicals', 'scrap', 'powder'];
          this.spawnPickup(
            provKinds[Math.floor(Math.random() * provKinds.length)],
            e.x - 0.3,
            e.z + 0.25,
            true,
            e.y,
          );
        } else if (Math.random() < (heavy ? 0.9 : 0.56)) {
          this.spawnPickup(this.pickRandomSurvivalLootKind(), e.x + 0.35, e.z + 0.25, true, e.y);
        }
        if (heavy) {
          this.spawnPickup('ember', e.x + 0.5, e.z - 0.3, true, e.y);
          this.spawnPickup('wood', e.x - 0.4, e.z + 0.4, true, e.y);
        }
      }
      this.onMissionZombieKilled();
    } else {
      if (brokeArmor) {
        this.audio.playArmorBreak();
      } else if (hitArmor) {
        this.audio.playArmorHit();
      } else {
        this.audio.playHit(this.combo);
        if (!silentStealth) {
          this.audio.playZombieHit(isHeadshot, { x: bx, y: by, z: bz });
        }
      }
    }
  }

  private onMissionZombieKilled() {
    if (this.gameState !== 'PLAYING' || this.isTutorialMode) return;
    let changed = false;
    if (this.storyMission === 3) {
      this.emitHud();
      return;
    }
    if (this.missionPhase === 'clear_theater') {
      if (this.kills === 6) {
        this.setRadioTransmission(
          'Ricardo López',
          'Mitad del Teatro Colón despejada. Revisa los palcos superiores y la Sala de Máquinas al fondo.',
          6.5,
        );
      }
      if (this.kills >= this.mission2Target || this.enemies.length === 0) {
        this.startAllyRescueCutscene();
        return;
      }
      this.emitHud();
      return;
    }
    if (this.missionPhase === 'clear_plaza_wave' && this.kills >= this.wave1Target) {
      this.missionPhase = 'clear_corridor_wave';
      this.spawnMissionWave2Packs();
      this.setRadioTransmission(
        'Ricardo López',
        '¡Primera horda abatida! Más jaurías bloquean la traza norte hacia el Teatro Colón.',
        6.5,
      );
      changed = true;
    }
    if (
      this.missionPhase === 'clear_corridor_wave' &&
      this.kills >= this.totalMissionTarget
    ) {
      this.missionPhase = 'secure_colon';
      this.colonUnlocked = true;
      this.worldEnv.updateColonBeacon(true, this.elapsed);
      this.audio.playStoke();
      this.setRadioTransmission(
        'Ricardo López',
        'Avenida despejada. ¡Sube por la escalinata del Teatro Colón y asegura el refugio!',
        7.5,
      );
      changed = true;
    }
    if (changed) {
      this.emitHud();
    }
  }

  private ensureMissionWaveIntegrity() {
    if (this.gameState !== 'PLAYING' || this.isTutorialMode || this.colonUnlocked || this.enemies.length > 0) return;
    if (this.missionPhase !== 'clear_plaza_wave' && this.missionPhase !== 'clear_corridor_wave') {
      return;
    }
    const waveTarget =
      this.missionPhase === 'clear_plaza_wave' ? this.wave1Target : this.totalMissionTarget;
    const remaining = waveTarget - this.kills;
    if (remaining <= 0) {
      this.onMissionZombieKilled();
      return;
    }
    const spawnBatch = Math.min(8, remaining);
    for (let i = 0; i < spawnBatch; i++) {
      this.spawnEnemy(this.pickRandomKind(), true);
    }
  }

  private checkMissionSafeHouseReached() {
    if (this.gameState !== 'PLAYING' || this.isTutorialMode || this.storyMission !== 1 || !this.colonUnlocked) return;
    const dx = this.px - COLON_ENTRANCE_X;
    const dz = this.pz - COLON_ENTRANCE_Z;
    if (dx * dx + dz * dz <= COLON_SAFE_RADIUS * COLON_SAFE_RADIUS) {
      this.completeMission();
    }
  }

  private completeMission() {
    if (this.gameState !== 'PLAYING') return;
    this.score += 1500;
    this.mission2Unlocked = true;
    try {
      localStorage.setItem(MISSION2_UNLOCKED_STORAGE_KEY, '1');
    } catch {
      // Ignore storage write errors
    }
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      try {
        localStorage.setItem(BEST_SCORE_STORAGE_KEY, String(this.bestScore));
      } catch {
        // Ignore storage write errors
      }
    }
    this.gameState = 'MISSION_COMPLETE';
    this.missionCompleteTimer = 0;
    this.isAiming = false;
    this.reloadTimer = 0;
    this.cancelPendingThrowable(true);
    this.muzzleFlashGroup.visible = false;
    this.muzzleFlashLight.intensity = 0;
    this.heldKeys.clear();
    this.clearVirtualControls();
    this.exitPointerLockSafe();
    this.audio.playStoke();
    this.spawnBurst(
      COLON_ENTRANCE_X,
      groundHeightAt(COLON_ENTRANCE_X, COLON_ENTRANCE_Z) + 1.4,
      COLON_ENTRANCE_Z,
      26,
      0.2,
      0.95,
      0.55,
      9,
    );
    this.emitHud();
  }

  private completeMission2() {
    if (this.gameState !== 'ALLY_RESCUE_CUTSCENE' && this.gameState !== 'PLAYING') return;
    this.score += 2500;
    this.mission2Unlocked = true;
    this.allyRescued = true;
    this.baseUnlocked = true;
    this.missionPhase = 'base_free_roam';
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      try {
        localStorage.setItem(BEST_SCORE_STORAGE_KEY, String(this.bestScore));
      } catch {
        // Ignore storage write errors
      }
    }
    this.gameState = 'MISSION_COMPLETE';
    this.missionCompleteTimer = 0;
    this.isAiming = false;
    this.reloadTimer = 0;
    this.cancelPendingThrowable(true);
    this.muzzleFlashGroup.visible = false;
    this.muzzleFlashLight.intensity = 0;
    this.heldKeys.clear();
    this.clearVirtualControls();
    this.exitPointerLockSafe();
    this.audio.playStoke();
    this.emitHud();
  }

  private hurtPlayer(damage: number, hitDirX = 0, hitDirZ = 0) {
    if (this.invulnTimer > 0 || this.gameState !== 'PLAYING') return;

    let remainingDamage = damage;
    let armorMitigated = false;
    let armorBrokenMsg: string | null = null;

    if (this.vestArmor > 0) {
      const vestAbsorb = Math.min(
        this.vestArmor,
        Math.max(1, Math.round(remainingDamage * 0.55)),
      );
      this.vestArmor = Math.max(0, this.vestArmor - vestAbsorb);
      remainingDamage = Math.max(1, remainingDamage - vestAbsorb);
      armorMitigated = true;
      if (this.vestArmor <= 0) {
        armorBrokenMsg = '¡Tu Chaleco antibalas se rompió!';
      }
    }
    if (this.helmetArmor > 0) {
      const helmetAbsorb = Math.min(
        this.helmetArmor,
        Math.max(1, Math.round(remainingDamage * 0.35)),
      );
      this.helmetArmor = Math.max(0, this.helmetArmor - helmetAbsorb);
      remainingDamage = Math.max(1, remainingDamage - helmetAbsorb);
      armorMitigated = true;
      if (this.helmetArmor <= 0) {
        armorBrokenMsg = armorBrokenMsg
          ? '¡Casco y Chaleco antibalas destruidos!'
          : '¡Tu Casco balístico se rompió!';
      }
    }
    if (armorMitigated) {
      this.syncArmorVisibility();
    }

    this.hp = this.isTutorialMode
      ? Math.max(25, this.hp - remainingDamage)
      : Math.max(0, this.hp - remainingDamage);
    this.invulnTimer = 0.75;
    this.hurtFlashTimer = 0.55;
    this.damageSeq += 1;
    this.lastDamage = remainingDamage;
    this.combo = 1;
    this.comboTimer = 0;
    this.hitstopTimer = 0.055;
    this.shakeTrauma = Math.min(1, this.shakeTrauma + 0.65);
    if (armorBrokenMsg) {
      this.audio.playArmorBreak();
      this.setInventoryNotice(armorBrokenMsg, 2.8);
    } else if (armorMitigated) {
      this.audio.playArmorHit();
    } else {
      this.audio.playHurt();
    }

    const woundY = this.py + (1.12 - this.crouchFactor * 0.36);
    const hitLen = Math.hypot(hitDirX, hitDirZ);
    const sprayDirX = hitLen > 0.01 ? hitDirX / hitLen : Math.sin(this.pyaw + Math.PI);
    const sprayDirZ = hitLen > 0.01 ? hitDirZ / hitLen : Math.cos(this.pyaw + Math.PI);
    const dropCount = Math.round(THREE.MathUtils.clamp(14 + damage * 0.65, 14, 30));
    this.spawnBloodSpray(
      this.px + sprayDirX * 0.14,
      woundY,
      this.pz + sprayDirZ * 0.14,
      sprayDirX,
      0.42,
      sprayDirZ,
      dropCount,
      5.4 + Math.min(2.2, damage * 0.08),
      1.05,
      0.44,
      false,
    );

    if (this.hp <= 0) {
      this.spawnBloodSpray(
        this.px,
        this.py + 0.95,
        this.pz,
        sprayDirX,
        0.55,
        sprayDirZ,
        28,
        6.6,
        1.35,
        0.55,
        false,
      );
      this.spawnBloodDecal(this.px, this.pz, 1.32, 0.92, 1.45, 55, false, this.py);
      this.gameState = 'GAME_OVER';
      this.deathAnimTimer = 0;
      this.deathOrbitTimer = 0;
      this.deathFallDir = Math.random() < 0.5 ? 1 : -1;
      const dx = this.camera.position.x - this.px;
      const dz = this.camera.position.z - this.pz;
      this.deathCamStartDist = Math.max(1.6, Math.hypot(dx, dz));
      this.deathCamStartHeight = Math.max(1.2, this.camera.position.y - this.py);
      this.camYaw = Math.atan2(dx, dz);
      this.isAiming = false;
      this.reloadTimer = 0;
      this.throwAnimTimer = 0;
      this.playerHitAnimTimer = 0;
      this.meleeTimer = 0;
      this.cancelPendingThrowable(true);
      this.playerRig.character.setAction('death', {
        fadeSec: 0.08,
        timeScale: 1.0,
        forceRestart: true,
      });
      this.muzzleFlashGroup.visible = false;
      this.muzzleFlashLight.intensity = 0;
      this.heldKeys.clear();
      this.clearVirtualControls();
      this.exitPointerLockSafe();
      for (let i = 0; i < this.enemies.length; i++) {
        this.enemies[i].bundle.awarenessIcon.visible = false;
      }
    } else if (this.playerRig.character.hasAction('hit')) {
      const hitDur = this.playerRig.character.getActionDuration('hit') || 0.45;
      this.playerHitAnimTimer = THREE.MathUtils.clamp(hitDur, 0.28, 0.72);
      this.playerRig.character.setAction('hit', {
        fadeSec: 0.08,
        timeScale: 1.1,
        forceRestart: true,
        oneShot: true,
      });
    }
    this.emitHud();
  }

  private updateEffects(dt: number) {
    if (this.flareWaveTimer > 0) {
      this.flareWaveTimer -= dt;
      const p = 1 - Math.max(0, this.flareWaveTimer) / 0.4;
      this.flareWaveMesh.scale.setScalar(1 + p * 9.0);
      (this.flareWaveMesh.material as THREE.MeshBasicMaterial).opacity = (1 - p) * 0.92;
      if (this.flareWaveTimer <= 0) this.flareWaveMesh.visible = false;
    }

    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer -= dt;
      const t = Math.max(0, this.muzzleFlashTimer / Math.max(0.01, this.muzzleFlashDuration));
      this.muzzleFlashLight.intensity = (this.weapon === 'rifle' ? 4.8 : 3.6) * t;
      this.muzzleFlashGroup.scale.setScalar(
        (this.weapon === 'rifle' ? 1.18 : 0.96) * (0.45 + 0.65 * t),
      );
      if (this.muzzleFlashTimer <= 0) {
        this.muzzleFlashGroup.visible = false;
        this.muzzleFlashLight.intensity = 0;
      }
    }

    this.updateNoiseRipples(dt);
  }

  private updateHarvestNodes(dt: number) {
    for (let i = 0; i < this.worldEnv.harvestNodes.length; i++) {
      const n = this.worldEnv.harvestNodes[i];
      if (n.hp <= 0) {
        n.respawnTimer -= dt;
        if (n.respawnTimer <= 0) {
          n.hp = n.maxHp;
          n.group.visible = true;
        }
        continue;
      }
      if (n.hitFlash > 0) {
        n.hitFlash -= dt;
        const jiggle = 1 + Math.sin(n.hitFlash * 55) * 0.08;
        n.group.scale.set(jiggle, 2 - jiggle, jiggle);
      } else {
        n.group.scale.setScalar(1);
      }
    }
  }

  private damageSupplyNode(n: (typeof this.worldEnv.harvestNodes)[number], dmg: number) {
    n.hp -= dmg;
    n.hitFlash = 0.1;
    this.audio.playChop();
    this.spawnBurst(
      n.x,
      this.floorAt(n.x, n.z) + 0.7,
      n.z,
      7,
      n.kind === 'sunstone' ? 1.0 : 0.72,
      n.kind === 'sunstone' ? 0.68 : 0.54,
      0.24,
      4.5,
    );
    if (n.hp <= 0) {
      n.respawnTimer = 18;
      n.group.visible = false;
      if (n.kind === 'timber') {
        this.spawnPickup('wood', n.x, n.z);
        this.spawnPickup(this.pickRandomSurvivalLootKind(), n.x + 0.4, n.z);
      } else {
        this.spawnPickup('ember', n.x - 0.3, n.z);
        this.spawnPickup(
          Math.random() < 0.5 ? 'fal_ammo' : 'bandage',
          n.x + 0.35,
          n.z,
        );
        this.flareCharge = Math.min(100, this.flareCharge + 16);
      }
    }
  }

  private spawnSlimeSplat(
    x: number,
    y: number,
    z: number,
    refY: number,
    spawnPuddle = true,
  ) {
    this.audio.playSlimeSplat({ x, y, z });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + Math.random() * 0.55;
      const spd = 1.6 + Math.random() * 3.4;
      this.spawnBloodDroplet(
        x + (Math.random() - 0.5) * 0.08,
        y + (Math.random() - 0.5) * 0.06,
        z + (Math.random() - 0.5) * 0.08,
        Math.cos(a) * spd,
        1.4 + Math.random() * 2.5,
        Math.sin(a) * spd,
        0.5 + Math.random() * 0.42,
        0.55,
        true,
        true,
      );
    }
    if (spawnPuddle) {
      this.spawnBloodDecal(x, z, 0.54 + Math.random() * 0.24, 0.86, 0.24, 22, true, refY);
    }
  }

  private getSpitterMouthWorldPos(e: EnemyEntity, out: THREE.Vector3): THREE.Vector3 {
    e.bundle.group.updateMatrixWorld(true);
    if (e.bundle.mouthAnchor) {
      return e.bundle.mouthAnchor.getWorldPosition(out);
    }
    if (e.bundle.bones.head) {
      e.bundle.bones.head.node.getWorldPosition(out);
      const fwdX = Math.sin(e.yaw);
      const fwdZ = Math.cos(e.yaw);
      out.x += fwdX * 0.24;
      out.y -= 0.02;
      out.z += fwdZ * 0.24;
      return out;
    }
    const fwdX = Math.sin(e.yaw);
    const fwdZ = Math.cos(e.yaw);
    const h = 1.48 * (1 - e.crawlFactor * 0.52);
    return out.set(e.x + fwdX * 0.34, e.y + h, e.z + fwdZ * 0.34);
  }

  private updateProjectiles(dt: number) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      p.prevX = p.x;
      p.prevY = p.y;
      p.prevZ = p.z;
      if (p.isArrow) {
        p.vy -= 5.8 * dt;
      } else if (p.isSpit || !p.fromPlayer) {
        p.vy -= 7.4 * dt;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.mesh.position.set(p.x, p.y, p.z);
      if (p.isArrow || p.isSpit || !p.fromPlayer) {
        p.mesh.lookAt(p.x + p.vx, p.y + p.vy, p.z + p.vz);
      } else if (p.fromPlayer && p.mesh.children[0]) {
        p.mesh.children[0].scale.z = Math.min(1, p.mesh.children[0].scale.z + dt * 28);
      }
      if (!p.fromPlayer) {
        const wob = Math.sin(this.elapsed * 26 + (p.spinSeed ?? 0));
        p.mesh.scale.set(1 + wob * 0.16, 1 - wob * 0.14, 1.12 - wob * 0.08);
        if (Math.random() < 0.65) {
          this.spawnBloodDroplet(
            p.x + (Math.random() - 0.5) * 0.09,
            p.y + (Math.random() - 0.5) * 0.09,
            p.z + (Math.random() - 0.5) * 0.09,
            p.vx * 0.12 + (Math.random() - 0.5) * 0.5,
            p.vy * 0.12 - 0.6 - Math.random() * 0.5,
            p.vz * 0.12 + (Math.random() - 0.5) * 0.5,
            0.42 + Math.random() * 0.28,
            0.25,
            true,
          );
        }
        if (Math.random() < 0.45) {
          this.spawnParticle(
            p.x,
            p.y,
            p.z,
            p.vx * 0.08 + (Math.random() - 0.5) * 0.4,
            -0.3 + Math.random() * 0.3,
            p.vz * 0.08 + (Math.random() - 0.5) * 0.4,
            0.22,
            0.35,
            4.5,
            0.58,
            0.9,
            0.2,
          );
        }
      } else if (!p.isArrow && Math.random() < 0.45) {
        this.spawnParticle(
          p.x + (Math.random() - 0.5) * 0.08,
          p.y + (Math.random() - 0.5) * 0.08,
          p.z + (Math.random() - 0.5) * 0.08,
          (Math.random() - 0.5) * 0.4,
          0.15 + Math.random() * 0.25,
          (Math.random() - 0.5) * 0.4,
          0.14,
          0.45,
          0,
          1.0,
          0.65,
          0.12,
        );
      }

      const gy = this.floorAt(p.x, p.z, p.y);
      const maxRange = Math.max(ARENA_HALF_X, ARENA_HALF_Z, ARENA_PLAYABLE_RADIUS) + 16;
      let remove = p.life <= 0 || Math.abs(p.x) > maxRange || Math.abs(p.z) > maxRange;

      if (!remove) {
        if (this.activeZone === 'colon_interior') {
          if (!this.colonInterior.hasLineOfSight(p.prevX, p.prevY, p.prevZ, p.x, p.y, p.z)) {
            if (p.fromPlayer) {
              this.spawnBurst(p.x, p.y, p.z, 4, 0.95, 0.85, 0.6, 3.2);
            } else {
              this.spawnSlimeSplat(p.x, p.y, p.z, p.y, false);
            }
            remove = true;
          }
        } else {
          const cf = this.getCampfirePos();
          const cfDx = p.x - cf.x;
          const cfDz = p.z - cf.z;
          if (
            cfDx * cfDx + cfDz * cfDz <= 0.4624 &&
            p.y <= groundHeightAt(cf.x, cf.z) + 1.32
          ) {
            this.spawnBurst(p.x, p.y, p.z, 4, 1.0, 0.7, 0.28, 3.5);
            remove = true;
          } else {
            for (let cIdx = 0; cIdx < this.worldEnv.colliders.length; cIdx++) {
              const c = this.worldEnv.colliders[cIdx];
              const cDx = c.x - p.x;
              const cDz = c.z - p.z;
              const maxR = c.radius * 0.9 + p.radius * 0.4;
              if (cDx * cDx + cDz * cDz <= maxR * maxR) {
                const baseY = groundHeightAt(c.x, c.z);
                if (p.y >= baseY - 0.1 && p.y <= baseY + c.height) {
                  if (p.fromPlayer) {
                    this.spawnBurst(p.x, p.y, p.z, 4, 0.95, 0.85, 0.6, 3.2);
                  } else {
                    this.spawnSlimeSplat(p.x, p.y, p.z, baseY, false);
                  }
                  remove = true;
                  break;
                }
              }
            }
            if (
              !remove &&
              (this.segmentHitsFastFoodWalls(p.prevX, p.prevY, p.prevZ, p.x, p.y, p.z, false) ||
                this.segmentHitsWorldBoxes(p.prevX, p.prevY, p.prevZ, p.x, p.y, p.z, false))
            ) {
              if (p.fromPlayer) {
                this.spawnBurst(p.x, p.y, p.z, 4, 0.95, 0.85, 0.6, 3.2);
              } else {
                this.spawnSlimeSplat(p.x, p.y, p.z, p.y, false);
              }
              remove = true;
            }
          }
        }
      }

      if (!remove && p.fromPlayer) {
        const midX = (p.prevX + p.x) * 0.5;
        const midZ = (p.prevZ + p.z) * 0.5;
        const stepHalf = Math.hypot(p.x - p.prevX, p.z - p.prevZ) * 0.5;
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          const edX = e.x - midX;
          const edZ = e.z - midZ;
          const maxED = e.radius + p.radius + stepHalf + 0.6;
          if (edX * edX + edZ * edZ > maxED * maxED) {
            continue;
          }
          const hit = this.detectProjectileLimbHit(
            e,
            p.prevX,
            p.prevY,
            p.prevZ,
            p.x,
            p.y,
            p.z,
            p.radius,
          );
          if (hit) {
            const spd = Math.max(0.01, Math.hypot(p.vx, p.vy, p.vz));
            if (p.isArrow) {
              this.audio.playArrowHit({ x: hit.hitX, y: hit.hitY, z: hit.hitZ });
              if (this.isTutorialMode) {
                this.tutorialBowHit = true;
              }
            }
            this.damageEnemy(
              e,
              p.damage,
              p.vx * 0.08,
              p.vz * 0.08,
              hit.limb,
              { x: hit.hitX, y: hit.hitY, z: hit.hitZ },
              { x: p.vx / spd, y: p.vy / spd, z: p.vz / spd },
              Boolean(p.isArrow),
              Boolean(p.isArrow),
            );
            remove = true;
            break;
          }
        }
        if (!remove && p.y < gy - 0.1) {
          remove = true;
        }
        if (!remove && this.activeZone === 'exterior_9_julio') {
          for (let k = 0; k < this.worldEnv.harvestNodes.length; k++) {
            const n = this.worldEnv.harvestNodes[k];
            if (n.hp > 0) {
              const ndx = n.x - p.x;
              const ndz = n.z - p.z;
              if (ndx * ndx + ndz * ndz <= 0.7225) {
                this.damageSupplyNode(n, 18);
                remove = true;
                break;
              }
            }
          }
        }
      } else if (!remove && !p.fromPlayer) {
        const pdx = this.px - p.x;
        const pdz = this.pz - p.z;
        const hitR = 0.65 + p.radius;
        if (p.y < gy - 0.1) {
          this.spawnSlimeSplat(p.x, gy + 0.05, p.z, gy, true);
          remove = true;
        } else if (
          pdx * pdx + pdz * pdz <= hitR * hitR &&
          Math.abs(p.y - (this.py + 1.0 - this.crouchFactor * 0.35)) <= 1.15
        ) {
          this.hurtPlayer(p.damage, p.vx, p.vz);
          this.spawnSlimeSplat(p.x, p.y, p.z, this.py, true);
          remove = true;
        }
      }

      if (remove) {
        this.scene.remove(p.mesh);
        const pool = p.isArrow
          ? this.playerArrowPool
          : p.fromPlayer
            ? this.playerBoltPool
            : this.enemyBoltPool;
        if (pool.length < 48) pool.push(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }

  private applyFireBurnToPlayer(damage: number) {
    if (this.gameState !== 'PLAYING' || this.playerBurnTickTimer > 0) return;
    this.playerBurnTickTimer = 0.45;
    this.hp = Math.max(0, this.hp - damage);
    this.hurtFlashTimer = Math.max(this.hurtFlashTimer, 0.25);
    this.spawnBurst(this.px, this.py + 0.9, this.pz, 6, 1.0, 0.45, 0.12, 4.5);
    if (this.hp <= 0) {
      this.invulnTimer = 0;
      this.hurtPlayer(Math.max(1, damage));
    } else {
      this.damageSeq += 1;
      this.lastDamage = damage;
      this.emitHud();
    }
  }

  private detonateMolotovAt(x: number, y: number, z: number) {
    const gy = this.floorAt(x, z, y);
    this.audio.playGlassShatterFire({ x, y: gy + 0.35, z });
    this.scatterLooseRocksExplosion(x, gy, z, 2.2, 4.2);
    this.shakeTrauma = Math.min(1, this.shakeTrauma + 0.22);
    this.spawnBurst(x, gy + 0.35, z, 18, 1.0, 0.52, 0.12, 8.2);
    this.spawnDropletSpray(x, gy + 0.25, z, 18, 6.2, 0.98, 0.45, 0.08, 0.48, 0.88, 3.6);
    for (let s = 0; s < 8; s++) {
      const a = (s / 8) * Math.PI * 2 + Math.random() * 0.5;
      const shade = 0.12 + Math.random() * 0.08;
      this.spawnSmokePuff(
        x + Math.cos(a) * 0.4,
        gy + 0.45 + Math.random() * 0.4,
        z + Math.sin(a) * 0.4,
        Math.cos(a) * 0.9,
        1.9 + Math.random() * 1.1,
        Math.sin(a) * 0.9,
        1.6 + Math.random() * 0.8,
        0.6,
        2.5,
        shade,
        shade,
        shade + 0.02,
        0.48,
      );
    }
    this.alertNearbyZombies(15.0);

    const activeLights = this.fireZones.filter((fz) => fz.pointLight !== null).length;
    const visuals = buildFireZoneVisuals(1.5, activeLights < 3);
    visuals.group.position.set(x, gy, z);
    this.scene.add(visuals.group);

    this.fireZones.push({
      x,
      y: gy,
      z,
      radius: 1.5,
      age: 0,
      life: 5.0,
      maxLife: 5.0,
      tickTimer: 0,
      crateTickTimer: 0.1,
      group: visuals.group,
      flameCluster: visuals.flameCluster,
      ringMat: visuals.ringMat,
      pointLight: visuals.pointLight,
      dispose: visuals.dispose,
    });
  }

  private detonateNailBombAt(x: number, y: number, z: number) {
    const gy = this.floorAt(x, z, y);
    const impactY = Math.max(gy + 0.25, y);
    const radius = 1.5;

    this.audio.playNailBombBlast({ x, y: impactY, z });
    this.scatterLooseRocksExplosion(x, gy, z, 2.6, 5.8);
    this.shakeTrauma = Math.min(1, this.shakeTrauma + 0.45);
    this.spawnBurst(x, impactY, z, 28, 0.95, 0.85, 0.55, 11.5);
    for (let s = 0; s < 10; s++) {
      const a = (s / 10) * Math.PI * 2 + Math.random() * 0.4;
      const shade = 0.16 + Math.random() * 0.1;
      this.spawnSmokePuff(
        x + Math.cos(a) * 0.35,
        impactY + Math.random() * 0.45,
        z + Math.sin(a) * 0.35,
        Math.cos(a) * (0.9 + Math.random() * 1.4),
        2.0 + Math.random() * 1.4,
        Math.sin(a) * (0.9 + Math.random() * 1.4),
        1.5 + Math.random() * 0.9,
        0.7,
        2.8,
        shade,
        shade,
        shade + 0.02,
        0.5,
      );
    }
    this.alertNearbyZombies(17.5);

    // Shoot 32 visible 3D nails radially in all directions across 1.5m+
    for (let n = 0; n < 32; n++) {
      const yaw = (n / 32) * Math.PI * 2 + (Math.random() - 0.5) * 0.18;
      const pitch = -0.05 + Math.random() * 0.55;
      const speed = 13.5 + Math.random() * 7.5;
      const cosP = Math.cos(pitch);
      const vx = Math.sin(yaw) * cosP * speed;
      const vy = Math.sin(pitch) * speed + 1.8;
      const vz = Math.cos(yaw) * cosP * speed;

      const mesh = this.nailMeshPool.pop() ?? new THREE.Mesh(this.nailGeo, this.nailMat);
      mesh.position.set(x, impactY, z);
      mesh.lookAt(x + vx, impactY + vy, z + vz);
      this.scene.add(mesh);

      this.nailShrapnels.push({
        x,
        y: impactY,
        z,
        vx,
        vy,
        vz,
        life: 0.42 + Math.random() * 0.26,
        mesh,
      });
    }

    // 25% damage to every zombie inside the 1.5m radius
    const blastMaxR = radius + 0.22;
    const blastMaxRSq = blastMaxR * blastMaxR;
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (Math.abs(e.y - gy) > 2.3) continue;
      const dx = e.x - x;
      const dz = e.z - z;
      const distSq = dx * dx + dz * dz;
      if (distSq <= blastMaxRSq) {
        const dist = Math.sqrt(distSq);
        const dmg = Math.max(1, Math.round(e.maxHp * 0.25));
        const nx = dist > 0.01 ? dx / dist : 1;
        const nz = dist > 0.01 ? dz / dist : 0;
        this.damageEnemy(
          e,
          dmg,
          nx * 11,
          nz * 11,
          'torso',
          { x: e.x, y: e.y + 0.9, z: e.z },
          { x: nx, y: 0.2, z: nz },
          true,
        );
      }
    }

    // Damage crates inside 1.5m radius (exterior only)
    if (this.activeZone === 'exterior_9_julio') {
      const crateMaxRSq = (radius + 0.35) * (radius + 0.35);
      for (let k = 0; k < this.worldEnv.harvestNodes.length; k++) {
        const node = this.worldEnv.harvestNodes[k];
        if (node.hp > 0) {
          const ndx = node.x - x;
          const ndz = node.z - z;
          if (ndx * ndx + ndz * ndz <= crateMaxRSq) {
            this.damageSupplyNode(node, 22);
          }
        }
      }
    }

    // 25% damage if player is inside the 1.5m radius
    const pDx = this.px - x;
    const pDz = this.pz - z;
    if (Math.abs(this.py - gy) <= 2.3 && pDx * pDx + pDz * pDz <= radius * radius) {
      const pDmg = Math.max(1, Math.round(this.maxHp * 0.25));
      this.hurtPlayer(pDmg);
    }
  }

  private spawnNoiseRipple(
    x: number,
    y: number,
    z: number,
    maxRadius: number,
    colorHex: number,
    duration = 0.72,
  ) {
    const gy = this.floorAt(x, z, y);
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(this.noiseRippleGeo, mat);
    mesh.position.set(x, gy + 0.08, z);
    mesh.scale.setScalar(0.35);
    this.scene.add(mesh);
    this.noiseRipples.push({ mesh, mat, age: 0, duration, maxRadius });
  }

  private updateNoiseRipples(dt: number) {
    for (let i = this.noiseRipples.length - 1; i >= 0; i--) {
      const nr = this.noiseRipples[i];
      nr.age += dt;
      const t = Math.min(1, nr.age / Math.max(0.01, nr.duration));
      const radius = 0.4 + t * nr.maxRadius;
      nr.mesh.scale.setScalar(radius);
      nr.mat.opacity = (1 - t) * 0.75;
      if (nr.age >= nr.duration) {
        this.scene.remove(nr.mesh);
        nr.mat.dispose();
        this.noiseRipples.splice(i, 1);
      }
    }
  }

  private distractZombiesAt(
    x: number,
    y: number,
    z: number,
    radius: number,
    duration: number,
    kind: DistractionKind,
  ): number {
    const gy = this.floorAt(x, z, y);
    const rSq = radius * radius;
    let luredCount = 0;
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (e.state !== 'wander' && e.state !== 'investigate') continue;
      if (Math.abs(e.y - gy) > 5.5) continue;
      const dx = e.x - x;
      const dz = e.z - z;
      if (dx * dx + dz * dz <= rSq) {
        e.state = 'investigate';
        e.provoked = false;
        e.investigateX = x;
        e.investigateZ = z;
        e.investigateTimer = duration;
        e.distractedTimer = duration;
        e.suspicion = Math.max(e.suspicion, 0.48);
        e.squash = 1.08;
        e.awarenessDisplayTimer = 2.8;
        e.awarenessDisplayMax = 2.8;
        luredCount += 1;
      }
    }

    if (luredCount > 0) {
      const label =
        kind === 'bottle'
          ? 'Botella rota'
          : kind === 'can'
            ? 'Lata metálica'
            : 'Ladrillo';
      this.setInventoryNotice(
        `${label}: ${luredCount} zombie${luredCount > 1 ? 's' : ''} distraído${luredCount > 1 ? 's' : ''}`,
        2.2,
      );
    }
    return luredCount;
  }

  private impactDistractionAt(
    kind: DistractionKind,
    x: number,
    y: number,
    z: number,
    hitEnemy: EnemyEntity | null,
  ) {
    const gy = this.floorAt(x, z, y);
    const impactPos = { x, y: gy + 0.25, z };
    if (kind === 'bottle') {
      this.audio.playBottleShatter(impactPos);
      this.spawnDropletSpray(x, gy + 0.24, z, 18, 5.8, 0.52, 0.88, 0.56, 0.46, 0.85, 3.2);
      this.spawnBurst(x, gy + 0.25, z, 7, 0.72, 0.94, 0.74, 6.4);
      this.spawnNoiseRipple(x, gy, z, 11.5, 0x86efac, 0.78);
      this.distractZombiesAt(x, gy, z, 18.5, 7.5, 'bottle');
    } else if (kind === 'can') {
      this.audio.playCanClatter(impactPos);
      this.spawnDropletSpray(x, gy + 0.2, z, 8, 4.2, 0.76, 0.82, 0.86, 0.38, 0.68, 2.4);
      this.spawnBurst(x, gy + 0.22, z, 6, 0.82, 0.88, 0.95, 4.8);
      this.spawnNoiseRipple(x, gy, z, 9.0, 0x7dd3fc, 0.68);
      this.distractZombiesAt(x, gy, z, 14.5, 6.5, 'can');
    } else {
      this.audio.playBrickThud(impactPos);
      this.spawnBurst(x, gy + 0.2, z, 12, 0.78, 0.36, 0.24, 5.8);
      this.spawnSmokePuff(x, gy + 0.25, z, 0, 0.75, 0, 1.0, 0.35, 1.4, 0.48, 0.42, 0.38, 0.32);
      this.spawnNoiseRipple(x, gy, z, 7.5, 0xfbbf24, 0.62);
      if (hitEnemy) {
        const dx = hitEnemy.x - this.px;
        const dz = hitEnemy.z - this.pz;
        const len = Math.max(0.01, Math.hypot(dx, dz));
        this.damageEnemy(
          hitEnemy,
          28,
          (dx / len) * 9.5,
          (dz / len) * 9.5,
          'torso',
          { x, y, z },
          { x: dx / len, y: 0.1, z: dz / len },
          false,
          true,
        );
        hitEnemy.alertTimer = Math.max(hitEnemy.alertTimer, 1.25);
        hitEnemy.squash = 0.76;
      }
      this.distractZombiesAt(x, gy, z, 12.0, 6.0, 'brick');
    }
  }

  public searchTrashSpot() {
    this.audio.unlock();
    if (
      this.gameState !== 'PLAYING' ||
      this.editorMode ||
      this.activeZone !== 'exterior_9_julio'
    ) {
      return;
    }
    const spot = this.nearTrashSpot;
    if (!spot || spot.searchedCooldown > 0) return;

    spot.searchedCooldown = 32;
    this.nearTrashSpot = null;
    this.audio.playTrashRummage();

    const gy = groundHeightAt(spot.x, spot.z);
    this.spawnBurst(spot.x, gy + 0.55, spot.z, 10, 0.55, 0.72, 0.34, 4.6);
    this.spawnSmokePuff(
      spot.x,
      gy + 0.48,
      spot.z,
      (Math.random() - 0.5) * 0.4,
      0.85,
      (Math.random() - 0.5) * 0.4,
      0.9,
      0.24,
      0.95,
      0.32,
      0.34,
      0.28,
      0.35,
    );

    const foundParts: string[] = [];
    const needRat = this.ratCount === 0 || Math.random() < 0.85;
    const needChapitas = this.chapitasCount === 0 || Math.random() < 0.9;
    let gotRat = false;
    let gotChapitas = 0;

    if (needRat && this.ratCount < 8) {
      this.ratCount += 1;
      gotRat = true;
      foundParts.push('+1 Rata');
    }
    if (needChapitas && this.chapitasCount < 16) {
      gotChapitas = Math.random() < 0.35 ? 2 : 1;
      this.chapitasCount = Math.min(16, this.chapitasCount + gotChapitas);
      foundParts.push(`+${gotChapitas} Chapita${gotChapitas > 1 ? 's' : ''}`);
    }
    if (!gotRat && gotChapitas === 0) {
      this.chapitasCount = Math.min(16, this.chapitasCount + 1);
      foundParts.push('+1 Chapita');
    }
    if (Math.random() < 0.28 && this.distractionCounts.bottle < 9) {
      this.distractionCounts.bottle += 1;
      foundParts.push('+1 Botella');
    }

    if (this.ratCount >= 1 && this.chapitasCount >= 1) {
      this.setInventoryNotice(
        `Basura: ${foundParts.join(' · ')} — Pulsa [K] o "Atar chapitas" para armar rata señuelo`,
        3.4,
      );
    } else {
      this.setInventoryNotice(`Encontraste en la basura: ${foundParts.join(' · ')}`, 2.8);
    }
    this.emitHud();
  }

  public craftDecoyRat(equipAfter = true): boolean {
    this.audio.unlock();
    if (this.gameState !== 'PLAYING' || this.editorMode) return false;
    if (this.ratCount < 1 || this.chapitasCount < 1) {
      this.setInventoryNotice(
        'Necesitas 1 rata y 1 chapitas (busca en contenedores y bolsas de basura)',
        2.6,
      );
      this.emitHud();
      return false;
    }
    if (this.distractionCounts.decoy_rat >= 9) {
      this.setInventoryNotice('Máximo de ratas señuelo alcanzado (9)', 2.2);
      this.emitHud();
      return false;
    }

    this.ratCount -= 1;
    this.chapitasCount -= 1;
    this.distractionCounts.decoy_rat += 1;
    this.audio.playChapitasJingle(1.0);
    this.audio.playRatSqueak(0.82);

    if (equipAfter) {
      this.activeDistractionKind = 'decoy_rat';
      this.equippedThrowable = 'decoy_rat';
      this.molotovLit = false;
      this.nailBombLit = false;
      this.cancelPendingThrowable(false);
      this.syncWeaponVisibility();
    }
    this.setInventoryNotice(
      'Rata señuelo armada con chapitas — Lánzala para atraer a los zombies [9 / Z]',
      2.8,
    );
    this.emitHud();
    return true;
  }

  private updateTrashSpots(dt: number) {
    let closest: WorldTrashSpot | null = null;
    let closestDistSq = 2.65 * 2.65;
    for (let i = 0; i < this.worldEnv.trashSpots.length; i++) {
      const spot = this.worldEnv.trashSpots[i];
      if (spot.searchedCooldown > 0) {
        spot.searchedCooldown = Math.max(0, spot.searchedCooldown - dt);
        spot.indicatorMat.color.setHex(0x64748b);
        spot.indicatorMat.opacity = 0.14;
        continue;
      }
      spot.indicatorMat.color.setHex(0xa3e635);
      spot.indicatorMat.opacity = 0.34 + 0.18 * Math.sin(this.elapsed * 3.8 + i * 0.9);

      const dx = spot.x - this.px;
      const dz = spot.z - this.pz;
      const dSq = dx * dx + dz * dz;
      if (dSq <= closestDistSq) {
        closestDistSq = dSq;
        closest = spot;
      }
    }
    this.nearTrashSpot = closest;
  }

  private resolveRatPosition(
    x: number,
    y: number,
    z: number,
    radius = 0.24,
  ): { x: number; z: number; hitBoundary: boolean } {
    if (this.activeZone === 'colon_interior') {
      const res = this.colonInterior.resolveCircleAndWalls(x, y, z, radius);
      const hitBoundary = Math.hypot(res.x - x, res.z - z) > 0.005;
      return { x: res.x, z: res.z, hitBoundary };
    }

    const res = this.resolveExteriorCollisions(x, y, z, radius, true);
    const hitBoundary = Math.hypot(res.x - x, res.z - z) > 0.005;
    return { x: res.x, z: res.z, hitBoundary };
  }

  private findNearbyRatCorner(x: number, z: number): { x: number; z: number } | null {
    if (this.activeZone === 'exterior_9_julio') {
      let bestX = x;
      let bestZ = z;
      let bestScore = Infinity;
      for (let i = 0; i < this.worldEnv.colliders.length; i++) {
        const c = this.worldEnv.colliders[i];
        const dx = x - c.x;
        const dz = z - c.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 22 && dist > 0.2) {
          const score = dist;
          if (score < bestScore) {
            bestScore = score;
            const nx = dx / dist;
            const nz = dz / dist;
            bestX = c.x + nx * (c.radius + 0.18);
            bestZ = c.z + nz * (c.radius + 0.18);
          }
        }
      }
      if (bestScore < Infinity) return { x: bestX, z: bestZ };
    }
    const edgeX = x >= 0 ? ARENA_HALF_X - 1.2 : -(ARENA_HALF_X - 1.2);
    const edgeZ = z >= 0 ? ARENA_HALF_Z - 1.2 : -(ARENA_HALF_Z - 1.2);
    return { x: edgeX, z: edgeZ };
  }

  private distractZombiesTowardRat(rat: DecoyRatEntity, radius = 23.0): number {
    const rSq = radius * radius;
    let luredCount = 0;
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (Math.abs(e.y - rat.y) > 5.0) continue;
      const dx = e.x - rat.x;
      const dz = e.z - rat.z;
      const dRatSq = dx * dx + dz * dz;
      if (dRatSq > rSq) continue;

      const dPlayer = Math.hypot(e.x - this.px, e.z - this.pz);
      const canPullFromChase =
        e.state === 'chase' &&
        (this.isCrouching || dPlayer > 5.0) &&
        dRatSq < dPlayer * dPlayer * 1.45;

      if (e.state === 'wander' || e.state === 'investigate' || canPullFromChase) {
        e.state = 'investigate';
        e.provoked = false;
        e.investigateX = rat.x;
        e.investigateZ = rat.z;
        e.investigateTimer = Math.max(e.investigateTimer, 2.2);
        e.distractedTimer = Math.max(e.distractedTimer, 2.2);
        e.suspicion = Math.min(0.45, Math.max(e.suspicion, 0.35));
        luredCount += 1;
      }
    }
    return luredCount;
  }

  private spawnDecoyRat(
    x: number,
    y: number,
    z: number,
    throwVx: number,
    throwVz: number,
  ) {
    const baseGy = this.floorAt(x, z, y);
    const resolved = this.resolveRatPosition(x, baseGy, z, 0.24);
    const gy = this.floorAt(resolved.x, resolved.z, baseGy);
    const dirLen = Math.hypot(throwVx, throwVz);
    const dirX = dirLen > 0.2 ? throwVx / dirLen : Math.sin(this.pyaw);
    const dirZ = dirLen > 0.2 ? throwVz / dirLen : Math.cos(this.pyaw);
    const yaw = Math.atan2(dirX, dirZ);

    const visuals = buildDecoyRatMesh();
    visuals.group.scale.setScalar(1.16);
    visuals.group.position.set(resolved.x, gy, resolved.z);
    visuals.group.rotation.y = yaw;
    this.scene.add(visuals.group);

    const speed = 3.8;
    const rat: DecoyRatEntity = {
      id: this.nextDecoyRatId++,
      x: resolved.x,
      y: gy,
      z: resolved.z,
      vx: dirX * speed,
      vz: dirZ * speed,
      yaw,
      age: 0,
      maxLife: 12.5 + Math.random() * 3.5,
      bounceCount: 0,
      jingleTimer: 0.45,
      squeakTimer: 1.1,
      wanderAngle: yaw,
      rippleTimer: 0.2,
      escapingTimer: 0,
      targetCornerX: null,
      targetCornerZ: null,
      visuals,
    };
    this.decoyRats.push(rat);

    const ratPos = { x: rat.x, y: gy + 0.2, z: rat.z };
    this.audio.playRatSqueak(1.0, ratPos);
    this.audio.playChapitasJingle(1.0, ratPos);
    this.spawnBurst(rat.x, gy + 0.16, rat.z, 7, 0.85, 0.9, 0.55, 3.6);
    this.spawnNoiseRipple(rat.x, gy, rat.z, 10.5, 0xa3e635, 0.72);
    const lured = this.distractZombiesTowardRat(rat, 24.0);
    this.setInventoryNotice(
      lured > 0
        ? `¡Rata señuelo suelta! ${lured} zombie${lured > 1 ? 's' : ''} la persigue${lured > 1 ? 'n' : ''}`
        : '¡Rata señuelo suelta! Sus chapitas atraen a los zombies cercanos',
      2.6,
    );
  }

  private updateDecoyRats(dt: number) {
    for (let i = this.decoyRats.length - 1; i >= 0; i--) {
      const rat = this.decoyRats[i];
      rat.age += dt;

      if (rat.escapingTimer > 0) {
        rat.escapingTimer -= dt;
        const shrink = Math.max(0.05, (rat.escapingTimer / 0.36) * 1.16);
        rat.visuals.group.scale.setScalar(shrink);
        rat.x += rat.vx * 0.4 * dt;
        rat.z += rat.vz * 0.4 * dt;
        rat.visuals.group.position.set(rat.x, rat.y, rat.z);
        if (rat.escapingTimer <= 0) {
          this.scene.remove(rat.visuals.group);
          rat.visuals.dispose();
          this.decoyRats.splice(i, 1);
          this.setInventoryNotice('La rata señuelo se escurrió por un rincón', 2.4);
        }
        continue;
      }

      // 1. Check if any pursuing zombie caught the rat ("hasta que la agarre uno")
      let catcher: EnemyEntity | null = null;
      let nearestEnemy: EnemyEntity | null = null;
      let nearestEnemyDistSq = Infinity;
      for (let j = 0; j < this.enemies.length; j++) {
        const e = this.enemies[j];
        if (Math.abs(e.y - rat.y) > 2.2) continue;
        const edx = e.x - rat.x;
        const edz = e.z - rat.z;
        const dSq = edx * edx + edz * edz;
        if (dSq < nearestEnemyDistSq) {
          nearestEnemyDistSq = dSq;
          nearestEnemy = e;
        }
        const catchDist = e.radius + 0.48;
        if (dSq <= catchDist * catchDist) {
          catcher = e;
          break;
        }
      }

      if (catcher) {
        catcher.state = 'attack';
        catcher.attackDuration = 0.46;
        catcher.stateTimer = 0.46;
        catcher.attackCooldown = 1.65;
        catcher.squash = 0.78;
        catcher.vx = 0;
        catcher.vz = 0;
        catcher.distractedTimer = 1.4;
        catcher.investigateTimer = 1.4;

        this.audio.playRatCaught({ x: rat.x, y: rat.y + 0.2, z: rat.z });
        this.spawnBurst(rat.x, rat.y + 0.14, rat.z, 10, 0.82, 0.56, 0.38, 4.4);
        this.spawnSmokePuff(rat.x, rat.y + 0.14, rat.z, 0, 0.6, 0, 0.75, 0.22, 0.75, 0.42, 0.36, 0.3, 0.32);
        this.scene.remove(rat.visuals.group);
        rat.visuals.dispose();
        this.decoyRats.splice(i, 1);
        this.setInventoryNotice('¡Un zombie atrapó la rata señuelo!', 2.5);
        continue;
      }

      // 2. Steer the rat: dodge nearby zombies, scurry briskly, and later seek a corner ("un rincón")
      let steerX = Math.sin(rat.wanderAngle);
      let steerZ = Math.cos(rat.wanderAngle);

      if (rat.age > rat.maxLife * 0.6 && rat.targetCornerX === null) {
        const corner = this.findNearbyRatCorner(rat.x, rat.z);
        if (corner) {
          rat.targetCornerX = corner.x;
          rat.targetCornerZ = corner.z;
        }
      }

      if (rat.targetCornerX !== null && rat.targetCornerZ !== null) {
        const cdx = rat.targetCornerX - rat.x;
        const cdz = rat.targetCornerZ - rat.z;
        const cLen = Math.hypot(cdx, cdz);
        if (cLen > 0.25) {
          steerX = (cdx / cLen) * 1.15;
          steerZ = (cdz / cLen) * 1.15;
        }
      } else {
        rat.wanderAngle += (Math.sin(this.elapsed * 4.3 + rat.id * 1.7) * 1.6) * dt;
      }

      if (nearestEnemy && nearestEnemyDistSq < 36.0) {
        const awayX = rat.x - nearestEnemy.x;
        const awayZ = rat.z - nearestEnemy.z;
        const awayLen = Math.max(0.05, Math.sqrt(nearestEnemyDistSq));
        const panic = 1.0 - THREE.MathUtils.clamp(awayLen / 6.0, 0, 1);
        steerX += (awayX / awayLen) * (1.2 + panic * 1.6);
        steerZ += (awayZ / awayLen) * (1.2 + panic * 1.6);
      }

      const steerLen = Math.max(0.001, Math.hypot(steerX, steerZ));
      const desiredSpeed = nearestEnemy && nearestEnemyDistSq < 20.0 ? 4.35 : 3.55;
      const targetVx = (steerX / steerLen) * desiredSpeed;
      const targetVz = (steerZ / steerLen) * desiredSpeed;
      rat.vx += (targetVx - rat.vx) * (1 - Math.exp(-8 * dt));
      rat.vz += (targetVz - rat.vz) * (1 - Math.exp(-8 * dt));

      const nextX = rat.x + rat.vx * dt;
      const nextZ = rat.z + rat.vz * dt;
      const resolved = this.resolveRatPosition(nextX, rat.y, nextZ, 0.22);
      rat.x = resolved.x;
      rat.z = resolved.z;
      rat.y = this.floorAt(rat.x, rat.z, rat.y);

      if (resolved.hitBoundary) {
        rat.bounceCount += 1;
        if (rat.age >= 5.5 && (rat.targetCornerX !== null || rat.age >= rat.maxLife * 0.72)) {
          rat.escapingTimer = 0.36;
          this.audio.playRatSqueak(0.7, { x: rat.x, y: rat.y + 0.2, z: rat.z });
          this.spawnSmokePuff(rat.x, rat.y + 0.1, rat.z, 0, 0.55, 0, 0.6, 0.18, 0.65, 0.45, 0.42, 0.36, 0.28);
          continue;
        }
        rat.wanderAngle += Math.PI * 0.65 + (Math.random() - 0.5) * 0.5;
        rat.vx = Math.sin(rat.wanderAngle) * desiredSpeed;
        rat.vz = Math.cos(rat.wanderAngle) * desiredSpeed;
      }

      if (rat.age >= rat.maxLife) {
        rat.escapingTimer = 0.36;
        this.audio.playRatSqueak(0.7, { x: rat.x, y: rat.y + 0.2, z: rat.z });
        this.spawnSmokePuff(rat.x, rat.y + 0.1, rat.z, 0, 0.55, 0, 0.6, 0.18, 0.65, 0.45, 0.42, 0.36, 0.28);
        continue;
      }

      // 3. Visual animation (4 legs, head bob, tail wag, jingling chapitas)
      const moveYaw = Math.atan2(rat.vx, rat.vz);
      const yDiff = Math.atan2(Math.sin(moveYaw - rat.yaw), Math.cos(moveYaw - rat.yaw));
      rat.yaw += yDiff * (1 - Math.exp(-12 * dt));
      rat.visuals.group.position.set(rat.x, rat.y, rat.z);
      rat.visuals.group.rotation.y = rat.yaw;

      const phase = this.elapsed * 26 + rat.id * 1.9;
      rat.visuals.legPivots.forEach((lp, idx) => {
        const s = idx === 0 || idx === 3 ? 1 : -1;
        lp.rotation.x = Math.sin(phase) * 0.65 * s;
      });
      rat.visuals.headPivot.rotation.y = Math.sin(phase * 0.45) * 0.18;
      rat.visuals.headPivot.rotation.x = Math.cos(phase * 0.8) * 0.08;
      rat.visuals.tailPivot.rotation.y = Math.sin(phase * 0.72) * 0.42;
      rat.visuals.tailPivot.rotation.x = 0.22 + Math.cos(phase * 0.6) * 0.1;
      rat.visuals.chapitasPivot.rotation.z = Math.sin(phase * 1.25) * 0.28;
      rat.visuals.chapitasPivot.rotation.x = Math.cos(phase * 1.1) * 0.18;

      // 4. Audio cues + acoustic ripples + continuous zombie pursuit tracking
      const distPlayer = Math.hypot(this.px - rat.x, this.pz - rat.z);
      const gain = THREE.MathUtils.clamp(1.1 - distPlayer / 32, 0.18, 1.0);
      const ratPos = { x: rat.x, y: rat.y + 0.2, z: rat.z };
      rat.jingleTimer -= dt;
      if (rat.jingleTimer <= 0) {
        rat.jingleTimer = 0.58 + Math.random() * 0.22;
        this.audio.playChapitasJingle(gain, ratPos);
      }
      rat.squeakTimer -= dt;
      if (rat.squeakTimer <= 0) {
        rat.squeakTimer = 1.35 + Math.random() * 0.9;
        this.audio.playRatSqueak(gain * 0.9, ratPos);
      }
      rat.rippleTimer -= dt;
      if (rat.rippleTimer <= 0) {
        rat.rippleTimer = 0.9;
        this.spawnNoiseRipple(rat.x, rat.y, rat.z, 7.2, 0xa3e635, 0.52);
      }

      this.distractZombiesTowardRat(rat, 24.0);
    }
  }

  private updateThrownThrowables(dt: number) {
    for (let i = this.thrownThrowables.length - 1; i >= 0; i--) {
      const t = this.thrownThrowables[i];
      t.age += dt;
      const prevX = t.x;
      const prevY = t.y;
      const prevZ = t.z;
      t.vy -= 19.0 * dt;
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      t.z += t.vz * dt;
      t.mesh.position.set(t.x, t.y, t.z);
      t.mesh.rotation.x += dt * 10;
      t.mesh.rotation.z += dt * 7;

      if (t.kind === 'molotov') {
        if (Math.random() < dt * 28) {
          this.spawnSmokePuff(
            t.x,
            t.y + 0.08,
            t.z,
            (Math.random() - 0.5) * 0.35,
            0.9 + Math.random() * 0.4,
            (Math.random() - 0.5) * 0.35,
            0.75 + Math.random() * 0.35,
            0.16,
            0.62,
            0.18,
            0.18,
            0.2,
            0.38,
          );
        }
        if (Math.random() < dt * 22) {
          this.spawnParticle(
            t.x,
            t.y + 0.06,
            t.z,
            (Math.random() - 0.5) * 1.1,
            0.8 + Math.random() * 1.2,
            (Math.random() - 0.5) * 1.1,
            0.18,
            0.42,
            3.5,
            1.0,
            0.55,
            0.1,
          );
        }
      }

      let hit = false;
      let hitEnemy: EnemyEntity | null = null;
      const gy = this.floorAt(t.x, t.z, prevY);
      if (t.y <= gy + 0.14) {
        hit = true;
      }

      if (!hit && t.age > 0.04 && this.activeZone === 'colon_interior') {
        if (!this.colonInterior.hasLineOfSight(prevX, prevY, prevZ, t.x, t.y, t.z)) {
          hit = true;
        }
      }

      if (!hit && t.age > 0.05) {
        for (let j = 0; j < this.enemies.length; j++) {
          const e = this.enemies[j];
          const edx = e.x - t.x;
          const edz = e.z - t.z;
          const maxR = e.radius + 0.42;
          if (edx * edx + edz * edz <= maxR * maxR) {
            const ey = e.y;
            if (t.y >= ey - 0.1 && t.y <= ey + 2.2) {
              hit = true;
              hitEnemy = e;
              break;
            }
          }
        }
      }

      if (!hit && t.age > 0.04 && this.activeZone === 'exterior_9_julio') {
        const cf = this.getCampfirePos();
        const cfDx = t.x - cf.x;
        const cfDz = t.z - cf.z;
        if (cfDx * cfDx + cfDz * cfDz <= 0.7225 && t.y <= groundHeightAt(cf.x, cf.z) + 1.45) {
          hit = true;
        }
      }

      if (!hit && t.age > 0.04 && this.activeZone === 'exterior_9_julio') {
        for (let k = 0; k < this.worldEnv.harvestNodes.length; k++) {
          const n = this.worldEnv.harvestNodes[k];
          if (n.hp > 0) {
            const ndx = n.x - t.x;
            const ndz = n.z - t.z;
            if (ndx * ndx + ndz * ndz <= 0.7225 && t.y <= groundHeightAt(n.x, n.z) + 1.35) {
              hit = true;
              break;
            }
          }
        }
      }

      if (!hit && t.age > 0.04 && this.activeZone === 'exterior_9_julio') {
        for (let cIdx = 0; cIdx < this.worldEnv.colliders.length; cIdx++) {
          const c = this.worldEnv.colliders[cIdx];
          const cdx = c.x - t.x;
          const cdz = c.z - t.z;
          const maxR = c.radius + 0.3;
          if (cdx * cdx + cdz * cdz <= maxR * maxR) {
            const baseY = groundHeightAt(c.x, c.z);
            if (t.y >= baseY - 0.1 && t.y <= baseY + c.height) {
              hit = true;
              break;
            }
          }
        }
        if (
          !hit &&
          (this.segmentHitsFastFoodWalls(prevX, prevY, prevZ, t.x, t.y, t.z, false) ||
            this.segmentHitsWorldBoxes(prevX, prevY, prevZ, t.x, t.y, t.z, false))
        ) {
          hit = true;
        }
      }

      if (hit || t.age > 4.0) {
        const hitX = t.x;
        const hitY = t.y;
        const hitZ = t.z;
        const kind = t.kind;
        this.scene.remove(t.mesh);
        t.disposeMesh();
        this.thrownThrowables.splice(i, 1);
        if (kind === 'molotov') {
          this.detonateMolotovAt(hitX, hitY, hitZ);
        } else if (kind === 'nail_bomb') {
          this.detonateNailBombAt(hitX, hitY, hitZ);
        } else if (kind === 'bottle' || kind === 'can' || kind === 'brick') {
          this.impactDistractionAt(kind, hitX, hitY, hitZ, hitEnemy);
        } else if (kind === 'decoy_rat') {
          this.spawnDecoyRat(hitX, hitY, hitZ, t.vx, t.vz);
        } else {
          this.triggerThermobaricGrenade(hitX, hitZ);
        }
      }
    }
  }

  private updateFireZones(dt: number) {
    for (let i = this.fireZones.length - 1; i >= 0; i--) {
      const fz = this.fireZones[i];
      fz.age += dt;
      fz.life -= dt;
      if (fz.life <= 0) {
        this.scene.remove(fz.group);
        fz.dispose();
        this.fireZones.splice(i, 1);
        continue;
      }

      const fade = THREE.MathUtils.clamp(fz.life / 0.8, 0, 1);
      fz.ringMat.opacity = 0.72 * fade;
      fz.flameCluster.update(this.elapsed, 1.0, 1.0, fade);
      if (fz.pointLight) {
        fz.pointLight.intensity = (4.6 + Math.sin(this.elapsed * 18 + i) * 1.1) * fade;
      }

      if (Math.random() < 0.42) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * (fz.radius * 0.85);
        this.spawnParticle(
          fz.x + Math.cos(a) * r,
          fz.y + 0.25,
          fz.z + Math.sin(a) * r,
          (Math.random() - 0.5) * 0.85,
          1.8 + Math.random() * 1.6,
          (Math.random() - 0.5) * 0.85,
          0.22,
          0.55,
          -1.2,
          1.0,
          0.55,
          0.1,
        );
      }

      if (Math.random() < dt * 16) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * (fz.radius * 0.75);
        const shade = 0.11 + Math.random() * 0.08;
        this.spawnSmokePuff(
          fz.x + Math.cos(a) * r,
          fz.y + 0.6 + Math.random() * 0.4,
          fz.z + Math.sin(a) * r,
          0.22 + (Math.random() - 0.5) * 0.45,
          1.65 + Math.random() * 0.95,
          -0.12 + (Math.random() - 0.5) * 0.45,
          1.5 + Math.random() * 0.9,
          0.45,
          2.05,
          shade,
          shade,
          shade + 0.015,
          0.44 * fade,
        );
      }

      // Progressive burn tick every 0.25s (5% of maxHp per tick -> 25% in 1.25s, continues across 5s fire)
      fz.tickTimer -= dt;
      if (fz.tickTimer <= 0) {
        fz.tickTimer = 0.25;
        const enemyBurnRSq = (fz.radius + 0.18) * (fz.radius + 0.18);
        for (let j = this.enemies.length - 1; j >= 0; j--) {
          const e = this.enemies[j];
          if (Math.abs(e.y - fz.y) > 2.2) continue;
          const edx = e.x - fz.x;
          const edz = e.z - fz.z;
          if (edx * edx + edz * edz <= enemyBurnRSq) {
            // Refresh 5 burn ticks (25% total progressive damage) whenever entering/inside radius
            e.burnTicksRemaining = Math.max(e.burnTicksRemaining, 5);
            if (e.burnTickTimer <= 0) {
              e.burnTickTimer = 0.25;
              e.burnTicksRemaining = Math.max(0, e.burnTicksRemaining - 1);
              const burnDmg = Math.max(1, Math.round(e.maxHp * 0.05));
              this.damageEnemy(
                e,
                burnDmg,
                0,
                0,
                'torso',
                { x: e.x, y: e.y + 0.9, z: e.z },
                undefined,
                true,
              );
            }
          }
        }

        const pDx = this.px - fz.x;
        const pDz = this.pz - fz.z;
        if (
          fz.age > 0.35 &&
          pDx * pDx + pDz * pDz <= fz.radius * fz.radius &&
          Math.abs(this.py - fz.y) <= 1.6
        ) {
          const playerBurnDmg = Math.max(1, Math.round(this.maxHp * 0.05));
          this.applyFireBurnToPlayer(playerBurnDmg);
        }
      }

      fz.crateTickTimer -= dt;
      if (fz.crateTickTimer <= 0 && this.activeZone === 'exterior_9_julio') {
        fz.crateTickTimer = 0.5;
        const crateBurnRSq = (fz.radius + 0.35) * (fz.radius + 0.35);
        for (let k = 0; k < this.worldEnv.harvestNodes.length; k++) {
          const n = this.worldEnv.harvestNodes[k];
          if (n.hp > 0) {
            const ndx = n.x - fz.x;
            const ndz = n.z - fz.z;
            if (ndx * ndx + ndz * ndz <= crateBurnRSq) {
              this.damageSupplyNode(n, 5);
            }
          }
        }
      }
    }
  }

  private updateBurningEnemies(dt: number) {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.burnTicksRemaining <= 0) continue;
      e.burnTickTimer -= dt;
      if (Math.random() < 0.34) {
        this.spawnParticle(
          e.x + (Math.random() - 0.5) * 0.45,
          e.y + 0.7 + Math.random() * 0.8,
          e.z + (Math.random() - 0.5) * 0.45,
          0,
          1.4,
          0,
          0.18,
          0.42,
          -0.6,
          1.0,
          0.48,
          0.08,
        );
      }
      if (Math.random() < dt * 7.5) {
        const shade = 0.13 + Math.random() * 0.08;
        this.spawnSmokePuff(
          e.x + (Math.random() - 0.5) * 0.4,
          e.y + 1.05 + Math.random() * 0.55,
          e.z + (Math.random() - 0.5) * 0.4,
          (Math.random() - 0.5) * 0.35,
          1.25 + Math.random() * 0.65,
          (Math.random() - 0.5) * 0.35,
          1.1 + Math.random() * 0.6,
          0.32,
          1.3,
          shade,
          shade,
          shade + 0.01,
          0.36,
        );
      }
      if (e.burnTickTimer <= 0) {
        e.burnTickTimer = 0.25;
        e.burnTicksRemaining -= 1;
        const burnDmg = Math.max(1, Math.round(e.maxHp * 0.05));
        this.damageEnemy(
          e,
          burnDmg,
          0,
          0,
          'torso',
          { x: e.x, y: e.y + 0.9, z: e.z },
          undefined,
          true,
        );
      }
    }
  }

  private updateNailShrapnels(dt: number) {
    for (let i = this.nailShrapnels.length - 1; i >= 0; i--) {
      const n = this.nailShrapnels[i];
      n.life -= dt;
      n.vy -= 14.0 * dt;
      n.x += n.vx * dt;
      n.y += n.vy * dt;
      n.z += n.vz * dt;
      const gy = this.floorAt(n.x, n.z, n.y);
      if (n.y < gy + 0.04) {
        n.y = gy + 0.04;
        n.vx *= 0.25;
        n.vy = 0;
        n.vz *= 0.25;
      }
      n.mesh.position.set(n.x, n.y, n.z);
      if (Math.abs(n.vx) + Math.abs(n.vz) > 0.2) {
        n.mesh.lookAt(n.x + n.vx, n.y + n.vy, n.z + n.vz);
      }
      if (n.life <= 0) {
        this.scene.remove(n.mesh);
        if (this.nailMeshPool.length < 64) this.nailMeshPool.push(n.mesh);
        this.nailShrapnels.splice(i, 1);
      }
    }
  }

  private updatePickups(dt: number) {
    const magnetRange = 5.4;

    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      if (Number.isFinite(pk.life)) {
        pk.life -= dt;
      }
      const gy = this.floorAt(pk.x, pk.z, pk.y);
      pk.vy -= 14 * dt;
      pk.y += pk.vy * dt;
      if (pk.y < gy + 0.45) {
        pk.y = gy + 0.45;
        pk.vy = 0;
      }

      const dx = this.px - pk.x;
      const dz = this.pz - pk.z;
      const dist = Math.hypot(dx, dz);
      const sameFloor = Math.abs(this.py - pk.y) <= 2.2;
      const needsBackpackOnly = !this.hasBackpack && (pk.kind === 'molotov' || pk.kind === 'nail_bomb');
      if (sameFloor && !needsBackpackOnly && dist < magnetRange && dist > 0.01) {
        const pull = 12 * dt;
        pk.x += (dx / dist) * pull;
        pk.z += (dz / dist) * pull;
      }

      pk.mesh.position.set(pk.x, pk.y + Math.sin(this.elapsed * 4 + i) * 0.08, pk.z);
      pk.mesh.rotation.y += dt * 2.4;

      if (sameFloor && dist <= 1.2) {
        let collected = true;
        if (pk.kind === 'backpack') {
          this.unlockBackpack();
          this.score += 150;
          this.spawnBurst(this.px, this.py + 1.0, this.pz, 18, 0.96, 0.72, 0.2, 5.5);
        } else if (pk.kind === 'chemicals' || pk.kind === 'scrap' || pk.kind === 'powder') {
          this.provisions[pk.kind] += 1;
          this.score += 45;
          this.audio.playPickup(this.combo);
          const label =
            pk.kind === 'chemicals'
              ? 'Alcohol / Químicos'
              : pk.kind === 'scrap'
                ? 'Chatarra y Clavos'
                : 'Pólvora';
          this.setInventoryNotice(`+1 Provisión: ${label}`, 2.4);
          this.emitHud();
        } else if (pk.kind === 'stick') {
          const wasUnlocked = this.unlockedWeapons.stick;
          this.unlockedWeapons.stick = true;
          if (!wasUnlocked && this.weapon === 'unarmed') {
            this.weapon = 'stick';
            this.syncWeaponVisibility();
          }
          this.score += 35;
          this.audio.playWeaponUnlock();
          this.setInventoryNotice(
            wasUnlocked
              ? 'Palo de madera (+35 pts)'
              : '¡Palo recogido! Arma cuerpo a cuerpo equipada [2]',
            2.4,
          );
          this.emitHud();
        } else if (pk.kind === 'baton') {
          const wasUnlocked = this.unlockedWeapons.baton;
          this.unlockedWeapons.baton = true;
          if (!wasUnlocked && (this.weapon === 'unarmed' || this.weapon === 'stick')) {
            this.weapon = 'baton';
            this.syncWeaponVisibility();
          }
          this.score += 65;
          this.audio.playWeaponUnlock();
          this.setInventoryNotice(
            wasUnlocked
              ? 'Bastón policía (+65 pts)'
              : '¡Bastón policía equipado! [V] o [2]',
            2.6,
          );
          this.emitHud();
        } else if (pk.kind === 'helmet') {
          if (this.helmetArmor >= this.helmetMaxArmor - 2) {
            collected = false;
            if (this.inventoryNoticeTimer <= 0) {
              this.setInventoryNotice('Tu Casco balístico ya está al máximo', 2.0);
            }
          } else {
            this.helmetArmor = this.helmetMaxArmor;
            this.syncArmorVisibility();
            this.score += 120;
            this.audio.playArmorEquip();
            this.spawnBurst(this.px, this.py + 1.55, this.pz, 12, 0.35, 0.78, 0.96, 4.5);
            this.setInventoryNotice(
              `¡Casco balístico equipado! Vida útil: ${this.helmetMaxArmor}`,
              2.8,
            );
            this.emitHud();
          }
        } else if (pk.kind === 'vest') {
          if (this.vestArmor >= this.vestMaxArmor - 2) {
            collected = false;
            if (this.inventoryNoticeTimer <= 0) {
              this.setInventoryNotice('Tu Chaleco antibalas ya está al máximo', 2.0);
            }
          } else {
            this.vestArmor = this.vestMaxArmor;
            this.syncArmorVisibility();
            this.score += 150;
            this.audio.playArmorEquip();
            this.spawnBurst(this.px, this.py + 1.1, this.pz, 14, 0.35, 0.85, 0.65, 4.5);
            this.setInventoryNotice(
              `¡Chaleco antibalas equipado! Vida útil: ${this.vestMaxArmor}`,
              2.8,
            );
            this.emitHud();
          }
        } else if (pk.kind === 'bow') {
          const wasUnlocked = this.unlockedWeapons.bow;
          this.unlockedWeapons.bow = true;
          this.arrows += wasUnlocked ? 4 : 6;
          if (
            !wasUnlocked &&
            (this.weapon === 'unarmed' || this.weapon === 'stick' || this.weapon === 'baton')
          ) {
            this.weapon = 'bow';
          }
          this.syncWeaponVisibility();
          this.score += 75;
          this.audio.playWeaponUnlock();
          this.setInventoryNotice(
            wasUnlocked
              ? 'Arco Recurvo (+4 Flechas)'
              : '¡Arco Recurvo equipado! Mantén Disparo para tensar (+6 flechas)',
            2.8,
          );
          this.emitHud();
        } else if (pk.kind === 'arrows') {
          this.arrows += 8;
          if (this.weapon === 'bow') {
            this.syncWeaponVisibility();
          }
          this.score += 35;
          this.audio.playPickup(this.combo);
          this.setInventoryNotice(`+8 Flechas (Total: ${this.arrows})`, 2.0);
          this.emitHud();
        } else if (pk.kind === 'pistol') {
          const wasUnlocked = this.unlockedWeapons.pistol;
          this.unlockedWeapons.pistol = true;
          if (!wasUnlocked && this.pistolAmmo === 0) {
            this.pistolAmmo = this.pistolMaxAmmo;
          } else {
            this.pistolReserveAmmo += 8;
          }
          if (this.weapon === 'unarmed' || this.weapon === 'stick' || this.weapon === 'baton') {
            this.weapon = 'pistol';
            this.syncWeaponVisibility();
          }
          this.score += 90;
          this.audio.playWeaponUnlock();
          this.setInventoryNotice(
            wasUnlocked
              ? 'Revólver (+8 cartuchos .38)'
              : '¡Revólver de Policía desbloqueado y equipado! [4]',
            2.8,
          );
          this.emitHud();
        } else if (pk.kind === 'rifle') {
          const wasUnlocked = this.unlockedWeapons.rifle;
          this.unlockedWeapons.rifle = true;
          if (!wasUnlocked && this.rifleAmmo === 0) {
            this.rifleAmmo = this.rifleMaxAmmo;
          } else {
            this.rifleReserveAmmo += 20;
          }
          if (this.weapon !== 'rifle') {
            this.weapon = 'rifle';
            this.syncWeaponVisibility();
          }
          this.score += 120;
          this.audio.playWeaponUnlock();
          this.setInventoryNotice(
            wasUnlocked
              ? 'Fusil FAL (+20 cartuchos 7.62mm)'
              : '¡Fusil FAL de Gendarmería equipado! [5]',
            2.8,
          );
          this.emitHud();
        } else if (pk.kind === 'fal_ammo') {
          this.rifleReserveAmmo += 20;
          this.score += 40;
          this.audio.playPickup(this.combo);
          this.setInventoryNotice('+20 Munición Fusil FAL (1 cargador)', 2.2);
          this.emitHud();
        } else if (pk.kind === 'pistol_ammo') {
          this.pistolReserveAmmo += 16;
          this.score += 35;
          this.audio.playPickup(this.combo);
        } else if (pk.kind === 'molotov' || pk.kind === 'nail_bomb') {
          if (!this.hasBackpack) {
            collected = false;
            if (this.inventoryNoticeTimer <= 0) {
              this.setInventoryNotice('Encuentra la Mochila en el mapa para guardar armas lanzables', 2.6);
            }
          } else if (this.tryAddItemToInventory(pk.kind, 1)) {
            this.score += 55;
            this.audio.playPickup(this.combo);
          } else {
            collected = false;
            if (this.inventoryNoticeTimer <= 0) {
              this.setInventoryNotice('Mochila llena (8/8). Usa o suelta un objeto', 2.4);
            }
          }
        } else if (pk.kind === 'bottle' || pk.kind === 'can' || pk.kind === 'brick') {
          if (this.distractionCounts[pk.kind] < 9) {
            this.distractionCounts[pk.kind] += 1;
            if (
              this.getTotalDistractions() === 1 ||
              (this.equippedThrowable !== 'bottle' &&
                this.equippedThrowable !== 'can' &&
                this.equippedThrowable !== 'brick')
            ) {
              this.activeDistractionKind = pk.kind;
            }
            this.score += 20;
            this.audio.playPickup(this.combo);
            const label =
              pk.kind === 'bottle'
                ? 'Botella de vidrio'
                : pk.kind === 'can'
                  ? 'Lata metálica'
                  : 'Ladrillo';
            this.setInventoryNotice(`+1 ${label} (Distracción)`, 1.9);
            this.emitHud();
          } else {
            collected = false;
          }
        } else if (pk.kind === 'ember') {
          if (this.flareCharge < 100) {
            this.flareCharge = Math.min(100, this.flareCharge + 12);
            this.score += 45 * this.combo;
            this.audio.playPickup(this.combo);
          } else if (this.hasBackpack && this.tryAddItemToInventory('ember', 1)) {
            this.score += 45 * this.combo;
            this.audio.playPickup(this.combo);
          } else {
            this.flareCharge = Math.min(100, this.flareCharge + 12);
            this.score += 45 * this.combo;
            this.audio.playPickup(this.combo);
          }
        } else if (pk.kind === 'wood') {
          if (this.hasBackpack) {
            if (this.tryAddItemToInventory('wood', 1)) {
              this.hp = Math.min(this.maxHp, this.hp + 10);
              this.score += 35;
              this.audio.playPickup(this.combo);
            } else {
              collected = false;
              if (this.inventoryNoticeTimer <= 0) {
                this.setInventoryNotice('Mochila llena (8/8). Haz espacio para recoger Madera', 2.4);
              }
            }
          } else {
            this.wood += 1;
            this.hp = Math.min(this.maxHp, this.hp + 10);
            this.score += 35;
            this.audio.playPickup(this.combo);
          }
        } else if (pk.kind === 'bandage') {
          if (this.hasBackpack) {
            if (this.tryAddItemToInventory('bandage', 1)) {
              this.score += 50;
              this.audio.playPickup(this.combo);
            } else {
              collected = false;
              if (this.inventoryNoticeTimer <= 0) {
                this.setInventoryNotice('Mochila llena (8/8). Haz espacio para recoger Vendajes', 2.4);
              }
            }
          } else {
            this.bandages += 1;
            this.score += 50;
            this.audio.playPickup(this.combo);
          }
        } else if (pk.kind === 'food') {
          if (this.hasBackpack) {
            if (this.tryAddItemToInventory('food', 1)) {
              this.score += 45;
              this.audio.playPickup(this.combo);
            } else {
              collected = false;
              if (this.inventoryNoticeTimer <= 0) {
                this.setInventoryNotice('Mochila llena (8/8). Haz espacio para recoger Comida', 2.4);
              }
            }
          } else {
            this.food += 1;
            this.score += 45;
            this.audio.playPickup(this.combo);
          }
        }

        if (collected) {
          this.scene.remove(pk.mesh);
          pk.disposeMesh?.();
          this.pickups.splice(i, 1);
        }
      } else if (pk.life <= 0) {
        this.scene.remove(pk.mesh);
        pk.disposeMesh?.();
        this.pickups.splice(i, 1);
      }
    }
  }

  private hasLineOfSightToPlayer(ex: number, ez: number, ey = this.py): boolean {
    if (this.activeZone === 'colon_interior') {
      return this.colonInterior.hasLineOfSight(
        ex,
        ey + 1.25,
        ez,
        this.px,
        this.py + 1.25,
        this.pz,
      );
    }
    const segDx = this.px - ex;
    const segDz = this.pz - ez;
    const segLenSq = segDx * segDx + segDz * segDz;
    if (segLenSq < 0.01) return true;

    for (let i = 0; i < this.worldEnv.colliders.length; i++) {
      const c = this.worldEnv.colliders[i];
      const baseY = groundHeightAt(c.x, c.z);
      if (baseY + c.height < Math.min(ey, this.py) + 1.15) continue;
      const t = THREE.MathUtils.clamp(
        ((c.x - ex) * segDx + (c.z - ez) * segDz) / segLenSq,
        0,
        1,
      );
      const closestX = ex + t * segDx;
      const closestZ = ez + t * segDz;
      const distSq = (c.x - closestX) * (c.x - closestX) + (c.z - closestZ) * (c.z - closestZ);
      const blockR = c.radius * 0.85;
      if (distSq < blockR * blockR) return false;
    }
    if (
      this.segmentHitsFastFoodWalls(
        ex,
        ey + 1.25,
        ez,
        this.px,
        this.py + 1.25,
        this.pz,
        true,
      ) ||
      this.segmentHitsWorldBoxes(
        ex,
        ey + 1.25,
        ez,
        this.px,
        this.py + 1.25,
        this.pz,
        true,
      )
    ) {
      return false;
    }
    return true;
  }

  private isPlayerHiddenInTallGrass(): boolean {
    return (
      this.activeZone === 'exterior_9_julio' &&
      this.isCrouching &&
      isPointInPlazaTallGrass(this.px, this.pz) &&
      this.recoilTimer <= 0
    );
  }

  private getPlayerNoiseMetrics(): { noiseRadius: number; normalizedNoise: number } {
    const playerSpeed = Math.hypot(this.pvx, this.pvz);
    const inGrass =
      this.activeZone === 'exterior_9_julio' &&
      this.isCrouching &&
      isPointInPlazaTallGrass(this.px, this.pz);
    let noiseRadius: number;
    let normalizedNoise: number;
    if (this.isCrouching) {
      if (playerSpeed > 0.65) {
        noiseRadius = inGrass ? 1.05 : 1.35;
        normalizedNoise = inGrass ? 0.1 : 0.14;
      } else {
        noiseRadius = inGrass ? 0.42 : 0.55;
        normalizedNoise = inGrass ? 0.03 : 0.04;
      }
    } else if (playerSpeed > 6.4) {
      noiseRadius = 10.5;
      normalizedNoise = 0.96;
    } else if (playerSpeed > 1.0) {
      noiseRadius = 5.4;
      normalizedNoise = 0.52;
    } else {
      noiseRadius = 2.0;
      normalizedNoise = 0.18;
    }
    if (this.recoilTimer > 0) {
      normalizedNoise = 1.0;
    }
    if (this.stealthNoiseBoostTimer > 0) {
      normalizedNoise = Math.max(normalizedNoise, this.stealthNoiseBoostLevel);
    }
    return { noiseRadius, normalizedNoise };
  }

  private canZombieSeePlayer(e: EnemyEntity, dx: number, dz: number, dist: number): boolean {
    const inGrassCover = this.isPlayerHiddenInTallGrass();
    if (this.isCrouching && e.distractedTimer > 0 && dist > (inGrassCover ? 1.4 : 2.2)) {
      return false;
    }
    const playerSpeed = Math.hypot(this.pvx, this.pvz);
    const unarmedMult = this.weapon === 'unarmed' ? 0.85 : 1.0;
    const sightRange = inGrassCover
      ? 2.15 * unarmedMult
      : (this.isCrouching ? 5.8 : playerSpeed > 6.5 ? 16.5 : 13.0) * unarmedMult;
    if (dist > sightRange) return false;

    const closeAwareness = inGrassCover
      ? 0.95
      : this.isCrouching
        ? this.weapon === 'unarmed'
          ? 0.9
          : 1.05
        : 2.8;
    if (dist <= closeAwareness) return this.hasLineOfSightToPlayer(e.x, e.z, e.y);

    const invD = 1 / Math.max(0.001, dist);
    const fx = Math.sin(e.yaw);
    const fz = Math.cos(e.yaw);
    const dot = fx * (dx * invD) + fz * (dz * invD);
    // Directional vision cone (~46 deg in tall grass, ~59 deg crouched, ~88 deg standing)
    const minCos = inGrassCover ? 0.92 : this.isCrouching ? 0.87 : 0.72;
    if (dot < minCos) return false;
    return this.hasLineOfSightToPlayer(e.x, e.z, e.y);
  }

  private alertNearbyPackmates(spotter: EnemyEntity) {
    const maxSq = 9.5 * 9.5;
    for (let i = 0; i < this.enemies.length; i++) {
      const mate = this.enemies[i];
      if (mate.id === spotter.id) continue;
      if (mate.state !== 'wander' && mate.state !== 'investigate') continue;
      const dx = mate.x - spotter.x;
      const dz = mate.z - spotter.z;
      if (dx * dx + dz * dz <= maxSq) {
        mate.provoked = true;
        mate.suspicion = 1;
        mate.state = 'chase';
        mate.aggroTimer = 6.5;
        mate.investigateX = this.px;
        mate.investigateZ = this.pz;
        mate.alertTimer = Math.max(mate.alertTimer, 0.35);
      }
    }
  }

  private updateEnemies(dt: number) {
    const { noiseRadius } = this.getPlayerNoiseMetrics();
    const playerSpeed = Math.hypot(this.pvx, this.pvz);
    const inGrassCover = this.isPlayerHiddenInTallGrass();
    this.camera.updateMatrixWorld();
    _projScreenMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse,
    );
    _frustum.setFromProjectionMatrix(_projScreenMatrix);

    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      e.attackCooldown = Math.max(0, e.attackCooldown - dt);
      e.hitFlashTimer = Math.max(0, e.hitFlashTimer - dt);
      e.alertTimer = Math.max(0, e.alertTimer - dt);
      e.hitReactTimer = Math.max(0, e.hitReactTimer - dt);
      e.distractedTimer = Math.max(0, e.distractedTimer - dt);
      e.squash += (1 - e.squash) * (1 - Math.exp(-14 * dt));

      let targetX = this.px;
      let targetZ = this.pz;
      let targetIsMechanic = false;
      if (
        this.storyMission === 3 &&
        this.activeZone === 'exterior_9_julio' &&
        this.exteriorMechanicRig.root.visible &&
        !this.mechanicPinned &&
        (this.missionPhase === 'm3_defend_fastfood' || this.missionPhase === 'm3_escort_colon')
      ) {
        const dPlayer = Math.hypot(this.px - e.x, this.pz - e.z);
        const dMech = Math.hypot(this.mechanicPos.x - e.x, this.mechanicPos.z - e.z);
        if (dMech < dPlayer && dMech < 11.5) {
          targetX = this.mechanicPos.x;
          targetZ = this.mechanicPos.z;
          targetIsMechanic = true;
        }
      }

      const dx = targetX - e.x;
      const dz = targetZ - e.z;
      const distSq = dx * dx + dz * dz;
      const dist = Math.sqrt(distSq);
      const nx = dist > 0.001 ? dx / dist : 0;
      const nz = dist > 0.001 ? dz / dist : 1;

      const telMat = e.bundle.telegraphRing.material as THREE.MeshBasicMaterial;
      let desiredYaw = Math.atan2(nx, nz);

      if (e.state === 'wander') {
        telMat.opacity = 0;
        const canSee = this.canZombieSeePlayer(e, dx, dz, dist);

        if (canSee) {
          if (this.isCrouching && dist > (inGrassCover ? 1.1 : 1.8)) {
            // In stealth (especially tall grass), zombies require sustained proximity to lock on
            const sightGain = inGrassCover
              ? dist < 1.55
                ? 0.65
                : 0.36
              : dist < 3.6
                ? 1.35
                : 0.78;
            e.suspicion = Math.min(1, e.suspicion + dt * sightGain);
            e.investigateX = this.px;
            e.investigateZ = this.pz;
            if (e.suspicion >= 1.0) {
              e.state = 'chase';
              e.provoked = true;
              e.aggroTimer = inGrassCover ? 2.4 : 5.0;
              e.squash = 1.12;
              this.triggerZombieSpotAnim(e);
              this.alertNearbyPackmates(e);
            } else if (e.suspicion >= (inGrassCover ? 0.45 : 0.25)) {
              e.state = 'investigate';
              e.investigateTimer = inGrassCover ? 2.2 : 3.2;
            }
          } else {
            // Unstealthed visibility reacts & attacks immediately upon spotting Ricardo
            e.state = 'chase';
            e.provoked = true;
            e.suspicion = 1;
            e.aggroTimer = inGrassCover ? 2.6 : this.isCrouching ? 4.2 : 7.0;
            e.squash = 1.12;
            this.triggerZombieSpotAnim(e);
            this.alertNearbyPackmates(e);
          }
        } else {
          // Acoustic awareness strictly driven by getPlayerNoiseMetrics()
          if (dist < noiseRadius && this.hasLineOfSightToPlayer(e.x, e.z, e.y)) {
            const noiseGain = inGrassCover ? 0.28 : this.isCrouching ? 0.55 : 1.75;
            e.suspicion = Math.min(1, e.suspicion + dt * noiseGain);
            e.investigateX = this.px;
            e.investigateZ = this.pz;
            if (e.suspicion >= 0.35) {
              e.state = 'investigate';
              e.investigateTimer = inGrassCover ? 2.4 : 3.5;
            }
          } else {
            e.suspicion = Math.max(0, e.suspicion - dt * (inGrassCover ? 0.85 : 0.52));
          }

          if (e.state === 'wander') {
            if (e.wanderWait > 0) {
              e.wanderWait -= dt;
              e.vx *= Math.exp(-9 * dt);
              e.vz *= Math.exp(-9 * dt);
              desiredYaw = e.yaw + Math.sin(this.elapsed * 0.75 + e.id) * 0.22;
            } else {
              const wdx = e.wanderX - e.x;
              const wdz = e.wanderZ - e.z;
              const wdist = Math.hypot(wdx, wdz);
              if (wdist < 1.35) {
                const nextPt = this.pickWanderTarget(e.x, e.z, e.y);
                e.wanderX = nextPt.x;
                e.wanderZ = nextPt.z;
                e.wanderWait = 1.0 + Math.random() * 1.8;
              } else {
                const roamSpeed = e.speed * 0.38;
                const wnx = wdx / wdist;
                const wnz = wdz / wdist;
                e.vx += (wnx * roamSpeed - e.vx) * (1 - Math.exp(-6 * dt));
                e.vz += (wnz * roamSpeed - e.vz) * (1 - Math.exp(-6 * dt));
                desiredYaw = Math.atan2(wnx, wnz);
              }
            }
          }
        }
      } else if (e.state === 'investigate') {
        telMat.opacity = 0;
        e.investigateTimer -= dt;
        const canSee = this.canZombieSeePlayer(e, dx, dz, dist);

        if (canSee) {
          e.investigateX = this.px;
          e.investigateZ = this.pz;
          if ((!this.isCrouching && !inGrassCover) || dist <= (inGrassCover ? 1.05 : 1.7)) {
            e.state = 'chase';
            e.provoked = true;
            e.suspicion = 1;
            e.aggroTimer = inGrassCover ? 2.4 : this.isCrouching ? 4.0 : 6.5;
            e.squash = 1.12;
            this.triggerZombieSpotAnim(e);
            this.alertNearbyPackmates(e);
          } else {
            const invGain = inGrassCover
              ? dist < 1.6
                ? 0.75
                : 0.42
              : dist < 3.6
                ? 1.35
                : 0.78;
            e.suspicion = Math.min(1, e.suspicion + dt * invGain);
            e.investigateTimer = Math.max(e.investigateTimer, inGrassCover ? 1.4 : 2.2);
            if (e.suspicion >= 1.0) {
              e.state = 'chase';
              e.provoked = true;
              e.aggroTimer = inGrassCover ? 2.6 : 4.2;
              e.squash = 1.12;
              this.triggerZombieSpotAnim(e);
              this.alertNearbyPackmates(e);
            }
          }
        } else if (
          e.distractedTimer <= 0 &&
          !this.isCrouching &&
          dist < (playerSpeed > 6.4 ? 9.0 : 4.8)
        ) {
          e.investigateX = this.px;
          e.investigateZ = this.pz;
          e.suspicion = Math.min(1, e.suspicion + dt * 0.9);
          e.investigateTimer = Math.max(e.investigateTimer, 2.4);
          if (e.suspicion >= 1.0) {
            e.state = 'chase';
            e.provoked = true;
            e.aggroTimer = 5.5;
            this.triggerZombieSpotAnim(e);
            this.alertNearbyPackmates(e);
          }
        } else {
          e.suspicion = Math.max(0, e.suspicion - dt * (inGrassCover ? 0.72 : this.isCrouching ? 0.4 : 0.22));
        }

        if (e.state === 'investigate') {
          const idx = e.investigateX - e.x;
          const idz = e.investigateZ - e.z;
          const idist = Math.hypot(idx, idz);
          if (idist > 0.65) {
            const chasingLiveRat =
              e.distractedTimer > 0 &&
              this.decoyRats.some(
                (r) =>
                  r.escapingTimer <= 0 &&
                  (r.x - e.investigateX) * (r.x - e.investigateX) +
                    (r.z - e.investigateZ) * (r.z - e.investigateZ) <
                    2.5,
              );
            const invSpeed =
              e.speed * (chasingLiveRat ? 0.84 : e.distractedTimer > 0 ? 0.64 : 0.56);
            const inx = idx / idist;
            const inz = idz / idist;
            e.vx += (inx * invSpeed - e.vx) * (1 - Math.exp(-6 * dt));
            e.vz += (inz * invSpeed - e.vz) * (1 - Math.exp(-6 * dt));
            desiredYaw = Math.atan2(inx, inz);
          } else {
            e.vx *= Math.exp(-8 * dt);
            e.vz *= Math.exp(-8 * dt);
            desiredYaw = e.yaw + Math.sin(this.elapsed * 2.4 + e.id) * 0.7;
          }

          if (e.investigateTimer <= 0 && e.distractedTimer <= 0 && e.suspicion <= 0.15) {
            e.state = 'wander';
            e.provoked = false;
            e.suspicion = 0;
            const nextPt = this.pickWanderTarget(e.x, e.z, e.y);
            e.wanderX = nextPt.x;
            e.wanderZ = nextPt.z;
            e.wanderWait = 0.8;
          }
        }
      } else if (e.state === 'chase') {
        telMat.opacity = 0;

        if (targetIsMechanic) {
          e.aggroTimer = 4.0;
          e.investigateX = targetX;
          e.investigateZ = targetZ;
        } else {
          const keepSightRange = inGrassCover ? 2.3 : this.isCrouching ? 6.2 : 13.8;
          if (dist <= keepSightRange && this.hasLineOfSightToPlayer(e.x, e.z, e.y)) {
            e.aggroTimer = inGrassCover ? 1.6 : this.isCrouching ? 2.8 : 5.5;
            e.investigateX = this.px;
            e.investigateZ = this.pz;
          } else {
            const decayRate = inGrassCover ? 5.2 : this.isCrouching ? 3.0 : 1.5;
            e.aggroTimer -= dt * decayRate;
            const loseDist = inGrassCover ? 2.45 : this.isCrouching ? 5.5 : 11.0;
            if (e.aggroTimer <= 0 && (!this.hasLineOfSightToPlayer(e.x, e.z, e.y) || dist > loseDist)) {
              e.state = 'investigate';
              e.provoked = false;
              e.alertTimer = 0;
              e.suspicion = inGrassCover ? 0.35 : 0.55;
              e.investigateTimer = inGrassCover ? 2.0 : 2.8;
            }
          }
        }

        if (e.state === 'chase') {
          let moveNx = nx;
          let moveNz = nz;
          if (this.activeZone === 'colon_interior' && Math.abs(this.py - e.y) > 2.2) {
            const zFloor = this.colonInterior.getFloorIndex(e.y);
            const pFloor = this.colonInterior.getFloorIndex(this.py);
            const sideSign = e.x < 0 ? -1 : 1;
            let wpX = this.px;
            let wpZ = this.pz;
            if (zFloor === 0 && pFloor >= 1) {
              wpX = sideSign * 11.1;
              wpZ = e.z > 20 ? 15.0 : 25.0;
            } else if (zFloor === 1 && pFloor === 0) {
              wpX = sideSign * 11.1;
              wpZ = e.z < 18 ? 25.0 : 21.0;
            } else if (zFloor === 1 && pFloor === 2) {
              wpX = sideSign * 23.4;
              wpZ = Math.abs(e.x) > 21.4 ? 1.0 : 15.8;
            } else if (zFloor === 2 && pFloor <= 1) {
              wpX = sideSign * 23.4;
              wpZ = Math.abs(e.x) > 21.4 ? 15.8 : 0.3;
            }
            const wdx = wpX - e.x;
            const wdz = wpZ - e.z;
            const wLen = Math.hypot(wdx, wdz);
            if (wLen > 0.25) {
              moveNx = wdx / wLen;
              moveNz = wdz / wLen;
              desiredYaw = Math.atan2(moveNx, moveNz);
            }
          }

          if (e.alertTimer > 0.2 || e.hitReactTimer > 0.22) {
            e.vx *= Math.exp(-9 * dt);
            e.vz *= Math.exp(-9 * dt);
          } else {
            const desiredDist = e.kind === 'spitter' ? 9.5 : 0;
            if (e.kind === 'spitter' && dist < desiredDist - 1.5 && Math.abs(this.py - e.y) <= 2.2) {
              e.vx += (-moveNx * e.speed * 0.7 - e.vx) * (1 - Math.exp(-8 * dt));
              e.vz += (-moveNz * e.speed * 0.7 - e.vz) * (1 - Math.exp(-8 * dt));
            } else if (dist > desiredDist || Math.abs(this.py - e.y) > 2.2) {
              e.vx += (moveNx * e.speed - e.vx) * (1 - Math.exp(-8 * dt));
              e.vz += (moveNz * e.speed - e.vz) * (1 - Math.exp(-8 * dt));
            } else {
              e.vx *= Math.exp(-8 * dt);
              e.vz *= Math.exp(-8 * dt);
            }
          }

          const triggerRange = e.kind === 'spitter' ? 14.5 : e.kind === 'brute' ? 3.9 : 4.5;
          if (
            e.alertTimer <= 0.1 &&
            dist <= triggerRange &&
            Math.abs(this.py - e.y) <= (e.kind === 'spitter' ? 9.5 : 2.0) &&
            e.attackCooldown <= 0 &&
            (targetIsMechanic || this.hasLineOfSightToPlayer(e.x, e.z, e.y))
          ) {
            e.state = 'windup';
            e.attackDuration = e.kind === 'brute' ? 0.95 : e.kind === 'spitter' ? 0.88 : 0.46;
            e.stateTimer = e.attackDuration;
            e.hasHitThisAttack = false;
            e.lungeDx = nx;
            e.lungeDz = nz;
          }
        }
      } else if (e.state === 'windup') {
        e.stateTimer -= dt;
        e.lungeDx = nx;
        e.lungeDz = nz;

        const maxDur = Math.max(0.1, e.attackDuration);
        const progress = 1 - Math.max(0, e.stateTimer) / maxDur;
        telMat.opacity = 0.35 + progress * 0.6;
        const ringScale =
          e.kind === 'brute' ? 1.1 + progress * 2.8 : 0.8 + progress * 0.7;
        e.bundle.telegraphRing.scale.setScalar(ringScale);

        if (e.kind === 'spitter') {
          const coilMult = this.enemyHasLegLoss(e) ? 0.35 : 1.0;
          if (progress < 0.7) {
            // Pull back slightly to gather momentum before spitting
            e.vx += (-e.lungeDx * 1.95 * coilMult - e.vx) * (1 - Math.exp(-9 * dt));
            e.vz += (-e.lungeDz * 1.95 * coilMult - e.vz) * (1 - Math.exp(-9 * dt));
            e.squash = THREE.MathUtils.damp(e.squash, 0.9, 10, dt);
            if (progress > 0.28 && Math.random() < dt * 14) {
              const mouth = this.getSpitterMouthWorldPos(e, _mouthWorldPos);
              this.spawnBloodDroplet(
                mouth.x,
                mouth.y - 0.04,
                mouth.z,
                (Math.random() - 0.5) * 0.65,
                -0.6 - Math.random() * 0.7,
                (Math.random() - 0.5) * 0.65,
                0.46 + Math.random() * 0.24,
                0.28,
                true,
              );
            }
          } else {
            // Explosive forward body lunge impulse into the spit snap
            const snapAlpha = (progress - 0.7) / 0.3;
            const fwdSpd = (1.6 + 5.2 * snapAlpha) * coilMult;
            e.vx += (e.lungeDx * fwdSpd - e.vx) * (1 - Math.exp(-16 * dt));
            e.vz += (e.lungeDz * fwdSpd - e.vz) * (1 - Math.exp(-16 * dt));
            e.squash = THREE.MathUtils.damp(e.squash, 1.08, 14, dt);
          }
        } else {
          e.vx *= Math.exp(-12 * dt);
          e.vz *= Math.exp(-12 * dt);
        }

        if (e.stateTimer <= 0) {
          telMat.opacity = 0;

          if (e.kind !== 'spitter' && e.kind !== 'brute' && e.enemyRole !== 'gendarme_heavy') {
            e.state = 'lunge';
            e.attackDuration = e.kind === 'runner' ? 0.24 : e.kind === 'biter' ? 0.3 : 0.28;
            e.stateTimer = e.attackDuration;
            const lungeMult = this.enemyHasLegLoss(e) ? 0.32 : e.kind === 'runner' ? 1.15 : 1.0;
            e.vx = e.lungeDx * 10.6 * lungeMult;
            e.vz = e.lungeDz * 10.6 * lungeMult;
            e.squash = 0.82;
          } else if (e.kind === 'spitter') {
            const impulseMult = this.enemyHasLegLoss(e) ? 0.35 : 1.0;
            e.vx = e.lungeDx * 5.2 * impulseMult;
            e.vz = e.lungeDz * 5.2 * impulseMult;

            const mouth = this.getSpitterMouthWorldPos(e, _mouthWorldPos);
            const aimTargetY = targetIsMechanic
              ? groundHeightAt(targetX, targetZ) + 0.9
              : this.py + 0.98 - this.crouchFactor * 0.35;
            const toTx = targetX - mouth.x;
            const toTz = targetZ - mouth.z;
            const horizD = Math.max(0.6, Math.hypot(toTx, toTz));
            const dirX = toTx / horizD;
            const dirZ = toTz / horizD;
            const spitSpeed = 13.5;
            const spitGravity = 7.4;
            const tFlight = THREE.MathUtils.clamp(horizD / spitSpeed, 0.12, 1.55);
            const vy0 = THREE.MathUtils.clamp(
              (aimTargetY - mouth.y) / tFlight + 0.5 * spitGravity * tFlight,
              -5.5,
              9.5,
            );

            this.spawnProjectile(
              false,
              mouth.x,
              mouth.y,
              mouth.z,
              dirX * spitSpeed,
              vy0,
              dirZ * spitSpeed,
              e.damage,
              2.8,
              0.3,
              e.yaw,
            );
            this.audio.playZombieSpit({ x: mouth.x, y: mouth.y, z: mouth.z });
            for (let sd = 0; sd < 10; sd++) {
              this.spawnBloodDroplet(
                mouth.x + (Math.random() - 0.5) * 0.06,
                mouth.y + (Math.random() - 0.5) * 0.06,
                mouth.z + (Math.random() - 0.5) * 0.06,
                dirX * (2.6 + Math.random() * 2.8) + (Math.random() - 0.5) * 1.8,
                vy0 * 0.45 + (Math.random() - 0.3) * 1.4,
                dirZ * (2.6 + Math.random() * 2.8) + (Math.random() - 0.5) * 1.8,
                0.45 + Math.random() * 0.38,
                0.42,
                true,
                true,
              );
            }
            e.state = 'attack';
            e.attackDuration = 0.34;
            e.stateTimer = e.attackDuration;
            e.squash = 1.15;
          } else {
            e.state = 'attack';
            e.attackDuration = 0.34;
            e.stateTimer = e.attackDuration;
            e.squash = 0.74;
            this.spawnBurst(
              e.x + e.lungeDx * 0.75,
              e.y + 0.25,
              e.z + e.lungeDz * 0.75,
              20,
              0.95,
              0.32,
              0.2,
              8.5,
            );
            this.shakeTrauma = Math.min(1, this.shakeTrauma + 0.32);
            if (!e.hasHitThisAttack && dist <= 4.1 && Math.abs(this.py - e.y) < 1.8) {
              if (targetIsMechanic) {
                this.damageMechanic(Math.max(4, Math.round(e.damage * 0.45)));
              } else {
                this.hurtPlayer(e.damage, this.px - e.x, this.pz - e.z);
              }
              e.hasHitThisAttack = true;
            }
          }
        }
      } else if (e.state === 'lunge') {
        e.stateTimer -= dt;
        desiredYaw = Math.atan2(e.lungeDx, e.lungeDz);
        if (
          !e.hasHitThisAttack &&
          dist <= e.radius + 0.88 &&
          Math.abs(this.py - e.y) < 1.8
        ) {
          if (targetIsMechanic) {
            this.damageMechanic(Math.max(4, Math.round(e.damage * 0.42)));
          } else {
            this.hurtPlayer(e.damage, e.lungeDx, e.lungeDz);
          }
          e.hasHitThisAttack = true;
        }
        if (e.stateTimer <= 0) {
          e.state = 'recover';
          e.stateTimer = 0.42;
          e.attackCooldown = 1.35;
        }
      } else if (e.state === 'attack') {
        e.stateTimer -= dt;
        desiredYaw = Math.atan2(e.lungeDx, e.lungeDz);
        const dragRate = e.kind === 'spitter' ? 5.5 : 10;
        e.vx *= Math.exp(-dragRate * dt);
        e.vz *= Math.exp(-dragRate * dt);
        if (e.stateTimer <= 0) {
          e.state = 'recover';
          e.stateTimer = e.kind === 'brute' ? 0.65 : 0.42;
          e.attackCooldown = e.kind === 'brute' ? 2.3 : 2.0;
        }
      } else {
        e.stateTimer -= dt;
        e.vx *= Math.exp(-10 * dt);
        e.vz *= Math.exp(-10 * dt);
        if (e.stateTimer <= 0) e.state = 'chase';
      }

      for (let j = i + 1; j < this.enemies.length; j++) {
        const o = this.enemies[j];
        if (Math.abs(e.y - o.y) > 2.2) continue;
        const sdx = e.x - o.x;
        const sdz = e.z - o.z;
        const minSep = e.radius + o.radius;
        const sdistSq = sdx * sdx + sdz * sdz;
        if (sdistSq < minSep * minSep && sdistSq > 0.000001) {
          const sdist = Math.sqrt(sdistSq);
          const push = ((minSep - sdist) * 0.5) / sdist;
          e.x += sdx * push;
          e.z += sdz * push;
          o.x -= sdx * push;
          o.z -= sdz * push;
        }
      }

      e.x += e.vx * dt;
      e.z += e.vz * dt;

      // Prevent zombie from overlapping the player after lunges or close-quarter pursuit
      if (Math.abs(e.y - this.py) < 1.75) {
        const pdx = e.x - this.px;
        const pdz = e.z - this.pz;
        const minPSep = e.radius + 0.52;
        const pDistSq = pdx * pdx + pdz * pdz;
        if (pDistSq < minPSep * minPSep && pDistSq > 0.000001) {
          const pDist = Math.sqrt(pDistSq);
          e.x = this.px + (pdx / pDist) * minPSep;
          e.z = this.pz + (pdz / pDist) * minPSep;
        }
      }

      // Keep roaming zombies inside playable perimeter & around colliders
      if (this.activeZone === 'colon_interior') {
        const resolvedE = this.colonInterior.resolveCircleAndWalls(e.x, e.y, e.z, e.radius);
        e.x = resolvedE.x;
        e.z = resolvedE.z;
      } else {
        const resolvedE = this.resolveExteriorCollisions(e.x, e.y, e.z, e.radius, false);
        e.x = resolvedE.x;
        e.z = resolvedE.z;
      }

      const ey = this.floorAt(e.x, e.z, e.y);
      e.y = ey;
      e.bundle.group.position.set(e.x, ey, e.z);
      e.shadow.position.set(e.x, ey + 0.025, e.z);

      const yawTurnRate = e.state === 'wander' ? 4.5 : e.state === 'investigate' ? 6.5 : 10;
      const yDiff = Math.atan2(Math.sin(desiredYaw - e.yaw), Math.cos(desiredYaw - e.yaw));
      e.yaw += yDiff * (1 - Math.exp(-yawTurnRate * dt));
      e.bundle.group.rotation.y = e.yaw;
      e.bundle.group.scale.set(2 - e.squash, e.squash, 2 - e.squash);

      const renderDistSq = (this.px - e.x) * (this.px - e.x) + (this.pz - e.z) * (this.pz - e.z);
      _frustumSphere.center.set(e.x, ey + 1.0, e.z);
      const inFrustum = _frustum.intersectsSphere(_frustumSphere);

      // Billboard 3D health bar toward camera (only when visible and in frustum)
      if (e.bundle.hpBarGroup.visible && inFrustum) {
        _euler.setFromQuaternion(this.camera.quaternion, 'YXZ');
        e.bundle.hpBarGroup.rotation.set(_euler.x, _euler.y - e.yaw, 0, 'YXZ');
      }

      const anyLegLost = this.enemyHasLegLoss(e);
      e.crawlFactor = THREE.MathUtils.damp(e.crawlFactor, anyLegLost ? 1 : 0, 10, dt);

      e.awarenessDisplayTimer = Math.max(0, e.awarenessDisplayTimer - dt);
      const nextTier: 'calm' | 'investigate' | 'alert' =
        e.state === 'wander' ? 'calm' : e.state === 'investigate' ? 'investigate' : 'alert';
      if (nextTier !== e.lastAwarenessTier) {
        e.lastAwarenessTier = nextTier;
        const dur = nextTier === 'alert' ? 2.6 : nextTier === 'investigate' ? 3.0 : 1.6;
        e.awarenessDisplayTimer = dur;
        e.awarenessDisplayMax = dur;
      }

      // Context-aware '?' / '!' overhead awareness icon (shown briefly on state changes)
      if (inFrustum) {
        this.updateEnemyAwarenessIcon(e, dist);
      } else {
        e.bundle.awarenessIcon.visible = false;
      }

      // Procedural zombie skeletal & bodyPivot animation with frustum + distance LOD
      this.animateEnemyProcedural(e, dt, renderDistSq, inFrustum);

      // Enforce collapsed severed bones, sync bloody stump caps, and emit arterial droplets
      this.applySeveredLimbPose(
        e.bundle,
        e.severedLimbs,
        e.stumpMeshes,
        e.bleedTimers,
        dt,
        e.kind === 'spitter',
      );

      setEnemyHitFlashVisual(e.bundle, e.hitFlashTimer > 0);
      setEnemyGlowAlertVisual(e.bundle, e.provoked || e.state !== 'wander');
    }
  }

  private updateEnemyAwarenessIcon(e: EnemyEntity, dist: number) {
    const icon = e.bundle.awarenessIcon;
    const mat = icon.material as THREE.SpriteMaterial;
    const showMaxDist = e.state === 'wander' ? 25 : 31;

    if (
      this.gameState !== 'PLAYING' ||
      this.editorMode ||
      dist > showMaxDist ||
      e.awarenessDisplayTimer <= 0
    ) {
      icon.visible = false;
      return;
    }

    const icons = getAwarenessIconTextures();
    const isAttacking =
      e.state === 'chase' ||
      e.state === 'windup' ||
      e.state === 'lunge' ||
      e.state === 'attack' ||
      e.state === 'recover';
    const isInvestigating = e.state === 'investigate';
    const stealth = this.isCrouching;

    const targetMap = isAttacking ? icons.exclamation : icons.question;
    if (mat.map !== targetMap) {
      mat.map = targetMap;
      mat.needsUpdate = true;
    }

    let size = 0.35;
    let bob = 0;
    let opacity = 1.0;

    if (isAttacking) {
      const striking =
        e.state === 'windup' || e.state === 'lunge' || e.state === 'attack' || e.alertTimer > 0;
      if (stealth) {
        mat.color.setHex(striking ? 0xef4444 : 0xf97316);
      } else {
        mat.color.setHex(striking ? 0xff2d46 : 0xef4444);
      }
      size = striking ? 0.56 + Math.sin(this.elapsed * 14 + e.id) * 0.04 : 0.48;
      bob = Math.sin(this.elapsed * 9 + e.id) * 0.035;
      opacity = 1.0;
    } else if (isInvestigating) {
      mat.color.setHex(stealth ? 0xfbbf24 : 0xfb923c);
      size = 0.45 + Math.sin(this.elapsed * 7 + e.id) * 0.03;
      bob = Math.sin(this.elapsed * 5 + e.id) * 0.03;
      opacity = 0.96;
    } else {
      // Returned to calm ('wander')
      mat.color.setHex(stealth ? 0x34d399 : 0x7dd3fc);
      size = 0.34;
      bob = Math.sin(this.elapsed * 2.2 + e.id) * 0.025;
      const distFade = 1 - THREE.MathUtils.smoothstep(dist, 18, 25);
      opacity = 0.78 * distFade;
    }

    const timerFade = THREE.MathUtils.clamp(e.awarenessDisplayTimer / 0.55, 0, 1);
    opacity *= timerFade;

    icon.visible = opacity > 0.03;
    icon.position.y = e.bundle.awarenessBaseY + bob;
    icon.scale.set(size, size, 1);
    mat.opacity = opacity;
  }

  private initializeEnemyIdlePose(e: EnemyEntity) {
    const { bones, bodyPivot, character, isCustomGlb } = e.bundle;
    const hasDedicatedCrawlClip = Boolean(e.bundle.clips?.['crawl']);
    const pivotCrawlDrop = hasDedicatedCrawlClip ? 0 : -e.crawlFactor * 0.72;
    const pivotCrawlPitch = hasDedicatedCrawlClip ? 0 : e.crawlFactor * 1.15;
    bodyPivot.position.set(0, pivotCrawlDrop, 0);
    bodyPivot.rotation.set(pivotCrawlPitch, 0, 0);

    if (character.mixer && e.bundle.hasClips) {
      if (character.hasAction('idle')) {
        character.setAction('idle', {
          fadeSec: 0,
          timeScale: 1.0,
          forceRestart: true,
          stopOtherLoops: true,
        });
        character.updateAnimation(0.05 + (e.id % 7) * 0.13);
      } else if (character.hasAction('walk')) {
        character.setAction('walk', {
          fadeSec: 0,
          timeScale: 0.75,
          forceRestart: true,
          stopOtherLoops: true,
        });
        character.updateAnimation(0.04 + (e.id % 5) * 0.11);
      }
      e.poseInitialized = true;
      return;
    }

    const hasSkeleton = Boolean(bones.spine || bones.leftUpLeg || bones.rightUpLeg);
    if (!hasSkeleton) {
      bodyPivot.rotation.x = 0.06;
      e.poseInitialized = true;
      return;
    }

    const breathIdle = Math.sin(e.id * 1.37);
    if (bones.hips) {
      bones.hips.node.position.copy(bones.hips.restPos);
      dampBoneRot(bones.hips, 0, 0, 0, 400, 0.1);
    }
    dampSpineAndChest(bones, 0.08 + breathIdle * 0.025, breathIdle * 0.05, 0, 400, 0.1);
    dampNeckAndHead(bones, 0.04 + breathIdle * 0.03, breathIdle * 0.08, 0, 400, 0.1);
    dampBoneRot(bones.leftUpLeg, 0, 0, 0, 400, 0.1);
    dampBoneRot(bones.rightUpLeg, 0, 0, 0, 400, 0.1);
    dampBoneRot(bones.leftLeg, 0.05, 0, 0, 400, 0.1);
    dampBoneRot(bones.rightLeg, 0.05, 0, 0, 400, 0.1);
    dampBoneRot(bones.leftFoot, 0, 0, 0, 400, 0.1);
    dampBoneRot(bones.rightFoot, 0, 0, 0, 400, 0.1);

    if (isCustomGlb && bones.leftArm && bones.leftForeArm && bones.rightArm && bones.rightForeArm) {
      const zCos = Math.cos(e.yaw);
      const zSin = Math.sin(e.yaw);
      _weaponFwd.set(zSin, 0, zCos);
      _weaponRight.set(-zCos, 0, zSin);

      _vec3.copy(_weaponFwd).multiplyScalar(0.24).addScaledVector(_weaponRight, -0.24);
      _vec3.y = -0.94;
      orientBoneSegmentToWorldDir(bones.leftArm.node, bones.leftForeArm.node, _vec3, 0.1, 400);
      if (bones.leftHand) {
        _vec3B.copy(_weaponFwd).multiplyScalar(0.45).addScaledVector(_weaponRight, -0.06);
        _vec3B.y = -0.82;
        orientBoneSegmentToWorldDir(bones.leftForeArm.node, bones.leftHand, _vec3B, 0.1, 400);
      }

      _vec3.copy(_weaponFwd).multiplyScalar(0.24).addScaledVector(_weaponRight, 0.24);
      _vec3.y = -0.94;
      orientBoneSegmentToWorldDir(bones.rightArm.node, bones.rightForeArm.node, _vec3, 0.1, 400);
      if (bones.rightHand) {
        _vec3B.copy(_weaponFwd).multiplyScalar(0.45).addScaledVector(_weaponRight, 0.06);
        _vec3B.y = -0.82;
        orientBoneSegmentToWorldDir(bones.rightForeArm.node, bones.rightHand, _vec3B, 0.1, 400);
      }
    } else {
      dampBoneRot(bones.leftArm, -0.14, -0.04, 0.07, 400, 0.1);
      dampBoneRot(bones.rightArm, -0.14, 0.04, -0.07, 400, 0.1);
      dampBoneRot(bones.leftForeArm, -0.36, 0, 0, 400, 0.1);
      dampBoneRot(bones.rightForeArm, -0.36, 0, 0, 400, 0.1);
    }
    e.poseInitialized = true;
  }

  private animateEnemyProcedural(
    e: EnemyEntity,
    dt: number,
    distSq = 0,
    inFrustum = true,
  ) {
    if (!e.poseInitialized) {
      this.initializeEnemyIdlePose(e);
    }

    const zSpd = Math.hypot(e.vx, e.vz);
    const isAttacking = e.state === 'windup' || e.state === 'lunge' || e.state === 'attack';
    const isHeavyGendarme = e.enemyRole === 'gendarme_heavy' || e.kind === 'brute';
    const isRunner = e.kind === 'runner' && e.enemyRole === 'civilian';
    const isBiter = e.kind === 'biter' && e.enemyRole === 'civilian';
    const isSpitter = e.kind === 'spitter' && e.enemyRole === 'civilian';

    const hasDedicatedCrawlClip = Boolean(e.bundle.clips?.['crawl']);
    if (
      e.crawlFactor >= 0.35 &&
      hasDedicatedCrawlClip &&
      e.bundle.character.tag !== 'zombie_crawler'
    ) {
      e.bundle.character.setAnimationTag('zombie_crawler');
    }

    if (e.crawlFactor >= 0.35 && !hasDedicatedCrawlClip && e.bundle.mixer) {
      e.bundle.character.resetClips();
    } else if (e.bundle.character.mixer && e.bundle.hasClips) {
      const char = e.bundle.character;
      let playedNative = false;

      if (e.hitReactTimer > 0 && char.hasAction('hit')) {
        playedNative = char.setAction('hit', { fadeSec: 0.08, timeScale: 1.15 });
      } else if (isAttacking && char.hasAction('attack')) {
        playedNative = char.setAction('attack', {
          fadeSec: 0.1,
          timeScale: isHeavyGendarme ? 1.05 : 1.15,
          forceRestart: char.getCurrentAction() !== 'attack',
          oneShot: false,
          interruptOneShot: true,
        });
      } else if (e.alertTimer > 0 && (e.bundle.clips?.['habilidad1'] || e.bundle.clips?.['alert'])) {
        const spotName = e.bundle.clips?.['habilidad1'] ? 'habilidad1' : 'alert';
        playedNative = char.playClip(spotName, 0.12, 1.08);
      } else if (zSpd < 0.28 || (e.state === 'recover' && zSpd < 0.9)) {
        if (char.hasAction('idle')) {
          playedNative = char.setAction('idle', {
            fadeSec: zSpd <= 0.05 ? 0.08 : 0.14,
            timeScale: 1.0,
            interruptOneShot: true,
            stopOtherLoops: true,
          });
        } else {
          char.resetClips();
        }
      } else if (e.state === 'wander' || e.state === 'investigate') {
        if (e.bundle.preferWalkClip === 'errante' && e.bundle.clips?.['errante']) {
          playedNative = char.playClip('errante', 0.16, 0.92);
        } else if (char.hasAction('walk')) {
          playedNative = char.setAction('walk', {
            fadeSec: 0.16,
            timeScale: isHeavyGendarme || isSpitter ? 0.84 : 0.92,
            interruptOneShot: true,
          });
        }
      } else {
        const hasDistinctRun =
          Boolean(char.actionDict.mappedClips.run) &&
          char.actionDict.mappedClips.run !== char.actionDict.mappedClips.walk;
        const wantsRun =
          e.state === 'chase' &&
          char.hasAction('run') &&
          (isHeavyGendarme
            ? hasDistinctRun && zSpd > 2.2
            : isRunner || isBiter || e.kind === 'stalker' || zSpd > 2.45);
        const targetLoco = wantsRun ? 'run' : 'walk';
        if (char.hasAction(targetLoco)) {
          const locoTimeScale =
            targetLoco === 'run'
              ? THREE.MathUtils.clamp(zSpd / Math.max(2.6, e.speed * 0.92), 0.92, 1.24)
              : isHeavyGendarme || isSpitter
                ? 1.02
                : 1.08;
          playedNative = char.setAction(targetLoco, {
            fadeSec: 0.16,
            timeScale: locoTimeScale,
            interruptOneShot: true,
          });
        }
      }

      if (playedNative) {
        // AnimationMixer LOD: keep distant visible zombies animated up to 80m;
        // when ultra-distant (>80m) or far offscreen (>12m), ensure settled rest pose before pausing
        if (distSq > 6400 || (!inFrustum && distSq > 144)) {
          if (zSpd < 0.28 && char.hasAction('idle') && char.getCurrentAction() !== 'idle') {
            char.setAction('idle', {
              fadeSec: 0,
              timeScale: 1.0,
              forceRestart: true,
              stopOtherLoops: true,
            });
            char.updateAnimation(0.05);
          }
          e.mixerAccumDt = Math.min(0.25, e.mixerAccumDt + dt);
          return;
        }
        const throttleInterval = distSq > 900 ? 0.083 : distSq > 196 ? 0.055 : 0;
        if (throttleInterval > 0) {
          e.mixerAccumDt += dt;
          if (e.mixerAccumDt >= throttleInterval) {
            char.updateAnimation(e.mixerAccumDt);
            e.mixerAccumDt = 0;
          }
        } else {
          char.updateAnimation(dt + e.mixerAccumDt);
          e.mixerAccumDt = 0;
        }
        let clipImpulsePitch = 0;
        let clipImpulseFwd = 0;
        if (e.kind === 'spitter' && (e.state === 'windup' || e.state === 'attack')) {
          const atkDur = Math.max(0.1, e.attackDuration);
          const atkP = THREE.MathUtils.clamp(1 - e.stateTimer / atkDur, 0, 1);
          if (e.state === 'windup') {
            const drawP = Math.min(1, atkP / 0.7);
            const snapP = Math.max(0, (atkP - 0.7) / 0.3);
            clipImpulsePitch = THREE.MathUtils.lerp(
              -0.28 * Math.sin(drawP * Math.PI * 0.5),
              0.32,
              snapP * snapP,
            );
            clipImpulseFwd = THREE.MathUtils.lerp(-0.18 * drawP, 0.24, snapP * snapP);
          } else {
            clipImpulsePitch = 0.32 * (1 - atkP);
            clipImpulseFwd = 0.24 * (1 - atkP);
          }
        }
        const pivotCrawlDrop = hasDedicatedCrawlClip ? 0 : -e.crawlFactor * 0.72;
        const pivotCrawlPitch = hasDedicatedCrawlClip ? 0 : e.crawlFactor * 1.15;
        e.bundle.bodyPivot.position.set(0, pivotCrawlDrop, clipImpulseFwd);
        e.bundle.bodyPivot.rotation.set(pivotCrawlPitch + clipImpulsePitch, 0, 0);
        if (
          inFrustum &&
          distSq <= 400 &&
          (e.severedLimbs.size > 0 ||
            Boolean(e.carriedWeapon) ||
            e.armorHelmetHp > 0 ||
            e.armorVestHp > 0)
        ) {
          e.bundle.group.updateMatrixWorld(true);
        }
        return;
      }
    }

    const cf = e.crawlFactor;
    const isOrco = e.walkStyle === 'orco' || e.walkStyle === 'ogro';
    const isChaseMoving = e.state === 'chase' && zSpd >= 0.3;
    const isRunning = isChaseMoving && (e.walkStyle === 'run' || zSpd > 3.1);
    const isUnstable = e.walkStyle === 'inestable';
    const isStandingIdle = zSpd < 0.28;
    const phaseRate =
      cf > 0.3
        ? 1.8 + zSpd * 3.1
        : isStandingIdle
          ? 1.25
          : isOrco
            ? 1.1 + zSpd * 1.15
            : isRunning
              ? 2.1 + zSpd * 1.95
              : 1.45 + zSpd * 1.55;
    e.walkPhase += dt * phaseRate;

    // Far-offscreen (>12m) or ultra-distant (>80m) procedural zombies settle cleanly into calm rest pose (no T-pose)
    if ((!inFrustum && distSq > 144) || distSq > 6400) {
      if (isStandingIdle) {
        this.initializeEnemyIdlePose(e);
      }
      return;
    }

    const moveRatio = isStandingIdle ? 0 : THREE.MathUtils.clamp(zSpd / Math.max(0.1, e.speed), 0, 1.3);

    const rawSwing = isUnstable
      ? Math.sin(e.walkPhase) + 0.36 * Math.sin(e.walkPhase * 2 + 0.7)
      : Math.sin(e.walkPhase);
    const swing = rawSwing * (isOrco ? 0.54 : 0.68) * moveRatio;
    const swingR = isUnstable
      ? -(Math.sin(e.walkPhase - 0.32) * 0.56) * moveRatio
      : -swing;
    // Physically grounded gait dip: hips sit slightly higher at mid-stance and dip smoothly at wide stride
    const strideCos = Math.cos(e.walkPhase * 2);
    const bounce = (strideCos * 0.55 - 0.45) * (isOrco ? 0.08 : 0.056) * moveRatio;
    const sway = isUnstable
      ? Math.sin(e.walkPhase * 0.85 + e.id) * 0.16 * moveRatio
      : Math.cos(e.walkPhase * 0.5) * (isOrco ? 0.11 : 0.08) * moveRatio;

    const isWander = e.state === 'wander' || e.state === 'investigate';
    const isWindup = e.state === 'windup';
    const isLunge = e.state === 'lunge';
    const isAttack = e.state === 'attack';
    const isRecover = e.state === 'recover';
    const isHitReact = isBiter && e.hitReactTimer > 0 && !isWindup && !isLunge && !isAttack;
    const isAlerting = e.alertTimer > 0 && !isWindup && !isLunge && !isAttack;
    const isIdleAlert =
      isStandingIdle && (isRunner || isBiter) && !isWindup && !isLunge && !isAttack && !isHitReact;
    const isIdleCalm =
      isStandingIdle && !isIdleAlert && !isWindup && !isLunge && !isAttack && !isHitReact && !isAlerting;
    const atkDur = Math.max(0.1, e.attackDuration);
    const atkP = THREE.MathUtils.clamp(1 - e.stateTimer / atkDur, 0, 1);
    const strikeCurve = Math.sin(atkP * Math.PI);

    let torsoLean = (isWander ? 0.1 : 0.24 + moveRatio * 0.12) + (isOrco ? 0.14 * moveRatio : isRunning ? 0.18 * moveRatio : 0);
    let torsoYaw = sway * (isUnstable ? 0.95 : 0.65);
    let headPitch = (isWander ? 0.06 : -0.14) + (isUnstable ? Math.sin(e.walkPhase * 1.6) * 0.09 * moveRatio : 0);
    let bodyDrop = bounce;
    let leftArmPitch = (isWander ? -0.18 : -1.12) + (isUnstable ? 0.18 * moveRatio : 0);
    let rightArmPitch = (isWander ? -0.18 : -1.12) - (isUnstable ? 0.22 * moveRatio : 0);
    let leftArmRoll = (isWander ? 0.08 : 0.04) + (isOrco ? 0.14 : 0);
    let rightArmRoll = (isWander ? -0.08 : -0.04) - (isOrco ? 0.14 : 0);
    let leftArmYaw = isWander ? -0.04 : -0.1;
    let rightArmYaw = isWander ? 0.04 : 0.1;
    let leftElbow =
      (isWander ? -0.42 : -0.34) +
      (isOrco ? -0.18 : 0) +
      Math.sin(e.walkPhase * 1.1) * 0.14 * moveRatio;
    let rightElbow =
      (isWander ? -0.42 : -0.34) +
      (isOrco ? -0.18 : isUnstable ? -0.25 : 0) -
      Math.sin(e.walkPhase * 1.1) * 0.14 * moveRatio;

    const armClaw =
      Math.sin(e.walkPhase * 0.9) *
      (isWander ? 0.16 : isRunning ? 0.34 : 0.22) *
      Math.min(1, moveRatio);
    leftArmPitch += armClaw;
    rightArmPitch -= armClaw;

    if (isHitReact) {
      const flinch = Math.sin(Math.min(1, e.hitReactTimer / 0.55) * Math.PI);
      torsoLean = -0.34 * flinch;
      headPitch = -0.42 * flinch;
      leftArmPitch = -1.35 * flinch;
      rightArmPitch = -1.35 * flinch;
      leftArmRoll = 0.55 * flinch;
      rightArmRoll = -0.55 * flinch;
      leftElbow = -0.9;
      rightElbow = -0.9;
    } else if (isAlerting) {
      torsoLean = -0.26;
      headPitch = -0.38;
      leftArmPitch = -1.65;
      rightArmPitch = -1.65;
      leftArmRoll = 0.45;
      rightArmRoll = -0.45;
      leftElbow = -0.75;
      rightElbow = -0.75;
    } else if (isIdleAlert) {
      const scan = Math.sin(this.elapsed * 3.1 + e.id);
      torsoLean = 0.22;
      torsoYaw = scan * 0.18;
      headPitch = -0.22 + Math.sin(this.elapsed * 5.2 + e.id) * 0.08;
      bodyDrop = -0.05 + Math.abs(scan) * 0.02;
      leftArmPitch = -0.72;
      rightArmPitch = -0.72;
      leftElbow = -0.82;
      rightElbow = -0.82;
    } else if (isIdleCalm) {
      const breathIdle = Math.sin(this.elapsed * 2.1 + e.id);
      torsoLean = 0.08 + breathIdle * 0.025;
      torsoYaw = Math.sin(this.elapsed * 0.8 + e.id) * 0.06;
      headPitch = 0.04 + breathIdle * 0.04;
      bodyDrop = breathIdle * 0.014;
      leftArmPitch = -0.14 + breathIdle * 0.04;
      rightArmPitch = -0.14 - breathIdle * 0.04;
      leftArmRoll = 0.07;
      rightArmRoll = -0.07;
      leftElbow = -0.36;
      rightElbow = -0.36;
    } else if (isWindup) {
      if (e.kind === 'brute') {
        torsoLean = -0.32 * atkP;
        headPitch = -0.24 * atkP;
        leftArmPitch = -1.2 - 1.65 * atkP;
        rightArmPitch = -1.2 - 1.65 * atkP;
        leftArmRoll = 0.22 * atkP;
        rightArmRoll = -0.22 * atkP;
        leftElbow = -0.48;
        rightElbow = -0.48;
        bodyDrop = -0.04 * atkP;
      } else if (e.kind === 'spitter') {
        // Two-stage spitter impulse: rear back deep to gather venom, then whip forward to spit
        const drawP = Math.min(1, atkP / 0.7);
        const snapP = Math.max(0, (atkP - 0.7) / 0.3);
        const coil = Math.sin(drawP * Math.PI * 0.5);
        const whip = snapP * snapP;
        torsoLean = THREE.MathUtils.lerp(-0.68 * coil, 0.58, whip);
        headPitch = THREE.MathUtils.lerp(-0.76 * coil, 0.44, whip);
        bodyDrop = -0.11 * coil + 0.09 * Math.sin(snapP * Math.PI);
        leftArmPitch = THREE.MathUtils.lerp(-0.15 + 0.85 * coil, -1.25, whip);
        rightArmPitch = leftArmPitch;
        leftArmRoll = THREE.MathUtils.lerp(0.28 * coil, 0.62, whip);
        rightArmRoll = -leftArmRoll;
        leftElbow = THREE.MathUtils.lerp(-1.12, -0.28, whip);
        rightElbow = leftElbow;
      } else {
        torsoLean = -0.26 * atkP;
        bodyDrop = -0.14 * atkP;
        leftArmPitch = -1.1 + 0.9 * atkP;
        rightArmPitch = -1.1 + 0.9 * atkP;
        leftArmRoll = 0.36 * atkP;
        rightArmRoll = -0.36 * atkP;
        leftElbow = -1.05;
        rightElbow = -1.05;
      }
    } else if (isLunge) {
      // Stalker double claw swipe + lunge forward
      const slash = Math.sin(atkP * Math.PI);
      const sweep = (atkP - 0.5) * 1.8;
      torsoLean = 0.52 + slash * 0.18;
      torsoYaw = Math.sin(atkP * Math.PI * 2) * 0.24;
      headPitch = -0.25;
      bodyDrop = 0.08 * slash;
      leftArmPitch = -2.2 + sweep * 0.95;
      rightArmPitch = -1.75 + sweep * 1.15;
      leftArmYaw = 0.48 * slash;
      rightArmYaw = -0.48 * slash;
      leftArmRoll = 0.15;
      rightArmRoll = -0.15;
      leftElbow = -0.22;
      rightElbow = -0.22;
    } else if (isAttack) {
      if (e.kind === 'brute') {
        // Heavy two-handed overhead ground slam
        const slam = Math.min(1, atkP * 2.2);
        torsoLean = 0.78 * slam;
        headPitch = 0.25 * slam;
        bodyDrop = -0.22 * slam;
        leftArmPitch = -2.6 + slam * 2.25;
        rightArmPitch = -2.6 + slam * 2.25;
        leftArmRoll = 0.06;
        rightArmRoll = -0.06;
        leftElbow = -0.14;
        rightElbow = -0.14;
      } else {
        // Spitter forward follow-through whip after launching mucus glob
        const follow = 1 - atkP * 0.72;
        torsoLean = 0.58 * follow;
        headPitch = 0.44 * (1 - atkP * 0.78);
        bodyDrop = 0.04 * (1 - atkP);
        leftArmPitch = -1.25 + atkP * 0.38;
        rightArmPitch = leftArmPitch;
        leftArmRoll = 0.62 * (1 - atkP * 0.5);
        rightArmRoll = -leftArmRoll;
        leftElbow = -0.28 - atkP * 0.24;
        rightElbow = leftElbow;
      }
    } else if (isRecover) {
      torsoLean = 0.16;
      leftArmPitch = -0.75;
      rightArmPitch = -0.75;
      leftElbow = -0.55;
      rightElbow = -0.55;
    }

    // Animate spitter/biter hinged lower jaw & pulsing venom sacs
    if (e.bundle.jawNode) {
      const targetJawRot = isHitReact
        ? 0.56
        : isWindup
          ? 0.68 * Math.min(1, atkP / 0.7) + (atkP >= 0.7 ? 0.18 : 0)
          : isLunge
            ? 0.78 * Math.sin(atkP * Math.PI)
            : isAttack
              ? 0.72 * (1 - atkP * 0.68)
              : isAlerting
                ? 0.45
                : 0.14 + Math.max(0, Math.sin(e.walkPhase)) * 0.12;
      e.bundle.jawNode.rotation.x = THREE.MathUtils.damp(
        e.bundle.jawNode.rotation.x,
        targetJawRot,
        20,
        dt,
      );
    }
    if (e.bundle.spitSacNodes) {
      const targetSacScale = isWindup
        ? 1.0 + 0.38 * Math.min(1, atkP / 0.7) + Math.sin(this.elapsed * 26 + e.id) * 0.07
        : isAttack
          ? 0.8 + atkP * 0.16
          : 1.0 + Math.sin(this.elapsed * 4.5 + e.id) * 0.05;
      for (let si = 0; si < e.bundle.spitSacNodes.length; si++) {
        const sac = e.bundle.spitSacNodes[si];
        const baseS = si === 1 ? 0.8 : si === 2 ? 0.68 : 1.0;
        const s = THREE.MathUtils.damp(sac.scale.x, targetSacScale * baseS, 14, dt);
        sac.scale.set(s, s * (si === 2 ? 0.86 : 1.0), s);
      }
    }

    // Ground-crawl posture blend when one or both legs are severed
    const crawlPullL = Math.sin(e.walkPhase) * (0.25 + 0.75 * Math.min(1, moveRatio));
    const crawlPullR = -crawlPullL;
    if (cf > 0.02) {
      torsoLean = THREE.MathUtils.lerp(torsoLean, -0.22 + Math.sin(e.walkPhase * 2) * 0.05, cf);
      torsoYaw = THREE.MathUtils.lerp(torsoYaw, crawlPullL * 0.26, cf);
      headPitch = THREE.MathUtils.lerp(headPitch, -0.78, cf);
      leftArmPitch = THREE.MathUtils.lerp(leftArmPitch, -1.55 + crawlPullL * 0.65, cf);
      rightArmPitch = THREE.MathUtils.lerp(rightArmPitch, -1.55 + crawlPullR * 0.65, cf);
      leftArmRoll = THREE.MathUtils.lerp(leftArmRoll, 0.24, cf);
      rightArmRoll = THREE.MathUtils.lerp(rightArmRoll, -0.24, cf);
      leftElbow = THREE.MathUtils.lerp(leftElbow, -0.45 + Math.max(0, -crawlPullL) * 0.4, cf);
      rightElbow = THREE.MathUtils.lerp(rightElbow, -0.45 + Math.max(0, -crawlPullR) * 0.4, cf);
    }

    const scaleH = e.kind === 'brute' ? 1.38 : e.kind === 'spitter' ? 1.05 : 1.0;
    const crawlDrop = cf * 0.76 * scaleH;

    const { bones, bodyPivot, isCustomGlb } = e.bundle;
    bodyPivot.position.y = THREE.MathUtils.damp(
      bodyPivot.position.y,
      bodyDrop * (1 - cf * 0.7) - crawlDrop,
      14,
      dt,
    );
    bodyPivot.rotation.z = THREE.MathUtils.damp(
      bodyPivot.rotation.z,
      THREE.MathUtils.lerp(sway, crawlPullL * 0.1, cf),
      10,
      dt,
    );

    const hasSkeleton = Boolean(bones.spine || bones.leftUpLeg || bones.rightUpLeg);
    if (!hasSkeleton) {
      bodyPivot.rotation.x = THREE.MathUtils.damp(
        bodyPivot.rotation.x,
        torsoLean * 0.7 * (1 - cf) + cf * 1.18,
        14,
        dt,
      );
      return;
    }
    bodyPivot.rotation.x = THREE.MathUtils.damp(bodyPivot.rotation.x, cf * 1.18, 14, dt);

    if (bones.hips) {
      bones.hips.node.position.x = THREE.MathUtils.damp(bones.hips.node.position.x, bones.hips.restPos.x, 12, dt);
      bones.hips.node.position.y = THREE.MathUtils.damp(bones.hips.node.position.y, bones.hips.restPos.y, 12, dt);
      bones.hips.node.position.z = THREE.MathUtils.damp(bones.hips.node.position.z, bones.hips.restPos.z, 12, dt);
      dampBoneRot(bones.hips, 0, swing * 0.22 * (1 - cf), sway * 0.35, 12, dt);
    }

    const animLambda = isLunge || isAttack || isWindup ? 22 : 12;
    dampSpineAndChest(
      bones,
      torsoLean,
      torsoYaw - swing * 0.14 * (1 - cf),
      isUnstable ? sway * 0.45 : -sway * 0.25,
      animLambda,
      dt,
    );
    dampNeckAndHead(
      bones,
      headPitch + Math.sin(e.walkPhase * 0.5) * 0.06,
      sway * 0.9 + (isWander ? Math.sin(this.elapsed * 0.8 + e.id) * 0.2 : 0),
      isUnstable ? sway * 1.45 + Math.sin(e.walkPhase * 1.7) * 0.1 * moveRatio : sway * 0.85,
      animLambda,
      dt,
    );

    const legCoil = isWindup ? -0.25 * atkP : isLunge ? -0.35 : 0;
    const legCrawlFactor = 1 - cf * 0.82;
    dampBoneRot(
      bones.leftUpLeg,
      (swing + legCoil) * legCrawlFactor + cf * 0.16,
      0,
      isOrco ? 0.08 : cf * 0.08,
      14,
      dt,
    );
    dampBoneRot(
      bones.rightUpLeg,
      (swingR + (isLunge ? 0.45 : legCoil)) * legCrawlFactor + cf * 0.16,
      0,
      isOrco ? -0.08 : -cf * 0.08,
      14,
      dt,
    );

    const kneeFlexL =
      ((Math.max(0, -Math.sin(e.walkPhase - 0.35)) * 0.78 +
        Math.max(0, Math.sin(e.walkPhase + 0.6)) * 0.18) *
        moveRatio +
        (isWindup ? 0.35 * atkP : 0)) *
      legCrawlFactor;
    const kneeFlexR =
      ((Math.max(0, Math.sin(e.walkPhase - 0.35)) * (isUnstable ? 0.45 : 0.78) +
        Math.max(0, -Math.sin(e.walkPhase + 0.6)) * 0.18) *
        moveRatio +
        (isWindup ? 0.35 * atkP : 0)) *
      legCrawlFactor;
    dampBoneRot(bones.leftLeg, kneeFlexL + cf * 0.12, 0, 0, 14, dt);
    dampBoneRot(bones.rightLeg, kneeFlexR + cf * 0.12, 0, 0, 14, dt);

    dampBoneRot(
      bones.leftFoot,
      Math.sin(e.walkPhase - 0.5) * 0.32 * moveRatio * legCrawlFactor + cf * 0.35,
      0,
      0,
      14,
      dt,
    );
    dampBoneRot(
      bones.rightFoot,
      -Math.sin(e.walkPhase - 0.5) * 0.32 * moveRatio * legCrawlFactor + cf * 0.35,
      0,
      0,
      14,
      dt,
    );

    if (isCustomGlb && bones.leftArm && bones.leftForeArm && bones.rightArm && bones.rightForeArm) {
      const zCos = Math.cos(e.yaw);
      const zSin = Math.sin(e.yaw);
      _weaponFwd.set(zSin, 0, zCos);
      _weaponRight.set(-zCos, 0, zSin);

      let fwdComp = isWander ? 0.24 : 0.94;
      let upComp = isWander ? -0.94 : -0.18;
      let outComp = isWander ? 0.24 : 0.14;
      let foreFwd = isWander ? 0.45 : 0.96;
      let foreUp = isWander ? -0.82 : 0.05;
      let leftExtraFwd = armClaw * 0.25;
      let rightExtraFwd = -armClaw * 0.25;

      if (isHitReact) {
        fwdComp = 0.15;
        upComp = 0.65;
        outComp = 0.65;
        foreFwd = 0.35;
        foreUp = 0.6;
      } else if (isAlerting) {
        fwdComp = 0.42;
        upComp = 0.68;
        outComp = 0.55;
        foreFwd = 0.65;
        foreUp = 0.55;
      } else if (isIdleAlert) {
        fwdComp = 0.55;
        upComp = -0.35;
        outComp = 0.28;
        foreFwd = 0.72;
        foreUp = 0.08;
      } else if (isWindup) {
        if (e.kind === 'brute') {
          fwdComp = 0.28;
          upComp = 0.95;
          outComp = 0.22;
          foreFwd = 0.4;
          foreUp = 0.85;
        } else if (e.kind === 'spitter') {
          const snapP = Math.max(0, (atkP - 0.7) / 0.3);
          const whip = snapP * snapP;
          fwdComp = THREE.MathUtils.lerp(-0.48, 0.78, whip);
          upComp = THREE.MathUtils.lerp(-0.42, 0.08, whip);
          outComp = THREE.MathUtils.lerp(0.32, 0.56, whip);
          foreFwd = THREE.MathUtils.lerp(0.18, 0.85, whip);
          foreUp = THREE.MathUtils.lerp(-0.58, 0.18, whip);
        } else {
          fwdComp = -0.45;
          upComp = 0.32;
          outComp = 0.34;
          foreFwd = 0.35;
          foreUp = 0.25;
        }
      } else if (isLunge) {
        const swipe = (atkP - 0.5) * 0.7;
        fwdComp = 0.95;
        upComp = 0.15 - swipe;
        outComp = 0.06;
        foreFwd = 0.98;
        foreUp = -0.25 - swipe * 0.5;
        leftExtraFwd = 0.18;
        rightExtraFwd = -0.12;
      } else if (isAttack) {
        if (e.kind === 'brute') {
          fwdComp = 0.65;
          upComp = -0.88;
          outComp = 0.1;
          foreFwd = 0.55;
          foreUp = -0.9;
        } else {
          fwdComp = 0.78;
          upComp = 0.08;
          outComp = 0.56 * strikeCurve + 0.12;
          foreFwd = 0.85;
          foreUp = 0.18;
        }
      } else if (isRecover) {
        fwdComp = 0.52;
        upComp = -0.68;
        outComp = 0.18;
        foreFwd = 0.65;
        foreUp = -0.42;
      }

      if (cf > 0.02) {
        fwdComp = THREE.MathUtils.lerp(fwdComp, 0.86, cf);
        upComp = THREE.MathUtils.lerp(upComp, -0.35, cf);
        outComp = THREE.MathUtils.lerp(outComp, 0.22, cf);
        foreFwd = THREE.MathUtils.lerp(foreFwd, 0.95, cf);
        foreUp = THREE.MathUtils.lerp(foreUp, -0.18, cf);
        leftExtraFwd = THREE.MathUtils.lerp(leftExtraFwd, crawlPullL * 0.38, cf);
        rightExtraFwd = THREE.MathUtils.lerp(rightExtraFwd, crawlPullR * 0.38, cf);
      }

      _vec3
        .copy(_weaponFwd)
        .multiplyScalar(fwdComp + leftExtraFwd)
        .addScaledVector(_weaponRight, -outComp);
      _vec3.y = upComp + (isLunge || isAttack || isAlerting ? 0 : armClaw * 0.15);
      orientBoneSegmentToWorldDir(bones.leftArm.node, bones.leftForeArm.node, _vec3, dt, animLambda);
      if (bones.leftHand) {
        _vec3B.copy(_weaponFwd).multiplyScalar(foreFwd).addScaledVector(_weaponRight, -0.06);
        _vec3B.y = foreUp;
        orientBoneSegmentToWorldDir(bones.leftForeArm.node, bones.leftHand, _vec3B, dt, animLambda);
      }

      _vec3
        .copy(_weaponFwd)
        .multiplyScalar(fwdComp + rightExtraFwd)
        .addScaledVector(_weaponRight, outComp);
      _vec3.y = upComp - (isLunge || isAttack || isAlerting ? 0 : armClaw * 0.15);
      orientBoneSegmentToWorldDir(bones.rightArm.node, bones.rightForeArm.node, _vec3, dt, animLambda);
      if (bones.rightHand) {
        _vec3B.copy(_weaponFwd).multiplyScalar(foreFwd).addScaledVector(_weaponRight, 0.06);
        _vec3B.y = foreUp;
        orientBoneSegmentToWorldDir(bones.rightForeArm.node, bones.rightHand, _vec3B, dt, animLambda);
      }
    } else {
      dampBoneRot(bones.leftArm, leftArmPitch, leftArmYaw, leftArmRoll, animLambda, dt);
      dampBoneRot(bones.rightArm, rightArmPitch, rightArmYaw, rightArmRoll, animLambda, dt);
      dampBoneRot(bones.leftForeArm, leftElbow, 0, 0, animLambda, dt);
      dampBoneRot(bones.rightForeArm, rightElbow, 0, 0, animLambda, dt);
    }
  }

  private updateDyingEnemies(dt: number) {
    if (this.dyingEnemies.length === 0) return;
    this.camera.updateMatrixWorld();
    _projScreenMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse,
    );
    _frustum.setFromProjectionMatrix(_projScreenMatrix);

    for (let i = this.dyingEnemies.length - 1; i >= 0; i--) {
      const d = this.dyingEnemies[i];
      d.timer += dt;
      const t = Math.min(1, d.timer / d.duration);
      const fall = 1 - Math.pow(1 - t, 2.5);

      const ddx = this.px - d.x;
      const ddz = this.pz - d.z;
      const dDistSq = ddx * ddx + ddz * ddz;
      _frustumSphere.center.set(d.x, d.y + 0.8, d.z);
      const inFrustum = _frustum.intersectsSphere(_frustumSphere);

      const { bodyPivot, bones, isCustomGlb, character } = d.bundle;
      if (inFrustum || dDistSq <= 64) {
        if (
          character.mixer &&
          character.hasAction('death') &&
          (d.crawlFactor < 0.35 || character.tag === 'zombie_crawler')
        ) {
          character.setAction('death', { fadeSec: 0.12, timeScale: 1.0 });
          character.updateAnimation(dt);
          bodyPivot.rotation.set(0, 0, 0);
          bodyPivot.position.set(0, 0, 0);
        } else {
          const startPitch = d.crawlFactor * 1.18;
          const targetPitch = d.crawlFactor > 0.35 ? 1.48 : d.fallDir * 1.44;
          bodyPivot.rotation.x = THREE.MathUtils.lerp(startPitch, targetPitch, fall);
          bodyPivot.rotation.z = d.fallDir * 0.18 * fall;
          bodyPivot.position.y = THREE.MathUtils.lerp(-d.crawlFactor * 0.76, d.crawlFactor > 0.35 ? -0.62 : 0.15, fall);

          dampSpineAndChest(bones, d.fallDir * 0.22 * fall, 0, d.fallDir * 0.14 * fall, 16, dt);
          dampNeckAndHead(bones, -d.fallDir * 0.35 * fall, 0.25 * fall, 0.18 * d.fallDir * fall, 16, dt);
          dampBoneRot(bones.leftUpLeg, -0.18 * fall, 0, 0.24 * fall, 16, dt);
          dampBoneRot(bones.rightUpLeg, 0.12 * fall, 0, -0.28 * fall, 16, dt);
          dampBoneRot(bones.leftLeg, 0.42 * fall, 0, 0, 16, dt);
          dampBoneRot(bones.rightLeg, 0.56 * fall, 0, 0, 16, dt);

          if (!isCustomGlb) {
            dampBoneRot(bones.leftArm, -0.55 * fall, 0, 0.48 * fall, 16, dt);
            dampBoneRot(bones.rightArm, -0.38 * fall, 0, -0.56 * fall, 16, dt);
            dampBoneRot(bones.leftForeArm, -0.35 * fall, 0, 0, 16, dt);
            dampBoneRot(bones.rightForeArm, -0.45 * fall, 0, 0, 16, dt);
          }
        }
      }

      d.bundle.group.position.set(d.x, d.y, d.z);
      d.bundle.group.rotation.y = d.yaw;

      this.applySeveredLimbPose(d.bundle, d.severedLimbs, d.stumpMeshes);

      const fadeStart = 0.72;
      const fadeScale = t > fadeStart ? Math.max(0.01, 1 - (t - fadeStart) / (1 - fadeStart)) : 1;
      d.bundle.group.scale.setScalar(fadeScale);
      d.shadow.scale.setScalar(d.baseShadowScale * (1 + fall * 0.25) * fadeScale);

      if (d.timer >= d.duration) {
        this.scene.remove(d.bundle.group, d.shadow);
        Object.values(d.stumpMeshes).forEach((s) => s?.dispose());
        d.bundle.dispose();
        this.dyingEnemies.splice(i, 1);
      }
    }
  }

  private animatePlayerDeath(dt: number) {
    this.deathAnimTimer = Math.min(1.4, this.deathAnimTimer + dt);
    const t = Math.min(1, this.deathAnimTimer / 0.88);
    const buckle = Math.min(1, t / 0.36);
    const fall = THREE.MathUtils.clamp((t - 0.14) / 0.86, 0, 1);
    const fallEase = 1 - Math.pow(1 - fall, 2.6);

    const { bones, bodyPivot, isCustomGlb, character } = this.playerRig;
    const gy = this.floorAt(this.px, this.pz, this.py);
    if (this.py > gy) {
      this.pvy -= 21 * dt;
      this.py = Math.max(gy, this.py + this.pvy * dt);
      this.playerRig.root.position.set(this.px, this.py, this.pz);
      this.playerShadow.position.set(this.px, gy + 0.025, this.pz);
    }

    if (character.mixer && character.hasAction('death')) {
      character.setAction('death', { fadeSec: 0.14, timeScale: 1.0 });
      character.updateAnimation(dt);
      bodyPivot.rotation.set(0, 0, 0);
      bodyPivot.position.set(0, 0, 0);
      this.playerShadow.scale.setScalar(1 + fallEase * 0.32);
    } else {
      bodyPivot.rotation.x = this.deathFallDir * 1.44 * fallEase;
      bodyPivot.rotation.z = this.deathFallDir * 0.22 * fallEase;
      bodyPivot.position.y = -0.18 * buckle + 0.32 * fallEase;
      this.playerShadow.scale.setScalar(1 + fallEase * 0.32);

      if (bones.hips) {
        const pelvisScale = getPelvisLocalPerMeter(bones.hips);
        bones.hips.node.position.y = THREE.MathUtils.damp(
          bones.hips.node.position.y,
          bones.hips.restPos.y - 0.24 * buckle * pelvisScale,
          16,
          dt,
        );
        dampBoneRot(bones.hips, 0, 0.14 * this.deathFallDir * fallEase, 0, 14, dt);
      }

      dampSpineAndChest(bones, 0.24 * buckle + this.deathFallDir * 0.18 * fallEase, 0, 0.14 * this.deathFallDir * fallEase, 14, dt);
      dampNeckAndHead(bones, -this.deathFallDir * 0.34 * fallEase, 0.28 * this.deathFallDir * fallEase, 0, 14, dt);

      dampBoneRot(bones.leftUpLeg, -0.58 * buckle + 0.35 * fallEase, 0, 0.18 * fallEase, 16, dt);
      dampBoneRot(bones.rightUpLeg, -0.44 * buckle + 0.22 * fallEase, 0, -0.22 * fallEase, 16, dt);
      dampBoneRot(bones.leftLeg, 1.15 * buckle * (1 - fallEase * 0.55), 0, 0, 16, dt);
      dampBoneRot(bones.rightLeg, 0.98 * buckle * (1 - fallEase * 0.45), 0, 0, 16, dt);

      if (!isCustomGlb) {
        dampBoneRot(bones.leftArm, -0.35 * fallEase, 0, 0.62 * fallEase, 14, dt);
        dampBoneRot(bones.rightArm, -0.28 * fallEase, 0, -0.68 * fallEase, 14, dt);
        dampBoneRot(bones.leftForeArm, -0.38 * fallEase, 0, 0, 14, dt);
        dampBoneRot(bones.rightForeArm, -0.45 * fallEase, 0, 0, 14, dt);
      }
    }

    // Smooth continuous orbit & gradual pull-out focused on the fallen player
    this.deathOrbitTimer += dt;
    const orbitSpeed = 0.28 + 0.08 * Math.min(1, this.deathOrbitTimer / 1.5);
    this.camYaw += dt * orbitSpeed;

    const pullBlend = 1 - Math.exp(-this.deathOrbitTimer * 0.22);
    const riseBlend = 1 - Math.exp(-this.deathOrbitTimer * 0.2);
    const targetDist = Math.max(this.deathCamStartDist + 7.5, 11.5);
    const targetRelHeight = Math.max(this.deathCamStartHeight + 3.4, 5.6);

    const camR = THREE.MathUtils.lerp(this.deathCamStartDist, targetDist, pullBlend);
    const camRelY = THREE.MathUtils.lerp(this.deathCamStartHeight, targetRelHeight, riseBlend);

    const desiredX = this.px + Math.sin(this.camYaw) * camR;
    const desiredZ = this.pz + Math.cos(this.camYaw) * camR;
    const desiredY = Math.max(this.floorAt(desiredX, desiredZ, this.py + 0.5) + 0.9, this.py + camRelY);
    const alpha = 1 - Math.exp(-5 * dt);
    this.camera.position.x += (desiredX - this.camera.position.x) * alpha;
    this.camera.position.y += (desiredY - this.camera.position.y) * alpha;
    this.camera.position.z += (desiredZ - this.camera.position.z) * alpha;

    const focusY = this.py + THREE.MathUtils.lerp(1.15, 0.42, fallEase);
    this.camera.lookAt(this.px, focusY, this.pz);

    const targetDeathFov = Math.max(this.cameraSettings.normalFov, 56);
    if (Math.abs(this.camera.fov - targetDeathFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetDeathFov, 5, dt);
      this.camera.updateProjectionMatrix();
    }
  }

  private alignHandMinusYToWorldDir(
    handNode: THREE.Object3D,
    worldForward: THREE.Vector3,
    dt: number,
    lambda = 34,
  ) {
    if (!handNode.parent || worldForward.lengthSq() < 0.0001) return;
    // On procedural survivor, hand -Y points forward along fingers/weapon barrel and +Z points up
    _basisY.copy(worldForward).normalize().negate();
    _basisX.crossVectors(_basisY, _worldUp);
    if (_basisX.lengthSq() < 0.0001) _basisX.set(1, 0, 0);
    else _basisX.normalize();
    _basisZ.crossVectors(_basisX, _basisY).normalize();

    _alignMat.makeBasis(_basisX, _basisY, _basisZ);
    _ikWorldQ.setFromRotationMatrix(_alignMat);
    handNode.parent.getWorldQuaternion(_ikParentQ).invert();
    _ikLocalQ.copy(_ikParentQ).multiply(_ikWorldQ);
    handNode.quaternion.slerp(_ikLocalQ, 1 - Math.exp(-lambda * dt));
  }

  private alignObjectForwardToWorldDir(
    obj: THREE.Object3D,
    worldForward: THREE.Vector3,
    dt: number,
    lambda = 32,
  ) {
    if (!obj.parent || worldForward.lengthSq() < 0.0001) return;
    _basisZ.copy(worldForward).normalize();
    _basisX.crossVectors(_worldUp, _basisZ);
    if (_basisX.lengthSq() < 0.0001) _basisX.set(1, 0, 0);
    else _basisX.normalize();
    _basisY.crossVectors(_basisZ, _basisX).normalize();

    _alignMat.makeBasis(_basisX, _basisY, _basisZ);
    _ikWorldQ.setFromRotationMatrix(_alignMat);
    obj.parent.getWorldQuaternion(_ikParentQ).invert();
    _ikLocalQ.copy(_ikParentQ).multiply(_ikWorldQ);
    obj.quaternion.slerp(_ikLocalQ, 1 - Math.exp(-lambda * dt));
  }

  private poseCustomArmDirs(
    upperArm: THREE.Object3D,
    foreArm: THREE.Object3D,
    handNode: THREE.Object3D | null,
    upperDir: THREE.Vector3,
    foreDir: THREE.Vector3,
    dt: number,
    lambda = 18,
    armBendLocal?: THREE.Vector3 | null,
    poleWorldDir?: THREE.Vector3,
  ) {
    orientBoneSegmentToWorldDir(upperArm, foreArm, upperDir, dt, lambda);
    if (armBendLocal && poleWorldDir) {
      stabilizeUpperArmTwist(upperArm, foreArm, armBendLocal, poleWorldDir, dt, lambda);
    }
    upperArm.updateMatrixWorld(true);
    if (handNode) {
      orientBoneSegmentToWorldDir(foreArm, handNode, foreDir, dt, lambda);
    }
  }

  private updatePlayerAnimation(
    dt: number,
    speed: number,
    isRunningInput: boolean,
    snapWeaponAim = false,
  ) {
    this.squashY += (1 - this.squashY) * (1 - Math.exp(-14 * dt));
    const xzScale = 1 + (1 - this.squashY) * 0.45;
    this.playerRig.root.scale.set(xzScale, this.squashY, xzScale);

    const rig = this.playerRig;
    const { bones, bodyPivot, isCustomGlb } = rig;
    const isMoving =
      this.gameState === 'PLAYING'
        ? this.grounded
          ? speed > 0.58
          : speed > 0.72
        : speed > 0.35;
    const isRunning = isMoving && isRunningInput && !this.isCrouching && !this.isAiming;
    const moveRatio = isMoving ? THREE.MathUtils.clamp(speed / 6.2, 0, 1.35) : 0;
    const animRate = isRunning ? speed * 1.72 : speed * 1.5;
    this.walkPhase += dt * (isMoving ? animRate : 2.1);

    const windupRatio =
      this.jumpWindupTimer > 0
        ? Math.sin((1 - Math.max(0, this.jumpWindupTimer) / this.jumpWindupDuration) * Math.PI * 0.85)
        : 0;

    const movingBlend = isMoving ? THREE.MathUtils.clamp(speed / 1.8, 0, 1) : 0;
    const crouchHold = this.crouchFactor * (1 - movingBlend * 0.82);
    const sneakWalk = this.crouchFactor * movingBlend;

    const strideAmp = !this.grounded ? 0.5 : isRunning ? 1.08 : isMoving ? (this.isCrouching ? 0.48 : 0.66) : 0;
    const stride = Math.sin(this.walkPhase) * strideAmp;
    const landingBend = Math.max(0, 1 - this.squashY) * 1.45;
    const sneakHip = -sneakWalk * 0.66 - landingBend * 0.42 - windupRatio * 0.36;
    const sneakKnee = sneakWalk * 1.24 + landingBend * 0.85 + windupRatio * 0.9;
    const sneakAnkle = -sneakWalk * 0.48 - landingBend * 0.36 - windupRatio * 0.38;
    const breath = Math.sin(this.elapsed * 2.3) * 0.022;
    const strideCos = Math.cos(this.walkPhase * 2);
    // Natural gait bounce: pelvis crests gently over supporting mid-stance leg and dips at max stride
    const bob =
      this.grounded && isMoving && windupRatio <= 0.01
        ? (strideCos * 0.55 - 0.45) * (isRunning ? 0.085 : this.isCrouching ? 0.024 : 0.044)
        : Math.sin(this.walkPhase) * 0.006;

    const aimingActive =
      ((this.gameState === 'PLAYING' &&
        (snapWeaponAim || this.isAiming || this.fireHeld || this.virtualFire || this.recoilTimer > 0)) ||
        (this.cameraPreviewActive && this.cameraPreviewAim)) &&
      this.weapon !== 'unarmed';
    const recoilKick = Math.max(
      this.recoilKickAmount,
      this.recoilTimer > 0 ? THREE.MathUtils.clamp(this.recoilTimer / 0.14, 0, 1) * 0.25 : 0,
    );
    const reloadTilt = this.reloadTimer > 0 ? 0.48 : 0;
    const sprintLean = !this.grounded
      ? this.pvy > 1.2
        ? 0.06
        : 0.18
      : isRunning
        ? 0.38 + (1 - strideCos) * 0.028
        : isMoving
          ? 0.08
          : 0;
    const crouchLean = crouchHold * 0.24 + sneakWalk * 0.34 + windupRatio * 0.28;

    const cosY = Math.cos(this.pyaw);
    const sinY = Math.sin(this.pyaw);
    // Character local forward (+Z -> world) and anatomical right (-X -> world)
    _weaponFwd.set(sinY, 0, cosY);
    _weaponRight.set(-cosY, 0, sinY);

    // 0. Tag-mapped Player .glb native clips via BaseCharacter AnimationMixer:
    // - Priority 1: "Arrojar granada" ('throw') when throwing throwables
    // - Priority 2: Native 'hit' reaction when taking damage
    // - Priority 3: Native 'attack' ('punch') when unarmed attacking
    // - Priority 4: Contextual locomotion ('jump' / 'crouchIdle' / 'crouchWalk' / 'sprint' / 'run' / 'walk' / 'idle')
    let skipBodyToArms = false;
    const char = rig.character;
    const hasClips = Boolean(
      char.mixer &&
        (char.actionDict.availableActions.length > 0 ||
          (rig.clips && Object.keys(rig.clips).length > 0)),
    );
    if (hasClips && char.mixer && rig.clips) {
      if (this.throwAnimTimer > 0 && rig.clips['throw']) {
        char.updateAnimation(dt);
        rig.root.updateMatrixWorld(true);
        bodyPivot.position.set(0, 0, 0);
        bodyPivot.rotation.set(0, 0, 0);
        applyHandFingerCurl(bones.rightFingers, 0.15, isCustomGlb ? 0.78 : 0.96, dt, 22);
        applyHandFingerCurl(bones.leftFingers, 0, isCustomGlb ? 0.78 : 0.96, dt, 22);
        if (rig.visorMat) {
          rig.visorMat.emissive.setHex(this.hurtFlashTimer > 0 ? 0xff2244 : 0xf59e0b);
        }
        return;
      }

      if (this.playerHitAnimTimer > 0 && char.hasAction('hit')) {
        char.updateAnimation(dt);
        rig.root.updateMatrixWorld(true);
        bodyPivot.position.set(0, 0, 0);
        bodyPivot.rotation.set(0, 0, 0);
        if (rig.visorMat) {
          rig.visorMat.emissive.setHex(this.hurtFlashTimer > 0 ? 0xff2244 : 0xf59e0b);
        }
        return;
      }

      if (this.weapon === 'unarmed' && this.meleeTimer > 0 && char.hasAction('attack')) {
        if (char.getCurrentAction() !== 'attack') {
          char.setAction('attack', { fadeSec: 0.08, timeScale: 1.0, oneShot: true });
        }
        char.updateAnimation(dt);
        rig.root.updateMatrixWorld(true);
        bodyPivot.position.set(0, 0, 0);
        bodyPivot.rotation.set(0, 0, 0);
        applyHandFingerCurl(bones.rightFingers, 0.9, isCustomGlb ? 0.78 : 0.96, dt, 26);
        applyHandFingerCurl(bones.leftFingers, 0.8, isCustomGlb ? 0.78 : 0.96, dt, 26);
        if (rig.visorMat) {
          rig.visorMat.emissive.setHex(this.hurtFlashTimer > 0 ? 0xff2244 : 0xf59e0b);
        }
        return;
      }

      let playedLocomotion = false;
      let usedNativeCrouchClip = false;
      const overrideArms =
        this.weapon !== 'unarmed' ||
        this.meleeTimer > 0 ||
        this.reloadTimer > 0 ||
        this.throwAnimTimer > 0 ||
        this.equippedThrowable !== null ||
        this.molotovLit ||
        this.nailBombLit ||
        this.aimingThrowable !== null;

      const timeScale = !isMoving
        ? 1.0
        : !this.grounded
          ? 0.55
          : isRunning
            ? THREE.MathUtils.clamp(speed / 8.8, 0.85, 1.25)
            : this.isCrouching
              ? THREE.MathUtils.clamp(speed / 3.1, 0.72, 1.15)
              : THREE.MathUtils.clamp(speed / 5.1, 0.75, 1.2);

      if (overrideArms) {
        if (bones.rightArm) _savedRArmQ.copy(bones.rightArm.node.quaternion);
        if (bones.rightForeArm) _savedRForeQ.copy(bones.rightForeArm.node.quaternion);
        if (bones.rightHand) _savedRHandQ.copy(bones.rightHand.quaternion);
        if (bones.leftArm) _savedLArmQ.copy(bones.leftArm.node.quaternion);
        if (bones.leftForeArm) _savedLForeQ.copy(bones.leftForeArm.node.quaternion);
        if (bones.leftHand) _savedLHandQ.copy(bones.leftHand.quaternion);
      }

      if (!this.grounded) {
        if (rig.clips['jump']) {
          playedLocomotion = char.playClip('jump', 0.1, 1.0);
        } else if (isMoving) {
          if (isRunning && rig.clips['sprint']) {
            playedLocomotion = char.playClip('sprint', 0.16, timeScale);
          } else {
            const airAction =
              isRunning && char.hasAction('run')
                ? 'run'
                : char.hasAction('walk')
                  ? 'walk'
                  : 'run';
            playedLocomotion = char.setAction(airAction, {
              fadeSec: 0.16,
              timeScale,
              interruptOneShot: true,
            });
          }
        } else if (char.hasAction('idle')) {
          playedLocomotion = char.setAction('idle', {
            fadeSec: 0.1,
            timeScale: 1.0,
            interruptOneShot: true,
            stopOtherLoops: true,
          });
        }
      } else if (this.isCrouching) {
        if (isMoving) {
          if (rig.clips['crouchWalk'] && char.playClip('crouchWalk', 0.16, timeScale)) {
            playedLocomotion = true;
            usedNativeCrouchClip = true;
          } else if (char.hasAction('walk')) {
            playedLocomotion = char.setAction('walk', {
              fadeSec: 0.16,
              timeScale,
              interruptOneShot: true,
            });
          }
        } else {
          if (rig.clips['crouchIdle'] && char.playClip('crouchIdle', 0.12, 1.0, false, true)) {
            playedLocomotion = true;
            usedNativeCrouchClip = true;
          } else if (char.hasAction('idle')) {
            playedLocomotion = char.setAction('idle', {
              fadeSec: 0.1,
              timeScale: 1.0,
              interruptOneShot: true,
              stopOtherLoops: true,
            });
          }
        }
      } else if (isMoving) {
        if (isRunning) {
          if (rig.clips['sprint']) {
            playedLocomotion = char.playClip('sprint', 0.16, timeScale);
          } else if (char.hasAction('run')) {
            playedLocomotion = char.setAction('run', {
              fadeSec: 0.16,
              timeScale,
              interruptOneShot: true,
            });
          } else if (char.hasAction('walk')) {
            playedLocomotion = char.setAction('walk', {
              fadeSec: 0.16,
              timeScale,
              interruptOneShot: true,
            });
          }
        } else {
          const walkAction = char.hasAction('walk') ? 'walk' : 'run';
          playedLocomotion = char.setAction(walkAction, {
            fadeSec: 0.16,
            timeScale,
            interruptOneShot: true,
          });
        }
      } else if (char.hasAction('idle')) {
        playedLocomotion = char.setAction('idle', {
          fadeSec: speed <= 0.05 ? 0.08 : 0.12,
          timeScale: 1.0,
          interruptOneShot: true,
          stopOtherLoops: true,
        });
      }

      if (playedLocomotion) {
        char.updateAnimation(dt);
        rig.root.updateMatrixWorld(true);

        const cf = usedNativeCrouchClip ? 0 : this.crouchFactor;
        if (cf > 0.02) {
          if (bones.hips) {
            const pelvisScale = getPelvisLocalPerMeter(bones.hips);
            bones.hips.node.position.y -= cf * 0.25 * pelvisScale;
            bones.hips.node.updateMatrixWorld(true);
          }
          if (bones.spine) addWorldAxisRotation(bones.spine.node, _weaponRight, -0.34 * cf);
          if (bones.leftUpLeg) addWorldAxisRotation(bones.leftUpLeg.node, _weaponRight, 0.56 * cf);
          if (bones.rightUpLeg) addWorldAxisRotation(bones.rightUpLeg.node, _weaponRight, 0.56 * cf);
          if (bones.leftLeg) addWorldAxisRotation(bones.leftLeg.node, _weaponRight, -1.04 * cf);
          if (bones.rightLeg) addWorldAxisRotation(bones.rightLeg.node, _weaponRight, -1.04 * cf);
          if (bones.leftFoot) addWorldAxisRotation(bones.leftFoot.node, _weaponRight, 0.48 * cf);
          if (bones.rightFoot) addWorldAxisRotation(bones.rightFoot.node, _weaponRight, 0.48 * cf);
        }

        bodyPivot.position.y = THREE.MathUtils.damp(
          bodyPivot.position.y,
          (bones.hips ? 0 : -cf * 0.42) - windupRatio * 0.16 + (this.grounded ? 0 : 0.08),
          14,
          dt,
        );
        bodyPivot.rotation.set(0, 0, 0);

        if (bones.head) {
          addWorldAxisRotation(bones.head.node, _worldUp, this.headYawOffset * 0.8);
          addWorldAxisRotation(
            bones.head.node,
            _weaponRight,
            -this.headPitchOffset * 0.8 + 0.26 * cf,
          );
        }

        if (overrideArms) {
          const upperTwistBone = bones.chest?.node ?? bones.spine?.node ?? null;
          if (upperTwistBone) {
            const aimTwist =
              this.weapon === 'rifle'
                ? aimingActive
                  ? -0.26
                  : -0.16
                : this.weapon === 'bow'
                  ? aimingActive || this.bowDrawProgress > 0.05
                    ? 0.34
                    : 0.12
                  : this.weapon === 'pistol' && aimingActive
                    ? -0.1
                    : 0;
            if (Math.abs(aimTwist) > 0.002) {
              addWorldAxisRotation(upperTwistBone, _worldUp, aimTwist);
            }
          }
          if (bones.rightArm) bones.rightArm.node.quaternion.copy(_savedRArmQ);
          if (bones.rightForeArm) bones.rightForeArm.node.quaternion.copy(_savedRForeQ);
          if (bones.rightHand) bones.rightHand.quaternion.copy(_savedRHandQ);
          if (bones.leftArm) bones.leftArm.node.quaternion.copy(_savedLArmQ);
          if (bones.leftForeArm) bones.leftForeArm.node.quaternion.copy(_savedLForeQ);
          if (bones.leftHand) bones.leftHand.quaternion.copy(_savedLHandQ);
          skipBodyToArms = true;
        } else {
          applyHandFingerCurl(bones.rightFingers, 0.12, isCustomGlb ? 0.78 : 0.96, dt, 18);
          applyHandFingerCurl(bones.leftFingers, 0.12, isCustomGlb ? 0.78 : 0.96, dt, 18);
          if (rig.visorMat) {
            rig.visorMat.emissive.setHex(this.hurtFlashTimer > 0 ? 0xff2244 : 0xf59e0b);
          }
          return;
        }
      } else {
        char.resetClips();
      }
    } else {
      char.resetClips();
    }

    if (!skipBodyToArms) {
      // 1. Head & neck track camera aim smoothly (compensating for forward sprint/crouch lean)
      const headPitchComp = -sprintLean * 0.62 - crouchLean * 0.42 - windupRatio * 0.22;
      dampNeckAndHead(
        bones,
        this.headPitchOffset + headPitchComp + breath * 0.4,
        this.headYawOffset,
        0,
        16,
        dt,
      );

      // 2. Subtle whole-body lateral weight shift & fallback crouch for static unrigged .glb
      const hasLegBones = Boolean(bones.leftUpLeg && bones.rightUpLeg);
      bodyPivot.position.y = THREE.MathUtils.damp(
        bodyPivot.position.y,
        (hasLegBones ? 0 : bob - this.crouchFactor * 0.42 - windupRatio * 0.2) +
          (this.grounded ? 0 : 0.08),
        15,
        dt,
      );
      bodyPivot.rotation.x = THREE.MathUtils.damp(bodyPivot.rotation.x, 0, 15, dt);
      bodyPivot.rotation.z = THREE.MathUtils.damp(
        bodyPivot.rotation.z,
        isMoving && this.grounded && windupRatio <= 0.01
          ? Math.cos(this.walkPhase) * (isRunning ? 0.044 : 0.028)
          : 0,
        12,
        dt,
      );

      // 3. Natural human pelvis bob, hip yaw twist, lateral weight shift & one-knee-down drop
      const hipYaw =
        isMoving && this.grounded && windupRatio <= 0.01
          ? Math.sin(this.walkPhase) * (isRunning ? 0.21 : this.isCrouching ? 0.1 : 0.155)
          : crouchHold * -0.14;
      const hipTilt =
        isMoving && this.grounded && windupRatio <= 0.01
          ? Math.cos(this.walkPhase) * (isRunning ? 0.068 : this.isCrouching ? 0.032 : 0.052)
          : 0;
      const pelvisUnitScale = getPelvisLocalPerMeter(bones.hips);
      const crouchPelvisDrop =
        (crouchHold * (isCustomGlb ? 0.35 : 0.37) + sneakWalk * (isCustomGlb ? 0.25 : 0.28)) *
        pelvisUnitScale;

      if (bones.hips) {
        bones.hips.node.position.y = THREE.MathUtils.damp(
          bones.hips.node.position.y,
          bones.hips.restPos.y -
            crouchPelvisDrop -
            (landingBend * 0.08 + windupRatio * 0.22 - bob) * pelvisUnitScale,
          18,
          dt,
        );
        bones.hips.node.position.x = THREE.MathUtils.damp(
          bones.hips.node.position.x,
          bones.hips.restPos.x +
            (isMoving && this.grounded && windupRatio <= 0.01
              ? Math.cos(this.walkPhase) * (isRunning ? 0.042 : 0.032)
              : 0),
          14,
          dt,
        );
        bones.hips.node.position.z = THREE.MathUtils.damp(
          bones.hips.node.position.z,
          bones.hips.restPos.z,
          14,
          dt,
        );
        dampBoneRot(bones.hips, 0, hipYaw, hipTilt, 16, dt);
      }

      // 4. Flexible Legs, Knees & Ankles (one-knee-down tactical crouch + stealth walk + sprint)
      if (bones.leftUpLeg && bones.rightUpLeg) {
        if (!this.grounded) {
          const rising = this.pvy > 1.2;
          dampBoneRot(bones.leftUpLeg, rising ? -0.86 : -0.36, 0, 0.04, 16, dt);
          dampBoneRot(bones.rightUpLeg, rising ? 0.44 : 0.16, 0, -0.04, 16, dt);
          dampBoneRot(bones.leftLeg, rising ? 1.28 : 0.56, 0, 0, 16, dt);
          dampBoneRot(bones.rightLeg, rising ? 0.36 : 0.44, 0, 0, 16, dt);
          dampBoneRot(bones.leftFoot, rising ? -0.32 : -0.14, 0, 0, 16, dt);
          dampBoneRot(bones.rightFoot, rising ? 0.52 : 0.22, 0, 0, 16, dt);
        } else if (windupRatio > 0.02) {
          // Pre-jump spring coil anticipation
          dampBoneRot(bones.leftUpLeg, sneakHip - windupRatio * 0.55, 0, 0.03, 28, dt);
          dampBoneRot(bones.rightUpLeg, sneakHip - windupRatio * 0.55, 0, -0.03, 28, dt);
          dampBoneRot(bones.leftLeg, sneakKnee, 0, 0, 28, dt);
          dampBoneRot(bones.rightLeg, sneakKnee, 0, 0, 28, dt);
          dampBoneRot(bones.leftFoot, sneakAnkle, 0, 0, 28, dt);
          dampBoneRot(bones.rightFoot, sneakAnkle, 0, 0, 28, dt);
        } else {
          const fwdBias = isRunning ? 0.24 : 0.08;
          const rawL = stride + Math.cos(this.walkPhase) * strideAmp * 0.16;
          const rawR = -stride - Math.cos(this.walkPhase) * strideAmp * 0.16;
          const legLeadL = rawL < 0 ? rawL * (1 + fwdBias) : rawL * 0.9;
          const legLeadR = rawR < 0 ? rawR * (1 + fwdBias) : rawR * 0.9;

          const swingGain = isRunning ? 1.48 : 0.98;
          const tuckGain = isRunning ? 0.44 : 0.1;
          const swingKneeL = Math.max(0, -Math.sin(this.walkPhase - 0.35)) * swingGain * moveRatio;
          const tuckKneeL = Math.max(0, Math.sin(this.walkPhase + 0.15)) * tuckGain * moveRatio;
          const loadKneeL =
            Math.max(0, Math.sin(this.walkPhase + 0.78)) * (isRunning ? 0.34 : 0.22) * moveRatio;

          const swingKneeR = Math.max(0, Math.sin(this.walkPhase - 0.35)) * swingGain * moveRatio;
          const tuckKneeR = Math.max(0, -Math.sin(this.walkPhase + 0.15)) * tuckGain * moveRatio;
          const loadKneeR =
            Math.max(0, -Math.sin(this.walkPhase + 0.78)) * (isRunning ? 0.34 : 0.22) * moveRatio;

          const pushOffAmp = (isRunning ? 0.62 : 0.32) * moveRatio;
          const heelStrikeAmp = (isRunning ? 0.34 : 0.22) * moveRatio;
          const stanceFlatCompL = -((legLeadL + sneakHip) + (sneakKnee + swingKneeL + tuckKneeL + loadKneeL)) * 0.32;
          const stanceFlatCompR = -((legLeadR + sneakHip) + (sneakKnee + swingKneeR + tuckKneeR + loadKneeR)) * 0.32;
          const walkAnkleL =
            sneakAnkle +
            stanceFlatCompL +
            Math.max(0, Math.sin(this.walkPhase - 0.85)) * pushOffAmp -
            Math.max(0, Math.sin(this.walkPhase + 0.95)) * heelStrikeAmp;
          const walkAnkleR =
            sneakAnkle +
            stanceFlatCompR +
            Math.max(0, -Math.sin(this.walkPhase - 0.85)) * pushOffAmp -
            Math.max(0, -Math.sin(this.walkPhase + 0.95)) * heelStrikeAmp;

          // One-knee-down tactical crouch pose: left foot planted flat forward, right knee on the ground
          const upL = THREE.MathUtils.lerp(legLeadL + sneakHip, -1.38, crouchHold);
          const upR = THREE.MathUtils.lerp(legLeadR + sneakHip, 0.16, crouchHold);
          const knL = THREE.MathUtils.lerp(sneakKnee + swingKneeL + tuckKneeL + loadKneeL, 1.44, crouchHold);
          const knR = THREE.MathUtils.lerp(sneakKnee + swingKneeR + tuckKneeR + loadKneeR, 1.36, crouchHold);
          const ftL = THREE.MathUtils.lerp(walkAnkleL, -0.06, crouchHold);
          const ftR = THREE.MathUtils.lerp(walkAnkleR, -0.35, crouchHold);

          dampBoneRot(bones.leftUpLeg, upL, 0, crouchHold * 0.08 + 0.02, 18, dt);
          dampBoneRot(bones.rightUpLeg, upR, 0, -crouchHold * 0.05 - 0.02, 18, dt);
          dampBoneRot(bones.leftLeg, knL, 0, 0, 20, dt);
          dampBoneRot(bones.rightLeg, knR, 0, 0, 20, dt);
          dampBoneRot(bones.leftFoot, ftL, 0, 0, 20, dt);
          dampBoneRot(bones.rightFoot, ftR, 0, 0, 20, dt);
        }
      }

      // 5. Torso twist & lean: distributed anatomically across lumbar spine & thoracic chest
      if (bones.spine) {
        const counterTwist =
          isMoving && this.grounded && windupRatio <= 0.01
            ? -hipYaw * (aimingActive ? 0.95 : isRunning ? 1.65 : 1.5)
            : 0;
        const torsoRoll =
          isMoving && this.grounded && windupRatio <= 0.01
            ? -Math.cos(this.walkPhase) * (isRunning ? 0.055 : 0.036)
            : 0;
        const weaponTwist =
          this.weapon === 'rifle'
            ? aimingActive
              ? -0.32
              : isRunning
                ? -0.14
                : -0.22
            : this.weapon === 'bow'
              ? aimingActive || this.bowDrawProgress > 0.05
                ? 0.42
                : 0.16
              : this.weapon === 'pistol'
                ? aimingActive
                  ? -0.12
                  : -0.02
                : crouchHold * 0.12;
        dampSpineAndChest(
          bones,
          sprintLean + crouchLean + breath - recoilKick * 0.28,
          counterTwist + weaponTwist,
          torsoRoll,
          15,
          dt,
          0.64,
        );
      }
    }

    // 6. Flexible Arms, Elbows, Wrists, Fingers & Unified Grip-Basis Weapon / Throwable IK
    let rightFingerCurl = 0;
    let leftFingerCurl = 0;
    const maxFingerCurlRad = isCustomGlb ? 0.78 : 0.96;

    if (bones.rightArm && bones.leftArm) {
      const cosY = Math.cos(this.pyaw);
      const sinY = Math.sin(this.pyaw);
      // Character local forward (+Z -> world) and anatomical right (-X -> world)
      _weaponFwd.set(sinY, 0, cosY);
      _weaponRight.set(-cosY, 0, sinY);

      const idleSway = !isMoving ? Math.sin(this.elapsed * 1.9) * 0.018 : 0;
      const rightGripQ = bones.rightGripLocalQ ?? _fallbackRightGripQ;
      const leftGripQ = bones.leftGripLocalQ ?? _fallbackLeftGripQ;

      if (this.throwAnimTimer > 0 && bones.rightForeArm && bones.rightHand) {
        // Fallback procedural throw forward swing (when character GLB has no "Arrojar granada" clip)
        const swingProg = 1 - this.throwAnimTimer / Math.max(0.05, this.throwAnimTotal);
        rig.root.updateMatrixWorld(true);
        bones.rightArm.node.getWorldPosition(_rightShoulderPos);
        bones.leftArm.node.getWorldPosition(_leftShoulderPos);
        _chestCenter.copy(_rightShoulderPos).add(_leftShoulderPos).multiplyScalar(0.5);

        const fwdSwing = THREE.MathUtils.lerp(-0.08, 0.56, Math.min(1, swingProg * 1.65));
        const upSwing = THREE.MathUtils.lerp(0.32, -0.04, Math.min(1, swingProg * 1.55));
        _rightGripTarget
          .copy(_chestCenter)
          .addScaledVector(_weaponRight, 0.24)
          .addScaledVector(_weaponFwd, fwdSwing);
        _rightGripTarget.y += upSwing;

        _ikPoleR
          .copy(_weaponRight)
          .multiplyScalar(0.72)
          .addScaledVector(_weaponFwd, -0.25);
        _ikPoleR.y -= 0.55;
        _ikPoleR.normalize();

        solveTwoBoneArmIK(
          bones.rightArm.node,
          bones.rightForeArm.node,
          bones.rightHand,
          _rightGripTarget,
          _ikPoleR,
          dt,
          44,
          bones.rightArmBendLocal,
        );
        _aimFingerWorld.copy(_weaponFwd).addScaledVector(_worldUp, 0.25 - swingProg * 0.4).normalize();
        _aimPalmWorld.copy(_weaponRight).multiplyScalar(-0.85).addScaledVector(_worldUp, -0.4).normalize();
        stabilizeForeArmTwist(bones.rightForeArm.node, bones.rightHand, bones.rightForeArmPalmLocal, _aimPalmWorld, dt, 34);
        _aimThumbWorld.crossVectors(_aimFingerWorld, _aimPalmWorld).normalize();
        _aimPalmWorld.crossVectors(_aimThumbWorld, _aimFingerWorld).normalize();
        alignHandGripFrameToWorldBasis(bones.rightHand, rig.throwableMount.quaternion, _aimPalmWorld, _aimThumbWorld, _aimFingerWorld, dt, 36);
        rightFingerCurl = 0.18;
      } else if (
        (this.aimingThrowable !== null ||
          this.molotovLit ||
          this.nailBombLit ||
          this.equippedThrowable !== null) &&
        bones.rightForeArm &&
        bones.rightHand
      ) {
        // Holding lit Molotov or aiming Molotov / Nail Bomb / Grenade directly inside right palm
        const isAimingThrow = this.aimingThrowable !== null;
        rig.root.updateMatrixWorld(true);
        bones.rightArm.node.getWorldPosition(_rightShoulderPos);
        bones.leftArm.node.getWorldPosition(_leftShoulderPos);
        _chestCenter.copy(_rightShoulderPos).add(_leftShoulderPos).multiplyScalar(0.5);

        if (isAimingThrow) {
          _rightGripTarget
            .copy(_chestCenter)
            .addScaledVector(_weaponRight, 0.34)
            .addScaledVector(_weaponFwd, -0.04);
          _rightGripTarget.y += 0.28 + Math.sin(this.elapsed * 5) * 0.015;
          _ikPoleR
            .copy(_weaponRight)
            .multiplyScalar(0.88)
            .addScaledVector(_weaponFwd, -0.35);
          _ikPoleR.y -= 0.3;
        } else {
          // Lit molotov carried upright slightly forward-right in front of chest
          _rightGripTarget
            .copy(_chestCenter)
            .addScaledVector(_weaponRight, 0.24)
            .addScaledVector(_weaponFwd, 0.34);
          _rightGripTarget.y += -0.02 + bob * 0.4 + idleSway;
          _ikPoleR
            .copy(_weaponRight)
            .multiplyScalar(0.55)
            .addScaledVector(_weaponFwd, -0.25);
          _ikPoleR.y -= 0.85;
        }
        _ikPoleR.normalize();

        solveTwoBoneArmIK(
          bones.rightArm.node,
          bones.rightForeArm.node,
          bones.rightHand,
          _rightGripTarget,
          _ikPoleR,
          dt,
          38,
          bones.rightArmBendLocal,
        );

        // Keep bottle/bomb upright (+Y = thumbSide = worldUp) with palm facing left-inward
        _aimThumbWorld.copy(_worldUp);
        if (isAimingThrow) {
          _aimThumbWorld.addScaledVector(_weaponFwd, -0.18).normalize();
        }
        _aimFingerWorld.copy(_weaponFwd).addScaledVector(_weaponRight, -0.22).normalize();
        _aimPalmWorld.crossVectors(_aimThumbWorld, _aimFingerWorld).normalize();
        _aimFingerWorld.crossVectors(_aimPalmWorld, _aimThumbWorld).normalize();
        stabilizeForeArmTwist(bones.rightForeArm.node, bones.rightHand, bones.rightForeArmPalmLocal, _aimPalmWorld, dt, 30);
        alignHandGripFrameToWorldBasis(
          bones.rightHand,
          rig.throwableMount.quaternion,
          _aimPalmWorld,
          _aimThumbWorld,
          _aimFingerWorld,
          dt,
          36,
        );
        rightFingerCurl = 0.92;

        if (isAimingThrow && bones.leftForeArm && bones.leftHand) {
          _vec3
            .copy(_chestCenter)
            .addScaledVector(_weaponRight, -0.2)
            .addScaledVector(_weaponFwd, 0.34);
          _vec3.y += 0.05;
          _ikPole
            .copy(_weaponRight)
            .multiplyScalar(-0.65)
            .addScaledVector(_weaponFwd, -0.2);
          _ikPole.y -= 0.78;
          _ikPole.normalize();
          solveTwoBoneArmIK(
            bones.leftArm.node,
            bones.leftForeArm.node,
            bones.leftHand,
            _vec3,
            _ikPole,
            dt,
            30,
            bones.leftArmBendLocal,
          );
          _aimThumbWorld.copy(_weaponFwd).addScaledVector(_worldUp, 0.2).normalize();
          _aimPalmWorld.copy(_weaponRight).multiplyScalar(0.6).addScaledVector(_worldUp, -0.78).normalize();
          _aimFingerWorld.crossVectors(_aimThumbWorld, _aimPalmWorld).normalize();
          _aimPalmWorld.crossVectors(_aimFingerWorld, _aimThumbWorld).normalize();
          stabilizeForeArmTwist(bones.leftForeArm.node, bones.leftHand, bones.leftForeArmPalmLocal, _aimPalmWorld, dt, 24);
          alignHandGripFrameToWorldBasis(bones.leftHand, leftGripQ, _aimPalmWorld, _aimFingerWorld, _aimThumbWorld, dt, 26);
        }
      } else if (this.reloadTimer > 0 && this.weapon !== 'unarmed') {
        if (isCustomGlb && bones.rightForeArm && bones.leftForeArm) {
          _ikPoleR.copy(_weaponRight).multiplyScalar(0.55).addScaledVector(_weaponFwd, -0.75).normalize();
          _ikPole.copy(_weaponRight).multiplyScalar(-0.55).addScaledVector(_weaponFwd, -0.75).normalize();
          _vec3.copy(_weaponFwd).multiplyScalar(0.45).addScaledVector(_weaponRight, -0.15);
          _vec3.y = -0.82;
          _vec3B.copy(_weaponFwd).multiplyScalar(0.86).addScaledVector(_weaponRight, -0.35);
          _vec3B.y = 0.25 + reloadTilt * 0.2;
          this.poseCustomArmDirs(bones.rightArm.node, bones.rightForeArm.node, bones.rightHand, _vec3, _vec3B, dt, 18, bones.rightArmBendLocal, _ikPoleR);

          _vec3.copy(_weaponFwd).multiplyScalar(0.45).addScaledVector(_weaponRight, 0.2);
          _vec3.y = -0.82;
          _vec3B.copy(_weaponFwd).multiplyScalar(0.86).addScaledVector(_weaponRight, 0.35);
          _vec3B.y = 0.28;
          this.poseCustomArmDirs(bones.leftArm.node, bones.leftForeArm.node, bones.leftHand, _vec3, _vec3B, dt, 18, bones.leftArmBendLocal, _ikPole);
        } else {
          dampBoneRot(bones.rightArm, -0.35 + reloadTilt * 0.4, 0.12, 0, 16, dt);
          dampBoneRot(bones.rightForeArm, -0.95, 0, 0, 16, dt);
          dampBoneRot(bones.leftArm, -0.22 + reloadTilt * 0.4, -0.12, 0, 16, dt);
          dampBoneRot(bones.leftForeArm, -0.82, 0, 0, 16, dt);
          dampBoneRot(bones.rightHandRest, 0.2, 0, 0, 16, dt);
          dampBoneRot(bones.leftHandRest, -0.18, 0, 0, 16, dt);
        }
        rightFingerCurl = 0.8;
        leftFingerCurl = 0.6;
      } else if (windupRatio > 0.05 && !aimingActive) {
        if (isCustomGlb && bones.rightForeArm && bones.leftForeArm) {
          _ikPoleR.copy(_weaponRight).multiplyScalar(0.45).addScaledVector(_weaponFwd, -0.85).normalize();
          _ikPole.copy(_weaponRight).multiplyScalar(-0.45).addScaledVector(_weaponFwd, -0.85).normalize();
          _vec3.copy(_weaponFwd).multiplyScalar(-0.45).addScaledVector(_weaponRight, 0.22);
          _vec3.y = -0.86;
          _vec3B.copy(_weaponFwd).multiplyScalar(0.32).addScaledVector(_weaponRight, 0.1);
          _vec3B.y = -0.92;
          this.poseCustomArmDirs(bones.rightArm.node, bones.rightForeArm.node, bones.rightHand, _vec3, _vec3B, dt, 24, bones.rightArmBendLocal, _ikPoleR);

          _vec3.copy(_weaponFwd).multiplyScalar(-0.45).addScaledVector(_weaponRight, -0.22);
          _vec3.y = -0.86;
          _vec3B.copy(_weaponFwd).multiplyScalar(0.32).addScaledVector(_weaponRight, -0.1);
          _vec3B.y = -0.92;
          this.poseCustomArmDirs(bones.leftArm.node, bones.leftForeArm.node, bones.leftHand, _vec3, _vec3B, dt, 24, bones.leftArmBendLocal, _ikPole);
        } else {
          dampBoneRot(bones.rightArm, 0.48 * windupRatio, 0, 0, 24, dt);
          dampBoneRot(bones.rightForeArm, -0.65 * windupRatio, 0, 0, 24, dt);
          dampBoneRot(bones.leftArm, 0.48 * windupRatio, 0, 0, 24, dt);
          dampBoneRot(bones.leftForeArm, -0.65 * windupRatio, 0, 0, 24, dt);
          dampBoneRot(bones.rightHandRest, 0, 0, 0, 20, dt);
          dampBoneRot(bones.leftHandRest, 0, 0, 0, 20, dt);
        }
        rightFingerCurl = this.weapon === 'unarmed' ? 0.15 : 0.85;
      } else if (
        this.weapon === 'unarmed' ||
        this.weapon === 'stick' ||
        this.weapon === 'baton'
      ) {
        const holdingStick = this.weapon === 'stick' || this.weapon === 'baton';
        if (this.meleeTimer > 0) {
          const punchProg = Math.sin((this.meleeTimer / Math.max(0.08, this.meleeDuration)) * Math.PI);
          const rightPunch = holdingStick ? true : this.meleeHandSign > 0;
          if (isCustomGlb && bones.rightForeArm && bones.leftForeArm) {
            const pArm = rightPunch ? bones.rightArm.node : bones.leftArm.node;
            const pFore = rightPunch ? bones.rightForeArm.node : bones.leftForeArm.node;
            const pHand = rightPunch ? bones.rightHand : bones.leftHand;
            const pBend = rightPunch ? bones.rightArmBendLocal : bones.leftArmBendLocal;
            const gArm = rightPunch ? bones.leftArm.node : bones.rightArm.node;
            const gFore = rightPunch ? bones.leftForeArm.node : bones.rightForeArm.node;
            const gHand = rightPunch ? bones.leftHand : bones.rightHand;
            const gBend = rightPunch ? bones.leftArmBendLocal : bones.rightArmBendLocal;

            _ikPoleR.copy(_weaponRight).multiplyScalar(rightPunch ? 0.65 : -0.65).addScaledVector(_weaponFwd, -0.65).normalize();
            _ikPole.copy(_weaponRight).multiplyScalar(rightPunch ? -0.55 : 0.55).addScaledVector(_weaponFwd, -0.75).normalize();
            _vec3.copy(_weaponFwd).multiplyScalar(0.95).addScaledVector(_weaponRight, rightPunch ? -0.12 : 0.12);
            _vec3.y = (holdingStick ? 0.35 : 0.08) * punchProg;
            this.poseCustomArmDirs(pArm, pFore, pHand, _vec3, _vec3, dt, 34, pBend, _ikPoleR);
            if (holdingStick && pHand) {
              const mountQ = this.weapon === 'baton' ? rig.batonMount.quaternion : rig.stickMount.quaternion;
              _aimThumbWorld.copy(_weaponFwd).multiplyScalar(0.7).addScaledVector(_worldUp, 0.7 - punchProg * 0.85).normalize();
              _aimPalmWorld.copy(_weaponRight).multiplyScalar(-1).normalize();
              _aimFingerWorld.crossVectors(_aimPalmWorld, _aimThumbWorld).normalize();
              _aimThumbWorld.crossVectors(_aimFingerWorld, _aimPalmWorld).normalize();
              stabilizeForeArmTwist(pFore, pHand, bones.rightForeArmPalmLocal, _aimPalmWorld, dt, 30);
              alignHandGripFrameToWorldBasis(pHand, mountQ, _aimPalmWorld, _aimThumbWorld, _aimFingerWorld, dt, 36);
            }

            _vec3B.copy(_weaponFwd).multiplyScalar(0.25).addScaledVector(_weaponRight, rightPunch ? -0.25 : 0.25);
            _vec3B.y = -0.85;
            _ikT.copy(_weaponFwd).multiplyScalar(0.85);
            _ikT.y = 0.35;
            this.poseCustomArmDirs(gArm, gFore, gHand, _vec3B, _ikT, dt, 24, gBend, _ikPole);
          } else {
            const pArm = rightPunch ? bones.rightArm : bones.leftArm;
            const pFore = rightPunch ? bones.rightForeArm : bones.leftForeArm;
            const pHand = rightPunch ? bones.rightHandRest : bones.leftHandRest;
            const gArm = rightPunch ? bones.leftArm : bones.rightArm;
            const gFore = rightPunch ? bones.leftForeArm : bones.rightForeArm;
            const gHand = rightPunch ? bones.leftHandRest : bones.rightHandRest;

            if (holdingStick) {
              dampBoneRot(pArm, -1.65 * punchProg - 0.35, -0.35 * punchProg, 0.25 * punchProg, 38, dt);
              dampBoneRot(pFore, -0.32 - 0.45 * (1 - punchProg), 0, 0, 36, dt);
              dampBoneRot(pHand, 0.28 * punchProg, 0, 0, 30, dt);
            } else {
              dampBoneRot(pArm, -1.45 * punchProg, 0, 0, 34, dt);
              dampBoneRot(pFore, -0.22, 0, 0, 34, dt);
              dampBoneRot(pHand, 0, 0, 0, 26, dt);
            }

            dampBoneRot(gArm, -0.45, 0, 0, 24, dt);
            dampBoneRot(gFore, -1.25, 0, 0, 24, dt);
            dampBoneRot(gHand, 0, 0, 0, 20, dt);
          }
          rightFingerCurl = holdingStick ? 0.96 : 0.92;
          leftFingerCurl = 0.85;
        } else if (isCustomGlb && bones.rightForeArm && bones.leftForeArm) {
          const rSwing = !this.grounded ? -0.42 : isRunning ? stride * 0.88 : stride * 0.65;
          const lSwing = !this.grounded ? 0.35 : isRunning ? -stride * 0.88 : -stride * 0.65;
          const crouchArm = this.crouchFactor * 0.28;

          _ikPoleR.copy(_weaponRight).multiplyScalar(0.45).addScaledVector(_weaponFwd, -0.86).normalize();
          _ikPole.copy(_weaponRight).multiplyScalar(-0.45).addScaledVector(_weaponFwd, -0.86).normalize();

          _vec3
            .copy(_weaponFwd)
            .multiplyScalar(holdingStick ? 0.25 : -rSwing + crouchArm)
            .addScaledVector(_weaponRight, 0.18);
          _vec3.y = holdingStick ? -0.78 : -0.92;
          _vec3B
            .copy(_weaponFwd)
            .multiplyScalar(holdingStick ? 0.72 : isRunning ? 0.85 : 0.42 + Math.max(0, -rSwing) * 0.45 + crouchArm * 0.8);
          _vec3B.y = holdingStick ? -0.18 : isRunning ? 0.18 : -0.68;
          this.poseCustomArmDirs(bones.rightArm.node, bones.rightForeArm.node, bones.rightHand, _vec3, _vec3B, dt, 18, bones.rightArmBendLocal, _ikPoleR);
          if (holdingStick && bones.rightHand) {
            const mountQ = this.weapon === 'baton' ? rig.batonMount.quaternion : rig.stickMount.quaternion;
            _aimThumbWorld.copy(_worldUp).addScaledVector(_weaponFwd, 0.28).normalize();
            _aimPalmWorld.copy(_weaponRight).multiplyScalar(-0.92).addScaledVector(_worldUp, -0.2).normalize();
            _aimFingerWorld.crossVectors(_aimPalmWorld, _aimThumbWorld).normalize();
            _aimPalmWorld.crossVectors(_aimThumbWorld, _aimFingerWorld).normalize();
            stabilizeForeArmTwist(bones.rightForeArm.node, bones.rightHand, bones.rightForeArmPalmLocal, _aimPalmWorld, dt, 22);
            alignHandGripFrameToWorldBasis(bones.rightHand, mountQ, _aimPalmWorld, _aimThumbWorld, _aimFingerWorld, dt, 26);
          } else {
            dampBoneRot(bones.rightHandRest, 0, 0, 0, 14, dt);
          }

          _vec3.copy(_weaponFwd).multiplyScalar(-lSwing + crouchArm).addScaledVector(_weaponRight, -0.16);
          _vec3.y = -0.92;
          _vec3B.copy(_weaponFwd).multiplyScalar(isRunning ? 0.85 : 0.42 + Math.max(0, -lSwing) * 0.45 + crouchArm * 0.8);
          _vec3B.y = isRunning ? 0.18 : -0.68;
          this.poseCustomArmDirs(bones.leftArm.node, bones.leftForeArm.node, bones.leftHand, _vec3, _vec3B, dt, 18, bones.leftArmBendLocal, _ikPole);
          dampBoneRot(bones.leftHandRest, 0, 0, 0, 14, dt);
          rightFingerCurl = holdingStick ? 0.95 : 0.15;
          leftFingerCurl = 0.15;
        } else {
          if (isRunning && this.grounded) {
            dampBoneRot(bones.rightArm, holdingStick ? -0.15 + stride * 0.48 : 0.18 + stride * 0.82, 0, 0.06, 18, dt);
            dampBoneRot(bones.rightForeArm, -1.42 - Math.max(0, -stride) * 0.26, 0, 0, 18, dt);
            dampBoneRot(bones.leftArm, 0.18 - stride * 0.82, 0, -0.06, 18, dt);
            dampBoneRot(bones.leftForeArm, -1.42 - Math.max(0, stride) * 0.26, 0, 0, 18, dt);
            dampBoneRot(bones.rightHandRest, 0, 0, 0, 16, dt);
            dampBoneRot(bones.leftHandRest, 0, 0, 0, 16, dt);
          } else {
            const jumpSpread = !this.grounded ? 0.26 : 0;
            const jumpFwd = !this.grounded ? -0.45 : 0;
            const stealthLift = crouchHold * -0.22 - sneakWalk * 0.18;
            const stealthBend = crouchHold * -0.68 - sneakWalk * 0.52;
            const rSwing = stride * (holdingStick ? 0.38 : 0.68);
            const lSwing = -stride * 0.68;

            dampBoneRot(bones.rightArm, (holdingStick ? -0.28 : 0) + rSwing + jumpFwd + stealthLift + idleSway, 0, 0.07 + jumpSpread, 16, dt);
            dampBoneRot(bones.rightForeArm, (holdingStick ? -0.78 : -0.26) - Math.max(0, -rSwing) * 0.35 + stealthBend, 0, 0, 16, dt);
            dampBoneRot(bones.leftArm, lSwing + jumpFwd + stealthLift - idleSway, 0, -0.07 - jumpSpread, 16, dt);
            dampBoneRot(bones.leftForeArm, -0.26 - Math.max(0, -lSwing) * 0.35 + stealthBend, 0, 0, 16, dt);
            dampBoneRot(bones.rightHandRest, 0, 0, 0, 16, dt);
            dampBoneRot(bones.leftHandRest, 0, 0, 0, 16, dt);
          }
          rightFingerCurl = holdingStick ? 0.95 : 0.15;
          leftFingerCurl = 0.15;
        }
      } else if (this.weapon === 'bow') {
        const drawT = this.bowDrawProgress;
        const bowAiming = aimingActive || drawT > 0.04;
        const pullDist = drawT * 0.28;
        const halfSpan = 0.56;
        const drawAngle = Math.atan2(pullDist, halfSpan);
        const strScale = Math.hypot(halfSpan, pullDist) / halfSpan;
        rig.bowStringUpper.rotation.x = drawAngle;
        rig.bowStringUpper.scale.y = strScale;
        rig.bowStringLower.rotation.x = -drawAngle;
        rig.bowStringLower.scale.y = strScale;
        // Arrow is attached to rightHand's arrowMount; keep its local z at 0 so it stays pinched in the right hand
        rig.bowNockedArrow.position.set(0, 0, 0);

        leftFingerCurl = 0.92;
        rightFingerCurl = bowAiming ? 0.72 : 0.48;

        if (bones.leftForeArm && bones.leftHand && bones.rightForeArm && bones.rightHand) {
          rig.root.updateMatrixWorld(true);
          bones.rightArm.node.getWorldPosition(_rightShoulderPos);
          bones.leftArm.node.getWorldPosition(_leftShoulderPos);
          _chestCenter.copy(_rightShoulderPos).add(_leftShoulderPos).multiplyScalar(0.5);

          if (bowAiming) {
            rig.bowMount.getWorldPosition(_vec3);
            _weaponAimDir.copy(this.aimPoint).sub(_vec3);
            if (_weaponAimDir.lengthSq() < 0.01) _weaponAimDir.copy(_weaponFwd);
            else _weaponAimDir.normalize();
          } else {
            _weaponAimDir.copy(_weaponFwd).multiplyScalar(0.84).addScaledVector(_weaponRight, 0.38);
            _weaponAimDir.y = -0.22 + idleSway * 0.4;
            _weaponAimDir.normalize();
          }

          // Left hand holds bow extended forward
          const bowRightOff = bowAiming ? -0.14 : -0.22;
          const bowUpOff = bowAiming ? 0.08 - Math.sin(this.camPitch) * 0.12 : -0.09 + bob * 0.4 + idleSway;
          const bowFwdOff = bowAiming ? 0.46 : 0.26;
          _vec3
            .copy(_chestCenter)
            .addScaledVector(_weaponRight, bowRightOff)
            .addScaledVector(_weaponFwd, bowFwdOff);
          _vec3.y += bowUpOff;

          _ikPole
            .copy(_weaponRight)
            .multiplyScalar(-0.78)
            .addScaledVector(_weaponFwd, -0.18);
          _ikPole.y -= 0.75;
          _ikPole.normalize();

          solveTwoBoneArmIK(
            bones.leftArm.node,
            bones.leftForeArm.node,
            bones.leftHand,
            _vec3,
            _ikPole,
            dt,
            snapWeaponAim ? 500 : 48,
            bones.leftArmBendLocal,
          );
          // Left hand grip basis: X = palmIn = finger x thumb (det = +1)
          _aimThumbWorld.copy(_worldUp);
          _aimFingerWorld.copy(_weaponAimDir);
          _aimPalmWorld.crossVectors(_aimFingerWorld, _aimThumbWorld).normalize();
          _aimThumbWorld.crossVectors(_aimPalmWorld, _aimFingerWorld).normalize();
          stabilizeForeArmTwist(
            bones.leftForeArm.node,
            bones.leftHand,
            bones.leftForeArmPalmLocal,
            _aimPalmWorld,
            dt,
            snapWeaponAim ? 500 : 34,
          );
          alignHandGripFrameToWorldBasis(
            bones.leftHand,
            leftGripQ,
            _aimPalmWorld,
            _aimFingerWorld,
            _aimThumbWorld,
            dt,
            snapWeaponAim ? 500 : 44,
          );

          // Right drawing hand holds arrow nock in arrowMount and draws back toward cheek
          if (bowAiming) {
            _rightGripTarget
              .copy(_vec3)
              .addScaledVector(_weaponAimDir, -0.16 - drawT * 0.34)
              .addScaledVector(_weaponRight, 0.05);
            _rightGripTarget.y += 0.04;
            _ikPoleR
              .copy(_weaponRight)
              .multiplyScalar(0.86)
              .addScaledVector(_weaponFwd, -0.35);
            _ikPoleR.y -= 0.25;
          } else {
            _rightGripTarget
              .copy(_chestCenter)
              .addScaledVector(_weaponRight, 0.24)
              .addScaledVector(_weaponFwd, 0.14 - stride * 0.12);
            _rightGripTarget.y += -0.22 + bob * 0.3;
            _ikPoleR
              .copy(_weaponRight)
              .multiplyScalar(0.55)
              .addScaledVector(_weaponFwd, -0.3);
            _ikPoleR.y -= 0.85;
          }
          _ikPoleR.normalize();
          solveTwoBoneArmIK(
            bones.rightArm.node,
            bones.rightForeArm.node,
            bones.rightHand,
            _rightGripTarget,
            _ikPoleR,
            dt,
            snapWeaponAim ? 500 : 42,
            bones.rightArmBendLocal,
          );

          if (bowAiming) {
            bones.leftHand.updateMatrixWorld(true);
            rig.bowMount.getWorldPosition(_vec3B);
            _vec3B.y += 0.06;
            bones.rightArm.node.updateMatrixWorld(true);
            bones.rightHand.getWorldPosition(_ikE);
            _aimFingerWorld.subVectors(_vec3B, _ikE);
            if (_aimFingerWorld.lengthSq() < 0.002) _aimFingerWorld.copy(_weaponAimDir);
            else _aimFingerWorld.normalize();
          } else {
            _aimFingerWorld
              .copy(_weaponFwd)
              .multiplyScalar(0.86)
              .addScaledVector(_weaponRight, -0.28);
            _aimFingerWorld.y = -0.14;
            _aimFingerWorld.normalize();
          }
          // Right hand grip basis: X = palmIn = thumb x finger (det = +1)
          _aimThumbWorld.copy(_worldUp);
          _aimPalmWorld.crossVectors(_aimThumbWorld, _aimFingerWorld).normalize();
          _aimThumbWorld.crossVectors(_aimFingerWorld, _aimPalmWorld).normalize();
          stabilizeForeArmTwist(
            bones.rightForeArm.node,
            bones.rightHand,
            bones.rightForeArmPalmLocal,
            _aimPalmWorld,
            dt,
            snapWeaponAim ? 500 : 34,
          );
          alignHandGripFrameToWorldBasis(
            bones.rightHand,
            rightGripQ,
            _aimPalmWorld,
            _aimThumbWorld,
            _aimFingerWorld,
            dt,
            snapWeaponAim ? 500 : 44,
          );
        }
      } else if (this.weapon === 'pistol') {
        rightFingerCurl = 0.92;
        if (isRunning && !aimingActive && this.grounded) {
          if (bones.rightForeArm && bones.rightHand) {
            rig.root.updateMatrixWorld(true);
            bones.rightArm.node.getWorldPosition(_rightShoulderPos);
            bones.leftArm.node.getWorldPosition(_leftShoulderPos);
            _chestCenter.copy(_rightShoulderPos).add(_leftShoulderPos).multiplyScalar(0.5);

            const rPump = Math.sin(this.walkPhase);
            _rightGripTarget
              .copy(_chestCenter)
              .addScaledVector(_weaponRight, 0.22)
              .addScaledVector(_weaponFwd, 0.24 + rPump * 0.1);
            _rightGripTarget.y += -0.06 + Math.abs(rPump) * 0.04;

            _ikPoleR
              .copy(_weaponRight)
              .multiplyScalar(0.58)
              .addScaledVector(_weaponFwd, -0.3);
            _ikPoleR.y -= 0.85;
            _ikPoleR.normalize();

            solveTwoBoneArmIK(
              bones.rightArm.node,
              bones.rightForeArm.node,
              bones.rightHand,
              _rightGripTarget,
              _ikPoleR,
              dt,
              32,
              bones.rightArmBendLocal,
            );

            // While running, revolver stays upright & forward-right inside closed fist (NEVER backwards!)
            _weaponAimDir
              .copy(_weaponFwd)
              .multiplyScalar(0.88)
              .addScaledVector(_weaponRight, 0.18);
            _weaponAimDir.y = 0.25 + rPump * 0.08;
            _weaponAimDir.normalize();

            _aimUpOrtho.copy(_worldUp).addScaledVector(_weaponRight, -0.18).normalize();
            _aimPalmWorld.crossVectors(_aimUpOrtho, _weaponAimDir).normalize();
            _aimThumbWorld.crossVectors(_weaponAimDir, _aimPalmWorld).normalize();
            stabilizeForeArmTwist(bones.rightForeArm.node, bones.rightHand, bones.rightForeArmPalmLocal, _aimPalmWorld, dt, 26);
            alignHandGripFrameToWorldBasis(
              bones.rightHand,
              rig.pistolMount.quaternion,
              _aimPalmWorld,
              _aimThumbWorld,
              _weaponAimDir,
              dt,
              34,
            );
          }

          if (isCustomGlb && bones.leftForeArm) {
            _ikPole.copy(_weaponRight).multiplyScalar(-0.45).addScaledVector(_weaponFwd, -0.86).normalize();
            _vec3.copy(_weaponFwd).multiplyScalar(stride * 0.85).addScaledVector(_weaponRight, -0.16);
            _vec3.y = -0.88;
            _vec3B.copy(_weaponFwd).multiplyScalar(0.88);
            _vec3B.y = 0.2;
            this.poseCustomArmDirs(bones.leftArm.node, bones.leftForeArm.node, bones.leftHand, _vec3, _vec3B, dt, 18, bones.leftArmBendLocal, _ikPole);
            dampBoneRot(bones.leftHandRest, 0, 0, 0, 14, dt);
          } else {
            const shoulderPumpL = 0.16 - stride * 0.84;
            dampBoneRot(bones.leftArm, shoulderPumpL, 0, -0.05, 18, dt);
            dampBoneRot(bones.leftForeArm, -1.48 - Math.max(0, stride) * 0.26, 0, 0, 18, dt);
            dampBoneRot(bones.leftHandRest, 0.1, 0, 0, 18, dt);
          }
          leftFingerCurl = 0.25;
        } else {
          if (bones.rightForeArm && bones.rightHand) {
            rig.root.updateMatrixWorld(true);
            bones.rightArm.node.getWorldPosition(_rightShoulderPos);
            bones.leftArm.node.getWorldPosition(_leftShoulderPos);
            _chestCenter.copy(_rightShoulderPos).add(_leftShoulderPos).multiplyScalar(0.5);

            const gripRightOff = aimingActive ? 0.13 : 0.21;
            const gripUpOff = aimingActive
              ? 0.025 - Math.sin(this.camPitch) * 0.15 + recoilKick * 0.06
              : -0.11 + bob * 0.4 + idleSway;
            const gripFwdOff = (aimingActive ? 0.43 : 0.30 + stride * 0.04) - recoilKick * 0.1;

            _rightGripTarget
              .copy(_chestCenter)
              .addScaledVector(_weaponRight, gripRightOff)
              .addScaledVector(_weaponFwd, gripFwdOff);
            _rightGripTarget.y += gripUpOff;

            _ikPoleR
              .copy(_weaponRight)
              .multiplyScalar(0.52)
              .addScaledVector(_weaponFwd, -0.24);
            _ikPoleR.y -= 0.88;
            _ikPoleR.normalize();

            const armAimLambda = snapWeaponAim ? 500 : 46;
            solveTwoBoneArmIK(
              bones.rightArm.node,
              bones.rightForeArm.node,
              bones.rightHand,
              _rightGripTarget,
              _ikPoleR,
              dt,
              armAimLambda,
              bones.rightArmBendLocal,
            );

            bones.rightArm.node.updateMatrixWorld(true);
            if (aimingActive && this.gameState === 'PLAYING') {
              rig.pistolMount.getWorldPosition(_vec3);
              _weaponAimDir.copy(this.aimPoint).sub(_vec3);
              if (_weaponAimDir.lengthSq() < 0.01) _weaponAimDir.copy(_weaponFwd);
              else _weaponAimDir.normalize();
              _weaponAimDir.y += recoilKick * 0.36;
            } else {
              _weaponAimDir.copy(_weaponFwd).addScaledVector(_weaponRight, -0.06);
              _weaponAimDir.y = -0.14 + idleSway * 0.45;
            }
            _weaponAimDir.normalize();

            // Rotate the HAND itself via calibrated grip frame so pistol +Z barrel ALWAYS aims along _weaponAimDir
            _aimUpOrtho.copy(_worldUp).addScaledVector(_weaponRight, aimingActive ? -0.06 : -0.16).normalize();
            _aimPalmWorld.crossVectors(_aimUpOrtho, _weaponAimDir).normalize();
            _aimThumbWorld.crossVectors(_weaponAimDir, _aimPalmWorld).normalize();
            stabilizeForeArmTwist(
              bones.rightForeArm.node,
              bones.rightHand,
              bones.rightForeArmPalmLocal,
              _aimPalmWorld,
              dt,
              snapWeaponAim ? 500 : 34,
            );
            alignHandGripFrameToWorldBasis(
              bones.rightHand,
              rig.pistolMount.quaternion,
              _aimPalmWorld,
              _aimThumbWorld,
              _weaponAimDir,
              dt,
              snapWeaponAim ? 500 : 44,
            );
          }

          if (aimingActive && bones.leftForeArm && bones.leftHand) {
            bones.rightArm.node.updateMatrixWorld(true);
            rig.pistolMount.getWorldPosition(_vec3);

            // Cup left hand under/around right revolver grip
            _aimThumbWorld.copy(_weaponAimDir);
            _aimPalmWorld.copy(_worldUp).multiplyScalar(0.52).addScaledVector(_weaponRight, 0.85).normalize();
            _aimFingerWorld.crossVectors(_aimThumbWorld, _aimPalmWorld).normalize();
            _aimPalmWorld.crossVectors(_aimFingerWorld, _aimThumbWorld).normalize();

            _vec3
              .addScaledVector(_weaponRight, -0.018)
              .addScaledVector(_weaponAimDir, -0.008)
              .addScaledVector(_worldUp, -0.036);

            _ikPole
              .copy(_weaponRight)
              .multiplyScalar(-0.62)
              .addScaledVector(_weaponFwd, -0.22);
            _ikPole.y -= 0.88;
            _ikPole.normalize();
            solveTwoBoneArmIK(
              bones.leftArm.node,
              bones.leftForeArm.node,
              bones.leftHand,
              _vec3,
              _ikPole,
              dt,
              48,
              bones.leftArmBendLocal,
            );
            stabilizeForeArmTwist(bones.leftForeArm.node, bones.leftHand, bones.leftForeArmPalmLocal, _aimPalmWorld, dt, 32);
            alignHandGripFrameToWorldBasis(
              bones.leftHand,
              leftGripQ,
              _aimPalmWorld,
              _aimFingerWorld,
              _aimThumbWorld,
              dt,
              42,
            );
            leftFingerCurl = 0.72;
          } else if (isCustomGlb && bones.leftForeArm) {
            _ikPole.copy(_weaponRight).multiplyScalar(-0.45).addScaledVector(_weaponFwd, -0.86).normalize();
            _vec3.copy(_weaponFwd).multiplyScalar(-stride * 0.65).addScaledVector(_weaponRight, -0.16);
            _vec3.y = -0.92;
            _vec3B.copy(_weaponFwd).multiplyScalar(0.45 + Math.max(0, stride) * 0.4);
            _vec3B.y = -0.7;
            this.poseCustomArmDirs(bones.leftArm.node, bones.leftForeArm.node, bones.leftHand, _vec3, _vec3B, dt, 16, bones.leftArmBendLocal, _ikPole);
            dampBoneRot(bones.leftHandRest, 0, 0, 0, 14, dt);
            leftFingerCurl = 0.2;
          } else {
            const jumpArm = !this.grounded ? -0.45 : 0;
            dampBoneRot(bones.leftArm, -stride * 0.72 + jumpArm + crouchHold * -0.18, 0, -0.06, 16, dt);
            dampBoneRot(
              bones.leftForeArm,
              -0.48 - Math.max(0, -stride) * 0.35 - crouchHold * 0.45 - (!this.grounded ? 0.45 : 0),
              0,
              0,
              16,
              dt,
            );
            dampBoneRot(bones.leftHandRest, 0.1 * Math.sin(this.walkPhase), 0, 0, 16, dt);
            leftFingerCurl = 0.2;
          }
        }
      } else {
        // Two-handed FAL Rifle Stance: Right Palm holds grip tucked in front of shoulder pocket, Left Palm cradles handguard/foregrip
        rightFingerCurl = 0.92;
        if (bones.rightForeArm && bones.rightHand) {
          rig.root.updateMatrixWorld(true);
          bones.rightArm.node.getWorldPosition(_rightShoulderPos);
          bones.leftArm.node.getWorldPosition(_leftShoulderPos);
          _chestCenter.copy(_rightShoulderPos).add(_leftShoulderPos).multiplyScalar(0.5);

          const sprintPump = isRunning && !aimingActive ? Math.sin(this.walkPhase) : 0;
          const gripRightOff = aimingActive
            ? 0.145
            : isRunning
              ? 0.13 + sprintPump * 0.035
              : 0.165;
          const gripUpOff =
            (aimingActive
              ? 0.032
              : isRunning
                ? -0.11 + Math.abs(sprintPump) * 0.03
                : -0.055) -
            (aimingActive ? Math.sin(this.camPitch) * 0.09 : 0) +
            bob * (aimingActive ? 0.25 : 0.35) +
            idleSway * 0.38;
          const gripFwdOff =
            (aimingActive ? 0.295 : isRunning ? 0.265 : 0.285) - recoilKick * 0.08;

          _rightGripTarget
            .copy(_chestCenter)
            .addScaledVector(_weaponRight, gripRightOff)
            .addScaledVector(_weaponFwd, gripFwdOff);
          _rightGripTarget.y += gripUpOff;

          _ikPoleR
            .copy(_weaponRight)
            .multiplyScalar(isRunning && !aimingActive ? 0.85 : 0.78)
            .addScaledVector(_weaponFwd, -0.28);
          _ikPoleR.y -= isRunning && !aimingActive ? 0.72 : 0.88;
          _ikPoleR.normalize();

          const rifleArmLambda = snapWeaponAim ? 500 : 48;
          solveTwoBoneArmIK(
            bones.rightArm.node,
            bones.rightForeArm.node,
            bones.rightHand,
            _rightGripTarget,
            _ikPoleR,
            dt,
            rifleArmLambda,
            bones.rightArmBendLocal,
          );

          bones.rightArm.node.updateMatrixWorld(true);
          if (aimingActive) {
            rig.rifleMount.getWorldPosition(_vec3);
            _weaponAimDir.copy(this.aimPoint).sub(_vec3);
            if (_weaponAimDir.lengthSq() < 0.01) _weaponAimDir.copy(_weaponFwd);
            else _weaponAimDir.normalize();
            _weaponAimDir.y += recoilKick * 0.24;
          } else if (isRunning) {
            _weaponAimDir
              .copy(_weaponFwd)
              .multiplyScalar(0.72)
              .addScaledVector(_weaponRight, -0.62 + sprintPump * 0.08);
            _weaponAimDir.y = -0.18 + Math.abs(sprintPump) * 0.06;
          } else {
            _weaponAimDir
              .copy(_weaponFwd)
              .multiplyScalar(0.9)
              .addScaledVector(_weaponRight, -0.28);
            _weaponAimDir.y = -0.05 + idleSway * 0.45;
          }
          _weaponAimDir.normalize();

          // Rotate right hand itself via calibrated rifleMount grip frame
          _aimUpOrtho.copy(_worldUp).addScaledVector(_weaponRight, aimingActive ? -0.05 : -0.14).normalize();
          _aimPalmWorld.crossVectors(_aimUpOrtho, _weaponAimDir).normalize();
          _aimThumbWorld.crossVectors(_weaponAimDir, _aimPalmWorld).normalize();
          stabilizeForeArmTwist(
            bones.rightForeArm.node,
            bones.rightHand,
            bones.rightForeArmPalmLocal,
            _aimPalmWorld,
            dt,
            snapWeaponAim ? 500 : 36,
          );
          alignHandGripFrameToWorldBasis(
            bones.rightHand,
            rig.rifleMount.quaternion,
            _aimPalmWorld,
            _aimThumbWorld,
            _weaponAimDir,
            dt,
            snapWeaponAim ? 500 : 48,
          );

          // Solve Left Arm IK onto rifle handguard/foregrip so palm cups cleanly underneath
          if (bones.leftForeArm && bones.leftHand) {
            bones.rightHand.updateMatrixWorld(true);
            rig.rifleForegrip.getWorldPosition(_vec3);

            _aimThumbWorld.copy(_weaponAimDir);
            _aimPalmWorld.copy(_worldUp).multiplyScalar(0.78).addScaledVector(_weaponRight, 0.62).normalize();
            _aimFingerWorld.crossVectors(_aimThumbWorld, _aimPalmWorld).normalize();
            _aimPalmWorld.crossVectors(_aimFingerWorld, _aimThumbWorld).normalize();

            // Place left palm just below foregrip/handguard centerline
            _vec3.addScaledVector(_aimPalmWorld, -0.036);

            _ikPole
              .copy(_weaponRight)
              .multiplyScalar(isRunning && !aimingActive ? -0.82 : -0.7)
              .addScaledVector(_weaponFwd, -0.22);
            _ikPole.y -= isRunning && !aimingActive ? 0.72 : 0.92;
            _ikPole.normalize();

            solveTwoBoneArmIK(
              bones.leftArm.node,
              bones.leftForeArm.node,
              bones.leftHand,
              _vec3,
              _ikPole,
              dt,
              snapWeaponAim ? 500 : 86,
              bones.leftArmBendLocal,
            );
            stabilizeForeArmTwist(
              bones.leftForeArm.node,
              bones.leftHand,
              bones.leftForeArmPalmLocal,
              _aimPalmWorld,
              dt,
              snapWeaponAim ? 500 : 36,
            );
            alignHandGripFrameToWorldBasis(
              bones.leftHand,
              leftGripQ,
              _aimPalmWorld,
              _aimFingerWorld,
              _aimThumbWorld,
              dt,
              snapWeaponAim ? 500 : 46,
            );
            leftFingerCurl = 0.78;
          }
        }
      }
      // Always keep rightGunTilt baked? Already baked in pistolMount/rifleMount quaternions!
      void rightGripQ;
    }

    applyHandFingerCurl(bones.rightFingers, rightFingerCurl, maxFingerCurlRad, dt, 26);
    applyHandFingerCurl(bones.leftFingers, leftFingerCurl, maxFingerCurlRad, dt, 26);

    if (rig.visorMat) {
      rig.visorMat.emissive.setHex(this.hurtFlashTimer > 0 ? 0xff2244 : 0xf59e0b);
    }
    rig.root.updateMatrixWorld(true);

    // Sync held throwable visibility & molotov flame flicker inside rightHand's throwableMount
    const showMolotov =
      this.gameState === 'PLAYING' &&
      (this.equippedThrowable === 'molotov' ||
        this.molotovLit ||
        this.aimingThrowable === 'molotov');
    const showNailBomb =
      this.gameState === 'PLAYING' &&
      (this.equippedThrowable === 'nail_bomb' ||
        this.nailBombLit ||
        this.aimingThrowable === 'nail_bomb');
    const showGrenade =
      this.gameState === 'PLAYING' && this.aimingThrowable === 'grenade';
    const showBottle =
      this.gameState === 'PLAYING' &&
      (this.equippedThrowable === 'bottle' || this.aimingThrowable === 'bottle');
    const showCan =
      this.gameState === 'PLAYING' &&
      (this.equippedThrowable === 'can' || this.aimingThrowable === 'can');
    const showBrick =
      this.gameState === 'PLAYING' &&
      (this.equippedThrowable === 'brick' || this.aimingThrowable === 'brick');
    const showDecoyRat =
      this.gameState === 'PLAYING' &&
      (this.equippedThrowable === 'decoy_rat' || this.aimingThrowable === 'decoy_rat');
    if (this.heldMolotovGroup) {
      this.heldMolotovGroup.visible = showMolotov;
      if (this.heldMolotovFlame) {
        const lit = this.molotovLit || this.aimingThrowable === 'molotov';
        this.heldMolotovFlame.group.visible = showMolotov && lit;
        if (showMolotov && lit) {
          const flicker = 0.9 + Math.sin(this.elapsed * 22) * 0.14;
          this.heldMolotovFlame.update(this.elapsed, 1.0, flicker, 1.0);
          this.heldMolotovSmokeTimer -= dt;
          if (this.heldMolotovSmokeTimer <= 0) {
            this.heldMolotovSmokeTimer = 0.095;
            this.heldMolotovFlame.group.getWorldPosition(_vec3);
            this.spawnSmokePuff(
              _vec3.x + (Math.random() - 0.5) * 0.04,
              _vec3.y + 0.11,
              _vec3.z + (Math.random() - 0.5) * 0.04,
              (Math.random() - 0.5) * 0.22,
              0.78 + Math.random() * 0.32,
              (Math.random() - 0.5) * 0.22,
              0.68 + Math.random() * 0.3,
              0.12,
              0.44,
              0.2,
              0.2,
              0.22,
              0.34,
            );
          }
        }
      }
    }
    if (this.heldNailBombGroup) this.heldNailBombGroup.visible = showNailBomb;
    if (this.heldGrenadeGroup) this.heldGrenadeGroup.visible = showGrenade;
    if (this.heldBottleGroup) this.heldBottleGroup.visible = showBottle;
    if (this.heldCanGroup) this.heldCanGroup.visible = showCan;
    if (this.heldBrickGroup) this.heldBrickGroup.visible = showBrick;
    if (this.heldDecoyRatGroup) this.heldDecoyRatGroup.visible = showDecoyRat;
  }

  private updateFreeCamera(dt: number) {
    const aiming = this.gameState === 'PLAYING' ? this.isAiming : this.cameraPreviewAim;
    const sprinting = this.gameState === 'PLAYING' && this.stance === 'run';
    const targetDist = aiming
      ? this.cameraSettings.aimDistance
      : sprinting
        ? this.cameraSettings.normalDistance + 0.5
        : this.cameraSettings.normalDistance;
    const targetShoulder = aiming
      ? this.cameraSettings.aimShoulderOffset
      : this.cameraSettings.normalShoulderOffset;
    const targetPivotY =
      (aiming ? this.cameraSettings.aimHeight : this.cameraSettings.normalHeight) -
      this.crouchFactor * 0.48;

    this.camDistCurrent = THREE.MathUtils.damp(this.camDistCurrent, targetDist, 12, dt);
    this.camShoulderOffset = THREE.MathUtils.damp(this.camShoulderOffset, targetShoulder, 12, dt);
    this.camPivotHeight = THREE.MathUtils.damp(this.camPivotHeight, targetPivotY, 12, dt);

    const effectiveYaw =
      this.camYaw + (this.gameState === 'PLAYING' ? this.camRecoilYaw : 0);
    const effectivePitch = THREE.MathUtils.clamp(
      this.camPitch + (this.gameState === 'PLAYING' ? this.camRecoilPitch : 0),
      -0.45,
      0.78,
    );

    const rightX = Math.cos(effectiveYaw);
    const rightZ = -Math.sin(effectiveYaw);

    const lookTargetX = this.px + rightX * this.camShoulderOffset;
    const lookTargetY = this.py + this.camPivotHeight;
    const lookTargetZ = this.pz + rightZ * this.camShoulderOffset;

    // Pull camera arm slightly inward if an obstacle collider sits between player and camera
    let effectiveDist = this.camDistCurrent;
    const cosP = Math.cos(effectivePitch);
    const armDirX = Math.sin(effectiveYaw) * cosP;
    const armDirZ = Math.cos(effectiveYaw) * cosP;
    if (this.activeZone === 'exterior_9_julio') {
      for (let i = 0; i < this.worldEnv.colliders.length; i++) {
        const c = this.worldEnv.colliders[i];
        const baseY = groundHeightAt(c.x, c.z);
        if (lookTargetY > baseY + c.height + 0.35) continue;
        const relX = c.x - lookTargetX;
        const relZ = c.z - lookTargetZ;
        const proj = relX * armDirX + relZ * armDirZ;
        if (proj > 0.3 && proj < effectiveDist) {
          const perpSq = relX * relX + relZ * relZ - proj * proj;
          const blockR = c.radius + 0.35;
          if (perpSq < blockR * blockR) {
            effectiveDist = Math.min(effectiveDist, Math.max(0.95, proj - blockR));
          }
        }
      }
      const boxes = this.worldEnv.boxColliders;
      if (boxes && boxes.length > 0) {
        const armEndX = lookTargetX + armDirX * effectiveDist;
        const armEndY = lookTargetY + Math.sin(effectivePitch) * effectiveDist;
        const armEndZ = lookTargetZ + armDirZ * effectiveDist;
        const adx = armEndX - lookTargetX;
        const ady = armEndY - lookTargetY;
        const adz = armEndZ - lookTargetZ;
        for (let i = 0; i < boxes.length; i++) {
          const b = boxes[i];
          const baseY = groundHeightAt((b.minX + b.maxX) * 0.5, (b.minZ + b.maxZ) * 0.5);
          const minY = baseY - 0.15;
          const maxY = baseY + b.maxY;
          let tmin = 0;
          let tmax = 1;
          let hit = true;
          if (Math.abs(adx) < 1e-6) {
            if (lookTargetX < b.minX || lookTargetX > b.maxX) hit = false;
          } else {
            let t1 = (b.minX - lookTargetX) / adx;
            let t2 = (b.maxX - lookTargetX) / adx;
            if (t1 > t2) {
              const tmp = t1;
              t1 = t2;
              t2 = tmp;
            }
            tmin = Math.max(tmin, t1);
            tmax = Math.min(tmax, t2);
            if (tmin > tmax) hit = false;
          }
          if (!hit) continue;
          if (Math.abs(ady) < 1e-6) {
            if (lookTargetY < minY || lookTargetY > maxY) hit = false;
          } else {
            let t1 = (minY - lookTargetY) / ady;
            let t2 = (maxY - lookTargetY) / ady;
            if (t1 > t2) {
              const tmp = t1;
              t1 = t2;
              t2 = tmp;
            }
            tmin = Math.max(tmin, t1);
            tmax = Math.min(tmax, t2);
            if (tmin > tmax) hit = false;
          }
          if (!hit) continue;
          if (Math.abs(adz) < 1e-6) {
            if (lookTargetZ < b.minZ || lookTargetZ > b.maxZ) hit = false;
          } else {
            let t1 = (b.minZ - lookTargetZ) / adz;
            let t2 = (b.maxZ - lookTargetZ) / adz;
            if (t1 > t2) {
              const tmp = t1;
              t1 = t2;
              t2 = tmp;
            }
            tmin = Math.max(tmin, t1);
            tmax = Math.min(tmax, t2);
            if (tmin > tmax) hit = false;
          }
          if (hit && tmin > 0.08 && tmin < 1) {
            effectiveDist = Math.min(effectiveDist, Math.max(0.95, effectiveDist * tmin - 0.25));
          }
        }
      }
    }

    const horizDist = cosP * effectiveDist;
    const vertOffset = Math.sin(effectivePitch) * effectiveDist;

    let desiredCamX = lookTargetX + Math.sin(effectiveYaw) * horizDist;
    let desiredCamZ = lookTargetZ + Math.cos(effectiveYaw) * horizDist;
    const minGroundCamY = this.floorAt(desiredCamX, desiredCamZ, lookTargetY) + 0.55;
    let desiredCamY = Math.max(minGroundCamY, lookTargetY + vertOffset);
    if (this.activeZone === 'colon_interior') {
      const clamped = this.colonInterior.clampCameraSegment(
        lookTargetX,
        lookTargetY,
        lookTargetZ,
        desiredCamX,
        desiredCamY,
        desiredCamZ,
      );
      desiredCamX = clamped.x;
      desiredCamY = clamped.y;
      desiredCamZ = clamped.z;
    } else if (this.mapSettings.mapPreset !== 'custom_sandbox') {
      const clampedFF = this.worldEnv.fastFood.clampCameraSegment(
        lookTargetX,
        lookTargetY,
        lookTargetZ,
        desiredCamX,
        desiredCamY,
        desiredCamZ,
      );
      desiredCamX = clampedFF.x;
      desiredCamY = clampedFF.y;
      desiredCamZ = clampedFF.z;
    }

    const dampXZ = 1 - Math.exp(-15 * dt);
    const dampY = 1 - Math.exp(-14 * dt);
    this.camera.position.x += (desiredCamX - this.camera.position.x) * dampXZ;
    this.camera.position.y += (desiredCamY - this.camera.position.y) * dampY;
    this.camera.position.z += (desiredCamZ - this.camera.position.z) * dampXZ;

    const shake = this.shakeTrauma * this.shakeTrauma;
    const ox = (Math.random() * 2 - 1) * shake * 0.45;
    const oy = (Math.random() * 2 - 1) * shake * 0.4;

    const aimLookX = lookTargetX - Math.sin(effectiveYaw) * 16;
    const aimLookY = lookTargetY - Math.sin(effectivePitch) * 16;
    const aimLookZ = lookTargetZ - Math.cos(effectiveYaw) * 16;
    this.camera.lookAt(aimLookX + ox, aimLookY + oy, aimLookZ);

    const targetFov = aiming
      ? this.cameraSettings.aimFov
      : sprinting
        ? Math.min(85, this.cameraSettings.normalFov + 6)
        : this.cameraSettings.normalFov;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 12, dt);
      this.camera.updateProjectionMatrix();
    }

    this.sunLight.position.set(
      this.px + this.sunOffsetX,
      this.py + this.sunOffsetY,
      this.pz + this.sunOffsetZ,
    );
    this.sunLight.target.position.set(this.px, this.py, this.pz);
  }

  private emitHud() {
    let alertedCount = 0;
    let investigatingCount = 0;
    let nearestDistSq = Infinity;
    for (let i = 0; i < this.enemies.length; i++) {
      const e = this.enemies[i];
      if (e.state === 'investigate') investigatingCount++;
      else if (e.state !== 'wander') alertedCount++;
      const dx = e.x - this.px;
      const dz = e.z - this.pz;
      const dSq = dx * dx + dz * dz;
      if (dSq < nearestDistSq) nearestDistSq = dSq;
    }

    const stealthInGrass = this.isPlayerHiddenInTallGrass();
    const cautionDistSq = stealthInGrass ? 12.25 : 72.25;
    const stealthState: 'hidden' | 'caution' | 'detected' =
      alertedCount > 0
        ? 'detected'
        : investigatingCount > 0 || nearestDistSq < cautionDistSq
          ? 'caution'
          : 'hidden';
    const { normalizedNoise } = this.getPlayerNoiseMetrics();

    let backpackPickup: Pickup | undefined;
    for (let i = 0; i < this.pickups.length; i++) {
      if (this.pickups[i].kind === 'backpack') {
        backpackPickup = this.pickups[i];
        break;
      }
    }

    const distanceToColon = Math.max(
      0,
      Math.round(Math.hypot(COLON_ENTRANCE_X - this.px, COLON_ENTRANCE_Z - this.pz)),
    );
    const currentFloor: 0 | 1 | 2 =
      this.activeZone === 'colon_interior' ? this.colonInterior.getFloorIndex(this.py) : 0;

    let missionHud: MissionObjectiveHud;
    if (this.isTutorialMode) {
      const tut = this.getTutorialHudState();
      missionHud = {
        missionNumber: 1,
        missionTitle: 'Campo de Entrenamiento',
        subtitle: 'Tutorial Interactivo 3D · Av. 9 de Julio',
        phase: 'tutorial_training',
        objectiveText: tut.title,
        detailText: tut.instruction,
        killsCurrent: Math.min(tut.stepIndex, tut.totalSteps),
        killsTarget: tut.totalSteps,
        totalMissionKills: this.kills,
        totalMissionTarget: tut.totalSteps,
        waveIndex: Math.min(tut.stepIndex + 1, tut.totalSteps),
        totalWaves: tut.totalSteps,
        colonUnlocked: tut.completed,
        colonPos: this.hudColonPos,
        distanceToColon,
        radioSpeaker: this.radioSpeaker,
        radioMessage: this.radioMessage,
      };
    } else if (this.storyMission === 2) {
      if (this.missionPhase === 'clear_theater' || this.missionPhase === 'rescue_ally') {
        const floorText =
          currentFloor === 0
            ? 'PB · Salón Principal y Calderas'
            : currentFloor === 1
              ? 'Piso 1 · Palcos y Galería'
              : 'Piso 2 · Cazuela Alta';
        missionHud = {
          missionNumber: 2,
          missionTitle: 'Asegurar el Refugio',
          subtitle: 'Buenos Aires, 2050 · Interior del Teatro Colón',
          phase: this.missionPhase,
          objectiveText:
            this.missionPhase === 'rescue_ally'
              ? 'Rescatando sobreviviente en Calderas...'
              : `Zombies en el teatro: ${Math.min(this.kills, this.mission2Target)}/${this.mission2Target}`,
          detailText:
            this.missionPhase === 'rescue_ally'
              ? 'Sofía Méndez emerge de la Sala de Máquinas'
              : `${floorText} · Limpia los 3 niveles para asegurar la base`,
          killsCurrent: Math.min(this.kills, this.mission2Target),
          killsTarget: this.mission2Target,
          totalMissionKills: this.kills,
          totalMissionTarget: this.mission2Target,
          waveIndex: currentFloor + 1,
          totalWaves: 3,
          colonUnlocked: this.baseUnlocked,
          colonPos: this.hudColonPos,
          distanceToColon,
          radioSpeaker: this.radioSpeaker,
          radioMessage: this.radioMessage,
        };
      } else if (this.missionPhase === 'scavenge_9_julio') {
        missionHud = {
          missionNumber: 2,
          missionTitle: 'Recolección Exterior',
          subtitle: 'Buenos Aires, 2050 · Av. 9 de Julio',
          phase: 'scavenge_9_julio',
          objectiveText: 'Buscar provisiones en Av. 9 de Julio',
          detailText: `Químicos ${this.provisions.chemicals} · Chatarra ${this.provisions.scrap} · Pólvora ${this.provisions.powder} · Colón a ${distanceToColon}m`,
          killsCurrent: this.kills,
          killsTarget: this.kills,
          totalMissionKills: this.kills,
          totalMissionTarget: this.kills,
          waveIndex: 1,
          totalWaves: 1,
          colonUnlocked: true,
          colonPos: this.hudColonPos,
          distanceToColon,
          radioSpeaker: this.radioSpeaker,
          radioMessage: this.radioMessage,
        };
      } else {
        missionHud = {
          missionNumber: 2,
          missionTitle: 'Base Permanente · Teatro Colón',
          subtitle: 'Sala Dorada · Taller Químico de Sofía',
          phase: 'base_free_roam',
          objectiveText: 'Sala Dorada — Base Permanente',
          detailText: this.nearVehicleBay
            ? 'Pulsa [E] para abrir el Taller Mecánico de Mateo'
            : this.nearWorkbench
              ? 'Pulsa [E] para abrir el Taller Químico de Sofía'
              : this.nearExteriorExit
                ? 'Pulsa [E] para salir a Av. 9 de Julio a recolectar provisiones'
                : 'Usa la Mesa Química (Sala Dorada) o la Puerta Principal (Sur)',
          killsCurrent: this.mission2Target,
          killsTarget: this.mission2Target,
          totalMissionKills: this.kills,
          totalMissionTarget: this.mission2Target,
          waveIndex: 3,
          totalWaves: 3,
          colonUnlocked: true,
          colonPos: this.hudColonPos,
          distanceToColon,
          radioSpeaker: this.radioSpeaker,
          radioMessage: this.radioMessage,
        };
      }
    } else if (this.storyMission === 3) {
      const distFastFood = Math.max(
        0,
        Math.round(Math.hypot(FASTFOOD_ENTRANCE_X - this.px, FASTFOOD_ENTRANCE_Z - this.pz)),
      );
      const hordeLeft = this.fastFoodHordeIds.size;
      const hordeKills = Math.max(0, this.fastFoodTotalSpawned - hordeLeft);
      if (this.missionPhase === 'm3_briefing') {
        missionHud = {
          missionNumber: 3,
          missionTitle: 'Suministros y Rescate',
          subtitle: 'Misión 03 · Teatro Colón → Mc-Porteño 24H',
          phase: 'm3_briefing',
          objectiveText: 'Salir del Teatro Colón hacia el Mc-Porteño',
          detailText: this.nearExteriorExit
            ? 'Pulsa [E] en la puerta principal para iniciar la incursión'
            : 'Encargo de Chispa: ve a la puerta sur del Colón para salir al mapa',
          killsCurrent: 0,
          killsTarget: 1,
          totalMissionKills: this.kills,
          totalMissionTarget: this.fastFoodTotalSpawned,
          waveIndex: 1,
          totalWaves: 4,
          colonUnlocked: false,
          colonPos: this.hudColonPos,
          distanceToColon,
          targetPos: { x: COLON_INTERIOR_EXIT_POS.x, z: COLON_INTERIOR_EXIT_POS.z },
          targetLabel: 'Puerta Principal',
          distanceToTarget: Math.round(
            Math.hypot(COLON_INTERIOR_EXIT_POS.x - this.px, COLON_INTERIOR_EXIT_POS.z - this.pz),
          ),
          radioSpeaker: this.radioSpeaker,
          radioMessage: this.radioMessage,
        };
      } else if (this.missionPhase === 'm3_go_fastfood') {
        missionHud = {
          missionNumber: 3,
          missionTitle: 'Suministros y Rescate',
          subtitle: 'Buenos Aires, 2050 · Esquina Sudeste',
          phase: 'm3_go_fastfood',
          objectiveText: `Ir al local Mc-Porteño 24H (${distFastFood}m)`,
          detailText: `Químicos ${this.provisions.chemicals} · Chatarra ${this.provisions.scrap} · Pólvora ${this.provisions.powder}`,
          killsCurrent: hordeKills,
          killsTarget: this.fastFoodTotalSpawned,
          totalMissionKills: this.kills,
          totalMissionTarget: this.fastFoodTotalSpawned,
          waveIndex: 1,
          totalWaves: 4,
          colonUnlocked: false,
          colonPos: this.hudColonPos,
          distanceToColon,
          targetPos: { x: FASTFOOD_ENTRANCE_X, z: FASTFOOD_ENTRANCE_Z },
          targetLabel: 'Mc-Porteño 24H',
          distanceToTarget: distFastFood,
          radioSpeaker: this.radioSpeaker,
          radioMessage: this.radioMessage,
        };
      } else if (this.missionPhase === 'm3_defend_fastfood') {
        missionHud = {
          missionNumber: 3,
          missionTitle: 'Combate en Mc-Porteño',
          subtitle: 'Local de Comida Rápida · Cocina Industrial',
          phase: 'm3_defend_fastfood',
          objectiveText: `Limpiar el local y ayudar al sobreviviente (${hordeKills}/${this.fastFoodTotalSpawned})`,
          detailText: `${hordeLeft} infectado${hordeLeft === 1 ? '' : 's'} dentro del local · Salud Mateo: ${Math.ceil(this.mechanicHp)}%`,
          killsCurrent: hordeKills,
          killsTarget: this.fastFoodTotalSpawned,
          totalMissionKills: this.kills,
          totalMissionTarget: this.fastFoodTotalSpawned,
          waveIndex: 2,
          totalWaves: 4,
          colonUnlocked: false,
          colonPos: this.hudColonPos,
          distanceToColon,
          targetPos: { x: this.mechanicPos.x, z: this.mechanicPos.z },
          targetLabel: 'Mateo',
          distanceToTarget: Math.round(
            Math.hypot(this.mechanicPos.x - this.px, this.mechanicPos.z - this.pz),
          ),
          radioSpeaker: this.radioSpeaker,
          radioMessage: this.radioMessage,
        };
      } else if (this.missionPhase === 'm3_help_mechanic') {
        const distMech = Math.round(
          Math.hypot(this.mechanicPos.x - this.px, this.mechanicPos.z - this.pz),
        );
        missionHud = {
          missionNumber: 3,
          missionTitle: 'Rescatar al Sobreviviente',
          subtitle: 'Cocina del Mc-Porteño 24H',
          phase: 'm3_help_mechanic',
          objectiveText: 'Levantar estantería y liberar a Mateo',
          detailText: this.nearMechanicHelp
            ? 'Pulsa [E] para levantar la estantería caída sobre su pierna'
            : `Acércate a Mateo atrapado bajo la estantería (${distMech}m)`,
          killsCurrent: this.fastFoodTotalSpawned,
          killsTarget: this.fastFoodTotalSpawned,
          totalMissionKills: this.kills,
          totalMissionTarget: this.fastFoodTotalSpawned,
          waveIndex: 3,
          totalWaves: 4,
          colonUnlocked: false,
          colonPos: this.hudColonPos,
          distanceToColon,
          targetPos: { x: this.mechanicPos.x, z: this.mechanicPos.z },
          targetLabel: 'Mateo atrapado',
          distanceToTarget: distMech,
          radioSpeaker: this.radioSpeaker,
          radioMessage: this.radioMessage,
        };
      } else if (this.missionPhase === 'm3_escort_colon') {
        const mechToColon = Math.round(
          Math.hypot(this.mechanicPos.x - COLON_ENTRANCE_X, this.mechanicPos.z - COLON_ENTRANCE_Z),
        );
        missionHud = {
          missionNumber: 3,
          missionTitle: 'Escolta al Refugio',
          subtitle: 'Av. 9 de Julio → Teatro Colón',
          phase: 'm3_escort_colon',
          objectiveText: `Escoltar a Mateo rengo al Teatro Colón (${distanceToColon}m)`,
          detailText:
            mechToColon > 12 && Math.hypot(this.mechanicPos.x - this.px, this.mechanicPos.z - this.pz) > 14
              ? `Espera a Mateo (${Math.round(Math.hypot(this.mechanicPos.x - this.px, this.mechanicPos.z - this.pz))}m) · Salud Mateo ${Math.ceil(this.mechanicHp)}%`
              : `Cubre a Mateo hasta la escalinata del Colón · Salud ${Math.ceil(this.mechanicHp)}%`,
          killsCurrent: this.fastFoodTotalSpawned,
          killsTarget: this.fastFoodTotalSpawned,
          totalMissionKills: this.kills,
          totalMissionTarget: this.fastFoodTotalSpawned,
          waveIndex: 4,
          totalWaves: 4,
          colonUnlocked: true,
          colonPos: this.hudColonPos,
          distanceToColon,
          targetPos: this.hudColonPos,
          targetLabel: 'Teatro Colón',
          distanceToTarget: distanceToColon,
          radioSpeaker: this.radioSpeaker,
          radioMessage: this.radioMessage,
        };
      } else if (this.missionPhase === 'scavenge_9_julio') {
        missionHud = {
          missionNumber: 3,
          missionTitle: 'Exploración Motorizada',
          subtitle: 'Buenos Aires, 2050 · Av. 9 de Julio',
          phase: 'scavenge_9_julio',
          objectiveText: 'Recolectar suministros para taller y explosivos',
          detailText: `Químicos ${this.provisions.chemicals} · Chatarra ${this.provisions.scrap} · Pólvora ${this.provisions.powder} · Colón a ${distanceToColon}m`,
          killsCurrent: this.kills,
          killsTarget: this.kills,
          totalMissionKills: this.kills,
          totalMissionTarget: this.kills,
          waveIndex: 4,
          totalWaves: 4,
          colonUnlocked: true,
          colonPos: this.hudColonPos,
          distanceToColon,
          radioSpeaker: this.radioSpeaker,
          radioMessage: this.radioMessage,
        };
      } else {
        missionHud = {
          missionNumber: 3,
          missionTitle: 'Base Permanente · Taller Mecánico',
          subtitle: 'Teatro Colón · Sofía & Mateo',
          phase: 'base_free_roam',
          objectiveText: 'Taller Mecánico de Mateo Desbloqueado',
          detailText: this.nearVehicleBay
            ? 'Pulsa [E] para reparar La Porteña y activar Viaje Rápido'
            : this.nearWorkbench
              ? 'Pulsa [E] para abrir el Taller Químico de Sofía'
              : this.nearExteriorExit
                ? 'Pulsa [E] para salir a Av. 9 de Julio'
                : 'Visita la Bahía NE (Camioneta) o la Sala Dorada (Mesa Química)',
          killsCurrent: this.fastFoodTotalSpawned,
          killsTarget: this.fastFoodTotalSpawned,
          totalMissionKills: this.kills,
          totalMissionTarget: this.fastFoodTotalSpawned,
          waveIndex: 4,
          totalWaves: 4,
          colonUnlocked: true,
          colonPos: this.hudColonPos,
          distanceToColon,
          targetPos: { x: COLON_VEHICLE_BAY_POS.x, z: COLON_VEHICLE_BAY_POS.z },
          targetLabel: 'Taller Mecánico',
          distanceToTarget: Math.round(
            Math.hypot(COLON_VEHICLE_BAY_POS.x - this.px, COLON_VEHICLE_BAY_POS.z - this.pz),
          ),
          radioSpeaker: this.radioSpeaker,
          radioMessage: this.radioMessage,
        };
      }
    } else {
      const waveKills =
        this.missionPhase === 'clear_plaza_wave'
          ? Math.min(this.wave1Target, this.kills)
          : this.missionPhase === 'clear_corridor_wave'
            ? Math.min(this.wave2Target, Math.max(0, this.kills - this.wave1Target))
            : this.totalMissionTarget;
      const waveTarget =
        this.missionPhase === 'clear_plaza_wave'
          ? this.wave1Target
          : this.missionPhase === 'clear_corridor_wave'
            ? this.wave2Target
            : this.totalMissionTarget;

      missionHud = {
        missionNumber: 1,
        missionTitle: 'Refugio en el Colón',
        subtitle: 'Buenos Aires, 2050 · Av. 9 de Julio',
        phase: this.missionPhase,
        objectiveText: this.colonUnlocked
          ? 'Asegurar acceso al Teatro Colón'
          : `Eliminar zombies: ${Math.min(this.kills, this.totalMissionTarget)}/${this.totalMissionTarget}`,
        detailText: this.colonUnlocked
          ? `Llega a la escalinata del Teatro Colón (${distanceToColon}m)`
          : this.missionPhase === 'clear_plaza_wave'
            ? `Oleada 1/2 · Jaurías en Plaza de la República (${waveKills}/${waveTarget})`
            : `Oleada 2/2 · Horda en corredor norte 9 de Julio (${waveKills}/${waveTarget})`,
        killsCurrent: Math.min(this.kills, this.totalMissionTarget),
        killsTarget: this.totalMissionTarget,
        totalMissionKills: this.kills,
        totalMissionTarget: this.totalMissionTarget,
        waveIndex: this.missionPhase === 'clear_plaza_wave' ? 1 : 2,
        totalWaves: 2,
        colonUnlocked: this.colonUnlocked,
        colonPos: this.hudColonPos,
        distanceToColon,
        radioSpeaker: this.radioSpeaker,
        radioMessage: this.radioMessage,
      };
    }

    if (this.hudInventoryDirty) {
      this.hudCacheInventory = this.inventory.map((s) => (s ? { ...s } : null));
      this.hudInventoryDirty = false;
    }
    if (this.propSlots !== this.hudCachePropSlotsSrc) {
      this.hudCachePropSlotsSrc = this.propSlots;
      this.hudCachePropSlots = [...this.propSlots];
    }
    if (this.placedProps !== this.hudCachePlacedPropsSrc) {
      this.hudCachePlacedPropsSrc = this.placedProps;
      this.hudCachePlacedProps = this.placedProps.map((p) => ({ ...p }));
    }
    if (this.customZombieSlots !== this.hudCacheZombieSlotsSrc) {
      this.hudCacheZombieSlotsSrc = this.customZombieSlots;
      this.hudCacheZombieSlots = this.customZombieSlots.map((s) => ({ ...s }));
    }
    if (this.customCharacterSlots !== this.hudCacheCustomCharacterSlotsSrc) {
      this.hudCacheCustomCharacterSlotsSrc = this.customCharacterSlots;
      this.hudCacheCustomCharacterSlots = this.customCharacterSlots.map((s) => ({ ...s }));
    }
    if (this.customNpcNames !== this.hudCacheCustomNpcNamesSrc) {
      this.hudCacheCustomNpcNamesSrc = this.customNpcNames;
      this.hudCacheCustomNpcNames = { ...this.customNpcNames };
    }
    if (this.hudCharacterCatalogDirty) {
      this.hudCharacterCatalogDirty = false;
      this.hudCacheCharacterCatalog = this.buildCharacterCatalog();
    }
    if (
      this.mapSettings !== this.hudCacheMapSettingsSrc ||
      this.mapSettings.timeOfDay !== this.hudCacheMapSettings.timeOfDay
    ) {
      this.hudCacheMapSettingsSrc = this.mapSettings;
      this.hudCacheMapSettings = { ...this.mapSettings };
    }
    if (this.postProcess !== this.hudCachePostProcessSrc) {
      this.hudCachePostProcessSrc = this.postProcess;
      this.hudCachePostProcess = { ...this.postProcess };
    }
    if (this.cameraSettings !== this.hudCacheCameraSettingsSrc) {
      this.hudCacheCameraSettingsSrc = this.cameraSettings;
      this.hudCacheCameraSettings = { ...this.cameraSettings };
    }
    if (this.objectOverrideNames !== this.hudCacheOverridesSrc) {
      this.hudCacheOverridesSrc = this.objectOverrideNames;
      this.hudCacheOverrides = { ...this.objectOverrideNames };
    }
    if (this.customEquipmentNames !== this.hudCacheEquipmentNamesSrc) {
      this.hudCacheEquipmentNamesSrc = this.customEquipmentNames;
      this.hudCacheEquipmentNames = { ...this.customEquipmentNames };
    }
    if (this.attachmentTransforms !== this.hudCacheAttachmentTransformsSrc) {
      this.hudCacheAttachmentTransformsSrc = this.attachmentTransforms;
      const copiedEntities: AttachmentTransformsState['entities'] = {};
      const srcEntities = this.attachmentTransforms.entities ?? {};
      for (const k of Object.keys(srcEntities)) {
        copiedEntities[k] = { ...srcEntities[k] };
      }
      this.hudCacheAttachmentTransforms = {
        player: { ...this.attachmentTransforms.player },
        zombie: { ...this.attachmentTransforms.zombie },
        entities: copiedEntities,
      };
    }

    const cf = this.getCampfirePos();
    const cfDx = this.px - cf.x;
    const cfDz = this.pz - cf.z;

    this.onHudUpdate({
      gameState: this.gameState,
      hp: Math.ceil(this.hp),
      maxHp: this.maxHp,
      helmetArmor: Math.ceil(this.helmetArmor),
      helmetMaxArmor: this.helmetMaxArmor,
      vestArmor: Math.ceil(this.vestArmor),
      vestMaxArmor: this.vestMaxArmor,
      stamina: Math.round(this.stamina),
      maxStamina: this.maxStamina,
      weapon: this.weapon,
      unlockedWeapons: { ...this.unlockedWeapons },
      stance: this.stance,
      isAiming: this.isAiming,
      isFiring: this.recoilTimer > 0,
      isMoving: Math.hypot(this.pvx, this.pvz) > 0.45,
      isReloading: this.reloadTimer > 0,
      crosshairSpread: Number(this.crosshairSpread.toFixed(3)),
      bowDrawProgress: Number(this.bowDrawProgress.toFixed(3)),
      stealthActive: this.isCrouching,
      stealthInGrass,
      stealthState,
      stealthNoiseLevel: normalizedNoise,
      arrows: this.arrows,
      pistolAmmo: this.pistolAmmo,
      pistolMaxAmmo: this.pistolMaxAmmo,
      pistolReserveAmmo: this.pistolReserveAmmo,
      rifleAmmo: this.rifleAmmo,
      rifleMaxAmmo: this.rifleMaxAmmo,
      rifleReserveAmmo: this.rifleReserveAmmo,
      bandages: this.bandages,
      food: this.food,
      flareCharge: Math.floor(this.flareCharge),
      wood: this.wood,
      hasBackpack: this.hasBackpack,
      inventory: this.hudCacheInventory,
      selectedInventorySlot: this.selectedInventorySlot,
      molotovCount: this.getInventoryCount('molotov'),
      nailBombCount: this.getInventoryCount('nail_bomb'),
      distractionCounts: { ...this.distractionCounts },
      ratCount: this.ratCount,
      chapitasCount: this.chapitasCount,
      nearTrashSpot: Boolean(this.nearTrashSpot),
      activeDecoyRats: this.decoyRats.length,
      totalDistractions: this.getTotalDistractions(),
      activeDistractionKind: this.activeDistractionKind,
      molotovLit: this.molotovLit,
      nailBombLit: this.nailBombLit,
      equippedThrowable: this.equippedThrowable,
      aimingThrowable: this.aimingThrowable,
      inventoryNotice: this.inventoryNotice,
      backpackPos: backpackPickup ? { x: backpackPickup.x, z: backpackPickup.z } : null,
      score: this.score,
      bestScore: this.bestScore,
      combo: this.combo,
      survivalTime: Math.floor(this.survivalTime),
      enemiesRemaining: this.enemies.length,
      alertedZombies: alertedCount,
      kills: this.kills,
      nearCampfire:
        this.activeZone === 'exterior_9_julio' &&
        cfDx * cfDx + cfDz * cfDz <= CAMPFIRE_SAFE_RADIUS * CAMPFIRE_SAFE_RADIUS,
      activeZone: this.activeZone,
      currentFloor,
      allyRescued: this.allyRescued,
      baseUnlocked: this.baseUnlocked,
      nearWorkbench: this.nearWorkbench,
      nearExteriorExit: this.nearExteriorExit,
      nearColonEntrance: this.nearColonEntrance,
      provisions: { ...this.provisions },
      allyPos:
        this.allyRescued && this.activeZone === 'colon_interior'
          ? {
              x: this.colonInterior.allyRig.root.position.x,
              z: this.colonInterior.allyRig.root.position.z,
            }
          : null,
      mission2Unlocked: this.mission2Unlocked,
      mission3Unlocked: this.mission3Unlocked,
      mechanicRescued: this.mechanicRescued,
      mechanicPos:
        this.activeZone === 'exterior_9_julio' && this.exteriorMechanicRig?.root.visible
          ? { x: this.mechanicPos.x, z: this.mechanicPos.z }
          : this.mechanicRescued && this.activeZone === 'colon_interior'
            ? { x: COLON_MECHANIC_BASE_POS.x, z: COLON_MECHANIC_BASE_POS.z }
            : null,
      mechanicHp: Math.ceil(this.mechanicHp),
      mechanicMaxHp: this.mechanicMaxHp,
      mechanicLimping: this.mechanicLimping,
      nearMechanicHelp: this.nearMechanicHelp,
      nearVehicleBay: this.nearVehicleBay,
      vehicleBayUnlocked: this.vehicleBayUnlocked,
      vehicleState: { ...this.vehicleState },
      tutorial: this.getTutorialHudState(),
      pointerLocked: this.pointerLocked,
      playerPos: { x: this.px, z: this.pz },
      playerYaw: this.pyaw,
      camYaw: this.camYaw,
      radarEntities: this.enemies.map((e) => ({
        id: e.id,
        x: e.x,
        y: e.y,
        z: e.z,
        kind: e.kind,
        role: e.enemyRole,
      })),
      difficulty: this.difficulty,
      muted: this.audio.muted,
      hurtFlash: THREE.MathUtils.clamp(this.hurtFlashTimer / 0.55, 0, 1),
      damageSeq: this.damageSeq,
      lastDamage: this.lastDamage,
      timeOfDay: this.mapSettings.timeOfDay,
      isDaytime: this.isCurrentlyDaytime(),
      clockLabel: this.formatClockFromTimeOfDay(this.mapSettings.timeOfDay),
      fogLevel: this.currentFogLevel,
      editorMode: this.editorMode,
      activePlacementSlotId: this.activePlacementSlotId,
      selectedPropId: this.selectedPropId,
      propSlots: this.hudCachePropSlots,
      placedProps: this.hudCachePlacedProps,
      mapSettings: this.hudCacheMapSettings,
      postProcess: this.hudCachePostProcess,
      cameraSettings: this.hudCacheCameraSettings,
      customModelName: this.customModelName,
      customZombieName: this.getCustomZombieSummary(),
      customZombieSlots: this.hudCacheZombieSlots,
      customNpcNames: this.hudCacheCustomNpcNames,
      customCharacterSlots: this.hudCacheCustomCharacterSlots,
      characterCatalog: this.hudCacheCharacterCatalog,
      customRifleName: this.customRifleName,
      customPistolName: this.customPistolName,
      customEquipmentNames: this.hudCacheEquipmentNames,
      objectOverrides: this.hudCacheOverrides,
      attachmentTransforms: this.hudCacheAttachmentTransforms,
      remoteManifest: {
        ...this.remoteManifestInfo,
        failedAssets: [...(this.remoteManifestInfo.failedAssets ?? [])],
      },
      modelError: this.modelError,
      introCutsceneProgress:
        this.gameState === 'ALLY_RESCUE_CUTSCENE'
          ? THREE.MathUtils.clamp(this.allyCutsceneTimer / this.allyCutsceneDuration, 0, 1)
          : THREE.MathUtils.clamp(this.introCutsceneTimer / this.introCutsceneDuration, 0, 1),
      introCutsceneCaption:
        this.gameState === 'ALLY_RESCUE_CUTSCENE'
          ? this.getAllyCutsceneCaption(this.allyCutsceneTimer)
          : this.getIntroCutsceneCaption(this.introCutsceneTimer),
      mission: missionHud,
    });
  }

  public dispose() {
    this.disposed = true;
    this.renderSuspended = true;
    if (this.attachmentSaveTimer !== null) {
      clearTimeout(this.attachmentSaveTimer);
      this.attachmentSaveTimer = null;
      guardarAttachmentTransformsLocal(this.attachmentTransforms);
    }
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.exitPointerLockSafe();

    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleBlur);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('pointercancel', this.handlePointerUp);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);

    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointermove', this.handlePointerMove);
    canvas.removeEventListener('pointerdown', this.handlePointerDown);
    canvas.removeEventListener('wheel', this.handleWheel);
    canvas.removeEventListener('contextmenu', this.handleContextMenu);
    canvas.removeEventListener('webglcontextlost', this.handleContextLost);

    this.clearDynamicEntities();
    this.playerRig.dispose();
    this.customZombieTemplates.forEach((t) => t.dispose());
    this.customZombieTemplates.clear();
    this.customNpcTemplates.forEach((t) => t.dispose());
    this.customNpcTemplates.clear();
    this.customCharacterTemplates.forEach((t) => t.dispose());
    this.customCharacterTemplates.clear();
    this.customRifleTemplate?.dispose();
    this.customPistolTemplate?.dispose();
    this.customEquipmentTemplates.forEach((t) => t.dispose());
    this.customEquipmentTemplates.clear();
    this.objectOverrideTemplates.forEach((t) => t.dispose());
    this.objectOverrideTemplates.clear();
    this.propTemplates.forEach((t) => t.dispose());
    this.propTemplates.clear();
    this.placedPropMeshes.forEach((m) => this.scene.remove(m));
    this.placedPropMeshes.clear();

    this.campfireVisuals.dispose();
    this.worldEnv.dispose();
    this.windDebris.dispose();
    this.colonInterior.dispose();
    this.exteriorMechanicRig.dispose();
    this.groundTex.dispose();
    this.simpleGroundTex.dispose();
    this.groundBumpTex.dispose();
    this.barkTex.dispose();
    this.stoneTex.dispose();
    this.skyTex.dispose();
    this.contactShadowTex.dispose();
    this.customGroundTex?.dispose();
    this.customStoneTex?.dispose();
    this.customBarkTex?.dispose();

    this.selectionRing.geometry.dispose();
    (this.selectionRing.material as THREE.Material).dispose();
    this.playerShadow.geometry.dispose();
    (this.playerShadow.material as THREE.Material).dispose();
    this.aimReticle.geometry.dispose();
    (this.aimReticle.material as THREE.Material).dispose();
    this.flareWaveMesh.geometry.dispose();
    (this.flareWaveMesh.material as THREE.Material).dispose();
    this.muzzleFlashDisposables.forEach((d) => d.dispose());
    this.muzzleFlashDisposables = [];
    this.throwArcLine.geometry.dispose();
    (this.throwArcLine.material as THREE.Material).dispose();
    this.throwLandingRing.geometry.dispose();
    (this.throwLandingRing.material as THREE.Material).dispose();
    this.disposeHeldMolotov();
    this.disposeHeldNailBomb();
    this.disposeHeldGrenade();
    this.disposeHeldBottle();
    this.disposeHeldCan();
    this.disposeHeldBrick();
    this.disposeHeldDecoyRat();
    this.noiseRipples.forEach((nr) => {
      this.scene.remove(nr.mesh);
      nr.mat.dispose();
    });
    this.noiseRipples = [];
    this.noiseRippleGeo.dispose();
    this.particleInst.geometry.dispose();
    (this.particleInst.material as THREE.Material).dispose();
    this.smokeInst.geometry.dispose();
    (this.smokeInst.material as THREE.Material).dispose();
    this.bloodInst.geometry.dispose();
    (this.bloodInst.material as THREE.Material).dispose();
    this.bloodDecals.forEach((d) => {
      this.scene.remove(d.mesh);
      d.geo.dispose();
      d.mat.dispose();
    });
    this.bloodDecals = [];
    this.footprintDecals.forEach((fp) => {
      this.scene.remove(fp.mesh);
      fp.mat.dispose();
    });
    this.footprintDecals = [];
    this.sharedFootprintGeo?.dispose();
    this.looseLightProps.forEach((p) => this.scene.remove(p.group));
    this.looseLightProps = [];
    this.looseLightPropResources.forEach((r) => r.dispose());
    this.looseLightPropResources = [];

    this.playerBoltGeo.dispose();
    this.playerBoltMat.dispose();
    this.playerBoltTrailGeo.dispose();
    this.playerBoltTrailMat.dispose();
    this.emberGeo.dispose();
    this.emberMat.dispose();
    this.woodGeo.dispose();
    this.woodMat.dispose();
    this.nailGeo.dispose();
    this.nailMat.dispose();
    this.playerBoltPool = [];
    this.playerArrowPool = [];
    this.enemyBoltPool = [];
    this.nailMeshPool = [];

    this.scene.environment?.dispose();
    this.scene.environment = null;
    this.composer?.dispose();
    this.composerTarget?.dispose();
    this.composerTarget = null;
    this.renderer.dispose();
    if (canvas.parentElement === this.container) {
      this.container.removeChild(canvas);
    }

    this.audio.resetZombieBreathing();
    this.audio.dispose();

    activeEngineInstances = Math.max(0, activeEngineInstances - 1);
    if (activeEngineInstances === 0) {
      disposeAllSharedModelPools();
      disposeSharedTextureCaches();
    }
  }
}
