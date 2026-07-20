import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marks a route as reachable without an access token. Every other route is
 * protected by default via the global JwtAuthGuard — this is an explicit opt-out,
 * never the reverse. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
