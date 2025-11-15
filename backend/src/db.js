// backend/src/db.js
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

// 1) Ruta base por defecto (carpeta ./data dentro del proyecto)
const DEFAULT_DIR = path.resolve(process.cwd(), "data");

// 2) Ruta final de la base de datos (puede venir de ENV)
const DB_PATH = process.env.SQLITE_PATH || path.join(DEFAULT_DIR, "turrones.sqlite");

// 3) Asegurar que exista la carpeta donde va la DB (tanto si es ./data como /data, etc.)
const DB_DIR = path.dirname(DB_PATH);
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// 4) Crear/abrir la base de datos
export const db = new Database(DB_PATH);
console.log("📦 Usando DB en:", DB_PATH);


// Ajustes recomendados para producción
db.pragma("journal_mode = WAL");      // mejor concurrencia
db.pragma("busy_timeout = 5000");     // reintenta si hay lock
db.pragma("foreign_keys = ON");

// ---------- Migraciones mínimas ----------
db.exec(`
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PEN',
  stock INTEGER NOT NULL DEFAULT 0,
  reserved INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_name TEXT,
  customer_phone TEXT,
  items_json TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending|confirmed|cancelled
  created_at TEXT NOT NULL
);
`);

// ---------- Seed inicial si no hay productos ----------
const count = db.prepare(`SELECT COUNT(*) as n FROM products`).get().n;
if (count === 0) {
  // Nota: mantenemos el seed en src/data/seed.json
  const seedPath = path.resolve(process.cwd(), "src/data/seed.json");
  if (fs.existsSync(seedPath)) {
    const items = JSON.parse(fs.readFileSync(seedPath, "utf8"));
    const ins = db.prepare(`
        INSERT INTO products (id, sku, name, price_cents, currency, stock, reserved)
        VALUES (@id, @sku, @name, @price_cents, @currency, @stock, 0)
        ON CONFLICT(sku) DO UPDATE SET
          name = excluded.name,
          price_cents = excluded.price_cents,
          currency = excluded.currency,
          stock = excluded.stock
      `);      
    const trx = db.transaction(rows => rows.forEach(r => ins.run(r)));
    trx(items);
    console.log(`Seed: ${items.length} productos creados.`);
  } else {
    console.warn("⚠️ seed.json no encontrado, sin productos iniciales.");
  }
}

// ---------- Helpers ----------
export function getProducts() {
  const rows = db.prepare(`SELECT * FROM products ORDER BY name`).all();
  return rows.map(r => ({
    ...r,
    available: r.stock - r.reserved
  }));
}

export function getProductById(id) {
  return db.prepare(`SELECT * FROM products WHERE id = ?`).get(id);
}

export function reserveItems(items) {
  const get = db.prepare(`SELECT stock, reserved FROM products WHERE id = ?`);
  const upd = db.prepare(`UPDATE products SET reserved = reserved + ? WHERE id = ?`);
  const trx = db.transaction(() => {
    for (const it of items) {
      const row = get.get(it.id);
      if (!row) throw new Error(`Producto no encontrado: ${it.id}`);
      const available = row.stock - row.reserved;
      if (it.qty > available) throw new Error(`Sin stock para ${it.id} (disp: ${available})`);
    }
    for (const it of items) upd.run(it.qty, it.id);
  });
  trx();
}

export function confirmOrder(items) {
  const get = db.prepare(`SELECT stock, reserved FROM products WHERE id = ?`);
  const upd = db.prepare(`UPDATE products SET stock = stock - ?, reserved = reserved - ? WHERE id = ?`);
  const trx = db.transaction(() => {
    for (const it of items) {
      const row = get.get(it.id);
      if (!row) throw new Error(`Producto no encontrado: ${it.id}`);
      if (it.qty > row.reserved) throw new Error(`Reservado insuficiente para ${it.id}`);
    }
    for (const it of items) upd.run(it.qty, it.qty, it.id);
  });
  trx();
}

export function cancelOrder(items) {
  const get = db.prepare(`SELECT reserved FROM products WHERE id = ?`);
  const upd = db.prepare(`UPDATE products SET reserved = reserved - ? WHERE id = ?`);
  const trx = db.transaction(() => {
    for (const it of items) {
      const row = get.get(it.id);
      if (!row) throw new Error(`Producto no encontrado: ${it.id}`);
      if (it.qty > row.reserved) throw new Error(`Reservado insuficiente para ${it.id}`);
    }
    for (const it of items) upd.run(it.qty, it.id);
  });
  trx();
}
