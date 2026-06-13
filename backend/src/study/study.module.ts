import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StudyController } from './study.controller';
import { StudyService } from './study.service';

@Module({
  imports: [AuthModule],
  controllers: [StudyController],
  providers: [StudyService],
})
export class StudyModule {}
