import { PLACES, LEVELS } from "/data.js";
const OPEN_PREVIEW = new URLSearchParams(location.search).get("open-preview") === "1";
const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const headers = () => ({ "Content-Type": "application/json", "X-Player": "p-00000000000000000000000000000000", "X-League": "1234" });
const OBJECTS = [
  ["frari","La coquille d’or"],["miracoli","La perle du miracle"],["basilique","La plume de l’évangéliste"],
  ["coffre-code","Le coffret à code"],["parchemin","Le parchemin déchiré"],["partition","La partition oubliée"],
  ["cle-bronze","La clé de bronze"],["fiole-lagune","La fiole de lagune"],["verre-murano","La goutte de Murano"],
  ["boussole","La boussole de poche"],["masque","Le masque miniature"],["sceau-lion","Le sceau du lion"],
  ["diamant","Le diamant de la lagune"],["ruban-soie","Le ruban de soie"],["lanterne","La lanterne secrète"]
];
const chain = (step) => [step, ...(step.next || [])];
PLACES.forEach((place) => {
  if (!place.chapters) return;
  const used = new Set(place.chapters.flatMap((chapter) => chapter.steps.flatMap(chain)).map((step) => step.idx));
  let next = 0;
  place.chapters.forEach((chapter) => chapter.steps.forEach((step) => { if (!step.pending) chain(step).forEach((part) => { if (part.idx == null) { while (used.has(next)) next++; part.idx = next++; } }); }));
  place.tasks = place.chapters.flatMap((chapter) => chapter.steps.filter((step) => !step.pending)).flatMap(chain).map((step) => ({ q: step.q, idx: step.idx }));
});
const TASKS = PLACES.flatMap((place) => (place.tasks || []).map((task, i) => ({ key: `t:${place.id}:${task.idx ?? i}`, label: `${place.name} · Épreuve ${i + 1}${task.q ? ` · ${String(task.q).replace(/<[^>]*>/g, "").slice(0, 55)}` : ""}` })));
let players = [], rewards = {}, items = [], installPrompt = null;
async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: headers(), credentials: "same-origin" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Erreur ${response.status}`);
  return data;
}
function grade(points) { let current = LEVELS[0]; for (const level of LEVELS) if (points >= level.min) current = level; return current.name; }
function renderPlayers() {
  $("#players").innerHTML = players.length ? players.map((player) => `<div class="player-row"><span class="player-avatar">${esc(player.avatar)}</span><span class="player-name">${esc(player.name)}<small class="player-meta">${esc(grade(player.points))}</small></span><span class="player-points">⭐ ${Number(player.points) || 0}</span><button class="secondary reset-button" type="button" data-reset="${esc(player.id)}" aria-label="Réinitialiser ${esc(player.name)}">Recommencer</button><button class="danger" type="button" data-delete="${esc(player.id)}" aria-label="Supprimer ${esc(player.name)}">Supprimer</button></div>`).join("") : '<p>Aucun joueur enregistré.</p>';
  document.querySelectorAll("[data-reset]").forEach((button) => button.onclick = async () => {
    const player = players.find((entry) => entry.id === button.dataset.reset); if (!player) return;
    if (!confirm(`Remettre le score et les épreuves de ${player.name} à zéro ? Ses photos seront effacées sur son appareil lors de sa prochaine synchronisation.`)) return;
    button.disabled = true;
    try { const data = await api("/api/admin/player/reset", { method: "POST", body: JSON.stringify({ playerId: player.id }) }); players = data.players; renderAll(); }
    catch (error) { button.disabled = false; alert(`Réinitialisation impossible : ${error.message}`); }
  });
  document.querySelectorAll("[data-delete]").forEach((button) => button.onclick = async () => {
    const player = players.find((entry) => entry.id === button.dataset.delete); if (!player) return;
    if (!confirm(`Supprimer ${player.name} et son score ? Cette suppression est définitive.`)) return;
    button.disabled = true;
    try { const data = await api("/api/admin/player/delete", { method: "POST", body: JSON.stringify({ playerId: player.id }) }); players = data.players; delete rewards[player.id]; renderAll(); }
    catch (error) { button.disabled = false; alert(`Suppression impossible : ${error.message}`); }
  });
}
function renderRewardSelectors() {
  const playerSelect = $("#reward-player"), itemSelect = $("#reward-item"), oldPlayer = playerSelect.value, oldItem = itemSelect.value;
  playerSelect.innerHTML = players.map((player) => `<option value="${esc(player.id)}">${esc(player.name)} · ⭐ ${player.points}</option>`).join("");
  itemSelect.innerHTML = items.map((item) => `<option value="${esc(item.id)}">${esc(item.name)}</option>`).join("");
  if (players.some((player) => player.id === oldPlayer)) playerSelect.value = oldPlayer;
  if (items.some((item) => item.id === oldItem)) itemSelect.value = oldItem;
  renderRewardTarget();
}
function renderRewardTarget() {
  const player = $("#reward-player").value, item = $("#reward-item").value, target = rewards[player]?.[item] || "default";
  const hasOriginal = item.startsWith("music:") || ["object:frari", "object:miracoli", "object:basilique"].includes(item);
  $("#reward-target").innerHTML = `<option value="default">${hasOriginal ? "Emplacement prévu dans le jeu" : "Pas encore placé"}</option><option value="none">Ne pas placer</option>${TASKS.map((task) => `<option value="${esc(task.key)}">${esc(task.label)}</option>`).join("")}`;
  $("#reward-target").value = target;
  $("#reward-summary").innerHTML = items.map((entry) => { const current = rewards[player]?.[entry.id]; const label = current === "none" ? "Non placé" : current ? TASKS.find((task) => task.key === current)?.label || current : entry.id.startsWith("music:") || ["object:frari", "object:miracoli", "object:basilique"].includes(entry.id) ? "Emplacement prévu" : "Pas encore placé"; return `<div class="reward-row"><b>${esc(entry.name)}</b><span>${esc(label)}</span></div>`; }).join("");
}
function renderAll() { renderPlayers(); renderRewardSelectors(); }
async function showDashboard(data) {
  players = data.players || []; rewards = data.rewards || {};
  $("#login").hidden = true; $("#dashboard").hidden = false;
  try { const response = await fetch("/data/music-challenges.json"); const fragments = await response.json(); items = [...fragments.map((item) => ({ id: `music:${item.id}`, name: `🎼 ${item.title || "Fragment de partition"}` })), ...OBJECTS.map(([id, name]) => ({ id: `object:${id}`, name: `🎁 ${name}` }))]; }
  catch { items = OBJECTS.map(([id, name]) => ({ id: `object:${id}`, name: `🎁 ${name}` })); }
  renderAll();
}
$("#login-form").onsubmit = async (event) => {
  event.preventDefault(); const pin = $("#pin").value.trim(), button = $("#login-form button");
  if (!/^[0-9]{4}$/.test(pin)) return;
  button.disabled = true; $("#login-error").hidden = true;
  try { const data = await api("/api/admin/unlock", { method: "POST", body: JSON.stringify({ code: pin }) }); $("#pin").value = ""; await showDashboard(data); if (OPEN_PREVIEW) location.replace("./preview.html"); }
  catch (error) { $("#login-error").textContent = error.message === "code incorrect" ? "Code incorrect." : `Accès indisponible : ${error.message}`; $("#login-error").hidden = false; }
  finally { button.disabled = false; }
};
$("#refresh").onclick = async () => { try { await showDashboard(await api("/api/admin/session")); } catch { $("#dashboard").hidden = true; $("#login").hidden = false; } };
$("#reward-player").onchange = renderRewardTarget;
$("#reward-item").onchange = renderRewardTarget;
$("#reward-form").onsubmit = async (event) => {
  event.preventDefault(); const playerId = $("#reward-player").value, reward = $("#reward-item").value, target = $("#reward-target").value, button = $("#reward-form button");
  if (!playerId || !reward) return;
  button.disabled = true; $("#reward-status").textContent = "Enregistrement…";
  try { const data = await api("/api/admin/reward", { method: "POST", body: JSON.stringify({ playerId, reward, target }) }); rewards[playerId] = data.placements; renderRewardTarget(); $("#reward-status").textContent = "Cachette enregistrée sur le serveur."; }
  catch (error) { $("#reward-status").textContent = `Échec : ${error.message}`; }
  finally { button.disabled = false; }
};
addEventListener("beforeinstallprompt", (event) => { event.preventDefault(); installPrompt = event; $("#install").hidden = false; });
$("#install").onclick = async () => { if (!installPrompt) return; installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; $("#install").hidden = true; };
$("#install-help").textContent = /iPhone|iPad|iPod/.test(navigator.userAgent) ? "Sur iPhone ou iPad : dans Safari, touche Partager puis « Sur l’écran d’accueil »." : "Si le bouton d’installation n’apparaît pas, utilise « Installer l’application » dans le menu du navigateur.";
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
api("/api/admin/session").then(async (data) => { await showDashboard(data); if (OPEN_PREVIEW) location.replace("./preview.html"); }).catch(() => { $("#login").hidden = false; $("#dashboard").hidden = true; });
