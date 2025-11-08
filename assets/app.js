/*ux*/
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
$("#contactoForm")?.addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const status = $("#formStatus");
    const data = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      message: form.message.value.trim(),
    };
  
    if (!data.name || !data.email || !data.message) {
      status.textContent = "Por favor, completa todos los campos.";
      return;
    }
  
    status.textContent = "Enviando...";
    setTimeout(() => {
      status.textContent = "";
      form.reset();
      showSuccessToast("✅ ¡Tu mensaje fue enviado con éxito!");
    }, 800);
  });
  


/* ====== Carrito + WhatsApp (handler único) ====== */

// estado del carrito (sku -> qty)
const cartMap = new Map();

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


// Botón para finalizar por WhatsApp (si no existe, lo creamos)
let payBtn = document.querySelector('#payBtn');
if (!payBtn) {
  payBtn = document.createElement('button');
  payBtn.id = 'payBtn';
  payBtn.className = 'btn primary';
  payBtn.textContent = 'Finalizar por WhatsApp';
  document.querySelector('#productos .section-head')?.appendChild(payBtn);
}

payBtn.addEventListener('click', async () => {
  if (cartMap.size === 0) return alert('Tu carrito está vacío');

  // arma items para el backend
  const items = [];
  for (const [id, qty] of cartMap.entries()) items.push({ id, qty });

  try {
    const resp = await fetch('http://localhost:4000/api/orders/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items,
        customer: {
          name: document.querySelector('#name')?.value || '',
          phone: document.querySelector('#phone')?.value || ''
        }
      })
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Error en checkout');
    window.location.href = data.whatsappUrl; // redirige a WhatsApp
  } catch (err) {
    console.error(err);
    alert(err.message);
  }
});

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
  
// === CARRITO + TOAST UNIFICADO ===
document.querySelector("#productos")?.addEventListener("click", (e) => {
    const btn = e.target.closest('.btn.small[data-sku]');
    if (!btn) return; // no es el botón de añadir
  
    const sku = btn.dataset.sku?.trim();
    if (!sku) return;
  
    // suma 1 del producto
    cartMap.set(sku, (cartMap.get(sku) || 0) + 1);
    cart.add(1); // ✅ solo una vez
  
    // mostrar mensaje con nombre del producto
    const cardTitle = btn.closest(".card")?.querySelector("h3")?.textContent?.trim();
    showToast(`🛒 ${cardTitle || "Producto"} añadido al carrito`);
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
  
