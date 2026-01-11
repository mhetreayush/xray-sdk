"use client";

import { useState } from "react";
import { SchemaShape } from "@/lib/api";

interface FilterCondition {
  path: string;
  operator: string;
  value: string | number;
}

interface QueryBuilderProps {
  schema: SchemaShape;
  onQuery: (filter: Record<string, unknown>) => void;
  loading?: boolean;
}

export function QueryBuilder({ schema, onQuery, loading }: QueryBuilderProps) {
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [selectedPath, setSelectedPath] = useState("");
  const [operator, setOperator] = useState("$eq");
  const [value, setValue] = useState("");

  // Build list of all possible paths from schema (recursively)
  const buildPaths = (obj: SchemaShape, prefix = ""): string[] => {
    const paths: string[] = [];
    for (const [key, val] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (typeof val === "string") {
        paths.push(path);
      } else if (typeof val === "object") {
        paths.push(...buildPaths(val, path));
      }
    }
    return paths;
  };

  const paths = buildPaths(schema);

  const handleAddCondition = () => {
    if (!selectedPath) return;

    const conditionValue = value.includes(".") && !isNaN(parseFloat(value))
      ? parseFloat(value)
      : isNaN(Number(value))
        ? value
        : Number(value);

    setConditions([...conditions, {
      path: selectedPath,
      operator,
      value: conditionValue,
    }]);
    setSelectedPath("");
    setValue("");
  };

  const handleRemoveCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const handleRunQuery = () => {
    if (conditions.length === 0) {
      onQuery({});
      return;
    }

    // Build MongoDB filter from conditions
    // If multiple conditions, combine with $and
    if (conditions.length === 1) {
      const condition = conditions[0];
      const filter: Record<string, unknown> = {
        [`metadata.${condition.path}`]: { [condition.operator]: condition.value },
      };
      onQuery(filter);
    } else {
      // Multiple conditions - use $and
      const andConditions = conditions.map((condition) => ({
        [`metadata.${condition.path}`]: { [condition.operator]: condition.value },
      }));
      onQuery({ $and: andConditions });
    }
  };

  const operators = [
    { value: "$eq", label: "equals" },
    { value: "$ne", label: "not equals" },
    { value: "$gt", label: "greater than" },
    { value: "$gte", label: "greater than or equal" },
    { value: "$lt", label: "less than" },
    { value: "$lte", label: "less than or equal" },
    { value: "$in", label: "in" },
    { value: "$nin", label: "not in" },
  ];

  return (
    <div style={{
      padding: "1.5rem",
      background: "white",
      borderRadius: "8px",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      marginBottom: "2rem"
    }}>
      <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1rem" }}>
        Build Query
      </h2>

      {/* Add condition form */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr 1fr auto",
        gap: "0.5rem",
        marginBottom: "1rem",
        alignItems: "end"
      }}>
        <div>
          <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.875rem", fontWeight: "500" }}>
            Field
          </label>
          <select
            value={selectedPath}
            onChange={(e) => setSelectedPath(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "0.875rem"
            }}
          >
            <option value="">Select field...</option>
            {paths.map((path) => (
              <option key={path} value={path}>
                {path}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.875rem", fontWeight: "500" }}>
            Operator
          </label>
          <select
            value={operator}
            onChange={(e) => setOperator(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "0.875rem"
            }}
          >
            {operators.map((op) => (
              <option key={op.value} value={op.value}>
                {op.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.875rem", fontWeight: "500" }}>
            Value
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Enter value..."
            style={{
              width: "100%",
              padding: "0.5rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
              fontSize: "0.875rem"
            }}
          />
        </div>

        <button
          onClick={handleAddCondition}
          disabled={!selectedPath || !value}
          style={{
            padding: "0.5rem 1rem",
            background: selectedPath && value ? "#28a745" : "#ccc",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: selectedPath && value ? "pointer" : "not-allowed",
            fontSize: "0.875rem",
            fontWeight: "500"
          }}
        >
          Add
        </button>
      </div>

      {/* Conditions list */}
      {conditions.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: "600", marginBottom: "0.5rem" }}>
            Conditions:
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {conditions.map((condition, index) => {
              const opLabel = operators.find((o) => o.value === condition.operator)?.label || condition.operator;
              return (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.75rem",
                    background: "#f8f9fa",
                    borderRadius: "4px"
                  }}
                >
                  <span style={{ fontSize: "0.875rem" }}>
                    <strong>{condition.path}</strong> {opLabel} <strong>{String(condition.value)}</strong>
                  </span>
                  <button
                    onClick={() => handleRemoveCondition(index)}
                    style={{
                      padding: "0.25rem 0.5rem",
                      background: "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.75rem"
                    }}
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Run query button */}
      <button
        onClick={handleRunQuery}
        disabled={loading}
        style={{
          width: "100%",
          padding: "0.75rem",
          background: loading ? "#ccc" : "#667eea",
          color: "white",
          border: "none",
          borderRadius: "4px",
          fontSize: "1rem",
          fontWeight: "500",
          cursor: loading ? "not-allowed" : "pointer"
        }}
      >
        {loading ? "Running Query..." : "Run Query"}
      </button>
    </div>
  );
}
