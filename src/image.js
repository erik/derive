import EXIF from 'exif-js';


function degMinSecToDecimal(dms, isNegative) {
    const absDecimal = dms[0].numerator + dms[1].numerator /
        (60 * dms[1].denominator) + dms[2].numerator / 
        (3600 * dms[2].denominator);
    return absDecimal * (isNegative ? -1 : 1);
}

export default class Image {
    constructor(imageFile) {
        this.imageFile = imageFile;
    }

    async hasGeolocationData() {
        const latitude = await this.latitude();
        const longitude = await this.longitude();
        return latitude && longitude;
    }

    async width() {
        await this.extractExifData();
        return EXIF.getTag(this.imageFile, 'PixelXDimension');
    }

    async height() {
        await this.extractExifData();
        return EXIF.getTag(this.imageFile, 'PixelYDimension');
    }

    async latitude() {
        await this.extractExifData();
        const latitude = EXIF.getTag(this.imageFile, 'GPSLatitude');
        const latRef = EXIF.getTag(this.imageFile, 'GPSLatitudeRef');

        if (!latitude || !latRef) { throw 'No latitude data'; }

        return degMinSecToDecimal(latitude, latRef === 'S');
    }

    async longitude() {
        await this.extractExifData();
        const longitude = EXIF.getTag(this.imageFile, 'GPSLongitude');
        const lngRef = EXIF.getTag(this.imageFile, 'GPSLongitudeRef');

        if (!longitude || !lngRef) { throw 'No longitude data'; }

        return degMinSecToDecimal(longitude, lngRef === 'W');
    }

    async extractExifData() {
        await new Promise(resolve => EXIF.getData(this.imageFile, resolve)); 
    }

    async getImageData() {
        return new Promise(resolve => {
            let reader = new FileReader();
            reader.onload = () => {
                return resolve(reader.result);
            };
            reader.readAsDataURL(this.imageFile, 'UTF-8');                    
        });
    }

}
