import {
  Controller,
  Get,
  Param,
  Patch,
  Delete,
  Query,
} from '@nestjs/common';
import { VoicemailService } from './voicemail.service';

@Controller('voicemail')
export class VoicemailController {
  constructor(private readonly voicemailService: VoicemailService) {}

  @Get('boxes/:extensionId/messages')
  async getMessages(
    @Param('extensionId') extensionId: string,
    @Query('isRead') isRead?: boolean,
  ) {
    const box = await this.voicemailService.findBoxByExtension(extensionId);
    if (!box) {
      return { data: [] };
    }

    const messages = await this.voicemailService.getMessages(box.id, isRead);
    return { data: messages };
  }

  @Get('messages/:id')
  async getMessage(@Param('id') id: string) {
    return await this.voicemailService.getMessage(id);
  }

  @Patch('messages/:id/read')
  async markAsRead(@Param('id') id: string) {
    return await this.voicemailService.markAsRead(id);
  }

  @Delete('messages/:id')
  async deleteMessage(@Param('id') id: string) {
    await this.voicemailService.deleteMessage(id);
    return { message: 'Voicemail deleted successfully' };
  }
}
