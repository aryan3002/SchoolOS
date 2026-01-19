"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkywardConnector = exports.PowerSchoolConnector = exports.SISConnectorFactory = void 0;
const powerschool_connector_1 = require("./powerschool/powerschool.connector");
const skyward_connector_1 = require("./skyward/skyward.connector");
class SISConnectorFactory {
    prisma;
    logger;
    constructor(prisma, logger) {
        this.prisma = prisma;
        this.logger = logger;
    }
    create(vendor, credentials) {
        switch (vendor) {
            case 'powerschool':
                return new powerschool_connector_1.PowerSchoolConnector(credentials, this.prisma, this.logger);
            case 'skyward':
                return new skyward_connector_1.SkywardConnector(credentials, this.prisma, this.logger);
            default:
                throw new Error(`Unsupported SIS vendor: ${vendor}`);
        }
    }
}
exports.SISConnectorFactory = SISConnectorFactory;
var powerschool_connector_2 = require("./powerschool/powerschool.connector");
Object.defineProperty(exports, "PowerSchoolConnector", { enumerable: true, get: function () { return powerschool_connector_2.PowerSchoolConnector; } });
var skyward_connector_2 = require("./skyward/skyward.connector");
Object.defineProperty(exports, "SkywardConnector", { enumerable: true, get: function () { return skyward_connector_2.SkywardConnector; } });
//# sourceMappingURL=index.js.map