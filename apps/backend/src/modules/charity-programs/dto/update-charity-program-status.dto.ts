import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CharityProgramStatus } from '@solidarity-network/shared';

export class UpdateCharityProgramStatusDto {
  @ApiProperty({ enum: CharityProgramStatus })
  @IsEnum(CharityProgramStatus)
  status!: CharityProgramStatus;
}
