export function formatOrganizationalUnit(unitOrCode, units = []) {
  if (!unitOrCode) return "N/A";

  if (typeof unitOrCode === "object") {
    return formatUnitLabel(unitOrCode);
  }

  const code = String(unitOrCode);
  const unit = units.find((item) => item?.code === code);

  return unit ? formatUnitLabel(unit) : code;
}

export function formatUnitLabel(unit) {
  if (!unit?.code && !unit?.name) return "N/A";
  if (!unit?.code) return unit.name;
  if (!unit?.name || unit.name === unit.code) return unit.code;

  return `${unit.code} - ${unit.name}`;
}

export function getOrganizationLabelFromMemo(memo, codeKey, nameKey, units = []) {
  const code = memo?.[codeKey];
  const name = memo?.[nameKey];

  if (code && name && name !== code) return `${code} - ${name}`;
  if (code) return formatOrganizationalUnit(code, units);
  if (name) return name;

  return "N/A";
}
