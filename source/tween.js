/**
 * Tween.js - Licensed under the MIT license
 * https://github.com/tweenjs/tween.js
 * ----------------------------------------------
 *
 * See https://github.com/tweenjs/tween.js/graphs/contributors for the full list of contributors.
 * Thank you all, you're awesome!
 */

class Tween_Group
{
    static _tagged_groups = new Map();
    static _default_group = null;

    //--------------------------------------------------------------------------
    static get_tagged_groups()
    {
        return Tween_Group._tagged_groups;
    }

    //--------------------------------------------------------------------------
    static get_group_with_tag(tag)
    {
        let group = Tween_Group._tagged_groups.get(tag);
        if(!group) {
            group = new Tween_Group(tag);
            Tween_Group._tagged_groups.set(tag, group);
        }
        return group;
    }

    //--------------------------------------------------------------------------
    static get_default_tween_group()
    {
        if(!Tween_Group._default_group) {
            Tween_Group._default_group = new Tween_Group("Tween_Group_Default_Group");
            Tween_Group._default_group._remove_on_completion = false;
            Tween_Group._tagged_groups.set(
                Tween_Group._default_group.group_name, 
                Tween_Group._default_group
            );
        }

        return Tween_Group._default_group;
    }

    //--------------------------------------------------------------------------
    constructor(name)
    {
        this.group_name = name;

        this._tweens               = [];
        this._on_complete_callback = null;
        this._started              = false;
        this._completed            = false;

        this._remove_on_completion = true;
    }

    //--------------------------------------------------------------------------
    on_complete(callback)
    {
        this._on_complete_callback = callback;
        return this;
    }

    //--------------------------------------------------------------------------
    is_completed() { return this._completed; }

    //--------------------------------------------------------------------------
    get_all() { return this._tweens; }

    //--------------------------------------------------------------------------
    remove_all () { this._tweens = []; }

    //--------------------------------------------------------------------------
    add(tween)
    {
        this._tweens.push(tween);
        this._started   = true;
        this._completed = false;
    }

    //--------------------------------------------------------------------------
    remove(tween)
    {
        const pred = (t)=> {
            return t.get_id() == tween.get_id();
        };

        luna.Arr.remove_if(this._tweens, pred);
    }

    //--------------------------------------------------------------------------
    update(delta_time)
    {
        if(this._completed) {
            return;
        }

        let any_tween_is_playing = false;
        for(let i = 0; i < this._tweens.length; ++i) {
            const tween = this._tweens[i];
            if(tween._is_playing) {
                tween.update(delta_time);
                any_tween_is_playing |= tween._is_playing;
            }
        }

        if(!any_tween_is_playing) {
            if(this._started) {
                this._completed = true;
                this._started   = false;

                this.remove_all();

                if(this._on_complete_callback != null) {
                    // debugger;
                    this._on_complete_callback();
                    this._on_complete_callback = null;
                }

                if(this._remove_on_completion && this.group_name) {
                    Tween_Group._tagged_groups.delete(this.group_name);
                }
            }
        }
    }
};

//------------------------------------------------------------------------------
class Tween
{
    //
    // Factory Functions
    // 

    //--------------------------------------------------------------------------
    static create(duration)
    {
        return new Tween(duration);
    }

    //--------------------------------------------------------------------------
    static create_with_tag(duration, tag)
    {
        const group = Tween_Group.get_group_with_tag(tag);
        return Tween.create_with_group(duration, group);
    }

    //--------------------------------------------------------------------------
    static create_with_group(duration, group)
    {
        return new Tween(duration, group);
    }
    
    //--------------------------------------------------------------------------
    static _next_id()
    {
        if(this.s_next_id == undefined) {
            this.s_next_id = 0;
        }

        return this.s_next_id++;
    }

    
    
    
    //
    // 
    //

    //--------------------------------------------------------------------------
    constructor(duration, group)
    {
        this._object            = null;
        this._ratio             = 0;
        this._values_start      = {};
        this._values_end        = {};

        this._delay_time     = 0;
        this._elapsed        = 0;
        this._delay_to_start = 0;
        this._duration       = duration;

        this._repeat            = 0;
        this._repeat_delay_time = undefined;
        this._yoyo              = false;

        this._is_paused  = false;
        this._is_playing = false;
        this._reversed   = false;

        this._easing_function        = Tween.Easing.Linear.None;
        this._interpolation_function = Tween.Interpolation.Linear;

        this._chained_tweens = [];

        this._on_start_callback_fired = false;
        this._on_start_callback       = null;
        this._on_update_callback      = null;
        this._on_repeat_callback      = null;
        this._on_complete_callback    = null;
        this._on_stop_callback        = null;

        this._group = group || Tween_Group.get_default_tween_group();
        this._id    = Tween._next_id();
    };
   

    //
    // Getters
    //
    
    //--------------------------------------------------------------------------
    get_value  () { return this._object;     }
    get_ratio  () { return this._ratio       }
    get_id     () { return this._id;         }
    is_playing () { return this._is_playing; }
    is_paused  () { return this._is_paused;  }


    from(properties)
    {
        this._object       = properties;
        this._values_start = Object.create(properties);
        return this;
    }

    to(properties)
    {
        this._values_end = Object.create(properties);
        return this;
    }

    duration(d) 
    {
        this._duration = d;
        return this;
    }

    start()
    {
        this._group.add(this);

        this._is_playing              = true;
        this._is_paused               = false;
        this._reversed                = false;
        this._on_start_callback_fired = false;
        this._elapsed                 = 0;

        for(var property in this._values_end) {
            // Check if an Array was provided as property value
            if(this._values_end[property] instanceof Array) {
                if(this._values_end[property].length === 0) {
                    continue;
                }
                // Create a local copy of the Array with the start value at the front
                this._values_end[property] = [this._object[property]].concat(this._values_end[property]);
            }
            // If `to()` specifies a property that doesn't exist in the source object,
            // we should not set that property in the object
            if(this._object[property] === undefined) {
                continue;
            }
            // Save the starting value, but only once.
            if(typeof(this._values_start[property]) === 'undefined') {
                this._values_start[property] = this._object[property];
            }
            if((this._values_start[property] instanceof Array) === false) {
                this._values_start[property] *= 1.0; // Ensures we're using numbers, not strings
            }
        }

        return this;
    }

    update(delta_time)
    {
        if(!this.is_playing) { 
            return;
        }

        this._delay_to_start -= delta_time;
        if(this._delay_to_start > 0) {
            return;
        }

        var property;
        var value;

        if(this._on_start_callback_fired === false) {
            if(this._on_start_callback !== null) {
                this._on_start_callback(this._object);
            }
            this._on_start_callback_fired = true;
        }

        this._elapsed += delta_time;
        this._ratio    = (this._elapsed / this._duration);

        let ratio_value = this._ratio;
        if(this._reversed) {
            ratio_value = 1 - this._ratio;
        }

        value = this._easing_function(ratio_value);
        for(property in this._values_end) {
            // Don't update properties that do not exist in the source object
            if(this._values_start[property] === undefined) {
                continue;
            }

            var start = this._values_start[property];
            var end   = this._values_end  [property];

            if(end instanceof Array) {
                this._object[property] = this._interpolation_function(end, value);
            } else {
                // Parses relative end values with start as base (e.g.: +10, -3)
                if(typeof (end) === 'string') {
                    if(end.charAt(0) === '+' || end.charAt(0) === '-') {
                        end = start + parseFloat(end);
                    } else {
                        end = parseFloat(end);
                    }
                }

                // Protect against non numeric properties.
                if(typeof (end) === 'number') {
                    this._object[property] = start + (end - start) * value;
                }
            }
        }

        if(this._on_update_callback !== null) {
            this._on_update_callback(delta_time, this._object);
        }

        if(this._ratio >= 1) {
            if(this._repeat > 0) {
                this._elapsed = 0;

                if(isFinite(this._repeat)) {
                    this._repeat--;
                }

                if(this._yoyo) {
                    this._reversed = !this._reversed;
                }

                if(this._repeat_delay_time !== undefined) {
                    this._delay_to_start = this._repeat_delay_time;
                } else {
                    this._delay_to_start = this._delay_time;
                }

                if(this._on_repeat_callback !== null) {
                    this._on_repeat_callback(this._object);
                }

                return;
            } else {

                if(this._on_complete_callback !== null) {
                    this._on_complete_callback(this._object);
                }

                this._is_playing = false;
                for(var i = 0, numChainedTweens = this._chained_tweens.length; i < numChainedTweens; i++) {
                    // Make the chained tweens start exactly at the time they should,
                    // even if the `update()` method was called way past the duration of the tween
                    this._chained_tweens[i].start(this._duration);
                }
                return;
            }
        }
        return;
    }

    stop()
    {
        if(!this._is_playing) {
            return this;
        }

        this._group.remove(this);

        this._is_playing = false;
        this._is_paused  = false;

        if(this._on_stop_callback !== null) {
            this._on_stop_callback(this._object);
        }

        this.stop_chained_tweens();
        return this;
    }

    end()
    {
        this.update(Infinity);
        return this;
    }

    stop_chained_tweens()
    {
       for(var i = 0, numChainedTweens = this._chained_tweens.length; i < numChainedTweens; i++) {
            this._chained_tweens[i].stop();
        }
    }

    group(group)
    {
        this._group = group;
        return this;
    }

    delay(amount)
    {
        this._delay_time = amount;
        return this;
    }

    repeat(times)
    {
        this._repeat = times;
        return this;
    }

    repeat_delay(amount)
    {
        this._repeat_delay_time = amount;
        return this;
    }

    yoyo(yoyo)
    {
        this._yoyo = yoyo;
        return this;
    }

    easing(easing_function)
    {
        this._easing_function = easing_function;
        return this;
    }

    interpolationg(interpolation_function)
    {
        this._interpolation_function = interpolation_function;
        return this;
    }

    chain()
    {
        this._chained_tweens = arguments;
        return this;
    }


    //
    // Callbacks 
    //

    //--------------------------------------------------------------------------
    on_group_completed(callback) 
    {
        // @XXX(stdmatt): Hacky... 8/3/2021, 7:06:21 AM
        if(!this._group._on_complete_callback) {
            this._group._on_complete_callback =  callback;
        }
        return this;
    }

    //--------------------------------------------------------------------------
    on_start(callback)
    {
        this._on_start_callback = callback;
        return this;
    }

    //--------------------------------------------------------------------------
    on_update(callback)
    {
        this._on_update_callback = callback;
        return this;
    }

    //--------------------------------------------------------------------------
    on_repeat(callback)
    {
        this._on_repeat_callback = callback;
        return this;
    }

    //--------------------------------------------------------------------------
    on_complete(callback)
    {
        this._on_complete_callback = callback;
        return this;
    }

    //--------------------------------------------------------------------------
    on_stop(callback)
    {
        this._on_stop_callback = callback;
        return this;
    }
    

    //
    // Easings
    // 

    //--------------------------------------------------------------------------
    static get_random_easing()
    {
        const type = Tween.get_random_easing_type();
        const mode = Tween.get_random_easing_mode(type);
        return mode;
    }

    //--------------------------------------------------------------------------
    static get_random_easing_type() 
    { 
        const keys = Object.keys(Tween.Easing);
        const key  = random_element(keys);
        return Tween.Easing[key];
    } 

    //--------------------------------------------------------------------------
    static get_random_easing_mode(easing) 
    {    
        const keys = Object.keys(easing);
        const key  = random_element(keys);
        return easing[key];
    }


    static Easing = {
        Linear: {
            None (k) {
                return k;
            }
        },
        Quadratic: {
            In (k) {
                return k * k;
            },
            Out (k) {
                return k * (2 - k);
            },
            InOut (k) {
                if((k *= 2) < 1) {
                    return 0.5 * k * k;
                }
                return - 0.5 * (--k * (k - 2) - 1);
            }
        },
        Cubic: {
            In (k) {
                return k * k * k;
            },
            Out (k) {
                return --k * k * k + 1;
            },
            InOut (k) {
                if((k *= 2) < 1) {
                    return 0.5 * k * k * k;
                }
                return 0.5 * ((k -= 2) * k * k + 2);
            }
        },
        Quartic: {
            In (k) {
                return k * k * k * k;
            },
            Out (k) {
                return 1 - (--k * k * k * k);
            },
            InOut (k) {
                if((k *= 2) < 1) {
                    return 0.5 * k * k * k * k;
                }
                return - 0.5 * ((k -= 2) * k * k * k - 2);
            },
        },
        Quintic: {
            In (k) {
                return k * k * k * k * k;
            },
            Out (k) {
                return --k * k * k * k * k + 1;
            },
            InOut (k) {
                if((k *= 2) < 1) {
                    return 0.5 * k * k * k * k * k;
                }
                return 0.5 * ((k -= 2) * k * k * k * k + 2);
            },
        },
        Sinusoidal: {
            In (k) {
                return 1 - Math.cos(k * Math.PI / 2);
            },
            Out (k) {
                return Math.sin(k * Math.PI / 2);
            },
            InOut (k) {
                return 0.5 * (1 - Math.cos(Math.PI * k));
            },
        },
        Exponential: {
            In (k) {
                return k === 0 ? 0 : Math.pow(1024, k - 1);
            },
            Out (k) {
                return k === 1 ? 1 : 1 - Math.pow(2, - 10 * k);
            },
            InOut (k) {
                if(k === 0) {
                    return 0;
                }
                if(k === 1) {
                    return 1;
                }
                if((k *= 2) < 1) {
                    return 0.5 * Math.pow(1024, k - 1);
                }
                return 0.5 * (- Math.pow(2, - 10 * (k - 1)) + 2);
            },
        },
        Circular: {
            In (k) {
                return 1 - Math.sqrt(1 - k * k);
            },
            Out (k) {
                return Math.sqrt(1 - (--k * k));
            },
            InOut (k) {
                if((k *= 2) < 1) {
                    return - 0.5 * (Math.sqrt(1 - k * k) - 1);
                }
                return 0.5 * (Math.sqrt(1 - (k -= 2) * k) + 1);
            },
        },
        Elastic: {
            In (k) {
                if(k === 0) {
                    return 0;
                }
                if(k === 1) {
                    return 1;
                }
                return -Math.pow(2, 10 * (k - 1)) * Math.sin((k - 1.1) * 5 * Math.PI);
            },
            Out (k) {
                if(k === 0) {
                    return 0;
                }
                if(k === 1) {
                    return 1;
                }
                return Math.pow(2, -10 * k) * Math.sin((k - 0.1) * 5 * Math.PI) + 1;
            },
            InOut (k) {
                if(k === 0) {
                    return 0;
                }
                if(k === 1) {
                    return 1;
                }
                k *= 2;
                if(k < 1) {
                    return -0.5 * Math.pow(2, 10 * (k - 1)) * Math.sin((k - 1.1) * 5 * Math.PI);
                }
                return 0.5 * Math.pow(2, -10 * (k - 1)) * Math.sin((k - 1.1) * 5 * Math.PI) + 1;
            }
        },
        Back: {
            In (k) {
                var s = 1.70158;
                return k * k * ((s + 1) * k - s);
            },
            Out (k) {
                var s = 1.70158;
                return --k * k * ((s + 1) * k + s) + 1;
            },
            InOut (k) {
                var s = 1.70158 * 1.525;
                if((k *= 2) < 1) {
                    return 0.5 * (k * k * ((s + 1) * k - s));
                }
                return 0.5 * ((k -= 2) * k * ((s + 1) * k + s) + 2);
            },
        },
        Bounce: {
            In (k) {
                return 1 - Tween.Easing.Bounce.Out(1 - k);
            },
            Out (k) {
                if(k < (1 / 2.75)) {
                    return 7.5625 * k * k;
                } else if(k < (2 / 2.75)) {
                    return 7.5625 * (k -= (1.5 / 2.75)) * k + 0.75;
                } else if(k < (2.5 / 2.75)) {
                    return 7.5625 * (k -= (2.25 / 2.75)) * k + 0.9375;
                } else {
                    return 7.5625 * (k -= (2.625 / 2.75)) * k + 0.984375;
                }
            },
            InOut (k) {
                if(k < 0.5) {
                    return Tween.Easing.Bounce.In(k * 2) * 0.5;
                }
                return Tween.Easing.Bounce.Out(k * 2 - 1) * 0.5 + 0.5;
            },
        }
    };

    static Interpolation = {
        Linear (v, k) {
            var m = v.length - 1;
            var f = m * k;
            var i = Math.floor(f);
            var fn = Tween.Interpolation.Utils.Linear;
            if(k < 0) {
                return fn(v[0], v[1], f);
            }
            if(k > 1) {
                return fn(v[m], v[m - 1], m - f);
            }
            return fn(v[i], v[i + 1 > m ? m : i + 1], f - i);
        },
        Bezier (v, k) {
            var b = 0;
            var n = v.length - 1;
            var pw = Math.pow;
            var bn = Tween.Interpolation.Utils.Bernstein;
           for(var i = 0; i <= n; i++) {
                b += pw(1 - k, n - i) * pw(k, i) * v[i] * bn(n, i);
            }
            return b;
        },
        CatmullRom (v, k) {
            var m = v.length - 1;
            var f = m * k;
            var i = Math.floor(f);
            var fn = Tween.Interpolation.Utils.CatmullRom;
            if(v[0] === v[m]) {
                if(k < 0) {
                    i = Math.floor(f = m * (1 + k));
                }
                return fn(v[(i - 1 + m) % m], v[i], v[(i + 1) % m], v[(i + 2) % m], f - i);
            } else {
                if(k < 0) {
                    return v[0] - (fn(v[0], v[0], v[1], v[1], -f) - v[0]);
                }
                if(k > 1) {
                    return v[m] - (fn(v[m], v[m], v[m - 1], v[m - 1], f - m) - v[m]);
                }
                return fn(v[i ? i - 1 : 0], v[i], v[m < i + 1 ? m : i + 1], v[m < i + 2 ? m : i + 2], f - i);
            }
        },
        Utils: {
            Linear (p0, p1, t) {
                return (p1 - p0) * t + p0;
            },
            Bernstein (n, i) {
                var fc = Tween.Interpolation.Utils.Factorial;
                return fc(n) / fc(i) / fc(n - i);
            },
            Factorial: (function () {
                var a = [1];
                return function (n) {
                    var s = 1;
                    if(a[n]) {
                        return a[n];
                    }
                   for(var i = n; i > 1; i--) {
                        s *= i;
                    }

                    a[n] = s;
                    return s;
                };
            })(),
            CatmullRom (p0, p1, p2, p3, t) {

                var v0 = (p2 - p0) * 0.5;
                var v1 = (p3 - p1) * 0.5;
                var t2 = t * t;
                var t3 = t * t2;

                return (2 * p1 - 2 * p2 + v0 + v1) * t3 + (- 3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 + v0 * t + p1;
            }
        }
    }
};
