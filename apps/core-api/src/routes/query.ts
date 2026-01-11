/**
 * Query Routes - Query API endpoints for traces, steps, data, schemas
 */

import { Router, Request, Response } from "express";
import { Trace } from "../models/Trace";
import { Step } from "../models/Step";
import { Data } from "../models/Data";
import { MetadataSchema } from "../models/MetadataSchema";
import { S3Service } from "../services/s3";
import { validateQueryFilter } from "../utils/queryValidator";
import { jwtAuth } from "../middleware/jwtAuth";
import { projectMembership } from "../middleware/projectMembership";
import type { Config } from "../config";

/**
 * Create query router
 */
export function createQueryRouter(
  config: Config,
  s3Service: S3Service
): Router {
  const router = Router();
  const jwtAuthMiddleware = jwtAuth(config);

  // GET /api/v1/projects/:projectId/traces
  router.get(
    "/projects/:projectId/traces",
    jwtAuthMiddleware,
    projectMembership,
    async (req: Request, res: Response) => {
      try {
        const projectId = req.params.projectId;
        const status = req.query.status as string | undefined;
        const startDate = req.query.startDate as string | undefined;
        const endDate = req.query.endDate as string | undefined;
        const limit = Math.min(
          parseInt(req.query.limit as string, 10) || 50,
          100
        );
        const cursor = req.query.cursor as string | undefined;

        // Build MongoDB query with filters
        const query: Record<string, unknown> = { projectId };

        if (status) {
          query.status = status;
        }

        if (startDate) {
          query.createdAt = {
            ...(query.createdAt as Record<string, unknown>),
            $gte: new Date(startDate),
          };
        }

        if (endDate) {
          query.createdAt = {
            ...(query.createdAt as Record<string, unknown>),
            $lte: new Date(endDate),
          };
        }

        // Cursor-based pagination: if cursor provided, add traceId < cursor condition
        if (cursor) {
          const cursorTrace = await Trace.findOne({ traceId: cursor });
          if (cursorTrace) {
            query.$or = [
              { createdAt: { $lt: cursorTrace.createdAt } },
              { createdAt: cursorTrace.createdAt, traceId: { $lt: cursor } },
            ];
          }
        }

        // Sort by createdAt descending
        const traces = await Trace.find(query)
          .sort({ createdAt: -1, traceId: -1 })
          .limit(limit + 1); // Fetch one extra to determine if there's a next page

        // Determine nextCursor
        let nextCursor: string | null = null;
        if (traces.length > limit) {
          nextCursor = traces[limit - 1].traceId;
          traces.pop(); // Remove the extra item
        }

        res.json({ traces, nextCursor });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // GET /api/v1/projects/:projectId/traces/:traceId
  router.get(
    "/projects/:projectId/traces/:traceId",
    jwtAuthMiddleware,
    projectMembership,
    async (req: Request, res: Response) => {
      try {
        const projectId = req.params.projectId;
        const traceId = req.params.traceId;

        // Fetch trace by traceId
        const trace = await Trace.findOne({ traceId });
        if (!trace) {
          res.status(404).json({ error: "Trace not found" });
          return;
        }

        // Verify trace belongs to the project
        if (trace.projectId !== projectId) {
          res
            .status(403)
            .json({ error: "Trace does not belong to this project" });
          return;
        }

        // Fetch all steps for traceId, sorted by stepNumber
        const steps = await Step.find({ traceId }).sort({ stepNumber: 1 });

        res.json({ trace, steps });
      } catch (error) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // GET /api/v1/projects/:projectId/traces/:traceId/data/:dataId
  router.get(
    "/projects/:projectId/traces/:traceId/data/:dataId",
    jwtAuthMiddleware,
    projectMembership,
    async (req: Request, res: Response) => {
      try {
        const projectId = req.params.projectId;
        const traceId = req.params.traceId;
        const dataId = req.params.dataId;

        // Fetch data document by dataId
        const data = await Data.findOne({ dataId });
        if (!data) {
          res.status(404).json({ error: "Data not found" });
          return;
        }

        // Verify data.traceId matches :traceId
        if (data.traceId !== traceId) {
          res.status(400).json({ error: "Data does not belong to this trace" });
          return;
        }

        // Fetch trace, verify it belongs to the project
        const trace = await Trace.findOne({ traceId: data.traceId });
        if (!trace) {
          res.status(404).json({ error: "Trace not found" });
          return;
        }

        if (trace.projectId !== projectId) {
          res
            .status(403)
            .json({ error: "Data does not belong to this project" });
          return;
        }

        // Generate presigned GET URL (expiry: 15 minutes)
        const presignedUrl = await s3Service.generatePresignedGetUrl(
          data.dataPath,
          15
        );

        res.json({
          presignedUrl,
          key: data.key,
          metadata: data.metadata,
        });
      } catch (error) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // POST /api/v1/projects/:projectId/query
  router.post(
    "/projects/:projectId/query",
    jwtAuthMiddleware,
    projectMembership,
    async (req: Request, res: Response) => {
      try {
        const { filter, sort, limit: requestLimit, cursor } = req.body;
        const projectId = req.params.projectId;

        // Inject projectId into filter (always scope to project)
        const scopedFilter = {
          ...filter,
          projectId,
        };

        // Sanitize filter (prevent injection, limit operators)
        validateQueryFilter(scopedFilter);

        // Build query
        const limit = Math.min(requestLimit || 50, 100);
        const sortSpec = sort || { timestamp: -1 };

        let query = Step.find(scopedFilter).sort(sortSpec);

        // Cursor-based pagination: if cursor provided, add stepId < cursor condition
        if (cursor) {
          const cursorStep = await Step.findOne({ stepId: cursor });
          if (cursorStep) {
            const cursorQuery = {
              ...scopedFilter,
              $or: [
                { timestamp: { $lt: cursorStep.timestamp } },
                { timestamp: cursorStep.timestamp, stepId: { $lt: cursor } },
              ],
            };
            query = Step.find(cursorQuery).sort(sortSpec);
          }
        }

        // Execute query on steps collection
        const results = await query.limit(limit + 1); // Fetch one extra to determine if there's a next page

        // Determine nextCursor
        let nextCursor: string | null = null;
        if (results.length > limit) {
          nextCursor = results[limit - 1].stepId;
          results.pop(); // Remove the extra item
        }

        res.json({ results, nextCursor });
      } catch (error) {
        console.error(error);
        if (
          error instanceof Error &&
          error.message.includes("Disallowed operator")
        ) {
          res.status(400).json({ error: error.message });
          return;
        }
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // Helper function to recursively merge schema shapes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function mergeSchema(
    target: Record<string, any>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    source: Record<string, any>
  ): void {
    for (const [key, value] of Object.entries(source)) {
      if (!(key in target)) {
        // Key doesn't exist, add it
        target[key] = value;
      } else if (
        typeof value === "object" &&
        value !== null &&
        !Array.isArray(value) &&
        typeof target[key] === "object" &&
        target[key] !== null &&
        !Array.isArray(target[key])
      ) {
        // Both are objects, merge recursively
        mergeSchema(target[key], value);
      }
      // If key exists and types don't match (or one is primitive), keep first
    }
  }

  // GET /api/v1/projects/:projectId/schemas
  router.get(
    "/projects/:projectId/schemas",
    jwtAuthMiddleware,
    projectMembership,
    async (req: Request, res: Response) => {
      try {
        const projectId = req.params.projectId;

        // Query all schemas for the project
        const schemas = await MetadataSchema.find({ projectId });

        // Aggregate all schema shapes into a single schema (recursively)
        // If a field appears with different types, keep the first type encountered
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const aggregatedSchema: Record<string, any> = {};

        for (const schema of schemas) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const schemaShape = schema.schemaShape as Record<string, any>;
          mergeSchema(aggregatedSchema, schemaShape);
        }

        res.json({
          schema: aggregatedSchema,
        });
      } catch (error) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  return router;
}
