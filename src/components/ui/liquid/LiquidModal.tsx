import React from 'react';
import { createPortal } from 'react-dom';

export interface LiquidModalProps {
  isOpen: boolean;
  onClose: () => void;
  ariaLabel?: string;
  maxWidthClass?: string;
  zIndexClass?: string;
  children: React.ReactNode;
}

export const LiquidModal: React.FC<LiquidModalProps> = ({
  isOpen,
  onClose,
  ariaLabel = 'Modal dialog',
  maxWidthClass = 'max-w-2xl',
  zIndexClass = 'z-50',
  children,
}) => {
  if (!isOpen) return null;

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={onClose}
      className={`fixed inset-0 ${zIndexClass} overflow-y-auto bg-[#0D1A12]/55 dark:bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200`}
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`glass-elevated liquid-rim rounded-[32px] ${maxWidthClass} w-full overflow-hidden my-auto max-h-[92dvh] flex flex-col animate-in zoom-in-95 duration-200`}
      >
        {children}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};

export interface LiquidDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  side?: 'right' | 'bottom';
  ariaLabel?: string;
  zIndexClass?: string;
  children: React.ReactNode;
}

export const LiquidDrawer: React.FC<LiquidDrawerProps> = ({
  isOpen,
  onClose,
  side = 'right',
  ariaLabel = 'Drawer panel',
  zIndexClass = 'z-[90]',
  children,
}) => {
  if (!isOpen) return null;

  const panelPos =
    side === 'bottom'
      ? 'inset-x-2 bottom-2 max-h-[88dvh] rounded-[30px] animate-in slide-in-from-bottom duration-250'
      : 'top-2 bottom-2 right-2 w-[calc(100%-1rem)] sm:w-[440px] rounded-[28px] animate-in slide-in-from-right duration-250';

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      onClick={onClose}
      className={`fixed inset-0 ${zIndexClass} bg-[#0D1A12]/50 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-200`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`fixed ${panelPos} glass-elevated liquid-rim overflow-hidden flex flex-col`}
      >
        {children}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};
