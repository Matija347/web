'use strict';
(() => {
 const dialog = document.querySelector('#photo-dialog');
 if (!dialog) return;
 const largeImage = dialog.querySelector('#photo-dialog-image');
 const title = dialog.querySelector('#photo-dialog-title');
 const caption = dialog.querySelector('#photo-dialog-caption');
 const previous = dialog.querySelector('#photo-previous');
 const next = dialog.querySelector('#photo-next');
 let active = null;
 function updateDialog() {
  if (!active) return;
  const item = active.items[active.index];
  const image = item.querySelector('img');
  largeImage.src = image.getAttribute('src');
  largeImage.alt = image.alt;
  title.textContent = active.name;
  caption.textContent = item.querySelector('.gallery-caption > span').textContent + (active.items.length > 1 ? ' · ' + (active.index + 1) + ' / ' + active.items.length : '');
  previous.hidden = next.hidden = active.items.length < 2;
 }
 function move(step) {
  if (!active) return;
  active.index = (active.index + step + active.items.length) % active.items.length;
  updateDialog();
 }
 document.querySelectorAll('[data-gallery]').forEach(element => {
  const state = { name: element.dataset.galleryName, index: 0, items: [...element.querySelectorAll('.gallery-item')] };
  state.items.forEach((item, index) => item.querySelector('[data-gallery-index]').addEventListener('click', () => {
   state.index = index;
   active = state;
   updateDialog();
   dialog.showModal();
   document.body.classList.add('modal-open');
  }));
 });
 previous.addEventListener('click', () => move(-1));
 next.addEventListener('click', () => move(1));
 dialog.addEventListener('keydown', event => {
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
   event.preventDefault();
   move(event.key === 'ArrowLeft' ? -1 : 1);
  }
 });
 dialog.addEventListener('close', () => { largeImage.removeAttribute('src'); active = null; });
})();
