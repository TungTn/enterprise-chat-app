'use client';

import { useEffect, useCallback } from 'react';

interface UseModalDismissOptions {
  isOpen: boolean;
  onClose: () => void;
  closeOnEsc?: boolean;
  closeOnBackdrop?: boolean;
}

/**
 * Hook to handle dismissing modals and popups via Escape key or backdrop click.
 */
export function useModalDismiss({
  isOpen,
  onClose,
  closeOnEsc = true,
  closeOnBackdrop = true,
}: UseModalDismissOptions) {
  useEffect(() => {
    if (!isOpen || !closeOnEsc) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, closeOnEsc]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (!closeOnBackdrop) return;
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [closeOnBackdrop, onClose],
  );

  return { handleBackdropClick };
}
