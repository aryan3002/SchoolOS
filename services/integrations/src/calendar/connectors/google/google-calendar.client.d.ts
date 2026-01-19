import { calendar_v3 } from 'googleapis';
export interface GoogleCalendarAuthConfig {
    clientEmail: string;
    privateKey: string;
    scopes?: string[];
}
/**
 * Thin wrapper around googleapis calendar client.
 */
export declare class GoogleCalendarClient {
    private readonly auth;
    constructor(config: GoogleCalendarAuthConfig);
    calendar(): calendar_v3.Calendar;
}
//# sourceMappingURL=google-calendar.client.d.ts.map