import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { spawn } from 'child_process';
import * as path from 'path';
import { TopsisRanking } from './topsis.service';
import { Entrepot } from '../entrepots/entities/entrepot.entity';
import { ContrainteVehiculeDto, LambdasDto } from './dto/run-pipeline.dto';

export interface VrpEtape {
  douarId:    string;
  douarNom:   string;
  ordre:      number;
  latitude:   number;
  longitude:  number;
  population: number;
}

export interface VrpTournee {
  entrepotId:       string;
  entrepotNom:      string;
  vehiculeCapacite: number;
  etapes:           VrpEtape[];
  distanceTotale:   number;
  tempsEstime:      number;
  scoreZ:           number;
}

export interface VrpInput {
  entrepots: {
    id:        string;
    nom:       string;
    latitude:  number;
    longitude: number;
    capacite:  number;
    nbVehicules: number;
  }[];
  douars: {
    id:         string;
    nom:        string;
    commune:    string;
    latitude:   number;
    longitude:  number;
    population: number;
    priorityScore: number;
  }[];
  lambdas: { distance: number; temps: number; couverture: number };
  douarsExclus:   string[];
  routesBloquees: string[];
}

/**
 * Service VRP — appelle un script Python OR-Tools via subprocess.
 * Le script Python est à : backend/python/vrp_solver.py
 *
 * Communication : JSON via stdin/stdout
 * Timeout : 120 secondes
 */
@Injectable()
export class VrpService {
  private readonly logger = new Logger(VrpService.name);
  private readonly pythonScript = path.join(__dirname, '..', '..', '..', 'python', 'vrp_solver.py');

  async solve(
    classement:  TopsisRanking[],
    entrepots:   Entrepot[],
    contraintes: ContrainteVehiculeDto[],
    lambdas:     LambdasDto,
    douarsExclus:   string[],
    routesBloquees: string[],
    douarsMap:   Map<string, { latitude: number; longitude: number; population: number }>,
  ): Promise<VrpTournee[]> {
    // Filtrer les douars exclus
    const douarsActifs = classement.filter((r) => !douarsExclus.includes(r.douarId));

    const input: VrpInput = {
      entrepots: entrepots.map((e) => {
        const contrainte = contraintes.find((c) => c.entrepotId === e.id);
        return {
          id:          e.id,
          nom:         e.nom,
          latitude:    e.latitude,
          longitude:   e.longitude,
          capacite:    contrainte?.capacite    ?? 1000,
          nbVehicules: contrainte?.nbVehicules ?? 1,
        };
      }),
      douars: douarsActifs.map((r) => {
        const geo = douarsMap.get(r.douarId);
        return {
          id:            r.douarId,
          nom:           r.douarNom,
          commune:       r.commune,
          latitude:      geo?.latitude  ?? 0,
          longitude:     geo?.longitude ?? 0,
          population:    geo?.population ?? 0,
          priorityScore: r.score,
        };
      }),
      lambdas,
      douarsExclus,
      routesBloquees,
    };

    return this.runPython(input);
  }

  private runPython(input: VrpInput): Promise<VrpTournee[]> {
    return new Promise((resolve, reject) => {
      const python = spawn('python3', [this.pythonScript], {
        timeout: 120_000,
      });

      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
      python.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

      python.on('close', (code) => {
        if (code !== 0) {
          this.logger.error(`VRP Python exited ${code}: ${stderr}`);
          reject(new InternalServerErrorException(
            `VRP solver failed (exit ${code}): ${stderr.slice(0, 500)}`,
          ));
          return;
        }
        try {
          const result = JSON.parse(stdout) as VrpTournee[];
          resolve(result);
        } catch (e) {
          reject(new InternalServerErrorException(
            `VRP solver returned invalid JSON: ${stdout.slice(0, 500)}`,
          ));
        }
      });

      python.on('error', (err) => {
        reject(new InternalServerErrorException(
          `Failed to start Python VRP solver: ${err.message}`,
        ));
      });

      // Envoyer les données en entrée via stdin
      python.stdin.write(JSON.stringify(input));
      python.stdin.end();
    });
  }
}
