import { PrismaService } from '../../prisma/prisma.service';
export declare class ServiceService {
    private prisma;
    constructor(prisma: PrismaService);
    getCategories(): Promise<{
        id: number;
        name: string;
    }[]>;
    findAll(query: any): Promise<{
        list: ({
            merchant: {
                district: string;
                address: string;
                id: number;
                name: string;
                logoUrl: string;
                rating: number;
            };
        } & {
            status: number;
            createdAt: Date;
            updatedAt: Date;
            id: number;
            name: string;
            description: string | null;
            rating: number;
            reviewCount: number;
            merchantId: number;
            categoryId: number;
            subtitle: string | null;
            coverUrls: string;
            detailImages: string;
            price: number;
            originalPrice: number | null;
            unit: string;
            duration: number | null;
            serviceArea: string | null;
            needAddress: boolean;
            needAppointment: boolean;
            availableTimes: string | null;
            salesCount: number;
            sortOrder: number;
        })[];
        pagination: {
            page: number;
            pageSize: number;
            total: number;
            totalPages: number;
        };
    }>;
    findOne(id: number): Promise<{
        merchant: {
            district: string;
            address: string;
            id: number;
            name: string;
            logoUrl: string;
            businessHours: string;
            rating: number;
            reviewCount: number;
        };
    } & {
        status: number;
        createdAt: Date;
        updatedAt: Date;
        id: number;
        name: string;
        description: string | null;
        rating: number;
        reviewCount: number;
        merchantId: number;
        categoryId: number;
        subtitle: string | null;
        coverUrls: string;
        detailImages: string;
        price: number;
        originalPrice: number | null;
        unit: string;
        duration: number | null;
        serviceArea: string | null;
        needAddress: boolean;
        needAppointment: boolean;
        availableTimes: string | null;
        salesCount: number;
        sortOrder: number;
    }>;
    createOrder(userId: number, dto: any): Promise<{
        orderNo: string;
        payAmount: number;
    }>;
    getMyOrders(userId: number): Promise<({
        merchant: {
            name: string;
            logoUrl: string;
        };
        service: {
            name: string;
        };
    } & {
        address: string | null;
        status: number;
        createdAt: Date;
        updatedAt: Date;
        id: number;
        contactName: string | null;
        contactPhone: string | null;
        longitude: number | null;
        latitude: number | null;
        userId: number;
        merchantId: number;
        orderNo: string;
        serviceName: string | null;
        servicePrice: number | null;
        quantity: number;
        totalAmount: number;
        discountAmount: number;
        payAmount: number;
        platformFee: number;
        merchantAmount: number;
        couponId: number | null;
        couponAmount: number;
        petId: number | null;
        addressId: number | null;
        appointmentDate: string | null;
        appointmentTime: string | null;
        remark: string | null;
        merchantRemark: string | null;
        paidAt: Date | null;
        acceptedAt: Date | null;
        startedAt: Date | null;
        completedAt: Date | null;
        cancelledAt: Date | null;
        cancelReason: string | null;
        refundAmount: number | null;
        refundReason: string | null;
        refundAt: Date | null;
        serviceId: number;
    })[]>;
    cancelOrder(userId: number, orderId: number): Promise<{
        success: boolean;
    }>;
}
