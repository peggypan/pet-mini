export class CreateServiceOrderDto {
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

export class QueryServiceDto {
  categoryId?: number;
  district?: string;
  sort?: string;
  page?: number;
  pageSize?: number;
}
