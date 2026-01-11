/**
 * Step Model
 */

import mongoose, { Schema, InferSchemaType } from "mongoose";

const StepSchema = new Schema(
  {
    stepId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    traceId: {
      type: String,
      required: true,
      index: true,
    },
    projectId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
    },
    stepName: {
      type: String,
      default: null,
    },
    stepNumber: {
      type: Number,
      default: null,
    },
    artifacts: [
      {
        dataId: String,
        type: {
          type: String,
          enum: ["input", "output", null],
        },
      },
    ],
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: false,
  }
);

export type StepDocument = InferSchemaType<typeof StepSchema> &
  mongoose.Document;

export const Step = mongoose.model<StepDocument>("Step", StepSchema, "steps");
