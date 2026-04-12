import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { BeneficiaryStatus } from '@solidarity-network/shared';
import { AddressDto } from './address.dto';

export class CreateBeneficiaryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  fullName!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  document!: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  phone!: string;

  @ApiProperty({ type: AddressDto })
  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  charityProgramId!: string;

  @ApiPropertyOptional({ enum: BeneficiaryStatus })
  @IsOptional()
  @IsEnum(BeneficiaryStatus)
  status?: BeneficiaryStatus;
}
