d3.queue()
    .defer(d3.json, "vizdata/us.json")
    .defer(d3.csv, "vizdata/data_with_cluster_risk_mahalanobis.csv")
    .defer(d3.csv, "vizdata/state_latlong.csv")
    .defer(d3.csv, "vizdata/usjsonidtostate.csv")
    .defer(d3.csv, "vizdata/georgia_county_FIPS.csv")
    .defer(d3.csv, "vizdata/foodpantries_location.csv")
    .await(function(error, us, data, statelatlong, idtostate, georgiaFIPS, foodpantriesdata) {
        if (error) {
            console.log("D3 Queue/file loading error: " + error);
        } else {
            processFiles(us, data, statelatlong, idtostate, georgiaFIPS, foodpantriesdata);
        }
    });

// Create the Google Map
var map = new google.maps.Map(d3.select("#map").node(), {
    zoom: 4,
    center: new google.maps.LatLng(37.4419, -102.1419),
    mapTypeId: google.maps.MapTypeId.ROADMAP, //can change ROADMAP to TERRAIN as well
    streetViewControl: false, //disables some buttons on map
    mapTypeControl: false,

    // How we want our base map to look. Customise it at https://mapstyle.withgoogle.com/
    styles:

    [
    {
        "featureType": "administrative",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "color": "#444444"
            },
            {
                "gamma": "1"
            }
        ]
    },
    {
        "featureType": "landscape",
        "elementType": "all",
        "stylers": [
            {
                "color": "#f2f2f2"
            }
        ]
    },
    {
        "featureType": "landscape",
        "elementType": "labels.text",
        "stylers": [
            {
                "visibility": "simplified"
            }
        ]
    },
    {
        "featureType": "landscape.man_made",
        "elementType": "all",
        "stylers": [
            {
                "hue": "#ff0000"
            },
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "landscape.man_made",
        "elementType": "geometry",
        "stylers": [
            {
                "visibility": "on"
            },
            {
                "hue": "#ff0000"
            },
            {
                "gamma": "1.00"
            }
        ]
    },
    {
        "featureType": "landscape.man_made",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "visibility": "on"
            },
            {
                "hue": "#00ffd6"
            },
            {
                "lightness": "10"
            },
            {
                "gamma": "1"
            },
            {
                "weight": "1.00"
            }
        ]
    },
    {
        "featureType": "landscape.man_made",
        "elementType": "geometry.stroke",
        "stylers": [
            {
                "visibility": "on"
            },
            {
                "color": "#000000"
            },
            {
                "weight": "1.00"
            }
        ]
    },
    {
        "featureType": "poi",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
    {
        "featureType": "poi.park",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "visibility": "on"
            }
        ]
    },
    {
        "featureType": "road",
        "elementType": "all",
        "stylers": [
            {
                "saturation": -100
            },
            {
                "lightness": 45
            },
            {
                "visibility": "simplified"
            }
        ]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry.fill",
        "stylers": [
            {
                "visibility": "on"
            },
            {
                "color": "#ffffff"
            }
        ]
    },
    {
        "featureType": "transit",
        "elementType": "all",
        "stylers": [
            {
                "visibility": "simplified"
            }
        ]
    },
    {
        "featureType": "transit",
        "elementType": "labels.text",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
    {
        "featureType": "water",
        "stylers": [
            {
                "hue": "#0078FF"
            },
            {
                "saturation": -13.200000000000003
            },
            {
                "lightness": 2.4000000000000057
            },
            {
                "gamma": 1
            }
        ]
    }
]



});


var dataset;

//////////
var dataset_fips_keyed;
var stateLatLong = {};
var idToStateName = {};
var stateNameToId = {};
var linkStateCounty = {};
var georgiaCountyFIPS = {};
var georgiaData;

var states;
var counties;
var foodpantries;
//////////

// Create layers overlay
function processFiles(us, data, statelatlong, idtostate, georgiaFIPS, foodpantriesdata) {

    states = topojson.feature(us, us.objects.states).features;
    counties = topojson.feature(us, us.objects.counties).features;

    // Function to create basic US map layer
    mapLayer(us);

    // Data, convert to numeric
    data.map(function(d) {
        var col_names = Object.keys(d);

        for (var i = 2; i < col_names.length; i++) {
            d[col_names[i]] = +d[col_names[i]];
        };
    });

    dataset = data;

    // have a new dataset obj key-ed by fips_code, and only contains columns to be used
    dataset_fips_keyed = {};
    dataset.forEach(function(entry) {
        var stats = dataset_fips_keyed[+entry.FIPS_Codes]; // note county id in topojson is formatted as numbers (01001 = 1001)
        if (!stats) {
            var col_names = Object.keys(entry);
            stats = {};

            for (var i = 0; i < col_names.length; i++) {
                stats[col_names[i]] = entry[col_names[i]];
            };

            dataset_fips_keyed[+entry.FIPS_Codes] = stats;
        }
    });

    data_pruned = Object.values(dataset_fips_keyed);

    addDiabetesLayer(data_pruned);
    addObesityLayer(data_pruned);
    addInsecurityLayer(data_pruned);
    addClusterLayer(us);

    // Handles drop down to choose States
    var options = d3.select("body")
        .select("select")
        .selectAll("option")
        .data(statelatlong)
        .enter()
        .append("option")
        .text(function(d) {return d.State;});

    // Process data. key: State. value: latitude, longitude
    statelatlong.forEach(function(entry) {
        stateLatLong[entry.State] = {
            latitude: +entry.Latitude,
            longitude: +entry.Longitude
        }});

    idtostate.forEach(function(entry) {
        idToStateName[+entry.ID] = {name: entry.State}});

    idtostate.forEach(function(entry) {
        stateNameToId[entry.State] = {id: +entry.ID}});

    // Create a dataset that links State to FIPS Codes
    for (i in idToStateName) {
        var stateData = dataset.filter(function(d) {
            return d.State_ID == i;
        });
        linkStateCounty[i] = [];
        stateData.forEach(function(d) {
            linkStateCounty[i].push(d.FIPS_Codes);
        });
    };

    // Code below process data that is specific to Georgia.
    // Analytics panel, line charts only have options for Georgia counties.
    georgiaData = data_pruned.filter(function(d) {
        return d.State == "Georgia";});

    addAnalytics(georgiaData);

    georgiaFIPS.forEach(function(d) {
        georgiaCountyFIPS[d.County] = +d.FIPS_Codes;
    });


    foodpantries = foodpantriesdata;
    addPantries();

    addRiskLayer(us);

};



// Create size scale for circle size
// I use a cube scale to emphasize areas with higher disease levels
var sizeScale = d3.scale.pow().exponent(3)
    .range([1, 12]);

var diabetesOverlay = new google.maps.OverlayView();
var diabetesLayer;

function addDiabetesLayer(diabetes) {
    // Set domain for size scale
    sizeScale.domain( d3.extent(diabetes, function(d) {return d.Percent_2010_dia;}) );

    diabetesOverlay.onAdd = function() {

        diabetesLayer = d3.select(this.getPanes().overlayShadow)
            .append("div")
            .attr("class", "diabetesLayer")
            .style("visibility", "hidden");

        var projection = this.getProjection(),
            padding = 12;

        var marker_container = diabetesLayer.selectAll("svg")
            .data(diabetes)
            .enter()
            .append("svg");
        var marker = marker_container
            .append("circle")
            .attr("class", "diabetesCircle")
            .attr("r", function(d) {
                return sizeScale(d.Percent_2010_dia);
            })
            .attr("cx", padding)
            .attr("cy", padding);

        function transform(d) {
            d = new google.maps.LatLng(d.INTPTLAT, d.INTPTLONG);
            d = projection.fromLatLngToDivPixel(d);
            return d3.select(this)
                .style("left", (d.x - padding) + "px")
                .style("top", (d.y - padding) + "px");
        }

        // Adds the actual elements, which are points in this case, onto overlay
        diabetesOverlay.draw = function() {
            marker_container.each(transform);
        };
    };

    // Bind overlay to the map
    diabetesOverlay.setMap(map);
};


// Function to toggle visibility for disease layer
// Called when user press button
diabetesOverlay.toggle = function() {

    if (diabetesLayer.style()[0][0].style.visibility === "hidden") {
        diabetesLayer.style()[0][0].style.visibility = "visible";
        d3.select("#diabetesBtn").style("background", "#b5b5b5");
    } else {
        diabetesLayer.style()[0][0].style.visibility = "hidden";
        d3.select("#diabetesBtn").style("background", "#F5F5F5");
    }
};


// Create size scale for circle size.
// I use a cube scale to emphasize areas with higher disease levels
var sizeScale2 = d3.scale.pow().exponent(3)
    .range([1, 12]);


var obesityLayer;
var obesityOverlay = new google.maps.OverlayView();
function addObesityLayer(obesity) {

    // Set domain for size scale
    sizeScale2.domain( d3.extent(obesity, function(d) {return d.Percent_2010_ob;}) );

    obesityOverlay.onAdd = function() {

        obesityLayer = d3.select(this.getPanes().overlayShadow) // This uses 'overlayShadow' (Pane 2)
            .append("div")
            .attr("class", "obesityLayer")
            .style("visibility", "hidden");

        var projection = this.getProjection();
        var padding = 12;

        var marker_container = obesityLayer.selectAll("svg")
            .data(obesity)
            .enter()
            .append("svg");
        var marker = marker_container
            .append("circle")
            .attr("class", "obesityCircle")
            .attr("r", function(d) {return sizeScale2(d.Percent_2010_ob);})
            .attr("cx", padding)
            .attr("cy", padding);

        var transform = function(d) {
            d = new google.maps.LatLng(d.INTPTLAT, d.INTPTLONG);
            d = projection.fromLatLngToDivPixel(d);
            return d3.select(this)
                .style("left", (d.x - padding) + "px")
                .style("top", (d.y - padding) + "px");
        }

        // Adds the actual elements, which are points in this case, onto overlay
        obesityOverlay.draw = function() {
            marker_container.each(transform);
        };
    };

    // Bind overlay to the map
    obesityOverlay.setMap(map);
};


// Function to toggle visibility for obesity layer
// Called when user press button
obesityOverlay.toggle = function() {

    if (obesityLayer.style()[0][0].style.visibility === "hidden") {
        obesityLayer.style()[0][0].style.visibility = "visible";
        d3.select("#obesityBtn").style("background", "#b5b5b5");
    } else {
        obesityLayer.style()[0][0].style.visibility = "hidden";
        d3.select("#obesityBtn").style("background", "#F5F5F5");
    }
};

// global size for both insecurity later and map border layer
var w = 15000;
var h = 15000;

// Create size scale for circle size.
// I use a cube scale to emphasize areas with higher disease levels
var sizeScaleInsecurity = d3.scale.pow().exponent(3)
    .range([1, 12]);

var insecurityLayer;
var insecurityOverlay = new google.maps.OverlayView();
function addInsecurityLayer(insecurity) {

    // Set domain for size scale
    sizeScaleInsecurity.domain( d3.extent(insecurity, function(d) {return d.Food_Insecurity_Rate;}) );

    insecurityOverlay.onAdd = function() {

        insecurityLayer = d3.select(this.getPanes().overlayShadow) // This uses 'overlayShadow' (Pane 2)
            .append("div")
            .attr("class", "insecurityLayer")
            .style("visibility", "hidden");

        var projection = this.getProjection();
        var padding = 12;

        var marker_container = insecurityLayer.selectAll("svg")
            .data(insecurity)
            .enter()
            .append("svg");
        var marker = marker_container
            .append("circle")
            .attr("class", "insecurityCircle")
            .attr("r", function(d) {return sizeScaleInsecurity(d.Food_Insecurity_Rate);})
            .attr("cx", padding)
            .attr("cy", padding);

        var transform = function(d) {
            d = new google.maps.LatLng(d.INTPTLAT, d.INTPTLONG);
            d = projection.fromLatLngToDivPixel(d);
            return d3.select(this)
                .style("left", (d.x - padding) + "px")
                .style("top", (d.y - padding) + "px");
        }

        // Adds the actual elements, which are points in this case, onto overlay
        insecurityOverlay.draw = function() {
            marker_container.each(transform);
        };
    };

    // Bind overlay to the map
    insecurityOverlay.setMap(map);
};




// Function to toggle visibility for insecurity layer
// Called when user press button
insecurityOverlay.toggle = function() {

    if (insecurityLayer.style()[0][0].style.visibility === "hidden") {
        insecurityLayer.style()[0][0].style.visibility = "visible";
        d3.select("#insecurityBtn").style("background", "#b5b5b5");
    } else {
        insecurityLayer.style()[0][0].style.visibility = "hidden";
        d3.select("#insecurityBtn").style("background", "#F5F5F5");
    }

};



// 6 colors for 6 clusters
var clusterColors = ['#377eb8','#e41a1c','#4daf4a','#984ea3','#ff7f00','#ffff33'];

var clusterLayer;
var clusterOverlay = new google.maps.OverlayView();

function addClusterLayer(us) {

    clusterOverlay.onAdd = function() {

        clusterLayer = d3.select(this.getPanes().mapPane)
            .append("div")
            .attr("class", "svgLayer")
            .style("visibility", "hidden");

        // use svg with large width and height with (0,0) at the center
        //      - this is a dirty fix to svg-size problem
        var svg = clusterLayer.append("svg")
            .attr('width', w)
            .attr('height', h)
            .attr("transform", "translate(" + (-w/2) + "," + (-h/2) + ")")
            .attr("id", "cluster_layer_svg");

        // the main (update) selection, saved just in case
        var countySvg = svg.append("g")
            .attr("class", "countySvg")
            .selectAll(".path")
            .data(counties)

        // the paths selection - only need to update the "d" attribute of the paths later
        var countySvg_paths = countySvg.enter().append("path")
            .attr("transform", "translate(" + (w/2) + "," + (h/2) + ")")
            .attr("class", "clusterCounty")
            .style("fill", function(d,i) {
                var stats = dataset_fips_keyed[d.id];
                return stats ? clusterColors[stats.disfood] : "#c2c2c2";
            });


        var overlayProjection = this.getProjection();

        // Turn the overlay projection into a d3 projection; Converts into pixels
        var googleMapProjection = function(coordinates) {
            var googleCoordinates = new google.maps.LatLng(coordinates[1], coordinates[0]);
            var pixelCoordinates = overlayProjection.fromLatLngToDivPixel(googleCoordinates);
            return [pixelCoordinates.x, pixelCoordinates.y];
        }

        var path = d3.geo.path().projection(googleMapProjection);


        clusterOverlay.draw = function() {
            countySvg_paths
                .attr("d", path)
        }
    }

    // Bind overlay to map
    clusterOverlay.setMap(map);

};

// Function to toggle visibility for insecurity layer
// Called when user press button
clusterOverlay.toggle = function() {

    if (clusterLayer.style()[0][0].style.visibility === "hidden") {
        clusterLayer.style()[0][0].style.visibility = "visible";
        d3.select("#clusterBtn").style("background", "#b5b5b5");
    } else {
        clusterLayer.style()[0][0].style.visibility = "hidden";
        d3.select("#clusterBtn").style("background", "#F5F5F5");
    }

};


// Create tooltip
var tip = d3.tip()
    .attr("class", "d3-tip")
    .offset([-10,0]);

var path;

function mapLayer(us) {

    var mapOverlay = new google.maps.OverlayView();

    mapOverlay.onAdd = function() {

        var layer = d3.select(this.getPanes().floatShadow) // This uses 'floatShadow' (Pane 4)
            .append("div")
            .attr("class", "svgLayer");

        // use svg with large width and height with (0,0) at the center
        //      - this is a dirty fix to svg-size problem
        var svg = layer.append("svg")
            .attr('width', w)
            .attr('height', h)
            .attr("transform", "translate(" + (-w/2) + "," + (-h/2) + ")");

        // the paths selections - only need to update the "d" attribute of the paths later
        var stateBorder = svg.append("g")
            .attr("class", "stateBorder")
            .selectAll(".path")
            .data(states);
        stateBorder.enter().append("path")
            .attr("class", "indivStateBorder")
            .attr("transform", "translate(" + (w/2) + "," + (h/2) + ")")
            .on("click", function(d) {               //when click on a state, zoom there.
                d3.select("select").property("value", idToStateName[d.id].name);
                changeState();
            });


        countyBorder = svg.append("g")
            .attr("class", "countyBorder")
            .selectAll(".path")
            .data([ counties[3218], counties[3219] ]);
        countyBorder.enter().append("path")
            .attr("class", "indivCountyBorder")
            .attr("transform", "translate(" + (w/2) + "," + (h/2) + ")");



        var overlayProjection = this.getProjection();

        // Turn the overlay projection into a d3 projection; Converts into pixels
        var googleMapProjection = function(coordinates) {
            var googleCoordinates = new google.maps.LatLng(coordinates[1], coordinates[0]);
            var pixelCoordinates = overlayProjection.fromLatLngToDivPixel(googleCoordinates);
            return [pixelCoordinates.x, pixelCoordinates.y];
        }

        path = d3.geo.path().projection(googleMapProjection);

        mapOverlay.draw = function() {

            if (map.getZoom() < 6) {

                stateBorder
                    .attr("d", path);
                countyBorder
                    .attr("visibility", "hidden")
                    .attr("d", path);

            } else {

                stateBorder
                    .attr("d",path);

                countyBorder
                    .attr("visibility", "visible")
                    .attr("d", path);

                countyBorder
                    .on("mouseover", tip.show)
                    .on("mouseout", tip.hide);
            }



            tip.html(function(d) {
                var string = "<b>";

                var stat = dataset_fips_keyed[d.id];

                string = string + stat.County + "</b><br>Diabetes: <span style='float:right;'>" + stat.Percent_2010_dia + "%</span>";
                string = string + "<br>Obesity: <span style='float:right;'>" + stat.Percent_2010_ob + "%</span>";
                string = string + "<br>Food Insecurity: &ensp;  <span style='float:right;'>" + (stat.Food_Insecurity_Rate * 100).toFixed(1) + "%</span>"; //changes insecurity to percent, and round off 1 decimal

                return string;
            });
            svg.call(tip);
        }
    }

    // Bind overlay to map
    mapOverlay.setMap(map);
};


//jQuery to toggle analytics pane
$(document).ready(function(){
    $('#toggleSidebar').click(function(){
    var hidden = $('.hidden');
    if (hidden.hasClass('visible')){
        hidden.animate({"left": "-680px"}, "slow").removeClass('visible'); //visible class is a marker to indicate visibility
    } else {
        hidden.animate({"left": "680px"}, "slow").addClass('visible');
    }
    });
});

$(document).ready(function(){
    $('#sidebarCollapse').click(function(){
    var hidden = $('.hidden');
    if (hidden.hasClass('visible')){
        hidden.animate({"left": "-680px"}, "slow").removeClass('visible'); //visible class is a marker to indicate visibility
    } else {
        hidden.animate({"left": "680px"}, "slow").addClass('visible');
    }
    });
});



// Brings the map to selected state using drop-down;
// Tooltip is only shown for one State at a time.
function changeState() {

    var selectState = d3.select("#mapSelect").property("value");
    var latitude = stateLatLong[selectState].latitude;
    var longitude = stateLatLong[selectState].longitude;

    var panPoint = new google.maps.LatLng(latitude, longitude);
    map.setCenter(panPoint);

    if (selectState == "USA") {
        map.setZoom(4);
    } else {
        map.setZoom(6);
    };

    var stateID = stateNameToId[selectState].id;

    var newCounty = counties.filter(function(d) {
        return linkStateCounty[stateID].includes(d.id);
    });

    updateCounty(newCounty); // this updates which State to show tooltip
};



// Enter-Update-Exit for County Borders (tooltip)
var countyBorder;
function updateCounty(newCounty) {

    countyBorder = d3.select(".countyBorder")
        .selectAll(".indivCountyBorder")
        .data(newCounty)
        .attr("transform", "translate(" + (w/2) + "," + (h/2) + ")")
        .attr("d", path);

    countyBorder
        .enter().append("path")
        .attr("class", "indivCountyBorder")
        .attr("transform", "translate(" + (w/2) + "," + (h/2) + ")")
        .attr("d", path);

    countyBorder
        .on("mouseover", tip.show)
        .on("mouseout", tip.hide);

    countyBorder.exit().remove();
};


var svg;
var years = [2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013];
var xLineAxis, yLineAxis;
var x, y, line,
    x1o, y1o, line1o;

// Adds additional charts to Analytics panel
function addAnalytics(data) {

    // Appends options for Georgia counties to 'select', left drop-down
    d3.select("#lineDropdown1")
        .selectAll("option")
        .data(data)
        .enter()
        .append("option")
        .text(function(d) {return d.County;});

    // Appends options for Georgia counties to 'select', right drop-down
    d3.select("#lineDropdown2")
        .selectAll("option")
        .data(data)
        .enter()
        .append("option")
        .text(function(d) {return d.County;});

    // Initialises the first dataset to plot
    var data = georgiaData[0];

    // 'newDia' and 'newObe': data to pass to line chart
    var newDia = [];
    for (i = 0; i < years.length; i++) {
        newDia.push({"year": years[i],
                     "value": data[String.prototype.concat("Percent_", years[i], "_dia")]});
    };

    var newObe = [];
    for (i = 0; i < years.length; i++) {
        newObe.push({"year": years[i],
                     "value": data[String.prototype.concat("Percent_", years[i], "_ob")]});
    };

    // Appends SVG for the whole size of hidden div
    svg = d3.select(".hidden")
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("position", "absolute");


    //////////////////////////////////////////////////////////////////////
    // Diabetes line chart for left county (no comments given)
    // A lot repetition, but easier to do so as we need to update with new data later on
    x = d3.scale.linear()
        .range([0, 200]);

    y = d3.scale.linear()
        .range([120, 0]);

    xLineAxis = d3.svg.axis()
        .scale(x)
        .ticks(5)
        .tickFormat(d3.format("d"))
        .orient("bottom");

    yLineAxis = d3.svg.axis()
        .scale(y)
        .ticks(7)
        .orient("left");

    line = d3.svg.line()
        .x(function(d) {return x(d.year);})
        .y(function(d) {return y(d.value);});

    var lineChart = svg.append("g")
        .attr("id", "lineChart")
        .attr("transform", "translate(" + 60 + "," + 150 + ")");

    x.domain(d3.extent(newDia, function(d) {return d.year;}));
    y.domain([4,18]);

    lineChart.append("path")
        .attr("class", "line county1")
        .attr("d", line(newDia));

    lineChart.append("g")
        .attr("class", "x axis county1")
        .attr("transform", "translate(0,120)")
        .call(xLineAxis);

    lineChart.append("g")
        .attr("class", "y axis county1")
        .call(yLineAxis);

    lineChart.append("text")
        .attr("class", "x axisLabel")
        .attr("x", 200)
        .attr("y", 150)
        .text("Year");

    lineChart.append("text")
        .attr("class", "y axisLabel")
        .attr("x", 0)
        .attr("y", -13)
        .text("Diabetes");

    //////////////////////////////////////////////////////////////////////////////
    // Obesity line chart for left county (no comments given)
    x1o = d3.scale.linear()
        .range([0, 200]);

    y1o = d3.scale.linear()
        .range([120, 0]);

    xLineAxisObe = d3.svg.axis()
        .scale(x1o)
        .ticks(5)
        .tickFormat(d3.format("d"))
        .orient("bottom");

    yLineAxisObe = d3.svg.axis()
        .scale(y1o)
        .ticks(7)
        .orient("left");

    line1o = d3.svg.line()
        .x(function(d) {return x1o(d.year);})
        .y(function(d) {return y1o(d.value);});

    var lineChart1o = svg.append("g")
        .attr("id", "lineChart")
        .attr("transform", "translate(" + 60 + "," + 350 + ")");

    x1o.domain(d3.extent(newObe, function(d) {return d.year;}));
    y1o.domain([20, 40])

    lineChart1o.append("path")
        .attr("class", "line county1o")
        .attr("d", line1o(newObe));

    lineChart1o.append("g")
        .attr("class", "x axis county1o")
        .attr("transform", "translate(0,120)")
        .call(xLineAxisObe);

    lineChart1o.append("g")
        .attr("class", "y axis county1o")
        .call(yLineAxisObe);

    lineChart1o.append("text")
        .attr("class", "x axisLabel")
        .attr("x", 200)
        .attr("y", 150)
        .text("Year");

    lineChart1o.append("text")
        .attr("class", "y axisLabel")
        .attr("x", 0)
        .attr("y", -13)
        .text("Obesity");


    //////////////////////////////////////////////////////////////////////
    // Diabetes line chart for right county
    var lineChart2 = svg.append("g")
        .attr("id", "lineChart")
        .attr("transform", "translate(" + 360 + "," + 150 + ")");

    lineChart2.append("path")
        .attr("class", "line county2")
        .attr("d", line(newDia));

    lineChart2.append("g")
        .attr("class", "x axis county2")
        .attr("transform", "translate(0,120)")
        .call(xLineAxis);

    lineChart2.append("g")
        .attr("class", "y axis county2")
        .call(yLineAxis);

    lineChart2.append("text")
        .attr("class", "x axisLabel")
        .attr("x", 200)
        .attr("y", 150)
        .text("Year");

    lineChart2.append("text")
        .attr("class", "y axisLabel")
        .attr("x", 0)
        .attr("y", -13)
        .text("Diabetes");

    //////////////////////////////////////////////////////////////////////////////
    // Obesity line chart for right county
    var lineChart2o = svg.append("g")
        .attr("id", "lineChart")
        .attr("transform", "translate(" + 360 + "," + 350 + ")");

    lineChart2o.append("path")
        .attr("class", "line county2o")
        .attr("d", line1o(newObe));

    lineChart2o.append("g")
        .attr("class", "x axis county2o")
        .attr("transform", "translate(0,120)")
        .call(xLineAxisObe);

    lineChart2o.append("g")
        .attr("class", "y axis county2o")
        .call(yLineAxisObe);

    lineChart2o.append("text")
        .attr("class", "x axisLabel")
        .attr("x", 200)
        .attr("y", 150)
        .text("Year");

    lineChart2o.append("text")
        .attr("class", "y axisLabel")
        .attr("x", 0)
        .attr("y", -13)
        .text("Obesity");
};


function updateLine1() {

    var selectCounty = d3.select("#lineDropdown1").property("value");
    var selectedFIPS = georgiaCountyFIPS[selectCounty];
    var newData = dataset_fips_keyed[selectedFIPS];

    var newDia = [];
    for (i = 0; i < years.length; i++) {
        newDia.push({"year": years[i],
                     "value": newData[String.prototype.concat("Percent_", years[i], "_dia")]});
    };

    var newObe = [];
    for (i = 0; i < years.length; i++) {
        newObe.push({"year": years[i],
                     "value": newData[String.prototype.concat("Percent_", years[i], "_ob")]});
    };

    var svgLine = d3.select(".hidden").transition();

    svgLine.select(".line.county1")
        .duration(700)
        .attr("d", line(newDia));

    svgLine.select(".line.county1o")
        .duration(700)
        .attr("d", line1o(newObe));
};


function updateLine2() {

    var selectCounty = d3.select("#lineDropdown2").property("value");
    var selectedFIPS = georgiaCountyFIPS[selectCounty];
    var newData = dataset_fips_keyed[selectedFIPS];

    var newDia = [];
    for (i = 0; i < years.length; i++) {
        newDia.push({"year": years[i],
                     "value": newData[String.prototype.concat("Percent_", years[i], "_dia")]});
    };

    var newObe = [];
    for (i = 0; i < years.length; i++) {
        newObe.push({"year": years[i],
                     "value": newData[String.prototype.concat("Percent_", years[i], "_ob")]});
    };

    var svgLine = d3.select(".hidden").transition();

    svgLine.select(".line.county2")
        .duration(700)
        .attr("d", line(newDia));

    svgLine.select(".line.county2o")
        .duration(700)
        .attr("d", line1o(newObe));
};



// Trying to get coordinates of user
function getLocation() {
    if (!document.getElementById("demo").innerHTML) { //only run geolocation if haven't run before
        if (markers[1].visible) {togglePantries();};
        navigator.geolocation.getCurrentPosition(showPosition);
        d3.select("#locationBtn").style("background", "#b5b5b5");

    } else {
        document.getElementById("demo").innerHTML = "";
        d3.select("#locationBtn").style("background", "#F5F5F5");

        for (var i=0; i<threeMarkers.length; i++) {
            threeMarkers[i].setMap(null);
        };
        threeMarkers = [];
    }
}


var infowindow;
function showPosition(position) {

    var lat1 = position.coords.latitude;
    var lon1 = position.coords.longitude;

    //map food pantries data
    var foodpan_data = [];
    foodpantries.map(function(d) {

        var col_namesx = Object.keys(d);
        for (var i = 0; i < col_namesx.length; i++) {
            if (i < 5) {
                d[col_namesx[i]] = d[col_namesx[i]];
            }else {
                d[col_namesx[i]] = +d[col_namesx[i]];
            }
        };
        foodpan_data.push(d)
    });

    //calculate distance of user location to all of the food pantries location
    distance_all = [];
    for (var i=0; i < foodpan_data.length; i++) {
        distance_all.push(calcDistance(lat1, lon1, foodpan_data[i]["latitude"], foodpan_data[i]["longitude"]));
    }
    var closest_three = distance_all.concat().sort();
    closest_three = closest_three.slice(0,3);
    closest_three_index = [];
    for (var i = 0; i < closest_three.length; i++) {
        for (var e = 0; e < distance_all.length; e++) {
            if (closest_three[i] == distance_all[e]) {
                closest_three_index.push(e);
                break;
            }
        }
    }

    var s = "";

    for (i in closest_three_index) {
        s = s + "<br>" + (parseInt(i)+1) + ") " + foodpan_data[closest_three_index[i]].name;
    };

    document.getElementById("demo").innerHTML = s;

    ////////////////////////////////////////////////////////////////////////////////
    var i, newMarker;
    infowindow = new google.maps.InfoWindow({
        content: "Loading.."
    });

    for (i = 0; i < closest_three_index.length; i++) {

        var pantry = foodpantries[closest_three_index[i]];

        var contentStr = "<p>Name: " + pantry.name +
            "<br>Address: " + pantry.streetAddress +
            "<br>City: " + pantry.city + ", " + pantry.zipcode +
            "<br>Phone: " + pantry.phone + "</p>";

        var infowindow = new google.maps.InfoWindow({
            content: contentStr
        });

        newMarker = new google.maps.Marker({
            position: new google.maps.LatLng(pantry.latitude, pantry.longitude),
            map: map,
            title: pantry.name,
            html: contentStr
        });
        newMarker.addListener("click", function() {
            infowindow.setContent(this.html);
            infowindow.open(map, this);
        });

        newMarker.setVisible(true);

        threeMarkers.push(newMarker);
    };

    d3.select("#mapSelect").property("value", "Georgia");
    changeState();

    var panPoint = new google.maps.LatLng(lat1, lon1);
    map.setCenter(panPoint);
    map.setZoom(12);
};

var threeMarkers = [];


// function to calculate distance between 2 locations
function calcDistance(lat1, lon1, lat2, lon2) {
    var radlat1 = Math.PI * lat1/180
    var radlat2 = Math.PI * lat2/180
    var theta = lon1-lon2
    var radtheta = Math.PI * theta/180
    var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    dist = Math.acos(dist)
    dist = dist * 180/Math.PI
    dist = dist * 60 * 1.1515
    //if (unit=="K") { dist = dist * 1.609344 }
    //if (unit=="N") { dist = dist * 0.8684 }
    return dist
}



//Use google api to add markers of food pantries
var markers = []; //list of all markers added
function addPantries() {

    var i, newMarker;

    for (i = 0; i < foodpantries.length; i++) {
        newMarker = new google.maps.Marker({
            position: new google.maps.LatLng(foodpantries[i].latitude, foodpantries[i].longitude),
            map: map,
            title: foodpantries[i].name
        })

        newMarker.setVisible(false);

        markers.push(newMarker);
    };
};

function togglePantries() {

    for (var i = 0; i < markers.length; i++) {

        if (markers[i].visible) {
            markers[i].setVisible(false);
            d3.select("#pantriesBtn").style("background", "#F5F5F5");
        } else {
            markers[i].setVisible(true);
            d3.select("#pantriesBtn").style("background", "#b5b5b5");
        }
    };
};


function riskColor(org, diz_lab) {

    if (org === diz_lab) {
        return "none";
    } else if (diz_lab > org) {
        return "green";
    } else if (diz_lab < org) {
        return "black";
    } else {
        return "none";
    }
};


var riskLayer;
var riskOverlay = new google.maps.OverlayView();

function addRiskLayer(us) {

    riskOverlay.onAdd = function() {

        riskLayer = d3.select(this.getPanes().overlayLayer )
            .append("div")
            .attr("class", "svgLayer")
            .style("visibility", "hidden")
        ;

        // use svg with large width and height with (0,0) at the center
        //      - this is a dirty fix to svg-size problem
        var svg = riskLayer.append("svg")
            .attr('width', w)
            .attr('height', h)
            .attr("transform", "translate(" + (-w/2) + "," + (-h/2) + ")")
            .attr("id", "risk_layer_svg");

        // the main (update) selection, saved just in case
        var countySvg = svg.append("g")
            .attr("class", "countySvg")
            .selectAll(".path")
            .data(counties)

        // the paths selection - only need to update the "d" attribute of the paths later
        var countySvg_paths = countySvg.enter().append("path")
            .attr("transform", "translate(" + (w/2) + "," + (h/2) + ")")
            .attr("class", "riskCounty")
            .style("fill", function(d,i) {
                var stats = dataset_fips_keyed[d.id];
                return stats ? riskColor(stats.org, stats.diz_lab) : "none";
            });


        var overlayProjection = this.getProjection();

        // Turn the overlay projection into a d3 projection; Converts into pixels
        var googleMapProjection = function(coordinates) {
            var googleCoordinates = new google.maps.LatLng(coordinates[1], coordinates[0]);
            var pixelCoordinates = overlayProjection.fromLatLngToDivPixel(googleCoordinates);
            return [pixelCoordinates.x, pixelCoordinates.y];
        }

        var path = d3.geo.path().projection(googleMapProjection);

        riskOverlay.draw = function() {
            countySvg_paths
                .attr("d", path)
        }
    }

    // Bind overlay to map
    riskOverlay.setMap(map);

};

// Function to toggle visibility for insecurity layer
// Called when user press button
riskOverlay.toggle = function() {

    if (riskLayer.style()[0][0].style.visibility === "hidden") {
        riskLayer.style()[0][0].style.visibility = "visible";
        d3.select("#riskBtn").style("background", "#b5b5b5");
    } else {
        riskLayer.style()[0][0].style.visibility = "hidden";
        d3.select("#riskBtn").style("background", "#F5F5F5");
    }

};


function supermarketPage() {
    location.href = "../rankingApp/rankingApp.html";
};
