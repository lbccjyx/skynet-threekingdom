const ITEM_DEFINITIONS = {
    1: {key: 1, name: 'Gold',  desc: 'Currency' },
    2: {key: 2, name: 'Wood', desc: 'Building material' },
    3: {key: 3, name: 'Stone', desc: 'Building material' },
    4: {key: 4, name: 'Food', desc: 'Sustenance' },
    5: {key: 5, name: 'Population', desc: 'People' }
};

const BUILDING_DEFINITIONS = {
    1: {key:1, name: '民房', image: 'assets/buildding/house.png', width: 2, height: 2, build_sec: 10, destroy_sec: 10, cost_item: 1, cost_num: 10, cost_item2: 2, cost_num2: 10, cost_item3: 3, cost_num3: 10 },
    2: {key: 2, name: '农田', image: 'assets/buildding/farm.png', width: 2, height: 2, build_sec: 10, destroy_sec: 10, cost_item: 1, cost_num: 10, cost_item2: 2, cost_num2: 10, cost_item3: 3, cost_num3: 10 },
    3: {key: 3, name: '伐木场',image: 'assets/buildding/woodcutter.png',   width: 2, height: 2, build_sec: 10, destroy_sec: 10, cost_item: 1, cost_num: 10, cost_item2: 2, cost_num2: 10, cost_item3: 3, cost_num3: 10 },
    4: {key: 4, name: 'stonecutter', width: 2, height: 2, build_sec: 10, destroy_sec: 10, cost_item: 1, cost_num: 10, cost_item2: 2, cost_num2: 10, cost_item3: 3, cost_num3: 10 },
    5: {key: 5, name: '仓库', image: 'assets/buildding/granary.png', width: 2, height: 2, build_sec: 10, destroy_sec: 10, cost_item: 1, cost_num: 10, cost_item2: 2, cost_num2: 10, cost_item3: 3, cost_num3: 10 },
    6: {key: 6, name: '兵营',image: 'assets/buildding/barracks.png',  width: 2, height: 2, build_sec: 10, destroy_sec: 10, cost_item: 1, cost_num: 10, cost_item2: 2, cost_num2: 10, cost_item3: 3, cost_num3: 10 },
    7: {key: 7, name: '马厩', image: 'assets/buildding/horsebarn.png', width: 2, height: 2, build_sec: 10, destroy_sec: 10, cost_item: 1, cost_num: 10, cost_item2: 2, cost_num2: 10, cost_item3: 3, cost_num3: 10 },
    8: {key: 8, name: 'wall',width: 2, height: 2, build_sec: 10, destroy_sec: 10, cost_item: 1, cost_num: 10, cost_item2: 2, cost_num2: 10, cost_item3: 3, cost_num3: 10 },
    9: {key: 9, name: '官府', image: 'assets/guanfu.png', width: 4, height: 4, build_sec: 10, destroy_sec: 10, cost_item: 1, cost_num: 10, cost_item2: 2, cost_num2: 10, cost_item3: 3, cost_num3: 10 }
};