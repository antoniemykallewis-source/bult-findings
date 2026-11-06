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
  const steps = [...document.querySelectorAll('.routine-steps li')];
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
    let nearest = 0, distance = Infinity;
    steps.forEach((step,index) => {const b=step.getBoundingClientRect();const d=Math.abs(b.top+b.height/2-height*.52);if(d<distance){distance=d;nearest=index;}});
    steps.forEach((step,index) => step.classList.toggle('active-step',index===nearest));
  }
  function schedule() { if (!frame) frame=requestAnimationFrame(update); }
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule);
  reduced.addEventListener('change',schedule);
  document.addEventListener('visibilitychange',() => {if (!document.hidden) schedule();});
  update();
})();
