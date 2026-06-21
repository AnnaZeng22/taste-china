import 'dotenv/config';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import initSqlJs from 'sql.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(rootDir, '.env.local'), override: false });
const dataDir = path.join(rootDir, 'data');
const dbPath = path.join(dataDir, 'taste-nanjing.sqlite');
const uploadsDir = path.join(dataDir, 'uploads');
const distDir = path.join(rootDir, 'dist');
const port = Number(process.env.PORT || 8787);

const app = express();
app.use(express.json({ limit: '20mb' }));

const normalizeDishName = value =>
  String(value || '')
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, ' ');

let dbPromise;
const getDb = async () => {
  if (!dbPromise) {
    dbPromise = (async () => {
      fs.mkdirSync(dataDir, { recursive: true });
      const SQL = await initSqlJs({
        locateFile: file => path.resolve(rootDir, 'node_modules/sql.js/dist', file),
      });
      const fileBuffer = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : undefined;
      const db = new SQL.Database(fileBuffer);

      db.run(`
        CREATE TABLE IF NOT EXISTS dish_translations (
          id TEXT PRIMARY KEY,
          normalized_original_name TEXT NOT NULL UNIQUE,
          dish_name TEXT NOT NULL,
          original_name TEXT NOT NULL,
          translation TEXT NOT NULL,
          description TEXT NOT NULL,
          ingredients TEXT NOT NULL,
          dietary_flags TEXT NOT NULL,
          cultural_context TEXT,
          uncertainty_score INTEGER NOT NULL DEFAULT 0,
          structured_key TEXT NOT NULL DEFAULT '',
          structured_data TEXT NOT NULL DEFAULT '{}',
          aliases TEXT NOT NULL,
          source TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          hit_count INTEGER NOT NULL DEFAULT 0
        );
      `);
      db.run('CREATE INDEX IF NOT EXISTS idx_dish_translations_structured_key ON dish_translations(structured_key)');
      db.run(`
        CREATE TABLE IF NOT EXISTS catalog_items (
          type TEXT NOT NULL,
          item_id TEXT NOT NULL,
          payload TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (type, item_id)
        );
      `);
      persist(db);
      return db;
    })();
  }
  return dbPromise;
};

const persist = db => {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(dbPath, Buffer.from(db.export()));
};

const rowToRecord = row => ({
  id: row.id,
  normalizedOriginalName: row.normalized_original_name,
  dishName: row.dish_name,
  originalName: row.original_name,
  translation: row.translation,
  description: row.description,
  ingredients: JSON.parse(row.ingredients),
  dietaryFlags: JSON.parse(row.dietary_flags),
  culturalContext: row.cultural_context ?? undefined,
  uncertaintyScore: row.uncertainty_score,
  structuredKey: row.structured_key || undefined,
  structuredData: row.structured_data ? JSON.parse(row.structured_data) : undefined,
  aliases: JSON.parse(row.aliases),
  source: row.source,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  hitCount: row.hit_count,
});

const getImageExtension = mimeType => {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/gif') return 'gif';
  return 'jpg';
};

app.use('/uploads', express.static(uploadsDir));

app.post('/api/deepseek/v1/chat/completions', async (req, res) => {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      res.status(500).json({ error: 'DEEPSEEK_API_KEY is not configured on the server.' });
      return;
    }

    const upstream = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(req.body),
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    res.send(text);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'DeepSeek proxy failed.' });
  }
});

app.post('/api/uploads', async (req, res) => {
  try {
    const dataUrl = String(req.body.dataUrl || '');
    const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,(.+)$/);
    if (!match) {
      res.status(400).json({ error: 'Expected a base64 image data URL.' });
      return;
    }

    fs.mkdirSync(uploadsDir, { recursive: true });
    const mimeType = match[1] === 'image/jpg' ? 'image/jpeg' : match[1];
    const ext = getImageExtension(mimeType);
    const safeBaseName = path
      .basename(String(req.body.fileName || 'upload'), path.extname(String(req.body.fileName || 'upload')))
      .replace(/[^a-z0-9_-]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'upload';
    const fileName = `${Date.now()}-${safeBaseName}.${ext}`;
    fs.writeFileSync(path.join(uploadsDir, fileName), Buffer.from(match[2], 'base64'));

    res.json({ url: `/uploads/${fileName}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Image upload failed.' });
  }
});

app.get('/api/catalog', async (_req, res) => {
  try {
    const db = await getDb();
    const result = db.exec(
      `SELECT type, payload
       FROM catalog_items
       ORDER BY updated_at ASC`,
    );
    const items = result[0]
      ? result[0].values.map(values => ({
          type: values[0],
          item: JSON.parse(values[1]),
        }))
      : [];

    res.json({
      dishes: items.filter(item => item.type === 'dish').map(item => item.item),
      restaurants: items.filter(item => item.type === 'restaurant').map(item => item.item),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Shared catalog API failed.' });
  }
});

app.post('/api/catalog', async (req, res) => {
  try {
    const db = await getDb();
    const type = req.body.type;
    const item = req.body.item;
    if ((type !== 'dish' && type !== 'restaurant') || !item?.id) {
      res.status(400).json({ error: 'Expected catalog type and item.id.' });
      return;
    }

    db.run(
      `INSERT INTO catalog_items (type, item_id, payload, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(type, item_id) DO UPDATE SET
         payload = excluded.payload,
         updated_at = excluded.updated_at`,
      [type, item.id, JSON.stringify(item), new Date().toISOString()],
    );
    persist(db);
    res.json({ item });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Shared catalog API failed.' });
  }
});

app.get('/api/translations', async (req, res) => {
  try {
    const db = await getDb();
    const limit = Math.max(0, Math.min(50, Number(req.query.limit) || 0));

    if (limit) {
      const listResult = db.exec(
        `SELECT * FROM dish_translations
         ORDER BY updated_at DESC
         LIMIT ?`,
        [limit],
      );
      const records = listResult[0]
        ? listResult[0].values.map(values => {
            const row = Object.fromEntries(listResult[0].columns.map((column, index) => [column, values[index]]));
            return rowToRecord(row);
          })
        : [];
      res.json({ records });
      return;
    }

    const normalizedName = normalizeDishName(req.query.name);
    const structuredKey = String(req.query.structuredKey || '');
    if (!normalizedName) {
      res.status(400).json({ error: 'Missing dish name.' });
      return;
    }

    const result = db.exec(
      `SELECT * FROM dish_translations
       WHERE normalized_original_name = ?
          OR (? <> '' AND structured_key = ?)
          OR aliases LIKE ?
       LIMIT 1`,
      [normalizedName, structuredKey, structuredKey, `%"${normalizedName}"%`],
    );

    if (!result[0]?.values.length) {
      res.status(404).json({ record: null });
      return;
    }

    db.run(
      `UPDATE dish_translations
       SET hit_count = hit_count + 1, updated_at = ?
       WHERE normalized_original_name = ?
          OR (? <> '' AND structured_key = ?)`,
      [new Date().toISOString(), normalizedName, structuredKey, structuredKey],
    );
    persist(db);

    const columns = result[0].columns;
    const values = result[0].values[0];
    const row = Object.fromEntries(columns.map((column, index) => [column, values[index]]));
    res.json({ record: { ...rowToRecord(row), source: 'database', hitCount: row.hit_count + 1 } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Local SQLite API failed.' });
  }
});

app.post('/api/translations', async (req, res) => {
  try {
    const db = await getDb();
    const payload = req.body;
    const now = new Date().toISOString();
    const structuredData = payload.structuredData || {};
    const structuredKey = structuredData.structuredKey || '';
    const normalizedOriginalName = structuredData.normalizedText || normalizeDishName(payload.originalName || payload.dishName);
    const aliases = Array.from(
      new Set(
        [
          payload.originalName,
          payload.dishName,
          payload.translation,
          structuredData.displayName,
          structuredData.normalizedText,
        ]
          .filter(Boolean)
          .map(normalizeDishName),
      ),
    );

    const existing = db.exec(
      `SELECT normalized_original_name, created_at, hit_count
       FROM dish_translations
       WHERE normalized_original_name = ?
          OR (? <> '' AND structured_key = ?)
          OR aliases LIKE ?
       LIMIT 1`,
      [normalizedOriginalName, structuredKey, structuredKey, `%"${normalizedOriginalName}"%`],
    );
    const existingRow = existing[0]?.values[0];
    const databaseKey = existingRow?.[0] || normalizedOriginalName;
    const createdAt = existingRow?.[1];
    const hitCount = existingRow?.[2];

    db.run(
      `INSERT INTO dish_translations (
        id, normalized_original_name, dish_name, original_name, translation, description,
        ingredients, dietary_flags, cultural_context, uncertainty_score, structured_key,
        structured_data, aliases, source, created_at, updated_at, hit_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(normalized_original_name) DO UPDATE SET
        dish_name = excluded.dish_name,
        original_name = excluded.original_name,
        translation = excluded.translation,
        description = excluded.description,
        ingredients = excluded.ingredients,
        dietary_flags = excluded.dietary_flags,
        cultural_context = excluded.cultural_context,
        uncertainty_score = excluded.uncertainty_score,
        structured_key = excluded.structured_key,
        structured_data = excluded.structured_data,
        aliases = excluded.aliases,
        source = excluded.source,
        updated_at = excluded.updated_at,
        hit_count = excluded.hit_count`,
      [
        databaseKey,
        databaseKey,
        payload.dishName,
        payload.originalName,
        payload.translation || payload.dishName,
        payload.description,
        JSON.stringify(payload.ingredients || []),
        JSON.stringify(payload.dietaryFlags),
        payload.culturalContext || null,
        payload.uncertaintyScore ?? 0,
        structuredKey,
        JSON.stringify(structuredData),
        JSON.stringify(aliases),
        payload.source || 'user',
        createdAt || now,
        now,
        hitCount || 0,
      ],
    );
    persist(db);

    res.json({
      record: {
        ...payload,
        id: databaseKey,
        normalizedOriginalName: databaseKey,
        structuredKey,
        structuredData,
        translation: payload.translation || payload.dishName,
        aliases,
        source: payload.source || 'user',
        createdAt: createdAt || now,
        updatedAt: now,
        hitCount: hitCount || 0,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Local SQLite API failed.' });
  }
});

if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`Taste China server listening on http://localhost:${port}`);
});
