'use strict';

/* Podaci o setovima (koristi ih "finder") */
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

/* Obrazac za upit i gumbi "Zanima me…" su u inquiry-form.js (<mozgic-upit>) */
