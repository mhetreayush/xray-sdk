/**
 * MetadataSchema Model
 */

import mongoose, { Schema as MongooseSchema, InferSchemaType } from "mongoose";

const MetadataSchemaSchema = new MongooseSchema(
  {
    projectId: {
      type: String,
      required: true,
      index: true,
    },
    stepName: {
      type: String,
      required: true,
      index: true,
    },
    schemaHash: {
      type: String,
      required: true,
    },
    schemaShape: {
      type: MongooseSchema.Types.Mixed,
      required: true,
    },
    lastSeenAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Compound unique index: projectId + stepName + schemaHash
MetadataSchemaSchema.index(
  { projectId: 1, stepName: 1, schemaHash: 1 },
  { unique: true }
);

export type MetadataSchemaDocument = InferSchemaType<
  typeof MetadataSchemaSchema
> &
  mongoose.Document;

export const MetadataSchema = mongoose.model<MetadataSchemaDocument>(
  "MetadataSchema",
  MetadataSchemaSchema,
  "metadata-schemas"
);
