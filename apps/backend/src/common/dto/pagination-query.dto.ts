import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const toNumber = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? Number(value) : value;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

function toBoundedInt(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) {
  const numericValue =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : Number.NaN;

  if (!Number.isInteger(numericValue)) {
    return fallback;
  }

  return Math.min(Math.max(numericValue, min), max);
}

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Transform(toNumber)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 10;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

export function normalizePaginationQuery<T extends Partial<PaginationQueryDto>>(
  query: T,
): T & PaginationQueryDto {
  return {
    ...query,
    page: toBoundedInt(query.page, DEFAULT_PAGE, 1, Number.MAX_SAFE_INTEGER),
    pageSize: toBoundedInt(
      query.pageSize,
      DEFAULT_PAGE_SIZE,
      1,
      MAX_PAGE_SIZE,
    ),
    search:
      typeof query.search === 'string' && query.search.trim().length > 0
        ? query.search.trim()
        : undefined,
  };
}
