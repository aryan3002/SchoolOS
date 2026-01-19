import { PrismaClient } from '@prisma/client';
import { Logger } from '../../types';
import type { SISConnector, SISCredentials, Vendor } from '../interfaces';
export declare class SISConnectorFactory {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaClient, logger: Logger);
    create(vendor: Vendor, credentials: SISCredentials): SISConnector;
}
export { PowerSchoolConnector } from './powerschool/powerschool.connector';
export { SkywardConnector } from './skyward/skyward.connector';
//# sourceMappingURL=index.d.ts.map