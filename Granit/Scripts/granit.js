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
            panelMinSize: 90,
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
                'direction', 'panel', 'panelMinSize', 'panelStyle', 'panelPadding', 'splitter',
                'panelMargin', 'splitterWidth', 'splitterLength', 'splitterStyle', 'overflow', 'display'
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
                'display', 'size', 'minSize', 'style', 'padding', 'margin'
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

            var minSizePropertyName;
            this.element.addClass("granitSplitter_Container");

            if (self.options.direction === "vertical") {
                this.element.addClass("granitSplitter_Container_vertical");
                this.element.css("overflow-x", self.options.overflow);
                this.sizePropertyName = "width";
                minSizePropertyName = "min-width";
            } else {
                this.element.addClass("granitSplitter_Container_horizontal");
                this.element.css("overflow-y", self.options.overflow);
                this.sizePropertyName = "height";
                minSizePropertyName = "min-height";
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

                var minSize = (panel && panel.minSize) || self.options.panelMinSize;
                minSize = granit.extractFloatUnit(minSize, "Q+", /%|px|em|ex|px|cm|mm|in|pt|pc|ch|rem|vh|vw|vmin/, "px", self.IdString + " -- Panel minimum size (minSize)");

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

                if (size) {
                    size = granit.extractFloatUnit(size, "Q+", /%|px|em|ex|px|cm|mm|in|pt|pc|ch|rem|vh|vw|vmin/, "%", self.IdString + " -- Panel size (size)");

                    if (size.unit === "%") {
                        flexable = display === "static" ? false : true;
                        panelSizePercentTotal += size.number;
                    } else {
                        flexable = display === "flex" ? true : false;
                        var panelClass = flexable ? "granitSplitter_Panel" : "granitSplitter_Panel granitSplitter_PanelStatic";

                        //present total static size
                        if (size.number > 0) {
                            panelSizeTotalOffset = panelSizeTotalOffset.concat((" - " + size.getSize()));
                        }

                        //apply splitter
                        wrappedElement.wrap("<div id='" + splitterId + "-panel-" + (index + 1) + "'class='" + panelClass + "' style='" + self.sizePropertyName + ":" + size.getSize() + ";" + minSizePropertyName + ":" + minSize.getSize() + ";'></div>");

                        wrappedElement.parent().data({ granitIndex: index, granitFlexable: flexable, granitOriginalUnit: size.unit });
                        self.panels.splice(index, 0, wrappedElement.parent());

                        self.splitterList[index] && self.splitterList[index].insertAfter(wrappedElement.parent());

                        return true; //leave loop
                    }
                } else {
                    //count panels with no size
                    panelsWithoutSizeTotal++;
                }

                //remember panels without size or relative size (percent)
                panelsWithoutOrRelativeSize.push({
                    size: size,
                    index: index,
                    flexable: flexable,
                    wrappedElement: wrappedElement,
                    minSize: minSize.getSize(),
                    splitterOffset: splitterOffset
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
                item.wrappedElement.wrap("<div id='" + splitterId + "-panel-" + (item.index + 1) + "'class='" + panelClass + "' style='" + self.sizePropertyName + ":" + size + ";" + minSizePropertyName + ":" + item.minSize + ";'></div>");

                item.wrappedElement.parent().data({ granitIndex: item.index, granitFlexable: item.flexable, granitOriginalUnit: "%" });
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
                    var sizeRelative = (size + self.SplitterOffset) / self.splitterAreaSize * 100.0;
                    if (item.data().granitOriginalUnit === "%") {
                        item.css(sizePropertyName, "calc(" + sizeRelative + "% - " + self.SplitterOffset + "px)");
                    }

                    item.data().granitFlexable && item.css("flex", "auto");
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

            var size, minSize, minSizeTotal = 0.0;;

            this.panels.forEach(function (item, index) {
                if (self.options.direction === "vertical") {
                    size = item.width();
                    minSize = granit.extractFloatUnit(getComputedStyle(item[0]).minWidth, "Q+", /px|%/, "px", self.IdString + " -- _splitterMouseDown: retrieving min-width");
                    if (minSize.unit === "%") {
                        minSize = { number: minSize.number * $(self.element).width() / 100.0, unit: "px" };
                    }
                } else {
                    size = item.height();
                    minSize = granit.extractFloatUnit(getComputedStyle(item[0]).minHeight, "Q+", /px|%/, "px", self.IdString + " -- _splitterMouseDown: retrieving min-height");
                    if (minSize.unit === "%") {
                        minSize = { number: minSize.number * $(self.element).height() / 100.0, unit: "px" };
                    }
                }
                minSizeTotal += minSize.number;
                item.data().granitMinSize = minSize.number;
                item.data().granitFlexable && item.css("flex", "none");
                item.css(self.sizePropertyName, size + "px");
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

            if (this.options.direction === "vertical") {
                $("html").css("cursor", "ew-resize");
                this.MouseMovement = event.pageX;
                this.splitterAreaSize = Math.max($(this.element).width(), minSizeTotal);
            } else {
                $("html").css("cursor", "ns-resize");
                this.MouseMovement = event.pageY;
                this.splitterAreaSize = Math.max($(this.element).height(), minSizeTotal);
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
            var origin, offset;

            function process(panel) {
                if (panel.data().granitIsminmized === true) {
                    return null;
                }
                var minSize = panel.data().granitMinSize,
                    currentSize, newSize;
                if (self.options.direction === "vertical") {
                    currentSize = panel.width();
                } else {
                    currentSize = panel.height();
                }
                newSize = Math.max(currentSize - Math.abs(distance), minSize);
                if (newSize < currentSize && currentSize > minSize) {
                    panel.css(self.sizePropertyName, newSize + "px");
                    if (newSize <= minSize) {
                        panel.data().granitIsminmized = true;
                    }
                    return currentSize - newSize;   //offset
                }
                return null;
            }

            if (distance > 0.0) {
                origin = this.movedSplitter.prev();

                for (var pointer = origin.data().granitIndex + 1; pointer < this.panels.length; pointer++) {
                    offset = process(this.panels[pointer]);
                    if (offset) {
                        break;
                    }
                }
            }

            if (distance < 0.0) {
                origin = this.movedSplitter.next();

                for (var pointer = origin.data().granitIndex - 1; pointer >= 0; pointer--) {
                    offset = process(this.panels[pointer]);
                    if (offset) {
                        break;
                    }
                }
            }

            if (offset) {
                var currentSize;

                if (this.options.direction === "vertical") {
                    currentSize = origin.width();
                } else {
                    currentSize = origin.height();
                }

                origin.css(this.sizePropertyName, currentSize + offset + "px");
                origin.data().granitIsminmized = false;
            }
        },
    });
});
