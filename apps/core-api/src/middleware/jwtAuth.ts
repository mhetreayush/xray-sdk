/**
 * JWT Authentication Middleware
 * Extracts Authorization Bearer token, verifies JWT, attaches userId to request
 */

import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import type { Config } from "../config";

/**
 * JWT authentication middleware factory
 * @param config - Configuration object
 * @returns Middleware function
 */
export function jwtAuth(config: Config) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res
          .status(401)
          .json({ error: "Missing or invalid authorization header" });
        return;
      }

      const token = authHeader.substring(7); // Remove "Bearer " prefix

      try {
        const payload = verifyToken(token, config);
        req.userId = payload.userId;
        next();
      } catch (error) {
        res.status(401).json({ error: "Invalid or expired token" });
      }
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  };
}
