import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ProvasController } from './provas.controller';
import { ProvasService } from './provas.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { SettingsModule } from '../settings/settings.module';
import { memoryStorage } from 'multer';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    SettingsModule,
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [ProvasController],
  providers: [ProvasService],
  exports: [ProvasService],
})
export class ProvasModule {}
