// initialize the canvas
const canvas = document.getElementById("map-canvas");
const ctx = canvas.getContext('2d');
let iW = window.innerWidth;
let iH = window.innerHeight;

// initialize background img and read tweets from tweets.json
let tweets = [];
let background = new Image();
background.src = "img/map.svg";
background.onload = function(){
  let imgWidth = background.width;
  let imgHeight = background.height;
  if (iH > iW * (imgHeight/imgWidth)){
    canvas.width = iW;
    canvas.height = (imgHeight/imgWidth) * iW;
  } else {
    canvas.height = iH;
    canvas.width = (imgWidth/imgHeight) * iH;
  }

  // read old tweets only once the background is loaded
  // this prevents a race condition
  let xhr = new XMLHttpRequest();
  xhr.open('GET', 'tweets.json');
  xhr.onload = function() {
    if (xhr.status === 200){
      tweets = JSON.parse(xhr.responseText);
      drawDots();
    }
    else {
      console.error(xhr.status);
    }
  };
  xhr.send();
}

const usaMinX = 66.885444;
const usaMaxX = 124.848974;
const usaDeltaX = usaMaxX - usaMinX;
const usaMinY = 24.396308;
const usaMaxY = 49.384358;
const usaDeltaY = usaMaxY - usaMinY;

function drawDots(){
  let tweetRadius = 5;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(244, 48, 48, 0.3)";
  tweets.forEach(tweet => {
    let tweetX = (1 - (Math.abs(tweet[0]) - usaMinX) / usaDeltaX) * canvas.width;
    let tweetY = (1 - (Math.abs(tweet[1]) - usaMinY) / usaDeltaY) * canvas.height;
    ctx.beginPath();
    ctx.arc(tweetX, tweetY, tweetRadius, 0, 2 * Math.PI);
    ctx.fill();
  });
}

// get new tweets
let max_tweets = 100000;
const socket = io('/', {path: 'usatweetmap/socket.io'});
socket.on('new tweet', (tweet) => {
  console.log(tweet);
  tweets.push(tweet);
  while (tweets.length > max_tweets){
    tweets.shift();
  }
  drawDots();
});
