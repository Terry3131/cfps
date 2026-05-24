export default function FileInput({
  label = "File",
  name = "file",
  onChange,
  required = false,
  disabled = false,
  accept,
}) {
  return (
    <div>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}

      <input
        id={name}
        name={name}
        type="file"
        onChange={onChange}
        required={required}
        disabled={disabled}
        accept={accept}
        className="mt-1 w-full rounded-lg border border-slate-300 px-4 py-2 outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-800 disabled:bg-slate-100 disabled:cursor-not-allowed"
      />
    </div>
  );
}