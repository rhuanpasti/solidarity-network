export const MODAL_DIALOG_CONFIG = {
  width: 'min(760px, calc(100vw - 2rem))',
  maxWidth: 'calc(100vw - 2rem)',
  maxHeight: 'calc(100vh - 1rem)',
  ariaLabelledBy: 'modal-title',
  autoFocus: 'first-tabbable' as const,
  restoreFocus: true,
  closeOnNavigation: true,
};
