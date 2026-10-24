// Contenu du jeu : « Le Livre du Lion » — escape game à Venise pour 5-9 ans.
// Coordonnées recoupées avec OpenStreetMap / Wikipédia (±20 m) : le bouton « maintenir 2 s » permet de valider sans GPS.

export const STORY = {
  title: "Le Livre du Lion",
  captain: { name: "Corto Maltese", emoji: "🧢" },
  intro: [
    "Cette nuit, le Lion ailé de la place Saint-Marc s'est réveillé en pleurant : son grand livre est VIDE !",
    "Ses pages se sont envolées dans la lagune, emportées par le vent. Il faut les retrouver, une aventure après l'autre.",
    "Un marin mystérieux, Corto Maltese, casquette enfoncée et boucle d'oreille en or, vous a laissé un message : « Explorez Venise, relevez mes défis : chaque merveille que vous découvrirez rendra des images au livre. Quand vous aurez assez voyagé, la Corte Sconta, la cour cachée où dort le trésor, s'ouvrira. »",
    "Vous êtes les nouveaux Gardiens du Lion. Prenez votre temps, à votre rythme. En route !",
  ],
  finale: [
    "Vous avez tant exploré que le mot de passe vous est revenu : le vrai nom de la ville, « VENEZIA ».",
    "La porte de la Corte Sconta s'ouvre en grinçant. Au fond de la cour secrète, le Lion ailé attend, son livre est de nouveau plein d'images : les vôtres.",
    "Corto Maltese ajuste sa casquette, sourit, et disparaît dans la brume. « Les vrais trésors, ce sont les aventures qu'on a vécues. Arrivederci, Gardiens ! »",
  ],
  finalWord: "VENEZIA",
};

export const LEVELS = [
  { min: 0, name: "Jeune mousse", emoji: "⚓" }, // au départ : rien, juste soi-même (pas d'uniforme)
  { min: 40, name: "Mousse", emoji: "🪢" },
  { min: 180, name: "Marin", emoji: "⛵" },
  { min: 550, name: "Capitaine", emoji: "🏴‍☠️" },
  { min: 1300, name: "Amiral", emoji: "👑" },
];

// Collections libres, à cocher à tout moment (+3 points chacune)
export const COLLECTIONS = [
  { id: "lion", emoji: "🦁", name: "Lions ailés repérés", target: 10 },
  { id: "gondole", emoji: "⛵", name: "Gondoles croisées", target: 10 },
  { id: "bateau", emoji: "🚤", name: "Trajets en bateau-bus", target: 5 },
  { id: "gelato", emoji: "🍦", name: "Glaces dégustées", target: 7 },
  { id: "chat", emoji: "🐈", name: "Chats de Venise", target: 8 },
  { id: "masque", emoji: "🎭", name: "Masques vus", target: 6 },
  { id: "puits", emoji: "⛲", name: "Puits de pierre dans les campi", target: 5 },
  { id: "travail", emoji: "🚑", name: "Bateaux de travail (pompiers, poubelle, livraison…)", target: 5 },
  { id: "pigeon", emoji: "🕊️", name: "Pigeons salués", target: 5 },
];

export const AVATARS = ["🦁", "🐙", "🦊", "🐬", "🦄", "🐢", "🦉", "🐸", "🐼", "🦀", "🐝", "🦋"];

// t: 'choice' (q, opts, a, fact) | 'count' (q, a|null) | 'do' (q) | 'word' (finale)
export const PLACES = [
  // ─── JOUR 1 : le cœur de Venise ───
  { id: "basilique", emoji: "⛪", name: "La basilique d'or", lat: 45.43455, lon: 12.33982, r: 70,
    story: "Regarde le plafond et les murs : des millions de petits morceaux de verre doré brillent comme un trésor de pirates !",
    clue: "Le Lion garde son or là-haut. Lève les yeux, petit marin : l'or ne se cache jamais par terre.",
    reward: {"point": "E", "emoji": "🪶", "name": "La plume de l'évangéliste", "at": [0.463, 0.2], "hint": "La grande croix de l'iconostase a quelque chose pour toi."},
    plan: {
      "img": "img/plan/basilique.webp",
      "w": 1369,
      "h": 1563,
      "title": "Basilique Saint-Marc",
      "sub": "plan schématique",
      "points": [
        {
          "id": "A",
          "n": "Sol",
          "x": 31.96,
          "y": 83.7,
          "title": "La coupole de la Genèse",
          "sub": "Coupole au plafond",
          "text": "Ses scènes disposées en cercles racontent les débuts du monde selon la Genèse. Le parcours officiel fait passer sous cette coupole avant d’entrer dans la grande église.",
          "where": "Atrium, après la porte Saint-Pierre",
          "img": "img/plan/basilique-A.webp",
          "credit": "Image : Web Gallery of Art · Public domain"
        },
        {
          "id": "B",
          "n": "Sol",
          "x": 42.95,
          "y": 61.01,
          "title": "La coupole de la Pentecôte",
          "sub": "Coupole au plafond",
          "text": "Cette coupole appartient à la série des grandes coupoles de Saint-Marc. Ses mosaïques représentent la Pentecôte, épisode où l’Esprit saint descend sur les apôtres.",
          "where": "Bras occidental de la nef",
          "img": "img/plan/basilique-B.webp",
          "credit": "Image : Zairon · CC BY-SA 4.0"
        },
        {
          "id": "C",
          "n": "Sol",
          "x": 42.95,
          "y": 35.79,
          "title": "La coupole de l’Ascension",
          "sub": "Coupole au plafond",
          "text": "Placée au croisement des bras de la basilique, elle montre l’Ascension du Christ. Sa position centrale aide à comprendre le plan en croix grecque.",
          "where": "Croisée, au centre de l’église",
          "img": "img/plan/basilique-C.webp",
          "credit": "Image : Tango7174 · CC BY-SA 4.0"
        },
        {
          "id": "D",
          "n": "Sol",
          "x": 54.29,
          "y": 42.82,
          "title": "La mosaïque de la Cène",
          "sub": "Mosaïque au plafond",
          "text": "La scène du dernier repas du Christ se trouve dans la voûte méridionale liée à la coupole centrale. Sur la photographie, elle apparaît à gauche parmi d’autres mosaïques.",
          "where": "Voûte sud, près de la croisée",
          "img": "img/plan/basilique-D.webp",
          "credit": "Image : Dennis G. Jarvis · CC BY-SA 2.0"
        },
        {
          "id": "E",
          "n": "Sol",
          "x": 42.95,
          "y": 28.07,
          "title": "L’iconostase",
          "sub": "Sculpture",
          "text": "Cette clôture sculptée sépare la nef du presbytérium. Les quatorze figures de marbre représentent les apôtres, la Vierge et saint Marc ; l’ensemble est signé par les frères dalle Masegne.",
          "where": "À l’entrée du presbytérium",
          "img": "img/plan/basilique-E.webp",
          "credit": "Image : Giulio09445 · CC BY 4.0"
        },
        {
          "id": "F",
          "n": "Sol",
          "x": 42.95,
          "y": 15.29,
          "title": "Le maître-autel de saint Marc",
          "sub": "Autel et inscription",
          "text": "L’autel majeur est lié au tombeau de saint Marc. La photographie laisse lire sur la pierre « MARCI EVANGELISTAE » ; on l’observe depuis l’espace accessible aux visiteurs.",
          "where": "Au fond du presbytérium",
          "img": "img/plan/basilique-F.webp",
          "credit": "Image : Testus · CC BY-SA 3.0"
        },
        {
          "id": "G",
          "n": "Sol",
          "x": 42.95,
          "y": 8.84,
          "title": "La Pala d’Oro",
          "sub": "Orfèvrerie · option de visite",
          "text": "Ce grand retable d’orfèvrerie réunit des émaux et des gemmes. La basilique indique qu’il se voit normalement du côté opposé à la nef ; son orientation change pour certaines cérémonies.",
          "where": "Derrière le maître-autel",
          "img": "img/plan/basilique-G.webp",
          "credit": "Assemblage photo : Daperro · CC BY-SA 4.0"
        },
        {
          "id": "H",
          "n": "Musée",
          "x": 82.8,
          "y": 82.89,
          "title": "Les chevaux de Saint-Marc",
          "sub": "Sculpture · musée",
          "text": "Les quatre chevaux originaux sont conservés dans le musée pour les protéger. Ceux de la façade sont des reproductions.",
          "where": "Musée, à l’étage au-dessus de l’atrium",
          "img": "img/plan/basilique-H.webp",
          "credit": "Image : Mark Landon (2015) · CC BY 4.0"
        }
      ]
    },
    chapters: [
      {
        "steps": [
          {
            "idx": 100,
            "where": "Depuis la place Saint-Marc, lève les yeux au-dessus de la grande entrée centrale. Cherche un animal doré sur un fond bleu parsemé d’étoiles et regarde près d’une patte avant.",
            "q": "Quel objet accompagne cet animal ?",
            "opts": [
              "Un livre ouvert",
              "Une épée",
              "Une couronne",
              "Une clé"
            ],
            "a": 0,
            "reveal": "C’est le lion ailé de saint Marc, avec son livre. Marc est l’un des quatre évangélistes. Selon la tradition, ses reliques furent apportées d’Alexandrie à Venise au IXe siècle ; une première église fut consacrée en 832. Le lion est devenu un symbole de la ville.",
            "img": "img/q/basilique-0.webp",
            "src": [
              "https://www.basilicasanmarco.it/storia/san-marco-evangelista/",
              "https://www.basilicasanmarco.it/storia/cronologia-essenziale/"
            ],
            "cap": "Le livre ouvert se trouve près d’une patte avant du lion."
          },
          {
            "idx": 101,
            "where": "Regarde la rangée de chevaux au-dessus du portail central. Compte les silhouettes entières, même si elles se chevauchent un peu.",
            "q": "Combien de chevaux sont alignés sur la terrasse ?",
            "opts": [
              "Deux",
              "Trois",
              "Quatre",
              "Six"
            ],
            "a": 2,
            "reveal": "Les quatre chevaux ont été apportés de Constantinople après la conquête de la ville lors de la quatrième croisade, en 1204. Ceux que tu vois dehors sont des copies : les originaux, fragilisés par l’exposition à l’air, sont conservés dans le musée de la basilique.",
            "img": "img/q/basilique-1.webp",
            "src": [
              "https://www.basilicasanmarco.it/basilica/scultura-2/la-decorazione-delle-facciate/",
              "https://www.basilicasanmarco.it/storia/cronologia-essenziale/",
              "https://www.basilicasanmarco.it/basilica/museo-di-san-marco/"
            ],
            "cap": "Quatre chevaux se tiennent sur la terrasse : les statues extérieures sont des copies."
          },
          {
            "idx": 102,
            "where": "Rejoins la première grande arcade à gauche de la façade. Dans la mosaïque dorée au-dessus de la porte de Sant’Alipio, regarde le bâtiment représenté derrière les personnages.",
            "q": "Quel bâtiment vois-tu à l’intérieur de cette mosaïque ?",
            "opts": [
              "Le Palais des Doges",
              "La basilique Saint-Marc",
              "Le pont du Rialto",
              "Un théâtre"
            ],
            "a": 1,
            "reveal": "La basilique s’est représentée elle-même ! Cette mosaïque date d’environ 1265. Elle montre comment sa façade apparaissait au XIIIe siècle, avec les quatre chevaux déjà installés au-dessus de l’entrée. C’est donc aussi un document sur l’histoire du bâtiment.",
            "img": "img/q/basilique-2.webp",
            "src": [
              "https://www.basilicasanmarco.it/basilica/scultura-2/la-decorazione-delle-facciate/",
              "https://www.basilicasanmarco.it/storia/cronologia-essenziale/"
            ],
            "cap": "Au centre de la mosaïque, la basilique est reconnaissable à ses arcades et à ses coupoles."
          },
          {
            "idx": 103,
            "where": "Aux extrémités de la façade tournée vers la place, cherche une plaque de marbre rectangulaire. Sur l’une d’elles, un homme soulève un gros animal au-dessus de ses épaules.",
            "q": "Quel animal porte-t-il ?",
            "opts": [
              "Un cheval",
              "Un sanglier",
              "Un lion",
              "Un taureau"
            ],
            "a": 1,
            "reveal": "Ce héros est Hercule, personnage de la mythologie grecque. Il porte le sanglier d’Érymanthe, l’un de ses célèbres travaux. La basilique explique que ce relief venu du monde byzantin a été réutilisé sur la façade et que l’image a reçu au Moyen Âge une lecture chrétienne.",
            "img": "img/q/basilique-3.webp",
            "src": [
              "https://www.basilicasanmarco.it/basilica/scultura-2/la-decorazione-delle-facciate/"
            ],
            "cap": "Le sanglier repose sur les épaules d’Hercule, dans la partie supérieure du relief."
          },
          {
            "idx": 104,
            "where": "Sur le côté sud de la basilique, près de la Porte de la Carta du Palais des Doges, cherche le groupe sculpté en pierre rouge violacé. Observe les bras des deux personnages visibles sur une face.",
            "q": "Que font ces personnages ?",
            "opts": [
              "Ils se serrent dans les bras",
              "Ils se battent",
              "Ils montrent le ciel",
              "Ils portent une colonne"
            ],
            "a": 0,
            "reveal": "Ce sont les Tétrarques. Le groupe complet comprend quatre personnages, disposés en deux paires de part et d’autre de l’angle. Ils évoquent les quatre dirigeants qui gouvernèrent ensemble l’Empire romain à la fin du IIIe siècle. Leur étreinte exprime l’union du pouvoir.",
            "img": "img/q/basilique-4.webp",
            "src": [
              "https://www.basilicasanmarco.it/basilica/scultura-2/la-decorazione-delle-facciate/",
              "https://www.metmuseum.org/-/media/files/learn/for-educators/publications-for-educators/roman.pdf"
            ],
            "cap": "Sur cette face, les deux personnages passent un bras autour de l’autre."
          },
          {
            "idx": 105,
            "where": "Contourne la basilique vers la Piazzetta dei Leoncini. Au-dessus de la « porte des Fleurs », repère un petit relief sous un arc pointu : observe le bébé et les personnages autour de lui.",
            "q": "Quel épisode cette sculpture raconte-t-elle ?",
            "opts": [
              "La naissance de Jésus",
              "Le baptême de Jésus",
              "La Cène",
              "La Résurrection"
            ],
            "a": 0,
            "reveal": "La scène est une Nativité, c’est-à-dire la naissance de Jésus. La basilique décrit ce relief au-dessus de la porte des Fleurs, sur sa façade nord. Il est entouré d’anges, de prophètes et d’autres figures sculptées : la porte entière se lit comme un livre d’images.",
            "img": "img/q/basilique-5.webp",
            "src": [
              "https://www.basilicasanmarco.it/basilica/scultura-2/la-decorazione-delle-facciate/"
            ],
            "cap": "Détail agrandi : le nouveau-né est allongé entre les personnages, sous l’arc pointu."
          },
          {
            "idx": 106,
            "where": "Si tu visites l’intérieur, lève les yeux vers la coupole de la Pentecôte, du côté de l’entrée. Au centre du cercle d’or, suis les rayons qui partent vers les personnages.",
            "q": "Quel oiseau est figuré à l’origine de ces rayons ?",
            "opts": [
              "Un aigle",
              "Une colombe",
              "Un paon",
              "Un hibou"
            ],
            "a": 1,
            "reveal": "La colombe représente le Saint-Esprit dans la scène de la Pentecôte. Les rayons rejoignent les apôtres figurés autour de la coupole. Les mosaïques à fond d’or qui couvrent la basilique expliquent son surnom de « basilique d’or ».",
            "img": "img/q/basilique-6.webp",
            "src": [
              "https://www.treccani.it/enciclopedia/san-marco-a-venezia_%28Storia-della-civilta-Europea%29/",
              "https://www.lancaster.ac.uk/media/lancaster-university/content-assets/documents/ruskin/9-11StonesofVenice.pdf"
            ],
            "cap": "Détail agrandi : la colombe blanche se trouve au-dessus du trône."
          }
        ]
      }
    ] },
  { id: "campanile", emoji: "🗼", name: "Le campanile", lat: 45.43404, lon: 12.33904, r: 60,
    story: "C'est la plus haute tour de Venise : 98 mètres ! Un jour de 1902 elle s'est écroulée... et on l'a reconstruite exactement pareil.",
    clue: "L'ange là-haut a vu tomber la tour et la tour se relever. Il sait tout sur les secrets de la place.",
    chapters: [
      {
        "steps": [
          {
            "idx": 300,
            "where": "Depuis la place Saint-Marc, lève les yeux jusqu’à la pointe du campanile. Utilise le zoom si besoin pour observer la silhouette dorée.",
            "q": "Quel personnage se tient tout en haut ?",
            "opts": [
              "Un doge couronné",
              "Un ange aux grandes ailes",
              "Un gondolier",
              "Un lion ailé"
            ],
            "a": 1,
            "reveal": "Il s’agit de l’archange Gabriel. La statue dorée peut tourner avec le vent : elle sert aussi de girouette. Le campanile fut reconstruit après son effondrement du 14 juillet 1902 et inauguré le 25 avril 1912.",
            "img": "img/q/campanile-0.webp",
            "src": [
              "https://www.basilicasanmarco.it/basilica/campanile-2/"
            ],
            "cap": "Au sommet, Gabriel se reconnaît à ses grandes ailes dorées."
          },
          {
            "idx": 301,
            "where": "Regarde la partie verte immédiatement sous l’ange. Suis ses bords depuis la base jusqu’à la pointe.",
            "q": "Quelle forme a ce grand toit vert ?",
            "opts": [
              "Une coupole ronde",
              "Un cylindre",
              "Une pyramide",
              "Un toit plat"
            ],
            "a": 2,
            "reveal": "Cette flèche en forme de pyramide est couverte de cuivre. Elle prolonge la tour de briques et porte la statue de Gabriel. Le campanile atteint 98,6 mètres selon la basilique Saint-Marc.",
            "img": "img/q/campanile-1.webp",
            "src": [
              "https://www.basilicasanmarco.it/basilica/campanile-2/"
            ],
            "cap": "Les faces du toit vert montent vers une même pointe."
          },
          {
            "idx": 302,
            "where": "Fais quelques pas autour du campanile et scrute le grand panneau de briques juste sous le toit vert. Sur certaines faces, un animal blanc apparaît. Un zoom aide beaucoup.",
            "q": "Quel animal est sculpté sur ce panneau ?",
            "opts": [
              "Un cheval marin",
              "Un aigle",
              "Un dragon",
              "Un lion ailé"
            ],
            "a": 3,
            "reveal": "C’est le lion de Saint Marc, emblème historique de Venise. Ses ailes le distinguent d’un lion ordinaire. La Ville de Venise explique que ce symbole représente l’évangéliste Marc, patron de la cité.",
            "img": "img/q/campanile-2.webp",
            "src": [
              "https://www.visitvenezia.eu/venezianita/scopri-venezia/venezia-e-i-suoi-%E2%80%98scrigni-i-campanili",
              "https://live.comune.venezia.it/it/node/132935"
            ],
            "cap": "Le lion blanc, avec ses ailes, occupe le panneau de briques."
          },
          {
            "idx": 303,
            "where": "Sous les grands panneaux de briques, cherche l’étage blanc ouvert où sont suspendues les cloches. Compte les grandes arcades sur une seule face.",
            "q": "Combien de grandes arcades vois-tu côte à côte sur cette face ?",
            "opts": [
              "Deux",
              "Quatre",
              "Cinq",
              "Six"
            ],
            "a": 1,
            "reveal": "Cet étage est la chambre des cloches. Le campanile possède cinq cloches, même si l’on compte quatre grandes arcades sur une face. Lors de l’effondrement de 1902, une seule des cinq cloches survécut ; les quatre autres furent refondues.",
            "img": "img/q/campanile-3.webp",
            "src": [
              "https://www.basilicasanmarco.it/basilica/campanile-2/",
              "https://www.basilicasanmarco.it/basilica/campanile-2/le-campane/"
            ],
            "cap": "Quatre grandes ouvertures arrondies se suivent sur cette face."
          },
          {
            "idx": 304,
            "where": "Redescends les yeux jusqu’à la petite façade de marbre au pied du campanile, côté basilique. Compte ses grandes arcades arrondies.",
            "q": "Combien de grandes arcades rythment la Loggetta ?",
            "opts": [
              "Trois",
              "Quatre",
              "Cinq",
              "Six"
            ],
            "a": 0,
            "reveal": "La Loggetta fut bâtie entre 1537 et 1549 par Jacopo Sansovino. Elle servit ensuite de poste de garde aux ouvriers de l’Arsenal pendant les réunions du Grand Conseil. Elle fut très endommagée par la chute du campanile en 1902, puis restaurée.",
            "img": "img/q/campanile-4.webp",
            "src": [
              "https://www.basilicasanmarco.it/basilica/campanile-2/la-loggetta/"
            ],
            "cap": "Les trois grandes arcades de la Loggetta sont visibles derrière la balustrade."
          },
          {
            "idx": 305,
            "where": "Face à la Loggetta, trouve la statue sombre de la niche tout à gauche. Elle porte un casque et un bouclier. Regarde le centre du bouclier ; le zoom peut aider.",
            "q": "Quel motif est sculpté sur son bouclier ?",
            "opts": [
              "Une étoile",
              "Un bateau",
              "Un visage",
              "Un livre ouvert"
            ],
            "a": 2,
            "reveal": "Cette statue représente Minerve, une des quatre figures de bronze placées par Sansovino dans les niches de la Loggetta. Le visage du bouclier est celui de Méduse, personnage de la mythologie antique. Le Nationalmuseum de Stockholm confirme cette identification.",
            "img": "img/q/campanile-5.webp",
            "src": [
              "https://www.basilicasanmarco.it/basilica/campanile-2/la-loggetta/",
              "https://collection.nationalmuseum.se/en/collection/item/157937/"
            ],
            "cap": "Un visage aux traits marqués apparaît au centre du bouclier de Minerve."
          }
        ]
      }
    ] },
  { id: "colonnes", emoji: "🦁", name: "Les deux colonnes", lat: 45.43338, lon: 12.34003, r: 60,
    story: "Sur une colonne, le lion ailé, symbole de Venise. Sur l'autre, saint Théodore et son crocodile-dragon. Légende : ne passe jamais ENTRE les deux colonnes, ça porte malheur !",
    clue: "Entre les deux colonnes, jamais je ne passe. Les malins contournent, les imprudents glissent.",
    chapters: [
      {
        "steps": [
          {
            "idx": 300,
            "where": "Marche vers la lagune, au bout de la Piazzetta San Marco. Lève les yeux vers le sommet des deux hautes colonnes et compare leurs silhouettes.",
            "q": "Quel duo vois-tu tout en haut ?",
            "opts": [
              "Deux lions ailés",
              "Un lion ailé et un guerrier",
              "Un ange et un doge",
              "Deux gondoliers"
            ],
            "a": 1,
            "reveal": "Le lion ailé représente saint Marc, patron de Venise. Le personnage debout est saint Théodore, appelé Tòdaro en vénitien : il fut le premier protecteur de la cité. Les deux colonnes marquent l’arrivée à la Piazzetta depuis l’eau.",
            "img": "img/q/colonnes-0.webp",
            "src": [
              "https://live.comune.venezia.it/it/node/115647",
              "https://live.comune.venezia.it/it/node/132935",
              "https://provenezia.ch/en/restorations/column-of-st-mark"
            ],
            "cap": "Le lion est sur une colonne ; saint Théodore se tient sur l’autre."
          },
          {
            "idx": 301,
            "where": "Repère le lion sombre sur la colonne du côté du Palais des Doges. Observe son dos et sa silhouette, avec un zoom si nécessaire.",
            "q": "Quel détail le distingue d’un lion ordinaire ?",
            "opts": [
              "Des ailes",
              "Des nageoires",
              "Des cornes",
              "Une carapace"
            ],
            "a": 0,
            "reveal": "Ce lion ailé est le symbole de l’évangéliste saint Marc et de Venise. L’image du lion de Saint Marc existe en plusieurs versions dans la ville ; celui de cette colonne n’a pas besoin d’un livre pour être reconnu.",
            "img": "img/q/colonnes-1.webp",
            "src": [
              "https://live.comune.venezia.it/it/node/132935",
              "https://iris.unive.it/retrieve/e4239ddd-243c-7180-e053-3705fe0a3322/L.%20Sperti%2C%20Reimpiego%2C%20in%20Tondo%20Angaran.pdf"
            ],
            "cap": "Deux ailes se dressent sur le dos du lion de bronze."
          },
          {
            "idx": 302,
            "where": "Cherche le personnage clair au sommet de l’autre colonne, du côté de la Bibliothèque Marciana. Regarde l’objet long et mince qu’il tient.",
            "q": "Quelle arme porte saint Théodore ?",
            "opts": [
              "Un trident",
              "Une longue lance",
              "Un arc",
              "Une rame"
            ],
            "a": 1,
            "reveal": "Saint Théodore est représenté en guerrier. Surprise : la statue que tu vois là-haut est une copie installée en 1948. L’original se trouve dans le Palais des Doges, à l’entrée de la cour des Sénateurs.",
            "img": "img/q/colonnes-2.webp",
            "src": [
              "https://live.comune.venezia.it/it/node/115647"
            ],
            "cap": "La lance monte bien au-dessus de la tête de saint Théodore."
          },
          {
            "idx": 303,
            "where": "Continue d’observer la statue de Tòdaro. Sous ses pieds s’étire une créature au corps de reptile ; cherche surtout sa longue queue.",
            "q": "Quel animal de légende cette créature représente-t-elle ?",
            "opts": [
              "Un dragon",
              "Un poisson géant",
              "Un cheval marin",
              "Un lion"
            ],
            "a": 0,
            "reveal": "La Ville de Venise décrit saint Théodore comme un guerrier terrassant un dragon. L’animal sculpté ressemble beaucoup à un crocodile : c’est la forme que l’artiste a donnée au dragon. La statue originale a été assemblée à partir de morceaux de différentes époques.",
            "img": "img/q/colonnes-3.webp",
            "src": [
              "https://live.comune.venezia.it/it/node/115647",
              "https://iris.unive.it/retrieve/e4239ddd-243c-7180-e053-3705fe0a3322/L.%20Sperti%2C%20Reimpiego%2C%20in%20Tondo%20Angaran.pdf"
            ],
            "cap": "Le dragon au long corps reptilien s’allonge sous les pieds du saint."
          },
          {
            "idx": 304,
            "where": "Redescends le regard jusqu’aux grands socles de pierre. Fais le tour sans franchir les barrières et examine leurs angles, à hauteur d’enfant.",
            "q": "Qu’est-ce qui est sculpté aux angles des socles ?",
            "opts": [
              "Des personnages",
              "Des cartes de la lagune",
              "Des cadrans d’horloge",
              "Des bateaux miniatures"
            ],
            "a": 0,
            "reveal": "Ces sculptures, aujourd’hui usées, représentent des métiers de la Venise ancienne. Treccani identifie notamment des forgerons et des vendeurs de poisson sur le socle de la colonne de Tòdaro. Tous les métiers ne sont plus reconnaissables avec certitude.",
            "img": "img/q/colonnes-4.webp",
            "src": [
              "https://www.treccani.it/enciclopedia/corporazioni-e-mestieri_%28Enciclopedia-dell%27-Arte-Medievale%29/"
            ],
            "cap": "Deux personnages abîmés par le temps occupent cet angle du socle."
          },
          {
            "idx": 305,
            "where": "Éloigne-toi de quelques pas pour comparer les longues colonnes elles-mêmes. Regarde leur pierre plutôt que les statues ou les chapiteaux.",
            "q": "Laquelle présente une teinte plus rouge ou rosée ?",
            "opts": [
              "Celle du lion",
              "Celle de Tòdaro",
              "Les deux ont la même teinte rosée",
              "Les deux ont la même teinte grise"
            ],
            "a": 1,
            "reveal": "Le fût de la colonne de Tòdaro est en granit rouge d’Assouan, en Égypte. Celui du lion est en granit gris-violet de la Troade, dans l’actuelle Turquie. Ces pierres anciennes ont été réemployées à Venise ; leur trajet exact jusqu’à la ville reste incertain.",
            "img": "img/q/colonnes-5.webp",
            "src": [
              "https://iris.unive.it/retrieve/e4239ddd-243c-7180-e053-3705fe0a3322/L.%20Sperti%2C%20Reimpiego%2C%20in%20Tondo%20Angaran.pdf",
              "https://provenezia.ch/en/restorations/column-of-st-mark"
            ],
            "cap": "Le fût de Tòdaro, à droite sur cette vue, est plus rouge que celui du lion."
          }
        ]
      }
    ] },
  { id: "soupirs", emoji: "🌉", name: "Le pont des Soupirs", lat: 45.43406, lon: 12.34086, r: 60,
    story: "Ce pont couvert relie le palais du Doge à l'ancienne prison. On raconte que les prisonniers soupiraient en voyant Venise une dernière fois par la petite fenêtre.",
    clue: "Ceux qui soupirent en savent long. Écoute le silence sous le pont, il murmure.",
    chapters: [
      {
        "steps": [
          {
            "idx": 100,
            "where": "Depuis le Ponte della Paglia, regarde la face du pont qui se tourne vers la lagune. Compte seulement les petites fenêtres ajourées du pont, pas celles des grands bâtiments voisins.",
            "q": "Combien de petites fenêtres vois-tu sur cette face ?",
            "opts": [
              "Une",
              "Deux",
              "Trois",
              "Quatre"
            ],
            "a": 1,
            "reveal": "Ce pont couvert reliait le Palais des Doges aux Nouvelles Prisons. À travers ces petites fenêtres, les personnes qui passaient pouvaient entrevoir la lagune. Son nom de « pont des Soupirs » s’est répandu à l’époque romantique : il évoque les soupirs supposés des prisonniers, sans prouver que chacun a réellement soupiré.",
            "img": "img/q/soupirs-0.webp",
            "src": [
              "https://palazzoducale.visitmuve.it/percorsi-e-collezioni/le-prigioni/",
              "https://www.italia.it/it/veneto/venezia/ponte-dei-sospiri"
            ],
            "cap": "Les deux fenêtres ajourées sont côte à côte sur la façade du pont."
          },
          {
            "idx": 101,
            "where": "Toujours sur la façade tournée vers la lagune, cherche l’ornement sculpté au milieu, exactement entre les deux fenêtres grillagées.",
            "q": "Quel objet décoratif se trouve à cet endroit ?",
            "opts": [
              "Un écu entouré de volutes",
              "Une cloche",
              "Une roue de bateau",
              "Une horloge"
            ],
            "a": 0,
            "reveal": "Cet écusson rappelle les armoiries du doge Marino Grimani. Le pont fut élevé au début du XVIIe siècle pour relier directement les salles de justice du palais au nouveau bâtiment des prisons, de l’autre côté du Rio di Palazzo.",
            "img": "img/q/soupirs-1.webp",
            "src": [
              "https://www.italia.it/it/veneto/venezia/ponte-dei-sospiri",
              "https://palazzoducale.visitmuve.it/percorsi-e-collezioni/le-prigioni/"
            ],
            "cap": "L’écu ovale est entouré d’un décor de pierre enroulé sur lui-même."
          },
          {
            "idx": 102,
            "where": "Lève les yeux au-dessus des fenêtres. Au milieu de la partie haute, une femme est sculptée en relief. Observe les deux têtes d’animaux de part et d’autre d’elle.",
            "q": "Quels animaux entourent la femme sculptée ?",
            "opts": [
              "Des lions",
              "Des chevaux",
              "Des hiboux",
              "Des poissons"
            ],
            "a": 0,
            "reveal": "Ce relief fait partie du décor de la façade du pont. Les deux têtes de lion encadrent une figure féminine assise. Au début du XVIIe siècle, ce passage couvert reliait les salles de justice du Palais des Doges aux prisons de l’autre côté du canal.",
            "img": "img/q/soupirs-2.webp",
            "src": [
              "https://palazzoducale.visitmuve.it/percorsi-e-collezioni/le-prigioni/",
              "https://commons.wikimedia.org/wiki/File:Bridge_of_Sighs_-_sea_facade_-_close_up_02.jpg"
            ],
            "cap": "Deux têtes de lion se trouvent près des genoux de la femme."
          },
          {
            "idx": 103,
            "where": "Lève les yeux vers le haut du pont. Suis la bordure blanche du toit : certaines courbes se replient sur elles-mêmes aux extrémités.",
            "q": "À quoi ressemblent ces courbes décoratives ?",
            "opts": [
              "Des spirales",
              "Des dents de scie",
              "Des étoiles",
              "Des flèches"
            ],
            "a": 0,
            "reveal": "On appelle ces courbes enroulées des volutes. Elles participent au décor abondant du pont. Une publication du musée du Palais des Doges décrit ses formes et son ornementation comme proches du goût baroque du début du XVIIe siècle.",
            "img": "img/q/soupirs-3.webp",
            "src": [
              "https://palazzoducale.visitmuve.it/wp-content/uploads/2013/09/Lo-spazio-della-paura.pdf",
              "https://commons.wikimedia.org/wiki/File:Venezia_Palazzo_Ducale_Ponte_dei_Sospiri_10.jpg"
            ],
            "cap": "Les volutes en forme de spirale se découpent sur le ciel, au-dessus des fenêtres."
          },
          {
            "idx": 104,
            "where": "Pendant la visite du palais, traverse le couloir du pont et approche-toi d’une fenêtre sans toucher la pierre. Regarde le dessin répété dans sa grille.",
            "q": "À quoi ressemble le motif ajouré de cette grille ?",
            "opts": [
              "Des fleurs",
              "Des poissons",
              "Des lettres",
              "Des feuilles de chêne"
            ],
            "a": 0,
            "reveal": "La grille de pierre laisse entrer un peu de lumière tout en fermant la fenêtre. À l’intérieur, le pont comporte deux couloirs distincts, séparés par un mur. Le parcours de visite du Palais des Doges permet d’en traverser un.",
            "img": "img/q/soupirs-4.webp",
            "src": [
              "https://palazzoducale.visitmuve.it/percorsi-e-collezioni/le-prigioni/",
              "https://commons.wikimedia.org/wiki/File:0_Venise,_claustra_en_pierre_du_Pont_des_Soupirs_(1).JPG"
            ],
            "cap": "Les pétales découpés dans la pierre forment plusieurs fleurs superposées."
          },
          {
            "idx": 105,
            "where": "Depuis une fenêtre du pont tournée vers la lagune, cherche l’île de San Giorgio Maggiore. Au-dessus de son église, repère la haute construction étroite qui dépasse les toits.",
            "q": "Quelle construction se détache sur l’horizon ?",
            "opts": [
              "Un campanile",
              "Un phare rayé",
              "Un moulin",
              "Un château fort"
            ],
            "a": 0,
            "reveal": "Le campanile est le clocher de l’église de San Giorgio Maggiore. Le musée du Palais des Doges précise qu’on pouvait apercevoir l’île et la lagune par les petites fenêtres du pont : c’est cette vue qui a nourri plus tard l’histoire des « soupirs ».",
            "img": "img/q/soupirs-5.webp",
            "src": [
              "https://palazzoducale.visitmuve.it/percorsi-e-collezioni/le-prigioni/",
              "https://commons.wikimedia.org/wiki/File:Venezia_Palazzo_Ducale_Innen_Blick_von_der_Ponte_dei_Sospiri_auf_San_Giorgio_Maggiore.jpg"
            ],
            "cap": "Le campanile de San Giorgio Maggiore s’élève sur l’île, au-delà de la lagune."
          }
        ]
      }
    ] },

  // ─── JOUR 2 : Rialto ───
  { id: "rialto", emoji: "🌉", name: "Le pont du Rialto", lat: 45.43805, lon: 12.33565, r: 60,
    story: "Un grand pont de pierre blanche au-dessus du Grand Canal... avec des boutiques construites dessus !",
    clue: "Sur le pont, chacun vend et chacun achète. Mais moi, je regarde l'eau : elle parle aux bateaux.",
    chapters: [
      {
        "steps": [
          {
            "idx": 100,
            "where": "Depuis une rive proche du pont, ou à bord d’un bateau, regarde sous toute sa largeur. Compte les grandes ouvertures qui laissent passer les embarcations.",
            "q": "Combien de grandes arches enjambent le Grand Canal ?",
            "opts": [
              "Une",
              "Deux",
              "Trois",
              "Quatre"
            ],
            "a": 0,
            "reveal": "Le pont de pierre actuel a été construit entre 1588 et 1592 sous la direction d’Antonio da Ponte. Il a remplacé des ponts de bois. Sa grande arche unique laisse un large passage aux bateaux qui circulent sur le Grand Canal.",
            "img": "img/q/rialto-0.webp",
            "src": [
              "https://www.veneziaunica.it/it/cosa-fare-a-venezia/monumenti-e-teatri/ponte-di-rialto",
              "https://www.veneziaunica.it/ru/node/2316"
            ],
            "cap": "Une seule grande arche de pierre franchit le canal."
          },
          {
            "idx": 101,
            "where": "Monte l’escalier central. Ne regarde pas seulement les marches : observe ce qui borde le passage, à gauche comme à droite.",
            "q": "Qu’y a-t-il de chaque côté de cet escalier ?",
            "opts": [
              "Des boutiques",
              "Des jardins",
              "Des statues de chevaux",
              "Des fontaines"
            ],
            "a": 0,
            "reveal": "Le Rialto relie le quartier du marché à celui de San Marco. Les boutiques font partie du pont depuis l’époque de ses versions en bois. Le pont de pierre a conservé cette fonction commerciale : on y traverse le canal tout en longeant des échoppes.",
            "img": "img/q/rialto-1.webp",
            "src": [
              "https://www.veneziaunica.it/it/cosa-fare-a-venezia/monumenti-e-teatri/ponte-di-rialto",
              "https://www.veneziaunica.it/ru/node/2316"
            ],
            "cap": "Les devantures des boutiques encadrent l’escalier central."
          },
          {
            "idx": 102,
            "where": "Emprunte une rampe sur le bord du pont et observe le garde-corps de pierre. Entre la base et la main courante, le même petit élément se répète.",
            "q": "Qu’est-ce qui forme cette rangée le long du garde-corps ?",
            "opts": [
              "Des balustres en pierre",
              "Des chaînes de fer",
              "Des vitres",
              "Des briques rouges"
            ],
            "a": 0,
            "reveal": "Ces petites colonnes, appelées balustres, forment la balustrade qui protège les passants. Lors de la restauration du pont achevée en 2021, la Ville de Venise a notamment fait restaurer ces balustrades et consolider leurs supports.",
            "img": "img/q/rialto-2.webp",
            "src": [
              "https://live.comune.venezia.it/it/2025/04/venezia-celebrazione-del-restauro-del-ponte-di-rialto",
              "https://commons.wikimedia.org/wiki/File:Venice,_San_Polo,_Rialto_Bridge_(SW)_1.jpg"
            ],
            "cap": "Les balustres de pierre sont alignés au bord de la rampe."
          },
          {
            "idx": 103,
            "where": "Depuis la rive ou le canal, cherche la sculpture située près d’une plaque gravée sur la face du pont tournée vers le sud. Regarde le dos du personnage.",
            "q": "Quel détail montre que ce personnage est un ange ?",
            "opts": [
              "Ses ailes",
              "Sa couronne",
              "Sa queue de poisson",
              "Son casque"
            ],
            "a": 0,
            "reveal": "Ce relief représente l’ange Gabriel dans l’Annonciation, face à Marie. La scène rappelle la fête du 25 mars. Selon une tradition vénitienne, la fondation de la ville aurait eu lieu un 25 mars ; cette date relève de la légende, pas d’un fait historique établi.",
            "img": "img/q/rialto-3.webp",
            "src": [
              "https://tour.venezia.it/it/venezia/cosa-vedere/dettagli/ponte-di-rialto",
              "https://commons.wikimedia.org/wiki/File:Rialto_Bridge_(Ponte_di_Rialto),_Venice_(30745036063).jpg"
            ],
            "cap": "Les grandes ailes sont sculptées derrière les épaules de Gabriel."
          },
          {
            "idx": 104,
            "where": "Sur l’autre face du pont, cherche le personnage assis près d’une plaque gravée. Regarde juste sous sa main et ses jambes : un animal s’y cache.",
            "q": "Quel animal accompagne ce personnage ?",
            "opts": [
              "Un lion",
              "Un cheval",
              "Un dauphin",
              "Un taureau"
            ],
            "a": 0,
            "reveal": "Le personnage est saint Marc, patron de Venise. Le lion est son symbole traditionnel. Sur cette face du pont, un second relief représente saint Théodore, autre saint protecteur de la ville.",
            "img": "img/q/rialto-4.webp",
            "src": [
              "https://tour.venezia.it/it/venezia/cosa-vedere/dettagli/ponte-di-rialto",
              "https://commons.wikimedia.org/wiki/File:Ponte_di_Rialto_Canal_Grande_Venezia_Rilievo_San_Marco.jpg"
            ],
            "cap": "La tête du lion apparaît sous la main et près du genou de saint Marc."
          },
          {
            "idx": 105,
            "where": "Reste sur la même face du pont. De l’autre côté de la plaque gravée, repère un personnage debout. Cherche le grand objet qu’il tient devant lui.",
            "q": "Quel objet porte ce personnage ?",
            "opts": [
              "Un bouclier",
              "Une rame",
              "Une balance",
              "Une harpe"
            ],
            "a": 0,
            "reveal": "Ce personnage est saint Théodore, autre protecteur de Venise. Son relief fait pendant à celui de saint Marc, placé de l’autre côté de la plaque. Les deux sculptures sont visibles sur la face nord du pont.",
            "img": "img/q/rialto-5.webp",
            "src": [
              "https://tour.venezia.it/it/venezia/cosa-vedere/dettagli/ponte-di-rialto",
              "https://commons.wikimedia.org/wiki/File:Rialto_Bridge_6_(7248180638).jpg"
            ],
            "cap": "Le bouclier est devant le corps de saint Théodore, près de la plaque."
          }
        ]
      }
    ] },
  { id: "pescheria", emoji: "🐟", name: "Le marché aux poissons", lat: 45.43965, lon: 12.33440, r: 70,
    story: "Depuis des siècles les pêcheurs vendent leurs poissons ici. Ça sent la mer ! (Fermé le lundi.)",
    clue: "Un marin sans poisson est un chat sans moustaches. Cherche celui qui a huit bras.",
    chapters: [
      {
        "steps": [
          {
            "idx": 100,
            "where": "Place-toi sur le Campo della Pescaria, face à la grande galerie du marché. Regarde la forme des ouvertures du rez-de-chaussée.",
            "q": "Comment se terminent les arcs au-dessus des étals ?",
            "opts": [
              "En demi-cercle",
              "En pointe",
              "Par une ligne horizontale",
              "En spirale"
            ],
            "a": 1,
            "reveal": "Ces arcs pointus donnent au bâtiment son allure néogothique. Pourtant, l’édifice actuel n’est pas médiéval : il a été construit en 1907 sur un projet de Domenico Rupolo, avec Cesare Laurenti, à la place d’anciennes halles métalliques. Le marché aux poissons, lui, existe à Rialto depuis des siècles.",
            "img": "img/q/pescheria-0.webp",
            "src": [
              "https://live.comune.venezia.it/index.php/it/node/124390",
              "https://edizionicafoscari.unive.it/media/pdf/journals/the-venice-journal-of-environmental-humanities/2021/1/iss-1-1-2021_2tHpQR2.pdf"
            ],
            "cap": "Les arches pointues se répètent sous la galerie, au rez-de-chaussée."
          },
          {
            "idx": 101,
            "where": "Regarde l’angle du bâtiment tourné vers le Canal Grande. Cherche la statue de bronze placée assez haut, au-dessus des arches, puis observe sa main.",
            "q": "Quel objet la statue tient-elle près de sa jambe ?",
            "opts": [
              "Une rame",
              "Un filet de pêche",
              "Une ancre",
              "Un panier de fruits"
            ],
            "a": 1,
            "reveal": "Cette statue de Cesare Laurenti représente saint Pierre comme pêcheur. Elle rappelle directement le travail des hommes qui apportaient autrefois leurs prises au marché de Rialto. La Ville de Venise situe la statue à environ quatre mètres au-dessus du sol.",
            "img": "img/q/pescheria-1.webp",
            "src": [
              "https://live.comune.venezia.it/index.php/it/node/124390"
            ],
            "cap": "Le filet pend à la main droite de la statue, contre sa jambe."
          },
          {
            "idx": 102,
            "where": "Sous la galerie, lève les yeux vers le haut des colonnes. Cherche un chapiteau où de longs bras s’enroulent et montrent des rangées de petites ventouses.",
            "q": "Quel animal marin reconnais-tu ?",
            "opts": [
              "Une pieuvre",
              "Une méduse",
              "Une étoile de mer",
              "Un crabe"
            ],
            "a": 0,
            "reveal": "Les sculpteurs ont peuplé les chapiteaux de poissons et d’autres créatures marines. Sur celui-ci, les bras à ventouses permettent de reconnaître une pieuvre ; au milieu apparaît aussi une autre forme marine. Le décor transforme les colonnes en petit bestiaire du marché.",
            "img": "img/q/pescheria-2.webp",
            "src": [
              "https://edizionicafoscari.unive.it/media/pdf/journals/the-venice-journal-of-environmental-humanities/2021/1/iss-1-1-2021_2tHpQR2.pdf"
            ],
            "cap": "Les ventouses sont visibles sur les tentacules, de chaque côté du chapiteau."
          },
          {
            "idx": 103,
            "where": "Du côté du marché de fruits et légumes, examine le haut des colonnes. Trouve deux hippocampes sculptés face à face.",
            "q": "Quel petit motif se trouve entre leurs têtes ?",
            "opts": [
              "Une coquille",
              "Une couronne",
              "Une étoile",
              "Une fleur"
            ],
            "a": 2,
            "reveal": "Les hippocampes et l’étoile font partie des motifs marins imaginés pour cette Pescheria du début du XXe siècle. Les chapiteaux ne sont pas tous identiques : les observer un par un révèle d’autres animaux et objets liés à la mer.",
            "img": "img/q/pescheria-3.webp",
            "src": [
              "https://www.venicetours.it/il-mercato-del-pesce-rialto-e-la-nuova-pescheria/",
              "https://edizionicafoscari.unive.it/media/pdf/journals/the-venice-journal-of-environmental-humanities/2021/1/iss-1-1-2021_2tHpQR2.pdf"
            ],
            "cap": "La petite étoile est au centre, entre les deux hippocampes."
          },
          {
            "idx": 104,
            "where": "Cherche sur un mur de brique du marché une plaque de marbre blanc commençant par « LUNGHEZZE MINIME PERMESSE ». Repère la ligne « BISATO ».",
            "q": "Quel nombre est inscrit à droite du mot « BISATO » ?",
            "opts": [
              "3",
              "7",
              "12",
              "25"
            ],
            "a": 3,
            "reveal": "« Bisato » est un nom vénitien de l’anguille. La plaque indiquait une longueur minimale de 25 centimètres pour sa vente. Les autorités de la République surveillaient les tailles et la fraîcheur du poisson. Cette plaque témoigne d’anciennes règles ; elle ne décrit pas la réglementation actuelle.",
            "img": "img/q/pescheria-4.webp",
            "src": [
              "https://live.comune.venezia.it/index.php/it/2025/04/pescheria-e-mercato-di-rialto",
              "https://www.regione.veneto.it/static/www/agricoltura-e-foreste/PescagastronomicaITA.pdf"
            ],
            "cap": "Sur la plaque, « BISATO » est suivi du nombre 25, en centimètres."
          },
          {
            "idx": 105,
            "where": "Près de l’escalier extérieur, repère la plus grande des deux portes en fer. Lis le début de la phrase au-dessus des battants : « PISCIS PRIMUM… ».",
            "q": "Quel animal désigne le mot latin « PISCIS » ?",
            "opts": [
              "Un crabe",
              "Un coquillage",
              "Un poisson",
              "Une seiche"
            ],
            "a": 2,
            "reveal": "L’inscription entière signifie littéralement « le poisson commence à sentir mauvais par la tête ». C’est un proverbe, placé avec humour à l’entrée d’un marché aux poissons. La porte en fer a été réalisée vers 1907 par Umberto Bellotto, à l’époque de la construction de la nouvelle Pescheria.",
            "img": "img/q/pescheria-5.webp",
            "src": [
              "https://www.catalogo.beniculturali.it/detail/HistoricOrArtisticProperty/0500726651",
              "https://cvc.cervantes.es/lengua/refranero/Ficha.aspx?Lng=14&Par=58644",
              "https://edizionicafoscari.unive.it/media/pdf/journals/the-venice-journal-of-environmental-humanities/2021/1/iss-1-1-2021_2tHpQR2.pdf"
            ],
            "cap": "La phrase commence au-dessus de la grande porte de gauche."
          }
        ]
      }
    ] },
  { id: "cadoro", emoji: "🏛️", name: "La Ca' d'Oro", lat: 45.44070, lon: 12.33395, r: 70,
    story: "« Ca' d'Oro » veut dire « Maison d'Or ». Autrefois sa façade était décorée de feuilles d'or ! Regarde ses fenêtres en dentelle de pierre.",
    clue: "L'or d'hier a fondu au soleil, mais la dentelle de pierre, elle, n'a pas bougé.",
    chapters: [
      {
        "steps": [
          {
            "idx": 100,
            "where": "Depuis la rive opposée du Grand Canal, observe la dentelle de pierre tout en haut du palais. Regarde la pointe de plusieurs petits pinacles.",
            "q": "Quelle petite forme se trouve au sommet de ces pointes ?",
            "opts": [
              "Une boule",
              "Une étoile",
              "Un poisson",
              "Une cloche"
            ],
            "a": 0,
            "reveal": "Ces petits ornements au sommet des pinacles étaient autrefois dorés. La façade portait aussi des couleurs vives. Cet éclat explique le surnom « Ca’ d’Oro », ou « maison d’or ». La dorure d’origine a disparu : il faut l’imaginer en regardant la pierre d’aujourd’hui.",
            "img": "img/q/cadoro-0.webp",
            "src": [
              "https://museiveneto.cultura.gov.it/musei/galleria-giorgio-franchetti-alla-ca-doro/sede"
            ],
            "cap": "Les petites boules couronnent les pinacles ; la photographie montre leur aspect actuel."
          },
          {
            "idx": 101,
            "where": "Place-toi face à la façade qui touche le Grand Canal. Compte les grandes ouvertures en arc tout en bas, juste au-dessus de l’eau ; ne compte pas les fenêtres des étages.",
            "q": "Combien de grandes arcades vois-tu au niveau de l’eau ?",
            "opts": [
              "Trois",
              "Quatre",
              "Cinq",
              "Six"
            ],
            "a": 2,
            "reveal": "La Ca’ d’Oro a été construite entre 1421 et 1440 pour le riche marchand vénitien Marino Contarini. Sa façade donne directement sur le Grand Canal. Ce niveau à arcades rappelle combien les palais vénitiens étaient liés à la circulation par l’eau.",
            "img": "img/q/cadoro-1.webp",
            "src": [
              "https://museiveneto.cultura.gov.it/musei/galleria-giorgio-franchetti-alla-ca-doro/sede"
            ],
            "cap": "On distingue cinq grandes arcades alignées au ras du Grand Canal."
          },
          {
            "idx": 102,
            "where": "Depuis la rive opposée, compare les deux moitiés de la façade. Cherche les deux étages de loggias, ces galeries ouvertes portées par de fines colonnes.",
            "q": "De quel côté se trouvent les grandes loggias ouvertes ?",
            "opts": [
              "À gauche",
              "À droite",
              "Au milieu seulement",
              "Sur aucun côté"
            ],
            "a": 0,
            "reveal": "La façade est asymétrique : les grandes ouvertures superposées occupent surtout la moitié gauche, tandis que la partie droite présente davantage de mur et de fenêtres séparées. Les fines colonnes et les arcs découpés donnent à ce palais son allure gothique vénitienne.",
            "img": "img/q/cadoro-2.webp",
            "src": [
              "https://museiveneto.cultura.gov.it/musei/galleria-giorgio-franchetti-alla-ca-doro/sede"
            ],
            "cap": "Vue de face depuis le canal : les deux grandes loggias sont à gauche."
          },
          {
            "idx": 103,
            "where": "Observe la galerie ouverte située juste au-dessus des arcades de l’eau. Entre ses petits arcs de pierre, cherche un motif ajouré répété plusieurs fois.",
            "q": "À quelle forme ce motif ressemble-t-il le plus ?",
            "opts": [
              "Une fleur à quatre lobes",
              "Une étoile à cinq branches",
              "Un poisson",
              "Un triangle"
            ],
            "a": 0,
            "reveal": "On appelle ce motif un « quatre-feuilles » ou « quadrilobe ». Les ouvertures finement découpées sont caractéristiques du décor gothique de la Ca’ d’Oro. Elles laissent aussi passer la lumière à travers la galerie.",
            "img": "img/q/cadoro-3.webp",
            "src": [
              "https://museiveneto.cultura.gov.it/musei/galleria-giorgio-franchetti-alla-ca-doro/sede",
              "https://commons.wikimedia.org/wiki/File:Ca%27_d%27oro_vista_dalla_pescheria_04_polifora.JPG"
            ],
            "cap": "Les quatre-feuilles se répètent dans la partie ajourée au-dessus des colonnettes."
          },
          {
            "idx": 104,
            "where": "Cherche les petits animaux sculptés près des angles des balcons qui avancent vers le Grand Canal. Un zoom, des jumelles ou la photo de révélation peuvent aider.",
            "q": "Quel animal est sculpté à l’angle de ce balcon ?",
            "opts": [
              "Un cheval",
              "Un lion",
              "Un dauphin",
              "Un aigle"
            ],
            "a": 1,
            "reveal": "Ce lion fait partie des détails sculptés de la façade. Le lion est un animal familier dans l’art de Venise ; ici, l’important est d’observer la petite sculpture sur le balcon, sans la confondre avec le grand lion ailé de saint Marc.",
            "img": "img/q/cadoro-4.webp",
            "src": [
              "https://museiveneto.cultura.gov.it/musei/galleria-giorgio-franchetti-alla-ca-doro/sede",
              "https://commons.wikimedia.org/wiki/File:Ca%27_d%27Oro_-_Lion_au_balcon.jpg"
            ],
            "cap": "Le lion sculpté se trouve au coin du balcon, devant le Grand Canal."
          },
          {
            "idx": 105,
            "where": "Dans la cour, regarde la grande pièce de pierre sculptée placée au centre. Observe son ouverture supérieure : elle servait à puiser de l’eau.",
            "q": "Quel objet se trouve au milieu de la cour ?",
            "opts": [
              "Un puits",
              "Un four",
              "Un cadran solaire",
              "Un trône"
            ],
            "a": 0,
            "reveal": "Cette margelle de puits a été sculptée en 1427 par Bartolomeo Bon. Bien plus tard, le collectionneur Giorgio Franchetti l’a retrouvée sur le marché des antiquités à Paris et l’a rapportée dans la cour du palais.",
            "img": "img/q/cadoro-5.webp",
            "src": [
              "https://museiveneto.cultura.gov.it/musei/galleria-giorgio-franchetti-alla-ca-doro/sede",
              "https://cultura.gov.it/luogo/galleria-giorgio-franchetti-alla-ca-doro"
            ],
            "cap": "La grande margelle sculptée est celle du puits de la cour."
          },
          {
            "idx": 106,
            "where": "Dans la même cour, baisse les yeux. Parmi les pierres de différentes couleurs, repère les grands dessins géométriques qui reviennent dans le pavement.",
            "q": "Quelle forme géométrique se répète dans le sol ?",
            "opts": [
              "Des cercles",
              "Des étoiles à huit pointes",
              "Des flèches",
              "Des hexagones"
            ],
            "a": 0,
            "reveal": "Le sol de la cour a été composé par Giorgio Franchetti lors de la restauration du palais, avec des marbres de plusieurs couleurs. Son dessin s’inspire de pavements anciens, notamment byzantins. Franchetti a ensuite donné le palais et sa collection à l’État italien.",
            "img": "img/q/cadoro-6.webp",
            "src": [
              "https://museiveneto.cultura.gov.it/musei/galleria-giorgio-franchetti-alla-ca-doro/sede",
              "https://cultura.gov.it/luogo/galleria-giorgio-franchetti-alla-ca-doro"
            ],
            "cap": "Plusieurs grands cercles de pierres colorées structurent la mosaïque."
          },
          {
            "idx": 107,
            "where": "Devant le Saint Sébastien d’Andrea Mantegna, regarde tout en bas à droite du tableau. Cherche un petit objet blanc dont la flamme vient de s’éteindre.",
            "q": "Quel objet le peintre a-t-il placé là ?",
            "opts": [
              "Une bougie",
              "Une plume",
              "Une clé",
              "Une cuillère"
            ],
            "a": 0,
            "reveal": "Le musée décrit une bougie éteinte qui fume encore dans ce tableau de Mantegna, peint en 1506. C’est un rappel de la fragilité de la vie. Giorgio Franchetti tenait particulièrement à cette œuvre et l’a installée dans une petite chapelle de sa galerie.",
            "work": "CAD01",
            "img": "img/q/cadoro-7.webp",
            "src": [
              "https://museiveneto.cultura.gov.it/musei/galleria-giorgio-franchetti-alla-ca-doro/sede",
              "https://cultura.gov.it/luogo/galleria-giorgio-franchetti-alla-ca-doro"
            ],
            "cap": "Détail agrandi du bas droit : la petite bougie blanche apparaît près du pied du saint."
          }
        ]
      }
    ] },

  // ─── JOUR 3 : Dorsoduro ───
  { id: "accademia", emoji: "🪵", name: "Le pont de l'Académie", lat: 45.43166, lon: 12.32896, r: 60,
    story: "Un pont en bois ! Du haut du pont tu vois tout le Grand Canal, jusqu'à la grande église de la Salute.",
    clue: "Du bois sur l'eau : le pont se souvient des arbres. Regarde au loin, la réponse arrive en bateau.",
    chapters: [
      {
        "steps": [
          {
            "idx": 100,
            "where": "Depuis le quai, regarde la longue rambarde sombre qui suit la courbe du pont, puis approche-toi de ses montants.",
            "q": "Quel matériau vois-tu surtout dans cette rambarde ?",
            "opts": [
              "Le bois",
              "Le marbre",
              "Le verre",
              "La brique"
            ],
            "a": 0,
            "reveal": "Le pont actuel fut conçu par l’ingénieur Eugenio Miozzi comme un passage provisoire en bois, inauguré en 1933. Il remplaçait un pont de fer ouvert en 1854. Le provisoire est resté, même si des éléments métalliques ont ensuite renforcé la structure.",
            "img": "img/q/accademia-0.webp",
            "src": [
              "https://artbonus.gov.it/ponte-dellaccademia.html",
              "https://www.veneziaunica.it/it/cosa-fare-a-venezia/itinerari/dorsoduro-sestiere-d-arte"
            ],
            "cap": "La longue rambarde courbe du pont est habillée de bois."
          },
          {
            "idx": 101,
            "where": "Depuis un quai voisin, regarde le pont de côté et compte les passages que les bateaux peuvent emprunter sous lui.",
            "q": "Combien de grandes arches franchissent le Grand Canal ?",
            "opts": [
              "Une",
              "Deux",
              "Trois",
              "Quatre"
            ],
            "a": 0,
            "reveal": "Le pont franchit le Grand Canal par une seule grande arche. La Ville de Venise indique une portée d’environ 48 mètres. Cette ouverture laisse passer les bateaux et donne au pont sa silhouette haute et courbée.",
            "img": "img/q/accademia-1.webp",
            "src": [
              "https://live.comune.venezia.it/it/2025/04/ponte-dellaccademia-libera-al-progetto-definitivo",
              "https://artbonus.gov.it/ponte-dellaccademia.html"
            ],
            "cap": "Une seule grande arche forme le passage sous le pont."
          },
          {
            "idx": 102,
            "where": "Regarde sous la passerelle, entre la grande courbe de l’arche et le plancher sur lequel marchent les passants. Les barres s’y croisent.",
            "q": "Quelle forme géométrique se répète dans ce treillis ?",
            "opts": [
              "Des triangles",
              "Des cercles",
              "Des étoiles",
              "Des hexagones"
            ],
            "a": 0,
            "reveal": "Ce treillis contribue à la solidité du pont. Des éléments en acier ont remplacé ou renforcé des parties de sa structure au XXe siècle, notamment en 1948 et en 1985. Le pont mêle donc bois visible et métal porteur.",
            "img": "img/q/accademia-2.webp",
            "src": [
              "https://artbonus.gov.it/ponte-dellaccademia.html"
            ],
            "cap": "Les barres sous le tablier composent une suite de triangles."
          },
          {
            "idx": 103,
            "where": "Place-toi au pied du pont et regarde le chemin qui mène à son point le plus haut. Observe bien le sol sous les pieds des passants.",
            "q": "Qu’est-ce qui permet de monter au sommet du pont ?",
            "opts": [
              "Des marches",
              "Une pente lisse sans marche",
              "Un escalier en spirale",
              "Un ascenseur"
            ],
            "a": 0,
            "reveal": "Les marches conduisent au sommet de la grande arche. Elles s’usent sous les pas et doivent être entretenues : un grand chantier de restauration du pont a prévu de refaire toutes les marches et les parties en bois abîmées.",
            "img": "img/q/accademia-3.webp",
            "src": [
              "https://artbonus.gov.it/ponte-dellaccademia.html"
            ],
            "cap": "Les marches de bois montent vers le point le plus haut du pont."
          },
          {
            "idx": 104,
            "where": "Arrête-toi au sommet, face au Grand Canal qui s’élargit vers la lagune. Au loin, cherche une grande église claire coiffée d’un dôme.",
            "q": "Quel bâtiment domine cette vue ?",
            "opts": [
              "La basilique de la Salute",
              "Le palais des Doges",
              "La gare Santa Lucia",
              "Le marché aux poissons"
            ],
            "a": 0,
            "reveal": "La basilique Santa Maria della Salute se reconnaît à son grand dôme. La République de Venise décida de l’élever pendant la terrible épidémie de peste de 1630, comme prière et remerciement. Depuis le pont, elle marque l’extrémité du Grand Canal.",
            "img": "img/q/accademia-4.webp",
            "src": [
              "https://bur.regione.veneto.it/BurvServices/pubblica/burvGalleryDettaglio.aspx?id=1452",
              "https://www.veneziaunica.it/it/cosa-fare-a-venezia/altre-chiese-di-venezia/basilica-della-salute"
            ],
            "cap": "Le dôme de la Salute se dresse au loin, au bord du Grand Canal."
          },
          {
            "idx": 105,
            "where": "Descends du côté Dorsoduro. Sur la façade claire des Gallerie dell’Accademia, lève les yeux tout en haut, au-dessus des colonnes.",
            "q": "Quels mots sont gravés en haut de cette façade ?",
            "opts": [
              "Accademia di Belle Arti",
              "Mercato del Pesce",
              "Palazzo Ducale",
              "Stazione Ferroviaria"
            ],
            "a": 0,
            "reveal": "L’inscription rappelle l’Académie des beaux-arts installée ici en 1807, dans l’ancien ensemble de la Carità. Les Gallerie de l’Académie conservent aujourd’hui une importante collection de peinture vénitienne. Le pont voisin a pris le nom de ce lieu.",
            "img": "img/q/accademia-5.webp",
            "src": [
              "https://www.gallerieaccademia.it/collezioni/storia/",
              "https://www.gallerieaccademia.it/sites/default/files/repository/file/2024-06/BROCHURE%20nuova%20foto%20facciata-specifiche%20agg.06_24_compressed.pdf",
              "https://www.veneziaunica.it/it/cosa-fare-a-venezia/itinerari/dorsoduro-sestiere-d-arte"
            ],
            "cap": "« ACCADEMIA DI BELLE ARTI » est gravé tout en haut de la façade."
          }
        ]
      }
    ] },
  {
    "id": "gallerieaccademia",
    "emoji": "🖼️",
    "name": "Les Gallerie dell’Accademia",
    "lat": 45.43137,
    "lon": 12.32809,
    "r": 65,
    "story": "Entre dans les Gallerie dell’Accademia, sur le Campo della Carità. Huit tableaux t’attendent, du Carpaccio au Longhi. L’accrochage peut changer : prends le plan à l’accueil pour retrouver les salles.",
    "clue": "Derrière la façade de l’ancienne Carità, les peintres de Venise ont caché huit détails à retrouver.",
    "chapters": [
      {
        "steps": [
          {
            "idx": 300,
            "where": "Dans la salle II, regarde la partie basse de la Présentation de Jésus au Temple de Carpaccio.",
            "q": "Que font les petites figures assises sous la scène principale ?",
            "opts": [
              "Elles jouent de la musique",
              "Elles écrivent une lettre",
              "Elles tiennent des rames",
              "Elles dorment"
            ],
            "a": 0,
            "reveal": "Carpaccio a peint ce retable en 1510 pour l’église vénitienne de San Giobbe. Au centre, le prêtre Siméon reçoit l’enfant Jésus ; au-dessous, les anges musiciens donnent à la scène une présence joyeuse.",
            "work": "ACC02",
            "img": "img/q/gallerieaccademia-0.webp",
            "src": [
              "https://www.gallerieaccademia.it/opera/presentazione-di-gesu-al-tempio-4/"
            ],
            "cap": "Les anges et leurs instruments apparaissent au premier plan."
          },
          {
            "idx": 301,
            "where": "Dans la salle IV, cherche la petite Madonna degli alberetti de Giovanni Bellini. Regarde de chaque côté du rideau vert.",
            "q": "Combien de peupliers encadrent le rideau ?",
            "opts": [
              "Un",
              "Deux",
              "Trois",
              "Quatre"
            ],
            "a": 1,
            "reveal": "Ces deux peupliers donnent son surnom au tableau. Bellini l’a signé et daté de 1487 sur le parapet peint au premier plan : un détail précieux pour les historiens de l’art.",
            "work": "ACC04",
            "img": "img/q/gallerieaccademia-1.webp",
            "src": [
              "https://www.gallerieaccademia.it/opera/madonna-degli-alberetti/"
            ],
            "cap": "Les deux peupliers encadrent le rideau vert."
          },
          {
            "idx": 302,
            "where": "Reste dans la salle IV. Dans le Saint Georges de Mantegna, regarde près des bottes et de la lance.",
            "q": "Quel animal fabuleux vois-tu au sol ?",
            "opts": [
              "Un griffon",
              "Une licorne",
              "Un dragon",
              "Un serpent de mer"
            ],
            "a": 2,
            "reveal": "Saint Georges est représenté après sa victoire sur le dragon de la légende. Le chevalier immobile, en armure, occupe presque toute la petite peinture sur bois.",
            "work": "ACC05",
            "img": "img/q/gallerieaccademia-2.webp",
            "src": [
              "https://www.gallerieaccademia.it/opera/san-giorgio/"
            ],
            "cap": "Le dragon gît près des bottes du chevalier."
          },
          {
            "idx": 303,
            "where": "Dans la salle VIII, prends le temps de parcourir le ciel de La Tempête de Giorgione, au-dessus des bâtiments.",
            "q": "Qu’est-ce qui fend le ciel ?",
            "opts": [
              "Une comète",
              "Un éclair",
              "Un feu d’artifice",
              "Un arc-en-ciel"
            ],
            "a": 1,
            "reveal": "L’éclair a donné son nom au tableau. Le musée souligne que le sens exact de la scène reste discuté : on peut identifier ce que l’on voit sans prétendre résoudre toute son énigme.",
            "work": "ACC11",
            "img": "img/q/gallerieaccademia-3.webp",
            "src": [
              "https://www.gallerieaccademia.it/opera/la-tempesta/"
            ],
            "cap": "Un éclair déchire le ciel au-dessus de la ville."
          },
          {
            "idx": 304,
            "where": "Dans la salle X, repère le très grand Repas chez Lévi de Véronèse. Sous l’arc de gauche, près de l’escalier, cherche un petit personnage en orange.",
            "q": "Quel animal tient-il ?",
            "opts": [
              "Un chien",
              "Un faucon",
              "Un chat",
              "Un perroquet"
            ],
            "a": 3,
            "reveal": "Ce détail fait partie des personnages insolites du banquet. En 1573, le peintre dut s’expliquer devant l’Inquisition à propos de sa composition ; il changea finalement le titre de la toile en Repas chez Lévi.",
            "work": "ACC14",
            "img": "img/q/gallerieaccademia-4.webp",
            "src": [
              "https://www.gallerieaccademia.it/opera/convito-in-casa-di-levi/"
            ],
            "cap": "Le petit personnage tient un perroquet."
          },
          {
            "idx": 305,
            "where": "Dans la salle XI, regarde le grand tableau où un homme est étendu au sol, entouré d’une foule. Suis les regards qui montent.",
            "q": "D’où arrive saint Marc pour le secourir ?",
            "opts": [
              "De la porte du palais",
              "D’un bateau",
              "Du ciel",
              "De derrière la foule"
            ],
            "a": 2,
            "reveal": "Tintoret montre saint Marc apparaissant pour sauver un serviteur promis à la torture. Le tableau, peint en 1547–1548 pour la Scuola Grande di San Marco, fit connaître le jeune peintre à Venise.",
            "work": "ACC19",
            "img": "img/q/gallerieaccademia-5.webp",
            "src": [
              "https://www.gallerieaccademia.it/opera/san-marco-libera-uno-schiavo/"
            ],
            "cap": "Saint Marc descend du ciel vers le serviteur."
          },
          {
            "idx": 306,
            "where": "Dans la salle XXIV, cherche la très large Présentation de la Vierge au Temple de Titien. Dans la partie droite, trouve la petite Marie.",
            "q": "Par où monte-t-elle vers le temple ?",
            "opts": [
              "Une échelle de corde",
              "Un grand escalier",
              "Un sentier de montagne",
              "Une passerelle de bois"
            ],
            "a": 1,
            "reveal": "Titien a peint la toile entre 1534 et 1538 pour cette salle de la Scuola Grande della Carità. Elle y est encore présentée, dans le lieu pour lequel elle fut conçue. La tradition raconte que Marie monta seule les marches du Temple.",
            "work": "ACC27",
            "img": "img/q/gallerieaccademia-6.webp",
            "src": [
              "https://www.gallerieaccademia.it/opera/la-presentazione-della-vergine-al-tempio-con-i-confratelli-della-scuola-grande-della-carita/"
            ],
            "cap": "Marie monte les marches du grand escalier."
          },
          {
            "idx": 307,
            "where": "Au rez-de-chaussée, salle 6, observe Le Pharmacien de Pietro Longhi. Regarde les meubles derrière les personnages.",
            "q": "Que vois-tu rangé sur les étagères ?",
            "opts": [
              "Des armures",
              "Des coquillages",
              "Des instruments de musique",
              "Des pots de pharmacie"
            ],
            "a": 3,
            "reveal": "Longhi peint ici une scène de la vie quotidienne vénitienne du XVIIIe siècle. Le Pharmacien date de 1752 : ses personnages ressemblent à ceux d’une petite pièce de théâtre.",
            "work": "ACC28",
            "img": "img/q/gallerieaccademia-7.webp",
            "src": [
              "https://www.gallerieaccademia.it/opera/il-farmacista/"
            ],
            "cap": "Les pots de pharmacie sont rangés sur les étagères."
          }
        ]
      }
    ]
  },
  { id: "pugni", emoji: "🥊", name: "Le pont des Poings", lat: 45.43313, lon: 12.32433, r: 60,
    story: "Autrefois, deux bandes de Vénitiens se battaient à coups de poing sur ce pont, sans rambarde ! Cherche les empreintes de pieds gravées dans la pierre.",
    clue: "Ici les rivaux se faisaient face, pied contre pied. Marche dans leurs pas, mais sans te battre !",
    chapters: [
      {
        "steps": [
          {
            "idx": 100,
            "where": "Sur le pavé du pont, cherche une forme de pierre claire incrustée parmi les dalles plus sombres. Regarde son contour.",
            "q": "Que représente cette forme claire ?",
            "opts": [
              "Une main ouverte",
              "Une empreinte de pied",
              "Un poisson",
              "Une rame"
            ],
            "a": 1,
            "reveal": "Ces empreintes indiquaient où se plaçaient les adversaires avant les anciennes « guerres des poings ». Les deux groupes rivaux s’appelaient les Castellani et les Nicolotti. La Ville de Venise précise que les empreintes sont taillées dans la pierre d’Istrie.",
            "img": "img/q/pugni-0.webp",
            "src": [
              "https://live.comune.venezia.it/index.php/it/2025/04/una-calle-una-storia-ponte-dei-pugni"
            ],
            "cap": "La forme claire incrustée dans le pavé représente la plante d’un pied."
          },
          {
            "idx": 101,
            "where": "Marche sur le pont en regardant les quatre coins de son pavage. Compte toutes les empreintes claires, des deux côtés de la montée.",
            "q": "Combien d’empreintes de pieds sont incrustées sur ce pont ?",
            "opts": [
              "Deux",
              "Trois",
              "Quatre",
              "Six"
            ],
            "a": 2,
            "reveal": "Il y a une empreinte à chacun des quatre angles du pavage. Elles rappellent les positions de départ des combattants. Venise possède un autre pont appelé Ponte dei Pugni, près de Santa Fosca : celui-ci se trouve bien à Dorsoduro, vers le campo San Barnaba.",
            "src": [
              "https://live.comune.venezia.it/index.php/it/2025/04/una-calle-una-storia-ponte-dei-pugni"
            ]
          },
          {
            "idx": 102,
            "where": "Arrête-toi sur une rive et regarde la rambarde métallique du pont de profil. Observe les barres entre les montants verticaux.",
            "q": "Quel dessin répètent les barres de la rambarde ?",
            "opts": [
              "Des X",
              "Des cercles",
              "Des étoiles",
              "Des vagues"
            ],
            "a": 0,
            "reveal": "La rambarde actuelle protège les passants. Lors des combats d’autrefois, le pont n’avait pas de parapet : chaque camp cherchait aussi à pousser des adversaires dans le rio de San Barnaba, le canal situé juste dessous.",
            "img": "img/q/pugni-2.webp",
            "src": [
              "https://live.comune.venezia.it/index.php/it/2025/04/una-calle-una-storia-ponte-dei-pugni",
              "https://www.veneziaunica.it/it/cosa-fare-a-venezia/itinerari/dorsoduro-sestiere-d-arte"
            ],
            "cap": "Les barres sombres de la rambarde se croisent en X."
          },
          {
            "idx": 103,
            "where": "Descends du pont et regarde-le de côté, depuis le bord du canal. Suis le bord blanc qui passe au-dessus de l’eau.",
            "q": "Quelle forme dessine ce passage sous le pont ?",
            "opts": [
              "Un arc",
              "Un triangle",
              "Un rectangle",
              "Un cercle fermé"
            ],
            "a": 0,
            "reveal": "L’arche laisse passer les embarcations sur le rio de San Barnaba. Avant les combats, le fond du canal était nettoyé afin de réduire les blessures de ceux qui tombaient à l’eau. Cela montre bien que ces affrontements étaient réels, et dangereux.",
            "img": "img/q/pugni-3.webp",
            "src": [
              "https://live.comune.venezia.it/index.php/it/2025/04/una-calle-una-storia-ponte-dei-pugni"
            ],
            "cap": "Sous le tablier du pont, un seul grand arc blanc franchit le canal."
          },
          {
            "idx": 104,
            "where": "Depuis le pont, regarde vers le campo San Barnaba. Derrière les maisons, repère le haut clocher en briques et observe son toit.",
            "q": "Quelle forme a le sommet de ce clocher ?",
            "opts": [
              "Une pointe conique",
              "Un dôme rond",
              "Un toit plat",
              "Deux flèches jumelles"
            ],
            "a": 0,
            "reveal": "C’est le campanile de l’église San Barnaba. L’office de tourisme de Venise indique que sa tour en briques remonte aux environs de l’an mil ; la pointe conique est d’une époque plus tardive. Le clocher aide à retrouver le campo depuis le pont.",
            "img": "img/q/pugni-4.webp",
            "src": [
              "https://www.veneziaunica.it/it/cosa-fare-a-venezia/itinerari/dorsoduro-sestiere-d-arte"
            ],
            "cap": "Le campanile de briques est visible derrière le pont, avec une pointe conique."
          },
          {
            "idx": 105,
            "where": "Après le pont, avance jusqu’à la place devant l’église. Cherche, au milieu du campo, une grande construction basse en pierre, de forme polygonale.",
            "q": "Quel ancien équipement de la place est-ce ?",
            "opts": [
              "Une margelle de puits",
              "Un four à pain",
              "Un socle de statue",
              "Un bassin à poissons"
            ],
            "a": 0,
            "reveal": "Cette margelle est un témoin de la vie quotidienne : les anciens puits vénitiens servaient à puiser l’eau de pluie recueillie et filtrée. L’office de tourisme de Venise date celle du campo San Barnaba du XVIe siècle.",
            "img": "img/q/pugni-5.webp",
            "src": [
              "https://www.veneziaunica.it/it/cosa-fare-a-venezia/itinerari/dorsoduro-sestiere-d-arte",
              "https://live.comune.venezia.it/it/2025/04/campi-campielli-e-corti-ma-una-sola-piazza"
            ],
            "cap": "La grande margelle de pierre se trouve devant la façade de l’église."
          },
          {
            "idx": 106,
            "where": "Lève les yeux au sommet de la façade blanche de l’église San Barnaba. Dans le grand fronton triangulaire, cherche la petite ouverture décorée.",
            "q": "Quelle est la forme de cette ouverture ?",
            "opts": [
              "Un rond",
              "Un carré",
              "Une étoile",
              "Un losange"
            ],
            "a": 0,
            "reveal": "L’ouverture ronde se trouve dans le fronton triangulaire de l’église. La façade visible aujourd’hui résulte d’une reconstruction du milieu du XVIIIe siècle. Curiosité de cinéma : cette façade apparaît dans le film Indiana Jones et la Dernière Croisade.",
            "img": "img/q/pugni-6.webp",
            "src": [
              "https://www.veneziaunica.it/it/cosa-fare-a-venezia/itinerari/dorsoduro-sestiere-d-arte"
            ],
            "cap": "La petite ouverture ronde est placée au centre du grand triangle au sommet de la façade."
          }
        ]
      }
    ] },
  { id: "squero", emoji: "⛵", name: "Le chantier des gondoles", lat: 45.43034, lon: 12.32602, r: 60,
    story: "Au squero San Trovaso, on construit et on répare des gondoles depuis des siècles. Elles sont toutes noires !",
    clue: "Tu veux connaître un bateau ? Va voir où il est né. Les gondoles gardent leur secret en noir.",
    chapters: [
      {
        "steps": [
          {
            "idx": 100,
            "where": "Place-toi sur la rive publique en face du chantier. Regarde le sol de la cour, entre les ateliers et le canal : une large surface descend doucement vers l’eau.",
            "q": "Quel aménagement vois-tu à cet endroit ?",
            "opts": [
              "Une rampe inclinée",
              "Un escalier en colimaçon",
              "Une fontaine",
              "Une passerelle suspendue"
            ],
            "a": 0,
            "reveal": "Cette rampe permet de mettre les bateaux à l’eau et de les remonter pour les réparer. Le Squero di San Trovaso est un chantier toujours actif : on y construit et entretient des gondoles et d’autres petites embarcations vénitiennes.",
            "img": "img/q/squero-0.webp",
            "src": [
              "https://www.veneziaunica.it/it/cosa-fare-a-venezia/itinerari/dorsoduro-sestiere-d-arte",
              "https://www.squerosantrovaso.com/attivita.html"
            ],
            "cap": "La cour du chantier descend en pente douce jusqu’au rio de San Trovaso."
          },
          {
            "idx": 101,
            "where": "Repère le bâtiment bas ouvert sur la cour, sous un grand toit soutenu par des poteaux. On peut y travailler tout en restant à l’abri.",
            "q": "Quel type d’espace est-ce ?",
            "opts": [
              "Un hangar couvert",
              "Une tour de guet",
              "Une serre vitrée",
              "Un clocher"
            ],
            "a": 0,
            "reveal": "Cet abri de travail est appelé une « tesa ». Il protège les bateaux et les artisans de la pluie et permet de ranger les outils. La Ville de Venise décrit le chantier comme un ensemble de trois bâtiments, dont un plus bas avec une aire couverte pour les embarcations.",
            "img": "img/q/squero-1.webp",
            "src": [
              "https://www.veneziaunica.it/it/cosa-fare-a-venezia/itinerari/dorsoduro-sestiere-d-arte"
            ],
            "cap": "Le hangar bas et ouvert donne directement sur la cour du chantier."
          },
          {
            "idx": 102,
            "where": "Regarde le grand bâtiment du chantier, au-dessus du rez-de-chaussée. Une longue galerie extérieure court sous le bord du toit.",
            "q": "Quel élément vois-tu le long de cet étage ?",
            "opts": [
              "Un balcon en bois",
              "Une rangée de statues",
              "Une verrière arrondie",
              "Un cadran solaire géant"
            ],
            "a": 0,
            "reveal": "La Ville de Venise remarque que ce balcon de bois fait penser aux maisons de montagne. Les premiers propriétaires des squeri venaient du Cadore, région d’où arrivaient aussi des artisans du bois et du bois destiné aux bateaux.",
            "img": "img/q/squero-2.webp",
            "src": [
              "https://www.veneziaunica.it/it/cosa-fare-a-venezia/itinerari/dorsoduro-sestiere-d-arte"
            ],
            "cap": "Une longue galerie avec sa rambarde de bois court devant l’étage supérieur."
          },
          {
            "idx": 103,
            "where": "Compare les murs de l’atelier avec les maisons voisines en brique. Observe surtout les façades foncées de l’étage et les planches verticales.",
            "q": "Quel matériau domine sur ces façades du chantier ?",
            "opts": [
              "Le bois",
              "Le verre",
              "Le marbre",
              "Le métal"
            ],
            "a": 0,
            "reveal": "Le bâtiment du squero est largement construit en bois, comme le confirme la Ville de Venise. Ce matériau était aussi essentiel à la fabrication des embarcations. Le chantier existe depuis le XVIIe siècle au moins.",
            "img": "img/q/squero-3.webp",
            "src": [
              "https://live.comune.venezia.it/it/2025/04/campo-san-trovaso",
              "https://www.veneziaunica.it/it/cosa-fare-a-venezia/itinerari/dorsoduro-sestiere-d-arte"
            ],
            "cap": "Les planches sombres du chantier contrastent avec les façades en brique des maisons voisines."
          },
          {
            "idx": 104,
            "where": "Lève les yeux vers le haut des ateliers en bois. Suis la ligne des toits au-dessus de la cour et du balcon.",
            "q": "Quelle forme ont les toits du chantier ?",
            "opts": [
              "Ils sont en pente",
              "Ils sont plats",
              "Ils forment des dômes",
              "Ils ont une seule flèche très haute"
            ],
            "a": 0,
            "reveal": "Ces toits inclinés renforcent l’allure de maison de montagne du squero. L’abri sous le toit permettait de travailler et de stocker des outils même par temps de pluie. Le bois et les charpentiers venaient traditionnellement du Cadore.",
            "img": "img/q/squero-4.webp",
            "src": [
              "https://www.veneziaunica.it/it/cosa-fare-a-venezia/itinerari/dorsoduro-sestiere-d-arte"
            ],
            "cap": "Les toits de tuiles dessinent plusieurs pentes au-dessus des ateliers."
          },
          {
            "idx": 105,
            "where": "Si une gondole est posée hors de l’eau dans la cour, regarde juste sous sa coque. Ne cherche pas ce détail si aucun bateau n’est sorti ce jour-là.",
            "q": "Sur quoi repose la gondole pendant le travail ?",
            "opts": [
              "Des chevalets de bois",
              "De grandes roues",
              "Des ballons gonflables",
              "Des colonnes de marbre"
            ],
            "a": 0,
            "reveal": "Les chevalets maintiennent la coque à hauteur de travail. Selon le chantier, les gondoles y sont encore construites à la main, pendant plusieurs mois, avec huit sortes de bois. Leur présence dans la cour varie selon les réparations en cours : cette fiche est à activer seulement si les chevalets sont visibles.",
            "img": "img/q/squero-5.webp",
            "src": [
              "https://www.squerosantrovaso.com/attivita.html"
            ],
            "cap": "Sur cette photographie, deux coques sont posées sur de petits supports en bois."
          },
          {
            "idx": 106,
            "where": "Traverse le pont vers le campo San Trovaso et fais le tour de l’église voisine. Regarde ses deux façades qui donnent sur des côtés différents.",
            "q": "Combien de façades de l’église possèdent un grand portail d’entrée ?",
            "opts": [
              "Une",
              "Deux",
              "Trois",
              "Quatre"
            ],
            "a": 1,
            "reveal": "L’église San Trovaso présente deux façades, chacune avec son portail. Son nom est une contraction des prénoms des saints Gervais et Protais (Gervasio et Protasio en italien). La Ville de Venise indique que l’édifice a été reconstruit au XVIe siècle.",
            "src": [
              "https://live.comune.venezia.it/it/2025/04/campo-san-trovaso",
              "https://www.veneziaunica.it/it/cosa-fare-a-venezia/itinerari/dorsoduro-sestiere-d-arte"
            ]
          }
        ]
      }
    ] },
  { id: "salute", emoji: "⛪", name: "La Salute", lat: 45.4306, lon: 12.3347, r: 80,
    story: "Cette énorme église est posée sur plus d'un million de pieux de bois plantés dans la vase de la lagune !",
    clue: "Les grandes choses ont des racines cachées. Monte les marches et chuchote ton souhait au vent.",
    chapters: [
      {
        "steps": [
          {
            "idx": 100,
            "where": "Avant d’entrer, regarde la basilique depuis le parvis. Dans son nom italien, Salute signifie « santé ».",
            "q": "À ton avis, pourquoi les Vénitiens ont-ils fait construire cette église ?",
            "opts": [
              "Pour remercier la Vierge après une terrible épidémie de peste",
              "Pour célébrer une victoire navale",
              "Pour commémorer un grand incendie",
              "Pour rappeler une inondation du Grand Canal"
            ],
            "a": 0,
            "reveal": "En 1630, alors que la peste ravage Venise, le doge et le Sénat promettent de construire une église dédiée à Marie si la ville est délivrée de la maladie. Les travaux commencent en 1631. La basilique est consacrée en 1687. Elle garde le souvenir de ce vœu et de la gratitude des Vénitiens après la fin de l’épidémie.",
            "img": "img/q/salute-1.webp",
            "src": [
              "https://www.patriarcatovenezia.it/venezia-in-pellegrinaggio-alla-madonna-della-salute-per-rinnovare-lantico-voto/",
              "https://basilicasalutevenezia.it/la-basilica/",
              "https://www.scuolagrandesanrocco.org/en/not-only-tintoretto/the-grand-staircase/"
            ],
            "cap": "Antonio Zanchi a peint cette esquisse vers 1666 pour une œuvre évoquant la peste de 1630 à Venise."
          },
          {
            "idx": 101,
            "where": "Place-toi devant la grande porte. Regarde le petit cercle au milieu du fronton triangulaire, juste au-dessus de l’entrée.",
            "q": "Quel motif vois-tu dans ce cercle ?",
            "opts": [
              "Une couronne",
              "Une étoile",
              "Une coquille",
              "Un lion"
            ],
            "a": 1,
            "reveal": "Il s’agit d’une étoile à huit pointes. Elle évoque Stella Maris, « étoile de la mer », un titre donné à Marie. La façade annonce ainsi à qui la basilique est dédiée.",
            "img": "img/q/salute-2.webp",
            "src": [
              "https://www.visitvenezia.eu/venezianita/scopri-venezia/la-festa-della-madonna-della-salute-un-legame-profondo-tra-venezia-e-le-sue-tradizioni"
            ],
            "cap": "L’étoile est au centre du triangle, au dessus de la grande arche."
          },
          {
            "idx": 102,
            "where": "Recule de quelques pas sur le parvis et regarde la base de la grande coupole, derrière la façade.",
            "q": "Quelle forme prennent les grands éléments de pierre qui remontent vers la coupole ?",
            "opts": [
              "Des lignes en zigzag",
              "Des pyramides",
              "Des spirales",
              "Des colonnes torsadées"
            ],
            "a": 2,
            "reveal": "Ces grandes volutes sont des contreforts. Leur forme enroulée est l’un des signes les plus reconnaissables de la Salute, conçue par l’architecte Baldassare Longhena.",
            "img": "img/q/salute-3.webp",
            "src": [
              "https://www.visitvenezia.eu/venezianita/scopri-venezia/la-festa-della-madonna-della-salute-un-legame-profondo-tra-venezia-e-le-sue-tradizioni",
              "https://basilicasalutevenezia.it/la-basilica/"
            ],
            "cap": "Une grande volute apparaît de chaque côté de la coupole, près de sa base."
          },
          {
            "idx": 103,
            "where": "Dans la partie au fond de l’église, observe le grand autel. À gauche du groupe central, cherche une statue d’homme tenant un livre, puis baisse les yeux vers son socle.",
            "q": "Quel animal est sculpté sous cette statue ?",
            "opts": [
              "Un aigle",
              "Un taureau",
              "Un cheval",
              "Un lion"
            ],
            "a": 3,
            "reveal": "La statue représente saint Marc. Le lion est son symbole traditionnel et il est aussi devenu l’emblème de Venise. Il relie donc ce décor religieux à l’histoire de la ville.",
            "img": "img/q/salute-4.webp",
            "src": [
              "https://www.wga.hu/html_m/d/de_corte/altar_x.html",
              "https://live.comune.venezia.it/it/node/132935"
            ],
            "cap": "Le lion se trouve tout en bas à gauche de l’autel."
          },
          {
            "idx": 104,
            "where": "Regarde la partie haute du grand autel. Repère Marie et l’Enfant au centre, puis observe la figure qui s’éloigne à leur droite.",
            "q": "Qui semble s’enfuir, les bras levés ?",
            "opts": [
              "Un jeune garçon",
              "Une femme âgée",
              "Un soldat en armure",
              "Un ange ailé"
            ],
            "a": 1,
            "reveal": "Dans cette sculpture de Giusto Le Court, la femme qui fuit personnifie la peste. De l’autre côté, une femme agenouillée représente Venise qui demande de l’aide à Marie. La basilique fut voulue après la terrible épidémie de 1630.",
            "img": "img/q/salute-4.webp",
            "src": [
              "https://basilicasalutevenezia.it/la-basilica/",
              "https://www.patriarcatovenezia.it/descrizione/storia-del-patriarcato/"
            ],
            "cap": "La figure qui fuit est en haut à droite du groupe sculpté."
          },
          {
            "idx": 105,
            "where": "Depuis l’entrée principale, avance vers le premier autel à gauche. Regarde tout en haut du grand tableau de la Pentecôte.",
            "q": "Quel oiseau apparaît dans les rayons de lumière ?",
            "opts": [
              "Un cygne",
              "Un aigle",
              "Une colombe",
              "Un paon"
            ],
            "a": 2,
            "reveal": "La colombe représente ici l’Esprit saint. Ce tableau est une œuvre du Titien. Il se trouvait autrefois dans l’église de Santo Spirito in Isola et fut transféré à la Salute en 1656.",
            "work": "SAL03",
            "img": "img/q/salute-5.webp",
            "src": [
              "https://basilicasalutevenezia.it/altare-della-discesa-dello-spirito-santo/"
            ],
            "cap": "La colombe est tout en haut du tableau, au départ des rayons."
          },
          {
            "idx": 106,
            "where": "Va au deuxième autel à gauche de l’entrée. Dans le grand tableau, regarde le personnage debout au centre, vêtu d’un habit sombre.",
            "q": "Quelles fleurs blanches vois-tu près de son épaule ?",
            "opts": [
              "Des lys",
              "Des roses",
              "Des tulipes",
              "Des marguerites"
            ],
            "a": 0,
            "reveal": "Il s’agit de saint Antoine de Padoue. Le lys blanc est un symbole de pureté. Pietro Liberi a peint ce tableau pour un autel voulu par le Sénat vénitien pendant la guerre de Candie. L’œuvre était achevée en 1656.",
            "img": "img/q/salute-6.webp",
            "src": [
              "https://basilicasalutevenezia.it/altare-di-santantonio/",
              "https://restituzioni.com/opere/venezia-supplica-santantonio-di-padova-perch-interceda-per-la-cessazione-della-guerra-di-candia/"
            ],
            "cap": "Les fleurs blanches sont à droite de la tête de saint Antoine."
          }
        ]
      }
    ] },
  { id: "dogana", emoji: "🔮", name: "La boule d'or", lat: 45.43085, lon: 12.33662, r: 60,
    story: "Tout au bout de la pointe, deux géants portent une grosse boule dorée. Dessus, une statue tourne avec le vent.",
    clue: "Celui qui tourne ne se perd jamais : il montre la route aux navires. Dis bonjour à la place d'en face.",
    chapters: [
      {
        "steps": [
          {
            "idx": 100,
            "where": "Depuis la promenade publique, lève les yeux vers la petite tour blanche à la pointe. Observe l’objet brillant porté par des personnages sculptés.",
            "q": "Quel objet soutiennent-ils ?",
            "opts": [
              "Une cloche géante",
              "Un globe doré",
              "Une couronne",
              "Une ancre"
            ],
            "a": 1,
            "reveal": "Ce grand globe évoque le monde. Il couronne l’ancienne Dogana da Mar, la douane maritime où l’on contrôlait les marchandises arrivant par bateau. La forme actuelle du bâtiment fut achevée en 1682, d’après le projet de Giuseppe Benoni.",
            "img": "img/q/dogana-0.webp",
            "src": [],
            "cap": "Le globe doré se trouve tout au-dessus de la tour blanche."
          },
          {
            "idx": 101,
            "where": "Regarde juste sous la grande boule. Des silhouettes se penchent de part et d’autre du piédestal. Compte-les sans compter la personne debout tout en haut.",
            "q": "Combien de figures portent la boule ?",
            "opts": [
              "Une",
              "Deux",
              "Trois",
              "Quatre"
            ],
            "a": 1,
            "reveal": "Ce sont deux Atlantes : dans l’art, on appelle ainsi des figures humaines qui semblent porter une lourde charge. Les archives mentionnées par l’encyclopédie Treccani confirment la commande du groupe des deux Atlantes, du globe et de la Fortune au sculpteur Bernardo Falconi en 1678.",
            "img": "img/q/dogana-1.webp",
            "src": [],
            "cap": "Les deux Atlantes sont accroupis sous le globe."
          },
          {
            "idx": 102,
            "where": "Cherche la figure debout sur la boule. Observe la grande pièce dorée qu’elle tient devant elle. Sa forme rappelle un objet de bateau.",
            "q": "À quoi cette pièce dorée ressemble-t-elle le plus ?",
            "opts": [
              "Une voile",
              "Une épée",
              "Une lanterne",
              "Une rame"
            ],
            "a": 0,
            "reveal": "La figure représente la Fortune. Avec sa grande pièce exposée au vent, la statue servait de girouette : elle pouvait tourner pour indiquer d’où venait le vent. La National Gallery la reconnaît aussi comme une girouette dans une vue de Venise peinte vers 1770 par Francesco Guardi.",
            "img": "img/q/dogana-2.webp",
            "src": [],
            "cap": "La pièce dorée est courbe, comme une petite voile ; la statue se trouve sur le globe."
          },
          {
            "idx": 103,
            "where": "Longe l’un des côtés de l’ancienne douane. Observe la série de grandes ouvertures semblables sur la façade côté eau.",
            "q": "Quelle forme dessine le haut de ces ouvertures ?",
            "opts": [
              "Un arc arrondi",
              "Un triangle pointu",
              "Une ligne droite",
              "Un cercle complet"
            ],
            "a": 0,
            "reveal": "Ces ouvertures rythment les longues façades de la Dogana da Mar. Le bâtiment, édifié à la fin du XVIIe siècle, servait à la douane maritime. Il accueille aujourd’hui des expositions d’art contemporain.",
            "img": "img/q/dogana-3.webp",
            "src": [],
            "cap": "Les ouvertures répétées ont un sommet en arc arrondi."
          },
          {
            "idx": 104,
            "where": "Avance vers l’extrémité de la promenade. Observe les deux longs côtés de l’ancienne douane : ils se rapprochent vers la petite tour.",
            "q": "Quelle forme dessinent ces deux côtés qui se rejoignent ?",
            "opts": [
              "Une pointe triangulaire",
              "Un cercle",
              "Un carré",
              "Une spirale"
            ],
            "a": 0,
            "reveal": "La Dogana occupe une pointe triangulaire entre le Grand Canal et le canal de la Giudecca. Vue depuis l’eau, elle rappelle la proue d’un bateau. Sa position était idéale pour surveiller le passage des navires et des marchandises à l’entrée du Grand Canal.",
            "img": "img/q/dogana-4.webp",
            "src": [],
            "cap": "Vue depuis San Giorgio Maggiore : la douane s’avance en pointe, avec de l’eau de chaque côté."
          }
        ]
      }
    ] },
  { id: "margherita", emoji: "⚽", name: "Campo Santa Margherita", lat: 45.43435, lon: 12.32377, r: 90,
    story: "Une grande place où les Vénitiens se retrouvent, discutent, mangent des glaces. Et où les enfants peuvent courir !",
    clue: "Là où l'on rit, le trésor sourit. Prenez le temps de jouer, Gardiens.",
    chapters: [
      {
        "steps": [
          {
            "idx": 300,
            "where": "Cherche la haute tour de briques à l’extrémité du campo. Regarde bien sa partie supérieure : elle ne ressemble pas au sommet habituel d’un clocher.",
            "q": "Comment se termine cette tour aujourd’hui ?",
            "opts": [
              "Par un sommet plat et tronqué",
              "Par une flèche très pointue",
              "Par une grande coupole",
              "Par une statue dorée"
            ],
            "a": 0,
            "reveal": "C’est le clocher de l’ancienne église Santa Margherita, qui a donné son nom au campo. Sa partie haute fut démolie en 1808 parce qu’elle était devenue dangereuse. L’église, désacralisée au XIXe siècle, sert aujourd’hui d’auditorium de l’université Ca’ Foscari.",
            "img": "img/q/margherita-0.webp",
            "src": [
              "https://live.comune.venezia.it/it/2025/04/una-calle-una-storia-santa-margherita",
              "https://www.unive.it/pag/fileadmin/user_upload/ateneo/spazi/schede-storiche/scheda_cenni_storici_smargherita_eng.pdf"
            ],
            "cap": "Le clocher de briques se termine brusquement : son sommet a disparu."
          },
          {
            "idx": 301,
            "where": "Approche de l’ancien clocher et cherche, au-dessus d’un encadrement de pierre, une petite sculpture blanche. Observe son dos et ses côtés ; tu peux utiliser le zoom d’un appareil.",
            "q": "Quel détail distingue cette créature sculptée ?",
            "opts": [
              "Deux grandes ailes",
              "Une nageoire de poisson",
              "Des bois de cerf",
              "Une longue corne"
            ],
            "a": 0,
            "reveal": "Cette petite créature fantastique montre des ailes et des pattes. Elle décore l’ancien clocher de l’église Santa Margherita. Le sommet du clocher a été retiré en 1808 parce qu’il menaçait de s’écrouler.",
            "img": "img/q/margherita-1.webp",
            "src": [
              "https://live.comune.venezia.it/it/2025/04/una-calle-una-storia-santa-margherita",
              "https://www.unive.it/pag/fileadmin/user_upload/ateneo/spazi/schede-storiche/scheda_cenni_storici_smargherita_eng.pdf"
            ],
            "cap": "Les ailes sont visibles de part et d’autre du corps de la créature."
          },
          {
            "idx": 302,
            "where": "Trouve le bâtiment isolé au milieu de la place. Sur sa façade portant un relief blanc, compare les deux grandes fenêtres de l’étage.",
            "q": "Quelle forme a le haut de ces deux fenêtres ?",
            "opts": [
              "Un arc arrondi",
              "Une pointe triangulaire",
              "Une ligne horizontale",
              "Un cercle"
            ],
            "a": 0,
            "reveal": "Ce bâtiment est l’ancienne Scuola dei Varoteri, siège d’une confrérie liée au travail des fourrures et des peaux. Il fut construit ici en 1725. La confrérie avait auparavant un bâtiment près de l’église des Gesuiti.",
            "img": "img/q/margherita-2.webp",
            "src": [
              "https://live.comune.venezia.it/it/2025/04/una-calle-una-storia-santa-margherita"
            ],
            "cap": "Les deux fenêtres hautes, de part et d’autre du relief, sont arrondies au sommet."
          },
          {
            "idx": 303,
            "where": "Reste devant la même façade. Au centre de l’étage, repère le grand relief blanc et lève les yeux vers la tête du personnage principal.",
            "q": "Que porte ce personnage sur la tête ?",
            "opts": [
              "Une couronne",
              "Un casque",
              "Un large chapeau",
              "Une capuche"
            ],
            "a": 0,
            "reveal": "Le relief représente la Vierge Marie, avec l’Enfant et des membres de la confrérie sous son manteau. Cette image religieuse rappelle qu’une scuola vénitienne était aussi un lieu de dévotion et d’entraide pour ses membres.",
            "img": "img/q/margherita-3.webp",
            "src": [
              "https://www.conoscerevenezia.it/?p=15418",
              "https://live.comune.venezia.it/it/2025/04/una-calle-una-storia-santa-margherita"
            ],
            "cap": "Une couronne de pierre est visible au-dessus du visage central."
          },
          {
            "idx": 304,
            "where": "Cherche une margelle de puits en pierre sur la place. Examine sa partie supérieure : elle est fermée par un objet sombre en métal.",
            "q": "Qu’est-ce qui couvre l’ouverture du puits ?",
            "opts": [
              "Une grille de fer",
              "Une plaque de verre",
              "Un couvercle en bois",
              "Une pierre sculptée en lion"
            ],
            "a": 0,
            "reveal": "À Venise, l’eau des canaux est salée. Autrefois, de nombreux puits donnaient accès à l’eau de pluie recueillie et filtrée dans des citernes souterraines. La margelle visible ici rappelle ce système ingénieux ; la grille ferme aujourd’hui l’ouverture.",
            "img": "img/q/margherita-4.webp",
            "src": [
              "https://live.comune.venezia.it/it/node/125815",
              "https://live.comune.venezia.it/it/2025/04/campiello-del-piovan"
            ],
            "cap": "La grille métallique barre le dessus de la margelle en pierre."
          }
        ]
      }
    ] },

  // ─── JOUR 4 : les îles du verre ───
  { id: "fondamente", emoji: "🚤", name: "Départ pour les îles", lat: 45.44285, lon: 12.34095, r: 90,
    story: "Aux Fondamente Nove, on prend le bateau-bus pour Murano. Pendant la traversée, regarde les gros poteaux de bois plantés dans l'eau.",
    clue: "Les poteaux dans l'eau sont mes panneaux de signalisation. Suis-les et tu trouveras la bonne île.",
    tasks: [
      { t: "choice", q: "À quoi servent les gros poteaux de bois dans l'eau ?", opts: ["🚦 À guider les bateaux", "🍢 À faire des brochettes", "🎣 À pêcher"], a: 0, fact: "On les appelle des « bricole » : ils marquent les chenaux où les bateaux peuvent passer." },
      { t: "count", q: "Combien de bricole as-tu comptées pendant la traversée ?", a: null },
    ] },
  { id: "murano", emoji: "🏺", name: "Murano, l'île du verre", lat: 45.45507, lon: 12.3526, r: 120,
    story: "Depuis plus de 700 ans, les maîtres verriers soufflent du verre brûlant pour fabriquer vases, bijoux, animaux...",
    clue: "Le feu et le souffle font naître des merveilles. Trouve où le verre devient animal.",
    chapters: [
      {
        "steps": [
          {
            "idx": 100,
            "loc": { "lat": 45.45507, "lon": 12.3526 },
            "where": "Depuis le parvis, regarde la façade de brique rouge au-dessus de la porte principale.",
            "q": "Quelle forme a la grande fenêtre placée tout en haut de cette façade ?",
            "opts": [
              "Un carré",
              "Un cercle",
              "Un triangle",
              "Une étoile"
            ],
            "a": 1,
            "reveal": "Cette fenêtre ronde est une rosace. L’église San Pietro Martire a été reconstruite après un incendie survenu en 1511. La façade de brique permet de repérer facilement l’église en parcourant la Fondamenta dei Vetrai.",
            "img": "img/q/murano-0.webp",
            "src": [],
            "cap": "La fenêtre ronde apparaît au-dessus du portail."
          },
          {
            "idx": 101,
            "loc": { "lat": 45.45507, "lon": 12.3526 },
            "where": "À l’intérieur, cherche la grande peinture de la Vierge assise avec l’Enfant. À gauche du trône, observe l’homme richement vêtu, près de saint Marc.",
            "q": "Quelle position prend cet homme devant la Vierge ?",
            "opts": [
              "Il est à genoux",
              "Il court",
              "Il est couché",
              "Il danse"
            ],
            "a": 0,
            "reveal": "Il s’agit du doge Agostino Barbarigo, représenté en prière. Giovanni Bellini a peint cette œuvre en 1488. Elle se trouve aujourd’hui à San Pietro Martire, après avoir été conservée dans une autre église de Murano, Santa Maria degli Angeli.",
            "work": "MUR01",
            "img": "img/q/murano-1.webp",
            "src": [],
            "cap": "Le doge est agenouillé à gauche du trône de la Vierge."
          },
          {
            "idx": 102,
            "loc": { "lat": 45.45596, "lon": 12.3517 },
            "where": "Arrête-toi devant la façade du palais tournée vers le canal. Regarde les grandes fenêtres groupées au-dessus des portes.",
            "q": "Comment se terminent plusieurs de ces fenêtres ?",
            "opts": [
              "Par un sommet pointu",
              "Par un cercle complet",
              "Par un toit plat",
              "Par une spirale"
            ],
            "a": 0,
            "reveal": "Ces arcs pointus appartiennent au vocabulaire du gothique vénitien. La Ville de Venise rappelle que le Palazzo da Mula a servi de maison de villégiature à des patriciens vénitiens.",
            "img": "img/q/murano-2.webp",
            "src": [],
            "cap": "Les fenêtres du balcon de la façade sur le canal se terminent en pointe."
          },
          {
            "idx": 103,
            "loc": { "lat": 45.45662, "lon": 12.35689 },
            "where": "Dans la salle des objets antiques, cherche les petits récipients romains en verre qui ressemblent à des fioles. Observe leur silhouette.",
            "q": "Quelle partie de beaucoup de ces petites fioles est étroite ?",
            "opts": [
              "Le col",
              "Le ventre",
              "Le fond",
              "Les anses"
            ],
            "a": 0,
            "reveal": "Le musée conserve notamment des unguentaria, de petits flacons qui pouvaient contenir des parfums ou des huiles. La collection archéologique présente aussi des urnes de verre trouvées dans des tombes romaines.",
            "src": []
          },
          {
            "idx": 104,
            "loc": { "lat": 45.45662, "lon": 12.35689 },
            "where": "Trouve la coupe Barovier en verre bleu, présentée seule dans une vitrine. Approche-toi suffisamment pour regarder les personnages peints autour de la vasque.",
            "q": "Sur quel animal certaines jeunes femmes sont-elles assises ?",
            "opts": [
              "Des chevaux",
              "Des éléphants",
              "Des cerfs",
              "Des ânes"
            ],
            "a": 0,
            "reveal": "La coupe Barovier date d’environ 1460–1470. Elle associe du verre soufflé bleu, des émaux de plusieurs couleurs et de l’or. Sa décoration montre notamment une chevauchée et une fontaine de jouvence.",
            "img": "img/q/murano-4.webp",
            "src": [],
            "cap": "À droite de la fontaine, de jeunes femmes montent à cheval."
          },
          {
            "idx": 105,
            "loc": { "lat": 45.45662, "lon": 12.35689 },
            "where": "Dans le grand salon du premier étage, lève les yeux sous le plafond peint. Regarde les grands objets de verre suspendus.",
            "q": "Combien de grands lustres y sont suspendus ?",
            "opts": [
              "Deux",
              "Trois",
              "Quatre",
              "Cinq"
            ],
            "a": 1,
            "reveal": "Le musée décrit trois grands lustres dans cette salle. Celui du centre possède 60 bras : Giovanni Fuga et Lorenzo Santi l’ont réalisé et présenté à l’exposition du verre de Murano de 1864, où il a reçu une médaille d’or.",
            "src": []
          },
          {
            "idx": 106,
            "loc": { "lat": 45.45662, "lon": 12.35689 },
            "where": "Cherche les murrine, ces petits morceaux de verre multicolores assemblés dans une pièce. Observe leurs motifs répétés.",
            "q": "À quoi font penser beaucoup de ces petits motifs colorés ?",
            "opts": [
              "À des fleurs ou des étoiles",
              "À des lettres d’imprimerie",
              "À des écailles de poisson",
              "À des empreintes de pas"
            ],
            "a": 0,
            "reveal": "Le nom millefiori signifie « mille fleurs ». Les verriers étirent des baguettes de verre coloré puis les coupent en petites sections : le dessin apparaît dans chaque tranche. Le musée explique que cette technique ancienne a été remise à la mode au XIXe siècle.",
            "src": []
          },
          {
            "idx": 107,
            "loc": { "lat": 45.45662, "lon": 12.35689 },
            "where": "Dans la partie consacrée aux perles, cherche les petites perles colorées appelées conterie. Compare-les aux perles plus grosses et observe leurs minuscules ouvertures.",
            "q": "À quoi sert le petit trou au centre d’une conteria ?",
            "opts": [
              "À laisser passer un fil",
              "À faire entrer de l’air dans un four",
              "À accueillir une bougie",
              "À fixer un miroir"
            ],
            "a": 0,
            "reveal": "Les conterie sont de très petites perles fabriquées à partir de fins tubes de verre creux. Elles ont servi à fabriquer des bijoux et des broderies et ont longtemps été un important produit d’échange. Des femmes appelées impiraresse les enfilaient patiemment.",
            "src": []
          },
          {
            "idx": 108,
            "loc": { "lat": 45.4575, "lon": 12.35718 },
            "where": "Depuis la Fondamenta Andrea Navagero, de l’autre côté du canal, observe l’arrière arrondi de la basilique.",
            "q": "Quel élément architectural se répète sur deux niveaux ?",
            "opts": [
              "Des arcades arrondies",
              "Des statues de lions",
              "Des balcons de fer",
              "Des colonnes torsadées"
            ],
            "a": 0,
            "reveal": "Cette partie arrondie s’appelle l’abside. Elle fait de la basilique l’un des exemples les plus reconnaissables de l’architecture romane de la lagune. La Ville de Venise conseille justement de la regarder depuis la rive opposée.",
            "img": "img/q/murano-8.webp",
            "src": [],
            "cap": "Deux rangées d’arcades ornent l’abside, visible au-delà du canal."
          },
          {
            "idx": 109,
            "loc": { "lat": 45.4575, "lon": 12.35718 },
            "where": "À l’intérieur, avance dans la nef et lève les yeux vers la grande figure sur le fond doré, au-dessus du chœur.",
            "q": "Comment la Vierge tient-elle ses bras ?",
            "opts": [
              "Levés, les mains ouvertes",
              "Croisés dans le dos",
              "Cachés sous son manteau",
              "Tendus vers le sol"
            ],
            "a": 0,
            "reveal": "Cette mosaïque représente Marie en prière, dite « orante ». Les petites pièces colorées et dorées, ou tesselles, forment son image. Le fond d’or fait partie des détails soulignés par la Ville de Venise.",
            "img": "img/q/murano-9.webp",
            "src": [],
            "cap": "La Vierge lève les mains de chaque côté de son corps."
          },
          {
            "idx": 110,
            "loc": { "lat": 45.4575, "lon": 12.35718 },
            "where": "Regarde le pavement ancien sans marcher sur les parties protégées. Cherche deux grands oiseaux disposés de part et d’autre d’un vase.",
            "q": "Quels oiseaux se font face près de ce vase ?",
            "opts": [
              "Des paons",
              "Des mouettes",
              "Des cygnes",
              "Des hiboux"
            ],
            "a": 0,
            "reveal": "Le sol de la basilique mêle figures d’animaux et dessins géométriques. Les deux oiseaux sont des paons reconnaissables à leur longue queue décorée d’ocelles. Une photographie identifiée du pavement confirme ce détail.",
            "img": "img/q/murano-10.webp",
            "src": [],
            "cap": "Les deux paons encadrent un vase au centre du panneau."
          },
          {
            "idx": 111,
            "loc": { "lat": 45.4575, "lon": 12.35718 },
            "where": "Continue à regarder les panneaux figurés du pavement. Cherche un oiseau seul, vu de face, avec les ailes écartées.",
            "q": "Quel oiseau est représenté dans ce panneau ?",
            "opts": [
              "Un aigle",
              "Un canard",
              "Un flamant rose",
              "Un corbeau"
            ],
            "a": 0,
            "reveal": "Un autre panneau de la mosaïque du sol montre un aigle aux ailes déployées. Ces images d’animaux font partie du riche décor médiéval de la basilique ; la photographie de ce panneau permet de vérifier l’identification.",
            "img": "img/q/murano-11.webp",
            "src": [],
            "cap": "L’aigle déploie ses ailes sur le pavement mosaïqué."
          },
          {
            "idx": 112,
            "loc": { "lat": 45.45522, "lon": 12.35312 },
            "where": "Sur le campo, lève les yeux vers le sommet de la tour de brique qui porte une horloge ronde.",
            "q": "Comment se termine le haut de la tour ?",
            "opts": [
              "Par des créneaux",
              "Par une grande coupole",
              "Par une flèche de verre",
              "Par un toit de chaume"
            ],
            "a": 0,
            "reveal": "La tour de l’Horloge a été construite à la fin du XIXe siècle dans un style qui rappelle les édifices médiévaux. Ses créneaux lui donnent une silhouette de petit château. Elle a aussi servi de repère dans la vie quotidienne de Murano.",
            "img": "img/q/murano-12.webp",
            "src": [],
            "cap": "Les créneaux découpent le sommet de la tour de brique."
          },
          {
            "idx": 113,
            "loc": { "lat": 45.45528, "lon": 12.35306 },
            "where": "Sur le campo, cherche la grande sculpture bleue en verre près de la tour. Son installation dans l’espace public peut changer : vérifie qu’elle est présente avant de poser la question.",
            "q": "À quel objet du ciel sa forme fait-elle penser ?",
            "opts": [
              "Une comète",
              "Une planète à anneaux",
              "Un croissant de lune",
              "Un nuage"
            ],
            "a": 0,
            "reveal": "Cette œuvre s’appelle Cometa di Vetro. Le maître verrier Simone Cenedese indique l’avoir réalisée en 2007 pour le Campo Santo Stefano. Sa forme allongée et ses éclats de verre suggèrent une étoile avec une traîne.",
            "img": "img/q/murano-13.webp",
            "src": [],
            "cap": "La sculpture bleue évoque une comète et sa traîne."
          },
          {
            "idx": 114,
            "loc": { "lat": 45.4528, "lon": 12.3546 },
            "where": "Termine la promenade au phare, près de l’arrêt Murano Faro. Depuis l’espace public, observe le corps blanc de la tour.",
            "q": "Combien de larges bandes noires entourent la partie haute du phare ?",
            "opts": [
              "Une",
              "Deux",
              "Trois",
              "Quatre"
            ],
            "a": 1,
            "reveal": "Le phare signale la rive orientale de Murano aux navigateurs. La Ville de Venise rappelle que sa forme actuelle résulte de plusieurs transformations depuis le début du XXe siècle ; des structures plus anciennes étaient en bois, puis en fer.",
            "img": "img/q/murano-14.webp",
            "src": [],
            "cap": "Deux larges bandes noires entourent la partie supérieure du phare."
          }
        ]
      }
    ] },

  // ─── JOUR 5 : Burano, Torcello ───
  { id: "burano", emoji: "🏠", name: "Burano, les maisons colorées", lat: 45.4855, lon: 12.4170, r: 150,
    story: "Les maisons sont rouges, jaunes, bleues, roses... La légende dit que c'était pour que les pêcheurs retrouvent leur maison dans le brouillard.",
    clue: "Dans la brume, une maison jaune vaut mieux qu'un phare. Cherche la couleur qui t'appelle.",
    tasks: [
      { t: "choice", q: "Pourquoi les maisons sont-elles si colorées, selon la légende ?", opts: ["🌫️ Pour retrouver sa maison dans le brouillard", "🎨 Le peintre s'ennuyait", "🎂 C'était un anniversaire"], a: 0, fact: "Les pêcheurs rentraient dans la brume : la couleur les guidait." },
      { t: "count", q: "Combien de maisons rouges comptes-tu dans une rue ?", a: null },
      { t: "do", q: "Trouve la maison de ta couleur préférée et pose devant avec une pose rigolote." },
      { t: "photo", q: "Photographie la plus belle maison colorée.", pts: 20 },
    ] },
  { id: "buranotour", emoji: "📐", name: "La tour penchée", lat: 45.48418, lon: 12.41881, r: 100,
    story: "Le clocher de l'église de Burano penche, comme la tour de Pise ! Il s'est un peu enfoncé dans le sol mou.",
    clue: "Même les tours se fatiguent. Penche-toi avec elle, tu verras le monde autrement.",
    tasks: [
      { t: "choice", q: "La tour de l'église de Burano est...", opts: ["📐 Penchée", "🔵 Bleue", "🔊 Muette"], a: 0, fact: "Le sol de la lagune est mou : la tour s'est inclinée petit à petit." },
      { t: "do", q: "Penche-toi comme la tour et prends la pose !" },
    ] },
  { id: "torcello", emoji: "🪑", name: "Le trône d'Attila", lat: 45.49830, lon: 12.41850, r: 150,
    story: "Torcello est l'île où les premiers Vénitiens se sont installés. Sur la place, un vieux fauteuil de pierre : le trône d'Attila. Personne ne sait vraiment pourquoi on l'appelle ainsi !",
    clue: "Les rois ont disparu, la chaise est restée. Assieds-toi : c'est ton tour de régner.",
    tasks: [
      { t: "do", q: "Assieds-toi sur le trône comme un roi ou une reine (si c'est permis !)." },
      { t: "count", q: "Combien de chats croises-tu sur l'île ?", a: null },
    ] },

  // ─── JOUR 6 : livres et secrets ───
  { id: "acquaalta", emoji: "📚", name: "La librairie Acqua Alta", lat: 45.43806, lon: 12.34227, r: 60,
    story: "Une librairie où les livres sont rangés dans des baignoires, des barques et même une vraie gondole, pour les protéger de l'eau haute. Au fond : un escalier fait de livres !",
    clue: "Les histoires flottent mieux que les bateaux. Au fond, les livres dessinent un chemin vers l’horizon.",
    chapters: [
      {
        "steps": [
          {
            "idx": 300,
            "where": "Lis l’enseigne « Acqua Alta » et remarque les récipients où reposent les livres.",
            "q": "Que signifie « acqua alta » à Venise ?",
            "opts": [
              "Une eau devenue trop salée",
              "Une marée haute qui peut inonder les endroits bas",
              "La pluie qui tombe seulement en été",
              "Un ancien nom du Grand Canal"
            ],
            "a": 1,
            "reveal": "L’expression vénitienne désigne l’eau exceptionnellement haute. Quand la marée monte assez, elle peut gagner les parties basses de la ville, et parfois cette librairie. Ses propriétaires ont donc installé une partie des livres dans des contenants inattendus.",
            "src": [
              "https://www.comune.venezia.it/en/content/venice-and-high-water",
              "https://www.libreriacqualta.it/la-libreria/"
            ]
          },
          {
            "idx": 301,
            "where": "Dans la salle principale, cherche un long bateau sombre rempli de livres. Il n’est pas nécessaire d’y monter.",
            "q": "Quel bateau vénitien sert ici de bibliothèque ?",
            "opts": [
              "Un vaporetto",
              "Une gondole",
              "Un voilier de pêche",
              "Un kayak de mer"
            ],
            "a": 1,
            "reveal": "La librairie range des livres dans une gondole, mais aussi dans d’autres petites embarcations. Une idée très vénitienne pour les présenter et les tenir à distance de l’eau qui peut entrer dans le magasin.",
            "src": [
              "https://www.libreriacqualta.it/la-libreria/"
            ],
            "img": "img/q/acquaalta-q02.webp",
            "cap": "la longue embarcation au milieu de la salle porte des livres."
          },
          {
            "idx": 302,
            "where": "Explore les rayons sans déplacer les piles ; cherche un grand récipient détourné en bac à livres.",
            "q": "Quel objet surprenant sert aussi à ranger des livres ?",
            "opts": [
              "Une baignoire",
              "Un coffre de voyage",
              "Un panier à linge",
              "Une caisse à outils"
            ],
            "a": 0,
            "reveal": "Des baignoires ou grandes cuves servent de bacs à livres. Leurs parois montrent comment cette librairie s’adapte à la présence possible de l’eau. Le nombre et la place de ces objets peuvent changer : si tu ne les vois pas, demande au personnel ou passe à l’énigme suivante.",
            "src": [
              "https://www.libreriacqualta.it/la-libreria/",
              "https://www.veneziadeigondolieri.it/en/places/eclectic-venice/shopping/"
            ]
          },
          {
            "idx": 303,
            "where": "Au fond de la boutique, repère l’inscription « Follow the books ». Observe les marches sans les emprunter si l’accès est fermé.",
            "q": "Avec quoi les marches de cet escalier ont-elles été fabriquées ?",
            "opts": [
              "Des coquillages collés",
              "De vieux livres empilés",
              "Des briques peintes comme des livres",
              "Des caisses de vin"
            ],
            "a": 1,
            "reveal": "La librairie explique que ces centaines de livres étaient destinés au recyclage. Transformés en marches, ils mènent à un point de vue sur les canaux lorsque l’accès est autorisé.",
            "src": [
              "https://www.libreriacqualta.it/la-libreria/"
            ],
            "img": "img/q/acquaalta-q04.webp",
            "cap": "les piles de livres forment les marches."
          },
          {
            "idx": 304,
            "where": "Repère la porte en bois que la librairie présente comme une sortie de secours ; regarde seulement depuis l’espace autorisé.",
            "q": "Qu’y a-t-il juste derrière cette porte ?",
            "opts": [
              "Une petite place",
              "Un jardin caché",
              "Un canal",
              "Une autre librairie"
            ],
            "a": 2,
            "reveal": "Cette porte s’ouvre directement sur l’eau du canal voisin. C’est une façon spectaculaire de comprendre pourquoi les habitants et les commerçants de Venise surveillent la marée.",
            "src": [
              "https://www.libreriacqualta.it/la-libreria/"
            ],
            "img": "img/q/acquaalta-q05.webp",
            "cap": "l’eau du canal apparaît immédiatement au-delà de la porte."
          }
        ]
      }
    ] },
  { id: "miracoli", emoji: "💎", name: "L'église-bijou", lat: 45.43950, lon: 12.33935, r: 60,
    story: "Santa Maria dei Miracoli est toute en marbre de couleurs : on dirait une boîte à bijoux posée au bord du canal.",
    clue: "Un coffre de marbre ne contient pas toujours de l'or. Compte ses couleurs, elles sont la clé.",
    reward: {"point": "I", "emoji": "💎", "name": "La perle du miracle", "at": [0.63, 0.5], "hint": "La Vierge de l'autel a quelque chose pour toi."},
    plan: {
      "img": "img/plan/miracoli.webp",
      "w": 1311,
      "h": 1511,
      "title": "Santa Maria dei Miracoli",
      "sub": "plan schématique",
      "points": [
        {
          "id": "A",
          "n": "Entrée / tribune",
          "x": 50.51,
          "y": 80.82,
          "title": "La tribune des religieuses",
          "sub": "Tribune en bois · regarder en hauteur",
          "text": "Cette galerie, appelée barco, permettait aux religieuses du couvent voisin d’assister aux offices. Un passage élevé reliait autrefois le couvent à la tribune ; il a disparu.",
          "where": "Au-dessus de l’entrée, derrière toi",
          "img": "img/plan/miracoli-A.webp",
          "credit": "Image : Didier Descouens · CC BY-SA 4.0"
        },
        {
          "id": "B",
          "n": "Paroi de nef",
          "x": 71.5,
          "y": 53.05,
          "title": "Les murs de marbre coloré",
          "sub": "Décor architectural · à hauteur des yeux",
          "text": "Des plaques de marbre clair, rose et gris habillent les murs. Pietro Lombardo et son atelier ont conçu ce décor avec l’édifice, construit entre 1481 et 1489 pour abriter une image vénérée.",
          "where": "Sur les parois de la nef unique",
          "img": "img/plan/miracoli-B.webp",
          "credit": "Image : Zairon · CC BY-SA 4.0"
        },
        {
          "id": "C",
          "n": "Plafond nef",
          "x": 44.77,
          "y": 59.65,
          "title": "Le plafond à caissons",
          "sub": "Bois peint · regarder en hauteur",
          "text": "La grande voûte de bois est partagée en cinquante caissons. On y voit des personnages bibliques, notamment des prophètes et des patriarches.",
          "where": "Au-dessus de la nef",
          "img": "img/plan/miracoli-C.webp",
          "credit": "Image : Zairon · CC BY-SA 4.0"
        },
        {
          "id": "D",
          "n": "Escalier",
          "x": 50.88,
          "y": 33.24,
          "title": "L’escalier vers le chœur",
          "sub": "Architecture · rester dans l’espace de visite",
          "text": "L’autel est placé dans un espace surélevé, le presbytère. Un large escalier de marbre y conduit : cette différence de hauteur est l’une des formes les plus reconnaissables de l’intérieur.",
          "where": "Au fond de la nef",
          "img": "img/plan/miracoli-D.webp",
          "credit": "Image : Didier Descouens · CC BY-SA 4.0"
        },
        {
          "id": "E",
          "n": "Balustrade",
          "x": 34.04,
          "y": 40.19,
          "title": "La balustrade ajourée",
          "sub": "Marbre sculpté · observer depuis la nef",
          "text": "Une clôture de marbre percée de petites ouvertures marque la limite du chœur surélevé. Elle accompagne l’escalier et laisse voir l’autel au fond.",
          "where": "Devant le presbytère, de chaque côté des marches",
          "img": "img/plan/miracoli-E.webp",
          "credit": "Image : Francisco Anzola · CC BY 3.0"
        },
        {
          "id": "F",
          "n": "Chaire",
          "x": 68.82,
          "y": 40.19,
          "title": "Une petite chaire de marbre",
          "sub": "Sculpture et architecture · observer de loin",
          "text": "Les deux petites chaires de marbre flanquent l’escalier. Leur forme polygonale crée une plate-forme d’où l’on pouvait s’adresser à l’assemblée.",
          "where": "Près de l’escalier, sur un côté",
          "img": "img/plan/miracoli-F.webp",
          "credit": "Image : Didier Descouens · CC BY-SA 4.0"
        },
        {
          "id": "G",
          "n": "Pilier autel",
          "x": 69.55,
          "y": 24.93,
          "title": "Les créatures marines",
          "sub": "Bas-relief · regarder les plinthes",
          "text": "Les frères Tullio et Antonio Lombardo ont sculpté dans le marbre des êtres marins imaginaires et de petits amours. La fiche de Chorus situe ces reliefs aux pieds des piliers de l’arc devant l’autel.",
          "where": "Au pied des piliers près de l’autel",
          "img": "img/plan/miracoli-G.webp",
          "credit": "Image : Nicola Quirico · CC BY-SA 4.0"
        },
        {
          "id": "H",
          "n": "Coupole",
          "x": 61.13,
          "y": 16.62,
          "title": "La coupole et les quatre évangélistes",
          "sub": "Décor de coupole · regarder en hauteur",
          "text": "Dans les quatre écoinçons autour de la coupole figurent les évangélistes. Chorus les attribue avec prudence à Pietro Lombardo.",
          "where": "Au-dessus du presbytère",
          "img": "img/plan/miracoli-H.webp",
          "credit": "Image : Zairon · CC BY-SA 4.0"
        },
        {
          "id": "I",
          "n": "Maître-autel",
          "x": 50.88,
          "y": 12.75,
          "title": "La Vierge à l’Enfant de l’autel",
          "sub": "Peinture · regarder depuis la nef",
          "text": "La petite image de Marie avec l’Enfant, attribuée à Zanino di Pietro, était vénérée avant la construction de l’église. Santa Maria dei Miracoli fut bâtie pour lui donner une place dans un édifice consacré.",
          "where": "Au fond, sur le maître-autel",
          "img": "img/plan/miracoli-I.webp",
          "credit": "Image : Andraszy · CC BY-SA 4.0"
        }
      ]
    },
    chapters: [
      {
        "steps": [
          {
            "idx": 100,
            "where": "Place-toi devant l’entrée. Juste au-dessus de la porte, sous le petit arc, repère une femme sculptée qui porte quelque chose dans ses bras.",
            "q": "Que tient cette femme ?",
            "opts": [
              "Un livre",
              "Un enfant",
              "Une colombe",
              "Une couronne"
            ],
            "a": 1,
            "reveal": "La sculpture montre Marie avec l’enfant Jésus. À la fin du XVe siècle, l’église fut construite pour accueillir une autre image de la Vierge à l’Enfant, conservée à l’intérieur et tenue pour miraculeuse par les fidèles. La sculpture au-dessus de la porte rappelle ainsi le sujet de cette image, sans être l’image elle-même.",
            "img": "img/q/miracoli-0.webp",
            "src": [
              "https://chorusvenezia.org/visita/chiesa-di-santa-maria-dei-miracoli/",
              "https://chorusvenezia.org/visita/facciata-5/"
            ],
            "cap": "Marie porte l’enfant Jésus dans ses bras, au-dessus de la porte."
          },
          {
            "idx": 101,
            "where": "Lève les yeux vers le grand arc arrondi de la façade. Au centre se trouve une grande fenêtre ronde. Compte seulement les petites ouvertures rondes qui l’entourent.",
            "q": "Combien y a-t-il de petites ouvertures autour de la grande ?",
            "opts": [
              "Deux",
              "Trois",
              "Quatre",
              "Cinq"
            ],
            "a": 1,
            "reveal": "Ces ouvertures circulaires sont des oculi, mot latin qui signifie « yeux ». La grande ouverture et les trois plus petites font partie du dessin de la façade conçu dans l’atelier de Pietro Lombardo, l’architecte de l’église bâtie entre 1481 et 1489.",
            "img": "img/q/miracoli-1.webp",
            "src": [
              "https://chorusvenezia.org/visita/facciata-5/",
              "https://chorusvenezia.org/visita/chiesa-di-santa-maria-dei-miracoli/"
            ],
            "cap": "Une grande fenêtre ronde au centre, entourée de trois oculi plus petits."
          },
          {
            "idx": 102,
            "where": "Regarde le panneau de marbre entre les deux hautes fenêtres de la façade. Son grand motif rouge sombre est juste au-dessus de l’entrée.",
            "q": "Quelle forme dessine ce marbre coloré ?",
            "opts": [
              "Une ancre",
              "Une croix",
              "Une étoile",
              "Une clé"
            ],
            "a": 1,
            "reveal": "Pietro Lombardo et son atelier ont revêtu la façade de marbres de plusieurs couleurs. Les motifs géométriques, dont les croix et les ronds, donnent à cette petite église l’aspect d’un coffret précieux. Son revêtement de marbre explique son surnom d’« église bijou ».",
            "img": "img/q/miracoli-2.webp",
            "src": [
              "https://chorusvenezia.org/visita/facciata-5/",
              "https://chorusvenezia.org/visita/chiesa-di-santa-maria-dei-miracoli/"
            ],
            "cap": "La grande croix rouge sombre se trouve entre les deux fenêtres."
          },
          {
            "idx": 103,
            "where": "Depuis le pont sur le Rio dei Miracoli, observe le mur latéral de l’église qui longe l’eau. Près de l’angle de la façade, quatre petits disques colorés entourent une forme centrale.",
            "q": "Quelle est la forme placée au milieu des quatre disques ?",
            "opts": [
              "Un triangle",
              "Un carré",
              "Un octogone",
              "Une étoile"
            ],
            "a": 2,
            "reveal": "Un octogone a huit côtés. Chorus décrit les octogones, croix et disques de marbre comme des éléments du décor géométrique de l’église. Le mur est au bord du canal : on peut chercher ce détail depuis le pont, sans s’approcher de l’eau.",
            "img": "img/q/miracoli-3.webp",
            "src": [
              "https://chorusvenezia.org/visita/facciata-5/"
            ],
            "cap": "L’octogone rouge sombre est entouré de quatre petits disques, sur le mur au bord de l’eau."
          },
          {
            "idx": 104,
            "where": "Entre dans la nef et regarde droit devant toi. L’autel est placé plus haut que le sol où tu te tiens. Repère l’élément de marbre qui y conduit.",
            "q": "Qu’est-ce qui permet de rejoindre l’espace surélevé de l’autel ?",
            "opts": [
              "Une échelle",
              "Un pont de bois",
              "Un escalier",
              "Une rampe en spirale"
            ],
            "a": 2,
            "reveal": "Le presbytère, la partie de l’église autour de l’autel, est surélevé et accessible par un grand escalier. Au fond se trouve l’image de la Vierge à l’Enfant considérée comme miraculeuse : c’est pour l’abriter que cette église fut édifiée.",
            "img": "img/q/miracoli-4.webp",
            "src": [
              "https://chorusvenezia.org/visita/chiesa-di-santa-maria-dei-miracoli/",
              "https://www.veneziaunica.it/en/things-to-do-in-venice/churches/church-of-santa-maria-dei-miracoli"
            ],
            "cap": "Le grand escalier de marbre monte de la nef vers l’autel."
          },
          {
            "idx": 105,
            "where": "Depuis la nef, lève les yeux vers la longue voûte de bois. Observe ce qui est peint dans les nombreux cadres du plafond.",
            "q": "Que représentent les peintures dans ces cadres ?",
            "opts": [
              "Des portraits de personnages",
              "Des poissons et des bateaux",
              "Des cartes de Venise",
              "Des instruments de musique"
            ],
            "a": 0,
            "reveal": "La voûte en bois comporte cinquante caissons peints. Chorus y identifie des prophètes et des patriarches, personnages de la Bible. Les peintures sont attribuées à Pier Maria Pennacchi et à des collaborateurs.",
            "img": "img/q/miracoli-5.webp",
            "src": [
              "https://chorusvenezia.org/visita/chiesa-di-santa-maria-dei-miracoli/"
            ],
            "cap": "Des personnages apparaissent au centre des caissons du plafond en bois."
          },
          {
            "idx": 106,
            "where": "Regarde la petite coupole au-dessus de l’espace de l’autel. Dans sa grande surface claire, distingue les minuscules formes répétées.",
            "q": "À quoi ressemblent ces petites formes ?",
            "opts": [
              "À des étoiles",
              "À des poissons",
              "À des lettres",
              "À des feuilles"
            ],
            "a": 0,
            "reveal": "La petite coupole couvre l’espace de l’autel. Autour d’elle, dans les quatre coins qui la relient aux arcs, Chorus signale des figures des quatre évangélistes. Les petites étoiles visibles dans la coupole donnent ici un autre détail à chercher en levant les yeux.",
            "img": "img/q/miracoli-6.webp",
            "src": [
              "https://chorusvenezia.org/visita/chiesa-di-santa-maria-dei-miracoli/"
            ],
            "cap": "De petites étoiles ponctuent la surface claire de la coupole."
          },
          {
            "idx": 107,
            "where": "Depuis l’espace ouvert aux visiteurs, observe la base sculptée des grands piliers qui bordent l’autel. Cherche une créature au corps humain dont la partie basse devient celle d’un animal marin.",
            "q": "Quelle partie de son corps rappelle un poisson ?",
            "opts": [
              "Ses cornes",
              "Sa queue écailleuse",
              "Ses ailes",
              "Ses sabots"
            ],
            "a": 1,
            "reveal": "Les reliefs de marbre à la base des piliers montrent des êtres marins imaginaires et de petits personnages appelés « amours ». Chorus les attribue à Tullio et Antonio Lombardo. Regarde la queue couverte d’écailles : les sculpteurs mêlaient ici monde humain et monde marin.",
            "img": "img/q/miracoli-7.webp",
            "src": [
              "https://chorusvenezia.org/visita/plinto-del-pilastro-destro-della-tribuna/"
            ],
            "cap": "À droite du relief, un corps humain se prolonge par une queue écailleuse."
          }
        ]
      }
    ] },
  { id: "ghetto", emoji: "🏘️", name: "Le Campo del Ghetto Nuovo", lat: 45.44525, lon: 12.32718, r: 80,
    story: "Un quartier très ancien avec les immeubles les plus hauts de Venise. Il y avait peu de place : alors on a construit vers le ciel. (Parents : c'est aussi un lieu d'histoire à raconter doucement.)",
    clue: "Quand la terre manque, on bâtit vers les nuages. Compte les étages : le secret est tout en haut.",
    chapters: [
      {
        "steps": [
          {
            "idx": 100,
            "loc": { "lat": 45.44525, "lon": 12.32718 },
            "where": "Depuis le pont de bois qui mène au campo, regarde au-dessus du passage couvert. Lis la dernière ligne du nom peint sur la plaque claire.",
            "q": "Quel mot termine le nom peint sur cette plaque ?",
            "opts": [
              "VECIO",
              "NOVO",
              "GRANDE",
              "ROSSO"
            ],
            "a": 1,
            "reveal": "« Novo » signifie « nouveau » en vénitien. Le nom vient d’une ancienne « nouvelle fonderie » de métal. Pourtant, c’est ce secteur qui fut le premier lieu de résidence imposé aux Juifs de Venise, en 1516. À l’époque, deux accès étaient fermés par des portes la nuit. Le pont de bois d’où tu lis cette plaque est plus récent : ce troisième accès fut construit en 1865.",
            "img": "img/q/ghetto-0.webp",
            "src": [
              "https://www.veneziaunica.it/it/cosa-fare-a-venezia/itinerari/cannaregio-autenticita-e-tradizioni",
              "https://www.ghettovenezia.com/en/the-history/"
            ],
            "cap": "Au-dessus du passage, la plaque porte « SOTOPORTEGO DE GHETO NOVO »."
          },
          {
            "idx": 101,
            "loc": { "lat": 45.4453, "lon": 12.32704 },
            "where": "Au milieu du campo, cherche un gros bloc de pierre bas et arrondi. Observe son dessus sombre, fermé par un couvercle.",
            "q": "Quel ancien équipement de la place vois-tu ?",
            "opts": [
              "Une fontaine à jets d’eau",
              "Une margelle de puits",
              "Un four à pain",
              "Un socle de statue"
            ],
            "a": 1,
            "reveal": "La place conserve trois margelles de puits. Elles rappellent un aménagement de la place antérieur à la création du ghetto en 1516 : la famille Da Brolo y fit creuser trois puits. Le couvercle que tu vois protège aujourd’hui l’ouverture de celui-ci.",
            "img": "img/q/ghetto-1.webp",
            "src": [
              "https://live.comune.venezia.it/it/2025/04/campo-del-ghetto-nuovo",
              "https://www.veneziaunica.it/it/cosa-fare-a-venezia/itinerari/cannaregio-autenticita-e-tradizioni"
            ],
            "cap": "La margelle de pierre est fermée par un couvercle de métal."
          },
          {
            "idx": 102,
            "loc": { "lat": 45.44542, "lon": 12.32682 },
            "where": "Approche-toi d’une margelle de puits sans monter dessus. Sur son côté, cherche un dessin gravé à l’intérieur d’une forme pointue en bas.",
            "q": "Quelle forme encadre ce dessin ?",
            "opts": [
              "Un écu, comme un bouclier",
              "Une étoile à six branches",
              "Un cercle",
              "Une clé"
            ],
            "a": 0,
            "reveal": "Il s’agit d’un blason, signe d’une famille. La Ville de Venise indique que les trois puits portent les armoiries des Da Brolo, qui aménagèrent le campo avant que le secteur ne devienne, en 1516, le lieu de résidence imposé aux Juifs.",
            "img": "img/q/ghetto-2.webp",
            "src": [
              "https://live.comune.venezia.it/it/2025/04/campo-del-ghetto-nuovo"
            ],
            "cap": "Un écu sculpté apparaît sur le côté de la margelle."
          },
          {
            "idx": 103,
            "loc": { "lat": 45.44558, "lon": 12.327 },
            "where": "Sous les arcades du campo, cherche l’ancienne inscription « BANCO … » au-dessus d’une porte du Banco Rosso. Lis le second mot.",
            "q": "Quelle couleur est écrite après « BANCO » ?",
            "opts": [
              "Verde, vert",
              "Rosso, rouge",
              "Nero, noir",
              "Giallo, jaune"
            ],
            "a": 1,
            "reveal": "Le Banco Rosso était l’un des comptoirs de prêt sur gage du ghetto. La Communauté juive de Venise décrit trois comptoirs désignés par des couleurs : rouge, vert et noir. Le prêt était une activité réglementée que la République imposait à certains habitants juifs ; l’inscription rappelle ce travail et ses contraintes.",
            "src": [
              "https://jvenice.org/banco-rosso/",
              "https://www.wmf.org/sites/default/files/article/pdfs/pubs_JewishArtTreasuresVenice.pdf"
            ]
          },
          {
            "idx": 104,
            "loc": { "lat": 45.44514, "lon": 12.32663 },
            "where": "Cherche la façade claire de la synagogue italienne. Tout en haut, au-dessus des boutiques, une rangée de hautes fenêtres se termine par des arcs.",
            "q": "Combien de grandes fenêtres en arc vois-tu dans cette rangée ?",
            "opts": [
              "Trois",
              "Quatre",
              "Cinq",
              "Six"
            ],
            "a": 2,
            "reveal": "La Communauté juive de Venise signale ces cinq grandes fenêtres comme un signe permettant de reconnaître la synagogue italienne depuis le campo. Édifiée en 1575, elle occupe les étages supérieurs d’un bâtiment. Les synagogues du Ghetto Nuovo se repèrent souvent par des détails en hauteur plutôt que par un grand portail.",
            "img": "img/q/ghetto-4.webp",
            "src": [
              "https://jvenice.org/sinagoga-italiana/",
              "https://www.veneziaunica.it/it/cosa-fare-a-venezia/itinerari/cannaregio-autenticita-e-tradizioni"
            ],
            "cap": "Cinq fenêtres hautes et arquées sont alignées au sommet de la façade."
          },
          {
            "idx": 105,
            "loc": { "lat": 45.44506, "lon": 12.32712 },
            "where": "Regarde la façade de la Grande Synagogue allemande. Au-dessus de ses fenêtres en arc, juste sous la corniche, repère une longue ligne de caractères.",
            "q": "Dans quel alphabet est écrite cette inscription ?",
            "opts": [
              "En lettres latines",
              "En lettres grecques",
              "En lettres hébraïques",
              "En chiffres romains"
            ],
            "a": 2,
            "reveal": "La Communauté juive de Venise décrit cette inscription près de la corniche de la Scuola Grande Tedesca. Cette synagogue, commencée vers 1528, est la plus ancienne des synagogues vénitiennes. Ses espaces de prière furent aménagés dans un bâtiment de la place.",
            "img": "img/q/ghetto-5.webp",
            "src": [
              "https://jvenice.org/sinagoga-tedesca/",
              "https://www.veneziaunica.it/it/cosa-fare-a-venezia/itinerari/cannaregio-autenticita-e-tradizioni"
            ],
            "cap": "Une inscription en caractères hébraïques court sous la corniche, au-dessus des arcades."
          },
          {
            "idx": 106,
            "loc": { "lat": 45.44561, "lon": 12.32651 },
            "where": "Sur le mur de briques du campo, arrête-toi devant le mémorial. Dans la grande ouverture protégée par une grille, observe le relief sombre placé devant les noms.",
            "q": "Que montre ce relief sombre ?",
            "opts": [
              "Des figures humaines sculptées en relief",
              "Des cartes de navigation",
              "Des horloges",
              "Des scènes de carnaval"
            ],
            "a": 0,
            "reveal": "Les reliefs en bronze du mémorial sont l’œuvre de l’artiste Arbit Blatas. Avec les noms inscrits, ils honorent la mémoire des Juifs de Venise déportés pendant la Shoah. La Ville de Venise indique que 246 Juifs vénitiens furent déportés en 1943–1944 et que huit seulement revinrent. Ici, on prend le temps de regarder et de se souvenir des personnes.",
            "img": "img/q/ghetto-6.webp",
            "src": [
              "https://www.veneziaunica.it/it/cosa-fare-a-venezia/itinerari/cannaregio-autenticita-e-tradizioni"
            ],
            "cap": "Le relief central représente des personnes ; des noms sont inscrits derrière lui."
          }
        ]
      }
    ] },

  // ─── JOUR 7 : lions, jardins, Corte Sconta ───
  { id: "frari", emoji: "🎨", name: "L'église des Frari", lat: 45.43687, lon: 12.32623, r: 70, music: "audio/frari-vespro.mp3",
    story: "Une immense église de briques rouges, pleine de trésors : des tableaux géniaux, des tombes de grands artistes, des sièges de bois sculpté. Et un compositeur célèbre y repose : Monteverdi ! (Parents : entrée payante selon l'âge, horaires à vérifier avant de venir. Visite silencieuse, sans flash.)",
    clue: "Ici dorment des maîtres de la musique et de la peinture. Ouvrez grand les yeux, Gardiens : trois trésors se cachent sous ces voûtes.",
    reward: {"point": "C", "emoji": "🐚", "name": "La coquille d'or", "at": [0.63, 0.42], "hint": "Saint Jean-Baptiste a quelque chose pour toi."},
    plan: {
      "img": "img/plan/frari.webp",
      "w": 1430,
      "h": 1576,
      "title": "Basilique des Frari",
      "sub": "plan schématique",
      "points": [
        {
          "id": "A",
          "n": "2",
          "x": 44.06,
          "y": 15.36,
          "title": "L’Assomption de la Vierge",
          "sub": "Titien · 1516–1518",
          "text": "Ce très grand retable domine le maître-autel. Marie s’élève au-dessus des apôtres.",
          "where": "L’œuvre est au maître-autel, dans l’abside centrale.",
          "img": "img/plan/frari-A.webp",
          "credit": "Photo : Luca Aless · CC BY-SA 4.0"
        },
        {
          "id": "B",
          "n": "4",
          "x": 16.76,
          "y": 24.4,
          "title": "La tombe de Claudio Monteverdi",
          "sub": "Chapelle des Milanais",
          "text": "La dalle funéraire du compositeur est au sol, dans la chapelle des Milanais. Monteverdi fut maître de chapelle à Saint-Marc.",
          "where": "La tombe partage la chapelle indiquée par le n° 4 du plan officiel.",
          "img": "img/plan/frari-B.webp",
          "credit": "Photo : Didier Descouens · CC BY-SA 4.0"
        },
        {
          "id": "C",
          "n": "6",
          "x": 71.36,
          "y": 24.4,
          "title": "Saint Jean-Baptiste",
          "sub": "Donatello · 1438",
          "text": "Cette statue de Jean-Baptiste occupe une chapelle du transept. Le saint se reconnaît à son vêtement rude.",
          "where": "Chapelle de Saint-Jean-Baptiste, à droite en regardant le maître-autel.",
          "img": "img/plan/frari-C.webp",
          "credit": "Photo : Didier Descouens · CC BY-SA 4.0"
        },
        {
          "id": "D",
          "n": "8",
          "x": 88.92,
          "y": 18.18,
          "title": "La Vierge à l’Enfant avec des saints",
          "sub": "Giovanni Bellini · 1488",
          "text": "Dans la sacristie, ce tableau est un triptyque : trois panneaux réunis. Marie et l’Enfant sont au centre, entre des saints.",
          "where": "Sacristie, espace latéral à droite du presbytérium.",
          "img": "img/plan/frari-D.webp",
          "credit": "Photo : Didier Descouens"
        },
        {
          "id": "E",
          "n": "10",
          "x": 44.06,
          "y": 50.23,
          "title": "Le chœur des frères",
          "sub": "Marco et Francesco Cozzi · 1468",
          "text": "Les stalles en bois étaient réservées au chant et à la prière des frères.",
          "where": "Au centre de l’église, avant le presbytérium.",
          "img": "img/plan/frari-E.webp",
          "credit": "Photo : Didier Descouens · CC BY-SA 4.0"
        },
        {
          "id": "F",
          "n": "11",
          "x": 61.51,
          "y": 80.63,
          "title": "Le monument à Titien",
          "sub": "Luigi, Pietro et Andrea Zandomeneghi · 1843–1852",
          "text": "Ce monument du XIXe siècle rend hommage au peintre Titien. Il est dans la nef de droite, près de l’entrée.",
          "where": "Nef droite, près de l’entrée.",
          "img": "img/plan/frari-F.webp",
          "credit": "Photo : Didier Descouens · CC BY-SA 4.0"
        },
        {
          "id": "G",
          "n": "12",
          "x": 26.94,
          "y": 80.63,
          "title": "Le monument à Canova",
          "sub": "Élèves de Canova · 1822–1827",
          "text": "Ce monument en forme de pyramide se reconnaît à ses figures en procession. Il est dans la nef de gauche.",
          "where": "Nef gauche, près de l’entrée.",
          "img": "img/plan/frari-G.webp",
          "credit": "Photo : Didier Descouens · CC BY-SA 4.0"
        },
        {
          "id": "H",
          "n": "13",
          "x": 26.94,
          "y": 60.68,
          "title": "La Madone de Ca’ Pesaro",
          "sub": "Titien · 1519–1526",
          "text": "Dans cette peinture, la Vierge et l’Enfant sont décalés du centre. Plus bas, on voit la famille Pesaro.",
          "where": "Autel de la nef gauche, avant le monument au doge Pesaro en venant du chœur.",
          "img": "img/plan/frari-H.webp",
          "credit": "Photo : Wikimedia Commons · domaine public"
        },
        {
          "id": "I",
          "n": "15",
          "x": 26.94,
          "y": 69.6,
          "title": "Le monument au doge Giovanni Pesaro",
          "sub": "B. Longhena, M. Barthel, B. Falcone · 1660–1669",
          "text": "Ce grand monument funéraire occupe la paroi de la nef de gauche. Le regard monte vers le doge, tout en haut.",
          "where": "Nef gauche, entre la Madone de Ca’ Pesaro et l’entrée.",
          "img": "img/plan/frari-I.webp",
          "credit": "Photo : Didier Descouens · CC BY-SA 4.0"
        }
      ]
    },
    chapters: [
      {
        "title": "Une église née dans la lagune",
        "intro": "Les deux premières questions installent l'histoire du lieu.",
        "steps": [
          {
            "idx": 200,
            "q": "Que signifie « Frari » ?",
            "opts": [
              "Les frères",
              "Les fleurs",
              "Les forgerons",
              "Les phares"
            ],
            "a": 0,
            "reveal": "**Les frères.** « Frari » désigne les frères franciscains en vénitien. Leur communauté s’installe ici au XIIIᵉ siècle.",
            "title": "Le nom mystère",
            "img": "img/q/frari-1.webp",
            "cap": "Un frère franciscain (gravure ancienne).",
            "src": [
              "https://www.basilicadeifrari.it/wp-content/uploads/2023/10/FRANCESE-2023.pdf",
              "https://archiviodistatovenezia.it/it/la-sede-dei-frari.html?catid=13%3Astoria&id=58%3Ail-convento-e-il-chiostro-della-trinita&view=article"
            ]
          },
          {
            "idx": 201,
            "where": "Observe les rues et le campo actuels, puis imagine le sol d’avant les constructions.",
            "q": "À quoi ressemblait ce lieu il y a environ 800 ans ?",
            "opts": [
              "À un terrain humide, avec de l’eau et de la boue",
              "À une colline sèche",
              "À une forêt de pins",
              "À une plage de sable"
            ],
            "a": 0,
            "reveal": "**Un terrain marécageux.** Les archives vénitiennes situent les premiers Frari dans une zone paludosa, près d’un ancien bassin appelé lac Badoer. Le quartier a ensuite été progressivement assaini.",
            "title": "Avant les pierres",
            "img": "img/q/frari-2.webp",
            "cap": "Un terrain humide et brumeux, comme les marais d’autrefois.",
            "src": [
              "https://archiviodistatovenezia.it/it/la-sede-dei-frari.html?catid=13%3Astoria&id=58%3Ail-convento-e-il-chiostro-della-trinita&view=article"
            ]
          }
        ]
      },
      {
        "title": "Colonnes et gardien de pierre",
        "intro": "Deux défis d'observation, puis trois questions sur la pyramide de Canova.",
        "steps": [
          {
            "idx": 202,
            "where": "Depuis l’entrée, avance doucement et compte les gros piliers de chaque côté.",
            "q": "Combien de grosses colonnes portent les grandes voûtes de la nef ?",
            "opts": [
              "8",
              "10",
              "12",
              "14"
            ],
            "a": 2,
            "reveal": "**12 colonnes.** Elles sont disposées par six de chaque côté de la nef. Le site officiel les associe aux douze apôtres.",
            "title": "Les douze géants",
            "img": "img/q/frari-q03.webp",
            "cap": "La nef centrale et ses rangées de piliers. · Zairon · CC BY-SA 4.0",
            "src": [
              "https://www.basilicadeifrari.it/interno-della-basilica/"
            ]
          },
          {
            "idx": 203,
            "where": "Nef de gauche, près de l’entrée : regarde la base du grand monument blanc en forme de pyramide.",
            "q": "Quel animal repose sur la première marche de la pyramide de marbre blanc ?",
            "opts": [
              "Un lion",
              "Un aigle",
              "Un cheval",
              "Un dauphin"
            ],
            "a": 0,
            "reveal": "**Un lion ailé.** Ce lion à ailes est sculpté au pied du monument à Antonio Canova. Il rappelle aussi le lion ailé de saint Marc, emblème de Venise.",
            "title": "Un animal qui veille",
            "img": "img/q/frari-q04.webp",
            "cap": "Détail recadré du lion ailé de Canova. · Didier Descouens · CC BY-SA 4.0",
            "imgPos": "50% 50%",
            "src": [
              "https://catalogo.beniculturali.it/detail/HistoricOrArtisticProperty/0500677897"
            ],
            "next": [
              {
                "idx": 204,
                "where": "Regarde la porte sombre au centre de la pyramide.",
                "q": "À quoi sert ce monument ?",
                "opts": [
                  "À garder une ancienne porte",
                  "À honorer un mort",
                  "À abriter une fontaine",
                  "À cacher un orgue"
                ],
                "a": 1,
                "reveal": "**C’est un monument funéraire.** Il honore le sculpteur Antonio Canova. C’est aussi le lieu où son cœur a été déposé ; son corps repose à Possagno.",
                "img": "img/q/frari-q05.webp",
                "cap": "Le monument à Canova dans la nef gauche. · Didier Descouens · CC BY-SA 4.0",
                "src": [
                  "https://catalogo.beniculturali.it/detail/HistoricOrArtisticProperty/0500677897"
                ]
              },
              {
                "idx": 205,
                "where": "Lève les yeux juste au-dessus du nom CANOVA.",
                "q": "Quel animal entoure le portrait de Canova, au-dessus de la porte ?",
                "opts": [
                  "Un poisson",
                  "Un serpent qui se mord la queue",
                  "Un lézard",
                  "Une anguille"
                ],
                "a": 1,
                "reveal": "**Un serpent qui se mord la queue.** Ce motif, appelé ouroboros, symbolise l’éternité. Il forme le cercle autour du portrait sculpté.",
                "img": "img/q/frari-q06.webp",
                "cap": "Détail recadré : le serpent forme un cercle autour du portrait. · Didier Descouens · CC BY-SA 4.0",
                "src": [
                  "https://catalogo.beniculturali.it/detail/HistoricOrArtisticProperty/0500677897"
                ]
              },
              {
                "idx": 206,
                "where": "Cherche ensuite, sans franchir la barrière, la porte du monument.",
                "q": "Quelle partie du corps de Canova repose ici ?",
                "opts": [
                  "Sa main",
                  "Son cœur",
                  "Sa tête",
                  "Son corps entier"
                ],
                "a": 1,
                "reveal": "**Son cœur.** En 1827, son cœur a été placé dans une urne sous le monument. Le corps de l’artiste est enterré à Possagno.",
                "src": [
                  "https://catalogo.beniculturali.it/detail/HistoricOrArtisticProperty/0500677897"
                ]
              }
            ]
          }
        ]
      },
      {
        "title": "Le doge et le peintre qui décale tout",
        "intro": "Deux monuments étonnants.",
        "steps": [
          {
            "idx": 207,
            "where": "Nef de gauche : trouve le très haut monument où un doge est assis tout en haut.",
            "q": "Qui soutient le monument du doge Giovanni Pesaro ?",
            "opts": [
              "Quatre grandes statues d’hommes",
              "Quatre lions",
              "Quatre colonnes de bois",
              "Quatre anges"
            ],
            "a": 0,
            "reveal": "**Quatre grandes statues d’hommes.** Les quatre figures, de marbre noir et blanc, portent l’architecture du tombeau. Deux dragons sculptés soutiennent le sarcophage du doge, élu à vie à la tête de Venise.",
            "title": "Le géant porté par quatre hommes",
            "img": "img/q/frari-q08.webp",
            "cap": "Le monument à Giovanni Pesaro : les quatre figures porteuses se voient en bas. · Didier Descouens · CC BY-SA 4.0",
            "src": [
              "https://www.catalogo.beniculturali.it/detail/HistoricOrArtisticProperty/0500222386A-0",
              "https://wrap.warwick.ac.uk/id/eprint/94209/1/WRAP_Theses_Colombo_2016.pdf"
            ]
          },
          {
            "idx": 208,
            "work": "FRA02",
            "where": "Nef de gauche : observe le grand tableau près du monument du doge.",
            "q": "De quel côté Titien place-t-il la Vierge dans la Madone de Ca’ Pesaro ?",
            "opts": [
              "À gauche",
              "Au centre",
              "À droite",
              "Tout en bas"
            ],
            "a": 2,
            "reveal": "**À droite.** Titien installe Marie et l’Enfant sur une haute estrade décalée et compose la scène en diagonale. C’était un choix inhabituel pour un retable.",
            "title": "Le peintre qui triche",
            "img": "img/q/frari-q09.webp",
            "cap": "La Madone de Ca’ Pesaro, œuvre entière. · The Yorck Project / Wikimedia Commons · domaine public",
            "src": [
              "https://www.basilicadeifrari.it/wp-content/uploads/2023/10/FRANCESE-2023.pdf",
              "https://smarthistory.org/titian-madonna-of-the-pesaro-family/"
            ]
          }
        ]
      },
      {
        "title": "Un musicien et un chœur de bois",
        "intro": "Sur les traces de Monteverdi.",
        "steps": [
          {
            "idx": 209,
            "where": "Cherche une dalle au sol dans la chapelle des Milanais ; respecte l’espace de prière.",
            "q": "Dans la chapelle des Milanais, quelle dalle porte le nom d’un musicien mort à Venise en 1643 ?",
            "opts": [
              "Antonio Vivaldi",
              "Claudio Monteverdi",
              "Giovanni Gabrieli",
              "Tomaso Albinoni"
            ],
            "a": 1,
            "reveal": "**Claudio Monteverdi.** Né en 1567, il devient maître de chapelle de Saint-Marc et fait évoluer le théâtre musical. Sa tombe se trouve bien dans la chapelle des Milanais.",
            "title": "La tombe du musicien",
            "img": "img/q/frari-q10.webp",
            "cap": "La dalle funéraire de Claudio Monteverdi. · Didier Descouens · CC BY-SA 4.0",
            "src": [
              "https://www.basilicadeifrari.it/wp-content/uploads/2023/10/FRANCESE-2023.pdf",
              "https://www.basilicadeifrari.it/venezia-festeggia-monteverdi-iniziative-ottobre/"
            ]
          },
          {
            "idx": 210,
            "where": "Au milieu de la nef, observe les sièges sculptés à travers l’ouverture du chœur.",
            "q": "Comment sont placés les sièges du chœur des frères ?",
            "opts": [
              "En longues rangées tournées vers l’autel",
              "En U, avec des rangées qui se font face",
              "En cercle autour d’une table",
              "Sur les côtés de l’entrée"
            ],
            "a": 1,
            "reveal": "**En U, avec des rangées face à face.** Le chœur compte 124 stalles sur trois niveaux. Achevé en 1468 par Marco et Francesco Cozzi, il demeure à sa place d’origine dans la nef.",
            "title": "Les chanteurs invisibles",
            "img": "img/q/frari-q11.webp",
            "cap": "Les stalles sculptées du chœur. · Didier Descouens · CC BY-SA 4.0",
            "src": [
              "https://www.basilicadeifrari.it/wp-content/uploads/2023/10/FRANCESE-2023.pdf",
              "https://insulafulcheria.comunecrema.it/sites/default/files/insula_fulcheria_2010_insula_fulcheria_2010-volume_a.pdf"
            ]
          }
        ]
      },
      {
        "title": "La femme qui s'envole et le second tombeau",
        "intro": "Titien aux Frari.",
        "steps": [
          {
            "idx": 211,
            "work": "FRA01",
            "where": "Au maître-autel, tout au fond : regarde la figure centrale du grand tableau.",
            "q": "De quelle couleur est la robe de Marie dans L’Assomption de Titien ?",
            "opts": [
              "Blanche, avec un manteau vert",
              "Rouge, avec un manteau bleu",
              "Jaune, avec un manteau noir",
              "Bleue, avec un manteau rouge"
            ],
            "a": 1,
            "reveal": "**Rouge, avec un manteau bleu.** Marie s’élève au milieu des anges. Le retable mesure près de sept mètres de haut. Le lien avec Monteverdi : ses Vêpres de 1610 sont dédiées à la Vierge.",
            "title": "La femme qui s’envole",
            "img": "img/q/frari-q12.webp",
            "cap": "Détail recadré : Marie porte une robe rouge et un manteau bleu. · Luca Aless · CC BY-SA 4.0",
            "src": [
              "https://www.basilicadeifrari.it/wp-content/uploads/2023/10/FRANCESE-2023.pdf",
              "https://smarthistory.org/titian-assumption-of-the-virgin/",
              "https://sscm-jscm.org/jscm-issues/volume-18-no-1/monteverdis-mass-and-vespers-of-1610-the-economic-social-and-courtly-context/"
            ]
          },
          {
            "idx": 212,
            "where": "Près de l’entrée, dans la nef de droite : trouve le monument blanc couronné d’un lion ailé.",
            "q": "Quel autre grand peintre est enterré ici ?",
            "opts": [
              "Giovanni Bellini",
              "Le Titien",
              "Le Tintoret",
              "Véronèse"
            ],
            "a": 1,
            "reveal": "**Le Titien.** Tiziano Vecellio meurt en 1576. Son monument du XIXᵉ siècle lui rend hommage par plusieurs scènes sculptées d’après ses tableaux : on en compte cinq, dont trois grands reliefs centraux.",
            "title": "Le deuxième géant",
            "img": "img/q/frari-q13.webp",
            "cap": "Monument à Titien : les scènes en relief entourent la figure du peintre. · Didier Descouens · CC BY-SA 4.0",
            "src": [
              "https://www.basilicadeifrari.it/wp-content/uploads/2023/10/FRANCESE-2023.pdf",
              "https://journals.flvc.org/athanor/article/download/126703/126257/207579"
            ]
          }
        ]
      },
      {
        "title": "Les Vêpres de Monteverdi",
        "intro": "Assieds-toi et écoute. Quatre défis d'écoute : le dernier recueille une impression personnelle, sans mauvaise réponse.",
        "steps": [
          {
            "idx": 213,
            "q": "Qui chante en premier dans « Deus in adiutorium » ?",
            "opts": [
              "Une voix seule",
              "Tout le chœur",
              "Un duo d’enfants",
              "Personne : les instruments seuls"
            ],
            "a": 0,
            "where": "Mets ton casque et appuie sur ▶ pour écouter le tout début des Vêpres.",
            "audio": "audio/vespro-deus-intro.mp3",
            "reveal": "**Une voix seule.** Une intonation soliste ouvre l’œuvre, puis le chœur répond avec les instruments. La fanfare reprend la toccata de L’Orfeo (1607). Dans beaucoup d’enregistrements, la voix initiale est un ténor.",
            "title": "L’appel de monteverdi",
            "img": "img/q/frari-q14.webp",
            "cap": "Claudio Monteverdi, portrait attribué à Bernardo Strozzi · domaine public",
            "src": [
              "https://baroque.boston/monteverdi-vespers",
              "https://www.arcadiaplayers.org/uploads/1/0/5/7/10576653/vespers___revised_web.pdf"
            ]
          },
          {
            "idx": 214,
            "q": "Combien de voix entend-on à la fin du « Duo Seraphim » ?",
            "opts": [
              "Deux",
              "Trois",
              "Quatre",
              "Six"
            ],
            "a": 1,
            "where": "Écoute l'extrait « Duo Seraphim ».",
            "audio": null,
            "pending": true,
            "reveal": "**Trois voix.** Le motet commence à deux voix et en ajoute une troisième lorsque le texte évoque la Trinité.",
            "title": "Trois voix mystérieuses",
            "src": [
              "https://baroque.boston/monteverdi-vespers",
              "https://www.pegasusearlymusic.org/wp-content/uploads/2025/03/Program-notesVespers-2025.pdf"
            ]
          },
          {
            "idx": 215,
            "q": "Dans la « Sonata sopra Sancta Maria », que répète la voix aiguë ?",
            "opts": [
              "Alleluia",
              "Sancta Maria, ora pro nobis",
              "Gloria in excelsis Deo",
              "Amen, amen"
            ],
            "a": 1,
            "where": "Écoute l'extrait « Sonata sopra Sancta Maria ».",
            "audio": null,
            "pending": true,
            "reveal": "**Sancta Maria, ora pro nobis.** Une voix de dessus répète cette invocation mariale pendant que les instruments se répondent.",
            "title": "Une voix parmi les instruments",
            "src": [
              "https://baroque.boston/monteverdi-vespers",
              "https://www.pegasusearlymusic.org/wp-content/uploads/2025/03/Program-notesVespers-2025.pdf"
            ]
          },
          {
            "idx": 216,
            "q": "Quel sentiment te donne le Magnificat ?",
            "opts": [
              "De la joie",
              "De l’étonnement",
              "Du calme",
              "Un autre sentiment"
            ],
            "a": 0,
            "free": true,
            "where": "Écoute un extrait du Magnificat.",
            "audio": null,
            "pending": true,
            "reveal": "Il n'y a pas de mauvaise réponse ! Choisis le sentiment qui te vient, et raconte ce que tu as entendu.",
            "title": "Le grand final",
            "img": "img/q/frari-q17.webp",
            "cap": "Page de titre des Vêpres, Venise, 1610 · domaine public",
            "src": [
              "https://baroque.boston/monteverdi-vespers"
            ]
          }
        ]
      }
    ] },
  { id: "sangiorgio", emoji: "🔭", name: "Le grand panorama", lat: 45.42945, lon: 12.34335, r: 100,
    story: "Sur l'île de San Giorgio, un ascenseur monte tout en haut du campanile. De là-haut, Venise ressemble à un jouet géant.",
    clue: "Pour voir le trésor, il faut d'abord voir la ville entière. Monte, Gardien, et trouve où dort le Lion.",
    chapters: [
      {
        "steps": [
          {
            "idx": 100,
            "loc": { "lat": 45.42945, "lon": 12.34335 },
            "where": "Depuis le petit campo devant l’église, regarde la partie centrale de la façade blanche. Repère les très grandes colonnes qui montent jusqu’au grand fronton.",
            "q": "Combien de colonnes géantes vois-tu devant la partie centrale ?",
            "opts": [
              "Deux",
              "Trois",
              "Quatre",
              "Six"
            ],
            "a": 2,
            "reveal": "L’architecte Andrea Palladio a conçu la basilique au XVIe siècle. Les quatre colonnes géantes donnent à sa façade l’allure d’un temple antique. La façade a été achevée après la mort de Palladio, au début du XVIIe siècle.",
            "img": "img/q/sangiorgio-0.webp",
            "src": [
              "https://www.veneziaunica.it/it/cosa-fare-a-venezia/itinerari/la-giudecca-bellezza-sull-acqua"
            ],
            "cap": "Les quatre grandes colonnes portent le fronton central."
          },
          {
            "idx": 101,
            "loc": { "lat": 45.42945, "lon": 12.34335 },
            "where": "Reste face à la basilique et lève les yeux au-dessus des quatre grandes colonnes. Suis du regard les deux bords inclinés du fronton.",
            "q": "Quelle forme dessine ce grand fronton ?",
            "opts": [
              "Un cercle",
              "Un triangle",
              "Une étoile",
              "Un losange"
            ],
            "a": 1,
            "reveal": "Le fronton triangulaire est un élément de l’architecture des temples antiques. Palladio a repris ce vocabulaire classique pour la façade de la basilique. Derrière lui, l’église possède aussi une grande coupole.",
            "src": [
              "https://www.veneziaunica.it/it/cosa-fare-a-venezia/itinerari/la-giudecca-bellezza-sull-acqua"
            ]
          },
          {
            "idx": 102,
            "loc": { "lat": 45.42945, "lon": 12.34335 },
            "where": "Sur la façade, cherche dans une niche la statue d’un soldat portant casque et arme. Regarde le petit animal sculpté à ses pieds : un adulte ou le zoom de révélation peut aider.",
            "q": "Quel animal légendaire se trouve aux pieds de saint Georges ?",
            "opts": [
              "Un griffon",
              "Un lion",
              "Un serpent de mer",
              "Un dragon"
            ],
            "a": 3,
            "reveal": "Saint Georges, qui donne son nom à l’île et à l’église, est souvent représenté en train de vaincre un dragon. La Ville de Venise identifie deux niches de la façade : l’une pour saint Georges et l’autre pour saint Étienne.",
            "img": "img/q/sangiorgio-2.webp",
            "src": [
              "https://www.veneziaunica.it/it/cosa-fare-a-venezia/itinerari/la-giudecca-bellezza-sull-acqua",
              "https://commons.wikimedia.org/wiki/File:S_giorgio_detail_3.jpg"
            ],
            "cap": "La petite tête du dragon est visible en bas, près de la jambe de saint Georges."
          },
          {
            "idx": 103,
            "loc": { "lat": 45.4295, "lon": 12.34381 },
            "where": "Depuis le campo, cherche la haute tour de brique à côté de la basilique. Observe l’extrémité de sa flèche verte, sans monter dans la tour.",
            "q": "Quelle figure se dresse au sommet du campanile ?",
            "opts": [
              "Un ange",
              "Un lion ailé",
              "Un bateau",
              "Une horloge"
            ],
            "a": 0,
            "reveal": "Le campanile actuel a été construit en 1791 après l’effondrement d’une tour précédente. Sa flèche porte un ange. Lors de la vérification du 21 octobre 2026, l’abbaye signalait que l’accès à la tour était temporairement fermé pour travaux ; ce détail s’observe donc depuis l’extérieur.",
            "img": "img/q/sangiorgio-3.webp",
            "src": [
              "https://www.veneziaunica.it/it/cosa-fare-a-venezia/itinerari/la-giudecca-bellezza-sull-acqua",
              "https://www.abbaziasangiorgio.it/2026/04/24/tintoretto-rediscover/"
            ],
            "cap": "Un ange se tient à l’extrémité de la flèche du campanile."
          },
          {
            "idx": 104,
            "loc": { "lat": 45.42937, "lon": 12.34331 },
            "where": "Une fois entré dans la nef, regarde le pavement de l’allée centrale, sans gêner les visiteurs. Observe la direction des rangées de carreaux clairs et foncés.",
            "q": "Quel motif les carreaux du sol forment-ils surtout ?",
            "opts": [
              "Des cercles concentriques",
              "Des vagues",
              "Un damier en diagonale",
              "Des feuilles"
            ],
            "a": 2,
            "reveal": "Le contraste des couleurs rend le long axe de la nef facile à suivre jusqu’au chœur. La basilique conçue par Palladio est organisée en croix latine, avec une nef centrale, des bas-côtés et une coupole à la croisée.",
            "img": "img/q/sangiorgio-4.webp",
            "src": [
              "https://www.veneziaunica.it/it/cosa-fare-a-venezia/itinerari/la-giudecca-bellezza-sull-acqua",
              "https://commons.wikimedia.org/wiki/File:Nave_-_San_Giorgio_Maggiore_-_Venice_2016.jpg"
            ],
            "cap": "Les carreaux clairs et foncés se suivent en diagonale sur le sol de la nef."
          },
          {
            "idx": 105,
            "loc": { "lat": 45.42937, "lon": 12.34331 },
            "where": "Cherche le grand tableau de la Cène peint par le Tintoret. Dans la partie basse, regarde près d’un panier et des cruches : le détail est petit, demande à un adulte de t’aider à le repérer.",
            "q": "Quel animal se glisse près du panier ?",
            "opts": [
              "Un chat",
              "Un lapin",
              "Un coq",
              "Une tortue"
            ],
            "a": 0,
            "reveal": "Jacopo Tintoretto a peint cette Cène pour San Giorgio Maggiore à la fin du XVIe siècle. Au milieu du récit religieux, il a représenté des objets et un animal du quotidien. Après restauration, la toile est de nouveau exposée dans la basilique depuis avril 2026.",
            "work": "GIO01",
            "img": "img/q/sangiorgio-5.webp",
            "src": [
              "https://www.abbaziasangiorgio.it/2026/04/24/tintoretto-rediscover/",
              "https://commons.wikimedia.org/wiki/File:Tintoretto%2C_ultima_cena%2C_1594%2C_09_gatto.jpg"
            ],
            "cap": "Le chat regarde dans le panier, à côté des cruches."
          },
          {
            "idx": 106,
            "loc": { "lat": 45.42902, "lon": 12.34318 },
            "where": "Dans le cloître de Palladio, regarde une galerie autour du jardin central. Observe la forme répétée des ouvertures portées par les colonnes.",
            "q": "Quelle forme se répète dans cette galerie ?",
            "opts": [
              "Des arcs pointus",
              "Des arcs arrondis",
              "Des fenêtres triangulaires",
              "Des murs sans ouverture"
            ],
            "a": 1,
            "reveal": "Le cloître de Palladio fait partie de l’ancien monastère bénédictin. La visite guidée de la Fondation Giorgio Cini permet de voir ce cloître et celui des Buora, deux espaces construits à des époques différentes.",
            "src": [
              "https://www.visitcini.com/orari-e-info/",
              "https://www.visitcini.com/fondazione-cini-unisola-di-cultura-a-venezia/",
              "https://commons.wikimedia.org/wiki/File:Loggiato_del_chiostro_palladiano_del_Monastero_di_San_Giorgio.jpg"
            ]
          },
          {
            "idx": 107,
            "loc": { "lat": 45.42905, "lon": 12.34345 },
            "where": "Dans le parcours guidé, arrête-toi devant le grand escalier de Longhena. Regarde ce qui longe les marches de pierre et empêche de tomber sur les côtés.",
            "q": "Quel élément borde les volées de marches ?",
            "opts": [
              "Des filets de corde",
              "Des vitres bleues",
              "Des balustrades de pierre",
              "Des murs de briques rouges"
            ],
            "a": 2,
            "reveal": "Cet escalier monumental porte le nom de Baldassarre Longhena, architecte vénitien du XVIIe siècle. Il fait partie des espaces montrés lors de la visite guidée de la Fondation Cini.",
            "img": "img/q/sangiorgio-7.webp",
            "src": [
              "https://www.visitcini.com/orari-e-info/",
              "https://commons.wikimedia.org/wiki/File:Scalone_del_Longhena_visione_laterale.jpg"
            ],
            "cap": "Des balustrades de pierre suivent les deux côtés visibles de l’escalier."
          },
          {
            "idx": 108,
            "loc": { "lat": 45.42898, "lon": 12.34325 },
            "where": "Dans l’ancien réfectoire, la salle où les moines mangeaient, regarde l’immense image placée au fond. Observe les nombreux personnages réunis autour des tables.",
            "q": "Quelle scène montre cette grande image ?",
            "opts": [
              "Une bataille navale",
              "Un mariage et son banquet",
              "Une course de gondoles",
              "Un marché aux poissons"
            ],
            "a": 1,
            "reveal": "L’image représente Les Noces de Cana de Véronèse. Celle que l’on voit aujourd’hui dans le réfectoire est un fac-similé, réalisé pour rappeler l’emplacement d’origine du tableau. L’original a été emporté en 1797 sous Napoléon et se trouve au musée du Louvre à Paris.",
            "src": [
              "https://www.visitcini.com/orari-e-info/",
              "https://www.visitcini.com/fondazione-cini-unisola-di-cultura-a-venezia/"
            ]
          },
          {
            "idx": 109,
            "loc": { "lat": 45.42869, "lon": 12.34416 },
            "where": "Si tu fais la visite du labyrinthe Borges, entre dans ses allées avec le guide. Observe de quoi sont faits les murs qui dessinent le parcours.",
            "q": "Qu’est-ce qui forme les murs du labyrinthe ?",
            "opts": [
              "Des panneaux de verre",
              "Des haies de buis",
              "Des piles de livres",
              "Des voiles de bateau"
            ],
            "a": 1,
            "reveal": "Le labyrinthe Borges est un parcours d’environ un kilomètre formé de 3 200 plants de buis. Son dessin a été imaginé par Randoll Coate en hommage à l’écrivain Jorge Luis Borges et à son récit Le Jardin aux sentiers qui bifurquent. Cette partie se visite avec un billet et un parcours distincts de celui du monastère.",
            "src": [
              "https://www.visitcini.com/orari-e-info/"
            ]
          }
        ]
      }
    ] },
  { id: "giardini", emoji: "🌳", name: "Les jardins de la Biennale", lat: 45.42902, lon: 12.35793, r: 150,
    story: "Dans les Giardini, six pavillons racontent l’histoire de la Biennale à travers leur architecture. Leur accès dépend des expositions : vérifie l’ouverture avant ta visite.",
    clue: "Observe les pavillons et les arbres autour d’eux : chaque bâtiment cache un détail à découvrir.",
    chapters: [
      {
        "steps": [
          {
            "idx": 300,
            "where": "Cherche le petit pavillon FINLANDIA. Regarde ses parois et les motifs clairs qui les traversent.",
            "q": "Quel duo de couleurs et de formes compose sa façade ?",
            "opts": [
              "Des bandes bleues et des triangles blancs",
              "Des rayures rouges et des cercles jaunes",
              "Des carrés noirs et des étoiles dorées",
              "Des briques vertes et des arches blanches"
            ],
            "a": 0,
            "reveal": "L’architecte finlandais Alvar Aalto l’a conçu en 1956. Ses éléments de bois devaient pouvoir être démontés, comme une tente ; le pavillon est finalement resté dans les jardins.",
            "img": "img/q/giardini-0.webp",
            "src": [
              "https://visit.alvaraalto.fi/en/destinations/the-finnish-pavilion-at-the-venice-biennale/",
              "https://www.labiennale.org/en/venues/giardini-della-biennale"
            ],
            "cap": "le bleu est barré de triangles blancs."
          },
          {
            "idx": 301,
            "where": "Trouve le pavillon des PAYS NORDIQUES. Observe la rencontre entre le toit et la végétation.",
            "q": "Quel élément vivant traverse ou s’insère dans le bâtiment ?",
            "opts": [
              "Des ceps de vigne",
              "Des haies taillées en labyrinthe",
              "Des troncs d’arbres",
              "Des roseaux dans un bassin"
            ],
            "a": 2,
            "reveal": "L’architecte norvégien Sverre Fehn a prévu la nature dans son projet. Trois arbres poussent dans ce pavillon commun à la Finlande, à la Norvège et à la Suède, achevé en 1962.",
            "img": "img/q/giardini-1.webp",
            "src": [
              "https://frame-finland.fi/en/venice-biennale/pavilions/"
            ],
            "cap": "un tronc passe au milieu de la structure."
          },
          {
            "idx": 302,
            "where": "Cherche l’inscription GIAPPONE. Regarde l’espace juste sous le volume principal du pavillon.",
            "q": "Comment la grande salle est-elle placée par rapport au sol ?",
            "opts": [
              "Elle est entièrement enterrée",
              "Elle est surélevée sur des supports",
              "Elle flotte sur le canal",
              "Elle est suspendue aux branches"
            ],
            "a": 1,
            "reveal": "Le pavillon japonais a été bâti en 1956 d’après Takamasa Yoshizaka. Son niveau d’exposition repose sur des supports de béton : ce vide sous le bâtiment laisse voir la pente du terrain et les arbres voisins.",
            "img": "img/q/giardini-2.webp",
            "src": [
              "https://venezia-biennale-japan.jpf.go.jp/e/about",
              "https://censimentoarchitetturecontemporanee.cultura.gov.it/scheda-opera?id=1396"
            ],
            "cap": "la salle est au-dessus d’un espace ouvert."
          },
          {
            "idx": 303,
            "where": "Au pavillon CANADA, observe le mur qui porte le nom du pays.",
            "q": "De quoi ce mur est-il fait ?",
            "opts": [
              "De plaques de marbre blanc",
              "De bois peint en bleu",
              "De métal miroir",
              "De briques rouges"
            ],
            "a": 3,
            "reveal": "Construit en 1957–1958 par l’agence italienne BBPR, le pavillon associe brique, verre, bois et acier. Sa forme s’enroule autour de son site boisé, où deux grands arbres ont été intégrés au bâtiment.",
            "img": "img/q/giardini-3.webp",
            "src": [
              "https://www.canada.ca/en/national-film-board/news/2018/07/newly-restored-canada-pavilion-unveiled-in-venice-at-the-biennale-architettura-2018-on-the-60th-anniversary-of-its-inauguration.html"
            ],
            "cap": "le nom CANADA se détache sur la brique."
          },
          {
            "idx": 304,
            "where": "Place-toi face au pavillon GRAN BRETAGNA. Observe la montée vers son entrée.",
            "q": "Quel élément mène à la porte principale ?",
            "opts": [
              "Un pont en bois au-dessus de l’eau",
              "Un grand escalier de marbre",
              "Une rampe en spirale",
              "Une passerelle de verre suspendue"
            ],
            "a": 1,
            "reveal": "Le pavillon a ouvert en 1909 dans un ancien café-restaurant transformé par Edwin Alfred Rickards. Son escalier mène à une façade de style classique, avec des colonnes.",
            "img": "img/q/giardini-4.webp",
            "src": [
              "https://venicebiennale.britishcouncil.org/sites/default/files/appendix_c_british_pavilion_user_guide-merged.pdf"
            ],
            "cap": "l’escalier monte vers l’entrée classique."
          },
          {
            "idx": 305,
            "where": "Cherche le pavillon AUSTRALIA au bord du canal. Regarde surtout son enveloppe.",
            "q": "À quel objet sa silhouette sombre fait-elle penser ?",
            "opts": [
              "Un clocher à coupole",
              "Une maison à colombages",
              "Une grande boîte noire",
              "Une tente rayée"
            ],
            "a": 2,
            "reveal": "Ouvert en 2015, ce pavillon des architectes Denton Corker Marshall est revêtu de granit noir. Certains panneaux peuvent s’ouvrir selon l’exposition : son aspect peut donc changer.",
            "img": "img/q/giardini-5.webp",
            "src": [
              "https://creative.gov.au/wp-content/uploads/2022/09/Media-Release-Venice-Biennale-2024-%E2%80%93-expressions-of-interest-open-for-the-next-artistic-team-to-exhibit-at-the-Australia-Pavilion.pdf",
              "https://www.labiennale.org/en/venues/giardini-della-biennale"
            ],
            "cap": "le pavillon forme une boîte sombre près de l’eau."
          }
        ]
      }
    ] },
  { id: "lido", emoji: "🏖️", name: "La plage du Lido", lat: 45.4105, lon: 12.3725, r: 200,
    story: "À côté de Venise, une longue île avec une vraie plage de sable ! (Si le temps ne s'y prête pas, tu peux sauter cette étape avec un parent.)",
    clue: "Le sable garde de petits trésors : une coquille, un caillou, un rire.",
    tasks: [
      { t: "do", q: "Construis un mini-château de sable ou un mini-pont." },
      { t: "count", q: "Combien de coquillages as-tu trouvés ? (Remets-les à la mer après !)", a: null },
    ] },
  { id: "arsenal", emoji: "🦁", name: "Les lions de l'Arsenal", lat: 45.4347, lon: 12.3506, r: 80,
    story: "Devant l'ancien chantier naval des navires de Venise, des lions de pierre montent la garde. L'un d'eux, venu de Grèce, a des lettres gravées sur l'épaule : des Vikings les auraient écrites !",
    clue: "Dernière étape avant la cour cachée. Les lions de pierre me connaissent : « Qui garde l'Arsenal garde la ville. »",
    tasks: [
      { t: "choice", q: "Qui aurait gravé des lettres sur le lion ?", opts: ["⚔️ Des Vikings", "🤖 Des robots", "👽 Des extraterrestres"], a: 0, fact: "Ce sont des runes, une vieille écriture nordique." },
      { t: "count", q: "Combien de lions comptes-tu devant l'entrée ?", a: null },
    ] },
  { id: "castello", emoji: "🧭", name: "Castello, derrière l'Arsenal", lat: 45.43221, lon: 12.35251, r: 90,
    story: "De la Via Garibaldi au Campo San Pietro, suis les rues, un lion de bronze et une ancienne serre. Tout le parcours se fait dehors.",
    clue: "Une rue a remplacé l'eau ; plus loin, un lion sans ailes garde le chemin de la tour claire.",
    chapters: [
      {
        "steps": [
          {
            "idx": 300,
            "loc": { "lat": 45.43221, "lon": 12.35251 },
            "where": "Depuis les rues proches de l’Arsenal, trouve la large Via Garibaldi. Observe l’espace entre les deux rangées de maisons et le sol sous tes pieds.",
            "q": "Qu’est-ce qui occupe aujourd’hui la place centrale de cette large voie ?",
            "opts": [
              "Un canal pour les gondoles",
              "Une rue pavée pour marcher",
              "Une pelouse sans chemin",
              "Des rails de tramway"
            ],
            "a": 1,
            "reveal": "La Via Garibaldi est étonnamment large pour Venise. La Ville de Venise explique qu’elle a été créée en comblant un ancien canal. Elle s’appelait autrefois Via Eugenia : derrière ce nom de rue se cache donc un morceau de la géographie passée de la ville.",
            "img": "img/q/castello-0.webp",
            "src": [
              "https://www.comune.venezia.it/it/content/castello-est"
            ],
            "cap": "La large chaussée piétonne a pris la place de l’ancien canal."
          },
          {
            "idx": 301,
            "loc": { "lat": 45.43199, "lon": 12.35486 },
            "where": "Au bout de la Via Garibaldi, près du viale arboré, trouve la haute statue de Giuseppe Garibaldi. Cherche dans les rochers, sous le personnage principal.",
            "q": "Quel animal en bronze s’y repose ?",
            "opts": [
              "Un lion",
              "Un cheval",
              "Un loup",
              "Un taureau"
            ],
            "a": 0,
            "reveal": "Le monument est l’œuvre du sculpteur Augusto Benvenuti. L’historienne de l’art Cristina Beltrami explique que le lion évoque à la fois Venise et le courage des compagnons de Garibaldi. Cette fois, le lion n’a pas d’ailes.",
            "img": "img/q/castello-1.webp",
            "src": [
              "https://www.comune.venezia.it/it/content/castello-est",
              "https://ateneoveneto.org/wp-content/uploads/2023/06/Ateneo-Veneto-CC-III-serie-12_I-2013-estratto-Beltrami.pdf"
            ],
            "cap": "Le lion est couché dans les rochers, sous Garibaldi."
          },
          {
            "idx": 302,
            "loc": { "lat": 45.43199, "lon": 12.35486 },
            "where": "Fais le tour du monument à Garibaldi. Un second personnage se tient derrière les rochers, presque invisible depuis la face du lion. Regarde près de son épaule.",
            "q": "Quel long objet porte ce personnage ?",
            "opts": [
              "Une rame",
              "Un fusil",
              "Une trompette",
              "Une canne à pêche"
            ],
            "a": 1,
            "reveal": "Ce personnage est un jeune soldat de Garibaldi, ou garibaldien. Il paraît monter la garde à l’arrière du monument. L’œuvre a été conçue pour être regardée de tous les côtés : faire le tour permet de découvrir cette partie cachée.",
            "img": "img/q/castello-2.webp",
            "src": [
              "https://ateneoveneto.org/wp-content/uploads/2023/06/Ateneo-Veneto-CC-III-serie-12_I-2013-estratto-Beltrami.pdf",
              "https://www.openstarts.units.it/bitstreams/57d61d5d-e402-44d7-99db-3b0db8dae213/download"
            ],
            "cap": "Le fusil repose en diagonale derrière l’épaule de la sentinelle."
          },
          {
            "idx": 303,
            "loc": { "lat": 45.43056, "lon": 12.35516 },
            "where": "Près du viale Garibaldi et des Giardini, repère le long bâtiment appelé Serra dei Giardini. Observe ses hautes fenêtres cintrées.",
            "q": "Quel matériau couvre une grande partie de sa façade ?",
            "opts": [
              "Des plaques de bois",
              "Du verre",
              "De la toile",
              "Des briques pleines"
            ],
            "a": 1,
            "reveal": "C’est une ancienne serre, construite pour accueillir des plantes. La Ville de Venise la situe au bord du viale Garibaldi et la décrit comme un édifice du XIXe siècle. Sa charpente métallique et ses grandes surfaces vitrées laissent entrer la lumière.",
            "img": "img/q/castello-3.webp",
            "src": [
              "https://www.comune.venezia.it/it/content/castello-est",
              "https://www.veneziaunica.it/en/things-to-do-in-venice/gardens-parks-natural-oases/serra-dei-giardini-the-garden-conservatory"
            ],
            "cap": "Les grandes vitres sont prises dans une charpente métallique."
          },
          {
            "idx": 304,
            "loc": { "lat": 45.43445, "lon": 12.35906 },
            "where": "Reviens vers la Via Garibaldi, puis suis la Fondamenta Sant’Anna, franchis le Ponte Quintavalle et gagne la Calle drio el Campanile jusqu’au Campo San Pietro. Regarde de chaque côté de l’allée pavée.",
            "q": "Qu’est-ce qui occupe une grande partie du campo ?",
            "opts": [
              "Des pelouses et des arbres",
              "Des bassins d’eau",
              "Des mosaïques dorées",
              "Des étals de poissons"
            ],
            "a": 0,
            "reveal": "Le Campo San Pietro ressemble à un petit jardin, alors que beaucoup de campos vénitiens sont surtout pavés. La Ville de Venise souligne cette particularité. Il se trouve devant l’ancienne cathédrale de San Pietro di Castello.",
            "img": "img/q/castello-4.webp",
            "src": [
              "https://www.comune.venezia.it/it/content/castello-est",
              "https://chorusvenezia.org/en/visita/basilica-of-san-pietro-di-castello/"
            ],
            "cap": "Une allée pavée traverse les pelouses et les arbres du campo."
          },
          {
            "idx": 305,
            "loc": { "lat": 45.43454, "lon": 12.35986 },
            "where": "Depuis le Campo San Pietro, lève les yeux vers le campanile, séparé de la façade de l’église. Compare sa couleur à celle des maisons en briques autour de lui.",
            "q": "Quelle couleur domine sur cette tour ?",
            "opts": [
              "Rouge brique",
              "Blanc crème",
              "Vert foncé",
              "Noir"
            ],
            "a": 1,
            "reveal": "La tour doit sa couleur claire à la pierre d’Istrie. Elle fut conçue par Mauro Codussi à la fin du XVe siècle. San Pietro fut longtemps la cathédrale de Venise avant que ce rôle ne passe à Saint-Marc au XIXe siècle.",
            "img": "img/q/castello-5.webp",
            "src": [
              "https://www.comune.venezia.it/it/content/castello-est",
              "https://chorusvenezia.org/en/visita/basilica-of-san-pietro-di-castello/"
            ],
            "cap": "La pierre claire distingue le campanile des maisons voisines."
          }
        ]
      }
    ] },
  { id: "cortesconta", final: true, emoji: "🗝️", name: "La Corte Sconta", lat: 45.4340, lon: 12.3478, r: 130,
    story: "Dans le quartier de Castello, derrière l'Arsenal, il existe des cours cachées entre les maisons. La Corte Sconta, c'est LA cour secrète : on y entre par un petit passage, et le temps s'arrête. (Parents : le point exact est approximatif, une cour cachée de Castello fait très bien l'affaire. Pour une pause à table, un célèbre restaurant du coin porte ce nom : à réserver.)",
    clue: "Te voilà au bout du voyage. Il ne te manque qu'un mot de passe : le vrai nom de la ville.",
    tasks: [
      { t: "word", q: "Écris le vrai nom de Venise, en italien, pour ouvrir la porte de la Corte Sconta." },
    ] },
];

export const POINTS = { arrive: 20, task: 15, coll: 3, page: 25, finale: 100, bridge: 5, quiz: 3, work: 30 }; // work : une toile de maître trouvée
