import { BaseTracer } from "@xray/sdk";

// Default tracer configuration
const defaultConfig = {
  apiKey: "xray_sk_t7CsWCA9zeHM315WzlSntCEjnWJVonb8",
  projectId: "004f4d69-9f89-46b9-b954-c1738cd7e8ad",
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
