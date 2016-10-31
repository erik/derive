var jquery = require('jquery'),
    leaflet = require('leaflet'),
    picoModal = require('picoModal');

var map = require('./map'),
    parseGPX = require('./gpx');


// Adapted from: http://www.html5rocks.com/en/tutorials/file/dndfiles/
function handleFileSelect(map, evt) {
    evt.stopPropagation();
    evt.preventDefault();

    var tracks = [];
    var files = evt.dataTransfer.files;
    var modal = buildUploadModal(files.length);

    modal.show();

    function updateMap() {
        for (var i = 0; i < tracks.length; ++i) {
            map.addTrack(tracks[i]);
            modal.progress(i + 1);
        }

        modal.destroy();
    }

    for (var i = 0; i < files.length; ++i) {
        var reader = new FileReader();
        reader.onload = (event) => parseGPX(event.target.result, (err, track) => {
            if (err) { return alert(err); }

            tracks.push(track);

            // If we've processed all the files, add them to the map in one go.
            if (tracks.length === files.length) return updateMap();
        });

        reader.readAsText(files[i]);
    }
}


function handleDragOver(evt) {
    evt.dataTransfer.dropEffect = 'copy';
    evt.stopPropagation();
    evt.preventDefault();
}


function buildUploadModal(numFiles) {
    function getModalContent(numLoaded) {
        return modalContent = `
<h1>Parsing GPX files...</h1>

<span id="">${numLoaded} loaded of <b>${numFiles}</b>
`;
    }

    var modal = picoModal({
        content: getModalContent(0),
        closeButton: false,
        escCloses: false,
        overlayStyles: (styles) => { styles.opacity = 0.1; }
    }).afterClose(m => m.destroy());

    var modalElem = modal.modalElem();
    modal.show();
    console.log(modalElem);

    modal.progress = (loaded) => {
        modal.modalElem().innerHTML = getModalContent(loaded);
    };

    return modal;
}


// TODO: write me.
function showHelpModal() {}


function initialize(map) {
    console.log('init');

    showHelpModal();

    window.addEventListener('dragover', handleDragOver, false);
    window.addEventListener('drop', e => handleFileSelect(map, e) , false);
}


module.exports = {
    initialize: initialize
};
