'use strict';

/* ====================================================================
   Carousel (listanje slika / kartica)

   Upotreba u HTML-u:

     <div class="carousel" data-carousel aria-label="Fotografije seta">
       <div class="carousel-track">
         <figure>…</figure>
         <figure>…</figure>
       </div>
     </div>

   Svako dijete elementa .carousel-track je jedan slajd. Listanje radi
   prstom (vodoravno pomicanje sa "snap" efektom), strelicama, točkicama
   i tipkama ← / → kad je carousel u fokusu. Kontrole (strelice, točkice
   i brojač "1 / 3") skripta dodaje sama.
==================================================================== */

(() => {
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  function setupCarousel(root) {
    const track = root.querySelector('.carousel-track');
    if (!track) return;
    const slides = [...track.children];
    if (slides.length < 2) return;

    const label = root.getAttribute('aria-label') || 'Carousel';
    root.setAttribute('role', 'region');
    root.setAttribute('aria-roledescription', 'carousel');
    track.setAttribute('tabindex', '0');

    slides.forEach((slide, i) => {
      slide.classList.add('carousel-slide');
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', 'slajd');
      slide.setAttribute('aria-label', `${i + 1} od ${slides.length}`);
    });

    /* ---- Kontrole ---- */
    const controls = document.createElement('div');
    controls.className = 'carousel-controls';
    controls.innerHTML = `
      <button type="button" class="carousel-arrow" data-dir="-1" aria-label="Prethodno">
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20 12H5m6-6-6 6 6 6"></path></svg>
      </button>
      <div class="carousel-dots"></div>
      <p class="carousel-counter" aria-live="polite"></p>
      <button type="button" class="carousel-arrow" data-dir="1" aria-label="Sljedeće">
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 12h15m-6-6 6 6-6 6"></path></svg>
      </button>`;
    root.appendChild(controls);

    const dotsWrap = controls.querySelector('.carousel-dots');
    const counter = controls.querySelector('.carousel-counter');
    const [prevBtn, nextBtn] = controls.querySelectorAll('.carousel-arrow');

    const dots = slides.map((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel-dot';
      dot.setAttribute('aria-label', `${label}: ${i + 1} od ${slides.length}`);
      dot.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(dot);
      return dot;
    });

    /* ---- Pomoćne funkcije ---- */

    // Koliko slajdova stane u vidljivi dio (npr. 2 na računalu, 1 na mobitelu)
    function perView() {
      const w = slides[0].getBoundingClientRect().width;
      return w ? Math.max(1, Math.round(track.clientWidth / w)) : 1;
    }

    // Zadnji indeks na koji se može doći (kad je vidljivo više slajdova odjednom)
    function lastIndex() {
      return Math.max(0, slides.length - perView());
    }

    // Trenutni slajd = onaj čiji je lijevi rub najbliži lijevom rubu traka
    function currentIndex() {
      const left = track.getBoundingClientRect().left;
      let best = 0;
      let bestDist = Infinity;
      slides.forEach((slide, i) => {
        const d = Math.abs(slide.getBoundingClientRect().left - left);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      });
      // Na samom kraju traka zadnji slajdovi ne mogu doći do lijevog ruba
      if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 2) best = lastIndex();
      return Math.min(best, lastIndex());
    }

    function goTo(index) {
      const i = Math.max(0, Math.min(index, lastIndex()));
      const offset = slides[i].offsetLeft - slides[0].offsetLeft;
      track.scrollTo({ left: offset, behavior: reduceMotion() ? 'auto' : 'smooth' });
    }

    function update() {
      const i = currentIndex();
      const last = lastIndex();
      const view = perView();

      // Točkice: jedna po poziciji do koje se može doći
      dots.forEach((dot, n) => {
        dot.hidden = n > last;
        const active = n === i;
        dot.classList.toggle('is-active', active);
        dot.setAttribute('aria-current', active ? 'true' : 'false');
      });

      counter.textContent =
        view > 1
          ? `${i + 1}–${Math.min(i + view, slides.length)} / ${slides.length}`
          : `${i + 1} / ${slides.length}`;

      prevBtn.disabled = i <= 0;
      nextBtn.disabled = i >= last;

      // Ako sve stane bez listanja, sakrij kontrole
      controls.hidden = last === 0;
      root.classList.toggle('is-static', last === 0);
    }

    /* ---- Događaji ---- */
    prevBtn.addEventListener('click', () => goTo(currentIndex() - 1));
    nextBtn.addEventListener('click', () => goTo(currentIndex() + 1));

    track.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        goTo(currentIndex() + (event.key === 'ArrowLeft' ? -1 : 1));
      }
    });

    let frame = 0;
    track.addEventListener(
      'scroll',
      () => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(update);
      },
      { passive: true },
    );
    window.addEventListener('resize', update);

    update();
  }

  document.querySelectorAll('[data-carousel]').forEach(setupCarousel);
})();
