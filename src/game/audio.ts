// Procedural Web Audio API synthesizer + 3D spatial ambient audio engine

const PICKUP_HZ = [329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99];

export interface SpatialAmbienceFrame {
  dt: number;
  elapsed: number;
  gameState: string;
  activeZone: 'exterior_9_julio' | 'colon_interior';
  isSandbox: boolean;
  insideFastFood: boolean;
  dayFactor: number;
  twilight: number;
  playerX: number;
  playerY: number;
  playerZ: number;
  listenerX: number;
  listenerY: number;
  listenerZ: number;
  forwardX: number;
  forwardY: number;
  forwardZ: number;
  upX: number;
  upY: number;
  upZ: number;
  campfireX: number;
  campfireY: number;
  campfireZ: number;
  campfireWarmth: number;
  nearestFireX: number;
  nearestFireY: number;
  nearestFireZ: number;
  hasActiveFire: boolean;
  colonEntranceX: number;
  colonEntranceY: number;
  colonEntranceZ: number;
  colonUnlocked: boolean;
  fastFoodX: number;
  fastFoodY: number;
  fastFoodZ: number;
  boilerX: number;
  boilerY: number;
  boilerZ: number;
  alertedZombies: number;
  nearestThreatX: number;
  nearestThreatY: number;
  nearestThreatZ: number;
  hasThreatHint: boolean;
}

export interface SpatialPos {
  x: number;
  y: number;
  z: number;
}

export type FootstepSurface =
  | 'asphalt'
  | 'gravel'
  | 'plaza'
  | 'marble'
  | 'carpet'
  | 'wood'
  | 'steel'
  | 'tile'
  | 'water'
  | 'grass';

export interface ZombieBreathCandidate {
  id: number;
  kind: string;
  state: string;
  x: number;
  y: number;
  z: number;
  distSq: number;
  phaseOffset: number;
}

interface ZombieBreathVoice {
  assignedEnemyId: number | null;
  panner: PannerNode;
  breathSrc: AudioBufferSourceNode;
  breathFilter: BiquadFilterNode;
  breathGain: GainNode;
  vocalOsc: OscillatorNode;
  vocalFilter: BiquadFilterNode;
  vocalGain: GainNode;
  voiceGain: GainNode;
  targetLevel: number;
}

const MAX_ZOMBIE_BREATH_VOICES = 8;

interface AmbientGraph {
  // Continuous stereo wind bed (2 layered filters + LFO)
  windSrcA: AudioBufferSourceNode;
  windSrcB: AudioBufferSourceNode;
  windLowFilter: BiquadFilterNode;
  windHowlFilter: BiquadFilterNode;
  windLowGain: GainNode;
  windHowlGain: GainNode;
  // Spatialized campfire crackle & roar
  campfireSrc: AudioBufferSourceNode;
  campfireFilter: BiquadFilterNode;
  campfireGain: GainNode;
  campfirePanner: PannerNode;
  // Spatialized nearest fire/burning bus
  fireSrc: AudioBufferSourceNode;
  fireFilter: BiquadFilterNode;
  fireGain: GainNode;
  firePanner: PannerNode;
  // Spatialized Teatro Colón interior / entrance beacon
  colonSrc: AudioBufferSourceNode;
  colonFilter: BiquadFilterNode;
  colonGain: GainNode;
  colonPanner: PannerNode;
  // Spatialized boiler / mechanical room hum inside Colón
  boilerOsc: OscillatorNode;
  boilerSubOsc: OscillatorNode;
  boilerFilter: BiquadFilterNode;
  boilerGain: GainNode;
  boilerPanner: PannerNode;
  // Spatialized Fast-Food interior fluorescent hum
  fastFoodOsc: OscillatorNode;
  fastFoodFilter: BiquadFilterNode;
  fastFoodGain: GainNode;
  fastFoodPanner: PannerNode;
}

interface StereoUrbanEchoBus {
  input: GainNode;
  delayL: DelayNode;
  delayR: DelayNode;
  filterL: BiquadFilterNode;
  filterR: BiquadFilterNode;
  fbL: GainNode;
  fbR: GainNode;
  panL: StereoPannerNode | null;
  panR: StereoPannerNode | null;
  wetGain: GainNode;
}

export class GameAudio {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private pinkNoiseBuffer: AudioBuffer | null = null;
  private stereoPinkNoiseBuffer: AudioBuffer | null = null;
  private masterGain: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private ambientBus: GainNode | null = null;
  private urbanEchoBus: StereoUrbanEchoBus | null = null;
  private ambientGraph: AmbientGraph | null = null;
  private breathVoices: ZombieBreathVoice[] = [];
  private breathClock = 0;
  private lastRockKickTime = 0;
  private disposed = false;

  private screamTimer = 6.5;
  private thunderTimer = 11.0;
  private crackleTimer = 0.2;
  private zoneDetailTimer = 3.5;

  public muted = false;

  public unlock() {
    if (this.disposed || typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      this.ctx = ctx;

      const master = ctx.createGain();
      master.gain.setValueAtTime(this.muted ? 0 : 1, ctx.currentTime);
      master.connect(ctx.destination);
      this.masterGain = master;

      const sfx = ctx.createGain();
      sfx.gain.setValueAtTime(1, ctx.currentTime);
      sfx.connect(master);
      this.sfxBus = sfx;

      const ambient = ctx.createGain();
      ambient.gain.setValueAtTime(0.88, ctx.currentTime);
      ambient.connect(master);
      this.ambientBus = ambient;

      this.noiseBuffer = this.createNoiseBuffer(ctx);
      this.pinkNoiseBuffer = this.createSeamlessPinkNoiseBuffer(ctx, 4.0);
      this.stereoPinkNoiseBuffer = this.createSeamlessStereoPinkNoiseBuffer(ctx, 4.5);
      this.initUrbanEchoBus(ctx);
      this.initAmbientGraph(ctx);
      this.initZombieBreathPool(ctx);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 1, now, 0.04);
    }
    if (muted) {
      this.resetZombieBreathing();
    }
  }

  private getSfxDest(ctx: AudioContext): AudioNode {
    return this.sfxBus ?? ctx.destination;
  }

  private routeSfxNode(
    ctx: AudioContext,
    pos?: SpatialPos,
    refDistance = 3.5,
    maxDistance = 58,
    rolloffFactor = 1.25,
    cleanupMs = 1100,
    echoSend = 0,
  ): AudioNode {
    const baseDest = this.getSfxDest(ctx);
    if (!pos) {
      if (echoSend > 0 && this.urbanEchoBus) {
        const node = ctx.createGain();
        node.connect(baseDest);
        const send = ctx.createGain();
        send.gain.setValueAtTime(echoSend, ctx.currentTime);
        node.connect(send).connect(this.urbanEchoBus.input);
        window.setTimeout(() => {
          node.disconnect();
          send.disconnect();
        }, cleanupMs);
        return node;
      }
      return baseDest;
    }

    const panner = this.createSpatialPanner(
      ctx,
      pos.x,
      pos.y,
      pos.z,
      refDistance,
      maxDistance,
      rolloffFactor,
    );
    panner.connect(baseDest);
    let sendGain: GainNode | null = null;
    if (echoSend > 0 && this.urbanEchoBus) {
      sendGain = ctx.createGain();
      sendGain.gain.setValueAtTime(echoSend, ctx.currentTime);
      panner.connect(sendGain).connect(this.urbanEchoBus.input);
    }
    window.setTimeout(() => {
      panner.disconnect();
      sendGain?.disconnect();
    }, cleanupMs);
    return panner;
  }

  private initUrbanEchoBus(ctx: AudioContext) {
    if (!this.sfxBus) return;
    const now = ctx.currentTime;
    const input = ctx.createGain();
    input.gain.setValueAtTime(1, now);

    const delayL = ctx.createDelay(0.6);
    const delayR = ctx.createDelay(0.6);
    delayL.delayTime.setValueAtTime(0.118, now);
    delayR.delayTime.setValueAtTime(0.184, now);

    const filterL = ctx.createBiquadFilter();
    const filterR = ctx.createBiquadFilter();
    filterL.type = 'lowpass';
    filterR.type = 'lowpass';
    filterL.frequency.setValueAtTime(1350, now);
    filterR.frequency.setValueAtTime(1120, now);

    const fbL = ctx.createGain();
    const fbR = ctx.createGain();
    fbL.gain.setValueAtTime(0.2, now);
    fbR.gain.setValueAtTime(0.18, now);

    const wetGain = ctx.createGain();
    wetGain.gain.setValueAtTime(0.28, now);
    wetGain.connect(this.sfxBus);

    const panL = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null;
    const panR = typeof ctx.createStereoPanner === 'function' ? ctx.createStereoPanner() : null;
    if (panL) panL.pan.setValueAtTime(-0.74, now);
    if (panR) panR.pan.setValueAtTime(0.74, now);

    input.connect(delayL).connect(filterL);
    input.connect(delayR).connect(filterR);
    // Ping-pong cross feedback for authentic wide urban canyon / theater tail
    filterL.connect(fbL).connect(delayR);
    filterR.connect(fbR).connect(delayL);

    if (panL && panR) {
      filterL.connect(panL).connect(wetGain);
      filterR.connect(panR).connect(wetGain);
    } else {
      filterL.connect(wetGain);
      filterR.connect(wetGain);
    }

    this.urbanEchoBus = {
      input,
      delayL,
      delayR,
      filterL,
      filterR,
      fbL,
      fbR,
      panL,
      panR,
      wetGain,
    };
  }

  private createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * 0.6);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  private fillPinkChannel(data: Float32Array, sr: number) {
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;
    const length = data.length;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      const sample = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
      data[i] = Math.max(-1, Math.min(1, sample));
    }

    const fadeLen = Math.min(Math.floor(sr * 0.18), Math.floor(length * 0.12));
    for (let i = 0; i < fadeLen; i++) {
      const t = i / fadeLen;
      const tailIdx = length - fadeLen + i;
      const blended = data[tailIdx] * (1 - t) + data[i] * t;
      data[i] = blended;
      data[tailIdx] = data[tailIdx] * t + data[i] * (1 - t);
    }
  }

  private createSeamlessPinkNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
    const sr = ctx.sampleRate;
    const length = Math.floor(sr * seconds);
    const buffer = ctx.createBuffer(1, length, sr);
    this.fillPinkChannel(buffer.getChannelData(0), sr);
    return buffer;
  }

  private createSeamlessStereoPinkNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
    const sr = ctx.sampleRate;
    const length = Math.floor(sr * seconds);
    const buffer = ctx.createBuffer(2, length, sr);
    // Independent L & R seeds create natural wide binaural air & wind ambience
    this.fillPinkChannel(buffer.getChannelData(0), sr);
    this.fillPinkChannel(buffer.getChannelData(1), sr);
    return buffer;
  }

  private createSpatialPanner(
    ctx: AudioContext,
    x: number,
    y: number,
    z: number,
    refDistance = 4,
    maxDistance = 60,
    rolloffFactor = 1.2,
  ): PannerNode {
    const panner = ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = refDistance;
    panner.maxDistance = maxDistance;
    panner.rolloffFactor = rolloffFactor;
    panner.coneInnerAngle = 360;
    panner.coneOuterAngle = 360;
    panner.coneOuterGain = 0;
    this.setPannerPosition(panner, x, y, z, ctx.currentTime, 0.01);
    return panner;
  }

  private setPannerPosition(
    panner: PannerNode,
    x: number,
    y: number,
    z: number,
    now: number,
    tc = 0.04,
  ) {
    if ('positionX' in panner && panner.positionX) {
      panner.positionX.setTargetAtTime(x, now, tc);
      panner.positionY.setTargetAtTime(y, now, tc);
      panner.positionZ.setTargetAtTime(z, now, tc);
    } else {
      panner.setPosition(x, y, z);
    }
  }

  private updateListenerTransform(
    ctx: AudioContext,
    lx: number,
    ly: number,
    lz: number,
    fx: number,
    fy: number,
    fz: number,
    ux: number,
    uy: number,
    uz: number,
  ) {
    const listener = ctx.listener;
    const now = ctx.currentTime;
    if ('positionX' in listener && listener.positionX) {
      listener.positionX.setTargetAtTime(lx, now, 0.02);
      listener.positionY.setTargetAtTime(ly, now, 0.02);
      listener.positionZ.setTargetAtTime(lz, now, 0.02);
      listener.forwardX.setTargetAtTime(fx, now, 0.02);
      listener.forwardY.setTargetAtTime(fy, now, 0.02);
      listener.forwardZ.setTargetAtTime(fz, now, 0.02);
      listener.upX.setTargetAtTime(ux, now, 0.02);
      listener.upY.setTargetAtTime(uy, now, 0.02);
      listener.upZ.setTargetAtTime(uz, now, 0.02);
    } else if (typeof listener.setPosition === 'function') {
      listener.setPosition(lx, ly, lz);
      listener.setOrientation(fx, fy, fz, ux, uy, uz);
    }
  }

  private initAmbientGraph(ctx: AudioContext) {
    if (!this.pinkNoiseBuffer || !this.ambientBus) return;
    const now = ctx.currentTime;
    const windBuf = this.stereoPinkNoiseBuffer ?? this.pinkNoiseBuffer;

    // 1. Stereo Wind bed: decorrelated L/R air + urban canyon whistle
    const windSrcA = ctx.createBufferSource();
    windSrcA.buffer = windBuf;
    windSrcA.loop = true;
    const windLowFilter = ctx.createBiquadFilter();
    windLowFilter.type = 'lowpass';
    windLowFilter.frequency.setValueAtTime(520, now);
    windLowFilter.Q.setValueAtTime(0.8, now);
    const windLowGain = ctx.createGain();
    windLowGain.gain.setValueAtTime(0, now);
    windSrcA.connect(windLowFilter).connect(windLowGain).connect(this.ambientBus);
    windSrcA.start(now);

    const windSrcB = ctx.createBufferSource();
    windSrcB.buffer = windBuf;
    windSrcB.loop = true;
    windSrcB.playbackRate.setValueAtTime(1.18, now);
    const windHowlFilter = ctx.createBiquadFilter();
    windHowlFilter.type = 'bandpass';
    windHowlFilter.frequency.setValueAtTime(420, now);
    windHowlFilter.Q.setValueAtTime(4.2, now);
    const windHowlGain = ctx.createGain();
    windHowlGain.gain.setValueAtTime(0, now);
    windSrcB.connect(windHowlFilter).connect(windHowlGain).connect(this.ambientBus);
    windSrcB.start(now, 1.3);

    // 2. Spatialized campfire bed
    const campfireSrc = ctx.createBufferSource();
    campfireSrc.buffer = this.pinkNoiseBuffer;
    campfireSrc.loop = true;
    campfireSrc.playbackRate.setValueAtTime(1.06, now);
    const campfireFilter = ctx.createBiquadFilter();
    campfireFilter.type = 'bandpass';
    campfireFilter.frequency.setValueAtTime(420, now);
    campfireFilter.Q.setValueAtTime(0.65, now);
    const campfireGain = ctx.createGain();
    campfireGain.gain.setValueAtTime(0, now);
    const campfirePanner = this.createSpatialPanner(ctx, 6.2, 0.8, 8.4, 3.2, 34, 1.5);
    campfireSrc.connect(campfireFilter).connect(campfireGain).connect(campfirePanner).connect(this.ambientBus);
    campfireSrc.start(now, 0.4);

    // 3. Spatialized nearest burning wreckage / molotov fire zone
    const fireSrc = ctx.createBufferSource();
    fireSrc.buffer = this.pinkNoiseBuffer;
    fireSrc.loop = true;
    fireSrc.playbackRate.setValueAtTime(1.24, now);
    const fireFilter = ctx.createBiquadFilter();
    fireFilter.type = 'bandpass';
    fireFilter.frequency.setValueAtTime(640, now);
    fireFilter.Q.setValueAtTime(0.7, now);
    const fireGain = ctx.createGain();
    fireGain.gain.setValueAtTime(0, now);
    const firePanner = this.createSpatialPanner(ctx, 0, 1.5, 0, 3.4, 32, 1.45);
    fireSrc.connect(fireFilter).connect(fireGain).connect(firePanner).connect(this.ambientBus);
    fireSrc.start(now, 2.1);

    // 4. Spatialized Teatro Colón sanctuary / interior hall air
    const colonSrc = ctx.createBufferSource();
    colonSrc.buffer = this.pinkNoiseBuffer;
    colonSrc.loop = true;
    colonSrc.playbackRate.setValueAtTime(0.72, now);
    const colonFilter = ctx.createBiquadFilter();
    colonFilter.type = 'bandpass';
    colonFilter.frequency.setValueAtTime(165, now);
    colonFilter.Q.setValueAtTime(1.4, now);
    const colonGain = ctx.createGain();
    colonGain.gain.setValueAtTime(0, now);
    const colonPanner = this.createSpatialPanner(ctx, -38.8, 1.5, -22.5, 5.0, 34, 1.25);
    colonSrc.connect(colonFilter).connect(colonGain).connect(colonPanner).connect(this.ambientBus);
    colonSrc.start(now, 0.9);

    // 5. Spatialized boiler / generator hum inside Teatro Colón
    const boilerOsc = ctx.createOscillator();
    boilerOsc.type = 'sawtooth';
    boilerOsc.frequency.setValueAtTime(58, now);
    const boilerSubOsc = ctx.createOscillator();
    boilerSubOsc.type = 'sine';
    boilerSubOsc.frequency.setValueAtTime(116, now);
    const boilerFilter = ctx.createBiquadFilter();
    boilerFilter.type = 'lowpass';
    boilerFilter.frequency.setValueAtTime(190, now);
    const boilerGain = ctx.createGain();
    boilerGain.gain.setValueAtTime(0, now);
    const boilerPanner = this.createSpatialPanner(ctx, -27.2, 1.2, -29.2, 4.0, 36, 1.35);
    boilerOsc.connect(boilerFilter);
    boilerSubOsc.connect(boilerFilter);
    boilerFilter.connect(boilerGain).connect(boilerPanner).connect(this.ambientBus);
    boilerOsc.start(now);
    boilerSubOsc.start(now);

    // 6. Spatialized Fast-Food broken neon / cooler hum
    const fastFoodOsc = ctx.createOscillator();
    fastFoodOsc.type = 'triangle';
    fastFoodOsc.frequency.setValueAtTime(60, now);
    const fastFoodFilter = ctx.createBiquadFilter();
    fastFoodFilter.type = 'lowpass';
    fastFoodFilter.frequency.setValueAtTime(220, now);
    const fastFoodGain = ctx.createGain();
    fastFoodGain.gain.setValueAtTime(0, now);
    const fastFoodPanner = this.createSpatialPanner(ctx, 53.0, 2.2, 21.0, 5.0, 26, 1.45);
    fastFoodOsc.connect(fastFoodFilter).connect(fastFoodGain).connect(fastFoodPanner).connect(this.ambientBus);
    fastFoodOsc.start(now);

    this.ambientGraph = {
      windSrcA,
      windSrcB,
      windLowFilter,
      windHowlFilter,
      windLowGain,
      windHowlGain,
      campfireSrc,
      campfireFilter,
      campfireGain,
      campfirePanner,
      fireSrc,
      fireFilter,
      fireGain,
      firePanner,
      colonSrc,
      colonFilter,
      colonGain,
      colonPanner,
      boilerOsc,
      boilerSubOsc,
      boilerFilter,
      boilerGain,
      boilerPanner,
      fastFoodOsc,
      fastFoodFilter,
      fastFoodGain,
      fastFoodPanner,
    };
  }

  private initZombieBreathPool(ctx: AudioContext) {
    if (!this.pinkNoiseBuffer || !this.sfxBus) return;
    const now = ctx.currentTime;
    for (let i = 0; i < MAX_ZOMBIE_BREATH_VOICES; i++) {
      const panner = this.createSpatialPanner(ctx, 0, 1.4, 0, 2.2, 23, 1.48);

      const voiceGain = ctx.createGain();
      voiceGain.gain.setValueAtTime(0, now);
      voiceGain.connect(panner).connect(this.sfxBus);

      // Wet raspy lung airflow channel
      const breathSrc = ctx.createBufferSource();
      breathSrc.buffer = this.pinkNoiseBuffer;
      breathSrc.loop = true;
      breathSrc.playbackRate.setValueAtTime(0.88 + (i % 4) * 0.08, now);

      const breathFilter = ctx.createBiquadFilter();
      breathFilter.type = 'bandpass';
      breathFilter.frequency.setValueAtTime(640, now);
      breathFilter.Q.setValueAtTime(2.3, now);

      const breathGain = ctx.createGain();
      breathGain.gain.setValueAtTime(0.18, now);
      breathSrc.connect(breathFilter).connect(breathGain).connect(voiceGain);
      breathSrc.start(now, (i * 0.43) % 3.6);

      // Sub-glottal vocal cord rasp channel
      const vocalOsc = ctx.createOscillator();
      vocalOsc.type = 'sawtooth';
      vocalOsc.frequency.setValueAtTime(76, now);

      const vocalFilter = ctx.createBiquadFilter();
      vocalFilter.type = 'bandpass';
      vocalFilter.frequency.setValueAtTime(420, now);
      vocalFilter.Q.setValueAtTime(3.1, now);

      const vocalGain = ctx.createGain();
      vocalGain.gain.setValueAtTime(0.06, now);
      vocalOsc.connect(vocalFilter).connect(vocalGain).connect(voiceGain);
      vocalOsc.start(now);

      this.breathVoices.push({
        assignedEnemyId: null,
        panner,
        breathSrc,
        breathFilter,
        breathGain,
        vocalOsc,
        vocalFilter,
        vocalGain,
        voiceGain,
        targetLevel: 0,
      });
    }
  }

  public resetZombieBreathing() {
    if (!this.ctx || this.breathVoices.length === 0) return;
    const now = this.ctx.currentTime;
    for (let i = 0; i < this.breathVoices.length; i++) {
      const v = this.breathVoices[i];
      v.assignedEnemyId = null;
      v.targetLevel = 0;
      v.voiceGain.gain.setTargetAtTime(0, now, 0.05);
    }
  }

  public updateZombieBreathing(
    candidates: ZombieBreathCandidate[],
    active: boolean,
    dt: number,
  ) {
    if (this.disposed || !this.ctx || this.ctx.state !== 'running') return;
    if (this.breathVoices.length === 0) return;
    const now = this.ctx.currentTime;

    if (!active || this.muted || candidates.length === 0) {
      for (let i = 0; i < this.breathVoices.length; i++) {
        const v = this.breathVoices[i];
        v.assignedEnemyId = null;
        if (v.targetLevel !== 0) {
          v.targetLevel = 0;
          v.voiceGain.gain.setTargetAtTime(0, now, 0.08);
        }
      }
      return;
    }

    this.breathClock += dt;

    // Sort in-place closest zombies first (max 22m audible proximity)
    candidates.sort((a, b) => a.distSq - b.distSq);
    const maxAssigned = Math.min(MAX_ZOMBIE_BREATH_VOICES, candidates.length);

    // Sticky slot assignment: preserve slots for enemies still in top audible set
    const slotUsed = new Uint8Array(MAX_ZOMBIE_BREATH_VOICES);
    const candSlot = new Int8Array(maxAssigned);
    candSlot.fill(-1);

    for (let c = 0; c < maxAssigned; c++) {
      const id = candidates[c].id;
      for (let v = 0; v < MAX_ZOMBIE_BREATH_VOICES; v++) {
        if (!slotUsed[v] && this.breathVoices[v].assignedEnemyId === id) {
          slotUsed[v] = 1;
          candSlot[c] = v;
          break;
        }
      }
    }
    for (let c = 0; c < maxAssigned; c++) {
      if (candSlot[c] !== -1) continue;
      for (let v = 0; v < MAX_ZOMBIE_BREATH_VOICES; v++) {
        if (!slotUsed[v]) {
          slotUsed[v] = 1;
          candSlot[c] = v;
          break;
        }
      }
    }

    // Silence any unused slots
    for (let v = 0; v < MAX_ZOMBIE_BREATH_VOICES; v++) {
      if (!slotUsed[v]) {
        const voice = this.breathVoices[v];
        voice.assignedEnemyId = null;
        if (voice.targetLevel !== 0) {
          voice.targetLevel = 0;
          voice.voiceGain.gain.setTargetAtTime(0, now, 0.09);
        }
      }
    }

    // Modulate active zombie breath voices with organic inhale/exhale rattle
    for (let c = 0; c < maxAssigned; c++) {
      const sIdx = candSlot[c];
      if (sIdx < 0) continue;
      const cand = candidates[c];
      const voice = this.breathVoices[sIdx];
      const fresh = voice.assignedEnemyId !== cand.id;
      voice.assignedEnemyId = cand.id;

      this.setPannerPosition(voice.panner, cand.x, cand.y + 1.38, cand.z, now, fresh ? 0.01 : 0.045);

      const isAggressive =
        cand.state === 'chase' ||
        cand.state === 'windup' ||
        cand.state === 'lunge' ||
        cand.state === 'attack';
      const isInvestigate = cand.state === 'investigate';
      const isBrute = cand.kind === 'brute';
      const isSpitter = cand.kind === 'spitter';

      const cadenceHz = isAggressive ? 0.96 : isInvestigate ? 0.62 : 0.42;
      const cycle = ((this.breathClock * cadenceHz + cand.phaseOffset) % 1 + 1) % 1;
      // Asymmetric lung cycle: 0..0.38 inhale, 0.42..0.92 wet exhale rattle, brief pause
      let breathEnv = 0.08;
      let exhaleWave = 0;
      if (cycle < 0.36) {
        const p = cycle / 0.36;
        breathEnv = 0.22 + Math.sin(p * Math.PI) * 0.58;
      } else if (cycle >= 0.42 && cycle < 0.92) {
        const p = (cycle - 0.42) / 0.5;
        exhaleWave = Math.sin(p * Math.PI);
        breathEnv = 0.25 + exhaleWave * 0.95;
      }

      const dist = Math.sqrt(Math.max(0.25, cand.distSq));
      const proximity = Math.max(0, 1 - Math.max(0, dist - 2.0) / 20.0);
      const stateGain = isAggressive ? 1.32 : isInvestigate ? 0.95 : 0.72;
      const masterLevel = Math.min(0.46, (0.14 + proximity * 0.24) * stateGain * breathEnv);

      const basePitch = isBrute ? 52 : isSpitter ? 96 : isAggressive ? 84 : 68;
      const pitchWobble = Math.sin(this.breathClock * 4.5 + cand.phaseOffset * 9) * 5.5;
      const vocalHz = basePitch + (isAggressive ? 14 : 0) - exhaleWave * 10 + pitchWobble;
      const breathCenterHz = (isSpitter ? 840 : isBrute ? 460 : 620) + (isAggressive ? 220 : 0) + exhaleWave * 190;
      const vocalCenterHz = (isBrute ? 320 : isSpitter ? 560 : 420) + exhaleWave * 140;

      voice.breathFilter.frequency.setTargetAtTime(breathCenterHz, now, 0.06);
      voice.vocalFilter.frequency.setTargetAtTime(vocalCenterHz, now, 0.06);
      voice.vocalOsc.frequency.setTargetAtTime(Math.max(38, vocalHz), now, 0.05);
      voice.breathGain.gain.setTargetAtTime(isSpitter ? 0.28 : 0.22, now, 0.06);
      voice.vocalGain.gain.setTargetAtTime(
        (isAggressive ? 0.14 : 0.075) * (0.35 + exhaleWave * 0.85),
        now,
        0.05,
      );
      voice.targetLevel = masterLevel;
      voice.voiceGain.gain.setTargetAtTime(masterLevel, now, fresh ? 0.08 : 0.05);
    }
  }

  public updateSpatialAmbience(s: SpatialAmbienceFrame) {
    if (this.disposed || !this.ctx || !this.ambientGraph) return;
    if (this.ctx.state !== 'running') return;

    const ctx = this.ctx;
    const g = this.ambientGraph;
    const now = ctx.currentTime;

    this.updateListenerTransform(
      ctx,
      s.listenerX,
      s.listenerY,
      s.listenerZ,
      s.forwardX,
      s.forwardY,
      s.forwardZ,
      s.upX,
      s.upY,
      s.upZ,
    );

    const isTitle = s.gameState === 'TITLE_MENU';
    const isEndState = s.gameState === 'GAME_OVER' || s.gameState === 'VICTORY';
    const activeMix = isEndState ? 0.35 : isTitle ? 0.65 : 1.0;

    // Organic dual-frequency wind gust wave
    const gust =
      0.48 +
      0.32 * Math.sin(s.elapsed * 0.42 + Math.sin(s.elapsed * 0.17) * 1.4) +
      0.2 * Math.cos(s.elapsed * 0.91);
    const nightWeight = 1 - s.dayFactor;

    // Openness based on player proximity to open plaza / wide Av. 9 de Julio vs indoor zones
    const plazaDist = Math.hypot(s.playerX, s.playerZ);
    const plazaOpenness = Math.max(0, 1 - Math.max(0, plazaDist - 12) / 48);
    const avenueOpenness = Math.max(0, 1 - Math.max(0, Math.abs(s.playerX) - 18) / 36);
    const urbanOpenFactor = s.isSandbox
      ? 0.92
      : Math.max(0.38, Math.min(1.0, 0.45 + plazaOpenness * 0.32 + avenueOpenness * 0.35));

    let windEnclosure = 1.0;
    let windCutoffMult = 1.0;
    if (s.activeZone === 'colon_interior') {
      windEnclosure = 0.12;
      windCutoffMult = 0.32;
    } else if (s.insideFastFood) {
      windEnclosure = 0.22;
      windCutoffMult = 0.42;
    }

    const stormBoost = 1.0 + nightWeight * 0.38 + s.twilight * 0.24;
    const windLowTarget =
      (0.065 + gust * 0.085) * urbanOpenFactor * windEnclosure * stormBoost * activeMix;
    const windHowlTarget =
      Math.max(0, gust - 0.32) * 0.068 * urbanOpenFactor * windEnclosure * stormBoost * activeMix;

    g.windLowGain.gain.setTargetAtTime(windLowTarget, now, 0.14);
    g.windHowlGain.gain.setTargetAtTime(windHowlTarget, now, 0.18);
    g.windLowFilter.frequency.setTargetAtTime(
      (360 + gust * 540 * urbanOpenFactor) * windCutoffMult,
      now,
      0.16,
    );
    g.windHowlFilter.frequency.setTargetAtTime(
      (280 + gust * 380 + Math.sin(s.elapsed * 0.63) * 75) * Math.max(0.45, windCutoffMult),
      now,
      0.18,
    );

    // Campfire 3D spatialized audio
    if (s.activeZone === 'exterior_9_julio' && !isTitle) {
      const warmthFactor = 0.45 + (s.campfireWarmth / 100) * 0.7;
      const campMuffle = s.insideFastFood ? 0.25 : 1.0;
      this.setPannerPosition(g.campfirePanner, s.campfireX, s.campfireY + 0.85, s.campfireZ, now, 0.05);
      g.campfireGain.gain.setTargetAtTime(0.18 * warmthFactor * campMuffle * activeMix, now, 0.12);
      g.campfireFilter.frequency.setTargetAtTime(
        (380 + Math.sin(s.elapsed * 7.5) * 90) * (s.insideFastFood ? 0.5 : 1.0),
        now,
        0.1,
      );

      // Stochastic campfire crackles when nearby
      const campDist = Math.hypot(s.playerX - s.campfireX, s.playerZ - s.campfireZ);
      if (campDist < 24 && !s.insideFastFood) {
        this.crackleTimer -= s.dt;
        if (this.crackleTimer <= 0) {
          this.crackleTimer = 0.09 + Math.random() * 0.28;
          this.playSpatialFireCrackle(
            s.campfireX + (Math.random() - 0.5) * 0.8,
            s.campfireY + 0.7 + Math.random() * 0.6,
            s.campfireZ + (Math.random() - 0.5) * 0.8,
            0.035 + Math.random() * 0.045,
          );
        }
      }
    } else {
      g.campfireGain.gain.setTargetAtTime(0, now, 0.12);
    }

    // Nearest burning bus wreck or active Molotov fire zone
    if (s.activeZone === 'exterior_9_julio' && s.hasActiveFire && !isTitle) {
      this.setPannerPosition(g.firePanner, s.nearestFireX, s.nearestFireY + 0.6, s.nearestFireZ, now, 0.06);
      const fireMuffle = s.insideFastFood ? 0.22 : 1.0;
      g.fireGain.gain.setTargetAtTime(0.2 * fireMuffle * activeMix, now, 0.12);
      g.fireFilter.frequency.setTargetAtTime(
        (560 + Math.sin(s.elapsed * 9.2) * 140) * (s.insideFastFood ? 0.55 : 1.0),
        now,
        0.1,
      );
    } else {
      g.fireGain.gain.setTargetAtTime(0, now, 0.14);
    }

    // Teatro Colón zone audio (interior grand-hall resonance + boiler room hum, or exterior entrance beacon)
    if (s.activeZone === 'colon_interior') {
      this.setPannerPosition(g.colonPanner, s.playerX, s.playerY + 2.5, s.playerZ - 4, now, 0.08);
      g.colonGain.gain.setTargetAtTime(0.085 * activeMix, now, 0.2);
      g.colonFilter.frequency.setTargetAtTime(140, now, 0.2);

      this.setPannerPosition(g.boilerPanner, s.boilerX, s.boilerY + 1.2, s.boilerZ, now, 0.06);
      g.boilerGain.gain.setTargetAtTime(0.095 * activeMix, now, 0.18);
      g.fastFoodGain.gain.setTargetAtTime(0, now, 0.15);
    } else {
      g.boilerGain.gain.setTargetAtTime(0, now, 0.15);
      if (!s.isSandbox && !isTitle) {
        this.setPannerPosition(
          g.colonPanner,
          s.colonEntranceX,
          s.colonEntranceY + 1.8,
          s.colonEntranceZ,
          now,
          0.06,
        );
        g.colonGain.gain.setTargetAtTime((s.colonUnlocked ? 0.075 : 0.032) * activeMix, now, 0.2);
        g.colonFilter.frequency.setTargetAtTime(s.colonUnlocked ? 240 : 170, now, 0.2);

        this.setPannerPosition(
          g.fastFoodPanner,
          s.fastFoodX,
          s.fastFoodY + 2.4,
          s.fastFoodZ,
          now,
          0.06,
        );
        const ffGain = s.insideFastFood ? 0.078 : 0.036;
        g.fastFoodGain.gain.setTargetAtTime(ffGain * activeMix, now, 0.18);
      } else {
        g.colonGain.gain.setTargetAtTime(0, now, 0.15);
        g.fastFoodGain.gain.setTargetAtTime(0, now, 0.15);
      }
    }

    // Dynamic urban stereo echo character per zone
    if (this.urbanEchoBus) {
      const eb = this.urbanEchoBus;
      if (s.activeZone === 'colon_interior') {
        eb.delayL.delayTime.setTargetAtTime(0.165, now, 0.2);
        eb.delayR.delayTime.setTargetAtTime(0.245, now, 0.2);
        eb.filterL.frequency.setTargetAtTime(1680, now, 0.2);
        eb.filterR.frequency.setTargetAtTime(1420, now, 0.2);
        eb.wetGain.gain.setTargetAtTime(0.36, now, 0.2);
      } else if (s.insideFastFood) {
        eb.delayL.delayTime.setTargetAtTime(0.055, now, 0.2);
        eb.delayR.delayTime.setTargetAtTime(0.085, now, 0.2);
        eb.filterL.frequency.setTargetAtTime(1050, now, 0.2);
        eb.filterR.frequency.setTargetAtTime(920, now, 0.2);
        eb.wetGain.gain.setTargetAtTime(0.18, now, 0.2);
      } else {
        eb.delayL.delayTime.setTargetAtTime(0.118, now, 0.2);
        eb.delayR.delayTime.setTargetAtTime(0.184, now, 0.2);
        eb.filterL.frequency.setTargetAtTime(1350, now, 0.2);
        eb.filterR.frequency.setTargetAtTime(1120, now, 0.2);
        eb.wetGain.gain.setTargetAtTime(0.28, now, 0.2);
      }
    }

    // Don't fire random scream/thunder one-shots while game is muted or finished
    if (this.muted || isEndState) return;

    // Scheduled distant screams / zombie howls
    const dangerFactor =
      1 + Math.min(0.65, s.alertedZombies * 0.08) + nightWeight * 0.45 + (s.insideFastFood ? -0.2 : 0);
    this.screamTimer -= s.dt * Math.max(0.55, dangerFactor);
    if (this.screamTimer <= 0) {
      this.screamTimer = isTitle ? 16 + Math.random() * 14 : 11 + Math.random() * 14;
      let sx: number;
      let sy: number;
      let sz: number;
      if (s.activeZone === 'colon_interior') {
        const ang = Math.random() * Math.PI * 2;
        const dist = 22 + Math.random() * 24;
        sx = s.playerX + Math.cos(ang) * dist;
        sy = s.playerY + (Math.random() - 0.5) * 4;
        sz = s.playerZ + Math.sin(ang) * dist;
      } else if (s.hasThreatHint && Math.random() < 0.6) {
        const dx = s.nearestThreatX - s.playerX;
        const dz = s.nearestThreatZ - s.playerZ;
        const baseAng = Math.atan2(dz, dx) + (Math.random() - 0.5) * 0.7;
        const dist = 24 + Math.random() * 28;
        sx = s.playerX + Math.cos(baseAng) * dist;
        sy = s.playerY + 1.4;
        sz = s.playerZ + Math.sin(baseAng) * dist;
      } else {
        const ang = Math.random() * Math.PI * 2;
        const dist = 26 + Math.random() * 34;
        sx = s.playerX + Math.cos(ang) * dist;
        sy = s.playerY + 1.5;
        sz = s.playerZ + Math.sin(ang) * dist;
      }
      const muffle = s.activeZone === 'colon_interior' ? 0.55 : s.insideFastFood ? 0.62 : 1.0;
      this.playSpatialDistantScream(sx, sy, sz, (0.65 + Math.random() * 0.35) * muffle * activeMix);
    }

    // Scheduled rolling thunder across the Buenos Aires storm sky
    const stormRate =
      s.activeZone === 'colon_interior'
        ? 0.32
        : 0.75 + nightWeight * 0.55 + s.twilight * 0.35;
    this.thunderTimer -= s.dt * stormRate;
    if (this.thunderTimer <= 0) {
      this.thunderTimer = 17 + Math.random() * 19;
      const ang = Math.random() * Math.PI * 2;
      const dist = 34 + Math.random() * 44;
      const tx = s.playerX + Math.cos(ang) * dist;
      const ty = s.playerY + 24 + Math.random() * 18;
      const tz = s.playerZ + Math.sin(ang) * dist;
      const indoorMuffle = s.activeZone === 'colon_interior' ? 0.28 : s.insideFastFood ? 0.45 : 1.0;
      const thunderInt = (0.72 + Math.random() * 0.38) * (0.8 + urbanOpenFactor * 0.25) * activeMix;
      this.playSpatialThunder(tx, ty, tz, thunderInt, indoorMuffle);
    }

    // Subtle zone-specific micro ambient cues (water drips in boiler wing / metallic creaks near fire wrecks)
    this.zoneDetailTimer -= s.dt;
    if (this.zoneDetailTimer <= 0) {
      this.zoneDetailTimer = 3.2 + Math.random() * 4.2;
      if (s.activeZone === 'colon_interior') {
        const bDist = Math.hypot(s.playerX - s.boilerX, s.playerZ - s.boilerZ);
        if (bDist < 28) {
          this.playSpatialWaterDrip(
            s.boilerX + (Math.random() - 0.5) * 4,
            s.boilerY + 0.5,
            s.boilerZ + (Math.random() - 0.5) * 4,
          );
        }
      } else if (!isTitle && s.hasActiveFire) {
        const fDist = Math.hypot(s.playerX - s.nearestFireX, s.playerZ - s.nearestFireZ);
        if (fDist < 24) {
          this.playSpatialMetalCreak(
            s.nearestFireX + (Math.random() - 0.5) * 2.5,
            s.nearestFireY + 1.2,
            s.nearestFireZ + (Math.random() - 0.5) * 2.5,
          );
        }
      }
    }
  }

  private playSpatialFireCrackle(x: number, y: number, z: number, level = 0.06) {
    const ctx = this.ensureReady();
    if (!ctx || !this.noiseBuffer || !this.ambientBus) return;
    const now = ctx.currentTime;

    const panner = this.createSpatialPanner(ctx, x, y, z, 2.2, 24, 1.8);
    panner.connect(this.ambientBus);

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1900 + Math.random() * 2400, now);
    filter.Q.setValueAtTime(2.6, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(level, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.042 + Math.random() * 0.03);

    src.connect(filter).connect(gain).connect(panner);
    const offset = Math.random() * Math.max(0.05, this.noiseBuffer.duration - 0.1);
    src.start(now, offset, 0.09);
    src.onended = () => {
      src.disconnect();
      filter.disconnect();
      gain.disconnect();
      panner.disconnect();
    };
  }

  public playSpatialDistantScream(x: number, y: number, z: number, intensity = 0.85) {
    const ctx = this.ensureReady();
    if (!ctx || !this.ambientBus) return;
    const now = ctx.currentTime;

    const panner = this.createSpatialPanner(ctx, x, y, z, 10, 92, 1.05);
    panner.connect(this.ambientBus);

    const isGuttural = Math.random() < 0.42;
    const baseHz = isGuttural ? 175 + Math.random() * 75 : 370 + Math.random() * 170;
    const dur = 1.05 + Math.random() * 0.65;

    const oscA = ctx.createOscillator();
    const oscB = ctx.createOscillator();
    oscA.type = 'sawtooth';
    oscB.type = 'triangle';
    oscA.frequency.setValueAtTime(baseHz * 0.84, now);
    oscA.frequency.exponentialRampToValueAtTime(baseHz * 1.18, now + 0.18);
    oscA.frequency.exponentialRampToValueAtTime(baseHz * 0.68, now + dur);

    oscB.frequency.setValueAtTime(baseHz * 1.015, now);
    oscB.frequency.exponentialRampToValueAtTime(baseHz * 1.24, now + 0.2);
    oscB.frequency.exponentialRampToValueAtTime(baseHz * 0.64, now + dur);

    // Vocal vibrato
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(5.5 + Math.random() * 2.5, now);
    lfoGain.gain.setValueAtTime(isGuttural ? 11 : 18, now);
    lfo.connect(lfoGain);
    lfoGain.connect(oscA.frequency);
    lfoGain.connect(oscB.frequency);

    const formant = ctx.createBiquadFilter();
    formant.type = 'bandpass';
    formant.frequency.setValueAtTime(isGuttural ? 680 : 1220, now);
    formant.frequency.exponentialRampToValueAtTime(isGuttural ? 460 : 840, now + dur);
    formant.Q.setValueAtTime(3.2, now);

    const mainGain = ctx.createGain();
    const peak = 0.14 * intensity;
    mainGain.gain.setValueAtTime(0.0001, now);
    mainGain.gain.exponentialRampToValueAtTime(peak, now + 0.14);
    mainGain.gain.setValueAtTime(peak * 0.85, now + dur * 0.45);
    mainGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    // Subtle canyon echo delay
    const echoDelay = ctx.createDelay(1.0);
    echoDelay.delayTime.setValueAtTime(0.32, now);
    const echoFilter = ctx.createBiquadFilter();
    echoFilter.type = 'lowpass';
    echoFilter.frequency.setValueAtTime(820, now);
    const echoGain = ctx.createGain();
    echoGain.gain.setValueAtTime(0.34, now);

    oscA.connect(formant);
    oscB.connect(formant);
    formant.connect(mainGain);
    mainGain.connect(panner);
    mainGain.connect(echoDelay).connect(echoFilter).connect(echoGain).connect(panner);

    // Breathy rasp layer
    let raspSrc: AudioBufferSourceNode | null = null;
    let raspFilter: BiquadFilterNode | null = null;
    let raspGain: GainNode | null = null;
    if (this.pinkNoiseBuffer) {
      raspSrc = ctx.createBufferSource();
      raspSrc.buffer = this.pinkNoiseBuffer;
      raspFilter = ctx.createBiquadFilter();
      raspFilter.type = 'bandpass';
      raspFilter.frequency.setValueAtTime(isGuttural ? 900 : 1650, now);
      raspFilter.Q.setValueAtTime(2.0, now);
      raspGain = ctx.createGain();
      raspGain.gain.setValueAtTime(0.0001, now);
      raspGain.gain.exponentialRampToValueAtTime(0.065 * intensity, now + 0.14);
      raspGain.gain.exponentialRampToValueAtTime(0.0001, now + dur * 0.95);
      raspSrc.connect(raspFilter).connect(raspGain).connect(panner);
      raspSrc.start(now, Math.random() * 2.0, dur);
    }

    oscA.start(now);
    oscB.start(now);
    lfo.start(now);
    oscA.stop(now + dur + 0.05);
    oscB.stop(now + dur + 0.05);
    lfo.stop(now + dur + 0.05);

    window.setTimeout(() => {
      oscA.disconnect();
      oscB.disconnect();
      lfo.disconnect();
      lfoGain.disconnect();
      formant.disconnect();
      mainGain.disconnect();
      echoDelay.disconnect();
      echoFilter.disconnect();
      echoGain.disconnect();
      raspSrc?.disconnect();
      raspFilter?.disconnect();
      raspGain?.disconnect();
      panner.disconnect();
    }, Math.ceil((dur + 0.65) * 1000));
  }

  public playSpatialThunder(
    x: number,
    y: number,
    z: number,
    intensity = 0.9,
    indoorMuffle = 1.0,
  ) {
    const ctx = this.ensureReady();
    if (!ctx || !this.pinkNoiseBuffer || !this.ambientBus) return;
    const now = ctx.currentTime;

    const panner = this.createSpatialPanner(ctx, x, y, z, 20, 145, 0.72);
    panner.connect(this.ambientBus);

    const dur = 2.8 + Math.random() * 1.4;
    const peakGain = 0.42 * intensity * indoorMuffle;

    // Initial distant sky crack / sub-bass thump
    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(68, now);
    subOsc.frequency.exponentialRampToValueAtTime(26, now + 0.65);
    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.001, now);
    subGain.gain.exponentialRampToValueAtTime(0.24 * intensity * indoorMuffle, now + 0.04);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
    subOsc.connect(subGain).connect(panner);
    subOsc.start(now);
    subOsc.stop(now + 0.95);

    // Primary rolling storm rumble
    const rumbleA = ctx.createBufferSource();
    rumbleA.buffer = this.pinkNoiseBuffer;
    rumbleA.loop = true;
    rumbleA.playbackRate.setValueAtTime(0.62, now);
    const filterA = ctx.createBiquadFilter();
    filterA.type = 'lowpass';
    filterA.frequency.setValueAtTime(420 * indoorMuffle, now);
    filterA.frequency.exponentialRampToValueAtTime(85 * Math.max(0.5, indoorMuffle), now + dur);
    const gainA = ctx.createGain();
    gainA.gain.setValueAtTime(0.0001, now);
    gainA.gain.exponentialRampToValueAtTime(peakGain, now + 0.14);
    gainA.gain.exponentialRampToValueAtTime(peakGain * 0.48, now + 0.9);
    gainA.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    rumbleA.connect(filterA).connect(gainA).connect(panner);
    rumbleA.start(now, Math.random() * 1.5, dur);

    // Secondary delayed city-skyline thunder echo
    const echoStart = now + 0.42 + Math.random() * 0.28;
    const rumbleB = ctx.createBufferSource();
    rumbleB.buffer = this.pinkNoiseBuffer;
    rumbleB.loop = true;
    rumbleB.playbackRate.setValueAtTime(0.48, echoStart);
    const filterB = ctx.createBiquadFilter();
    filterB.type = 'lowpass';
    filterB.frequency.setValueAtTime(260 * indoorMuffle, echoStart);
    filterB.frequency.exponentialRampToValueAtTime(64, echoStart + dur * 0.85);
    const gainB = ctx.createGain();
    gainB.gain.setValueAtTime(0.0001, echoStart);
    gainB.gain.exponentialRampToValueAtTime(peakGain * 0.56, echoStart + 0.22);
    gainB.gain.exponentialRampToValueAtTime(0.0001, echoStart + dur * 0.9);
    rumbleB.connect(filterB).connect(gainB).connect(panner);
    rumbleB.start(echoStart, Math.random() * 1.5, dur * 0.95);

    window.setTimeout(() => {
      subOsc.disconnect();
      subGain.disconnect();
      rumbleA.disconnect();
      filterA.disconnect();
      gainA.disconnect();
      rumbleB.disconnect();
      filterB.disconnect();
      gainB.disconnect();
      panner.disconnect();
    }, Math.ceil((dur + 0.9) * 1000));
  }

  private playSpatialWaterDrip(x: number, y: number, z: number) {
    const ctx = this.ensureReady();
    if (!ctx || !this.ambientBus) return;
    const now = ctx.currentTime;
    const panner = this.createSpatialPanner(ctx, x, y, z, 2.5, 26, 1.5);
    panner.connect(this.ambientBus);

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    const startHz = 950 + Math.random() * 480;
    osc.frequency.setValueAtTime(startHz, now);
    osc.frequency.exponentialRampToValueAtTime(startHz * 1.48, now + 0.055);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.042, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    osc.connect(gain).connect(panner);
    osc.start(now);
    osc.stop(now + 0.1);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
      panner.disconnect();
    };
  }

  private playSpatialMetalCreak(x: number, y: number, z: number) {
    const ctx = this.ensureReady();
    if (!ctx || !this.ambientBus) return;
    const now = ctx.currentTime;
    const panner = this.createSpatialPanner(ctx, x, y, z, 3.0, 26, 1.55);
    panner.connect(this.ambientBus);

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    const base = 180 + Math.random() * 140;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.linearRampToValueAtTime(base * 0.72, now + 0.34);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(420, now);
    filter.Q.setValueAtTime(5.5, now);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.036, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

    osc.connect(filter).connect(gain).connect(panner);
    osc.start(now);
    osc.stop(now + 0.4);
    osc.onended = () => {
      osc.disconnect();
      filter.disconnect();
      gain.disconnect();
      panner.disconnect();
    };
  }

  public dispose() {
    if (this.disposed) return;
    this.disposed = true;
    const g = this.ambientGraph;
    if (g) {
      try {
        g.windSrcA.stop();
        g.windSrcB.stop();
        g.campfireSrc.stop();
        g.fireSrc.stop();
        g.colonSrc.stop();
        g.boilerOsc.stop();
        g.boilerSubOsc.stop();
        g.fastFoodOsc.stop();
      } catch {
        // Ignore already-stopped nodes
      }
      g.windSrcA.disconnect();
      g.windSrcB.disconnect();
      g.windLowFilter.disconnect();
      g.windHowlFilter.disconnect();
      g.windLowGain.disconnect();
      g.windHowlGain.disconnect();
      g.campfireSrc.disconnect();
      g.campfireFilter.disconnect();
      g.campfireGain.disconnect();
      g.campfirePanner.disconnect();
      g.fireSrc.disconnect();
      g.fireFilter.disconnect();
      g.fireGain.disconnect();
      g.firePanner.disconnect();
      g.colonSrc.disconnect();
      g.colonFilter.disconnect();
      g.colonGain.disconnect();
      g.colonPanner.disconnect();
      g.boilerOsc.disconnect();
      g.boilerSubOsc.disconnect();
      g.boilerFilter.disconnect();
      g.boilerGain.disconnect();
      g.boilerPanner.disconnect();
      g.fastFoodOsc.disconnect();
      g.fastFoodFilter.disconnect();
      g.fastFoodGain.disconnect();
      g.fastFoodPanner.disconnect();
      this.ambientGraph = null;
    }
    for (let i = 0; i < this.breathVoices.length; i++) {
      const v = this.breathVoices[i];
      try {
        v.breathSrc.stop();
        v.vocalOsc.stop();
      } catch {
        // Ignore already-stopped breath nodes
      }
      v.breathSrc.disconnect();
      v.breathFilter.disconnect();
      v.breathGain.disconnect();
      v.vocalOsc.disconnect();
      v.vocalFilter.disconnect();
      v.vocalGain.disconnect();
      v.voiceGain.disconnect();
      v.panner.disconnect();
    }
    this.breathVoices = [];

    if (this.urbanEchoBus) {
      const eb = this.urbanEchoBus;
      eb.input.disconnect();
      eb.delayL.disconnect();
      eb.delayR.disconnect();
      eb.filterL.disconnect();
      eb.filterR.disconnect();
      eb.fbL.disconnect();
      eb.fbR.disconnect();
      eb.panL?.disconnect();
      eb.panR?.disconnect();
      eb.wetGain.disconnect();
      this.urbanEchoBus = null;
    }

    this.ambientBus?.disconnect();
    this.sfxBus?.disconnect();
    this.masterGain?.disconnect();
    this.ambientBus = null;
    this.sfxBus = null;
    this.masterGain = null;
    if (this.ctx) {
      void this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }

  private ensureReady(): AudioContext | null {
    if (this.disposed || this.muted || !this.ctx) return null;
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public playPistolShot(pos?: SpatialPos) {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.routeSfxNode(ctx, pos, 5.0, 75, 1.0, 950, 0.34);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(85, now + 0.065);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + 0.08);

    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2600, now);
      filter.Q.value = 1.1;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.15, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      src.connect(filter).connect(ng).connect(dest);
      src.start(now);
      src.stop(now + 0.075);
    }
  }

  public playRifleShot(pos?: SpatialPos) {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.routeSfxNode(ctx, pos, 6.0, 90, 0.95, 1100, 0.44);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(195, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.08);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + 0.095);

    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2100, now);
      filter.frequency.exponentialRampToValueAtTime(580, now + 0.09);
      filter.Q.value = 0.85;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.19, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      src.connect(filter).connect(ng).connect(dest);
      src.start(now);
      src.stop(now + 0.1);
    }
  }

  public playReload() {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.getSfxDest(ctx);
    [480, 720].forEach((hz, idx) => {
      const t = now + idx * 0.12;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(hz, t);
      gain.gain.setValueAtTime(0.055, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.045);
      osc.connect(gain).connect(dest);
      osc.start(t);
      osc.stop(t + 0.05);
    });
  }

  public playJump() {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.getSfxDest(ctx);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(260, now + 0.09);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  public playHit(combo = 1) {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.getSfxDest(ctx);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    const base = 150 + Math.min(combo, 8) * 14;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(62, now + 0.07);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + 0.085);
  }

  public playShatter(heavy = false, pos?: SpatialPos) {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.routeSfxNode(ctx, pos, 4.0, 56, 1.2, 650, heavy ? 0.22 : 0.1);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(heavy ? 110 : 170, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + (heavy ? 0.25 : 0.14));
    gain.gain.setValueAtTime(heavy ? 0.22 : 0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.26 : 0.15));
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + (heavy ? 0.27 : 0.16));

    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(heavy ? 1200 : 1900, now);
      filter.frequency.exponentialRampToValueAtTime(220, now + 0.18);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(heavy ? 0.22 : 0.13, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
      src.connect(filter).connect(ng).connect(dest);
      src.start(now);
      src.stop(now + 0.2);
    }
  }

  public playChop(pos?: SpatialPos) {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.routeSfxNode(ctx, pos, 3.0, 38, 1.4, 350);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(95, now + 0.07);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + 0.085);
  }

  public playPickup(combo = 1) {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.getSfxDest(ctx);
    const note = PICKUP_HZ[Math.min(combo, PICKUP_HZ.length) - 1] ?? PICKUP_HZ[0];
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(note, now);
    osc.frequency.exponentialRampToValueAtTime(note * 1.25, now + 0.09);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playFlare(pos?: SpatialPos) {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.routeSfxNode(ctx, pos, 7.0, 95, 0.9, 1200, 0.45);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(115, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.45);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + 0.5);

    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1900, now);
      filter.frequency.exponentialRampToValueAtTime(140, now + 0.52);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.28, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.54);
      src.connect(filter).connect(ng).connect(dest);
      src.start(now);
      src.stop(now + 0.55);
    }
  }

  public playStoke() {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.getSfxDest(ctx);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(310, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.16);
    gain.gain.setValueAtTime(0.13, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  public playHurt() {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.getSfxDest(ctx);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(135, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.24);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playWaveClear() {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.getSfxDest(ctx);
    const notes = [329.63, 440.0, 523.25, 659.25];
    notes.forEach((hz, i) => {
      const t = now + i * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(hz, t);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
      osc.connect(gain).connect(dest);
      osc.start(t);
      osc.stop(t + 0.36);
    });
  }

  public playGlassShatterFire(pos?: SpatialPos) {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.routeSfxNode(ctx, pos, 5.0, 65, 1.15, 900, 0.25);

    [2900, 4100, 5400].forEach((hz, idx) => {
      const t = now + idx * 0.018;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(hz, t);
      osc.frequency.exponentialRampToValueAtTime(hz * 0.45, t + 0.07);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.connect(gain).connect(dest);
      osc.start(t);
      osc.stop(t + 0.085);
    });

    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(950, now + 0.02);
      filter.frequency.exponentialRampToValueAtTime(340, now + 0.5);
      filter.Q.value = 0.7;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.24, now + 0.02);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.54);
      src.connect(filter).connect(ng).connect(dest);
      src.start(now + 0.015);
      src.stop(now + 0.56);
    }
  }

  public playNailBombBlast(pos?: SpatialPos) {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.routeSfxNode(ctx, pos, 6.5, 85, 0.95, 1100, 0.42);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.28);
    gain.gain.setValueAtTime(0.26, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + 0.32);

    [2200, 3350, 4700].forEach((hz, idx) => {
      const t = now + 0.02 + idx * 0.025;
      const ping = ctx.createOscillator();
      const pg = ctx.createGain();
      ping.type = 'square';
      ping.frequency.setValueAtTime(hz, t);
      ping.frequency.exponentialRampToValueAtTime(hz * 0.65, t + 0.09);
      pg.gain.setValueAtTime(0.055, t);
      pg.gain.exponentialRampToValueAtTime(0.001, t + 0.095);
      ping.connect(pg).connect(dest);
      ping.start(t);
      ping.stop(t + 0.1);
    });

    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1200, now);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.22, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
      src.connect(filter).connect(ng).connect(dest);
      src.start(now);
      src.stop(now + 0.26);
    }
  }

  public playBackpackEquip() {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.getSfxDest(ctx);
    [392.0, 523.25, 659.25].forEach((hz, idx) => {
      const t = now + idx * 0.065;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(hz, t);
      gain.gain.setValueAtTime(0.11, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
      osc.connect(gain).connect(dest);
      osc.start(t);
      osc.stop(t + 0.18);
    });
  }

  public playBottleShatter(pos?: SpatialPos) {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.routeSfxNode(ctx, pos, 4.0, 52, 1.25, 550, 0.16);
    [3100, 4450, 5750, 6900].forEach((hz, idx) => {
      const t = now + idx * 0.015;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(hz, t);
      osc.frequency.exponentialRampToValueAtTime(hz * 0.48, t + 0.09);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.095);
      osc.connect(gain).connect(dest);
      osc.start(t);
      osc.stop(t + 0.1);
    });
    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(2800, now);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.18, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      src.connect(filter).connect(ng).connect(dest);
      src.start(now);
      src.stop(now + 0.15);
    }
  }

  public playCanClatter(pos?: SpatialPos) {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.routeSfxNode(ctx, pos, 3.8, 48, 1.25, 550, 0.12);
    [0, 0.095].forEach((offset, bounceIdx) => {
      const vol = bounceIdx === 0 ? 0.11 : 0.065;
      [1180, 1780, 2420].forEach((hz, i) => {
        const t = now + offset + i * 0.008;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(hz * (bounceIdx === 0 ? 1 : 1.07), t);
        osc.frequency.exponentialRampToValueAtTime(hz * 0.72, t + 0.08);
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
        osc.connect(gain).connect(dest);
        osc.start(t);
        osc.stop(t + 0.095);
      });
    });
  }

  public playBrickThud(pos?: SpatialPos) {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.routeSfxNode(ctx, pos, 3.8, 46, 1.25, 450, 0.1);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(165, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.11);
    gain.gain.setValueAtTime(0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + 0.13);

    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(920, now);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.15, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      src.connect(filter).connect(ng).connect(dest);
      src.start(now);
      src.stop(now + 0.11);
    }
  }

  public playStealthTakedown(pos?: SpatialPos) {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.routeSfxNode(ctx, pos, 2.8, 32, 1.4, 420);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.16);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playStickHit(pos?: SpatialPos) {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.routeSfxNode(ctx, pos, 3.0, 38, 1.35, 380);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(62, now + 0.09);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + 0.11);

    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(950, now);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.14, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
      src.connect(filter).connect(ng).connect(dest);
      src.start(now);
      src.stop(now + 0.08);
    }
  }

  public playBowDraw() {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.getSfxDest(ctx);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.linearRampToValueAtTime(165, now + 0.18);
    gain.gain.setValueAtTime(0.055, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  public playBowRelease(pos?: SpatialPos) {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.routeSfxNode(ctx, pos, 3.0, 36, 1.35, 380);
    const twang = ctx.createOscillator();
    const tg = ctx.createGain();
    twang.type = 'triangle';
    twang.frequency.setValueAtTime(340, now);
    twang.frequency.exponentialRampToValueAtTime(118, now + 0.14);
    tg.gain.setValueAtTime(0.13, now);
    tg.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    twang.connect(tg).connect(dest);
    twang.start(now);
    twang.stop(now + 0.16);

    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2200, now);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.12, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      src.connect(filter).connect(ng).connect(dest);
      src.start(now);
      src.stop(now + 0.1);
    }
  }

  public playArrowHit(pos?: SpatialPos) {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.routeSfxNode(ctx, pos, 3.2, 42, 1.35, 320);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(85, now + 0.06);
    gain.gain.setValueAtTime(0.11, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + 0.075);
  }

  public playWeaponUnlock() {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.getSfxDest(ctx);
    [329.63, 440, 587.33].forEach((hz, idx) => {
      const t = now + idx * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(hz, t);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      osc.connect(gain).connect(dest);
      osc.start(t);
      osc.stop(t + 0.15);
    });
  }

  public playBatonHit(pos?: SpatialPos) {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.routeSfxNode(ctx, pos, 3.2, 40, 1.35, 360);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(72, now + 0.11);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + 0.13);

    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1150, now);
      filter.Q.setValueAtTime(1.6, now);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.15, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      src.connect(filter).connect(ng).connect(dest);
      src.start(now);
      src.stop(now + 0.09);
    }
  }

  public playArmorHit() {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.getSfxDest(ctx);
    [980, 1480].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i === 0 ? 'square' : 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.48, now + 0.09);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain).connect(dest);
      osc.start(now);
      osc.stop(now + 0.11);
    });
    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(2400, now);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.11, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      src.connect(filter).connect(ng).connect(dest);
      src.start(now);
      src.stop(now + 0.08);
    }
  }

  public playArmorBreak() {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.getSfxDest(ctx);
    [620, 390, 180].forEach((freq, idx) => {
      const t = now + idx * 0.032;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(85, t + 0.16);
      gain.gain.setValueAtTime(0.11, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.17);
      osc.connect(gain).connect(dest);
      osc.start(t);
      osc.stop(t + 0.18);
    });
    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1600, now);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.19, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      src.connect(filter).connect(ng).connect(dest);
      src.start(now);
      src.stop(now + 0.23);
    }
  }

  public playArmorEquip() {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.getSfxDest(ctx);
    [220, 330, 520].forEach((freq, idx) => {
      const t = now + idx * 0.05;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.1, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(gain).connect(dest);
      osc.start(t);
      osc.stop(t + 0.13);
    });
  }

  public playZombieSpit(pos?: SpatialPos) {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.routeSfxNode(ctx, pos, 3.5, 44, 1.35, 450);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(165, now);
    osc.frequency.exponentialRampToValueAtTime(310, now + 0.055);
    osc.frequency.exponentialRampToValueAtTime(88, now + 0.19);
    gain.gain.setValueAtTime(0.13, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.21);
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + 0.22);

    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(950, now);
      filter.frequency.exponentialRampToValueAtTime(2400, now + 0.06);
      filter.frequency.exponentialRampToValueAtTime(520, now + 0.2);
      filter.Q.setValueAtTime(2.6, now);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.22, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      src.connect(filter).connect(ng).connect(dest);
      src.start(now);
      src.stop(now + 0.23);
    }
  }

  public playSlimeSplat(pos?: SpatialPos) {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.routeSfxNode(ctx, pos, 3.0, 36, 1.35, 350);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(62, now + 0.11);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + 0.13);

    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1450, now);
      filter.frequency.exponentialRampToValueAtTime(260, now + 0.14);
      filter.Q.setValueAtTime(2.2, now);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.18, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      src.connect(filter).connect(ng).connect(dest);
      src.start(now);
      src.stop(now + 0.16);
    }
  }

  public playZombieAlert(kind: string, pos: SpatialPos) {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.routeSfxNode(ctx, pos, 4.0, 48, 1.25, 650, 0.12);
    const isBrute = kind === 'brute';
    const baseHz = isBrute ? 74 : kind === 'spitter' ? 148 : 110 + Math.random() * 26;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(baseHz * 0.85, now);
    osc.frequency.exponentialRampToValueAtTime(baseHz * 1.45, now + 0.11);
    osc.frequency.exponentialRampToValueAtTime(baseHz * 0.72, now + 0.36);
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isBrute ? 440 : 780, now);
    filter.Q.setValueAtTime(2.8, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(isBrute ? 0.18 : 0.13, now + 0.045);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc.connect(filter).connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  public playZombieHit(isHeadshot: boolean, pos: SpatialPos) {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.routeSfxNode(ctx, pos, 3.2, 42, 1.35, 340);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isHeadshot ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isHeadshot ? 320 : 185, now);
    osc.frequency.exponentialRampToValueAtTime(58, now + 0.085);
    gain.gain.setValueAtTime(isHeadshot ? 0.17 : 0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playFootstep(
    mode: 'walk' | 'run' | 'crouch',
    surface: FootstepSurface,
    footLeft: boolean,
    speedNorm = 1,
  ) {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const baseDest = this.getSfxDest(ctx);

    let dest: AudioNode = baseDest;
    let panner: StereoPannerNode | null = null;
    if (typeof ctx.createStereoPanner === 'function') {
      panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(footLeft ? -0.15 : 0.15, now);
      panner.connect(baseDest);
      dest = panner;
      window.setTimeout(() => panner?.disconnect(), 320);
    }

    const modeGain = mode === 'crouch' ? 0.38 : mode === 'run' ? 1.35 : 0.86;
    const spdScale = Math.max(0.55, Math.min(1.25, speedNorm));
    const level = modeGain * spdScale;
    const pitchJitter = 0.92 + Math.random() * 0.16;

    // Low footfall body thump (heel strike)
    const thumpHz =
      surface === 'wood'
        ? 138
        : surface === 'steel'
          ? 195
          : surface === 'marble' || surface === 'tile'
            ? 126
            : surface === 'carpet' || surface === 'grass'
              ? 78
              : 104;
    const thumpGainVal =
      (surface === 'carpet' || surface === 'grass' ? 0.04 : mode === 'crouch' ? 0.04 : 0.095) * level;
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = surface === 'wood' || surface === 'steel' ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(thumpHz * pitchJitter, now);
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(30, thumpHz * 0.38),
      now + (mode === 'crouch' ? 0.055 : 0.075),
    );
    oscGain.gain.setValueAtTime(0.001, now);
    oscGain.gain.exponentialRampToValueAtTime(Math.min(0.24, thumpGainVal), now + 0.007);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + (mode === 'crouch' ? 0.065 : 0.09));
    osc.connect(oscGain).connect(dest);
    osc.start(now);
    osc.stop(now + 0.095);

    // Metallic ring on steel scaffolding
    if (surface === 'steel') {
      const clank = ctx.createOscillator();
      const cg = ctx.createGain();
      clank.type = 'triangle';
      clank.frequency.setValueAtTime(430 * pitchJitter, now);
      clank.frequency.exponentialRampToValueAtTime(280, now + 0.11);
      cg.gain.setValueAtTime(Math.min(0.11, 0.06 * level), now);
      cg.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      clank.connect(cg).connect(dest);
      clank.start(now);
      clank.stop(now + 0.125);
    }

    // Wet puddle splash burst
    if (surface === 'water' && this.noiseBuffer) {
      const splashSrc = ctx.createBufferSource();
      splashSrc.buffer = this.noiseBuffer;
      const splashFilter = ctx.createBiquadFilter();
      splashFilter.type = 'bandpass';
      splashFilter.frequency.setValueAtTime((mode === 'crouch' ? 1150 : 1750) * pitchJitter, now);
      splashFilter.frequency.exponentialRampToValueAtTime(620, now + 0.14);
      splashFilter.Q.setValueAtTime(1.6, now);

      const sg = ctx.createGain();
      const sPeak = Math.min(0.24, (mode === 'crouch' ? 0.055 : 0.14) * level);
      sg.gain.setValueAtTime(0.001, now);
      sg.gain.exponentialRampToValueAtTime(sPeak, now + 0.012);
      sg.gain.exponentialRampToValueAtTime(0.0001, now + (mode === 'crouch' ? 0.1 : 0.16));
      splashSrc.connect(splashFilter).connect(sg).connect(dest);
      splashSrc.start(now, Math.random() * 0.2, 0.17);
    }

    // Sole grit / gravel crunch / carpet brush
    if (this.noiseBuffer) {
      const gritPasses = surface === 'gravel' ? (mode === 'crouch' ? 1 : 2) : 1;
      for (let p = 0; p < gritPasses; p++) {
        const t = now + p * 0.036;
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = surface === 'carpet' ? 'lowpass' : 'bandpass';
        const centerHz =
          surface === 'gravel'
            ? 2400 + p * 750
            : surface === 'grass'
              ? 3050
              : surface === 'water'
                ? 1350
                : surface === 'marble' || surface === 'plaza' || surface === 'tile'
                  ? 1850
                  : surface === 'carpet'
                    ? 580
                    : 1450;
        filter.frequency.setValueAtTime(
          centerHz * (mode === 'crouch' ? 0.72 : pitchJitter),
          t,
        );
        filter.Q.setValueAtTime(surface === 'gravel' ? 2.2 : surface === 'grass' ? 0.85 : 1.3, t);

        const ng = ctx.createGain();
        const baseGrit =
          surface === 'gravel'
            ? 0.095
            : surface === 'grass'
              ? 0.068
              : surface === 'water'
                ? 0.05
                : surface === 'carpet'
                  ? 0.035
                  : surface === 'marble' || surface === 'tile'
                    ? 0.055
                    : 0.068;
        const gPeak = Math.min(0.22, baseGrit * level * (p === 0 ? 1 : 0.7));
        ng.gain.setValueAtTime(0.001, t);
        ng.gain.exponentialRampToValueAtTime(gPeak, t + 0.006);
        ng.gain.exponentialRampToValueAtTime(0.0001, t + (mode === 'crouch' ? 0.045 : 0.065));
        src.connect(filter).connect(ng).connect(dest);
        const offset = Math.random() * Math.max(0.05, this.noiseBuffer.duration - 0.1);
        src.start(t, offset, 0.08);
      }
    }
  }

  public playLandStep(surface: FootstepSurface, impactNorm = 0.85) {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.getSfxDest(ctx);
    const scale = Math.max(0.45, Math.min(1.4, impactNorm));

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(
      surface === 'wood' ? 124 : surface === 'water' ? 88 : surface === 'grass' ? 80 : 96,
      now,
    );
    osc.frequency.exponentialRampToValueAtTime(34, now + 0.13);
    gain.gain.setValueAtTime(0.18 * scale, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
    osc.connect(gain).connect(dest);
    osc.start(now);
    osc.stop(now + 0.15);

    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(
        surface === 'gravel' ? 2100 : surface === 'grass' ? 2150 : surface === 'water' ? 1550 : 1200,
        now,
      );
      filter.Q.setValueAtTime(surface === 'grass' ? 0.9 : 1.2, now);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(
        (surface === 'carpet' ? 0.06 : surface === 'grass' ? 0.11 : surface === 'water' ? 0.2 : 0.15) * scale,
        now,
      );
      ng.gain.exponentialRampToValueAtTime(0.001, now + (surface === 'water' ? 0.2 : 0.11));
      src.connect(filter).connect(ng).connect(dest);
      src.start(now, Math.random() * 0.3, surface === 'water' ? 0.21 : 0.12);
    }
  }

  public playRockKick(
    x: number,
    y: number,
    z: number,
    intensity = 0.6,
    isStone = true,
  ) {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (now - this.lastRockKickTime < 0.085) return;
    this.lastRockKickTime = now;

    const dest = this.routeSfxNode(ctx, { x, y, z }, 2.2, 24, 1.5, 320);
    const vol = Math.max(0.03, Math.min(0.16, 0.11 * intensity));
    const baseHz = (isStone ? 980 : 760) + Math.random() * 620;

    for (let i = 0; i < 2; i++) {
      const t = now + i * (0.028 + Math.random() * 0.02);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const hz = baseHz * (i === 0 ? 1 : 1.18 + Math.random() * 0.2);
      osc.frequency.setValueAtTime(hz, t);
      osc.frequency.exponentialRampToValueAtTime(hz * 0.56, t + 0.045);
      gain.gain.setValueAtTime(vol * (i === 0 ? 1 : 0.65), t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      osc.connect(gain).connect(dest);
      osc.start(t);
      osc.stop(t + 0.055);
    }

    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(1950, now);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(vol * 0.75, now);
      ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);
      src.connect(filter).connect(ng).connect(dest);
      src.start(now, Math.random() * 0.25, 0.07);
    }
  }

  public playLightPropHit(
    kind: 'can' | 'bottle' | 'cone' | 'box',
    pos: SpatialPos,
    intensity = 0.75,
  ) {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const scale = Math.max(0.3, Math.min(1.25, intensity));
    if (kind === 'can') {
      this.playCanClatter(pos);
      return;
    }
    const now = ctx.currentTime;
    const dest = this.routeSfxNode(ctx, pos, 2.8, 38, 1.4, 380, 0.1);
    if (kind === 'bottle') {
      // Crisp hollow glass clink + roll rattle
      [1420, 2260, 3180].forEach((hz, i) => {
        const t = now + i * 0.012;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(hz * (0.94 + Math.random() * 0.12), t);
        osc.frequency.exponentialRampToValueAtTime(hz * 0.85, t + 0.09);
        g.gain.setValueAtTime(0.08 * scale, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
        osc.connect(g).connect(dest);
        osc.start(t);
        osc.stop(t + 0.12);
      });
    } else {
      // Hollow plastic cone or cardboard box bump
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      const startHz = kind === 'cone' ? 210 : 125;
      osc.frequency.setValueAtTime(startHz * (0.9 + Math.random() * 0.18), now);
      osc.frequency.exponentialRampToValueAtTime(startHz * 0.42, now + 0.095);
      g.gain.setValueAtTime(0.14 * scale, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.105);
      osc.connect(g).connect(dest);
      osc.start(now);
      osc.stop(now + 0.11);

      if (this.noiseBuffer) {
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(kind === 'cone' ? 920 : 540, now);
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(0.09 * scale, now);
        ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
        src.connect(filter).connect(ng).connect(dest);
        src.start(now, Math.random() * 0.2, 0.085);
      }
    }
  }

  public playTrashRummage() {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.getSfxDest(ctx);

    if (this.noiseBuffer) {
      for (let i = 0; i < 2; i++) {
        const t = now + i * 0.085;
        const src = ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(i === 0 ? 780 : 1240, t);
        filter.Q.setValueAtTime(1.4, t);
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(0.14, t);
        ng.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
        src.connect(filter).connect(ng).connect(dest);
        src.start(t);
        src.stop(t + 0.12);
      }
    }

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1650, now + 0.07);
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.18);
    g.gain.setValueAtTime(0.055, now + 0.07);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
    osc.connect(g).connect(dest);
    osc.start(now + 0.07);
    osc.stop(now + 0.2);
  }

  public playRatSqueak(gainScale = 1, pos?: SpatialPos) {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.routeSfxNode(ctx, pos, 2.8, 34, 1.35, 280);
    const vol = Math.min(0.22, Math.max(0.02, 0.11 * gainScale));

    for (let i = 0; i < 2; i++) {
      const t = now + i * 0.065;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const base = i === 0 ? 2650 : 2950;
      osc.frequency.setValueAtTime(base, t);
      osc.frequency.exponentialRampToValueAtTime(base * 1.28, t + 0.022);
      osc.frequency.exponentialRampToValueAtTime(base * 0.78, t + 0.058);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.062);
      osc.connect(gain).connect(dest);
      osc.start(t);
      osc.stop(t + 0.065);
    }
  }

  public playChapitasJingle(gainScale = 1, pos?: SpatialPos) {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.routeSfxNode(ctx, pos, 2.8, 34, 1.35, 280);
    const vol = Math.min(0.18, Math.max(0.015, 0.075 * gainScale));

    [2940, 4180, 5360].forEach((freq, idx) => {
      const t = now + idx * 0.022;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.92, t + 0.075);
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.connect(gain).connect(dest);
      osc.start(t);
      osc.stop(t + 0.085);
    });
  }

  public playRatCaught(pos?: SpatialPos) {
    const ctx = this.ensureReady();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dest = this.routeSfxNode(ctx, pos, 3.2, 38, 1.35, 320);

    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(3200, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.14);
    g.gain.setValueAtTime(0.11, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(g).connect(dest);
    osc.start(now);
    osc.stop(now + 0.16);

    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(920, now);
      filter.Q.setValueAtTime(1.8, now);
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.16, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      src.connect(filter).connect(ng).connect(dest);
      src.start(now);
      src.stop(now + 0.12);
    }
  }
}
