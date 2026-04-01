import { Injectable, BadRequestException } from '@nestjs/common';
import { AhpMatriceDto } from './dto/run-pipeline.dto';

export interface AhpResult {
  poids: {
    vulnerabilite: number;
    severite:      number;
    accessibilite: number;
    accesSoins:    number;
  };
  rc:        number;
  coherent:  boolean;
  lambdaMax: number;
}

/**
 * Service AHP (Analytic Hierarchy Process) — 4 critères.
 * Critères : Vulnérabilité (α), Sévérité (δ), Accessibilité (β), Accès Soins (γ)
 *
 * Algorithme :
 * 1. Construire la matrice 4×4 à partir du triangle supérieur
 * 2. Normaliser par colonne → calculer le vecteur priorité (poids)
 * 3. Calculer λ_max, IC, RC
 * 4. Avertir si RC ≥ 0.10 (incohérence)
 */
@Injectable()
export class AhpService {
  /** Indice de cohérence aléatoire (Saaty) pour n=4 */
  private readonly RI = 0.9;

  compute(dto: AhpMatriceDto): AhpResult {
    const c = dto.comparaisons;

    // ── Matrice 4×4 (ligne : vulnérabilité, sévérité, accessibilité, accesSoins) ──
    const M: number[][] = [
      [1,            c.vuln_vs_sev,  c.vuln_vs_acc,  c.vuln_vs_soins],
      [1/c.vuln_vs_sev, 1,           c.sev_vs_acc,   c.sev_vs_soins ],
      [1/c.vuln_vs_acc, 1/c.sev_vs_acc, 1,           c.acc_vs_soins ],
      [1/c.vuln_vs_soins, 1/c.sev_vs_soins, 1/c.acc_vs_soins, 1    ],
    ];

    const n = 4;

    // ── Sommes des colonnes ───────────────────────────────────────────────────
    const colSums = Array.from({ length: n }, (_, j) =>
      M.reduce((sum, row) => sum + row[j], 0),
    );

    // ── Matrice normalisée ────────────────────────────────────────────────────
    const N = M.map((row) => row.map((val, j) => val / colSums[j]));

    // ── Vecteur priorité (poids) = moyenne des lignes normalisées ─────────────
    const weights = N.map((row) => row.reduce((s, v) => s + v, 0) / n);

    // ── λ_max = Σ (colSum_j × poids_j) ──────────────────────────────────────
    const lambdaMax = colSums.reduce((s, cs, j) => s + cs * weights[j], 0);

    // ── Indice de cohérence IC = (λ_max - n) / (n - 1) ───────────────────────
    const IC = (lambdaMax - n) / (n - 1);

    // ── Ratio de cohérence RC = IC / RI ──────────────────────────────────────
    const rc = IC / this.RI;

    return {
      poids: {
        vulnerabilite: weights[0],
        severite:      weights[1],
        accessibilite: weights[2],
        accesSoins:    weights[3],
      },
      rc,
      coherent:  rc < 0.10,
      lambdaMax,
    };
  }
}
