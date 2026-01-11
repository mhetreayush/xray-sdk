/**
 * Projects Routes - Project management endpoints
 */

import { Router, Request, Response } from "express";
import { Types } from "mongoose";
import { Project } from "../models/Project";
import { ProjectMember } from "../models/ProjectMember";
import { ApiKey } from "../models/ApiKey";
import { User } from "../models/User";
import { generateApiKey } from "../utils/apiKey";
import { jwtAuth } from "../middleware/jwtAuth";
import { projectMembership } from "../middleware/projectMembership";
import { randomUUID } from "crypto";
import type { Config } from "../config";

/**
 * Create projects router
 */
export function createProjectsRouter(config: Config): Router {
  const router = Router();
  const jwtAuthMiddleware = jwtAuth(config);

  // GET /api/v1/projects
  router.get("/", jwtAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.userId!; // Set by jwtAuth middleware

      // Find all projectMembers for userId
      const members = await ProjectMember.find({
        userId: new Types.ObjectId(userId),
      });

      // Get projectIds
      const projectIds = members.map((m) => m.projectId);

      // Fetch projects by IDs
      const projects = await Project.find({ projectId: { $in: projectIds } });

      res.json({ projects });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/v1/projects
  router.post("/", jwtAuthMiddleware, async (req: Request, res: Response) => {
    try {
      const { name } = req.body;
      const userId = req.userId!; // Set by jwtAuth middleware

      // Generate projectId (string UUID)
      const projectId = randomUUID();

      // Create project document
      const project = new Project({
        projectId,
        name,
      });

      await project.save();

      // Create projectMember (userId, projectId)
      const member = new ProjectMember({
        projectId,
        userId: new Types.ObjectId(userId),
      });

      await member.save();

      res.json({ project });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/v1/projects/:projectId/keys
  router.post(
    "/:projectId/keys",
    jwtAuthMiddleware,
    projectMembership,
    async (req: Request, res: Response) => {
      try {
        const { name } = req.body;
        const projectId = req.params.projectId;

        // Generate API key: xray_sk_{random32chars}
        const key = generateApiKey();

        // Create apiKey document
        const apiKey = new ApiKey({
          key,
          projectId,
          name,
          isActive: true,
          createdAt: new Date(),
        });

        await apiKey.save();

        // Return apiKey (this is the only time full key is shown)
        res.json({
          apiKey: {
            id: apiKey._id.toString(),
            key: apiKey.key,
            name: apiKey.name,
          },
        });
      } catch (error) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // GET /api/v1/projects/:projectId/keys
  router.get(
    "/:projectId/keys",
    jwtAuthMiddleware,
    projectMembership,
    async (req: Request, res: Response) => {
      try {
        const projectId = req.params.projectId;

        // Find all API keys for project (active and inactive)
        const apiKeys = await ApiKey.find({ projectId }).sort({
          createdAt: -1,
        });

        // Return keys (without showing full key)
        res.json({
          apiKeys: apiKeys.map((key) => ({
            id: key._id.toString(),
            name: key.name,
            createdAt: key.createdAt,
            lastUsedAt: key.lastUsedAt,
          })),
        });
      } catch (error) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // DELETE /api/v1/projects/:projectId/keys/:keyId
  router.delete(
    "/:projectId/keys/:keyId",
    jwtAuthMiddleware,
    projectMembership,
    async (req: Request, res: Response) => {
      try {
        const keyId = req.params.keyId;

        // Set apiKey.isActive = false (soft delete)
        await ApiKey.updateOne(
          { _id: new Types.ObjectId(keyId) },
          { isActive: false }
        );

        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  // POST /api/v1/projects/:projectId/members
  router.post(
    "/:projectId/members",
    jwtAuthMiddleware,
    projectMembership,
    async (req: Request, res: Response) => {
      try {
        const { email } = req.body;
        const projectId = req.params.projectId;

        // Find user by email
        const user = await User.findOne({ email });
        if (!user) {
          res.status(404).json({ error: "User not found" });
          return;
        }

        // Check not already a member
        const existingMember = await ProjectMember.findOne({
          projectId,
          userId: user._id,
        });

        if (existingMember) {
          res
            .status(400)
            .json({ error: "User is already a member of this project" });
          return;
        }

        // Create projectMember document
        const member = new ProjectMember({
          projectId,
          userId: user._id,
        });

        await member.save();

        res.json({
          member: {
            id: member._id.toString(),
            userId: user._id.toString(),
            email: user.email,
            name: user.name,
            joinedAt: member.joinedAt,
          },
        });
      } catch (error) {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  return router;
}
