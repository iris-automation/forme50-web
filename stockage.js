// Stockage local de Forme 50+ : lecture, sauvegarde dans un fichier, restauration.
// Les données ne quittent jamais l'appareil, sauf si la personne télécharge elle-même sa sauvegarde.

(function (g) {
  'use strict';
  const F = g.Forme50 = g.Forme50 || {};
  const CLES = { bilan: 'forme50-bilan', carnet: 'forme50-carnet', suivi: 'forme50-suivi', retests: 'forme50-retests' };
  const DEFAUTS = { bilan: null, carnet: { seances: [], niveaux: {} }, suivi: { semaines: [], ajustements: [] }, retests: [] };

  function lire(nom) {
    try {
      const v = JSON.parse(localStorage.getItem(CLES[nom]) || 'null');
      if (v == null) return structuredClone(DEFAUTS[nom]);
      if (nom === 'carnet') v.niveaux = v.niveaux || {};
      return v;
    } catch (e) { return structuredClone(DEFAUTS[nom]); }
  }
  const ecrire = (nom, v) => localStorage.setItem(CLES[nom], JSON.stringify(v));

  // Programme à jour : bilan + retests + évolutions notées dans le carnet
  const programme = () => {
    const d = lire('bilan');
    return d && d.objectifs ? F.genererProgramme(d, { retests: lire('retests'), carnet: lire('carnet') }) : null;
  };

  function telecharger() {
    const donnees = { app: 'forme50', version: 3, le: new Date().toISOString() };
    for (const nom of Object.keys(CLES)) donnees[nom] = lire(nom);
    const blob = new Blob([JSON.stringify(donnees, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `forme50-sauvegarde-${donnees.le.slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function restaurer(fichier) {
    return fichier.text().then(texte => {
      const d = JSON.parse(texte);
      if (d.app !== 'forme50' || !d.bilan) throw new Error("Ce fichier n'est pas une sauvegarde Forme 50+.");
      for (const nom of Object.keys(CLES)) if (d[nom] != null) ecrire(nom, d[nom]);
    });
  }

  // Demande au navigateur de ne pas effacer les données (sans effet visible si refusé)
  if (g.navigator && navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  F.stockage = { lire, ecrire, programme, telecharger, restaurer };
})(typeof window !== 'undefined' ? window : globalThis);
