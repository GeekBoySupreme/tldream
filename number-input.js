/* Number input — adapted from references/input-number.html
 *
 * Wraps a plain <input type="number"> so that hovering the field slides a minus
 * and a plus button out from behind its left and right edges, tints the field's
 * border toward whichever button is hovered, and supports press-and-hold with
 * accelerating repeat.
 *
 * Auto-enhances any input carrying `data-number-input`; also callable directly:
 *   NumberInput.enhance(inputEl)
 */
;(function () {
"use strict";

const CSS = `
.ni-hover-zone {
  position: relative;
  z-index: 4;
  padding: 0 var(--ni-btn-w, 30px);
  margin: 0 calc(-1 * var(--ni-btn-w, 30px));
  display: inline-block;
  flex-shrink: 0;
}

/* no isolation: the buttons must be free to paint outside the parent card */
.ni-wrap {
  position: relative;
  display: block;
  --ni-btn-w: 30px;
  --ni-tuck: 2px;
}

.ni-wrap input.memory-config-input,
.ni-wrap input[type="number"] {
  -moz-appearance: textfield;
  appearance: textfield;
  display: block;
  position: relative;
  z-index: 2;
  text-align: center;
  cursor: default;
  border-width: 1.5px;
  border-style: solid;
  transition: border-color 0.1s ease-in-out, border-image 0.1s ease-in-out, box-shadow 0.1s ease-in-out;
}

.ni-wrap input[type="number"]::-webkit-inner-spin-button,
.ni-wrap input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.ni-wrap.ni-hovered input[type="number"] {
  border-image: linear-gradient(var(--primary-color), var(--primary-color)) 1;
  /* squared off while the buttons are out, so the three parts read as one control */
  border-radius: 0 !important;
}

.ni-wrap.ni-hover-inc input[type="number"] {
  border-image: linear-gradient(to right, var(--primary-color), #7090FA) 1;
}

.ni-wrap.ni-hover-dec input[type="number"] {
  border-image: linear-gradient(to left, var(--primary-color), #7090FA) 1;
}

.ni-wrap .ni-btn {
  position: absolute;
  top: 0;
  width: var(--ni-btn-w);
  height: 100%;
  background: var(--primary-color);
  color: #05070d;
  border: none;
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  /* behind the field, so the tucked buttons stay hidden underneath it while
     unhovered and slide out from under its edges on hover. Escaping the parent
     card is handled by the hover zone's own stacking, not by this value. */
  z-index: 1;
  padding: 0;
  will-change: transform;
  backface-visibility: hidden;
  transition: transform 0.1s ease-in-out, background 0.1s ease;
}

.ni-wrap .ni-btn:hover { background: #7090FA; }

/* square on the edge that meets the field, rounded on the outer edge.
   Written against .ni-wrap so these outrank the app's blanket
   button border-radius override. */
/* The outer radius matches the field's own corner radius so that, while tucked
   behind it, the button's corners hide exactly under the field's rounded ones
   instead of poking out past them. */
.ni-wrap .ni-btn-dec {
  right: calc(100% - var(--ni-tuck));
  border-radius: var(--ui-radius, 6px) 0 0 var(--ui-radius, 6px) !important;
  transform: translateX(calc(var(--ni-btn-w) - var(--ni-tuck)));
}

.ni-wrap .ni-btn-inc {
  left: calc(100% - var(--ni-tuck));
  border-radius: 0 var(--ui-radius, 6px) var(--ui-radius, 6px) 0 !important;
  transform: translateX(calc(-1 * (var(--ni-btn-w) - var(--ni-tuck))));
}

.ni-wrap.ni-hovered .ni-btn-dec,
.ni-wrap.ni-hovered .ni-btn-inc {
  transform: translateX(0);
}
`;

function inject() {
  if (document.getElementById('number-input-styles')) return;
  const style = document.createElement('style');
  style.id = 'number-input-styles';
  style.textContent = CSS;
  (document.head || document.documentElement).appendChild(style);
}

function enhance(input) {
  if (!input || input.dataset.niReady === 'true') return null;
  inject();
  input.dataset.niReady = 'true';

  const min = input.min !== '' ? parseFloat(input.min) : -Infinity;
  const max = input.max !== '' ? parseFloat(input.max) : Infinity;
  const step = input.step && input.step !== 'any' ? parseFloat(input.step) : 1;

  const zone = document.createElement('div');
  zone.className = 'ni-hover-zone';
  const wrap = document.createElement('div');
  wrap.className = 'ni-wrap';

  input.parentNode.insertBefore(zone, input);
  zone.appendChild(wrap);
  wrap.appendChild(input);

  const dec = document.createElement('button');
  dec.type = 'button';
  dec.className = 'ni-btn ni-btn-dec';
  dec.tabIndex = -1;
  dec.setAttribute('aria-label', 'Decrease');
  dec.textContent = '−';

  const inc = document.createElement('button');
  inc.type = 'button';
  inc.className = 'ni-btn ni-btn-inc';
  inc.tabIndex = -1;
  inc.setAttribute('aria-label', 'Increase');
  inc.textContent = '+';

  wrap.appendChild(dec);
  wrap.appendChild(inc);

  zone.addEventListener('mouseenter', () => wrap.classList.add('ni-hovered'));
  zone.addEventListener('mouseleave', () => wrap.classList.remove('ni-hovered', 'ni-hover-inc', 'ni-hover-dec'));

  inc.addEventListener('mouseenter', () => { wrap.classList.add('ni-hover-inc'); wrap.classList.remove('ni-hover-dec'); });
  inc.addEventListener('mouseleave', () => wrap.classList.remove('ni-hover-inc'));
  dec.addEventListener('mouseenter', () => { wrap.classList.add('ni-hover-dec'); wrap.classList.remove('ni-hover-inc'); });
  dec.addEventListener('mouseleave', () => wrap.classList.remove('ni-hover-dec'));

  const readValue = () => {
    const n = parseFloat(input.value);
    return Number.isFinite(n) ? n : (Number.isFinite(min) ? min : 0);
  };

  function applyDelta(delta) {
    const next = Math.min(max, Math.max(min, readValue() + delta * step));
    if (next === readValue()) return false;
    input.value = String(next);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }

  function startHold(delta) {
    applyDelta(delta);
    let delay = 400;
    let timer;
    const tick = () => {
      if (applyDelta(delta)) {
        delay = Math.max(50, delay * 0.85);
        timer = setTimeout(tick, delay);
      }
    };
    timer = setTimeout(tick, delay);
    const stop = () => {
      clearTimeout(timer);
      window.removeEventListener('mouseup', stop);
      window.removeEventListener('mouseleave', stop);
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };
    window.addEventListener('mouseup', stop);
    window.addEventListener('mouseleave', stop);
  }

  dec.addEventListener('mousedown', e => { e.preventDefault(); startHold(-1); });
  inc.addEventListener('mousedown', e => { e.preventDefault(); startHold(1); });

  return { zone, wrap, dec, inc };
}

function initAll() {
  document.querySelectorAll('input[type="number"][data-number-input]').forEach(enhance);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAll);
} else {
  initAll();
}

window.NumberInput = { enhance, initAll };

})();
