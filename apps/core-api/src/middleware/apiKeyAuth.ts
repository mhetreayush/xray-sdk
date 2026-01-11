/**
 * API Key Authentication Middleware
 * Extracts x-api-key header, validates ApiKey, attaches projectId to request
 */

import { Request, Response, NextFunction } from "express";
import { ApiKey } from "../models/ApiKey";

/**
 * API Key authentication middleware
 * Extracts x-api-key header, validates key, updates lastUsedAt, attaches projectId
 */
export async function apiKeyAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey || typeof apiKey !== "string") {
      res.status(401).json({ error: "Missing or invalid API key" });
      return;
    }

    // Find API key in database
    const keyDoc = await ApiKey.findOne({
      key: apiKey,
      isActive: true,
    });

    if (!keyDoc) {
      res.status(401).json({ error: "Invalid API key" });
      return;
    }

    // Update lastUsedAt (fire and forget - don't await)
    ApiKey.updateOne({ _id: keyDoc._id }, { lastUsedAt: new Date() }).catch(
      () => {
        // Ignore errors on lastUsedAt update
      }
    );

    // Attach projectId to request
    req.projectId = keyDoc.projectId;

    next();
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
}
