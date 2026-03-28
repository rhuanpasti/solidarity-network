import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BenefitCategory } from '@solidarity-network/shared';

export class CreateBenefitDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(1000)
  description!: string;

  @ApiProperty({ enum: BenefitCategory })
  @IsEnum(BenefitCategory)
  category!: BenefitCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
