var jquery = require('jquery'),
    leaflet = require('leaflet'),
    picoModal = require('picoModal');

var map = require('./map'),
    parseGPX = require('./gpx');


const MODAL_CONTENT = {
    help: `<h1>dérive</h1>
<h4>Drag and drop one or more GPX files here</h4>
<p>If you use Strava, you can obtain a ZIP file of your activity data
in GPX format on your <a href="https://www.strava.com/settings/profile">profile
page</a> and clicking "Download all your activities."
</p>

<p>All processing happens in your browser. Your files will not be uploaded or
stored anywhere.</p>

<p><em>
In a dérive one or more persons during a certain period drop their
relations, their work and leisure activities, and all their other
usual motives for movement and action, and let themselves be drawn by
the attractions of the terrain and the encounters they find there.

<a href="http://library.nothingness.org/articles/SI/en/display/314"><sup>1</sup></a>
</em></p>`
}


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

    loadNextFile();
}


function handleDragOver(evt) {
    evt.dataTransfer.dropEffect = 'copy';
    evt.stopPropagation();
    evt.preventDefault();
}


function buildUploadModal(numFiles) {
    function getModalContent(numLoaded) {
        return `<h1>Reading GPX files...</h1>
<span id="">${numLoaded} loaded of <b>${numFiles}</b>`;
    }

    var modal = picoModal({
        content: getModalContent(0),
        closeButton: false,
        escCloses: false,
        overlayClose: false,
        overlayStyles: (styles) => { styles.opacity = 0.1; }
    });

    modal.progress = (loaded) => {
        modal.modalElem().innerHTML = getModalContent(loaded);
    };

    return modal;
}


function showModal(type) {
    var modal = picoModal({
        content: MODAL_CONTENT[type],
        overlayStyles: (styles) => { styles.opacity = 0.01; }
    });

    modal.show();

    return modal;
}


function initialize(map) {
    modal = showModal('help');

    window.addEventListener('dragover', handleDragOver, false);

    window.addEventListener('drop', e => {
        modal.destroy();
        handleFileSelect(map, e);
    }, false);
}


module.exports = {
    initialize: initialize
};
