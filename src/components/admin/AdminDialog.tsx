import React, { useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, Loader2, X } from 'lucide-react';

export type AdminDialogSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | 'drawer';

interface AdminDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  badge?: string;
  size?: AdminDialogSize;
  isDirty?: boolean;
  isSubmitting?: boolean;
  error?: string | null;
  footer?: React.ReactNode;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

const SIZE_CLASSES: Record<AdminDialogSize, string> = {
  sm: 'max-w-md rounded-2xl',
  md: 'max-w-lg rounded-2xl',
  lg: 'max-w-2xl rounded-2xl',
  xl: 'max-w-4xl rounded-2xl',
  '2xl': 'max-w-6xl rounded-2xl',
  full: 'max-w-[96vw] xl:max-w-[1320px] rounded-2xl',
  drawer: 'max-w-xl h-full rounded-none sm:rounded-l-2xl ml-auto',
};

export function AdminDialog({
  open,
  onClose,
  title,
  subtitle,
  badge,
  size = 'lg',
  isDirty = false,
  isSubmitting = false,
  error,
  footer,
  headerActions,
  children,
}: AdminDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const attemptCloseRef = useRef<() => void>(() => {});
  attemptCloseRef.current = () => {
    if (isSubmitting) return;
    if (isDirty && !confirmDiscard) {
      setConfirmDiscard(true);
      return;
    }
    setConfirmDiscard(false);
    onClose();
  };

  useEffect(() => {
    if (!open) {
      setConfirmDiscard(false);
      return;
    }
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const frame = requestAnimationFrame(() => {
      const container = dialogRef.current;
      if (container && !container.contains(document.activeElement)) {
        const firstFocusable = container.querySelector<HTMLElement>(
          'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
        );
        (firstFocusable || container).focus();
      }
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        attemptCloseRef.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  const isDrawer = size === 'drawer';

  return (
    <div
      className={`fixed inset-0 z-[85] flex ${
        isDrawer ? 'items-stretch justify-end p-0' : 'items-center justify-center p-3 sm:p-5'
      } bg-[#071636]/60`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === e.currentTarget) attemptCloseRef.current();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`w-full ${SIZE_CLASSES[size]} ${
          isDrawer ? 'max-h-screen' : 'max-h-[92vh]'
        } bg-white shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden outline-none`}
      >
        {/* Sticky Dialog Header */}
        <div className="flex items-start justify-between gap-4 px-5 sm:px-6 py-4 border-b border-slate-200/80 bg-white shrink-0">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id={titleId} className="text-base sm:text-lg font-extrabold text-[#0B1F4B] tracking-tight truncate">
                {title}
              </h2>
              {badge && (
                <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100 text-[#0D63F3] text-[10px] font-bold uppercase tracking-wider">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {headerActions}
            <button
              type="button"
              onClick={() => attemptCloseRef.current()}
              disabled={isSubmitting}
              aria-label={`Close ${title}`}
              className="w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Unsaved Changes Inline Confirmation Banner */}
        {confirmDiscard && (
          <div className="px-5 sm:px-6 py-2.5 bg-amber-50 border-b border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
            <span className="font-semibold text-amber-900">
              You have unsaved changes. Discard changes and close?
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmDiscard(false)}
                className="px-3 py-1 rounded-lg border border-amber-300 bg-white text-amber-900 font-bold hover:bg-amber-100/60"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmDiscard(false);
                  onClose();
                }}
                className="px-3 py-1 rounded-lg bg-[#EF3E36] text-white font-bold hover:bg-red-700"
              >
                Discard &amp; Close
              </button>
            </div>
          </div>
        )}

        {/* Inline Error Alert */}
        {error && (
          <div className="mx-5 sm:mx-6 mt-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800 shrink-0">
            <AlertCircle className="w-4 h-4 text-[#EF3E36] shrink-0 mt-0.5" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 bg-[#F8FAFC]">{children}</div>

        {/* Sticky Footer */}
        {footer && (
          <div className="px-5 sm:px-6 py-3.5 border-t border-slate-200/80 bg-white flex flex-wrap items-center justify-end gap-2.5 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <AdminDialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      isSubmitting={loading}
      footer={
        <>
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 h-9 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              void onConfirm();
            }}
            className={`px-4 h-9 rounded-xl text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-60 ${
              variant === 'danger' ? 'bg-[#EF3E36] hover:bg-red-700' : 'bg-[#0D63F3] hover:bg-[#0A52CC]'
            }`}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{confirmLabel}</span>
          </button>
        </>
      }
    >
      <p className="text-xs leading-relaxed text-slate-600">{description}</p>
    </AdminDialog>
  );
}

interface FormSectionProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function FormSection({ title, description, action, children, className = '' }: FormSectionProps) {
  return (
    <section className={`bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-4 sm:p-5 space-y-4 ${className}`}>
      <div className="flex flex-wrap items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-extrabold text-[#0B1F4B]">{title}</h3>
          {description && <p className="text-[11px] text-slate-500 mt-0.5">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}
