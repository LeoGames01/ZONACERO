import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { StudioPreviewSubject } from '../game/engine';
import type {
  AttachmentTargetScope,
  AttachmentTransform,
  AttachmentTransformsState,
  PlayerAttachableId,
  PreviewPoseId,
  ZombieAttachableId,
} from '../game/types';

export type GizmoMode = 'translate' | 'rotate' | 'scale';
export type GizmoSpace = 'local' | 'world';
export type ViewportCameraAction = 'front' | 'right' | 'back' | 'left' | 'focus_object' | 'reset_view';

export interface CameraCommand {
  seq: number;
  action: ViewportCameraAction;
}

interface AttachBaseSnapshot {
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  scale: THREE.Vector3;
}

interface AttachmentStudioViewportProps {
  entityId: AttachmentTargetScope;
  isZombieEntity: boolean;
  pose: PreviewPoseId;
  selectedItem: PlayerAttachableId;
  zombieModelId: string;
  armorFlags: { helmet: boolean; vest: boolean; backpack: boolean };
  transforms: AttachmentTransformsState;
  modelSignature: string;
  gizmoMode: GizmoMode;
  gizmoSpace: GizmoSpace;
  gizmoVisible: boolean;
  autoRotate: boolean;
  cameraCommand: CameraCommand | null;
  onCreatePreview: (
    entityId: AttachmentTargetScope,
    zombieModelId: string,
    selectedZombieItem: ZombieAttachableId,
  ) => Promise<StudioPreviewSubject | null>;
  onGizmoTransformChange: (patch: Partial<AttachmentTransform>) => void;
  onCanvasInteract?: () => void;
  onLoadingChange?: (loading: boolean) => void;
}

const GIZMO_EMIT_THROTTLE_MS = 60;

function roundVal(n: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function createStudioFloorTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const cx = 128;
    const cy = 128;
    const grad = ctx.createRadialGradient(cx, cy, 6, cx, cy, 125);
    grad.addColorStop(0, '#2a3342');
    grad.addColorStop(0.55, '#19202b');
    grad.addColorStop(0.88, '#10151e');
    grad.addColorStop(1, '#090d14');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = 'rgba(245, 158, 11, 0.22)';
    ctx.lineWidth = 1.5;
    [36, 68, 100, 120].forEach((r) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 16, cy + Math.sin(a) * 16);
      ctx.lineTo(cx + Math.cos(a) * 120, cy + Math.sin(a) * 120);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 1;
  return tex;
}

export const AttachmentStudioViewport: React.FC<AttachmentStudioViewportProps> = React.memo(({
  entityId,
  isZombieEntity,
  pose,
  selectedItem,
  zombieModelId,
  armorFlags,
  transforms,
  modelSignature,
  gizmoMode,
  gizmoSpace,
  gizmoVisible,
  autoRotate,
  cameraCommand,
  onCreatePreview,
  onGizmoTransformChange,
  onCanvasInteract,
  onLoadingChange,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);

  const autoRotateRef = useRef(autoRotate);
  autoRotateRef.current = autoRotate;

  const gizmoModeRef = useRef(gizmoMode);
  gizmoModeRef.current = gizmoMode;

  const gizmoVisibleRef = useRef(gizmoVisible);
  gizmoVisibleRef.current = gizmoVisible;

  const onGizmoChangeRef = useRef(onGizmoTransformChange);
  onGizmoChangeRef.current = onGizmoTransformChange;

  const onCanvasInteractRef = useRef(onCanvasInteract);
  onCanvasInteractRef.current = onCanvasInteract;

  const onLoadingChangeRef = useRef(onLoadingChange);
  onLoadingChangeRef.current = onLoadingChange;

  const subjectRef = useRef<StudioPreviewSubject | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const transformControlsRef = useRef<TransformControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const isDraggingGizmoRef = useRef(false);

  // On-demand rendering coordination refs
  const requestRenderRef = useRef<(stepSubject?: boolean) => void>(() => {});
  const pendingSubjectUpdateRef = useRef(false);
  const pendingTransformsApplyRef = useRef(false);

  const cameraLerpRef = useRef<{
    active: boolean;
    desiredPos: THREE.Vector3;
    desiredTarget: THREE.Vector3;
  }>({
    active: false,
    desiredPos: new THREE.Vector3(0.32, 1.32, 2.55),
    desiredTarget: new THREE.Vector3(0, 0.98, 0),
  });

  const latestStateRef = useRef({
    entityId,
    isZombieEntity,
    pose,
    selectedItem,
    armorFlags,
    transforms,
  });
  latestStateRef.current = {
    entityId,
    isZombieEntity,
    pose,
    selectedItem,
    armorFlags,
    transforms,
  };

  // Scratch math objects for gizmo readback (zero allocations during drag)
  const scratchRef = useRef({
    invBaseQuat: new THREE.Quaternion(),
    deltaQuat: new THREE.Quaternion(),
    deltaEuler: new THREE.Euler(0, 0, 0, 'XYZ'),
    worldPos: new THREE.Vector3(),
  });

  const syncGizmoAttachment = () => {
    const gizmo = transformControlsRef.current;
    const subj = subjectRef.current;
    if (!gizmo) return;
    if (!subj || !gizmoVisibleRef.current) {
      gizmo.detach();
      return;
    }
    const cur = latestStateRef.current;
    const targetNode = subj.getTargetNode(cur.selectedItem);
    if (targetNode) {
      gizmo.attach(targetNode);
    } else {
      gizmo.detach();
    }
  };

  // Initialize Three.js Studio Scene once with On-Demand Rendering (DLS)
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = Math.max(240, container.clientWidth || window.innerWidth);
    const height = Math.max(240, container.clientHeight || window.innerHeight);

    const isMobileTouch =
      window.matchMedia?.('(pointer: coarse)')?.matches ||
      navigator.maxTouchPoints > 0 ||
      window.innerWidth < 1024;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobileTouch,
      powerPreference: 'high-performance',
      alpha: false,
    });
    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    const isSoftwareGl = /swiftshader|llvmpipe|software|mesa/i.test(rendererStr);

    const dpr = window.devicePixelRatio || 1;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : isMobileTouch ? Math.min(dpr, 1.25) : Math.min(dpr, 1.75),
    );
    renderer.setSize(width, height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.14;
    // Disable dynamic shadow map passes inside editor for maximum mobile GPU performance
    renderer.shadowMap.enabled = false;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#090d14');
    // Fog intentionally disabled in editor viewport to reduce mobile fragment shader cost
    scene.fog = null;
    sceneRef.current = scene;

    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRT = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envRT.texture;
    roomEnv.dispose();
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.03, 40);
    camera.position.set(0.32, 1.32, 2.55);
    cameraRef.current = camera;

    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.target.set(0, 0.98, 0);
    orbit.enableDamping = !isSoftwareGl;
    orbit.dampingFactor = 0.1;
    orbit.enablePan = true;
    orbit.enableZoom = true;
    orbit.minDistance = 0.45;
    orbit.maxDistance = 5.4;
    orbit.minPolarAngle = 0.1;
    orbit.maxPolarAngle = Math.PI * 0.58;
    orbit.update();
    controlsRef.current = orbit;

    const gizmo = new TransformControls(camera, renderer.domElement);
    gizmo.setMode(gizmoModeRef.current);
    gizmo.setSpace('local');
    gizmo.setSize(isMobileTouch ? 0.92 : 0.82);
    const gizmoHelper = gizmo.getHelper();
    scene.add(gizmoHelper);
    transformControlsRef.current = gizmo;

    // 3-point lightweight studio lighting (no castShadow)
    const hemi = new THREE.HemisphereLight('#bfd8ff', '#1c2028', 0.82);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight('#fff2dc', 2.2);
    keyLight.position.set(2.8, 4.4, 3.2);
    keyLight.castShadow = false;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#7ec8ff', 1.2);
    rimLight.position.set(-2.6, 2.8, -3.1);
    scene.add(rimLight);

    const fillLight = new THREE.DirectionalLight('#ffb978', 0.58);
    fillLight.position.set(-2.4, 1.4, 2.2);
    scene.add(fillLight);

    // Lightweight turntable platform using MeshLambertMaterial (no PBR overhead)
    const floorTex = createStudioFloorTexture();
    const floorGeo = new THREE.CircleGeometry(2.8, 32);
    const floorMat = new THREE.MeshLambertMaterial({
      map: floorTex,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = false;
    floorMesh.castShadow = false;
    scene.add(floorMesh);

    const plinthGeo = new THREE.CylinderGeometry(1.18, 1.28, 0.04, 32);
    const plinthMat = new THREE.MeshLambertMaterial({
      color: '#1b2330',
    });
    const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
    plinthMesh.position.y = -0.021;
    plinthMesh.receiveShadow = false;
    plinthMesh.castShadow = false;
    scene.add(plinthMesh);

    const afterDraw = (cb: () => void) => {
      const c = gl.canvas as HTMLCanvasElement & { afterDraw?: (fn: () => void) => void };
      if (typeof c.afterDraw === 'function') c.afterDraw(cb);
      else requestAnimationFrame(cb);
    };

    let disposed = false;
    let rafId = 0;
    let scheduled = false;
    let isRenderingFrame = false;
    let lastTime = performance.now();

    const renderFrame = (now = performance.now()) => {
      scheduled = false;
      if (disposed) return;

      const rawDt = (now - lastTime) * 0.001;
      lastTime = now;
      // When waking up from idle (>120ms), start cleanly with a single 60Hz frame step
      const dt = rawDt > 0.12 ? 0.016 : Math.min(0.05, Math.max(0.001, rawDt));

      if (cameraLerpRef.current.active) {
        const lerpAlpha = Math.min(1, dt * 9.0);
        camera.position.lerp(cameraLerpRef.current.desiredPos, lerpAlpha);
        orbit.target.lerp(cameraLerpRef.current.desiredTarget, lerpAlpha);
        if (
          camera.position.distanceTo(cameraLerpRef.current.desiredPos) < 0.008 &&
          orbit.target.distanceTo(cameraLerpRef.current.desiredTarget) < 0.008
        ) {
          camera.position.copy(cameraLerpRef.current.desiredPos);
          orbit.target.copy(cameraLerpRef.current.desiredTarget);
          cameraLerpRef.current.active = false;
        }
      }

      if (pendingTransformsApplyRef.current && subjectRef.current && !isDraggingGizmoRef.current) {
        pendingTransformsApplyRef.current = false;
        subjectRef.current.applyTransforms(latestStateRef.current.transforms);
      }

      orbit.autoRotate = autoRotateRef.current && !isDraggingGizmoRef.current;
      orbit.autoRotateSpeed = 2.4;

      isRenderingFrame = true;
      const orbitMoved = orbit.update(dt);
      isRenderingFrame = false;

      if (pendingSubjectUpdateRef.current) {
        pendingSubjectUpdateRef.current = false;
        subjectRef.current?.update(dt);
      }

      renderer.render(scene, camera);

      const keepAnimating =
        orbitMoved ||
        cameraLerpRef.current.active ||
        (autoRotateRef.current && !isDraggingGizmoRef.current);

      if (keepAnimating) {
        scheduleFrame();
      }
    };

    const scheduleFrame = () => {
      if (disposed || scheduled) return;
      scheduled = true;
      if (isSoftwareGl) {
        afterDraw(() => renderFrame(performance.now()));
      } else {
        rafId = requestAnimationFrame(renderFrame);
      }
    };

    const requestRender = (stepSubject = false) => {
      if (stepSubject) {
        pendingSubjectUpdateRef.current = true;
      }
      scheduleFrame();
    };
    requestRenderRef.current = requestRender;

    // Throttled gizmo change emitter so rapid mobile pointermove events don't saturate React/JS
    let pendingGizmoPatch: Partial<AttachmentTransform> | null = null;
    let gizmoEmitTimer: number | null = null;
    let lastGizmoEmitTime = 0;

    const flushPendingGizmoPatch = () => {
      if (gizmoEmitTimer !== null) {
        clearTimeout(gizmoEmitTimer);
        gizmoEmitTimer = null;
      }
      if (!pendingGizmoPatch) return;
      const toSend = pendingGizmoPatch;
      pendingGizmoPatch = null;
      lastGizmoEmitTime = performance.now();
      onGizmoChangeRef.current(toSend);
    };

    const queueGizmoPatch = (patch: Partial<AttachmentTransform>) => {
      pendingGizmoPatch = pendingGizmoPatch ? { ...pendingGizmoPatch, ...patch } : patch;
      const elapsed = performance.now() - lastGizmoEmitTime;
      if (elapsed >= GIZMO_EMIT_THROTTLE_MS) {
        flushPendingGizmoPatch();
      } else if (gizmoEmitTimer === null) {
        gizmoEmitTimer = window.setTimeout(() => {
          gizmoEmitTimer = null;
          flushPendingGizmoPatch();
        }, GIZMO_EMIT_THROTTLE_MS - elapsed);
      }
    };

    const handleUserInteractStart = () => {
      cameraLerpRef.current.active = false;
      onCanvasInteractRef.current?.();
      requestRender();
    };
    orbit.addEventListener('start', handleUserInteractStart);

    const handleOrbitChange = () => {
      if (!isRenderingFrame) {
        requestRender();
      }
    };
    orbit.addEventListener('change', handleOrbitChange);

    const handleCanvasPointerDown = () => {
      onCanvasInteractRef.current?.();
      requestRender();
    };
    renderer.domElement.addEventListener('pointerdown', handleCanvasPointerDown);

    const handleDraggingChanged = (event: { value: unknown }) => {
      const dragging = Boolean(event.value);
      isDraggingGizmoRef.current = dragging;
      orbit.enabled = !dragging;
      if (dragging) {
        cameraLerpRef.current.active = false;
        onCanvasInteractRef.current?.();
      } else {
        flushPendingGizmoPatch();
      }
      requestRender();
    };
    gizmo.addEventListener('dragging-changed', handleDraggingChanged);

    const handleGizmoVisualChange = () => {
      if (!isRenderingFrame) {
        requestRender();
      }
    };
    gizmo.addEventListener('change', handleGizmoVisualChange);

    const handleObjectChange = () => {
      if (!isDraggingGizmoRef.current) return;
      const targetNode = gizmo.object;
      if (!targetNode) return;
      const base = targetNode.userData.__attachBase as AttachBaseSnapshot | undefined;
      if (!base) return;

      // Redraw 3D canvas immediately for responsive gizmo manipulation
      requestRender();

      const mode = gizmo.getMode();
      const s = scratchRef.current;

      if (mode === 'translate') {
        const posX = roundVal(clamp(targetNode.position.x - base.pos.x, -0.8, 0.8), 3);
        const posY = roundVal(clamp(targetNode.position.y - base.pos.y, -0.8, 0.8), 3);
        const posZ = roundVal(clamp(targetNode.position.z - base.pos.z, -0.8, 0.8), 3);
        queueGizmoPatch({ posX, posY, posZ });
      } else if (mode === 'rotate') {
        s.invBaseQuat.copy(base.quat).invert();
        s.deltaQuat.copy(s.invBaseQuat).multiply(targetNode.quaternion);
        s.deltaEuler.setFromQuaternion(s.deltaQuat, 'XYZ');
        const rotX = roundVal(clamp(THREE.MathUtils.radToDeg(s.deltaEuler.x), -180, 180), 1);
        const rotY = roundVal(clamp(THREE.MathUtils.radToDeg(s.deltaEuler.y), -180, 180), 1);
        const rotZ = roundVal(clamp(THREE.MathUtils.radToDeg(s.deltaEuler.z), -180, 180), 1);
        queueGizmoPatch({ rotX, rotY, rotZ });
      } else if (mode === 'scale') {
        const rx = clamp(targetNode.scale.x / Math.max(1e-5, base.scale.x), 0.2, 3.0);
        const ry = clamp(targetNode.scale.y / Math.max(1e-5, base.scale.y), 0.2, 3.0);
        const rz = clamp(targetNode.scale.z / Math.max(1e-5, base.scale.z), 0.2, 3.0);
        if (Math.abs(rx - ry) < 0.008 && Math.abs(ry - rz) < 0.008) {
          queueGizmoPatch({
            scale: roundVal(rx, 2),
            scaleX: 1,
            scaleY: 1,
            scaleZ: 1,
          });
        } else {
          queueGizmoPatch({
            scale: 1,
            scaleX: roundVal(rx, 2),
            scaleY: roundVal(ry, 2),
            scaleZ: roundVal(rz, 2),
          });
        }
      }
    };
    gizmo.addEventListener('objectChange', handleObjectChange);

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.max(200, Math.floor(entry.contentRect.width));
      const h = Math.max(200, Math.floor(entry.contentRect.height));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      requestRender();
    });
    resizeObserver.observe(container);

    // Draw initial frame
    requestRender(true);

    return () => {
      disposed = true;
      requestRenderRef.current = () => {};
      if (gizmoEmitTimer !== null) {
        clearTimeout(gizmoEmitTimer);
        gizmoEmitTimer = null;
      }
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointerdown', handleCanvasPointerDown);
      orbit.removeEventListener('start', handleUserInteractStart);
      orbit.removeEventListener('change', handleOrbitChange);
      orbit.dispose();
      gizmo.removeEventListener('dragging-changed', handleDraggingChanged);
      gizmo.removeEventListener('change', handleGizmoVisualChange);
      gizmo.removeEventListener('objectChange', handleObjectChange);
      gizmo.detach();
      scene.remove(gizmoHelper);
      gizmo.dispose();
      if (subjectRef.current) {
        scene.remove(subjectRef.current.group);
        subjectRef.current.dispose();
        subjectRef.current = null;
      }
      floorGeo.dispose();
      floorMat.dispose();
      floorTex.dispose();
      plinthGeo.dispose();
      plinthMat.dispose();
      envRT.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
      controlsRef.current = null;
      transformControlsRef.current = null;
      cameraRef.current = null;
    };
  }, []);

  // Build or rebuild subject when entity, zombie target, or custom GLB files change
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    let cancelled = false;
    onLoadingChangeRef.current?.(true);

    const zombieKey: ZombieAttachableId = isZombieEntity
      ? ((['helmet', 'vest', 'rifle', 'pistol', 'baton'].includes(selectedItem)
          ? selectedItem
          : 'helmet') as ZombieAttachableId)
      : 'helmet';
    void onCreatePreview(entityId, zombieModelId, zombieKey).then((nextSubject) => {
      if (cancelled) {
        nextSubject?.dispose();
        return;
      }
      if (transformControlsRef.current) {
        transformControlsRef.current.detach();
      }
      if (subjectRef.current) {
        scene.remove(subjectRef.current.group);
        subjectRef.current.dispose();
        subjectRef.current = null;
      }
      if (nextSubject) {
        // Strip shadows from preview meshes for mobile GPU performance
        nextSubject.group.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            obj.castShadow = false;
            obj.receiveShadow = false;
          }
        });
        subjectRef.current = nextSubject;
        scene.add(nextSubject.group);
        const cur = latestStateRef.current;
        if (!cur.isZombieEntity) {
          nextSubject.setPlayerPose(cur.pose, cur.selectedItem, cur.armorFlags);
        }
        nextSubject.applyTransforms(cur.transforms);
        syncGizmoAttachment();
      }
      onLoadingChangeRef.current?.(false);
      requestRenderRef.current(true);
    });

    return () => {
      cancelled = true;
    };
  }, [
    entityId,
    isZombieEntity,
    zombieModelId,
    isZombieEntity ? selectedItem : '',
    modelSignature,
    onCreatePreview,
  ]);

  // Apply pose & armor visibility and re-attach gizmo to active item
  useEffect(() => {
    const subj = subjectRef.current;
    if (!subj) return;
    if (!isZombieEntity) {
      subj.setPlayerPose(pose, selectedItem, armorFlags);
    }
    syncGizmoAttachment();
    requestRenderRef.current(true);
  }, [entityId, isZombieEntity, pose, selectedItem, armorFlags]);

  // Update Gizmo mode, space, and visibility
  useEffect(() => {
    const gizmo = transformControlsRef.current;
    if (!gizmo) return;
    gizmo.setMode(gizmoMode);
    gizmo.setSpace(gizmoSpace);
    syncGizmoAttachment();
    requestRenderRef.current();
  }, [gizmoMode, gizmoSpace, gizmoVisible]);

  // Trigger on-demand auto-rotate start
  useEffect(() => {
    requestRenderRef.current();
  }, [autoRotate]);

  // Coalesce slider/transform matrix updates to at most once per rendered frame
  useEffect(() => {
    if (isDraggingGizmoRef.current) return;
    if (!subjectRef.current) return;
    pendingTransformsApplyRef.current = true;
    requestRenderRef.current();
  }, [transforms]);

  // Handle imperative camera focus commands
  useEffect(() => {
    if (!cameraCommand) return;
    const cam = cameraRef.current;
    const orbit = controlsRef.current;
    if (!cam || !orbit) return;

    const focusYaw = (yaw: number, distance = 2.45, targetY = 0.98) => {
      cameraLerpRef.current.desiredTarget.set(0, targetY, 0);
      cameraLerpRef.current.desiredPos.set(
        Math.sin(yaw) * distance,
        targetY + 0.34,
        Math.cos(yaw) * distance,
      );
      cameraLerpRef.current.active = true;
      requestRenderRef.current();
    };

    switch (cameraCommand.action) {
      case 'front':
        focusYaw(0);
        break;
      case 'right':
        focusYaw(Math.PI * 0.5);
        break;
      case 'back':
        focusYaw(Math.PI);
        break;
      case 'left':
        focusYaw(-Math.PI * 0.5);
        break;
      case 'reset_view':
        focusYaw(0.14, 2.55, 0.98);
        break;
      case 'focus_object': {
        const subj = subjectRef.current;
        const node = subj?.getTargetNode(selectedItem);
        if (node) {
          subj?.group.updateMatrixWorld(true);
          node.getWorldPosition(scratchRef.current.worldPos);
          const wp = scratchRef.current.worldPos;
          cameraLerpRef.current.desiredTarget.copy(wp);
          cameraLerpRef.current.desiredPos.set(wp.x + 0.34, wp.y + 0.22, wp.z + 0.92);
          cameraLerpRef.current.active = true;
          requestRenderRef.current();
        } else {
          focusYaw(0.25, 1.55, 1.25);
        }
        break;
      }
    }
  }, [cameraCommand, entityId, selectedItem]);

  return (
    <div ref={mountRef} className="absolute inset-0 h-full w-full touch-none cursor-grab active:cursor-grabbing" />
  );
});
