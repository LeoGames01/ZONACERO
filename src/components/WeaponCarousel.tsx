import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Hand } from 'lucide-react';
import type { WeaponKind } from '../game/types';

interface WeaponIconProps {
  weapon: WeaponKind;
  className?: string;
}

export const WeaponIcon: React.FC<WeaponIconProps> = ({ weapon, className = 'h-4 w-4' }) => {
  if (weapon === 'unarmed') {
    return <Hand className={className} />;
  }
  if (weapon === 'stick') {
    // Silueta de palo / garrote de madera
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        <path
          d="M4.2 19.8 18.8 4.6a1.4 1.4 0 0 1 2 2L6.2 21.4a1.4 1.4 0 0 1-2-1.6Z"
          fill="currentColor"
          fillOpacity="0.22"
        />
        <path d="M12.5 11.2 15 9.6" />
        <path d="M8.5 15.2 9.8 14" />
      </svg>
    );
  }
  if (weapon === 'baton') {
    // Silueta de bastón policía / tonfa táctica
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        <path
          d="M5 19 19 5a1.2 1.2 0 0 1 1.7 1.7L6.7 20.7A1.2 1.2 0 0 1 5 19Z"
          fill="currentColor"
          fillOpacity="0.24"
        />
        <path d="M9.5 14.5 7 12" strokeWidth="2.1" />
        <path d="M16 8l1.6 1.6" />
      </svg>
    );
  }
  if (weapon === 'bow') {
    // Silueta de arco recurvo con flecha
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        <path d="M13 3.5c3.8 2.2 5.5 5.3 5.5 8.5s-1.7 6.3-5.5 8.5" />
        <line x1="13" y1="3.5" x2="13" y2="20.5" strokeOpacity="0.65" />
        <line x1="5" y1="12" x2="21" y2="12" />
        <path d="M18.2 9.6 21 12l-2.8 2.4" />
      </svg>
    );
  }
  if (weapon === 'pistol') {
    // Silueta de Revólver
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        <path d="M3 9h17v3H12l-1 2.5H8L6.2 20H3.5l1.6-6.5L3 12V9Z" fill="currentColor" fillOpacity="0.18" />
        <rect x="8" y="8.5" width="4.5" height="4" rx="1" />
        <path d="M4.5 9V7.5L3 7" />
        <path d="M10.5 12v2.4a1.4 1.4 0 0 0 2.5.4l.7-1.3" />
      </svg>
    );
  }
  // Silueta de Fusil FAL
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2 10h16v2.8H14l-.8 4.2h-2.5l.6-4.2H7.2l-1.5 5H3.3l1.2-5L2 13v-3Z" fill="currentColor" fillOpacity="0.18" />
      <path d="M18 10.7h4" />
      <path d="M8.5 8.5h4v1.5h-4z" />
      <path d="M15.5 12.8l.5 2.4" />
    </svg>
  );
};

interface WeaponCarouselProps {
  weapon: WeaponKind;
  arrows?: number;
  pistolAmmo: number;
  pistolMaxAmmo: number;
  rifleAmmo: number;
  rifleMaxAmmo: number;
  onSelectWeapon: (weapon: WeaponKind) => void;
  compact?: boolean;
  align?: 'left' | 'right';
  direction?: 'up' | 'down';
  style?: React.CSSProperties;
  buttonClassName?: string;
}

const WEAPON_OPTIONS: { id: WeaponKind; label: string; short: string }[] = [
  { id: 'unarmed', label: 'Puños', short: 'Puños' },
  { id: 'stick', label: 'Palo de madera', short: 'Palo' },
  { id: 'baton', label: 'Bastón policía', short: 'Bastón' },
  { id: 'bow', label: 'Arco recurvo', short: 'Arco' },
  { id: 'pistol', label: 'Revólver', short: 'Revólver' },
  { id: 'rifle', label: 'Fusil FAL', short: 'FAL' },
];

const WeaponCarouselInner: React.FC<WeaponCarouselProps> = ({
  weapon,
  arrows = 0,
  pistolAmmo,
  pistolMaxAmmo,
  rifleAmmo,
  rifleMaxAmmo,
  onSelectWeapon,
  compact = false,
  align = 'left',
  direction = 'down',
  style,
  buttonClassName,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const activeMeta = WEAPON_OPTIONS.find((w) => w.id === weapon) ?? WEAPON_OPTIONS[0];

  const getAmmoBadge = (id: WeaponKind) => {
    if (id === 'pistol') return `${pistolAmmo}/${pistolMaxAmmo}`;
    if (id === 'rifle') return `${rifleAmmo}/${rifleMaxAmmo}`;
    if (id === 'bow') return `${arrows} fl.`;
    if (id === 'stick' || id === 'baton') return 'Melee';
    return 'Cuerpo';
  };

  const activeAccent =
    weapon === 'rifle'
      ? 'border-amber-400/60 text-amber-200 bg-[#090c12]/80'
      : weapon === 'pistol'
        ? 'border-sky-400/60 text-sky-200 bg-[#090c12]/80'
        : weapon === 'bow'
          ? 'border-teal-400/60 text-teal-200 bg-[#090c12]/80'
          : weapon === 'baton'
            ? 'border-blue-400/60 text-blue-200 bg-[#090c12]/80'
            : weapon === 'stick'
              ? 'border-orange-400/60 text-orange-200 bg-[#090c12]/80'
              : 'border-emerald-400/55 text-emerald-200 bg-[#090c12]/80';

  return (
    <div
      ref={containerRef}
      style={style}
      className={style ? 'pointer-events-auto fixed z-40' : 'pointer-events-auto relative z-30'}
    >
      <button
        type="button"
        onPointerDown={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        aria-expanded={open}
        aria-label="Desplegar selector de armas"
        className={
          buttonClassName ||
          `flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-all active:scale-95 cursor-pointer touch-none whitespace-nowrap shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] ${activeAccent}`
        }
      >
        <WeaponIcon weapon={weapon} className="h-4 w-4 shrink-0" />
        <span>{compact ? activeMeta.short : activeMeta.label}</span>
        {direction === 'up' ? (
          open ? (
            <ChevronDown className="h-3.5 w-3.5 opacity-80 shrink-0" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5 opacity-80 shrink-0" />
          )
        ) : open ? (
          <ChevronUp className="h-3.5 w-3.5 opacity-80 shrink-0" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 opacity-80 shrink-0" />
        )}
      </button>

      {open && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className={`absolute ${
            direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'
          } ${
            align === 'right' ? 'right-0' : 'left-0'
          } flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#080b11]/95 p-1.5 shadow-2xl`}
        >
          {WEAPON_OPTIONS.map((opt) => {
            const selected = opt.id === weapon;
            const ringStyle =
              opt.id === 'rifle'
                ? 'border-amber-400 bg-amber-500/25 text-amber-100 ring-2 ring-amber-400/50'
                : opt.id === 'pistol'
                  ? 'border-sky-400 bg-sky-500/25 text-sky-100 ring-2 ring-sky-400/50'
                  : opt.id === 'bow'
                    ? 'border-teal-400 bg-teal-500/25 text-teal-100 ring-2 ring-teal-400/50'
                    : opt.id === 'baton'
                      ? 'border-blue-400 bg-blue-500/25 text-blue-100 ring-2 ring-blue-400/50'
                      : opt.id === 'stick'
                        ? 'border-orange-400 bg-orange-500/25 text-orange-100 ring-2 ring-orange-400/50'
                        : 'border-emerald-400 bg-emerald-500/25 text-emerald-100 ring-2 ring-emerald-400/50';
            return (
              <button
                key={opt.id}
                type="button"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onSelectWeapon(opt.id);
                  setOpen(false);
                }}
                className={`flex min-w-[68px] flex-col items-center justify-center gap-1 rounded-lg border px-2.5 py-2 transition-all cursor-pointer touch-none whitespace-nowrap shrink-0 ${
                  selected
                    ? `${ringStyle} scale-105 shadow-lg`
                    : 'border-white/10 bg-slate-900/75 text-slate-400 opacity-80 hover:opacity-100 hover:border-white/25 hover:text-slate-100'
                }`}
              >
                <WeaponIcon weapon={opt.id} className="h-5 w-5" />
                <span className="text-[10px] font-semibold leading-none">{opt.short}</span>
                <span
                  className={`text-[9px] font-mono-tabular leading-none ${
                    selected ? 'text-white/95' : 'text-slate-500'
                  }`}
                >
                  {getAmmoBadge(opt.id)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const WeaponCarousel = React.memo(WeaponCarouselInner);
