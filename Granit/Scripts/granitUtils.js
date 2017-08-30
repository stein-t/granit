/*
 * Contributor(s): Thomas Stein, ... <please leave your name>
 * Description:    Javascript library with properties, methods, classes that are used by the Granit splitter layout control
 * License:        MIT
 */
var granit = (function (gt) {
    var self = this;

    /*
     * Author(s):   Thomas Stein, ... <please leave your name>
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
     * Author(s):   Thomas Stein, ... <please leave your name>
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
     * Author(s):   Thomas Stein, ... <please leave your name>
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
     * Author(s):   Thomas Stein, ... <please leave your name>
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
     * Author(s):   Thomas Stein, ... <please leave your name>
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
     * Author(s):   Thomas Stein, ... <please leave your name>
     * Description: checks if the item can be found in the haystack
     */
    var findOne = function (item, haystack) {
        return haystack.any(function () {
            return haystack.indexOf(item) >= 0;
        });
    };

    /*
     * Author(s):   Thomas Stein, ... <please leave your name>
     * Description: checks if all items of arr can be found in haystack: https://stackoverflow.com/questions/16312528/check-if-an-array-contains-any-element-of-another-array-in-javascript
     */
    var findAll = function (arr, haystack) {
        return arr.every(function (v) {
            return haystack.indexOf(v) >= 0;
        });
    };

    /*
     * Author(s):   Thomas Stein, ... <please leave your name>
     * Description: checks if all property names of the object can be found in the haystack string array: https://stackoverflow.com/questions/16312528/check-if-an-array-contains-any-element-of-another-array-in-javascript
     */
    var findAllFromObject = function (object, haystack) {
        var arr = Object.getOwnPropertyNames(object);
        return arr.every(function (v) {
            if (object.hasOwnProperty(v)) {
                return haystack.indexOf(v) >= 0;
            }
            return true;
        });
    };

    /*
     * Author(s):   Thomas Stein, ... <please leave your name>
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
                output("item is no object of NumberUnit", "numberUnitArray.add");
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

    //publish
    gt.extractFloatUnit = extractFloatUnit;
    gt.parseFloatUnit = parseFloatUnit;
    gt.output = output;
    gt.uniqueArray = uniqueArray;
    gt.findAll = findAll;
    gt.findAllFromObject = findAllFromObject;
    gt.NumberUnitArray = numberUnitArray;
    gt.NumberUnit = NumberUnit;

    return gt;
}(granit || {}));