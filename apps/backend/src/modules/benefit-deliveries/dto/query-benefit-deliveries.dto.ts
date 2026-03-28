import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryBenefitDeliveriesDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  beneficiaryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  charityProgramId?: string;
}
