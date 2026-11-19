import { TriangleAlert, X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Button, IconButton } from './button';
import { TEXT_CLASS } from './text-class';

interface ModalProps {
  title: string;
  description?: ReactNode;
  closeLabel: string;
  onClose: () => void;
  /** Leading visual beside the title, e.g. a danger icon. */
  icon?: ReactNode;
  /** Layout only, e.g. a wider width or visible overflow for an anchored dropdown. */
  layoutClassName?: string;
  children: ReactNode;
}

/**
 * Native `<dialog>` modal. Render it only while open: mounting opens it,
 * so form state always starts fresh. Escape, backdrop click and the close button all call onClose.
 */
export function Modal({ title, description, closeLabel, onClose, icon, layoutClassName, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={event => {
        event.preventDefault();
        onClose();
      }}
      onClick={event => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        'm-auto w-[min(26rem,calc(100vw-2rem))] animate-pop-in rounded-dialog border border-line bg-surface p-0 text-foreground shadow-overlay backdrop:animate-overlay-in backdrop:bg-black/40',
        layoutClassName,
      )}
    >
      <div className="flex gap-3 p-5">
        {icon}
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 id={titleId} className={TEXT_CLASS.dialogTitle}>{title}</h2>
          {description && <p id={descriptionId} className={`mt-1.5 wrap-break-word ${TEXT_CLASS.bodySecondary}`}>{description}</p>}
        </div>
        <IconButton label={closeLabel} size="sm" onClick={onClose} layoutClassName="-mr-1.5 -mt-1.5">
          <X />
        </IconButton>
      </div>
      {children}
    </dialog>
  );
}

interface ConfirmDeleteDialogProps {
  title: string;
  description: ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  closeLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}

/** Required before any irreversible removal. Focus starts on Cancel so Enter can't delete by accident. */
export function ConfirmDeleteDialog({ title, description, cancelLabel, confirmLabel, closeLabel, onConfirm, onClose }: ConfirmDeleteDialogProps) {
  return (
    <Modal
      title={title}
      description={description}
      closeLabel={closeLabel}
      onClose={onClose}
      icon={(
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
          <TriangleAlert aria-hidden className="size-4.5" />
        </span>
      )}
    >
      <div className="flex justify-end gap-2 px-5 pb-5">
        <Button autoFocus onClick={onClose}>{cancelLabel}</Button>
        <Button
          tone="danger"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
