import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import { CalendarSyncRequestDto, SisSyncRequestDto } from './dto';
import { IntegrationsService } from './integrations.service';

@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Post('sis/sync')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async triggerSisSync(@Body() body: SisSyncRequestDto): Promise<{ scheduled: boolean }> {
    await this.integrationsService.triggerSisSync(body);
    return { scheduled: true };
  }

  @Get('sis/status/:districtId')
  async getStatus(
    @Param('districtId') districtId: string,
  ): Promise<{ lastSync?: string; queueEnabled: boolean }> {
    return this.integrationsService.getSyncStatus(districtId);
  }

  @Post('calendar/sync')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async syncCalendar(@Body() body: CalendarSyncRequestDto) {
    const events = await this.integrationsService.syncCalendar(body);
    return { events };
  }

  @Get('health')
  async health() {
    return this.integrationsService.health();
  }
}
