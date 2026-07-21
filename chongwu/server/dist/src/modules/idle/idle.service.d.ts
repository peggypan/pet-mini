import { PrismaService } from '../../prisma/prisma.service';
export declare class IdleService {
    private prisma;
    constructor(prisma: PrismaService);
    getCategories(): Promise<{
        id: number;
        name: string;
    }[]>;
    findAll(query: any): Promise<{
        list: ({
            user: {
                nickname: string;
                avatarUrl: string;
                id: number;
            };
        } & {
            district: string | null;
            status: number;
            createdAt: Date;
            updatedAt: Date;
            id: number;
            description: string;
            longitude: number | null;
            latitude: number | null;
            userId: number;
            categoryId: number;
            price: number;
            originalPrice: number | null;
            title: string;
            images: string;
            conditionLevel: number;
            usageDesc: string | null;
            tradeType: number;
            location: string | null;
            viewCount: number;
            collectCount: number;
            isTop: boolean;
            topExpireAt: Date | null;
            soldAt: Date | null;
        })[];
        pagination: {
            page: number;
            pageSize: number;
            total: number;
            totalPages: number;
        };
    }>;
    findOne(id: number): Promise<{
        user: {
            nickname: string;
            avatarUrl: string;
            city: string;
            district: string;
            id: number;
        };
    } & {
        district: string | null;
        status: number;
        createdAt: Date;
        updatedAt: Date;
        id: number;
        description: string;
        longitude: number | null;
        latitude: number | null;
        userId: number;
        categoryId: number;
        price: number;
        originalPrice: number | null;
        title: string;
        images: string;
        conditionLevel: number;
        usageDesc: string | null;
        tradeType: number;
        location: string | null;
        viewCount: number;
        collectCount: number;
        isTop: boolean;
        topExpireAt: Date | null;
        soldAt: Date | null;
    }>;
    create(userId: number, dto: any): Promise<{
        district: string | null;
        status: number;
        createdAt: Date;
        updatedAt: Date;
        id: number;
        description: string;
        longitude: number | null;
        latitude: number | null;
        userId: number;
        categoryId: number;
        price: number;
        originalPrice: number | null;
        title: string;
        images: string;
        conditionLevel: number;
        usageDesc: string | null;
        tradeType: number;
        location: string | null;
        viewCount: number;
        collectCount: number;
        isTop: boolean;
        topExpireAt: Date | null;
        soldAt: Date | null;
    }>;
    createOrder(userId: number, dto: any): Promise<{
        orderNo: string;
        payAmount: number;
    }>;
    getMyOrders(userId: number): Promise<{
        buyOrders: ({
            idleItem: {
                title: string;
                images: string;
            };
        } & {
            address: string | null;
            status: number;
            createdAt: Date;
            updatedAt: Date;
            id: number;
            orderNo: string;
            totalAmount: number;
            payAmount: number;
            platformFee: number;
            paidAt: Date | null;
            completedAt: Date | null;
            refundReason: string | null;
            refundAt: Date | null;
            buyerId: number;
            sellerId: number;
            itemTitle: string | null;
            itemPrice: number | null;
            sellerAmount: number;
            deliveryType: number;
            trackingNo: string | null;
            shippedAt: Date | null;
            receivedAt: Date | null;
            idleItemId: number;
        })[];
        sellOrders: ({
            idleItem: {
                title: string;
                images: string;
            };
        } & {
            address: string | null;
            status: number;
            createdAt: Date;
            updatedAt: Date;
            id: number;
            orderNo: string;
            totalAmount: number;
            payAmount: number;
            platformFee: number;
            paidAt: Date | null;
            completedAt: Date | null;
            refundReason: string | null;
            refundAt: Date | null;
            buyerId: number;
            sellerId: number;
            itemTitle: string | null;
            itemPrice: number | null;
            sellerAmount: number;
            deliveryType: number;
            trackingNo: string | null;
            shippedAt: Date | null;
            receivedAt: Date | null;
            idleItemId: number;
        })[];
    }>;
    payOrder(userId: number, orderId: number): Promise<{
        success: boolean;
    }>;
    confirmReceive(userId: number, orderId: number): Promise<{
        success: boolean;
    }>;
}
