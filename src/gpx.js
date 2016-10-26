// This file is adapted from taterbase/gpx-parser
//
// https://github.com/taterbase/gpx-parser

var xml2js = require('xml2js');

var parser = new xml2js.Parser();

var getTrk = function(gpx) {
    if (gpx.trk.length !== 1 || gpx.trk[0].trkseg.length !== 1) {
        console.log('Wild assumptions failed: trk.length = 1', gpx.trk);
    }

    var points = gpx.trk[0].trkseg[0].trkpt.map(trkpt => (
        {
            lat: parseFloat(trkpt.$.lat),
            lng: parseFloat(trkpt.$.lon),
            elev: parseFloat(trkpt.ele) || 0,
            time: new Date(trkpt.time || '0')
        }
    ));

    return {
        points: points,
        name: gpx.trk[0].name
    };
};

var GpxParser = function(gpx, callback) {
    parser.parseString(gpx, (err, result) => {
        if (err) {
            return callback(new Error("gpx: XML Parse Error: " + err.message));
        }

        return callback(null, getTrk(result.gpx));
    });
};


module.exports = GpxParser;
