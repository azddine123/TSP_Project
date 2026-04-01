import {
  IsString, IsArray, IsOptional, ValidateNested,
  IsNumber, Min, Max, ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

/** Matrice AHP — triangle supérieur (6 comparaisons pairwise) */
export class AhpComparaisonsDto {
  /** Vulnérabilité vs Sévérité */
  @IsNumber() @Min(1/9) @Max(9) vuln_vs_sev: number;
  /** Vulnérabilité vs Accessibilité */
  @IsNumber() @Min(1/9) @Max(9) vuln_vs_acc: number;
  /** Vulnérabilité vs Accès Soins */
  @IsNumber() @Min(1/9) @Max(9) vuln_vs_soins: number;
  /** Sévérité vs Accessibilité */
  @IsNumber() @Min(1/9) @Max(9) sev_vs_acc: number;
  /** Sévérité vs Accès Soins */
  @IsNumber() @Min(1/9) @Max(9) sev_vs_soins: number;
  /** Accessibilité vs Accès Soins */
  @IsNumber() @Min(1/9) @Max(9) acc_vs_soins: number;
}

export class AhpMatriceDto {
  @ValidateNested()
  @Type(() => AhpComparaisonsDto)
  comparaisons: AhpComparaisonsDto;
}

/** Coefficients de la fonction objectif VRP : Z = λ1·D + λ2·T − λ3·C */
export class LambdasDto {
  @IsNumber() @Min(0) distance:   number;  // λ1
  @IsNumber() @Min(0) temps:      number;  // λ2
  @IsNumber() @Min(0) couverture: number;  // λ3
}

/** Configuration d'un entrepôt (véhicules disponibles) */
export class ContrainteVehiculeDto {
  @IsString()  entrepotId:  string;
  @IsNumber() @Min(1) capacite:    number;
  @IsNumber() @Min(1) nbVehicules: number;
}

export class RunPipelineDto {
  @IsString()
  criseId: string;

  @ValidateNested()
  @Type(() => AhpMatriceDto)
  ahpMatrice: AhpMatriceDto;

  @ValidateNested()
  @Type(() => LambdasDto)
  lambdas: LambdasDto;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ContrainteVehiculeDto)
  contraintesVehicules: ContrainteVehiculeDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  douarsExclus?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  routesBloquees?: string[];
}
