import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStatutDto {
  @ApiProperty({
    enum: ['in_progress', 'completed', 'annulee'],
    example: 'completed',
    description: 'Nouveau statut de la mission (DISTRIBUTEUR uniquement)',
  })
  @IsEnum(['in_progress', 'completed', 'annulee'])
  statut: string;
}
