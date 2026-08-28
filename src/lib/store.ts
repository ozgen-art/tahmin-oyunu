import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DbShape } from "./types";

/**
 * Basit, bağımlılıksız (native modül gerektirmeyen) JSON dosya tabanlı
 * kalıcı depo. Küçük ölçekli bir tahmin yarışması için yeterlidir.
 *
 * İleride gerçek bir veritabanına (Postgres/Supabase vb.) geçmek için
 * sadece bu dosyadaki `readDb`/`writeDb` fonksiyonlarının implementasyonunu
 * değiştirmek yeterli — geri kalan kod (`lib/db.ts`) bu iki fonksiyona bağımlı.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

function emptyDb(): DbShape {
  return {
    matches: [],
    resultOptions: [],
    scoreOptions: [],
    scorerOptions: [],
    participants: [],
    predictions: [],
  };
}

let cache: DbShape | null = null;
// Eşzamanlı yazımların birbirini ezmemesi için basit bir kuyruk.
let writeQueue: Promise<unknown> = Promise.resolve();

async function ensureLoaded(): Promise<DbShape> {
  if (cache) return cache;
  try {
    const raw = await readFile(DB_FILE, "utf-8");
    cache = JSON.parse(raw) as DbShape;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      cache = emptyDb();
    } else {
      throw err;
    }
  }
  return cache;
}

export async function readDb(): Promise<DbShape> {
  const db = await ensureLoaded();
  // Çağıranların referansı mutasyona uğratıp writeDb çağırmayı unutmasına karşı
  // yine de derin kopya vermiyoruz (performans); tüm mutasyonlar db.ts
  // içinden ve ardından writeDb ile yapılmalı.
  return db;
}

export async function writeDb(mutate: (db: DbShape) => void): Promise<DbShape> {
  const task = writeQueue.then(async () => {
    const db = await ensureLoaded();
    mutate(db);
    await mkdir(DATA_DIR, { recursive: true });
    const tmpFile = `${DB_FILE}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tmpFile, JSON.stringify(db, null, 2), "utf-8");
    await rename(tmpFile, DB_FILE);
    cache = db;
    return db;
  });
  writeQueue = task.catch(() => {});
  return task;
}

export function resetCacheForTests() {
  cache = null;
}
