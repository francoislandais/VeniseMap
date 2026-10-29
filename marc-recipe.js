export function openSacredCroquette({ onClaim, onClose, ingredients = [] }) {
  const root = document.createElement("div");
  root.className = "croquette-ritual";
  root.setAttribute("role", "dialog"); root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-label", "Préparation des croquettes sacrées");
  root.innerHTML = `<div class="croquette-stars" aria-hidden="true">${Array.from({ length: 18 }, (_, i) => `<i style="--i:${i}">✦</i>`).join("")}</div><div class="croquette-mix-items" aria-hidden="true">${ingredients.map((item, i) => `<span style="--i:${i}"><img src="${item.img}" alt=""></span>`).join("")}</div><p class="croquette-caption">Les ingrédients tourbillonnent…</p><button type="button" class="croquette-reveal" disabled aria-label="Ranger la croquette sacrée dans les objets"><img src="img/objets/croquette-sacree.svg" alt="Croquette sacrée dorée"><span>Une croquette sacrée !<small>Touche-la pour la ranger dans tes objets</small></span></button>`;
  document.body.appendChild(root);
  const button = root.querySelector(".croquette-reveal"), caption = root.querySelector(".croquette-caption");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const reveal = () => {
    if (!root.isConnected) return;
    root.classList.add("revealed"); caption.textContent = "La croquette sacrée est prête !"; button.disabled = false;
  };
  const timer = setTimeout(reveal, reduced ? 80 : 2600);
  const close = () => { clearTimeout(timer); root.remove(); onClose?.(); };
  button.onclick = () => { if (button.disabled) return; button.disabled = true; onClaim(); close(); };
  return close;
}
