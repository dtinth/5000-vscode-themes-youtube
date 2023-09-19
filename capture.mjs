import "dotenv/config";

import { chromium } from "playwright";
import * as Minio from "minio";
import { mkdirSync, writeFileSync } from "fs";
import yargs from "yargs";
import { queueClient } from "./src/queueClient.mjs";
import { themeListLines } from "./src/themeList.mjs";
import { dirname } from "path";

const minioClient = new Minio.Client({
  endPoint: "ap-south-1.linodeobjects.com",
  useSSL: true,
  accessKey: process.env.LINODE_STORAGE_ACCESS_KEY_ID,
  secretKey: process.env.LINODE_STORAGE_SECRET_ACCESS_KEY,
});
const bucketName = process.env.LINODE_STORAGE_BUCKET;

const browser = await chromium.launch({
  headless: process.env.HEADLESS === "1",
  args: ["--font-render-hinting=none"],
});
const context = await browser.newContext({
  viewport: {
    width: 1440,
    height: 810,
  },
  deviceScaleFactor: 3840 / 1440,
});

function normalizeWhitespaces(str) {
  return str.replace(/\s+/gu, " ").trim();
}

function log(message, ...args) {
  console.log(message, ...args);
}

class ExtensionNotInstallableError extends Error {
  constructor() {
    super("Extension validation failed");
  }
}
class ExtensionNotFoundError extends Error {
  constructor() {
    super("Extension not found");
  }
}

async function capture(extensionId, themeName) {
  const page = await context.newPage();
  try {
    log("Navigating...");
    const url = `https://vscode.dev/theme/${extensionId}/${encodeURIComponent(
      themeName
    )}`;
    await page.goto(url, { waitUntil: "networkidle" });
    log("Navigation is done.");

    const codePromise = (async () => {
      for (let i = 1; i < 30; i++) {
        const text = normalizeWhitespaces(await page.innerText("body"));
        if (text.includes("export class Store") && text.includes("test-data")) {
          log("Code loaded");
          return;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      throw new Error("Code not found");
    })();

    const welcomePromise = (async () => {
      for (let i = 1; i < 30; i++) {
        const text = normalizeWhitespaces(await page.innerText("body"));
        if (text.includes("Welcome! Here")) {
          log("Welcome message is visible");
          return;
        }
        if (text.includes("Unable to find extension")) {
          throw new ExtensionNotFoundError();
        }
        if (text.includes("web extension and can not be installed")) {
          throw new ExtensionNotInstallableError();
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      throw new Error("Welcome message not found");
    })();
    const iconPromise = (async () => {
      for (let i = 1; i < 30; i++) {
        const locator = page
          .getByRole("tab", { name: "readme.md" })
          .locator(".monaco-icon-label")
          .first();
        const bbox = await locator.boundingBox();
        if (bbox.width > 80) {
          log("Icons are loaded");
          return;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      throw new Error("Icon not found");
    })();
    const outlinePromise = (async () => {
      for (let i = 1; i < 30; i++) {
        const locator = page
          .locator(".monaco-breadcrumbs")
          .locator(".outline-element:has-text('#')")
          .first();
        if (await locator.isVisible()) {
          log("Outline is loaded");
          return;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      throw new Error("Outline not found");
    })();

    await Promise.all([
      codePromise,
      welcomePromise,
      iconPromise,
      outlinePromise,
    ]);

    const closeBanner = page
      .getByRole("button", { name: "Close Banner" })
      .first();
    if (await closeBanner.isVisible()) {
      await closeBanner.click();
    }

    await page.locator(".action-item .codicon-extensions-view-icon").hover();

    const waitForExtensionsActivated = async () => {
      let successCount = 0;
      console.log("Waiting for extensions to activate...");
      for (let i = 1; i < 30; i++) {
        const text = normalizeWhitespaces(await page.innerText("body"));
        if (text.includes("Activating Extensions")) {
          successCount = 0;
        } else {
          successCount++;
          if (successCount >= 3) {
            log("Extensions activated");
            return;
          }
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      throw new Error("Extensions not activated yet.");
    };

    await waitForExtensionsActivated();
    // await page.getByRole("button", { name: "Install" }).first().focus();
    await page
      .locator('[id="status.host"] .statusbar-item-label')
      .evaluate((node) => {
        for (const child of node.childNodes) {
          // If text node and not empty
          if (child.nodeType === 3 && child.textContent.trim()) {
            child.textContent = "YouTube: dtinth";
          }
        }
      });

    const installButton = page.getByRole("button", { name: "Install" }).first();
    if (await installButton.isVisible()) {
      await installButton.evaluate((node) => {
        node.textContent = "Subscribe";
      });
    }

    if (process.env.CAPTURE_DEBUG === "1") {
      await new Promise((r) => setTimeout(r, 1000000)); // debug
    }

    const ss = await page.screenshot();
    await page
      .locator(".right-items")
      .getByRole("button", { name: "Notifications" })
      .first()
      .click();
    await page
      .locator(".notifications-center")
      .getByRole("button", { name: "Cancel" })
      .first()
      .click();
    return ss;
  } finally {
    await page.close();
  }
}

function makeUrlSafe(text) {
  return encodeURIComponent(text).replace(/%/g, "_");
}

async function work(
  extensionId,
  themeName,
  { upload = false, save = false } = {}
) {
  const objectName = `extensions/${extensionId}/${makeUrlSafe(
    themeName
  )}.screenshot.png`;
  if (upload) {
    // const stat = await minioClient
    //   .statObject(bucketName, objectName)
    //   .catch((e) => null);
    // if (stat) {
    //   log("Already uploaded", objectName);
    //   return false;
    // }
  }
  const buffer = await capture(extensionId, themeName);
  if (upload) {
    await minioClient.putObject(bucketName, objectName, buffer, {
      "Content-Type": "image/png",
      "x-amz-acl": "public-read",
    });
    log("Uploaded", objectName);
  }
  if (save) {
    const saveTo = `.data/save/${objectName}`;
    mkdirSync(dirname(saveTo), { recursive: true });
    writeFileSync(saveTo, buffer);
    log("Saved to", saveTo);
  }
  return true;
}

async function workOne() {
  // get estimated number of messages
  const queueProperties = await queueClient.getProperties();
  const { approximateMessagesCount } = queueProperties;
  console.log("Approximate messages count:", approximateMessagesCount);

  const message = await queueClient.receiveMessages({
    numberOfMessages: 1,
    visibilityTimeout: 120,
  });
  let worked = false;
  for (const item of message.receivedMessageItems) {
    console.log("====>", item.messageId, item.messageText.split("\t"));
    const line = item.messageText;
    const [extensionId, installs, version, themeName] = line.split("\t");
    try {
      await work(extensionId, themeName, { upload: true });
    } catch (e) {
      if (
        (e instanceof ExtensionNotFoundError ||
          e instanceof ExtensionNotInstallableError) &&
        item.dequeueCount >= 2
      ) {
        console.error("!!!!!!!!!!!!", e.message);
      } else {
        throw e;
      }
    }
    await queueClient.deleteMessage(item.messageId, item.popReceipt);
    worked = true;
  }
  return worked;
}

async function testWork(n) {
  for (const line of themeListLines.slice(4).slice(0, n)) {
    const [extensionId, installs, version, themeName] = line.split("\t");
    await work(extensionId, themeName, { save: true });
  }
}

try {
  await yargs(process.argv.slice(2))
    .demandCommand()
    .strict()
    .help()
    .command("preview", "Preview a single item", {}, async () => {
      const extensionId = "GitHub.github-vscode-theme";
      const themeName = "GitHub Dark";
      const buffer = await capture(extensionId, themeName);
      writeFileSync("preview.png", buffer);
    })
    .command(
      "test",
      "Work on a few items",
      { n: { type: "number", default: 1 } },
      async (args) => {
        await testWork(args.n);
      }
    )
    .command("work-one", "Work on a single item", {}, async () => {
      await workOne();
    })
    .command("work", "Work on all items", {}, async () => {
      while (await workOne()) {}
    })
    .parse();

  // for (const line of lines) {
  //   const [extensionId, installs, version, themeName] = line.split("\t");
  //   await work(extensionId, themeName, {
  //     upload: true,
  //   });
  // }
} finally {
  await browser.close();
}
