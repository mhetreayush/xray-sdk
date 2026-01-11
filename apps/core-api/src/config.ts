/**
 * Configuration - Environment variables and defaults
 */

export interface Config {
  port: number;
  mongodbUri: string;
  kafkaBrokers: string[];
  kafkaTopic: string;
  awsRegion: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  s3Bucket: string;
  jwtSecret: string;
  jwtExpiry: string;
}

/**
 * Load and validate configuration from environment variables
 */
export function loadConfig(): Config {
  const required = [
    "MONGODB_URI",
    "KAFKA_BROKERS",
    "KAFKA_TOPIC",
    "AWS_REGION",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "S3_BUCKET",
    "JWT_SECRET",
  ];

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  return {
    port: parseInt(process.env.PORT || "3000", 10),
    mongodbUri: process.env.MONGODB_URI!,
    kafkaBrokers: process.env.KAFKA_BROKERS!.split(",").map((b) => b.trim()),
    kafkaTopic: process.env.KAFKA_TOPIC!,
    awsRegion: process.env.AWS_REGION!,
    awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    s3Bucket: process.env.S3_BUCKET!,
    jwtSecret: process.env.JWT_SECRET!,
    jwtExpiry: process.env.JWT_EXPIRY || "7d",
  };
}
