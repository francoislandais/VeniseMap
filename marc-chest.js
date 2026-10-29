// The approved sheet is kept intact: each sprite displays one half through CSS.
export function openMarcChest({ canClaim, onOpen, onReveal, onClaim, onClose }) {
  const root = document.createElement('div');
  root.className = 'marc-magic'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Le coffre au masque d’or');
  root.innerHTML = `<button type="button" class="marc-close" aria-label="Fermer">×</button><div class="marc-scene"><div class="marc-aura"></div><div class="marc-chest-sprite marc-large"></div><div class="marc-chest-sprite marc-open marc-open-back"></div><button type="button" class="marc-book" aria-label="Prendre l’Évangile selon saint Marc" disabled><img src="img/objets/evangile-marc.png" alt="L’Évangile selon saint Marc"></button><div class="marc-chest-sprite marc-open marc-front"></div><img class="marc-key" src="img/objets/masque-or.webp" alt="Le masque d’or"><div class="marc-click" aria-hidden="true"></div><div class="marc-stars" aria-hidden="true">${Array.from({length: 18}, (_, i) => `<i style="--i:${i}">✦</i>`).join('')}</div></div><p class="marc-title" role="status" aria-live="polite"></p>`;
  document.body.appendChild(root);
  document.body.classList.add("marc-reward-active");
  const previous = document.activeElement, close = root.querySelector('.marc-close'), key = root.querySelector('.marc-key'), book = root.querySelector('.marc-book'), title = root.querySelector('.marc-title');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let closed = false, claiming = false, presented = false;
  const animations = new Set();
  const animate = async (el, frames, duration, easing = 'ease-in-out') => {
    if (closed) return;
    const a = el.animate(frames, { duration: reduced ? 80 : duration, easing, fill: 'forwards' }); animations.add(a);
    try { await a.finished; } catch {} finally { animations.delete(a); }
  };
  const dismiss = () => {
    if (closed || claiming) return;
    closed = true; for (const a of animations) a.cancel(); root.remove(); document.body.classList.remove("marc-reward-active"); document.removeEventListener('keydown', keydown); onClose(); previous?.isConnected && previous.focus();
  };
  const keydown = e => {
    if (e.key === 'Escape') { if (presented) book.click(); else dismiss(); }
    if (e.key === 'Tab') { const items = [close, book].filter(el => !el.disabled); const next = (items.indexOf(document.activeElement) + (e.shiftKey ? -1 : 1) + items.length) % items.length; e.preventDefault(); items[next].focus(); }
  };
  close.onclick = () => { if (presented) book.click(); else dismiss(); }; document.addEventListener('keydown', keydown); close.focus();
  book.onclick = async () => {
    if (claiming || closed || book.disabled || !canClaim()) return;
    claiming = true; book.disabled = true; close.disabled = true;
    if (!presented) {
      root.classList.add('marc-taken');
      const r = book.getBoundingClientRect();
      await Promise.all([
        animate(book, [{ transform: 'translate(-50%,0) scale(1)' }, { transform: 'translate(-50%,-48%) scale(1.9)' }], 1300),
        onReveal?.(r.left + r.width / 2, r.top + r.height / 2),
      ]);
      if (closed) return;
      title.textContent = 'L’Évangile selon saint Marc';
      presented = true; root.classList.add('marc-presented');
      book.setAttribute('aria-label', 'Ranger l’Évangile selon saint Marc dans les objets');
      close.setAttribute('aria-label', 'Ranger le livre');
      claiming = false; book.disabled = false; close.disabled = false; book.focus();
      return;
    }
    if (onClaim() === false) { claiming = false; close.disabled = false; dismiss(); return; }
    const target = document.querySelector('#home-btn')?.getBoundingClientRect();
    const from = book.getBoundingClientRect(), dx = (target ? target.left + target.width / 2 : innerWidth / 2) - (from.left + from.width / 2), dy = (target ? target.top + target.height / 2 : 40) - (from.top + from.height / 2);
    await animate(book, [{ transform: 'translate(-50%,-48%) scale(1.9)', opacity: 1 }, { transform: `translate(calc(-50% + ${dx}px),calc(-48% + ${dy}px)) scale(.08)`, opacity: 0 }], 900);
    claiming = false; close.disabled = false; dismiss();
  };
  (async () => {
    try {
      const images = [...root.querySelectorAll('img')];
      await Promise.all(images.map(img => img.decode()));
      const chest = new Image(); chest.src = 'img/objets/coffre-masque.png'; await chest.decode();
      if (closed) return;
      await animate(root.querySelector('.marc-scene'), [{ transform: 'scale(.46)', opacity: .1 }, { transform: 'scale(1)', opacity: 1 }], 1000);
      await animate(key, [{ transform: 'translate(-50%,-50%) translate(-36%,-102%) scale(.8) rotate(-12deg)' }, { transform: 'translate(-50%,-50%) translate(-12%,-35%) scale(1.08) rotate(3deg)', offset: .65 }, { transform: 'translate(-50%,-50%) scale(1) rotate(0)' }], 2200);
      if (closed) return;
      root.classList.add('marc-locked'); title.textContent = '✧';
      await animate(root.querySelector('.marc-click'), [{ transform: 'translate(-50%,-50%) scale(.2)', opacity: 1 }, { transform: 'translate(-50%,-50%) scale(1.9)', opacity: 0 }], 750);
      await animate(key, [{ transform: 'translate(-50%,-50%) scale(1)' }, { transform: 'translate(-50%,-50%) scale(.95)', offset: .4 }, { transform: 'translate(-50%,-50%) scale(1)', opacity: 0 }], 550);
      if (closed) return;
      root.classList.add('marc-opened'); title.textContent = '';
      const r = book.getBoundingClientRect();
      await onOpen?.(r.left + r.width / 2, r.top + r.height / 2);
      if (closed) return;
      book.disabled = false; book.focus();
    } catch {
      if (!closed) { title.textContent = 'Le visuel n’a pas pu être chargé. Ferme puis réessaie.'; }
    }
  })();
  return dismiss;
}

// Draw invented, eroded pen strokes: no hidden readable text on ordinary pages.
function fadedManuscript(canvas) {
  canvas.width = 700; canvas.height = 1000;
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = '#57371d'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const rows = 17 + Math.floor(Math.random() * 6);
  for (let row = 0; row < rows; row++) {
    let x = 20 + Math.random() * 28, y = 40 + row * 880 / rows;
    const end = 530 + Math.random() * 130;
    while (x < end) {
      ctx.globalAlpha = .14 + Math.random() * .28;
      ctx.lineWidth = 1.3 + Math.random() * 1.8;
      const width = 7 + Math.random() * 15, rise = 8 + Math.random() * 20;
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + width * .6, y - rise, x - width * .4, y - rise * .9, x + width * .35, y + 4);
      ctx.bezierCurveTo(x + width * .7, y + 12, x + width * .75, y - rise * .6, x + width, y + (Math.random() - .5) * 6);
      ctx.stroke();
      if (Math.random() < .3) { ctx.beginPath(); ctx.moveTo(x + 2, y - 10); ctx.lineTo(x + width * .8, y - 15); ctx.stroke(); }
      x += width + (Math.random() < .2 ? 12 + Math.random() * 18 : 0);
    }
  }
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 26; i++) {
    ctx.globalAlpha = .35 + Math.random() * .65;
    ctx.beginPath(); ctx.ellipse(Math.random() * 700, Math.random() * 1000, 30 + Math.random() * 140, 8 + Math.random() * 28, Math.random(), 0, Math.PI * 2); ctx.fill();
  }
}

// Reading never consumes the book or modifies the player's progress.
export function openMarcBook({ onClose }) {
  const root = document.createElement('div');
  root.className = 'marc-magic marc-reading';
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'L’Évangile selon saint Marc');
  root.innerHTML = `<button type="button" class="marc-close" aria-label="Refermer le livre">×</button><div class="marc-volume"><div class="marc-inside-cover"></div><div class="marc-first-page"><div class="marc-inscription"><p>Ce livre est<br>la propriété de…</p><p class="marc-owner">Saint Marc</p></div></div><div class="marc-turning-cover" aria-hidden="true"><img src="img/objets/evangile-marc.png" alt=""></div></div><form class="marc-page-picker"><label for="marc-page-number">Aller à la page</label><input id="marc-page-number" name="page" type="number" inputmode="numeric" min="1" step="1" required placeholder="N°" aria-label="Numéro de page"><button type="submit" disabled>Aller</button></form><span class="marc-page-status" role="status" aria-live="polite"></span>`;
  const previous = document.activeElement;
  document.body.appendChild(root);
  const close = root.querySelector('.marc-close'), volume = root.querySelector('.marc-volume'), cover = root.querySelector('.marc-turning-cover');
  const form = root.querySelector('form'), input = form.querySelector('input'), submit = form.querySelector('button'), status = root.querySelector('.marc-page-status');
  const left = root.querySelector('.marc-inside-cover'), right = root.querySelector('.marc-first-page');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let closed = false, busy = true, currentPage = 1;
  const animations = new Set();
  const animate = async (el, frames, duration, delay = 0) => {
    if (closed) return;
    const a = el.animate(frames, {duration: reduced ? 1 : duration, delay: reduced ? 0 : delay, easing:'ease-in-out', fill:'forwards'}); animations.add(a);
    try { await a.finished; } catch {} finally { animations.delete(a); }
  };
  const dismiss = () => {
    if (closed) return;
    closed = true; animations.forEach(a => a.cancel()); root.remove(); document.removeEventListener('keydown', keydown); onClose(); if (previous?.isConnected) previous.focus();
  };
  const keydown = e => {
    if (e.key === 'Escape') dismiss();
    if (e.key === 'Tab') {
      const controls = [...root.querySelectorAll('button,input')].filter(el => !el.disabled);
      const next = (controls.indexOf(document.activeElement) + (e.shiftKey ? -1 : 1) + controls.length) % controls.length;
      e.preventDefault(); controls[next].focus();
    }
  };
  close.onclick = dismiss; document.addEventListener('keydown', keydown); close.focus();
  const renderPage = number => {
    root.classList.add('marc-inner-pages'); root.classList.toggle('marc-recipe-page', number === 694);
    if (number === 694) {
      left.innerHTML = `<div class="marc-recipe-ingredients"><h2>Croquettes<br>sacrées</h2><ul><li>Une olive</li><li>Une datte</li><li>Une gousse de févier</li><li>Une micocoule</li><li>Poudre de rubis</li></ul></div>`;
      right.innerHTML = `<div class="marc-recipe-directions"><p>Écraser les quatre fruits.</p><p>Mêler une pincée de poudre de rubis.</p><p>Façonner les croquettes sacrées.</p></div><span class="marc-folio">694</span>`;
    } else {
      left.innerHTML = '<canvas class="marc-faded-writing" role="img" aria-label="Écriture ancienne effacée et illisible"></canvas>';
      right.innerHTML = `<canvas class="marc-faded-writing" role="img" aria-label="Écriture ancienne effacée et illisible"></canvas><span class="marc-folio">${number}</span>`;
      for (const canvas of root.querySelectorAll('.marc-faded-writing')) fadedManuscript(canvas);
    }
    currentPage = number; root.dataset.page = String(number); status.textContent = `Page ${number}`;
  };
  const turnLeaf = async backwards => {
    const leaf = document.createElement('div'); leaf.className = 'marc-flipping-leaf'; leaf.setAttribute('aria-hidden','true');
    leaf.innerHTML = '<canvas class="marc-faded-writing"></canvas>'; fadedManuscript(leaf.firstElementChild); volume.appendChild(leaf);
    await animate(leaf, backwards ? [{transform:'rotateY(-170deg)'},{transform:'rotateY(0deg)'}] : [{transform:'rotateY(0deg)'},{transform:'rotateY(-170deg)'}], 220);
    leaf.remove();
  };
  input.oninput = () => input.setCustomValidity('');
  form.onsubmit = async e => {
    e.preventDefault(); if (busy || closed) return;
    const raw = input.value.trim(), number = Number(raw);
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(number) || number < 1) {
      input.setCustomValidity('Choisis un numéro de page entier supérieur à zéro.'); input.reportValidity(); return;
    }
    busy = true; input.blur(); input.disabled = true; submit.disabled = true; volume.setAttribute('aria-busy','true');
    const backwards = number < currentPage;
    await turnLeaf(backwards); if (closed) return;
    renderPage(number);
    await turnLeaf(backwards); if (closed) return;
    busy = false; input.disabled = false; submit.disabled = false; volume.removeAttribute('aria-busy');
  };
  (async () => {
    await Promise.all([
      animate(volume, [{transform:'scale(.5)',opacity:.1},{transform:'scale(1)',opacity:1}],650),
      animate(cover,[{transform:'rotateY(0deg)'},{transform:'rotateY(-168deg)'}],1500,250),
      animate(root.querySelector('.marc-inscription'),[{opacity:0},{opacity:1}],650,1150),
    ]);
    if (!closed) { cover.remove(); busy = false; submit.disabled = false; }
  })();
  return dismiss;
}
