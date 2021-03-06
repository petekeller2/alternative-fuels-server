var express = require('express'),
    bodyParser = require('body-parser'),
    request = require('request'),
    cors = require('cors'),

app = express();

app.use(bodyParser.json());

app.use(cors());

var nrelAPIkey = process.env.NREL_API_KEY || 'your nrelAPIkey';
var googleAPIkey = process.env.GOOGLE_API_KEY || 'your googleAPIkey';

app.post('/fuelStationsData', function(req, res) {
    //console.log(req.body);
    if(req.body.fuelType && req.body.address && req.body.radius) {
        var nrelUrlString = "https://developer.nrel.gov/api/alt-fuel-stations/v1/nearest.json?fuel_type=" + req.body.fuelType + "&location=" + req.body.address + "&limit=10&radius=" + req.body.radius + "&status=E&api_key=" + nrelAPIkey + "&format=JSON";
        request.get({url:nrelUrlString, json:true}, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                //console.log(body.fuel_stations);
                if (body && body.fuel_stations && body.fuel_stations.length > 0) {
                    var origins = null;
                    var destinations = null;
                    var extendedData = body.fuel_stations;
                    var addressString;

                    for (var i = 0; i < body.fuel_stations.length; i++) {

                        addressString = body.fuel_stations[i].street_address + ", " + body.fuel_stations[i].city + ", " + body.fuel_stations[i].state;
                        extendedData[i].combinedAddress = addressString;

                        if (destinations && origins) {
                            destinations = destinations + "|" + addressString;
                            origins = origins + "|" + req.body.address;
                        }
                        else {
                            destinations = addressString;
                            origins = req.body.address;
                        }
                    }
                    //console.log("googleAPIkey", googleAPIkey);
                    var googleUrlString = "https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins=" + origins + "&destinations=" + destinations + "&key=" + googleAPIkey;
                    //console.log("googleUrlString", googleUrlString);
                    request.get({url:googleUrlString, json:true}, function (errorGoogle, responseGoogle, bodyGoogle) {
                        //console.log("errorGoogle", errorGoogle);
                        //console.log("responseGoogle", responseGoogle);
                        if (!errorGoogle && responseGoogle.statusCode == 200) {
                            //console.log(bodyGoogle.rows);
                            if(bodyGoogle && bodyGoogle.rows && bodyGoogle.rows[0]) {
                                var hours, minutes, miles, feet;
                                for (var i = 0; i < body.fuel_stations.length; i++) {
                                    extendedData[i].totalDistance = bodyGoogle.rows[0].elements[i].distance.value;
                                    miles = Math.round(Number(bodyGoogle.rows[0].elements[i].distance.value) / 5280);
                                    if (miles) {
                                        feet = 0;
                                    }
                                    else {
                                        miles = 0;
                                        feet = Math.round(Number(bodyGoogle.rows[0].elements[i].distance.value));
                                    }
                                    extendedData[i].distance = {
                                        miles: miles,
                                        feet: feet
                                    };
                                    //console.log("extendedData[i].distance", extendedData[i].distance);

                                    extendedData[i].totalDuration = bodyGoogle.rows[0].elements[i].duration.value;
                                    hours = Math.floor(Number(bodyGoogle.rows[0].elements[i].duration.value) / 3600);
                                    if (hours) {

                                    }
                                    else {
                                        hours = 0;
                                    }
                                    minutes = Math.round((Math.floor(Number(bodyGoogle.rows[0].elements[i].duration.value) - (Math.floor(Number(bodyGoogle.rows[0].elements[i].duration.value) / 3600))) / 60));
                                    if (minutes) {

                                    }
                                    else {
                                        minutes = 0;
                                    }
                                    extendedData[i].duration = {
                                        hours: hours,
                                        minutes: minutes
                                    };
                                }
                                res.json(extendedData);
                            }
                            else {
                                res.end("distance and duration calculation failed");
                            }
                        }
                        else {
                            res.end("distance and duration calculation failed");
                        }
                    });
                }
                else {
                    res.end("no results");
                }
            }
            else {
                console.log("error", error);
                console.log("response", response);
                res.end("error");
            }
        });
    }
    else {
        res.end("address, radius and fuel type required!");
    }
});

app.set('port', (process.env.PORT || 5000));

app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
});