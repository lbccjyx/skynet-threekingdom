export const UI = {
    screens: {
        login: document.getElementById('login-screen'),
        game: document.getElementById('game-screen')
    },
    views: {
        city: document.getElementById('city-view'),
        map: document.getElementById('map-view')
    },
    inputs: {
        username: document.getElementById('username'),
        password: document.getElementById('password')
    },
    btn: {
        login: document.getElementById('btn-login'),
        toMap: document.getElementById('btn-to-map'),
        toCity: document.getElementById('btn-to-city'),
        backToCity: document.getElementById('btn-back-to-city')
    },
    msg: {
        login: document.getElementById('login-msg')
    },
    res: {
        1: document.getElementById('res-gold'),
        2: document.getElementById('res-wood'),
        3: document.getElementById('res-stone'),
        4: document.getElementById('res-food'),
        5: document.getElementById('res-pop')
    },
    city: {
        name: document.getElementById('city-name'),
        level: document.getElementById('city-level'),
        container: document.getElementById('buildings-container')
    },
    map: {
        container: document.getElementById('map-container')
    },
    log: document.getElementById('log-content')
};

