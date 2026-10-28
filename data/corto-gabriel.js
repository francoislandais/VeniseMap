// Formulations de Corto pour Gabriel. Les adaptations ne sont pas des citations littérales.
// Les références servent à conserver la provenance des images et des idées employées.
export const GABRIEL_MESSAGES = [
  {
    id: "rappel", text: "La mauvaise humeur ne résout rien, Gabriel. Retiens-le.",
    kind: "texte fourni", author: "François Landais", work: "Demande pour le jeu", quote: "", url: "",
  },
  {
    id: "cadeau", text: "Gabriel, la bonne humeur, c’est un cadeau qu’on peut offrir autour de soi. Un merci, un sourire… et l’aventure devient plus légère.",
    kind: "adaptation", author: "Alain", work: "Propos sur le bonheur, p. 234 (édition 1928)", quote: "Dites une bonne parole, un bon merci", url: "https://fr.wikisource.org/wiki/Page:Alain_-_Propos_sur_le_Bonheur_(ed._1928).djvu/242",
  },
  {
    id: "noeud", text: "Râler sur un nœud ne le défait pas, Gabriel. Souffle un peu : avec du calme, on trouve mieux le bout de la corde.",
    kind: "adaptation", author: "Alain", work: "Propos sur le bonheur, p. 234 (édition 1928)", quote: "il ne fallait pourtant qu’un sourire au bon moment", url: "https://fr.wikisource.org/wiki/Page:Alain_-_Propos_sur_le_Bonheur_(ed._1928).djvu/242",
  },
  {
    id: "patience", text: "« Patience et longueur de temps font plus que force ni que rage. » Gabriel, prends ton temps : on avancera mieux qu’en se fâchant.",
    kind: "citation et encouragement", author: "Jean de La Fontaine", work: "Le Lion et le Rat", quote: "Patience et longueur de temps / Font plus que force ni que rage.", url: "https://fr.wikisource.org/wiki/Fables_de_La_Fontaine_(éd._1874)/Le_Lion_et_le_Rat",
  },
  {
    id: "douceur", text: "« Plus fait douceur que violence », disait La Fontaine. Gabriel, essaie une parole douce : elle peut aller plus loin qu’un éclat de colère.",
    kind: "citation et encouragement", author: "Jean de La Fontaine", work: "Phébus et Borée", quote: "Plus fait douceur que violence.", url: "https://fr.wikisource.org/wiki/Fables_de_La_Fontaine_(éd._1874)/Phébus_et_Borée",
  },
  {
    id: "rire", text: "« Rire est le propre de l’homme », écrivait Rabelais. Gabriel, tu m’offres un petit sourire ? Même les lions de Venise en seraient ravis !",
    kind: "citation modernisée et encouragement", author: "François Rabelais", work: "Gargantua, Aux Lecteurs", quote: "rire eſt le propre de l’homme", url: "https://fr.wikisource.org/wiki/Gargantua/Édition_Marty-Laveaux,_1868/Aux_Lecteurs",
  },
  {
    id: "figaro", text: "Figaro disait : « Je me presse de rire de tout, de peur d’être obligé d’en pleurer. » Gabriel, faisons une petite place au rire dans notre aventure.",
    kind: "citation et encouragement", author: "Beaumarchais", work: "Le Barbier de Séville, acte I, scène II", quote: "Je me presse de rire de tout, de peur d’être obligé d’en pleurer.", url: "https://fr.wikisource.org/wiki/Le_Barbier_de_Séville/Texte_entier",
  },
  {
    id: "sagesse", text: "Gabriel, Montaigne associait la sagesse à la joie. On peut réfléchir très fort et garder le sourire !",
    kind: "adaptation", author: "Michel de Montaigne", work: "Essais, livre I, chapitre XXVI", quote: "La plus expresse marque de la sagesse, c’est une esjouïssance constante", url: "https://fr.wikisource.org/wiki/Essais/Livre_I/Texte_entier",
  },
  {
    id: "reponse-paisible", text: "Gabriel, une réponse paisible peut calmer une colère. Prends une respiration et choisis un mot gentil : c’est déjà un nouveau départ.",
    kind: "adaptation", author: "Livre des Proverbes", work: "Proverbes 15, 1 · traduction AELF", quote: "Une réponse paisible calme la fureur", url: "https://www.aelf.org/bible/Pr/15",
  },
  {
    id: "coeur-joyeux", text: "« Un cœur joyeux est un bon remède. » Gabriel, cherchons une petite chose qui te fait plaisir ici, juste maintenant.",
    kind: "citation et encouragement", author: "Livre des Proverbes", work: "Proverbes 17, 22 · traduction Louis Segond, 1910", quote: "Un cœur joyeux est un bon remède", url: "https://fr.wikisource.org/wiki/Bible_Segond_1910/Proverbes",
  },
  {
    id: "beau-temps", text: "« Après la pluie, le beau temps », Gabriel. Ta mauvaise humeur aussi peut passer. Prends une respiration, je t’attends pour la suite de l’aventure.",
    kind: "proverbe et encouragement", author: "Proverbe français", work: "Dictionnaire de l’Académie française, entrée pluie", quote: "Après la pluie, le beau temps", url: "https://www.dictionnaire-academie.fr/article/A9P2948",
  },
  {
    id: "regard-lumineux", text: "Gabriel, un regard lumineux peut réchauffer le cœur de quelqu’un. Et si on partageait une belle découverte, plutôt qu’un grognement ?",
    kind: "adaptation", author: "Livre des Proverbes", work: "Proverbes 15, 30 · traduction AELF", quote: "Un regard lumineux réjouit le cœur", url: "https://www.aelf.org/bible/Pr/15",
  },
];

export function isGabriel(name) {
  return String(name || "").normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().split(/[\s-]+/)[0].toLocaleLowerCase("fr") === "gabriel";
}

// Un paquet mélangé : tous les messages passent avant de recommencer, sans doublon entre deux paquets.
export function createGabrielMessages(random = Math.random) {
  let remaining = [], previous = null;
  return () => {
    if (!remaining.length) {
      remaining = GABRIEL_MESSAGES.slice();
      for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
      }
      if (remaining.at(-1).id === previous) [remaining[0], remaining[remaining.length - 1]] = [remaining.at(-1), remaining[0]];
    }
    const message = remaining.pop(); previous = message.id;
    return message.text;
  };
}
