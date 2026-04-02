import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { MouvementType } from '../entities/stock-mouvement.entity';

export class CreateMouvementDto {
  @IsUUID()
  materielId: string;

  @IsEnum(['ENTREE', 'SORTIE'])
  type: MouvementType;

  @IsInt()
  @Min(1)
  quantite: number;

  @IsOptional()
  @IsString()
  motif?: string;

  @IsOptional()
  @IsString()
  referenceDoc?: string;
}
