import { Module } from '@nestjs/common';
import { IdleController } from './idle.controller';
import { IdleService } from './idle.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [IdleController],
  providers: [IdleService, PrismaService],
})
export class IdleModule {}
