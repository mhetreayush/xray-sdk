/**
 * ProjectMember Model
 */

import mongoose, { Schema, InferSchemaType } from "mongoose";

const ProjectMemberSchema = new Schema(
  {
    projectId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Compound unique index: projectId + userId
ProjectMemberSchema.index({ projectId: 1, userId: 1 }, { unique: true });

export type ProjectMemberDocument = InferSchemaType<
  typeof ProjectMemberSchema
> &
  mongoose.Document;

export const ProjectMember = mongoose.model<ProjectMemberDocument>(
  "ProjectMember",
  ProjectMemberSchema,
  "project-members"
);
