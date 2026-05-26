export declare class CreatePetDto {
    name: string;
    species: number;
    breedName?: string;
    gender?: number;
    birthday?: string;
    weight?: number;
    color?: string;
    isSterilized?: boolean;
    microchip?: string;
    remark?: string;
}
export declare class CreateHealthRecordDto {
    petId: number;
    recordType: number;
    itemName: string;
    itemBrand?: string;
    itemBatch?: string;
    doneAt: string;
    validUntil?: string;
    clinicName?: string;
    doctorName?: string;
    cost?: number;
    photos?: string[];
    remark?: string;
    remindBefore?: number;
}
