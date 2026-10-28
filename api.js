// La version GitHub Pages utilise le même serveur de joueurs que le jeu principal.
export function apiURL(path) {
  const base = location.hostname === "francoislandais.github.io" ? "https://venise.tailda4c38.ts.net/" : document.baseURI;
  return new URL(path.replace(/^\//, ""), base).href;
}
export const apiFetch = (path, options = {}) => fetch(apiURL(path), { cache: "no-store", ...options });
