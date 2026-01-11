"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { projectsApi, ApiKey, ApiKeyCreateResponse } from "@/lib/api";
import { getToken } from "@/lib/api";
import Link from "next/link";

export default function ProjectSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.projectId as string;

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [apiKeyName, setApiKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [projectIdCopied, setProjectIdCopied] = useState(false);

  const loadApiKeys = useCallback(async () => {
    try {
      const response = await projectsApi.listApiKeys(projectId);
      setApiKeys(response.apiKeys);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load API keys");
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

    loadApiKeys();
  }, [projectId, router, loadApiKeys]);

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");
    setNewApiKey(null);

    if (!apiKeyName.trim()) {
      setCreateError("API key name is required");
      return;
    }

    setCreating(true);
    try {
      const response: ApiKeyCreateResponse = await projectsApi.createApiKey(
        projectId,
        apiKeyName.trim()
      );
      setNewApiKey(response.apiKey.key);
      setApiKeyName("");
      // Reload API keys list
      await loadApiKeys();
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create API key"
      );
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    if (!confirm("Are you sure you want to delete this API key?")) {
      return;
    }

    try {
      await projectsApi.deleteApiKey(projectId, keyId);
      // Reload API keys list
      await loadApiKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete API key");
    }
  };

  const handleCopyKey = async (key: string) => {
    try {
      await navigator.clipboard.writeText(key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = key;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyProjectId = async () => {
    try {
      await navigator.clipboard.writeText(projectId);
      setProjectIdCopied(true);
      setTimeout(() => setProjectIdCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = projectId;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setProjectIdCopied(true);
      setTimeout(() => setProjectIdCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        <p>Loading API keys...</p>
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
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: "bold",
              marginTop: "0.5rem",
            }}
          >
            Project Settings
          </h1>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginTop: "0.5rem",
            }}
          >
            <span style={{ fontSize: "0.875rem", color: "#666" }}>
              Project ID: {projectId}
            </span>
            <button
              onClick={handleCopyProjectId}
              style={{
                padding: "0.25rem 0.5rem",
                background: projectIdCopied ? "#28a745" : "#667eea",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "0.75rem",
                fontWeight: "500",
              }}
            >
              {projectIdCopied ? "Copied!" : "Copy"}
            </button>
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

        {/* API Keys Section */}
        <div
          style={{
            padding: "1.5rem",
            background: "white",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            marginBottom: "2rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.5rem",
            }}
          >
            <h2 style={{ fontSize: "1.5rem", fontWeight: "600" }}>API Keys</h2>
            <button
              onClick={() => {
                setShowCreateModal(true);
                setNewApiKey(null);
                setApiKeyName("");
                setCreateError("");
              }}
              style={{
                padding: "0.5rem 1rem",
                background: "#28a745",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: "500",
              }}
            >
              + Create API Key
            </button>
          </div>

          {apiKeys.length === 0 ? (
            <div
              style={{ textAlign: "center", padding: "2rem", color: "#666" }}
            >
              <p>No API keys found. Create one to get started.</p>
            </div>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  style={{
                    padding: "1rem",
                    background: "#f8f9fa",
                    borderRadius: "4px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "600", marginBottom: "0.25rem" }}>
                      {key.name}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#666" }}>
                      Created: {new Date(key.createdAt).toLocaleString()}
                      {key.lastUsedAt && (
                        <>
                          {" "}
                          • Last used:{" "}
                          {new Date(key.lastUsedAt).toLocaleString()}
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteApiKey(key.id)}
                    style={{
                      padding: "0.5rem 1rem",
                      background: "#dc3545",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create API Key Modal */}
        {showCreateModal && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
            }}
            onClick={() => {
              setShowCreateModal(false);
              setNewApiKey(null);
            }}
          >
            <div
              style={{
                background: "white",
                padding: "2rem",
                borderRadius: "8px",
                boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                width: "100%",
                maxWidth: "600px",
                margin: "1rem",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                style={{
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                  marginBottom: "1.5rem",
                }}
              >
                {newApiKey ? "API Key Created" : "Create New API Key"}
              </h2>

              {newApiKey ? (
                <div>
                  <div
                    style={{
                      padding: "1rem",
                      marginBottom: "1rem",
                      background: "#d4edda",
                      color: "#155724",
                      borderRadius: "4px",
                      fontSize: "0.875rem",
                      border: "1px solid #c3e6cb",
                    }}
                  >
                    <strong>Important:</strong> Copy this API key now. You
                    won&apos;t be able to see it again!
                  </div>

                  <div style={{ marginBottom: "1.5rem" }}>
                    <label
                      style={{
                        display: "block",
                        marginBottom: "0.5rem",
                        fontWeight: "500",
                      }}
                    >
                      API Key
                    </label>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <input
                        type="text"
                        value={newApiKey}
                        readOnly
                        style={{
                          flex: 1,
                          padding: "0.75rem",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          fontSize: "0.875rem",
                          fontFamily: "monospace",
                          background: "#f8f9fa",
                        }}
                      />
                      <button
                        onClick={() => handleCopyKey(newApiKey)}
                        style={{
                          padding: "0.75rem 1rem",
                          background: copied ? "#28a745" : "#667eea",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                          fontWeight: "500",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {copied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: "1rem",
                      justifyContent: "flex-end",
                    }}
                  >
                    <button
                      onClick={() => {
                        setShowCreateModal(false);
                        setNewApiKey(null);
                      }}
                      style={{
                        padding: "0.75rem 1.5rem",
                        background: "#28a745",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "1rem",
                        fontWeight: "500",
                      }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {createError && (
                    <div
                      style={{
                        padding: "0.75rem",
                        marginBottom: "1rem",
                        background: "#fee",
                        color: "#c33",
                        borderRadius: "4px",
                        fontSize: "0.875rem",
                      }}
                    >
                      {createError}
                    </div>
                  )}

                  <form onSubmit={handleCreateApiKey}>
                    <div style={{ marginBottom: "1.5rem" }}>
                      <label
                        style={{
                          display: "block",
                          marginBottom: "0.5rem",
                          fontWeight: "500",
                        }}
                      >
                        API Key Name
                      </label>
                      <input
                        type="text"
                        value={apiKeyName}
                        onChange={(e) => setApiKeyName(e.target.value)}
                        placeholder="Enter API key name (e.g., 'Production', 'Development')..."
                        required
                        style={{
                          width: "100%",
                          padding: "0.75rem",
                          border: "1px solid #ddd",
                          borderRadius: "4px",
                          fontSize: "1rem",
                        }}
                      />
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "1rem",
                        justifyContent: "flex-end",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setShowCreateModal(false);
                          setApiKeyName("");
                          setCreateError("");
                        }}
                        disabled={creating}
                        style={{
                          padding: "0.75rem 1.5rem",
                          background: "#6c757d",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: creating ? "not-allowed" : "pointer",
                          fontSize: "1rem",
                          fontWeight: "500",
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={creating}
                        style={{
                          padding: "0.75rem 1.5rem",
                          background: creating ? "#ccc" : "#28a745",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: creating ? "not-allowed" : "pointer",
                          fontSize: "1rem",
                          fontWeight: "500",
                        }}
                      >
                        {creating ? "Creating..." : "Create"}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
