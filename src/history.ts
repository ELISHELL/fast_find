import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { APP_CONFIG_DIR } from "./common.js";

const DEFAULT_HISTORY_FILE = path.join(os.homedir(), APP_CONFIG_DIR, "history.json");
const MAX_HISTORY_ITEMS = 20;

export interface HistoryItem {
  path: string;
  time: number | Date;
  keyword: string;
}

function getHistoryFile() {
  return process.env.FAST_FIND_HISTORY_FILE || DEFAULT_HISTORY_FILE;
}

async function ensureDir(filePath: string) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

export async function readHistory() {
  const file = getHistoryFile();
  try {
    const txt = await fs.readFile(file, "utf8");
    const arr = JSON.parse(txt) as HistoryItem[];
    if (Array.isArray(arr))
      return arr;
    return [];
  }
  catch (e) {
    return [];
  }
}

export async function writeHistory(items: HistoryItem[]) {
  const file = getHistoryFile();
  await ensureDir(file);
  await fs.writeFile(file, JSON.stringify(items, null, 2), "utf8");
}

export async function addHistory(entry: Partial<HistoryItem>) {
  // entry: { path: string, keyword: string|null, time: number }
  const items = await readHistory();

  // 去重策略：同 path+keyword 认为同一条，保留最新时间并前置
  const key = (e: Partial<HistoryItem>) => `${e.path}::${e.keyword ?? ""}`;
  const map = new Map();
  for (const it of items) {
    map.set(key(it), it);
  }
  map.set(key(entry), entry);

  const merged = Array.from(map.values())
    .sort((a, b) => b.time - a.time)
    .slice(0, MAX_HISTORY_ITEMS);

  await writeHistory(merged);
  return merged;
}

export async function clearHistory() {
  await writeHistory([]);
}
