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

    // Try to pull geo location from browser
    navigator.geolocation.getCurrentPosition((pos) => {
        _map.panTo([pos.coords.latitude, pos.coords.longitude]);
    });
}


module.exports = {
    initialize: initialize,
    map: _map
};
