export declare class CreateMerchantDto {
    name: string;
    type: number;
    description?: string;
    contactName?: string;
    contactPhone?: string;
    businessLicense?: string;
    businessLicenseUrl?: string;
    qualificationUrls?: string[];
    district: string;
    address: string;
    longitude?: number;
    latitude?: number;
    businessHours?: any;
    serviceTypes?: number[];
}
