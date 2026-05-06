import { ConflictException, InternalServerErrorException, Logger } from '@nestjs/common';
import { Prisma } from '@generated/prisma/client';

/**
 * Centralized Prisma error handler.
 * Throws appropriate HttpException based on Prisma error code.
 *
 * @param e - The unknown error caught from Prisma operation
 * @param action - Description of the failed action (for logging)
 * @param logger - Logger instance from the calling service
 *
 * @throws {ConflictException} when unique constraint violated (P2002)
 * @throws {InternalServerErrorException} for unhandled errors
 */
export function handlePrismaError(e: unknown, action: string, logger: Logger): never {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
    const field = Array.isArray(e.meta?.target) ? e.meta.target.join(', ') : 'Field data';
    throw new ConflictException(`${field} has been used`);
  }

  const message = e instanceof Error ? e.message : String(e);
  const stack = e instanceof Error ? e.stack : undefined;
  logger.error(`Error when ${action}: ${message}`, stack);
  throw new InternalServerErrorException(`Error when ${action}`);
}
