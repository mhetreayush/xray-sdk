/**
 * Query Validator - MongoDB query sanitization
 */

/**
 * Allowed MongoDB operators for query API
 */
const ALLOWED_OPERATORS = new Set([
  // Comparison
  "$eq",
  "$ne",
  "$gt",
  "$gte",
  "$lt",
  "$lte",
  "$in",
  "$nin",
  // Logical
  "$and",
  "$or",
  "$not",
  // Element
  "$exists",
  // Evaluation
  "$expr",
  "$regex",
  // Math
  "$abs",
  "$ceil",
  "$floor",
  "$round",
  "$min",
  "$max",
  "$avg",
  "$sum",
  "$subtract",
]);

/**
 * Disallowed operators (security risk)
 */
const DISALLOWED_OPERATORS = new Set(["$where", "$function"]);

/**
 * Recursively validate MongoDB query filter
 * @param filter - MongoDB query filter object
 * @throws Error if filter contains disallowed operators or structures
 */
export function validateQueryFilter(filter: unknown): void {
  if (filter === null || filter === undefined) {
    throw new Error("Filter cannot be null or undefined");
  }

  if (typeof filter !== "object" || Array.isArray(filter)) {
    throw new Error("Filter must be an object");
  }

  const obj = filter as Record<string, unknown>;

  for (const [key, value] of Object.entries(obj)) {
    // Check for disallowed operators
    if (DISALLOWED_OPERATORS.has(key)) {
      throw new Error(`Disallowed operator: ${key}`);
    }

    // If key is an operator (starts with $)
    if (key.startsWith("$")) {
      if (!ALLOWED_OPERATORS.has(key)) {
        throw new Error(`Unknown operator: ${key}`);
      }

      // Recursively validate $and, $or, $not
      if (key === "$and" || key === "$or" || key === "$not") {
        if (!Array.isArray(value) && key !== "$not") {
          throw new Error(`${key} must be an array`);
        }
        const items = key === "$not" ? [value] : (value as unknown[]);
        for (const item of items) {
          validateQueryFilter(item);
        }
      } else if (key === "$expr") {
        // $expr is allowed but we don't validate its structure deeply
        // It's complex and validation would be overly restrictive
        if (typeof value !== "object" || value === null) {
          throw new Error("$expr must be an object");
        }
      }
    } else {
      // Regular field - recursively validate nested objects
      if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value)
      ) {
        validateQueryFilter(value);
      }
    }
  }
}
