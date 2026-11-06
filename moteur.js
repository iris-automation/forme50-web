// Moteur de règles Forme 50+ (version 2).
// Tout est déterministe, sans IA. Chaque règle renvoie à BASE-SCIENTIFIQUE.md (§).
// Nécessite donnees.js chargé avant.

(function (g) {
  'use strict';
  const F = g.Forme50 = g.Forme50 || {};

  // ======================================================================
  // Outils
  // ======================================================================
  const arrondi = (x, pas = 10) => Math.round(x / pas) * pas;
  const has = (d, cle, val) => (d[cle] || []).includes(val);
  const num = x => (x === '' || x == null || isNaN(Number(x))) ? null : Number(x);
  const kgFr = x => String(Math.round(x * 10) / 10).replace('.', ',');
  const listeFr = xs => xs.length <= 1 ? (xs[0] || '') : xs.slice(0, -1).join(', ') + ' et ' + xs[xs.length - 1];
  const moyenne = xs => { const v = (xs || []).map(Number).filter(x => x > 0); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };

  const PLANCHER = { femme: 1200, homme: 1500 };                       // § 24 (pratique)
  const DEFICIT_MAX = 500;                                              // § 15
  const PERTE_MAX_HEBDO = 0.75;                                         // § 15
  const KCAL_PAR_KG = 7700;                                             // § 25 (pratique)
  const FACTEUR_ACTIVITE = { 'sédentaire': 1.2, 'marche régulière': 1.375, 'sport occasionnel': 1.4, 'sport régulier': 1.55 }; // § 25
  const PAS_DEPART = { 'sédentaire': 3000, 'marche régulière': 6000, 'sport occasionnel': 5000, 'sport régulier': 7000 };       // § 21
  const ALERTES_MEDICALES = ['coeur', 'malaise', 'tension', 'operation', 'medecin', 'troubles alimentaires'];
  const NOMS_NIVEAU = ['adapté', 'débutant', 'intermédiaire', 'avancé'];

  const veutPerdre = d => has(d, 'objectifs', 'perdre du poids');
  const medical = d => ALERTES_MEDICALES.some(v => has(d, 'sante', v));
  const alcoolParType = d => ({ vin: num(d.alcoolVin) || 0, biere: num(d.alcoolBiere) || 0, spiritueux: num(d.alcoolSpiritueux) || 0, apero: num(d.alcoolApero) || 0 });
  const alcoolTotal = d => Object.values(alcoolParType(d)).reduce((s, x) => s + x, 0);

  // ======================================================================
  // 1. Chiffres (§ 3, 15, 21, 24, 25)
  // ======================================================================
  function chiffres(d) {
    const poids = Number(d.poids), taille = Number(d.taille), age = Number(d.age);
    const homme = d.sexe === 'homme';
    const imc = poids / Math.pow(taille / 100, 2);
    const metabolismeBase = 10 * poids + 6.25 * taille - 5 * age + (homme ? 5 : -161);
    const maintien = arrondi(metabolismeBase * (FACTEUR_ACTIVITE[d.activite] || 1.2));
    const plancher = PLANCHER[homme ? 'homme' : 'femme'];
    const tca = has(d, 'sante', 'troubles alimentaires');

    let mode, cible, explication;
    if (tca) {
      mode = 'maintien'; cible = maintien;
      explication = "Pas de restriction calorique : avec des antécédents de troubles du comportement alimentaire, un régime doit être encadré par un professionnel.";
    } else if (veutPerdre(d) && imc < 18.5) {
      mode = 'maintien'; cible = maintien;
      explication = "Pas de perte de poids : l'IMC est déjà bas. Le programme vise la force et la forme.";
    } else if (veutPerdre(d) && imc < 25) {
      mode = 'recomposition'; cible = maintien;
      explication = "Le poids est déjà dans la zone normale : on vise la recomposition (plus de muscle, moins de tour de taille) plutôt que de faire baisser la balance.";
    } else if (veutPerdre(d)) {
      mode = 'perte';
      const deficitVise = Math.min(DEFICIT_MAX, arrondi(maintien * 0.2));
      cible = Math.max(maintien - deficitVise, plancher);
      explication = maintien - deficitVise < plancher
        ? "Déficit limité par le plancher de sécurité : la marche quotidienne complète la dépense."
        : `Déficit modéré d'environ ${maintien - cible} kcal par jour : assez pour perdre de la graisse, pas trop pour garder le muscle et ne pas avoir faim en permanence.`;
    } else {
      mode = 'maintien'; cible = maintien;
      explication = "Pas de restriction : vos objectifs sont la force, l'énergie ou les douleurs.";
    }

    const deficit = maintien - cible;
    const perteHebdo = Math.min((deficit * 7) / KCAL_PAR_KG, PERTE_MAX_HEBDO);
    const reins = has(d, 'sante', 'maladie rénale');
    const poidsReference = Math.min(poids, 27 * Math.pow(taille / 100, 2));
    const proteines = reins ? null : arrondi(1.2 * poidsReference, 5);
    const proteinesParRepas = proteines ? Math.max(25, arrondi(proteines / 3, 5)) : null;
    const pasDepart = PAS_DEPART[d.activite] || 3000;
    const pasCible = Math.max(pasDepart, Math.min(pasDepart + 2000, 8000));

    let objectif6mois = null, etapes = null;
    if (mode === 'perte') {
      objectif6mois = { min: +(poids * 0.95).toFixed(1), max: +(poids * 0.90).toFixed(1) };
      const vise = num(d.poidsVise);
      if (vise && vise < poids * 0.9) etapes = `Le poids visé (${kgFr(vise)} kg) demande plus de 10 % de perte : on le traite en deux étapes. D'abord ${kgFr(objectif6mois.max)} kg environ en 6 mois, puis une nouvelle phase.`;
    }
    return { imc: +imc.toFixed(1), metabolismeBase: Math.round(metabolismeBase), maintien, cible, deficit, plancher, mode, explication,
      perteHebdo: +perteHebdo.toFixed(2), proteines, proteinesParRepas, pasDepart, pasCible, objectif6mois, etapes };
  }

  // ======================================================================
  // 2. Alertes de sécurité (§ 5, 8, 11, 12, 14, 16)
  // ======================================================================
  function alertes(d, nv) {
    const out = [];
    if (medical(d)) out.push({ niveau: 'medical', texte: "À faire valider par votre médecin avant de démarrer. Montrez-lui ce programme : les deux premières semaines sont volontairement légères. (§ 12)" });
    if (has(d, 'sante', 'troubles alimentaires')) out.push({ niveau: 'medical', texte: "Antécédents de troubles alimentaires : aucun régime n'est proposé, seulement des repères d'équilibre. Un accompagnement par un médecin ou un diététicien est recommandé." });
    if (has(d, 'sante', 'diabète avec insuline ou sulfamides')) out.push({ niveau: 'medical', texte: "Diabète sous insuline ou sulfamides : risque d'hypoglycémie pendant et après l'effort. Parlez à votre médecin de l'ajustement du traitement les jours de sport et gardez de quoi vous resucrer pendant les séances. Ne modifiez jamais votre traitement seul·e. (§ 14)" });
    if (has(d, 'sante', 'maladie rénale')) out.push({ niveau: 'medical', texte: "Maladie rénale : la quantité de protéines doit être fixée avec votre médecin ou votre néphrologue. Le programme ne donne donc pas de cible de protéines. (§ 16)" });
    if (has(d, 'sante', "traitement contre l'obésité")) out.push({ niveau: 'info', texte: "Traitement contre l'obésité : ces traitements font perdre du muscle avec la graisse. La musculation et les protéines sont encore plus importantes." });
    if (has(d, 'sante', 'médicament qui fait grossir')) out.push({ niveau: 'info', texte: "Votre traitement peut freiner la perte de poids. Ne l'arrêtez jamais de vous-même : si les résultats tardent malgré un programme bien suivi, parlez-en à votre médecin." });
    if (has(d, 'sante', 'osteoporose')) out.push({ niveau: 'info', texte: "Ostéoporose : la musculation renforce les os. Progressez lentement, gardez le dos droit, et faites-vous encadrer avant de passer à des charges lourdes. (§ 5)" });
    if (alcoolTotal(d) >= 28) out.push({ niveau: 'medical', texte: "Consommation d'alcool élevée : n'arrêtez pas brutalement, le sevrage peut être dangereux. Parlez-en à votre médecin, ou appelez Alcool Info Service au 0 980 980 930 (gratuit, anonyme). (§ 8)" });
    if (nv && nv.equilibreRisque) out.push({ niveau: 'medical', texte: "Vous tenez moins de 5 secondes sur un pied : c'est associé à un risque de chute plus élevé. L'équilibre est une priorité de chaque séance, toujours à côté d'un appui. Parlez-en à votre médecin. (§ 26)" });
    return out;
  }

  // ======================================================================
  // 3. Niveaux mesurés par les tests (§ 26)
  // ======================================================================
  const trancheSFT = age => age < 65 ? 60 : age < 70 ? 65 : 70;
  const trancheEquilibre = age => age < 50 ? 40 : age < 60 ? 50 : age < 70 ? 60 : 70;
  function niveauNorme(val, [p25, , p75]) { return val < p25 ? 1 : val <= p75 ? 2 : 3; }
  function positionNorme(val, [p25, p50, p75]) {
    if (val < p25) return "sous la moyenne";
    if (val < p50) return "dans la moyenne basse";
    if (val <= p75) return "dans la moyenne haute";
    return "au-dessus de la moyenne";
  }

  function niveaux(d) {
    const age = Number(d.age), sexe = d.sexe === 'homme' ? 'homme' : 'femme';
    const tSFT = trancheSFT(age);
    const libelleAge = `${sexe === 'homme' ? 'des hommes' : 'des femmes'} de ${tSFT}-${tSFT + 4} ans`;
    const res = { details: [] };

    // Jambes : assis-debout 30 s
    const chaise = num(d.testChaise);
    if (d.testChaiseImpossible || chaise === 0) {
      res.jambes = 0;
      res.details.push({ test: 'Assis-debout en 30 s', resultat: 'impossible sans les mains', lecture: "On commence par des levers aidés des mains." });
    } else if (chaise != null) {
      const n = F.NORMES.chaise[sexe][tSFT];
      res.jambes = niveauNorme(chaise, n);
      res.details.push({ test: 'Assis-debout en 30 s', resultat: `${chaise} levers`, lecture: `${positionNorme(chaise, n)} ${libelleAge} (moyenne : ${n[1]})${age < 60 ? ', comparé aux 60-64 ans faute de normes plus jeunes' : ''}.` });
    } else {
      res.jambes = d.activite === 'sport régulier' ? 2 : 1;
    }

    // Haut du corps : pompes
    const v = d.testPompesVariante, p = num(d.testPompes) || 0;
    const tablePompes = { aucune: () => 0, mur: () => (p >= 15 ? 1 : 0), table: () => (p >= 15 ? 2 : 1), genoux: () => (p >= 15 ? 3 : 2), sol: () => 3 };
    res.haut = tablePompes[v] ? tablePompes[v]() : 1;
    if (v) res.details.push({ test: 'Pompes', resultat: v === 'aucune' ? 'aucune variante réussie' : `${p} pompes ${v === 'sol' ? 'au sol' : v === 'genoux' ? 'sur les genoux' : v === 'table' ? 'sur une table' : 'contre un mur'}`, lecture: `Niveau ${NOMS_NIVEAU[res.haut]} pour le haut du corps.` });

    // Gainage
    const gv = d.testGainageVariante, gs = num(d.testGainage) || 0;
    res.gainage = gv === 'pieds' ? (gs >= 30 ? 3 : 2) : gv === 'genoux' ? (gs >= 20 ? 2 : 1) : gv === 'impossible' ? 0 : 1;
    if (gv) res.details.push({ test: 'Gainage', resultat: gv === 'impossible' ? 'pas tenu' : `${gs} s ${gv === 'pieds' ? 'sur les pieds' : 'sur les genoux'}`, lecture: `Niveau ${NOMS_NIVEAU[res.gainage]} pour le gainage.` });

    // Équilibre
    const eq = num(d.testEquilibre), normeEq = F.NORMES.equilibre[trancheEquilibre(age)];
    if (d.testEquilibreImpossible || (eq != null && eq < 5)) {
      res.equilibre = 0; res.equilibreRisque = true;
      res.details.push({ test: 'Équilibre sur un pied', resultat: d.testEquilibreImpossible ? 'pas tenu' : `${eq} s`, lecture: "Moins de 5 secondes : l'équilibre devient une priorité." });
    } else if (eq != null) {
      res.equilibre = eq < 15 ? 1 : eq < normeEq ? 2 : 3;
      res.details.push({ test: 'Équilibre sur un pied', resultat: `${eq} s`, lecture: `${eq >= normeEq ? 'Au niveau ou au-dessus' : 'En dessous'} de la moyenne de votre âge (${String(normeEq).replace('.', ',')} s).` });
    } else {
      res.equilibre = age >= 60 ? 1 : 2;
    }

    // Endurance : marche sur place 2 min, sinon activité déclarée
    const m = num(d.testMarche);
    if (m) {
      const n = F.NORMES.marche2min[sexe][tSFT];
      res.endurance = niveauNorme(m, n);
      res.details.push({ test: 'Marche sur place 2 min', resultat: `${m} levers de genou`, lecture: `${positionNorme(m, n)} ${libelleAge} (moyenne : ${n[1]}).` });
    } else {
      res.endurance = { 'sédentaire': 1, 'marche régulière': 2, 'sport occasionnel': 2, 'sport régulier': 3 }[d.activite] || 1;
    }
    return res;
  }

  // ======================================================================
  // 4. Choix des exercices selon niveau, matériel et douleurs
  // ======================================================================
  function environnement(d) {
    const env = new Set((d.materiel || []).filter(x => x !== 'rien'));
    if (d.salle === 'oui') env.add('salle');
    return env;
  }

  function choisirExercice(motif, niveau, d, exclure = []) {
    const env = environnement(d), douleurs = d.douleurs || [];
    const nomsExclus = F.EXERCICES.filter(e => exclure.includes(e.id)).map(e => e.nom);
    const dispo = r => Array.isArray(r) ? r.every(x => env.has(x)) : env.has(r);
    const ok = e => e.motif === motif && !exclure.includes(e.id) && !nomsExclus.includes(e.nom)
      && (e.req.length === 0 || e.req.some(dispo))
      && !e.evite.some(z => douleurs.includes(z));
    // Priorité : machine de salle si on y va, puis matériel disponible, puis poids du corps
    const score = e => (e.req.includes('salle') && env.has('salle') ? 2 : 0) + (e.req.some(dispo) ? 1 : 0);
    const meilleur = c => c.sort((a, b) => score(b) - score(a))[0];
    if (exclure.length) {
      // Une alternative au même niveau ; sinon un cran en dessous (jamais plus) ; sinon le même exercice
      const ref = choisirExercice(motif, niveau, d);
      if (!ref) return null;
      for (const n of [ref.niveau, ref.niveau - 1]) {
        const alt = F.EXERCICES.filter(e => e.niveau === n && ok(e));
        if (alt.length) return meilleur(alt);
      }
      return ref;
    }
    for (let n = niveau; n >= 0; n--) {
      const c = F.EXERCICES.filter(e => e.niveau === n && ok(e));
      if (c.length) return meilleur(c);
    }
    return null;
  }

  // Repos entre les séries (§ 28, ACSM 2009 : 1 à 2 min pour les débutants et intermédiaires)
  function repos(e) {
    if (['gainage', 'equilibre', 'porter'].includes(e.motif) || !e.charge) return 60;
    return ['squat', 'charniere', 'unilateral'].includes(e.motif) ? 120 : 90;
  }

  function versionExercice(e, d) {
    const tension = has(d, 'sante', 'tension');
    const reps = (tension && e.charge && e.unite !== 'secondes') ? [12, 15] : e.reps; // § 13
    const depart = e.charge ? e.charge[d.sexe === 'homme' ? 'homme' : 'femme'] : null;
    return { id: e.id, motif: e.motif, niveau: e.niveau, nom: e.nom, consigne: e.consigne, reps, unite: e.unite, parCote: e.parCote, parMain: e.parMain,
      materiel: e.req.flat(), repos: repos(e), charge: e.charge ? { depart, pas: e.charge.pas } : null };
  }

  // ======================================================================
  // 5. Prescription (§ 4, 13, 27)
  // ======================================================================
  function choisirJours(dispo, k) {
    const idx = dispo.map(j => F.JOURS.indexOf(j)).filter(i => i >= 0).sort((a, b) => a - b);
    if (idx.length <= k) return idx.map(i => F.JOURS[i]);
    let meilleur = null, score = -1;
    const combi = (debut, choix) => {
      if (choix.length === k) {
        let ecartMin = 7;
        for (let i = 0; i < k; i++) ecartMin = Math.min(ecartMin, ((choix[(i + 1) % k] - choix[i] + 7) % 7) || 7);
        if (ecartMin > score) { score = ecartMin; meilleur = [...choix]; }
        return;
      }
      for (let i = debut; i < idx.length; i++) combi(i + 1, [...choix, idx[i]]);
    };
    combi(0, []);
    return meilleur.map(i => F.JOURS[i]);
  }

  function prescription(d, nv) {
    const dispo = d.jours || [];
    const debutant = nv.jambes <= 1 || nv.haut <= 1;
    const fragile = d.stress === 'très élevé' || d.energie === 'souvent épuisé·e' || medical(d);
    let debut = (debutant || fragile) ? 2 : 3, ensuite = 3;
    debut = Math.max(1, Math.min(debut, dispo.length || 2));
    ensuite = Math.max(1, Math.min(ensuite, dispo.length || 2));
    const joursDebut = choisirJours(dispo.length ? dispo : ['lundi', 'jeudi'], debut);
    const joursEnsuite = choisirJours(dispo.length ? dispo : ['lundi', 'mercredi', 'vendredi'], ensuite);

    const raisons = [];
    if (debutant) raisons.push("vos tests montrent qu'il faut d'abord construire une base");
    if (fragile) raisons.push(medical(d) ? "un avis médical est demandé" : "votre fatigue ou votre stress du moment demandent de démarrer en douceur");
    const texte = debut < ensuite
      ? `${debut} séances par semaine les 4 premières semaines (${listeFr(raisons)}), puis ${ensuite}.`
      : `${ensuite} séance${ensuite > 1 ? 's' : ''} par semaine dès le départ : c'est la fréquence la plus efficace pour gagner en force après 50 ans (§ 27).`;
    const notes = [];
    if (dispo.length && dispo.length < 3 && ensuite < 3) notes.push(`Avec ${dispo.length} jour${dispo.length > 1 ? '' : ''} disponible${dispo.length > 1 ? 's' : ''}, on reste à ${ensuite} séance${ensuite > 1 ? 's' : ''} : c'est moins que l'idéal (3), mais déjà efficace. Si un jour se libère, ajoutez une séance.`);
    return { debut, ensuite, joursDebut, joursEnsuite, texte, notes, fragile, debutant };
  }

  // Niveau de départ de chaque mouvement, d'après les tests
  function niveauMouvement(motif, nv) {
    return { squat: nv.jambes, unilateral: nv.jambes, charniere: Math.min(nv.jambes, 3), pousser: nv.haut, tirer: nv.haut,
      gainage: nv.gainage, equilibre: nv.equilibre, porter: 1 }[motif];
  }

  // Niveaux effectifs : tests (du bilan ou du dernier retest), puis changements faits dans le carnet (§ 28).
  // surcharges : { motif: { niveau, date, douleur? } }. Une montée enregistrée avant un retest qui mesure
  // mieux est dépassée par le retest ; un recul pour douleur reste jusqu'à ce que la personne remonte.
  function bilanAvecRetest(d, retests) {
    const r = (retests || [])[retests.length - 1];
    if (!r) return d;
    const m = { ...d };
    if (r.chaise != null) { m.testChaise = String(r.chaise); m.testChaiseImpossible = r.chaise === 0; }
    if (r.equilibre != null) { m.testEquilibre = String(r.equilibre); m.testEquilibreImpossible = false; }
    if (r.pompes != null && r.pompesVariante) { m.testPompesVariante = r.pompesVariante; m.testPompes = String(r.pompes); }
    if (r.gainage != null && r.gainageVariante) { m.testGainageVariante = r.gainageVariante; m.testGainage = String(r.gainage); }
    return m;
  }

  function niveauxParMouvement(nv, surcharges = {}, dateRetest = null) {
    const out = {};
    for (const motif of ['squat', 'unilateral', 'charniere', 'pousser', 'tirer', 'gainage', 'equilibre', 'porter']) {
      const base = niveauMouvement(motif, nv), s = surcharges[motif];
      const valable = s && (s.douleur || !dateRetest || s.date >= dateRetest || s.niveau > base);
      out[motif] = valable ? Math.max(0, Math.min(3, s.niveau)) : base;
    }
    return out;
  }

  function seances(d, nv, surcharges = {}, dateRetest = null) {
    const age = Number(d.age);
    const lv = niveauxParMouvement(nv, surcharges, dateRetest);
    const avecEquilibre = nv.equilibre < 3 || age >= 60 || lv.equilibre < 3;
    const planA = [['squat', lv.squat], ['pousser', lv.pousser], ['charniere', lv.charniere], ['tirer', lv.tirer], ['gainage', lv.gainage]];
    const planB = [['unilateral', lv.unilateral], ['tirer', lv.tirer], ['charniere', lv.charniere], ['pousser', lv.pousser], ['gainage', lv.gainage]];
    const A = [], B = [];
    for (const [motif, niveau] of planA) { const e = choisirExercice(motif, niveau, d); if (e && !A.some(x => x.id === e.id)) A.push(e); }
    for (const [motif, niveau] of planB) {
      const dejaA = A.filter(x => x.motif === motif).map(x => x.id);
      const e = choisirExercice(motif, niveau, d, dejaA);
      if (e && !B.some(x => x.id === e.id)) B.push(e);
    }
    if (avecEquilibre) { const eq = choisirExercice('equilibre', lv.equilibre, d); A.push(eq); B.push(eq); }
    if (nv.jambes >= 1) { const p = choisirExercice('porter', lv.porter, d); if (p) B.push(p); }
    const fmt = xs => xs.map(e => versionExercice(e, d));
    const duree = xs => 5 + xs.reduce((s, e) => s + (e.motif === 'equilibre' ? 3 : e.motif === 'porter' || e.unite === 'secondes' ? 4 : 6), 0);
    return { A: { nom: 'Séance A', exercices: fmt(A), duree: duree(A) }, B: { nom: 'Séance B', exercices: fmt(B), duree: duree(B) }, avecEquilibre, niveaux: lv };
  }

  function endurance(d, nv) {
    const douleursBas = (d.douleurs || []).some(x => ['genoux', 'hanches'].includes(x));
    let choix = (d.sports || []).filter(s => F.ENDURANCE[s] && !(s === 'course' && (douleursBas || nv.endurance < 3)));
    if (!choix.length) choix = ['marche'];
    const palier = nv.endurance <= 1 ? [15, 20, 25] : nv.endurance === 2 ? [20, 30, 35] : [30, 40, 45];
    return {
      activites: choix.map(s => F.ENDURANCE[s]),
      progression: [
        { semaines: '1 à 2', texte: `2 sorties de ${palier[0]} minutes` },
        { semaines: '3 à 4', texte: `2 sorties de ${palier[1]} minutes` },
        { semaines: '5 à 8', texte: `3 sorties de ${palier[2]} minutes` },
      ],
      intensite: "Intensité juste : vous pouvez parler, mais pas chanter. Les jours sans musculation de préférence.",
      pourquoi: "Avec la marche quotidienne, ça vous amène vers les 150 minutes d'activité par semaine recommandées par l'OMS. (§ 4)",
    };
  }

  // ======================================================================
  // 6. Charges et progression (§ 27, 28)
  // ======================================================================
  // historique : [{ calibration?: bool, series: [{ reps, kg }] }] du plus ancien au plus récent, pour cet exercice
  // Variante plus difficile ou plus facile, en respectant le matériel et les douleurs de la personne
  function variante(ex, sens, d) {
    if (!d) return null;
    const n = ex.niveau + sens;
    if (n < 0 || n > 3) return null;
    const e = choisirExercice(ex.motif, n, d);
    if (!e) return null;
    if (sens > 0 && e.niveau <= ex.niveau) return null;
    if (sens < 0 && e.niveau >= ex.niveau) return null;
    return { id: e.id, nom: e.nom, niveau: e.niveau };
  }

  // opts.apresDouleur : recul pour douleur il y a moins de 2 semaines → pas de remontée automatique
  function prochaineCible(ex, historique = [], d = null, opts = {}) {
    const [bas, haut] = ex.reps;
    const unite = ex.unite === 'secondes' ? 'seconde' : 'répétition';
    const sousBas = h => h && h.series.length && h.series.some(s => Number(s.reps) < bas);
    const dernier = historique[historique.length - 1], avant = historique[historique.length - 2];
    if (!ex.charge) {
      if (!dernier) return { kg: null, reps: ex.reps, message: 'Première fois : prenez le temps de bien faire le mouvement, sans forcer.' };
      const toutesHaut = dernier.series.length && dernier.series.every(s => s.reps >= haut);
      if (toutesHaut && opts.apresDouleur) return { kg: null, reps: ex.reps, message: "Toutes les séries au maximum. Après une douleur, on reste sur cette version au moins 2 semaines : ralentissez la descente (3 secondes)." };
      if (toutesHaut) {
        const suivant = variante(ex, +1, d);
        return { kg: null, reps: ex.reps, monter: true, suivant,
          message: suivant ? `Toutes les séries au maximum : la prochaine fois, « ${suivant.nom} » remplace cet exercice.` : `Toutes les séries au maximum : ralentissez la descente (3 secondes) pour corser l'exercice.` };
      }
      if (sousBas(dernier) && sousBas(avant)) {
        const precedent = variante(ex, -1, d);
        if (precedent) return { kg: null, reps: ex.reps, baisser: true, precedent, message: `Deux séances sous ${bas} : la prochaine fois, « ${precedent.nom} », plus accessible, pour consolider.` };
      }
      return { kg: null, reps: ex.reps, message: `Même exercice : visez une ${unite} de plus qu'à la dernière séance.` };
    }
    const pas = ex.charge.pas;
    const parMain = ex.parMain ? ' dans chaque main' : '';
    // Exercices chargés en durée (marche du fermier) : pas de calibration, on allonge puis on alourdit
    if (ex.unite === 'secondes') {
      if (!dernier) return { kg: ex.charge.depart, reps: ex.reps, message: `Première fois : ${kgFr(ex.charge.depart)} kg${parMain}, ${bas} secondes. Si c'est facile, allez jusqu'à ${haut}.` };
      const kg = Math.max(...dernier.series.map(s => Number(s.kg) || 0)) || ex.charge.depart;
      if (dernier.series.every(s => Number(s.reps) >= haut)) return { kg: kg + pas, reps: ex.reps, monter: true, message: `${haut} secondes tenues : on passe à ${kgFr(kg + pas)} kg${parMain}, en repartant à ${bas} secondes.` };
      return { kg, reps: ex.reps, message: `On garde ${kgFr(kg)} kg${parMain} : visez 5 secondes de plus.` };
    }
    if (!dernier) {
      return { kg: ex.charge.depart, reps: [bas, 15], calibration: true,
        message: `Séance de calibration : avec ${kgFr(ex.charge.depart)} kg${parMain}, faites le maximum de répétitions propres, sans dépasser 15. Le programme en déduit votre charge de travail. (§ 28)` };
    }
    const kg = Math.max(...dernier.series.map(s => Number(s.kg) || 0));
    if (dernier.calibration) {
      const r = Math.max(...dernier.series.map(s => Number(s.reps) || 0));
      if (r >= 15) return { kg: kg + pas, reps: [bas, 15], calibration: true, message: `15 répétitions ou plus : c'était trop léger. Refaites la calibration avec ${kgFr(kg + pas)} kg.` };
      if (r < bas) return { kg: Math.max(pas, kg - pas), reps: ex.reps, message: `Moins de ${bas} répétitions : on part de ${kgFr(Math.max(pas, kg - pas))} kg.` };
      const travail = r >= 13 ? kg + pas : kg;
      return { kg: travail, reps: ex.reps, message: `Charge de travail : ${kgFr(travail)} kg, ${bas} à ${haut} répétitions par série.` };
    }
    const toutesHaut = dernier.series.length && dernier.series.every(s => Number(s.reps) >= haut);
    const chezSoi = d && d.salle !== 'oui' && (ex.materiel || []).some(m => ['halteres', 'kettlebell'].includes(m));
    if (toutesHaut) return { kg: kg + pas, reps: ex.reps, monter: true, message: `Toutes les séries à ${haut} : on monte à ${kgFr(kg + pas)} kg${parMain}. Il est normal de retomber vers ${bas} répétitions.`
      + (chezSoi ? ` Pas d'haltère de ce poids ? Gardez le vôtre, descendez en 3 secondes et faites une série de plus.` : '') };
    if (sousBas(dernier) && sousBas(avant) && !avant.calibration) return { kg: Math.max(pas, kg - pas), reps: ex.reps, baisser: true, message: `Deux séances sous ${bas} répétitions : on redescend à ${kgFr(Math.max(pas, kg - pas))} kg pour bien repartir.` };
    return { kg, reps: ex.reps, message: `On garde ${kgFr(kg)} kg : visez une répétition de plus qu'à la dernière séance.` };
  }

  // Nombre de séries selon la semaine du programme (§ 27)
  const seriesPourSemaine = semaine => semaine <= 2 ? 2 : 3;

  // ======================================================================
  // 7. Stratégies ciblées : motivation (§ 29)
  // ======================================================================
  const MOMENTS = { matin: 'le matin', midi: 'à midi', 'fin d\'après-midi': 'en fin d\'après-midi', soir: 'le soir', variable: 'au moment prévu la veille' };

  function motivation(d, presc) {
    const lieu = d.salle === 'oui' ? 'à la salle' : 'à la maison';
    const quand = MOMENTS[d.moment] || 'au moment prévu';
    const plans = [`Les ${listeFr(presc.joursDebut)}, ${quand}, je fais ma séance ${lieu}. Je l'inscris dans mon agenda comme un rendez-vous.`];
    const f = d.freins || [], a = d.arret || [];
    if (f.includes('fatigue') || f.includes('manque de temps') || a.includes('emploi du temps')) plans.push("Si je suis fatigué·e ou pressé·e, alors je fais la séance minimum : échauffement + les 2 premiers exercices (10 minutes). Une séance courte compte, une séance sautée non.");
    if (f.includes('motivation qui retombe') || a.includes('motivation')) plans.push("Si je n'ai pas envie, alors je mets ma tenue et je fais l'échauffement. Si au bout de 5 minutes je veux toujours arrêter, j'ai le droit. (En pratique, on continue presque toujours.)");
    if (f.includes('douleurs, peur de se blesser') || a.includes('blessure ou douleur')) plans.push("Si un exercice fait mal (plus de 3 sur 10, ou une douleur qui monte), alors je le remplace par sa version plus facile et je continue la séance.");
    if (f.includes('regard des autres')) plans.push("Si je n'ose pas aller à la salle, alors je fais la séance à la maison : le programme est prévu pour.");
    if (d.moment === 'soir') plans.push("Si la journée a été longue, alors je fais ma séance avant de m'asseoir dans le canapé, pas après.");

    const leviers = [];
    if (a.includes('pas de résultats') || f.includes('motivation qui retombe')) leviers.push({ titre: 'Voir les progrès tôt', texte: "La force progresse avant la balance : vous verrez vos charges monter dès les 2 à 4 premières semaines, le tour de taille ensuite, le poids plus tard. On refait les tests physiques toutes les 4 semaines : c'est la preuve la plus parlante. (§ 26)" });
    if (a.includes('ennui')) leviers.push({ titre: 'Ne pas s\'ennuyer', texte: "Deux séances différentes (A et B), des charges qui changent chaque semaine, et de l'endurance choisie parmi ce que vous aimez. Et dès qu'un exercice est maîtrisé, le carnet le remplace par une version plus difficile." });
    if (a.includes('seul·e') || d.soutien === 'seul·e') leviers.push({ titre: 'Ne pas être seul·e', texte: d.compagnie === 'accompagné·e' ? "Trouvez un binôme pour au moins une séance par semaine, ou un club de marche près de chez vous." : "Un point rapide chaque semaine avec quelqu'un (même par message) double les chances de tenir : racontez vos chiffres de la semaine." });
    if (['conjoint·e', 'enfant', 'ami·e'].includes(d.soutien)) leviers.push({ titre: 'Votre soutien', texte: `Chaque dimanche, faites le point de la semaine avec votre ${d.soutien === 'conjoint·e' ? 'conjoint·e' : d.soutien === 'enfant' ? 'enfant' : 'ami·e'} : séances faites, charges, tour de taille. Le simple fait de rendre des comptes aide à tenir.` });
    if (a.includes('jamais commencé')) leviers.push({ titre: 'Commencer petit', texte: "Les premières séances sont volontairement faciles. Le but des deux premières semaines n'est pas de se fatiguer, mais de prendre le rythme." });
    leviers.push({ titre: 'Le cap des deux mois', texte: "Il faut en moyenne deux mois pour qu'une habitude devienne automatique (parfois moins, parfois plus). Les premières semaines demandent un effort de volonté ; ensuite, ça devient normal. (§ 29)" });
    return { plans, leviers, pourquoi: d.pourquoi || '' };
  }

  // ======================================================================
  // 8. Stratégies ciblées : alcool (§ 8, 30)
  // ======================================================================
  const STRATEGIE_BOISSON = {
    vin: "Vin : un seul verre, servi dans un verre plus petit (10 cl au lieu de 15), et réservé aux repas du week-end. Pas de bouteille ouverte en semaine : sans bouteille entamée, pas de « petit fond ». À table en semaine, eau pétillante avec une rondelle de citron. Le vin sans alcool existe, mais son goût est loin de l'original : à tester, sans en attendre de miracle.",
    biere: "Bière : la bière sans alcool est le meilleur substitut (même goût, même geste, 2 à 3 fois moins de calories). Gardez-en toujours au frais. Si vous gardez de la bière classique, passez au format 25 cl au lieu de 50 cl.",
    spiritueux: "Spiritueux : servez-les toujours allongés dans un grand verre (tonic, eau gazeuse), avec une dose mesurée (4 cl) au lieu d'une dose « à l'œil ». Un deuxième verre ? Le même, sans alcool.",
    apero: "Apéritifs sucrés et cocktails : ce sont les plus caloriques (sucre + alcool). Version sans alcool : tonic avec un trait d'amer et beaucoup de glace, ou spritz sans alcool. Même verre, même rituel.",
  };
  const STRATEGIE_MOMENT = {
    'apéritif': "L'apéro : gardez le moment (c'est souvent lui qui compte), changez le contenu du verre en semaine. À grignoter : légumes crus et houmous plutôt que chips et saucisson.",
    'pendant les repas': "Pendant les repas : un verre posé à côté de l'eau, et on ne remplit pas une deuxième fois. En semaine, eau pétillante à table.",
    'le week-end, en soirée': "Le week-end en soirée : décidez du nombre de verres avant de sortir, et alternez chaque verre avec un verre d'eau ou une boisson sans alcool.",
    'pour décompresser, seul·e': "Pour décompresser : ici, ce n'est pas la boisson qu'il faut remplacer, c'est le rituel. Une marche de 10 minutes, une douche, un appel, une tisane dans le même fauteuil. Si c'est difficile, Alcool Info Service peut aider (0 980 980 930, gratuit et anonyme).",
  };

  function alcool(d) {
    const parType = alcoolParType(d), total = alcoolTotal(d);
    if (!total) return null;
    const kcalSemaine = Object.entries(parType).reduce((s, [k, n]) => s + n * F.BOISSONS[k].kcal, 0);
    const types = Object.keys(parType).filter(k => parType[k] > 0).sort((a, b) => parType[b] - parType[a]);
    let objectif;
    if (total >= 28) objectif = "Ne pas arrêter brutalement. En parler d'abord à un médecin (voir l'alerte en haut du programme).";
    else if (total > 10) objectif = `Descendre progressivement de ${total} à 10 verres maximum par semaine (1 à 2 verres de moins chaque semaine), avec au moins 2 jours sans alcool.`;
    else objectif = "Vous êtes dans les repères officiels. Gardez au moins 2 jours sans alcool par semaine.";

    // § 30 : commencer par le moment le plus facile, garder le plus difficile pour la fin
    const moments = (d.alcoolMoment || []).filter(m => STRATEGIE_MOMENT[m]);
    const ordre = [...moments.filter(m => m !== d.alcoolDifficile), ...moments.filter(m => m === d.alcoolDifficile)];
    const etapes = ordre.map((m, i) => ({ semaines: total > 10 ? `${i * 2 + 1} et ${i * 2 + 2}` : null, moment: m, texte: STRATEGIE_MOMENT[m], difficile: m === d.alcoolDifficile }));

    return {
      total, kcalSemaine, objectif,
      constat: `${total} verres par semaine, soit environ ${kcalSemaine.toLocaleString('fr-FR')} kcal${kcalSemaine >= 600 ? ` : l'équivalent d'environ ${Math.round(kcalSemaine / 500)} repas de plus par semaine` : ''}.`,
      parBoisson: types.map(k => STRATEGIE_BOISSON[k]),
      etapes,
      pourquoi: "Repères officiels : maximum 10 verres par semaine, 2 par jour, et des jours sans. Après environ 2 verres, le corps utilise beaucoup moins ses graisses comme carburant pendant plusieurs heures. (§ 8, § 30)",
    };
  }

  // ======================================================================
  // 9. Stratégies ciblées : alimentation (§ 3, 7, 20, 22)
  // ======================================================================
  const REMPLACEMENTS = [
    ['sodas, jus', "Sodas et jus → eau pétillante aromatisée (citron, menthe) ou thé glacé maison sans sucre. Les boissons sucrées ne rassasient pas du tout."],
    ['fast-food', "Fast-food → limiter à une fois par semaine, et choisir un burger simple sans frites avec une boisson zéro."],
    ['gâteaux, biscuits, sucreries', "Biscuits et gâteaux → ne plus en acheter « pour la maison ». Collation de remplacement prête à l'avance : fromage blanc, yaourt grec, ou un fruit avec une poignée d'amandes."],
    ['plats préparés, produits industriels', "Plats préparés → deux grands plats maison cuisinés le dimanche (voir ci-dessous), à réchauffer en semaine."],
    ['pizza', "Pizza → une fois par semaine maximum, avec une grande salade avant, ou une pizza maison sur pâte fine chargée en légumes."],
    ['charcuterie', "Charcuterie → jambon blanc, blanc de volaille ou thon pour le quotidien ; saucisson et rillettes réservés au week-end."],
    ['fromage', "Fromage → une portion de 30 g par jour (la taille d'une boîte d'allumettes), plutôt au déjeuner, pas en fin de repas « pour finir le pain »."],
    ['pain en grande quantité', "Pain → pain complet ou aux céréales, environ un quart de baguette par repas, et on ne le pose pas sur la table avant le plat."],
  ];

  function sourcesProteines(d) {
    const vegetarien = /v[ée]g[ée]tari|v[ée]gan/i.test(d.contraintes || '');
    return vegetarien
      ? ["3 œufs ≈ 20 g", "200 g de fromage blanc ou yaourt grec ≈ 16-20 g", "200 g de lentilles ou pois chiches cuits ≈ 18 g", "100 g de tofu ferme ≈ 15 g", "30 g de fromage ≈ 7 g"]
      : ["100 g de poulet, dinde ou poisson ≈ 25 g", "3 œufs ≈ 20 g", "200 g de fromage blanc ou yaourt grec ≈ 16-20 g", "1 boîte de thon ≈ 25 g", "200 g de lentilles ou pois chiches cuits ≈ 18 g"];
  }

  function alimentation(d, c) {
    const tca = has(d, 'sante', 'troubles alimentaires');
    const vegetarien = /v[ée]g[ée]tari|v[ée]gan/i.test(d.contraintes || '');
    const priorites = [];

    if (c.proteines && ['une fois par jour', 'rarement'].includes(d.proteines)) priorites.push({ titre: 'Priorité n° 1 : des protéines à chaque repas', texte: `Aujourd'hui, elles sont trop rares. Visez ${c.proteinesParRepas} g par repas (${c.proteines} g par jour) : c'est ce qui protège le muscle pendant la perte de poids et qui calme le plus la faim. (§ 3, § 22)` });

    // Petit-déjeuner (§ 20)
    if (c.proteines && d.petitDej !== 'complet') {
      const grignoteMatin = has(d, 'grignotageMoments', 'matin');
      priorites.push({ titre: 'Le petit-déjeuner', texte: grignoteMatin
        ? `Vous grignotez le matin : un vrai petit-déjeuner protéiné règle le problème à la source. Par exemple : ${vegetarien ? '2 œufs brouillés et une tranche de pain complet' : '2 œufs ou 2 tranches de jambon et une tranche de pain complet'}, ou un bol de fromage blanc avec un fruit et une poignée de flocons d'avoine.`
        : `Ne pas manger le matin est possible, à condition de rattraper les protéines sur les deux autres repas (au moins ${Math.round(c.proteines / 2 / 5) * 5} g chacun). Si la faim arrive avant midi, ajoutez un yaourt grec. (§ 20)` });
    }

    // Déjeuner selon le lieu
    const DEJEUNER = {
      cantine: "À la cantine : choisissez d'abord la viande ou le poisson et les légumes, le féculent en accompagnement (pas en plat principal), et un seul dessert, de préférence un laitage ou un fruit.",
      restaurant: "Au restaurant : un plat avec viande ou poisson, des légumes à la place des frites, pas de pain en attendant, de l'eau. Entrée ou dessert, pas les deux.",
      'sandwich ou boulangerie': `Sandwich : pain complet garni de ${vegetarien ? 'œuf ou fromage' : 'poulet, thon ou œuf'} et de crudités, plutôt que jambon-beurre ou panini. Évitez la formule viennoiserie-boisson sucrée. Alternative : une salade composée avec une vraie source de protéines.`,
      maison: "À la maison : préparez les déjeuners en même temps que le dîner de la veille (une portion de plus).",
    };
    if (DEJEUNER[d.dejeuner]) priorites.push({ titre: 'Le déjeuner', texte: DEJEUNER[d.dejeuner] });

    // Légumes
    if (d.legumes && d.legumes !== 'à chaque repas') priorites.push({ titre: 'Les légumes', texte: d.legumes === 'rarement'
      ? "Commencez par le plus simple : une soupe le soir (même en brique), des légumes surgelés déjà coupés, des crudités en entrée. Ils remplissent l'assiette pour peu de calories."
      : "Ajoutez une portion de légumes au repas qui n'en a pas : crudités en entrée, ou légumes surgelés poêlés en 5 minutes." });

    // Grignotage selon le moment et la nature
    const gm = (d.grignotageMoments || []).filter(x => x !== 'rarement'), gq = d.grignotageQuoi || [];
    const GRIGNO = {
      'après-midi': "Le creux de l'après-midi : prévoyez une vraie collation à heure fixe (vers 16 h) avec des protéines : fromage blanc, yaourt grec, œuf dur, ou un fruit avec une poignée d'amandes.",
      'soir devant la télé': "Le grignotage devant la télé : c'est une habitude liée au canapé, pas à la faim. Ne gardez rien à portée de main dans le salon, prévoyez si besoin une collation précise (un yaourt, une tisane), et brossez-vous les dents après le dîner : ça marque la fin des repas.",
      'la nuit': "Manger la nuit est souvent lié au sommeil ou au stress. Si c'est fréquent, parlez-en à votre médecin.",
    };
    for (const m of gm) if (GRIGNO[m]) priorites.push({ titre: 'Le grignotage', texte: GRIGNO[m] });
    if (gq.includes('salé') || gq.includes('fromage ou charcuterie')) priorites.push({ titre: 'Le grignotage salé', texte: "Le salé (chips, biscuits apéro, fromage, charcuterie) est très calorique en petite quantité. Remplacement : légumes crus avec du houmous ou du fromage blanc aux herbes, ou quelques olives." });

    // Temps de cuisine
    if (d.cuisine === 'peu') priorites.push({ titre: 'Cuisiner vite', texte: "Le kit des 10 minutes : poulet rôti ou thon en boîte, légumes surgelés, œufs, lentilles et pois chiches en conserve, riz ou quinoa en sachet express. Trois assemblages : œufs + légumes poêlés ; poulet + légumes + riz express ; salade lentilles-thon-tomates." });
    else priorites.push({ titre: 'Cuisiner le dimanche', texte: "Deux grands plats le dimanche (par exemple un chili aux haricots rouges et un poulet aux légumes au four), en portions pour 3 ou 4 repas. C'est ce qui évite les plats préparés en semaine." });

    const coches = d.aliments || [];
    const remplacements = REMPLACEMENTS.filter(([cle]) => coches.includes(cle)).map(([, texte], i) => ({ semaines: `${i * 2 + 1} et ${i * 2 + 2}`, texte }));

    const repere = [
      "Assiette type : la moitié en légumes, un quart en protéines, un quart en féculents (de préférence complets).",
      "Trois vrais repas par jour, à heures à peu près régulières.",
    ];
    if (!tca && c.mode === 'perte') repere.push("La faim augmente à mesure que vous perdez du poids : c'est normal et prévu. Protéines, légumes et fibres sont vos meilleurs alliés. (§ 22)");

    return { priorites, remplacements, repere, sources: sourcesProteines(d),
      calories: tca ? null : { cible: c.cible, texte: "Ce chiffre sert de repère pour le suivi : pas besoin de compter si vous appliquez les priorités ci-dessus." } };
  }

  // ======================================================================
  // 10. Sommeil et stress : seulement quand c'est un problème, et relié au reste
  // ======================================================================
  function sommeilStress(d) {
    const out = [];
    const boitLeSoir = alcoolTotal(d) > 0 && (d.alcoolMoment || []).some(m => ['pendant les repas', 'le week-end, en soirée', 'pour décompresser, seul·e', 'apéritif'].includes(m));
    if (d.sommeil === 'réveils fréquents' && boitLeSoir) out.push("Vos réveils nocturnes peuvent venir en partie de l'alcool du soir : il fait s'endormir plus vite mais fragmente la deuxième partie de la nuit. Testez une semaine sans alcool le soir et comparez.");
    else if (d.sommeil === 'réveils fréquents') out.push("Réveils fréquents : évitez la séance de sport tard le soir et le café après 14 h. Si ça dure, parlez-en à votre médecin.");
    if (d.sommeil === 'trop court') out.push("Sommeil trop court : fixez d'abord l'heure du lever, tous les jours, même le week-end. C'est elle qui recale l'heure du coucher. Mal dormir fait manger davantage. (§ 9)");
    if (d.sommeil === 'mauvais') out.push("Sommeil mauvais : faites vos séances le matin ou à midi plutôt que le soir, et gardez la chambre pour dormir (pas d'écran au lit). Si ça dure, parlez-en à votre médecin. (§ 9)");
    if (['élevé', 'très élevé'].includes(d.stress)) out.push("Stress élevé : les semaines difficiles, la séance minimum et la marche quotidienne suffisent. C'est la régularité qui compte, pas l'intensité. (§ 10)");
    return out;
  }

  // ======================================================================
  // 11. Suivi hebdomadaire (§ 24) — analyse des mesures de la semaine
  // ======================================================================
  const PAS_MAX = 12000, PALIER_KCAL = 150, PALIER_PAS = 1500;
  const LEVIERS = ['plus_de_pas', 'moins_kcal', 'manger_plus'];
  const r1 = x => x == null ? null : Math.round(x * 10) / 10;

  function ciblesCourantes(d, suivi) {
    const c = chiffres(d);
    const adj = suivi.ajustements || [];
    const kcal = adj.reduce((s, x) => s + (x.kcal || 0), 0);
    const pas = adj.reduce((s, x) => s + (x.pas || 0), 0);
    const n = (suivi.semaines || []).length;
    const pause = adj.some(x => x.type === 'semaine_equilibre' && x.semaine === n);
    const cibleKcal = Math.min(Math.max(c.cible + kcal, c.plancher), c.maintien);
    return { kcal: pause ? c.maintien : cibleKcal, kcalHorsPause: cibleKcal, pas: Math.min(c.pasCible + pas, PAS_MAX),
      proteines: c.proteines, pause, maintien: c.maintien, plancher: c.plancher, mode: c.mode };
  }

  function decision(type, titre, texte, effet = {}) {
    return { type, titre, texte, kcal: effet.kcal || 0, pas: effet.pas || 0, applicable: !!(effet.kcal || effet.pas || type === 'semaine_equilibre') };
  }

  function analyserSuivi(d, suivi) {
    const semaines = suivi.semaines || [], adj = suivi.ajustements || [], n = semaines.length;
    const cibles = ciblesCourantes(d, suivi);
    const w = semaines.map(s => moyenne(s.pesees || [])), t = semaines.map(s => Number(s.taille) || null);
    const derniers = k => semaines.slice(-k);
    const resume = { semaine: n, poidsMoyen: r1(w[n - 1]),
      depuisDebut: n >= 2 && w[0] && w[n - 1] ? r1(w[n - 1] - w[0]) : null,
      tailleDepuisDebut: n >= 2 && t[0] && t[n - 1] ? r1(t[n - 1] - t[0]) : null };
    if (!n) return { ...resume, cibles, decision: null };

    if (cibles.mode !== 'perte') {
      const prise = n >= 5 && w[n - 5] && w[n - 1] && w[n - 1] - w[n - 5] > 2;
      return { ...resume, cibles, decision: prise
        ? decision('revoir_alimentation', "Le poids monte", "Plus de 2 kg en un mois : reprenez les priorités alimentaires du programme, une par une.")
        : decision('continuer', "On continue", "Regardez surtout vos charges dans le carnet, le tour de taille, l'énergie et les douleurs.") };
    }
    if (n < 3) return { ...resume, cibles, decision: decision('trop_tot', "Trop tôt pour conclure", "Les deux premières semaines, la perte est surtout de l'eau. On continue sans rien changer.") };

    const leviers = adj.filter(x => LEVIERS.includes(x.type));
    const dernierLevier = leviers[leviers.length - 1];
    const depuisLevier = dernierLevier ? n - dernierLevier.semaine : n;
    const dernierePause = [...adj].reverse().find(x => x.type === 'semaine_equilibre');
    const depuisPause = dernierePause ? n - dernierePause.semaine : n;
    const energieBasse = moyenne(derniers(2).map(s => s.energie)) <= 2;
    const faimForte = moyenne(derniers(2).map(s => s.faim)) >= 4;

    const rythme2 = w[n - 3] && w[n - 1] ? (w[n - 3] - w[n - 1]) / 2 : 0;
    if (rythme2 > PERTE_MAX_HEBDO && cibles.kcalHorsPause + PALIER_KCAL <= cibles.maintien && depuisLevier >= 2) {
      return { ...resume, rythme: r1(rythme2), cibles, decision: decision('manger_plus', "Vous perdez trop vite",
        `Plus de ${kgFr(PERTE_MAX_HEBDO)} kg par semaine : à ce rythme on perd aussi du muscle. On ajoute ${PALIER_KCAL} kcal par jour (une collation protéinée).`, { kcal: +PALIER_KCAL }) };
    }
    if (depuisPause >= 12) {
      return { ...resume, rythme: r1(rythme2), cibles, decision: decision('semaine_equilibre', "Une semaine à l'équilibre",
        `12 semaines de régime : la semaine prochaine, on mange au niveau du maintien (environ ${cibles.maintien.toLocaleString('fr-FR')} kcal), on garde l'entraînement et la marche. Puis on reprend. (§ 23)`) };
    }
    if (n < 4) return { ...resume, rythme: r1(rythme2), cibles, decision: decision('continuer', "On continue", "Il faut 3 semaines de recul pour parler de plateau.") };

    const rythme3 = w[n - 4] && w[n - 1] ? (w[n - 4] - w[n - 1]) / 3 : 0;
    const baisseTaille = t[n - 4] && t[n - 1] ? t[n - 4] - t[n - 1] : 0;
    const plateau = rythme3 < 0.1 && baisseTaille < 0.5;

    if (!plateau) {
      if (depuisPause >= 8 && (energieBasse || faimForte)) return { ...resume, rythme: r1(rythme3), cibles, decision: decision('semaine_equilibre', "Une semaine à l'équilibre",
        "Plus de 8 semaines de régime, avec de la fatigue ou une faim forte : une semaine au niveau du maintien, sans perdre vos progrès. (§ 23)") };
      return { ...resume, rythme: r1(rythme3), cibles, decision: decision('continuer', "Ça avance", rythme3 >= 0.1
        ? `Vous perdez environ ${kgFr(r1(rythme3))} kg par semaine en moyenne. C'est le bon rythme : on ne change rien.`
        : "Le poids bouge peu, mais le tour de taille baisse : vous perdez de la graisse et gardez du muscle. On ne change rien.") };
    }
    if (depuisLevier === 0) return { ...resume, rythme: r1(rythme3), cibles, decision: decision('attendre', "Ajustement appliqué", "Les nouveaux objectifs sont affichés ci-dessus. On refait le point dans 3 semaines.") };
    if (depuisLevier < 3) return { ...resume, rythme: r1(rythme3), cibles, decision: decision('attendre', "On laisse agir le dernier ajustement", "Un ajustement a été fait il y a moins de 3 semaines : on lui laisse le temps.") };

    const respect = moyenne(derniers(3).map(s => s.respect));
    if (respect != null && respect < 80) return { ...resume, rythme: r1(rythme3), cibles, decision: decision('verifier_respect', "D'abord, regarder ce qui coince",
      `Programme suivi à environ ${Math.round(respect)} % ces 3 dernières semaines. On ne change pas les chiffres : on cherche ce qui bloque (portions, grignotages, boissons, week-ends) et on règle un point à la fois.`) };
    if ((energieBasse || faimForte) && depuisPause >= 4) return { ...resume, rythme: r1(rythme3), cibles, decision: decision('semaine_equilibre', "Une semaine à l'équilibre",
      "Plateau avec fatigue ou faim forte : plutôt que de restreindre encore, une semaine au niveau du maintien. (§ 23)") };
    if (leviers.length >= 3 && respect >= 90) return { ...resume, rythme: r1(rythme3), cibles, decision: decision('medecin', "Parlez-en à votre médecin",
      "Malgré un programme bien suivi, plus de pas et moins de calories, rien ne bouge. Il peut y avoir une raison médicale (thyroïde, traitement, rétention d'eau). (§ 11)") };
    if ((!dernierLevier || dernierLevier.type !== 'plus_de_pas') && cibles.pas + PALIER_PAS <= PAS_MAX) return { ...resume, rythme: r1(rythme3), cibles, decision: decision('plus_de_pas', "Un peu plus de marche",
      `Plateau depuis 3 semaines : on ajoute ${PALIER_PAS.toLocaleString('fr-FR')} pas par jour (environ 15 minutes de marche). On ne touche pas à l'alimentation pour l'instant.`, { pas: PALIER_PAS }) };
    const marge = Math.min(PALIER_KCAL, cibles.kcalHorsPause - cibles.plancher);
    if (marge >= 50) return { ...resume, rythme: r1(rythme3), cibles, decision: decision('moins_kcal', "Un petit ajustement de l'alimentation",
      `Plateau depuis 3 semaines : on retire ${marge} kcal par jour (par exemple ${marge >= 120 ? 'la moitié du féculent du soir' : 'un morceau de pain en moins'}), sans toucher aux protéines.`, { kcal: -marge }) };
    return { ...resume, rythme: r1(rythme3), cibles, decision: decision('medecin', "Parlez-en à votre médecin",
      "On est au plancher de sécurité et le poids ne bouge plus. Il ne faut pas manger moins : un médecin peut chercher une cause. (§ 11)") };
  }

  // ======================================================================
  // Assemblage
  // ======================================================================
  // extra : { retests: [...], carnet: { niveaux: {...} } } — facultatif
  function genererProgramme(d, extra = {}) {
    const retests = extra.retests || [];
    const dateRetest = retests.length ? retests[retests.length - 1].date : null;
    const c = chiffres(d);
    const nv = niveaux(bilanAvecRetest(d, retests));
    const presc = prescription(d, nv);
    return {
      prenom: d.prenom, genereLe: new Date().toISOString().slice(0, 10),
      alertes: alertes(d, nv), chiffres: c, niveaux: nv, prescription: presc,
      seances: seances(d, nv, (extra.carnet && extra.carnet.niveaux) || {}, dateRetest), endurance: endurance(d, nv),
      alimentation: alimentation(d, c), alcool: alcool(d), motivation: motivation(d, presc), sommeilStress: sommeilStress(d),
    };
  }

  Object.assign(F, { genererProgramme, chiffres, alertes, niveaux, prescription, seances, endurance, choisirExercice, prochaineCible,
    seriesPourSemaine, variante, alimentation, bilanAvecRetest, niveauxParMouvement, niveauMouvement, alcool, motivation, sommeilStress, analyserSuivi, ciblesCourantes, moyenne, choisirJours, alcoolTotal, NOMS_NIVEAU });
  if (typeof module !== 'undefined' && module.exports) module.exports = F;
})(typeof window !== 'undefined' ? window : globalThis);
