export const RULE_PRIORITIES = Object.freeze([
  Object.freeze({ value: 40, label: 'Low' }),
  Object.freeze({ value: 30, label: 'Medium' }),
  Object.freeze({ value: 20, label: 'High' }),
  Object.freeze({ value: 10, label: 'Critical' }),
]);

export const DEFAULT_RULE_PRIORITY = 30;
export const RULE_PRIORITY_ERROR = 'Choose Low, Medium, High, or Critical.';

const priorityLabels = new Map(RULE_PRIORITIES.map(({ value, label }) => [value, label]));

export function isRulePriority(value) {
  const numericValue = Number(value);
  return Number.isInteger(numericValue) && priorityLabels.has(numericValue);
}

export function rulePriorityLabel(value) {
  return priorityLabels.get(Number(value)) ?? '';
}
