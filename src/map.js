import leaflet from 'leaflet'
import leafletImage from 'leaflet-image'
import 'leaflet-providers'
import 'leaflet-easybutton'


// Los Angeles is the center of the universe
const INIT_COORDS = [34.0522, -118.243]

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

        this.map = leaflet.map('background-map', {
            center: INIT_COORDS,
            zoom: 10,
            preferCanvas: true
        })

        leaflet.easyButton({
            id: 'screenshot',
            type: 'animate',
            states: [{
                icon: 'fa-camera fa-lg',
                stateName: 'default',
                title: 'Export as png',
                onClick: (_btn, map) => {
                    this.screenshot()
                }
            }]
        }).addTo(this.map)

        this.switchTheme(this.options.theme)
        this.requestBrowserLocation()
    }

    switchTheme(themeName) {
        let tileLayer = leaflet.tileLayer.provider(themeName)
        tileLayer.addTo(this.map, {
            detectRetina: true
        })
    }

    // Try to pull geo location from browser and center the map
    requestBrowserLocation() {
        navigator.geolocation.getCurrentPosition((pos) => {
            this.map.panTo([pos.coords.latitude, pos.coords.longitude])
        })
    }

    addTrack(track) {
        console.log('adding track', track.name)
        var line = leaflet.polyline(track.points, this.options.lineOptions)
        line.addTo(this.map)
    }

    screenshot() {
        leafletImage(this.map, (err, canvas) => {
            if (err) return window.alert(err)

            let a = document.createElement('a')
            a.href = canvas.toDataURL()
            a.download = "derive-export.png"
            a.click()
        })
    }
}
