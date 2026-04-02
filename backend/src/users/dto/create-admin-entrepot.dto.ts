import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator';

export class CreateAdminEntrepotDto {
  @IsString()
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  entrepotId?: string;
}
