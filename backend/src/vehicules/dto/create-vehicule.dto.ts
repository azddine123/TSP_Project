import {
  IsEnum, IsInt, IsOptional, IsString, MaxLength, Min,
} from 'class-validator';
import { VehiculeType } from '../entities/vehicule.entity';

export class CreateVehiculeDto {
  @IsString()
  @MaxLength(20)
  immatriculation: string;

  @IsEnum(['CAMION', 'PICKUP', '4X4', 'MOTO'])
  type: VehiculeType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  marque?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  capacite?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
