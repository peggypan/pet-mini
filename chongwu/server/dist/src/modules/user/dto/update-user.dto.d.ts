export declare class UpdateUserDto {
    nickname?: string;
    avatarUrl?: string;
    phone?: string;
    gender?: number;
    birthday?: string;
    city?: string;
    district?: string;
    address?: string;
}
export declare class CreateAddressDto {
    contactName: string;
    contactPhone: string;
    province: string;
    city: string;
    district: string;
    detail: string;
    longitude?: number;
    latitude?: number;
    isDefault?: boolean;
    tag?: string;
}
