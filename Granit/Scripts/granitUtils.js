/*
 * Contributor(s): Thomas Stein
 * Description:    Javascript library with properties, methods, classes that are used by the Granit splitter layout control
 * License:        MIT
 */
var granit = (function (gt) {
    var self = this;

    /*
     * Author(s):   Thomas Stein
     * Description: Manages ouput errors (as exceptions) and warnings (as console output). Optionally alerts the output.
     */
    var output = function (message, errorObject, type, alert) {
        //defaults
        if (!message) {
            message = "";
        }
        if (!errorObject) {
            errorObject = "";
        }
        else {
            errorObject = " -- " + errorObject;
        }
        if (!type || (type !== "Error" && type !== "Warning")) {
            type = "Error";
        }
        var result = (type === "Error" ? "ERROR" : "WARNING") + errorObject + ": " + message;
        if (alert === true) {
            window.alert(result)
        }
        //output
        if (type === "Error") {
            throw result;
        }
        else {
            console.log(result);
        }
    };

    /*
     * Author(s):   Thomas Stein
     * Description: the NumberUnit class -- Instances of this class are very heavily used in granit to transfer not only numbers but also associated units.
     */
    var NumberUnit = function (value, unit) {
        var self = this;

        value = value || 0;
        self.Value = value;
        self.Unit = unit || "";

        self.getSize = function () {
            if (this.Value.startsWith && this.Value.startsWith("calc")) {
                return this.Value;
            }
            return self.Value + self.Unit;
        }
    };

    /*
     * Author(s):   Thomas Stein
     * Description: NumberUnit wrapper with additional properties in order to express width and height lenghts
     */
    var Size = function (number, offset, pixel) {
        var self = this;

        if (!number || number === "auto") {
            number = new NumberUnit();
        }
        self.Number = number;
        self.Offset = offset;
        self.Pixel = pixel || 0;

        self.autoSized = !number.Unit ? true : false;

        self.getSize = function () {
            if (!self.Offset || self.Offset.Value === 0) {
                return self.Number.getSize();
            }
            return "calc(" + self.Number.getSize() + " " + " + " + self.Offset.getSize() + ")";
        }
    }

    //check if value is of type boolean
    var isBooleanType = function (value) {
        return value === true || value === false;
    }

    /*
     * Author(s):   Thomas Stein
     * Description: function to validate the given size as a float number and an optional unit. As a result a NumberUnit object is returned.
     */
    var extractFloatUnit = function (size, numberSet, unitFormat, defaultUnit, errorObject, math) {
        if (!numberSet || (numberSet !== "Q" && numberSet !== "Q+" && numberSet !== "Q-")) {
            numberSet = "Q";
        }
        if (jQuery.type(size) !== "string" && jQuery.type(size) !== "number") {
            output("value (" + size + ") is not a number or a string", errorObject);
        }

        math = math || function (x) { return x; };

        var unitRegex = new RegExp("^" + unitFormat.source + "$");
        if (defaultUnit && !defaultUnit.match(unitRegex)) {
            output("the provided default unit (" + defaultUnit + ") is not a valid unit according to the given unit format " + unitFormat, errorObject);
        }

        var floatRegex = /[+-]?\d+(\.\d+)?/;
        var regex = new RegExp("^(" + floatRegex.source + ")" + "(" + unitFormat.source + ")?$");     //float number with optional measure

        var value, unit;

        if (jQuery.type(size) === "string") {
            var match = size.match(regex);

            if (!match) {
                output("value (" + size + ") format is invalid -- format (" + regex + ") expected (float number with optional measure)", errorObject);
            }

            size = match[1];
            unit = match[3];
        }

        value = parseFloat(size);

        if (numberSet !== "Q") {
            if (value < 0.0 && numberSet == "Q+") {
                output("value (" + value + ") < 0.0 -- positive value expected", errorObject);
            }
            if (value > 0.0 && numberSet == "Q-") {
                output("value (" + value + ") > 0.0 -- negative value expected", errorObject);
            }
        }

        return new NumberUnit(math(value), unit || defaultUnit);
    };

    /*
     * Author(s):   Thomas Stein
     * Description: helper methods for searching and comparing in objects and arrays
     */
    var arrayOperations = {
        /*
         * Author(s):   Thomas Stein
         * Description: checks if all property names in the object can be found in haystack.
         *              Additionally, if all = true, checks if all items in the haystack are represented in the propert-name list of the object.
         */
        compareObjectToArray: function (object, haystack, all) {
            if (!object || !haystack) {
                return undefined;
            }
            var arr = Object.getOwnPropertyNames(object);
            if (all && arr.length !== haystack.length) {
                return false;                       //same amount of items
            }
            return arr.every(function (v) {
                if (object.hasOwnProperty(v)) {
                    return haystack.indexOf(v) >= 0;
                }
                return true;
            });
        },

        /*
         * Author(s):   Thomas Stein
         * Description: eliminates duplicates from the list
         */
        uniqueArray: function (list) {
            var result = [];
            $.each(list, function (i, e) {
                if ($.inArray(e, result) == -1) result.push(e);
            });
            return result;
        }
    }

    /*
     * Author(s):   Thomas Stein
     * Description: prefixes the sizename "width" or "height" accordingly to get "min-width", "min-height", "max-width," "max-height", "offsetWidth", "offsetHeight"
     */
    var prefixSizeName = function(sizeName, prefix, camelCase) {
        if (camelCase) {
            return prefix + sizeName.charAt(0).toUpperCase() + sizeName.slice(1);
        }
        return prefix + "-" + sizeName;
    }

    /*
     * Author(s):   Thomas Stein
     * Description: 
     */
    var PixelConverter = function (targetParent) {
        var testElement = document.createElement("div");  //Create a temporary sibling for the target

        testElement.style.cssText = "overflow: hidden; visibility: hidden; position: absolute; top: 0; left: 0; border: 0; margin: 0; padding: 0;";

        targetParent.appendChild(testElement);

        //destroy test element
        this.destroy = function () {
            targetParent.removeChild(testElement);
        };

        var _parentSize;
        var parentSize = function () {
            if (!_parentSize) {
                _parentSize = new parentSizeClass();
            }
            return _parentSize;
        };

        var _viewportSize;
        var viewportSize = function() {
            if (!_viewportSize) {
                _viewportSize = new viewportSizeClass();
            }
            return _viewportSize;
        };

        var parentSizeClass = function () {
            var _width, _height;
            this.width = function () {
                if (!_width) {
                    _width = $(targetParent).width();
                }
                return _width;
            }
            this.height = function () {
                if (!_height) {
                    _height = $(targetParent).height();
                }
                return _height;
            }
        };

        var viewportSizeClass = function () {
            var _width, _height;
            this.width = function () {
                if (!_width) {
                    _width = $(window).width();
                }
                return _width;
            }
            this.height = function () {
                if (!_height) {
                    _height = $(window).height();
                }
                return _height;
            }
        };

        //reset test element
        this.reset = function () {            
            $(testElement).contents().remove(); //remove all children

            var dh = new DeviceHelper();

            //the initial keyword does not work for Internet Explorer
            if (!dh.isIE) {
                testElement.style.fontSize = "initial";
                testElement.style.lineHeight = "initial";
                testElement.style.width = "initial";
                testElement.style.height = "initial";
                testElement.style.minWidth = "initial";
                testElement.style.minHeight = "initial";
                testElement.style.maxWidth = "initial";
                testElement.style.maxHeight = "initial";
            } else {
                testElement.style.fontSize = "medium";
                testElement.style.lineHeight = "normal";
                testElement.style.width = "auto";
                testElement.style.height = "auto";
                testElement.style.minWidth = 0;
                testElement.style.minHeight = 0;
                testElement.style.maxWidth = "none";
                testElement.style.maxHeight = "none";
            }
        }

        var self = this;

        /*
         * Converts some css Property values into pixel
         * Supported properties are min-width, min-height, max-width, max-height
         */
        this.convertToPixel = function (target, cssPropertyName, destroy) {
            self.reset();

            //get CSS value
            var value = getComputedStyle(target, null).getPropertyValue(cssPropertyName);

            //if the value is a string ("none") we simply return it
            var result = parseFloat(value);

            if (!result && result !== 0) {
                result = value;
            }
            //We can return pixels directly, but not other units
            else if (value.slice(-2) !== "px") {
                cssPropertyName = cssPropertyName.slice(4);
                var offsetSizeName = prefixSizeName(cssPropertyName, "offset", true);

                testElement.style[cssPropertyName] = value;
                result = testElement[offsetSizeName];
            }

            if (destroy) {
                self.destroy();
            }

            return result;
        };

        //convert any pixel length to target unit
        this.convertFromPixel = function (size, targetUnit, cssPropertyName, destroy) {
            self.reset();

            var result, pixelBase = 1.0,
                precision = 1;

            if (targetUnit === "px") {
                result = size;
            }
            else if (
                //relative (viewport) lengths
                targetUnit === "%" ||
                targetUnit === "vw" || targetUnit === "vh" ||
                targetUnit === "vmin" || targetUnit === "vmax"
            ) {                
                var total;
                if (targetUnit === "%") {
                    if (cssPropertyName === "width") {
                        total = parentSize().width();
                    } else {
                        total = parentSize().height();
                    }
                }
                else if (targetUnit === "vw") {
                    total = viewportSize().width();
                }
                else if (targetUnit === "vh") {
                    total = viewportSize().height();
                }
                else if (targetUnit === "vmin") {
                    var test1 = viewportSize().width();
                    var test2 = viewportSize().height();
                    total = Math.min(test1, test2);
                }
                else if (targetUnit === "vmax") {
                    total = Math.max(viewportSize().width(), viewportSize().height());
                }

                pixelBase = total / 100.0;
                precision = 2;            //support 1 decimal places for relative sizes
            }
            else if (
                //font-related lenghts
                targetUnit === "em" || targetUnit === "rem" ||
                targetUnit === "ex" || targetUnit === "ch"
            ) {
                testElement.style.lineHeight = "1";
                testElement.style.fontSize = "1.0em";

                precision = 2;            //support 2 decimal places for font-related sizes

                if (targetUnit === "em" || targetUnit === "rem") {
                    testElement.textContent = "&nbsp;";  //space content
                    testElement.style.fontSize = "1.0" + targetUnit;

                    pixelBase = $(testElement).height();
                }
                else if (targetUnit === "ex") {
                    testElement.textContent = "x";  //x content
                    testElement.style.height = "1.0" + targetUnit;

                    pixelBase = $(testElement).height();
                }
                else if (targetUnit === "ch") {
                    testElement.textContent = "0";  //0 content
                    testElement.style.width = "1.0" + targetUnit;

                    pixelBase = $(testElement).width();
                }

                //var test = (size / pixelBase) + targetUnit;
                //console.log(test);
                //return test;
            }
            else if (
                //static lenghts
                targetUnit === "in" || targetUnit === "pt" || targetUnit === "pc" || 
                targetUnit === "cm" || targetUnit === "mm"
            ) {
                testElement.style.width = "1in";
                precision = 2;

                var pixelBase = $(testElement).width(),
                    conversionFactor = 1.0;

                if (targetUnit === "pt") {
                    conversionFactor = 72.0;
                    precision = 0;              //support no decimal places for point
                }
                else if (targetUnit === "mm") {
                    conversionFactor = 25.4;
                    precision = 1;              //support 1 decimal places for millimeter
                }
                else if (targetUnit === "pc") {
                    conversionFactor = 6.0;
                    precision = 2;              //support 2 decimal places for millimeter
                }
                else if (targetUnit === "cm") {
                    conversionFactor = 2.54;
                    precision = 2;              //support 2 decimal places for centimeter
                }

                pixelBase /= conversionFactor;

                //var test = (size / pixelBase) + targetUnit;
                //console.log(test);
                //return test;
            }

            if (destroy) {
                self.destroy();
            }

            var precisionFactor = Math.pow(10, precision);      //support precision decimal places for static sizes

            var rest = (size * precisionFactor) % pixelBase;

            var floor = Math.floor((size * precisionFactor) / pixelBase);
            if (rest > pixelBase - rest) {
                floor += 1.0;
                rest = (pixelBase - rest) * -1.0;
            }
            floor = floor / precisionFactor;
            rest = rest / precisionFactor;

            var main = new NumberUnit(floor, targetUnit),
                offset = new NumberUnit(rest, "px");

            var number = new Size(main, offset, size);
            return number;
        };
    };

    /*
     * Author(s):   Thomas Stein
     * Description: Provides some methods to detect Internet Explorer devices
     *              https://stackoverflow.com/questions/31757852/how-can-i-detect-internet-explorer-ie-and-microsoft-edge-using-javascript/36688806#36688806
     */
    var DeviceHelper = function (_navigator) {
        this.navigator = _navigator || navigator;
        this.isIE = function () {
            if (!this.navigator.userAgent) {
                return false;
            }

            var IE10 = Boolean(this.navigator.userAgent.match(/(MSIE)/i)),
                IE11 = Boolean(this.navigator.userAgent.match(/(Trident)/i));
            return IE10 || IE11;
        };

        this.isEdge = function () {
            return !!this.navigator.userAgent && this.navigator.userAgent.toLowerCase().indexOf("edge") > -1;
        };

        this.isMicrosoftBrowser = function () {
            return this.isEdge() || this.isIE();
        };

        this.isFirefox = function () {
            return !!this.navigator.userAgent && navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
        }

        this.isChrome = function () {
            return !!this.navigator.userAgent && navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
        }
    };

    /*
     * Author(s):   Thomas Stein
     * Description: controller for debounce and throttle methods
     */
    var EventTimeController = function (modus, context, threshold) {
        var self = this;

        modus = modus || "raf";
        if (modus !== "raf" && modus !== "throttle" && modus !== "debounce") {
            output("the modus parameter value '" + modus + "' is invalid. Allowd values are 'raf', 'throttle', 'debounce'", "granit.eventTimeController");
        }
        context = context || this;
        threshold = threshold || 20;

        var last, timeout, raf;

        this.process = function (fn) {

            if (modus === "raf") {
                requestFrame(fn);
            }
            if (modus === "throttle") {
                throttle(fn);
            }
            if (modus === "debounce") {
                debounce(fn);
            }
        }

        this.cancel = function () {
            if (modus === "raf") {
                cancelFrame();
            }
            if (modus === "throttle") {
                cancelThrottle();
            }
            if (modus === "debounce") {
                cancelDebounce();
            }
        }

        var debounce = function (func) {
            var args = arguments;
            var later = function () {
                timeout = null;
                context && func.apply(context, args) || func(args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, threshold);
        };

        var cancelDebounce = function () {
            clearTimeout(timeout);
        }

        var throttle = function (fn) {
            var now = + new Date, args = arguments;

            if (last && now < last + threshold) {
                // Hold on to it
                clearTimeout(timeout);
                timeout = setTimeout(function () {
                    last = now;
                    context && fn.apply(context, args) || fn(args);
                }, threshold);
            } else {
                last = now;
                context && fn.apply(context, args) || fn(args);
            }
        };

        var cancelThrottle = function () {
            clearTimeout(timeout);
            last = undefined;
        }

        var requestFrame = function (fn) {
            var frame = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame;
            if (frame) {
                raf = frame(fn.bind(context));
            } else {
                throttle(fn);
            }
        };

        var cancelFrame = function () {
            var cancel = window.cancelAnimationFrame || window.mozCancelAnimationFrame || window.webkitCancelAnimationFrame;
            if (cancel) {
                cancel(raf);
                raf = undefined;
            } else {
                cancelThrottle();
            }
        };
    };

    //publish
    gt.extractFloatUnit = extractFloatUnit;
    gt.output = output;
    gt.arrayOperations = arrayOperations;
    gt.NumberUnit = NumberUnit;
    gt.Size = Size;
    gt.prefixSizeName = prefixSizeName;
    gt.EventTimeController = EventTimeController;
    gt.DeviceHelper = DeviceHelper;
    gt.PixelConverter = PixelConverter;
    gt.IsBooleanType = isBooleanType;

    return gt;
}(granit || {}));