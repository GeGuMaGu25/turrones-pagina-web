/*ux*/
// 👇 Pon esto arriba del archivo (debajo de tus utilidades si quieres)
const API_BASE =
  location.hostname === "localhost" || location.hostname === "127.0.0.1"
    ? "http://localhost:4000"
    : "https://turrones-pagina-web-production.up.railway.app";

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/*año dinamico en el pie de pagina*/
(function setYear(){
    const y = new Date().getFullYear();
    const el = $("#year");
    if (el) el.textContent = y;
})();

/*scroll suave*/
(function smoothAnchors(){
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');           // p.ej. "#top", "#contacto"
        if (!id || id === '#') return;
  
        // caso especial: volver arriba
        if (id === '#top') {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
          history.replaceState(null, '', id);
          return;
        }
  
        // resto de secciones
        const target = document.querySelector(id);
        if (target) {
          e.preventDefault();
          // ajusta 70 según tu header
          const offset = 70;
          const y = Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset);
          window.scrollTo({ top: y, behavior: 'smooth' });
          history.replaceState(null, '', id);
        }
      });
    });
  })();
  
  

/*manejo del forms sin backend*/
$("#contactoForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.currentTarget;
  const status = $("#formStatus");

  const payload = {
    nombre: form.name.value.trim(),
    correo: form.email.value.trim(),
    mensaje: form.message.value.trim(),
  };

  if (!payload.nombre || !payload.correo || !payload.mensaje) {
    status.textContent = "Por favor, completa todos los campos.";
    return;
  }

  status.textContent = "Enviando...";

  try {
    const resp = await fetch(`${API_BASE}/api/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();
    if (!resp.ok || !data.ok) {
      throw new Error(data.error || "No se pudo enviar el mensaje");
    }

    status.textContent = "";
    form.reset();
    showSuccessToast("✅ ¡Tu mensaje fue enviado con éxito!");
  } catch (err) {
    console.error(err);
    status.textContent = "Hubo un error al enviar el mensaje. Intenta más tarde";
  }
});
  


/* ====== Carrito + WhatsApp (handler único) ====== */

// estado del carrito (sku -> qty)
const cartMap = new Map();

//info de producto: sku -> { name, price }
const PRODUCTS_INFO = {
  calderon: {
    name: "Turrón Tradicional Calderón 900gr",
    price: 23.0,
  },
  joel: {
    name: "Turrón Tradicional Joel 900gr",
    price: 23.0,
  },
  galleta: {
    name: "Galleta de Agua Chinchana",
    price: 6.0,
  },
  calderon2: {
    name: "Turrón Tradicional Calderón 500gr",
    price: 13.0,
  },
  minicalderon: {
    name: "Turrón Tradicional Calderón 70gr",
    price: 3.0,
  },
  calderonajonjoli: {
    name: "Turrón de Ajonjolí Calderón 450gr",
    price: 13.0,
  },
  minicalderonajonjoli: {
    name: "Turrón de Ajonjolí Calderón 70gr",
    price: 3.0,
  },
};

// contador visual que ya tenías
const cart = {
  count: 0,
  add(n = 1){ this.count += n; updateCartCount(); }
};
function updateCartCount(){
  const el = document.querySelector("#cartCount");
  if (el) el.textContent = String(cart.count);
}

// Delegación de eventos: un solo listener para todos los "Añadir"

//panel del carrito (overlay)
const cartOverlay = $("#cartOverlay");
const cartItemsList = $("#cartItems");
const cartTotalEl = $("#cartTotal");
const cartEmptyEl = $("#cartEmpty");
const cartCheckoutBtn = $("#cartCheckout");
const cartCloseBtn = $("#cartClose");

function formatMoney(value) {
  return `S/ ${value.toFixed(2)}`;
}

function renderCart() {
  if (!cartItemsList || !cartTotalEl || !cartEmptyEl) return;

  cartItemsList.innerHTML = "";

  if (cartMap.size === 0) {
    cartEmptyEl.style.display = "block";
    cartTotalEl.textContent = formatMoney(0);
    return;
  }

  cartEmptyEl.style.display = "none";

  let total = 0;

  for (const [sku, qty] of cartMap.entries()) {
    const info = PRODUCTS_INFO[sku] || { name: item.name || sku, price: item.price || 0 };
    const lineTotal = info.price * item.qty;
    total += lineTotal;

    const li = document.createElement("li");
    li.className = "cart-item";
    li.innerHTML = `
      <div class="cart-item__info">
        <span class="cart-item__name">${info.name}</span>
        <span class="cart-item__price">${formatMoney(info.price)} x ${item.qty}</span>
      </div>
      <div class="cart-item__total">${formatMoney(lineTotal)}</div>
    `;
    cartItemsList.appendChild(li);
  }

  cartTotalEl.textContent = formatMoney(total);
}

function openCart() {
  if (!cartOverlay) return;
  renderCart();
  cartOverlay.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeCart() {
  if (!cartOverlay) return;
  cartOverlay.hidden = true;
  document.body.style.overflow = "";
}

//abrir - cerrar carrito
$("#cartBtn").addEventListener("click", (e) => {
  e.preventDefault();
  openCart();
});

cartCloseBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  closeCart();
});

//cerrar carrito al hacer clic fuera del panel
cartOverlay?.addEventListener("click", (e) => {
  if (e.target === cartOverlay) closeCart();
});

//checkout desde el panel
cartCheckoutBtn?.addEventListener("click", async () => {
  if (cartMap.size === 0) {
    alert("Tu carrito está vacío");
    return;
  }

  const items = [];
  for (const [id, item] of cartMap.entries()) items.push({ id, qty: item.qty});

  try {
    const resp = await fetch(`${API_BASE}/api/orders/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items,
        customer: {
          name: document.querySelector("#name")?.value || "",
          phone: document.querySelector("#phone")?.value || "",
        },
      }),
    });

    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || "Error en checkout");

    //vaciar carrito
    cartMap.clear();
    cart.count = 0;
    updateCartCount();
    renderCart();

    //redirigir a wsp
    window.location.href = data.whatsappUrl;
  } catch (err) {
    console.error(err);
    alert(err.message || "No se pudo completar el pedido");
  }
})



/* ====== Mini Toast de confirmación ====== */
function showToast(message) {
    // Crear el contenedor si no existe
    let toast = document.querySelector("#toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "toast";
      toast.style.position = "fixed";
      toast.style.bottom = "30px";
      toast.style.left = "50%";
      toast.style.transform = "translateX(-50%)";
      toast.style.background = "#222";
      toast.style.color = "#fff";
      toast.style.padding = "10px 18px";
      toast.style.borderRadius = "8px";
      toast.style.boxShadow = "0 4px 8px rgba(0,0,0,0.25)";
      toast.style.fontSize = "0.95rem";
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.3s ease, bottom 0.3s ease";
      toast.style.zIndex = "9999";
      document.body.appendChild(toast);
    }
  
    // Cambiar texto y animar
    toast.textContent = message;
    toast.style.opacity = "1";
    toast.style.bottom = "50px";
  
    // Desaparece tras 2.5 segundos
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.bottom = "30px";
    }, 2500);
  }
  
// === CARRITO + TOAST UNIFICADO (con nombre y precio) ===
document.querySelector("#productos")?.addEventListener("click", (e) => {
  const btn = e.target.closest(".btn.small[data-sku]");
  if (!btn) return; // no es el botón de añadir

  const sku = btn.dataset.sku?.trim();
  if (!sku) return;

  const name =
    btn.closest(".card")?.querySelector("h3")?.textContent?.trim() ||
    "Producto";

  const price = parseFloat(btn.dataset.price || "0"); // viene de data-price

  const current = cartMap.get(sku) || { qty: 0, name, price };
  current.qty += 1;
  cartMap.set(sku, current);

  cart.add(1);

  showToast(`🛒 ${name} añadido al carrito`);
});


  
// ==== Mensaje flotante de éxito (toast) ====
function showSuccessToast(msg) {
    let toast = document.querySelector("#successToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "successToast";
      toast.style.position = "fixed";
      toast.style.bottom = "30px";
      toast.style.left = "50%";
      toast.style.transform = "translateX(-50%)";
      toast.style.background = "#28a745";
      toast.style.color = "#fff";
      toast.style.padding = "12px 24px";
      toast.style.borderRadius = "8px";
      toast.style.boxShadow = "0 4px 8px rgba(0,0,0,0.25)";
      toast.style.fontSize = "1rem";
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.3s ease, bottom 0.3s ease";
      toast.style.zIndex = "9999";
      document.body.appendChild(toast);
    }
  
    toast.textContent = msg;
    toast.style.opacity = "1";
    toast.style.bottom = "50px";
  
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.bottom = "30px";
    }, 3000);
  }
  
