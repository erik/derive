import 'babel-polyfill';
import picoModal from 'picomodal';
import extractTracks from './track';
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
    'No map',
];

const MODAL_CONTENT = {
    help: `
<h1>dérive</h1>
<h4>Drag and drop one or more GPX/TCX/FIT/IGC/SKIZ files or JPEG images here.</h4>
<p>If you use Strava, go to your
<a href="https://www.strava.com/athlete/delete_your_account">account download
page</a> and click "Request your archive". You'll get an email containing a ZIP
file of all the GPS tracks you've logged so far. This can take several hours.
</p>

<p>All processing happens in your browser. Your files will not be uploaded or
stored anywhere.</p>

<blockquote>
In a dérive one or more persons during a certain period drop their
relations, their work and leisure activities, and all their other
usual motives for movement and action, and let themselves be drawn by
the attractions of the terrain and the encounters they find there.<cite><a
href="http://library.nothingness.org/articles/SI/en/display/314">[1]</a></cite>
</blockquote>

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

    const handleImage = async file => {
        const image = new Image(file);
        const hasGeolocationData = await image.hasGeolocationData();
        if (!hasGeolocationData) { throw 'No geolocation data'; }
        await map.addImage(image);
        modal.addSuccess();
    };

    const handleTrackFile = async (file) => {
        for (const track of await extractTracks(file)) {
            track.filename = file.name;
            tracks.push(track);
            map.addTrack(track);
            modal.addSuccess();
        }
    };

    const handleFile = async file => {
        try {
            if (/\.jpe?g$/i.test(file.name)) {
                return await handleImage(file);
            }
            return await handleTrackFile(file);
        } catch (err) {
            console.error(err);
            modal.addFailure({name: file.name, error: err});
        }
    };

    Promise.all(files.map(handleFile)).then(() => {
        map.center();
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
    let failureString = failures.length ? `, <span class='failures'>${failures.length} failed</span>` : '';
    let getModalContent = () => `
        <h1>Reading files...</h1>
        <p>${numLoaded} loaded${failureString} of <b>${numFiles}</b></p>`;

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


export function buildSettingsModal(tracks, opts, updateCallback) {
    let overrideExisting = opts.lineOptions.overrideExisting ? 'checked' : '';

    if (tracks.length > 0) {
        let allSameColor = tracks.every(({line}) => {
            return line.options.color === tracks[0].line.options.color;
        });

        if (!allSameColor) {
            overrideExisting = false;
        } else {
            opts.lineOptions.color = tracks[0].line.options.color;
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

    <fieldset class="form-group">
        <legend>GPS Track Options</legend>

        <div class="row">
            <label>Color</label>
            <input name="color" type="color" value=${opts.lineOptions.color}>
        </div>

        <div class="row">
            <label>Opacity</label>
            <input name="opacity" type="range" min=0 max=1 step=0.01
                value=${opts.lineOptions.opacity}>
        </div>

        <div class="row">
            <label>Width</label>
            <input name="weight" type="number" min=1 max=100
                value=${opts.lineOptions.weight}>
        </div>

    </fieldset>

    <fieldset class="form-group">
        <legend>Image Marker Options</legend>

        <div class="row">
            <label>Color</label>
            <input name="markerColor" type="color" value=${opts.markerOptions.color}>
        </div>

        <div class="row">
            <label>Opacity</label>
            <input name="markerOpacity" type="range" min=0 max=1 step=0.01
                value=${opts.markerOptions.opacity}>
        </div>

        <div class="row">
            <label>Width</label>
            <input name="markerWeight" type="number" min=1 max=100
                value=${opts.markerOptions.weight}>
        </div>

        <div class="row">
            <label>Radius</label>
            <input name="markerRadius" type="number" min=1 max=100
                value=${opts.markerOptions.radius}>
        </div>

    </fieldset>

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

    let applyOptions = () => {
        let elements = document.getElementById('settings').elements;
        let options = Object.assign({}, opts);

        for (let opt of ['theme']) {
            options[opt] = elements[opt].value;
        }

        for (let opt of ['color', 'weight', 'opacity']) {
            options.lineOptions[opt] = elements[opt].value;
        }

        for (let opt of ['markerColor', 'markerWeight', 'markerOpacity', 'markerRadius']) {
            let optionName = opt.replace('marker', '').toLowerCase();
            options.markerOptions[optionName] = elements[opt].value;
        }

        for (let opt of ['overrideExisting', 'detectColors']) {
            options.lineOptions[opt] = elements[opt].checked;
        }

        updateCallback(options);
    };

    modal.afterClose((modal) => {
      applyOptions();
      modal.destroy();
    });

    modal.afterCreate(() => {
      let elements = document.getElementById('settings').elements;
      for (let opt of ['theme', 'color', 'weight', 'opacity', 'markerColor',
                       'markerWeight', 'markerOpacity', 'markerRadius']) {
        elements[opt].addEventListener('change', applyOptions);
      }
    });


    return modal;
}

export function buildFilterModal(tracks, filters, finishCallback) {
    let maxDate = new Date().toISOString().split('T')[0];
    let modalContent = `
<h3>Filter Displayed Tracks</h3>

<form id="settings">
    <span class="form-row">
        <label for="minDate">Start date:</label>
        <input type="date" id="minDate" name="minDate"
            value="${filters.minDate || ''}"
            min="1990-01-01"
            max="${maxDate}">
    </span>

    <span class="form-row">
        <label for="maxDate">End date:</label>
        <input type="date" id="maxDate" name="maxDate"
            value="${filters.maxDate || ''}"
            min="1990-01-01"
            max="${maxDate}">
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
        let filters = Object.assign({}, filters);

        for (let key of ['minDate', 'maxDate']) {
            filters[key] = elements[key].value;
        }

        finishCallback(filters);
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


const INTRO_MODAL_SEEN_KEY = 'intro-modal-seen';

export function initialize(map) {
    // We don't need to show the help modal every time, only the first
    // time the user sees the page.
    let displayIntroModal = true;

    if (window.sessionStorage.getItem(INTRO_MODAL_SEEN_KEY) !== null) {
        displayIntroModal = false;
    } else {
        window.sessionStorage.setItem(INTRO_MODAL_SEEN_KEY, 'true');
    }


    let modal = displayIntroModal ? showModal('help') : null;

    window.addEventListener('dragover', handleDragOver, false);
    window.addEventListener('drop', e => {
        if (displayIntroModal && !modal.destroyed) {
            modal.destroy();
            modal.destroyed = true;
        }
        handleFileSelect(map, e);
    }, false);
}
