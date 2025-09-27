import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { toCamelCase } from './case.util';

@Injectable()
export class SnakeToCamelPipe implements PipeTransform<any> {
  transform(value: any, metadata: ArgumentMetadata) {
    // Only transform objects for body/params/query
    if (metadata.type === 'body' || metadata.type === 'query' || metadata.type === 'param') {
      return toCamelCase(value);
    }
    return value;
  }
}
