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
            classes: {
                // "granit_splitter_panel": "granit_panel_default",
                // "granit_splitter": "granit_splitter_state_default",
                // "granit_splitter_hover": "granit_splitter_state_hover",
                // "granit_splitter_active": "granit_splitter_state_active"
                "granit_splitter_panel": "ui-widget-content",
                "granit_splitter": "ui-state-default",
                "granit_splitter_hover": "ui-state-hover",
                "granit_splitter_active": "ui-state-active"
            },
            direction: undefined,
            overflow: "auto",
            panel: [],
            splitter: [],
            panelTemplate: { size: "auto", minSize: 30, maxSize: "none", resizable: true, flexible: true },
            splitterTemplate: { len: "100%", width: "6px", marge: 0, disabled: false },
            reconvert: "all"
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
                'classes', 'disabled', 'create', 'hide', 'show',
                'direction', 'overflow', 'panel', 'splitter',
                'panelTemplate', 'splitterTemplate',
                'reconvert'
            ];

            var panelOptionsAllowed = [
                'index', 'size', 'minSize', 'maxSize', 'resizable', 'flexible', 'class'
            ];

            var splitterOptionsAllowed = [
                'index', 'disabled', 'width', 'len', 'marge', 'class'
            ];

            //check for invalid options
            if (!granit.arrayOperations.compareObjectToArray(this.options, optionsAllowed)) {
                granit.output("invalid options property found - check the options object", this.IdString + " -- options", 'Warning');
            }

            //check for invalid panelTemplate options
            if (self.options.panelTemplate && !granit.arrayOperations.compareObjectToArray(self.options.panelTemplate, panelOptionsAllowed)) {
                granit.output("invalid panel template option property found - check the panel template options", self.IdString + " -- options.panelTemplate", 'Warning');
            }

            //check for invalid splitterTemplate options
            if (self.options.splitterTemplate && !granit.arrayOperations.compareObjectToArray(self.options.splitterTemplate, splitterOptionsAllowed)) {
                granit.output("invalid splitter template option property found - check the splitter template options", self.IdString + " -- options.splitterTemplate", 'Warning');
            }

            if (this.options.panel && !Array.isArray(this.options.panel)) {
                granit.output("the options property panel must be an array - check the options object", this.IdString + " -- options.panel");
            }

            if (this.options.splitter && !Array.isArray(this.options.splitter)) {
                granit.output("the options property splitter must be an array - check the options object", this.IdString + " -- options.splitter");
            }
            
            if (!self.options.direction) {
                if (this.element.hasClass("granit_layout_vertical")) {
                    self.options.direction = "vertical"
                }
                else if (this.element.hasClass("granit_layout_horizontal")) {
                    self.options.direction = "horizontal"
                }
            }

            //validate options.direction
            if (self.options.direction !== "vertical" && self.options.direction !== "horizontal") {
                granit.output("value (" + self.options.direction + ") is invalid -- expected values are 'vertical', 'horizontal'", this.IdString + " -- self.options.direction", 'Warning');
            }

            //validate options.overflow
            if (self.options.overflow !== "auto" && self.options.overflow !== "hidden" && self.options.overflow !== "scroll") {
                granit.output("value (" + self.options.overflow + ") is invalid -- expected values are 'auto', 'hidden', 'scroll'", this.IdString + " -- self.options.overflow", 'Warning');
            }

            var units = ["%", "vmin", "vmax", "rem", "px", "em", "ex", "ch", "cm", "mm", "in", "pt", "pc", "vh", "vw"];     //set of all supported units
            this.unitsRegex = new RegExp(units.join("|"));          //the associated regular expression of all supported units

            self.unconvertibleUnits = [];                           //set of problematic units that cannot be converted into pixel accurately
            var dh = new granit.DeviceHelper();
            //check unit conversion for browsers
            if (dh.isIE()) {
                self.unconvertibleUnits.push("em", "rem");                      //Internet Explorer seems to have problems handling certain units accurately
            }
            if (dh.isEdge()) {
                self.unconvertibleUnits.push("ex", "vh", "vmin", "vmax");       //Edge seems to have problems handling certain units accurately
            }
            
            if (self.options.reconvert === "all") {
                self.options.reconvert = units;
            }
            else if (self.options.reconvert === "default") {
                self.options.reconvert = ["%", "em", "rem", "cm", "in", "pc"];                                           //these is the default minimum set of reconvertible units
            }
            else if (self.options.reconvert === "none") {
                self.options.reconvert === [];
            }
            else {
                if (!granit.arrayOperations.compareArrayToArray(self.options.reconvert, units)) {
                    granit.output("value (" + self.options.reconvert + ") is invalid -- expected values are 'all', 'default', 'none' or some of the following ['%', 'em', 'cm', 'mm', 'in', 'pt', 'pc']", this.IdString + " -- self.options.reconvert", 'Warning');
                }
            }

            if (!this.element.hasClass("granit_layout")) {
                this._addClass("granit_layout");
            }

            if (self.options.direction === "vertical") {
                this.element.removeClass("granit_layout_horizontal");
                if (!this.element.hasClass("granit_layout_vertical")) {
                    this.element.addClass("granit_layout_vertical");
                }
                this.element.css("overflow-x", self.options.overflow);
                this.sizePropertyName = "width";
                this.cursor = "ew-resize";
                this.coordinate = "x";
            } else {
                this.element.removeClass("granit_layout_vertical");
                if (!this.element.hasClass("granit_layout_horizontal")) {
                    this.element.addClass("granit_layout_horizontal");
                }
                this.element.css("overflow-y", self.options.overflow);
                this.sizePropertyName = "height";
                this.cursor = "ns-resize";
                this.coordinate = "y";
            }

            //identify children: only divs or any semantic element are permitted
            var children = this.element.children(
                "div, article, aside, details, figcaption, figure, footer, header, main, mark, nav, section, summary, time"
            );

            if (children.length !== this.element.children("*").length) {
                granit.output("not all panels are divs or semantic elements!", this.IdString + " -- self.children", 'Warning');
            }

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
                var panel = self.options.panel && $.grep(self.options.panel, function(x){ return x.index == index; })[0]  || self.options.panelTemplate;                

                //check for invalid options
                if (panel && !granit.arrayOperations.compareObjectToArray(panel, panelOptionsAllowed)) {
                    granit.output("invalid panel array item option property found - check the panel array item options", self.IdString + " -- options.panel", 'Warning');
                }

                //retrieve the resizable option: a value defined individually on panel level overwrites any panel template value
                var resizable = panel && panel.resizable;
                if (!(panel && granit.IsBooleanType(panel.resizable))) {
                    resizable = self.options.panelTemplate && self.options.panelTemplate.resizable;
                }
                resizable = resizable ? true : false;

                //retrieve the flexible option: a value defined individually on panel level overwrites any panel template value
                var flexible = panel && panel.flexible;
                if (!(panel && granit.IsBooleanType(panel.flexible))) {
                    flexible = self.options.panelTemplate && self.options.panelTemplate.flexible;
                }
                flexible = flexible ? true : false;

                //retrieve the minSize option: a value defined individually on panel level overwrites any panel template value
                var minSize = (panel && panel.minSize) || self.options.panelTemplate && self.options.panelTemplate.minSize;
                minSize = minSize && minSize !== "none" ? granit.extractFloatUnit(minSize, "Q+", self.unitsRegex, "px", self.IdString + " -- Panel minimum size (minSize)") : new granit.NumberUnit("none");

                //retrieve the maxSize option: a value defined individually on panel level overwrites any panel template value
                var maxSize = (panel && panel.maxSize) || self.options.panelTemplate && self.options.panelTemplate.maxSize;
                maxSize = maxSize && maxSize !== "none" ? granit.extractFloatUnit(maxSize, "Q+", self.unitsRegex, "px", self.IdString + " -- Panel maximum size (maxSize)") : new granit.NumberUnit("none");

                if (index < children.length - 1) {
                    //identify the associated splitter
                    var splitter = self.options.splitter && $.grep(self.options.splitter, function(x){ return x.index == index; })[0] || self.options.splitterTemplate;                

                    //check for invalid options
                    if (splitter && !granit.arrayOperations.compareObjectToArray(splitter, splitterOptionsAllowed)) {
                        granit.output("invalid splitter array item option property found - check the splitter array item options", self.IdString + " -- options.splitter", 'Warning');
                    }

                    //retrieve the disabled option: a value defined individually on splitter level overwrites any splitter template value
                    var disabled = splitter && splitter.disabled;
                    if (!(splitter && granit.IsBooleanType(splitter.disabled))) {
                        disabled = self.options.splitterTemplate && self.options.splitterTemplate.disabled;
                    }
                    disabled = disabled ? true : false;

                    //retrieve the splitterWidth option: a value defined individually on splitter level overwrites any template value
                    var splitterWidth = (splitter && splitter.width) || self.options.splitterTemplate && self.options.splitterTemplate.width;
                    splitterWidth = granit.extractFloatUnit(splitterWidth, "Q+", self.unitsRegex, "px", self.IdString + " -- splitter width (splitter.width)");

                    //retrieve the splitterLength option: a value defined individually on splitter level overwrites any template value
                    var splitterLen = (splitter && splitter.len) || self.options.splitterTemplate && self.options.splitterTemplate.len;
                    //Any css length value is allowed (including calc() statements). No validation needed here, because this value is directly forwarded into the css style definition

                    //retrieve the splitterMarge option: a value defined individually on splitter level overwrites any template value
                    var splitterMarge = (splitter && splitter.marge) || self.options.splitterTemplate && self.options.splitterTemplate.marge;
                    //Any single css marginTop, marginBottom, marginLeft, marginRight value is allowed (including calc() statements). No validation needed here, because this value is directly forwarded into the css style definition

                    var cursor = splitter && splitter.disabled ? "default" : self.cursor;
                    
                    var splitterElement = $("<div></div>");

                    //add structural class granit_splitter / any associated theming class defined in the classes option / add associated individual class defined for the current splitter
                    self._addClass(splitterElement, "granit_splitter", splitter.class || self.options.splitterTemplate.class);

                    splitterElement.wrap("<div id='granit-" + splitterId + "-splitter-" + (index + 1) + "' class='granit_splitter_wrapper' style='cursor:" + cursor + ";'></div>");

                    //define the splitter element
                    if (self.options.direction === "vertical") {
                        splitterElement.addClass("granit_splitter_vertical");           //justify ui-themed splitter
                        splitterElement.parent().css("width", splitterWidth.getValue());
                        splitterElement.parent().css("height", splitterLen);
                        splitterElement.css({ marginLeft: splitterMarge, marginRight: splitterMarge });
                    } else {
                        splitterElement.addClass("granit_splitter_horizontal");         //justify ui-themed splitter
                        splitterElement.parent().css("height", splitterWidth.getValue());
                        splitterElement.parent().css("width", splitterLen);
                        splitterElement.css({ marginTop: splitterMarge, marginBottom: splitterMarge });
                    }
                    splitterElement.parent().data().__granitData__ = { disabled: splitter && splitter.disabled };
                    self.splitterList[index] = splitterElement.parent();
                }

                var wrappedElement = $(element);

                /*
                 * we wrap the element into a style container that represents layout styles for the panel like padding, margin, border, etc.
                 * this step is skipped if the element itself is a nested splitter (in a layout szenario), because any defined styles (border, margin, padding, etc.) would be displayed twice unintentionally
                 * test wether the wrapped element is a nested splitter: check if the class starts with "granit_layout"
                 */
                if (!wrappedElement.is("[class^=granit_layout]")) {
                    wrappedElement.wrap("<div></div>");
                    wrappedElement = wrappedElement.parent();

                    //add structural class granit_splitter_panel / any associated theming class defined in the classes option / add associated individual class defined for the current panel                     
                    self._addClass(wrappedElement, "granit_splitter_panel", panel.class || self.options.panelTemplate.class ); 
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
                            //... I decided to set overflow-y = hidden in this case to ensure proper children widths rendering
                            self.element.css("overflow-y", "hidden");
                            //granit.output("Due to a known but unresolved bug in IE11 and older (Issue #1: IE11 Flexbox Column Children width problem) overflow-y is set to hidden for those Flexbox container columns in order to ensure proper width rendering of its verically arranged children panels", self.IdString + " -- options.overflow", 'Warning');
                        }
                    }
                }

                //retrieve the size option: a value defined individually on panel level overwrites any panel template value
                var size = (panel && panel.size) || self.options.panelTemplate && self.options.panelTemplate.size || 1;
                if (size === "auto") { size = 1; }
                size = granit.extractFloatUnit(size, "Q+", self.unitsRegex, null, self.IdString + " -- Panel size (size)");
                size = new granit.Size(size);

                var reconvert = false;
                if (self.options.reconvert.indexOf(size.TargetUnit) > -1 ) {
                    reconvert = true;
                }

                var panelWrapperClass = "granit_panel_wrapper";
                //apply splitter
                wrappedElement.wrap("<div id='granit-" + splitterId + "-panel-" + (index + 1) + "' class='" + panelWrapperClass + "' style='" + granit.prefixSizeName(self.sizePropertyName, "min") + ":" + minSize.getValue() + ";'></div>");

                wrappedElement.parent().data().__granitData__ = { index: index, Size: size, resizable: resizable, minSize: minSize, maxSize: maxSize, reconvert: reconvert };
                self.panels.push(wrappedElement.parent());

                self.splitterList[index] && self.splitterList[index].insertAfter(wrappedElement.parent());
                
                //remove border if splitter has no margin, so vertical and horizontal splitter "merge into one another"
                if (self.splitterList[index] && !parseFloat(getComputedStyle(self.splitterList[index].children(0)[0], null).getPropertyValue("margin"))) {
                    self.splitterList[index].children(0).addClass("granit_splitter_noBorder");               //justify ui-themed splitter
                }

                //flex default values
                var value = size.getValue(),
                    basis = "0px",
                    grow = 0,
                    shrink = 1;

                if (size.TargetUnit) {
                    basis = value;
                    shrink = flexible ? 1 : 0;
                }
                else {
                    //autoSized
                    grow = value;
                    shrink = value;
                }

                wrappedElement.parent().css("flex", grow + " " + shrink + " " + basis);    //set flex size
            });

            //we attach drag & drop support
            if (
                this.panels.some(function (item, index) {
                    return item.data().__granitData__.resizable;
                })
            ) {
                this.splitterList.forEach(function (item, index) {
                    //attach mousedown if the associated splitter is enabled
                    if (!item.data().__granitData__.disabled) {
                        self._on(item, {
                            "mousedown": "_splitterMouseDown"
                        });
                        item.hover(
                            function() {
                                self._toggleClass($(this).children(0), "granit_splitter_hover");
                            }
                        )
                    }
                });
            }

            //this.panels.forEach(function (item, index) {
            //    var unit = item.data().__granitData__.Size.Number.Unit;
            //    if (unit === "em" || unit === "rem") {
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

            this.movedSplitter = $(event.currentTarget);

            $(".granit_splitter_wrapper, .granit_panel_wrapper").not(this.movedSplitter).addClass("granit_suppressMouseEvents");
            this.movedSplitter.addClass("granit_splitter_active");            
            this._addClass(this.movedSplitter.children(0), "granit_splitter_active");   //add granit-splitter-active template

            //capture the mouse event
            if (event.target.setCapture) {
                event.target.setCapture();
            }

            //create the convertion tool in order to transfer any limit-size css length value into pixel (max-width, min-width, max-height, min-height)
            var pc = new granit.PixelConverter(self.element[0]);

            var offsetSizeName = granit.prefixSizeName(self.sizePropertyName, "offset", true),      //offsetWidth, offsetHeight
                minSizeName = granit.prefixSizeName(self.sizePropertyName, "min"),                   //min-width, min-height
                maxSizeName = granit.prefixSizeName(self.sizePropertyName, "max");                  //max-width, max-height

            /*
             * as pixel limit sizes potentially can change dynamically we need to iterate the panels here in order to ...
             * 1. capture current pixel limit sizes to support the mouse-moving process
             * 2. turn off flex mode as the mouse-moving strictly controls the size on pixel basis
             */
            this.panels.forEach(function (item, index) {
                var size;
                if (self.options.direction === "vertical") {
                    size = item.width();
                } else {
                    size = item.height();
                }
                var itemData = item.data().__granitData__;

                if (itemData.resizable) {
                    var minSize = pc.convertToPixel(item[0], minSizeName, false);
                    if (minSize && minSize === "none") {
                        minSize = 0.0;
                    }

                    var maxSize = pc.convertToPixel(item[0], maxSizeName, false);
                    if (maxSize && maxSize === "none") {
                        maxSize = self.element[0][offsetSizeName];
                    }

                    //capture the current limit sizes to support mouse-moving calculation 
                    itemData.minSize = Math.floor(minSize + 1);       //round slightly up to egalize (percent) convertion errors (in firefox and chrome)
                    itemData.maxSize = Math.ceil(maxSize - 1);        //round slightly down to egalize (percent) convertion errors (in firefox and chrome)

                    //remove from FlexBox
                    item.addClass("granit_panel_static");

                    if (!itemData.Size.Pixel || Math.abs(itemData.Size.Pixel - size) >= granit.Threshold) {
                        itemData.Size.Pixel = size;
                    }
                    item.css(self.sizePropertyName, size + "px");
                    itemData.resized = true;        //we set to resized here in order to reconvert all resizable panels properly on MouseUp
                }
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
                "mouseup": "_splitterMouseUp"
            });
        },

        /*
         * Author(s):   Thomas Stein
         * Description: EventHandler of the MouseMove event -- logic to be processes with every mouse move event
         */
        _splitterMouseMove: function (event) {

            if (!this.movedSplitter) { return; }

            event.stopPropagation();
            event.stopImmediatePropagation();
            event.preventDefault();

            this.currentMousePosition = { x: event.pageX, y: event.pageY };

            //throttle or direct call
            this.MousemoveEventController && this.MousemoveEventController.process(this._processPanelMovement) || this._processPanelMovement();
        },

        /*
         * Author(s):   Thomas Stein
         * Description: EventHandler of the MouseUp event -- final cleaning-up actions for the drag & drop process
         */
        _splitterMouseUp: function (event) {
            if (!this.movedSplitter) { return; }

            event.stopPropagation();
            event.preventDefault();

            var self = this;

            //release mouse capture
            if (event.target.releaseCapture) { event.target.releaseCapture(); }

            //clean up
            this.movedSplitter.removeClass("granit_splitter_active");
            this._removeClass(this.movedSplitter.children(0), "granit_splitter_active");  //remove granit-splitter-active template
            $(".granit_splitter_wrapper, .granit_panel_wrapper").removeClass("granit_suppressMouseEvents");

            $("html").css("cursor", "default");

            this._off($("html"), "mousemove");
            this._off($("html"), "mouseup");

            this.MousemoveEventController && this.MousemoveEventController.cancel();
            this.movedSplitter = undefined;

            if (self.panels.some(function (item) {
                return item.data().__granitData__.resized;
            })) {
                var pc = new granit.PixelConverter(self.element[0]);      //offsetWidth, offsetHeight

                // iterating static panels for re-converting
                self.panels.forEach(function (item, index) {
                    var data = item.data().__granitData__;

                    if (data.resized && data.reconvert) {
                        pc.convertFromPixel(data.Size, self.sizePropertyName, false);
                    }
                    
                    var getPixel = false;   //getPixel means "do not convert"
                    if (!data.reconvert || self.unconvertibleUnits.indexOf(data.Size.TargetUnit) > -1) {
                        if (!data.Size.TargetUnit && data.Size.Number.Value !== 1) {
                            //autoSized
                            item.css("flex", "1 1 0px");
                            data.Size.Number.Value = 1;
                        }
                        getPixel = true;
                    }
                    
                    item.css("flex-basis", data.Size.getValue(getPixel));
                });

                pc.destroy();   //destroy the convertion tool
            }

            self.panels.forEach(function (item) {
                self._resetPanelData(item);
            });
        },

        _resetPanelData: function (item) {
            // set back to flex
            item.removeClass("granit_panel_static");

            item.data().__granitData__.minimized = false;
            item.data().__granitData__.maximized = false;
            item.data().__granitData__.resized = false;
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

                var currentSize = panel.data().__granitData__.Size.Pixel;

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
                    };
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
                    for (pointer = this.movedSplitter.prev().data().__granitData__.index + 1; pointer < this.panels.length; pointer++) {
                        result2 = test("shrink", this.panels[pointer]);
                        if (result2) {
                            break;
                        }
                    }
                }
            }

            if (distance < 0.0) {
                for (pointer = this.movedSplitter.next().data().__granitData__.index; pointer < this.panels.length; pointer++) {
                    result1 = test("grow", this.panels[pointer]);
                    if (result1) {
                        break;
                    }
                }
                if (result1) {
                    for (pointer = this.movedSplitter.next().data().__granitData__.index - 1; pointer >= 0; pointer--) {
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
                    result2.panel.data().__granitData__.resized = true;
                    result2.panel.css(self.sizePropertyName, result2.currentSize - offset + "px");

                    result1.panel.data().__granitData__.resized = true;
                    result1.panel.css(self.sizePropertyName, result1.currentSize + offset + "px");

                    result2.panel.data().__granitData__.Size.Pixel = result2.currentSize - offset;
                    result2.panel.data().__granitData__.maximized = false;

                    result1.panel.data().__granitData__.Size.Pixel = result1.currentSize + offset;
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
