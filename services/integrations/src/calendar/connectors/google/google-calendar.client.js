"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleCalendarClient = void 0;
const googleapis_1 = require("googleapis");
/**
 * Thin wrapper around googleapis calendar client.
 */
class GoogleCalendarClient {
    auth;
    constructor(config) {
        this.auth = new googleapis_1.google.auth.JWT(config.clientEmail, undefined, config.privateKey.replace(/\\n/g, '\n'), config.scopes ?? ['https://www.googleapis.com/auth/calendar.readonly']);
    }
    calendar() {
        return googleapis_1.google.calendar({ version: 'v3', auth: this.auth });
    }
}
exports.GoogleCalendarClient = GoogleCalendarClient;
//# sourceMappingURL=google-calendar.client.js.map