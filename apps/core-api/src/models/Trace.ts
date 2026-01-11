/**
 * Trace Model
 */

import mongoose, { Schema, InferSchemaType } from "mongoose";

const TraceSchema = new Schema(
  {
    traceId: {
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
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ["success", "failure", "pending"],
    },
    successMetadata: {
      type: Schema.Types.Mixed,
    },
    failureMetadata: {
      type: Schema.Types.Mixed,
    },
    createdAt: {
      type: Date,
      required: true,
      index: true,
    },
    endedAt: {
      type: Date,
    },
  },
  {
    timestamps: false,
  }
);

// Compound index: projectId + createdAt (for listing traces)
TraceSchema.index({ projectId: 1, createdAt: -1 });

export type TraceDocument = InferSchemaType<typeof TraceSchema> &
  mongoose.Document;

export const Trace = mongoose.model<TraceDocument>(
  "Trace",
  TraceSchema,
  "traces"
);
