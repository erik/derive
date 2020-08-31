import leaflet from 'leaflet';
import leafletImage from 'leaflet-image';
import 'leaflet-providers';
import 'leaflet-easybutton';

import * as ui from './ui';


// Los Angeles is the center of the universe
const INIT_COORDS = [34.0522, -118.243];


const DEFAULT_OPTIONS = {
    theme: 'CartoDB.DarkMatter',
    lineOptions: {
        color: '#0CB1E8',
        weight: 1,
        opacity: 0.5,
        smoothFactor: 1,
        overrideExisting: true,
        detectColors: true,
    },
    markerOptions: {
        color: '#00FF00',
        weight: 3,
        radius: 5,
        opacity: 0.5
    }
};


export default class GpxMap {
    constructor(options) {
        this.options = options || DEFAULT_OPTIONS;
        this.tracks = [];
        this.filters = {
            minDate: null,
            maxDate: null,
        };
        this.imageMarkers = [];

        this.map = leaflet.map('background-map', {
            center: INIT_COORDS,
            zoom: 10,
            preferCanvas: true,
        });

        leaflet.easyButton({
            type: 'animate',
            states: [{
                icon: 'fa-camera fa-lg',
                stateName: 'default',
                title: 'Export as png',
                onClick: () => {
                    let modal = ui.showModal('exportImage')
                        .afterClose(() => modal.destroy());

                    document.getElementById('render-export').onclick = (e) => {
                        e.preventDefault();

                        let output = document.getElementById('export-output');
                        output.innerHTML = 'Rendering <i class="fa fa-cog fa-spin"></i>';

                        let form = document.getElementById('export-settings').elements;
                        this.screenshot(form.format.value, output);
                    };
                }
            }]
        }).addTo(this.map);

        leaflet.easyButton({
            type: 'animate',
            states: [{
                icon: 'fa-sliders fa-lg',
                stateName: 'default',
                title: 'Open settings dialog',
                onClick: () => {
                    ui.buildSettingsModal(this.tracks, this.options, (opts) => {
                        this.updateOptions(opts);
                        this.saveOptions(opts);
                    }).show();
                },
            }],
        }).addTo(this.map);

        leaflet.easyButton({
            type: 'animate',
            states: [{
                icon: 'fa-filter fa-lg',
                stateName: 'default',
                title: 'Filter displayed tracks',
                onClick: () => {
                    ui.buildFilterModal(this.tracks, this.filters, (f) => {
                        this.filters = f;
                        this.applyFilters();
                    }).show();
                }
            }]
        }).addTo(this.map);

        this.viewAll = leaflet.easyButton({
            type: 'animate',
            states: [{
                icon: 'fa-map fa-lg',
                stateName: 'default',
                title: 'Zoom to all tracks',
                onClick: () => {
                    this.center();
                },
            }],
        }).addTo(this.map);

        this.markScrolled = () => {
            this.map.removeEventListener('movestart', this.markScrolled);
            this.scrolled = true;
        };

        this.clearScroll();
        this.viewAll.disable();
        this.switchTheme(this.options.theme);
        this.requestBrowserLocation();
    }

    clearScroll() {
        this.scrolled = false;
        this.map.addEventListener('movestart', this.markScrolled);
    }

    switchTheme(themeName) {
        if (this.mapTiles) {
            this.mapTiles.removeFrom(this.map);
        }

        if (themeName !== 'No map') {
            this.mapTiles = leaflet.tileLayer.provider(themeName);
            this.mapTiles.addTo(this.map, {detectRetina: true});
        }
    }

    saveOptions(opts) {
        window.localStorage.setItem('options', JSON.stringify(opts));
    }

    restoreSavedOptions() {
        if (window.localStorage.getItem('options') === null) {
            return;
        }

        let opts = window.localStorage.getItem('options');
        opts = JSON.parse(opts);

        if (typeof opts === 'object') {
            this.updateOptions(opts);
        }
    }

    updateOptions(opts) {
        if (opts.theme !== this.options.theme) {
            this.switchTheme(opts.theme);
        }

        if (opts.lineOptions.overrideExisting) {
            this.tracks.forEach(({line}) => {
                line.setStyle({
                    color: opts.lineOptions.color,
                    weight: opts.lineOptions.weight,
                    opacity: opts.lineOptions.opacity,
                });

                line.redraw();
            });

            let markerOptions = opts.markerOptions;
            this.imageMarkers.forEach(i => {
                i.setStyle({
                    color: markerOptions.color,
                    weight: markerOptions.weight,
                    opacity: markerOptions.opacity,
                    radius: markerOptions.radius
                });

                i.redraw();
            });

        }

        this.options = opts;
    }

    applyFilters() {
        const dateBounds = {
            min: new Date(this.filters.minDate || '1900/01/01'),
            max: new Date(this.filters.maxDate || '2500/01/01'),
        };

        // NOTE: Tracks that don't have an associated timestamp will never be
        // excluded.
        const filters = [
            (t) => t.timestamp && dateBounds.min > t.timestamp,
            (t) => t.timestamp && dateBounds.max < t.timestamp,
        ];

        for (let track of this.tracks) {
            let hideTrack = filters.some(f => f(track));

            if (hideTrack && track.visible) {
                track.line.remove();
            } else if (!hideTrack && !track.visible){
                track.line.addTo(this.map);
            }

            track.visible = !hideTrack;
        }
    }

    // Try to pull geo location from browser and center the map
    requestBrowserLocation() {
        navigator.geolocation.getCurrentPosition(pos => {
            if (!this.scrolled && this.tracks.length === 0) {
                this.map.panTo([pos.coords.latitude, pos.coords.longitude], {
                    noMoveStart: true,
                    animate: false,
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
            if (/-(Hike|Walk)\.gpx/.test(track.filename)) {
                lineOptions.color = '#ffc0cb';
            } else if (/-Run\.gpx/.test(track.filename)) {
                lineOptions.color = '#ff0000';
            } else if (/-Ride\.gpx/.test(track.filename)) {
                lineOptions.color = '#00ffff';
            }
        }

        let line = leaflet.polyline(track.points, lineOptions);
        line.addTo(this.map);

        this.tracks.push(Object.assign({line, visible: true}, track));
    }

    async markerClick(image) {
        const latitude = await image.latitude();
        const longitude = await image.longitude();
        const imageData = await image.getImageData();

        let latlng = leaflet.latLng(latitude, longitude);

        leaflet.popup({minWidth: 512})
            .setLatLng(latlng)
            .setContent(`<img src="${imageData}" width="512" height="100%">`)
            .addTo(this.map);
    }

    async addImage(image) {
        const lat = await image.latitude();
        const lng = await image.longitude();

        let latlng = leaflet.latLng(lat, lng);
        let markerOptions = Object.assign({}, this.options.markerOptions);

        let marker = leaflet.circleMarker(latlng, markerOptions)
            .on('click', () => {
                this.markerClick(image);
            })
            .addTo(this.map);

        this.imageMarkers.push(marker);
    }

    // Center the map if the user has not yet manually panned the map
    recenter() {
        if (!this.scrolled) {
            this.center();
        }
    }

    center() {
        // If there are no tracks, then don't try to get the bounds, as there
        // would be an error
        if (this.tracks.length === 0 && this.imageMarkers.length === 0) {
            return;
        }

        let tracksAndImages = this.tracks.map(t => t.line)
            .concat(this.imageMarkers);

        this.map.fitBounds((new leaflet.featureGroup(tracksAndImages)).getBounds(), {
            noMoveStart: true,
            animate: false,
            padding: [50, 20],
        });

        if (!this.scrolled) {
            this.clearScroll();
        }
    }

    screenshot(format, domNode) {
        leafletImage(this.map, (err, canvas) => {
            if (err) {
                return window.alert(err);
            }

            let link = document.createElement('a');

            if (format === 'png') {
                link.download = 'derive-export.png';
                link.innerText = 'Download as PNG';

                canvas.toBlob(blob => {
                    link.href = URL.createObjectURL(blob);
                    domNode.innerText = '';
                    domNode.appendChild(link);
                });
            } else if (format === 'svg') {
                link.innerText = 'Download as SVG';

                const scale = 2;
                const bounds = this.map.getPixelBounds();
                bounds.min = bounds.min.multiplyBy(scale);
                bounds.max = bounds.max.multiplyBy(scale);
                const left = bounds.min.x;
                const top = bounds.min.y;
                const width = bounds.getSize().x;
                const height = bounds.getSize().y;

                let svg = leaflet.SVG.create('svg');
                let root = leaflet.SVG.create('g');

                svg.setAttribute('viewBox', `${left} ${top} ${width} ${height}`);

                this.tracks.forEach(track => {
                    // Project each point from LatLng, scale it up, round to
                    // nearest 1/10 (by multiplying by 10, rounding and
                    // dividing), and reducing by removing duplicates (when two
                    // consecutive points have rounded to the same value)
                    let pts = track.getLatLngs().map(ll =>
                            this.map.project(ll)
                                    .multiplyBy(scale*10)
                                    .round()
                                    .divideBy(10)
                    ).reduce((acc,next) => {
                        if (acc.length === 0 ||
                                acc[acc.length-1].x !== next.x ||
                                acc[acc.length-1].y !== next.y) {
                            acc.push(next);
                        }
                        return acc;
                    }, []);

                    // If none of the points on the track are on the screen,
                    // don't export the track
                    if (!pts.some(pt => bounds.contains(pt))) {
                        return;
                    }
                    let path = leaflet.SVG.pointsToPath([pts], false);
                    let el = leaflet.SVG.create('path');

                    el.setAttribute('stroke', track.options.color);
                    el.setAttribute('stroke-opacity', track.options.opacity);
                    el.setAttribute('stroke-width', scale * track.options.weight);
                    el.setAttribute('stroke-linecap', 'round');
                    el.setAttribute('stroke-linejoin', 'round');
                    el.setAttribute('fill', 'none');

                    el.setAttribute('d', path);

                    root.appendChild(el);
                });

                svg.appendChild(root);

                let xml = (new XMLSerializer()).serializeToString(svg);
                link.download = 'derive-export.svg';

                let blob = new Blob([xml], {type: 'application/octet-stream'});
                link.href = URL.createObjectURL(blob);

                domNode.innerText = '';
                domNode.appendChild(link);
            }
        });
    }
}
