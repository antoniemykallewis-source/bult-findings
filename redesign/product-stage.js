/* A photographed sachet and an editorial cutaway share one lightweight 3D object. */
(() => {
  'use strict';

  const scene = document.getElementById('product-scene');
  const model = document.getElementById('physical-product');
  const inside = document.getElementById('inside-panel');
  const spin = document.getElementById('spin-pack');
  const views = [...document.querySelectorAll('[data-studio-view]')];
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const status = document.getElementById('live-status');
  const descriptions = {
    pack: 'Front of the BULT daily pouch.',
    inside: 'Inside one pouch. Explore Core, Vitality, or Omega.',
    box: 'The BULT box contains 30 daily packs.'
  };
  let view = 'pack';
  let angle = -14;
  let animation = 0;
  let turning = false;
  let drag = null;

  function draw() {
    const normal = ((angle % 360) + 360) % 360;
    const rearFacing = normal > 125 && normal < 235;
    model.style.setProperty('--pack-angle', angle.toFixed(2) + 'deg');
    model.style.setProperty('--pack-roll', (-9 * (1 + Math.cos(angle * Math.PI / 180)) / 2).toFixed(2) + 'deg');
    const available = view !== 'box' && rearFacing && !turning;
    inside.inert = !available;
    inside.setAttribute('aria-hidden', String(!available));
  }

  function labelSpin() {
    const label = turning ? 'Pause' : motion.matches ? 'Flip' : 'Spin';
    spin.querySelector('.spin-label').textContent = label;
    spin.setAttribute('aria-label', turning ? 'Pause pack rotation' : motion.matches ? 'Flip between pack and contents' : 'Spin the pack one turn');
    spin.disabled = view === 'box';
  }

  function stop() {
    cancelAnimationFrame(animation);
    animation = 0;
    turning = false;
    labelSpin();
    draw();
  }

  function animateTo(target, duration, isSpin = false) {
    stop();
    if (motion.matches || Math.abs(target - angle) < .1) {
      angle = target;
      draw();
      return;
    }
    const from = angle;
    const start = performance.now();
    turning = isSpin;
    labelSpin();
    draw();
    function frame(time) {
      const progress = Math.min(1, (time - start) / duration);
      const eased = .5 - Math.cos(Math.PI * progress) / 2;
      angle = from + (target - from) * eased;
      draw();
      if (progress < 1) animation = requestAnimationFrame(frame);
      else stop();
    }
    animation = requestAnimationFrame(frame);
  }

  function nearestAngle(target) {
    return angle + ((target - angle + 540) % 360 + 360) % 360 - 180;
  }

  function select(next, announce = true) {
    stop();
    view = next;
    scene.dataset.view = next;
    views.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.studioView === next)));
    labelSpin();
    if (view === 'box') draw();
    else animateTo(nearestAngle(view === 'pack' ? -14 : 180), 560);
    if (announce) status.textContent = descriptions[next];
  }

  views.forEach(button => button.addEventListener('click', () => select(button.dataset.studioView)));
  spin.addEventListener('click', () => {
    if (turning) {
      turnBy(0);
      status.textContent = 'Rotation paused.';
    } else if (motion.matches) {
      select(view === 'inside' ? 'pack' : 'inside');
    } else {
      // Land on the chosen side even after a user pauses or drags mid-turn.
      const target = nearestAngle(view === 'inside' ? 180 : -14) + 360;
      animateTo(target, 3200, true);
      status.textContent = 'Turning the daily pack.';
    }
  });

  function turnBy(degrees) {
    stop();
    angle += degrees;
    const back = Math.cos(angle * Math.PI / 180) < 0;
    view = back ? 'inside' : 'pack';
    scene.dataset.view = view;
    views.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.studioView === view)));
    draw();
  }

  scene.addEventListener('keydown', event => {
    if (event.target !== scene || !['ArrowLeft', 'ArrowRight', 'Home'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') select('pack');
    else if (view !== 'box') {
      turnBy(event.key === 'ArrowRight' ? 30 : -30);
      status.textContent = descriptions[view];
    }
  });

  scene.addEventListener('pointerdown', event => {
    if (view === 'box' || event.target.closest('a') || !event.isPrimary || event.button !== 0) return;
    drag = {id: event.pointerId, x: event.clientX, y: event.clientY, active: false};
  });
  scene.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    if (!drag.active) {
      const dy = event.clientY - drag.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
      if (Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
      scene.setPointerCapture(event.pointerId);
      drag.active = true;
      scene.dataset.dragging = 'true';
    }
    turnBy(dx * .65);
    drag.x = event.clientX;
  });

  function endDrag() {
    if (!drag) return;
    const wasActive = drag.active;
    drag = null;
    delete scene.dataset.dragging;
    if (wasActive) select(view);
  }
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(event => scene.addEventListener(event, endDrag));
  scene.addEventListener('pointerleave', () => { if (drag && !drag.active) drag = null; });
  motion.addEventListener('change', () => select(view, false));
  function restWhenHidden() {
    if (!animation && !drag) return;
    drag = null;
    delete scene.dataset.dragging;
    stop();
    angle = nearestAngle(view === 'inside' ? 180 : -14);
    draw();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) restWhenHidden(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => { if (!entry.isIntersecting) restWhenHidden(); }).observe(scene);
  }
  draw();
  labelSpin();
})();
