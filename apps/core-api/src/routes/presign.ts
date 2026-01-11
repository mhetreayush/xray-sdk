/**
 * Presign Route - POST /api/v1/presign
 * Issues S3 presigned URLs for data upload, queues data metadata to Kafka
 */

import { Router, Request, Response } from "express";
import { S3Service } from "../services/s3";
import { KafkaService } from "../services/kafka";
import { apiKeyAuth } from "../middleware/apiKeyAuth";

/**
 * Create presign router
 */
export function createPresignRouter(
  s3Service: S3Service,
  kafkaService: KafkaService
): Router {
  const router = Router();

  router.post("/", apiKeyAuth, async (req: Request, res: Response) => {
    try {
      const { dataId, traceId, key, metadata } = req.body;
      const projectId = req.projectId!; // Set by apiKeyAuth middleware

      // Generate S3 path: {projectId}/{dataId}
      const dataPath = `${projectId}/${dataId}`;

      // Generate presigned PUT URL (expiry: 15 minutes)
      const presignedUrl = await s3Service.generatePresignedPutUrl(
        dataPath,
        15
      );

      // Push data metadata event to Kafka (type: 'data')
      // Note: projectId is not in SDK's DataMetadataEvent type, but we add it here for consumer processing
      const dataEvent = {
        type: "data" as const,
        dataId,
        traceId,
        key,
        metadata: metadata ?? {},
        dataPath,
        projectId, // Enforce projectId from API key
      };

      await kafkaService.sendMessage(dataEvent);

      // Return presignedUrl and dataPath
      res.json({
        presignedUrl,
      });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
