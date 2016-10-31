var leaflet = require('leaflet'),
    _ = require('leaflet-providers');


// Los Angeles is the center of the universe
const INIT_COORDS = [34.0522, -118.243];

const DEFAULT_OPTIONS = {
    theme: 'CartoDB.DarkMatter',
    lineOptions: {
        color: '#0CB1E8',
        weight: 1,
        opacity: 0.5,
        smoothFactor: 1
    }
};


class GpxMap {
    constructor(options) {
        this.options = options || DEFAULT_OPTIONS;

        this.map = leaflet.map('background-map', {
            center: INIT_COORDS,
            zoom: 10
        });

        this.switchTheme(this.options.theme);
        this.requestBrowserLocation();
    }

    switchTheme(themeName) {
        var tileLayer = leaflet.tileLayer.provider(themeName);
        tileLayer.addTo(this.map);
    }

    // Try to pull geo location from browser and center the map
    requestBrowserLocation() {
        navigator.geolocation.getCurrentPosition((pos) => {
            this.map.panTo([pos.coords.latitude, pos.coords.longitude]);
        });
    }

    addTrack(track) {
        console.log('adding track', track.name);
        var line = leaflet.polyline(track.points, this.options.lineOptions);
        line.addTo(this.map);
    }

}


module.exports = GpxMap;
