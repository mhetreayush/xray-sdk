/**
 * Schema Extractor - Extract schema shape from metadata and hash with SHA256
 */

import { hashSchema } from "../utils/hash";

/**
 * Schema shape type - can be a string (primitive type) or nested object
 * Using any to allow recursive structures (TypeScript doesn't support recursive type aliases)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SchemaShape = Record<string, any>;

/**
 * Extract type from value (string, number, boolean, object, array)
 * For objects, recursively extract their shape
 */
function extractValueType(value: unknown): string | SchemaShape {
  if (value === null || value === undefined) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  if (typeof value === "object") {
    // Recursively extract nested object shape
    return extractSchemaShape(value as Record<string, unknown>);
  }
  return typeof value;
}

/**
 * Extract schema shape from metadata object (recursively)
 * Maps each key to its type (primitive) or nested schema shape (object)
 * @param metadata - Metadata object
 * @returns Schema shape object (e.g., { priceMax: "number", nested: { name: "string" } })
 */
export function extractSchemaShape(
  metadata: Record<string, unknown>
): SchemaShape {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const schemaShape: Record<string, any> = {};

  for (const [key, value] of Object.entries(metadata)) {
    schemaShape[key] = extractValueType(value);
  }

  return schemaShape as SchemaShape;
}

/**
 * Extract schema shape and hash it
 * @param metadata - Metadata object
 * @returns Object with schema shape and hash
 */
export function extractAndHashSchema(metadata: Record<string, unknown>): {
  schema: SchemaShape;
  schemaHash: string;
} {
  const schema = extractSchemaShape(metadata);
  const schemaHash = hashSchema(schema);

  return {
    schema,
    schemaHash,
  };
}
