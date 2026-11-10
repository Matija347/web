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

   Svako dijete elementa .carousel-track je jedan slajd. Listanje:
   - mobitel: prstom (vodoravno pomicanje sa "snap" efektom)
   - računalo: klik + držanje + povlačenje mišem, ili trake sa
     strelicama uz lijevi i desni rub koje se pojave kad je miš iznad
     carousela
   - tipkovnica: ← / → kad je carousel u fokusu
   Točkice i brojač ("1 / 3") ispod pokazuju da ima još slajdova.
   Kontrole skripta dodaje sama.
==================================================================== */

(() => {
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DRAG_THRESHOLD = 6; // px pomaka nakon kojeg se klik smatra povlačenjem

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

    /* ---- Trake sa strelicama uz rubove (računalo) ---- */
    const viewport = document.createElement('div');
    viewport.className = 'carousel-viewport';
    track.before(viewport);
    viewport.appendChild(track);

    const arrowSvg = (d) =>
      `<span class="carousel-edge-icon"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="${d}"></path></svg></span>`;
    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'carousel-edge carousel-edge-prev';
    prevBtn.setAttribute('aria-label', 'Prethodno');
    prevBtn.innerHTML = arrowSvg('M20 12H5m6-6-6 6 6 6');
    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'carousel-edge carousel-edge-next';
    nextBtn.setAttribute('aria-label', 'Sljedeće');
    nextBtn.innerHTML = arrowSvg('M4 12h15m-6-6 6 6-6 6');
    viewport.append(prevBtn, nextBtn);

    /* ---- Točkice i brojač ---- */
    const controls = document.createElement('div');
    controls.className = 'carousel-controls';
    controls.innerHTML = `
      <div class="carousel-dots"></div>
      <p class="carousel-counter" aria-live="polite"></p>`;
    root.appendChild(controls);
    const dotsWrap = controls.querySelector('.carousel-dots');
    const counter = controls.querySelector('.carousel-counter');

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

    // Trake uz rubove pokrivaju cijelu visinu slike (bez opisa ispod nje)
    function updateEdgeHeight() {
      const stage = slides[0].querySelector('.gallery-stage');
      const h = stage ? stage.offsetHeight : 0;
      viewport.style.setProperty('--edge-height', h ? `${h}px` : '100%');
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

      prevBtn.hidden = i <= 0;
      nextBtn.hidden = i >= last;

      // Ako sve stane bez listanja, sakrij kontrole
      controls.hidden = last === 0;
      root.classList.toggle('is-static', last === 0);
      updateEdgeHeight();
    }

    /* ---- Strelice i tipkovnica ---- */
    prevBtn.addEventListener('click', () => goTo(currentIndex() - 1));
    nextBtn.addEventListener('click', () => goTo(currentIndex() + 1));

    track.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        goTo(currentIndex() + (event.key === 'ArrowLeft' ? -1 : 1));
      }
    });

    /* ---- Povlačenje mišem (klik + držanje + pomak lijevo/desno) ---- */
    let drag = null;

    track.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return;
      drag = {
        id: event.pointerId,
        startX: event.clientX,
        startScroll: track.scrollLeft,
        startIndex: currentIndex(),
        moved: false,
      };
    });

    track.addEventListener('pointermove', (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.startX;
      if (!drag.moved && Math.abs(dx) < DRAG_THRESHOLD) return;
      if (!drag.moved) {
        drag.moved = true;
        track.setPointerCapture(drag.id);
        root.classList.add('is-dragging');
      }
      track.scrollLeft = drag.startScroll - dx;
    });

    function endDrag(event) {
      if (!drag || event.pointerId !== drag.id) return;
      const { moved, startX, startIndex } = drag;
      drag = null;
      if (!moved) return;
      root.classList.remove('is-dragging');
      if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);

      // Dovoljno velik pomak = prijeđi na sljedeći/prethodni slajd
      const dx = event.clientX - startX;
      const slideWidth = slides[0].getBoundingClientRect().width;
      let target = currentIndex();
      if (target === startIndex && Math.abs(dx) > slideWidth * 0.15) {
        target = startIndex + (dx < 0 ? 1 : -1);
      }
      goTo(target);

      // Nakon povlačenja ne otvaraj link na koji je miš pušten
      track.addEventListener(
        'click',
        (e) => {
          e.preventDefault();
          e.stopPropagation();
        },
        { capture: true, once: true },
      );
    }
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);

    // Spriječi pregledničko "povlačenje" slike ili linka koje bi prekinulo listanje
    track.querySelectorAll('a, img').forEach((el) => el.setAttribute('draggable', 'false'));
    track.addEventListener('dragstart', (event) => event.preventDefault());

    /* ---- Osvježavanje ---- */
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
    slides.forEach((slide) =>
      slide.querySelectorAll('img').forEach((img) => img.addEventListener('load', update)),
    );

    update();
  }

  document.querySelectorAll('[data-carousel]').forEach(setupCarousel);
})();
