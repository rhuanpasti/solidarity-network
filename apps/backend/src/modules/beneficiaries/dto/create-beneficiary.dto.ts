import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  BeneficiaryDependentRelationship,
  BeneficiaryStatus,
} from '@solidarity-network/shared';
import { AddressDto } from './address.dto';

export class BeneficiaryDependentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  fullName!: string;

  @ApiProperty({ enum: BeneficiaryDependentRelationship })
  @IsEnum(BeneficiaryDependentRelationship)
  relationship!: BeneficiaryDependentRelationship;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  document?: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsNotEmpty()
  @IsDateString()
  birthDate!: string;
}

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

  @ApiProperty({ type: String, format: 'date-time' })
  @IsNotEmpty()
  @IsDateString()
  birthDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  charityProgramIds?: string[];

  // Temporarily retained for payload compatibility; the backend rejects
  // non-empty dependent lists until this feature is enabled again.
  @ApiPropertyOptional({
    type: () => [BeneficiaryDependentDto],
    deprecated: true,
    description: 'Temporarily disabled. Send an empty array or omit this field.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BeneficiaryDependentDto)
  dependents?: BeneficiaryDependentDto[];

  @ApiPropertyOptional({ enum: BeneficiaryStatus })
  @IsOptional()
  @IsEnum(BeneficiaryStatus)
  status?: BeneficiaryStatus;
}
