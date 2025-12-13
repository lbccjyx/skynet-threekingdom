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
    9: {key: 9, name: '官府', image: 'assets/guanfu.png', width: 7, height: 4, build_sec: 10, destroy_sec: 10, cost_item: 1, cost_num: 10, cost_item2: 2, cost_num2: 10, cost_item3: 3, cost_num3: 10 }
};

RECT_BUILDING_DEFINITIONS = {
    1: {key: 1, name: '农田', image: 'assets/glb_file/farm.glb'},
    2: {key: 2, name: '道路', image: 'assets/glb_file/road.glb'}
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
