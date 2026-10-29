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
