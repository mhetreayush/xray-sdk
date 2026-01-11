/**
 * ApiKey Model
 */

import mongoose, { Schema, InferSchemaType } from "mongoose";

const ApiKeySchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    projectId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastUsedAt: {
      type: Date,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

ApiKeySchema.index({ createdAt: 1 });

export type ApiKeyDocument = InferSchemaType<typeof ApiKeySchema> &
  mongoose.Document;

export const ApiKey = mongoose.model<ApiKeyDocument>(
  "ApiKey",
  ApiKeySchema,
  "api-keys"
);
