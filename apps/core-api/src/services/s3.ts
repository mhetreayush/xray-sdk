/**
 * S3 Service - Presigned URL generation for PUT and GET operations
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Config } from "../config";

export class S3Service {
  private client: S3Client;
  private bucket: string;

  constructor(config: Config) {
    this.client = new S3Client({
      region: config.awsRegion,
      credentials: {
        accessKeyId: config.awsAccessKeyId,
        secretAccessKey: config.awsSecretAccessKey,
      },
    });
    this.bucket = config.s3Bucket;
  }

  /**
   * Generate presigned PUT URL for data upload
   * @param key - S3 object key (e.g., "data/{dataId}")
   * @param expiryMinutes - URL expiry in minutes (default: 60)
   * @returns Presigned URL
   */
  async generatePresignedPutUrl(
    key: string,
    expiryMinutes: number = 60
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const url = await getSignedUrl(this.client, command, {
      expiresIn: expiryMinutes * 60,
    });

    return url;
  }

  /**
   * Generate presigned GET URL for data download
   * @param key - S3 object key
   * @param expiryMinutes - URL expiry in minutes (default: 60)
   * @returns Presigned URL
   */
  async generatePresignedGetUrl(
    key: string,
    expiryMinutes: number = 60
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const url = await getSignedUrl(this.client, command, {
      expiresIn: expiryMinutes * 60,
    });

    return url;
  }
}
