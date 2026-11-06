/* Lightweight progressive enhancements. No scroll interception, tracking or commerce requests. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const headline = document.querySelector('.scroll-headline');
  const diagram = document.querySelector('.dose-diagram');
  const detail = document.querySelector('.formula-detail');
  const tabs = [...document.querySelectorAll('.ingredient-tabs [role=tab]')];
  const grid = document.querySelector('.month-grid');
  const days = [...grid.children];
  const gallery = document.getElementById('routine-gallery');
  const steps = [...document.querySelectorAll('[data-routine-photo]')];
  const arrows = [...document.querySelectorAll('[data-gallery-step]')];
  const position = document.getElementById('gallery-position');
  const desktop = matchMedia('(min-width: 901px)');
  let slide = 0, manual = false;

  function markSlide(index) {
    slide = index;
    steps.forEach((button, i) => {
      button.setAttribute('aria-pressed', String(i === index));
      button.closest('li').classList.toggle('active-step', i === index);
    });
    arrows[0].disabled = index === 0;
    arrows[1].disabled = index === steps.length - 1;
    position.textContent = String(index + 1).padStart(2, '0') + ' / 03';
  }
  function showSlide(index, byUser) {
    if (index < 0 || index >= steps.length) return;
    if (byUser) manual = true;
    gallery.scrollTo({left: index * gallery.clientWidth, behavior: byUser && !reduced.matches ? 'smooth' : 'instant'});
  }
  steps.forEach((button, i) => button.addEventListener('click', () => showSlide(i, true)));
  arrows.forEach(button => button.addEventListener('click', () => showSlide(slide + Number(button.dataset.galleryStep), true)));
  gallery.addEventListener('pointerdown', () => { manual = true; });
  gallery.addEventListener('wheel', event => { if (event.deltaX || event.shiftKey) manual = true; }, {passive: true});
  gallery.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const target = {ArrowLeft: slide - 1, ArrowRight: slide + 1, Home: 0, End: steps.length - 1};
    showSlide(target[event.key], true);
  });
  gallery.addEventListener('scroll', () => {
    const next = Math.round(gallery.scrollLeft / gallery.clientWidth);
    if (next >= 0 && next < steps.length && next !== slide) markSlide(next);
  }, {passive: true});
  markSlide(0);
  const formula = { core: ['02','CORE CAPSULES'], vitality: ['03','VITALITY CAPSULES'], omega: ['02','OMEGA SOFTGELS'] };
  let frame = 0, previous = '';
  const clamp = value => Math.max(0, Math.min(1, value));
  function syncFormula() {
    const current = tabs.find(tab => tab.getAttribute('aria-selected') === 'true')?.dataset.formula || 'core';
    if (previous === current) return;
    previous = current;
    diagram.dataset.active = current;
    diagram.querySelector('.dose-number').textContent = formula[current][0];
    diagram.querySelector('.dose-unit').textContent = formula[current][1];
    detail.classList.remove('panel-changing');
    if (!reduced.matches) requestAnimationFrame(() => detail.classList.add('panel-changing'));
  }
  const tabObserver = new MutationObserver(syncFormula);
  tabs.forEach(tab => tabObserver.observe(tab, {attributes:true,attributeFilter:['aria-selected']}));
  syncFormula();
  function update() {
    frame = 0;
    const height = window.innerHeight;
    root.style.setProperty('--read-progress', clamp(window.scrollY / Math.max(1, document.documentElement.scrollHeight-height)));
    const r = headline.getBoundingClientRect();
    const reveal = reduced.matches ? 1 : clamp((height*.83-r.top)/(height*.48));
    headline.style.setProperty('--highlight', (reveal*100).toFixed(2)+'%');
    const calendar = grid.getBoundingClientRect();
    const lit = reduced.matches ? 30 : Math.ceil(clamp((height*.88-calendar.top)/(height*.48))*30);
    days.forEach((day,index) => day.classList.toggle('lit', index < lit));
    const bounds = gallery.getBoundingClientRect();
    if (bounds.bottom < 0 || bounds.top > height) manual = false;
    if (!manual && desktop.matches && !reduced.matches && bounds.top < height && bounds.bottom > 0) {
      const distances = steps.map(button => {
        const rect = button.getBoundingClientRect();
        return Math.abs(rect.top + rect.height / 2 - height * .57);
      });
      const nearest = distances.indexOf(Math.min(...distances));
      if (nearest !== slide) showSlide(nearest, false);
    }
  }
  function schedule() { if (!frame) frame=requestAnimationFrame(update); }
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule);
  reduced.addEventListener('change',schedule);
  document.addEventListener('visibilitychange',() => {if (!document.hidden) schedule();});
  update();
})();
