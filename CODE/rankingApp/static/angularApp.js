var app = angular.module('rankingApp', []);

app.controller('RankingController', ['$scope','$http',
    function($scope, $http) {

        var tracts;

        var resultsMax = 50; // max no. of results passed to scope

        $scope.orderby = 'dis_avg_filtered';
        $scope.filterby = 'pop_2010';
        $scope.resultsShown = 30; // no. of results actually shown
        $scope.filteredData = [];
        
        $scope.urban_min = 1;
        $scope.rural_min = 5;
        $scope.selected_geoid = '';

        $http({
            method: 'GET',
            url: 'static/supermarket2015.json',
            headers: {
                dataType: 'json',
                mimeType: 'application/json',
            },
        }).then(function(response) {
            // console.log(response.data);
            tracts = response.data;

            $scope.updateRanking();
        });

        $scope.isCountyReq = function() {
            switch($scope.orderby) {
                case 'pop_filtered':
                case 'dis_avg_filtered':
                case 'dur_avg_filtered':
                    return true;
                case 'population_reduced':
                case 'duration_reduced_total':
                    return false;
            }            
        };

        $scope.updateRanking = function() {
            if ($scope.isCountyReq())
                this.updateCountyRanking();
            else
                this.updateTractRanking();
        };

        $scope.updateCountyRanking = function(){
            var countyDict = {}; // county accuml. data keyed by county geoid
            
            var urban_meter = $scope.urban_min * 1609.34;
            var rural_meter = $scope.rural_min * 1609.34;
            Object.values(tracts).forEach(function(t) {
                if (!countyDict.hasOwnProperty(t.county_geoid)) {
                    countyDict[t.county_geoid] = {
                        geoid: t.county_geoid,
                        county: t.county,
                        pop_2010: 0,
                        pop_filtered: 0,
                        dis_total_filtered: 0,
                        dur_total_filtered: 0,
                    }
                }
                var c = countyDict[t.county_geoid];
                var pf = t[$scope.filterby]; // filtered population
                c.pop_2010 += t.pop_2010;
                if ((t['is_urban'] === 1 && 
                        t.nearest_distance >= urban_meter) || 
                    (t['is_urban'] === 0 && 
                        t.nearest_distance >= rural_meter)) {
                    c.pop_filtered += pf;
                    c.dis_total_filtered += pf * t.nearest_distance;
                    c.dur_total_filtered += pf * t.nearest_duration;
                }
            });

            Object.values(countyDict).forEach(function(c) {
                c.dis_avg_filtered = c.dis_total_filtered / c.pop_filtered;
                c.dur_avg_filtered = c.dur_total_filtered / c.pop_filtered;
            });

            // // check check
            // console.log(countyDict);

            // convert countyDict to Array and sort
            // console.log('Order by: ' + $scope.orderby);
            $scope.filteredData = Object.values(countyDict)
                    .filter(function(county) {
                        return county.pop_filtered > 0;
                    })
                    .sort(function(c1, c2) {
                        return c2[$scope.orderby] - c1[$scope.orderby];
                    })
                    .slice(0, resultsMax);
            // console.log($scope.filteredData)

            // restyle the map overlay
            // console.log(countyDict);
            mapUtility.restyle(countyDict, $scope.orderby);
            
        };

        $scope.updateTractRanking = function() {
            var tractImprovements = {};

            var urban_meter = $scope.urban_min * 1609.34;
            var rural_meter = $scope.rural_min * 1609.34;

            Object.keys(tracts).forEach(function(tract1_geoid) {
                var t = tracts[tract1_geoid]

                var improv_results = {
                    geoid: tract1_geoid,
                    pop_2010: t.pop_2010,
                    county: t.county,
                    address: t.address,
                    lng: t.longitude,
                    lat: t.latitude,
                    population_reduced: 0,
                    distance_reduced: 0,
                    duration_reduced: 0,
                };

                t.improvements.forEach(function(tract2) {
                    t2 = tracts[tract2.geoid]; // rich data for tract2
                    // apply distance/duration filter
                    if ((t2['is_urban'] === 1 && 
                            t2.nearest_distance >= urban_meter) || 
                        (t2['is_urban'] === 0 && 
                            t2.nearest_distance >= rural_meter)) {
                        // apply population filter
                        var pf = t2[$scope.filterby];
                        improv_results.population_reduced += pf;
                        improv_results.distance_reduced += pf * (
                            tract2.distance_old - tract2.distance_new);
                        improv_results.duration_reduced += pf * (
                            tract2.duration_old - tract2.duration_new);
                    }                   
                })

                tractImprovements[tract1_geoid] = improv_results;
            })
            // console.log(tractImprovements);

            $scope.filteredData = Object.values(tractImprovements)
                    .filter(function(tract) {
                        return tract.population_reduced > 0;
                    })
                    .sort(function(t1, t2) {
                        return t2[$scope.orderby] - t1[$scope.orderby];
                    })
                    .slice(0, resultsMax);

            // potential map redraw below
        };

        // mouse interactions
        $scope.events = {
            addMarker: function(entry) {
                // entry is a tract entry
                mapUtility.addMarker(entry);
                $scope.selected_geoid = entry.geoid;
            },
            highlightCounty: function(county_geoid) {
                mapUtility.highlightCounty(county_geoid);
                $scope.selected_geoid = county_geoid;
            },
            removeHighlight: function() {
                mapUtility.removeHighlight();
            },
        }


        $scope.utility = {
            round: function(x) { return Math.round(x); },
            alias: {
                pop_2010: 'Filtered Popul.',
                pop_low_inc: 'Low Income',
                pop_no_car_est: 'No Vehicle',
                pop_asian: 'Asian',
                pop_black: 'Black',
                pop_hispanic: 'Hispanic',
                pop_white: 'white',

                dis_avg_filtered: 'Avg Dist',
                dur_avg_filtered: 'Avg Time',

                population_reduced: 'Popul. that benefits',
                duration_reduced: 'Travel Time Reduced',

            },
            getAlias: function() {
                if ($scope.orderby === 'pop_filtered')
                    return this.alias[$scope.filterby];
                else
                    return this.alias[$scope.orderby];
            },
            repr: function(value, key) { // convert data to appropriate text
                if (key === 'dis_avg_filtered')
                    return (value * 0.000621371).toFixed(1) + ' mi.';
                if (key === 'dur_avg_filtered')
                    return Math.round(value / 60) + ' min';
                return value;
            }
        };
    }
]);