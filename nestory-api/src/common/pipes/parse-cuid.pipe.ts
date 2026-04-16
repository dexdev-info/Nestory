import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

// Validate param id to check if it's a valid cuid
@Injectable()
export class ParseCuidPipe implements PipeTransform<string> {
  // cuid starts with 'c' and has 25 characters
  private readonly cuidRegex = /^c[a-z0-9]{24}$/;

  transform(value: string): string {
    if (!this.cuidRegex.test(value)) {
      throw new BadRequestException(`Invalid id format: ${value}`);
    }
    return value;
  }
}
