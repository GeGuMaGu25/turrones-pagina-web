import { Router } from "express";
import { nanoid } from "nanoid";
import { assert } from "../lib/assert.js";
import { buildWhatsAppUrl } from "../lib/wa.js";
import { db, getProductById, reserveItems, confirmOrder, cancelOrder } from "../db.js";

const router = Router();

// Util: calcular total
function calcSummary(items) {
  let amount = 0;
  let lines = [];
  for (const { id, qty } of items) {
    const p = getProductById(id);
    assert(p, `Producto no encontrado: ${id}`);
    assert(Number.isInteger(qty) && qty > 0, `Cantidad inválida para ${id}`);
    amount += p.price_cents * qty;
    lines.push(`${p.name} x${qty}`);
  }
  const currency = (items.length ? getProductById(items[0].id).currency : "PEN") || "PEN";
  return { amount_cents: amount, currency, text: lines.join(", ") };
}

/**
 * POST /api/orders/checkout
 * body: { items: [{id, qty}], customer: { name?, phone? } }
 * - valida stock disponible
 * - reserva stock
 * - crea order 'pending'
 * - devuelve whatsappUrl para redirigir
 */
router.post("/checkout", (req, res, next) => {
  try {
    const { items = [], customer = {} } = req.body || {};
    assert(Array.isArray(items) && items.length, "Carrito vacío");

    // 1) Valida y calcula total
    const summary = calcSummary(items);

    // 2) Reserva stock
    reserveItems(items);

    // 3) Crea pedido
    const id = "ORD-" + nanoid(8);
    const created_at = new Date().toISOString();
    db.prepare(`
      INSERT INTO orders (id, customer_name, customer_phone, items_json, amount_cents, currency, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(
      id,
      customer.name || null,
      customer.phone || null,
      JSON.stringify(items),
      summary.amount_cents,
      summary.currency,
      created_at
    );

    // 4) Construye el mensaje y la URL de WhatsApp
    const lineTotal = (summary.amount_cents / 100).toFixed(2);
    const message =
      `Hola, quiero finalizar mi pedido *${id}*.\n` +
      `Productos: ${summary.text}\n` +
      `Total: S/ ${lineTotal}\n` +
      `Nombre: ${customer.name || "-"}\n` +
      `Teléfono: ${customer.phone || "-"}\n` +
      `¿Me confirmas disponibilidad y entrega?`;

    const whatsappUrl = buildWhatsAppUrl(process.env.WHATSAPP_NUMBER, message);

    res.json({ ok: true, orderId: id, whatsappUrl });
  } catch (err) { next(err); }
});

/**
 * GET /api/orders/:id
 * - Ver detalle del pedido
 */
router.get("/:id", (req, res, next) => {
  try {
    const row = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(req.params.id);
    assert(row, "Pedido no encontrado", 404);
    res.json({ order: { ...row, items: JSON.parse(row.items_json) } });
  } catch (err) { next(err); }
});

// --- Endpoints ADMIN (usar x-admin-token) ---

function requireAdmin(req) {
  const token = req.header("x-admin-token");
  assert(token && token === process.env.ADMIN_TOKEN, "No autorizado", 401);
}

/**
 * PATCH /api/orders/:id/confirm
 * body: { note? }
 * - mueve reservas a venta efectiva (stock--)
 * - status -> confirmed
 */
router.patch("/:id/confirm", (req, res, next) => {
  try {
    requireAdmin(req);
    const row = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(req.params.id);
    assert(row, "Pedido no encontrado", 404);
    assert(row.status === "pending", "Estado inválido");

    const items = JSON.parse(row.items_json);
    confirmOrder(items);

    db.prepare(`UPDATE orders SET status = 'confirmed' WHERE id = ?`).run(req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

/**
 * PATCH /api/orders/:id/cancel
 * - libera la reserva
 * - status -> cancelled
 */
router.patch("/:id/cancel", (req, res, next) => {
  try {
    requireAdmin(req);
    const row = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(req.params.id);
    assert(row, "Pedido no encontrado", 404);
    assert(row.status === "pending", "Estado inválido");

    const items = JSON.parse(row.items_json);
    cancelOrder(items);

    db.prepare(`UPDATE orders SET status = 'cancelled' WHERE id = ?`).run(req.params.id);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

export default router;
