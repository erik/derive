let EXIF = require('exif-js');


function degMinSecToDecimal(dms) {
    console.log(dms);
    console.log(dms[0]);
    return dms[0].numerator + dms[1].numerator /
        (60 * dms[1].denominator) + dms[2].numerator / 
        (3600 * dms[2].denominator);
}

export default class Image {
    constructor(imageFile) {
        this.imageFile = imageFile;
        this.hasParsed = false;
        this.hasLocationData = false;
        this.parse();
    }

    parse() {
        console.log('parsing', this.imageFile)
        EXIF.getData(this.imageFile, function() {
            this.width = EXIF.getTag(this, 'PixelXDimension');
            this.height = EXIF.getTag(this, 'PixelYDimension');

            let lat = EXIF.getTag(this, 'GPSLatitude');
            if (!lat) { return; }

            let latRef = EXIF.getTag(this, 'GPSLatitudeRef');
            this.latitude = degMinSecToDecimal(lat) * (latRef == 'N' ? 1 : -1);
            
            let lng = EXIF.getTag(this, 'GPSLongitude');
            let lngRef = EXIF.getTag(this, 'GPSLongitudeRef');
            this.longitude = degMinSecToDecimal(lng) * (lngRef == 'E' ? 1 : -1);
        });

    }

    getImageData(completion) {
        return new Promise(resolve => {
            let reader = new FileReader();
            reader.onload = () => {
                resolve(reader.result);

                // completion(reader.result);
            }
            reader.readAsDataURL(this.imageFile, 'UTF-8');                    
        })
        // console.log('imageData', this.imageFile)
        // let reader = new FileReader();
        // reader.onload = () => {
        //     completion(reader.result);
        // }
        // reader.readAsDataURL(this.imageFile, 'UTF-8');        
    }

}