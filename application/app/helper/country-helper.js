var CountryHelper = {
    data: function() {
        var a = [[86, '中国'], [852, '香港'], [853, '澳门'], [886, '台湾'], [65, '新加坡'], [44, '英国'], [1, '美国'], [82, '韩国'], [81, '日本'], [39, '意大利'], [972, '以色列'], [66, '泰国'], [46, '瑞典'], [41, '瑞士'], [27, '南非'], [34, '西班牙'], [31, '荷兰'], [64, '新西兰']];
        var b = [[962, '约旦'], [244, '安哥拉'], [93, '阿富汗'], [355, '阿尔巴尼亚'], [213, '阿尔及利亚'], [376, '安道尔共和国'], [1264, '安圭拉岛'], [1268, '安提瓜和巴布达'], [54, '阿根廷'], [374, '亚美尼亚'], [247, '阿森松'], [61, '澳大利亚'], [43, '奥地利'], [994, '阿塞拜疆'], [1242, '巴哈马'], [973, '巴林'], [880, '孟加拉国'], [1246, '巴巴多斯'], [375, '白俄罗斯'], [32, '比利时'], [501, '伯利兹'], [229, '贝宁'], [1441, '百慕大群岛'], [591, '玻利维亚'], [267, '博茨瓦纳'], [55, '巴西'], [673, '文莱'], [359, '保加利亚'], [226, '布基纳法索'], [95, '缅甸'], [257, '布隆迪'], [237, '喀麦隆'], [1, '加拿大'], [1345, '开曼群岛'], [236, '中非共和国'], [235, '乍得'], [56, '智利'], [57, '哥伦比亚'], [242, '刚果'], [682, '库克群岛']];
        var c = [[506, '哥斯达黎加'], [53, '古巴'], [357, '塞浦路斯'], [420, '捷克'], [45, '丹麦'], [253, '吉布提'], [1890, '多米尼加共和国'], [593, '厄瓜多尔'], [20, '埃及'], [503, '萨尔瓦多'], [372, '爱沙尼亚'], [251, '埃塞俄比亚'], [679, '斐济'], [358, '芬兰'], [33, '法国'], [594, '法属圭亚那'], [241, '加蓬'], [220, '冈比亚'], [995, '格鲁吉亚'], [49, '德国'], [233, '加纳'], [350, '直布罗陀'], [30, '希腊'], [1809, '格林纳达'], [1671, '关岛'], [502, '危地马拉'], [224, '几内亚'], [592, '圭亚那'], [509, '海地'], [504, '洪都拉斯'], [36, '匈牙利'], [354, '冰岛'], [91, '印度'], [62, '印度尼西亚'], [98, '伊朗'], [964, '伊拉克'], [353, '爱尔兰'], [225, '科特迪瓦'], [1876, '牙买加'], [855, '柬埔寨'], [327, '哈萨克斯坦']];
        var d = [[254, '肯尼亚'], [965, '科威特'], [331, '吉尔吉斯坦'], [856, '老挝'], [371, '拉脱维亚'], [961, '黎巴嫩'], [266, '莱索托'], [231, '利比里亚'], [218, '利比亚'], [423, '列支敦士登'], [370, '立陶宛'], [352, '卢森堡'], [261, '马达加斯加'], [265, '马拉维'], [60, '马来西亚'], [960, '马尔代夫'], [223, '马里'], [356, '马耳他'], [1670, '马里亚那群岛'], [596, '马提尼克'], [230, '毛里求斯'], [52, '墨西哥'], [373, '摩尔多瓦'], [377, '摩纳哥'], [976, '蒙古'], [1664, '蒙特塞拉特岛'], [212, '摩洛哥'], [258, '莫桑比克'], [264, '纳米比亚'], [674, '瑙鲁'], [977, '尼泊尔'], [599, '荷属安的列斯'], [505, '尼加拉瓜'], [227, '尼日尔'], [234, '尼日利亚'], [850, '朝鲜'], [47, '挪威'], [968, '阿曼'], [92, '巴基斯坦'], [507, '巴拿马']]
        var e = [[675, '巴布亚新几内亚'], [595, '巴拉圭'], [51, '秘鲁'], [63, '菲律宾'], [48, '波兰'], [689, '法属玻利尼西亚'], [351, '葡萄牙'], [1787, '波多黎各'], [974, '卡塔尔'], [262, '留尼旺'], [40, '罗马尼亚'], [7, '俄罗斯'], [1758, '圣卢西亚'], [1784, '圣文森特岛'], [684, '东萨摩亚(美)'], [685, '西萨摩亚'], [378, '圣马力诺'], [239, '圣多美和普林西比'], [966, '沙特阿拉伯'], [221, '塞内加尔'], [248, '塞舌尔'], [232, '塞拉利昂'], [421, '斯洛伐克'], [386, '斯洛文尼亚'], [677, '所罗门群岛'], [252, '索马里'], [94, '斯里兰卡'], [1758, '圣卢西亚'], [1784, '圣文森特'], [249, '苏丹'], [597, '苏里南'], [268, '斯威士兰'], [963, '叙利亚'], [992, '塔吉克斯坦'], [255, '坦桑尼亚'], [228, '多哥'], [676, '汤加'], [1809, '特立尼达和多巴哥']];
        var f = [[216, '突尼斯'], [90, '土耳其'], [993, '土库曼斯坦'], [256, '乌干达'], [380, '乌克兰'], [971, '阿拉伯联合酋长国'], [598, '乌拉圭'], [233, '乌兹别克斯坦'], [58, '委内瑞拉'], [84, '越南'], [967, '也门'], [381, '南斯拉夫'], [263, '津巴布韦'], [243, '扎伊尔'], [260, '赞比亚']];
        return a.concat(b).concat(c).concat(d).concat(e).concat(f); 
    }
}