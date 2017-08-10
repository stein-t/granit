$(function () {
    $.widget("granit.splitter", {
        options: {
            direction: "vertical",
            panel: [],
            panelMinSize: 90,
            panelStyle: "granitSplitter_Panel_Default",
            panelPadding: 5,
            panelMargin: 0,
            splitterWidth: 5,
            splitterLength: "100%",
            splitterStyle: "granitSplitter_Splitter_Default"
        },
        _create: function () {
            self = this;

            var splitterId = self.element[0].getAttribute("id");

            //used to identify splitter in error message
            this.IdString = "ID #" + splitterId;

            //validate options.direction
            if (self.options.direction !== "vertical" && self.options.direction !== "horizontal") {
                self.output("value (" + self.options.direction + ") is invalid -- expected values are 'vertical', 'horizontal'", this.IdString + " -- self.options.direction");
            }

            var minSizePropertyName;
            this.element.addClass("granitSplitter_Container");

            if (self.options.direction === "vertical") {
                this.element.addClass("granitSplitter_Container_vertical");
                this.element.css("overflow-x", "auto");
                this.sizePropertyName = "width";
                minSizePropertyName = "min-width";
            } else {
                this.element.addClass("granitSplitter_Container_horizontal");
                this.element.css("overflow-y", "auto");
                this.sizePropertyName = "height";
                minSizePropertyName = "min-height";
            }

            //identify children
            var children = this.element.children("div");

            if (children.length != this.element.children("*").length) {
                granit.output("not all panels are divs!", this.IdString + " -- self.children");
            }

            var panelsWithoutSize = [];
            var panelSizeTotal = 0.0;

            this.panels = [];
            this.splitterList = [];

            //iterate children
            children.each(function (index, element) {
                //Panel
                var panel = self.options.panel && self.options.panel[index];

                var size = panel && panel.size;
                size = granit.parseFloatUnit(size, "Q+", /%/, self.IdString + " -- Panel size (size)");
                //size = granit.extractFloatUnit(size, "Q+", /%|px|em|ex|px|cm|mm|in|pt|pc|ch|rem|vh|vw|vmin/, "%", self.IdString + " -- Panel size (size)");

                var minSize = (panel && panel.minSize) || self.options.panelMinSize;
                minSize = granit.extractFloatUnit(minSize, "Q+", /%|px|em|ex|px|cm|mm|in|pt|pc|ch|rem|vh|vw|vmin/, "px", self.IdString + " -- Panel minimum size (minSize)");

                var padding = (panel && panel.padding) || self.options.panelPadding;
                padding = granit.extractFloatUnit(padding, "Q+", /px|em|ex|px|cm|mm|in|pt|pc|ch|rem|vh|vw|vmin/, "px", self.IdString + " -- Panel padding");

                var margin = (panel && panel.margin) || self.options.panelMargin;
                margin = granit.extractFloatUnit(margin, "Q+", /px|em|ex|px|cm|mm|in|pt|pc|ch|rem|vh|vw|vmin/, "px", self.IdString + " -- Panel margin");

                var style = ((self.options.panelStyle && (self.options.panelStyle + " ")) || "") + ((panel && panel.style) || "");
                style = granit.uniqueArray(style.split(" ")).join(" ");
                style = (style && (" " + style)) || "";

                //Splitter
                var splitter = self.options.splitter && self.options.splitter[index];
                var splitterWidth = (index < children.length - 1) && ((splitter && splitter.width) || self.options.splitterWidth) || 0;
                splitterWidth = granit.extractFloatUnit(splitterWidth, "Q+", /%|px|em|ex|px|cm|mm|in|pt|pc|ch|rem|vh|vw|vmin/, "px", self.IdString + " -- Splitter width (splitterWidth)");

                var splitterLength = (splitter && splitter.length) || self.options.splitterLength;

                var splitterStyle = ((self.options.splitterStyle && (self.options.splitterStyle + " ")) || "") + ((splitter && splitter.style) || "");
                splitterStyle = granit.uniqueArray(splitterStyle.split(" ")).join(" ");
                splitterStyle = (splitterStyle && (" " + splitterStyle)) || "";

                //Splitter Offset
                var precedingSplitter = self.splitterList[index - 1];
                var precedingSplitterWidth = precedingSplitter && precedingSplitter.data("granitWidth") || { number: 0, unit: "px" };
                var splitterOffset = (precedingSplitterWidth.number / 2.0) + precedingSplitterWidth.unit + " - " + (splitterWidth.number / 2.0) + splitterWidth.unit;

                if (index < children.length - 1) {
                    if (self.options.direction === "vertical") {
                        var splitter = $("<div id='stein-" + splitterId + "-" + (index) + "' class='granitSplitter_Splitter" + splitterStyle + "' style='width:" + splitterWidth.getSize() + ";height:" + splitterLength + ";cursor:ew-resize;'></div>");
                    } else {
                        var splitter = $("<div id='stein-" + splitterId + "-" + (index) + "' class='granitSplitter_Splitter" + splitterStyle + "' style='width:" + splitterLength + ";height:" + splitterWidth.getSize() + ";cursor:ns-resize;'></div>");
                    }
                    splitter.data().granitSplitterWidth = splitterWidth;
                    self.splitterList[index] = splitter;
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

                if (!size) {
                    //remember panels without size
                    panelsWithoutSize.push({
                        index: index,
                        wrappedElement: wrappedElement,
                        minSize: minSize.getSize(),
                        splitterOffset: splitterOffset
                    });
                    return true; //leave loop
                }

                //calculate total panel size
                panelSizeTotal += size;

                //apply splitter
                wrappedElement.wrap("<div id='" + splitterId + "-panel-" + (index + 1) + "'class='granitSplitter_Panel' style='" + self.sizePropertyName + ":calc(" + size + "% - " + splitterOffset + ");" + minSizePropertyName + ":" + minSize.getSize() + ";'></div>");

                wrappedElement.parent().data({ granitIndex: index, granitSize: size });
                self.panels.splice(index, 0, wrappedElement.parent());

                self.splitterList[index] && self.splitterList[index].insertAfter(wrappedElement.parent());
            });

            var panelSizeDistributed = (100.0 - panelSizeTotal) / panelsWithoutSize.length;
            if (panelSizeDistributed < 0.0) {
                panelSizeDistributed = 0.0;
            }

            /*
             * Iterate panels without sizes specified in order to fill the remaining space equally.
             */
            panelsWithoutSize.forEach(function (item) {
                var size = panelSizeDistributed;

                //apply splitter
                item.wrappedElement.wrap("<div id='" + splitterId + "-panel-" + (item.index + 1) + "'class='granitSplitter_Panel' style='" + self.sizePropertyName + ":calc(" + size + "% - " + item.splitterOffset + ");" + minSizePropertyName + ":" + item.minSize + ";'></div>");

                item.wrappedElement.parent().data({ granitIndex: item.index, granitSize: item.size });
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

                var size;

                this.panels.forEach(function (item, index) {
                    if (self.options.direction === "vertical") {
                        size = item.width();
                    } else {
                        size = item.height();
                    }
                    item.data().granitIsminmized = false;
                    //var sizeRelative = size / self.sizeTotal * 100.0;
                    //item.css(sizePropertyName, sizeRelative + "%");
                    item.removeClass("granitSplitter_PanelStatic");
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

            var size, minSize;

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
                item.data().granitMinSize = minSize.number;
                item.addClass("granitSplitter_PanelStatic");
                item.css(self.sizePropertyName, size + "px");
            });

            //var splitterSizeTotal = this.splitterList.reduce(function (total, item) {
            //    if (self.options.direction === "vertical") {
            //        return total + item.width();
            //    } else {
            //        return total + item.height();
            //    }
            //}, 0.0);

            if (this.options.direction === "vertical") {
                $("html").css("cursor", "ew-resize");
                this.MouseMovement = event.pageX;
            } else {
                $("html").css("cursor", "ns-resize");
                this.MouseMovement = event.pageY;
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
