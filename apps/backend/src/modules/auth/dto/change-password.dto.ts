import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  currentPassword!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(120)
  newPassword!: string;
}
