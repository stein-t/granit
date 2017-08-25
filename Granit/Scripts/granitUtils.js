var granit = (function (gt) {
    // add capabilities...

    var self = this;

    /*
     * ouputs errors (as exceptions) and warnings (as console output). Optionally alerts the output.
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
     * help function to validate the input.
     * It returns the float numer portion of the given input. The input size must be a string or a number.
     * if a number is given, simply the number is returned.
     * If a string is given, consisting of a number and a measure, the measure is checked with the unitFormat regular expression and cut out, number is returned.
     * id and type are used for detail error message to specify the object (variable, tag or other), that caused the error.
     * numberSet can be "Q", "Q+" (positive) or "Q-" (negative). Default is "Q";
     */
    var parseFloatUnit = function (size, numberSet, unitFormat, errorObject, math) {
        if (!numberSet || (numberSet !== "Q" && numberSet !== "Q+" && numberSet !== "Q-")) {
            numberSet = "Q";
        }
        if (size && jQuery.type(size) !== "string" && jQuery.type(size) !== "number") {
            self.output("value (" + size + ") is not a number or a string)", errorObject);
        }

        math = math || function (x) { return x; };

        var regex = new RegExp(/^[+-]?\d+(\.\d+)?/.source + "(" + unitFormat.source + ")?$");     //float number with optional measure

        if (size && jQuery.type(size) === "string" && !size.match(regex)) {
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

        return {
            number: math(value),
            unit: unit || defaultUnit,
            getSize: function () {
                return this.number + this.unit
            }
        };
    };

    var uniqueArray = function (list) {
        var result = [];
        $.each(list, function (i, e) {
            if ($.inArray(e, result) == -1) result.push(e);
        });
        return result;
    }

    gt.extractFloatUnit = extractFloatUnit;
    gt.parseFloatUnit = parseFloatUnit;
    gt.output = this.output;
    gt.uniqueArray = uniqueArray;

    return gt;
}(granit || {}));