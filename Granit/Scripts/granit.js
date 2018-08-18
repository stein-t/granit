/*
 * Copyright (c) 2017 Stein
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 *
 * Contributor(s): Thomas Stein
 * Description:    Granit jQuery-ui widget control for creating a splitter layout with Flexbox
 * License:        MPL 2.0
 */

$(function () {
    $.widget("granit.splitter", {
        options: {
            direction: "vertical",
            overflow: "auto",
            panel: [],
            splitter: [],
            panelTemplate: {
                size: "auto", minSize: 5, maxSize: "none", padding: 0, margin: 0, flexible: true, resizable: true, classes: "granit_Panel_Default"
            },
            splitterTemplate: { width: "0.5em", length: "100%", classes: "granit_Splitter_Default" },
            separatorTemplate: { width: "0.5em", length: "100%", classes: "granit_Separator_Default" },
            relativeSizeBasedOnRemainingSpace: false,    //The group of percentage panels may be isolated from other unit-sized panels. Their relative (percentage) size is always relative to the remaining space of all non-percentage sized panels
            _throttle: 10       //the keywords 'none', 'raf' or a positive integer number
        },
        /*
         * Author(s):   Thomas Stein
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
                'direction', 'overflow', 'flexible', 'panel', 'splitter',
                'panelTemplate', 'splitterTemplate', 'separatorTemplate',
                'relativeSizeBasedOnRemainingSpace', '_throttle'
            ];

            var panelOptionsAllowed = [
                'size', 'minSize', 'maxSize', 'padding', 'margin', 'flexible', 'resizable', 'classes'
            ];

            var splitterTemplateOptionsAllowed = [
                'width', 'length', 'classes'
            ];

            var splitterOptionsAllowed = [
                'display', 'width', 'length', 'classes'
            ];

            //check for invalid options
            if (!granit.listCompare.objectToArray(this.options, optionsAllowed)) {
                granit.output("invalid options property found - check the options object", this.IdString + " -- options", 'Warning');
            }

            //check for invalid panelTemplate options
            if (self.options.panelTemplate && !granit.listCompare.objectToArray(self.options.panelTemplate, panelOptionsAllowed, true)) {
                granit.output("invalid panel template option property found - check the panel template options", self.IdString + " -- options.panelTemplate", 'Warning');
            }

            //check for invalid splitterTemplate options
            if (self.options.splitterTemplate && !granit.listCompare.objectToArray(self.options.splitterTemplate, splitterTemplateOptionsAllowed, true)) {
                granit.output("invalid splitter template option property found - check the splitter template options", self.IdString + " -- options.splitterTemplate", 'Warning');
            }

            //check for invalid separatorTemplate options
            if (self.options.separatorTemplate && !granit.listCompare.objectToArray(self.options.separatorTemplate, splitterTemplateOptionsAllowed, true)) {
                granit.output("invalid separator template option property found - check the separator template options", self.IdString + " -- options.separatorTemplate", 'Warning');
            }

            if (this.options.panel && !Array.isArray(this.options.panel)) {
                granit.output("the options property panel must be an array - check the options object", this.IdString + " -- options.panel");
            }

            if (this.options.splitter && !Array.isArray(this.options.splitter)) {
                granit.output("the options property splitter must be an array - check the options object", this.IdString + " -- options.splitter");
            }

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
                this.coordinate = "x";
            } else {
                this.element.addClass("granitSplitter_Container_horizontal");
                this.element.css("overflow-y", self.options.overflow);
                this.sizePropertyName = "height";
                this.cursor = "ns-resize";
                this.coordinate = "y";
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
                if (panel && !granit.listCompare.objectToArray(panel, panelOptionsAllowed)) {
                    granit.output("invalid panel array item option property found - check the panel array item options", self.IdString + " -- options.panel", 'Warning');
                }

                //retrieve the resizable option: a value defined individually on panel level overwrites any panel template value
                var resizable = (panel && panel.resizable) || self.options.panelTemplate && self.options.panelTemplate.resizable;
                resizable = resizable ? true : false;

                //retrieve the minSize option: a value defined individually on panel level overwrites any panel template value
                var minSize = (panel && panel.minSize) || self.options.panelTemplate && self.options.panelTemplate.minSize;
                minSize = minSize && minSize !== "none" ? granit.extractFloatUnit(minSize, "Q+", /%|px|em|ex|px|cm|mm|in|pt|pc|ch|rem|vh|vw|vmin/, "px", self.IdString + " -- Panel minimum size (minSize)") : new granit.NumberUnit("none");

                //retrieve the maxSize option: a value defined individually on panel level overwrites any panel template value
                var maxSize = (panel && panel.maxSize) || self.options.panelTemplate && self.options.panelTemplate.maxSize;
                maxSize = maxSize && maxSize !== "none" ? granit.extractFloatUnit(maxSize, "Q+", /%|px|em|ex|px|cm|mm|in|pt|pc|ch|rem|vh|vw|vmin/, "px", self.IdString + " -- Panel maximum size (maxSize)") : new granit.NumberUnit("none");

                //retrieve the padding option: a value defined individually on panel level overwrites any panel template value
                var padding = (panel && panel.padding) || self.options.panelTemplate && self.options.panelTemplate.padding;
                padding = granit.extractFloatUnit(padding, "Q+", /px|em|ex|px|cm|mm|in|pt|pc|ch|rem|vh|vw|vmin/, "px", self.IdString + " -- Panel padding");

                //retrieve the margin option: a value defined individually on panel level overwrites any panel template value
                var margin = (panel && panel.margin) || self.options.panelTemplate && self.options.panelTemplate.margin;
                margin = granit.extractFloatUnit(margin, "Q+", /px|em|ex|px|cm|mm|in|pt|pc|ch|rem|vh|vw|vmin/, "px", self.IdString + " -- Panel margin");

                //retrieve the panelClasses option: the result is a string of class names as a combination of both the individual panel- and the global template- level options
                var panelClasses = ((self.options.panelTemplate && self.options.panelTemplate.classes && (" " + self.options.panelTemplate.classes)) || "") +
                    ((panel && panel.classes && (" " + panel.classes)) || "");                                       //all provided classes on template level and individual panel level are concatenated
                panelClasses = granit.uniqueArray(panelClasses.split(" ")).join(" ");       //avoiding duplicate class names
                panelClasses = "granit_Panel_wrapper" + panelClasses;                       //prefix the class string with the required system class

                //retrieve the flexible option: a value defined individually on panel level overwrites any panel template value
                var flexible = (panel && panel.flexible) || self.options.panelTemplate && self.options.panelTemplate.flexible;
                flexible = flexible ? true : false;

                if (index < children.length - 1) {
                    //identify the associated splitter
                    var splitter = self.options.splitter && self.options.splitter[index];

                    //check for invalid options
                    if (splitter && !granit.listCompare.objectToArray(splitter, splitterOptionsAllowed)) {
                        granit.output("invalid splitter array item option property found - check the splitter array item options", self.IdString + " -- options.splitter", 'Warning');
                    }

                    if (splitter && splitter.display && splitter.display !== "splitter" && splitter.display !== "separator") {
                        granit.output("invalid value '" + self.options.display + "' for the splitter display option", self.IdString + " -- splitter.display", 'Warning');
                    }

                    //retrieve the splitterWidth option: a value defined individually on splitter level overwrites any template value
                    var splitterWidth = (splitter && splitter.width) || (splitter && splitter.display === "separator" ? self.options.separatorTemplate && self.options.separatorTemplate.width : self.options.splitterTemplate && self.options.splitterTemplate.width); 
                    splitterWidth = granit.extractFloatUnit(splitterWidth, "Q+", /%|px|em|ex|px|cm|mm|in|pt|pc|ch|rem|vh|vw|vmin/, "px", self.IdString + " -- splitter width (splitter.width)");

                    //retrieve the splitterLength option: a value defined individually on splitter level overwrites any template value
                    var splitterLength = (splitter && splitter.length) || (splitter && splitter.display === "separator" ? self.options.separatorTemplate && self.options.separatorTemplate.length : self.options.splitterTemplate && self.options.splitterTemplate.length); 
                    //Any css length value is allowed (including calc() statements). No validation needed here, because this value is directly forwarded into the css style definition

                    //retrieve the splitterClasses option: the result is a string of class names as a combination of both the individual splitter- and the global template- level options
                    var splitterClasses = (
                                            splitter && splitter.display === "separator" ?
                                            ((self.options.separatorTemplate && self.options.separatorTemplate.classes && (" " + self.options.separatorTemplate.classes)) || "") :
                                            ((self.options.splitterTemplate && self.options.splitterTemplate.classes && (" " + self.options.splitterTemplate.classes)) || "")
                                        ) +
                                        ((splitter && splitter.classes && (" " + splitter.classes)) || "");                                       //all provided classes on template level and individual panel level are concatenated
                    splitterClasses = granit.uniqueArray(splitterClasses.split(" ")).join(" ");     //avoiding duplicate class names
                    splitterClasses = "granitSplitter_Splitter" + splitterClasses;                  //prefix the class string with the required system class

                    var cursor = splitter && splitter.display === "separator" ? "default" : self.cursor;

                    var splitterElement;
                    //define the splitter element
                    if (self.options.direction === "vertical") {
                        splitterElement = $("<div id='granit-" + splitterId + "-splitter-" + (index + 1) + "' class='" + splitterClasses + "' style='width:" + splitterWidth.getSize() + ";height:" + splitterLength + ";cursor:" + cursor + ";'></div>");
                    } else {
                        splitterElement = $("<div id='granit-" + splitterId + "-splitter-" + (index + 1) + "' class='" + splitterClasses + "' style='width:" + splitterLength + ";height:" + splitterWidth.getSize() + ";cursor:" + cursor + ";'></div>");
                    }
                    splitterElement.data().__granitData__ = { disabled: splitter && splitter.display === "separator" ? true : false };
                    self.splitterList[index] = splitterElement;

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
                } else {
                    /* 
                     * --> see Issue #1: IE11 Flexbox Column Children width problem 
                     * https://github.com/stein-t/granit/issues/1
                     * There is a known bug in IE11 (and older):
                     * ... when there is a vertical panel overflow inside a horizontal splitter container panel (the addition of the vertically arranged children panels height overflows overall vertical splitter space),
                     * ... when overflow = auto
                     * ... when children panels width = 100% (default)
                     * --> the vertical scrollbar appears for the panel container, but the width 100% of its children panels is ignored
                     */
                    if (
                        self.options.direction === "horizontal" &&
                        self.element.css("overflow-y") === "auto"
                    ) {
                        var dh = new granit.DeviceHelper();
                        //check for IE browsers (excluding Edge)
                        if (dh.isIE()) {
                            //... I (stein-t) decided to set overflow-y = hidden in this case to ensure proper children widths rendering
                            self.element.css("overflow-y", "hidden");
                            granit.output("Due to a known but unresolved bug in IE11 and older (Issue #1: IE11 Flexbox Column Children width problem) overflow-y is set to hidden for those Flexbox container columns in order to ensure proper width rendering of its verically arranged children panels", self.IdString + " -- options.overflow", 'Warning');
                        }
                    }
                }

                //retrieve the size option: a value defined individually on panel level overwrites any panel template value
                var size = (panel && panel.size) || self.options.panelTemplate && self.options.panelTemplate.size || "auto";
                if (size !== "auto") {
                    size = granit.extractFloatUnit(size, "Q+", /%|px|em|ex|px|cm|mm|in|pt|pc|ch|rem|vh|vw|vmin/, "%", self.IdString + " -- Panel size (size)");
                }

                if (size !== "auto" && (!self.options.relativeSizeBasedOnRemainingSpace || size.Unit !== "%")) {
                    var panelDisplayClass = "granit_Panel" + (flexible ? "" : " granit_Panel_Static");

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

                if (size === "auto") {                    
                    panelsWithoutSizeTotal++;   //count panels with no size
                }
                else if (size.Unit === "%") {                    
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

            if (panelsWithoutOrRelativeSize.length > 0) {
                //the total remaining space 
                var remainingSpace = "(100%" + panelSizeTotalOffset.addAll(splitterOffset, "-").toString() + ")";

                //calculate remaining relative space 
                var panelSizeDistributed = (100.0 - panelSizePercentTotal) / panelsWithoutSizeTotal;
                if (panelSizeDistributed < 0.0) {
                    panelSizeDistributed = 0.0;
                }

                //apply left percentage panels
                panelsWithoutOrRelativeSize.forEach(function (item) {
                    var proportion = "(" + (item.size !== "auto" ? item.size.Number : panelSizeDistributed) + " / 100)";
                    var size = "calc(" + remainingSpace + " * " + proportion + ")";

                    var panelDisplayClass = "granit_Panel" + (item.flexible ? "" : " granit_Panel_Static");

                    //apply splitter
                    item.wrappedElement.wrap("<div id='granit-" + splitterId + "-panel-" + (item.index + 1) + "' class='" + panelDisplayClass + "' style='" + self.sizePropertyName + ":" + size + ";" + granit.prefixSizeName(self.sizePropertyName, "min") + ":" + item.minSize + ";" + granit.prefixSizeName(self.sizePropertyName, "max") + ":" + item.maxSize + ";'></div>");

                    item.wrappedElement.parent().data().__granitData__ = { index: item.index, flexible: item.flexible, originalUnit: "%", resizable: item.resizable };
                    self.panels.splice(item.index, 0, item.wrappedElement.parent());

                    self.splitterList[item.index] && self.splitterList[item.index].insertAfter(item.wrappedElement.parent());
                });
            }

            //throttle mouse move events
            this.options._throttle = this.options._throttle || 10;
            if (this.options._throttle !== "none") {
                var throttle = {};
                if (this.options._throttle === "raf") {
                    throttle.modus = "raf";
                    throttle.threshold = 20;        //threshold to be taken for the native throttle process if requestAnimationFrame does not exist
                } else {
                    throttle.modus = "throttle";
                    throttle.threshold = parseInt(this.options._throttle);
                    if (!throttle.threshold || throttle.threshold <= 0) {
                        granit.output("throttle threshold value '" + this.options._throttle + "' is invalid. Allowed are the terms 'none', 'raf' or a positive integer number", this.IdString + " -- options._throttle");
                    }
                }
                this.MousemoveEventController = new granit.EventTimeController(throttle.modus, this, throttle.threshold);
            }

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
         * Author(s):   Thomas Stein
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
                minSizeName = granit.prefixSizeName(self.sizePropertyName, "min"),                   //min-width, min-height
                maxSizeName = granit.prefixSizeName(self.sizePropertyName, "max");                  //max-width, max-height

            /*
             * as pixel limit sizes potentially can change dynamically we need to iterate the panels here in order to ...
             * 1. capture current pixel limit sizes to support the mouse-moving process
             * 2. turn off flexible mode as the mouse-moving strictly controls the size on pixel basis
             */
            this.panels.forEach(function (item, index) {
                var size;
                if (self.options.direction === "vertical") {
                    size = item.width();
                } else {
                    size = item.height();
                }

                if (!item.hasClass("granit_Panel_Static")) {
                    item.addClass("granit_Panel_Static");
                }

                item.css(self.sizePropertyName, size + "px");

                if (!item.data().__granitData__.resizable) {
                    return false;    //we do not need to prepare non-resizable panels
                }

                var minSize = pc.getCSSPixel(item[0], minSizeName);
                if (minSize && minSize === "none") {
                    minSize = 0.0;
                }

                var maxSize = pc.getCSSPixel(item[0], maxSizeName);
                if (maxSize && maxSize === "none") {
                    maxSize = self.element[0][offsetSizeName];
                }

                //capture the current limit sizes to support mouse-moving calculation 
                item.data().__granitData__.minSize = minSize;     //capture current minimum size
                item.data().__granitData__.maxSize = maxSize;     //capture current maximum size   
                item.data().__granitData__.size = size;
            });

            pc.destroy();   //destroy the convertion tool

            if (this.options.direction === "vertical") {
                $("html").css("cursor", "ew-resize");
                this.movedSplitter.data().__granitData__.position = event.pageX;
            } else {
                $("html").css("cursor", "ns-resize");
                this.movedSplitter.data().__granitData__.position = event.pageY;
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
         * Author(s):   Thomas Stein
         * Description: EventHandler of the MouseMove event -- logic to be processes with every mouse move event
         */
        _splitterMouseMove: function (event) {
            event.stopPropagation();
            event.stopImmediatePropagation();
            event.preventDefault();

            if (!this.movedSplitter) { return; }

            this.currentMousePosition = { x: event.pageX, y: event.pageY };

            //throttle or direct call
            this.MousemoveEventController && this.MousemoveEventController.process(this._processPanelMovement) || this._processPanelMovement();
        },

        /*
         * Author(s):   Thomas Stein
         * Description: EventHandler of the MouseUp event -- final cleaning-up actions for the drag & drop process
         */
        _splitterMouseUp: function (event) {
            if (this.movedSplitter) {
                event.stopPropagation();
                event.preventDefault();

                var self = this;

                //release mouse capture
                if (event.target.releaseCapture) { event.target.releaseCapture(); }

                //create the convertion tool in order to transfer any panel length pixel values into the associated original units
                var pc = new granit.PixelConverter(self.element[0]),
                    size, originalUnit;

                // iterating the panels for re-converting
                this.panels.forEach(function (item, index) {
                    item.data().__granitData__.minimized = false;
                    item.data().__granitData__.maximized = false;

                    //reconvert to original unit
                    size = item.data().__granitData__.size;                     //current size in pixels
                    originalUnit = item.data().__granitData__.originalUnit;     //current original unit
                    var originalSize = pc.convertFromPixel(size, originalUnit, self.sizePropertyName);

                    if (originalUnit === "em" || originalUnit === "rem") {
                        item.css(self.sizePropertyName, originalSize);
                    }

                    if (item.data().__granitData__.originalUnit !== "%") {
                        //TODO switch different length units
                    }
                });

                pc.destroy();   //destroy the convertion tool

                // set back to flexible
                this.panels.forEach(function (item, index) {
                    if (item.data().__granitData__.flexible) {
                        item.removeClass("granit_Panel_Static");
                    }
                });

                //clean up
                $("html").css("cursor", "default");
                this._off($("html"), "mousemove");
                this._off($("html"), "mouseup");

                this.MousemoveEventController && this.MousemoveEventController.cancel();
                this.movedSplitter = undefined;
            }
        },

        /*
         * Author(s):   Thomas Stein
         * Description: last but not least ... the heart of the dragging algorithm
         */
        _processPanelMovement: function () {
            if (!this.movedSplitter) { return; }

            var self = this;
            var result1, result2;

            var distance = this.currentMousePosition[this.coordinate] - this.movedSplitter.data().__granitData__.position;
            this.movedSplitter.data().__granitData__.position = this.currentMousePosition[this.coordinate];

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

                var currentSize = panel.data().__granitData__.size;

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

                if (offset >= 1.0) {
                    result2.panel.css(self.sizePropertyName, result2.currentSize - offset + "px");
                    result1.panel.css(self.sizePropertyName, result1.currentSize + offset + "px");

                    result2.panel.data().__granitData__.size = result2.currentSize - offset;
                    result2.panel.data().__granitData__.maximized = false;

                    result1.panel.data().__granitData__.size = result1.currentSize + offset;
                    result1.panel.data().__granitData__.minimized = false;
                }

                if (result2.currentSize - offset <= result2.limitSize) {
                    result2.panel.data().__granitData__.minimized = true;
                }

                if (result1.currentSize + offset >= result1.limitSize) {
                    result1.panel.data().__granitData__.maximized = true;
                }
            }
        }
    });
});
