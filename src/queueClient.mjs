import { QueueClient } from "@azure/storage-queue";

const AZURE_STORAGE_CONNECTION_STRING =
  process.env.AZURE_STORAGE_CONNECTION_STRING;
export const queueClient = new QueueClient(
  AZURE_STORAGE_CONNECTION_STRING,
  "themes-attempt2"
);
