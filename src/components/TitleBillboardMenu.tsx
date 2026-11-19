import React, { useCallback, useRef, useState } from 'react';
import {
  BookOpen,
  Building2,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Play,
  Volume2,
  VolumeX,
  Wrench,
} from 'lucide-react';
import type { DifficultyId, StoryMissionId } from '../game/types';
import type { StudioTab } from './StudioModal';

interface DifficultyOption {
  id: DifficultyId;
  label: string;
  detail: string;
}

interface MissionOption {
  id: StoryMissionId;
  code: string;
  title: string;
  briefHeader: string;
  synopsis: string;
  subtitle: string;
  ctaLabel: string;
  plateTheme: 'amber' | 'olive' | 'steel';
}

const MISSIONS: MissionOption[] = [
  {
    id: 1,
    code: 'MISIÓN 01',
    title: 'Misión 1: Refugio en el Colón',
    briefHeader: 'MISIÓN 01 · REFUGIO EN EL TEATRO COLÓN · RICARDO LÓPEZ',
    synopsis:
      'Año 2050. Una vacuna mutante desató el brote C-50. Sin provisiones tras perder su hogar en el Conurbano, Ricardo llega a la Av. 9 de Julio para despejar las jaurías del centro y asegurar el Teatro Colón.',
    subtitle: 'Av. 9 de Julio · Plaza de la República y Metrobús',
    ctaLabel: 'Iniciar Misión 1',
    plateTheme: 'amber',
  },
  {
    id: 2,
    code: 'MISIÓN 02',
    title: 'Misión 2: Asegurar el Refugio',
    briefHeader: 'MISIÓN 02 · ASEGURAR EL REFUGIO · INTERIOR DEL COLÓN',
    synopsis:
      'Con la escalinata despejada, Ricardo irrumpe en los tres niveles del Teatro Colón — Salón Principal, Palcos y Calderas — para erradicar a los infectados y rescatar a Sofía «Chispa» Méndez.',
    subtitle: 'Interior del Teatro Colón · Salón, Palcos y Calderas',
    ctaLabel: 'Iniciar Misión 2',
    plateTheme: 'olive',
  },
  {
    id: 3,
    code: 'MISIÓN 03',
    title: 'Misión 3: Suministros y Rescate',
    briefHeader: 'MISIÓN 03 · SUMINISTROS Y RESCATE · MC-PORTEÑO 24H',
    synopsis:
      'Chispa necesita químicos, chatarra y pólvora para fabricar explosivos. Ricardo sale al cruce comercial de la 9 de Julio, limpia el local Mc-Porteño 24H y escolta al mecánico Mateo al refugio.',
    subtitle: 'Encargo de Chispa · Mc-Porteño 24H y Taller Mecánico',
    ctaLabel: 'Iniciar Misión 3',
    plateTheme: 'steel',
  },
];

interface DragScrollState {
  active: boolean;
  startX: number;
  startScrollLeft: number;
  moved: boolean;
}

interface TitleBillboardMenuProps {
  difficulty: DifficultyId;
  difficulties: DifficultyOption[];
  bestScore: number;
  muted: boolean;
  onSelectDifficulty: (diff: DifficultyId) => void;
  onStartMission1: () => void;
  onStartMission2: () => void;
  onStartMission3: () => void;
  onOpenTutorial: () => void;
  onOpenStudio: (tab?: StudioTab) => void;
  onToggleMute: () => void;
}

const CornerRivets: React.FC<{ small?: boolean }> = ({ small = false }) => {
  const pos = small ? 'h-1.5 w-1.5' : 'h-2 w-2';
  const offset = small ? '1.5' : '2';
  return (
    <>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute top-${offset} left-${offset} ${pos} rounded-full bg-gradient-to-br from-stone-300/70 via-stone-500/80 to-black/90 shadow-[0_1px_2px_rgba(0,0,0,0.9)]`}
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute top-${offset} right-${offset} ${pos} rounded-full bg-gradient-to-br from-stone-300/70 via-stone-500/80 to-black/90 shadow-[0_1px_2px_rgba(0,0,0,0.9)]`}
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-${offset} left-${offset} ${pos} rounded-full bg-gradient-to-br from-stone-300/70 via-stone-500/80 to-black/90 shadow-[0_1px_2px_rgba(0,0,0,0.9)]`}
      />
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute bottom-${offset} right-${offset} ${pos} rounded-full bg-gradient-to-br from-stone-300/70 via-stone-500/80 to-black/90 shadow-[0_1px_2px_rgba(0,0,0,0.9)]`}
      />
    </>
  );
};

export const TitleBillboardMenu: React.FC<TitleBillboardMenuProps> = ({
  difficulty,
  difficulties,
  bestScore,
  muted,
  onSelectDifficulty,
  onStartMission1,
  onStartMission2,
  onStartMission3,
  onOpenTutorial,
  onOpenStudio,
  onToggleMute,
}) => {
  const [selectedMissionId, setSelectedMissionId] = useState<StoryMissionId>(1);

  const diffTrackRef = useRef<HTMLDivElement>(null);
  const missionTrackRef = useRef<HTMLDivElement>(null);

  const diffDragRef = useRef<DragScrollState>({
    active: false,
    startX: 0,
    startScrollLeft: 0,
    moved: false,
  });
  const missionDragRef = useRef<DragScrollState>({
    active: false,
    startX: 0,
    startScrollLeft: 0,
    moved: false,
  });

  const selectedMission =
    MISSIONS.find((m) => m.id === selectedMissionId) ?? MISSIONS[0];

  const launchMission = useCallback(
    (missionId: StoryMissionId) => {
      if (missionId === 1) onStartMission1();
      else if (missionId === 2) onStartMission2();
      else onStartMission3();
    },
    [onStartMission1, onStartMission2, onStartMission3],
  );

  const scrollMissionToIndex = useCallback((idx: number) => {
    const clampedIdx = Math.max(0, Math.min(MISSIONS.length - 1, idx));
    const targetMission = MISSIONS[clampedIdx];
    setSelectedMissionId(targetMission.id);
    const el = missionTrackRef.current;
    if (!el) return;
    const child = el.children[clampedIdx] as HTMLElement | undefined;
    if (child) {
      el.scrollTo({
        left: child.offsetLeft - el.offsetLeft - 8,
        behavior: 'smooth',
      });
    }
  }, []);

  const scrollDiffBy = useCallback((delta: number) => {
    const el = diffTrackRef.current;
    if (!el) return;
    el.scrollBy({ left: delta, behavior: 'smooth' });
  }, []);

  const makePointerHandlers = (
    ref: React.RefObject<HTMLDivElement | null>,
    dragRef: React.MutableRefObject<DragScrollState>,
  ) => ({
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el || e.button !== 0) return;
      dragRef.current = {
        active: true,
        startX: e.clientX,
        startScrollLeft: el.scrollLeft,
        moved: false,
      };
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      const el = ref.current;
      const st = dragRef.current;
      if (!el || !st.active) return;
      const dx = e.clientX - st.startX;
      if (Math.abs(dx) > 6) {
        st.moved = true;
      }
      if (st.moved) {
        el.scrollLeft = st.startScrollLeft - dx;
      }
    },
    onPointerUp: () => {
      dragRef.current.active = false;
      window.setTimeout(() => {
        dragRef.current.moved = false;
      }, 40);
    },
    onPointerCancel: () => {
      dragRef.current.active = false;
      dragRef.current.moved = false;
    },
    onWheel: (e: React.WheelEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY;
      }
    },
  });

  const handleMissionScroll = useCallback(() => {
    const el = missionTrackRef.current;
    if (!el) return;
    const centerX = el.scrollLeft + el.clientWidth * 0.5;
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < el.children.length; i++) {
      const child = el.children[i] as HTMLElement;
      const childCenter = child.offsetLeft - el.offsetLeft + child.offsetWidth * 0.5;
      const d = Math.abs(childCenter - centerX);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    const nextId = MISSIONS[bestIdx]?.id ?? 1;
    setSelectedMissionId((prev) => (prev === nextId ? prev : nextId));
  }, []);

  const currentMissionIndex = MISSIONS.findIndex((m) => m.id === selectedMissionId);

  return (
    <div className="pointer-events-none flex h-full w-full flex-col justify-between px-3 py-3 sm:px-6 sm:py-5 md:px-10 md:py-6 overflow-y-auto no-scrollbar">
      {/* BARRA SUPERIOR COMPACTA PARA MÓVILES / TABLETS (se muestra debajo en md+ como pestañas del cartel) */}
      <div className="flex flex-wrap items-center justify-end gap-1.5 md:hidden">
        <button
          type="button"
          onClick={onOpenTutorial}
          className="pointer-events-auto flex items-center gap-1.5 rounded border border-amber-200/20 billboard-plate-iron px-3 py-1.5 text-xs font-medium text-emerald-200 hover:border-emerald-400/60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <BookOpen className="h-3.5 w-3.5 text-emerald-300" />
          <span>Tutorial</span>
        </button>
        <button
          type="button"
          onClick={onToggleMute}
          className="pointer-events-auto flex items-center gap-1.5 rounded border border-amber-200/20 billboard-plate-iron px-3 py-1.5 text-xs font-medium text-stone-200 hover:border-amber-400/60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          <span>{muted ? 'Mudo' : 'Sonido'}</span>
        </button>
      </div>

      {/* CONTENEDOR DEL CARTEL INDUSTRIAL POST-APOCALÍPTICO (CENTRADO / ANCLADO A LA IZQUIERDA EN DESKTOP) */}
      <div className="my-auto flex w-full items-center justify-center md:justify-start">
        <div className="pointer-events-auto relative w-full max-w-[560px]">
          {/* PESTAÑAS METÁLICAS LATERALES (ESTILO LETRERO REMACHADO DE LA FOTO) */}
          <div className="hidden md:flex flex-col gap-2 absolute -right-[108px] top-4 z-10 w-[104px]">
            <button
              type="button"
              onClick={onOpenTutorial}
              className="relative flex items-center gap-2 rounded-r-md border border-l-0 border-stone-400/35 billboard-plate-iron px-3 py-2 text-left text-[11px] font-semibold text-stone-200 hover:border-amber-300/70 hover:text-amber-200 transition-all active:translate-x-0.5 cursor-pointer whitespace-nowrap shadow-xl"
            >
              <BookOpen className="h-3.5 w-3.5 text-amber-300 shrink-0" />
              <span>Tutorial</span>
            </button>
            <button
              type="button"
              onClick={onToggleMute}
              className="relative flex items-center gap-2 rounded-r-md border border-l-0 border-stone-400/35 billboard-plate-iron px-3 py-2 text-left text-[11px] font-semibold text-stone-200 hover:border-amber-300/70 hover:text-amber-200 transition-all active:translate-x-0.5 cursor-pointer whitespace-nowrap shadow-xl"
            >
              {muted ? (
                <VolumeX className="h-3.5 w-3.5 text-rose-400 shrink-0" />
              ) : (
                <Volume2 className="h-3.5 w-3.5 text-emerald-300 shrink-0" />
              )}
              <span>{muted ? 'Mudo' : 'Sonido'}</span>
            </button>
          </div>

          {/* PLACA SUPERIOR REMACHADA: BIOHAZARD + MIRA + ZONA CERO */}
          <div className="relative z-20 -mb-1 rounded-md border border-stone-400/40 billboard-metal-header px-3.5 py-2.5 sm:px-5 sm:py-3">
            <CornerRivets />

            {/* Alambre de púas decorativo sutil arriba-izquierda como el cartel de la foto */}
            <svg
              aria-hidden="true"
              viewBox="0 0 180 20"
              className="pointer-events-none absolute -top-3 left-2 h-4 w-36 opacity-75"
              fill="none"
            >
              <path
                d="M2 15 Q 32 4, 64 11 T 128 8 T 176 13"
                stroke="#78716c"
                strokeWidth="1.4"
              />
              <path d="M24 5 l6 8 M30 5 l-6 8" stroke="#a8a29e" strokeWidth="1.2" />
              <path d="M74 6 l6 8 M80 6 l-6 8" stroke="#a8a29e" strokeWidth="1.2" />
              <path d="M124 4 l6 8 M130 4 l-6 8" stroke="#a8a29e" strokeWidth="1.2" />
            </svg>

            {/* Manchas sutiles de óxido/sangre en el borde derecho como la foto */}
            <svg
              aria-hidden="true"
              viewBox="0 0 60 50"
              className="pointer-events-none absolute top-0 right-4 h-12 w-14 opacity-75"
            >
              <path
                d="M12 0 L48 0 L48 16 Q44 28 42 18 Q38 42 35 20 Q30 28 28 12 Q22 22 18 8 Z"
                fill="#7f1d1d"
              />
            </svg>

            <div className="flex items-center gap-3 sm:gap-4">
              {/* Emblema Biohazard (acceso oculto) + Mira Roja */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onOpenStudio('models')}
                  aria-label="Emblema Biohazard"
                  className="rounded focus:outline-none cursor-pointer transition-transform hover:brightness-110 active:scale-95"
                >
                  <svg
                    viewBox="0 0 48 44"
                    className="h-9 w-10 sm:h-11 sm:w-12 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]"
                    aria-hidden="true"
                  >
                    <polygon
                      points="24,3 45,40 3,40"
                      fill="#d99a1e"
                      stroke="#291d0e"
                      strokeWidth="2.5"
                      strokeLinejoin="round"
                    />
                    <polygon
                      points="24,8 40,37 8,37"
                      fill="none"
                      stroke="#451a03"
                      strokeWidth="1.5"
                    />
                    <circle cx="24" cy="26" r="3" fill="none" stroke="#1c140b" strokeWidth="1.8" />
                    <circle cx="24" cy="21" r="4.3" fill="none" stroke="#1c140b" strokeWidth="2" />
                    <circle cx="19.8" cy="28.5" r="4.3" fill="none" stroke="#1c140b" strokeWidth="2" />
                    <circle cx="28.2" cy="28.5" r="4.3" fill="none" stroke="#1c140b" strokeWidth="2" />
                  </svg>
                </button>

                <svg
                  viewBox="0 0 48 48"
                  className="h-9 w-9 sm:h-11 sm:w-11 drop-shadow-[0_2px_6px_rgba(220,38,38,0.45)]"
                  aria-hidden="true"
                >
                  <circle
                    cx="24"
                    cy="24"
                    r="17"
                    fill="rgba(127,29,29,0.28)"
                    stroke="#dc2626"
                    strokeWidth="2.5"
                  />
                  <circle cx="24" cy="24" r="10.5" fill="none" stroke="#ef4444" strokeWidth="1.4" />
                  <line x1="24" y1="2" x2="24" y2="14" stroke="#ef4444" strokeWidth="2.4" />
                  <line x1="24" y1="34" x2="24" y2="46" stroke="#ef4444" strokeWidth="2.4" />
                  <line x1="2" y1="24" x2="14" y2="24" stroke="#ef4444" strokeWidth="2.4" />
                  <line x1="34" y1="24" x2="46" y2="24" stroke="#ef4444" strokeWidth="2.4" />
                  <circle cx="24" cy="24" r="3.4" fill="#ef4444" />
                </svg>
              </div>

              <div className="min-w-0">
                <h1 className="font-display text-2xl sm:text-[34px] font-bold tracking-[0.09em] leading-none bg-gradient-to-b from-[#fff3c4] via-[#d99d43] to-[#7c3f14] bg-clip-text text-transparent drop-shadow-[0_2px_3px_rgba(0,0,0,0.95)]">
                  ZONA CERO
                </h1>
                <div className="mt-1 text-[10px] sm:text-[11px] font-semibold tracking-[0.18em] text-stone-200/90 uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] truncate">
                  BUENOS AIRES 2050 · MODO HISTORIA
                </div>
              </div>
            </div>
          </div>

          {/* CUERPO DEL CARTEL OXIDADO */}
          <div className="relative rounded-b-md border border-t-0 border-stone-500/35 billboard-metal-body px-4 pt-4 pb-4 sm:px-5 sm:pt-5 sm:pb-5">
            <CornerRivets />

            {/* BRIEFING DINÁMICO DE LA MISIÓN SELECCIONADA */}
            <div className="border-b border-amber-200/15 pb-3">
              <div className="font-mono-tabular text-[11px] sm:text-xs font-semibold uppercase tracking-[0.06em] text-amber-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                {selectedMission.briefHeader}
              </div>
              <p className="mt-1.5 text-xs sm:text-[13px] leading-relaxed text-stone-200/95">
                {selectedMission.synopsis}
              </p>
            </div>

            {/* DIFICULTAD — CARRO DESLIZABLE */}
            <div className="mt-3">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-semibold tracking-wide text-stone-300">
                  Dificultad
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-stone-400 mr-1 hidden sm:inline">
                    Desliza para elegir
                  </span>
                  <button
                    type="button"
                    aria-label="Deslizar dificultad hacia la izquierda"
                    onClick={() => scrollDiffBy(-150)}
                    className="flex h-6 w-6 items-center justify-center rounded border border-stone-500/40 bg-stone-900/80 text-stone-300 hover:border-amber-400/60 hover:text-amber-200 cursor-pointer"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Deslizar dificultad hacia la derecha"
                    onClick={() => scrollDiffBy(150)}
                    className="flex h-6 w-6 items-center justify-center rounded border border-stone-500/40 bg-stone-900/80 text-stone-300 hover:border-amber-400/60 hover:text-amber-200 cursor-pointer"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div
                ref={diffTrackRef}
                {...makePointerHandlers(diffTrackRef, diffDragRef)}
                className="flex items-stretch gap-2.5 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-1 select-none cursor-grab active:cursor-grabbing"
              >
                {difficulties.map((d) => {
                  const active = difficulty === d.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        if (diffDragRef.current.moved) return;
                        onSelectDifficulty(d.id);
                      }}
                      className={`relative min-w-[152px] sm:min-w-[158px] flex-1 shrink-0 snap-center rounded border px-3 py-2 text-left transition-all cursor-pointer ${
                        active
                          ? 'border-amber-400 billboard-plate-iron-active text-amber-100'
                          : 'border-stone-500/40 billboard-plate-iron text-stone-200 hover:border-amber-300/45'
                      }`}
                    >
                      <CornerRivets small />
                      <div className="text-xs font-bold tracking-wide whitespace-nowrap">
                        {d.label}
                      </div>
                      <div className="mt-0.5 font-mono-tabular text-[11px] text-stone-300/85 whitespace-nowrap">
                        {d.detail}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* BOTÓN PRINCIPAL ÁMBAR OXIDADO + RÉCORD */}
            <div className="mt-3.5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => launchMission(selectedMission.id)}
                className="relative flex-1 flex items-center justify-center gap-2.5 rounded border border-amber-300/65 billboard-cta-amber text-stone-950 font-bold text-sm sm:text-base py-2.5 px-5 transition-all hover:brightness-105 active:scale-[0.98] cursor-pointer whitespace-nowrap"
              >
                <CornerRivets small />
                <Play className="h-4 w-4 fill-current shrink-0" />
                <span>{selectedMission.ctaLabel}</span>
              </button>

              <div className="shrink-0 px-2 text-center sm:text-right">
                <div className="text-[11px] font-medium text-stone-400">Récord</div>
                <div className="font-mono-tabular text-base sm:text-lg font-bold text-stone-100 leading-tight">
                  {bestScore.toLocaleString()}
                </div>
              </div>
            </div>

            {/* SELECTOR DE MISIONES DESLIZABLE (ESTILO PLACAS DEL CARTEL) */}
            <div className="mt-3.5 border-t border-amber-200/12 pt-3">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold tracking-wide text-stone-300">
                    Misiones de Historia
                  </span>
                  <span className="font-mono-tabular text-[10px] text-amber-300/85">
                    {`${String(currentMissionIndex + 1).padStart(2, '0')}/${String(MISSIONS.length).padStart(2, '0')}`}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Misión anterior"
                    onClick={() => scrollMissionToIndex(currentMissionIndex - 1)}
                    disabled={currentMissionIndex <= 0}
                    className={`flex h-6 w-6 items-center justify-center rounded border transition-colors ${
                      currentMissionIndex <= 0
                        ? 'border-stone-700/50 bg-stone-950/40 text-stone-600 cursor-not-allowed'
                        : 'border-stone-500/45 bg-stone-900/85 text-stone-200 hover:border-amber-400/70 hover:text-amber-200 cursor-pointer'
                    }`}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Siguiente misión"
                    onClick={() => scrollMissionToIndex(currentMissionIndex + 1)}
                    disabled={currentMissionIndex >= MISSIONS.length - 1}
                    className={`flex h-6 w-6 items-center justify-center rounded border transition-colors ${
                      currentMissionIndex >= MISSIONS.length - 1
                        ? 'border-stone-700/50 bg-stone-950/40 text-stone-600 cursor-not-allowed'
                        : 'border-stone-500/45 bg-stone-900/85 text-stone-200 hover:border-amber-400/70 hover:text-amber-200 cursor-pointer'
                    }`}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div
                ref={missionTrackRef}
                onScroll={handleMissionScroll}
                {...makePointerHandlers(missionTrackRef, missionDragRef)}
                className="flex items-stretch gap-2.5 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-1 select-none cursor-grab active:cursor-grabbing"
              >
                {MISSIONS.map((m, idx) => {
                  const isActive = m.id === selectedMissionId;
                  const plateClass =
                    m.plateTheme === 'olive'
                      ? 'billboard-plate-olive'
                      : m.plateTheme === 'amber'
                        ? 'billboard-plate-iron-active'
                        : 'billboard-plate-iron';

                  return (
                    <div
                      key={m.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        if (missionDragRef.current.moved) return;
                        if (isActive) {
                          launchMission(m.id);
                        } else {
                          scrollMissionToIndex(idx);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          launchMission(m.id);
                        } else if (e.key === 'ArrowRight') {
                          e.preventDefault();
                          scrollMissionToIndex(idx + 1);
                        } else if (e.key === 'ArrowLeft') {
                          e.preventDefault();
                          scrollMissionToIndex(idx - 1);
                        }
                      }}
                      className={`relative min-w-[85%] sm:min-w-[86%] shrink-0 snap-center rounded border px-3.5 py-2.5 flex items-center justify-between gap-3 transition-all cursor-pointer ${plateClass} ${
                        isActive
                          ? 'border-amber-300/80 ring-1 ring-amber-400/40'
                          : 'border-stone-500/35 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <CornerRivets small />
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-8 w-8 items-center justify-center rounded border border-white/15 bg-black/35 shrink-0">
                          {m.id === 1 ? (
                            <Crosshair className="h-4 w-4 text-amber-300" />
                          ) : m.id === 2 ? (
                            <Building2 className="h-4 w-4 text-lime-200" />
                          ) : (
                            <Wrench className="h-4 w-4 text-sky-300" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs sm:text-[13px] font-semibold text-stone-100 truncate">
                            {m.title}
                          </div>
                          <div className="text-[11px] text-stone-300/85 truncate">
                            {m.subtitle}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (missionDragRef.current.moved) return;
                          launchMission(m.id);
                        }}
                        aria-label={`Jugar ${m.title}`}
                        className="flex h-8 w-8 items-center justify-center rounded border border-amber-300/45 bg-black/40 text-amber-200 hover:bg-amber-400 hover:text-stone-950 transition-colors shrink-0 cursor-pointer"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Indicadores deslizables */}
              <div className="mt-2 flex items-center justify-center gap-1.5">
                {MISSIONS.map((m, idx) => (
                  <button
                    key={m.id}
                    type="button"
                    aria-label={`Ir a ${m.title}`}
                    onClick={() => scrollMissionToIndex(idx)}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      m.id === selectedMissionId
                        ? 'w-7 bg-amber-400'
                        : 'w-2.5 bg-stone-600 hover:bg-stone-400'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BARRA DE CONTROLES INFERIOR SUTIL */}
      <div className="flex justify-center pt-2">
        <div className="rounded border border-stone-500/25 bg-[#090c12]/72 px-3.5 py-1.5 text-[10px] sm:text-[11px] text-stone-300 tracking-wide text-center backdrop-blur-xs">
          WASD Mover · Shift Correr · C Sigilo · 1 Puños · 2 Palo · V Bastón · 3 Arco · 4 Revólver · 5 FAL · R Recargar · G Molotov · T Clavos · Z Distracción · H/J Curar · Tab/B Mochila
        </div>
      </div>
    </div>
  );
};
