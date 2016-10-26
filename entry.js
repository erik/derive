require('./style.css');

var jquery = require('jquery');
var L = require('leaflet');

$(document).ready(() => {
    var map = initMap();
    initDropZone(map);
});


function initMap() {
    var map = L.map('background-map', {
        center: [34.0522, -118.243],
        zoom: 10
    });

    L.tileLayer('http://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    return map;
}



function readGPXFile(map, event, callback) {
    var gpx = gpxParse.parseGpx(event.target.result, (error, data) => {
        if (error) {
            console.log('FAILED TO PARSE.', error);
            return;
        }

        var points = [];

        for (var i = 0; i < data.tracks.length; ++i) {
            var track = data.tracks[i];
            for (var j = 0; j < track.segments.length; ++j) {
                var seg = track.segments[j];
                for (var k = 0; k < seg.length; ++k) {
                    points.push(new L.LatLng(seg[k].lat, seg[k].lon));
                }
            }
        }

        var line = L.polyline(points, {
            color: '#0CB1E8',
            weight: 3,
            opacity: 0.3,
            smoothFactor: 3
        });

        // TODO: on hover for name of thing

        callback(line);
    });
}


function initDropZone(map) {
    window.addEventListener('dragover', handleDragOver, false);
    window.addEventListener('drop', (e) => handleFileSelect(map, e), false);
    window.addEventListener('dragstart', (_) => { console.log('modal show'); $('#modal').show()}, false);
}
