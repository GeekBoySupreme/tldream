/* Tactile buttons — adapted from references/clicky-button-next.html
 *
 * Gives the primary (.btn) and secondary (.btn-secondary) variants the physical
 * surface from the reference: a grayscale fractal-noise overlay in `overlay`
 * blend mode, a lit top edge and shaded bottom edge via inset shadows, a hairline
 * ring, and a 1px push on :active.
 *
 * Round buttons, danger buttons and icon buttons are deliberately untouched.
 */
;(function () {
"use strict";

const NOISE = "url(\"data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100' height='100' filter='url(%23n)'/></svg>\")";

const CSS = `
/* ---- shared tactile surface (primary + secondary only) ---- */
.btn,
.btn-secondary,
.settings-content .btn-secondary,
.memory-modal .btn-secondary,
.modal-box .btn-secondary {
  position: relative;
  isolation: isolate;
  transition: background-color 75ms ease, box-shadow 75ms ease, transform 75ms ease, opacity 75ms ease;
}

.btn::after,
.btn-secondary::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background-image: ${NOISE};
  background-size: 100px 100px;
  mix-blend-mode: overlay;
  opacity: 0.07;
  pointer-events: none;
  z-index: 0;
}

.btn:active:not(:disabled),
.btn-secondary:active:not(:disabled) {
  transform: translateY(1px) scale(0.995);
}

/* ---- primary ---- */
.btn:not(.btn-secondary):not(.btn-danger) {
  background-color: var(--primary-color);
  color: #ffffff;
  border: none;
  box-shadow:
    inset 0 -1.5px 0 rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.14),
    0 1px 3px rgba(66, 133, 244, 0.28),
    0 0 0 0.5px rgba(66, 133, 244, 0.45);
}

.btn:not(.btn-secondary):not(.btn-danger):hover:not(:disabled) {
  background-color: #3a76e0;
  opacity: 1;
}

/* ---- secondary (dark surface) ---- */
.btn-secondary,
.settings-content .btn-secondary,
.memory-modal .btn-secondary,
.modal-box .btn-secondary {
  border: none;
  box-shadow:
    inset 0 -1.5px 0 rgba(0, 0, 0, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.05),
    0 1px 3px rgba(0, 0, 0, 0.3),
    0 0 0 0.5px rgba(255, 255, 255, 0.07);
}

.btn-secondary::after {
  opacity: 0.05;
}

/* keep the label above the noise film */
.btn > *,
.btn-secondary > * {
  position: relative;
  z-index: 1;
}

/* the noise film must not cover a focus ring */
.btn:focus-visible,
.btn-secondary:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}
`;

function inject() {
  if (document.getElementById('tactile-buttons-styles')) return;
  const style = document.createElement('style');
  style.id = 'tactile-buttons-styles';
  style.textContent = CSS;
  (document.head || document.documentElement).appendChild(style);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inject);
} else {
  inject();
}

window.TactileButtons = { inject };

})();
