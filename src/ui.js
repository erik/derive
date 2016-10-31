var jquery = require('jquery'),
    leaflet = require('leaflet');

var map = require('./map'),
    parseGPX = require('./gpx');


// Adapted from: http://www.html5rocks.com/en/tutorials/file/dndfiles/
function handleFileSelect(map, evt) {
    evt.stopPropagation();
    evt.preventDefault();

    var tracks = [];
    var files = evt.dataTransfer.files;

    for (var i = 0; i < files.length; ++i) {
        var reader = new FileReader();

        reader.onload = (event) => parseGPX(event.target.result, (err, track) => {
            if (err) { return alert(err); }

            tracks.push(track);

            // If we've processed all the files, add them to the map in one go.
            if (tracks.length === files.length) {
                tracks.forEach(t => map.addTrack(t));
            }
        });

        reader.readAsText(files[i]);
    }
}


function handleDragOver(evt) {
    evt.dataTransfer.dropEffect = 'copy';
    evt.stopPropagation();
    evt.preventDefault();
}


function initialize(map) {
    console.log('init');

    window.addEventListener('dragover', handleDragOver, false);
    window.addEventListener('drop', e => handleFileSelect(map, e) , false);

    window.addEventListener('dragstart', (_) => {
        console.log('modal show');
        $('#modal').show();
    }, false);
}


module.exports = {
    initialize: initialize
};
