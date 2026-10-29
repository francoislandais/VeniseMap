// The approved sheet is kept intact: each sprite displays one half through CSS.
export function openMarcChest({ canClaim, onClaim, onClose }) {
  const root = document.createElement('div');
  root.className = 'marc-magic'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', 'Le coffre au masque d’or');
  root.innerHTML = `<button type="button" class="marc-close" aria-label="Fermer">×</button><div class="marc-scene"><div class="marc-aura"></div><div class="marc-chest-sprite marc-large"></div><div class="marc-chest-sprite marc-open marc-open-back"></div><button type="button" class="marc-book" aria-label="Prendre l’Évangile selon saint Marc" disabled><img src="img/objets/evangile-marc.png" alt="L’Évangile selon saint Marc"></button><div class="marc-chest-sprite marc-open marc-front"></div><img class="marc-key" src="img/objets/masque-or.webp" alt="Le masque d’or"><div class="marc-click" aria-hidden="true"></div><div class="marc-stars" aria-hidden="true">${Array.from({length: 18}, (_, i) => `<i style="--i:${i}">✦</i>`).join('')}</div></div><p class="marc-title" role="status" aria-live="polite"></p>`;
  document.body.appendChild(root);
  const previous = document.activeElement, close = root.querySelector('.marc-close'), key = root.querySelector('.marc-key'), book = root.querySelector('.marc-book'), title = root.querySelector('.marc-title');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let closed = false, claiming = false;
  const animations = new Set();
  const animate = async (el, frames, duration, easing = 'ease-in-out') => {
    if (closed) return;
    const a = el.animate(frames, { duration: reduced ? 80 : duration, easing, fill: 'forwards' }); animations.add(a);
    try { await a.finished; } catch {} finally { animations.delete(a); }
  };
  const dismiss = () => {
    if (closed || claiming) return;
    closed = true; for (const a of animations) a.cancel(); root.remove(); document.removeEventListener('keydown', keydown); onClose(); previous?.isConnected && previous.focus();
  };
  const keydown = e => {
    if (e.key === 'Escape') dismiss();
    if (e.key === 'Tab') { const items = [close, book].filter(el => !el.disabled); const next = (items.indexOf(document.activeElement) + (e.shiftKey ? -1 : 1) + items.length) % items.length; e.preventDefault(); items[next].focus(); }
  };
  close.onclick = dismiss; document.addEventListener('keydown', keydown); close.focus();
  book.onclick = async () => {
    if (claiming || closed || book.disabled || !canClaim()) return;
    claiming = true; book.disabled = true; close.disabled = true;
    root.classList.add('marc-taken');
    await animate(book, [{ transform: 'translate(-50%,0) scale(1)' }, { transform: 'translate(-50%,-48%) scale(1.9)' }], 1300);
    if (closed) return;
    if (onClaim() === false) { claiming = false; close.disabled = false; dismiss(); return; }
    title.textContent = 'L’Évangile selon saint Marc';
    await animate(book, [{ filter: 'drop-shadow(0 0 12px #ffdf8b)' }, { filter: 'drop-shadow(0 0 38px #fff0ad)' }, { filter: 'drop-shadow(0 0 12px #ffdf8b)' }], 1300);
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
      root.classList.add('marc-opened'); title.textContent = ''; book.disabled = false; book.focus();
    } catch {
      if (!closed) { title.textContent = 'Le visuel n’a pas pu être chargé. Ferme puis réessaie.'; }
    }
  })();
  return dismiss;
}
