export default function ConfirmButton({
  children,
  message = "Are you sure?",
  onConfirm,
  className = "",
  disabled = false,
}) {
  const handleClick = async () => {
    if (disabled) return;

    const confirmed = window.confirm(message);

    if (!confirmed) return;

    await onConfirm?.();
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handleClick}
      className={`
        transition-opacity disabled:opacity-60 disabled:cursor-not-allowed
        ${className}
      `}
    >
      {children}
    </button>
  );
}