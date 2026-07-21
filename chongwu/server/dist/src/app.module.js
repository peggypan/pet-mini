"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const auth_module_1 = require("./modules/auth/auth.module");
const user_module_1 = require("./modules/user/user.module");
const merchant_module_1 = require("./modules/merchant/merchant.module");
const service_module_1 = require("./modules/service/service.module");
const health_module_1 = require("./modules/health/health.module");
const idle_module_1 = require("./modules/idle/idle.module");
const payment_module_1 = require("./modules/payment/payment.module");
const admin_module_1 = require("./modules/admin/admin.module");
const common_module_1 = require("./modules/common/common.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            common_module_1.CommonModule,
            auth_module_1.AuthModule,
            user_module_1.UserModule,
            merchant_module_1.MerchantModule,
            service_module_1.ServiceModule,
            health_module_1.HealthModule,
            idle_module_1.IdleModule,
            payment_module_1.PaymentModule,
            admin_module_1.AdminModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map