/**
 * Ingest Route - POST /api/v1/ingest
 * Receives event batches from SDK, pushes to Kafka
 */

import { Router, Request, Response } from "express";
import { KafkaService } from "../services/kafka";
import { apiKeyAuth } from "../middleware/apiKeyAuth";

/**
 * Create ingest router
 */
export function createIngestRouter(kafkaService: KafkaService): Router {
  const router = Router();

  router.post("/", apiKeyAuth, async (req: Request, res: Response) => {
    try {
      const { events } = req.body;
      const projectId = req.projectId!; // Set by apiKeyAuth middleware

      // Enforce projectId on all events (override any projectId in the event)
      const eventsWithProjectId = events.map((event: unknown) => ({
        ...(event as Record<string, unknown>),
        projectId,
      }));

      // Push all events to Kafka topic (xray-events)
      await kafkaService.sendBatch(eventsWithProjectId);

      // Return success immediately (don't wait for consumer)
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
