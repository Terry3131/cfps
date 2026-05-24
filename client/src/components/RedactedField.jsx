export default function RedactedField({
  children,
  redacted = false,
  label = "Redacted",
  className = "",
}) {
  if (!redacted) {
    return <>{children}</>;
  }

  return (
    <span
      className={`inline-flex items-center border border-red-200 bg-red-50 px-2 py-1 text-xs font-black uppercase tracking-wide text-red-700 ${className}`}
      title={label}
    >
      {label}
    </span>
  );
}
