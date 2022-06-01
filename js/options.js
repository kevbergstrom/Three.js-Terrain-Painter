function createElement(html){
    let element = document.createElement('template');
    element.innerHTML = html;
    return element.content.firstChild;
}

function generateTitle(title){
    return createElement(`<p>${title}</p>`)
}

function generateOption(option, value=option){
    return createElement(`<option value="${value}">${option}</option>`)
}

function generateLabel(value){
    return createElement(`<label style='display:block;'>${value}</label>`)
}

function generateColorPreview(){
    return createElement(`<div class="hsl_preview" style="height:50px;width:50px;background:hsl(0, 100%, 50%);"></div>`)
}

function generateColorBackground_H(){
    return createElement(`<div class="hsl_h_bg" style="height:20px;background:linear-gradient(90deg, 
        hsl(0, 100%, 50%), 
        hsl(36, 100%, 50%), 
        hsl(72, 100%, 50%), 
        hsl(108, 100%, 50%), 
        hsl(144, 100%, 50%), 
        hsl(180, 100%, 50%), 
        hsl(216, 100%, 50%), 
        hsl(252, 100%, 50%), 
        hsl(288, 100%, 50%), 
        hsl(324, 100%, 50%), 
        hsl(360, 100%, 50%));">
    </div>
    `)
}

function generateColorBackground_S(){
    return createElement(`<div class="hsl_s_bg" style="height:20px;background:linear-gradient(90deg, 
        hsl(0, 00%, 50%),
        hsl(0, 100%, 50%));">
    `)
}

function generateColorBackground_L(){
    return createElement(`<div class="hsl_l_bg" style="height:20px;background:linear-gradient(90deg, 
        hsl(0, 100%, 00%),
        hsl(0, 100%, 50%),
        hsl(0, 100%, 100%));">
    `)
}

function generateColorSlider(options){
    const {className, min, max, value} = options
    const e = createElement(`<input type="range" style="
    margin:0px;
    height:100%;
    width:100%;
    padding:0px;
    appearance:none;
    background:none;
    -webkit-appearance:none;">
    `)
    if(className) e.classList.add(className)
    if(min) e.min = min
    if(max) e.max = max
    if(value) e.value = value

    return e
    
}

function generateNumberInput(options){
    const {className, min, max, value} = options
    const e = createElement(`<input type="number"></input>`)
    if(className) e.classList.add(className)
    if(min) e.min = min
    if(max) e.max = max
    if(value) e.value = value

    return e
}

export const generateRangeSlider = options => {
    const {title, min, max, value, step, className, callback} = options
    
    let titleElement
    if(title) titleElement =  generateTitle(title)
    const label = generateLabel(value)
    const slider = createElement(`<input type="range">`)
    if(className) slider.classList.add(className)
    if(min) slider.min = min
    if(max) slider.max = max
    if(value) slider.value = value
    if(step) slider.step = step

    if(callback){
        slider.oninput = e => {
            label.innerHTML = e.target.value
            callback(e.target.value)
        }
    }else{
        slider.oninput = e => {
            label.innerHTML = e.target.value
        }
    }

    const newElement = createElement(`<div></div>`);

    if(titleElement) {
        newElement.append(titleElement)
        titleElement.append(label)
        label.style.float = 'right'
    }
    newElement.append(slider)
    
    newElement.updateInput = value => {
        label.innerHTML = value
        slider.value = value
    }

    return newElement
}

export const generateCheckbox = options => {
    const {title, checked, showLabel = false, className, callback} = options
    
    let titleElement
    if(title) titleElement =  generateTitle(title)
    const label = generateLabel(checked)
    if(!showLabel) label.style.display = "none"
    const checkbox = createElement(`<input type="checkbox">`)
    if(className) checkbox.classList.add(className)
    if(checked) checkbox.checked = checked

    if(callback){
        checkbox.oninput = e => {
            label.innerHTML = e.target.checked
            callback(e.target.checked)
        }
    }else{
        checkbox.oninput = e => {
            label.innerHTML = e.target.checked
        }
    }

    const newElement = createElement(`<div></div>`);

    if(titleElement){ 
        newElement.append(titleElement)
        titleElement.append(checkbox)
        checkbox.style.float = 'right'
    }else {
        newElement.append(checkbox)
    }
    newElement.append(label)

    newElement.updateInput = value => {
        label.innerHTML = value
        checkbox.checked = value
    }

    return newElement
}

export const generateSelectInput = options => {
    let {title, list=[], className, callback} = options

    let titleElement
    if(title) titleElement =  generateTitle(title)
    const select = createElement(`<select></select>`)
    if(className) select.classList.add(className)
    for(const item of list){
        const option = generateOption(item)
        select.append(option)
    }

    select.onchange = e => {
        callback(e.target.value)
    }

    const newElement = createElement(`<div></div>`);
    if(titleElement) newElement.append(titleElement)
    newElement.append(select)

    return newElement
}

export const generateColorPicker = options => {
    let {title, h=0, s=100, l=50, callback} = options

    let titleElement
    if(title) titleElement =  generateTitle(title)
    const colorPreview = generateColorPreview()

    const hPicker = createElement(`<div></div>`)
    const hBackground = generateColorBackground_H()
    const hSlider = generateColorSlider({
        className: "hsl_h_range",
        min: 0,
        max: 360,
        value: h
    })
    hBackground.append(hSlider)
    hPicker.append(hBackground)
    const hNumberDiv = createElement(`<div>H </div>`)
    const hNumber = generateNumberInput({
        className: "hsl_h",
        min: 0,
        max: 360,
        value: h
    })
    hNumberDiv.append(hNumber)
    hPicker.append(hNumberDiv)

    const sPicker = createElement(`<div></div>`)
    const sBackground = generateColorBackground_S()
    const sSlider = generateColorSlider({
        className: "hsl_s_range",
        min: 0,
        max: 100,
        value: s
    })
    sBackground.append(sSlider)
    sPicker.append(sBackground)
    const sNumberDiv = createElement(`<div>S </div>`)
    const sNumber = generateNumberInput({
        className: "hsl_s",
        min: 0,
        max: 100,
        value: s
    })
    sNumberDiv.append(sNumber)
    sPicker.append(sNumberDiv)

    const lPicker = createElement(`<div></div>`)
    const lBackground = generateColorBackground_L()
    const lSlider = generateColorSlider({
        className: "hsl_l_range",
        min: 0,
        max: 100,
        value: l
    })
    lBackground.append(lSlider)
    lPicker.append(lBackground)
    const lNumberDiv = createElement(`<div>L </div>`)
    const lNumber = generateNumberInput({
        className: "hsl_l",
        min: 0,
        max: 100,
        value: l
    })
    lNumberDiv.append(lNumber)
    lPicker.append(lNumberDiv)

    function updateColorPreview(){
        colorPreview.style.background = `hsl(${h}, ${s}%, ${l}%)`
        sBackground.style.background = `linear-gradient(90deg, hsl(${h}, 0%, 50%),hsl(${h}, 100%, 50%)`
        lBackground.style.background = `linear-gradient(90deg, hsl(${h}, 100%, 0%),hsl(${h}, 100%, 50%),hsl(${h}, 100%, 100%)`
    }
    updateColorPreview()

    hSlider.oninput = e => {
        h = e.target.value
        hNumber.value = h
        updateColorPreview()
        callback(h, s, l)
    }
    hNumber.onchange = e =>{
        h = e.target.value
        hSlider.value = h
        updateColorPreview()
        callback(h, s, l)
    }
    sSlider.oninput = e => {
        s = e.target.value
        sNumber.value = s
        updateColorPreview()
        callback(h, s, l)
    }
    sNumber.onchange = e =>{
        s = e.target.value
        sSlider.value = s
        updateColorPreview()
        callback(h, s, l)
    }
    lSlider.oninput = e => {
        l = e.target.value
        lNumber.value = l
        updateColorPreview()
        callback(h, s, l)
    }
    lNumber.onchange = e =>{
        l = e.target.value
        lSlider.value = l
        updateColorPreview()
        callback(h, s, l)
    }

    const newElement = createElement(`<div></div>`);

    if(titleElement) newElement.append(titleElement)
    newElement.append(colorPreview)
    newElement.append(hPicker)
    newElement.append(sPicker)
    newElement.append(lPicker)

    newElement.updateInput = (_h, _s, _l) => {
        h = _h
        s = _s
        l = _l

        hNumber.value = h
        hSlider.value = h
        sNumber.value = s
        sSlider.value = s
        lNumber.value = l
        lSlider.value = l

        updateColorPreview()
    }

    return newElement
}