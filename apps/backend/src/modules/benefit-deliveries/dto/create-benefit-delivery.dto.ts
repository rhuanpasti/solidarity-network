import { IsDateString, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBenefitDeliveryDto {
  @ApiProperty()
  @IsString()
  beneficiaryId!: string;

  @ApiProperty()
  @IsString()
  benefitId!: string;

  @ApiProperty()
  @IsString()
  charityProgramId!: string;

  @ApiProperty()
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  @IsDateString()
  deliveryDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiProperty()
  @IsString()
  administratorId!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  reference!: string;
}
