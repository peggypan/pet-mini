import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
export declare class PaymentController {
    private paymentService;
    constructor(paymentService: PaymentService);
    unifiedOrder(dto: CreatePaymentDto, req: any): Promise<{
        transactionNo: string;
        orderNo: any;
        payAmount: any;
        prepayId: string;
    }>;
    notify(body: any): Promise<{
        code: string;
        message: string;
    }>;
    refund(dto: any, req: any): Promise<{
        refundNo: string;
        amount: any;
    }>;
}
