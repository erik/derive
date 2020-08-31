import '../style.css';

import GpxMap from './map';
import {initialize} from './ui';


function app() {
    let map = new GpxMap();
    map.restoreSavedOptions();

    initialize(map);
}


// Safari (and probably some other older browsers) don't support canvas.toBlob,
// so polyfill it in.
//
// https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob#Polyfill
if (!HTMLCanvasElement.prototype.toBlob) {
    Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
        value (callback, type, quality) {

            let binStr = atob(this.toDataURL(type, quality).split(',')[1]);
            let len = binStr.length;
            let arr = new Uint8Array(len);

            for (var i = 0; i < len; i++ ) {
                arr[i] = binStr.charCodeAt(i);
            }

            callback(new Blob([arr], {type: type || 'image/png'}));
        }
    });
}


document.addEventListener('DOMContentLoaded', app);
