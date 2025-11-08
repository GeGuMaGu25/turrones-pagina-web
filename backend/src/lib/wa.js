export function buildWhatsAppUrl(number, message) {
    // number: "51XXXXXXXXX"
    const base = "https://wa.me/";
    const text = encodeURIComponent(message);
    return `${base}${51941960586}?text=${text}`;
  }
  