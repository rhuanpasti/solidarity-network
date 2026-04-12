import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  SUPPORTED_COUNTRIES,
  type SupportedCountry,
  type Address,
} from '@solidarity-network/shared';

export class AddressDto implements Address {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  street!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  number!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  district!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  city!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  state!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  postalCode!: string;

  @ApiProperty({ enum: SUPPORTED_COUNTRIES })
  @IsNotEmpty()
  @IsIn(SUPPORTED_COUNTRIES)
  @MaxLength(80)
  country!: SupportedCountry;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  complement?: string;
}
