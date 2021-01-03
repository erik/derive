// This file is adapted from taterbase/gpx-parser
//
// https://github.com/taterbase/gpx-parser
//
// See https://www.topografix.com/gpx/1/1 for details on the schema for
// GPX files.

import xml2js from 'xml2js';
import FitParser from 'fit-file-parser';
import Pako from 'pako';
import IGCParser from 'igc-parser';

const parser = new xml2js.Parser();

function extractGPXTracks(gpx) {
    if (!gpx.trk && !gpx.rte) {
        console.log('GPX file has neither tracks nor routes!', gpx);
        throw new Error('Unexpected gpx file format.');
    }

    const parsedTracks = [];

    gpx.trk && gpx.trk.forEach(trk => {
        let name = trk.name && trk.name.length > 0 ? trk.name[0] : 'untitled';
        let timestamp;

        trk.trkseg.forEach(trkseg => {
            let points = [];
            for (let trkpt of trkseg.trkpt || []) {
                if (trkpt.time && typeof trkpt.time[0] === 'string') {
                    timestamp = new Date(trkpt.time[0]);
                }
                if (typeof trkpt.$ !== 'undefined' &&
                    typeof trkpt.$.lat !== 'undefined' &&
                    typeof trkpt.$.lon !== 'undefined') {
                    points.push({
                        lat: parseFloat(trkpt.$.lat),
                        lng: parseFloat(trkpt.$.lon),
                        // These are available to us, but are currently unused
                        // elev: parseFloat(trkpt.ele) || 0,
                    });
                }
            }

            if (points.length > 0) {
                parsedTracks.push({timestamp, points, name});
            }
        });
    });

    gpx.rte && gpx.rte.forEach(rte => {
        let name = rte.name && rte.name.length > 0 ? rte.name[0] : 'untitled';
        let timestamp;
        let points = [];
        for (let pt of rte.rtept || []) {
            if (pt.time && typeof pt.time[0] === 'string') {
                timestamp = new Date(pt.time[0]);
            }
            points.push({
                lat: parseFloat(pt.$.lat),
                lng: parseFloat(pt.$.lon),
            });
        }

        if (points.length > 0) {
            parsedTracks.push({timestamp, points, name});
        }
    });

    return parsedTracks;
}

function extractTCXTracks(tcx, name) {
    if (!tcx.Activities) {
        console.log('TCX file has no activities!', tcx);
        throw new Error('Unexpected tcx file format.');
    }

    const parsedTracks = [];
    for (const act of tcx.Activities[0].Activity) {
        for (const lap of act.Lap || []) {
            if (!lap.Track || lap.Track.length === 0) {
                continue;
            }
            let trackPoints = lap.Track[0].Trackpoint.filter(it => it.Position);
            let timestamp;
            let points = []

            for (let trkpt of trackPoints) {
                if (trkpt.Time && typeof trkpt.Time[0] === 'string') {
                    timestamp = new Date(trkpt.Time[0]);
                }
                points.push({
                    lat: parseFloat(trkpt.Position[0].LatitudeDegrees[0]),
                    lng: parseFloat(trkpt.Position[0].LongitudeDegrees[0]),
                    // These are available to us, but are currently unused
                    // elev: parseFloat(trkpt.ElevationMeters[0]) || 0,
                });
            }

            if (points.length > 0) {
                parsedTracks.push({timestamp, points, name});
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

    return points.length > 0 ? [{timestamp, points, name}] : [];
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
  return points.length > 0 ? [{timestamp, points, name}] : [];
}

function readFile(file, encoding, isGzipped) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target.result;
            try {
                return resolve(isGzipped ? Pako.inflate(result) : result);
            } catch (e) {
                return reject(e);
            }
        };

        if (encoding === 'binary') {
            reader.readAsArrayBuffer(file);
        } else {
            reader.readAsText(file);
        }
    });
}

export default function extractTracks(file) {
    const isGzipped = /\.gz$/i.test(file.name);
    const strippedName = file.name.replace(/\.gz$/i, '');
    const format = strippedName.split('.').pop().toLowerCase();

    switch (format) {
    case 'gpx':
    case 'tcx': /* Handle XML based file formats the same way */

        return readFile(file, 'text', isGzipped)
            .then(textContents => new Promise((resolve, reject) => {
                parser.parseString(textContents, (err, result) => {
                    if (err) {
                        reject(err);
                    } else if (result.gpx) {
                        resolve(extractGPXTracks(result.gpx));
                    } else if (result.TrainingCenterDatabase) {
                        resolve(extractTCXTracks(result.TrainingCenterDatabase, strippedName));
                    } else {
                        reject(new Error('Invalid file type.'));
                    }
                });
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

    default:
        throw `Unsupported file format: ${format}`;
    }
}
