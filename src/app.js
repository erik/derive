require('../style.css');

var jquery = require('jquery');

var map = require('./map');
var ui = require('./ui');


function app() {
    map.initialize();
    ui.initialize();
}

jquery(document).ready(app);
