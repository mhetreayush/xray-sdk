"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { tracesApi, queryApi, Trace, Step } from "@/lib/api";
import { getToken } from "@/lib/api";
import Link from "next/link";

export default function TraceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;
  const traceId = params.traceId as string;

  const [trace, setTrace] = useState<Trace | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTrace = useCallback(async () => {
    try {
      const response = await tracesApi.get(projectId, traceId);
      setTrace(response.trace);
      setSteps(response.steps);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trace");
    } finally {
      setLoading(false);
    }
  }, [projectId, traceId]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    loadTrace();
  }, [projectId, traceId, router, loadTrace]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "#28a745";
      case "failure":
        return "#dc3545";
      default:
        return "#ffc107";
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>Loading trace...</p>
      </div>
    );
  }

  if (error || !trace) {
    return (
      <div style={{ padding: "2rem" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <p style={{ color: "#dc3545" }}>{error || "Trace not found"}</p>
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
              alignItems: "center",
              gap: "1rem",
              marginTop: "0.5rem",
            }}
          >
            <h1 style={{ fontSize: "2rem", fontWeight: "bold" }}>
              Trace Details
            </h1>
            <span
              style={{
                padding: "0.5rem 1rem",
                background: getStatusColor(trace.status),
                color: "white",
                borderRadius: "12px",
                fontSize: "0.875rem",
                fontWeight: "500",
                textTransform: "uppercase",
              }}
            >
              {trace.status}
            </span>
          </div>
        </div>

        {/* Trace info */}
        <div
          style={{
            padding: "1.5rem",
            background: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            marginBottom: "2rem",
          }}
        >
          <div style={{ marginBottom: "1rem" }}>
            <strong>Trace ID:</strong> {trace.traceId}
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <strong>Created:</strong>{" "}
            {new Date(trace.createdAt).toLocaleString()}
          </div>
          {Object.keys(trace.metadata).length > 0 && (
            <div>
              <strong>Metadata:</strong>
              <pre
                style={{
                  marginTop: "0.5rem",
                  padding: "1rem",
                  background: "#f8f9fa",
                  borderRadius: "4px",
                  overflow: "auto",
                  fontSize: "0.875rem",
                }}
              >
                {JSON.stringify(trace.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Steps */}
        <div>
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: "600",
              marginBottom: "1rem",
            }}
          >
            Steps ({steps.length})
          </h2>
          {steps.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "3rem",
                background: "white",
                borderRadius: "8px",
              }}
            >
              <p>No steps found</p>
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              {steps.map((step) => (
                <div
                  key={step.stepId}
                  style={{
                    padding: "1.5rem",
                    background: "white",
                    borderRadius: "8px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      marginBottom: "1rem",
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
                    <span style={{ fontSize: "0.875rem", color: "#666" }}>
                      {new Date(step.timestamp).toLocaleString()}
                    </span>
                  </div>

                  {step.artifacts.length > 0 && (
                    <div style={{ marginBottom: "1rem" }}>
                      <strong>Artifacts ({step.artifacts.length}):</strong>
                      <div
                        style={{
                          marginTop: "0.5rem",
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "0.5rem",
                        }}
                      >
                        {step.artifacts.map((artifact, idx) => (
                          <button
                            key={idx}
                            onClick={async () => {
                              try {
                                const response = await queryApi.getDataUrl(
                                  projectId,
                                  traceId,
                                  artifact.dataId
                                );
                                window.open(response.presignedUrl, "_blank");
                              } catch (err) {
                                console.error("Failed to get data URL:", err);
                                alert("Failed to open file. Please try again.");
                              }
                            }}
                            style={{
                              padding: "0.25rem 0.75rem",
                              background:
                                artifact.type === "input"
                                  ? "#17a2b8"
                                  : artifact.type === "output"
                                  ? "#28a745"
                                  : "#6c757d",
                              color: "white",
                              border: "none",
                              borderRadius: "12px",
                              fontSize: "0.75rem",
                              cursor: "pointer",
                              transition: "opacity 0.2s",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.opacity = "0.8";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.opacity = "1";
                            }}
                          >
                            {artifact.type || "data"}:{" "}
                            {artifact.dataId.slice(0, 8)}...
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {Object.keys(step.metadata).length > 0 && (
                    <div>
                      <strong>Metadata:</strong>
                      <pre
                        style={{
                          marginTop: "0.5rem",
                          padding: "1rem",
                          background: "#f8f9fa",
                          borderRadius: "4px",
                          overflow: "auto",
                          fontSize: "0.875rem",
                          maxHeight: "400px",
                        }}
                      >
                        {JSON.stringify(step.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
