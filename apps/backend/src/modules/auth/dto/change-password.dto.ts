import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const PASSWORD_POLICY_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).+$/;

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  currentPassword!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(12)
  @Matches(PASSWORD_POLICY_REGEX, {
    message:
      'New password must contain uppercase, lowercase, number, and special character.',
  })
  @MaxLength(120)
  newPassword!: string;
}
