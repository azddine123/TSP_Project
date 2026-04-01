import { IsEnum } from 'class-validator';

export enum EtapeStatut {
  EN_ATTENTE = 'en_attente',
  EN_ROUTE   = 'en_route',
  LIVREE     = 'livree',
  ECHEC      = 'echec',
}

export class UpdateEtapeStatutDto {
  @IsEnum(EtapeStatut)
  statut: EtapeStatut;
}
