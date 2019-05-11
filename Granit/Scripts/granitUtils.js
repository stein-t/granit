/*
 * Contributor(s): Thomas Stein
 * Description:    Javascript library with properties, methods, classes that are used by the Granit splitter layout control
 * License:        MIT
 */
var granit = (function (gt) {
    var self = this;

    //the threshold that is used to calculate sufficient accurate lengths
    gt.Threshold = 0.01;

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

        self.getValue = function () {
            if (!self.Offset) {
                return self.Number.getValue();
            }
            return "calc(" + self.Number.getValue() + " " + " + " + self.Offset + ")";
        }

        self.setValue = function (number, offset, precise) {
            if (!number || number === "auto") {
                number = new NumberUnit(1);
            }
            self.Number = number;
            self.Offset = offset;
            self.Precise = precise || number.getValue();

            self.autoSized = number.getValue() === 1 ? true : false;
        }

        self.setValue(number);
        self.TargetUnit = self.Number.Unit;
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
        this.convertToPixel = function (target, cssPropertyName, value, destroy) {
            self.reset();

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
        this.convertFromPixel = function (size, cssPropertyName, destroy) {
            self.reset();

            var result, pixelBase = 1.0,
                precision = 1;

            if (size.TargetUnit === "px") {
                return;
            }
            else if (
                //relative (viewport) lengths
                size.TargetUnit === "%" ||
                size.TargetUnit === "vw" || size.TargetUnit === "vh" ||
                size.TargetUnit === "vmin" || size.TargetUnit === "vmax"
            ) {                
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
                    var test1 = viewportSize().width();
                    var test2 = viewportSize().height();
                    total = Math.min(test1, test2);
                }
                else if (size.TargetUnit === "vmax") {
                    total = Math.max(viewportSize().width(), viewportSize().height());
                }

                pixelBase = total / 100.0;
            }
            else if (
                //font-related lenghts
                size.TargetUnit === "em" || size.TargetUnit === "rem" ||
                size.TargetUnit === "ex" || size.TargetUnit === "ch"
            ) {
                testElement.style.lineHeight = "1";
                testElement.style.fontSize = "1.0em";

                precision = 2;            //support 2 decimal places for font-related sizes

                if (size.TargetUnit === "em" || size.TargetUnit === "rem") {
                    testElement.textContent = "&nbsp;";  //space content
                    testElement.style.fontSize = "1.0" + size.TargetUnit;

                    pixelBase = $(testElement).height();
                }
                else if (size.TargetUnit === "ex") {
                    testElement.textContent = "x";  //x content
                    testElement.style.height = "1.0" + size.TargetUnit;

                    pixelBase = $(testElement).height();
                }
                else if (size.TargetUnit === "ch") {
                    testElement.textContent = "0";  //0 content
                    testElement.style.width = "1.0" + size.TargetUnit;

                    pixelBase = $(testElement).width();
                }
            }
            else if (
                //static lenghts
                size.TargetUnit === "in" || size.TargetUnit === "pt" || size.TargetUnit === "pc" || 
                size.TargetUnit === "cm" || size.TargetUnit === "mm"
            ) {
                testElement.style.width = "1in";
                precision = 2;

                pixelBase = $(testElement).width(),
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

            if (destroy) {
                self.destroy();
            }

            var precise = (size.Pixel / pixelBase) + size.TargetUnit;

            //calculate pixel offset
            var precisionFactor = Math.pow(10, precision);      //support precision decimal places for static sizes

            var rest = (size.Pixel * precisionFactor) % pixelBase;

            var floor = Math.floor((size.Pixel * precisionFactor) / pixelBase);
            if (rest > pixelBase - rest) {
                floor += 1.0;
                rest = (pixelBase - rest) * -1.0;
            }
            floor = floor / precisionFactor;
            rest = rest / precisionFactor;

            size.Number.setValue(floor, size.TargetUnit);
            var offset;
            if (rest >= gt.Threshold) {
                rest + "px";
            }

            size.setValue(size.Number, offset, precise);
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