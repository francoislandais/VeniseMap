// Rencontre de saint Marc après le quiz d'identité.
export const ST_MARC_QUIZ = {
  q: "Sais-tu qui je suis ?",
  opts: [
    { t: "Saint Marc, le protecteur de Venise", ok: 1 },
    { t: "Saint Pierre" },
    { t: "Le doge de Venise" },
  ],
  good: "Oui, je suis saint Marc.",
  bad: "Tu ne reconnais même pas le protecteur de Venise ?!",
};

export const ST_MARC_BOOK = {
  ask: "As-tu mon livre, l’Évangile que j’ai écrit ? Je n’arrive plus à remettre la main dessus.",
  missing: "Prends mon livre dans tes objets, garde-le en main sur la carte, puis reviens me voir.",
  offer: "Glisse le livre que tu tiens sur ma tête.",
  thanks: "Merci de tout cœur ! Tu peux garder mon livre encore un peu. Va voir à la page 694.",
  again: "Merci encore pour mon livre ! N’oublie pas la page 694.",
};

export const ST_MARC_CROQUETTE = {
  prompt: "La recette de la page 694 demande quatre fruits et une pincée de poudre de rubis. Dépose-les ensemble dans la zone de mélange.",
  thanks: "Fantastique ! Tu as concocté la merveilleuse recette des croquettes sacrées. C’est mon lion qui va être ravi. Je l’appelle tout de suite : il restera avec toi jusqu’à ton départ de Venise. Bravo !",
  missing: "La recette attend une olive, une datte, une gousse de févier, une micocoule et le rubis de Burano.",
};
