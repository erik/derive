import '../style.css'

import jquery from 'jquery'

import GpxMap from './map'
import {initialize} from './ui'


function app() {
    let map = new GpxMap()
    initialize(map)
}

jquery(document).ready(app)
