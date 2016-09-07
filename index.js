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


// Adapted from: http://www.html5rocks.com/en/tutorials/file/dndfiles/
function handleFileSelect(map, evt) {
    evt.stopPropagation();
    evt.preventDefault();

    var files = evt.dataTransfer.files;
    for (var i = 0; i < files.length; ++i) {
        var reader = new FileReader();
        reader.onload = (event) => addGPXFile(map, event);
        reader.readAsText(files[i]);
    }
}


function handleDragOver(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}


function addGPXFile(map, event) {
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

        line.addTo(map);
    });
}


function initDropZone(map) {
    window.addEventListener('dragover', handleDragOver, false);
    window.addEventListener('drop', (e) => handleFileSelect(map, e), false);
}
