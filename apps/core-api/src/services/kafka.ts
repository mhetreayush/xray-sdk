/**
 * Kafka Service - Producer client for pushing events to Kafka
 */

import { Kafka, Producer } from "kafkajs";
import type { Config } from "../config";

export class KafkaService {
  private producer: Producer;
  private topic: string;

  constructor(config: Config) {
    const kafka = new Kafka({
      clientId: "xray-api",
      brokers: config.kafkaBrokers,
    });

    this.producer = kafka.producer();
    this.topic = config.kafkaTopic;
  }

  /**
   * Connect producer to Kafka brokers
   */
  async connect(): Promise<void> {
    await this.producer.connect();
  }

  /**
   * Disconnect producer
   */
  async disconnect(): Promise<void> {
    await this.producer.disconnect();
  }

  /**
   * Send message to Kafka topic
   * @param message - Message value (will be JSON stringified)
   */
  async sendMessage(message: unknown): Promise<void> {
    await this.producer.send({
      topic: this.topic,
      messages: [
        {
          value: JSON.stringify(message),
        },
      ],
    });
  }

  /**
   * Send batch of messages to Kafka topic
   * @param messages - Array of message values (will be JSON stringified)
   */
  async sendBatch(messages: unknown[]): Promise<void> {
    if (messages.length === 0) {
      return;
    }

    await this.producer.send({
      topic: this.topic,
      messages: messages.map((message) => ({
        value: JSON.stringify(message),
      })),
    });
  }

  /**
   * Get producer instance (for advanced usage)
   */
  getProducer(): Producer {
    return this.producer;
  }
}
