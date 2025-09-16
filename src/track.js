// This file is adapted from taterbase/gpx-parser
//
// https://github.com/taterbase/gpx-parser
//
// See https://www.topografix.com/gpx/1/1 for details on the schema for
// GPX files.

import FitParser from 'fit-file-parser';
import IGCParser from 'igc-parser';
import { parseSkizFile } from 'skiz-parser';

function parseXML(xmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'text/xml');

    const parseError = doc.querySelector('parsererror');
    if (parseError) {
        throw new Error('XML parsing error: ' + parseError.textContent);
    }

    return doc;
}

function getTextContent(element, tagName) {
    const el = element.querySelector(tagName);
    return el ? el.textContent : null;
}

function queryElements(element, tagName) {
    return Array.from(element.querySelectorAll(tagName));
}

function extractGPXTracks(gpx) {
    const tracks = queryElements(gpx, 'trk');
    const routes = queryElements(gpx, 'rte');

    if (tracks.length === 0 && routes.length === 0) {
        console.log('GPX file has neither tracks nor routes!', gpx);
        throw new Error('Unexpected gpx file format.');
    }

    const parsedTracks = [];

    for (const trk of tracks) {
        const name = getTextContent(trk, 'name') || 'untitled';
        let timestamp;

        for (const trkseg of queryElements(trk, 'trkseg')) {
            const points = [];

            for (const trkpt of queryElements(trkseg, 'trkpt')) {
                const timeEl = trkpt.querySelector('time');
                if (timeEl && timeEl.textContent) {
                    timestamp = new Date(timeEl.textContent);
                }

                const lat = trkpt.getAttribute('lat');
                const lon = trkpt.getAttribute('lon');

                if (lat !== null && lon !== null) {
                    points.push({
                        lat: parseFloat(lat),
                        lng: parseFloat(lon),
                        // These are available to us, but are currently unused
                        // elev: parseFloat(getTextContent(trkpt, 'ele')) || 0,
                    });
                }
            }

            if (points.length > 0) {
                parsedTracks.push({ timestamp, points, name });
            }
        }
    }

    for (const rte of routes) {
        const name = getTextContent(rte, 'name') || 'untitled';
        let timestamp;
        const points = [];

        for (const pt of queryElements(rte, 'rtept')) {
            const timeEl = pt.querySelector('time');
            if (timeEl && timeEl.textContent) {
                timestamp = new Date(timeEl.textContent);
            }

            const lat = pt.getAttribute('lat');
            const lon = pt.getAttribute('lon');

            if (lat !== null && lon !== null) {
                points.push({
                    lat: parseFloat(lat),
                    lng: parseFloat(lon),
                });
            }
        }

        if (points.length > 0) {
            parsedTracks.push({ timestamp, points, name });
        }
    }

    return parsedTracks;
}

function extractTCXTracks(tcx, name) {
    const activities = queryElements(tcx, 'Activity');

    if (activities.length === 0) {
        console.log('TCX file has no activities!', tcx);
        throw new Error('Unexpected tcx file format.');
    }

    const parsedTracks = [];

    for (const activity of activities) {
        const laps = queryElements(activity, 'Lap');

        for (const lap of laps) {
            const tracks = queryElements(lap, 'Track');
            if (tracks.length === 0) {
                continue;
            }

            for (const track of tracks) {
                const trackPoints = queryElements(track, 'Trackpoint')
                    .filter(tp => tp.querySelector('Position'));

                let timestamp;
                const points = [];

                for (const trkpt of trackPoints) {
                    const timeEl = trkpt.querySelector('Time');
                    if (timeEl && timeEl.textContent) {
                        timestamp = new Date(timeEl.textContent);
                    }

                    const position = trkpt.querySelector('Position');
                    if (position) {
                        const latEl = position.querySelector('LatitudeDegrees');
                        const lngEl =
                            position.querySelector('LongitudeDegrees');

                        if (latEl && lngEl) {
                            points.push({
                                lat: parseFloat(latEl.textContent),
                                lng: parseFloat(lngEl.textContent),
                                // These are available to us, but are currently unused
                                // elev: parseFloat(getTextContent(trkpt, 'ElevationMeters')) || 0,
                            });
                        }
                    }
                }

                if (points.length > 0) {
                    parsedTracks.push({ timestamp, points, name });
                }
            }
        }
    }

    return parsedTracks;
}

function extractFITTracks(fit, name) {
    if (!fit.records || fit.records.length === 0) {
        console.log('FIT file has no records!', fit);
        throw new Error('Unexpected FIT file format.');
    }

    let timestamp;
    const points = [];
    for (const record of fit.records) {
        if (record.position_lat && record.position_long) {
            points.push({
                lat: record.position_lat,
                lng: record.position_long,
                // Other available fields: timestamp, distance, altitude, speed, heart_rate
            });
        }
        record.timestamp && (timestamp = record.timestamp);
    }

    return points.length > 0 ? [{ timestamp, points, name }] : [];
}

function extractIGCTracks(igc) {
    const points = [];
    let timestamp = null;
    for (const fix of igc.fixes) {
        points.push({
            lat: fix.latitude,
            lng: fix.longitude,
            // Other available fields: pressureAltitude, gpsAltitude, etc.
        });
        timestamp = timestamp || new Date(fix.timestamp);
    }
    const name = 'igc';
    return points.length > 0 ? [{ timestamp, points, name }] : [];
}

function extractSKIZTracks(skiz) {
    const points = [];
    let timestamp = null;

    for (const node of skiz.trackNodes) {
        points.push({
            lat: node.latitude,
            lng: node.longitude,
        });

        node.timestamp && (timestamp = node.timestamp);
    }

    const name = 'skiz';
    return points.length > 0 ? [{ timestamp, points, name }] : [];
}

function decompressFile(file) {
    const stream = file
        .stream()
        .pipeThrough(new window.DecompressionStream('gzip'));
    return new Response(stream);
}

async function readFile(file, encoding, isGzipped) {
    const stream = isGzipped ? decompressFile(file) : file;
    const buffer = await stream.arrayBuffer();

    return encoding === 'text' 
        ? new TextDecoder().decode(buffer) 
        : buffer;
}

export default function extractTracks(file) {
    const isGzipped = /\.gz$/i.test(file.name);
    const strippedName = file.name.replace(/\.gz$/i, '');
    const format = strippedName.split('.').pop().toLowerCase();

    switch (format) {
    /* Handle XML based file formats the same way */
    case 'gpx':
    case 'tcx':
        return readFile(file, 'text', isGzipped)
            .then(textContents => new Promise((resolve, reject) => {
                const doc = parseXML(textContents);

                if (doc.querySelector('gpx')) {
                    resolve(extractGPXTracks(doc));
                } else if (doc.querySelector('TrainingCenterDatabase')) {
                    resolve(extractTCXTracks(doc, strippedName));
                } else {
                    reject(new Error('Invalid file type.'));
                }
            }));

    case 'fit':
        return readFile(file, 'binary', isGzipped)
            .then(contents => new Promise((resolve, reject) => {
                const parser = new FitParser({
                    force: true,
                    mode: 'list',
                });

                parser.parse(contents, (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(extractFITTracks(result, strippedName));
                    }
                });
            }));

    case 'igc':
        return readFile(file, 'text', isGzipped)
            .then(textContents => new Promise((resolve, reject) => {
                try {
                    resolve(extractIGCTracks(IGCParser.parse(textContents, {lenient: true})));
                } catch(err) {
                    reject(err);
                }
            }));

    case 'skiz':
        return readFile(file, 'binary', isGzipped)
            .then(contents => new Promise((resolve, reject) => {
                parseSkizFile(contents, (err, result) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(extractSKIZTracks(result));
                    }
                });
            }));

    default:
        throw `Unsupported file format: ${format}`;
    }
}
