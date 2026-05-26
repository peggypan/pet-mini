import { AuthService } from './auth.service';
import { WxLoginDto } from './dto/wx-login.dto';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    wxLogin(dto: WxLoginDto): Promise<{
        token: string;
        user: {
            id: number;
            nickname: string;
            avatarUrl: string;
        };
    }>;
    getProfile(req: any): Promise<{
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
