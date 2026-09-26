import React, { useLayoutEffect, useRef } from 'react';

interface AccessibleDialogProps {
  onClose: () => void;
  className?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  children: React.ReactNode;
}

/**
 * A real modal <dialog> (spec: "Confirmation steps use a real <dialog>").
 * - showModal(): screen readers announce it and the page behind becomes inert,
 *   so its content can't be reached by mistake.
 * - Focus goes to the dialog itself (its title is announced), not to its first
 *   button: a blind user pressing Space to talk must not "click" the close button.
 * - Escape closes it; when it closes, focus returns to the control that opened it.
 *
 * Mount it only while open (the modals already `return null` when closed).
 */
export const AccessibleDialog: React.FC<AccessibleDialogProps> = ({ onClose, className = '', children, ...aria }) => {
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const opener = document.activeElement as HTMLElement | null;
    try {
      if (!dialog.open) dialog.showModal();
    } catch {
      dialog.setAttribute('open', ''); // very old browsers: at least show it
    }
    dialog.focus();
    const onCancel = (e: Event) => {
      e.preventDefault(); // let the modal's own onClose decide (it may speak first)
      onCloseRef.current();
    };
    dialog.addEventListener('cancel', onCancel);
    return () => {
      dialog.removeEventListener('cancel', onCancel);
      if (dialog.open) dialog.close();
      if (opener && document.contains(opener)) opener.focus();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      tabIndex={-1}
      {...aria}
      className={`m-0 max-w-none max-h-none w-screen h-screen border-0 outline-none backdrop:bg-transparent ${className}`}
    >
      {children}
    </dialog>
  );
};
