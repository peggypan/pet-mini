export class CreateAddressDto {
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
