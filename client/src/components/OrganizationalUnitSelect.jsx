import useOrganizationalUnits from "../hooks/useOrganizationalUnits";
import SelectField from "./SelectField";

export default function OrganizationalUnitSelect({
  name,
  value,
  onChange,
  label = "Organizational Unit",
  type = "",
  required = false,
}) {
  const { units, loading, error } = useOrganizationalUnits(type);

  return (
    <SelectField
      name={name}
      value={value}
      onChange={onChange}
      label={label}
      required={required}
    >
      <option value="">
        {loading ? "Loading units..." : "Select organizational unit"}
      </option>
      {units.map((unit) => (
        <option key={unit.code} value={unit.code}>
          {unit.code} - {unit.name}
        </option>
      ))}
      {error && <option value="" disabled>{error}</option>}
    </SelectField>
  );
}
