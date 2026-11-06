/* BULT / Vessel Archive. Static concept: no checkout requests, contact writes or tracking. */
(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let lastFocus = null, selectedPlan = 'subscription', hasItem = false;
  const announce = message => { $('#live-status').textContent = message; };
  const plans = {
    subscription: { name: 'Subscription · every 30 days', price: '$69', cta: 'Start my first 30 days', shipping: 'Free', terms: 'Recurring subscription: $69 today, then $89 every 30 days until cancelled. Tax, if applicable, calculated at checkout. Ships to the 48 contiguous United States.', renewal: 'Then $89 every 30 days until cancelled. Skip, pause or cancel through your BULT account.', perks: ['$20 off your first subscription order','Free shipping on subscription orders','Skip, pause or cancel in your account','Reminder before each renewal'] },
    onetime: { name: 'One-time purchase', price: '$112', cta: 'Try the protocol once', shipping: 'Calculated at checkout', terms: 'One-time purchase: $112 for 30 daily packs. No recurring charge. Shipping and tax, if applicable, calculated at checkout. Ships to the 48 contiguous United States.', renewal: 'One purchase. No subscription and no recurring charge.', perks: ['30 daily packs of CORE + VITALITY + OMEGA','One order. No recurring commitment.','Standard shipping rates apply','Review every ingredient before you choose'] }
  };
  const menuButton = $('.menu-toggle');
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    $('#mobile-menu').hidden = !open;
  });
  $$('#mobile-menu a').forEach(link => link.addEventListener('click', closeMenu));
  function closeMenu() { $('#mobile-menu').hidden = true; menuButton.setAttribute('aria-expanded', 'false'); menuButton.setAttribute('aria-label', 'Open menu'); }
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') { closeMenu(); menuButton.focus(); } });
  function openDialog(id) {
    closeMenu();
    const dialog = document.getElementById(id);
    if (!dialog || dialog.open) return;
    $$('dialog[open]').forEach(open => open.close());
    lastFocus = document.activeElement;
    dialog.showModal();
    document.body.classList.add('modal-open');
  }
  $$('[data-open]').forEach(button => button.addEventListener('click', () => openDialog(button.dataset.open)));
  $$('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog')?.close()));
  $$('dialog').forEach(dialog => {
    dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
    dialog.addEventListener('close', () => {
      if (!document.querySelector('dialog[open]')) document.body.classList.remove('modal-open');
      if (dialog.id === 'capture') { $('#email-form').reset(); $('#sms-form').reset(); $('#capture-step-one').hidden = false; $('#capture-step-two').hidden = true; $('#capture-done').hidden = true; }
      if (lastFocus?.isConnected) lastFocus.focus({preventScroll:true});
    });
  });
  // Accessible formula tabs. Arrow, Home and End keys follow the WAI-ARIA tab pattern.
  function selectFormula(name, focus = false) {
    $$('.ingredient-tabs [role=tab]').forEach(tab => {
      const active = tab.dataset.formula === name;
      tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
      if (active && focus) tab.focus();
    });
  }
  const tabs = $$('.ingredient-tabs [role=tab]');
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectFormula(tab.dataset.formula));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); selectFormula(tabs[next].dataset.formula, true); }
    });
  });
  $$('[data-formula-link]').forEach(link => link.addEventListener('click', () => selectFormula(link.dataset.formulaLink)));
  const ingredients = {
    'CORE / 2 capsules': [['Vitamin A (beta carotene)','900 mcg'],['Vitamin C','150 mg'],['Vitamin D','50 mcg'],['Vitamin E','15 mg'],['Vitamin K (MK-7)','120 mcg'],['Riboflavin','5 mg'],['Niacin','20 mg'],['B6 (P-5-P)','10 mg'],['Folate (L-5-MTHF)','600 mcg'],['B12 (methylcobalamin)','25 mcg'],['Magnesium (glycinate + citrate)','60 mg'],['Zinc (picolinate)','30 mg'],['Selenium','50 mcg'],['Copper (gluconate)','2 mg'],['Manganese','2.3 mg'],['Chromium','100 mcg'],['Prebiotic + probiotic blend (combined)','100 mg'],['Boron','2 mg']],
    'VITALITY / 3 capsules': [['L-Citrulline Malate','1 g'],['KSM-66® Ashwagandha','400 mg'],['Maca Root','150 mg'],['Muira Puama','100 mg'],['Asian Ginseng','100 mg'],['Pygeum','100 mg'],['Epimedium','80 mg'],['Beet Root','50 mg']],
    'OMEGA / 2 softgels': [['Fish oil (anchovy)','750 mg'],['EPA','370 mg'],['DHA','150 mg'],['Sunflower lecithin','1,200 mg']]
  };
  Object.entries(ingredients).forEach(([title, entries]) => {
    const heading = document.createElement('h3'); heading.textContent = title;
    const table = document.createElement('table'); table.className = 'full-label';
    const caption = document.createElement('caption'); caption.className = 'sr-only'; caption.textContent = title + ' ingredients and doses'; table.append(caption);
    const body = document.createElement('tbody');
    entries.forEach(([name,dose]) => { const row = document.createElement('tr'); const th = document.createElement('th'); th.scope = 'row'; th.textContent = name; const td = document.createElement('td'); td.textContent = dose; row.append(th,td); body.append(row); });
    table.append(body); $('#full-ingredients').append(heading,table);
  });
  function syncPlan() {
    const plan = plans[selectedPlan];
    $$('.plan-option').forEach(option => option.classList.toggle('selected', $('input',option).value === selectedPlan));
    $('#purchase-terms').textContent = plan.terms;
    $('#add-to-bag').replaceChildren(document.createTextNode('Add to bag '));
    const price = document.createElement('span'); price.textContent = plan.price + ' '; const icon = document.createElement('i'); icon.className = 'arrow-icon'; icon.setAttribute('aria-hidden','true'); price.append(icon); $('#add-to-bag').append(price);
    $('#sticky-price').textContent = selectedPlan === 'subscription' ? '$69 first order' : '$112 one time';
    $('#sticky-terms').textContent = selectedPlan === 'subscription' ? 'Then $89 every 30 days' : 'No recurring charge';
  }
  $$('input[name=plan]').forEach(radio => radio.addEventListener('change', () => { selectedPlan = radio.value; syncPlan(); announce('Selected ' + plans[selectedPlan].name + ', ' + plans[selectedPlan].price + '.'); }));
  let bagPlan = selectedPlan;
  function syncBag() {
    const plan = plans[bagPlan];
    $('#bag-count').textContent = hasItem ? '1' : '0';
    $('#empty-bag').hidden = hasItem; $('#filled-bag').hidden = !hasItem; $('#bag-handoff').hidden = true;
    $('#bag-plan-name').textContent = plan.name;
    $('#bag-price').textContent = plan.price; $('#bag-subtotal').textContent = plan.price;
    $('#bag-shipping').textContent = plan.shipping; $('#bag-renewal').textContent = plan.renewal;
  }
  $('#add-to-bag').addEventListener('click', () => { bagPlan = selectedPlan; hasItem = true; syncBag(); openDialog('bag'); announce('Men’s Daily Protocol added to preview bag. No order placed.'); });
  $$('[data-cart]').forEach(button => button.addEventListener('click', () => { syncBag(); openDialog('bag'); }));
  $('#change-plan').addEventListener('click', () => { lastFocus = $('input[name=plan]:checked'); $('#bag').close(); $('#choose-plan').scrollIntoView({behavior:reducedMotion.matches?'instant':'smooth'}); $('input[name=plan]:checked').focus({preventScroll:true}); });
  $('#remove-item').addEventListener('click', () => { hasItem = false; syncBag(); announce('Removed from preview bag.'); });
  $('#preview-checkout').addEventListener('click', () => { $('#filled-bag').hidden = true; $('#bag-handoff').hidden = false; announce('Checkout handoff preview. No order or payment was placed.'); });
  syncPlan(); syncBag();
  // Capture flow deliberately has no request, localStorage or sessionStorage of personal data.
  $('#email-form').addEventListener('submit', event => {
    event.preventDefault(); if (!event.currentTarget.reportValidity()) return;
    $('#capture-email').value = '';
    $('#capture-step-one').hidden = true; $('#capture-step-two').hidden = false;
    $('#capture-phone').focus({preventScroll:true});
    announce('Optional text message sign-up preview. Email was not saved or sent.');
  });
  function finishCapture() {
    $('#email-form').reset(); $('#sms-form').reset();
    $('#capture-step-one').hidden = true; $('#capture-step-two').hidden = true; $('#capture-done').hidden = false;
    $('#capture-done button').focus({preventScroll:true});
    announce('Preview complete. No contact details were saved or sent.');
  }
  $('#sms-form').addEventListener('submit', event => {
    event.preventDefault();
    const phone = $('#capture-phone'), consent = $('#sms-consent');
    phone.setCustomValidity(phone.value.replace(/\D/g,'').length >= 7 ? '' : 'Enter a valid mobile number, or choose Skip.');
    consent.setCustomValidity(consent.checked ? '' : 'Choose the marketing consent checkbox to preview SMS sign-up, or choose Skip.');
    if (!event.currentTarget.reportValidity()) return;
    finishCapture();
  });
  $('#capture-phone').addEventListener('input', event => event.target.setCustomValidity(''));
  $('#sms-consent').addEventListener('change', event => event.target.setCustomValidity(''));
  $('#skip-sms').addEventListener('click', finishCapture);
  // No timed popups, exit-intent capture, autoplay, parallax, or scroll interception.
  // Sticky purchase is keyed to the actual action and its selected plan, never a distant image.
  let stickyTick = false;
  function updateSticky() {
    const action = $('#purchase-action').getBoundingClientRect();
    $('#sticky-purchase').hidden = action.bottom >= 84;
  }
  window.addEventListener('scroll', () => {
    if (stickyTick) return;
    stickyTick = true;
    requestAnimationFrame(() => { updateSticky(); stickyTick = false; });
  }, {passive:true});
  window.addEventListener('resize', updateSticky);
  updateSticky();
  const gallery = {
    ritual: {src:'assets/ritual.webp', alt:'A BULT daily pack beside a glass of water', caption:'01 / THE EVERYDAY'},
    pack: {src:'assets/bult-sachet.webp', alt:'The front and reverse of a BULT daily supplement pouch', caption:'02 / ONE DAILY PACK'},
    box: {src:'assets/bult-product-box-1.webp', alt:'BULT Men’s Daily Protocol box with 30 daily packs', caption:'03 / THIRTY DAILY PACKS'}
  };
  $$('[data-image]').forEach(button => button.addEventListener('click', () => {
    const item = gallery[button.dataset.image];
    $('#gallery-image').src = item.src; $('#gallery-image').alt = item.alt;
    $('#product-gallery').dataset.view = button.dataset.image;
    $('#image-reference').textContent = item.caption;
    $$('[data-image]').forEach(control => {const active = control === button; control.classList.toggle('active',active); control.setAttribute('aria-pressed',String(active));});
  }));
  // Match the tab orientation announced to assistive technology to the actual responsive layout.
  const horizontalTabs = matchMedia('(max-width: 700px)');
  const syncTabOrientation = () => $('.ingredient-tabs').setAttribute('aria-orientation', horizontalTabs.matches ? 'horizontal' : 'vertical');
  horizontalTabs.addEventListener('change',syncTabOrientation); syncTabOrientation();
  $('#year').textContent = new Date().getFullYear();
})();

