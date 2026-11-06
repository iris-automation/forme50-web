// Données de référence de Forme 50+ : normes des tests, échelles d'exercices, boissons.
// Les § renvoient à BASE-SCIENTIFIQUE.md.

(function (g) {
  'use strict';
  const F = g.Forme50 = g.Forme50 || {};

  // ---------- § 26 : normes des tests ----------
  // [25e, 50e, 75e percentile] par sexe et tranche d'âge. Moins de 60 ans → tranche 60-64 (choix prudent).
  F.NORMES = {
    chaise: {
      homme: { 60: [14, 16, 19], 65: [12, 15, 18], 70: [12, 14, 17] },
      femme: { 60: [12, 15, 17], 65: [11, 14, 16], 70: [10, 13, 15] },
    },
    marche2min: {
      homme: { 60: [87, 101, 115], 65: [86, 101, 116], 70: [80, 95, 110] },
      femme: { 60: [75, 91, 107], 65: [73, 90, 107], 70: [67, 84, 101] },
    },
    // Équilibre sur un pied, yeux ouverts, meilleur de 3 essais (s), sans différence de sexe
    equilibre: { 40: 41.9, 50: 41.2, 60: 32.1, 70: 21.5 },
  };

  // ---------- Exercices (§ 2, 4, 5, 26, 27, 28) ----------
  // niveau : 0 adapté, 1 débutant, 2 intermédiaire, 3 avancé.
  // req : matériel nécessaire (un seul suffit) : salle, halteres, kettlebell, elastique, banc, barre. Vide = rien.
  //       Un sous-tableau veut dire « tout ce matériel ensemble » (ex. banc + haltères).
  // charge : null = poids du corps ; sinon charge de départ prudente (kg) et palier d'augmentation.
  // reps : fourchette de travail. evite : douleurs qui excluent l'exercice. parMain : la charge indiquée est celle de chaque haltère.
  const E = (motif, niveau, id, nom, consigne, opts = {}) => ({
    motif, niveau, id, nom, consigne,
    req: opts.req || [], evite: opts.evite || [], charge: opts.charge || null,
    reps: opts.reps || [8, 12], unite: opts.unite || 'répétitions', parCote: !!opts.parCote, parMain: !!opts.parMain,
  });

  F.EXERCICES = [
    // --- Jambes : s'asseoir et se relever
    E('squat', 0, 'chaise_mains', "Assis-debout en s'aidant des mains", "S'asseoir et se relever d'une chaise en poussant légèrement sur les cuisses. Descendre lentement.", { reps: [8, 12] }),
    E('squat', 1, 'chaise', "Assis-debout sans les mains", "Bras croisés, se relever d'une chaise sans les mains, puis se rasseoir en 2 à 3 secondes.", { reps: [10, 15] }),
    E('squat', 2, 'chaise_lestee', "Assis-debout avec un haltère", "Un haltère tenu contre la poitrine, se relever d'une chaise et se rasseoir lentement. Ménage les genoux.", { req: ['halteres', 'kettlebell'], charge: { femme: 4, homme: 8, pas: 2 } }),
    E('squat', 2, 'squat_pdc', "Squat au poids du corps", "Descendre comme pour s'asseoir, poitrine haute, genoux dans l'axe des pieds, jusqu'à ce que les cuisses soient parallèles au sol.", { evite: ['genoux'], reps: [10, 15] }),
    E('squat', 2, 'presse', "Presse à cuisses", "Pieds à largeur de hanches, descendre jusqu'à 90° aux genoux, ne pas verrouiller en haut.", { req: ['salle'], charge: { femme: 30, homme: 50, pas: 5 } }),
    E('squat', 3, 'goblet', "Squat gobelet", "Haltère ou kettlebell contre la poitrine, descendre sous la parallèle si les genoux le permettent, dos droit.", { req: ['halteres', 'kettlebell'], evite: ['genoux'], charge: { femme: 8, homme: 14, pas: 2 } }),
    E('squat', 3, 'presse_lourde', "Presse à cuisses", "Pieds à largeur de hanches, amplitude complète sans décoller le bassin.", { req: ['salle'], charge: { femme: 50, homme: 80, pas: 5 } }),
    E('squat', 3, 'squat_tempo', "Squat lent avec pause", "Descendre en 3 secondes, pause 2 secondes en bas, remonter. Plus dur qu'il n'y paraît.", { evite: ['genoux'], reps: [8, 12] }),

    // --- Arrière des jambes et fessiers
    E('charniere', 0, 'pont', "Pont fessier", "Allongé·e sur le dos, genoux pliés, monter le bassin en serrant les fessiers, tenir 1 seconde en haut.", { reps: [10, 15] }),
    E('charniere', 1, 'pont', "Pont fessier", "Allongé·e sur le dos, genoux pliés, monter le bassin en serrant les fessiers, tenir 2 secondes en haut.", { reps: [12, 15] }),
    E('charniere', 2, 'pont_charge', "Pont fessier chargé", "Comme le pont fessier, avec un haltère posé sur le bassin.", { req: ['halteres', 'kettlebell'], charge: { femme: 8, homme: 12, pas: 2 } }),
    E('charniere', 2, 'pont_unilateral', "Pont fessier sur une jambe", "Une jambe tendue en l'air, monter le bassin avec l'autre. Garder le bassin bien horizontal.", { parCote: true }),
    E('charniere', 2, 'hip_machine', "Hip thrust à la machine", "Dos contre l'appui, pousser avec les talons jusqu'à l'alignement épaules-hanches-genoux.", { req: ['salle'], charge: { femme: 20, homme: 30, pas: 5 } }),
    E('charniere', 3, 'sdt', "Soulevé de terre jambes semi-tendues", "Un haltère dans chaque main, pencher le buste en poussant les fesses en arrière, dos bien droit, jusqu'à mi-tibia, puis remonter en serrant les fessiers.", { req: ['halteres', 'kettlebell', 'salle'], evite: ['dos'], charge: { femme: 6, homme: 12, pas: 2 }, parMain: true }),
    E('charniere', 3, 'pont_charge_lourd', "Pont fessier chargé", "Haltère ou sac lourd sur le bassin, pause de 2 secondes en haut.", { req: ['halteres', 'kettlebell'], charge: { femme: 14, homme: 20, pas: 2 } }),

    // --- Pousser
    E('pousser', 0, 'pompes_mur', "Pompes contre un mur", "Mains sur le mur à hauteur d'épaules, corps gainé, plier les bras jusqu'à approcher le nez du mur, puis pousser.", { reps: [10, 15] }),
    E('pousser', 1, 'pompes_table', "Pompes sur une table solide", "Mains au bord d'une table stable, corps droit de la tête aux pieds, descendre la poitrine vers le bord.", { reps: [8, 15] }),
    E('pousser', 2, 'pompes_genoux', "Pompes sur les genoux", "Au sol, genoux posés, corps droit des genoux à la tête, descendre la poitrine près du sol.", { evite: ['épaules'] }),
    E('pousser', 2, 'dev_sol', "Développé au sol avec haltères", "Allongé·e, un haltère dans chaque main, descendre jusqu'à ce que les coudes touchent le sol, puis pousser.", { req: ['halteres'], charge: { femme: 4, homme: 8, pas: 1 }, parMain: true }),
    E('pousser', 2, 'dev_machine', "Développé assis à la machine", "Dos collé au dossier, poignées à hauteur de poitrine, pousser sans verrouiller les coudes.", { req: ['salle'], charge: { femme: 10, homme: 20, pas: 2.5 } }),
    E('pousser', 3, 'pompes_sol', "Pompes", "Mains un peu plus larges que les épaules, corps gainé, poitrine près du sol.", { evite: ['épaules'], reps: [6, 12] }),
    E('pousser', 3, 'dev_banc', "Développé couché avec haltères", "Sur un banc, haltères au-dessus de la poitrine, descendre lentement jusqu'aux côtés de la poitrine.", { req: [['banc', 'halteres'], 'salle'], charge: { femme: 6, homme: 12, pas: 1 }, parMain: true }),

    // --- Tirer
    E('tirer', 0, 'rowing_sac', "Rowing avec un sac à dos", "Une main appuyée sur une table, tirer un sac (livres, bouteilles) vers la hanche, coude près du corps.", { charge: { femme: 3, homme: 5, pas: 1 }, parCote: true }),
    E('tirer', 1, 'rowing_sac', "Rowing avec un sac à dos", "Une main appuyée sur une table, tirer le sac vers la hanche en serrant l'omoplate.", { charge: { femme: 4, homme: 6, pas: 1 }, parCote: true }),
    E('tirer', 1, 'elastique', "Tirage à l'élastique", "Élastique coincé dans une porte fermée, tirer vers le ventre en serrant les omoplates.", { req: ['elastique'], reps: [12, 15] }),
    E('tirer', 2, 'rowing_haltere', "Rowing un bras avec haltère", "Une main et un genou sur une chaise ou un banc, tirer l'haltère vers la hanche, dos plat.", { req: ['halteres', 'kettlebell'], charge: { femme: 6, homme: 10, pas: 2 }, parCote: true }),
    E('tirer', 2, 'poulie', "Tirage horizontal à la poulie", "Assis·e, dos droit, tirer la poignée vers le ventre en serrant les omoplates.", { req: ['salle'], charge: { femme: 15, homme: 25, pas: 2.5 } }),
    E('tirer', 3, 'rowing_lourd', "Rowing un bras avec haltère", "Dos plat, tirer l'haltère vers la hanche, pause d'une seconde en haut.", { req: ['halteres', 'kettlebell'], charge: { femme: 10, homme: 16, pas: 2 }, parCote: true }),
    E('tirer', 3, 'tirage_vertical', "Tirage vertical à la poulie", "Tirer la barre vers le haut de la poitrine, coudes vers les côtes.", { req: ['salle'], charge: { femme: 20, homme: 35, pas: 2.5 } }),
    E('tirer', 3, 'traction_assistee', "Traction en négatif", "Monter au-dessus de la barre en s'aidant d'une chaise, puis redescendre le plus lentement possible.", { req: ['barre'], reps: [3, 6] }),

    // --- Une jambe
    E('unilateral', 0, 'marche_basse', "Montée sur une marche basse", "Main sur la rampe, monter sur la première marche en poussant sur la jambe du dessus, redescendre lentement.", { parCote: true, reps: [8, 12] }),
    E('unilateral', 1, 'marche', "Montée sur une marche", "Monter sur une marche d'escalier sans pousser avec la jambe du bas, redescendre en contrôlant.", { parCote: true, reps: [8, 12] }),
    E('unilateral', 2, 'fente_appui', "Fente arrière avec appui", "Une main sur une chaise, reculer une jambe et descendre doucement le genou arrière vers le sol.", { evite: ['genoux', 'hanches'], parCote: true }),
    E('unilateral', 2, 'step_charge', "Montée sur marche avec haltères", "Un haltère dans chaque main, monter sur une marche haute en poussant sur la jambe du dessus.", { req: ['halteres', 'kettlebell'], charge: { femme: 3, homme: 6, pas: 1 }, parMain: true, parCote: true }),
    E('unilateral', 3, 'fente_charge', "Fente arrière avec haltères", "Un haltère dans chaque main, reculer une jambe et descendre le genou près du sol.", { req: ['halteres', 'kettlebell'], evite: ['genoux', 'hanches'], charge: { femme: 4, homme: 8, pas: 2 }, parMain: true, parCote: true }),
    E('unilateral', 3, 'bulgare', "Squat bulgare", "Pied arrière posé sur une chaise, descendre sur la jambe avant, buste légèrement penché.", { evite: ['genoux', 'hanches'], parCote: true }),

    // --- Gainage
    E('gainage', 0, 'gainage_table', "Gainage incliné", "Avant-bras sur une table, corps droit, respirer normalement.", { reps: [20, 40], unite: 'secondes' }),
    E('gainage', 1, 'bird_dog', "Bird-dog", "À quatre pattes, tendre un bras et la jambe opposée, tenir 2 secondes, alterner. Le dos ne bouge pas.", { reps: [6, 10], parCote: true }),
    E('gainage', 1, 'gainage_genoux', "Gainage sur les genoux", "Avant-bras et genoux au sol, corps droit des genoux à la tête.", { evite: ['épaules'], reps: [20, 40], unite: 'secondes' }),
    E('gainage', 2, 'gainage_pieds', "Gainage sur les avant-bras", "Avant-bras et pointes de pieds au sol, corps droit, fessiers serrés.", { evite: ['épaules', 'dos'], reps: [20, 45], unite: 'secondes' }),
    E('gainage', 2, 'dead_bug', "Dead bug", "Sur le dos, bras tendus vers le plafond, genoux à 90°. Descendre un bras et la jambe opposée sans que le bas du dos décolle.", { reps: [6, 10], parCote: true }),
    E('gainage', 3, 'gainage_lateral', "Gainage latéral", "Sur un avant-bras et le côté des pieds, corps droit.", { evite: ['épaules'], reps: [20, 40], unite: 'secondes', parCote: true }),

    // --- Équilibre (§ 4, § 26)
    E('equilibre', 0, 'semi_tandem', "Équilibre pieds en semi-tandem", "Près d'un plan de travail, un pied à moitié devant l'autre, tenir 30 secondes, changer de pied.", { reps: [30, 30], unite: 'secondes', parCote: true }),
    E('equilibre', 1, 'unipodal_appui', "Équilibre sur un pied avec un doigt d'appui", "Un doigt posé sur le plan de travail, tenir sur un pied.", { reps: [20, 30], unite: 'secondes', parCote: true }),
    E('equilibre', 2, 'unipodal', "Équilibre sur un pied", "Sans appui, mais à côté d'un mur, tenir sur un pied.", { reps: [30, 45], unite: 'secondes', parCote: true }),
    E('equilibre', 3, 'unipodal_tete', "Équilibre sur un pied en tournant la tête", "Sur un pied, à côté d'un mur, tourner lentement la tête de gauche à droite.", { reps: [20, 30], unite: 'secondes', parCote: true }),

    // --- Porter
    E('porter', 1, 'fermier', "Marche du fermier", "Marcher en portant une charge lourde dans chaque main (sacs de courses, packs d'eau, haltères), épaules basses, buste droit.", { charge: { femme: 5, homme: 8, pas: 2 }, parMain: true, reps: [30, 45], unite: 'secondes' }),
  ];

  // ---------- Activités d'endurance (§ 4) ----------
  F.ENDURANCE = {
    'marche': "Marche rapide (on peut parler, mais pas chanter)",
    'vélo': "Vélo, en extérieur ou d'appartement",
    'natation': "Natation ou aquagym",
    'randonnée': "Randonnée",
    'danse': "Danse",
    'course': "Course à pied, en alternant marche et course au début",
    'jardinage': "Jardinage actif (bêcher, tondre, ratisser)",
  };

  // ---------- Boissons (§ 8, § 30) ----------
  F.BOISSONS = {
    vin: { nom: 'vin', kcal: 90, unite: 'verre de 12,5 cl' },
    biere: { nom: 'bière', kcal: 105, unite: 'bière de 25 cl' },
    spiritueux: { nom: 'spiritueux', kcal: 95, unite: 'dose de 4 cl' },
    apero: { nom: 'apéritifs sucrés et cocktails', kcal: 150, unite: 'verre' },
  };

  F.JOURS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
})(typeof window !== 'undefined' ? window : globalThis);
