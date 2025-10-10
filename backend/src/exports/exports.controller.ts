import { Body, Controller, Post } from '@nestjs/common';
import { ExportsService } from './exports.service';
import { ExportBacklogDto } from './dto/export-backlog.dto';

@Controller('exports')
export class ExportsController {
  constructor(private readonly exportsService: ExportsService) {}

  @Post('backlog')
  exportBacklog(@Body() payload: ExportBacklogDto) {
    return this.exportsService.exportBacklog(payload);
  }
}
