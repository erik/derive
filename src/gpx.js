// This file is adapted from taterbase/gpx-parser
//
// https://github.com/taterbase/gpx-parser

var xml2js = require('xml2js'),
    parser = new xml2js.Parser();


var extractTrack = function(gpx) {
    if (gpx.trk.length !== 1 || gpx.trk[0].trkseg.length !== 1) {
        console.log('Wild assumptions failed: trk.length = 1', gpx.trk);
        throw new Error('Unexpected gpx file format.');
    }

    var points = gpx.trk[0].trkseg[0].trkpt.map(trkpt => ({
        lat: parseFloat(trkpt.$.lat),
        lng: parseFloat(trkpt.$.lon),
        elev: parseFloat(trkpt.ele) || 0,
        time: new Date(trkpt.time || '0')
    }));

    return {
        points: points,
        name: gpx.trk[0].name[0]
    };
};


module.exports = function(gpxString, cb) {
    return parser.parseString(gpxString, (err, result) => {
        if (err) return cb(err);
        if (!result.gpx) return cb(new Error("Invalid file type."));

        return cb(null, extractTrack(result.gpx));
    });
};
