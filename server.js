var express = require('express'),
    bodyParser = require('body-parser'),
    request = require('request'),
    cors = require('cors'),

app = express();

app.use(bodyParser.json());

app.use(cors());

var nrelAPIkey = process.env.NREL_API_KEY;
var googleAPIkey = process.env.GOOGLE_API_KEY;

app.post('/fuelStationsData', function(req, res) {
    //console.log(req.body);
    //console.log("nrelAPIkey", nrelAPIkey);
    if(req.body.fuelType && req.body.zipCode) {
        //was post
        var nrelUrlString = "https://developer.nrel.gov/api/alt-fuel-stations/v1/nearest.json?fuel_type=" + req.body.fuelType + "&location=" + req.body.zipCode + "&limit=10&radius=500.0&api_key=" + nrelAPIkey + "&format=JSON";
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
                            origins = origins + "|" + req.body.zipCode;
                        }
                        else {
                            destinations = addressString;
                            origins = req.body.zipCode;
                        }
                    }
                    console.log(i);
                    var googleUrlString = "https://maps.googleapis.com/maps/api/distancematrix/json?units=imperial&origins=" + origins + "&destinations=" + destinations + "key=" + googleAPIkey;
                    request.get({url:googleUrlString, json:true}, function (errorGoogle, responseGoogle, bodyGoogle) {
                        if (!error && response.statusCode == 200) {
                            console.log(bodyGoogle.rows);
                            var hours, minutes;
                            for (var i = 0; i < body.fuel_stations.length; i++) {
                                extendedData[i].distance = bodyGoogle.rows[0].elements[i].distance.value;
                                console.log("extendedData[i].distance", extendedData[i].distance);
                                hours = Math.floor(Number(bodyGoogle.rows[0].elements[i].duration.value) / 3600);
                                if(hours) {

                                }
                                else {
                                    hours = 0;
                                }
                                minutes = Math.floor((Number(bodyGoogle.rows[0].elements[i].duration.value) - (hours*3600)) / 60);
                                if(minutes) {

                                }
                                else {
                                    minutes = 0;
                                }
                                extendedData[i].duration = {
                                    hours: hours,
                                    minutes: minutes
                                };
                            }
                        }
                        res.json(extendedData);
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
        res.end("zip code and fuel type required!");
    }
});

app.set('port', (process.env.PORT || 5000));

app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
});