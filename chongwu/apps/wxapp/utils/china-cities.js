/** 全国省市区 · 地级市（含直辖市），用于城市选择与定位匹配 */

const HOT_CITIES = [
  '北京', '上海', '广州', '深圳', '杭州', '成都', '重庆', '武汉', '西安', '南京',
  '苏州', '天津', '郑州', '长沙', '青岛', '厦门', '宁波', '无锡', '佛山', '东莞',
  '合肥', '福州', '济南', '沈阳', '大连', '昆明', '南宁', '哈尔滨', '长春', '石家庄',
];

const PROVINCE_CITIES = [
  { province: '北京市', cities: [{ name: '北京', lat: 39.9042, lng: 116.4074 }] },
  { province: '天津市', cities: [{ name: '天津', lat: 39.0842, lng: 117.2009 }] },
  { province: '上海市', cities: [{ name: '上海', lat: 31.2304, lng: 121.4737 }] },
  { province: '重庆市', cities: [{ name: '重庆', lat: 29.5630, lng: 106.5516 }] },
  { province: '河北省', cities: [
    { name: '石家庄', lat: 38.0428, lng: 114.5149 }, { name: '唐山', lat: 39.6309, lng: 118.1802 },
    { name: '秦皇岛', lat: 39.9354, lng: 119.6005 }, { name: '邯郸', lat: 36.6256, lng: 114.5391 },
    { name: '邢台', lat: 37.0682, lng: 114.5049 }, { name: '保定', lat: 38.8739, lng: 115.4646 },
    { name: '张家口', lat: 40.8244, lng: 114.8875 }, { name: '承德', lat: 40.9515, lng: 117.9634 },
    { name: '沧州', lat: 38.3045, lng: 116.8388 }, { name: '廊坊', lat: 39.5380, lng: 116.6838 },
    { name: '衡水', lat: 37.7389, lng: 115.6708 },
  ]},
  { province: '山西省', cities: [
    { name: '太原', lat: 37.8706, lng: 112.5489 }, { name: '大同', lat: 40.0768, lng: 113.3001 },
    { name: '阳泉', lat: 37.8570, lng: 113.5833 }, { name: '长治', lat: 36.1954, lng: 113.1163 },
    { name: '晋城', lat: 35.4907, lng: 112.8513 }, { name: '朔州', lat: 39.3316, lng: 112.4328 },
    { name: '晋中', lat: 37.6870, lng: 112.7536 }, { name: '运城', lat: 35.0264, lng: 111.0075 },
    { name: '忻州', lat: 38.4167, lng: 112.7341 }, { name: '临汾', lat: 36.0880, lng: 111.5189 },
    { name: '吕梁', lat: 37.5183, lng: 111.1344 },
  ]},
  { province: '内蒙古自治区', cities: [
    { name: '呼和浩特', lat: 40.8426, lng: 111.7492 }, { name: '包头', lat: 40.6574, lng: 109.8403 },
    { name: '乌海', lat: 39.6554, lng: 106.7942 }, { name: '赤峰', lat: 42.2578, lng: 118.8869 },
    { name: '通辽', lat: 43.6174, lng: 122.2637 }, { name: '鄂尔多斯', lat: 39.6086, lng: 109.7810 },
    { name: '呼伦贝尔', lat: 49.2153, lng: 119.7658 }, { name: '巴彦淖尔', lat: 40.7574, lng: 107.4167 },
    { name: '乌兰察布', lat: 40.9948, lng: 113.1328 }, { name: '兴安盟', lat: 46.0763, lng: 122.0703 },
    { name: '锡林郭勒', lat: 43.9333, lng: 116.0476 }, { name: '阿拉善', lat: 38.8519, lng: 105.7289 },
  ]},
  { province: '辽宁省', cities: [
    { name: '沈阳', lat: 41.8057, lng: 123.4315 }, { name: '大连', lat: 38.9140, lng: 121.6147 },
    { name: '鞍山', lat: 41.1087, lng: 122.9945 }, { name: '抚顺', lat: 41.8801, lng: 123.9572 },
    { name: '本溪', lat: 41.2944, lng: 123.7669 }, { name: '丹东', lat: 40.0005, lng: 124.3544 },
    { name: '锦州', lat: 41.0951, lng: 121.1270 }, { name: '营口', lat: 40.6670, lng: 122.2352 },
    { name: '阜新', lat: 42.0216, lng: 121.6703 }, { name: '辽阳', lat: 41.2694, lng: 123.2369 },
    { name: '盘锦', lat: 41.1198, lng: 122.0707 }, { name: '铁岭', lat: 42.2237, lng: 123.7260 },
    { name: '朝阳', lat: 41.5718, lng: 120.4506 }, { name: '葫芦岛', lat: 40.7110, lng: 120.8369 },
  ]},
  { province: '吉林省', cities: [
    { name: '长春', lat: 43.8171, lng: 125.3235 }, { name: '吉林', lat: 43.8378, lng: 126.5496 },
    { name: '四平', lat: 43.1664, lng: 124.3505 }, { name: '辽源', lat: 42.8879, lng: 125.1437 },
    { name: '通化', lat: 41.7285, lng: 125.9397 }, { name: '白山', lat: 41.9430, lng: 126.4236 },
    { name: '松原', lat: 45.1411, lng: 124.8253 }, { name: '白城', lat: 45.6196, lng: 122.8387 },
    { name: '延边', lat: 42.8913, lng: 129.5091 },
  ]},
  { province: '黑龙江省', cities: [
    { name: '哈尔滨', lat: 45.8038, lng: 126.5349 }, { name: '齐齐哈尔', lat: 47.3543, lng: 123.9180 },
    { name: '鸡西', lat: 45.2951, lng: 130.9693 }, { name: '鹤岗', lat: 47.3321, lng: 130.2979 },
    { name: '双鸭山', lat: 46.6465, lng: 131.1591 }, { name: '大庆', lat: 46.5907, lng: 125.1038 },
    { name: '伊春', lat: 47.7275, lng: 128.8994 }, { name: '佳木斯', lat: 46.8096, lng: 130.3188 },
    { name: '七台河', lat: 45.7712, lng: 131.0031 }, { name: '牡丹江', lat: 44.5517, lng: 129.6332 },
    { name: '黑河', lat: 50.2450, lng: 127.4990 }, { name: '绥化', lat: 46.6374, lng: 126.9929 },
    { name: '大兴安岭', lat: 52.3353, lng: 124.7115 },
  ]},
  { province: '江苏省', cities: [
    { name: '南京', lat: 32.0603, lng: 118.7969 }, { name: '无锡', lat: 31.4912, lng: 120.3124 },
    { name: '徐州', lat: 34.2044, lng: 117.2857 }, { name: '常州', lat: 31.8112, lng: 119.9740 },
    { name: '苏州', lat: 31.2989, lng: 120.5853 }, { name: '南通', lat: 31.9802, lng: 120.8943 },
    { name: '连云港', lat: 34.5967, lng: 119.2216 }, { name: '淮安', lat: 33.6104, lng: 119.0153 },
    { name: '盐城', lat: 33.3474, lng: 120.1636 }, { name: '扬州', lat: 32.3945, lng: 119.4129 },
    { name: '镇江', lat: 32.1878, lng: 119.4250 }, { name: '泰州', lat: 32.4558, lng: 119.9255 },
    { name: '宿迁', lat: 33.9630, lng: 118.2752 },
  ]},
  { province: '浙江省', cities: [
    { name: '杭州', lat: 30.2741, lng: 120.1551 }, { name: '宁波', lat: 29.8683, lng: 121.5440 },
    { name: '温州', lat: 27.9949, lng: 120.6994 }, { name: '嘉兴', lat: 30.7461, lng: 120.7555 },
    { name: '湖州', lat: 30.8930, lng: 120.0880 }, { name: '绍兴', lat: 30.0303, lng: 120.5820 },
    { name: '金华', lat: 29.0790, lng: 119.6474 }, { name: '衢州', lat: 28.9417, lng: 118.8743 },
    { name: '舟山', lat: 29.9853, lng: 122.2072 }, { name: '台州', lat: 28.6564, lng: 121.4206 },
    { name: '丽水', lat: 28.4676, lng: 119.9229 },
  ]},
  { province: '安徽省', cities: [
    { name: '合肥', lat: 31.8206, lng: 117.2272 }, { name: '芜湖', lat: 31.3529, lng: 118.4331 },
    { name: '蚌埠', lat: 32.9164, lng: 117.3889 }, { name: '淮南', lat: 32.6255, lng: 116.9998 },
    { name: '马鞍山', lat: 31.6705, lng: 118.5061 }, { name: '淮北', lat: 33.9558, lng: 116.7983 },
    { name: '铜陵', lat: 30.9454, lng: 117.8121 }, { name: '安庆', lat: 30.5435, lng: 117.0634 },
    { name: '黄山', lat: 29.7147, lng: 118.3375 }, { name: '滁州', lat: 32.3018, lng: 118.3171 },
    { name: '阜阳', lat: 32.8901, lng: 115.8142 }, { name: '宿州', lat: 33.6464, lng: 116.9641 },
    { name: '六安', lat: 31.7337, lng: 116.5219 }, { name: '亳州', lat: 33.8446, lng: 115.7789 },
    { name: '池州', lat: 30.6640, lng: 117.4916 }, { name: '宣城', lat: 30.9407, lng: 118.7588 },
  ]},
  { province: '福建省', cities: [
    { name: '福州', lat: 26.0745, lng: 119.2965 }, { name: '厦门', lat: 24.4798, lng: 118.0894 },
    { name: '莆田', lat: 25.4541, lng: 119.0078 }, { name: '三明', lat: 26.2654, lng: 117.6389 },
    { name: '泉州', lat: 24.8741, lng: 118.6757 }, { name: '漳州', lat: 24.5130, lng: 117.6471 },
    { name: '南平', lat: 26.6415, lng: 118.1777 }, { name: '龙岩', lat: 25.0751, lng: 117.0170 },
    { name: '宁德', lat: 26.6656, lng: 119.5479 },
  ]},
  { province: '江西省', cities: [
    { name: '南昌', lat: 28.6820, lng: 115.8579 }, { name: '景德镇', lat: 29.2687, lng: 117.1784 },
    { name: '萍乡', lat: 27.6229, lng: 113.8546 }, { name: '九江', lat: 29.7051, lng: 116.0019 },
    { name: '新余', lat: 27.8174, lng: 114.9173 }, { name: '鹰潭', lat: 28.2602, lng: 117.0692 },
    { name: '赣州', lat: 25.8311, lng: 114.9350 }, { name: '吉安', lat: 27.1138, lng: 114.9926 },
    { name: '宜春', lat: 27.8043, lng: 114.4168 }, { name: '抚州', lat: 27.9492, lng: 116.3582 },
    { name: '上饶', lat: 28.4549, lng: 117.9434 },
  ]},
  { province: '山东省', cities: [
    { name: '济南', lat: 36.6512, lng: 117.1201 }, { name: '青岛', lat: 36.0671, lng: 120.3826 },
    { name: '淄博', lat: 36.8135, lng: 118.0549 }, { name: '枣庄', lat: 34.8107, lng: 117.3219 },
    { name: '东营', lat: 37.4348, lng: 118.6748 }, { name: '烟台', lat: 37.4638, lng: 121.4479 },
    { name: '潍坊', lat: 36.7069, lng: 119.1619 }, { name: '济宁', lat: 35.4146, lng: 116.5871 },
    { name: '泰安', lat: 36.2000, lng: 117.0870 }, { name: '威海', lat: 37.5131, lng: 122.1204 },
    { name: '日照', lat: 35.4164, lng: 119.5269 }, { name: '临沂', lat: 35.1047, lng: 118.3564 },
    { name: '德州', lat: 37.4355, lng: 116.3594 }, { name: '聊城', lat: 36.4570, lng: 115.9855 },
    { name: '滨州', lat: 37.3835, lng: 117.9707 }, { name: '菏泽', lat: 35.2336, lng: 115.4809 },
  ]},
  { province: '河南省', cities: [
    { name: '郑州', lat: 34.7466, lng: 113.6254 }, { name: '开封', lat: 34.7971, lng: 114.3075 },
    { name: '洛阳', lat: 34.6197, lng: 112.4540 }, { name: '平顶山', lat: 33.7662, lng: 113.1924 },
    { name: '安阳', lat: 36.0979, lng: 114.3927 }, { name: '鹤壁', lat: 35.7470, lng: 114.2973 },
    { name: '新乡', lat: 35.3030, lng: 113.9268 }, { name: '焦作', lat: 35.2159, lng: 113.2418 },
    { name: '濮阳', lat: 35.7617, lng: 115.0293 }, { name: '许昌', lat: 34.0357, lng: 113.8524 },
    { name: '漯河', lat: 33.5815, lng: 114.0168 }, { name: '三门峡', lat: 34.7726, lng: 111.2001 },
    { name: '南阳', lat: 32.9908, lng: 112.5285 }, { name: '商丘', lat: 34.4143, lng: 115.6564 },
    { name: '信阳', lat: 32.1470, lng: 114.0912 }, { name: '周口', lat: 33.6204, lng: 114.6496 },
    { name: '驻马店', lat: 33.0114, lng: 114.0223 },
  ]},
  { province: '湖北省', cities: [
    { name: '武汉', lat: 30.5928, lng: 114.3055 }, { name: '黄石', lat: 30.1996, lng: 115.0388 },
    { name: '十堰', lat: 32.6294, lng: 110.7879 }, { name: '宜昌', lat: 30.6919, lng: 111.2865 },
    { name: '襄阳', lat: 32.0089, lng: 112.1226 }, { name: '鄂州', lat: 30.3919, lng: 114.8949 },
    { name: '荆门', lat: 31.0354, lng: 112.1993 }, { name: '孝感', lat: 30.9246, lng: 113.9169 },
    { name: '荆州', lat: 30.3348, lng: 112.2387 }, { name: '黄冈', lat: 30.4535, lng: 114.8723 },
    { name: '咸宁', lat: 29.8414, lng: 114.3225 }, { name: '随州', lat: 31.6901, lng: 113.3825 },
    { name: '恩施', lat: 30.2722, lng: 109.4882 },
  ]},
  { province: '湖南省', cities: [
    { name: '长沙', lat: 28.2282, lng: 112.9388 }, { name: '株洲', lat: 27.8274, lng: 113.1339 },
    { name: '湘潭', lat: 27.8297, lng: 112.9440 }, { name: '衡阳', lat: 26.8965, lng: 112.5719 },
    { name: '邵阳', lat: 27.2389, lng: 111.4677 }, { name: '岳阳', lat: 29.3571, lng: 113.1289 },
    { name: '常德', lat: 29.0317, lng: 111.6985 }, { name: '张家界', lat: 29.1170, lng: 110.4792 },
    { name: '益阳', lat: 28.5539, lng: 112.3552 }, { name: '郴州', lat: 25.7706, lng: 113.0147 },
    { name: '永州', lat: 26.4345, lng: 111.6134 }, { name: '怀化', lat: 27.5549, lng: 109.9985 },
    { name: '娄底', lat: 27.7001, lng: 111.9945 }, { name: '湘西', lat: 28.3119, lng: 109.7390 },
  ]},
  { province: '广东省', cities: [
    { name: '广州', lat: 23.1291, lng: 113.2644 }, { name: '韶关', lat: 24.8104, lng: 113.5972 },
    { name: '深圳', lat: 22.5431, lng: 114.0579 }, { name: '珠海', lat: 22.2707, lng: 113.5767 },
    { name: '汕头', lat: 23.3540, lng: 116.6819 }, { name: '佛山', lat: 23.0218, lng: 113.1219 },
    { name: '江门', lat: 22.5787, lng: 113.0815 }, { name: '湛江', lat: 21.2707, lng: 110.3594 },
    { name: '茂名', lat: 21.6630, lng: 110.9254 }, { name: '肇庆', lat: 23.0472, lng: 112.4655 },
    { name: '惠州', lat: 23.1115, lng: 114.4158 }, { name: '梅州', lat: 24.2886, lng: 116.1225 },
    { name: '汕尾', lat: 22.7864, lng: 115.3753 }, { name: '河源', lat: 23.7435, lng: 114.6978 },
    { name: '阳江', lat: 21.8579, lng: 111.9822 }, { name: '清远', lat: 23.6820, lng: 113.0560 },
    { name: '东莞', lat: 23.0207, lng: 113.7518 }, { name: '中山', lat: 22.5170, lng: 113.3928 },
    { name: '潮州', lat: 23.6567, lng: 116.6226 }, { name: '揭阳', lat: 23.5497, lng: 116.3728 },
    { name: '云浮', lat: 22.9150, lng: 112.0444 },
  ]},
  { province: '广西壮族自治区', cities: [
    { name: '南宁', lat: 22.8170, lng: 108.3665 }, { name: '柳州', lat: 24.3255, lng: 109.4159 },
    { name: '桂林', lat: 25.2736, lng: 110.2902 }, { name: '梧州', lat: 23.4740, lng: 111.2791 },
    { name: '北海', lat: 21.4813, lng: 109.1201 }, { name: '防城港', lat: 21.6146, lng: 108.3455 },
    { name: '钦州', lat: 21.9797, lng: 108.6544 }, { name: '贵港', lat: 23.1115, lng: 109.5989 },
    { name: '玉林', lat: 22.6540, lng: 110.1647 }, { name: '百色', lat: 23.9022, lng: 106.6186 },
    { name: '贺州', lat: 24.4035, lng: 111.5667 }, { name: '河池', lat: 24.6929, lng: 108.0854 },
    { name: '来宾', lat: 23.7338, lng: 109.2215 }, { name: '崇左', lat: 22.4041, lng: 107.3647 },
  ]},
  { province: '海南省', cities: [
    { name: '海口', lat: 20.0440, lng: 110.1999 }, { name: '三亚', lat: 18.2528, lng: 109.5120 },
    { name: '三沙', lat: 16.8310, lng: 112.3380 }, { name: '儋州', lat: 19.5209, lng: 109.5807 },
  ]},
  { province: '四川省', cities: [
    { name: '成都', lat: 30.5728, lng: 104.0668 }, { name: '自贡', lat: 29.3392, lng: 104.7784 },
    { name: '攀枝花', lat: 26.5823, lng: 101.7186 }, { name: '泸州', lat: 28.8717, lng: 105.4423 },
    { name: '德阳', lat: 31.1270, lng: 104.3980 }, { name: '绵阳', lat: 31.4675, lng: 104.6796 },
    { name: '广元', lat: 32.4355, lng: 105.8434 }, { name: '遂宁', lat: 30.5328, lng: 105.5929 },
    { name: '内江', lat: 29.5802, lng: 105.0584 }, { name: '乐山', lat: 29.5521, lng: 103.7657 },
    { name: '南充', lat: 30.8373, lng: 106.1107 }, { name: '眉山', lat: 30.0754, lng: 103.8485 },
    { name: '宜宾', lat: 28.7518, lng: 104.6432 }, { name: '广安', lat: 30.4564, lng: 106.6334 },
    { name: '达州', lat: 31.2090, lng: 107.4680 }, { name: '雅安', lat: 29.9805, lng: 103.0133 },
    { name: '巴中', lat: 31.8679, lng: 106.7475 }, { name: '资阳', lat: 30.1286, lng: 104.6279 },
    { name: '阿坝', lat: 31.8994, lng: 102.2247 }, { name: '甘孜', lat: 30.0507, lng: 101.9625 },
    { name: '凉山', lat: 27.8816, lng: 102.2673 },
  ]},
  { province: '贵州省', cities: [
    { name: '贵阳', lat: 26.6470, lng: 106.6302 }, { name: '六盘水', lat: 26.5918, lng: 104.8305 },
    { name: '遵义', lat: 27.7257, lng: 106.9274 }, { name: '安顺', lat: 26.2537, lng: 105.9476 },
    { name: '毕节', lat: 27.2846, lng: 105.2850 }, { name: '铜仁', lat: 27.7183, lng: 109.1916 },
    { name: '黔西南', lat: 25.0881, lng: 104.9064 }, { name: '黔东南', lat: 26.5834, lng: 107.9828 },
    { name: '黔南', lat: 26.2582, lng: 107.5172 },
  ]},
  { province: '云南省', cities: [
    { name: '昆明', lat: 25.0389, lng: 102.7183 }, { name: '曲靖', lat: 25.4900, lng: 103.7962 },
    { name: '玉溪', lat: 24.3520, lng: 102.5439 }, { name: '保山', lat: 25.1120, lng: 99.1618 },
    { name: '昭通', lat: 27.3382, lng: 103.7172 }, { name: '丽江', lat: 26.8550, lng: 100.2270 },
    { name: '普洱', lat: 22.8251, lng: 100.9665 }, { name: '临沧', lat: 23.8772, lng: 100.0870 },
    { name: '楚雄', lat: 25.0453, lng: 101.5281 }, { name: '红河', lat: 23.3631, lng: 103.3748 },
    { name: '文山', lat: 23.3695, lng: 104.2440 }, { name: '西双版纳', lat: 22.0017, lng: 100.7975 },
    { name: '大理', lat: 25.6065, lng: 100.2676 }, { name: '德宏', lat: 24.4334, lng: 98.5849 },
    { name: '怒江', lat: 25.8525, lng: 98.8543 }, { name: '迪庆', lat: 27.8269, lng: 99.7065 },
  ]},
  { province: '西藏自治区', cities: [
    { name: '拉萨', lat: 29.6520, lng: 91.1721 }, { name: '日喀则', lat: 29.2670, lng: 88.8806 },
    { name: '昌都', lat: 31.1406, lng: 97.1720 }, { name: '林芝', lat: 29.6490, lng: 94.3615 },
    { name: '山南', lat: 29.2371, lng: 91.7731 }, { name: '那曲', lat: 31.4762, lng: 92.0514 },
    { name: '阿里', lat: 32.5011, lng: 80.1055 },
  ]},
  { province: '陕西省', cities: [
    { name: '西安', lat: 34.3416, lng: 108.9398 }, { name: '铜川', lat: 34.8967, lng: 108.9450 },
    { name: '宝鸡', lat: 34.3619, lng: 107.2376 }, { name: '咸阳', lat: 34.3296, lng: 108.7093 },
    { name: '渭南', lat: 34.4994, lng: 109.5098 }, { name: '延安', lat: 36.5853, lng: 109.4897 },
    { name: '汉中', lat: 33.0675, lng: 107.0233 }, { name: '榆林', lat: 38.2852, lng: 109.7346 },
    { name: '安康', lat: 32.6847, lng: 109.0293 }, { name: '商洛', lat: 33.8704, lng: 109.9405 },
  ]},
  { province: '甘肃省', cities: [
    { name: '兰州', lat: 36.0611, lng: 103.8343 }, { name: '嘉峪关', lat: 39.7730, lng: 98.2892 },
    { name: '金昌', lat: 38.5201, lng: 102.1879 }, { name: '白银', lat: 36.5447, lng: 104.1386 },
    { name: '天水', lat: 34.5809, lng: 105.7249 }, { name: '武威', lat: 37.9283, lng: 102.6380 },
    { name: '张掖', lat: 38.9259, lng: 100.4498 }, { name: '平凉', lat: 35.5428, lng: 106.6650 },
    { name: '酒泉', lat: 39.7326, lng: 98.4939 }, { name: '庆阳', lat: 35.7098, lng: 107.6434 },
    { name: '定西', lat: 35.5807, lng: 104.6263 }, { name: '陇南', lat: 33.3886, lng: 104.9215 },
    { name: '临夏', lat: 35.6014, lng: 103.2105 }, { name: '甘南', lat: 34.9834, lng: 102.9110 },
  ]},
  { province: '青海省', cities: [
    { name: '西宁', lat: 36.6171, lng: 101.7782 }, { name: '海东', lat: 36.4821, lng: 102.4017 },
    { name: '海北', lat: 36.9594, lng: 100.9009 }, { name: '黄南', lat: 35.5195, lng: 102.0153 },
    { name: '海南州', lat: 36.2866, lng: 100.6204 }, { name: '果洛', lat: 34.4714, lng: 100.2448 },
    { name: '玉树', lat: 33.0040, lng: 97.0085 }, { name: '海西', lat: 37.3771, lng: 97.3697 },
  ]},
  { province: '宁夏回族自治区', cities: [
    { name: '银川', lat: 38.4872, lng: 106.2309 }, { name: '石嘴山', lat: 39.0133, lng: 106.3833 },
    { name: '吴忠', lat: 37.9976, lng: 106.1988 }, { name: '固原', lat: 36.0159, lng: 106.2426 },
    { name: '中卫', lat: 37.5000, lng: 105.1968 },
  ]},
  { province: '新疆维吾尔自治区', cities: [
    { name: '乌鲁木齐', lat: 43.8256, lng: 87.6168 }, { name: '克拉玛依', lat: 45.5799, lng: 84.8892 },
    { name: '吐鲁番', lat: 42.9513, lng: 89.1895 }, { name: '哈密', lat: 42.8185, lng: 93.5151 },
    { name: '昌吉', lat: 44.0112, lng: 87.3082 }, { name: '博尔塔拉', lat: 44.9060, lng: 82.0664 },
    { name: '巴音郭楞', lat: 41.7641, lng: 86.1453 }, { name: '阿克苏', lat: 41.1688, lng: 80.2606 },
    { name: '克孜勒苏', lat: 39.7134, lng: 76.1728 }, { name: '喀什', lat: 39.4704, lng: 75.9897 },
    { name: '和田', lat: 37.1142, lng: 79.9225 }, { name: '伊犁', lat: 43.9219, lng: 81.3240 },
    { name: '塔城', lat: 46.7454, lng: 82.9806 }, { name: '阿勒泰', lat: 47.8484, lng: 88.1396 },
  ]},
  { province: '香港特别行政区', cities: [{ name: '香港', lat: 22.3193, lng: 114.1694 }] },
  { province: '澳门特别行政区', cities: [{ name: '澳门', lat: 22.1987, lng: 113.5439 }] },
  { province: '台湾省', cities: [
    { name: '台北', lat: 25.0330, lng: 121.5654 }, { name: '高雄', lat: 22.6273, lng: 120.3014 },
    { name: '台中', lat: 24.1477, lng: 120.6736 }, { name: '台南', lat: 22.9997, lng: 120.2270 },
  ]},
];

let _flatCache = null;
let _geoCache = null;

function getFlatCities() {
  if (_flatCache) return _flatCache;
  _flatCache = [];
  PROVINCE_CITIES.forEach((group) => {
    group.cities.forEach((c) => {
      _flatCache.push({ ...c, province: group.province });
    });
  });
  return _flatCache;
}

function getGeoCities() {
  if (_geoCache) return _geoCache;
  _geoCache = getFlatCities();
  return _geoCache;
}

function searchCities(keyword) {
  const kw = (keyword || '').trim();
  if (!kw) return getFlatCities();
  return getFlatCities().filter(
    (c) => c.name.includes(kw) || c.province.includes(kw)
  );
}

function findCityByName(name) {
  const n = (name || '').replace(/市$/, '');
  return getFlatCities().find((c) => c.name === n || c.name === name) || null;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearestCity(lat, lng) {
  let best = getGeoCities()[0];
  let min = Infinity;
  getGeoCities().forEach((c) => {
    const d = haversineKm(lat, lng, c.lat, c.lng);
    if (d < min) {
      min = d;
      best = c;
    }
  });
  return { ...best, distanceKm: Math.round(min) };
}

module.exports = {
  HOT_CITIES,
  PROVINCE_CITIES,
  getFlatCities,
  searchCities,
  findCityByName,
  findNearestCity,
};
