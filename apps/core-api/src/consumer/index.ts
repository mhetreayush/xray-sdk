/**
 * Kafka Consumer - Pull events from Kafka and process them
 */

import { Kafka, Consumer } from "kafkajs";
import type { Config } from "../config";
import { processBatch } from "./handlers";

export class KafkaConsumer {
  private consumer: Consumer;
  private topic: string;
  private batchSize: number;
  private delayBetweenBatches: number;

  constructor(config: Config) {
    const kafka = new Kafka({
      clientId: "xray-api-consumer",
      brokers: config.kafkaBrokers,
    });

    this.consumer = kafka.consumer({
      groupId: "xray-consumers",
    });
    this.topic = config.kafkaTopic;
    this.batchSize = 1000; // Config from PRD
    this.delayBetweenBatches = 150; // 100-200ms delay, using middle value
  }

  /**
   * Connect consumer and subscribe to topic
   */
  async connect(): Promise<void> {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: this.topic, fromBeginning: false });
  }

  /**
   * Start consuming messages
   */
  async start(): Promise<void> {
    await this.consumer.run({
      eachBatch: async ({ batch, resolveOffset, heartbeat }) => {
        const messages = batch.messages;

        // Parse messages from JSON
        const events = [];
        for (const message of messages) {
          if (message.value) {
            try {
              const event = JSON.parse(message.value.toString());
              events.push(event);
            } catch (error) {
              // Skip invalid JSON messages
              console.error("Failed to parse message:", error);
              resolveOffset(message.offset);
              continue;
            }
          }
        }

        // Process batch
        if (events.length > 0) {
          try {
            await processBatch(events);
          } catch (error) {
            console.error("Failed to process batch:", error);
            // Continue to next batch (don't block on errors)
          }
        }

        // Resolve all offsets in batch
        for (const message of messages) {
          resolveOffset(message.offset);
        }

        // Heartbeat to keep connection alive
        await heartbeat();

        // Delay between batches (100-200ms)
        await new Promise((resolve) =>
          setTimeout(resolve, this.delayBetweenBatches)
        );
      },
      eachBatchAutoResolve: false, // Manual offset resolution
    });
  }

  /**
   * Disconnect consumer
   */
  async disconnect(): Promise<void> {
    await this.consumer.disconnect();
  }

  /**
   * Stop consuming (graceful shutdown)
   */
  async stop(): Promise<void> {
    await this.consumer.stop();
  }
}
