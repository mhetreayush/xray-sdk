/**
 * ApiClient - Simple HTTP client for backend API calls
 * No retry logic here - retries handled by uploaders
 */

import {
  PresignRequest,
  PresignResponse,
  IngestRequest,
  IngestResponse,
} from "./types";
import { DebugLogger } from "./utils/debug";

/**
 * ApiClient handles HTTP calls to the backend
 */
export class ApiClient {
  private baseUrl: string;
  private apiKey: string;
  private debug: DebugLogger;

  constructor(baseUrl: string, apiKey: string, debug: boolean = false) {
    // Ensure baseUrl doesn't end with trailing slash
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
    this.debug = new DebugLogger(debug);
  }

  /**
   * Get presigned URL for S3 upload
   */
  async presign(request: PresignRequest): Promise<PresignResponse> {
    const url = `${this.baseUrl}/api/v1/presign`;
    this.debug.debug(
      `[ApiClient] presign() called: dataId=${request.dataId}, traceId=${request.traceId}`
    );

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(
        `Presign request failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = (await response.json()) as PresignResponse;
    this.debug.debug(
      `[ApiClient] presign() successful: dataId=${request.dataId}`
    );
    return data;
  }

  /**
   * Ingest batch of events
   */
  async ingest(request: IngestRequest): Promise<IngestResponse> {
    const url = `${this.baseUrl}/api/v1/ingest`;
    this.debug.debug(
      `[ApiClient] ingest() called: events=${request.events.length}`
    );

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(
        `Ingest request failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data = (await response.json()) as IngestResponse;
    this.debug.debug(
      `[ApiClient] ingest() successful: events=${request.events.length}`
    );
    return data;
  }
}
