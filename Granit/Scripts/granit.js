/*
 * Copyright (c) 2017 Stein
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 *
 * Contributor(s): Thomas Stein, ... <please leave your name>
 * Description:    Granit jQuery-ui widget control for creating a splitter layout with Flexbox
 * License:        MPL 2.0
 */

$(function () {
    $.widget("granit.splitter", {
        options: {
            direction: "vertical",
            panel: [],
            splitter: [],
            panelResizable: true,
            panelMinSize: 1,
            panelMaxSize: "none",
            panelClasses: "granitSplitter_Panel_Default",
            panelPadding: 0,
            panelMargin: 0,
            splitterWidth: 5,
            splitterLength: "100%",
            splitterClasses: "granitSplitter_Splitter_Default",
            overflow: "auto",
            flexible: false,
            separator: { width: 1, length: "100%" }
        },
        /*
         * Author(s):   Thomas Stein, ... <please leave your name>
         * Description: The _create() method is the widget's constructor.
         *              The options are retrieved, the DOM is manipulated accordingly, and more ...
         */
        _create: function () {
            self = this;

            //set the version
            $.granit.splitter.prototype.version = "0.1.0.0";

            //console.log("Version: " + this.version);
            //console.log("uuid: " + this.uuid);
            //console.log("namespace: " + this.namespace);
            //console.log("widgetFullName: " + this.widgetFullName);
            //console.log("widgetName: " + this.widgetName);
            
            var splitterId = self.element[0].getAttribute("id");

            //used to identify splitter in error message
            this.IdString = "#" + splitterId;

            var optionsAllowed = [
                'classes', 'disabled', 'create', 'hide', 'show',    //base widget properties
                'direction', 'panel', 'panelMinSize', 'panelMaxSize', 'panelClasses', 'panelPadding', 'splitter',
                'panelMargin', 'splitterWidth', 'splitterLength', 'splitterClasses', 'overflow', 'flexible', 'panelResizable', 'separator'
            ];

            if (!granit.findAllFromObject(this.options, optionsAllowed)) {
                granit.output("invalid options property found - check the options object", this.IdString + " -- self.options", 'Warning');
            }

            if (this.options.panel && !Array.isArray(this.options.panel)) {
                granit.output("the options property panel must be an array - check the options object", this.IdString + " -- self.options.panel");
            }

            if (this.options.splitter && !Array.isArray(this.options.splitter)) {
                granit.output("the options property splitter must be an array - check the options object", this.IdString + " -- self.options.splitter");
            }

            var panelOptionsAllowed = [
                'flexible', 'size', 'minSize', 'maxSize', 'classes', 'padding', 'margin', 'resizable'
            ];

            var splitterOptionsAllowed = [
                'width', 'length', 'classes', 'separator'
            ];

            //validate options.direction
            if (self.options.direction !== "vertical" && self.options.direction !== "horizontal") {
                granit.output("value (" + self.options.direction + ") is invalid -- expected values are 'vertical', 'horizontal'", this.IdString + " -- self.options.direction");
            }

            //validate options.overflow
            if (self.options.overflow !== "auto" && self.options.overflow !== "hidden" && self.options.overflow !== "scroll") {
                granit.output("value (" + self.options.overflow + ") is invalid -- expected values are 'auto', 'hidden', 'scroll'", this.IdString + " -- self.options.overflow");
            }

            this.element.addClass("granitSplitter_Container");

            if (self.options.direction === "vertical") {
                this.element.addClass("granitSplitter_Container_vertical");
                this.element.css("overflow-x", self.options.overflow);
                this.sizePropertyName = "width";
                this.cursor = "ew-resize";
            } else {
                this.element.addClass("granitSplitter_Container_horizontal");
                this.element.css("overflow-y", self.options.overflow);
                this.sizePropertyName = "height";
                this.cursor = "ns-resize";
            }

            //identify children: only divs or any semantic element are permitted
            var children = this.element.children(
                "div, article, aside, details, figcaption, figure, footer, header, main, mark, nav, section, summary, time"
            );

            if (children.length != this.element.children("*").length) {
                granit.output("not all panels are divs or semantic elements!", this.IdString + " -- self.children");
            }

            //local help variables
            var panelsWithoutOrRelativeSize = [];                       //holds panels without size or percentage size
            var panelSizeTotalOffset = granit.NumberUnitArray();        //the total size of panels with a non-percentage size under consideration of different units 
            var panelSizePercentTotal = 0.0;                            //the total percentage size of percentage panels
            var panelsWithoutSizeTotal = 0;                             //amount of panels without size
            var splitterOffset = granit.NumberUnitArray();              //the total width of splitters under consideration different units 

            //global
            this.panels = [];               //reference to the panels (or final panel wrappers)
            this.splitterList = [];         //reference to the splitters

            /*
             * iterate the children in order to ...
             *      ... retrieve and validate the associated panel and splitter options
             *      ... create the respective panel style container, define the associated splitter element
             *      ... manipulate the DOM by adding the panel style container, the panel wrapper and the associated splitter element
             *      ... process special rules for panels without size: those panels share the remaining space and have precentage length
             *      ... consider to divide equally the total splitter width among all percent-sized panels       
             */
            children.each(function (index, element) {
                //identify the associated panel
                var panel = self.options.panel && self.options.panel[index];

                //check for invalid options
                if (panel && !granit.findAllFromObject(panel, panelOptionsAllowed)) {
                    granit.output("invalid panel array item option property found - check the panel array item options", self.IdString + " -- self.options.panel", 'Warning');
                }

                //retrieve the resizable option: a value defined on the individual panel level overwrites any global level value
                var resizable = (panel && panel.resizable) || self.options.panelResizable;
                resizable = resizable ? true : false;

                //retrieve the minSize option: a value defined on the individual panel level overwrites any global level value
                var minSize = (panel && panel.minSize) || self.options.panelMinSize;
                minSize = minSize && minSize !== "none" ? granit.extractFloatUnit(minSize, "Q+", /%|px|em|ex|px|cm|mm|in|pt|pc|ch|rem|vh|vw|vmin/, "px", self.IdString + " -- Panel minimum size (minSize)") : new granit.NumberUnit("none");

                //retrieve the maxSize option: a value defined on the individual panel level overwrites any global level value
                var maxSize = (panel && panel.maxSize) || self.options.panelMaxSize;
                maxSize = maxSize && maxSize !== "none" ? granit.extractFloatUnit(maxSize, "Q+", /%|px|em|ex|px|cm|mm|in|pt|pc|ch|rem|vh|vw|vmin/, "px", self.IdString + " -- Panel maximum size (maxSize)") : new granit.NumberUnit("none");

                //retrieve the padding option: a value defined on the individual panel level overwrites any global level value
                var padding = (panel && panel.padding) || self.options.panelPadding;
                padding = granit.extractFloatUnit(padding, "Q+", /px|em|ex|px|cm|mm|in|pt|pc|ch|rem|vh|vw|vmin/, "px", self.IdString + " -- Panel padding");

                //retrieve the margin option: a value defined on the individual panel level overwrites any global level value
                var margin = (panel && panel.margin) || self.options.panelMargin;
                margin = granit.extractFloatUnit(margin, "Q+", /px|em|ex|px|cm|mm|in|pt|pc|ch|rem|vh|vw|vmin/, "px", self.IdString + " -- Panel margin");

                //retrieve the panelClasses option: the result is a string of class names as a combination of both the individual panel- and the global- level options
                var panelClasses = ((self.options.panelClasses && (self.options.panelClasses + " ")) || "") + ((panel && panel.classes) || "");  //all provided classes on global level and individual panel level are concatenated
                panelClasses = granit.uniqueArray(panelClasses.split(" ")).join(" ");     //avoiding duplicate class names
                panelClasses = "granitSplitter_wrapper" + ((panelClasses && (" " + panelClasses)) || "");     //prefix the class string with the required system class

                //retrieve the flexible option: a value defined on the individual panel level overwrites any global level value
                var flexible = (panel && panel.flexible) || self.options.flexible;
                flexible = flexible ? true : false;

                if (index < children.length - 1) {
                    //identify the associated splitter
                    var splitter = self.options.splitter && self.options.splitter[index];

                    //check for invalid options
                    if (splitter && !granit.findAllFromObject(splitter, splitterOptionsAllowed)) {
                        granit.output("invalid splitter array item option property found - check the splitter array item options", self.IdString + " -- self.options.splitter", 'Warning');
                    }

                    //retrieve the separator option: a value defined on the individual splitter level overwrites any global level value
                    var separator = (splitter && (splitter.separator || (granit.findOneInObject("separator", splitter)) ? { } : undefined));
                    if (separator && !granit.findAllFromObject(separator, ['width', 'length', 'classes'])) {
                        granit.output("invalid splitter.separator object property found - check the splitter.separator object", self.IdString + " -- self.options.splitter.separator", 'Warning');
                    }
                    if (self.options.separator && !granit.findAllFromObject(self.options.separator, ['width', 'length', 'classes'])) {
                        granit.output("invalid self.options.separator object property found - check the self.options.separator object", self.IdString + " -- self.options.separator", 'Warning');
                    }
                    if (separator) {
                        separator.width = separator.width || self.options.separator && self.options.separator.width;
                        if (separator.width) { separator.width = granit.extractFloatUnit(separator.width, "Q+", /%|px|em|ex|px|cm|mm|in|pt|pc|ch|rem|vh|vw|vmin/, "px", self.IdString + " -- Splitter separator width (separator.width)"); }
                        separator.length = separator.length || self.options.separator && self.options.separator.length;
                        separator.classes = separator.classes && granit.uniqueArray(splitterClasses.split(" ")).join(" ") || self.options.separator && self.options.separator.classes;
                    }

                    //retrieve the splitterWidth option: a value defined on the individual splitter level overwrites any global level value
                    var splitterWidth = (splitter && splitter.width) || self.options.splitterWidth;
                    splitterWidth = granit.extractFloatUnit(splitterWidth, "Q+", /%|px|em|ex|px|cm|mm|in|pt|pc|ch|rem|vh|vw|vmin/, "px", self.IdString + " -- Splitter width (splitterWidth)");

                    //retrieve the splitterLength option: a value defined on the individual splitter level overwrites any global level value
                    var splitterLength = (splitter && splitter.length) || self.options.splitterLength;  //Any css length value is allowed (including calc() statements). No validation needed here, because this value is directly forwarded into the css style definition.

                    //retrieve the splitterClasses option: the result is a string of class names as a combination of both the individual splitter- and the global- level options
                    var splitterClasses = ((self.options.splitterClasses && (self.options.splitterClasses + " ")) || "") + ((splitter && splitter.classes) || "");  //all provided classes on global level and individual splitter level are concatenated
                    splitterClasses = granit.uniqueArray(splitterClasses.split(" ")).join(" ");     //avoiding duplicate class names
                    //splitterClasses = "granitSplitter_Splitter" + ((splitterClasses && (" " + splitterClasses)) || "");     //prefix the class string with the required system class

                    var finalOptions = {
                        width: separator && separator.width || splitterWidth,
                        length: separator && separator.length || splitterLength,
                        classes: "granitSplitter_Splitter" + (separator && " granit_Separator" || "") + ((separator && separator.classes && (" " + separator.classes) || "") || (splitterClasses && (" " + splitterClasses) || "")),
                        cursor: separator ? "default" : this.cursor
                    }

                    //define the splitter element
                    if (self.options.direction === "vertical") {
                        var splitter = $("<div id='granit-" + splitterId + "-splitter-" + (index + 1) + "' class='" + finalOptions.classes + "' style='width:" + finalOptions.width.getSize() + ";height:" + finalOptions.length + ";cursor:" + finalOptions.cursor + ";'></div>");
                    } else {
                        var splitter = $("<div id='granit-" + splitterId + "-splitter-" + (index + 1) + "' class='" + finalOptions.classes + "' style='width:" + finalOptions.length + ";height:" + finalOptions.width.getSize() + ";cursor:" + finalOptions.cursor + ";'></div>");
                    }
                    splitter.data().__granitData__ = { disabled: separator ? true : false };
                    self.splitterList[index] = splitter;

                    /*
                     * calculate the current total splitter offset as the n'th part of the total splitter width (where n is the amount of panels)
                     */
                    if (splitterWidth.Number > 0) {
                        splitterOffset.add(splitterWidth, "-");
                    }
                }

                var wrappedElement = $(element);

                /*
                 * we wrap the element into a style container that represents layout styles for the panel like padding, margin, border, etc.
                 * this step is skipped if the element itself is a nested splitter (in a layout szenario).
                 * here we have the main reason for the Creation-Splitter-Order Rule in a layout szenario:
                 *      nested inner splitters must be created / instantiated before its parent splitters!
                 *      ... otherwise the logic would not recognize nested splitters and would wrap those elements into style containers
                 *          ... for those elements (nested splitters), any defined styles (border, margin, padding, etc.) would be displayed twice unintentionally
                 */
                if (!wrappedElement.is(":data('granit-splitter')")) {                   //test if the element is a nested splitter
                    wrappedElement.wrap("<div class='" + panelClasses + "'></div>");
                    wrappedElement = wrappedElement.parent();
                    wrappedElement.css("padding", padding.getSize());
                    wrappedElement.css("margin", margin.getSize());

                    //because the margin is not part of the border-box model, we have to subtract it from the overall height
                    if (margin.Number > 0.0) {
                        wrappedElement.css("height", "calc(100% - " + (2 * margin.Number) + margin.Unit + ")");
                    } else {
                        wrappedElement.css("height", "100%");
                    }
                }

                var size = panel && panel.size;
                size = size && granit.extractFloatUnit(size, "Q+", /%|px|em|ex|px|cm|mm|in|pt|pc|ch|rem|vh|vw|vmin/, "%", self.IdString + " -- Panel size (size)");

                if (size && size.Unit !== "%") {
                    var panelDisplayClass = flexible ? "granitSplitter_Panel" : "granitSplitter_Panel granitSplitter_PanelStatic";

                    //present total static size
                    if (size.Number > 0.0) {
                        panelSizeTotalOffset.add(size, "-");
                    }

                    //apply splitter
                    wrappedElement.wrap("<div id='granit-" + splitterId + "-panel-" + (index + 1) + "' class='" + panelDisplayClass + "' style='" + self.sizePropertyName + ":" + size.getSize() + ";" + granit.prefixSizeName(self.sizePropertyName, "min") + ":" + minSize.getSize() + ";" + granit.prefixSizeName(self.sizePropertyName, "max") + ":" + maxSize.getSize() + ";'></div>");

                    wrappedElement.parent().data().__granitData__ = { index: index, flexible: flexible, originalUnit: size.Unit, resizable: resizable };
                    self.panels.splice(index, 0, wrappedElement.parent());

                    self.splitterList[index] && self.splitterList[index].insertAfter(wrappedElement.parent());

                    return true; //leave loop
                }

                /*
                 * for percentage panels flexible is true anyways, the option is ignored
                 * The main reason why I decided not to support unflexible behaviour for percentage panels is the similarity between both modes:
                 * Both modes (unflexible, flexible) are assumed to behave similar according their stretch- and shrink- behaviour.
                 * Obviously there are huge difficulties in converting the value back in percentages after the dragging operation.
                 * So after the mouse-move process I actually leave the size in pixels and let Flebox do the job of establishing the typical stretch- and shrink- behaviour that we would expect to see from percentage sized panels.  
                 */
                flexible = true;

                if (!size) {                    
                    panelsWithoutSizeTotal++;   //count panels with no size
                }

                if (size && size.Unit === "%") {                    
                    panelSizePercentTotal += size.Number;   //update total size of percentage panels
                }

                //remember panels without size or percentage size
                panelsWithoutOrRelativeSize.push({
                    size: size,
                    index: index,
                    flexible: flexible,
                    wrappedElement: wrappedElement,
                    minSize: minSize.getSize(),
                    maxSize: maxSize.getSize(),
                    resizable: resizable
                });
            });

            /*
             * The group of percentage panels are isolated from other unit-sized panels.
             * Their percentage size is always relative to the remaining space of all non-percentage sized panels.
             */

            //the total remaining space 
            var remainingSpace = "(100%" + panelSizeTotalOffset.addAll(splitterOffset, "-").toString() + ")";

            //calculate remaining relative space 
            var panelSizeDistributed = (100.0 - panelSizePercentTotal) / panelsWithoutSizeTotal;
            if (panelSizeDistributed < 0.0) {
                panelSizeDistributed = 0.0;
            }

            //apply left percentage panels
            panelsWithoutOrRelativeSize.forEach(function (item) {
                var proportion = "(" + (item.size ? item.size.Number : panelSizeDistributed) + " / 100)";
                var size = "calc(" + remainingSpace + " * " + proportion + ")";

                var panelDisplayClass = item.flexible ? "granitSplitter_Panel" : "granitSplitter_Panel granitSplitter_PanelStatic";

                //apply splitter
                item.wrappedElement.wrap("<div id='granit-" + splitterId + "-panel-" + (item.index + 1) + "' class='" + panelDisplayClass + "' style='" + self.sizePropertyName + ":" + size + ";" + granit.prefixSizeName(self.sizePropertyName, "min") + ":" + item.minSize + ";" + granit.prefixSizeName(self.sizePropertyName, "max") + ":" + item.maxSize + ";'></div>");

                item.wrappedElement.parent().data().__granitData__ = { index: item.index, flexible: item.flexible, originalUnit: "%", resizable: item.resizable };
                self.panels.splice(item.index, 0, item.wrappedElement.parent());

                self.splitterList[item.index] && self.splitterList[item.index].insertAfter(item.wrappedElement.parent());
            });

            //we attach drag & drop support
            if (
                this.panels.some(function (item, index) {
                    return item.data().__granitData__.resizable;
                })
            ) {
                //... if at least there is one resizable panel
                this.splitterList.forEach(function (item, index) {                    
                    if (!item.data().__granitData__.disabled) {
                        //... and if the associated splitter is enabled
                        self._on(item, {
                            "mousedown": "_splitterMouseDown"
                        });
                    }
                });
            }

            //this.panels.forEach(function (item, index) {
            //    if (item.data().__granitData__.originalUnit === "em") {
            //        item.resize($.proxy(self._elementOnResize, self, item[0])); 
            //        item.fontResize($.proxy(self._elementOnFontResize, self, item[0]));
            //    }
            //});
        },


        _elementOnResize: function (element) {
            var id = this.IdString;
            console.log(id + " Change x: " + element.offsetWidth + ", Change y: " + element.offsetHeight);
        },

        _elementOnFontResize: function (element, size) {
            var id = this.IdString;
            var height = element.offsetHeight;
            console.log(id + " Font-Size B: " + size.fontSize + " Height: " + height);
        },

        /*
         * Author(s):   Thomas Stein, ... <please leave your name>
         * Description: EventHandler of the MouseDown event -- Preparation actions to support the mouse-moving algorithm
         */
        _splitterMouseDown: function (event) {
            if (event.which !== 1) {
                return true;
            }

            event.stopPropagation();
            event.preventDefault();

            var self = this;

            this.movedSplitter = $(event.target);

            //capture the mouse event
            if (event.target.setCapture) {
                event.target.setCapture();
            }

            //create the convertion tool in order to transfer any limit-size css length value into pixel (max-width, min-width, max-height, min-height)
            var pc = new granit.CSSPixelProvider(self.element[0]);

            var offsetSizeName = granit.prefixSizeName(self.sizePropertyName, "offset", true),      //offsetWidth, offsetHeight
                minSieName = granit.prefixSizeName(self.sizePropertyName, "min"),                   //min-width, min-height
                maxSizeName = granit.prefixSizeName(self.sizePropertyName, "max");                  //max-width, max-height

            /*
             * as pixel limit sizes potentially can change dynamically we need to iterate the panels here in order to ...
             * 1. capture current pixel limit sizes to support the mouse-moving process
             * 2. turn off flexible mode as the mouse-moving strictly controls the size on pixel basis
             */
            this.panels.forEach(function (item, index) {
                if (!item.data().__granitData__.resizable) {
                    return false;    //we do not need to prepare non-resizable panels
                }

                var size = item[0][offsetSizeName];

                var minSize = pc.getCSSPixel(item[0], minSieName);
                if (minSize && minSize === "none") {
                    minSize = 0.0;
                }

                var maxSize = pc.getCSSPixel(item[0], maxSizeName);
                if (maxSize && maxSize === "none") {
                    maxSize = self.element[0][offsetSizeName];
                }

                item.css("flex", "none");   //while mouse-moving action, the flexbox shrink- or grow- capability is turned off
                item.css(self.sizePropertyName, size + "px");   //ensure to set the css-size in pixels to support smooth mouse-moving calculation

                //capture the current limit sizes to support mouse-moving calculation 
                item.data().__granitData__.minSize = minSize;     //capture current minimum size
                item.data().__granitData__.maxSize = maxSize;     //capture current maximum size               
            });

            pc.destroy();   //destroy the convertion tool

            if (this.options.direction === "vertical") {
                $("html").css("cursor", "ew-resize");
                this.MouseMovement = event.pageX;
            } else {
                $("html").css("cursor", "ns-resize");
                this.MouseMovement = event.pageY;
            }

            //register events
            this._on($("html"), {
                "mousemove": "_splitterMouseMove"
            });
            this._on($("html"), {
                "mouseup": "_splitterMouseUp",
            });
        },

        /*
         * Author(s):   Thomas Stein, ... <please leave your name>
         * Description: EventHandler of the MouseMove event -- logic to be processes with every mouse move event
         */
        _splitterMouseMove: function (event) {
            event.stopPropagation();
            event.stopImmediatePropagation();
            event.preventDefault();

            var distance;

            if (this.options.direction === "vertical") {
                distance = event.pageX - this.MouseMovement;
                this.MouseMovement = event.pageX;
            } else {
                distance = event.pageY - this.MouseMovement;
                this.MouseMovement = event.pageY;
            }

            this._processPanelMovement(distance);
        },

        /*
         * Author(s):   Thomas Stein, ... <please leave your name>
         * Description: EventHandler of the MouseUp event -- final cleaning-up actions for the drag & drop process
         */
        _splitterMouseUp: function (event) {
            if (this.movedSplitter) {
                event.stopPropagation();
                event.preventDefault();

                //release mouse capture
                if (event.target.releaseCapture) { event.target.releaseCapture(); }

                var self = this;

                // iterating the panels for re-converting
                this.panels.forEach(function (item, index) {
                    item.data().__granitData__.minimized = false;
                    item.data().__granitData__.maximized = false;

                    if (item.data().__granitData__.originalUnit !== "%") {
                        //TODO switch different length units
                    }

                    if (item.data().__granitData__.flexible) {
                        item.css("flex", "auto");   //reset flexbox capabilites
                    }
                });

                //clean up
                $("html").css("cursor", "default");
                this._off($("html"), "mousemove");
                this._off($("html"), "mouseup");
                this.movedSplitter = undefined;
            }
        },


        /*
         * Author(s):   Thomas Stein, ... <please leave your name>
         * Description: last but not least ... the heart of the dragging algorithm
         */
        _processPanelMovement: function (distance) {
            var self = this;
            var result1, result2;

            function test(modus, panel) {
                var newSize, limitSize;

                if (!panel.data().__granitData__.resizable) {
                    return null;
                }
                if (modus === 'grow') {
                    if (panel.data().__granitData__.maximized === true) {
                        return null;
                    }
                    limitSize = panel.data().__granitData__.maxSize;
                }
                if (modus === 'shrink') {
                    if (panel.data().__granitData__.minimized === true) {
                        return null;
                    }
                    limitSize = panel.data().__granitData__.minSize;
                }

                var currentSize = panel[0][granit.prefixSizeName(self.sizePropertyName, "offset", true)];      //offsetWidth, offsetHeight

                if (modus === 'grow') {
                    newSize = Math.min(currentSize + Math.abs(distance), limitSize);
                }
                if (modus === 'shrink') {
                    newSize = Math.max(currentSize - Math.abs(distance), limitSize);
                }
                if (
                    modus === 'grow' && (newSize > currentSize && currentSize < limitSize) ||
                    modus === 'shrink' && (newSize < currentSize && currentSize > limitSize)
                ) {
                    return {
                        panel: panel,
                        currentSize: currentSize,
                        limitSize: limitSize,
                        offset: Math.abs(currentSize - newSize)
                    }
                }
                return null;
            }

            if (distance > 0.0) {
                for (var pointer = this.movedSplitter.prev().data().__granitData__.index; pointer >= 0; pointer--) {
                    result1 = test("grow", this.panels[pointer]);
                    if (result1) {
                        break;
                    }
                }
                if (result1) {
                    for (var pointer = this.movedSplitter.prev().data().__granitData__.index + 1; pointer < this.panels.length; pointer++) {
                        result2 = test("shrink", this.panels[pointer]);
                        if (result2) {
                            break;
                        }
                    }
                }
            }

            if (distance < 0.0) {
                for (var pointer = this.movedSplitter.next().data().__granitData__.index; pointer < this.panels.length; pointer++) {
                    result1 = test("grow", this.panels[pointer]);
                    if (result1) {
                        break;
                    }
                }
                if (result1) {
                    for (var pointer = this.movedSplitter.next().data().__granitData__.index - 1; pointer >= 0; pointer--) {
                        result2 = test("shrink", this.panels[pointer]);
                        if (result2) {
                            break;
                        }
                    }
                }
            }

            if (result1 && result2) {
                var offset = Math.min(result1.offset, result2.offset);
                result1.panel.css(this.sizePropertyName, result1.currentSize + offset + "px");
                if (result1.currentSize + offset >= result1.limitSize) {
                    result1.panel.data().__granitData__.maximized = true;
                }
                result1.panel.data().__granitData__.minimized = false;

                result2.panel.css(this.sizePropertyName, result2.currentSize - offset + "px");
                if (result2.currentSize - offset <= result2.limitSize) {
                    result2.panel.data().__granitData__.minimized = true;
                }
                result2.panel.data().__granitData__.maximized = false;
            }
        },
    });
});
