/**
 * District Decorator
 *
 * Enforces district-level access control.
 */

import { SetMetadata } from '@nestjs/common';

export const DISTRICT_KEY = 'enforceDistrict';

/**
 * Enforces district isolation for the route.
 * The guard will verify the user's district matches the requested resource's district.
 */
export const EnforceDistrict = () => SetMetadata(DISTRICT_KEY, true);
