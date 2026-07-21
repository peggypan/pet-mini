import { IdleService } from './idle.service';
import { CreateIdleItemDto } from './dto/create-idle-item.dto';
import { CreateIdleOrderDto } from './dto/create-idle-order.dto';
import { QueryIdleDto } from './dto/query-idle.dto';
export declare class IdleController {
    private idleService;
    constructor(idleService: IdleService);
    getCategories(): Promise<{
        id: number;
        name: string;
    }[]>;
    findAll(query: QueryIdleDto): Promise<{
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
    findOne(id: string): Promise<{
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
    create(dto: CreateIdleItemDto, req: any): Promise<{
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
    createOrder(dto: CreateIdleOrderDto, req: any): Promise<{
        orderNo: string;
        payAmount: number;
    }>;
    getMyOrders(req: any): Promise<{
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
    payOrder(id: string, req: any): Promise<{
        success: boolean;
    }>;
    confirmReceive(id: string, req: any): Promise<{
        success: boolean;
    }>;
}
