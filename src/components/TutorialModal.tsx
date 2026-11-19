import React, { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Building2,
  CheckCircle2,
  Compass,
  Crosshair,
  Eye,
  EyeOff,
  Flame,
  Gamepad2,
  Hand,
  Play,
  ShieldAlert,
  Sparkles,
  Target,
  Volume2,
  X,
} from 'lucide-react';
import { WeaponIcon } from './WeaponCarousel';
import type { WeaponKind } from '../game/types';

interface TutorialModalProps {
  open: boolean;
  onClose: () => void;
  onStartInteractive3D: () => void;
}

type TutorialTabId = 'progresion' | 'arco_sigilo' | 'controles' | 'misiones';

const TUTORIAL_TABS: { id: TutorialTabId; label: string; icon: React.ReactNode }[] = [
  { id: 'progresion', label: 'Arsenal Interactivo', icon: <Crosshair className="h-3.5 w-3.5" /> },
  { id: 'arco_sigilo', label: 'Práctica Arco y Sigilo', icon: <EyeOff className="h-3.5 w-3.5" /> },
  { id: 'controles', label: 'Probador de Teclas', icon: <Gamepad2 className="h-3.5 w-3.5" /> },
  { id: 'misiones', label: 'Misiones y Taller', icon: <Building2 className="h-3.5 w-3.5" /> },
];

interface ArsenalCardMeta {
  id: WeaponKind | 'police' | 'gendarme' | 'gendarme_heavy';
  name: string;
  unlock: string;
  damagePct: number;
  noisePct: number;
  rangePct: number;
  summary: string;
  badge: string;
}

const ARSENAL_CARDS: ArsenalCardMeta[] = [
  {
    id: 'unarmed',
    name: 'Puños (Inicio)',
    unlock: 'Disponible al empezar · Tecla [1]',
    damagePct: 22,
    noisePct: 10,
    rangePct: 18,
    badge: 'Sigilo',
    summary:
      'Comienzas sin armas. Ideal para acercarte agachado por la espalda y ejecutar una eliminación silenciosa instantánea.',
  },
  {
    id: 'stick',
    name: 'Palo de Madera',
    unlock: 'Tirado en calles y pasillos · Tecla [2]',
    damagePct: 45,
    noisePct: 15,
    rangePct: 28,
    badge: 'Melee',
    summary:
      'Tu primera defensa física. Duplica el daño y alcance frente a los puños, y permite remates sigilosos con gran empuje.',
  },
  {
    id: 'baton',
    name: 'Bastón Policía',
    unlock: 'Botín de Zombie Policía · Tecla [V] o [2]',
    damagePct: 62,
    noisePct: 14,
    rangePct: 34,
    badge: 'Tonfa',
    summary:
      'Bastón policial táctico de golpes rápidos y contundentes. Permite remates sigilosos incluso sobre infectados pesados y gendarmes.',
  },
  {
    id: 'bow',
    name: 'Arco Recurvo',
    unlock: 'Pickup en mapa + carcajes · Tecla [3]',
    damagePct: 86,
    noisePct: 14,
    rangePct: 82,
    badge: 'Silencioso',
    summary:
      'Mantén presionado para tensar la cuerda y suelta para disparar flechas con mínima firma sonora (2.5 m).',
  },
  {
    id: 'pistol',
    name: 'Revólver .38',
    unlock: 'Botín de Zombie Policía · Tecla [4]',
    damagePct: 68,
    noisePct: 78,
    rangePct: 75,
    badge: '8 tiros',
    summary:
      'Arma semiautomática de 8 disparos. Se desbloquea al abatir a un Zombie Policía que lo porte.',
  },
  {
    id: 'rifle',
    name: 'Fusil FAL',
    unlock: 'Botín de Gendarme · Tecla [5]',
    damagePct: 92,
    noisePct: 96,
    rangePct: 94,
    badge: '20 ráfaga',
    summary:
      'Ráfaga rápida de alto calibre (20 disparos). Arrasa jaurías enteras y su munición cae de los Gendarmes.',
  },
  {
    id: 'police',
    name: 'Zombie Policía',
    unlock: 'Patrulla oleadas y Teatro Colón',
    damagePct: 58,
    noisePct: 65,
    rangePct: 38,
    badge: 'Revólver / Bastón',
    summary:
      'Uniforme azul y gorra policial. Porta Revólver .38, munición de revólver y/o Bastón Policía; al abatirlo deja caer su equipo.',
  },
  {
    id: 'gendarme',
    name: 'Zombie Gendarme',
    unlock: 'Oleadas tácticas y Teatro Colón',
    damagePct: 72,
    noisePct: 70,
    rangePct: 45,
    badge: 'FAL / Cargadores',
    summary:
      'Uniforme verde oliva con boina y correajes tácticos. Porta Fusil FAL y/o cargadores de 7.62 mm que puedes recoger al derrotarlo.',
  },
  {
    id: 'gendarme_heavy',
    name: 'Gendarme Equipado',
    unlock: 'Jefe blindado · Oleada 2 y Palcos Colón',
    damagePct: 90,
    noisePct: 55,
    rangePct: 42,
    badge: 'Casco + Chaleco + FAL',
    summary:
      'Lento, pesado y blindado con paso de ogro: su casco balístico y chaleco antibalas absorben disparos hasta romperse. Al eliminarlo suelta casco, chaleco y municiones de fusil.',
  },
];

const TESTABLE_KEYS: { code: string; alt?: string; label: string; desc: string }[] = [
  { code: 'KeyW', label: 'W', desc: 'Avanzar' },
  { code: 'KeyA', label: 'A', desc: 'Izquierda' },
  { code: 'KeyS', label: 'S', desc: 'Atrás' },
  { code: 'KeyD', label: 'D', desc: 'Derecha' },
  { code: 'ShiftLeft', alt: 'ShiftRight', label: 'Shift', desc: 'Correr' },
  { code: 'KeyC', alt: 'ControlLeft', label: 'C / Ctrl', desc: 'Sigilo' },
  { code: 'Digit1', label: '1', desc: 'Puños' },
  { code: 'Digit2', label: '2', desc: 'Palo' },
  { code: 'KeyV', label: 'V', desc: 'Bastón' },
  { code: 'Digit3', label: '3', desc: 'Arco' },
  { code: 'Digit4', label: '4', desc: 'Revólver' },
  { code: 'Digit5', label: '5', desc: 'FAL' },
  { code: 'KeyR', label: 'R', desc: 'Recargar' },
  { code: 'KeyZ', label: 'Z', desc: 'Distracción' },
  { code: 'KeyG', label: 'G', desc: 'Molotov' },
  { code: 'KeyT', label: 'T', desc: 'Clavos' },
  { code: 'Tab', alt: 'KeyB', label: 'Tab / B', desc: 'Mochila' },
];

export const TutorialModal: React.FC<TutorialModalProps> = ({
  open,
  onClose,
  onStartInteractive3D,
}) => {
  const [activeTab, setActiveTab] = useState<TutorialTabId>('progresion');
  const [selectedArsenal, setSelectedArsenal] = useState<ArsenalCardMeta['id']>('bow');

  // Interactive Bow Simulator state
  const [simDraw, setSimDraw] = useState(0);
  const [simHolding, setSimHolding] = useState(false);
  const [simShots, setSimShots] = useState(0);
  const [simLastResult, setSimLastResult] = useState<string>(
    'Mantén presionado el blanco para tensar la cuerda y suelta para disparar.',
  );
  const [simStealthOn, setSimStealthOn] = useState(true);
  const [simDistractFlash, setSimDistractFlash] = useState(false);

  // Interactive Live Key Tester state
  const [pressedKeys, setPressedKeys] = useState<Set<string>>(() => new Set());
  const [testedKeys, setTestedKeys] = useState<Set<string>>(() => new Set());

  // Interactive Craft Simulator state
  const [simChem, setSimChem] = useState(2);
  const [simScrap, setSimScrap] = useState(2);
  const [simPowder, setSimPowder] = useState(2);
  const [simCraftMsg, setSimCraftMsg] = useState<string | null>(null);

  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(0);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.code === 'Tab' && activeTab === 'controles') {
        e.preventDefault();
      }
      setPressedKeys((prev) => {
        const next = new Set(prev);
        next.add(e.code);
        return next;
      });
      setTestedKeys((prev) => {
        if (prev.has(e.code)) return prev;
        const next = new Set(prev);
        next.add(e.code);
        return next;
      });
    };
    const onKeyUp = (e: KeyboardEvent) => {
      setPressedKeys((prev) => {
        if (!prev.has(e.code)) return prev;
        const next = new Set(prev);
        next.delete(e.code);
        return next;
      });
    };
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
    };
  }, [open, onClose, activeTab]);

  // Smooth RAF loop for interactive bow tension simulator
  useEffect(() => {
    if (!open || !simHolding) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    lastTsRef.current = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTsRef.current) / 1000);
      lastTsRef.current = now;
      setSimDraw((prev) => Math.min(1, prev + dt / 0.55));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [open, simHolding]);

  if (!open) return null;

  const activeArsenal =
    ARSENAL_CARDS.find((c) => c.id === selectedArsenal) ?? ARSENAL_CARDS[2];

  const handleReleaseSimBow = () => {
    if (!simHolding) return;
    setSimHolding(false);
    const pct = Math.round(simDraw * 100);
    const dmg = Math.round(42 + Math.max(0.28, simDraw) * 38);
    setSimShots((n) => n + 1);
    setSimLastResult(
      pct >= 85
        ? `¡Disparo perfecto (${pct}% tensión)! Daño estimado: ${dmg} · Ruido: 2.5 m (Sigiloso)`
        : `Flecha lanzada al ${pct}% de tensión · Daño: ${dmg}. Mantén 0.55 s para tensión máxima.`,
    );
    setSimDraw(0);
  };

  const testedCount = TESTABLE_KEYS.filter(
    (k) => testedKeys.has(k.code) || (k.alt ? testedKeys.has(k.alt) : false),
  ).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tutorial interactivo Zona Cero"
      onClick={onClose}
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-[#05070c]/82 p-3 sm:p-5 backdrop-blur-sm"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-emerald-400/35 bg-[#0b0f17] text-slate-100 shadow-2xl"
      >
        {/* Header + Hero 3D Interactive Training CTA */}
        <div className="border-b border-white/10 bg-[#090d14] px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-400/45 bg-emerald-500/15 text-emerald-300">
                <BookOpen className="h-4.5 w-4.5" />
              </div>
              <div>
                <h2 className="font-display text-lg sm:text-xl text-amber-200 leading-tight">
                  Tutorial Interactivo
                </h2>
                <p className="text-[11px] text-slate-400">
                  Practica en el campo 3D paso a paso o prueba las mecánicas aquí mismo
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar tutorial"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-slate-900 text-slate-300 hover:border-amber-400/50 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Direct Launch Playable 3D Tutorial Banner */}
          <div className="mt-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-emerald-400/35 bg-gradient-to-r from-emerald-950/75 via-[#0c1a1c] to-amber-950/40 p-3">
            <div className="text-xs">
              <div className="font-semibold text-emerald-200 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
                <span>Campo de Prácticas 3D Guiado (6 pasos)</span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-300">
                Practica sigilo, recoger palo, distracción, arco y saqueo a un Zombie Policía en vivo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onStartInteractive3D();
              }}
              className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 px-4 py-2.5 text-xs font-semibold text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] transition-all active:scale-[0.98] cursor-pointer whitespace-nowrap"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Jugar Tutorial 3D</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1.5 border-b border-white/10 bg-[#080b11] px-4 py-2.5">
          {TUTORIAL_TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                  active
                    ? 'border-amber-400/70 bg-amber-500/20 text-amber-100 shadow-sm'
                    : 'border-white/10 bg-slate-900/70 text-slate-400 hover:border-white/25 hover:text-slate-200'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Interactive Labs */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs leading-relaxed text-slate-300">
          {activeTab === 'progresion' && (
            <>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Selecciona cada elemento para inspeccionar estadísticas y desbloqueo:</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ARSENAL_CARDS.map((item) => {
                  const selected = selectedArsenal === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedArsenal(item.id)}
                      className={`flex items-center gap-2 rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                        selected
                          ? 'border-amber-400/75 bg-amber-500/15 text-amber-100 ring-1 ring-amber-400/30'
                          : 'border-white/10 bg-slate-900/65 text-slate-300 hover:border-white/25'
                      }`}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-black/40 border border-white/10">
                        {item.id === 'police' ? (
                          <ShieldAlert className="h-4 w-4 text-sky-300" />
                        ) : item.id === 'gendarme' ? (
                          <ShieldAlert className="h-4 w-4 text-emerald-300" />
                        ) : item.id === 'gendarme_heavy' ? (
                          <ShieldAlert className="h-4 w-4 text-amber-300" />
                        ) : item.id === 'unarmed' ? (
                          <Hand className="h-4 w-4 text-emerald-300" />
                        ) : (
                          <WeaponIcon weapon={item.id} className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-xs">{item.name}</div>
                        <div className="text-[10px] font-mono-tabular text-amber-300/90">
                          {item.badge}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Arsenal Inspector */}
              <div className="rounded-xl border border-white/12 bg-slate-900/80 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold text-white">{activeArsenal.name}</div>
                    <div className="text-[11px] font-mono-tabular text-emerald-300">
                      {activeArsenal.unlock}
                    </div>
                  </div>
                  <span className="rounded-md border border-amber-400/40 bg-amber-500/15 px-2.5 py-1 text-[10px] font-mono-tabular text-amber-200">
                    {activeArsenal.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-300">{activeArsenal.summary}</p>
                <div className="grid grid-cols-3 gap-3 pt-1">
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Daño</span>
                      <span className="font-mono-tabular">{activeArsenal.damagePct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-rose-400 transition-all duration-300"
                        style={{ width: `${activeArsenal.damagePct}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Alcance</span>
                      <span className="font-mono-tabular">{activeArsenal.rangePct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-sky-400 transition-all duration-300"
                        style={{ width: `${activeArsenal.rangePct}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Ruido</span>
                      <span className="font-mono-tabular">{activeArsenal.noisePct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          activeArsenal.noisePct > 50 ? 'bg-amber-400' : 'bg-emerald-400'
                        }`}
                        style={{ width: `${activeArsenal.noisePct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'arco_sigilo' && (
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Interactive Bow Draw Pad */}
              <div className="rounded-xl border border-teal-400/30 bg-teal-950/20 p-4 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-teal-200 flex items-center gap-1.5">
                    <WeaponIcon weapon="bow" className="h-4 w-4" />
                    <span>Simulador de Arco</span>
                  </span>
                  <span className="font-mono-tabular text-[11px] text-teal-300">
                    Tiros: {simShots}
                  </span>
                </div>

                <button
                  type="button"
                  onPointerDown={() => setSimHolding(true)}
                  onPointerUp={handleReleaseSimBow}
                  onPointerLeave={handleReleaseSimBow}
                  onPointerCancel={handleReleaseSimBow}
                  className="relative flex h-32 w-full flex-col items-center justify-center rounded-xl border border-teal-400/40 bg-[#080d14] select-none touch-none cursor-pointer active:scale-[0.99]"
                >
                  <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
                    <circle
                      cx="32"
                      cy="32"
                      r="25"
                      fill="none"
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth="3"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r="25"
                      fill="none"
                      stroke={simDraw >= 0.85 ? '#34d399' : '#2dd4bf'}
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 25}
                      strokeDashoffset={2 * Math.PI * 25 * (1 - simDraw)}
                    />
                  </svg>
                  <Target
                    className={`absolute h-5 w-5 ${
                      simDraw >= 0.85 ? 'text-emerald-300 scale-110' : 'text-teal-200'
                    } transition-transform`}
                  />
                  <span className="mt-1 text-[11px] font-mono-tabular text-slate-200">
                    {simHolding
                      ? `Tensando: ${Math.round(simDraw * 100)}% — ¡Suelta!`
                      : 'Mantén presionado aquí para tensar'}
                  </span>
                </button>

                <p className="text-[11px] text-teal-100/90 min-h-[2.4rem]">{simLastResult}</p>
              </div>

              {/* Interactive Stealth & Distraction Tester */}
              <div className="rounded-xl border border-emerald-400/30 bg-emerald-950/20 p-4 flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-200 flex items-center gap-1.5">
                    {simStealthOn ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span>Prueba de Sigilo y Distracción</span>
                  </span>
                </div>

                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => setSimStealthOn((s) => !s)}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-xs font-medium transition-all cursor-pointer ${
                      simStealthOn
                        ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-100'
                        : 'border-amber-400/50 bg-amber-500/15 text-amber-100'
                    }`}
                  >
                    {simStealthOn
                      ? 'Estado: AGACHADO (Sigilo activo · Ruido mínimo)'
                      : 'Estado: DE PIE (Pulsa para agacharte y activar sigilo)'}
                  </button>

                  <div className="rounded-lg border border-white/10 bg-black/35 p-2.5 text-[11px]">
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Detección de infectados</span>
                      <span className={simStealthOn ? 'text-emerald-300' : 'text-amber-300'}>
                        {simStealthOn ? '5.8 m · Silencioso' : '13+ m · Visible'}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          simStealthOn ? 'w-[28%] bg-emerald-400' : 'w-[78%] bg-amber-400'
                        }`}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSimDistractFlash(true);
                      window.setTimeout(() => setSimDistractFlash(false), 900);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-lime-400/50 bg-lime-950/50 hover:bg-lime-900/55 px-3 py-2 text-xs font-medium text-lime-200 cursor-pointer active:scale-[0.98]"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    <span>
                      {simDistractFlash
                        ? '¡Botella rota! Zombies atraídos hacia el sonido'
                        : 'Simular lanzamiento de botella [Z]'}
                    </span>
                  </button>
                </div>

                <p className="text-[11px] text-slate-300">
                  Acércate agachado por la espalda con Puños o Palo para ejecutar una{' '}
                  <strong className="text-emerald-200">eliminación sigilosa instantánea</strong>.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'controles' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-sky-400/25 bg-sky-950/20 px-3 py-2 text-[11px]">
                <span className="text-sky-200">
                  Presiona las teclas en tu teclado para probarlas en tiempo real:
                </span>
                <span className="font-mono-tabular font-semibold text-emerald-300">
                  {testedCount}/{TESTABLE_KEYS.length} probadas
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TESTABLE_KEYS.map((k) => {
                  const isDown =
                    pressedKeys.has(k.code) || (k.alt ? pressedKeys.has(k.alt) : false);
                  const wasTested =
                    testedKeys.has(k.code) || (k.alt ? testedKeys.has(k.alt) : false);
                  return (
                    <div
                      key={k.code}
                      className={`flex items-center justify-between rounded-lg border px-2.5 py-2 transition-all ${
                        isDown
                          ? 'border-amber-300 bg-amber-400/25 text-white scale-[1.03]'
                          : wasTested
                            ? 'border-emerald-400/50 bg-emerald-950/40 text-emerald-200'
                            : 'border-white/10 bg-slate-900/70 text-slate-300'
                      }`}
                    >
                      <div>
                        <div className="font-mono-tabular text-xs font-bold">{k.label}</div>
                        <div className="text-[10px] text-slate-400">{k.desc}</div>
                      </div>
                      {wasTested && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300 shrink-0" />}
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl border border-white/10 bg-slate-900/75 p-3 text-[11px] text-slate-300">
                <strong className="text-amber-200">En móvil / táctil:</strong> desliza la mitad
                izquierda para moverte/correr, mantén el botón flotante de arma para desplegar la{' '}
                <strong className="text-white">rueda radial de 9 sectores</strong> y usa el botón
                multifunción para disparar, tensar el arco o girar la cámara mientras apuntas.
              </div>
            </div>
          )}

          {activeTab === 'misiones' && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-slate-900/65 p-3.5">
                  <div className="flex items-center gap-2 font-semibold text-amber-200">
                    <Compass className="h-4 w-4 shrink-0" />
                    <span>Misión 1 · Av. 9 de Julio</span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-300">
                    Empieza desarmado, recoge palos y el arco, abate zombies policía para tomar su
                    Revólver o FAL y asegura la escalinata del Teatro Colón.
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-400/25 bg-emerald-950/20 p-3.5">
                  <div className="flex items-center gap-2 font-semibold text-emerald-200">
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span>Misión 2 · Teatro Colón</span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-300">
                    Limpia el Salón Principal, Palcos Piso 1, Cazuela Piso 2 y Calderas para
                    rescatar a Sofía Méndez y abrir la Base Permanente en la Sala Dorada.
                  </p>
                </div>
              </div>

              {/* Interactive Chemical Crafting Mini-Preview */}
              <div className="rounded-xl border border-orange-400/30 bg-orange-950/20 p-3.5 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-orange-200 flex items-center gap-1.5">
                    <Flame className="h-4 w-4" />
                    <span>Simulador de Taller Químico (Base Colón)</span>
                  </span>
                  <div className="flex gap-2 font-mono-tabular text-[11px]">
                    <span className="text-orange-300">Químicos: {simChem}</span>
                    <span className="text-sky-300">Chatarra: {simScrap}</span>
                    <span className="text-amber-300">Pólvora: {simPowder}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (simChem >= 1 && simPowder >= 1) {
                        setSimChem((c) => c - 1);
                        setSimPowder((p) => p - 1);
                        setSimCraftMsg('¡Molotov fabricada! (Requiere 1 Químico + 1 Pólvora)');
                      } else {
                        setSimCraftMsg('Faltan provisiones: recolecta más en Av. 9 de Julio.');
                      }
                    }}
                    className="rounded-lg border border-orange-400/45 bg-orange-900/40 hover:bg-orange-800/50 px-3 py-1.5 text-[11px] font-medium text-orange-100 cursor-pointer"
                  >
                    Fabricar Molotov (1Q + 1P)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (simScrap >= 1 && simPowder >= 1) {
                        setSimScrap((s) => s - 1);
                        setSimPowder((p) => p - 1);
                        setSimCraftMsg('¡Bomba de Clavos armada! (1 Chatarra + 1 Pólvora)');
                      } else {
                        setSimCraftMsg('Faltan provisiones: recolecta más en Av. 9 de Julio.');
                      }
                    }}
                    className="rounded-lg border border-sky-400/45 bg-sky-900/40 hover:bg-sky-800/50 px-3 py-1.5 text-[11px] font-medium text-sky-100 cursor-pointer"
                  >
                    Fabricar B. Clavos (1Ch + 1P)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSimChem(2);
                      setSimScrap(2);
                      setSimPowder(2);
                      setSimCraftMsg('Provisiones de práctica restablecidas.');
                    }}
                    className="rounded-lg border border-white/15 bg-slate-900 hover:bg-slate-800 px-3 py-1.5 text-[11px] text-slate-300 cursor-pointer"
                  >
                    Recargar ejemplo
                  </button>
                </div>
                {simCraftMsg && (
                  <div className="text-[11px] text-amber-200">{simCraftMsg}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#090d14] px-5 py-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              onStartInteractive3D();
            }}
            className="flex items-center gap-1.5 rounded-lg border border-emerald-400/50 bg-emerald-950/60 hover:bg-emerald-900/70 px-4 py-2 text-xs font-semibold text-emerald-200 transition-colors cursor-pointer"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Ir al Campo de Prácticas 3D</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 px-5 py-2 text-xs font-semibold text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition-all active:scale-[0.98] cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
