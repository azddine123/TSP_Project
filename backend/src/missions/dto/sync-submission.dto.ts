import {
  IsUUID, IsEnum, IsDateString, IsOptional, IsNumber, IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO pour la route POST /sync — reçoit les livraisons validées HORS-LIGNE
 * depuis l'app mobile (syncService.forceSync()).
 *
 * Le distributeur a validé la livraison sans réseau.
 * Quand il retrouve du réseau, l'app envoie ce payload au backend.
 * timestampLocal est l'horodatage de la validation côté mobile (preuve terrain).
 */
export class SyncSubmissionDto {
  @ApiProperty({ example: 'uuid-mission', description: 'ID de la mission validée hors-ligne' })
  @IsUUID()
  missionId: string;

  @ApiProperty({ enum: ['completed'], example: 'completed' })
  @IsEnum(['completed'])
  statut: string;

  @ApiPropertyOptional({ example: 'Piste impraticable après les pluies, livraison effectuée à pied.' })
  @IsOptional()
  @IsString()
  commentaireTerrain?: string;

  @ApiPropertyOptional({ example: 31.9682, description: 'Latitude GPS au moment de la livraison' })
  @IsOptional()
  @IsNumber()
  livraisonLat?: number;

  @ApiPropertyOptional({ example: -6.5703, description: 'Longitude GPS au moment de la livraison' })
  @IsOptional()
  @IsNumber()
  livraisonLng?: number;

  @ApiProperty({
    example: '2024-09-12T14:37:00.000Z',
    description: 'Horodatage de la validation côté mobile (preuve d\'audit terrain)',
  })
  @IsDateString()
  timestampLocal: string;
}
