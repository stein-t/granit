/*
 * Copyright (c) 2017 Stein
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

$(function () {
    $.widget("granit.splitter", {
        options: {
            direction: "vertical",
            panel: [],
            splitter: [],
            panelResizable: true,
            panelMinSize: 90,
            //panelMaxSize: 180,
            panelStyle: "granitSplitter_Panel_Default",
            panelPadding: 5,
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

            //identify children
            var children = this.element.children("div");

            if (children.length != this.element.children("*").length) {
                granit.output("not all panels are divs!", this.IdString + " -- self.children");
            }

            this.panels = [];
            this.splitterList = [];

            var panelsWithoutOrRelativeSize = [];
            var splitterOffset = "";
            var panelSizeTotalOffset = "", panelSizePercentTotal = 0.0;
            var panelsWithoutSizeTotal = 0;

            //iterate children
            children.each(function (index, element) {
                //Panel
                var panel = self.options.panel && self.options.panel[index];

                if (panel && !granit.findAllFromObject(panel, panelOptionsAllowed)) {
                    granit.output("invalid panel array item option property found - check the panel array item options", self.IdString + " -- self.options.panel", 'Warning');
                }

                var resizable = panel && panel.resizable;
                if (typeof resizable === 'undefined') {
                    resizable = self.options.panelResizable;
                }
                if (jQuery.type(resizable) !== "boolean") {
                    granit.output("value (" + resizable + ") invalid", self.IdString + " -- Panel resizable");
                }

                var minSize = (panel && panel.minSize) || self.options.panelMinSize;
                minSize = minSize ? granit.extractFloatUnit(minSize, "Q+", /%|px|em|ex|px|cm|mm|in|pt|pc|ch|rem|vh|vw|vmin/, "px", self.IdString + " -- Panel minimum size (minSize)") : { number: "none", getSize: function () { return this.number; } };

                var maxSize = (panel && panel.maxSize) || self.options.panelMaxSize;
                maxSize = maxSize ? granit.extractFloatUnit(maxSize, "Q+", /%|px|em|ex|px|cm|mm|in|pt|pc|ch|rem|vh|vw|vmin/, "px", self.IdString + " -- Panel maximum size (maxSize)") : { number: "none", getSize: function () { return this.number; } };

                var padding = (panel && panel.padding) || self.options.panelPadding;
                padding = granit.extractFloatUnit(padding, "Q+", /px|em|ex|px|cm|mm|in|pt|pc|ch|rem|vh|vw|vmin/, "px", self.IdString + " -- Panel padding");

                var margin = (panel && panel.margin) || self.options.panelMargin;
                margin = granit.extractFloatUnit(margin, "Q+", /px|em|ex|px|cm|mm|in|pt|pc|ch|rem|vh|vw|vmin/, "px", self.IdString + " -- Panel margin");

                var style = ((self.options.panelStyle && (self.options.panelStyle + " ")) || "") + ((panel && panel.style) || "");
                style = granit.uniqueArray(style.split(" ")).join(" ");
                style = (style && (" " + style)) || "";

                var display = (panel && panel.display) || self.options.display;
                if (display !== "auto" && display !== "flex" && display !== "static") {
                    self.output("value (" + display + ") is invalid -- expected values are 'flex', 'static', 'auto'", self.IdString + " -- panel option.display");
                }
                var flexable;

                //Splitter
                if (index < children.length - 1) {
                    var splitter = self.options.splitter && self.options.splitter[index];

                    if (splitter && !granit.findAllFromObject(splitter, splitterOptionsAllowed)) {
                        granit.output("invalid splitter array item option property found - check the splitter array item options", self.IdString + " -- self.options.splitter", 'Warning');
                    }

                    var splitterWidth = (splitter && splitter.width) || self.options.splitterWidth;
                    splitterWidth = granit.extractFloatUnit(splitterWidth, "Q+", /%|px|em|ex|px|cm|mm|in|pt|pc|ch|rem|vh|vw|vmin/, "px", self.IdString + " -- Splitter width (splitterWidth)");

                    var splitterLength = (splitter && splitter.length) || self.options.splitterLength;

                    var splitterStyle = ((self.options.splitterStyle && (self.options.splitterStyle + " ")) || "") + ((splitter && splitter.style) || "");
                    splitterStyle = granit.uniqueArray(splitterStyle.split(" ")).join(" ");
                    splitterStyle = (splitterStyle && (" " + splitterStyle)) || "";

                    if (self.options.direction === "vertical") {
                        var splitter = $("<div id='stein-" + splitterId + "-" + (index) + "' class='granitSplitter_Splitter" + splitterStyle + "' style='width:" + splitterWidth.getSize() + ";height:" + splitterLength + ";cursor:ew-resize;'></div>");
                    } else {
                        var splitter = $("<div id='stein-" + splitterId + "-" + (index) + "' class='granitSplitter_Splitter" + splitterStyle + "' style='width:" + splitterLength + ";height:" + splitterWidth.getSize() + ";cursor:ns-resize;'></div>");
                    }
                    self.splitterList[index] = splitter;

                    //splitter offset
                    if (splitterWidth.number > 0) {
                        splitterOffset = splitterOffset.concat((" - " + (splitterWidth.number / children.length) + splitterWidth.unit));
                    }
                }

                var wrappedElement = $(element);

                if (!wrappedElement.hasClass("granitSplitter_Container")) {
                    wrappedElement.wrap("<div class='granitSplitter_wrapper" + style + "'></div>");
                    wrappedElement = wrappedElement.parent();
                    wrappedElement.css("padding", padding.getSize());
                    wrappedElement.css("margin", margin.getSize());
                    if (margin.number > 0.0) {
                        wrappedElement.css("height", "calc(100% - " + (2 * margin.number) + margin.unit + ")");
                    } else {
                        wrappedElement.css("height", "100%");
                    }
                }

                var size = panel && panel.size;
                size = size && granit.extractFloatUnit(size, "Q+", /%|px|em|ex|px|cm|mm|in|pt|pc|ch|rem|vh|vw|vmin/, "%", self.IdString + " -- Panel size (size)");

                if (size && size.unit !== "%") {
                    flexable = display === "flex" ? true : false;
                    var panelClass = flexable ? "granitSplitter_Panel" : "granitSplitter_Panel granitSplitter_PanelStatic";

                    //present total static size
                    if (size.number > 0) {
                        panelSizeTotalOffset = panelSizeTotalOffset.concat((" - " + size.getSize()));
                    }

                    //apply splitter
                    wrappedElement.wrap("<div id='" + splitterId + "-panel-" + (index + 1) + "'class='" + panelClass + "' style='" + self.sizePropertyName + ":" + size.getSize() + ";" + minSizePropertyName + ":" + minSize.getSize() + ";" + maxSizePropertyName + ":" + maxSize.getSize() + ";'></div>");

                    wrappedElement.parent().data({ granitIndex: index, granitFlexable: flexable, granitOriginalUnit: size.unit, granitResizable: resizable });
                    self.panels.splice(index, 0, wrappedElement.parent());

                    self.splitterList[index] && self.splitterList[index].insertAfter(wrappedElement.parent());

                    return true; //leave loop
                }

                flexable = display === "static" ? false : true;

                if (!size) {
                    //count panels with no size
                    panelsWithoutSizeTotal++;
                }

                if (size && size.unit === "%") {
                    //size amount of all percentage panels
                    panelSizePercentTotal += size.number;
                }

                //remember panels without size or relative size (percent)
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

        _splitterMouseUp: function (event) {
            if (this.movedSplitter) {
                event.stopPropagation();
                event.preventDefault();

                if (event.target.releaseCapture) { event.target.releaseCapture(); }

                var self = this;

                var size, sizePropertyName;

                this.panels.forEach(function (item, index) {
                    if (self.options.direction === "vertical") {
                        size = item.width();
                        sizePropertyName = "width";
                    } else {
                        size = item.height();
                        sizePropertyName = "height";
                    }
                    item.data().granitIsminmized = false;
                    item.data().granitIsmaximized = false;

                    if (item.data().granitFlexable) {
                        item.css("flex", "auto");
                    }
                    var sizeRelative = (size + self.SplitterOffset) / self.splitterAreaSize * 100.0;
                    if (item.data().granitOriginalUnit === "%") {
                        item.css(sizePropertyName, "calc(" + sizeRelative + "% - " + self.SplitterOffset + "px)");
                    }
                });

                $("html").css("cursor", "default");

                this._off($("html"), "mousemove");
                this._off($("html"), "mouseup");

                this.movedSplitter = undefined;
            }
        },

        _splitterMouseDown: function (event) {
            if (event.which !== 1) {
                return true;
            }

            event.stopPropagation();
            event.preventDefault();

            var self = this;

            if (event.target.setCapture) {
                event.target.setCapture();
            }

            this.movedSplitter = $(event.target);

            var minSizeTotal = 0.0, maxSizeTotal = 0.0;

            this.panels.forEach(function (item, index) {
                var size, minSize, maxSize;
                if (self.options.direction === "vertical") {
                    size = item.width();
                    var minWidth = getComputedStyle(item[0]).minWidth,
                        maxWidth = getComputedStyle(item[0]).maxWidth;

                    if (minWidth !== "none") {
                        minSize = granit.extractFloatUnit(minWidth, "Q+", /px|%/, "px", self.IdString + " -- _splitterMouseDown: retrieving min-width");
                        if (minSize.unit === "%") {
                            minSize = { number: minSize.number * $(self.element).width() / 100.0, unit: "px" };
                        }
                    } else {
                        minSize = { number: 0.0 };
                    }
                    if (maxWidth !== "none") {
                        maxSize = granit.extractFloatUnit(maxWidth, "Q+", /px|%/, "px", self.IdString + " -- _splitterMouseDown: retrieving max-width");
                        if (maxSize.unit === "%") {
                            maxSize = { number: maxSize.number * $(self.element).width() / 100.0, unit: "px" };
                        }
                    } else {
                        maxSize = { number: $(self.element).width() };
                    }
                } else {
                    size = item.height();
                    var minHeight = getComputedStyle(item[0]).minHeight,
                        maxHeight = getComputedStyle(item[0]).maxHeight;

                    if (minHeight !== "none") {
                        minSize = granit.extractFloatUnit(minHeight, "Q+", /px|%/, "px", self.IdString + " -- _splitterMouseDown: retrieving min-height");
                        if (minSize.unit === "%") {
                            minSize = { number: minSize.number * $(self.element).height() / 100.0, unit: "px" };
                        }
                    } else {
                        minSize = { number: 0.0 };
                    }
                    if (maxHeight !== "none") {
                        maxSize = granit.extractFloatUnit(maxHeight, "Q+", /px|%/, "px", self.IdString + " -- _splitterMouseDown: retrieving max-height");
                        if (maxSize.unit === "%") {
                            maxSize = { number: maxSize.number * $(self.element).height() / 100.0, unit: "px" };
                        }
                    } else {
                        maxSize = { number: $(self.element).height() };
                    }
                }
                item.data().granitMinSize = minSize.number;
                item.data().granitMaxSize = maxSize.number;
                item.css(self.sizePropertyName, size + "px");
                item.css("flex", "none");

                if (!item.data().granitFlexable) {
                    minSize.number = size;
                }
                minSizeTotal += minSize.number;
                maxSizeTotal += maxSize.number;
            });

            var splitterWidthTotal = this.splitterList.reduce(function (total, item) {
                var size;
                if (self.options.direction === "vertical") {
                    size = item.width();
                } else {
                    size = item.height();
                }
                return total + size;
            }, 0.0);
            self.SplitterOffset = splitterWidthTotal / this.panels.length;
            minSizeTotal += splitterWidthTotal;
            maxSizeTotal += splitterWidthTotal;

            if (this.options.direction === "vertical") {
                $("html").css("cursor", "ew-resize");
                this.MouseMovement = event.pageX;
                this.splitterAreaSize = Math.max(Math.min($(this.element).width(), maxSizeTotal), minSizeTotal);
            } else {
                $("html").css("cursor", "ns-resize");
                this.MouseMovement = event.pageY;
                this.splitterAreaSize = Math.max(Math.min($(this.element).height(), maxSizeTotal), minSizeTotal);
            }

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
            var origin, result1, result2;

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
                origin = this.movedSplitter.prev();

                for (var pointer = origin.data().granitIndex; pointer >= 0; pointer--) {
                    result1 = test("grow", this.panels[pointer]);
                    if (result1) {
                        break;
                    }
                }

                if (result1) {
                    for (var pointer = origin.data().granitIndex + 1; pointer < this.panels.length; pointer++) {
                        result2 = test("shrink", this.panels[pointer]);
                        if (result2) {
                            break;
                        }
                    }
                }
            }

            if (distance < 0.0) {
                origin = this.movedSplitter.next();

                for (var pointer = origin.data().granitIndex; pointer < this.panels.length; pointer++) {
                    result1 = test("grow", this.panels[pointer]);
                    if (result1) {
                        break;
                    }
                }

                if (result1) {
                    for (var pointer = origin.data().granitIndex - 1; pointer >= 0; pointer--) {
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
