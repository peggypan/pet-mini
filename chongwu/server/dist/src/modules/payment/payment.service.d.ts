import { PrismaService } from '../../prisma/prisma.service';
export declare class PaymentService {
    private prisma;
    constructor(prisma: PrismaService);
    unifiedOrder(userId: number, dto: any): Promise<{
        transactionNo: string;
        orderNo: any;
        payAmount: any;
        prepayId: string;
    }>;
    handleNotify(body: any): Promise<{
        code: string;
        message: string;
    }>;
    refund(userId: number, dto: any): Promise<{
        refundNo: string;
        amount: any;
    }>;
}
