import {
  IsString, IsEnum, IsOptional, IsArray, ValidateNested,
  IsNumber, Min, Max, ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum CriseType {
  SEISME     = 'SEISME',
  INONDATION = 'INONDATION',
  GLISSEMENT = 'GLISSEMENT',
  SECHERESSE = 'SECHERESSE',
  AUTRE      = 'AUTRE',
}

export class DouarSeveriteDto {
  @IsString()
  douarId: string;

  /** Score de sévérité de la catastrophe sur ce douar : 0 (faible) → 10 (critique) */
  @IsNumber()
  @Min(0)
  @Max(10)
  severite: number;

  /** Score de vulnérabilité de la population : 0 → 1 */
  @IsNumber()
  @Min(0)
  @Max(1)
  vulnerabilite: number;

  /** Indice d'accessibilité routière : 0 (inaccessible) → 1 (libre) */
  @IsNumber()
  @Min(0)
  @Max(1)
  accessibilite: number;

  /** Proximité/disponibilité des soins : 0 (aucun) → 1 (bonne couverture) */
  @IsNumber()
  @Min(0)
  @Max(1)
  accesSoins: number;
}

export class CreateCriseDto {
  @IsEnum(CriseType)
  type: CriseType;

  @IsString()
  zone: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DouarSeveriteDto)
  severitesParDouar: DouarSeveriteDto[];
}
