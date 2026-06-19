import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('health')
  health(): { status: string; ts: number } {
    return { status: 'ok', ts: Date.now() };
  }
}
