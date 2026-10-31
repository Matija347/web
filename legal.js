'use strict';
document.querySelectorAll('[data-print-legal]').forEach(button => {
 button.addEventListener('click', () => window.print());
});
