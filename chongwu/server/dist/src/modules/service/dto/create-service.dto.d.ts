export declare class CreateServiceDto {
    name: string;
    categoryId: number;
    price: number;
}
export declare class QueryServiceDto {
    categoryId?: number;
    district?: string;
    sort?: string;
    page?: number;
    pageSize?: number;
}
export declare class CreateServiceOrderDto {
    serviceId: number;
    quantity?: number;
    petId?: number;
    contactName: string;
    contactPhone: string;
    addressId?: number;
    address?: string;
    appointmentDate?: string;
    appointmentTime?: string;
    remark?: string;
}
