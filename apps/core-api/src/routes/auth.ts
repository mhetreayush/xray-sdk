/**
 * Auth Routes - POST /api/v1/auth/register, POST /api/v1/auth/login
 */

import { Router, Request, Response } from "express";
import { User } from "../models/User";
import { hashPassword, verifyPassword } from "../utils/hash";
import { generateToken } from "../utils/jwt";
import type { Config } from "../config";

/**
 * Create auth router
 */
export function createAuthRouter(config: Config): Router {
  const router = Router();

  // POST /api/v1/auth/register
  router.post("/register", async (req: Request, res: Response) => {
    try {
      const { email, password, name } = req.body;

      // Check if email already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res.status(400).json({ error: "Email already registered" });
        return;
      }

      // Hash password
      const passwordHash = await hashPassword(password);

      // Create user document
      const user = new User({
        email,
        name,
        password: passwordHash,
      });

      await user.save();

      // Generate JWT
      const token = generateToken({ userId: user._id.toString() }, config);

      // Return user and token
      res.json({
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
        },
        token,
      });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // POST /api/v1/auth/login
  router.post("/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      // Verify password
      const isValid = await verifyPassword(user.password, password);
      if (!isValid) {
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      // Generate JWT
      const token = generateToken({ userId: user._id.toString() }, config);

      // Return user and token
      res.json({
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
        },
        token,
      });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  return router;
}
