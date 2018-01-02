// This file is adapted from taterbase/gpx-parser
//
// https://github.com/taterbase/gpx-parser

import xml2js from 'xml2js';


const parser = new xml2js.Parser();


function extractTrack(gpx) {
    if (!gpx.trk || gpx.trk.length !== 1 || gpx.trk[0].trkseg.length !== 1) {
        console.log('Wild assumptions failed: trk.length = 1', gpx.trk);
        throw new Error('Unexpected gpx file format.');
    }

    let points = gpx.trk[0].trkseg[0].trkpt.map(trkpt => ({
        lat: parseFloat(trkpt.$.lat),
        lng: parseFloat(trkpt.$.lon),
        // These are available to us, but are currently unused
        // elev: parseFloat(trkpt.ele) || 0,
        // time: new Date(trkpt.time || '0')
    }))

    return {
        points: points,
        name: gpx.trk[0].name[0]
    };
}


export default function parseGPX(gpxString) {
    return new Promise((resolve, reject) => {
        parser.parseString(gpxString, (err, result) => {
            if (err)
                reject(err);
            if (!result.gpx)
                reject(new Error("Invalid file type."));
            resolve(extractTrack(result.gpx));
        });
    });
}
