import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ICurrentUser } from '../interfaces/current-user.interface';

// Decorator to get current user from request, with optional field selection
export const CurrentUser = createParamDecorator(
  (field: keyof ICurrentUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user: ICurrentUser }>(); // Assuming auth middleware attaches user to request
    const user = request.user;
    return field ? user?.[field] : user;
  },
);
