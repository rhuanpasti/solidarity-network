import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBenefitStatusDto {
  @ApiProperty()
  @IsBoolean()
  active!: boolean;
}
