import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: '欠薪支持起诉智能办案平台（检察端）',
      version: '1.0.0',
    };
  }
}
