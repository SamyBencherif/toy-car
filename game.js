//const $ = require("jquery");

//canvas & context
var canvas;
var ctx;

//timing
var prev_t = 0;
var t = 0;
const fps = 60;
const frameInterval = 1000 / fps;

//screen
var width;
var height;

//sprites
const carSprite = new Image();

//game objects
var car;

//key values
var k_left;
var k_up;
var k_right;
var k_down;

function clamp(l, x, h) {
	return Math.max(l, Math.min(x, h));
}

//Car Prototype
function Car(x, y, a) {
	this.x = x;
	this.y = y;
	this.a = a;
	this.sa = Math.PI / 2; //steering angle (pi/2: straight, 0: full right, -pi/2: full left)
	this.dsa = 0; //change in steering angle over time

	this.vx = 0; //drift velocity (side to side)
	this.vy = 0; //wheel velocity (forwards and backwards)

	this.minV = -60;
	this.maxV = 280;

	this.h = 53; //wheel to wheel car height

	this.ay = 0;
	this.af = .5; //axel resistance

	this.ca = 0; //centripetal acceleration


	this.recalculatePosition = function (dt) {

		this.vy = ~~(100 * this.vy) / 100 //don't even bother with that many decimals
		
		//This kind of restitution does not play well with min/max values
		this.vy *= (1 - this.af * dt);
		
		this.vy += this.ay * dt;
		this.vy = clamp(this.minV, this.vy, this.maxV);


		this.sa += this.dsa * dt;
		this.sa = clamp(1 / 4 * Math.PI, this.sa, 3 / 4 * Math.PI)

		this.sa = Math.PI / 2 + (this.sa - Math.PI / 2) * .9;

		var vyRotatingPortion = Math.cos(this.sa) * this.vy / this.h;
		var vyForwardPortion = Math.sin(this.sa) * this.vy;

		this.a += vyRotatingPortion * dt;

		//actually only the portion of vy going forward
		this.x -= Math.cos(this.a) * vyForwardPortion * dt;
		this.y -= Math.sin(this.a) * vyForwardPortion * dt;

		this.ca = 6 * (this.vy * (vyRotatingPortion) * 2 * Math.PI) / 100.;
		if (Math.abs(this.ca) > 50)
			this.vx += this.ca / 10.
		this.vx *= .9;
		this.x += Math.cos(this.a + Math.PI / 2) * this.vx * dt;
		this.y += Math.sin(this.a + Math.PI / 2) * this.vx * dt;

		var stats = JSON.stringify({
			ca: this.ca.toFixed(2),
			y: this.y.toFixed(2),
			sa: this.sa.toFixed(2),
			a: this.a.toFixed(2),
			vx: this.vx.toFixed(2),
			vy: this.vy.toFixed(2),
			ay: this.ay.toFixed(2),
			af: this.af.toFixed(2),
			maxV: this.maxV.toFixed(2),
		}, null, '<br>');

		stats = stats.slice(6, stats.length - 2) + ",";
		stats = stats.replace(/\"([^(\")"]+)\": \"([^(\")"]+)\",/g, "$1: $2");

		$('#carStats').html(stats);
	}

	this.setInput = function (kv) {

		this.dsa = 7 * (kv[0] - kv[2]);

		if (this.vy <= 0)
			this.ay = 100 * kv[1] - 30 * kv[3]; //back arrow is reverse
		else {
			this.ay = 100 * kv[1] - 100 * kv[3]; //back arrow is brakes
		}

	}

	this.drawWheel = function (ctx, x, y, a) {

		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(Math.PI / 2 - this.sa);

		ctx.fillStyle = "rgba(0,0,0,.4)";
		ctx.strokeStyle = "rgba(0,0,0,.4)";
		ctx.lineWidth = 14;

		ctx.beginPath();
		ctx.arc(0, 0, 60, 0, 2 * Math.PI);
		ctx.stroke();

		ctx.beginPath();
		ctx.arc(0, 0, 16, 0, 2 * Math.PI);
		ctx.fill();

		ctx.fillRect(0 - 53, 0 - 5, 37, 10);
		ctx.fillRect(0 + 16, 0 - 5, 37, 10);
		ctx.fillRect(0 - 5, 0 + 16, 10, 37);

		ctx.lineWidth = 5;

		ctx.strokeStyle = "rgba(255,255,255,.4)";
		ctx.beginPath();
		ctx.arc(0, 0, 60 + 10, 0, 2 * Math.PI);
		ctx.stroke();

		ctx.restore();
	}

	this.render = function (ctx) {
		ctx.save();
		ctx.translate(width / 2, height / 2);
		ctx.translate(this.x, this.y);
		ctx.rotate(this.a - Math.PI / 2);
		var carScaledWidth = carSprite.width / 9;
		var carScaledHeight = carSprite.height / 9;
		ctx.drawImage(carSprite, - carScaledWidth / 2, - .55 * carScaledHeight, carScaledWidth, carScaledHeight);
		ctx.restore();
	}
}

function start() {
	car = new Car(0, 0, Math.PI / 2);

	k_left = k_up = k_right = k_down = false; //set all these keys to unpressed.
}

document.body.addEventListener('keydown', function (ev) {
	if (ev.keyCode == 37)
		k_left = true;

	if (ev.keyCode == 38)
		k_up = true;

	if (ev.keyCode == 39)
		k_right = true;

	if (ev.keyCode == 40)
		k_down = true;

})

document.body.addEventListener('keyup', function (ev) {
	if (ev.keyCode == 37)
		k_left = false;

	if (ev.keyCode == 38)
		k_up = false;

	if (ev.keyCode == 39)
		k_right = false;

	if (ev.keyCode == 40)
		k_down = false;

})

//main game loop
function update() {

	dt = ((new Date()).getTime() - prev_t) / 1000;
	t += dt;

	ctx.clearRect(0, 0, canvas.width, canvas.height);

	car.setInput([k_left, k_up, k_right, k_down])
	car.recalculatePosition(dt);
	car.render(ctx);

	car.drawWheel(ctx, width / 2, height - height / 4);

	ctx.fillStyle = "red";
	ctx.fillRect(width / 2, height / 2, 3, 3);

	prev_t = (new Date()).getTime();

}

function updateSize() {
	canvas.width = 3 * window.innerWidth;
	canvas.height = 3 * window.innerHeight;

	width = window.innerWidth;
	height = window.innerHeight;

	ctx = canvas.getContext('2d');
	ctx.scale(3, 3);
}

$(window).resize(updateSize);

//on DOM loaded
$(document).ready(function () {

	canvas = $('#gameView')[0];

	updateSize();

	carSprite.src = "./assets/car.svg";

	start();
	setInterval(update, frameInterval);
	prev_t = (new Date()).getTime();
});
