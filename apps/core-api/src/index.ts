/**
 * Main Entry Point - Load config, start server, start Kafka consumer
 */

import "dotenv/config";
import { loadConfig } from "./config";
import { createApp } from "./app";
import { KafkaConsumer } from "./consumer";

/**
 * Main function
 */
async function main(): Promise<void> {
  try {
    // Load configuration
    const config = loadConfig();
    console.log("Configuration loaded");

    // Create Express app
    const app = await createApp(config);
    console.log("Express app created");

    // Start HTTP server
    const server = app.listen(config.port, () => {
      console.log(`Server listening on port ${config.port}`);
    });

    // Create and start Kafka consumer
    const consumer = new KafkaConsumer(config);
    await consumer.connect();
    console.log("Kafka consumer connected");
    await consumer.start();
    console.log("Kafka consumer started");

    // Graceful shutdown
    const shutdown = async (): Promise<void> => {
      console.log("Shutting down...");
      server.close(async () => {
        console.log("HTTP server closed");
        await consumer.stop();
        await consumer.disconnect();
        console.log("Kafka consumer stopped");
        process.exit(0);
      });
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Start the application
main();
