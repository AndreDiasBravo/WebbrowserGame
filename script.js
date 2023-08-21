// screen
let width = window.innerWidth
let height = window.innerHeight

// canvas
let canvas = document.getElementById("canvas")
canvas.width  = width;
canvas.height = height;
let ctx = canvas.getContext("2d");

// various other variables
let player = false
gameActive = false
let lastTime = 0 // last frame
let floorY = height-100 // start height of floor
let scene = [] // holds all objects in the game

function update() {
    // find time passed since last frame
    let curTime = Date.now()
    // calculate time passed since last frame
    let dt = (curTime - lastTime)/1000
    // check if the game is running
    if(gameActive) {
        // clear screen
        ctx.clearRect(0,0,width,height)
        // draw floor
        ctx.fillStyle = "#40aa40"
        ctx.fillRect(0,floorY,width,100)

        // update all objects
        for(let obj in scene) {
            if(scene[obj]) scene[obj].update(dt)
        }

        // show score and ammunition
        ctx.fillStyle = "#000000"
        ctx.font = '20px sans-serif'
        ctx.fillText("Score: " + player.score, 10, 30)
        ctx.fillText("Bolts: " + player.ammunition, 10, 60)

        // remove the objects that should no longer exist from the scene
        scene = scene.filter(obj => obj.exist)
    }

    // update time and start next frame
    lastTime = curTime
    requestAnimationFrame(update)
}

// player
class Player {
    constructor(x,y,w,h) {
        // position, size, speed
        this.x = x
        this.y = y
        this.w = w
        this.h = h
        this.v = 200
        this.vy = 0 // falling/jumping speed

        // variables for shooting
        this.score = 0
        this.shootCooldown = 0
        this.shootCooldownTime = 0.3
        this.aimRot = 0
        this.ammunition = 5

        // images
        this.img = new Image()
        this.img.src = './assets/player.png'
        this.cannonImg = new Image()
        this.cannonImg.src = './assets/cannon.png'

        // other variables
        this.type = "player"
        this.exist = true
    }
    update(dt) {
        // move left/right
        if(keysDown['a']) this.x -= this.v*dt
        if(keysDown['d']) this.x += this.v*dt

        if(this.x < 0) this.x = 0
        if(this.x > width) this.x = width

        // update falling
        if(this.y < floorY-this.h/2) this.vy += 1000*dt
        else {
            // stop falling when the floor is hit
            if(this.y > floorY-this.h/2) {
                this.vy = 0
                this.y = floorY-this.h/2
            }
            // jumping
            if(this.y == floorY-this.h/2 && keysDown[' ']) this.vy = -500
        }
        // update y position
        this.y += this.vy*dt

        // update cannon cooldown
        if(this.shootCooldown > 0) this.shootCooldown -= dt
        if(this.shootCooldown < 0) this.shootCooldown = 0

        // shoot left
        if(keysDown['q'] && this.shootCooldown == 0 && this.ammunition > 0) {
            // create new bolt
            scene.push(new Bolt(this.x,this.y+0.0625*this.h,this.w/4,this.h/16,Math.PI-this.aimRot))
            // update cooldown & ammunition
            this.shootCooldown = this.shootCooldownTime
            this.ammunition--
        }
        // shoot right
        if(keysDown['e'] && this.shootCooldown == 0 && this.ammunition > 0) {
            // create new bolt
            scene.push(new Bolt(this.x,this.y+0.0625*this.h,this.w/4,this.h/16,this.aimRot))
            // update cooldown & ammunition
            this.shootCooldown = this.shootCooldownTime
            this.ammunition--
        }

        // aim cannons
        if(keysDown['w']) {
            // aim up
            this.aimRot-=0.5*Math.PI*dt
            if(this.aimRot<-0.25*Math.PI) this.aimRot = -0.25*Math.PI // stop at maximum rotation
        }
        // aim cannons
        if(keysDown['s']) {
            // aim down
            this.aimRot+=0.5*Math.PI*dt
            if(this.aimRot>0.1*Math.PI) this.aimRot = 0.1*Math.PI // stop at maximum rotation
        }

        this.draw()
        // end the game when the player runs out of ammunition and there are no bolts left on the scene
        if(this.ammunition == 0 && scene.length == 4) endGame()
    }
    draw() {
        // save canvas state
        ctx.save()

        // move canvas to center of this object
        ctx.translate(this.x,this.y)
        // rotate for arm rotation
        ctx.rotate(this.aimRot) 
        // dra right cannon
        ctx.drawImage(this.cannonImg,-0.5*this.w,-0.4375*this.h,this.w,this.h)
        // rotate other way
        ctx.rotate(-2*this.aimRot) 
        // mirror canvas
        ctx.scale(-1,1) 
        // draw left cannon
        ctx.drawImage(this.cannonImg,-0.5*this.w,-0.4375*this.h,this.w,this.h)
        // mirror back to normal
        ctx.scale(-1,1) 
        // rotate back to normal
        ctx.rotate(this.aimRot) 
        // draw main body
        ctx.drawImage(this.img,-0.5*this.w,-0.5*this.h,this.w,this.h)
        // bring back canvas to original state
        ctx.restore()
    }
}

// bolts
class Bolt {
    constructor(x,y,w,h,rot) {
        // position, size, speed
        this.w = w
        this.h = h
        
        let v = 1000
        this.vx = v * Math.cos(rot) // calculate the y speed
        this.vy = v * Math.sin(rot) // calculate the x speed

        // rotation 
        this.rot = rot

        // how close a target needs to be to be hit
        this.hitR = this.h

        // move bolt slightly from center to start
        this.x = x+0.05*this.vx
        this.y = y+0.05*this.vy

        // images
        this.img = new Image()
        this.img.src = './assets/bolt.png'

        // other variables
        this.type = "bolt"
        this.exist = true
    }
    update(dt) {
        // update position
        this.x += this.vx*dt
        this.y += this.vy*dt

        this.draw()

        // check if bolt hits a target
        this.checkTargetCollision()

        // remove the bolt if it goes off screen
        if(this.x < -100 || this.x > width+100 || this.y < -100 || this.y > height-100) this.exist = false;
    }
    checkTargetCollision() {
        for(let obj of scene) {
            if(obj.type == "target" && !obj.hit) {
                // find the distance between this bolt and the center of the checked target
                let dis = Math.sqrt((this.x-obj.x)**2 + (this.y-obj.y)**2)
                // if the distance is small enough, remove both the bolt and the target from the game
                if(dis < this.hitR + ((obj.w+obj.h)/4)) {
                    this.exist = false;
                    obj.hit = true;
                    // give the player a point
                    player.score += 1
                    // random chance for extra ammunition
                    let rand = Math.random()
                    if(rand > 0.97) player.ammunition += 3 // 3% chance for 3 ammunition
                    else if(rand > 0.90) player.ammunition += 2 // 7% chance for 2 ammunition
                    else player.ammunition += 1 // 85% chance for 1 ammunition
                }
            }
        }
    }
    draw() {
        // store canvas state
        ctx.save()

        // glow
        ctx.shadowColor = '#a0f4f4';
        ctx.shadowBlur = this.w/5;

        // move canvas to center of this object
        ctx.translate(this.x,this.y)
        // rotate canvas
        ctx.rotate(this.rot)
        // draw image
        ctx.drawImage(this.img,-0.5*this.w,-0.5*this.h,this.w,this.h)
        // bring back canvas to original state
        ctx.restore()
    }
}

// targets
class Target {
    constructor(x,y,w,h) {
        // position, size, speed
        this.x = x
        this.y = y
        this.w = 0
        this.h = 0

        // full size
        this.fw = w
        this.fh = h

        // rotation
        this.rot = Math.random()*2*Math.PI

        // images
        this.img = new Image()
        this.img.src = './assets/target.png'

        // other variables
        this.type = "target"
        this.exist = true
        this.hit = false // check if this target has been hit yet or not
    }
    update(dt) {
        // update size on spawning
        if(!this.hit) {
            // increase size until the full size
            if(this.w < this.fw) this.w += this.fw*dt
            if(this.w > this.fw) this.w = this.fw
            if(this.h < this.fh) this.h += this.fh*dt
            if(this.h > this.fh) this.h = this.fh
        } else {
            // decrease size
            if(this.w > 0) this.w -= this.fw*dt*3
            if(this.h > 0) this.h -= this.fh*dt*3
            // remove when the size reaches 0
            if(this.w <=0 && this.h <= 0) {
                this.exist = false
                // create a new target
                let nx = Math.floor(Math.random()*(width-100))+50 // random x position
                let ny = Math.floor(Math.random()*(height-200))+50 // random y position
                scene.push(new Target(nx,ny,64,64))
            }
        }
        

        // update rotation
        this.rot+=Math.PI*dt
        if(this.rot > 2*Math.PI) this.rot -= 2*Math.PI // restart rotation if it has rotated a full circle
        this.draw()
    }
    draw() {
        // store canvas state
        ctx.save()

        // glow
        ctx.shadowColor = '#c10000';
        ctx.shadowBlur = this.h/5;

        // move canvas to center of this object
        ctx.translate(this.x,this.y)
        // rotate canvas
        ctx.rotate(this.rot)
        // draw image
        ctx.drawImage(this.img,-0.5*this.w,-0.5*this.h,this.w,this.h)
        // bring back canvas to original state
        ctx.restore()
        
    }
}

// keep track of which keys are pressed
let keysDown = {}
window.addEventListener('keydown',e=>keysDown[e.key] = true) // key pressed
window.addEventListener('keyup',e=>keysDown[e.key] = false) // key released

// start the game
function startGame() {
    // update game state
    gameActive = true

    // create player
    player = new Player(width/2,height/2,128,128)
    scene.push(player) // add  to scene
    for(let i=0; i<3; i++) {
        // create a new target
        let nx = Math.floor(Math.random()*(width-100))+50 // random x position
        let ny = Math.floor(Math.random()*(height-200))+50 // random y position
        scene.push(new Target(nx,ny,64,64))
    }
    
    // hide menu, show game canvas
    document.getElementById("menu").style.display = 'none'
    document.getElementById("canvas").style.display = 'block'
}

function endGame() {
    // update game state
    gameActive = false

    // show menu, hide game canvas
    document.getElementById("menu").style.display = 'block'
    document.getElementById("scoreDiv").style.display = 'block'
    document.getElementById("canvas").style.display = 'none'

    // show score
    document.getElementById("score").innerHTML = scene[0].score

    // clear objects and screen
    scene = []
    ctx.clearRect(0,0,width,height)
}

// start game when game loads
window.onload=()=>{
    
    lastTime = Date.now() // update time
    update() // start game
}