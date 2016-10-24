var jquery = require('jquery');
var leaflet = require('leaflet');

var _map;


function initialize() {
    _map = leaflet.map('background-map', {
        center: [34.0522, -118.243],
        zoom: 10
    });

    leaflet.tileLayer('http://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(_map);
}

// Los Angeles is the center of the universe
const INIT_COORDS = [34.0522, -118.243];
const TILE_THEMES = {
    CARTO_DARK: {
        url: 'http://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        attrs: {
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; ' +
                '<a href="http://cartodb.com/attributions">CartoDB</a>',
            subdomains: 'abcd',
            maxZoom: 19
        }
    }

    /* TODO: add more things here eventually */
};

// TODO: set this one up.
const DEFAULT_OPTIONS = {
    theme: 'CARTO_DARK',
    lineOptions: {
        color: '#0CB1E8',
        weight: 3,
        opacity: 0.3,
        smoothFactor: 3
    }
};


class GpxMap {
    constructor(options) {
        this.options = options || DEFAULT_OPTIONS;

        this.map = leaflet.map('background-map', {
            center: INIT_COORDS,
            zoom: 10
        });

        this.switchTheme(options.theme);
        this.requestBrowserLocation();
    }

    switchTheme(themeName) {
        var theme = TILE_THEMES[themeName];
        var tileLayer = leaflet.tileLayer(theme.url, theme.attrs);

        tileLayer.addTo(this.map);
    }

    // Try to pull geo location from browser and center the map
    requestBrowserLocation() {
        navigator.geolocation.getCurrentPosition((pos) => {
            // TODO: this 'this' probably isn't that 'this'.
            this.map.panTo([pos.coords.latitude, pos.coords.longitude]);
        });
    }

    addLineSegment(points) {
        // TODO:
    }

}

module.exports = {
    initialize: initialize,
    map: _map
};
