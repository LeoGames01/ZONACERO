import * as THREE from 'three';
import type {
  AttachmentTransform,
  CharacterAnimationTag,
  EnemyKind,
  EnemyRole,
  NativeAnimationDictionaryInfo,
  PlayerAttachableId,
  StandardAnimationAction,
} from './types';

export type {
  CharacterAnimationTag,
  NativeAnimationDictionaryInfo,
  StandardAnimationAction,
};

export type CanonicalBoneId =
  | 'hips'
  | 'spine'
  | 'chest'
  | 'neck'
  | 'head'
  | 'arm_l'
  | 'forearm_l'
  | 'hand_l'
  | 'arm_r'
  | 'forearm_r'
  | 'hand_r'
  | 'thigh_l'
  | 'shin_l'
  | 'foot_l'
  | 'thigh_r'
  | 'shin_r'
  | 'foot_r';

export type UniversalSocketId =
  | 'head'
  | 'chest'
  | 'back'
  | 'hips'
  | 'hand_r'
  | 'hand_l'
  | 'forearm_r'
  | 'forearm_l';

export type CharacterClipRole = 'player' | 'zombie' | 'npc';

export const STANDARD_ANIMATION_ACTIONS: readonly StandardAnimationAction[] = [
  'idle',
  'walk',
  'run',
  'attack',
  'hit',
  'death',
] as const;

export function isZombieAnimationTag(tag: CharacterAnimationTag): boolean {
  return (
    tag === 'zombie' ||
    tag === 'zombie_walker' ||
    tag === 'zombie_runner' ||
    tag === 'zombie_crawler' ||
    tag === 'zombie_brute' ||
    tag === 'zombie_spitter' ||
    tag === 'zombie_police' ||
    tag === 'zombie_gendarme'
  );
}

export function resolveTagClipRole(tag: CharacterAnimationTag): CharacterClipRole {
  if (tag === 'player') return 'player';
  if (isZombieAnimationTag(tag)) return 'zombie';
  return 'npc';
}

export function resolveZombieAnimationTag(
  kind: EnemyKind,
  role: EnemyRole,
  isCrawler = false,
): CharacterAnimationTag {
  if (isCrawler) return 'zombie_crawler';
  if (role === 'gendarme_heavy' || kind === 'brute') return 'zombie_brute';
  if (role === 'gendarme') return 'zombie_gendarme';
  if (role === 'police') return 'zombie_police';
  if (kind === 'runner') return 'zombie_runner';
  if (kind === 'spitter') return 'zombie_spitter';
  if (kind === 'biter' || kind === 'stalker') return 'zombie_walker';
  return 'zombie';
}

export interface BoneRest {
  node: THREE.Object3D;
  restRot: THREE.Euler;
  restPos: THREE.Vector3;
  restQuat: THREE.Quaternion;
  charToParentLocalQ: THREE.Quaternion;
  charToParentLocalInvQ: THREE.Quaternion;
}

export interface FingerCurlBone {
  node: THREE.Object3D;
  restQuat: THREE.Quaternion;
  localCurlAxis: THREE.Vector3;
  weight: number;
  isThumb: boolean;
}

export interface HumanoidBoneMap {
  hips: BoneRest | null;
  spine: BoneRest | null;
  chest?: BoneRest | null;
  neck: BoneRest | null;
  head: BoneRest | null;
  leftUpLeg: BoneRest | null;
  leftLeg: BoneRest | null;
  leftFoot: BoneRest | null;
  rightUpLeg: BoneRest | null;
  rightLeg: BoneRest | null;
  rightFoot: BoneRest | null;
  leftArm: BoneRest | null;
  leftForeArm: BoneRest | null;
  leftHandRest: BoneRest | null;
  rightArm: BoneRest | null;
  rightForeArm: BoneRest | null;
  rightHandRest: BoneRest | null;
  rightHand: THREE.Object3D | null;
  leftHand: THREE.Object3D | null;
  armDropAngle: number;
  rightGripLocalQ?: THREE.Quaternion;
  leftGripLocalQ?: THREE.Quaternion;
  rightPalmOffset?: THREE.Vector3;
  leftPalmOffset?: THREE.Vector3;
  rightArmBendLocal?: THREE.Vector3 | null;
  leftArmBendLocal?: THREE.Vector3 | null;
  rightForeArmPalmLocal?: THREE.Vector3 | null;
  leftForeArmPalmLocal?: THREE.Vector3 | null;
  rightFingers?: FingerCurlBone[];
  leftFingers?: FingerCurlBone[];
  charForward?: THREE.Vector3;
  charLeft?: THREE.Vector3;
  charUp?: THREE.Vector3;
}

export interface UniversalBoneSpec {
  id: CanonicalBoneId;
  patterns: RegExp[];
  exclude?: RegExp;
}

export const UNIVERSAL_BONE_SPECS: Record<CanonicalBoneId, UniversalBoneSpec> = {
  hips: {
    id: 'hips',
    patterns: [/^hips$/i, /hips/i, /pelvis/i, /cadera/i, /root_bone/i],
  },
  spine: {
    id: 'spine',
    patterns: [
      /^spine$/i,
      /spine_?0?1/i,
      /spine1/i,
      /spine[._-]?lower/i,
      /lumbar/i,
      /columna/i,
      /torso/i,
      /spine/i,
      /chest/i,
      /pecho/i,
    ],
    exclude: /upper_?chest|spine_?0?[23]|spine[23]/i,
  },
  chest: {
    id: 'chest',
    patterns: [
      /^chest$/i,
      /upper_?chest/i,
      /upperchest/i,
      /spine_?0?3/i,
      /spine3/i,
      /spine_?0?2/i,
      /spine2/i,
      /chest/i,
      /pecho/i,
    ],
  },
  neck: {
    id: 'neck',
    patterns: [/^neck$/i, /neck/i, /cuello/i],
  },
  head: {
    id: 'head',
    patterns: [/^head$/i, /head/i, /cabeza/i, /craneo/i],
    exclude: /headtop|head_end|head_socket/i,
  },
  arm_l: {
    id: 'arm_l',
    patterns: [
      /^arm_l$/i,
      /leftarm/i,
      /upperarm[._-]?l\b/i,
      /upper_?arm[._-]?l\b/i,
      /shoulder[._-]?l\b/i,
      /arm[._-]?l\b/i,
      /l[._-]?upperarm/i,
      /left[._-]?upperarm/i,
      /brazo[._-]?izq/i,
    ],
    exclude: /forearm|lowerarm|hand|wrist|clavicle/i,
  },
  arm_r: {
    id: 'arm_r',
    patterns: [
      /^arm_r$/i,
      /rightarm/i,
      /upperarm[._-]?r\b/i,
      /upper_?arm[._-]?r\b/i,
      /shoulder[._-]?r\b/i,
      /arm[._-]?r\b/i,
      /r[._-]?upperarm/i,
      /right[._-]?upperarm/i,
      /brazo[._-]?der/i,
    ],
    exclude: /forearm|lowerarm|hand|wrist|clavicle/i,
  },
  forearm_l: {
    id: 'forearm_l',
    patterns: [
      /^forearm_l$/i,
      /leftforearm/i,
      /forearm[._-]?l\b/i,
      /lowerarm[._-]?l\b/i,
      /lower_?arm[._-]?l\b/i,
      /elbow[._-]?l\b/i,
      /l[._-]?forearm/i,
      /antebrazo[._-]?izq/i,
    ],
  },
  forearm_r: {
    id: 'forearm_r',
    patterns: [
      /^forearm_r$/i,
      /rightforearm/i,
      /forearm[._-]?r\b/i,
      /lowerarm[._-]?r\b/i,
      /lower_?arm[._-]?r\b/i,
      /elbow[._-]?r\b/i,
      /r[._-]?forearm/i,
      /antebrazo[._-]?der/i,
    ],
  },
  hand_l: {
    id: 'hand_l',
    patterns: [
      /^hand_l$/i,
      /lefthand/i,
      /hand[._-]?l\b/i,
      /l[._-]?hand/i,
      /wrist[._-]?l\b/i,
      /mano[._-]?izq/i,
    ],
    exclude: /thumb|index|middle|ring|pinky|finger|pulgar|indice/i,
  },
  hand_r: {
    id: 'hand_r',
    patterns: [
      /^hand_r$/i,
      /righthand/i,
      /hand[._-]?r\b/i,
      /r[._-]?hand/i,
      /wrist[._-]?r\b/i,
      /mano[._-]?der/i,
    ],
    exclude: /thumb|index|middle|ring|pinky|finger|pulgar|indice/i,
  },
  thigh_l: {
    id: 'thigh_l',
    patterns: [
      /^thigh_l$/i,
      /leftupleg/i,
      /thigh[._-]?l\b/i,
      /upperleg[._-]?l\b/i,
      /upleg.*l\b/i,
      /left.*thigh/i,
      /l[._-]?thigh/i,
      /muslo[._-]?izq/i,
    ],
  },
  thigh_r: {
    id: 'thigh_r',
    patterns: [
      /^thigh_r$/i,
      /rightupleg/i,
      /thigh[._-]?r\b/i,
      /upperleg[._-]?r\b/i,
      /upleg.*r\b/i,
      /right.*thigh/i,
      /r[._-]?thigh/i,
      /muslo[._-]?der/i,
    ],
  },
  shin_l: {
    id: 'shin_l',
    patterns: [
      /^shin_l$/i,
      /leftleg/i,
      /calf[._-]?l\b/i,
      /shin[._-]?l\b/i,
      /lowerleg[._-]?l\b/i,
      /knee[._-]?l\b/i,
      /l[._-]?calf/i,
      /pierna[._-]?izq/i,
    ],
    exclude: /upleg|thigh/i,
  },
  shin_r: {
    id: 'shin_r',
    patterns: [
      /^shin_r$/i,
      /rightleg/i,
      /calf[._-]?r\b/i,
      /shin[._-]?r\b/i,
      /lowerleg[._-]?r\b/i,
      /knee[._-]?r\b/i,
      /r[._-]?calf/i,
      /pierna[._-]?der/i,
    ],
    exclude: /upleg|thigh/i,
  },
  foot_l: {
    id: 'foot_l',
    patterns: [
      /^foot_l$/i,
      /leftfoot/i,
      /foot[._-]?l\b/i,
      /ankle[._-]?l\b/i,
      /l[._-]?foot/i,
      /left_foot/i,
      /pie[._-]?izq/i,
    ],
    exclude: /toe|ball|end/i,
  },
  foot_r: {
    id: 'foot_r',
    patterns: [
      /^foot_r$/i,
      /rightfoot/i,
      /foot[._-]?r\b/i,
      /ankle[._-]?r\b/i,
      /r[._-]?foot/i,
      /right_foot/i,
      /pie[._-]?der/i,
    ],
    exclude: /toe|ball|end/i,
  },
};

function isIgnoredSocketSubtree(obj: THREE.Object3D): boolean {
  let cur: THREE.Object3D | null = obj;
  while (cur) {
    if (cur.userData?.__isAttachmentSocket || cur.name.startsWith('socket_')) {
      return true;
    }
    cur = cur.parent;
  }
  return false;
}

function collectCandidateJoints(root: THREE.Object3D): {
  bones: THREE.Object3D[];
  namedJoints: THREE.Object3D[];
} {
  const bones: THREE.Object3D[] = [];
  const namedJoints: THREE.Object3D[] = [];
  root.traverse((obj) => {
    if (isIgnoredSocketSubtree(obj)) return;
    if ((obj as THREE.Bone).isBone || obj.type === 'Bone') {
      bones.push(obj);
    } else if (obj.name && obj !== root) {
      namedJoints.push(obj);
    }
  });
  return { bones, namedJoints };
}

function matchPatternsInList(
  list: THREE.Object3D[],
  patterns: RegExp[],
  exclude?: RegExp,
): THREE.Object3D | null {
  for (let i = 0; i < patterns.length; i++) {
    const pat = patterns[i];
    const hit = list.find((n) => pat.test(n.name) && (!exclude || !exclude.test(n.name)));
    if (hit) return hit;
  }
  return null;
}

/**
 * Automatic universal bone/joint finder:
 * Resolves canonical names ('head', 'spine', 'hand_r', ...) across GLB armatures
 * (Mixamo, Meshy, ReadyPlayerMe, UE, Unity, Blender) and named procedural rigs.
 */
export function findNodeByUniversalName(
  root: THREE.Object3D,
  targetName: CanonicalBoneId | string,
): THREE.Object3D | null {
  const { bones, namedJoints } = collectCandidateJoints(root);
  const canonicalSpec = UNIVERSAL_BONE_SPECS[targetName as CanonicalBoneId];

  if (canonicalSpec) {
    const exactBone = bones.find((b) => b.name === targetName);
    if (exactBone) return exactBone;
    const boneHit = matchPatternsInList(bones, canonicalSpec.patterns, canonicalSpec.exclude);
    if (boneHit) return boneHit;

    const exactJoint = namedJoints.find((j) => j.name === targetName);
    if (exactJoint) return exactJoint;
    return matchPatternsInList(namedJoints, canonicalSpec.patterns, canonicalSpec.exclude);
  }

  const lower = targetName.toLowerCase();
  return (
    bones.find((b) => b.name.toLowerCase() === lower) ??
    namedJoints.find((j) => j.name.toLowerCase() === lower) ??
    bones.find((b) => b.name.toLowerCase().includes(lower)) ??
    namedJoints.find((j) => j.name.toLowerCase().includes(lower)) ??
    null
  );
}

/**
 * Stamps standardized canonical names onto procedural rig joints so any engine/editor
 * system can query bones consistently via findNodeByUniversalName(root, 'hand_r').
 */
export function tagCanonicalBoneNames(bones: HumanoidBoneMap): void {
  const setCanonicalName = (node: THREE.Object3D | null | undefined, canonical: CanonicalBoneId) => {
    if (!node) return;
    if (!node.name) {
      node.name = canonical;
    }
    node.userData.__canonicalBoneId = canonical;
  };
  setCanonicalName(bones.hips?.node, 'hips');
  setCanonicalName(bones.spine?.node, 'spine');
  setCanonicalName(bones.chest?.node, 'chest');
  setCanonicalName(bones.neck?.node, 'neck');
  setCanonicalName(bones.head?.node, 'head');
  setCanonicalName(bones.leftUpLeg?.node, 'thigh_l');
  setCanonicalName(bones.leftLeg?.node, 'shin_l');
  setCanonicalName(bones.leftFoot?.node, 'foot_l');
  setCanonicalName(bones.rightUpLeg?.node, 'thigh_r');
  setCanonicalName(bones.rightLeg?.node, 'shin_r');
  setCanonicalName(bones.rightFoot?.node, 'foot_r');
  setCanonicalName(bones.leftArm?.node, 'arm_l');
  setCanonicalName(bones.leftForeArm?.node, 'forearm_l');
  setCanonicalName(bones.leftHand ?? bones.leftHandRest?.node, 'hand_l');
  setCanonicalName(bones.rightArm?.node, 'arm_r');
  setCanonicalName(bones.rightForeArm?.node, 'forearm_r');
  setCanonicalName(bones.rightHand ?? bones.rightHandRest?.node, 'hand_r');
}

const _restParentWorldQ = new THREE.Quaternion();
const _restIdentityQ = new THREE.Quaternion();
const _dampEuler = new THREE.Euler();
const _dampDeltaCharQ = new THREE.Quaternion();
const _dampTargetQ = new THREE.Quaternion();

export function captureBoneRest(
  node: THREE.Object3D | null,
  charBasisQ?: THREE.Quaternion,
): BoneRest | null {
  if (!node) return null;
  node.updateMatrixWorld(true);
  const restQuat = node.quaternion.clone();
  if (node.parent) {
    node.parent.getWorldQuaternion(_restParentWorldQ);
  } else {
    _restParentWorldQ.identity();
  }
  const basis = charBasisQ ?? _restIdentityQ;
  const charToParentLocalQ = _restParentWorldQ.clone().invert().multiply(basis).normalize();
  const charToParentLocalInvQ = charToParentLocalQ.clone().invert();
  return {
    node,
    restRot: node.rotation.clone(),
    restPos: node.position.clone(),
    restQuat,
    charToParentLocalQ,
    charToParentLocalInvQ,
  };
}

/**
 * Smoothly damps a bone toward a character-space Euler offset (ox around charLeft,
 * oy around charUp, oz around charForward) on top of its rest quaternion.
 * Invariant to arbitrary .glb bind-pose bone orientations (Mixamo, Meshy, Blender, RPM).
 */
export function dampBoneRotCharSpace(
  bone: BoneRest | null | undefined,
  ox: number,
  oy: number,
  oz: number,
  lambda: number,
  dt: number,
): void {
  if (!bone) return;
  _dampEuler.set(ox, oy, oz, 'XYZ');
  _dampDeltaCharQ.setFromEuler(_dampEuler);
  _dampTargetQ
    .copy(bone.charToParentLocalQ)
    .multiply(_dampDeltaCharQ)
    .multiply(bone.charToParentLocalInvQ)
    .multiply(bone.restQuat);
  if (lambda >= 400) {
    bone.node.quaternion.copy(_dampTargetQ);
  } else {
    bone.node.quaternion.slerp(_dampTargetQ, 1 - Math.exp(-lambda * dt));
  }
}

function collectHandDescendantBones(handNode: THREE.Object3D): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  handNode.traverse((obj) => {
    if (obj === handNode || isIgnoredSocketSubtree(obj)) return;
    if ((obj as THREE.Bone).isBone || obj.type === 'Bone') {
      out.push(obj);
    }
  });
  return out;
}

function getBoneDepthFrom(ancestor: THREE.Object3D, node: THREE.Object3D): number {
  let depth = 0;
  let cur: THREE.Object3D | null = node;
  while (cur && cur !== ancestor && depth < 12) {
    cur = cur.parent;
    depth++;
  }
  return depth;
}

export function calibrateSingleHand(
  handNode: THREE.Object3D,
  foreArmNode: THREE.Object3D | null,
  side: 'right' | 'left',
  charForward: THREE.Vector3,
  charLeft: THREE.Vector3,
  charUp: THREE.Vector3,
): {
  gripLocalQ: THREE.Quaternion;
  palmOffset: THREE.Vector3;
  foreArmPalmLocal: THREE.Vector3 | null;
  fingers: FingerCurlBone[];
} {
  handNode.updateMatrixWorld(true);
  const handPos = new THREE.Vector3();
  const handWorldQ = new THREE.Quaternion();
  handNode.getWorldPosition(handPos);
  handNode.getWorldQuaternion(handWorldQ);
  const invHandQ = handWorldQ.clone().invert();

  const handScale = new THREE.Vector3();
  handNode.getWorldScale(handScale);
  const invScale = 1 / Math.max(0.01, handScale.x);

  const descendants = collectHandDescendantBones(handNode);
  const findChildMatch = (pat: RegExp) => descendants.find((b) => pat.test(b.name)) ?? null;

  const middle1 = findChildMatch(/(?:middle|medio|finger2|handmiddle).*?(?:1|prox|01)?/i);
  const index1 = findChildMatch(/(?:index|indice|finger1|handindex).*?(?:1|prox|01)?/i);
  const ring1 = findChildMatch(/(?:ring|anular|finger3|handring).*?(?:1|prox|01)?/i);
  const pinky1 = findChildMatch(/(?:pinky|little|menique|finger4|handpinky).*?(?:1|prox|01)?/i);
  const thumb1 = findChildMatch(/(?:thumb|pulgar).*?(?:1|prox|01)?/i);
  const nonThumbChild =
    descendants.find((b) => b.parent === handNode && !/thumb|pulgar/i.test(b.name)) ??
    handNode.children.find((c) => !isIgnoredSocketSubtree(c) && !/thumb|pulgar/i.test(c.name)) ??
    handNode.children.find((c) => !isIgnoredSocketSubtree(c)) ??
    null;

  const fingerRef = middle1 ?? index1 ?? ring1 ?? nonThumbChild;
  const fingerWorld = new THREE.Vector3();
  if (fingerRef) {
    const p = new THREE.Vector3();
    fingerRef.getWorldPosition(p);
    fingerWorld.subVectors(p, handPos);
  }
  if (fingerWorld.lengthSq() < 1e-5 && foreArmNode) {
    const pFore = new THREE.Vector3();
    foreArmNode.getWorldPosition(pFore);
    fingerWorld.subVectors(handPos, pFore);
  }
  if (fingerWorld.lengthSq() < 1e-5) {
    fingerWorld.set(side === 'right' ? -1 : 1, 0, 0);
  }
  fingerWorld.normalize();

  // Continuous anatomical inward/downward palm reference across any arm elevation angle (I-pose, A-pose, T-pose):
  // In standing rest pose facing +charForward, palm normal = charForward x fingerWorld (right) or fingerWorld x charForward (left).
  const expectedDownPalm =
    side === 'right'
      ? new THREE.Vector3().crossVectors(charForward, fingerWorld)
      : new THREE.Vector3().crossVectors(fingerWorld, charForward);
  if (expectedDownPalm.lengthSq() < 1e-4) {
    expectedDownPalm.copy(charLeft).multiplyScalar(side === 'right' ? 1 : -1);
  } else {
    expectedDownPalm.normalize();
  }

  let palmWorld = expectedDownPalm.clone();
  const knuckleA = index1 ?? middle1;
  const knuckleB = pinky1 ?? ring1;
  if (knuckleA && knuckleB && knuckleA !== knuckleB) {
    const pA = new THREE.Vector3();
    const pB = new THREE.Vector3();
    knuckleA.getWorldPosition(pA);
    knuckleB.getWorldPosition(pB);
    const across = pB.sub(pA);
    if (across.lengthSq() > 1e-6) {
      across.normalize();
      const cand = new THREE.Vector3().crossVectors(fingerWorld, across);
      if (cand.lengthSq() > 1e-4) {
        cand.normalize();
        if (cand.dot(expectedDownPalm) < 0) cand.negate();
        palmWorld.copy(cand);
      }
    }
  }

  palmWorld.addScaledVector(fingerWorld, -palmWorld.dot(fingerWorld));
  if (palmWorld.lengthSq() < 1e-4) {
    palmWorld.copy(expectedDownPalm).addScaledVector(fingerWorld, -expectedDownPalm.dot(fingerWorld));
  }
  if (palmWorld.lengthSq() < 1e-4) {
    palmWorld.set(0, -1, 0);
  }
  palmWorld.normalize();

  let thumbWorld =
    side === 'right'
      ? new THREE.Vector3().crossVectors(fingerWorld, palmWorld).normalize()
      : new THREE.Vector3().crossVectors(palmWorld, fingerWorld).normalize();

  if (thumb1) {
    const pT = new THREE.Vector3();
    thumb1.getWorldPosition(pT);
    const thumbVec = pT.sub(handPos);
    thumbVec.addScaledVector(fingerWorld, -thumbVec.dot(fingerWorld));
    if (
      thumbVec.lengthSq() > 1e-5 &&
      thumbVec.dot(thumbWorld) < -0.35 &&
      palmWorld.dot(expectedDownPalm) < 0.25
    ) {
      palmWorld.negate();
      thumbWorld.negate();
    }
  } else if (thumbWorld.dot(charForward) < -0.35 && expectedDownPalm.dot(palmWorld) < 0.25) {
    palmWorld.negate();
    thumbWorld.negate();
  }

  const palmLocal = palmWorld.clone().applyQuaternion(invHandQ).normalize();
  const thumbLocal = thumbWorld.clone().applyQuaternion(invHandQ).normalize();
  const fingerLocal = fingerWorld.clone().applyQuaternion(invHandQ).normalize();

  const gripMat = new THREE.Matrix4();
  if (side === 'right') {
    gripMat.makeBasis(palmLocal, thumbLocal, fingerLocal);
  } else {
    gripMat.makeBasis(palmLocal, fingerLocal, thumbLocal);
  }
  const gripLocalQ = new THREE.Quaternion().setFromRotationMatrix(gripMat);

  let fingerDistLocal = 0.042 * invScale;
  if (fingerRef) {
    const pRef = new THREE.Vector3();
    fingerRef.getWorldPosition(pRef);
    const dWorld = pRef.distanceTo(handPos);
    if (dWorld > 0.005) {
      fingerDistLocal = THREE.MathUtils.clamp(dWorld * 0.56, 0.025, 0.068) * invScale;
    }
  }
  const palmOffset = new THREE.Vector3()
    .addScaledVector(fingerLocal, fingerDistLocal)
    .addScaledVector(palmLocal, 0.024 * invScale);

  let foreArmPalmLocal: THREE.Vector3 | null = null;
  if (foreArmNode) {
    foreArmNode.updateMatrixWorld(true);
    const foreQ = new THREE.Quaternion();
    foreArmNode.getWorldQuaternion(foreQ);
    foreArmPalmLocal = palmWorld.clone().applyQuaternion(foreQ.invert()).normalize();
  }

  const fingers: FingerCurlBone[] = [];
  for (const fBone of descendants) {
    if (/_end\b|tip\b|nub\b/i.test(fBone.name)) continue;
    const isThumb = /thumb|pulgar/i.test(fBone.name);
    const isFinger =
      isThumb || /index|middle|ring|pinky|little|indice|medio|anular|menique|finger/i.test(fBone.name);
    if (!isFinger) continue;

    fBone.updateMatrixWorld(true);
    const bPos = new THREE.Vector3();
    const bWorldQ = new THREE.Quaternion();
    fBone.getWorldPosition(bPos);
    fBone.getWorldQuaternion(bWorldQ);

    let segWorld = fingerWorld.clone();
    const childBone = fBone.children.find(
      (c) => ((c as THREE.Bone).isBone || c.type === 'Bone') && !/_end\b|nub\b/i.test(c.name),
    );
    if (childBone) {
      const cPos = new THREE.Vector3();
      childBone.getWorldPosition(cPos);
      if (cPos.distanceToSquared(bPos) > 1e-6) {
        segWorld.copy(cPos).sub(bPos).normalize();
      }
    }

    const curlAxisWorld = new THREE.Vector3();
    if (isThumb) {
      const thumbCloseTarget = new THREE.Vector3()
        .addScaledVector(palmWorld, 0.72)
        .addScaledVector(fingerWorld, 0.68)
        .normalize();
      curlAxisWorld.crossVectors(segWorld, thumbCloseTarget);
    } else {
      curlAxisWorld.crossVectors(segWorld, palmWorld);
    }
    if (curlAxisWorld.lengthSq() < 1e-4) continue;
    curlAxisWorld.normalize();

    const localCurlAxis = curlAxisWorld.clone().applyQuaternion(bWorldQ.clone().invert()).normalize();
    const depth = getBoneDepthFrom(handNode, fBone);
    const nameStage = /3|distal/i.test(fBone.name)
      ? 0.55
      : /2|inter|mid/i.test(fBone.name)
        ? 0.85
        : 0.95;
    const depthWeight = depth >= 3 ? 0.55 : depth === 2 ? 0.85 : 0.95;
    const weight = isThumb ? 0.65 : Math.min(nameStage, depthWeight);

    fingers.push({
      node: fBone,
      restQuat: fBone.quaternion.clone(),
      localCurlAxis,
      weight,
      isThumb,
    });
  }

  return { gripLocalQ, palmOffset, foreArmPalmLocal, fingers };
}

export function extractHumanoidBones(root: THREE.Object3D): HumanoidBoneMap {
  const { bones, namedJoints } = collectCandidateJoints(root);

  const findUniversal = (id: CanonicalBoneId): THREE.Object3D | null => {
    const spec = UNIVERSAL_BONE_SPECS[id];
    const exactBone = bones.find((b) => b.name === id);
    if (exactBone) return exactBone;
    const boneHit = matchPatternsInList(bones, spec.patterns, spec.exclude);
    if (boneHit) return boneHit;

    const exactJoint = namedJoints.find((j) => j.name === id);
    if (exactJoint) return exactJoint;
    return matchPatternsInList(namedJoints, spec.patterns, spec.exclude);
  };

  const hips = findUniversal('hips');
  const rawSpine = findUniversal('spine');
  const rawChest = findUniversal('chest');
  const spine = rawSpine ?? rawChest;
  const chest = rawChest && rawChest !== spine ? rawChest : null;
  const neck = findUniversal('neck');
  const head = findUniversal('head');
  const leftUpLeg = findUniversal('thigh_l');
  const rightUpLeg = findUniversal('thigh_r');
  const leftLeg = findUniversal('shin_l');
  const rightLeg = findUniversal('shin_r');
  const leftFoot = findUniversal('foot_l');
  const rightFoot = findUniversal('foot_r');
  const leftArm = findUniversal('arm_l');
  const rightArm = findUniversal('arm_r');
  const leftForeArm = findUniversal('forearm_l');
  const rightForeArm = findUniversal('forearm_r');
  const rightHand = findUniversal('hand_r');
  const leftHand = findUniversal('hand_l');

  let armDropAngle = 0.55;
  root.updateMatrixWorld(true);
  if (rightArm && rightForeArm) {
    const pS = new THREE.Vector3();
    const pE = new THREE.Vector3();
    rightArm.getWorldPosition(pS);
    rightForeArm.getWorldPosition(pE);
    const dir = pE.sub(pS);
    const len = dir.length();
    if (len > 0.02) {
      const horiz = Math.hypot(dir.x, dir.z);
      const angleFromDown = Math.atan2(horiz, -dir.y);
      armDropAngle = THREE.MathUtils.clamp(angleFromDown - 0.14, 0, 1.38);
    }
  }

  const charUp = new THREE.Vector3(0, 1, 0);
  const charForward = new THREE.Vector3(0, 0, 1);
  const charLeft = new THREE.Vector3(1, 0, 0);
  if (leftArm && rightArm) {
    const pL = new THREE.Vector3();
    const pR = new THREE.Vector3();
    leftArm.getWorldPosition(pL);
    rightArm.getWorldPosition(pR);
    const span = pL.sub(pR);
    span.y = 0;
    if (span.lengthSq() > 1e-4) {
      charLeft.copy(span).normalize();
      charForward.crossVectors(charLeft, charUp).normalize();
    }
  } else {
    const rootWorldQ = new THREE.Quaternion();
    root.getWorldQuaternion(rootWorldQ);
    charLeft.applyQuaternion(rootWorldQ).normalize();
    charUp.applyQuaternion(rootWorldQ).normalize();
    charForward.crossVectors(charLeft, charUp).normalize();
  }
  const charBasisQ = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(charLeft, charUp, charForward),
  );

  const rightCal = rightHand
    ? calibrateSingleHand(rightHand, rightForeArm, 'right', charForward, charLeft, charUp)
    : null;
  const leftCal = leftHand
    ? calibrateSingleHand(leftHand, leftForeArm, 'left', charForward, charLeft, charUp)
    : null;

  const calibrateUpperArmBendLocal = (
    upperNode: THREE.Object3D | null,
    foreNode: THREE.Object3D | null,
    side: 'right' | 'left',
  ): THREE.Vector3 | null => {
    if (!upperNode || !foreNode) return null;
    upperNode.updateMatrixWorld(true);
    const pSh = new THREE.Vector3();
    const pEl = new THREE.Vector3();
    const uWorldQ = new THREE.Quaternion();
    upperNode.getWorldPosition(pSh);
    foreNode.getWorldPosition(pEl);
    upperNode.getWorldQuaternion(uWorldQ);
    const armAxis = pEl.sub(pSh);
    if (armAxis.lengthSq() < 1e-5) return null;
    armAxis.normalize();

    // Anatomical olecranon / elbow hinge pole at rest points posteriorly (-charForward) and slightly outward
    const bendHint = charForward
      .clone()
      .multiplyScalar(-1)
      .addScaledVector(charLeft, side === 'left' ? 0.22 : -0.22)
      .normalize();
    bendHint.addScaledVector(armAxis, -bendHint.dot(armAxis));
    if (bendHint.lengthSq() < 1e-4) {
      bendHint.copy(charUp).multiplyScalar(-1).addScaledVector(armAxis, charUp.dot(armAxis));
    }
    if (bendHint.lengthSq() < 1e-4) return null;
    bendHint.normalize();
    return bendHint.applyQuaternion(uWorldQ.invert()).normalize();
  };

  const rightArmBendLocal = calibrateUpperArmBendLocal(rightArm, rightForeArm, 'right');
  const leftArmBendLocal = calibrateUpperArmBendLocal(leftArm, leftForeArm, 'left');

  return {
    hips: captureBoneRest(hips, charBasisQ),
    spine: captureBoneRest(spine, charBasisQ),
    chest: captureBoneRest(chest, charBasisQ),
    neck: captureBoneRest(neck, charBasisQ),
    head: captureBoneRest(head, charBasisQ),
    leftUpLeg: captureBoneRest(leftUpLeg, charBasisQ),
    leftLeg: captureBoneRest(leftLeg, charBasisQ),
    leftFoot: captureBoneRest(leftFoot, charBasisQ),
    rightUpLeg: captureBoneRest(rightUpLeg, charBasisQ),
    rightLeg: captureBoneRest(rightLeg, charBasisQ),
    rightFoot: captureBoneRest(rightFoot, charBasisQ),
    leftArm: captureBoneRest(leftArm, charBasisQ),
    leftForeArm: captureBoneRest(leftForeArm, charBasisQ),
    leftHandRest: captureBoneRest(leftHand, charBasisQ),
    rightArm: captureBoneRest(rightArm, charBasisQ),
    rightForeArm: captureBoneRest(rightForeArm, charBasisQ),
    rightHandRest: captureBoneRest(rightHand, charBasisQ),
    rightHand,
    leftHand,
    armDropAngle,
    rightGripLocalQ: rightCal?.gripLocalQ,
    leftGripLocalQ: leftCal?.gripLocalQ,
    rightPalmOffset: rightCal?.palmOffset,
    leftPalmOffset: leftCal?.palmOffset,
    rightArmBendLocal,
    leftArmBendLocal,
    rightForeArmPalmLocal: rightCal?.foreArmPalmLocal ?? null,
    leftForeArmPalmLocal: leftCal?.foreArmPalmLocal ?? null,
    rightFingers: rightCal?.fingers,
    leftFingers: leftCal?.fingers,
    charForward,
    charLeft,
    charUp,
  };
}

const optimizedClipsSet = new WeakSet<THREE.AnimationClip>();
export function optimizeAnimationClipOnce(clip: THREE.AnimationClip) {
  if (optimizedClipsSet.has(clip)) return;
  optimizedClipsSet.add(clip);
  clip.optimize();
}

export interface SetAnimationActionOptions {
  fadeSec?: number;
  timeScale?: number;
  forceRestart?: boolean;
  oneShot?: boolean;
  interruptOneShot?: boolean;
  stopOtherLoops?: boolean;
}

export interface ClipController {
  mixer: THREE.AnimationMixer | null;
  clips: Record<string, THREE.AnimationAction>;
  tag: CharacterAnimationTag;
  actionDict: NativeAnimationDictionaryInfo;
  nativeActions: Record<StandardAnimationAction, THREE.AnimationAction | null>;
  playClip: (
    name: string,
    fadeSec?: number,
    timeScale?: number,
    forceRestart?: boolean,
    stopOtherLoops?: boolean,
  ) => boolean;
  setAction: (action: StandardAnimationAction, opts?: SetAnimationActionOptions) => boolean;
  forceIdle: (fadeSec?: number) => boolean;
  resolveClipName: (nameOrAlias: string) => string | null;
  hasAction: (action: StandardAnimationAction) => boolean;
  hasActionForTag: (tag: CharacterAnimationTag, action: StandardAnimationAction) => boolean;
  setTag: (tag: CharacterAnimationTag) => void;
  getActionDuration: (action: StandardAnimationAction) => number;
  getCurrentAction: () => StandardAnimationAction | null;
  tick: (deltaSec: number) => void;
  resetClips: () => void;
  disposeMixer: () => void;
}

export type MeshyCanonicalClipKey =
  | StandardAnimationAction
  | 'sprint'
  | 'jump'
  | 'crouchIdle'
  | 'crouchWalk'
  | 'throw'
  | 'punch'
  | 'reload'
  | 'wave'
  | 'work'
  | 'sit'
  | 'casualWalk'
  | 'crawl'
  | 'errante'
  | 'inestable'
  | 'ogro'
  | 'orco'
  | 'escupir'
  | 'alert'
  | 'alerta'
  | 'habilidad1'
  | 'habilidad3';

export interface MeshyClipDictionarySpec {
  canonical: MeshyCanonicalClipKey;
  variants: readonly string[];
  patterns: readonly RegExp[];
}

const GENERIC_CLIP_CONTAINERS = new Set([
  'armature',
  'characterarmature',
  'character armature',
  'biped',
  'skeleton',
  'rig',
  'root',
  'mesh',
  'meshy',
  'meshy merged animations',
  'mixamo',
  'avatar',
  'model',
  'character',
  'npc',
  'survivor',
  'player',
  'zombie',
]);

const GENERIC_CLIP_PLACEHOLDERS = new Set([
  'mixamo com',
  'mixamo',
  'armatureaction',
  'armature action',
  'take 001',
  'take001',
  'animation',
  'action',
  'clip',
  'default',
]);

/**
 * Normalizes Meshy / Mixamo / Blender GLTF clip names into a clean lowercase lookup token
 * while stripping container namespaces ("Armature|", "CharacterArmature|", "Rig:", "Root/")
 * and splitting CamelCase or digit suffixes ("Idle01", "Walking_Loop", "RunForward").
 */
export function normalizeMeshyClipName(rawName: string): string {
  if (!rawName) return '';
  const parts = rawName
    .split(/[|/\\]+/)
    .map((p) =>
      p
        .replace(/\(\d+\)$/g, '')
        .replace(/#\d+$/g, '')
        .replace(/\.\d{3,}$/g, '')
        .trim(),
    )
    .filter(Boolean);

  let chosen = rawName;
  if (parts.length > 1) {
    const lastNorm = parts[parts.length - 1]
      .replace(/([a-z\u00e0-\u00fc])([A-Z\u00c0-\u00dc])/g, '$1 $2')
      .replace(/[_\-.:]+/g, ' ')
      .replace(/\s+/g, ' ')
      .toLowerCase()
      .trim();
    if (GENERIC_CLIP_PLACEHOLDERS.has(lastNorm)) {
      const meaningful = [...parts]
        .reverse()
        .find((seg) => {
          const segClean = seg.replace(/[_\-.:]+/g, ' ').toLowerCase().trim();
          return !GENERIC_CLIP_PLACEHOLDERS.has(segClean) && !GENERIC_CLIP_CONTAINERS.has(segClean);
        });
      chosen = meaningful ?? parts[parts.length - 1];
    } else {
      let idx = 0;
      while (idx < parts.length - 1) {
        const segClean = parts[idx].replace(/[_\-.:]+/g, ' ').toLowerCase().trim();
        if (GENERIC_CLIP_CONTAINERS.has(segClean)) {
          idx++;
        } else {
          break;
        }
      }
      chosen = parts.slice(idx).join(' ');
    }
  } else if (parts.length === 1) {
    chosen = parts[0];
  }

  return chosen
    .replace(/([a-z\u00e0-\u00fc])([A-Z\u00c0-\u00dc])/g, '$1 $2')
    .replace(/([a-zA-Z\u00c0-\u00fc])(\d)/g, '$1 $2')
    .replace(/(\d)([a-zA-Z\u00c0-\u00fc])/g, '$1 $2')
    .replace(/[_\-.:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .trim();
}

export function extractClipLookupVariants(rawName: string): string[] {
  const out: string[] = [];
  const push = (val: string) => {
    const v = val.trim();
    if (v && !out.includes(v)) out.push(v);
  };
  push(rawName);
  push(rawName.toLowerCase());
  const pipeIdx = Math.max(rawName.lastIndexOf('|'), rawName.lastIndexOf('/'));
  if (pipeIdx >= 0 && pipeIdx < rawName.length - 1) {
    const tail = rawName.slice(pipeIdx + 1);
    push(tail);
    push(tail.toLowerCase());
  }
  const clean = normalizeMeshyClipName(rawName);
  push(clean);
  if (clean.endsWith(' 01') || clean.endsWith(' 001')) {
    push(clean.replace(/\s+0*\d+$/, '').trim());
  }
  return out;
}

/**
 * Unified dictionary of standard Meshy / Mixamo / GLTF clip names and aliases
 * shared across Ricardo, Chispa, Mateo, and all Zombie archetypes.
 */
export const MESHY_CLIP_DICTIONARY: Record<MeshyCanonicalClipKey, MeshyClipDictionarySpec> = {
  idle: {
    canonical: 'idle',
    variants: [
      'idle',
      'armature|idle',
      'characterarmature|idle',
      'meshy_merged_animations|idle',
      'idle 01',
      'idle loop',
      'idling',
      'breathing idle',
      'standing idle',
      'stand',
      'standing',
      'reposo',
      'quieto',
      'parado',
      'espera',
      'neutral',
      'alerta',
      'alert',
      'mixamo com',
      'armatureaction',
      'take 001',
    ],
    patterns: [
      /\b(?:idle|idling|reposo|quieto|parado|espera|stand|standing|breath(?:ing)?|neutral|relax(?:ed)?|wait(?:ing)?)\b/i,
    ],
  },
  walk: {
    canonical: 'walk',
    variants: [
      'walk',
      'armature|walk',
      'armature|walking',
      'characterarmature|walk',
      'walking',
      'walk 01',
      'walk loop',
      'walk cycle',
      'walk forward',
      'caminar',
      'caminando',
      'caminado',
      'paseo',
      'casual walk',
      'patrol',
      'patrulla',
      'march',
      'inestable',
      'errante',
    ],
    patterns: [
      /\b(?:walk(?:ing|cycle|loop|fwd|forward)?|camin(?:ar|ando|ado|ata)?|paseo|casual|march(?:a|ing)?|patrol|patrulla|step(?:ping)?)\b/i,
    ],
  },
  run: {
    canonical: 'run',
    variants: [
      'run',
      'armature|run',
      'armature|running',
      'characterarmature|run',
      'running',
      'run 01',
      'run loop',
      'run forward',
      'fast run',
      'correr',
      'corriendo',
      'jog',
      'jogging',
      'trote',
      'sprint',
      'chase',
      'perseguir',
    ],
    patterns: [
      /\b(?:run(?:ning|cycle|loop|fwd|forward)?|correr|corriendo|jog(?:ging)?|trote|sprint(?:ing|loop)?|rapido|rápido|fast|dash|charge|embestida|chase|perseguir)\b/i,
    ],
  },
  sprint: {
    canonical: 'sprint',
    variants: ['sprint', 'sprinting', 'fast run', 'rapido', 'rápido', 'armature|sprint', 'armature|fast run'],
    patterns: [/\b(?:sprint(?:ing|loop)?|rapido|rápido|fast\s*run|dash)\b/i],
  },
  attack: {
    canonical: 'attack',
    variants: [
      'attack',
      'armature|attack',
      'characterarmature|attack',
      'attacking',
      'attack 01',
      'ataque',
      'atacar',
      'punch',
      'punching',
      'golpe',
      'golpear',
      'strike',
      'melee',
      'slash',
      'swipe',
      'bite',
      'morder',
      'smash',
      'slam',
      'bash',
      'claw',
    ],
    patterns: [
      /\b(?:attack(?:ing)?|ataque|atacar|punch(?:ing)?|golpe(?:ar|ando)?|puño|puno|strike|striking|melee|slash(?:ing)?|swipe|bite|biting|mord(?:er|ida)?|shoot(?:ing)?|dispar(?:o|ar)?|fire|firing|swing(?:ing)?|smash|slam|bash|claw|escup(?:ir)?|spit(?:ting)?)\b/i,
    ],
  },
  hit: {
    canonical: 'hit',
    variants: [
      'hit',
      'armature|hit',
      'hit reaction',
      'get hit',
      'got hit',
      'getting hit',
      'take hit',
      'hurt',
      'damage',
      'damaged',
      'pain',
      'stagger',
      'flinch',
      'recibir golpe',
      'herido',
      'daño',
      'dano',
    ],
    patterns: [
      /\b(?:recib\w*|hurt|damage[d]?|dano|daño|pain|dolor|herid\w*|stagger|flinch|reaccion|react(?:ion)?|get\s*hit|got\s*hit|getting\s*hit|on\s*hit|take\s*hit|being\s*hit|hit\s*react(?:ion)?|impact(?:o)?|knockback)\b/i,
    ],
  },
  death: {
    canonical: 'death',
    variants: [
      'death',
      'armature|death',
      'armature|dying',
      'dying',
      'dead',
      'die',
      'falling back death',
      'muerte',
      'muere',
      'muerto',
      'morir',
      'collapse',
      'knockout',
      'ko',
    ],
    patterns: [/\b(?:muerte|muere|muerto|morir|death|dead|die|dying|collapse|knockout|ko)\b/i],
  },
  jump: {
    canonical: 'jump',
    variants: ['jump', 'jumping', 'armature|jump', 'salto', 'saltar', 'leap', 'in air'],
    patterns: [/\b(?:jump(?:ing)?|salto|saltar|leap(?:ing)?|in\s*air)\b/i],
  },
  crouchIdle: {
    canonical: 'crouchIdle',
    variants: ['crouch idle', 'crouching idle', 'crouch', 'crouching', 'agachado', 'sigilo'],
    patterns: [/\b(?:crouch(?:ing)?|agach\w*|sneak(?:ing)?|sigilo|cuclilla)\b/i],
  },
  crouchWalk: {
    canonical: 'crouchWalk',
    variants: ['crouch walk', 'crouched walking', 'sneak walk', 'sneaking forward', 'caminar agachado'],
    patterns: [/\b(?:crouch\s*walk|sneak\s*walk|crouched\s*walk(?:ing)?)\b/i],
  },
  throw: {
    canonical: 'throw',
    variants: ['throw', 'throwing', 'toss', 'arrojar', 'lanzar', 'arrojar granada', 'throw grenade'],
    patterns: [/\b(?:arrojar|lanzar|granada|throw(?:ing)?|grenade|toss)\b/i],
  },
  punch: {
    canonical: 'punch',
    variants: ['punch', 'punching', 'golpe', 'golpear', 'puño', 'melee', 'boxing'],
    patterns: [/\b(?:punch(?:ing)?|golpe(?:ar)?|puño|puno|melee|boxing|strike)\b/i],
  },
  reload: {
    canonical: 'reload',
    variants: ['reload', 'reloading', 'recargar', 'recargando'],
    patterns: [/\b(?:reload(?:ing)?|recarg\w*)\b/i],
  },
  wave: {
    canonical: 'wave',
    variants: ['wave', 'waving', 'armature|wave', 'saludar', 'saludo', 'greet', 'greeting'],
    patterns: [/\b(?:wave|waving|saludar|saludo|greet(?:ing)?)\b/i],
  },
  work: {
    canonical: 'work',
    variants: ['work', 'working', 'armature|work', 'repair', 'repairing', 'reparar', 'craft', 'wrench'],
    patterns: [/\b(?:work(?:ing)?|reparar|repair(?:ing)?|craft(?:ing)?|wrench|mechanic)\b/i],
  },
  sit: {
    canonical: 'sit',
    variants: ['sit', 'sitting', 'armature|sit', 'sentado', 'sentada'],
    patterns: [/\b(?:sit(?:ting)?|sentad[oa])\b/i],
  },
  casualWalk: {
    canonical: 'casualWalk',
    variants: ['casual walk', 'paseo', 'casual'],
    patterns: [/\b(?:paseo|casual)\b/i],
  },
  crawl: {
    canonical: 'crawl',
    variants: ['crawl', 'crawling', 'crawler', 'arrastrar', 'arrastrando', 'gatear'],
    patterns: [/\b(?:crawl(?:ing|er)?|arrastr\w*|gatear|suelo)\b/i],
  },
  errante: {
    canonical: 'errante',
    variants: ['errante', 'erante', 'wander', 'wandering', 'roam', 'deambular'],
    patterns: [/\b(?:errant\w*|erante|wander(?:ing)?|roam(?:ing)?|deambular|vagabund\w*)\b/i],
  },
  inestable: {
    canonical: 'inestable',
    variants: ['inestable', 'unstable', 'unsteady', 'shamble', 'shambling', 'limp', 'limping', 'stagger'],
    patterns: [/\b(?:inestable|unstable|unsteady|stagger(?:ing)?|shambl(?:e|ing)|limp(?:ing)?)\b/i],
  },
  ogro: {
    canonical: 'ogro',
    variants: ['ogro', 'ogre', 'heavy walk', 'brute'],
    patterns: [/\b(?:ogro|ogre|heavy)\b/i],
  },
  orco: {
    canonical: 'orco',
    variants: ['orco', 'orc', 'lento', 'slow walk'],
    patterns: [/\b(?:orco|orc|lento|slow)\b/i],
  },
  escupir: {
    canonical: 'escupir',
    variants: ['escupir', 'escupiendo', 'spit', 'spitting', 'impulso'],
    patterns: [/\b(?:escup\w*|spit(?:ting)?|impulso)\b/i],
  },
  alert: {
    canonical: 'alert',
    variants: ['roar', 'scream', 'gruñir', 'grunir'],
    patterns: [/\b(?:roar|gruñ\w*|grun\w*|scream)\b/i],
  },
  alerta: {
    canonical: 'alerta',
    variants: ['alerta', 'alert', 'alert idle'],
    patterns: [/\b(?:alerta|alert)\b/i],
  },
  habilidad1: {
    canonical: 'habilidad1',
    variants: ['habilidad 1', 'habilidad 01', 'skill 1', 'ability 1'],
    patterns: [/\b(?:habilidad|skill|ability)\s*0*1\b/i],
  },
  habilidad3: {
    canonical: 'habilidad3',
    variants: ['habilidad 3', 'habilidad 03', 'skill 3', 'ability 3'],
    patterns: [/\b(?:habilidad|skill|ability)\s*0*3\b/i],
  },
};

const MESHY_VARIANT_TO_CANONICAL = new Map<string, MeshyCanonicalClipKey>();
for (const key of Object.keys(MESHY_CLIP_DICTIONARY) as MeshyCanonicalClipKey[]) {
  const spec = MESHY_CLIP_DICTIONARY[key];
  MESHY_VARIANT_TO_CANONICAL.set(key.toLowerCase(), key);
  for (let i = 0; i < spec.variants.length; i++) {
    const norm = normalizeMeshyClipName(spec.variants[i]);
    if (norm && !GENERIC_CLIP_PLACEHOLDERS.has(norm) && !MESHY_VARIANT_TO_CANONICAL.has(norm)) {
      MESHY_VARIANT_TO_CANONICAL.set(norm, key);
    }
  }
}

export function resolveMeshyAliasKey(nameOrAlias: string): MeshyCanonicalClipKey | null {
  const norm = normalizeMeshyClipName(nameOrAlias);
  if (!norm) return null;
  const direct = MESHY_VARIANT_TO_CANONICAL.get(norm);
  if (direct) return direct;
  if (GENERIC_CLIP_PLACEHOLDERS.has(norm)) return 'idle';
  for (const key of Object.keys(MESHY_CLIP_DICTIONARY) as MeshyCanonicalClipKey[]) {
    const spec = MESHY_CLIP_DICTIONARY[key];
    for (let i = 0; i < spec.patterns.length; i++) {
      if (spec.patterns[i].test(norm)) return key;
    }
  }
  return null;
}

interface SharedMeshyClipEntry {
  clip: THREE.AnimationClip;
  rawName: string;
  clean: string;
  canonical: MeshyCanonicalClipKey | null;
  targetBoneNames: Set<string>;
}

const sharedMeshyClipBank: SharedMeshyClipEntry[] = [];
const sharedMeshyRegisteredClips = new WeakSet<THREE.AnimationClip>();
const clipTargetBoneCache = new WeakMap<THREE.AnimationClip, Set<string>>();

function getClipTargetBoneNames(clip: THREE.AnimationClip): Set<string> {
  const cached = clipTargetBoneCache.get(clip);
  if (cached) return cached;
  const names = new Set<string>();
  for (let i = 0; i < clip.tracks.length; i++) {
    const trackName = clip.tracks[i].name;
    const dotIdx = trackName.indexOf('.');
    const nodeName = dotIdx > 0 ? trackName.slice(0, dotIdx) : trackName;
    const cleanNode = nodeName.trim();
    if (cleanNode) names.add(cleanNode);
  }
  clipTargetBoneCache.set(clip, names);
  return names;
}

/**
 * Registers Meshy/GLTF clips into the shared base animation bank so any character
 * sharing the same Meshy skeleton structure can reuse standard animations cleanly.
 */
export function registerSharedMeshyClips(animations: THREE.AnimationClip[]): void {
  for (let i = 0; i < animations.length; i++) {
    const clip = animations[i];
    if (!clip || sharedMeshyRegisteredClips.has(clip) || clip.tracks.length === 0) continue;
    optimizeAnimationClipOnce(clip);
    sharedMeshyRegisteredClips.add(clip);
    const clean = normalizeMeshyClipName(clip.name);
    const targetBoneNames = getClipTargetBoneNames(clip);
    if (targetBoneNames.size === 0) continue;
    sharedMeshyClipBank.push({
      clip,
      rawName: clip.name,
      clean,
      canonical: resolveMeshyAliasKey(clip.name),
      targetBoneNames,
    });
  }
}

function collectSkeletonBoneNameSet(targetRoot: THREE.Object3D): Set<string> {
  const boneNames = new Set<string>();
  targetRoot.traverse((obj) => {
    if (isIgnoredSocketSubtree(obj)) return;
    if (((obj as THREE.Bone).isBone || obj.type === 'Bone') && obj.name) {
      boneNames.add(obj.name);
    }
  });
  return boneNames;
}

function doesClipMatchSkeletonBones(
  clipBones: Set<string>,
  targetBoneNames: Set<string>,
): boolean {
  if (targetBoneNames.size < 4 || clipBones.size === 0) return false;
  let matches = 0;
  const required = Math.min(6, clipBones.size, targetBoneNames.size);
  clipBones.forEach((bn) => {
    if (targetBoneNames.has(bn)) matches++;
  });
  return matches >= required;
}

interface ClipEntry {
  clip: THREE.AnimationClip;
  rawName: string;
  clean: string;
  action: THREE.AnimationAction;
  isSharedFallback: boolean;
}

const RE_DAMAGE_TAKEN =
  /recib|hurt|damage|damaged|dano|daño|pain|dolor|herid|stagger|flinch|reaccion|react(?:ion)?|get[_\s-]?hit|got[_\s-]?hit|getting[_\s-]?hit|on[_\s-]?hit|take[_\s-]?hit|being[_\s-]?hit|hit[_\s-]?(?:react(?:ion)?|body|head|front|back|left|right)|habilidad\s*0*1\b|skill\s*0*1\b|ability\s*0*1\b/i;
const RE_ATTACK_WORDS =
  /attack(?:ing)?|ataque|atacar|punch(?:ing)?|golpe(?:ar|ando)?|puño|puno|strike|striking|melee|slash(?:ing)?|swipe|bite|biting|mord|shoot(?:ing)?|dispar|fire|firing|swing(?:ing)?|smash|slam|bash|claw|escup|spit(?:ting)?|habilidad\s*0*3\b|skill\s*0*3\b|ability\s*0*3\b/i;
const RE_DEATH_WORDS =
  /muerte|muere|muerto|morir|death|dead|\bdie\b|dying|collapse|knockout|\bko\b/i;
const RE_CRAWL_WORDS = /crawl|crawling|crawler|arrastr|gatear|suelo/i;
const RE_THROW_WORDS = /arrojar|lanzar|granada|throw|throwing|grenade|toss/i;
const RE_CROUCH_WORDS = /crouch|agach|sneak|sigilo|cuclilla/i;
const RE_JUMP_WORDS = /\bjump(?:ing)?\b|\bsalto\b|saltar|\bleap(?:ing)?\b|\bfall\b|caida|caída|in[_\s-]?air/i;
const RE_RELOAD_WORDS = /reload|recarg/i;
const RE_SIT_WORDS = /\bsit(?:ting)?\b|sentad[oa]/i;

function scoreClipForAction(
  clean: string,
  action: StandardAnimationAction,
  tag: CharacterAnimationTag,
  totalClips = 0,
): number {
  const isZombie = isZombieAnimationTag(tag);
  const isCrawlClip = RE_CRAWL_WORDS.test(clean);
  const isCrouchClip = RE_CROUCH_WORDS.test(clean);
  const isJumpClip = RE_JUMP_WORDS.test(clean);
  const isReloadClip = RE_RELOAD_WORDS.test(clean);
  const isSitClip = RE_SIT_WORDS.test(clean);
  const isDamageClip = RE_DAMAGE_TAKEN.test(clean) || (/\bhit\b/i.test(clean) && !RE_ATTACK_WORDS.test(clean));
  const isDeathClip = RE_DEATH_WORDS.test(clean);
  const isAttackClip =
    RE_ATTACK_WORDS.test(clean) && !/recib|hurt|damage|react|got[_\s-]?hit|get[_\s-]?hit/i.test(clean);

  switch (action) {
    case 'death': {
      if (!isDeathClip) return 0;
      let score = 100;
      if (tag === 'zombie_crawler' && isCrawlClip) score += 25;
      if (/death|muerte|dying/i.test(clean)) score += 10;
      return score;
    }

    case 'hit': {
      if (isDeathClip) return 0;
      if (/habilidad\s*0*1\b|skill\s*0*1\b|ability\s*0*1\b/i.test(clean)) {
        return isZombie ? 65 : 0;
      }
      if (!isDamageClip) return 0;
      let score = 95;
      if (/hurt|damage|recib|get[_\s-]?hit|got[_\s-]?hit|getting[_\s-]?hit|hit[_\s-]?react/i.test(clean)) {
        score += 20;
      }
      if (tag === 'zombie_crawler' && isCrawlClip) score += 15;
      return score;
    }

    case 'attack': {
      if (isDeathClip || RE_DAMAGE_TAKEN.test(clean)) return 0;
      if (RE_THROW_WORDS.test(clean) && !/attack|ataque/i.test(clean)) return 0;
      if (!isAttackClip) return 0;

      let score = 70;
      if (tag === 'zombie_spitter') {
        if (/escup|spit|impulso/i.test(clean)) score += 60;
        else if (/ataque|attack/i.test(clean)) score += 30;
      } else if (tag === 'zombie_runner') {
        if (/habilidad\s*0*3\b|skill\s*0*3\b/i.test(clean)) score += 50;
        else if (/slash|claw|bite|ataque|attack/i.test(clean)) score += 35;
      } else if (tag === 'zombie_crawler') {
        if (isCrawlClip) score += 55;
        if (/bite|mord|claw|ataque|attack/i.test(clean)) score += 30;
      } else if (tag === 'zombie_brute') {
        if (/smash|slam|bash|ataque|attack/i.test(clean)) score += 45;
      } else if (!isZombie) {
        if (/punch|golpe|melee|strike|shoot|dispar|attack|ataque/i.test(clean)) score += 40;
      } else {
        if (/ataque|atacar|attack|bite|mord|slash|swipe/i.test(clean)) score += 40;
        else if (/habilidad\s*0*3\b/i.test(clean)) score += 28;
      }
      return score;
    }

    case 'idle': {
      if (
        isDeathClip ||
        isAttackClip ||
        isDamageClip ||
        RE_THROW_WORDS.test(clean) ||
        isCrouchClip ||
        isJumpClip ||
        isReloadClip ||
        isSitClip
      ) {
        return 0;
      }
      const looksWalkOrRun =
        /\b(?:walk(?:ing|cycle|loop|fwd|forward)?|camin(?:ar|ando|ado)?|paseo|casual|run(?:ning|cycle|loop|fwd|forward)?|correr|corriendo|sprint(?:ing)?|jog(?:ging)?|trote|errant\w*|erante|inestable)\b/i.test(
          clean,
        );
      let score = 0;
      if (/\bidle\b|\bidling\b|reposo|quieto|parado|espera|\bstand\b|\bstanding\b|respir|breath|neutral|relax/i.test(clean)) {
        score = clean === 'idle' ? 120 : 108;
      } else if (isZombie && /alerta|alert/i.test(clean)) {
        score = 96;
      } else if (!looksWalkOrRun && GENERIC_CLIP_PLACEHOLDERS.has(clean)) {
        score = totalClips === 1 ? 40 : 16;
      }
      if (score > 0 && tag === 'zombie_crawler' && isCrawlClip) score += 25;
      if (score > 0 && tag !== 'zombie_crawler' && isCrawlClip) score -= 40;
      return Math.max(0, score);
    }

    case 'walk': {
      if (
        isDeathClip ||
        isAttackClip ||
        isDamageClip ||
        RE_THROW_WORDS.test(clean) ||
        isCrouchClip ||
        isJumpClip ||
        isReloadClip ||
        isSitClip
      ) {
        return 0;
      }
      if (tag === 'zombie_crawler') {
        if (isCrawlClip && !/fast|run|sprint|ataque|attack|death|idle/i.test(clean)) return 120;
        if (isCrawlClip) return 90;
        if (/inestable|shamble|limp/i.test(clean)) return 65;
        if (/walk|camin|errant/i.test(clean)) return 55;
        return 0;
      }

      if (isCrawlClip) return 0;

      if (tag === 'zombie_brute') {
        if (/ogro|ogre|heavy/i.test(clean)) return 115;
        if (/orco|orc/i.test(clean)) return 95;
        if (/walk|camin/i.test(clean)) return 82;
        if (/inestable|errant/i.test(clean)) return 70;
        return 0;
      }

      if (tag === 'zombie_spitter') {
        if (/orco|orc/i.test(clean)) return 115;
        if (/ogro|ogre/i.test(clean)) return 90;
        if (/walk|camin/i.test(clean)) return 82;
        if (/inestable|errant/i.test(clean)) return 70;
        return 0;
      }

      if (isZombie) {
        if (tag === 'zombie_runner') {
          if (/walk|camin/i.test(clean)) return 110;
          if (/inestable|shamble|limp/i.test(clean)) return 95;
          if (/errant|erante|wander|roam/i.test(clean)) return 88;
          return 0;
        }
        if (/inestable|shamble|limp/i.test(clean)) return 108;
        if (/walk|camin|patrol|patrulla|march/i.test(clean)) return 104;
        if (/errant|erante|wander|roam|deambular|vagabund/i.test(clean)) return 98;
        if (/orco|orc|lento|slow/i.test(clean)) return 85;
        return 0;
      }

      if (/\b(?:walk(?:ing|cycle|loop|fwd|forward)?|camin(?:ar|ando|ado|ata)?)\b/i.test(clean)) {
        return clean === 'walk' || clean === 'walking' ? 116 : 110;
      }
      if (/paseo|casual/i.test(clean)) return 92;
      return 0;
    }

    case 'run': {
      if (
        isDeathClip ||
        isAttackClip ||
        isDamageClip ||
        RE_THROW_WORDS.test(clean) ||
        isCrouchClip ||
        isJumpClip ||
        isReloadClip ||
        isSitClip
      ) {
        return 0;
      }
      if (tag === 'zombie_crawler') {
        if (isCrawlClip && /fast|run|sprint|chase|rapido/i.test(clean)) return 120;
        if (isCrawlClip) return 95;
        return 0;
      }
      if (isCrawlClip) return 0;

      if (/\b(?:run(?:ning|cycle|loop|fwd|forward)?|correr|corriendo|chase|perseguir)\b/i.test(clean)) {
        return tag === 'zombie_runner' ? 120 : clean === 'run' || clean === 'running' ? 116 : 112;
      }
      if (/\b(?:sprint(?:ing|loop)?|rapido|rápido|fast|dash|charge|embestida)\b/i.test(clean)) {
        return tag === 'zombie_runner' || tag === 'zombie_brute' ? 115 : 102;
      }
      if (/trote|jog/i.test(clean)) return 94;
      if (tag === 'zombie_brute' && /ogro|ogre/i.test(clean)) return 82;
      if (tag === 'zombie_spitter' && /orco|orc/i.test(clean)) return 78;
      return 0;
    }
  }
}

export function inspectTagAnimations(
  animations: THREE.AnimationClip[],
  tag: CharacterAnimationTag,
): NativeAnimationDictionaryInfo {
  const mappedClips: Partial<Record<StandardAnimationAction, string>> = {};
  const allClipNames: string[] = [];
  const cleaned = animations.map((clip) => {
    allClipNames.push(clip.name);
    return {
      name: clip.name,
      clean: normalizeMeshyClipName(clip.name),
    };
  });

  for (let a = 0; a < STANDARD_ANIMATION_ACTIONS.length; a++) {
    const action = STANDARD_ANIMATION_ACTIONS[a];
    let bestScore = 0;
    let bestName: string | undefined;
    for (let i = 0; i < cleaned.length; i++) {
      const s = scoreClipForAction(cleaned[i].clean, action, tag, cleaned.length);
      if (s > bestScore) {
        bestScore = s;
        bestName = cleaned[i].name;
      }
    }
    if (bestName) mappedClips[action] = bestName;
  }

  // Intra-skeleton locomotion fallbacks (strictly within the model's own animations)
  if (!mappedClips.run && mappedClips.walk) {
    mappedClips.run = mappedClips.walk;
  }
  if (!mappedClips.walk && mappedClips.run) {
    mappedClips.walk = mappedClips.run;
  }

  const availableActions = STANDARD_ANIMATION_ACTIONS.filter((a) => Boolean(mappedClips[a]));
  return {
    tag,
    mappedClips,
    availableActions,
    allClipNames,
  };
}

export function createClipController(
  targetRoot: THREE.Object3D,
  animations: THREE.AnimationClip[],
  roleOrTag: CharacterClipRole | CharacterAnimationTag,
  explicitTag?: CharacterAnimationTag,
): ClipController {
  let activeTag: CharacterAnimationTag =
    explicitTag ??
    (roleOrTag === 'player'
      ? 'player'
      : roleOrTag === 'zombie'
        ? 'zombie'
        : roleOrTag === 'npc'
          ? 'npc'
          : roleOrTag);
  const role: CharacterClipRole = resolveTagClipRole(activeTag);
  const clips: Record<string, THREE.AnimationAction> = {};
  const emptyNative: Record<StandardAnimationAction, THREE.AnimationAction | null> = {
    idle: null,
    walk: null,
    run: null,
    attack: null,
    hit: null,
    death: null,
  };
  const emptyDict: NativeAnimationDictionaryInfo = {
    tag: activeTag,
    mappedClips: {},
    availableActions: [],
    allClipNames: [],
  };

  // Register Meshy/GLTF clips into the shared base bank
  if (animations.length > 0) {
    registerSharedMeshyClips(animations);
  }

  // Check if shared Meshy clips can fill missing actions on a compatible skeleton
  const targetBoneNames = collectSkeletonBoneNameSet(targetRoot);
  const compatibleSharedClips: SharedMeshyClipEntry[] = [];
  if (targetBoneNames.size >= 4 && sharedMeshyClipBank.length > 0) {
    const seenClips = new Set(animations);
    for (let i = 0; i < sharedMeshyClipBank.length; i++) {
      const bankItem = sharedMeshyClipBank[i];
      if (seenClips.has(bankItem.clip)) continue;
      if (doesClipMatchSkeletonBones(bankItem.targetBoneNames, targetBoneNames)) {
        compatibleSharedClips.push(bankItem);
        seenClips.add(bankItem.clip);
      }
    }
  }

  if (animations.length === 0 && compatibleSharedClips.length === 0) {
    return {
      mixer: null,
      clips,
      tag: activeTag,
      actionDict: emptyDict,
      nativeActions: emptyNative,
      playClip: () => false,
      setAction: () => false,
      forceIdle: () => false,
      resolveClipName: () => null,
      hasAction: () => false,
      hasActionForTag: () => false,
      setTag: (nextTag) => {
        activeTag = nextTag;
        emptyDict.tag = nextTag;
      },
      getActionDuration: () => 0,
      getCurrentAction: () => null,
      tick: () => {},
      resetClips: () => {},
      disposeMixer: () => {},
    };
  }

  // Strict skeleton isolation: AnimationMixer binds exclusively to this character's targetRoot
  const mixer = new THREE.AnimationMixer(targetRoot);
  const entries: ClipEntry[] = [];
  const createdActions: THREE.AnimationAction[] = [];

  const bindAndRegisterClip = (clip: THREE.AnimationClip, isSharedFallback: boolean) => {
    optimizeAnimationClipOnce(clip);
    const clean = normalizeMeshyClipName(clip.name);
    const act = mixer.clipAction(clip);
    createdActions.push(act);
    entries.push({ clip, rawName: clip.name, clean, action: act, isSharedFallback });

    const lookupVariants = extractClipLookupVariants(clip.name);
    for (let i = 0; i < lookupVariants.length; i++) {
      const variant = lookupVariants[i];
      if (!clips[variant]) {
        clips[variant] = act;
      }
    }

    const assignContextualAlias = (key: string, isOneShot = false, clamp = false) => {
      if (!clips[key] || !isSharedFallback) {
        if (isSharedFallback && clips[key]) return;
        clips[key] = act;
      }
      if (isOneShot) {
        act.setLoop(THREE.LoopOnce, 1);
        act.clampWhenFinished = clamp;
      }
    };

    if (role === 'player' || role === 'npc') {
      if (RE_THROW_WORDS.test(clean)) {
        assignContextualAlias('throw', true, true);
      } else if (
        (clean.includes('golpear') ||
          clean.includes('golpe') ||
          clean.includes('puno') ||
          clean.includes('puño') ||
          /\bpunch/i.test(clean) ||
          clean.includes('strike') ||
          clean.includes('melee') ||
          clean.includes('ataque') ||
          /\battack/i.test(clean)) &&
        !RE_DAMAGE_TAKEN.test(clean)
      ) {
        assignContextualAlias('punch', true, false);
      } else if (RE_DEATH_WORDS.test(clean)) {
        assignContextualAlias('death', true, true);
      } else if (RE_DAMAGE_TAKEN.test(clean) || (/\bhit\b/i.test(clean) && !RE_ATTACK_WORDS.test(clean))) {
        assignContextualAlias('hit', true, false);
      } else if (RE_RELOAD_WORDS.test(clean)) {
        assignContextualAlias('reload', true, false);
      } else if (RE_JUMP_WORDS.test(clean)) {
        assignContextualAlias('jump', true, true);
      } else if (RE_CROUCH_WORDS.test(clean)) {
        if (/\b(?:walk|camin|move|sneak)/i.test(clean)) {
          assignContextualAlias('crouchWalk');
        } else {
          assignContextualAlias('crouchIdle');
        }
      } else if (RE_SIT_WORDS.test(clean)) {
        assignContextualAlias('sit');
      } else if (/\b(?:saludar|saludo|wave|waving|greet)/i.test(clean)) {
        assignContextualAlias('wave');
      } else if (/\b(?:reparar|repair|work|craft|wrench|mechanic)/i.test(clean)) {
        assignContextualAlias('work');
      } else if (/\b(?:idle|idling|reposo|quieto|parado|espera|stand|standing|respir|breath|neutral)\b/i.test(clean)) {
        assignContextualAlias('idle');
      } else if (clean.includes('paseo') || clean.includes('casual')) {
        assignContextualAlias('casualWalk');
      } else if (/\b(?:walk(?:ing|cycle|loop|fwd|forward)?|camin(?:ar|ando|ado)?)\b/i.test(clean)) {
        assignContextualAlias('walk');
      } else if (/\b(?:rapido|rápido|sprint(?:ing)?|fast\s*run)\b/i.test(clean)) {
        assignContextualAlias('sprint');
      } else if (/\b(?:run(?:ning|cycle|loop|fwd|forward)?|corriendo|correr|trote|jog(?:ging)?)\b/i.test(clean)) {
        assignContextualAlias('run');
      }
    } else {
      if (
        RE_CRAWL_WORDS.test(clean) &&
        !RE_DEATH_WORDS.test(clean) &&
        !RE_ATTACK_WORDS.test(clean) &&
        !RE_DAMAGE_TAKEN.test(clean)
      ) {
        assignContextualAlias('crawl');
      }
      if (/\b(?:errant\w*|erante|wander|roam|deambular|vagabund)\b/i.test(clean)) {
        assignContextualAlias('errante');
      } else if (clean.includes('ogro') || clean.includes('ogre')) {
        assignContextualAlias('ogro');
      } else if (clean.includes('orco') || /\borc\b/i.test(clean) || clean.includes('lento') || clean.includes('slow')) {
        assignContextualAlias('orco');
      } else if (/\b(?:inestable|unstable|unsteady|stagger|shamble|limp)/i.test(clean)) {
        assignContextualAlias('inestable');
      } else if (/\b(?:walk(?:ing|cycle|loop)?|camin(?:ar|ando|ado)?)\b/i.test(clean)) {
        assignContextualAlias('walk');
      } else if (/\b(?:run(?:ning|cycle|loop)?|corriendo|correr|sprint|fast)\b/i.test(clean)) {
        assignContextualAlias('run');
      } else if (/(?:habilidad|skill|ability)\s*0*1\b/.test(clean)) {
        assignContextualAlias('habilidad1');
      } else if (/(?:habilidad|skill|ability)\s*0*3\b/.test(clean)) {
        assignContextualAlias('habilidad3');
      } else if (clean.includes('escup') || clean.includes('spit') || clean.includes('impulso')) {
        assignContextualAlias('escupir');
      } else if (
        (clean.includes('ataque') ||
          clean.includes('atacar') ||
          /\battack/i.test(clean) ||
          clean.includes('mord') ||
          clean.includes('bite') ||
          clean.includes('golpe') ||
          clean.includes('slash') ||
          clean.includes('swipe')) &&
        !RE_DAMAGE_TAKEN.test(clean)
      ) {
        assignContextualAlias('ataque');
      } else if (RE_DAMAGE_TAKEN.test(clean) || (/\bhit\b/i.test(clean) && !RE_ATTACK_WORDS.test(clean))) {
        assignContextualAlias('hit', true, false);
      } else if (clean.includes('roar') || clean.includes('gruñ') || clean.includes('scream')) {
        assignContextualAlias('alert');
      } else if (/\b(?:alerta|alert|idle|idling|quieto|reposo|stand|standing|respir)\b/i.test(clean)) {
        assignContextualAlias('alerta');
      } else if (RE_DEATH_WORDS.test(clean)) {
        assignContextualAlias('death', true, true);
      }
    }
  };

  for (let i = 0; i < animations.length; i++) {
    bindAndRegisterClip(animations[i], false);
  }
  for (let i = 0; i < compatibleSharedClips.length; i++) {
    bindAndRegisterClip(compatibleSharedClips[i].clip, true);
  }

  if ((role === 'player' || role === 'npc') && !clips['walk'] && clips['casualWalk']) {
    clips['walk'] = clips['casualWalk'];
  }

  const nativeActions: Record<StandardAnimationAction, THREE.AnimationAction | null> = {
    idle: null,
    walk: null,
    run: null,
    attack: null,
    hit: null,
    death: null,
  };
  const nativeSpeedScale: Record<StandardAnimationAction, number> = {
    idle: 1,
    walk: 1,
    run: 1,
    attack: 1,
    hit: 1,
    death: 1,
  };
  const actionDict: NativeAnimationDictionaryInfo = {
    tag: activeTag,
    mappedClips: {},
    availableActions: [],
    allClipNames: entries.map((e) => e.rawName),
  };

  const resolveDictionaryForTag = (tag: CharacterAnimationTag) => {
    activeTag = tag;
    actionDict.tag = tag;
    actionDict.mappedClips = {};

    const bestEntryFor: Record<StandardAnimationAction, ClipEntry | null> = {
      idle: null,
      walk: null,
      run: null,
      attack: null,
      hit: null,
      death: null,
    };

    const ownClipCount = entries.filter((e) => !e.isSharedFallback).length;

    for (let a = 0; a < STANDARD_ANIMATION_ACTIONS.length; a++) {
      const action = STANDARD_ANIMATION_ACTIONS[a];
      let bestScore = 0;
      let best: ClipEntry | null = null;
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const baseScore = scoreClipForAction(
          entry.clean,
          action,
          tag,
          entry.isSharedFallback ? entries.length : ownClipCount,
        );
        if (baseScore <= 0) continue;
        // Native clips on the model itself ALWAYS outrank shared Meshy bank fallbacks
        const weightedScore = entry.isSharedFallback ? baseScore * 0.5 : baseScore + 1000;
        if (weightedScore > bestScore) {
          bestScore = weightedScore;
          best = entry;
        }
      }
      bestEntryFor[action] = best;
    }

    // Intra-skeleton locomotion fallbacks (strictly same skeleton; never map walk/work/wave to idle)
    let walkScale = 1;
    let runScale = 1;
    if (!bestEntryFor.run && bestEntryFor.walk) {
      bestEntryFor.run = bestEntryFor.walk;
      runScale = 1.28;
    }
    if (!bestEntryFor.walk && bestEntryFor.run) {
      bestEntryFor.walk = bestEntryFor.run;
      walkScale = 0.72;
    }

    nativeSpeedScale.idle = 1;
    nativeSpeedScale.walk = walkScale;
    nativeSpeedScale.run = runScale;
    nativeSpeedScale.attack = 1;
    nativeSpeedScale.hit = 1;
    nativeSpeedScale.death = 1;

    for (let a = 0; a < STANDARD_ANIMATION_ACTIONS.length; a++) {
      const key = STANDARD_ANIMATION_ACTIONS[a];
      const entry = bestEntryFor[key];
      nativeActions[key] = entry ? entry.action : null;
      if (entry) {
        actionDict.mappedClips[key] = entry.rawName;
        if (!clips[key]) {
          clips[key] = entry.action;
        }
      }
    }

    if (nativeActions.death) {
      nativeActions.death.setLoop(THREE.LoopOnce, 1);
      nativeActions.death.clampWhenFinished = true;
    }
    if (nativeActions.hit) {
      nativeActions.hit.setLoop(THREE.LoopOnce, 1);
      nativeActions.hit.clampWhenFinished = false;
    }

    actionDict.availableActions = STANDARD_ANIMATION_ACTIONS.filter((k) =>
      Boolean(nativeActions[k]),
    );
  };

  resolveDictionaryForTag(activeTag);

  const hasAny = Object.keys(clips).length > 0 || actionDict.availableActions.length > 0;
  if (!hasAny) {
    mixer.stopAllAction();
    for (let i = 0; i < createdActions.length; i++) {
      mixer.uncacheAction(createdActions[i].getClip(), targetRoot);
    }
    mixer.uncacheRoot(targetRoot);
    return {
      mixer: null,
      clips,
      tag: activeTag,
      actionDict,
      nativeActions: emptyNative,
      playClip: () => false,
      setAction: () => false,
      forceIdle: () => false,
      resolveClipName: () => null,
      hasAction: () => false,
      hasActionForTag: () => false,
      setTag: (nextTag) => {
        activeTag = nextTag;
        actionDict.tag = nextTag;
      },
      getActionDuration: () => 0,
      getCurrentAction: () => null,
      tick: () => {},
      resetClips: () => {},
      disposeMixer: () => {},
    };
  }

  let current: THREE.AnimationAction | null = null;
  let currentName: string | null = null;
  let currentStandardAction: StandardAnimationAction | null = null;
  let lockedDeath = false;
  let activeOneShot: {
    action: StandardAnimationAction;
    clipAction: THREE.AnimationAction;
  } | null = null;
  let desiredBaseAction: StandardAnimationAction | null = null;
  let desiredBaseFade = 0.18;
  let desiredBaseSpeed = 1;

  const isLocoClip = (lbl: string | null, std: StandardAnimationAction | null) =>
    std === 'walk' ||
    std === 'run' ||
    lbl === 'walk' ||
    lbl === 'run' ||
    lbl === 'sprint' ||
    lbl === 'crouchWalk' ||
    lbl === 'errante';

  const resolveClipAction = (nameOrAlias: string): { key: string; action: THREE.AnimationAction } | null => {
    if (!nameOrAlias) return null;
    if (clips[nameOrAlias]) return { key: nameOrAlias, action: clips[nameOrAlias] };
    const lower = nameOrAlias.toLowerCase().trim();
    if (clips[lower]) return { key: lower, action: clips[lower] };
    const clean = normalizeMeshyClipName(nameOrAlias);
    if (clean && clips[clean]) return { key: clean, action: clips[clean] };
    const canonical = resolveMeshyAliasKey(nameOrAlias);
    if (canonical) {
      if (clips[canonical]) return { key: canonical, action: clips[canonical] };
      if (
        (canonical === 'idle' ||
          canonical === 'walk' ||
          canonical === 'run' ||
          canonical === 'attack' ||
          canonical === 'hit' ||
          canonical === 'death') &&
        nativeActions[canonical]
      ) {
        return { key: canonical, action: nativeActions[canonical]! };
      }
      const spec = MESHY_CLIP_DICTIONARY[canonical];
      for (let i = 0; i < spec.variants.length; i++) {
        const v = spec.variants[i];
        if (clips[v]) return { key: canonical, action: clips[v] };
      }
    }
    return null;
  };

  const resolveClipName = (nameOrAlias: string): string | null => {
    const resolved = resolveClipAction(nameOrAlias);
    return resolved ? resolved.action.getClip().name : null;
  };

  const stopOtherActions = (keepAction: THREE.AnimationAction | null) => {
    for (let i = 0; i < createdActions.length; i++) {
      const other = createdActions[i];
      if (other !== keepAction) {
        other.stop();
        other.setEffectiveWeight(0);
        other.enabled = false;
      }
    }
  };

  const sweepFinishedFadeOuts = () => {
    for (let i = 0; i < createdActions.length; i++) {
      const act = createdActions[i];
      if (act === current) continue;
      if (act.getEffectiveWeight() <= 0.002 && (act.isRunning() || act.enabled)) {
        act.stop();
        act.setEffectiveWeight(0);
        act.enabled = false;
      }
    }
  };

  const fadeToAction = (
    next: THREE.AnimationAction,
    fadeSec: number,
    timeScale: number,
    forceRestart: boolean,
    label: string,
    standardAction: StandardAnimationAction | null,
    stopOthers = false,
  ) => {
    const clampedFade = Math.max(0.04, fadeSec);
    const prev = current;

    if (!forceRestart && next === current && currentName === label) {
      next.enabled = true;
      next.paused = false;
      next.setEffectiveTimeScale(timeScale);
      if (stopOthers) {
        stopOtherActions(next);
        next.setEffectiveWeight(1);
        if (!next.isRunning()) next.play();
      } else if (!next.isRunning() || next.getEffectiveWeight() < 0.98) {
        next.setEffectiveWeight(1);
        next.play();
      }
      currentStandardAction = standardAction;
      return;
    }

    // Preserve normalized stride phase when smoothly switching walk <-> run <-> sprint
    let syncedPhase = -1;
    if (
      !forceRestart &&
      !stopOthers &&
      prev &&
      prev !== next &&
      isLocoClip(currentName, currentStandardAction) &&
      isLocoClip(label, standardAction)
    ) {
      const curDur = prev.getClip().duration;
      if (curDur > 0.05) {
        syncedPhase = (prev.time / curDur) % 1;
        if (syncedPhase < 0) syncedPhase += 1;
      }
    }

    const canCrossFade =
      !stopOthers &&
      Boolean(prev && prev !== next && (prev.isRunning() || prev.getEffectiveWeight() > 0.01));

    // Explicitly stop any unrelated stale loops before activating the next action
    for (let i = 0; i < createdActions.length; i++) {
      const other = createdActions[i];
      if (other === next) continue;
      if (canCrossFade && other === prev) continue;
      other.stop();
      other.setEffectiveWeight(0);
      other.enabled = false;
    }

    const nextDur = next.getClip().duration;
    const prevWeight = next.getEffectiveWeight();
    next.enabled = true;
    next.paused = false;
    if (forceRestart || stopOthers || prevWeight <= 0.02) {
      next.reset();
    }
    if (syncedPhase >= 0 && nextDur > 0.05) {
      next.time = syncedPhase * nextDur;
    }
    next.setEffectiveTimeScale(timeScale);
    next.setEffectiveWeight(1);
    next.play();

    if (canCrossFade && prev && prev !== next) {
      prev.enabled = true;
      prev.paused = false;
      if (prevWeight > 0.05 && !forceRestart) {
        prev.fadeOut(clampedFade);
      } else {
        next.crossFadeFrom(prev, clampedFade, false);
      }
    }

    current = next;
    currentName = label;
    currentStandardAction = standardAction;
  };

  const handleFinished = (event: { action: THREE.AnimationAction }) => {
    if (lockedDeath) return;
    if (activeOneShot && event.action === activeOneShot.clipAction) {
      activeOneShot = null;
      const fallbackLocomotion = desiredBaseAction ?? (nativeActions.idle ? 'idle' : null);
      if (fallbackLocomotion && nativeActions[fallbackLocomotion]) {
        const next = nativeActions[fallbackLocomotion]!;
        next.setLoop(THREE.LoopRepeat, Infinity);
        next.clampWhenFinished = false;
        fadeToAction(
          next,
          desiredBaseFade,
          desiredBaseSpeed * nativeSpeedScale[fallbackLocomotion],
          false,
          fallbackLocomotion,
          fallbackLocomotion,
          fallbackLocomotion === 'idle',
        );
      }
    }
  };
  mixer.addEventListener('finished', handleFinished);

  const playClip = (
    name: string,
    fadeSec = 0.18,
    timeScale = 1,
    forceRestart = false,
    stopOtherLoops = false,
  ): boolean => {
    const resolved = resolveClipAction(name);
    if (!resolved) return false;
    const next = resolved.action;
    const resolvedKey = resolved.key;
    if (lockedDeath && resolvedKey !== 'death') return false;
    if (resolvedKey === 'death') {
      lockedDeath = true;
      activeOneShot = null;
      next.setLoop(THREE.LoopOnce, 1);
      next.clampWhenFinished = true;
    } else if (
      resolvedKey === 'throw' ||
      resolvedKey === 'hit' ||
      resolvedKey === 'punch' ||
      resolvedKey === 'reload'
    ) {
      next.setLoop(THREE.LoopOnce, 1);
      next.clampWhenFinished = resolvedKey === 'throw';
    } else {
      activeOneShot = null;
      desiredBaseAction = null;
      if (resolvedKey === 'jump') {
        next.setLoop(THREE.LoopOnce, 1);
        next.clampWhenFinished = true;
      } else {
        next.setLoop(THREE.LoopRepeat, Infinity);
        next.clampWhenFinished = false;
      }
    }
    const matchedStd =
      STANDARD_ANIMATION_ACTIONS.find((k) => nativeActions[k] === next) ?? null;
    fadeToAction(
      next,
      fadeSec,
      timeScale,
      forceRestart,
      resolvedKey,
      matchedStd,
      stopOtherLoops,
    );
    return true;
  };

  const setAction = (
    action: StandardAnimationAction,
    opts?: SetAnimationActionOptions,
  ): boolean => {
    const next = nativeActions[action];
    if (!next) return false;

    const fadeSec = opts?.fadeSec ?? (action === 'hit' ? 0.08 : action === 'attack' ? 0.1 : 0.18);
    const speedScale = nativeSpeedScale[action] ?? 1;
    const timeScale = (opts?.timeScale ?? 1) * speedScale;
    const forceRestart = opts?.forceRestart ?? false;
    const stopOtherLoops = opts?.stopOtherLoops ?? false;

    if (action === 'death') {
      lockedDeath = true;
      activeOneShot = null;
      next.setLoop(THREE.LoopOnce, 1);
      next.clampWhenFinished = true;
      fadeToAction(next, fadeSec, timeScale, forceRestart, action, 'death', true);
      return true;
    }

    if (lockedDeath) return false;

    if (action === 'hit' || action === 'attack') {
      const isOneShot = opts?.oneShot ?? (action === 'hit');
      if (isOneShot) {
        next.setLoop(THREE.LoopOnce, 1);
        next.clampWhenFinished = true;
        activeOneShot = { action, clipAction: next };
      } else {
        activeOneShot = null;
        next.setLoop(THREE.LoopRepeat, Infinity);
        next.clampWhenFinished = false;
      }
      fadeToAction(next, fadeSec, timeScale, forceRestart, action, action, stopOtherLoops);
      return true;
    }

    // Continuous locomotion ('idle' | 'walk' | 'run')
    desiredBaseAction = action;
    desiredBaseFade = fadeSec;
    desiredBaseSpeed = opts?.timeScale ?? 1;

    if (activeOneShot) {
      const oneShotStillPlaying =
        activeOneShot.clipAction.isRunning() && !activeOneShot.clipAction.paused;
      if (oneShotStillPlaying && !opts?.interruptOneShot) {
        return true;
      }
    }
    activeOneShot = null;
    next.setLoop(THREE.LoopRepeat, Infinity);
    next.clampWhenFinished = false;
    fadeToAction(next, fadeSec, timeScale, forceRestart, action, action, stopOtherLoops);
    return true;
  };

  const forceIdle = (fadeSec = 0.08): boolean => {
    if (lockedDeath) return false;
    activeOneShot = null;
    desiredBaseAction = 'idle';
    desiredBaseFade = fadeSec;
    desiredBaseSpeed = 1;
    const idleAction = nativeActions.idle ?? clips['idle'] ?? null;
    if (!idleAction) {
      stopOtherActions(null);
      current = null;
      currentName = null;
      currentStandardAction = null;
      return false;
    }
    idleAction.setLoop(THREE.LoopRepeat, Infinity);
    idleAction.clampWhenFinished = false;
    fadeToAction(idleAction, fadeSec, 1, false, 'idle', 'idle', true);
    return true;
  };

  const hasAction = (action: StandardAnimationAction): boolean => Boolean(nativeActions[action]);

  const hasActionForTag = (tag: CharacterAnimationTag, action: StandardAnimationAction): boolean => {
    for (let i = 0; i < entries.length; i++) {
      if (scoreClipForAction(entries[i].clean, action, tag, entries.length) > 0) return true;
    }
    return false;
  };

  const setTag = (nextTag: CharacterAnimationTag): void => {
    if (nextTag === activeTag) return;
    resolveDictionaryForTag(nextTag);
  };

  const getActionDuration = (action: StandardAnimationAction): number => {
    const act = nativeActions[action];
    return act ? act.getClip().duration : 0;
  };

  const getCurrentAction = (): StandardAnimationAction | null => currentStandardAction;

  const tick = (deltaSec: number) => {
    if (deltaSec > 0) {
      mixer.update(deltaSec);
      sweepFinishedFadeOuts();
    }
  };

  const resetClips = () => {
    mixer.stopAllAction();
    for (let i = 0; i < createdActions.length; i++) {
      createdActions[i].setEffectiveWeight(0);
      createdActions[i].enabled = false;
    }
    current = null;
    currentName = null;
    currentStandardAction = null;
    lockedDeath = false;
    activeOneShot = null;
    desiredBaseAction = null;
  };

  const disposeMixer = () => {
    mixer.removeEventListener('finished', handleFinished);
    mixer.stopAllAction();
    for (let i = 0; i < createdActions.length; i++) {
      mixer.uncacheAction(createdActions[i].getClip(), targetRoot);
    }
    mixer.uncacheRoot(targetRoot);
    current = null;
    currentName = null;
    currentStandardAction = null;
    lockedDeath = false;
    activeOneShot = null;
    desiredBaseAction = null;
  };

  return {
    mixer,
    clips,
    get tag() {
      return activeTag;
    },
    actionDict,
    nativeActions,
    playClip,
    setAction,
    forceIdle,
    resolveClipName,
    hasAction,
    hasActionForTag,
    setTag,
    getActionDuration,
    getCurrentAction,
    tick,
    resetClips,
    disposeMixer,
  };
}

const _attachRotEuler = new THREE.Euler();
const _attachRotQuat = new THREE.Quaternion();

export interface AttachBaseSnapshot {
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  scale: THREE.Vector3;
}

export function applyAttachmentOffsetToNode(
  node: THREE.Object3D | null | undefined,
  transform?: AttachmentTransform | null,
): void {
  if (!node) return;
  let base = node.userData.__attachBase as AttachBaseSnapshot | undefined;
  if (!base) {
    base = {
      pos: node.position.clone(),
      quat: node.quaternion.clone(),
      scale: node.scale.clone(),
    };
    node.userData.__attachBase = base;
  }

  if (!transform) {
    node.position.copy(base.pos);
    node.quaternion.copy(base.quat);
    node.scale.copy(base.scale);
    return;
  }

  node.position.set(
    base.pos.x + transform.posX,
    base.pos.y + transform.posY,
    base.pos.z + transform.posZ,
  );
  _attachRotEuler.set(
    THREE.MathUtils.degToRad(transform.rotX),
    THREE.MathUtils.degToRad(transform.rotY),
    THREE.MathUtils.degToRad(transform.rotZ),
    'XYZ',
  );
  _attachRotQuat.setFromEuler(_attachRotEuler);
  node.quaternion.copy(base.quat).multiply(_attachRotQuat);

  const uni = transform.scale;
  node.scale.set(
    base.scale.x * uni * transform.scaleX,
    base.scale.y * uni * transform.scaleY,
    base.scale.z * uni * transform.scaleZ,
  );
}

export interface BaseCharacterConfig {
  entityId: string;
  label: string;
  role: CharacterClipRole;
  tag?: CharacterAnimationTag;
  root: THREE.Group;
  bodyPivot: THREE.Group;
  modelRoot: THREE.Object3D;
  isCustomGlb: boolean;
  bones: HumanoidBoneMap;
  clipController?: ClipController | null;
  onDispose?: () => void;
}

/**
 * Generic scalable base class for every humanoid/animated character in Zona Cero 2050
 * (Ricardo, Chispa, Mateo, Zombies, and any future custom .glb characters).
 * Unifies GLTF/GLB skeleton & tag-based native animation playback, universal bone/socket resolution,
 * and dynamic attachment transform application.
 */
export class BaseCharacter {
  readonly entityId: string;
  readonly label: string;
  readonly role: CharacterClipRole;
  readonly root: THREE.Group;
  readonly bodyPivot: THREE.Group;
  readonly modelRoot: THREE.Object3D;
  readonly isCustomGlb: boolean;
  readonly bones: HumanoidBoneMap;
  readonly mixer: THREE.AnimationMixer | null;
  readonly clips: Record<string, THREE.AnimationAction>;
  readonly actionDict: NativeAnimationDictionaryInfo;
  readonly nativeActions: Record<StandardAnimationAction, THREE.AnimationAction | null>;
  readonly sockets = new Map<string, THREE.Group>();
  readonly attachments = new Map<PlayerAttachableId, THREE.Object3D[]>();

  private _tag: CharacterAnimationTag;
  private readonly _playClip: ClipController['playClip'];
  private readonly _setAction: ClipController['setAction'];
  private readonly _forceIdle: ClipController['forceIdle'];
  private readonly _resolveClipName: ClipController['resolveClipName'];
  private readonly _hasAction: ClipController['hasAction'];
  private readonly _hasActionForTag: ClipController['hasActionForTag'];
  private readonly _setTag: ClipController['setTag'];
  private readonly _getActionDuration: ClipController['getActionDuration'];
  private readonly _getCurrentAction: ClipController['getCurrentAction'];
  private readonly _tick: ClipController['tick'];
  private readonly _resetClips: ClipController['resetClips'];
  private readonly _disposeMixer: ClipController['disposeMixer'];
  private readonly _disposers: Array<() => void> = [];

  constructor(config: BaseCharacterConfig) {
    this.entityId = config.entityId;
    this.label = config.label;
    this.role = config.role;
    this._tag =
      config.tag ??
      (config.role === 'player' ? 'player' : config.role === 'zombie' ? 'zombie' : 'npc');
    this.root = config.root;
    this.bodyPivot = config.bodyPivot;
    this.modelRoot = config.modelRoot;
    this.isCustomGlb = config.isCustomGlb;
    this.bones = config.bones;

    tagCanonicalBoneNames(this.bones);

    const ctrl = config.clipController;
    this.mixer = ctrl?.mixer ?? null;
    this.clips = ctrl?.clips ?? {};
    this.actionDict = ctrl?.actionDict ?? {
      tag: this._tag,
      mappedClips: {},
      availableActions: [],
      allClipNames: [],
    };
    this.nativeActions = ctrl?.nativeActions ?? {
      idle: null,
      walk: null,
      run: null,
      attack: null,
      hit: null,
      death: null,
    };
    this._playClip = ctrl?.playClip ?? (() => false);
    this._setAction = ctrl?.setAction ?? (() => false);
    this._forceIdle = ctrl?.forceIdle ?? (() => false);
    this._resolveClipName = ctrl?.resolveClipName ?? (() => null);
    this._hasAction = ctrl?.hasAction ?? (() => false);
    this._hasActionForTag = ctrl?.hasActionForTag ?? (() => false);
    this._setTag = ctrl?.setTag ?? (() => {});
    this._getActionDuration = ctrl?.getActionDuration ?? (() => 0);
    this._getCurrentAction = ctrl?.getCurrentAction ?? (() => null);
    this._tick = ctrl?.tick ?? (() => {});
    this._resetClips = ctrl?.resetClips ?? (() => {});
    this._disposeMixer = ctrl?.disposeMixer ?? (() => {});
    if (config.onDispose) {
      this._disposers.push(config.onDispose);
    }
  }

  get tag(): CharacterAnimationTag {
    return this._tag;
  }

  setAnimationTag(nextTag: CharacterAnimationTag): void {
    this._tag = nextTag;
    this._setTag(nextTag);
  }

  static fromModelNode(params: {
    entityId: string;
    label: string;
    role: CharacterClipRole;
    tag?: CharacterAnimationTag;
    root: THREE.Group;
    bodyPivot: THREE.Group;
    model: THREE.Object3D;
    animations?: THREE.AnimationClip[];
    isCustomGlb: boolean;
    onDispose?: () => void;
  }): BaseCharacter {
    const bones = extractHumanoidBones(params.model);
    const resolvedTag: CharacterAnimationTag =
      params.tag ??
      (params.role === 'player' ? 'player' : params.role === 'zombie' ? 'zombie' : 'npc');
    const clipController =
      (params.animations && params.animations.length > 0) || params.isCustomGlb
        ? createClipController(params.model, params.animations ?? [], params.role, resolvedTag)
        : null;
    return new BaseCharacter({
      entityId: params.entityId,
      label: params.label,
      role: params.role,
      tag: resolvedTag,
      root: params.root,
      bodyPivot: params.bodyPivot,
      modelRoot: params.model,
      isCustomGlb: params.isCustomGlb,
      bones,
      clipController,
      onDispose: params.onDispose,
    });
  }

  resolveBone(name: CanonicalBoneId | string): THREE.Object3D | null {
    switch (name) {
      case 'hips':
        return this.bones.hips?.node ?? findNodeByUniversalName(this.modelRoot, 'hips');
      case 'spine':
        return this.bones.spine?.node ?? findNodeByUniversalName(this.modelRoot, 'spine');
      case 'chest':
        return (
          this.bones.chest?.node ??
          this.bones.spine?.node ??
          findNodeByUniversalName(this.modelRoot, 'chest')
        );
      case 'neck':
        return this.bones.neck?.node ?? findNodeByUniversalName(this.modelRoot, 'neck');
      case 'head':
        return this.bones.head?.node ?? findNodeByUniversalName(this.modelRoot, 'head');
      case 'arm_l':
        return this.bones.leftArm?.node ?? findNodeByUniversalName(this.modelRoot, 'arm_l');
      case 'forearm_l':
        return this.bones.leftForeArm?.node ?? findNodeByUniversalName(this.modelRoot, 'forearm_l');
      case 'hand_l':
        return this.bones.leftHand ?? findNodeByUniversalName(this.modelRoot, 'hand_l');
      case 'arm_r':
        return this.bones.rightArm?.node ?? findNodeByUniversalName(this.modelRoot, 'arm_r');
      case 'forearm_r':
        return (
          this.bones.rightForeArm?.node ?? findNodeByUniversalName(this.modelRoot, 'forearm_r')
        );
      case 'hand_r':
        return this.bones.rightHand ?? findNodeByUniversalName(this.modelRoot, 'hand_r');
      case 'thigh_l':
        return this.bones.leftUpLeg?.node ?? findNodeByUniversalName(this.modelRoot, 'thigh_l');
      case 'shin_l':
        return this.bones.leftLeg?.node ?? findNodeByUniversalName(this.modelRoot, 'shin_l');
      case 'foot_l':
        return this.bones.leftFoot?.node ?? findNodeByUniversalName(this.modelRoot, 'foot_l');
      case 'thigh_r':
        return this.bones.rightUpLeg?.node ?? findNodeByUniversalName(this.modelRoot, 'thigh_r');
      case 'shin_r':
        return this.bones.rightLeg?.node ?? findNodeByUniversalName(this.modelRoot, 'shin_r');
      case 'foot_r':
        return this.bones.rightFoot?.node ?? findNodeByUniversalName(this.modelRoot, 'foot_r');
      default:
        return findNodeByUniversalName(this.modelRoot, name);
    }
  }

  getSocket(id: string): THREE.Group | null {
    return this.sockets.get(id) ?? null;
  }

  setSocket(id: string, group: THREE.Group): THREE.Group {
    group.userData.__isAttachmentSocket = true;
    if (!group.name) group.name = `socket_${id}`;
    this.sockets.set(id, group);
    return group;
  }

  registerAttachment(itemId: PlayerAttachableId, node: THREE.Object3D | null | undefined): void {
    if (!node) return;
    const list = this.attachments.get(itemId);
    if (list) {
      if (!list.includes(node)) list.push(node);
    } else {
      this.attachments.set(itemId, [node]);
    }
  }

  clearAttachmentsForItem(itemId: PlayerAttachableId): void {
    this.attachments.delete(itemId);
  }

  getAttachmentNodes(itemId: PlayerAttachableId): THREE.Object3D[] {
    return this.attachments.get(itemId) ?? [];
  }

  getAttachmentNode(itemId: PlayerAttachableId): THREE.Object3D | null {
    return this.attachments.get(itemId)?.[0] ?? null;
  }

  applyAttachmentTransforms(
    transforms?: Partial<Record<PlayerAttachableId, AttachmentTransform>> | null,
  ): void {
    const map = transforms ?? {};
    this.attachments.forEach((nodes, itemId) => {
      const t = map[itemId];
      for (let i = 0; i < nodes.length; i++) {
        applyAttachmentOffsetToNode(nodes[i], t);
      }
    });
  }

  playClip(
    name: string,
    fadeSec = 0.18,
    timeScale = 1,
    forceRestart = false,
    stopOtherLoops = false,
  ): boolean {
    return this._playClip(name, fadeSec, timeScale, forceRestart, stopOtherLoops);
  }

  setAction(action: StandardAnimationAction, opts?: SetAnimationActionOptions): boolean {
    return this._setAction(action, opts);
  }

  forceIdle(fadeSec = 0.08): boolean {
    return this._forceIdle(fadeSec);
  }

  resolveClip(nameOrAlias: string): string | null {
    return this._resolveClipName(nameOrAlias);
  }

  hasAction(action: StandardAnimationAction): boolean {
    return this._hasAction(action);
  }

  hasTagAction(tag: CharacterAnimationTag, action: StandardAnimationAction): boolean {
    return this._hasActionForTag(tag, action);
  }

  getActionDuration(action: StandardAnimationAction): number {
    return this._getActionDuration(action);
  }

  getCurrentAction(): StandardAnimationAction | null {
    return this._getCurrentAction();
  }

  resetClips(): void {
    this._resetClips();
  }

  updateAnimation(deltaSec: number): void {
    if (this.mixer && deltaSec > 0) {
      this._tick(deltaSec);
    }
  }

  addDisposer(fn: () => void): void {
    this._disposers.push(fn);
  }

  dispose(): void {
    this._disposeMixer();
    for (let i = 0; i < this._disposers.length; i++) {
      this._disposers[i]();
    }
    this._disposers.length = 0;
  }
}
