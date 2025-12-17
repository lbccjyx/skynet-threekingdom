ITEM_DEFINITIONS = {
    1: {key: 1, name: 'Gold',  desc: 'Currency' },
    2: {key: 2, name: 'Wood', desc: 'Building material' },
    3: {key: 3, name: 'Stone', desc: 'Building material' },
    4: {key: 4, name: 'Food', desc: 'Sustenance' },
    5: {key: 5, name: 'Population', desc: 'People' }
};

BUILDING_DEFINITIONS = {
    3: {key: 3, name: '伐木场',image: 'assets/buildding/woodcutter.png',   width: 3, height: 2, build_sec: 10, destroy_sec: 10, cost_item: 1, cost_num: 10, cost_item2: 2, cost_num2: 10, cost_item3: 3, cost_num3: 10 },
    4: {key: 4, name: 'stonecutter', width: 3, height: 2, build_sec: 10, destroy_sec: 10, cost_item: 1, cost_num: 10, cost_item2: 2, cost_num2: 10, cost_item3: 3, cost_num3: 10 },
    5: {key: 5, name: '仓库', image: 'assets/buildding/granary.png', width: 3, height: 2, build_sec: 10, destroy_sec: 10, cost_item: 1, cost_num: 10, cost_item2: 2, cost_num2: 10, cost_item3: 3, cost_num3: 10 },
    6: {key: 6, name: '兵营',image: 'assets/buildding/barracks.png',  width: 3, height: 2, build_sec: 10, destroy_sec: 10, cost_item: 1, cost_num: 10, cost_item2: 2, cost_num2: 10, cost_item3: 3, cost_num3: 10 },
    7: {key: 7, name: '马厩', image: 'assets/buildding/horsebarn.png', width: 3, height: 2, build_sec: 10, destroy_sec: 10, cost_item: 1, cost_num: 10, cost_item2: 2, cost_num2: 10, cost_item3: 3, cost_num3: 10 },
    9: {key: 9, name: '官府', image: 'assets/guanfu.png', width: 7, height: 4, build_sec: 10, destroy_sec: 10, cost_item: 1, cost_num: 10, cost_item2: 2, cost_num2: 10, cost_item3: 3, cost_num3: 10 },

    101: {key: 101, name: '农田', image: 'assets/glb_file/farmland.glb', width: 1, height: 1, cost_item: 1, cost_num: 10, cost_item2: 2, cost_num2: 10, cost_item3: 3, cost_num3: 10 , build_sec: 10, destroy_sec: 10},
    301: {key: 301, name: '道路', image: 'assets/glb_file/road.glb', width: 1, height: 1, cost_item: 1, cost_num: 10, cost_item2: 2, cost_num2: 10, cost_item3: 3, cost_num3: 10 , build_sec: 10, destroy_sec: 10},
    201: {key: 201, name: '木质城墙', image: 'assets/glb_file/wall_pillar.glb', width: 1, height: 1, cost_item: 1, cost_num: 10, cost_item2: 2, cost_num2: 10, cost_item3: 3, cost_num3: 10 , build_sec: 10, destroy_sec: 10},
    202: {key: 202, name: '石头城墙', image: 'assets/glb_file/wall_stone.glb', width: 2, height: 2, cost_item: 1, cost_num: 10, cost_item2: 2, cost_num2: 10, cost_item3: 3, cost_num3: 10 , build_sec: 10, destroy_sec: 10},
    401: {key: 401, name: '房子2X2', imageDir: 'assets/glb_file/house/22/', width: 3, height: 3, cost_item: 1, cost_num: 10, cost_item2: 2, cost_num2: 10, cost_item3: 3, cost_num3: 10 , build_sec: 10, destroy_sec: 10},
    402: {key: 402, name: '房子3X2', imageDir: 'assets/glb_file/house/32', width: 4, height: 3, cost_item: 1, cost_num: 10, cost_item2: 2, cost_num2: 10, cost_item3: 3, cost_num3: 10 , build_sec: 10, destroy_sec: 10},
    403: {key: 403, name: '房子4X4', imageDir: 'assets/glb_file/house/44', width: 5, height: 5, cost_item: 1, cost_num: 10, cost_item2: 2, cost_num2: 10, cost_item3: 3, cost_num3: 10 , build_sec: 10, destroy_sec: 10},
    404: {key: 404, name: '房子5X4', imageDir: 'assets/glb_file/house/54', width: 7, height: 5, cost_item: 1, cost_num: 10, cost_item2: 2, cost_num2: 10, cost_item3: 3, cost_num3: 10 , build_sec: 10, destroy_sec: 10}
};

RECT_BUILDING_DEFINITIONS = {
    1: {key: 1, name: '农田', width: 1, height: 1, sub_buildings: 101, sub_max_num: 1},
    2: {key: 2, name: '道路', width: 1, height: 1, sub_buildings: 301, sub_max_num: 1},
    3: {key: 3, name: '木质城墙', width: 1, height: 1, sub_buildings: 201, sub_max_num: 1},
    4: {key: 3, name: '石头城墙', width: 2, height: 2, sub_buildings: 202, sub_max_num: 1},
    5: {key: 4, name: '房子2X2', width: 3, height: 3, sub_buildings: 401, sub_max_num: 18},
    6: {key: 4, name: '房子3X2', width: 4, height: 3, sub_buildings: 402, sub_max_num: 9},
    7: {key: 4, name: '房子4X4', width: 5, height: 5, sub_buildings: 403, sub_max_num: 2},
    8: {key: 4, name: '房子5X4', width: 7, height: 5, sub_buildings: 404, sub_max_num: 2}
};


TOOLBAR_CONFIG = [
    { 
        id: 'btn-buildings', 
        name: '建筑', 
        type: 'submenu', 
        menuId: 'submenu-buildings', 
        dataSource: 'BUILDING_DEFINITIONS',
        handler: 'selectBuilding'
    },
    { 
        id: 'btn-zoning', 
        name: '圈地', 
        type: 'submenu', 
        menuId: 'submenu-zoning', 
        dataSource: 'RECT_BUILDING_DEFINITIONS',
        handler: 'selectZoning'
    },
    { 
        id: 'btn-delete', 
        name: '删除', 
        type: 'action', 
        handler: 'toggleDeleteMode' 
    }
];
