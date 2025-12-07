import { INIT_ZOOM } from './config.js';

export const Game = {
    token: null,
    wsUrl: null,
    ws: null,
    sproto: null,
    host: null,
    request: null, // function to create requests
    session: 0,
    callbacks: {}, // session -> callback
    data: {
        user: null,
        city: null,
        items: {}, // id -> amount
        generals: [],
        buildings: []
    },
    selectedBuildingType: null,
    serverTimeOffset: 0,
    currentView: 'city', // 'city' or 'map'
    zoom: INIT_ZOOM,
    hoveredBuildingId: null,
    dragState: {
        isDragging: false,
        buildingId: null,
        el: null,
        offsetX: 0,
        offsetY: 0,
        timer: null
    }
};

