import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const RefId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    return request.refId;
  },
);
