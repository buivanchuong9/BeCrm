import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { ValidationAppError } from '../errors/app-error';

/** Rejects whitespace-only strings consistently, including nested DTO fields. */
@Injectable()
export class RejectBlankStringsPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    if (metadata.type !== 'body' && metadata.type !== 'query') return value;
    const blankFields: string[] = [];
    this.collect(value, '', blankFields);
    if (blankFields.length > 0) {
      throw new ValidationAppError(
        blankFields.map((field) => ({
          field,
          code: 'VALIDATION_ERROR',
          message: `${field} must not be blank.`,
        })),
        `${blankFields[0]} must not be blank.`,
      );
    }
    return value;
  }

  private collect(value: unknown, path: string, blankFields: string[]): void {
    if (typeof value === 'string') {
      if (value.trim().length === 0) blankFields.push(path || 'value');
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => this.collect(item, `${path}[${index}]`, blankFields));
      return;
    }
    if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        this.collect(child, path ? `${path}.${key}` : key, blankFields);
      }
    }
  }
}
