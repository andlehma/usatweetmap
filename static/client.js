// initialize the canvas
const canvas = document.getElementById("map-canvas");
const ctx = canvas.getContext('2d');
trackTransforms(ctx);
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

let tweetRadius;
function drawDots(){
  tweetRadius = (Math.min(iW, iH) * .005) / xyScale;
  let p1 = ctx.transformedPoint(0,0);
  let p2 = ctx.transformedPoint(canvas.width,canvas.height);
  ctx.clearRect(p1.x,p1.y,p2.x-p1.x,p2.y-p1.y);
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
  tweets.push(tweet);
  while (tweets.length > max_tweets){
    tweets.shift();
  }
  drawDots();
});

// zoom and pan
const mouse = {
  x: innerWidth / 2,
  y: innerHeight / 2
};

let xyScale = 1;
canvas.addEventListener('DOMMouseScroll',mouseWheelHandler,false);
canvas.addEventListener('mousewheel', mouseWheelHandler, false);
function mouseWheelHandler(evt){
  let e = window.event || evt;
  let delta = Math.max(-1, Math.min(1, (e.wheelDelta || -e.detail)));
  let pt = ctx.transformedPoint(mouse.x, mouse.y);
  ctx.translate(pt.x, pt.y);
  let factor = Math.pow(1.2, delta);
  ctx.scale(factor, factor);
  xyScale *= factor;
  ctx.translate(-pt.x, -pt.y);
  if (xyScale < 1){
    ctx.reset();
  }
  ctx.legalize();
  drawDots();
}

let dragStart;
canvas.addEventListener('mousedown',function(evt){
  document.body.style.mozUserSelect = document.body.style.webkitUserSelect = document.body.style.userSelect = 'none';
  dragStart = ctx.transformedPoint(mouse.x, mouse.y);
},false);

let xPos = yPos = 0;
canvas.addEventListener('mousemove',
function(evt) {
  mouse.x = evt.offsetX || (evt.pageX - canvas.offsetLeft);
  mouse.y = evt.offsetY || (evt.pageY - canvas.offsetTop);
  if (dragStart){
    if (xyScale <= 1){
      ctx.reset();
    } else {
      let pt = ctx.transformedPoint(mouse.x, mouse.y);
      let deltaX = pt.x - dragStart.x;
      let deltaY = pt.y - dragStart.y;
      xPos += deltaX;
      yPos += deltaY;
      ctx.translate(deltaX, deltaY);
      ctx.legalize();
    }
    drawDots();
  }
});

canvas.addEventListener('mouseup',function(evt){
  dragStart = null;
},false);

canvas.addEventListener('dblclick', (evt) => {
  ctx.reset();
  drawDots();
});


// credit to phrogz (Gavin Kistner)
// http://phrogz.net/tmp/canvas_zoom_to_cursor.html
function trackTransforms(ctx){
  let svg = document.createElementNS("http://www.w3.org/2000/svg",'svg');
  let xform = svg.createSVGMatrix();
  ctx.getTransform = function(){ return xform; };

  // reset and legalize are my functions
  // the rest are from phrogz with minor modifications by me
  let reset = ctx.reset;
  ctx.reset = function(){
    let p1 = ctx.transformedPoint(0,0);
    ctx.translate(p1.x, p1.y)
    factor = 1/xyScale;
    ctx.scale(factor, factor);
    xyScale = 1;
    xPos = yPos = 0;
  }

  let legalize = ctx.legalize;
  ctx.legalize = function(){
    let p1 = ctx.transformedPoint(0, 0);
    let p2 = ctx.transformedPoint(canvas.width,canvas.height);
    if (p1.x <= 0 || p1.y <= 0 ||
      p2.x >= canvas.width || p2.y >= canvas.height){
      }
      if (p1.x <= 0){
        ctx.translate(p1.x, 0);
      }
      if (p1.y <= 0){
        ctx.translate(0, p1.y);
      }
      if (p2.x >= canvas.width){
        ctx.translate(p2.x - canvas.width, 0);
      }
      if (p2.y >= canvas.height){
        ctx.translate(0, p2.y - canvas.height);
      }
    }

    let scale = ctx.scale;
    ctx.scale = function(sx,sy){
      xform = xform.scaleNonUniform(sx,sy);
      return scale.call(ctx,sx,sy);
    };

    let translate = ctx.translate;
    ctx.translate = function(dx,dy){
      xform = xform.translate(dx,dy);
      return translate.call(ctx,dx,dy);
    };

    let pt = svg.createSVGPoint();
    ctx.transformedPoint = function(x,y){
      pt.x=x; pt.y=y;
      return pt.matrixTransform(xform.inverse());
    }
  }
