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

    var fileIndex = 0;

    function loadNextFile() {
        if (fileIndex >= files.length) {
            tracks.forEach(t => map.addTrack(t));
            return modal.destroy();
        }

        var reader = new FileReader();
        reader.onload = (event) => {
            parseGPX(event.target.result, (err, track) => {
                // TODO: Make an error modal
                if (err) return window.alert(err);

                tracks.push(track);
                modal.progress(fileIndex);

                // do the next file, but give the UI time to update.
                window.setTimeout(loadNextFile, 1);
            });
        };

        reader.readAsBinaryString(files[fileIndex++]);
    }

    return loadNextFile();
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
