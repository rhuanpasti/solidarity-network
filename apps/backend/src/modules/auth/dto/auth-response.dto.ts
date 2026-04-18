import { ApiProperty } from '@nestjs/swagger';
import { AccountType } from '@solidarity-network/shared';
import { AdministratorRole } from '@prisma/client';

export class AuthUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  username!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: AdministratorRole, nullable: true })
  role!: AdministratorRole | null;

  @ApiProperty({ enum: AccountType })
  accountType!: AccountType;

  @ApiProperty()
  mustChangePassword!: boolean;
}

export class AuthResponseDto {
  @ApiProperty()
  token!: string;

  @ApiProperty()
  csrfToken!: string;

  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;
}

export class SessionResponseDto {
  @ApiProperty({ type: AuthUserDto })
  user!: AuthUserDto;

  @ApiProperty()
  csrfToken!: string;
}

export class LogoutResponseDto {
  @ApiProperty()
  success!: boolean;
}
