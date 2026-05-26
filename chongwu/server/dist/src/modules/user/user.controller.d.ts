import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAddressDto } from './dto/create-address.dto';
export declare class UserController {
    private userService;
    constructor(userService: UserService);
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
    updateProfile(dto: UpdateUserDto, req: any): Promise<{
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
    createAddress(dto: CreateAddressDto, req: any): Promise<{
        success: boolean;
    }>;
    getAddresses(req: any): Promise<{
        detail: string;
    }[]>;
}
