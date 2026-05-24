export default function SelectField({
  label,
  name,
  value,
  onChange,
  required = false,
  disabled = false,
  children,
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">
        {label}
      </label>

      <select
        name={name}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        className="mt-1 w-full border rounded-lg px-4 py-2"
      >
        {children}
      </select>
    </div>
  );
}
