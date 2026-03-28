import { NotFoundException } from '@nestjs/common';

export class DomainNotFoundException extends NotFoundException {
  constructor(resource: string, id: string) {
    super({
      code: `${resource.toUpperCase()}_NOT_FOUND`,
      message: `${resource} with id "${id}" was not found.`,
    });
  }
}

