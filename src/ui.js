var jquery = require('jquery'),
    leaflet = require('leaflet');

var map = require('./map'),
    gpx = require('./gpx');


// Adapted from: http://www.html5rocks.com/en/tutorials/file/dndfiles/
function handleFileSelect(evt) {
    evt.stopPropagation();
    evt.preventDefault();

    var polyLines = [];

    var files = evt.dataTransfer.files;
    for (var i = 0; i < files.length; ++i) {
        var reader = new FileReader();
        reader.onload = (event) => {
            readGPXFile(map, event, (line) => {
                polyLines.push(line);

                console.log('lines are', polyLines, files.length);

                // If we've processed all the files.
                if (polyLines.length === files.length) {
                    console.log('here we go');
                    polyLines.forEach(line => line.addTo(map));
                    console.log('done');
                }
            });

        };

        reader.readAsText(files[i]);
    }
}


function handleDragOver(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}


function initialize() {
    window.addEventListener('dragover', (e) => {
        handleDragOver(e);
    }, false);

    window.addEventListener('drop', (e) => {
        handleFileSelect(map, e);
    } , false);

    window.addEventListener('dragstart', (_) => {
        console.log('modal show');
        $('#modal').show();
    }, false);
}


module.exports = {
    initialize: initialize
};
