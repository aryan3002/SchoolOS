import { IsDateString, IsIn, IsOptional, IsString, IsUUID, IsUrl } from 'class-validator';

export class SisSyncRequestDto {
  @IsUUID()
  districtId!: string;

  @IsIn(['full', 'incremental'])
  syncType!: 'full' | 'incremental';
}

export class CalendarSyncRequestDto {
  @IsString()
  calendarId!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsOptional()
  @IsIn(['google', 'ical'])
  provider?: 'google' | 'ical';

  @IsOptional()
  @IsUrl()
  icalUrl?: string;
}
