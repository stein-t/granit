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
     * Description: Help function to validate the input.
     */
    var parseFloatUnit = function (size, numberSet, unitFormat, errorObject, math) {
        if (!numberSet || (numberSet !== "Q" && numberSet !== "Q+" && numberSet !== "Q-")) {
            numberSet = "Q";
        }
        if (jQuery.type(size) !== "string" && jQuery.type(size) !== "number") {
            output("value (" + size + ") is not a number or a string)", errorObject);
        }

        math = math || function (x) { return x; };

        var regex = new RegExp(/^[+-]?\d+(\.\d+)?/.source + "(" + unitFormat.source + ")?$");     //float number with optional measure

        if (jQuery.type(size) === "string" && !size.match(regex)) {
            output("value (" + size + ") format is invalid -- format (" + regex + ") expected (float number with optional measure)", errorObject);
        }

        var result = parseFloat(size);

        if (numberSet !== "Q") {
            if (result < 0.0 && numberSet == "Q+") {
                output("value (" + result + ") < 0.0 -- positive value expected", errorObject);
            }
            if (result > 0.0 && numberSet == "Q-") {
                output("value (" + result + ") > 0.0 -- negative value expected", errorObject);
            }
        }

        return math(result);
    };

    /*
     * Author(s):   Thomas Stein
     * Description: the NumberUnit class -- Instances of this class are very heavily used in granit to transfer not only numbers but also associated units.
     */
    var NumberUnit = function (number, unit) {
        this.Number = number;
        this.Unit = unit || "";

        this.getSize = function () {
            return this.Number + this.Unit;
        }
    };

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

        var value, unit = '';

        if (jQuery.type(size) === "string") {
            var match = size.match(regex);

            if (!match) {
                output("value (" + size + ") format is invalid -- format (" + regex + ") expected (float number with optional measure)", errorObject);
            }

            size = match[1];
            unit = match[3];
        }

        if (!defaultUnit && !unit) {
            output("value (" + size + ") format is invalid -- unit expected (float number with measure unit)", errorObject);
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
     * Description: eliminates duplicates from the list
     */
    var uniqueArray = function (list) {
        var result = [];
        $.each(list, function (i, e) {
            if ($.inArray(e, result) == -1) result.push(e);
        });
        return result;
    }

    /*
     * Author(s):   Thomas Stein
     * Description: helper methods for searching and comparing in objects and arrays
     */
    var listCompare = {
        /*
         * Author(s):   Thomas Stein
         * Description: checks if all items in the array can be found in haystack.
         *              Additionally, if all = true, checks if all items in the haystack are represented in the array.
         */
        arrayToArray: function (arr, haystack, all) {
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
         *              Additionally, if all = true, checks if all items in the haystack are represented in the propert-name list of the object.
         */
        objectToArray: function (object, haystack, all) {
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
        }
    }

    /*
     * Author(s):   Thomas Stein
     * Description: creates a helper list of NumberUnit objects used in order to sum up items with equal units.
     *              as a final goal this very specific array joins values together (toString) into a string to be used in css-calc statements
     */
    var numberUnitArray = function numberUnitArray() {
        var arr = [];
        //arr.push.apply(arr, arguments); // currently no initialization arguments supported

        /*
         * if the new item matches an existing item by unit, both the items Numbers are joined together with the provided operation.
         * otherwise the new item simply is pushed into the list, together with the respective operation.
         */
        arr.add = function (item, operation) {
            if (!(item instanceof NumberUnit)) {
                //the item is considered to be a css length value string ("10px", "5rem", etc.) and must be converted into a NumberUnit object 
                var number = parseFloat(item);
                var unit = item.replace(number, "");
                item = new NumberUnit(number, unit);
            }

            var itemNumber = parseFloat(item.Number);
            var element;
            arr.forEach(function (el) {
                if (item.Unit === el.Unit) {
                    element = el;
                    return true;
                }                
            });

            if (element) {
                var elementNumber = parseFloat(element.Operation + element.Number);
                switch (operation) {
                    case "+":
                        elementNumber = elementNumber + itemNumber;
                        break;
                    case "-":
                        elementNumber = elementNumber - itemNumber
                        break;
                    default:
                        break;
                }
                if (elementNumber >= 0) {
                    element.Number = elementNumber;
                    element.Operation = "+";
                } else {
                    element.Number = Math.abs(elementNumber);
                    element.Operation = "-";
                }

                return true;
            }
            else {
                item.Operation = operation;
                return this.push(item);                
            }

            return arr;
        }

        /*
         * use to insert list of items
         */
        arr.addAll = function (itemArray, operation) {
            if (!(Array.isArray(itemArray))) {
                output("itemArray is no array", "numberUnitArray.addAll");
            }
            itemArray.forEach(function (item) {
                arr.add(item, operation);
            });

            return arr;
        }

        /*
         * join the items together with the respective operation as a string to be used in a css-calc statement.
         * For example: " - 5px + 10% - 80em".
         */
        arr.toString = function () {
            var result = arr.reduce(function (total, item) {
                return total + " " + item.Operation + " " + item.Number + item.Unit;
            }, "");

            return result;
        }

        //... eventually define more methods for this special array type

        return arr;
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
     * Description: Provides any css length property value in pixels for max-width, min-width, max-height, min-height
     */
    var CSSPixelProvider = function (target) {
        var element = target,
            testElement = document.createElement("div");  //Create a temporary sibling div to resolve units into pixels.
       
        testElement.style.cssText = "overflow: hidden; visibility: hidden; position: absolute; top: 0; left: 0;";
        element.appendChild(testElement);

        this.destroy = function () {
            element.removeChild(testElement);
        };

        this.getCSSPixel = function (target, hyphenProp) {
            //get CSS value
            var value = getComputedStyle(target, null).getPropertyValue(hyphenProp);

            //if the value is a string ("none") we simply return it
            if (!parseFloat(value)) {
                return value;
            }

            //We can return pixels directly, but not other units
            if (value.slice(-2) == "px") {
                return parseFloat(value.slice(0, -2));
            }

            var sizePropertyName = hyphenProp.slice(4);
            var offsetSize = prefixSizeName(sizePropertyName, "offset", true);

            testElement.style[sizePropertyName] = value;
            return testElement[offsetSize];
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
            return !!this.navigator.userAgent && this.navigator.userAgent.indexOf("Edge") > -1;
        };

        this.isMicrosoftBrowser = function () {
            return this.isEdge() || this.isIE();
        };
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
    gt.parseFloatUnit = parseFloatUnit;
    gt.output = output;
    gt.uniqueArray = uniqueArray;
    gt.listCompare = listCompare;
    gt.NumberUnitArray = numberUnitArray;
    gt.NumberUnit = NumberUnit;
    gt.CSSPixelProvider = CSSPixelProvider;
    gt.prefixSizeName = prefixSizeName;
    gt.EventTimeController = EventTimeController;
    gt.DeviceHelper = DeviceHelper;

    return gt;
}(granit || {}));