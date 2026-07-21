export class CreateIdleOrderDto {
  idleItemId: number;
  deliveryType: number;
  address?: string;
}

export class QueryIdleDto {
  categoryId?: number;
  district?: string;
  conditionLevel?: number;
  page?: number;
  pageSize?: number;
}
