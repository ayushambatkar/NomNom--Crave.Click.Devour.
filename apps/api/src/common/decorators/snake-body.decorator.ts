import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { toCamelCase } from '../case.util';

// Usage: handler(@SnakeBody(CreateDto) dto: CreateDto)
export const SnakeBody = createParamDecorator(
  (dtoClass: any, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest();
    const raw = request?.body ?? {};
    // map snake_case -> camelCase
    const camel = toCamelCase(raw);
    // create DTO instance and validate
    const dto = plainToInstance(dtoClass, camel, {
      enableImplicitConversion: true,
    });
    const errors = validateSync(dto as object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: false,
    });
    if (errors.length) {
      throw new BadRequestException(errors);
    }
    return dto;
  },
);
