import {
  Injectable,
  BadRequestException,
} from '@nestjs/common';
import { ISearchStrategy } from './interfaces';

/**
 * Registry for search strategies following Open/Closed Principle.
 * New strategies can be registered without modifying existing code.
 */
@Injectable()
export class SearchRegistry {
  private readonly strategies = new Map<
    string,
    ISearchStrategy
  >();

  register(strategy: ISearchStrategy): void {
    this.strategies.set(strategy.type, strategy);
  }

  get(type: string): ISearchStrategy {
    const strategy = this.strategies.get(type);
    if (!strategy) {
      const availableTypes = Array.from(
        this.strategies.keys(),
      );
      throw new BadRequestException(
        `Unknown search type: '${type}'. Available types: ${availableTypes.join(', ')}`,
      );
    }
    return strategy;
  }

  getAvailableTypes(): string[] {
    return Array.from(this.strategies.keys());
  }

  has(type: string): boolean {
    return this.strategies.has(type);
  }
}
