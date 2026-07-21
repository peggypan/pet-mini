"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('开始初始化数据...');
    const user = await prisma.user.create({
        data: {
            openid: 'wx_test_user_1',
            nickname: '测试用户',
            phone: '13800138000',
            city: '北京市',
            district: '朝阳区',
        },
    });
    const merchant = await prisma.merchant.create({
        data: {
            userId: user.id,
            name: '宠爱有家宠物店',
            type: 1,
            description: '专业宠物洗护、美容、寄养服务',
            district: '朝阳区',
            address: '朝阳区建国路88号',
            rating: 4.8,
            status: 1,
        },
    });
    const services = await prisma.service.createMany({
        data: [
            {
                merchantId: merchant.id,
                categoryId: 1,
                name: '上门宠物洗护',
                subtitle: '专业洗护师上门，全套洗护服务',
                description: '包含洗澡、吹干、梳毛、剪指甲、清理耳朵等全套服务。使用进口宠物专用洗护产品，温和不刺激。',
                price: 128,
                unit: '次',
                duration: 90,
                status: 1,
            },
            {
                merchantId: merchant.id,
                categoryId: 1,
                name: '宠物美容造型',
                subtitle: '精修剪毛，打造萌宠造型',
                description: '专业美容师根据宠物品种特点，打造专属造型。包含洗澡、剪毛、造型、护理等。',
                price: 188,
                unit: '次',
                duration: 120,
                status: 1,
            },
            {
                merchantId: merchant.id,
                categoryId: 4,
                name: '上门遛狗服务',
                subtitle: '专业遛狗师，30分钟户外遛弯',
                description: '专业遛狗师上门接送，30分钟户外遛弯，途中清理粪便，确保狗狗安全。',
                price: 68,
                unit: '次',
                duration: 30,
                status: 1,
            },
            {
                merchantId: merchant.id,
                categoryId: 3,
                name: '宠物寄养',
                subtitle: '24小时专人看护，每日遛弯3次',
                description: '独立房间，24小时监控，每日遛弯3次，定时喂食，每日发送宠物状态视频。',
                price: 98,
                unit: '天',
                duration: 1440,
                status: 1,
            },
        ],
    });
    const idleItems = await prisma.idleItem.createMany({
        data: [
            {
                userId: user.id,
                categoryId: 1,
                title: '皇家猫粮 2kg 全新未拆封',
                description: '自家猫咪换粮了，之前囤的皇家猫粮全新未拆封，保质期到2026年。',
                images: '',
                price: 168,
                originalPrice: 238,
                conditionLevel: 1,
                district: '朝阳区',
                status: 1,
            },
            {
                userId: user.id,
                categoryId: 5,
                title: '猫咪玩具套装 9成新',
                description: '包含逗猫棒、猫抓板、毛绒球等，猫咪不太爱玩，基本全新。',
                images: '',
                price: 45,
                originalPrice: 89,
                conditionLevel: 2,
                district: '海淀区',
                status: 1,
            },
            {
                userId: user.id,
                categoryId: 2,
                title: '宠物航空箱 中号',
                description: '用过两次，适合15斤以下猫咪或小型犬，带隔尿垫。',
                images: '',
                price: 80,
                originalPrice: 159,
                conditionLevel: 3,
                district: '西城区',
                status: 1,
            },
        ],
    });
    await prisma.banner.createMany({
        data: [
            { title: '新用户专享', imageUrl: 'https://via.placeholder.com/750x300/FF8C42/FFFFFF?text=新用户专享', linkType: 1, sortOrder: 1 },
            { title: '上门洗护特惠', imageUrl: 'https://via.placeholder.com/750x300/4ECDC4/FFFFFF?text=上门洗护特惠', linkType: 1, sortOrder: 2 },
            { title: '闲置好物', imageUrl: 'https://via.placeholder.com/750x300/FFD93D/333333?text=闲置好物', linkType: 1, sortOrder: 3 },
        ],
    });
    console.log('数据初始化完成！');
    console.log('测试用户ID:', user.id);
    console.log('测试商家ID:', merchant.id);
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map