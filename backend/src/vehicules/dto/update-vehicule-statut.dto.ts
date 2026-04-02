import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { VehiculeStatut } from '../entities/vehicule.entity';

export class UpdateVehiculeStatutDto {
  @IsEnum(['disponible', 'en_mission', 'maintenance'])
  statut: VehiculeStatut;

  /** Distributeur à associer lors d'une mise en mission */
  @IsOptional()
  @IsUUID()
  distributeurId?: string;
}
