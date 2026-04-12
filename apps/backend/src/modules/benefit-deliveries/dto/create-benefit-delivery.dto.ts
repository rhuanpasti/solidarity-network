import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBenefitDeliveryDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  beneficiaryId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  benefitId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  charityProgramId!: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsNotEmpty()
  @IsDateString()
  deliveryDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  administratorId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  reference!: string;
}
