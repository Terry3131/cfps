const STATE_ZONE_PAIRS = [
  ["Benue", "North Central"],
  ["Kogi", "North Central"],
  ["Kwara", "North Central"],
  ["Nasarawa", "North Central"],
  ["Niger", "North Central"],
  ["Plateau", "North Central"],
  ["FCT", "North Central"],
  ["Adamawa", "North East"],
  ["Bauchi", "North East"],
  ["Borno", "North East"],
  ["Gombe", "North East"],
  ["Taraba", "North East"],
  ["Yobe", "North East"],
  ["Jigawa", "North West"],
  ["Kaduna", "North West"],
  ["Kano", "North West"],
  ["Katsina", "North West"],
  ["Kebbi", "North West"],
  ["Sokoto", "North West"],
  ["Zamfara", "North West"],
  ["Abia", "South East"],
  ["Anambra", "South East"],
  ["Ebonyi", "South East"],
  ["Enugu", "South East"],
  ["Imo", "South East"],
  ["Akwa Ibom", "South South"],
  ["Bayelsa", "South South"],
  ["Cross River", "South South"],
  ["Delta", "South South"],
  ["Edo", "South South"],
  ["Rivers", "South South"],
  ["Ekiti", "South West"],
  ["Lagos", "South West"],
  ["Ogun", "South West"],
  ["Ondo", "South West"],
  ["Osun", "South West"],
  ["Oyo", "South West"],
];

export const NIGERIAN_STATES = STATE_ZONE_PAIRS.map(([state]) => state);

export function getGeopoliticalZone(state) {
  const match = STATE_ZONE_PAIRS.find(
    ([name]) => name.toLowerCase() === String(state || "").toLowerCase()
  );

  return match?.[1] || "";
}
