import { Controller, Get, Query, UseGuards, Header } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @Roles('admin', 'supervisor', 'agent')
  async getDashboard() {
    return await this.reportsService.getDashboardStats();
  }

  @Get('calls')
  @Roles('admin', 'supervisor')
  async getCallReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return await this.reportsService.getCallReport(start, end);
  }

  @Get('queues/:queueId')
  @Roles('admin', 'supervisor')
  async getQueueReport(
    @Query('queueId') queueId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return await this.reportsService.getQueueReport(queueId, start, end);
  }

  @Get('trends')
  @Roles('admin', 'supervisor')
  async getCallTrends(
    @Query('period') period: 'hour' | 'day' | 'week' = 'hour',
    @Query('count') count?: string,
  ) {
    const countNum = count ? parseInt(count) : 24;
    return await this.reportsService.getCallTrends(period, countNum);
  }

  @Get('cdr/export')
  @Roles('admin', 'supervisor')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="cdr_export.csv"')
  async exportCDR(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('format') format: 'json' | 'csv' = 'csv',
  ) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    return await this.reportsService.exportCDR(start, end, format);
  }
}
