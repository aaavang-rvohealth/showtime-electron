export function confirmAction(
  message: string,
  onConfirm: Function,
  onAbort?: Function
) {
  return () => {
    if (window.confirm(message)) onConfirm();
    else onAbort?.();
  };
}
