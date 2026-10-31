'use strict';

/* --------------------------------------------------------------------
   FORMSPREE ENDPOINT
   Zamijenite YOUR_FORM_ID svojim endpointom s formspree.io
   (oblik: https://formspree.io/f/xxxxxxx).
   Postavlja se ovdje na jednom mjestu i vrijedi za obrazac na svim
   stranicama koje učitavaju ovaj app.js.
-------------------------------------------------------------------- */
const FORM_ENDPOINT = 'https://formspree.io/f/xbggazne';

/* Podaci o setovima (koristi ih "finder" i sažetak u obrascu) */
const products = {
  planiranje: {
    url: '/setovi/planiranje-ucenja/',
    name: 'Planiranje učenja',
    icon: 'plan',
    description:
      'Ovaj set može biti početak kada djetetu treba jasniji pregled obveza i struktura učenja.',
    label: 'Planiranje učenja · kartice + vodič',
  },
  citanje: {
    url: '/setovi/aktivno-citanje/',
    name: 'Aktivno čitanje',
    icon: 'book',
    description:
      'Ovaj set usmjerava dijete na promišljanje o pročitanom i prepoznavanje važnih informacija.',
    label: 'Aktivno čitanje · kartice + vodič',
  },
  kartice: {
    url: '/setovi/aktivno-prisjecanje/',
    name: 'Aktivno prisjećanje',
    icon: 'cards',
    description:
      'Ovaj set upoznaje dijete s učenjem prisjećanjem kako bi moglo bolje provjeriti što zna.',
    label: 'Aktivno prisjećanje · kartice + vodič',
  },
  mape: {
    url: '/setovi/mentalne-mape/',
    name: 'Mentalne mape',
    icon: 'map',
    description:
      'Ovaj set može pomoći djetetu u organiziranju pojmova i povezivanju gradiva u smislenu cjelinu.',
    label: 'Mentalne mape · kartice + vodič',
  },
};

/* --------------------------------------------------------------------
   Mobilni izbornik
-------------------------------------------------------------------- */
const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');

if (menuToggle && navigation) {
  menuToggle.addEventListener('click', () => {
    const opened = menuToggle.getAttribute('aria-expanded') !== 'true';
    menuToggle.setAttribute('aria-expanded', String(opened));
    menuToggle.setAttribute(
      'aria-label',
      opened ? 'Zatvori izbornik' : 'Otvori izbornik',
    );
    navigation.classList.toggle('open', opened);
  });

  navigation.querySelectorAll('a').forEach((link) =>
    link.addEventListener('click', () => {
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Otvori izbornik');
      navigation.classList.remove('open');
    }),
  );

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      navigation.classList.remove('open');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Otvori izbornik');
    }
  });
}

/* --------------------------------------------------------------------
   "Odakle krenuti?" (finder)
-------------------------------------------------------------------- */
document.querySelectorAll('[data-need]').forEach((button) =>
  button.addEventListener('click', () => {
    const item = products[button.dataset.need];
    if (!item) return;

    document.querySelectorAll('[data-need]').forEach((other) => {
      other.classList.toggle('selected', other === button);
      other.setAttribute('aria-pressed', String(other === button));
    });

    const name = document.querySelector('#finder-name');
    const description = document.querySelector('#finder-description');
    const icon = document.querySelector('#finder-icon use');
    const cta = document.querySelector('#finder-cta');
    if (name) name.textContent = item.name;
    if (description) description.textContent = item.description;
    if (icon) icon.setAttribute('href', '#' + item.icon);
    if (cta) cta.href = item.url;
  }),
);

/* --------------------------------------------------------------------
   Dijalozi (privatnost, fotografije)
-------------------------------------------------------------------- */
document.querySelectorAll('dialog').forEach((dialog) => {
  const closeButton = dialog.querySelector('.close-dialog');
  if (closeButton) closeButton.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () =>
    document.body.classList.remove('modal-open'),
  );
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (
        event.clientX < r.left ||
        event.clientX > r.right ||
        event.clientY < r.top ||
        event.clientY > r.bottom
      )
        dialog.close();
    }
  });
});

const privacyOpen = document.querySelector('#privacy-open');
if (privacyOpen)
  privacyOpen.addEventListener('click', () => {
    document.querySelector('#privacy-dialog').showModal();
    document.body.classList.add('modal-open');
  });

/* --------------------------------------------------------------------
   Obrazac za upit (sažetak + slanje preko Formspreea)
-------------------------------------------------------------------- */
const msContainer = document.querySelector('#product-choice');
const form = document.querySelector('#inquiry-form');

/* Cijene i nazivi za sažetak (višestruki odabir) */
const PRICES = {
  komplet: 89.9,
  planiranje: 29.9,
  citanje: 29.9,
  mape: 29.9,
  kartice: 29.9,
};
const NAMES = {
  komplet: 'Mozgićev komplet',
  planiranje: 'Planiranje učenja',
  citanje: 'Aktivno čitanje',
  mape: 'Mentalne mape',
  kartice: 'Aktivno prisjećanje',
  pomoc: 'Pomoć pri odabiru',
};

function formatPrice(n) {
  return n.toFixed(2).replace('.', ',') + ' €';
}

function getCheckboxes() {
  return msContainer
    ? [...msContainer.querySelectorAll('input[name="proizvod"]')]
    : [];
}

function selectedValues() {
  return getCheckboxes()
    .filter((cb) => cb.checked)
    .map((cb) => cb.value);
}

function updateSummary() {
  if (!msContainer) return;
  const label = document.querySelector('#summary-label');
  const price = document.querySelector('#summary-price');
  const shipping = document.querySelector('.shipping-note');
  const valueEl = document.querySelector('#ms-value');

  const selected = selectedValues();

  // Tekst na gumbu dropdowna
  if (valueEl) {
    if (selected.length) {
      valueEl.textContent = selected.map((v) => NAMES[v] || v).join(', ');
      valueEl.classList.remove('is-placeholder');
    } else {
      valueEl.textContent = 'Odaberite proizvode';
      valueEl.classList.add('is-placeholder');
    }
  }

  if (label) {
    label.textContent = selected.length
      ? selected.map((v) => NAMES[v] || v).join(' + ')
      : 'Odaberite jedan ili više proizvoda';
  }

  const total = selected.reduce((sum, v) => sum + (PRICES[v] || 0), 0);
  if (price) price.textContent = total > 0 ? formatPrice(total) : '—';

  // Napomenu o dostavi sakrij ako je odabrana samo "pomoć pri odabiru"
  const onlyHelp = selected.length > 0 && selected.every((v) => v === 'pomoc');
  if (shipping) shipping.hidden = onlyHelp;
}

/* Otvaranje/zatvaranje dropdowna + osvježavanje sažetka */
if (msContainer) {
  const toggle = msContainer.querySelector('#ms-toggle');
  const panel = msContainer.querySelector('#ms-panel');

  function openPanel(open) {
    panel.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  }

  toggle.addEventListener('click', () => openPanel(panel.hidden));

  getCheckboxes().forEach((cb) => cb.addEventListener('change', updateSummary));

  // Zatvori klikom izvan izbornika
  document.addEventListener('click', (event) => {
    if (!msContainer.contains(event.target)) openPanel(false);
  });

  // Zatvori tipkom Escape
  msContainer.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      openPanel(false);
      toggle.focus();
    }
  });

  updateSummary();
}

function selectOption(value) {
  const cb = getCheckboxes().find((c) => c.value === value);
  if (cb) cb.checked = true;
}

if (msContainer && document.body.dataset.initialProduct) {
  selectOption(document.body.dataset.initialProduct);
  updateSummary();
}

/* Gumbi drugdje na stranici koji predodaberu set i skroliraju do obrasca */
document.querySelectorAll('[data-select]').forEach((button) =>
  button.addEventListener('click', () => {
    if (!msContainer) return;
    selectOption(button.dataset.select);
    updateSummary();
    const kontakt = document.querySelector('#kontakt');
    if (kontakt)
      kontakt.scrollIntoView({
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      });
  }),
);

/* Slanje obrasca: šalje upit Formspreeu, korisnik ostaje na stranici */
if (form) {
  form.setAttribute('action', FORM_ENDPOINT);
  form.setAttribute('method', 'POST');
  const statusEl = document.querySelector('#form-status');

  function setStatus(text) {
    if (!statusEl) return;
    statusEl.hidden = false;
    statusEl.textContent = text;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setStatus('Šaljem upit…');
    try {
      const response = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });
      if (response.ok) {
        form.reset();
        updateSummary();
        setStatus('Hvala! Upit je poslan. Javljam vam se uskoro.');
      } else {
        setStatus(
          'Nešto nije prošlo kod slanja. Pokušajte ponovno ili pišite na mirela.vlasic@gmail.com.',
        );
      }
    } catch {
      setStatus(
        'Nema veze sa serverom. Provjerite internet i pokušajte ponovno.',
      );
    }
  });
}