import EXIF from 'exif-js';


function degMinSecToDecimal(dms) {
    return dms[0].numerator + dms[1].numerator /
        (60 * dms[1].denominator) + dms[2].numerator / 
        (3600 * dms[2].denominator);
}

export default class Image {
    constructor(imageFile) {
        this.imageFile = imageFile;
        this.imageData = null;
        this.hasParsedExif = false;
    }

    extractExifData() {
        let self = this;
        return new Promise(resolve => {
            if (self.hasParsedExif) { resolve(self); }
            EXIF.getData(this.imageFile, function() {
                self.width = EXIF.getTag(this, 'PixelXDimension');
                self.height = EXIF.getTag(this, 'PixelYDimension');

                let lat = EXIF.getTag(this, 'GPSLatitude');
                let lng = EXIF.getTag(this, 'GPSLongitude');
                let latRef = EXIF.getTag(this, 'GPSLatitudeRef');
                let lngRef = EXIF.getTag(this, 'GPSLongitudeRef');

                if (!lat || !lng || !latRef || !lngRef) { 
                    console.log('Image has no geolocation data', this);
                    return resolve(null); 
                }

                let latDecimal = degMinSecToDecimal(lat);
                let lngDecimal = degMinSecToDecimal(lng);

                let latMultiplier = latRef === 'N' ? 1 : -1;
                let lngMultiplier = lngRef === 'E' ? 1 : -1;

                self.latitude = latDecimal * latMultiplier;                
                self.longitude = lngDecimal * lngMultiplier;

                self.hasParsedExif = true;
                resolve(self);
            });
        });
    }

    getImageData() {
        let self = this;
        return new Promise(resolve => {
            if (self.imageData != null) {
                return resolve(self.imageData);
            }

            let reader = new FileReader();
            reader.onload = () => {
                self.imageData = reader.result;
                return resolve(reader.result);
            };
            reader.readAsDataURL(this.imageFile, 'UTF-8');                    
        });
    }

}
