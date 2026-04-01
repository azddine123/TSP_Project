import { IsString, IsArray, IsEnum, ArrayMinSize } from 'class-validator';
import { EvenementSeverite } from './create-evenement.dto';

export class SendAlertDto {
  @IsString()
  criseId: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  distributeurIds: string[];

  @IsString()
  titre: string;

  @IsString()
  message: string;

  @IsEnum(EvenementSeverite)
  severite: EvenementSeverite;
}
