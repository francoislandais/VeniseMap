const ART = 'img/narrative/';
const OBJECT = 'img/objets/';
const PANELS = [
  { text: 'Par tous les trésors de Venise, quel lion majestueux t’accompagne !', art: 1 },
  { text: 'Comment un tel miracle a-t-il pu se produire ?', art: 1, action: 'Lui raconter mon secret' },
  { speaker: 'Toi', text: 'Saint Marc lui-même m’a révélé le plat préféré de son lion.', art: 2 },
  { text: 'Saint Marc, le patron de Venise, t’a parlé en personne ?', art: 2, action: 'Oui, c’est bien lui !' },
  { text: 'Alors, jeune ami, je suis ton serviteur.', art: 2 },
  { text: 'Dis-moi ce que je peux faire pour toi.', art: 3, action: 'Lui parler de ma quête' },
  { speaker: 'Toi', text: 'Je suis à la recherche de la viole de Monteverdi.', art: 3 },
  { text: 'Prends ce vieux coffre que j’ai sauvé des eaux le soir de la tempête.', art: 4, chest: true },
  { text: 'La viole est à l’intérieur.', art: 4, chest: true },
  { text: 'Je n’ai jamais trouvé la clé pour l’ouvrir.', art: 4, chest: true },
  { text: 'Ce trésor est désormais entre tes mains.', art: 1, chest: true, action: 'Prendre le coffre', claim: true },
];

let currentDogeScene = null;
function createScene(label, onClose) {
  if (currentDogeScene) return null;
  const previous = document.activeElement;
  const root = document.createElement('div');
  root.className = 'corto-rendezvous doge-finale'; root.tabIndex = -1;
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', label);
  root.innerHTML = '<img class="df-painting" alt=""><div class="gr-shade"></div><div class="df-content"></div><button type="button" class="cr-close" aria-label="Fermer">×</button>';
  const timers = new Set(); let closed = false;
  const later = (callback, delay) => { const id = setTimeout(() => { timers.delete(id); if (!closed) callback(); }, delay); timers.add(id); };
  const close = () => {
    if (closed) return; closed = true; timers.forEach(clearTimeout); root.remove();
    document.removeEventListener('keydown', keyboard); currentDogeScene = null;
    onClose?.(); if (previous?.isConnected) previous.focus();
  };
  const keyboard = (event) => {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
    if (event.key === 'Tab') {
      const buttons = [...root.querySelectorAll('button:not(:disabled)')].filter(button => !button.hidden);
      if (!buttons.length) return;
      const index = buttons.indexOf(document.activeElement);
      buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus(); event.preventDefault();
    }
  };
  root.querySelector('.cr-close').onclick = close;
  document.addEventListener('keydown', keyboard);
  currentDogeScene = root; document.body.appendChild(root); root.focus();
  return { root, content: root.querySelector('.df-content'), painting: root.querySelector('.df-painting'), close, later };
}

export function openDogeFinale({ onClaimChest, hasChest = false, onClose } = {}) {
  const scene = createScene('Le doge et le lion de saint Marc', onClose); if (!scene) return;
  let index = 0, stopTyping = () => {}, typing = false;
  const show = () => {
    stopTyping();
    const panel = PANELS[index];
    scene.root.classList.toggle('df-has-chest', !!panel.chest);
    scene.painting.src = `${ART}venise-lavis-0${panel.art}.png`;
    scene.content.innerHTML = `<div class="df-portrait"><img src="img/doge-big-happy.webp" alt="Le doge impressionné">${index < 5 ? '<img class="df-lion" src="img/lion-avatar.webp" alt="Le lion de saint Marc">' : ''}</div><div class="df-dialogue"><small class="df-speaker"></small><p class="gr-copy df-copy" aria-live="polite"></p><div class="df-artifact"></div><button type="button" class="gr-trade-open df-action"></button><small class="df-tap"></small></div><button type="button" class="cr-prev" ${index ? '' : 'hidden'}>‹ Précédent</button>`;
    scene.content.querySelector('.df-speaker').textContent = panel.speaker || 'Le doge';
    const copy = scene.content.querySelector('.df-copy'), action = scene.content.querySelector('.df-action');
    if (panel.chest) scene.content.querySelector('.df-artifact').innerHTML = `<img src="${OBJECT}coffre-doge-ferme.png" alt="Le vieux coffre sauvé des eaux">`;
    action.textContent = panel.claim && hasChest ? 'Revenir à la carte' : panel.action || 'Continuer';
    action.hidden = !panel.action;
    scene.content.querySelector('.df-tap').textContent = panel.action ? '' : 'Touche le panneau pour continuer';
    let interval = null, count = 0; const chars = Array.from(panel.text);
    const finish = () => { clearInterval(interval); copy.textContent = panel.text; typing = false; };
    stopTyping = finish; typing = true; copy.setAttribute('aria-label', panel.text);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) finish();
    else interval = setInterval(() => { if (!scene.root.isConnected) { clearInterval(interval); return; } copy.textContent = chars.slice(0, ++count).join(''); if (count >= chars.length) finish(); }, 24);
    const advance = () => {
      finish();
      if (panel.claim) { if (hasChest || onClaimChest?.() !== false) scene.close(); }
      else { index++; show(); }
    };
    scene.content.onclick = event => { if (event.target.closest('button')) return; if (typing) finish(); else if (!panel.action) advance(); };
    action.onclick = advance;
    scene.content.querySelector('.cr-prev').onclick = () => { if (index) { index--; show(); } };
  };
  const originalClose = scene.close;
  scene.root.querySelector('.cr-close').onclick = () => { stopTyping(); originalClose(); };
  show();
}

export function openDogeChest({ onClaim, onReward, onClose } = {}) {
  const scene = createScene('Le coffre de la viole de Monteverdi', onClose); if (!scene) return;
  scene.root.classList.add('df-unlocking');
  scene.painting.src = ART + 'venise-lavis-04.png';
  scene.content.innerHTML = `<div class="df-chest-stage"><img class="df-chest-closed" src="${OBJECT}coffre-doge-ferme.png" alt="Vieux coffre fermé"><img class="df-chest-open" src="${OBJECT}coffre-doge-ouvert.png" alt="Le coffre ouvert"><img class="df-gold-key" src="${ART}gondolier-gold-key.png" alt="La clé d’or"><button type="button" class="df-viola" disabled aria-label="Ranger la viole de Monteverdi dans mes objets"><img src="${OBJECT}viole-monteverdi.png" alt="La viole de Monteverdi révélée"></button></div><div class="df-reveal-copy"><p class="gr-copy" role="status">La clé d’or tourne dans la serrure…</p><button type="button" class="gr-trade-open df-claim" hidden>Prendre la viole</button></div>`;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  scene.later(() => scene.root.classList.add('df-chest-is-open'), reduced ? 60 : 1500);
  let rewardStarted = false;
  scene.later(async () => {
    if (rewardStarted) return; rewardStarted = true;
    scene.root.classList.add('df-viola-revealed');
    const copy = scene.content.querySelector('.gr-copy'), viola = scene.content.querySelector('.df-viola'), claimButton = scene.content.querySelector('.df-claim');
    copy.textContent = 'Le coffre jaillit d’étoiles, dans un immense feu d’artifice !';
    const chest = scene.content.querySelector('.df-chest-open'), box = chest.getBoundingClientRect();
    try {
      const earned = await onReward?.(box.left + box.width / 2, box.top + box.height * .55);
      if (!scene.root.isConnected) return;
      copy.textContent = earned === false ? 'La viole est là… et les étoiles dorées sont déjà dans ta collection !' : 'La viole est retrouvée ! Tu gagnes 500 étoiles !';
    } catch (error) {
      console.error('La pluie d’étoiles du coffre a été interrompue.', error);
      if (!scene.root.isConnected) return;
      copy.textContent = 'La viole de Monteverdi est retrouvée !';
    }
    viola.disabled = false;
    claimButton.hidden = false;
  }, reduced ? 120 : 2900);
  let claiming = false;
  const claim = () => {
    if (claiming) return; claiming = true;
    if (onClaim?.() === false) { claiming = false; return; }
    scene.close();
  };
  scene.content.querySelector('.df-viola').onclick = claim;
  scene.content.querySelector('.df-claim').onclick = claim;
}
