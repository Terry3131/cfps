export default function ErrorBox({ message, children, className = "" }) {
  const text = children || message;

  if (!text) return null;

  return (
    <div className={`rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 shadow-sm ${className}`}>
      {text}
    </div>
  );
}
