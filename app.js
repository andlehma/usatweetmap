const Twitter = require('twitter');
const fs = require('fs');
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = 8000;
require('dotenv').config()
let filename = 'static/tweets.json';

const client = new Twitter({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token_key: process.env.ACCESS_TOKEN_KEY,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
});

const usa = "-124.848974,24.396308,-66.885444,49.384358";
const params = {locations: usa};
const stream = client.stream('statuses/filter', params);

let tweets = [];
let tweet_threshold = 100;
stream.on('data', function(event) {
  let coords = null;
  if (event.place && event.place.country_code == "US"){
    if (event.coordinates){
      coords = event.coordinates.coordinates;
    } else {
      // exclude any tweet whose location is just a state
      if (event.place.place_type != "admin"){
        let bbox = event.place.bounding_box.coordinates[0];
        let wMin = bbox[0][0];
        let wMax = bbox[2][0];
        let nMin = bbox[0][1];
        let nMax = bbox[1][1];
        let avgW = (wMin + wMax) / 2;
        let avgN = (nMin + nMax) / 2;
        coords = [avgW, avgN];
      }
    }
  }

  if (coords != null){

    // write to server console
    // console.log(coords);

    // add to queue to be written to file
    tweets.push(coords);

    // write to file
    if (tweets.length >= tweet_threshold){
      fs.readFile(filename, (err, data) => {
        let json = JSON.parse(data).concat(tweets);
        let newJson = json.concat(tweets);
        while (json.length > 100000){
          json.shift();
        }
        fs.writeFileSync(filename, JSON.stringify(json, null, 2), (err) => {
          if (err) throw err;
        });
        tweets = [];
      });
    }

    // send to client
    io.emit('new tweet', coords);
  }
});

stream.on('error', function(error) {
  console.log(error);
});

app.use(express.static('static'))

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

http.listen(port, function(){
  console.log('listening on *:' + port);
});
