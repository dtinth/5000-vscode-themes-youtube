import { readFileSync } from "fs";

export const themeListLines = readFileSync("theme-list.tsv", "utf8")
  .split("\n")
  .map((x) => x.trim())
  .filter((x) => x);
