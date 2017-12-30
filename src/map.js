import leaflet from 'leaflet';
import leafletImage from 'leaflet-image';
import 'leaflet-providers';
import 'leaflet-easybutton';

import {buildSettingsModal, showModal} from  './ui';


// Los Angeles is the center of the universe
const INIT_COORDS = [34.0522, -118.243];


const DEFAULT_OPTIONS = {
    theme: 'CartoDB.DarkMatter',
    lineOptions: {
        color: '#0CB1E8',
        weight: 1,
        opacity: 0.5,
        smoothFactor: 1,
        existing: true,
        detectColors: true,
    }
};


export default class GpxMap {
    constructor(options) {
        this.options = options || DEFAULT_OPTIONS;
        this.tracks = [];

        this.map = leaflet.map('background-map', {
            center: INIT_COORDS,
            zoom: 10,
            preferCanvas: true,
        });

        this.markScrolled = () => {
            this.map.removeEventListener("movestart", this.markScrolled);
            this.scrolled = true;
        };

        this.clearScroll();

        leaflet.easyButton({
            type: 'animate',
            states: [{
                icon: 'fa-camera fa-lg',
                stateName: 'default',
                title: 'Export as png',
                onClick: (_btn, map) => {
                    let modal = showModal('exportImage')
                            .afterClose(() => modal.destroy())

                    document.getElementById('render-export').onclick = (e) => {
                        e.preventDefault();

                        let resultNode = document.createElement('li');
                        let container = document.getElementById('export-list');

                        resultNode.innerText = '... rendering ...';
                        container.innerText = '';
                        container.appendChild(resultNode);

                        let elements = document.getElementById('settings').elements;
                        this.screenshot(elements.format.value, resultNode);
                    }
                }
            }]
        }).addTo(this.map)

        leaflet.easyButton({
            type: 'animate',
            states: [{
                icon: 'fa-sliders fa-lg',
                stateName: 'default',
                title: 'Open settings dialog',
                onClick: (_btn, map) => {
                    buildSettingsModal(this.options, (opts) => {
                        this.updateOptions(opts)
                    }).show();
                },
            }],
        }).addTo(this.map);

        let centre = this.centre.bind(this);

        this.viewAll = leaflet.easyButton({
            type: 'animate',
            states: [{
                icon: 'fa-map fa-lg',
                stateName: 'default',
                title: 'Zoom to all tracks',
                onClick: (_btn, map) => {
                    centre();
                },
            }],
        }).addTo(this.map);
        this.viewAll.disable();

        this.switchTheme(this.options.theme);
        this.requestBrowserLocation();
    }

    clearScroll () {
        this.scrolled = false;
        this.map.addEventListener("movestart", this.markScrolled);
    }

    switchTheme(themeName) {
        if (this.mapTiles) this.mapTiles.removeFrom(this.map);

        this.mapTiles = leaflet.tileLayer.provider(themeName);
        this.mapTiles.addTo(this.map, {detectRetina: true});
    }

    updateOptions(opts) {
        if (opts.theme !== this.options.theme) {
            this.switchTheme(opts.theme);
        }
        
        if (opts.lineOptions.existing) {
            this.tracks.forEach(t => {
                t.setStyle({
                    color: opts.lineOptions.color,
                    weight: opts.lineOptions.weight,
                    opacity: opts.lineOptions.opacity,
                });

                t.redraw();
            });
        }

        this.options = opts;
    }

    // Try to pull geo location from browser and center the map
    requestBrowserLocation() {
        navigator.geolocation.getCurrentPosition(pos => {
            if (!this.scrolled && this.tracks.length == 0) {
                this.map.panTo([pos.coords.latitude, pos.coords.longitude], {
                    noMoveStart: true,
                });
                // noMoveStart doesn't seem to have an effect, see Leaflet
                // issue: https://github.com/Leaflet/Leaflet/issues/5396
                this.clearScroll();
            }
        });
    }

    addTrack(track) {
        this.viewAll.enable();
        let lineOptions = Object.assign({}, this.options.lineOptions);
        if (lineOptions.detectColors) {
            if (/-(Hike|Walk)\.gpx/.test(track.filename))
                lineOptions.color = "pink";
            else if (/-Run\.gpx/.test(track.filename))
                lineOptions.color = "red";
            else if (/-Ride\.gpx/.test(track.filename))
                lineOptions.color = "cyan";
        }
        let line = leaflet.polyline(track.points, lineOptions);
        line.addTo(this.map);

        this.tracks.push(line);

        if (!this.scrolled) this.centre();
    }

    centre() {
        let scrolled = this.scrolled;
        this.map.fitBounds((new L.featureGroup(this.tracks)).getBounds(), {
            noMoveStart: true,
            padding: [50,20],
        });
        if (!scrolled) this.clearScroll();
    }

    screenshot(format, domNode) {
        leafletImage(this.map, (err, canvas) => {
            if (err) return window.alert(err);

            let anchor = document.createElement('a');

            if (format == 'png') {
                anchor.download = 'derive-export.png';
                anchor.innerText = 'Download as PNG';

                canvas.toBlob(blob => {
                    anchor.href = URL.createObjectURL(blob);
                    domNode.innerHTML = anchor.outerHTML;
                })
            } else if (format == 'svg') {
                anchor.innerText = 'Download as SVG';

                let origin = this.map.getBounds();
                let top = origin.getNorthWest();
                let bot = origin.getSouthEast();

                const width = bot.lng - top.lng;
                const height = top.lat - bot.lat;
                const scale = 1000;

                let paths = this.tracks
                    .map(trk => trk.getLatLngs())
                    .map(coord => coord.map(c => ({
                        x: (c.lng - top.lng) * scale,
                        y: (top.lat - c.lat) * scale
                    })))
                    .map(pts => leaflet.SVG.pointsToPath([pts], false));

                let svg = leaflet.SVG.create('svg');
                let root = leaflet.SVG.create('g');

                svg.setAttribute('viewBox', `0 0 ${scale * width} ${scale * height}`);

                let opts = this.options.lineOptions;

                paths.forEach(path => {
                    let el = leaflet.SVG.create('path');

                    el.setAttribute('stroke', opts.color);
                    el.setAttribute('stroke-opacity', opts.opacity);
                    el.setAttribute('stroke-width', opts.weight);
                    el.setAttribute('stroke-linecap', 'round');
                    el.setAttribute('stroke-linejoin', 'round');
                    el.setAttribute('fill', 'none');

                    el.setAttribute('d', path);

                    root.appendChild(el);
                });

                svg.appendChild(root);

                let xml = (new XMLSerializer()).serializeToString(svg);
                anchor.download = 'derive-export.svg';

                let blob = new Blob([xml], {type: 'application/octet-stream'});
                anchor.href = URL.createObjectURL(blob);

                domNode.innerHTML = anchor.outerHTML;
            }
        });
    }
}
