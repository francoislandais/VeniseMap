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

// First recto: real selectable text remains sharp and accessible at every size.
export function openMarcBook({ onClose }) {
  const root = document.createElement('div');
  root.className = 'marc-magic marc-reading';
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Première page de l’Évangile selon saint Marc');
  root.innerHTML = `<button type="button" class="marc-close" aria-label="Refermer le livre">×</button><div class="marc-volume"><div class="marc-inside-cover"></div><div class="marc-first-page"><div class="marc-inscription"><p>Ce livre est<br>la propriété de…</p><p class="marc-owner">Saint Marc</p></div></div><div class="marc-turning-cover" aria-hidden="true"><img src="img/objets/evangile-marc.png" alt=""></div></div>`;
  const previous = document.activeElement;
  document.body.appendChild(root);
  const close = root.querySelector('.marc-close'), volume = root.querySelector('.marc-volume'), cover = root.querySelector('.marc-turning-cover');
  let closed = false; const animations = [];
  const dismiss = () => {
    if (closed) return;
    closed = true; animations.forEach(a => a.cancel()); root.remove(); document.removeEventListener('keydown', keydown); onClose(); if (previous?.isConnected) previous.focus();
  };
  const keydown = e => { if (e.key === 'Escape') dismiss(); if (e.key === 'Tab') { e.preventDefault(); close.focus(); } };
  close.onclick = dismiss; document.addEventListener('keydown', keydown); close.focus();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const duration = reduced ? 1 : 1500;
  animations.push(volume.animate([{ transform: 'scale(.5)', opacity: .1 }, { transform: 'scale(1)', opacity: 1 }], { duration: reduced ? 1 : 650, easing: 'ease-out', fill: 'forwards' }));
  animations.push(cover.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-168deg)' }], { duration, delay: reduced ? 0 : 250, easing: 'cubic-bezier(.2,.6,.25,1)', fill: 'forwards' }));
  root.querySelector('.marc-inscription').animate([{ opacity: 0 }, { opacity: 1 }], { duration: reduced ? 1 : 650, delay: reduced ? 0 : 1150, fill: 'both' });
  return dismiss;
}
