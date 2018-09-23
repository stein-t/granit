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
                size: "auto", minSize: 20, maxSize: "none", resizable: true, class: "granit_panel_default"
            },
            splitterTemplate: { width: "2em", length: "100%", class: "granit_splitter_default" },
            separatorTemplate: { width: "1em", length: "100%", class: "granit_separator_default" },
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
                'classes', 'disabled', 'create', 'hide', 'show',
                'direction', 'overflow', 'panel', 'splitter',
                'panelTemplate', 'splitterTemplate', 'separatorTemplate',
                '_throttle'
            ];

            var panelOptionsAllowed = [
                'size', 'minSize', 'maxSize', 'resizable', 'class'
            ];

            var splitterTemplateOptionsAllowed = [
                'width', 'length', 'class'
            ];

            var splitterOptionsAllowed = [
                'display', 'width', 'length', 'class'
            ];

            //check for invalid options
            if (!granit.arrayOperations.compareObjectToArray(this.options, optionsAllowed)) {
                granit.output("invalid options property found - check the options object", this.IdString + " -- options", 'Warning');
            }

            //check for invalid panelTemplate options
            if (self.options.panelTemplate && !granit.arrayOperations.compareObjectToArray(self.options.panelTemplate, panelOptionsAllowed, true)) {
                granit.output("invalid panel template option property found - check the panel template options", self.IdString + " -- options.panelTemplate", 'Warning');
            }

            //check for invalid splitterTemplate options
            if (self.options.splitterTemplate && !granit.arrayOperations.compareObjectToArray(self.options.splitterTemplate, splitterTemplateOptionsAllowed, true)) {
                granit.output("invalid splitter template option property found - check the splitter template options", self.IdString + " -- options.splitterTemplate", 'Warning');
            }

            //check for invalid separatorTemplate options
            if (self.options.separatorTemplate && !granit.arrayOperations.compareObjectToArray(self.options.separatorTemplate, splitterTemplateOptionsAllowed, true)) {
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

            if (!this.element.hasClass("granit-splitter")) {
                this.element.addClass("granit-splitter");
            }

            if (self.options.direction === "vertical") {
                this.element.addClass("granit_container_vertical");
                this.element.css("overflow-x", self.options.overflow);
                this.sizePropertyName = "width";
                this.cursor = "ew-resize";
                this.coordinate = "x";
            } else {
                this.element.addClass("granit_container_horizontal");
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

            //global
            this.panels = [];               //reference to the panels (or final panel wrappers)
            this.splitterList = [];         //reference to the splitters

            //var splitterOffset = granit.NumberUnitArray();          //the total width of splitters under consideration different units 
            //var panelMinSizeTotal = granit.NumberUnitArray();       //the total min sizes of the panels under consideration of different units 

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
                if (panel && !granit.arrayOperations.compareObjectToArray(panel, panelOptionsAllowed)) {
                    granit.output("invalid panel array item option property found - check the panel array item options", self.IdString + " -- options.panel", 'Warning');
                }

                //retrieve the resizable option: a value defined individually on panel level overwrites any panel template value
                var resizable = panel && panel.resizable;
                if (!(panel && granit.IsBooleanType(panel.resizable))) {
                    resizable = resizable || self.options.panelTemplate && self.options.panelTemplate.resizable;
                }
                resizable = resizable ? true : false;

                //retrieve the minSize option: a value defined individually on panel level overwrites any panel template value
                var minSize = (panel && panel.minSize) || self.options.panelTemplate && self.options.panelTemplate.minSize;
                minSize = minSize && minSize !== "none" ? granit.extractFloatUnit(minSize, "Q+", /%|px|em|ex|px|cm|mm|in|pt|pc|ch|rem|vh|vw|vmin|vmax/, "px", self.IdString + " -- Panel minimum size (minSize)") : new granit.NumberUnit("none");

                ////calculate the total min sizes
                //if (minSize.Value !== "none" && minSize.Value > 0) {
                //    panelMinSizeTotal.add(minSize, "-");
                //}

                //retrieve the maxSize option: a value defined individually on panel level overwrites any panel template value
                var maxSize = (panel && panel.maxSize) || self.options.panelTemplate && self.options.panelTemplate.maxSize;
                maxSize = maxSize && maxSize !== "none" ? granit.extractFloatUnit(maxSize, "Q+", /%|px|em|ex|px|cm|mm|in|pt|pc|ch|rem|vh|vw|vmin|vmax/, "px", self.IdString + " -- Panel maximum size (maxSize)") : new granit.NumberUnit("none");

                //retrieve the panelClasses option: the result is a string of class names as a combination of both the individual panel- and the global template- level options
                var panelClasses = ((self.options.panelTemplate && self.options.panelTemplate.class && (" " + self.options.panelTemplate.class)) || "") +
                    ((panel && panel.class && (" " + panel.class)) || "");                                       //all provided classes on template level and individual panel level are concatenated
                panelClasses = granit.arrayOperations.uniqueArray(panelClasses.split(" ")).join(" ");       //avoiding duplicate class names
                panelClasses = "granit_panel" + panelClasses;                       //prefix the class string with the required system class

                if (index < children.length - 1) {
                    //identify the associated splitter
                    var splitter = self.options.splitter && self.options.splitter[index];

                    //check for invalid options
                    if (splitter && !granit.arrayOperations.compareObjectToArray(splitter, splitterOptionsAllowed)) {
                        granit.output("invalid splitter array item option property found - check the splitter array item options", self.IdString + " -- options.splitter", 'Warning');
                    }

                    if (splitter && splitter.display && splitter.display !== "splitter" && splitter.display !== "separator") {
                        granit.output("invalid value '" + self.options.display + "' for the splitter display option", self.IdString + " -- splitter.display", 'Warning');
                    }

                    //retrieve the splitterWidth option: a value defined individually on splitter level overwrites any template value
                    var splitterWidth = (splitter && splitter.width) || (splitter && splitter.display === "separator" ? self.options.separatorTemplate && self.options.separatorTemplate.width : self.options.splitterTemplate && self.options.splitterTemplate.width);
                    splitterWidth = granit.extractFloatUnit(splitterWidth, "Q+", /%|px|em|ex|px|cm|mm|in|pt|pc|ch|rem|vh|vw|vmin|vmax/, "px", self.IdString + " -- splitter width (splitter.width)");

                    //retrieve the splitterLength option: a value defined individually on splitter level overwrites any template value
                    var splitterLength = (splitter && splitter.length) || (splitter && splitter.display === "separator" ? self.options.separatorTemplate && self.options.separatorTemplate.length : self.options.splitterTemplate && self.options.splitterTemplate.length);
                    //Any css length value is allowed (including calc() statements). No validation needed here, because this value is directly forwarded into the css style definition

                    //retrieve the splitterClasses option: the result is a string of class names as a combination of both the individual splitter- and the global template- level options
                    var splitterClasses = (
                        splitter && splitter.display === "separator" ?
                            ((self.options.separatorTemplate && self.options.separatorTemplate.class && (" " + self.options.separatorTemplate.class)) || "") :
                            ((self.options.splitterTemplate && self.options.splitterTemplate.class && (" " + self.options.splitterTemplate.class)) || "")
                    ) +
                        ((splitter && splitter.class && (" " + splitter.class)) || "");                                       //all provided classes on template level and individual panel level are concatenated
                    splitterClasses = granit.arrayOperations.uniqueArray(splitterClasses.split(" ")).join(" ");     //avoiding duplicate class names
                    splitterClasses = "granit_splitter" + splitterClasses;                  //prefix the class string with the required system class

                    var cursor = splitter && splitter.display === "separator" ? "default" : self.cursor;

                    var splitterElement = $("<div id='granit-" + splitterId + "-splitter-" + (index + 1) + "' class='granit_splitter_wrapper' style='cursor:" + cursor + ";'></div>");
                    splitterElement.append("<div class='" + splitterClasses + "'></div>");  //embed the div with custom splitter styles 

                    //define the splitter element
                    if (self.options.direction === "vertical") {
                        splitterElement.css("width", splitterWidth.getSize());
                        splitterElement.css("height", splitterLength);
                    } else {
                        splitterElement.css("height", splitterWidth.getSize());
                        splitterElement.css("width", splitterLength);
                    }
                    splitterElement.data().__granitData__ = { disabled: splitter && splitter.display === "separator" ? true : false };
                    self.splitterList[index] = splitterElement;

                    ////calculate the current total splitter offset
                    //if (splitterWidth.Value > 0) {
                    //    splitterOffset.add(splitterWidth, "-");
                    //}
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
                if (!(wrappedElement.is(":data('granit-splitter')") || wrappedElement.hasClass("granit-splitter"))) {                   //test if the element is a nested splitter
                    wrappedElement.wrap("<div class='" + panelClasses + "'></div>");
                    wrappedElement = wrappedElement.parent();
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
                var size = (panel && panel.size) || self.options.panelTemplate && self.options.panelTemplate.size || 1;
                if (size === "auto") { size = 1; }
                size = granit.extractFloatUnit(size, "Q+", /%|px|em|ex|px|cm|mm|in|pt|pc|ch|rem|vh|vw|vmin|vmax/, null, self.IdString + " -- Panel size (size)");
                size = new granit.Size(size);

                var panelWrapperClass = "granit_panel_wrapper";
                //apply splitter
                wrappedElement.wrap("<div id='granit-" + splitterId + "-panel-" + (index + 1) + "' class='" + panelWrapperClass + "' style='" + granit.prefixSizeName(self.sizePropertyName, "min") + ":" + minSize.getSize() + ";'></div>");

                wrappedElement.parent().data().__granitData__ = { index: index, Size: size, resizable: resizable, minSize: minSize, maxSize: maxSize };
                self.panels.push(wrappedElement.parent());

                self.splitterList[index] && self.splitterList[index].insertAfter(wrappedElement.parent());

                var value = size.getSize();

                if (size.Number.Unit) {
                    wrappedElement.parent().css("flex-basis", value);   //set size
                }
                else {
                    //autoSized
                    wrappedElement.parent().css("flex", value + " " + value + " 0px");    //set fraction
                }
            });

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

            //var pc = new granit.PixelConverter(this.element[0]),
            //    maxSizeName = granit.prefixSizeName(this.sizePropertyName, "max"),      //max-width, max-height
            //    totalMaxSize = "100%" + panelMinSizeTotal.addAll(splitterOffset).toString();

            //this.panels.forEach(function (item) {
            //    var data = item.data().__granitData__,
            //        maxSize = data.maxSize.getSize();

            //    if (data.Size.Number.Unit) {    //if not autoSized                    
            //        var calcMaxSize = totalMaxSize + " + " + (data.minSize.Value * -1) + data.minSize.Unit;       //subtract current min-size
            //        calcMaxSizeTerm = "calc(" + calcMaxSize + ")";

            //        if (maxSize === "none") {
            //            maxSize = calcMaxSizeTerm;
            //        } else {                    
            //            /********************************************************************************
            //             * Actually the css maxSize must be set as the minimum of the calculated max Size and the custom max Size
            //             * css max() & min() functions are beeing announced for CSS Level 4
            //             */
            //            //maxSize = "min(" + maxSize + ", " + calcMaxSize + ")";
            //            //item.css(maxSizeName, max);
            //            /*********************************************************************************/

            //            //we calculate the minimum once at widget creation
            //            var max1 = Math.floor(pc.convertToPixel(item[0], maxSizeName, maxSize) + 1),
            //                max2 = Math.floor(pc.convertToPixel(item[0], maxSizeName, calcMaxSizeTerm) + 1);
            //            if (max1 > max2) {
            //                maxSize = calcMaxSizeTerm;
            //            } else {
            //                /* we enable the panel to shrink, if the custom max size is set */
            //                wrappedElement.parent().css("flex-shrink", 1);
            //            }
            //        }
            //    }
            //    item.css(maxSizeName, maxSize);
            //});

            //pc.destroy();

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
                            "mousedown": "_splitterMouseDown",
                        });
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

                if (!itemData.resizable) {
                    return false;    //we do not need to prepare non-resizable panels
                }

                var minSize = pc.convertToPixel(item[0], minSizeName);
                if (minSize && minSize === "none") {
                    minSize = 0.0;
                }

                var maxSize = pc.convertToPixel(item[0], maxSizeName);
                if (maxSize && maxSize === "none") {
                    maxSize = self.element[0][offsetSizeName];
                }

                //capture the current limit sizes to support mouse-moving calculation 
                itemData.minSize = Math.floor(minSize + 1);       //round slightly up to egalize (percent) convertion errors (in firefox and chrome)
                itemData.maxSize = Math.ceil(maxSize - 1);        //round slightly down to egalize (percent) convertion errors (in firefox and chrome)

                //convert to Pixel
                item.addClass("granit_panel_static");

                if (itemData.resizable) {
                    if (!itemData.Size.Pixel || Math.abs(itemData.Size.Pixel - size) > 0.02) {
                        item.css(self.sizePropertyName, size + "px");

                        itemData.Size.Pixel = size;
                        itemData.resized = true;
                    }
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
                "mouseup": "_splitterMouseUp",
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
            $(".granit_splitter_wrapper, .granit_panel_wrapper").removeClass("granit_suppressMouseEvents");

            $("html").css("cursor", "default");

            this._off($("html"), "mousemove");
            this._off($("html"), "mouseup");

            this.MousemoveEventController && this.MousemoveEventController.cancel();
            this.movedSplitter = undefined;

            if (self.panels.some(function (item) {
                return item.data().__granitData__.resized;
            })) {
                var pc = new granit.PixelConverter(self.element[0]),
                    offsetSizeName = granit.prefixSizeName(self.sizePropertyName, "offset", true);      //offsetWidth, offsetHeight

                // iterating static panels for re-converting
                self.panels.forEach(function (item, index) {
                    var data = item.data().__granitData__;

                    var size = data.Size.Pixel,                             //current size in pixels
                        unit = data.Size.Number.Unit;

                    if (data.resized) {
                        if (unit
                            && (unit === "em" || unit === "rem" || unit === "%")
                        ) {
                            var result = pc.convertFromPixel(size, unit, self.sizePropertyName);
                            data.Size = result;
                            size = result.getSize();

                            //var test = result.getSize();
                            //console.log(test);
                        } else {
                            if (!unit) {
                                //autoSized
                                item.css("flex", "1 1 0px");
                            }
                            size += "px";
                        }
                        item.css("flex-basis", size);
                    }
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
