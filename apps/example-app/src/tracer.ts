import { BaseTracer } from "@xray/sdk";

// Default tracer configuration
const defaultConfig = {
  apiKey: "xray_sk_N8yYPZuaQSvGomV34Rc0Lax4Yl048zW3",
  projectId: "611f8714-c116-4828-8bd7-03162cd4d4ce",
  enabled: true,
  debug: true,
  baseUrl: process.env.XRAY_BASE_URL || "http://localhost:3000",
};

// Singleton pattern - initialize once, export instance
export const tracer = new BaseTracer(defaultConfig);

// Factory function to create a tracer with custom configuration
export function createTracer(apiKey: string, projectId: string) {
  return new BaseTracer({
    apiKey,
    projectId,
    enabled: true,
    debug: true,
    baseUrl: process.env.XRAY_BASE_URL || "http://localhost:3000",
  });
}
