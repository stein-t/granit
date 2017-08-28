/*
 * Contributor(s): Thomas Stein, ... <please leave your name>
 * Description:    Javascript library with properties & methods that are used by the Granit splitter layout control
 * License:        MIT
 */
var granit = (function (gt) {
    var self = this;

    /*
     * Author(s):   Thomas Stein, ... <please leave your name>
     * Description: Manages ouput errors (as exceptions) and warnings (as console output). Optionally alerts the output.
     */
    this.output = function (message, errorObject, type, alert) {
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
            self.output("value (" + size + ") is not a number or a string)", errorObject);
        }

        math = math || function (x) { return x; };

        var regex = new RegExp(/^[+-]?\d+(\.\d+)?/.source + "(" + unitFormat.source + ")?$");     //float number with optional measure

        if (jQuery.type(size) === "string" && !size.match(regex)) {
            self.output("value (" + size + ") format is invalid -- format (" + regex + ") expected (float number with optional measure)", errorObject);
        }

        var result = parseFloat(size);

        if (numberSet !== "Q") {
            if (result < 0.0 && numberSet == "Q+") {
                self.output("value (" + result + ") < 0.0 -- positive value expected", errorObject);
            }
            if (result > 0.0 && numberSet == "Q-") {
                self.output("value (" + result + ") > 0.0 -- negative value expected", errorObject);
            }
        }

        return math(result);
    };

    /*
     * Author(s):   Thomas Stein, ... <please leave your name>
     * Description: the NumberUnit class -- Instances of this class are very heavily used in granit to transfer not only numbers but also associated units.
     */
    this.NumberUnit = (function () {
        function NumberUnit(number, unit) {
            this.Number = number;
            this.Unit = unit || "px";
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
            self.output("value (" + size + ") is not a number or a string", errorObject);
        }

        math = math || function (x) { return x; };

        var unitRegex = new RegExp("^" + unitFormat.source + "$");
        if (defaultUnit && !defaultUnit.match(unitRegex)) {
            self.output("the provided default unit (" + defaultUnit + ") is not a valid unit according to the given unit format " + unitFormat, errorObject);
        }

        var floatRegex = /[+-]?\d+(\.\d+)?/;
        var regex = new RegExp("^(" + floatRegex.source + ")" + "(" + unitFormat.source + ")?$");     //float number with optional measure

        var value, unit = '';

        if (jQuery.type(size) === "string") {
            var match = size.match(regex);

            if (!match) {
                self.output("value (" + size + ") format is invalid -- format (" + regex + ") expected (float number with optional measure)", errorObject);
            }

            size = match[1];
            unit = match[3];
        }

        if (!defaultUnit && !unit) {
            self.output("value (" + size + ") format is invalid -- unit expected (float number with measure unit)", errorObject);
        }

        value = parseFloat(size);

        if (numberSet !== "Q") {
            if (value < 0.0 && numberSet == "Q+") {
                self.output("value (" + value + ") < 0.0 -- positive value expected", errorObject);
            }
            if (value > 0.0 && numberSet == "Q-") {
                self.output("value (" + value + ") > 0.0 -- negative value expected", errorObject);
            }
        }

        return new self.NumberUnit(math(value), unit || defaultUnit);
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
     *              as a final goal this very specific array joins (concat) values together into a string to be used in css-calc statements
     */
    var numberUnitArray = function numberUnitArray() {
        var arr = [];
        arr.push.apply(arr, arguments);

        /*
         * if the new item(s) matches an existing item by unit, the items Numbers are joined together with the provided operation.
         * otherwise the new item simply is pushed into the list, together with the respective operation.
         */
        arr.add = function (item, operation) {
            //TODO
            return this.push(item);
        }

        /*
         * join the items together with the respective operation as a string to be used in a css-calc statement.
         * For example: " - 5px + 10% - 80em".
         */
        arr.concat = function () {
            //TODO
            return this.toString();
        }

        //... eventually define more methods for this special array type

        return arr;
    }

    //publish
    gt.extractFloatUnit = extractFloatUnit;
    gt.parseFloatUnit = parseFloatUnit;
    gt.output = this.output;
    gt.uniqueArray = uniqueArray;
    gt.findAll = findAll;
    gt.findAllFromObject = findAllFromObject;
    gt.NumberUnitArray = numberUnitArray;
    gt.NumberUnit = NumberUnit;

    return gt;
}(granit || {}));