/*
 * Contributor(s): Thomas Stein
 * Description:    Javascript library with properties, methods, classes that are used by the Granit splitter layout control
 * License:        MIT
 */
var granit = (function (gt) {
    
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

        self.Value;
        self.Unit;

        self.getValue = function () {
            if (self.Unit) {
                return self.Value + self.Unit;
            }
            return self.Value;
        }

        self.setValue = function (value, unit) {
            self.Value = value || 0;
            self.Unit = unit || "";
        }

        self.setValue(value, unit);
    };

    /*
     * Author(s):   Thomas Stein
     * Description: NumberUnit wrapper with additional properties in order to express the length as Number, Offset, Pixel, Precise
     */
    var Size = function (number) {
        var self = this;

        self.Number;    //holds the target unit number of the value
        self.Offset;    //holds the pixel offset of the value
        self.Precise;   //holds the precise target unit value (no pixel offset)
        self.Pixel;     //holds the size in pixels while dragging a splitter

        self.getValue = function (getPixel) {
            if (getPixel) {
                return self.Pixel + "px";
            }

            if (!self.Offset) {
                return self.Number.getValue();
            }

            return self.Precise;
            // return "calc(" + self.Number.getValue() + " " + " + " + self.Offset + ")";
        }

        self.setValue = function (number, offset, precise) {
            if (!number || number === "auto") {
                number = new NumberUnit(1);
            }
            self.Number = number;

            self.Offset = offset;
            self.Precise = precise || number.getValue();
        }

        self.setValue(number);
    }
    //define getter as Number wrapper properties
    Object.defineProperty(Size.prototype, 'TargetUnit', { get: function() { return this.Number.Unit; } });
    Object.defineProperty(Size.prototype, 'AutoSized', { get: function() { return this.Number.Unit == false; } });

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
            if (value < 0.0 && numberSet === "Q+") {
                output("value (" + value + ") < 0.0 -- positive value expected", errorObject);
            }
            if (value > 0.0 && numberSet === "Q-") {
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
         * Description: checks if all items in the array can be found in haystack.
         *              Additionally, if all = true, checks if all items in the haystack are represented in the array.
         */
        compareArrayToArray: function (arr, haystack, all) {
            if (all && arr.length !== haystack.length) {
                return false;                       //same amount of items
            }

            return arr.every(function (v) {
                return haystack.indexOf(v) >= 0;
            });
        },

        /*
         * Author(s):   Thomas Stein
         * Description: checks if all property names in the object can be found in haystack.
         *              Additionally, if all = true, checks if all items in the haystack are represented in the property-name list of the object.
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
                if ($.inArray(e, result) === -1) result.push(e);
            });
            return result;
        },
        
        /*
         * Author(s):   Thomas Stein
         * Description: merges 2 arrays and eliminates duplicates
         *              see https://www.w3resource.com/javascript-exercises/javascript-array-exercise-30.php
         */
        merge_array: function(array1, array2) {
            var result_array = [];
            var arr = array1.concat(array2);
            var len = arr.length;
            var assoc = {};
        
            while(len--) {
                var item = arr[len];
        
                if(!assoc[item]) 
                { 
                    result_array.unshift(item);
                    assoc[item] = true;
                }
            }
        
            return result_array;
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
     * Description: support entity for converting non-pixel length values into pixel lengths and vice versa
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

        //helper for retrieving width and height from parent
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

        //helper for retrieving width and height from viewport        
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

        var self = this;

        /*
         * Converts some css length Property values into pixel
         * Supported properties are width, height, min-width, min-height, max-width, max-height
         */
        this.convertToPixel = function (target, cssPropertyName, destroy, value) {            
            if (!value) {
                //get CSS value
                value = getComputedStyle(target, null).getPropertyValue(cssPropertyName);
            }

            //if the value is a string ("none") we simply return it
            var result = parseFloat(value);

            if (!result && result !== 0) {
                result = value;
            }
            //We can return pixels directly, but not other units
            else if (value.slice(-2) !== "px") {
                if (cssPropertyName.indexOf('-') > 0) {
                    //cut out "min-" and "max-", that is extract "width" or "height"
                    cssPropertyName = cssPropertyName.slice(4);
                }
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
        this.convertFromPixel = function (size, cssPropertyName, destroy) {
            var pixelBase = 1.0,
                precision = 1;

            if (size.TargetUnit === "px") {
                return;
            }
            else if (["%", "vw", "vh", "vmin", "vmax"].indexOf(size.TargetUnit) > -1) {     //relative (viewport) lengths              
                var total;
                precision = 2;            //support 1 decimal places for relative sizes

                if (size.TargetUnit === "%") {
                    if (cssPropertyName === "width") {
                        total = parentSize().width();
                    } else {
                        total = parentSize().height();
                    }
                }
                else if (size.TargetUnit === "vw") {
                    total = viewportSize().width();
                }
                else if (size.TargetUnit === "vh") {
                    total = viewportSize().height();
                }
                else if (size.TargetUnit === "vmin") {
                    total = Math.min(viewportSize().width(), viewportSize().height());
                }
                else if (size.TargetUnit === "vmax") {
                    total = Math.max(viewportSize().width(), viewportSize().height());
                }

                pixelBase = total * 0.01;
            }
            else if (["em", "rem", "ex", "ch"].indexOf(size.TargetUnit) > -1) {         //font-related lenghts
                precision = 2;  //support 2 decimal places for font-related sizes

                if (["em", "rem"].indexOf(size.TargetUnit) > -1) {
                    testElement.style.fontSize = "1.0" + size.TargetUnit;

                    //get CSS value
                    pixelBase = parseFloat(getComputedStyle(testElement, null).getPropertyValue("font-size"));
                    var test = pixelBase;
                }
                else if (["ex", "ch"].indexOf(size.TargetUnit) > -1) {
                    //test for minHeight seems to work best with all browsers
                    testElement.style.minHeight = "1.0" + size.TargetUnit;

                    //get CSS value
                    pixelBase = parseFloat(getComputedStyle(testElement, null).getPropertyValue("min-height"));
                    var test = pixelBase;
                }
            }
            else if (["in", "pt", "pc", "cm", "mm"].indexOf(size.TargetUnit) > -1)  {   //static lenghts
                testElement.style.width = "1in";
                precision = 2;

                //get CSS value
                pixelBase = parseFloat(getComputedStyle(testElement, null).getPropertyValue("width"));
                //pixelBase = $(testElement).width(), 
                conversionFactor = 1.0;

                if (size.TargetUnit === "pt") {
                    conversionFactor = 72.0;
                    precision = 0;              //support no decimal places for point
                }
                else if (size.TargetUnit === "mm") {
                    conversionFactor = 25.4;
                    precision = 1;              //support 1 decimal places for millimeter
                }
                else if (size.TargetUnit === "pc") {
                    conversionFactor = 6.0;
                    precision = 2;              //support 2 decimal places for millimeter
                }
                else if (size.TargetUnit === "cm") {
                    conversionFactor = 2.54;
                    precision = 2;              //support 2 decimal places for centimeter
                }

                pixelBase /= conversionFactor;
            }

            var precise = (size.Pixel / pixelBase) + size.TargetUnit;

            //calculate pixel offset
            var precisionFactor = Math.pow(10, precision);      //support precision decimal places for static sizes

            var rest = (size.Pixel * precisionFactor) % pixelBase;
            var floor = Math.floor((size.Pixel * precisionFactor) / pixelBase);
            if (rest > pixelBase - rest) {
                //close to ceiling
                floor += 1.0;
                rest = (pixelBase - rest) * -1.0;
            }
            floor = floor / precisionFactor;
            rest = rest / precisionFactor;

            size.Number.setValue(floor, size.TargetUnit);
            var offset;

            offset = rest + "px";

            size.setValue(size.Number, offset, precise);

            if (destroy) {
                self.destroy();
            }
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

    //publish
    gt.extractFloatUnit = extractFloatUnit;
    gt.output = output;
    gt.arrayOperations = arrayOperations;
    gt.NumberUnit = NumberUnit;
    gt.Size = Size;
    gt.prefixSizeName = prefixSizeName;
    gt.DeviceHelper = DeviceHelper;
    gt.PixelConverter = PixelConverter;
    gt.IsBooleanType = isBooleanType;

    return gt;
}(granit || {}));