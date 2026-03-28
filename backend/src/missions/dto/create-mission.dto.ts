import {
  IsUUID, IsString, IsEnum, IsDateString, IsOptional,
  IsNumber, IsArray, ValidateNested, IsInt, Min, MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMissionItemDto {
  @ApiProperty({ example: 'uuid-materiel', description: 'UUID du matériel à expédier' })
  @IsUUID()
  materielId: string;

  @ApiProperty({ example: 50, description: 'Quantité prévue (déduite du stock)' })
  @IsInt()
  @Min(1)
  quantitePrevue: number;
}

export class CreateMissionDto {
  @ApiProperty({ example: 'uuid-entrepot', description: 'Entrepôt source de la livraison' })
  @IsUUID()
  entrepotSourceId: string;

  @ApiProperty({ example: 'uuid-distributeur', description: 'Distributeur assigné à la mission' })
  @IsUUID()
  distributeurId: string;

  @ApiProperty({ example: 'Douar Tizgui — Commune Aït Benhaddou, Azilal' })
  @IsString()
  @MinLength(3)
  destinationNom: string;

  @ApiPropertyOptional({ example: 31.967, description: 'Latitude GPS de la zone sinistrée' })
  @IsOptional()
  @IsNumber()
  destinationLat?: number;

  @ApiPropertyOptional({ example: -6.5728, description: 'Longitude GPS de la zone sinistrée' })
  @IsOptional()
  @IsNumber()
  destinationLng?: number;

  @ApiProperty({ enum: ['low', 'medium', 'high', 'critique'], example: 'high' })
  @IsEnum(['low', 'medium', 'high', 'critique'])
  priorite: string;

  @ApiProperty({ example: '2024-09-15T12:00:00.000Z' })
  @IsDateString()
  dateEcheance: string;

  @ApiPropertyOptional({ example: 'Piste difficile après la pluie. Contacter le caïd.' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CreateMissionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMissionItemDto)
  items: CreateMissionItemDto[];
}
