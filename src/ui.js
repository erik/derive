import picoModal from 'picoModal'
import parseGPX from './gpx'


const AVAILABLE_THEMES = [
    'CartoDB.DarkMatter',
    'CartoDB.DarkMatterNoLabels',
    'CartoDB.Positron',
    'CartoDB.PositronNoLabels',
    'Esri.WorldImagery',
    'OpenStreetMap.Mapnik',
    'OpenStreetMap.BlackAndWhite',
    'Stamen.TerrainBackground',
    'Stamen.Toner',
    'Stamen.TonerLite',
    'Stamen.TonerBackground',
    'Stamen.Watercolor',
    'Thunderforest.OpenCycleMap',
    'Thunderforest.SpinalMap',
    'Thunderforest.Pioneer',
]

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
</em></p>

<p>Code is available <a href="https://github.com/erik/derive">on GitHub</a>.</p>
`
}


// Adapted from: http://www.html5rocks.com/en/tutorials/file/dndfiles/
function handleFileSelect(map, evt) {
    evt.stopPropagation()
    evt.preventDefault()

    let tracks = []
    let files = evt.dataTransfer.files
    let modal = buildUploadModal(files.length)

    modal.show()

    let fileIndex = 0

    function loadNextFile() {
        if (fileIndex >= files.length) {
            tracks.forEach(t => {
                console.log('Adding track:', t.name)
                map.addTrack(t.points)
            })
            return modal.destroy()
        }

        let reader = new FileReader()
        reader.onload = (event) => {
            parseGPX(event.target.result, (err, track) => {
                // TODO: Make an error modal
                if (err) return window.alert(err)

                tracks.push(track)
                modal.progress(fileIndex)

                // do the next file, but give the UI time to update.
                window.setTimeout(loadNextFile, 1)
            })
        }

        reader.readAsBinaryString(files[fileIndex++])
    }

    loadNextFile()
}


function handleDragOver(evt) {
    evt.dataTransfer.dropEffect = 'copy'
    evt.stopPropagation()
    evt.preventDefault()
}


function buildUploadModal(numFiles) {
    function getModalContent(numLoaded) {
        return `<h1>Reading GPX files...</h1>
<span id="">${numLoaded} loaded of <b>${numFiles}</b>`
    }

    let modal = picoModal({
        content: getModalContent(0),
        closeButton: false,
        escCloses: false,
        overlayClose: false,
        overlayStyles: (styles) => { styles.opacity = 0.1 }
    })

    modal.progress = (loaded) => {
        modal.modalElem().innerHTML = getModalContent(loaded)
    }

    return modal
}


export function buildSettingsModal(opts, finishCallback) {
    let themes = AVAILABLE_THEMES.map(t => {
        let selected = t == opts.theme ? 'selected' : ''

        return `<option ${selected} value="${t}">${t}</option>`
    })

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
</form>
`
    let modal = picoModal({
        content: modalContent,
        closeButton: true,
        escCloses: true,
        overlayClose: true,
        overlayStyles: (styles) => { styles.opacity = 0.1 }
    })

    modal.afterClose((modal) => {
        let elements = document.getElementById('settings').elements
        let options = Object.assign({}, opts)

        let _ = ['theme'].forEach(n => {
            options[n] = elements[n].value
        })

        _ = ['color', 'weight', 'opacity'].forEach(n => {
            options.lineOptions[n] = elements[n].value
        })

        finishCallback(options)
        modal.destroy()
    })

    return modal
}

function showModal(type) {
    let modal = picoModal({
        content: MODAL_CONTENT[type],
        overlayStyles: (styles) => { styles.opacity = 0.01 }
    })

    modal.show()

    return modal
}


export function initialize(map) {
    let modal = showModal('help')

    window.addEventListener('dragover', handleDragOver, false)

    window.addEventListener('drop', e => {
        if (!modal.destroyed) {
            modal.destroy()
            modal.destroyed = true
        }
        handleFileSelect(map, e)
    }, false)
}
