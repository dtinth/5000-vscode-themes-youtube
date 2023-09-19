import "dotenv/config";
import { queueClient } from "./src/queueClient.mjs";

await queueClient.clearMessages();
