import { IsEnum } from 'class-validator';

export enum CriseStatut {
  ACTIVE    = 'active',
  SUSPENDUE = 'suspendue',
  CLOTUREE  = 'cloturee',
}

export class UpdateCriseStatutDto {
  @IsEnum(CriseStatut)
  statut: CriseStatut;
}
