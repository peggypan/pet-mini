import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
export declare class AuthService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    wxLogin(code: string): Promise<{
        token: string;
        user: {
            id: number;
            nickname: string;
            avatarUrl: string;
        };
    }>;
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
}
