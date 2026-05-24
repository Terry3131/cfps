import useCategories from "../hooks/useCategories";
import SelectField from "./SelectField";

export default function CategorySelect({
  name = "category",
  value,
  onChange,
  label = "Category",
  required = false,
}) {
  const { categories, loading, error } = useCategories();

  return (
    <SelectField
      name={name}
      value={value}
      onChange={onChange}
      label={label}
      required={required}
    >
      <option value="">
        {loading ? "Loading categories..." : "Select category"}
      </option>
      {categories.map((category) => (
        <option key={category.code} value={category.code}>
          {category.code} - {category.name}
        </option>
      ))}
      {error && <option value="" disabled>{error}</option>}
    </SelectField>
  );
}
