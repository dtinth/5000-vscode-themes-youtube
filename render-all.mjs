import pMap from "p-map";
import { execa } from "execa";
import { appendFileSync, existsSync, mkdirSync } from "fs";
import pRetry from "p-retry";

mkdirSync("out", { recursive: true });
mkdirSync(".data", { recursive: true });

const chunkSize = 4 * 60;
let frames = 173937;
let i = 0;
const chunks = [];
for (let start = 0; start < frames; start += chunkSize) {
  const end = Math.min(frames, start + chunkSize);
  const id = `${++i}`.padStart(3, "0");
  chunks.push({ id, start, end });
}

await pMap(
  chunks,
  async ({ id, start, end }) => {
    const startTime = Date.now();
    const doneFile = `out/part_${id}.done`;
    if (existsSync(doneFile)) {
      console.log(id, "skip", doneFile);
      return;
    }
    try {
      await pRetry(
        () =>
          execa("./render.sh", [start, end, id], {
            stdio: "inherit",
            timeout: 1000 * 60 * 5,
          }),
        { retries: 2 }
      );
      appendFileSync(
        ".data/render.log",
        `[${new Date().toJSON()}] ${id} (dur=${
          Date.now() - startTime
        }ms) - ok\n`
      );
    } catch (e) {
      appendFileSync(
        ".data/render.log",
        `[${new Date().toJSON()}] ${id} (dur=${
          Date.now() - startTime
        }ms) - ERROR ${e.message}\n`
      );
    }
  },
  { concurrency: 5 }
);
