import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserDocument } from '@sellit/api-database';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserDocument => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);


