import { IsString, IsEnum, IsOptional } from 'class-validator';

export enum EvenementType {
  INCIDENT_TERRAIN  = 'INCIDENT_TERRAIN',
  RUPTURE_STOCK     = 'RUPTURE_STOCK',
  VEHICULE_PANNE    = 'VEHICULE_PANNE',
  ROUTE_BLOQUEE     = 'ROUTE_BLOQUEE',
  ALERTE_PUSH       = 'ALERTE_PUSH',
  RECALCUL_DEMANDE  = 'RECALCUL_DEMANDE',
}

export enum EvenementSeverite {
  INFO     = 'info',
  WARNING  = 'warning',
  CRITICAL = 'critical',
}

export class CreateEvenementDto {
  @IsString()
  criseId: string;

  @IsEnum(EvenementType)
  type: EvenementType;

  @IsEnum(EvenementSeverite)
  severite: EvenementSeverite;

  @IsString()
  titre: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  tourneeId?: string;

  @IsOptional()
  @IsString()
  douarId?: string;
}
