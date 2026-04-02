import { IsBoolean } from 'class-validator';

export class UpdateAdminStatutDto {
  @IsBoolean()
  enabled: boolean;
}
