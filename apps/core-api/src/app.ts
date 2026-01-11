/**
 * Express App Setup - MongoDB connection, middleware, routes
 */

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import type { Config } from "./config";
import { S3Service } from "./services/s3";
import { KafkaService } from "./services/kafka";
import { createPresignRouter } from "./routes/presign";
import { createIngestRouter } from "./routes/ingest";
import { createAuthRouter } from "./routes/auth";
import { createProjectsRouter } from "./routes/projects";
import { createQueryRouter } from "./routes/query";

/**
 * Create Express app and setup middleware/routes
 */
export async function createApp(config: Config): Promise<express.Application> {
  const app = express();

  // CORS middleware - allow requests from frontend
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || "http://localhost:3001",
      credentials: true,
    })
  );

  // JSON body parser
  app.use(express.json());

  // Connect to MongoDB
  await mongoose.connect(config.mongodbUri);
  console.log("Connected to MongoDB");

  // Initialize services
  const s3Service = new S3Service(config);
  const kafkaService = new KafkaService(config);

  // Connect Kafka producer
  await kafkaService.connect();
  console.log("Connected to Kafka producer");

  // Setup routes
  app.use("/api/v1/presign", createPresignRouter(s3Service, kafkaService));
  app.use("/api/v1/ingest", createIngestRouter(kafkaService));
  app.use("/api/v1/auth", createAuthRouter(config));
  app.use("/api/v1/projects", createProjectsRouter(config));
  app.use("/api/v1", createQueryRouter(config, s3Service));

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  // Error handler
  app.use((err: Error, req: express.Request, res: express.Response) => {
    console.error("Error:", err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
