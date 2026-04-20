import { ApiProperty } from '@nestjs/swagger';
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
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  currentPassword!: string;

  @ApiProperty({
    minLength: 8,
    description:
      'Must contain uppercase, lowercase, number, and special character.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(PASSWORD_POLICY_REGEX, {
    message:
      'New password must contain uppercase, lowercase, number, and special character.',
  })
  @MaxLength(120)
  newPassword!: string;
}
