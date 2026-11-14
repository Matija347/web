/* ====================================================================
   Cloudflare Worker: statična stranica + obrazac za upit

   - POST /api/upit  -> provjeri podatke iz obrasca i pošalji ih e-poštom
                        prodavateljici (Cloudflare Email Routing,
                        binding UPIT_EMAIL u wrangler.jsonc)
   - sve ostalo       -> statične datoteke stranice (binding ASSETS)

   Podaci iz obrasca nigdje se ne spremaju: Worker ih samo složi u
   e-poruku i pošalje na potvrđenu adresu.
==================================================================== */

import { EmailMessage } from 'cloudflare:email';

/* Proizvodi koje obrazac smije poslati (vrijednosti iz inquiry-form.js) */
const PRODUCTS = {
  komplet: 'Mozgićev komplet — 89,90 €',
  planiranje: 'Planiranje učenja — 29,90 €',
  citanje: 'Aktivno čitanje — 29,90 €',
  mape: 'Mentalne mape — 29,90 €',
  kartice: 'Aktivno prisjećanje — 29,90 €',
};

const LIMITS = { name: 200, email: 254, message: 2000 };
const SUBJECT = 'Novi upit s web stranice — Mozgić';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/upit') {
      if (request.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
      }
      return handleInquiry(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};

async function handleInquiry(request, env) {
  const wantsJson = (request.headers.get('Accept') || '').includes('application/json');

  // Prihvati samo slanje sa same stranice (osnovna zaštita od zloupotrebe)
  const origin = request.headers.get('Origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return reply(wantsJson, 403, 'Upit nije poslan sa stranice.');
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return reply(wantsJson, 400, 'Neispravan zahtjev.');
  }

  // Skriveno polje: ljudi ga ne vide; ako je popunjeno, šalje bot.
  // Odgovaramo "uspjeh" da bot ne pokušava ponovno, ali ništa ne šaljemo.
  if (String(form.get('_gotcha') || '').trim() !== '') {
    return reply(wantsJson, 200, 'ok');
  }

  const name = clean(form.get('ime'), LIMITS.name);
  const email = clean(form.get('email'), LIMITS.email);
  const message = String(form.get('poruka') || '')
    .replace(/\r\n?/g, '\n')
    .trim()
    .slice(0, LIMITS.message);
  const products = [...new Set(form.getAll('proizvod').map(String))].filter((p) => p in PRODUCTS);

  if (!name) return reply(wantsJson, 400, 'Upišite ime i prezime.');
  if (!isEmail(email)) return reply(wantsJson, 400, 'Upišite ispravnu e-adresu.');
  if (!products.length) return reply(wantsJson, 400, 'Odaberite barem jedan proizvod.');

  const body = [
    'Novi upit s web stranice',
    '',
    `Ime i prezime: ${name}`,
    `E-adresa: ${email}`,
    '',
    'Odabrani proizvodi:',
    ...products.map((p) => `- ${PRODUCTS[p]}`),
    '',
    'Poruka:',
    message || '(bez poruke)',
    '',
    '—',
    'Odgovorom na ovu poruku odgovarate izravno osobi koja je poslala upit.',
  ].join('\n');

  const from = env.FROM_ADDRESS;
  const to = env.TO_ADDRESS;
  if (!from || !to) {
    console.error('FROM_ADDRESS ili TO_ADDRESS nije postavljen u wrangler.jsonc');
    return reply(wantsJson, 500, 'Slanje trenutno nije moguće.');
  }

  try {
    await send(env, from, to, buildMime({ from, to, replyTo: email, subject: SUBJECT, body }));
  } catch (err) {
    // Ako Cloudflare ne prihvati zaglavlje Reply-To, pošalji bez njega
    // (adresa pošiljatelja je i u tekstu poruke).
    console.error('Slanje s Reply-To nije uspjelo, pokušavam bez njega:', err && err.message);
    try {
      await send(env, from, to, buildMime({ from, to, subject: SUBJECT, body }));
    } catch (err2) {
      console.error('Slanje e-pošte nije uspjelo:', err2 && err2.message);
      return reply(wantsJson, 502, 'Slanje nije uspjelo.');
    }
  }

  return reply(wantsJson, 200, 'ok');
}

async function send(env, from, to, raw) {
  await env.UPIT_EMAIL.send(new EmailMessage(from, to, raw));
}

/* Jedan red teksta bez znakova za novi red (sprječava ubacivanje zaglavlja) */
function clean(value, max) {
  return String(value || '')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, max);
}

function isEmail(value) {
  return /^[^\s@<>()",;:]+@[^\s@<>()",;:]+\.[^\s@<>()",;:]{2,}$/.test(value);
}

/* UTF-8 naslov prema RFC 2047 */
function encodeHeader(text) {
  return /^[\x20-\x7e]*$/.test(text) ? text : `=?UTF-8?B?${base64(text)}?=`;
}

function base64(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function buildMime({ from, to, replyTo, subject, body }) {
  const domain = from.split('@')[1] || 'localhost';
  const headers = [
    `From: ${encodeHeader('Mozgić – obrazac za upit')} <${from}>`,
    `To: <${to}>`,
    replyTo ? `Reply-To: <${replyTo}>` : null,
    `Subject: ${encodeHeader(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@${domain}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
  ].filter(Boolean);
  const encodedBody = base64(body).replace(/.{1,76}/g, '$&\r\n');
  return headers.join('\r\n') + '\r\n\r\n' + encodedBody;
}

/* JSON za obrazac (JavaScript), jednostavna HTML stranica bez JavaScripta */
function reply(wantsJson, status, message) {
  if (wantsJson) {
    return Response.json({ ok: status === 200, message }, { status });
  }
  const ok = status === 200;
  const html = `<!doctype html><html lang="hr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${ok ? 'Upit je poslan' : 'Upit nije poslan'} — Mozgić</title>
<link rel="stylesheet" href="/styles.css"></head>
<body><main class="wrap section"><h1>${ok ? 'Hvala Vam na javljanju!' : 'Upit nije poslan.'}</h1>
<p>${ok ? 'Vaš je upit zaprimljen. Ponudu i/ili odgovor na pitanje dobit ćete e-poštom u roku od jednog radnog dana.' : escapeHtml(message) + ' Pokušajte ponovno ili pišite na mirela.vlasic@gmail.com.'}</p>
<p><a class="text-link" href="/">Natrag na početnu</a></p></main></body></html>`;
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

function escapeHtml(text) {
  return String(text).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
}
