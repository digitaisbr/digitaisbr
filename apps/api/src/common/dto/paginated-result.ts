import { ApiProperty } from '@nestjs/swagger';

export class PaginationMeta {
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() totalPages!: number;
  @ApiProperty() hasNext!: boolean;
  @ApiProperty() hasPrev!: boolean;
}

export class PaginatedResult<T> {
  @ApiProperty({ isArray: true }) data!: T[];
  @ApiProperty({ type: PaginationMeta }) meta!: PaginationMeta;
}

export function paginate<T>(data: T[], total: number, page: number, limit: number): PaginatedResult<T> {
  const totalPages = Math.max(Math.ceil(total / limit), 1);
  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}
