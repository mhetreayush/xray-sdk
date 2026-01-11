/**
 * Project Membership Middleware
 * Checks if userId is a member of projectId
 */

import { Request, Response, NextFunction } from "express";
import { ProjectMember } from "../models/ProjectMember";

/**
 * Project membership middleware
 * Assumes req.userId is set by jwtAuth middleware
 * Assumes projectId is in req.params.projectId
 */
export async function projectMembership(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId;
    const projectId = req.params.projectId;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!projectId) {
      res.status(400).json({ error: "Missing projectId" });
      return;
    }

    // Check if user is a member of the project
    const member = await ProjectMember.findOne({
      projectId,
      userId,
    });

    if (!member) {
      res.status(403).json({ error: "Access denied: not a project member" });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
}
