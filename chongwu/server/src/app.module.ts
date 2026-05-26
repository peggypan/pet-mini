import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { MerchantModule } from './modules/merchant/merchant.module';
import { ServiceModule } from './modules/service/service.module';
import { HealthModule } from './modules/health/health.module';
import { IdleModule } from './modules/idle/idle.module';
import { PaymentModule } from './modules/payment/payment.module';
import { AdminModule } from './modules/admin/admin.module';
import { CommonModule } from './modules/common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,
    AuthModule,
    UserModule,
    MerchantModule,
    ServiceModule,
    HealthModule,
    IdleModule,
    PaymentModule,
    AdminModule,
  ],
})
export class AppModule {}
