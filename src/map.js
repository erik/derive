import leaflet from 'leaflet'
import leafletImage from 'leaflet-image'
import 'leaflet-providers'
import 'leaflet-easybutton'


// Los Angeles is the center of the universe
const INIT_COORDS = [34.0522, -118.243]

const AVAILABLE_THEMES = [
    'CartoDB.DarkMatter',
    'CartoDB.DarkMatterNoLabels',
    'CartoDB.Positron',
    'CartoDB.PositronNoLabels',
    'Stamen.Toner',
    'Stamen.TonerLite',
    'Stamen.TonerBackground',
]

const DEFAULT_OPTIONS = {
    theme: 'CartoDB.DarkMatter',
    lineOptions: {
        color: '#0CB1E8',
        weight: 1,
        opacity: 0.5,
        smoothFactor: 1
    }
}


export default class GpxMap {
    constructor(options) {
        this.options = options || DEFAULT_OPTIONS
        this.tracks = []

        this.map = leaflet.map('background-map', {
            center: INIT_COORDS,
            zoom: 10,
            preferCanvas: true
        })

        leaflet.easyButton({
            type: 'animate',
            states: [{
                icon: 'fa-camera fa-lg',
                stateName: 'default',
                title: 'Export as png',
                onClick: (_btn, map) => { this.screenshot('png') }
            }]
        }).addTo(this.map)

        leaflet.easyButton({
            type: 'animate',
            states: [{
                icon: 'fa-code fa-lg',
                stateName: 'default',
                title: 'Export as svg',
                onClick: (_btn, map) => { this.screenshot('svg') }
            }]
        }).addTo(this.map)

        this.switchTheme(this.options.theme)
        this.requestBrowserLocation()
    }

    switchTheme(themeName) {
        if (this.mapTiles)
            this.mapTiles.removeFrom(this.map)

        this.mapTiles = leaflet.tileLayer.provider(themeName)
        this.mapTiles.addTo(this.map, {detectRetina: true})
    }

    // Try to pull geo location from browser and center the map
    requestBrowserLocation() {
        navigator.geolocation.getCurrentPosition((pos) => {
            this.map.panTo([pos.coords.latitude, pos.coords.longitude])
        })
    }

    addTrack(track) {
        let line = leaflet.polyline(track, this.options.lineOptions)
        line.addTo(this.map)

        this.tracks.push(line)
    }

    screenshot(fmt) {
        console.log('screenshot', fmt)
        console.log(this.map)

        leafletImage(this.map, (err, canvas) => {
            if (err) return window.alert(err)

            let anchor = document.createElement('a')


            if (fmt == 'png') {
                anchor.href = canvas.toDataURL()
                anchor.download = 'derive-export.png'
            } else if (fmt == 'svg') {
                let paths = this.tracks
                        .map(trk => trk.getLatLngs())
                        .map(coord => coord.map(c => this.map.latLngToLayerPoint(c)))
                        .map(pts => leaflet.SVG.pointsToPath([pts], false))

                let svg = leaflet.SVG.create('svg')
                let root = leaflet.SVG.create('g')

                let opts = this.options.lineOptions

                paths.forEach(path => {
                    let el = leaflet.SVG.create('path')

                    el.setAttribute('stroke', opts.color);
                    el.setAttribute('stroke-opacity', opts.opacity);
                    el.setAttribute('stroke-width', opts.weight);
                    el.setAttribute('stroke-linecap', 'round');
                    el.setAttribute('stroke-linejoin', 'round');
                    el.setAttribute('fill', 'none');

                    el.setAttribute('d', path)

                    root.appendChild(el)
                })

                svg.appendChild(root)

                let xml = (new XMLSerializer()).serializeToString(svg)
                anchor.download = 'derive-export.svg'
                anchor.href = 'data:application/octet-stream;base64,' + btoa(xml);
            }

            // Perform the download
            return anchor.click()
        })
    }
}
