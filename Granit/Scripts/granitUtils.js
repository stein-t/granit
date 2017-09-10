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
    var NumberUnit = (function () {
        function NumberUnit(number, unit) {
            this.Number = number;
            this.Unit = unit || "";
        }
        NumberUnit.prototype.getSize = function () {
            return this.Number + this.Unit;
        }
        return NumberUnit;
    })();

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
     * Description: checks if the item can be found in the haystack
     */
    var findOne = function (item, haystack) {
        return haystack.any(function () {
            return haystack.indexOf(item) >= 0;
        });
    };

    /*
     * Author(s):   Thomas Stein
     * Description: checks if the property can be found in the object
     */
    var findOneInObject = function (item, object) {
        var arr = Object.getOwnPropertyNames(object);
        return arr.indexOf(item) >= 0;
    };

    /*
     * Author(s):   Thomas Stein
     * Description: checks if all items of arr can be found in haystack: https://stackoverflow.com/questions/16312528/check-if-an-array-contains-any-element-of-another-array-in-javascript
     */
    var findAll = function (arr, haystack) {
        return arr.every(function (v) {
            return haystack.indexOf(v) >= 0;
        });
    };

    /*
     * Author(s):   Thomas Stein
     * Description: checks if all property names of the object can be found in the haystack string array: https://stackoverflow.com/questions/16312528/check-if-an-array-contains-any-element-of-another-array-in-javascript
     */
    var findAnyFromObject = function (object, haystack) {
        if (!object || !haystack) {
            return undefined;
        }
        var arr = Object.getOwnPropertyNames(object);
        return arr.every(function (v) {
            if (object.hasOwnProperty(v)) {
                return haystack.indexOf(v) >= 0;
            }
            return true;
        });
    };

    /*
     * Author(s):   Thomas Stein
     * Description: checks if any item in the haystack string array exactly matches one associated property name of the object : https://stackoverflow.com/questions/16312528/check-if-an-array-contains-any-element-of-another-array-in-javascript
     */
    var findAllFromObject = function (object, haystack) {
        if (!object || !haystack) {
            return undefined;
        }
        var arr = Object.getOwnPropertyNames(object);
        if (arr.length !== haystack.length) {
            return false;                       //same amount of items
        }
        return arr.every(function (v) {
            if (object.hasOwnProperty(v)) {
                return haystack.indexOf(v) >= 0;
            }
            return true;
        });
    };

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
    var CSSPixelProvider = (function () {
        var element, testElement;

        //Constructor
        function CSSPixelProvider(target) {
            //Create a temporary sibling div to resolve units into pixels.
            testElement = document.createElement("div");
            testElement.style.cssText = "overflow: hidden; visibility: hidden; position: absolute; top: 0; left: 0;"; 
            element = target;
            element.appendChild(testElement);
        }

        CSSPixelProvider.prototype.destroy = function () {
            element.removeChild(testElement);
        }

        CSSPixelProvider.prototype.getCSSPixel = function (target, hyphenProp) {
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
        }

        return CSSPixelProvider;
    })();


    /*
     * Author(s):   Thomas Stein
     * Description: helper object for debounce and throttle
     */
    var EventTimeController = (function () {
        var self = this;
        var last, timeout;
        this.modus = undefined;
        this.threshold = undefined;
        this.raf = undefined;
        this.context = undefined;

        //contructor
        function EventTimeController(modus, context, threshold) {
            modus = modus || "raf";
            if (modus !== "raf" && modus !== "throttle" && modus !== "debounce") {
                output("the modus parameter value '" + modus + "' is invalid. Allowd values are 'raf', 'throttle', 'debounce'", "granit.eventTimeController");
            }
            self.modus = modus;
            self.threshold = threshold || 20;
            self.context = context;
        }

        EventTimeController.prototype.process = function (fn, context, threshold) {
            threshold = threshold || self.threshold;
            context = context || self.context;

            if (self.modus === "raf") {
                EventTimeController.prototype.requestFrame.call(self, fn, context, threshold);
            }
            if (self.modus === "throttle") {
                EventTimeController.prototype.throttle.call(self, fn, context, threshold);
            }
            if (self.modus === "debounce") {
                EventTimeController.prototype.debounce.call(self, fn, context, threshold);
            }
        }

        EventTimeController.prototype.cancel = function () {
            if (self.modus === "raf") {
                EventTimeController.prototype.cancelFrame.call(self);
            }
            if (self.modus === "throttle") {
                EventTimeController.prototype.cancelThrottle.call(self);
            }
            if (self.modus === "debounce") {
                EventTimeController.prototype.cancelDebounce.call(self);
            }
        }

        EventTimeController.prototype.debounce = function (func, context, wait) {
            var args = arguments;
            var later = function () {
                timeout = null;
                context && func.apply(context, args) || func(args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };

        EventTimeController.prototype.cancelDebounce = function () {
            clearTimeout(timeout);
        }

        EventTimeController.prototype.throttle = function (fn, context, threshold) {
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

        EventTimeController.prototype.cancelThrottle = function () {
            clearTimeout(timeout);
            last = undefined;
        }

        EventTimeController.prototype.requestFrame = function (fn, context, threshold) {
            var raf = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame;
            if (raf) {
                self.raf = raf(fn.bind(context));
            } else {
                EventTimeController.prototype.throttle.call(self, fn, context, threshold);
            }
        };

        EventTimeController.prototype.cancelFrame = function () {
            var cancel = window.cancelAnimationFrame || window.mozCancelAnimationFrame || window.webkitCancelAnimationFrame;
            if (cancel) {
                cancel(self.raf);
                self.raf = undefined;
            } else {
                EventTimeController.prototype.cancelThrottle.call(self);
            }
        };

        return EventTimeController;
    })();

    //publish
    gt.extractFloatUnit = extractFloatUnit;
    gt.parseFloatUnit = parseFloatUnit;
    gt.output = output;
    gt.uniqueArray = uniqueArray;
    gt.findOne = findOne;
    gt.findOneInObject = findOneInObject;
    gt.findAll = findAll;
    gt.findAnyFromObject = findAnyFromObject;
    gt.findAllFromObject = findAllFromObject;
    gt.NumberUnitArray = numberUnitArray;
    gt.NumberUnit = NumberUnit;
    gt.CSSPixelProvider = CSSPixelProvider;
    gt.prefixSizeName = prefixSizeName;
    gt.EventTimeController = EventTimeController;

    return gt;
}(granit || {}));