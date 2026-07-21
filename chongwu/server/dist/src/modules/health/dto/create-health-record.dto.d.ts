export declare class CreateHealthRecordDto {
    petId: number;
    recordType: number;
    itemName: string;
    itemBrand?: string;
    doneAt: string;
    validUntil?: string;
    clinicName?: string;
    cost?: number;
    photos?: string[];
    remark?: string;
    remindBefore?: number;
}
