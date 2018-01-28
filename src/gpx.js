// This file is adapted from taterbase/gpx-parser
//
// https://github.com/taterbase/gpx-parser

import xml2js from 'xml2js';


const parser = new xml2js.Parser();


function extractTracks(gpx) {
    if (!gpx.trk) {
        console.log('GPX file has no tracks!', gpx);
        throw new Error('Unexpected gpx file format.');
    }

    let parsedTracks = [];

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


export default function parseGPX(gpxString) {
    return new Promise((resolve, reject) => {
        parser.parseString(gpxString, (err, result) => {
            if (err) {
                reject(err);
            } else if (!result.gpx) {
                reject(new Error('Invalid file type.'));
            } else {
                resolve(extractTracks(result.gpx));
            }
        });
    });
}
