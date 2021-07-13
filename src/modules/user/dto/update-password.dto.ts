import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdatePasswordDto {
  @IsOptional()
  @IsString()
  currentPassword: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(60)
  password: string;

  @IsOptional()
  @IsString()
  confirmPassword: string;
}
