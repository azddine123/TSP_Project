import { Injectable } from '@nestjs/common';
import { AhpResult } from './ahp.service';
import { DouarSeverite } from '../crises/entities/douar-severite.entity';

export interface TopsisRanking {
  douarId:   string;
  douarNom:  string;
  commune:   string;
  score:     number;   // C_i ∈ [0, 1]
  rang:      number;
  distances: { dPlus: number; dMinus: number };
}

export interface TopsisResult {
  classement:         TopsisRanking[];
  solutionIdealePlus: number[];
  solutionIdealeNeg:  number[];
}

/**
 * Service TOPSIS — 4 critères pondérés par l'AHP.
 *
 * Critères (dans l'ordre des colonnes) :
 *   [0] vulnerabilite  — critère BÉNÉFICE (plus c'est haut, plus prioritaire)
 *   [1] severite       — critère BÉNÉFICE
 *   [2] accessibilite  — critère BÉNÉFICE (0=inaccessible → à prioriser en premier)
 *                        NB : en TOPSIS ici on traite l'accessibilité comme un coût
 *                        (faible accessibilité = forte priorité) donc on inverse le critère.
 *   [3] accesSoins     — critère COÛT inversé (faible accès = forte priorité)
 *
 * Algorithme :
 * 1. Normalisation vectorielle : r_ij = x_ij / √(Σx_ij²)
 * 2. Matrice pondérée : v_ij = w_j × r_ij
 * 3. Solutions idéales A+ (max bénéfices / min coûts) et A- (inverse)
 * 4. Distances euclidéennes D+ et D-
 * 5. Score de proximité relative : C_i = D- / (D+ + D-)
 */
@Injectable()
export class TopsisService {
  compute(
    severites: DouarSeverite[],
    ahp: AhpResult,
  ): TopsisResult {
    if (severites.length === 0) {
      return { classement: [], solutionIdealePlus: [], solutionIdealeNeg: [] };
    }

    const weights = [
      ahp.poids.vulnerabilite,
      ahp.poids.severite,
      // accessibilité traitée comme COÛT (on inverse → 1 - accessibilite)
      ahp.poids.accessibilite,
      ahp.poids.accesSoins,
    ];

    // ── Matrice brute [n × 4] ─────────────────────────────────────────────────
    // Pour accessibilite et accesSoins (critères COÛT) : on inverse (1 - valeur)
    // afin que TOUTES les colonnes soient des BÉNÉFICES (plus haut = plus prioritaire)
    const raw: number[][] = severites.map((s) => [
      s.vulnerabilite,
      s.severite / 10,           // normaliser sur [0,1]
      1 - s.accessibilite,       // coût inversé → bénéfice
      1 - s.accesSoins,          // coût inversé → bénéfice
    ]);

    const m = severites.length;
    const n = 4;

    // ── Normalisation vectorielle ─────────────────────────────────────────────
    const colNorms = Array.from({ length: n }, (_, j) =>
      Math.sqrt(raw.reduce((s, row) => s + row[j] ** 2, 0)),
    );

    const normalized = raw.map((row) =>
      row.map((val, j) => (colNorms[j] > 0 ? val / colNorms[j] : 0)),
    );

    // ── Matrice pondérée ──────────────────────────────────────────────────────
    const weighted = normalized.map((row) =>
      row.map((val, j) => val * weights[j]),
    );

    // ── Solutions idéales (toutes les colonnes sont des bénéfices) ────────────
    const idealPlus = Array.from({ length: n }, (_, j) =>
      Math.max(...weighted.map((row) => row[j])),
    );
    const idealNeg = Array.from({ length: n }, (_, j) =>
      Math.min(...weighted.map((row) => row[j])),
    );

    // ── Distances et scores ───────────────────────────────────────────────────
    const results = severites.map((s, i) => {
      const dPlus  = Math.sqrt(weighted[i].reduce((sum, v, j) => sum + (v - idealPlus[j]) ** 2, 0));
      const dMinus = Math.sqrt(weighted[i].reduce((sum, v, j) => sum + (v - idealNeg[j]) ** 2, 0));
      const score  = dPlus + dMinus > 0 ? dMinus / (dPlus + dMinus) : 0;

      return {
        douarId:   s.douar.id,
        douarNom:  s.douar.nom,
        commune:   s.douar.commune,
        score,
        rang:      0,   // calculé après tri
        distances: { dPlus, dMinus },
      };
    });

    // ── Tri par score décroissant → attribution des rangs ────────────────────
    results.sort((a, b) => b.score - a.score);
    results.forEach((r, idx) => { r.rang = idx + 1; });

    return {
      classement:         results,
      solutionIdealePlus: idealPlus,
      solutionIdealeNeg:  idealNeg,
    };
  }
}
