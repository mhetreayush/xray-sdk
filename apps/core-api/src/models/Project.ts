/**
 * Project Model
 */

import mongoose, { Schema, InferSchemaType } from "mongoose";

const ProjectSchema = new Schema(
  {
    projectId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export type ProjectDocument = InferSchemaType<typeof ProjectSchema> &
  mongoose.Document;

export const Project = mongoose.model<ProjectDocument>(
  "Project",
  ProjectSchema
);
