/**
 * Data Model
 */

import mongoose, { Schema, InferSchemaType } from "mongoose";

const DataSchema = new Schema(
  {
    dataId: {
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
    key: {
      type: String,
      required: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    dataPath: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: false,
  }
);

export type DataDocument = InferSchemaType<typeof DataSchema> &
  mongoose.Document;

export const Data = mongoose.model<DataDocument>("Data", DataSchema, "data");
