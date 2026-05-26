import { PrismaService } from '../../prisma/prisma.service';
export declare class UserService {
    private prisma;
    constructor(prisma: PrismaService);
    getProfile(userId: number): Promise<{
        pets: {
            gender: number | null;
            birthday: string | null;
            status: number;
            createdAt: Date;
            updatedAt: Date;
            id: number;
            name: string;
            userId: number;
            remark: string | null;
            species: number;
            breedName: string | null;
            weight: number | null;
            color: string | null;
            isSterilized: boolean;
            microchip: string | null;
        }[];
    } & {
        openid: string;
        nickname: string | null;
        avatarUrl: string | null;
        phone: string | null;
        realName: string | null;
        gender: number | null;
        birthday: string | null;
        city: string | null;
        district: string | null;
        address: string | null;
        status: number;
        lastLoginAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        id: number;
    }>;
    updateProfile(userId: number, dto: any): Promise<{
        openid: string;
        nickname: string | null;
        avatarUrl: string | null;
        phone: string | null;
        realName: string | null;
        gender: number | null;
        birthday: string | null;
        city: string | null;
        district: string | null;
        address: string | null;
        status: number;
        lastLoginAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
        id: number;
    }>;
    createAddress(userId: number, dto: any): Promise<{
        success: boolean;
    }>;
    getAddresses(userId: number): Promise<{
        detail: string;
    }[]>;
}
