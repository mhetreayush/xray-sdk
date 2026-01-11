"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { tracesApi, Trace, exampleAppApi, UseCase } from "@/lib/api";
import { getToken } from "@/lib/api";
import Link from "next/link";

export default function TracesPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [traces, setTraces] = useState<Trace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [useCases, setUseCases] = useState<UseCase[]>([]);
  const [selectedUseCase, setSelectedUseCase] = useState<string>("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const loadTraces = useCallback(async () => {
    try {
      const response = await tracesApi.list(projectId, 10);
      setTraces(response.traces);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load traces");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadUseCases = useCallback(async () => {
    try {
      const response = await exampleAppApi.listUseCases();
      setUseCases(response.useCases);
      if (response.useCases.length > 0) {
        setSelectedUseCase(response.useCases[0].id);
      }
    } catch (err) {
      console.error("Failed to load use cases:", err);
    }
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }

    loadTraces();
    loadUseCases();
  }, [projectId, router, loadTraces, loadUseCases]);

  const handleTestUseCase = async () => {
    if (!selectedUseCase) {
      setTestResult({ success: false, message: "Please select a use case" });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // Default input data for each use case
      let input: Record<string, unknown>;
      if (selectedUseCase === "competitor-discovery") {
        input = {
          title: "Wireless Phone Charger Stand",
          category: "Electronics",
          price: 24.99,
          attributes: {
            brand: "TechBrand",
            color: "Black",
            material: "Plastic",
          },
        };
      } else {
        input = {
          title: "Wireless Phone Charger Stand - Fast Charging Dock",
          description:
            "Premium wireless charging stand compatible with all Qi-enabled devices. Fast charging up to 15W. Adjustable angle for optimal viewing. LED indicator shows charging status.",
          attributes: {
            brand: "TechBrand",
            power: "15W",
            compatibility: "Qi-enabled",
          },
        };
      }

      const response = await exampleAppApi.executeUseCase({
        useCase: selectedUseCase as
          | "competitor-discovery"
          | "product-categorization",
        input,
      });

      if (response.success) {
        setTestResult({
          success: true,
          message: `Use case executed successfully! Check the traces list to see the new trace.`,
        });
        // Reload traces to show the new one
        setTimeout(() => {
          loadTraces();
        }, 1000);
      } else {
        setTestResult({
          success: false,
          message: response.error || "Failed to execute use case",
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message:
          err instanceof Error ? err.message : "Failed to execute use case",
      });
    } finally {
      setTesting(false);
    }
  };

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
        <p>Loading traces...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", padding: "2rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ marginBottom: "2rem" }}>
          <Link
            href="/projects"
            style={{
              color: "#667eea",
              marginBottom: "1rem",
              display: "inline-block",
            }}
          >
            ← Back to Projects
          </Link>
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: "bold",
              marginTop: "0.5rem",
            }}
          >
            Traces
          </h1>
        </div>

        <div
          style={{
            display: "flex",
            gap: "1rem",
            marginBottom: "2rem",
            flexWrap: "wrap",
          }}
        >
          <Link
            href={`/projects/${projectId}/query`}
            style={{
              display: "inline-block",
              padding: "0.75rem 1.5rem",
              background: "#667eea",
              color: "white",
              borderRadius: "4px",
              fontWeight: "500",
              textDecoration: "none",
            }}
          >
            Query Steps
          </Link>
          <Link
            href={`/projects/${projectId}/settings`}
            style={{
              display: "inline-block",
              padding: "0.75rem 1.5rem",
              background: "#6c757d",
              color: "white",
              borderRadius: "4px",
              fontWeight: "500",
              textDecoration: "none",
            }}
          >
            Settings
          </Link>
        </div>

        {/* Use Case Testing Section */}
        <div
          style={{
            padding: "1.5rem",
            background: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            marginBottom: "2rem",
          }}
        >
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: "600",
              marginBottom: "1rem",
            }}
          >
            Test Use Cases
          </h2>
          <div
            style={{
              display: "flex",
              gap: "1rem",
              alignItems: "flex-end",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: "1", minWidth: "200px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "0.5rem",
                  fontSize: "0.875rem",
                  fontWeight: "500",
                  color: "#333",
                }}
              >
                Select Use Case
              </label>
              <select
                value={selectedUseCase}
                onChange={(e) => setSelectedUseCase(e.target.value)}
                disabled={testing || useCases.length === 0}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  fontSize: "1rem",
                  background:
                    testing || useCases.length === 0 ? "#f5f5f5" : "white",
                  cursor:
                    testing || useCases.length === 0
                      ? "not-allowed"
                      : "pointer",
                }}
              >
                {useCases.length === 0 ? (
                  <option value="">Loading use cases...</option>
                ) : (
                  useCases.map((useCase) => (
                    <option key={useCase.id} value={useCase.id}>
                      {useCase.name}
                    </option>
                  ))
                )}
              </select>
              {selectedUseCase && useCases.length > 0 && (
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "#666",
                    marginTop: "0.25rem",
                  }}
                >
                  {
                    useCases.find((uc) => uc.id === selectedUseCase)
                      ?.description
                  }
                </p>
              )}
            </div>
            <button
              onClick={handleTestUseCase}
              disabled={testing || !selectedUseCase || useCases.length === 0}
              style={{
                padding: "0.75rem 1.5rem",
                background:
                  testing || !selectedUseCase || useCases.length === 0
                    ? "#ccc"
                    : "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor:
                  testing || !selectedUseCase || useCases.length === 0
                    ? "not-allowed"
                    : "pointer",
                fontSize: "1rem",
                fontWeight: "500",
                whiteSpace: "nowrap",
              }}
            >
              {testing ? "Testing..." : "Run Test"}
            </button>
          </div>
          {testResult && (
            <div
              style={{
                marginTop: "1rem",
                padding: "0.75rem",
                background: testResult.success ? "#d4edda" : "#f8d7da",
                color: testResult.success ? "#155724" : "#721c24",
                borderRadius: "4px",
                fontSize: "0.875rem",
              }}
            >
              {testResult.message}
            </div>
          )}
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

        {traces.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem" }}>
            <p style={{ fontSize: "1.125rem" }}>No traces found</p>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            {traces.map((trace) => (
              <Link
                key={trace.traceId}
                href={`/projects/${projectId}/traces/${trace.traceId}`}
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
                  e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
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
                      <h2 style={{ fontSize: "1.125rem", fontWeight: "600" }}>
                        {trace.traceId}
                      </h2>
                      <span
                        style={{
                          padding: "0.25rem 0.75rem",
                          background: getStatusColor(trace.status),
                          color: "white",
                          borderRadius: "12px",
                          fontSize: "0.75rem",
                          fontWeight: "500",
                          textTransform: "uppercase",
                        }}
                      >
                        {trace.status}
                      </span>
                    </div>
                    <p style={{ fontSize: "0.875rem", color: "#666" }}>
                      Created: {new Date(trace.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
