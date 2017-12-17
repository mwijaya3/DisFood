var map; // The google map object

var mapUtility = {

    marker: null,

    deferred: [], // for deferring restyle() call

    config: {
        color: 'red',
        missing_color: 'gray',
    },

    initGoogleApi: function() {

        // load key, dynamically load external js script from google api
        //      documnet load -> key load -> api js load -> initial map
        var xhr = new XMLHttpRequest();
        xhr.onload = function() {
            var csa7k = xhr.responseText;
            var script = document.createElement('script');
            script.onload = function () {
                //nothing explicit to do here
            };
            script.async = true;
            script.defer = true;
            script.src = 'https://maps.googleapis.com/maps/api/js?key=' + csa7k + '&callback=mapUtility.initMap';
            document.head.appendChild(script);
        };
        xhr.open('GET', 'static/csnk87s40r');
        xhr.send();

    },

    initMap: function() {

        ////// manually load files for checking its format
        // var xhr = new XMLHttpRequest();
        // xhr.onload = function() {
        //     var gacounty = JSON.parse(xhr.responseText);
        //     console.log(gacounty);
        //     var boundaries = gacounty.counties
        // };
        // xhr.open("GET", "geojson_ga.json");
        // xhr.send();

        map = new google.maps.Map(document.getElementById('map'), {
          center: {lat: 32.8656, lng: -82.9001},
          zoom: 7,
        });

        // get and draw county boundaries
        this.drawCounty();

    },

    drawCounty: function() {
        map.data.loadGeoJson('static/geojson_ga.json');

        this.deferred.forEach(function(o) {
            // need to specify <this> here
            o.fn.apply(mapUtility, [o.arg1, o.arg2]);
        })
    },

    linearScale: function(min, max) { // map to [0, 1]
        var fn = function(x) {
            if (max === 0) return 0;
            return (x - min) / (max - min);
        }
        return fn;
    },

    linearScaleFromDict: function(dict, key) {
        var arr = Object.values(dict).filter(function(obj) {
            return (!isNaN(obj[key]));
        });
        // console.log(arr)
        if (arr.length == 0) return this.linearScale(0,0);
        var min = max = arr[0][key];
        arr.forEach(function(obj) {
            var v = obj[key];
            if (v < min) min = v;
            if (v > max) max = v;
        });
        // console.log(max + ' ' + min);
        // console.log(this.linearScale(min,max)(min+0.41*(max-min)));
        return this.linearScale(min, max);
    },


    restyle: function(countyDict, orderby) {
        // console.log(map);

        // If this function is called before the map is ready, defer
        //      it and store the fn and args in a "queue" object
        // This is for the first update call by the angular app
        if (!map) {
            // console.log(this.deferred);
            this.deferred.push({
                fn: this.restyle,
                arg1: countyDict,
                arg2: orderby,
            })
            return;
        }

        var scale = this.linearScaleFromDict(countyDict, orderby);
        // console.log(Object.keys(countyDict));

        map.data.setStyle(function(feature) {
            // console.log(feature);
            var county_geoid = feature.getProperty('geo_id');
            var countydata = countyDict[county_geoid];
            var opacity, color;
            var min_opac = 0.1;
            var max_opac = 0.8;

            if (!countydata || isNaN(scale(countydata[orderby]))) {
                // county with data missing
                color = mapUtility.config.missing_color;
                opacity = 0.2;
            } else {
                // console.log(scale(countydata[orderby]));
                color = mapUtility.config.color;
                opacity = min_opac + max_opac * scale(countydata[orderby]);
                // console.log(opacity);
            }


            return {
                strokeWeight: 1,
                strokeOpacity: 0.5,
                fillColor: color,
                fillOpacity: opacity,
            };
        })
    },


    addMarker: function(entry) {
        var loc = { lat: entry.lat, lng: entry.lng };

        if(this.marker) this.marker.setMap(null);

        this.marker = new google.maps.Marker({
            position: loc,
            map: map,
            title: 'Tract ' + entry.geoid + ' in ' + entry.county,
            animation: google.maps.Animation.DROP,
            icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
        });

        map.setCenter(this.marker.position);
        map.setZoom(9);
    },

    highlightCounty: function(county_geoid) {
        // console.log(county_geoid);
        map.data.revertStyle();
        map.data.forEach(function(feature) {
            if(feature.getProperty('geo_id') === county_geoid) {
                map.data.overrideStyle(feature, {
                    strokeWeight: 3,
                    strokeOpacity: 0.8,
                });
            }
        });
    },

    removeHighlight: function() {
        map.data.revertStyle();
    }
};



function mainPage() {

    location.href = "../Viz/index.html";

}
