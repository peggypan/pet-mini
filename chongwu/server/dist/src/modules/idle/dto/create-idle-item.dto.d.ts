export declare class CreateIdleItemDto {
    categoryId: number;
    title: string;
    description: string;
    images?: string[];
    price: number;
    originalPrice?: number;
    conditionLevel: number;
    usageDesc?: string;
    tradeType: number;
    location?: string;
    district?: string;
    longitude?: number;
    latitude?: number;
}
export declare class CreateIdleOrderDto {
    idleItemId: number;
    deliveryType: number;
    address?: string;
}
export declare class QueryIdleDto {
    categoryId?: number;
    district?: string;
    conditionLevel?: number;
    page?: number;
    pageSize?: number;
}
