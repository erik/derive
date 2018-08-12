// This file is adapted from taterbase/gpx-parser
//
// https://github.com/taterbase/gpx-parser

import xml2js from 'xml2js';


const parser = new xml2js.Parser();

function extractGPXTracks(gpx) {
    if (!gpx.trk) {
        console.log('GPX file has no tracks!', gpx);
        throw new Error('Unexpected gpx file format.');
    }

    const parsedTracks = [];

    gpx.trk.forEach(trk => {
        let name = trk.name && trk.name.length > 0 ? trk.name[0] : 'untitled';

        trk.trkseg.forEach(trkseg => {
            let points = trkseg.trkpt.map(trkpt => ({
                lat: parseFloat(trkpt.$.lat),
                lng: parseFloat(trkpt.$.lon),
                // These are available to us, but are currently unused
                // elev: parseFloat(trkpt.ele) || 0,
                // time: new Date(trkpt.time || '0')
            }));

            parsedTracks.push({points, name});
        });
    });

    return parsedTracks;
}

function extractTCXTracks(tcx, name) {
    if (!tcx.Activities) {
        console.log('TCX file has no activities!', tcx);
        throw new Error('Unexpected tcx file format.');
    }

    const parsedTracks = [];

    tcx.Activities[0].Activity.forEach(act => {
        act.Lap.forEach(lap => {
            let points = lap.Track[0].Trackpoint
                    .filter(trkpt => trkpt.Position)
                    .map(trkpt => ({
                        lat: parseFloat(trkpt.Position[0].LatitudeDegrees[0]),
                        lng: parseFloat(trkpt.Position[0].LongitudeDegrees[0]),
                        // These are available to us, but are currently unused
                        // elev: parseFloat(trkpt.ElevationMeters[0]) || 0,
                        // time: new Date(trkpt.Time[0] || '0')
                    }));
            parsedTracks.push({points, name});
        });
    });

    return parsedTracks;
}


export default function parseTrack(gpxString, name) {
    return new Promise((resolve, reject) => {
        parser.parseString(gpxString, (err, result) => {
            if (err) {
                reject(err);
            } else if (result.gpx) {
                resolve(extractGPXTracks(result.gpx));
            } else if (result.TrainingCenterDatabase) {
                resolve(extractTCXTracks(result.TrainingCenterDatabase, name));
            } else {
                reject(new Error('Invalid file type.'));
            }
        });
    });
}