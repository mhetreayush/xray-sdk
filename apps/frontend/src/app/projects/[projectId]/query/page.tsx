"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { queryApi, Step, SchemaShape } from "@/lib/api";
import { getToken } from "@/lib/api";
import { QueryBuilder } from "@/components/QueryBuilder";
import Link from "next/link";
import JSON5 from "json5";

export default function QueryPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [schema, setSchema] = useState<SchemaShape | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [queryLoading, setQueryLoading] = useState(false);
  const [error, setError] = useState("");
  const [queryMode, setQueryMode] = useState<"visual" | "raw">("visual");
  const [rawQuery, setRawQuery] = useState("{}");

  const loadSchema = useCallback(async () => {
    try {
      const response = await queryApi.getSchemas(projectId);
      setSchema(response.schema);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load schema");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    loadSchema();
  }, [projectId, router, loadSchema]);

  const handleQuery = async (filter: Record<string, unknown>) => {
    setQueryLoading(true);
    setError("");
    try {
      const response = await queryApi.querySteps(projectId, filter);
      setSteps(response.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setQueryLoading(false);
    }
  };

  const handleRawQuery = async () => {
    setQueryLoading(true);
    setError("");
    try {
      // Parse query using JSON5 (supports unquoted keys like MongoDB queries)
      const filter = JSON5.parse(rawQuery);
      if (typeof filter !== "object" || Array.isArray(filter)) {
        throw new Error("Query must be a JSON object");
      }
      const response = await queryApi.querySteps(projectId, filter);
      setSteps(response.results);
    } catch (err) {
      if (err instanceof SyntaxError || err instanceof Error) {
        setError(`Invalid query: ${err.message}`);
      } else {
        setError("Query failed");
      }
    } finally {
      setQueryLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>Loading schema...</p>
      </div>
    );
  }

  if (!schema) {
    return (
      <div style={{ padding: "2rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <p>No schema available. Run some traces first.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", padding: "2rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ marginBottom: "2rem" }}>
          <Link
            href={`/projects/${projectId}/traces`}
            style={{
              color: "#667eea",
              marginBottom: "1rem",
              display: "inline-block",
            }}
          >
            ← Back to Traces
          </Link>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "0.5rem",
            }}
          >
            <h1 style={{ fontSize: "2rem", fontWeight: "bold" }}>
              Query Steps
            </h1>
            <Link
              href={`/projects/${projectId}/settings`}
              style={{
                padding: "0.5rem 1rem",
                background: "#6c757d",
                color: "white",
                borderRadius: "4px",
                fontWeight: "500",
                fontSize: "0.875rem",
              }}
            >
              Settings
            </Link>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: "1rem",
              marginBottom: "1rem",
              background: "#fee",
              color: "#c33",
              borderRadius: "4px",
            }}
          >
            {error}
          </div>
        )}

        {/* Query Mode Toggle */}
        <div
          style={{
            marginBottom: "1.5rem",
            background: "white",
            borderRadius: "8px",
            padding: "1rem",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              marginBottom: queryMode === "raw" ? "1rem" : "0",
            }}
          >
            <button
              onClick={() => setQueryMode("visual")}
              style={{
                padding: "0.5rem 1rem",
                background: queryMode === "visual" ? "#667eea" : "#e0e0e0",
                color: queryMode === "visual" ? "white" : "#333",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "500",
                fontSize: "0.875rem",
              }}
            >
              Visual Builder
            </button>
            <button
              onClick={() => setQueryMode("raw")}
              style={{
                padding: "0.5rem 1rem",
                background: queryMode === "raw" ? "#667eea" : "#e0e0e0",
                color: queryMode === "raw" ? "white" : "#333",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "500",
                fontSize: "0.875rem",
              }}
            >
              Raw MongoDB Query
            </button>
          </div>

          {queryMode === "visual" ? (
            <QueryBuilder
              schema={schema}
              onQuery={handleQuery}
              loading={queryLoading}
            />
          ) : (
            <div>
              <div style={{ marginBottom: "0.75rem" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "0.5rem",
                    fontWeight: "500",
                    fontSize: "0.875rem",
                    color: "#666",
                  }}
                >
                  MongoDB Query (JSON)
                </label>
                <textarea
                  value={rawQuery}
                  onChange={(e) => setRawQuery(e.target.value)}
                  placeholder='{"metadata.keywordCount": {"$gte": 5}, "metadata.candidateCount": {"$gt": 0}}'
                  style={{
                    width: "100%",
                    minHeight: "200px",
                    padding: "0.75rem",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    fontSize: "0.875rem",
                    fontFamily: "monospace",
                    resize: "vertical",
                  }}
                />
              </div>
              <div
                style={{
                  padding: "0.75rem",
                  background: "#f8f9fa",
                  borderRadius: "4px",
                  fontSize: "0.75rem",
                  color: "#666",
                  marginBottom: "1rem",
                }}
              >
                <strong>Note:</strong> The query will be scoped to this project
                automatically. Use MongoDB query operators like{" "}
                <code
                  style={{ background: "#e9ecef", padding: "0.1rem 0.3rem" }}
                >
                  $gt
                </code>
                ,{" "}
                <code
                  style={{ background: "#e9ecef", padding: "0.1rem 0.3rem" }}
                >
                  $lt
                </code>
                ,{" "}
                <code
                  style={{ background: "#e9ecef", padding: "0.1rem 0.3rem" }}
                >
                  $in
                </code>
                ,{" "}
                <code
                  style={{ background: "#e9ecef", padding: "0.1rem 0.3rem" }}
                >
                  $and
                </code>
                ,{" "}
                <code
                  style={{ background: "#e9ecef", padding: "0.1rem 0.3rem" }}
                >
                  $or
                </code>
                , etc.
              </div>
              <button
                onClick={handleRawQuery}
                disabled={queryLoading}
                style={{
                  padding: "0.75rem 1.5rem",
                  background: queryLoading ? "#ccc" : "#667eea",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: queryLoading ? "not-allowed" : "pointer",
                  fontWeight: "500",
                  fontSize: "1rem",
                }}
              >
                {queryLoading ? "Querying..." : "Run Query"}
              </button>
            </div>
          )}
        </div>

        {steps.length > 0 && (
          <div>
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: "600",
                marginBottom: "1rem",
              }}
            >
              Results ({steps.length})
            </h2>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              {steps.map((step) => (
                <Link
                  key={step.stepId}
                  href={`/projects/${projectId}/traces/${step.traceId}`}
                  style={{
                    display: "block",
                    padding: "1.5rem",
                    background: "white",
                    borderRadius: "8px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    transition: "transform 0.2s, box-shadow 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 8px rgba(0,0,0,0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 2px 4px rgba(0,0,0,0.1)";
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "start",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "1rem",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <h3 style={{ fontSize: "1.125rem", fontWeight: "600" }}>
                          {step.stepName}
                        </h3>
                        <span
                          style={{
                            padding: "0.25rem 0.75rem",
                            background: "#667eea",
                            color: "white",
                            borderRadius: "12px",
                            fontSize: "0.75rem",
                            fontWeight: "500",
                          }}
                        >
                          Step #{step.stepNumber}
                        </span>
                      </div>
                      <p
                        style={{
                          fontSize: "0.875rem",
                          color: "#666",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Trace: {step.traceId}
                      </p>
                      <p style={{ fontSize: "0.875rem", color: "#666" }}>
                        {new Date(step.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {!queryLoading && steps.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "3rem",
              background: "white",
              borderRadius: "8px",
            }}
          >
            <p style={{ fontSize: "1.125rem", color: "#666" }}>
              Build a query above to see results
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
