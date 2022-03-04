//----------------------------------------------------------------------------//
// Utils                                                                      //
//----------------------------------------------------------------------------//
//------------------------------------------------------------------------------
function is_null_or_undefined(v)
{
    return (v === null || v === undefined);
}
const echo = console.log

//----------------------------------------------------------------------------//
// Loop                                                                       //
//----------------------------------------------------------------------------//
//------------------------------------------------------------------------------
const MIN_FRAME_RATE = 1.0/30.0;

//------------------------------------------------------------------------------
let __time_total = 0;
let __time_delta = 0;
let __time_prev = 0;
let __time_now  = 0;

let __user_draw_func = null;

//------------------------------------------------------------------------------
function start_draw_loop(user_draw_func)
{
    __user_draw_func = user_draw_func;
    canvas_render();
}

//----------------------------------------------------------------------------//
// Canvas Functions                                                           //
//----------------------------------------------------------------------------//
//------------------------------------------------------------------------------
let __canvas  = null;
let __context = null;

//------------------------------------------------------------------------------
function get_canvas_width ()  { return __canvas.width;  }
function get_canvas_height()  { return __canvas.height; }

//------------------------------------------------------------------------------
function set_main_canvas(canvas)
{
    __canvas  = canvas;
    __context = canvas.getContext("2d");
}


//------------------------------------------------------------------------------
function begin_draw() { __context.save   (); }
function end_draw  () { __context.restore(); }



//------------------------------------------------------------------------------
function translate_canvas_to_center()
{
    __context.translate(
        __canvas.width  * 0.5,
        __canvas.height * 0.5
    );
}

//------------------------------------------------------------------------------
function clear_canvas(color)
{
    if(!color) {
        color = "black";
    }

    clear_canvas_rect(
        -__canvas.width,
        -__canvas.height,
        +__canvas.width  * 2,
        +__canvas.height * 2,
        color
    );
}

//------------------------------------------------------------------------------
function clear_canvas_rect(x, y, w, h, color)
{
    const fill_style = __context.fillStyle;

    __context.fillStyle = color;
    __context.fillRect(x, y, w, h);

    __context.fillStyle = fill_style;
}

//------------------------------------------------------------------------------
function set_canvas_fill(color)
{
    __context.fillStyle = color;
}

//------------------------------------------------------------------------------
function set_canvas_stroke(color)
{
    __context.strokeStyle = color;
}

//------------------------------------------------------------------------------
function fill_circle(x, y, r)
{
    fill_arc(x, y, r, 0, MATH_2PI, true);
}

//------------------------------------------------------------------------------
function fill_arc(x, y, r, sa, ea, close)
{
    __context.beginPath();
        __context.arc(x, y, r, sa, ea);
        if(!is_null_or_undefined(close)) {
            __context.closePath();
        }
    __context.fill();
}

//------------------------------------------------------------------------------
function draw_line(x1, y1, x2, y2)
{
    __context.beginPath();
        __context.moveTo(x1, y1);
        __context.lineTo(x2, y2);
    __context.closePath();
    __context.stroke();
}

//------------------------------------------------------------------------------
function canvas_render()
{
    __time_now = Date.now();

    let dt = (__time_now - __time_prev) / 1000;
    if(dt > MIN_FRAME_RATE) {
        dt = MIN_FRAME_RATE;
    }

    __time_prev = __time_now;

    __time_total += dt;
    __time_delta  = dt;


    __user_draw_func(dt);
    window.requestAnimationFrame(canvas_render);
}


//----------------------------------------------------------------------------//
// Random                                                                     //
//----------------------------------------------------------------------------//
//------------------------------------------------------------------------------
let __rnd_gen = null;
function set_random_seed(seed = null)
{
    if(is_null_or_undefined(seed)) {
        seed = Date.now();
    }
    __rnd_gen = __mulberry32(seed);
}

//------------------------------------------------------------------------------
function random_float(min, max)
{
    if(is_null_or_undefined(min)) {
        min = 0;
        max = 1;
    } else if(is_null_or_undefined(max)) {
        max = min;
        min = 0;
    }

    const value = __rnd_gen();
    return min + (value * (max - min));
}

//------------------------------------------------------------------------------
function random_int(min, max)
{
    return Math.floor(random_float(min, max));
}

//------------------------------------------------------------------------------
function __mulberry32(a)
{
    // Reference:
    //   https://stackoverflow.com/questions/521295/seeding-the-random-number-generator-in-javascript
    return function() {
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}


//----------------------------------------------------------------------------//
// Input                                                                      //
//----------------------------------------------------------------------------//
//------------------------------------------------------------------------------
let __mouse_x = 0;
let __mouse_y = 0;
let __mouse_left_pressed = false;
let __mouse_wheel_x = 0;
let __mouse_wheel_y = 0;

//------------------------------------------------------------------------------
function get_mouse_x() { return __mouse_x; }
function get_mouse_y() { return __mouse_x; }
function is_mouse_pressed(button_no) { return false; } // @todo
function get_mouse_wheel_x() { return __mouse_wheel_x; }
function get_mouse_wheel_y() { return __mouse_wheel_x; }


//------------------------------------------------------------------------------
function install_input_handlers(element, handlers)
{
    if(!element) {
        element = window;
    }

    // Move
    element.addEventListener("mousemove", (ev) =>  {
        const rect = element.getBoundingClientRect();
        __mouse_x = (ev.clientX - rect.left) / (rect.right  - rect.left) * element.width;
        __mouse_y = (ev.clientY - rect.top ) / (rect.bottom - rect.top ) * element.height;

        if(handlers && handlers.on_mouse_move) {
            handlers.on_mouse_move(__mouse_x, __mouse_y, ev);
        }
    }, false);


    // Left Mouse Click
    element.addEventListener("click", (ev) =>  {
        if(handlers && handlers.on_mouse_left_click) {
            handlers.on_mouse_left_click(ev);
        }
    });

    // Right Mouse Click
    element.addEventListener('contextmenu', (ev) =>  {
        ev.preventDefault();
        if(handlers && handlers.on_mouse_right_click) {
            handlers.on_mouse_right_click(ev);
        }
    }, false);

    // Mouse Down
    element.addEventListener("mousedown", (ev) =>  {
        // @todo(stdmatt): Check the which button is down...
        // debugger;
        if(handlers && handlers.on_mouse_down) {
            handlers.on_mouse_down(0, ev);
        }
    });

    // Mouse Up
    element.addEventListener("mouseup", (ev) =>  {
        // @todo(stdmatt): Check the which button is down...
        // debugger;
        if(handlers && handlers.on_mouse_up) {
            handlers.on_mouse_up(0, ev);
        }
     });

     // Mouse Whell
     element.addEventListener("wheel", (ev) =>  {
        __mouse_wheel_x += ev.wheelDeltaX;
        __mouse_wheel_y += ev.wheelDeltaY;

        // @todo(stdmatt): Check the which button is down...
        // debugger;
        if(handlers && handlers.on_mouse_wheel) {
            handlers.on_mouse_wheel(__mouse_wheel_x, __mouse_wheel_y, ev);
        }
     });
}

//----------------------------------------------------------------------------//
// Math                                                                       //
//----------------------------------------------------------------------------//
const MATH_PI  = Math.PI;
const MATH_2PI = MATH_PI * 2;


//------------------------------------------------------------------------------
function distance(x1, y1, x2, y2)
{
    const x = (x2 - x1);
    const y = (y2 - y1);
    return Math.sqrt(x*x + y*y);
}

//------------------------------------------------------------------------------
function distance_sq(x1, y1, x2, y2)
{
    const x = (x2 - x1);
    const y = (y2 - y1);
    return (x*x) + (y*y);
}

//------------------------------------------------------------------------------
function normalize(value, min, max)
{
    const normalized = (value - min) / (max - min);
    return normalized;
}

//------------------------------------------------------------------------------
function denormalize(normalized, min, max)
{
    const denormalized = (normalized * (max - min) + min);
    return denormalized;
}

//------------------------------------------------------------------------------
function map_values(value, start1, end1, start2, end2)
{
    if(start1 == end1 || start2 == end2) {
        return end2;
    }

    const normalized   = normalize  (value,      start1, end1);
    const denormalized = denormalize(normalized, start2, end2);

    return clamp(
        denormalized,
        Math.min(start2, end2),
        Math.max(start2, end2)
    );
}

//------------------------------------------------------------------------------
function clamp(value, min, max) {
    if(value < min) return min;
    if(value > max) return max;
    return value;
}


//----------------------------------------------------------------------------//
// Vector                                                                     //
//----------------------------------------------------------------------------//
//------------------------------------------------------------------------------
function add_vec2(a, b)         { return make_vec2(a.x + b.x, a.y - b.y); }
function sub_vec2(a, b)         { return make_vec2(a.x - b.x, a.y - b.y); }
function mul_vec2(vec2, scalar) { return make_vec2(vec2.x * scalar, vec2.y * scalar); }

//------------------------------------------------------------------------------
function copy_vec2(vec2)
{
    return make_vec2(vec2.x, vec2.y);
}

//------------------------------------------------------------------------------
function is_vec2_equal(a, b)
{
    return (a.x == b.x) && (a.y == b.y);
}

//------------------------------------------------------------------------------
function distance_vec2(a, b)
{
    return distance(a.x, a.y, b.x, b.y);
}

//------------------------------------------------------------------------------
function magnitude_vec2(vec2)
{
    return Math.sqrt(vec2.x * vec2.x + vec2.y * vec2.y);
}

//------------------------------------------------------------------------------
function make_vec2(x, y)
{
    const v = {x:0, y:0}

    if(!is_null_or_undefined(x)) {
        v.x = x;
    }
    if(!is_null_or_undefined(y)) {
        v.y = y;
    }

    return v;
}

//------------------------------------------------------------------------------
function make_vec2_unit(vec2)
{
    const len = magnitude_vec2(vec2);
    if(len == 0) {
        return make_vec2();
    }

    return make_vec2(vec2.x / len, vec2.y / len);
}



//------------------------------------------------------------------------------
function Vector_Add(a, b)
{
    return make_vec2(a.x + b.x, a.y + b.y);
}

//------------------------------------------------------------------------------
function Vector_Sub(a, b)
{
    return make_vec2(a.x - b.x, a.y - b.y);
}





/*







//------------------------------------------------------------------------------
function Canvas_Resize(width, height)
{
    width  = Math_Int(width);
    height = Math_Int(height);

    __canvas.width  = width;
    __canvas.height = height;

    MainContext.width  = width;
    MainContext.height = height;

    Canvas_Width  = width;
    Canvas_Height = height;

    Canvas_Half_Width  = Math_Int(Canvas_Width  / 2);
    Canvas_Half_Height = Math_Int(Canvas_Height / 2);

    Canvas_Edge_Left    = -Canvas_Half_Width;
    Canvas_Edge_Right   = +Canvas_Half_Width;
    Canvas_Edge_Top     = -Canvas_Half_Height;
    Canvas_Edge_Bottom  = +Canvas_Half_Height;

    Canvas_Translate(Canvas_Half_Width, Canvas_Half_Height);
}

//------------------------------------------------------------------------------
function Canvas_CreateCanvas(width, height, parentElement)
{
    __canvas      = document.createElement("canvas");
    MainContext = __canvas.getContext('2d');
    Canvas_SetRenderTarget(MainContext);
    Canvas_Resize(width, height);

    if(!Utils_IsNullOrUndefined(parentElement)) {
        parentElement.appendChild(__canvas)
    } else {
        document.appendChild(__canvas)
    }
}

//------------------------------------------------------------------------------
function Canvas_GetFromHtml(canvasId)
{
    __canvas      = document.getElementById(canvasId);
    MainContext = __canvas.getContext('2d');

    Canvas_SetRenderTarget(MainContext);
    Canvas_Resize(__canvas.width, __canvas.height);
}


//------------------------------------------------------------------------------
function Canvas_SetRenderTarget(renderTarget)
{
    if(renderTarget == null) {
        renderTarget = MainContext;
    }

    __context = renderTarget;
}


//------------------------------------------------------------------------------
function Canvas_ClearWindow(color)
{
}


//------------------------------------------------------------------------------
function Canvas_Push()
{
    __context.save();
}

//------------------------------------------------------------------------------
function Canvas_Pop()
{
    __context.restore();
}

//------------------------------------------------------------------------------
function Canvas_SetOrigin(x, y)
{
    Canvas_Translate(x, y);
}

//------------------------------------------------------------------------------
function Canvas_Translate(x, y)
{
    __context.translate(x, y);
}

//------------------------------------------------------------------------------
function Canvas_Rotate(a)
{
    __context.rotate(a);
}

//------------------------------------------------------------------------------
function Canvas_Scale(x, y)
{
    if(y == undefined || y == null) {
        y = x;
    }
    __context.scale(x, y);
}


//------------------------------------------------------------------------------
function Canvas_SetFillStyle(style)
{
    __context.fillStyle = style;
}

//------------------------------------------------------------------------------
function Canvas_SetStrokeStyle(style)
{
    __context.strokeStyle = style;
}

function Canvas_SetStrokeSize(size)
{
    __context.lineWidth = size;
}

//------------------------------------------------------------------------------
function Canvas_DrawPoint(x, y, size)
{
    __context.beginPath();
        __context.arc(x, y, size, 0, 2 * Math.PI, true);
    __context.closePath();
    __context.stroke();
    __context.fill();
}


//------------------------------------------------------------------------------
function Canvas_DrawArc(x, y, r, sa, ea, close)
{
    __context.beginPath();
        __context.arc(x, y, r, sa, ea);
        if(close != undefined && close) {
            __context.closePath();
        }
    __context.stroke();
}



//------------------------------------------------------------------------------
function Canvas_FillShape(vertices, closed)
{
    __context.beginPath();
        __context.moveTo(vertices[0], vertices[1]);
        for(let i = 2; i < vertices.length-1; i += 2) {
            __context.lineTo(vertices[i], vertices[i+1]);
        }

        if(closed != undefined && closed) {
            __context.lineTo(vertices[0], vertices[1]);
        }
    __context.closePath();
    __context.fill();
}

//------------------------------------------------------------------------------
function Canvas_DrawTriangle(x1, y1, x2, y2, x3, y3)
{
    Canvas_DrawShape([x1, y1, x2, y2, x3, y3], true);
}

//------------------------------------------------------------------------------
function Canvas_DrawCircle(x, y, r)
{
    Canvas_DrawArc(x, y, r, 0, MATH_2PI);
}


//------------------------------------------------------------------------------
function Canvas_DrawShape(vertices, closed)
{
    __context.beginPath();
        __context.moveTo(vertices[0], vertices[1]);
        for(let i = 2; i < vertices.length-1; i += 2) {
            __context.lineTo(vertices[i], vertices[i+1]);
        }

        if(closed != undefined && closed) {
            __context.lineTo(vertices[0], vertices[1]);
        }
    __context.closePath();
    __context.stroke();
}

function Canvas_DrawRoundedRect(x, y, w, h, r)
{
    __context.beginPath();
        __context.moveTo(x + r, y);
        __context.lineTo(x + w - r, y);
        __context.quadraticCurveTo(x + w, y, x + w, y + r);
        __context.lineTo(x + w, y + h - r);
        __context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        __context.lineTo(x + r, y + h);
        __context.quadraticCurveTo(x, y + h, x, y + h - r);
        __context.lineTo(x, y + r);
        __context.quadraticCurveTo(x, y, x + r, y);
    __context.closePath();
    __context.stroke();
}

function Canvas_FillRoundedRect(x, y, w, h, r)
{
    __context.beginPath();
        __context.moveTo(x + r, y);
        __context.lineTo(x + w - r, y);
        __context.quadraticCurveTo(x + w, y, x + w, y + r);
        __context.lineTo(x + w, y + h - r);
        __context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        __context.lineTo(x + r, y + h);
        __context.quadraticCurveTo(x, y + h, x, y + h - r);
        __context.lineTo(x, y + r);
        __context.quadraticCurveTo(x, y, x + r, y);
    __context.closePath();
    __context.fill();
}

//------------------------------------------------------------------------------
function Canvas_DrawRect(x, y, w, h)
{
    __context.beginPath();
        __context.rect(x, y, w, h);
    __context.closePath();
    __context.stroke();
}

//------------------------------------------------------------------------------
function Canvas_FillRect(x, y, w, h)
{
    if(w <= 0 || h <= 0) {
        return;
    }

    __context.beginPath();
        __context.rect(x, y, w, h);
    __context.closePath();
    __context.fill();
}

//------------------------------------------------------------------------------
let _Canvas_ImageData = null;
function Canvas_LockPixels()
{
    if(_Canvas_ImageData != null) {
        return;
    }

    _Canvas_ImageData = __context.getImageData(0, 0, Canvas_Width, Canvas_Height);
}

//------------------------------------------------------------------------------
function Canvas_UnlockPixels()
{
    if(_Canvas_ImageData == null) {
        return;
    }

    __context.putImageData(_Canvas_ImageData, 0, 0);
    _Canvas_ImageData = null;
}

//------------------------------------------------------------------------------
function Canvas_SetColor(x, y, color)
{
    // https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Pixel_manipulation_with_canvas
    function get_pixel_index(x, y, width) {
        let red = y * (width * 4) + x * 4;
        return [red, red + 1, red + 2, red + 3];
    }

    let indices = get_pixel_index(x, y, Canvas_Width);

    _Canvas_ImageData.data[indices[0]] = color[0];
    _Canvas_ImageData.data[indices[1]] = color[1];
    _Canvas_ImageData.data[indices[2]] = color[2];
    _Canvas_ImageData.data[indices[3]] = color[3];
}

//------------------------------------------------------------------------------
function Canvas_RenderTextAt(x, y, str, fontSize, fontName, centered = false)
{
    // debugger;
    if(!Utils_IsNullOrUndefined(fontSize) &&
       !Utils_IsNullOrUndefined(fontName))
    {
        let name = String_Cat(fontSize, "px ", fontName)
        __context.font = name;
    }

    let width  = __context.measureText(str).width;
    let height = parseInt(__context.font);

    if(!centered) {
        // Canvas_SetFillStyle("red");
        // Canvas_FillRect(x, y, width, height);
        // Canvas_SetFillStyle("white");

        __context.fillText(str, x, y + height);
    } else {
        // Canvas_SetFillStyle("red");
        // Canvas_FillRect(
        //     x + width - width / 4,
        //     y + height / 4,
        //     width, height
        // );
        // Canvas_SetFillStyle("white");

        __context.fillText(
            str,
            x + width - width / 4,
            y + height + height / 4
        );
    }
        // x + width,
        // y + height);//x + (width / 2), y + (height / 2));
}
*/
