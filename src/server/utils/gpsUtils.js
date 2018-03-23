

const getGpsCoordinates = function (coordinatesString) {
    let gpsLatLon = {
        lat: '',
        lon: ''
    };

    if (coordinatesString !== '') {
        let latLonArr = coordinatesString.split(',');
        gpsLatLon.lat = latLonArr[0];
        gpsLatLon.lon = latLonArr[1];
    }

    return gpsLatLon;
};

export default {
    getGpsCoordinates: getGpsCoordinates
}