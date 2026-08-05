import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CharityProgramStatus } from '@solidarity-network/shared';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryCharityProgramsDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: CharityProgramStatus })
  @IsOptional()
  @IsEnum(CharityProgramStatus)
  status?: CharityProgramStatus;
}
