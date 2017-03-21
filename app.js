// Packages
const express = require('express'),
    promise = require('bluebird'),
    _ = require('lodash');

// Promisify request
let request = promise.promisify(require('request'));

// .defaults is a convenience method. Wrapper
request = request.defaults({
    json: true
});


// Create express app, set the view engine to ejs
const app = express();
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');

// Set names to index used in characters
const names = {
    'luke': 1,
    'han': 14,
    'leia': 5,
    'rey': 85
};

// Home page
app.get('/', function (req,res) {
    res.render('index', {
        name: 'Backend Test'
    })
});

// Character name endpoint
app.get('/character/:name', function(req, res){
    const val = names[req.params.name];
    // Make request to swapi
    request(`http://swapi.co/api/people/${val}`)
        .then(function(results) {
            // Take JSON and render to the characters view page
            res.render('character', results.body)
        });
});


// Characters endpoint
app.get('/characters', function(req,res){
    // Go through 5 pages (/people) to get 50 characters, 10 per page. .reduce to make sure iteration is done before moving on
    // _.reduce(collection, [iteratee=_.identity], [accumulator])
    promise.reduce(_.range(5), function (total, page){
        // ++page to go through 5 pages
        return request(`http://swapi.co/api/people/?page=${++page}`)
            .then(function(results) {
                // concat to total with _.get(object, path, [defaultValue])
                return total = total.concat(_.get(results, 'body.results', []))});
    }, [])
        .then(function (results){
            // query parameter
            // Mass, height, ect.. are all strings so it wont sort in order as if they were integers
            if (req.query.sort) {
                // Update results to sorted
                results = _.sortBy(results, req.query.sort);
            }
            // Returns raw JSON of 50 characters (sorted or not)
            res.send(results);
        });
});


// Plantresidents end point
app.get('/planetresidents', function(req, res){
    // Go through all 7 pages http://swapi.co/api/planets/?page=1 - http://swapi.co/api/planets/?page=7
    // _.reduce(collection, [iteratee=_.identity], [accumulator])
    promise.reduce(_.range(7), function(total, page){
        // ++page to go through 7 pages
        return request(`http://swapi.co/api/planets/?page=${++page}`)
            .then(function (results) {
                // concat to total with _.get(object, path, [defaultValue])
                return total = total.concat(_.get(results, 'body.results', []))});
    }, [])
        .then(function (planets){
            // _.map(collection, [iteratee=_.identity])
            return promise.map(planets, function(planet) {
                // _.map(collection, [iteratee=_.identity])
                return promise.map(planet.residents, function(swapiUrl){
                    return request(swapiUrl)
                        .then(function(collection) {
                            //_.get(object, path, [defaultValue])
                            return _.get(collection, 'body.name')
                        })
                })
                    .then(function(residents) {
                        return {
                            [planet.name]: residents
                        };
                    });
            });
        })
        .then(function(results){
            // Finish formatting and send
            results = _.reduce(results, _.extend);
            res.send(results)
        });
});

app.listen(3000);