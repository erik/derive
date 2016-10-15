var jquery = require('jquery');
var leaflet = require('leaflet');


function initialize() {
    window.addEventListener('dragover', (e) => {
        handleDragOver(e);
    }, false);

    window.addEventListener('drop', (e) => {
        handleFileSelect(map, e);
    } , false);

    window.addEventListener('dragstart', (_) => {
        console.log('modal show');
        $('#modal').show();
    }, false);
}




module.exports = {
    initialize: initialize
};
