import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Optional JWT Auth Guard
 * 
 * This guard attempts to authenticate the user via JWT if a token is present.
 * Unlike the regular JwtAuthGuard, it doesn't throw an error if authentication fails.
 * Instead, it allows the request to proceed with req.user set to null/undefined.
 * 
 * Use this for endpoints that work for both authenticated and guest users.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  override canActivate(context: ExecutionContext) {
    // Call the parent canActivate to attempt JWT verification
    return super.canActivate(context);
  }

  override handleRequest<TUser>(
    err: Error | null,
    user: TUser,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    info: any,
  ): TUser | null {
    // If there's an error or no user, just return null instead of throwing
    // This allows the request to continue without authentication
    if (err || !user) {
      return null as any;
    }
    return user;
  }
}


