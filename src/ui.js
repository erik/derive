import picoModal from 'picomodal';
import parseGPX from './gpx';
import Image from './image';

const AVAILABLE_THEMES = [
    'CartoDB.DarkMatter',
    'CartoDB.DarkMatterNoLabels',
    'CartoDB.Positron',
    'CartoDB.PositronNoLabels',
    'Esri.WorldImagery',
    'OpenStreetMap.Mapnik',
    'OpenStreetMap.BlackAndWhite',
    'OpenTopoMap',
    'Stamen.Terrain',
    'Stamen.TerrainBackground',
    'Stamen.Toner',
    'Stamen.TonerLite',
    'Stamen.TonerBackground',
    'Stamen.Watercolor',
];

const MODAL_CONTENT = {
    help: `
<h1>dérive</h1>
<h4>Drag and drop one or more GPX or JPG files here</h4>
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
</em></p>

<p>Code is available <a href="https://github.com/erik/derive">on GitHub</a>.</p>
`,

    exportImage: `
<h3>Export Image</h3>

<form id="export-settings">
    <div class="form-row">
        <label>Format:</label>
        <select name="format">
            <option selected value="png">PNG</option>
            <option value="svg">SVG (no background map)</option>
        </select>
    </div>

    <div class="form-row">
        <label></label>
        <input id="render-export" type="button" value="Render">
    </div>
</form>

<p id="export-output"></p>
`
};


// Adapted from: http://www.html5rocks.com/en/tutorials/file/dndfiles/
function handleFileSelect(map, evt) {
    evt.stopPropagation();
    evt.preventDefault();

    let tracks = [];
    let files = Array.from(evt.dataTransfer.files);
    let modal = buildUploadModal(files.length);

    modal.show();

    let parseGpx = file => new Promise(resolve => {
        parseGPX(file)
            .then(parsedTracks => {
                parsedTracks.forEach(track => {
                    track.filename = file.name;
                    tracks.push(track);
                    map.addTrack(track);
                    modal.addSuccess();
                });
            })
            .then(resolve);
    });

    let handleGpx = file => new Promise(resolve => {
        let reader = new FileReader();
        reader.onload = () => {
            parseGpx(reader.result);
            resolve();
        };
        reader.readAsText(file, 'UTF-8');        
    });

    let handleImage = file => new Promise(resolve => {
        let image = new Image(file);

        image.extractExifData().then((image) => {
            if (!image) {
                modal.addFailure({name: file.name, error: 'No geolocation data'});
                return resolve();
            }

            map.addImage(image);
            modal.addSuccess();
            resolve();    
        });
    });

    let detectFileType = file => new Promise(resolve => {
        let extension = file.name.split('.').pop();

        switch (extension) {
            case 'gpx':
                handleGpx(file)
                    .then(resolve);
                break;
            case 'jpg':
                handleImage(file)
                    .then(resolve);
                break;
            default:
                console.log(`File ${file.name} is an Unsupported format.`);
                modal.addFailure({name: file.name, error: 'Unsupported file format'});
                resolve();
        }
    });

    let loadFile = file => detectFileType(file)
        .catch(err => {
            modal.addFailure({name: file.name, error: err});
        });

    Promise.all(files.map(loadFile)).then(() => {
        map.recenter();

        modal.finished();
    });
}


function handleDragOver(evt) {
    evt.dataTransfer.dropEffect = 'copy';
    evt.stopPropagation();
    evt.preventDefault();
}


function buildUploadModal(numFiles) {
    let numLoaded = 0;
    let failures = [];
    let getModalContent = () => `
        <h1>Reading files...</h1>
        <p>${numLoaded} loaded${
            failures.length ? `, <span class='failures'>${failures.length} failed</span>` : ``
        } of <b>${numFiles}</b></p>`;

    let modal = picoModal({
        content: getModalContent(),
        escCloses: false,
        overlayClose: false,
        overlayStyles: styles => {
            styles.opacity = 0.1;
        },
    });

    modal.afterCreate(() => {
        // Do not allow the modal to be closed before loading is complete.
        // PicoModal does not allow for native toggling
        modal.closeElem().style.display = 'none';
    });

    modal.afterClose(() => modal.destroy());

    // Override the content of the modal, without removing the close button.
    // PicoModal does not allow for native content overwriting.
    modal.setContent = body => {
        Array.from(modal.modalElem().childNodes).forEach(child => {
            if (child !== modal.closeElem()) {
                modal.modalElem().removeChild(child);
            }
        });

        modal.modalElem().insertAdjacentHTML('afterbegin', body);
    };

    modal.addFailure = failure => {
        failures.push(failure);
        modal.setContent(getModalContent());
    };

    modal.addSuccess = () => {
        numLoaded++;
        modal.setContent(getModalContent());
    };

    // Show any errors, or close modal if no errors occurred
    modal.finished = () => {
        if (failures.length === 0) {
            return modal.close();
        }

        let failedItems = failures.map(failure => `<li>${failure.name}</li>`);
        modal.setContent(`
            <h1>Files loaded</h1>
            <p>
                Loaded ${numLoaded},
                <span class="failures">
                    ${failures.length} failure${failures.length === 1 ? '' : 's'}:
                </span>
            </p>
            <ul class="failures">${failedItems.join('')}</ul>`);
        // enable all the methods of closing the window
        modal.closeElem().style.display = '';
        modal.options({
            escCloses: true,
            overlayClose: true,
        });
    };

    return modal;
}


export function buildSettingsModal(tracks, opts, finishCallback) {
    let overrideExisting = opts.lineOptions.overrideExisting ? 'checked' : '';

    if (tracks.length > 0) {
        let allSameColor = tracks.every(trk => {
            return trk.options.color === tracks[0].options.color;
        });

        if (!allSameColor) {
            overrideExisting = false;
        } else {
            opts.lineOptions.color = tracks[0].options.color;
        }
    }

    let detect = opts.lineOptions.detectColors ? 'checked' : '';
    let themes = AVAILABLE_THEMES.map(t => {
        let selected = (t === opts.theme) ? 'selected' : '';

        return `<option ${selected} value="${t}">${t}</option>`;
    });

    let modalContent = `
<h3>Options</h3>

<form id="settings">
    <span class="form-row">
        <label>Theme</label>
        <select name="theme">
            ${themes}
        </select>
    </span>

    <span class="form-row">
        <label>Line color</label>
        <input name="color" type="color" value=${opts.lineOptions.color}>
    </span>

    <span class="form-row">
        <label>Line opacity</label>
        <input name="opacity" type="range" min=0 max=1 step=0.01
            value=${opts.lineOptions.opacity}>
    </span>

    <span class="form-row">
        <label>Line width</label>
        <input name="weight" type="number" min=1 max=100
            value=${opts.lineOptions.weight}>
    </span>

    <span class="form-row">
        <label>Override existing tracks</label>
        <input name="overrideExisting" type="checkbox" ${overrideExisting}>
    </span>

    <span class="form-row">
        <label>Detect color from Strava bulk export</label>
        <input name="detectColors" type="checkbox" ${detect}>
    </span>
</form>`;

    let modal = picoModal({
        content: modalContent,
        closeButton: true,
        escCloses: true,
        overlayClose: true,
        overlayStyles: (styles) => {
            styles.opacity = 0.1;
        },
    });

    modal.afterClose((modal) => {
        let elements = document.getElementById('settings').elements;
        let options = Object.assign({}, opts);

        for (let opt of ['theme']) {
            options[opt] = elements[opt].value;
        }

        for (let opt of ['color', 'weight', 'opacity']) {
            options.lineOptions[opt] = elements[opt].value;
        }

        for (let opt of ['overrideExisting', 'detectColors']) {
            options.lineOptions[opt] = elements[opt].checked;
        }

        finishCallback(options);
        modal.destroy();
    });

    return modal;
}

export function showModal(type) {
    let modal = picoModal({
        content: MODAL_CONTENT[type],
        overlayStyles: (styles) => {
            styles.opacity = 0.01;
        },
    });

    modal.show();

    return modal;
}


export function initialize(map) {
    let modal = showModal('help');

    window.addEventListener('dragover', handleDragOver, false);

    window.addEventListener('drop', e => {
        if (!modal.destroyed) {
            modal.destroy();
            modal.destroyed = true;
        }
        handleFileSelect(map, e);
    }, false);
}
