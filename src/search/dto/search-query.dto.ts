import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import {
  Transform,
  Type,
} from 'class-transformer';

export class SearchQueryDto {
  @IsString()
  query: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsObject()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return {};
      }
    }
    return value;
  })
  filters?: Record<string, unknown>;
}
