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
