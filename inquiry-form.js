'use strict';

/* ====================================================================
   <mozgic-upit> — obrazac za upit (komponenta)

   Jedan obrazac za sve stranice. Upit se šalje preko Formspreea,
   korisnik ostaje na stranici.

   Upotreba u HTML-u:

     <script defer src="/inquiry-form.js"></script>
     ...
     <mozgic-upit initial-product="citanje">
       <!-- prikazuje se samo ako JavaScript nije dostupan -->
       <p>Upit pošaljite na <a href="mailto:...">...</a></p>
     </mozgic-upit>

   Atributi:
     initial-product  (neobvezno) vrijednost proizvoda koji je unaprijed
                      odabran, npr. "komplet", "citanje", "mape"...

   Gumbi s atributom data-select="<proizvod>" bilo gdje na stranici
   odabiru taj proizvod u obrascu i skroliraju do sekcije #kontakt.
==================================================================== */

(() => {
  /* ------------------------------------------------------------------
     POSTAVKE — mijenjaju se samo ovdje i vrijede na svim stranicama
  ------------------------------------------------------------------ */
  const FORM_ENDPOINT = 'https://formspree.io/f/xbggazne';
  const CONTACT_EMAIL = 'mirela.vlasic@gmail.com';
  const EMAIL_SUBJECT = 'Novi upit s web stranice — Mozgić';

  /* Proizvodi u izborniku: redoslijed ovdje = redoslijed u izborniku.
     option  = tekst u izborniku
     summary = naziv u sažetku i na gumbu izbornika
     price   = cijena u eurima (bez cijene se ne zbraja u sažetak) */
  const PRODUCTS = [
    { value: 'komplet', option: 'Mozgićev komplet', summary: 'Mozgićev komplet', price: 89.9 },
    { value: 'planiranje', option: 'Planiranje učenja', summary: 'Planiranje učenja', price: 29.9 },
    { value: 'citanje', option: 'Aktivno čitanje', summary: 'Aktivno čitanje', price: 29.9 },
    { value: 'mape', option: 'Mentalne mape', summary: 'Mentalne mape', price: 29.9 },
    {
      value: 'kartice',
      option: 'Aktivno prisjećanje',
      summary: 'Aktivno prisjećanje',
      price: 29.9,
    },
    { value: 'pomoc', option: 'Trebam pomoć pri odabiru', summary: 'Pomoć pri odabiru' },
  ];

  const MESSAGES = {
    sending: 'Šaljem upit…',
    success: 'Hvala! Upit je poslan. Javljam vam se uskoro.',
    error: `Nešto nije prošlo kod slanja. Pokušajte ponovno ili pišite na ${CONTACT_EMAIL}.`,
    offline: 'Nema veze sa serverom. Provjerite internet i pokušajte ponovno.',
  };

  const byValue = Object.fromEntries(PRODUCTS.map((p) => [p.value, p]));

  function formatPrice(amount) {
    return amount.toFixed(2).replace('.', ',') + ' €';
  }

  function optionText(product) {
    return product.price ? `${product.option} — ${formatPrice(product.price)}` : product.option;
  }

  function escapeHtml(text) {
    return String(text).replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  }

  /* ------------------------------------------------------------------
     HTML obrasca (klase odgovaraju postojećim stilovima u styles.css)
  ------------------------------------------------------------------ */
  function template() {
    const options = PRODUCTS.map(
      (p) => `
          <label class="ms-option">
            <input type="checkbox" name="proizvod" value="${p.value}" />
            <span>${escapeHtml(optionText(p))}</span>
          </label>`,
    ).join('');

    return `
      <form class="inquiry" action="${FORM_ENDPOINT}" method="POST">
        <h3>Kupi Mozgić</h3>

        <span class="ms-label" id="product-choice-label">
          Što vas zanima? <span>(možete odabrati više)</span>
        </span>
        <div class="multiselect">
          <button
            type="button"
            class="multiselect-toggle"
            id="ms-toggle"
            aria-haspopup="true"
            aria-expanded="false"
            aria-controls="ms-panel"
            aria-labelledby="product-choice-label ms-value"
          >
            <span class="ms-value is-placeholder" id="ms-value">Odaberite proizvode</span>
            <span class="ms-caret" aria-hidden="true">▾</span>
          </button>
          <div
            class="multiselect-panel"
            id="ms-panel"
            role="group"
            aria-labelledby="product-choice-label"
            hidden
          >${options}
          </div>
        </div>

        <label for="full-name">Ime i prezime</label>
        <input type="text" id="full-name" name="ime" autocomplete="name" required />

        <label for="email">E-adresa</label>
        <input type="email" id="email" name="email" autocomplete="email" required />

        <label for="inquiry-message">
          Što biste još željeli pitati? <span>(neobvezno)</span>
        </label>
        <textarea
          id="inquiry-message"
          name="poruka"
          maxlength="2000"
          rows="3"
          placeholder="Ovdje možete dodati svoje pitanje…"
        ></textarea>

        <div class="inquiry-summary">
          <span data-summary-label>Odaberite jedan ili više proizvoda</span>
          <strong data-summary-price>—</strong>
        </div>
        <p class="shipping-note">Trošak dostave potvrđuje se u ponudi.</p>

        <!-- Anti-spam: skriveno od ljudi; ako ga bot ispuni, Formspree odbacuje poruku -->
        <input
          type="text"
          name="_gotcha"
          tabindex="-1"
          autocomplete="off"
          aria-hidden="true"
          style="display: none"
        />
        <!-- Naslov e-maila koji stiže na adresu iz Formspreea -->
        <input type="hidden" name="_subject" value="${escapeHtml(EMAIL_SUBJECT)}" />

        <p class="form-legal-note">
          Slanje upita ne obvezuje vas na kupnju. Pročitajte
          <a href="/pravni-kutak/uvjeti-kupnje/">uvjete kupnje</a> i
          <a href="/pravni-kutak/privatnost/">politiku privatnosti</a>.
        </p>

        <button class="button" type="submit">
          Pošalji upit <svg aria-hidden="true"><use href="#arrow"></use></svg>
        </button>

        <p class="mail-status" role="status" hidden></p>
      </form>`;
  }

  /* ------------------------------------------------------------------
     Komponenta
  ------------------------------------------------------------------ */
  class MozgicUpit extends HTMLElement {
    connectedCallback() {
      if (this.form) return; // već inicijalizirano
      this.innerHTML = template();

      this.form = this.querySelector('form');
      this.toggle = this.querySelector('.multiselect-toggle');
      this.panel = this.querySelector('.multiselect-panel');
      this.valueEl = this.querySelector('.ms-value');
      this.labelEl = this.querySelector('[data-summary-label]');
      this.priceEl = this.querySelector('[data-summary-price]');
      this.shippingEl = this.querySelector('.shipping-note');
      this.statusEl = this.querySelector('.mail-status');
      this.checkboxes = [...this.querySelectorAll('input[name="proizvod"]')];

      this.toggle.addEventListener('click', () => this.openPanel(this.panel.hidden));
      this.checkboxes.forEach((cb) => cb.addEventListener('change', () => this.updateSummary()));

      // Zatvori izbornik klikom izvan njega ili tipkom Escape
      document.addEventListener('click', (event) => {
        if (!this.querySelector('.multiselect').contains(event.target)) this.openPanel(false);
      });
      this.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !this.panel.hidden) {
          this.openPanel(false);
          this.toggle.focus();
        }
      });

      this.form.addEventListener('submit', (event) => this.submit(event));

      const initial = this.getAttribute('initial-product');
      if (initial) this.select(initial);
      this.updateSummary();
    }

    openPanel(open) {
      this.panel.hidden = !open;
      this.toggle.setAttribute('aria-expanded', String(open));
    }

    selected() {
      return this.checkboxes.filter((cb) => cb.checked).map((cb) => cb.value);
    }

    /* Javna metoda: označi proizvod (koriste je gumbi data-select) */
    select(value) {
      const cb = this.checkboxes.find((c) => c.value === value);
      if (!cb) return;
      cb.checked = true;
      this.updateSummary();
    }

    updateSummary() {
      const selected = this.selected();
      const names = selected.map((v) => (byValue[v] ? byValue[v].summary : v));

      this.valueEl.textContent = names.length ? names.join(', ') : 'Odaberite proizvode';
      this.valueEl.classList.toggle('is-placeholder', !names.length);

      this.labelEl.textContent = names.length
        ? names.join(' + ')
        : 'Odaberite jedan ili više proizvoda';

      const total = selected.reduce((sum, v) => sum + ((byValue[v] && byValue[v].price) || 0), 0);
      this.priceEl.textContent = total > 0 ? formatPrice(total) : '—';

      // Napomenu o dostavi sakrij ako je odabrana samo "pomoć pri odabiru"
      this.shippingEl.hidden = selected.length > 0 && selected.every((v) => v === 'pomoc');
    }

    setStatus(text) {
      this.statusEl.hidden = false;
      this.statusEl.textContent = text;
    }

    async submit(event) {
      event.preventDefault();

      const button = this.form.querySelector('button[type="submit"]');
      button.disabled = true;
      this.setStatus(MESSAGES.sending);

      try {
        const response = await fetch(this.form.action, {
          method: 'POST',
          body: new FormData(this.form),
          headers: { Accept: 'application/json' },
        });
        if (response.ok) {
          this.form.reset();
          this.updateSummary();
          this.setStatus(MESSAGES.success);
        } else {
          this.setStatus(MESSAGES.error);
        }
      } catch {
        this.setStatus(MESSAGES.offline);
      } finally {
        button.disabled = false;
      }
    }
  }

  customElements.define('mozgic-upit', MozgicUpit);

  /* ------------------------------------------------------------------
     Gumbi "Zanima me ovaj set / komplet": odaberi proizvod u obrascu
     i skroliraj do sekcije #kontakt
  ------------------------------------------------------------------ */
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-select]');
    if (!button) return;

    const form = document.querySelector('mozgic-upit');
    if (form) form.select(button.dataset.select);

    const target = document.querySelector('#kontakt') || form;
    if (!target) return;
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  });
})();
