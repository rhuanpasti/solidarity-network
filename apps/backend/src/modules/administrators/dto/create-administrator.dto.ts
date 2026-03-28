import { IsArray, IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AdministratorRole } from '@solidarity-network/shared';

export class CreateAdministratorDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(30)
  phone!: string;

  @ApiProperty({ enum: AdministratorRole })
  @IsEnum(AdministratorRole)
  role!: AdministratorRole;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  charityProgramIds?: string[];
}
