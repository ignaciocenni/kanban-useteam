import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ExportBacklogDto } from './dto/export-backlog.dto';

@Injectable()
export class ExportsService {
  private readonly logger = new Logger(ExportsService.name);

  constructor(private readonly configService: ConfigService) {}

  async exportBacklog(payload: ExportBacklogDto) {
    const webhookUrl = this.configService.get<string>('N8N_WEBHOOK_URL');

    if (!webhookUrl) {
      this.logger.error('N8N_WEBHOOK_URL is not configured');
      throw new InternalServerErrorException('Export service not configured');
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        this.logger.error(`Export webhook failed: ${response.status} - ${text}`);
        throw new InternalServerErrorException('Failed to trigger export workflow');
      }

      const data = await response.json().catch(() => undefined);

      return {
        success: true,
        message: 'Export workflow triggered successfully',
        data,
      };
    } catch (error) {
      this.logger.error('Error triggering export workflow', error instanceof Error ? error.stack : error);
      throw new InternalServerErrorException('Failed to trigger export workflow');
    }
  }
}
