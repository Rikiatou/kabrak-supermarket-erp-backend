export class CreatePurchaseOrderItemDto {
  productId: string;
  quantity: number;
  unitCost: number;
}

export class CreatePurchaseOrderDto {
  supplierId: string;
  expectedDate: string;
  notes?: string;
  items: CreatePurchaseOrderItemDto[];
}
