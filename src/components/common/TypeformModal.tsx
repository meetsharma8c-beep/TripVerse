import React from 'react';
import { Widget } from '@typeform/embed-react';
import { X, Sparkles } from 'lucide-react';
import { useLanguage } from '../../services/languageService';

interface TypeformModalProps {
  isOpen: boolean;
  onClose: () => void;
  formId?: string;
  title?: string;
  onSubmitted?: () => void;
}

/**
 * Native Typeform integration using @typeform/embed-react
 * Zero DOM manipulation, fully reactive, mounts seamlessly in React Virtual DOM.
 */
export const TypeformModal: React.FC<TypeformModalProps> = ({
  isOpen,
  onClose,
  formId,
  title = 'TripVerse Traveler Survey',
  onSubmitted
}) => {
  const { t } = useLanguage();
  const effectiveFormId = formId || (import.meta as any).env?.VITE_TYPEFORM_ID || '';

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-6 animate-fade-in"
    >
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/50 dark:border-emerald-800/40 flex items-center justify-center text-[#2D5A3D] dark:text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">{title}</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Powered by Typeform • Interactive Questionnaire</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close survey"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body: Pure React Widget (Zero manual DOM mutation) */}
        <div className="flex-1 w-full min-h-[460px] sm:min-h-[520px] bg-white dark:bg-slate-900 relative">
          {effectiveFormId ? (
            <Widget
              id={effectiveFormId}
              style={{ width: '100%', height: '100%', minHeight: '480px' }}
              className="w-full h-full border-0"
              onSubmit={() => {
                if (onSubmitted) onSubmitted();
                setTimeout(() => onClose(), 1800);
              }}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/40 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-base text-slate-900 dark:text-white mb-1">
                {t('Typeform Integration Ready')}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mb-4">
                The Typeform React engine is installed and ready. Provide your Form ID via prop or <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[#2D5A3D] font-mono text-[11px]">VITE_TYPEFORM_ID</code> to render your survey live.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-trip-gradient text-white text-xs font-bold shadow-md cursor-pointer hover:bg-trip-gradient-hover transition-all"
              >
                {t('common.close')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
