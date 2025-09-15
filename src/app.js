import '../style.css';

import GpxMap from './map';
import {initialize} from './ui';


function app() {
    let map = new GpxMap();
    map.restoreSavedOptions();

    initialize(map);
}

document.addEventListener('DOMContentLoaded', app);