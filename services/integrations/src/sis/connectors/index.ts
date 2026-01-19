import { PrismaClient } from '@prisma/client';

import { Logger } from '../../types';
import type { SISConnector, SISCredentials, Vendor } from '../interfaces';
import { PowerSchoolConnector } from './powerschool/powerschool.connector';
import { SkywardConnector } from './skyward/skyward.connector';

export class SISConnectorFactory {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly logger: Logger,
  ) {}

  create(vendor: Vendor, credentials: SISCredentials): SISConnector {
    switch (vendor) {
      case 'powerschool':
        return new PowerSchoolConnector(credentials, this.prisma, this.logger);
      case 'skyward':
        return new SkywardConnector(credentials, this.prisma, this.logger);
      default:
        throw new Error(`Unsupported SIS vendor: ${vendor}`);
    }
  }
}

export { PowerSchoolConnector } from './powerschool/powerschool.connector';
export { SkywardConnector } from './skyward/skyward.connector';
