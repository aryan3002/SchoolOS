import { google, calendar_v3, Auth } from 'googleapis';

export interface GoogleCalendarAuthConfig {
  clientEmail: string;
  privateKey: string;
  scopes?: string[];
}

/**
 * Thin wrapper around googleapis calendar client.
 */
export class GoogleCalendarClient {
  private readonly auth: Auth.JWT;

  constructor(config: GoogleCalendarAuthConfig) {
    this.auth = new google.auth.JWT(
      config.clientEmail,
      undefined,
      config.privateKey.replace(/\\n/g, '\n'),
      config.scopes ?? ['https://www.googleapis.com/auth/calendar.readonly'],
    );
  }

  calendar(): calendar_v3.Calendar {
    return google.calendar({ version: 'v3', auth: this.auth });
  }
}
