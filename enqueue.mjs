import "dotenv/config";
import { themeListLines } from "./src/themeList.mjs";
import pMap from "p-map";
import { queueClient } from "./src/queueClient.mjs";

await queueClient.create().catch((e) => {
  console.error(e);
});

await pMap(
  themeListLines,
  async (item, i) => {
    const result = await queueClient.sendMessage(item);
    console.log(i, item, result);
  },
  { concurrency: 16 }
);
