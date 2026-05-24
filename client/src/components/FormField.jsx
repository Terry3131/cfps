export default function FormField({
  label,
  name = "",
  value,
  onChange,
  type = "text",
  placeholder = "",
  required = false,
  min,
  max,
  disabled = false,
  readOnly = false,
  step,
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">
        {label}
      </label>

      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
        disabled={disabled}
        readOnly={readOnly}
        step={step}
        className="mt-1 w-full border rounded-lg px-4 py-2"
      />
    </div>
  );
}
