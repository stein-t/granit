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
            panelMinSize: "none",
            panelMaxSize: "none",
            panelStyle: "granitSplitter_Panel_Default",
            panelPadding: 0,
            panelMargin: 0,
            splitterWidth: 5,
            splitterLength: "100%",
            splitterStyle: "granitSplitter_Splitter_Default",
            overflow: "auto",
            display: "auto"
        },
        _create: function () {
            self = this;

            var splitterId = self.element[0].getAttribute("id");

            //used to identify splitter in error message
            this.IdString = "ID #" + splitterId;

            var optionsAllowed = [
                'classes', 'disabled', 'create', 'hide', 'show',    //base widget properties
                'direction', 'panel', 'panelMinSize', 'panelMaxSize', 'panelStyle', 'panelPadding', 'splitter',
                'panelMargin', 'splitterWidth', 'splitterLength', 'splitterStyle', 'overflow', 'display', 'panelResizable'
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
                'display', 'size', 'minSize', 'maxSize', 'style', 'padding', 'margin', 'resizable'
            ];

            var splitterOptionsAllowed = [
                'width', 'length', 'style'
            ];

            //validate options.direction
            if (self.options.direction !== "vertical" && self.options.direction !== "horizontal") {
                granit.output("value (" + self.options.direction + ") is invalid -- expected values are 'vertical', 'horizontal'", this.IdString + " -- self.options.direction");
            }

            //validate options.overflow
            if (self.options.overflow !== "auto" && self.options.overflow !== "hidden" && self.options.overflow !== "scroll") {
                granit.output("value (" + self.options.overflow + ") is invalid -- expected values are 'auto', 'hidden', 'scroll'", this.IdString + " -- self.options.overflow");
            }

            var minSizePropertyName, maxSizePropertyName;
            this.element.addClass("granitSplitter_Container");

            if (self.options.direction === "vertical") {
                this.element.addClass("granitSplitter_Container_vertical");
                this.element.css("overflow-x", self.options.overflow);
                this.sizePropertyName = "width";
                minSizePropertyName = "min-width";
                maxSizePropertyName = "max-width";
            } else {
                this.element.addClass("granitSplitter_Container_horizontal");
                this.element.css("overflow-y", self.options.overflow);
                this.sizePropertyName = "height";
                minSizePropertyName = "min-height";
                maxSizePropertyName = "max-height";
            }

            //identify children: only divs or any semantic element are permitted
            var children = this.element.children(
                "div, article, aside, details, figcaption, figure, footer, header, main, mark, nav, section, summary, time"
            );

            if (children.length != this.element.children("*").length) {
                granit.output("not all panels are divs or semantic elements!", this.IdString + " -- self.children");
            }

            this.panels = [];
            this.splitterList = [];

            var panelsWithoutOrRelativeSize = [];
            var splitterOffset = "";
            var panelSizeTotalOffset = "", panelSizePercentTotal = 0.0;
            var panelsWithoutSizeTotal = 0;

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
                var resizable = panel && panel.resizable;
                if (typeof resizable === 'undefined') {
                    resizable = self.options.panelResizable;
                }
                if (jQuery.type(resizable) !== "boolean") {
                    granit.output("value (" + resizable + ") invalid", self.IdString + " -- Panel resizable");
                }

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

                //retrieve the style option: the result is a string of class names as a combination of both the individual panel- and the global- level options
                var style = ((self.options.panelStyle && (self.options.panelStyle + " ")) || "") + ((panel && panel.style) || "");  //all provided styles (class names) on global level and individual panel level are concatenated
                style = granit.uniqueArray(style.split(" ")).join(" ");     //avoiding duplicate styles (class names) definitions
                style = (style && (" " + style)) || "";     //prefix the class string for further operations

                //retrieve the display option: a value defined on the individual panel level overwrites any global level value
                var display = (panel && panel.display) || self.options.display;
                if (display !== "auto" && display !== "flex" && display !== "static") {
                    self.output("value (" + display + ") is invalid -- expected values are 'flex', 'static', 'auto'", self.IdString + " -- panel option.display");
                }

                if (index < children.length - 1) {
                    //identify the associated splitter
                    var splitter = self.options.splitter && self.options.splitter[index];

                    //check for invalid options
                    if (splitter && !granit.findAllFromObject(splitter, splitterOptionsAllowed)) {
                        granit.output("invalid splitter array item option property found - check the splitter array item options", self.IdString + " -- self.options.splitter", 'Warning');
                    }

                    //retrieve the splitterWidth option: a value defined on the individual splitter level overwrites any global level value
                    var splitterWidth = (splitter && splitter.width) || self.options.splitterWidth;
                    splitterWidth = granit.extractFloatUnit(splitterWidth, "Q+", /%|px|em|ex|px|cm|mm|in|pt|pc|ch|rem|vh|vw|vmin/, "px", self.IdString + " -- Splitter width (splitterWidth)");

                    //retrieve the splitterLength option: a value defined on the individual splitter level overwrites any global level value
                    var splitterLength = (splitter && splitter.length) || self.options.splitterLength;  //Any css length value is allowed (including calc() statements). No validation needed here, because this value is directly forwarded into the css style definition.

                    //retrieve the splitterStyle option: the result is a string of class names as a combination of both the individual splitter- and the global- level options
                    var splitterStyle = ((self.options.splitterStyle && (self.options.splitterStyle + " ")) || "") + ((splitter && splitter.style) || "");  //all provided styles (class names) on global level and individual splitter level are concatenated
                    splitterStyle = granit.uniqueArray(splitterStyle.split(" ")).join(" ");     //avoiding duplicate styles (class names) definitions
                    splitterStyle = (splitterStyle && (" " + splitterStyle)) || "";     //prefix the class string for further operations

                    //define the splitter element
                    if (self.options.direction === "vertical") {
                        var splitter = $("<div id='stein-" + splitterId + "-" + (index) + "' class='granitSplitter_Splitter" + splitterStyle + "' style='width:" + splitterWidth.getSize() + ";height:" + splitterLength + ";cursor:ew-resize;'></div>");
                    } else {
                        var splitter = $("<div id='stein-" + splitterId + "-" + (index) + "' class='granitSplitter_Splitter" + splitterStyle + "' style='width:" + splitterLength + ";height:" + splitterWidth.getSize() + ";cursor:ns-resize;'></div>");
                    }
                    self.splitterList[index] = splitter;

                    /*
                     * calculate the current total splitter offset as the n'th part of the total splitter width (where n is the amount of panels)
                     */
                    if (splitterWidth.Number > 0) {
                        splitterOffset = splitterOffset.concat((" - " + (splitterWidth.Number / children.length) + splitterWidth.Unit));
                    }
                }

                var wrappedElement = $(element);

                /*
                 * we wrap the element into a style container that represents layout styles for the panel like padding, margin, border, etc.
                 * this step is skipped if the element itself is a nested splitter (in a layout szenario).
                 * here we have the main reason for the creation-splitter-order rule in a layout szenario:
                 *      nested inner splitters must be created / instantiated before its parent splitters!
                 *      ... otherwise the logic would not recognize nested splitters and would wrap those elements into style containers
                 *          ... for those elements (nested splitters), any defined styles (border, margin, padding, etc.) would be displayed twice unintentionally
                 */
                if (!wrappedElement.hasClass("granitSplitter_Container")) {
                    wrappedElement.wrap("<div class='granitSplitter_wrapper" + style + "'></div>");
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

                /*
                 * boolean variable that specifies if the panel has Flexbox capabilites according to responsive shrinking and growing.
                 * the value depends on the display configuration option and the size unit (% versus other units) of the associated panel.
                 */
                var flexable;

                var size = panel && panel.size;
                size = size && granit.extractFloatUnit(size, "Q+", /%|px|em|ex|px|cm|mm|in|pt|pc|ch|rem|vh|vw|vmin/, "%", self.IdString + " -- Panel size (size)");

                if (size && size.Unit !== "%") {
                    flexable = display === "flex" ? true : false;
                    var panelClass = flexable ? "granitSplitter_Panel" : "granitSplitter_Panel granitSplitter_PanelStatic";

                    //present total static size
                    if (size.Number > 0) {
                        panelSizeTotalOffset = panelSizeTotalOffset.concat((" - " + size.getSize()));
                    }

                    //apply splitter
                    wrappedElement.wrap("<div id='" + splitterId + "-panel-" + (index + 1) + "'class='" + panelClass + "' style='" + self.sizePropertyName + ":" + size.getSize() + ";" + minSizePropertyName + ":" + minSize.getSize() + ";" + maxSizePropertyName + ":" + maxSize.getSize() + ";'></div>");

                    wrappedElement.parent().data({ granitIndex: index, granitFlexable: flexable, granitOriginalUnit: size.Unit, granitResizable: resizable });
                    self.panels.splice(index, 0, wrappedElement.parent());

                    self.splitterList[index] && self.splitterList[index].insertAfter(wrappedElement.parent());

                    return true; //leave loop
                }

                flexable = display === "static" ? false : true;

                if (!size) {
                    //count panels with no size
                    panelsWithoutSizeTotal++;
                }

                if (size && size.Unit === "%") {
                    //size amount of all percentage panels
                    panelSizePercentTotal += size.Number;
                }

                //remember panels without size or percentage size
                panelsWithoutOrRelativeSize.push({
                    size: size,
                    index: index,
                    flexable: true,
                    wrappedElement: wrappedElement,
                    minSize: minSize.getSize(),
                    maxSize: maxSize.getSize(),
                    splitterOffset: splitterOffset,
                    resizable: resizable
                });
            });

            //calculate remaining relative space 
            var panelSizeDistributed = (100.0 - panelSizePercentTotal) / panelsWithoutSizeTotal;
            if (panelSizeDistributed < 0.0) {
                panelSizeDistributed = 0.0;
            }

            //apply left panels
            panelsWithoutOrRelativeSize.forEach(function (item) {
                var size = item.size && ("calc(" + item.size.getSize() + splitterOffset + ")") || ("calc(" + panelSizeDistributed + "%" + panelSizeTotalOffset + splitterOffset + ")");

                var panelClass = item.flexable ? "granitSplitter_Panel" : "granitSplitter_Panel granitSplitter_PanelStatic";

                //apply splitter
                item.wrappedElement.wrap("<div id='" + splitterId + "-panel-" + (item.index + 1) + "'class='" + panelClass + "' style='" + self.sizePropertyName + ":" + size + ";" + minSizePropertyName + ":" + item.minSize + ";" + maxSizePropertyName + ":" + item.maxSize + ";'></div>");

                item.wrappedElement.parent().data({ granitIndex: item.index, granitFlexable: item.flexable, granitOriginalUnit: "%", granitResizable: item.resizable });
                self.panels.splice(item.index, 0, item.wrappedElement.parent());

                self.splitterList[item.index] && self.splitterList[item.index].insertAfter(item.wrappedElement.parent());
            });

            //attach drag & drop support
            this.splitterList.forEach(function (item, index) {
                self._on(item, {
                    "mousedown": "_splitterMouseDown"
                });
            });
        },

        /*
         * final cleaning-up actions for the drag & drop process
         */
        _splitterMouseUp: function (event) {
            if (this.movedSplitter) {
                event.stopPropagation();
                event.preventDefault();

                //release mouse capture
                if (event.target.releaseCapture) { event.target.releaseCapture(); }

                var self = this;

                var size, sizePropertyName;

                // iterating the panels for re-setting and re-converting
                this.panels.forEach(function (item, index) {                    
                    item.data().granitIsminmized = false;
                    item.data().granitIsmaximized = false;

                    if (item.data().granitFlexable) {
                        item.css("flex", "auto");   //reset flexbox capabilites
                    }

                    /*
                     * re-convert the pixel-length into its original percent unit.
                     * Otherwise the lenght would stay in pixels and the layout rendering behaviour of this panel (on resizing parent containers) unintentionally may change.
                     */
                    if (item.data().granitOriginalUnit === "%") {
                        if (self.options.direction === "vertical") {
                            size = item.width();
                            sizePropertyName = "width";
                        } else {
                            size = item.height();
                            sizePropertyName = "height";
                        }
                        //the total splitter witdh is divided equally among the percentage panels
                        var sizeRelative = (size + self.SplitterOffset) / self.splitterAreaSize * 100.0;
                        //... this is why we encode the percentage length as a css-calc statement
                        item.css(sizePropertyName, "calc(" + sizeRelative + "% - " + self.SplitterOffset + "px)");
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
         * Preparation actions to support the mouse-moving algorithm
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

            //these variables support the correction of full splitter-container size calculation (re-converting the pixel sizes into percentage)
            var minSizeTotal = 0.0, maxSizeTotal = 0.0;

            /*
             * as pixel limit sizes potentially can change dynamically we need to iterate the panels here in order to ...
             * 1. capture current pixel limit sizes to support the mouse-moving process
             * 2. retrieve the total amount of current pixel limit sizes, for re-converting the pixel sizes into percentage length properly after the mouse-moving process (on mouseup)
             */
            this.panels.forEach(function (item, index) {
                var size, minSize, maxSize;
                if (self.options.direction === "vertical") {
                    size = item.width();
                    var minWidth = getComputedStyle(item[0]).minWidth,
                        maxWidth = getComputedStyle(item[0]).maxWidth;

                    if (minWidth !== "none") {
                        minSize = granit.extractFloatUnit(minWidth, "Q+", /px|%/, "px", self.IdString + " -- _splitterMouseDown: retrieving min-width");
                        if (minSize.Unit === "%") {
                            minSize.Number = minSize.Number * $(self.element).width() / 100.0; minSize.Unit = "px";   //convert to pixel
                        }
                    } else {
                        minSize = new granit.NumberUnit(0.0);
                    }
                    if (maxWidth !== "none") {
                        maxSize = granit.extractFloatUnit(maxWidth, "Q+", /px|%/, "px", self.IdString + " -- _splitterMouseDown: retrieving max-width");
                        if (maxSize.Unit === "%") {
                            maxSize.Number = maxSize.Number * $(self.element).width() / 100.0; maxSize.Unit = "px";   //convert to pixel
                        }
                    } else {
                        maxSize = new granit.NumberUnit($(self.element).width());
                    }
                } else {
                    size = item.height();
                    var minHeight = getComputedStyle(item[0]).minHeight,
                        maxHeight = getComputedStyle(item[0]).maxHeight;

                    if (minHeight !== "none") {
                        minSize = granit.extractFloatUnit(minHeight, "Q+", /px|%/, "px", self.IdString + " -- _splitterMouseDown: retrieving min-height");
                        if (minSize.Unit === "%") {
                            minSize.Number = minSize.Number * $(self.element).height() / 100.0; minSize.Unit = "px";   //convert to pixel
                        }
                    } else {
                        minSize = new granit.NumberUnit(0.0);
                    }
                    if (maxHeight !== "none") {
                        maxSize = granit.extractFloatUnit(maxHeight, "Q+", /px|%/, "px", self.IdString + " -- _splitterMouseDown: retrieving max-height");
                        if (maxSize.Unit === "%") {
                            maxSize.Number = maxSize.Number * $(self.element).height() / 100.0; maxSize.Unit = "px";   //convert to pixel
                        }
                    } else {
                        maxSize = new granit.NumberUnit($(self.element).height());
                    }
                }

                item.css(self.sizePropertyName, size + "px");   //ensure to set the css-size in pixels to support smooth mouse-moving calculation
                item.css("flex", "none");   //while mouse-moving action, the flexbox shrink- or grow- capability is turned off

                //capture the current limit sizes to support mouse-moving calculation 
                item.data().granitMinSize = minSize.Number;     //capture current minimum size
                item.data().granitMaxSize = maxSize.Number;     //capture current maximum size

                if (!item.data().granitFlexable) {
                    minSize.Number = Math.max(size, minSize.Number);      //the minimum size is overwritten by the current size if the display is configured as static
                }
                minSizeTotal += minSize.Number;
                maxSizeTotal += maxSize.Number;
            });

            //as the pixel splitter width potentially can change dynamically we calulate the total splitter width in pixels here
            var splitterWidthTotal = this.splitterList.reduce(function (total, item) {
                var size;
                if (self.options.direction === "vertical") {
                    size = item.width();
                } else {
                    size = item.height();
                }
                return total + size;
            }, 0.0);

            //calculating the offset as the n'th part of the total splitter width (where n is the amount of panels)
            self.SplitterOffset = splitterWidthTotal / this.panels.length;

            /*
             * adding the total splitter width to the minimum limit sizes
             * This way we get the exact static total minimum or maximum sizes in order to correct the full splitter container area size if it is overflowed or unfilled by its panel children 
             */
            minSizeTotal += splitterWidthTotal;
            maxSizeTotal += splitterWidthTotal;

            if (this.options.direction === "vertical") {
                $("html").css("cursor", "ew-resize");
                this.MouseMovement = event.pageX;

                //retrive the splitter container area size with consideration of the static total minimum or maximum panel limit sizes if the container is overflowed or unfilled
                this.splitterAreaSize = Math.max(Math.min($(this.element).width(), maxSizeTotal), minSizeTotal);
            } else {
                $("html").css("cursor", "ns-resize");
                this.MouseMovement = event.pageY;

                //retrive the splitter container area size with consideration of the static total minimum or maximum panel limit sizes if the container is overflowed or unfilled
                this.splitterAreaSize = Math.max(Math.min($(this.element).height(), maxSizeTotal), minSizeTotal);
            }

            //register events
            this._on($("html"), {
                "mousemove": "_splitterMouseMove"
            });
            this._on($("html"), {
                "mouseup": "_splitterMouseUp",
            });
        },

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

        _processPanelMovement: function (distance) {
            var self = this;
            var result1, result2;

            function test(modus, panel) {
                var currentSize, newSize, limitSize;
                if (!panel.data().granitResizable) {
                    return null;
                }
                if (modus === 'grow') {
                    if (panel.data().granitIsmaximized === true) {
                        return null;
                    }
                    limitSize = panel.data().granitMaxSize;
                }
                if (modus === 'shrink') {
                    if (panel.data().granitIsminmized === true) {
                        return null;
                    }
                    limitSize = panel.data().granitMinSize;
                }
                if (self.options.direction === "vertical") {
                    currentSize = panel.width();
                } else {
                    currentSize = panel.height();
                }
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
                for (var pointer = this.movedSplitter.prev().data().granitIndex; pointer >= 0; pointer--) {
                    result1 = test("grow", this.panels[pointer]);
                    if (result1) {
                        break;
                    }
                }
                if (result1) {
                    for (var pointer = this.movedSplitter.prev().data().granitIndex + 1; pointer < this.panels.length; pointer++) {
                        result2 = test("shrink", this.panels[pointer]);
                        if (result2) {
                            break;
                        }
                    }
                }
            }

            if (distance < 0.0) {
                for (var pointer = this.movedSplitter.next().data().granitIndex; pointer < this.panels.length; pointer++) {
                    result1 = test("grow", this.panels[pointer]);
                    if (result1) {
                        break;
                    }
                }
                if (result1) {
                    for (var pointer = this.movedSplitter.next().data().granitIndex - 1; pointer >= 0; pointer--) {
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
                    result1.panel.data().granitIsmaximized = true;
                }
                result1.panel.data().granitIsminmized = false;

                result2.panel.css(this.sizePropertyName, result2.currentSize - offset + "px");
                if (result2.currentSize - offset <= result2.limitSize) {
                    result2.panel.data().granitIsminmized = true;
                }
                result2.panel.data().granitIsmaximized = false;
            }
        },
    });
});
