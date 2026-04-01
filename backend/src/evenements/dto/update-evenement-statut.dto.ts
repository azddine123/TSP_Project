import { IsEnum } from 'class-validator';

export enum EvenementStatut {
  OUVERT        = 'ouvert',
  EN_TRAITEMENT = 'en_traitement',
  RESOLU        = 'resolu',
}

export class UpdateEvenementStatutDto {
  @IsEnum(EvenementStatut)
  statut: EvenementStatut;
}
