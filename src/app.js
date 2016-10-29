require('../style.css');

var jquery = require('jquery');

var GpxMap = require('./map'),
    ui = require('./ui');


function app() {
    var map = new GpxMap();
    ui.initialize(map);
}

jquery(document).ready(app);
