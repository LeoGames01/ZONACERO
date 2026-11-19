import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Delete, Lock, ShieldCheck, X } from 'lucide-react';

interface StudioPinModalProps {
  open: boolean;
  onVerify: (pin: string) => boolean;
  onClose: () => void;
}

const KEYPAD_DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export const StudioPinModal: React.FC<StudioPinModalProps> = ({
  open,
  onVerify,
  onClose,
}) => {
  const [digits, setDigits] = useState<string>('');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const clearTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      setDigits('');
      setErrorText(null);
      setShaking(false);
    }
    return () => {
      if (clearTimerRef.current !== null) {
        window.clearTimeout(clearTimerRef.current);
        clearTimerRef.current = null;
      }
    };
  }, [open]);

  const submitPin = useCallback(
    (code: string) => {
      if (code.length !== 4) return;
      const ok = onVerify(code);
      if (!ok) {
        setErrorText('Código incorrecto. Intenta nuevamente.');
        setShaking(true);
        if (clearTimerRef.current !== null) {
          window.clearTimeout(clearTimerRef.current);
        }
        clearTimerRef.current = window.setTimeout(() => {
          setDigits('');
          setShaking(false);
          clearTimerRef.current = null;
        }, 420);
      }
    },
    [onVerify],
  );

  const pushDigit = useCallback(
    (d: string) => {
      if (!/^\d$/.test(d)) return;
      setErrorText(null);
      setDigits((prev) => {
        if (prev.length >= 4) return prev;
        const next = prev + d;
        if (next.length === 4) {
          window.setTimeout(() => submitPin(next), 70);
        }
        return next;
      });
    },
    [submitPin],
  );

  const popDigit = useCallback(() => {
    setErrorText(null);
    setDigits((prev) => prev.slice(0, -1));
  }, []);

  const clearDigits = useCallback(() => {
    setErrorText(null);
    setDigits('');
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        popDigit();
        return;
      }
      if (e.key === 'Enter' && digits.length === 4) {
        e.preventDefault();
        submitPin(digits);
        return;
      }
      if (/^\d$/.test(e.key)) {
        e.preventDefault();
        pushDigit(e.key);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, digits, onClose, popDigit, pushDigit, submitPin]);

  if (!open) return null;

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-[#06080d]/72 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xs rounded-xl border border-amber-400/35 bg-[#0b1018]/96 p-5 text-slate-100 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-400/40 bg-amber-500/15 text-amber-300">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-display text-base text-amber-200 leading-tight">
                Acceso Restringido
              </h3>
              <p className="text-[11px] text-slate-400">
                Código numérico de 4 dígitos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/12 bg-slate-900/70 text-slate-300 hover:border-amber-400/50 hover:text-amber-200 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 4-digit PIN slot display */}
        <div
          className={`mt-5 flex items-center justify-center gap-3 transition-transform ${
            shaking ? 'translate-x-1' : ''
          }`}
        >
          {[0, 1, 2, 3].map((slot) => {
            const filled = slot < digits.length;
            const active = slot === digits.length;
            return (
              <div
                key={slot}
                className={`flex h-12 w-11 items-center justify-center rounded-lg border font-mono-tabular text-lg font-bold transition-all ${
                  errorText
                    ? 'border-rose-500/70 bg-rose-950/35 text-rose-300'
                    : filled
                      ? 'border-amber-400/80 bg-amber-500/15 text-amber-200'
                      : active
                        ? 'border-amber-300/45 bg-slate-900/90 text-slate-500'
                        : 'border-white/12 bg-slate-900/60 text-slate-600'
                }`}
              >
                {filled ? '•' : ''}
              </div>
            );
          })}
        </div>

        <div className="mt-2.5 min-h-[18px] text-center text-[11px]">
          {errorText ? (
            <span className="text-rose-400 font-medium">{errorText}</span>
          ) : (
            <span className="text-slate-400">
              Usa el teclado o marca los dígitos
            </span>
          )}
        </div>

        {/* Numeric Keypad */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {KEYPAD_DIGITS.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => pushDigit(d)}
              className="h-11 rounded-lg border border-white/12 bg-slate-900/85 hover:border-amber-400/55 hover:bg-slate-800 active:scale-95 font-mono-tabular text-base font-semibold text-slate-100 transition-all cursor-pointer"
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            onClick={clearDigits}
            className="h-11 rounded-lg border border-white/10 bg-slate-950/80 hover:border-white/25 active:scale-95 text-[11px] font-medium text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={() => pushDigit('0')}
            className="h-11 rounded-lg border border-white/12 bg-slate-900/85 hover:border-amber-400/55 hover:bg-slate-800 active:scale-95 font-mono-tabular text-base font-semibold text-slate-100 transition-all cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={popDigit}
            aria-label="Borrar dígito"
            className="flex h-11 items-center justify-center rounded-lg border border-white/10 bg-slate-950/80 hover:border-amber-400/45 active:scale-95 text-slate-300 hover:text-amber-200 transition-all cursor-pointer"
          >
            <Delete className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          disabled={digits.length !== 4}
          onClick={() => submitPin(digits)}
          className={`mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-xs font-semibold transition-all ${
            digits.length === 4
              ? 'bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 hover:from-amber-300 hover:to-amber-400 cursor-pointer'
              : 'border border-white/10 bg-slate-900/50 text-slate-500 cursor-not-allowed'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Ingresar</span>
        </button>
      </div>
    </div>
  );
};
