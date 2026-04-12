import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CharityProgramStatus } from '@solidarity-network/shared';

export class CreateCharityProgramDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  description!: string;

  @ApiPropertyOptional({ enum: CharityProgramStatus })
  @IsOptional()
  @IsEnum(CharityProgramStatus)
  status?: CharityProgramStatus;
}
