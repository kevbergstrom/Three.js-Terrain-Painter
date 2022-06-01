import * as THREE from './three.js-master/build/three.module.js';
import {vertex as terrain_vertex, fragment as terrain_fragment} from './shaders/terrainShader.js'
import {generateRangeSlider, generateCheckbox, generateColorPicker, generateSelectInput} from './options.js'
import {presets} from './presets.js'
const heightMapSrc = '../assets/images/512Noise.png'
const heightMapSize = 512
const causticSrc = '../assets/images/caustics.jpg'

const LEFT_KEY = 'a'
const RIGHT_KEY = 'd'
const UP_KEY = 'w'
const DOWN_KEY = 's'

let leftPressed = false
let rightPressed = false
let upPressed = false
let downPressed = false

let oldMouseX = 0
let oldMouseY = 0
let mouseX = 0
let mouseY = 0
let mouseInFrame = true
let canvasOffsetX = 200

let mouseLeft = false
let mouseRight = false
let mouseMiddle = false

let screenHeight = 1000
let screenWidth = 1000

function clickToggleElement(button, element){
    button.onclick = e => {
        element.style.display === 'none' ? element.style.display = 'block' : element.style.display = 'none'
    }
}

clickToggleElement(document.getElementById('optionsButton'), document.getElementById('optionsMenu'))

function onKeyDown(e){
    if(e.key == LEFT_KEY) return leftPressed = true
    else if(e.key == RIGHT_KEY) return rightPressed = true
    else if(e.key == UP_KEY) return upPressed = true
    else if(e.key == DOWN_KEY) return downPressed = true
}

function onKeyUp(e){
    if(e.key == LEFT_KEY) return leftPressed = false
    else if(e.key == RIGHT_KEY) return rightPressed = false
    else if(e.key == UP_KEY) return upPressed = false
    else if(e.key == DOWN_KEY) return downPressed = false
}

function setupKeyboardControls(){
    document.addEventListener('keydown', onKeyDown, false)
    document.addEventListener('keyup', onKeyUp, false)
}
setupKeyboardControls()

function setupCanvasEvents(canvas){
    // prevent right click menu
    canvas.addEventListener('contextmenu', e => e.preventDefault())
    canvas.addEventListener('mousedown', e => {
        if(e.button == 0) mouseLeft = true
        else if(e.button == 1) {
            mouseMiddle = true
            e.preventDefault()
        }
        else if (e.button == 2) mouseRight = true
    })
    canvas.addEventListener('mouseup', e => {
        if(e.button == 0) mouseLeft = false
        else if(e.button == 1) {
            mouseMiddle = false
            e.preventDefault()
        }
        else if (e.button == 2) mouseRight = false
    })
    canvas.addEventListener('mousemove', e => {
        mouseX = e.clientX - canvasOffsetX
        mouseY = e.clientY + window.scrollY
    })
    canvas.addEventListener('mouseenter', e => {
        mouseInFrame = true
    })
    canvas.addEventListener('mouseleave', e => {
        mouseInFrame = false
        if(mouseMiddle){
            mouseMiddle = false
        }
    })
}

// touch controls for phones and tablets
let isMobile = window.matchMedia("(pointer:coarse)").matches;
let touchX = 0
let touchY = 0

if(isMobile){
    const touch_controls = document.getElementById('touch_controls')
    const touch_controls_pointer = document.getElementById('touch_controls_pointer')
    touch_controls.style.display = 'block'
    
    touch_controls.ontouchmove = e => {
        e.preventDefault()
        const touch_controls_center_x = touch_controls.getBoundingClientRect().x + touch_controls.clientWidth/2
        const touch_controls_center_y = touch_controls.getBoundingClientRect().y + touch_controls.clientHeight/2

        touchX = touch_controls_center_x - e.touches[0].clientX 
        touchY = e.touches[0].clientY - touch_controls_center_y
        touch_controls_pointer.style.right = `${touchX}px`;
        touch_controls_pointer.style.top = `${touchY}px`;
    }
    touch_controls.ontouchend = e => {
        touchX = 0
        touchY = 0
        touch_controls_pointer.style.top = '0px';
        touch_controls_pointer.style.right = '0px';
    }
}

function main(){
    const loader = new THREE.TextureLoader()
    const caustics = loader.load(causticSrc)
    caustics.wrapS = THREE.RepeatWrapping
    caustics.wrapT = THREE.RepeatWrapping
    const height_map = loader.load(heightMapSrc)

    height_map.wrapS = THREE.RepeatWrapping
    height_map.wrapT = THREE.RepeatWrapping
    height_map.minFilter = THREE.NearestFilter
    height_map.magFilter = THREE.NearestFilter

    const height_image = new Image(heightMapSize,heightMapSize)
    height_image.src = heightMapSrc

    let heightMapContext
    let heightCanvas
    let canvasTexture

    height_image.onload = () => {
        heightCanvas = document.createElement('canvas')
        heightCanvas.width = heightMapSize
        heightCanvas.height = heightMapSize
        const context = heightCanvas.getContext('2d');
        
        context.drawImage(height_image, 0, 0)
        heightMapContext = context
        canvasTexture = new THREE.CanvasTexture(heightCanvas)
        canvasTexture.wrapS = THREE.RepeatWrapping;
        canvasTexture.wrapT = THREE.RepeatWrapping;
    }

    const canvas = document.querySelector('#c')
    setupCanvasEvents(canvas)

    screenHeight = canvas.clientHeight
    screenWidth = canvas.clientWidth

    const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: false, 
        alpha: false,
        stencil: false,
        depth: false,
    })

    const fov = 75
    const aspect = 2
    const near = 0.00001
    const far = 10

    const targetHeight = 937
    const targetWidth = 1903 - 200
    const targetAspect = targetWidth/targetHeight
    let height = canvas.clientHeight/targetHeight * 2.5
    let width = canvas.clientWidth/targetWidth * 2.5 * targetAspect
    const camera = new THREE.OrthographicCamera( width / - 2, width / 2, height / 2, height / - 2, near, far );
    camera.position.y = -0.5
    camera.position.z = 3
    camera.rotation.x = (60/180) * Math.PI

    const scene = new THREE.Scene()

    const terrainWidth = 16
    const terrainHeight = 16
    const terrainVerticies = 128
    const terrainScale = 4
    let terrainDisplacement = 2
    const chunkSize = 1 //TODO
    let terrainOffset = new THREE.Vector3(1.0,  0.0, 0.0)

    //Settings
    let waterLevel = 1
    let selectRadius = 0.2
    if(isMobile) selectRadius = 0

    let peakColor = new THREE.Color(0x00ffd1)
    let valleyColor = new THREE.Color(0x0a0621)

    function getTerrainHeight(x, y){
        if(!heightMapContext) return 0

        let x_coord = (terrainWidth-((x + terrainWidth/2) % terrainWidth))*(heightMapSize/terrainWidth)
        let y_coord = ((y + terrainHeight/2) % terrainHeight) * (heightMapSize/terrainHeight)

        if(x_coord < 0){
            x_coord = heightMapSize + x_coord
        }
        if(y_coord < 0){
            y_coord = heightMapSize + y_coord
        }

        const height = heightMapContext.getImageData(x_coord, y_coord, 1, 1).data[0]/255

        return height * terrainDisplacement
    }

    function drawOnHeightCanvas(x, y, height){
        let x_coord = (terrainWidth-((x + terrainWidth/2) % terrainWidth))*(heightMapSize/terrainWidth)
        let y_coord = ((y + terrainHeight/2) % terrainHeight) * (heightMapSize/terrainHeight)
        if(x_coord < 0){
            x_coord = heightMapSize + x_coord
        }
        if(y_coord < 0){
            y_coord = heightMapSize + y_coord
        }

        x_coord = x_coord % heightMapSize
        y_coord = y_coord % heightMapSize

        if(height > 0) heightMapContext.globalCompositeOperation = 'lighter'
        else heightMapContext.globalCompositeOperation = 'difference'

        let newHeight = Math.abs(height)
        heightMapContext.fillStyle = `rgba(${newHeight}, ${newHeight}, ${newHeight}, 1)`
        heightMapContext.beginPath()
        heightMapContext.arc(x_coord, y_coord, terrainVerticies*selectRadius/4, 0, 2 * Math.PI, false)
        heightMapContext.fill()
    }

    //Objects
    const terrain_geometry = new THREE.PlaneBufferGeometry(terrainWidth, terrainHeight, terrainVerticies, terrainVerticies) //multiples of 2

    const uniforms = {
        heightMap: {
            type: 't',
            value: canvasTexture
        },
        mapScaleFactor: { value: heightMapSize/terrainVerticies/terrainWidth*terrainScale },
        mapOffset: {
            type: 'v3',
            value: terrainOffset
        },
        displacement: { value: terrainDisplacement },
        stepSize: { value: 0.15 },
        ringHeight: { value: 0.005 },
        peakColor: {
            type: 'v4',
            value: peakColor
        },
        valleyColor: {
            type: 'v4',
            value: valleyColor
        },
        uTime: { value: 0 },
        waterLevel: { value: waterLevel },
        surfaceTexture: {
            type: 't',
            value: caustics
        },
        selectPoint: {
            type: 'v2',
            value: new THREE.Vector2(0.0, -5.0)
        },
        selectRadius: { value: selectRadius }
    }
    
    const terrain_material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: terrain_vertex,
        fragmentShader: terrain_fragment,
    })

    const terrain = new THREE.Mesh(terrain_geometry, terrain_material)

    scene.add(terrain)

    //for use with colliding with camera ray
    const plane_geometry = new THREE.PlaneBufferGeometry(terrainWidth, terrainHeight, 1, 1)
    const plane_material = new THREE.MeshStandardMaterial()
    const plane_mesh = new THREE.Mesh(plane_geometry, plane_material)
    plane_mesh.position.set(terrain.position.x, terrain.position.y, terrain.position.z)

    function resizeRendererToDisplaySize(renderer) {
        const canvas = renderer.domElement
        const width = canvas.clientWidth
        const height = canvas.clientHeight

        screenHeight = canvas.clientHeight
        screenWidth = canvas.clientWidth
        const needResize = canvas.width !== width || canvas.height !== height
        if (needResize) {
          renderer.setSize(width, height, false)
          canvasOffsetX = canvas.getBoundingClientRect().x
        }
        return needResize
    }

    const optionUI = document.getElementById('optionsMenu')
    function addOptionElement(element){
        const newElement = document.createElement("div")
        newElement.classList.add('option')
        newElement.appendChild(element)
        optionUI.appendChild(newElement)
    }

    const terrainSlider = generateRangeSlider({
        title: 'Terrain Height',
        min: 1.04,
        max: 3,
        value: 2,
        step: 0.01,
        className: "optionSlider",
        callback: val => { 
            terrainDisplacement = val
            uniforms.displacement.value = terrainDisplacement
        }
    })
    const waterSlider = generateRangeSlider({
        title: 'Water Level',
        min: 0,
        max: 3,
        value: 1,
        step: 0.01,
        className: "optionSlider",
        callback: val => { 
            waterLevel = val
            uniforms.waterLevel.value = waterLevel
        }
    })
    const selectSlider = generateRangeSlider({
        title: 'Select Radius',
        min: 0,
        max: 2,
        value: 0.2,
        step: 0.01,
        className: "optionSlider",
        callback: val => { 
            selectRadius = val
            uniforms.selectRadius.value = selectRadius; 
        }
    })
    const linesCheckbox = generateCheckbox({
        title: 'Topographic Lines',
        checked: true,
        callback: val => { uniforms.stepSize.value = val * 0.15 }
    })
    const peakColorSlider = generateColorPicker({
        title: 'Peak Color',
        h: 169,
        callback: (h, s, l) => { peakColor.setHSL(h/360, s/100, l/100) }
    })
    const valleyColorSlider = generateColorPicker({
        title: 'Valley Color',
        h: 249, 
        s: 69, 
        l: 8,
        callback: (h, s, l) => { valleyColor.setHSL(h/360, s/100, l/100) }
    })

    function loadPreset(option){
        const preset = presets[option]
        if(!preset) return
        const {_terrainHeight, _waterLevel, _peakColor, _valleyColor} = preset
        if(!isNaN(_terrainHeight)){
            terrainDisplacement = _terrainHeight
            uniforms.displacement.value = terrainDisplacement
            terrainSlider.updateInput(terrainDisplacement)
        }
        if(!isNaN(_waterLevel)){
            waterLevel = _waterLevel
            uniforms.waterLevel.value = waterLevel
            waterSlider.updateInput(waterLevel)
        }
        if(_peakColor){
            const {h, s, l} = _peakColor
            peakColor.setHSL(h/360, s/100, l/100)
            peakColorSlider.updateInput(h, s, l)
        }
        if(_valleyColor){
            const {h, s, l} = _valleyColor
            valleyColor.setHSL(h/360, s/100, l/100)
            valleyColorSlider.updateInput(h, s, l)
            
        }
    }

    const presetSelect = generateSelectInput({
        title: 'Presets',
        list: Object.keys(presets),
        className: 'selectList',
        callback: (option) => { loadPreset(option) }
    })

    addOptionElement(presetSelect)
    addOptionElement(terrainSlider)
    addOptionElement(waterSlider)
    addOptionElement(selectSlider)
    addOptionElement(linesCheckbox)
    addOptionElement(peakColorSlider)
    addOptionElement(valleyColorSlider)

    let prev = 0
    const moveSpeed = 2

    const raycaster = new THREE.Raycaster()
    const moveVector = new THREE.Vector3(0,0,0)

    function render(time) {
        time *= 0.001; 
        const delta = time - prev
        prev = time

        uniforms.uTime.value = time

        if (resizeRendererToDisplaySize(renderer)) {
            const canvas = renderer.domElement
            const minCameraHeight = 3.1

            if(canvas.clientWidth > 1920){
                //for very large screens
                height = canvas.clientHeight/(targetHeight*canvas.clientWidth/targetWidth) * 2.5
                width = canvas.clientWidth/canvas.clientWidth * 2.5 * targetAspect
            }
            else if(canvas.clientHeight > canvas.clientWidth ){
                //for phone/tablet screens
                width = canvas.clientWidth/(targetHeight/2) * 2.5
                height = canvas.clientHeight/(targetWidth/2) * 2.5 * targetAspect
            }else if(canvas.clientHeight < targetHeight/2){
                //for smaller screens
                height = canvas.clientHeight/(targetHeight/2) * 2.5
                width = canvas.clientWidth/(targetWidth/2) * 2.5 * targetAspect
            }else{
                height = canvas.clientHeight/targetHeight * 2.5
                width = canvas.clientWidth/targetWidth * 2.5 * targetAspect
            }
            //avoiding edge fo the terrain
            if(height > minCameraHeight){
                width *= minCameraHeight/height 
                height = minCameraHeight
            }
            camera.left = width / -2
            camera.right = width / 2
            camera.top = height / 2
            camera.bottom = height / -2

            camera.updateProjectionMatrix()
        }

        if(uniforms.heightMap.value == undefined){
            uniforms.heightMap.value = canvasTexture
        }

        //screen movement
        moveVector.x = leftPressed - rightPressed
        moveVector.y = downPressed - upPressed

        if(mouseInFrame){
            if((mouseX != oldMouseX) || (mouseY != oldMouseY)){
                if(mouseMiddle){
                    const deltaX = mouseX - oldMouseX
                    const deltaY = mouseY - oldMouseY

                    let moveVector = new THREE.Vector3(deltaX/screenWidth*width, -deltaY/screenHeight*height*2, 0)
                    terrainOffset.add(moveVector)
                    
                }
                const mousePlaneX = (mouseX / canvas.clientWidth) * 2 - 1
                const mousePlaneY = 1 - (mouseY / canvas.clientHeight) * 2
                
                raycaster.setFromCamera({x: mousePlaneX, y: mousePlaneY}, camera)
                const intersected = raycaster.intersectObject(plane_mesh)
                const intersect_point = intersected[0]?.point
                if(intersect_point){
                    uniforms.selectPoint.value.x = intersect_point.x
                    uniforms.selectPoint.value.y = intersect_point.y - 2.5
                    if(mouseLeft){
                        drawOnHeightCanvas(terrainOffset.x - intersect_point.x, terrainOffset.y - intersect_point.y + 2.5, 2)
                        canvasTexture.needsUpdate = true
                    }else if(mouseRight){
                        drawOnHeightCanvas(terrainOffset.x - intersect_point.x, terrainOffset.y - intersect_point.y + 2.5, -2)
                        canvasTexture.needsUpdate = true
                    }
                }
            }
        }

        oldMouseX = mouseX
        oldMouseY = mouseY

        moveVector.normalize()

        if(isMobile){
            moveVector.x += touchX/50
            moveVector.y += touchY/50
            moveVector.clampLength(0,1)
        }

        terrainOffset.add(moveVector.multiplyScalar(delta*moveSpeed))
        
        terrain.position.x = terrainOffset.x % chunkSize
        terrain.position.y = terrainOffset.y % chunkSize

        if(terrain.position.x < 0) terrain.position.x += 1
        if(terrain.position.y < 0) terrain.position.y += 1

        uniforms.mapOffset.value.x = terrainOffset.x
        uniforms.mapOffset.value.y = terrainOffset.y

        moveVector.multiplyScalar(0)

        //don't render when not on screen
        if(window.scrollY < screenHeight){
            renderer.render(scene, camera)
        }
       
        requestAnimationFrame(render)
    }
    requestAnimationFrame(render)
}

main()