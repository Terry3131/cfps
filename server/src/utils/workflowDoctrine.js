const HEAVY_WORKFLOW_CATEGORIES = [
  "PROJECTS",
  "PROCUREMENT",
  "OPERATIONS",
  "MAINTENANCE",
  "CONTRACTS",
];

const LIGHT_WORKFLOW_CATEGORIES = [
  "TRAINING",
  "FINANCE",
  "TRAVEL",
  "MEDICAL",
  "PERSONNEL",
  "OTHERS",
];

const LEGACY_HEAVY_WORKFLOW_CATEGORIES = [
  "PROJECTS_AND_INFRASTRUCTURE",
  "PROJECT",
  "OPERATION",
  "CONTRACT",
  "WORKS",
];

function deriveWorkflowType(category) {
  const normalizedCategory = String(category || "").toUpperCase();

  if (
    HEAVY_WORKFLOW_CATEGORIES.includes(normalizedCategory) ||
    LEGACY_HEAVY_WORKFLOW_CATEGORIES.includes(normalizedCategory)
  ) {
    return "HEAVY_WORKFLOW";
  }

  if (LIGHT_WORKFLOW_CATEGORIES.includes(normalizedCategory)) {
    return "LIGHT_WORKFLOW";
  }

  return "LIGHT_WORKFLOW";
}

function isHeavyWorkflow(category) {
  return deriveWorkflowType(category) === "HEAVY_WORKFLOW";
}

function isLightWorkflow(category) {
  return deriveWorkflowType(category) === "LIGHT_WORKFLOW";
}

function getAllowedCategories() {
  return [
    ...HEAVY_WORKFLOW_CATEGORIES,
    ...LIGHT_WORKFLOW_CATEGORIES,
  ];
}

module.exports = {
  HEAVY_WORKFLOW_CATEGORIES,
  LIGHT_WORKFLOW_CATEGORIES,
  deriveWorkflowType,
  isHeavyWorkflow,
  isLightWorkflow,
  getAllowedCategories,
};
