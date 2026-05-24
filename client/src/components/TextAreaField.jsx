export default function TextAreaField({
  label,
  name = "",
  value,
  onChange,
  placeholder = "",
  required = false,
  rows = 4,
  disabled = false,
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">
        {label}
      </label>

      <textarea
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        rows={rows}
        disabled={disabled}
        className="mt-1 w-full border rounded-lg px-4 py-2"
      />
    </div>
  );
}
