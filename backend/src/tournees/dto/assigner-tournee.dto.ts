import { IsString } from 'class-validator';

export class AssignerTourneeDto {
  @IsString()
  distributeurId: string;
}
