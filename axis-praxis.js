var sanity = {
    maxTables: 100
};
var registeredAxes = {
    wght: "Weight",
    wdth: "Width",
    opsz: "Optical size",
    ital: "Italic",
    slnt: "Slant"
};
var opentypeNameDefs = ["Copyright notice", "Font Family name", "Font Subfamily name", "Unique font identifier", "Full font name", "Version string", "Postscript name", "Trademark", "Manufacturer Name", "Designer", "Description", "URL Vendor", "URL Designer", "License Description", "License Info URL", "Reserved", "Typographic Family name", "Typographic Subfamily name", "Compatible Full (Macintosh only)", "Sample text", "PostScript CID findfont name", "WWS Family Name", "WWS Subfamily Name", "Light Backgound Palette", "Dark Backgound Palette", "Variations PostScript Name Prefix"];
DataView.prototype.getTag = function(p) {
    var tag = "";
    var p_end = p + 4;
    var ch;
    while (p < p_end) {
        ch = this.getUint8(p++);
        if (ch >= 32 && ch < 126)
            tag += String.fromCharCode(ch)
    }
    return tag.length == 4 ? tag : false
}
;
function uint8ToBase64(buffer) {
    var binary = "";
    var len = buffer.byteLength;
    for (var i = 0; i < len; i++) {
        binary += String.fromCharCode(buffer[i])
    }
    return window.btoa(binary)
}
function escapeHtml(text) {
    "use strict";
    return text.replace(/[\"&<>]/g, function(a) {
        return {
            '"': "&quot;",
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;"
        }[a]
    })
}
function getStringFromData(data, p0, length) {
    var str = "";
    var p = p0;
    while (p - p0 < length) {
        str += String.fromCharCode(data.getUint8(p++))
    }
    return str
}
function parseTTXAxesAndInstances(font, ttxdata) {
    var ttx = $.parseXML(ttxdata);
    $(ttx).find("name").children("namerecord[platformID='3'][platEncID='1'][langID='0x409']").each(function() {
        font.names[parseInt($(this).attr("nameID"))] = $(this).text().trim()
    });
    $(ttx).find("name").children("namerecord[platformID='1'][platEncID='0'][langID='0x0']").each(function() {
        if (typeof font.names[parseInt($(this).attr("nameID"))] === "undefined")
            font.names[parseInt($(this).attr("nameID"))] = $(this).text().trim()
    });
    $(ttx).find("name").children("namerecord[platformID='1'][platEncID='10'][langID='0x409']").each(function() {
        if (typeof font.names[parseInt($(this).attr("nameID"))] === "undefined")
            font.names[parseInt($(this).attr("nameID"))] = $(this).text().trim()
    });
    if (!font.menuName) {
        font.menuName = font.names[4];
        if (typeof font.menuName === "undefined")
            font.menuName = font.names[6]
    }
    $(ttx).find("fvar").find("Axis").each(function(index) {
        var nameId = $(this).find("NameID").length ? parseInt($(this).find("NameID").text()) : false;
        var axis = {
            tag: $(this).find("AxisTag").text(),
            min: 1 * $(this).find("MinValue").text(),
            max: 1 * $(this).find("MaxValue").text(),
            default: 1 * $(this).find("DefaultValue").text(),
            name: getAxisName(font, $(this).find("AxisTag").text(), nameId)
        };
        axis.currentVal = axis.default;
        axis.min_Fixed = axis.min * 65536;
        axis.default_Fixed = axis.default * 65536;
        axis.max_Fixed = axis.max * 65536;
        axis.font = font;
        font.axes.push(axis)
    });
    $(ttx).find("fvar").find("NamedInstance").each(function(index) {
        var subfamilyNameID = parseInt($(this).attr("nameID"));
        var instance = {
            font: font,
            subfamilyNameID: subfamilyNameID,
            name: getName(font, subfamilyNameID),
            tuple: [],
            tuple_Fixed: []
        };
        $(this).children("coord").each(function(index2, thisc) {
            var coord = $(thisc).attr("value");
            instance.tuple.push(coord);
            instance.tuple_Fixed.push(coord * 65536)
        });
        font.instances.push(instance)
    });
    checkForErrors(font)
}
function checkForErrors(font) {
    for (var i = 0; i < font.instances.length; i++) {
        var instance = font.instances[i];
        if (instance.tuple.length != font.axes.length)
            font.errors.push("fvar: Instance ‘" + instance.name + "’ has tuple of size (" + instance.tuple.length + ") unequal to font’s axis count (" + font.axes.length + ").");
        for (var a = 0; a < instance.tuple.length; a++)
            if (instance.tuple[a] < font.axes[a].min || instance.tuple[a] > font.axes[a].max)
                font.errors.push("fvar: Instance " + i + " (‘" + instance.name + "’) has value (" + instance.tuple[a] + ") out of range of axis ‘" + font.axes[a].tag + "’ [" + font.axes[a].min + "," + font.axes[a].max + "].");
        if (instance.subfamilyNameID < 256)
            font.errors.push("fvar: Instance ‘" + instance.name + "’ is stored at nameID ‘" + instance.subfamilyNameID + "’ which is less than 256.")
    }
    for (var a = 0; a < font.axes.length; a++) {
        var axis = font.axes[a];
        if (axis.min > axis.default || axis.default > axis.max)
            font.errors.push("fvar: Axis ‘" + axis.tag + "’ tuple has bad min≤default≤max ordering.");
        if (axis.axisNameID < 256)
            font.errors.push("fvar: Axis name ‘" + axis.name + "’ is stored at nameID ‘" + axis.axisNameID + "’ which is less than 256.");
        if (!registeredAxes[axis.tag] && axis.tag != axis.tag.toUpperCase())
            font.errors.push("fvar: Private axis tag ‘" + axis.tag + "’ should be uppercase.");
        if (axis.tag == "wght") {
            if (Math.min(axis.min, axis.default, axis.max) < 1 || Math.max(axis.min, axis.default, axis.max) > 1e3)
                font.errors.push("fvar: ‘wght’ axis [" + axis.min + "," + axis.max + "] out of range [1,1000].")
        }
        if (axis.tag == "ital") {
            if (Math.min(axis.min, axis.default, axis.max) < 0 || Math.max(axis.min, axis.default, axis.max) > 1)
                font.errors.push("fvar: Italic axis ‘" + axis.tag + "’ out of range [0,1].")
        }
    }
    if (!font.tables || !font.tables["STAT"])
        font.errors.push("STAT: table not present.");
    else {
        if (font.tables["STAT"].data.axisValueCount == 0) {
            var countRegisteredAxes = 0;
            for (var a in font.axes)
                if (registeredAxes[font.axes[a].tag])
                    countRegisteredAxes++;
            if (countRegisteredAxes == 0)
                font.warnings.push("STAT: axisValueCount of 0 is worrisome.");
            else
                font.warnings.push("STAT: axisValueCount of 0 is worrisome, especially when there are registered axes.")
        }
        if (font.tables["STAT"].data.majorVersion == 1 && font.tables["STAT"].data.minorVersion == 0)
            font.errors.push("STAT: Use of version 1.0 table is deprecated.");
        else if (font.names[font.tables["STAT"].data.elidedFallbackNameID] === undefined)
            font.errors.push("STAT: elidedFallbackNameID (" + font.tables["STAT"].data.elidedFallbackNameID + ") is not in ‘name’ table")
    }
    if (font.tables && font.tables["MVAR"] !== undefined) {
        if (font.tables["MVAR"].data.valueRecordCount == 0)
            font.warnings.push("MVAR: valueRecordCount is 0.");
        else if ("cghsuvx".indexOf(font.tables["MVAR"].data.firstCharOfValueRecords) == -1)
            font.errors.push("MVAR: unexpected first byte of value tag (possibly itemVariationStore uses 32-bit offset instead of 16-bit).")
    }
}
function newFont(fontReq, overridefont) {
    if (typeof fontReq == "string") {} else if (fontReq instanceof DataView) {
        var font;
        var data = fontReq;
        var table;
        var p = 0;
        font = overridefont ? overridefont : {};
        font.errors = [];
        font.warnings = [];
        switch (data.getUint32(0)) {
        case 65536:
        case 1953658213:
        case 1330926671:
            break;
        default:
            font.errors.push("sfnt header: Invalid first 4 bytes of the file. Must be one of: 0x00010000, 0x74727565, 0x4f54544f");
            break
        }
        if (!font.errors.length) {
            font.numTables = data.getUint16(4);
            if (font.numTables > sanity.maxTables)
                font.errors.push("sfnt header: numTables (" + font.numTables + "exceeds sanity.maxTables (" + sanity.maxTables + ")");
            else {
                font.tableDirectory = [];
                font.tables = {};
                p = 12;
                for (var t = 0; t < font.numTables; t++) {
                    var tag = data.getTag(p);
                    if (!tag) {
                        font.errors.push("sfnt header: Tag value is invalid");
                        break
                    }
                    font.tables[tag] = font.tableDirectory[t] = {
                        tag: tag,
                        checkSum: data.getUint32(p + 4),
                        offset: data.getUint32(p + 8),
                        length: data.getUint32(p + 12)
                    };
                    p += 16
                }
            }
        }
        if (font.errors.length)
            return font;
        p = font.tables["name"].offset;
        table = {};
        table.format = data.getUint16(p),
        p += 2;
        table.count = data.getUint16(p),
        p += 2;
        table.stringOffset = data.getUint16(p),
        p += 2;
        table.nameRecords = [];
        table.names = [];
        for (var n = 0; n < table.count; n++) {
            var nameRecord = {};
            var str = "";
            var p_;
            var nameRecordStart, nameRecordEnd;
            nameRecord.platformID = data.getUint16(p),
            p += 2;
            nameRecord.encodingID = data.getUint16(p),
            p += 2;
            nameRecord.languageID = data.getUint16(p),
            p += 2;
            nameRecord.nameID = data.getUint16(p),
            p += 2;
            nameRecord.length = data.getUint16(p),
            p += 2;
            nameRecord.offset = data.getUint16(p),
            p += 2;
            nameRecordStart = font.tables["name"].offset + table.stringOffset + nameRecord.offset;
            nameRecordEnd = nameRecordStart + nameRecord.length;
            if (nameRecordEnd > font.tables["name"].offset + font.tables["name"].length)
                continue;
            p_ = p;
            p = nameRecordStart;
            switch (nameRecord.platformID) {
            case 1:
                if (nameRecord.languageID == 0)
                    if (nameRecord.encodingID == 0) {
                        while (p < nameRecordEnd)
                            str += String.fromCharCode(data.getUint8(p)),
                            p++;
                        nameRecord.string = str
                    }
                break;
            case 3:
                if (nameRecord.languageID == 1033) {
                    switch (nameRecord.encodingID) {
                    case 0:
                    case 1:
                        while (p < nameRecordEnd)
                            str += String.fromCharCode(data.getUint16(p)),
                            p += 2;
                        nameRecord.string = str;
                        break;
                    case 10:
                        while (p < nameRecordEnd) {
                            str += String.fromCharCode(data.getUint16(p)),
                            p += 2
                        }
                        nameRecord.string = str;
                        break
                    }
                }
            }
            if (nameRecord.hasOwnProperty("string"))
                table.names[nameRecord.nameID] = str;
            table.nameRecords.push(nameRecord);
            p = p_
        }
        font.names = table.names;
        font.tables["name"].data = table;
        table = {};
        table.axes = [];
        table.instances = [];
        if (font.tables["fvar"]) {
            p = font.tables["fvar"].offset;
            table.majorVersion = data.getUint16(p),
            p += 2;
            table.minorVersion = data.getUint16(p),
            p += 2;
            table.offsetToAxesArray = data.getUint16(p),
            p += 2;
            table.countSizePairs = data.getUint16(p),
            p += 2;
            table.axisCount = data.getUint16(p),
            p += 2;
            table.axisSize = data.getUint16(p),
            p += 2;
            table.instanceCount = data.getUint16(p),
            p += 2;
            table.instanceSize = data.getUint16(p),
            p += 2;
            for (var a = 0; a < table.axisCount; a++) {
                var axis = {};
                axis.tag = getStringFromData(data, p, 4),
                p += 4;
                axis.min_Fixed = data.getInt32(p),
                p += 4;
                axis.min = axis.min_Fixed / 65536;
                axis.default_Fixed = data.getInt32(p),
                p += 4;
                axis.default = axis.default_Fixed / 65536;
                axis.currentVal = axis.default;
                axis.max_Fixed = data.getInt32(p),
                p += 4;
                axis.max = axis.max_Fixed / 65536;
                axis.flags = data.getUint16(p),
                p += 2;
                axis.axisNameID = data.getUint16(p),
                p += 2;
                axis.name = font.tables["name"].data.names[axis.axisNameID];
                axis.font = font;
                table.axes.push(axis)
            }
            for (var i = 0; i < table.instanceCount; i++) {
                var instance = {
                    tuple: [],
                    tuple_Fixed: []
                };
                instance.subfamilyNameID = data.getUint16(p),
                p += 2;
                instance.flags = data.getUint16(p),
                p += 2;
                instance.isDefault = true;
                for (var a = 0; a < table.axisCount; a++) {
                    instance.tuple_Fixed[a] = data.getInt32(p),
                    p += 4;
                    instance.tuple[a] = instance.tuple_Fixed[a] / 65536;
                    if (instance.tuple_Fixed[a] != table.axes[a].default_Fixed)
                        instance.isDefault = false
                }
                if (table.instanceSize == table.axisCount * 4 + 6)
                    instance.postScriptNameID = data.getUint16(p),
                    p += 2;
                instance.name = font.tables["name"].data.names[instance.subfamilyNameID];
                instance.font = font;
                table.instances.push(instance)
            }
            font.tables["fvar"].data = table
        }
        font.axes = table.axes;
        font.axisCount = table.axisCount;
        font.instances = table.instances;
        if (font.tables["STAT"]) {
            table = {};
            p = font.tables["STAT"].offset;
            table.majorVersion = data.getUint16(p),
            p += 2;
            table.minorVersion = data.getUint16(p),
            p += 2;
            table.designAxisSize = data.getUint16(p),
            p += 2;
            table.designAxisCount = data.getUint16(p),
            p += 2;
            table.offsetToDesignAxes = data.getUint32(p),
            p += 4;
            table.axisValueCount = data.getUint16(p),
            p += 2;
            table.offsetToAxisValueOffsets = data.getUint32(p),
            p += 4;
            if (!(table.majorVersion == 1 && table.minorVersion == 0))
                table.elidedFallbackNameID = data.getUint16(p),
                p += 2;
            font.tables["STAT"].data = table
        }
        if (font.tables["MVAR"]) {
            p = font.tables["MVAR"].offset;
            table = {};
            table.majorVersion = data.getUint16(p),
            p += 2;
            table.minorVersion = data.getUint16(p),
            p += 2;
            p += 2;
            table.valueRecordSize = data.getUint16(p),
            p += 2;
            table.valueRecordCount = data.getUint16(p),
            p += 2;
            table.itemVariationStore = data.getUint16(p),
            p += 2;
            table.firstCharOfValueRecords = getStringFromData(data, p, 1);
            font.tables["MVAR"].data = table
        }
        if (font.tables["COLR"] && font.tables["CPAL"]) {
            p = font.tables["COLR"].offset;
            console.log("tableOffset: " + p);
            table = {};
            table.version = data.getUint16(p),
            p += 2;
            table.numBaseGlyphRecords = data.getUint16(p),
            p += 2;
            table.offsetBaseGlyphRecord = data.getUint32(p),
            p += 4;
            table.offsetLayerRecord = data.getUint32(p),
            p += 4;
            table.numLayerRecords = data.getUint16(p),
            p += 2;
            console.log("COLR");
            console.log(table);
            table.layers = [];
            console.log("table.offsetBaseGlyphRecord: " + table.offsetBaseGlyphRecord);
            p = font.tables["COLR"].offset + table.offsetBaseGlyphRecord;
            var glyphId, firstLayerIndex, numLayers;
            for (var bgr = 0; bgr < table.numBaseGlyphRecords; bgr++) {
                glyphId = data.getUint16(p),
                p += 2;
                firstLayerIndex = data.getUint16(p),
                p += 2;
                numLayers = data.getUint16(p),
                p += 2;
                console.log("glyphId: " + glyphId + ", firstLayerIndex: " + firstLayerIndex + ", numLayers: " + numLayers);
                table.layers[glyphId] = [];
                for (var l = 0; l < numLayers; l++) {
                    var layerGlyphId = data.getUint16(font.tables["COLR"].offset + table.offsetLayerRecord + 4 * (firstLayerIndex + l));
                    var paletteIndex = data.getUint16(font.tables["COLR"].offset + table.offsetLayerRecord + 4 * (firstLayerIndex + l) + 2);
                    if (paletteIndex == 65535)
                        paletteIndex = -1;
                    table.layers[glyphId].push([layerGlyphId, paletteIndex])
                }
            }
            font.tables["COLR"].data = table;
            console.log("COLR");
            console.log(table);
            p = font.tables["CPAL"].offset;
            table = {};
            table.version = data.getUint16(p),
            p += 2;
            table.numPaletteEntries = data.getUint16(p),
            p += 2;
            table.numPalettes = data.getUint16(p),
            p += 2;
            table.numColorRecords = data.getUint16(p),
            p += 2;
            var offsetFirstColorRecord;
            offsetFirstColorRecord = data.getUint32(p),
            p += 4;
            var colorRecordIndices = [];
            var colorRecordIndex;
            table.palettes = [];
            for (var pal = 0; pal < table.numPalettes; pal++) {
                var palette = [];
                colorRecordIndex = data.getUint16(p),
                p += 2;
                colorRecordOffset = font.tables["CPAL"].offset + offsetFirstColorRecord + colorRecordIndex * 4;
                for (var npe = 0; npe < table.numPaletteEntries; npe++) {
                    var c32 = data.getUint32(colorRecordOffset + npe * 4);
                    palette.push({
                        red: c32 >>> 24,
                        green: (c32 & 16711680) >>> 16,
                        blue: (c32 & 65280) >>> 8,
                        alpha: c32 & 255
                    })
                }
                table.palettes.push(palette)
            }
            font.tables["CPAL"].offset + offsetFirstColorRecord;
            font.tables["CPAL"].data = table;
            console.log("CPAL");
            console.log(table)
        }
        font.familyName = font.names[4] || font.names[1] || "(unknown)";
        font.familyName = font.familyName.trim();
        font.menuName = font.familyName;
        if (font.names[1] == "Jam" && font.names[19] == "Required")
            ;
        else
            font.sample = font.tables["name"].data.names[19];
        if (overridefont) {
            if (overridefont.familyName)
                font.familyName = overridefont.familyName;
            if (overridefont.menuName)
                font.menuName = overridefont.menuName;
            if (overridefont.file)
                font.file = overridefont.file
        }
        checkForErrors(font);
        return font
    }
    return {
        errors: ["Could not access memory object to start parsing font."]
    }
}
function transformAxis(axis, value, direction) {
    switch (direction) {
    case "→":
        switch (axis) {
        case "font-size":
            return 4 + (188 - 4) * value;
        case "line-height":
            return 75 + (200 - 75) * value;
        default:
            return axis.min + (axis.max - axis.min) * value
        }
    case "←":
        switch (axis) {
        case "font-size":
            return (value - 4) / (188 - 4);
        case "line-height":
            return (value - 75) / (200 - 75);
        default:
            return (value - axis.min) / (axis.max - axis.min)
        }
    }
}
function hideNotification(notification) {
    console.log($(notification).html());
    $(notification).fadeOut("slow")
}
function updateLoupe() {
    if ($("#css-html:visible").length) {
        var styleObj = $(textbox_current).prop("style");
        for (var i = 0, css = ""; i < styleObj.length; i++)
            css += styleObj[i] + ": " + styleObj[styleObj[i]] + ";\n";
        $("#css-html-css").val(css)
    }
    if (loupe.active) {
        var oldLeft = $("#loupe #maincolumn").css("left");
        var oldTop = $("#loupe #maincolumn").css("top");
        var clone = $("#maincolumn").clone().prop("id", undefined);
        $(loupe.element).children("#maincolumn").css({
            left: (loupe.srcLeft + 0) * loupe.scale + loupe.size / 2 * (1 - loupe.scale) + "px",
            top: (loupe.srcTop + 0) * loupe.scale + loupe.size / 2 * (1 - loupe.scale) + "px"
        });
        $(clone).css({
            position: "absolute",
            left: oldLeft,
            top: oldTop,
            backgroundColor: "white",
            transform: "scale(" + loupe.scale + ")",
            transformOrigin: "top left",
            outline: "1000px solid white"
        });
        $("#loupe").empty().append(clone)
    }
}
function updateVariationsCSS(textbox, font) {
    var fvsArray = [];
    for (var a = 0; a < font.axes.length; a++)
        fvsArray.push("'" + font.axes[a].tag + "' " + font.axes[a].currentVal);
    var fontvarsettings = fvsArray.join(",");
    $(textbox).css("font-variation-settings", fontvarsettings);
    updateLoupe()
}
function alignControl_refresh() {
    $(".align-control").css("color", "lightgrey");
    switch ($(textbox_current).css("text-align")) {
    case "center":
        $(".align-control:eq(1)").css("color", "black");
        break;
    case "right":
        $(".align-control:eq(2)").css("color", "black");
        break;
    case "justify":
        $(".align-control:eq(3)").css("color", "black");
        break;
    case "left":
    default:
        $(".align-control:eq(0)").css("color", "black");
        break
    }
}
function color_control_refresh() {
    var hexColor = rgb2hexAndOpacity($(textbox_current).css("color"));
    var hexBackgroundColor = rgb2hexAndOpacity($(textbox_current).css("background-color"));
    $("#color-picker").val("#" + hexColor.hex);
    $("#background-color-picker").val("#" + hexBackgroundColor.hex)
}
function textbox_type_refresh() {
    var position = $(textbox_current).css("position") == "absolute" ? "absolute" : "relative";
    if ($(textbox_current).data("fit-to-width"))
        position += ", fit-to-width";
    $("#textbox-type").val(position)
}
function fontSizeControl_refresh() {
    var fontSize = parseFloat($(textbox_current).css("font-size"));
    $("#fontsize-slider").val(transformAxis("font-size", fontSize, "←")).prop("title", fontSize)
}
function axes_refresh(font) {
    if (typeof font == "string")
        font = getFontForFontMenuName(font);
    $("#axes_table").empty();
    $("#axis_sliders").empty();
    console.log(font);
    if (font.axes && font.axes.length) {
        console.log("ok emptying");
        var varSettings = $(textbox_current).css("font-variation-settings");
        var currentVals = {};
        if (varSettings) {
            varSettings = varSettings.split(",");
            for (var v in varSettings) {
                var regex = /^\s*("|')([^"']{4})("|')\s*([-0-9+.]*)\s*$/;
                var regexResults = regex.exec(varSettings[v]);
                if (regexResults !== null)
                    currentVals[regexResults[2]] = parseFloat(regexResults[4])
            }
        }
        let numHiddenAxes = 0;
        for (var a = 0; a < font.axes.length; a++) {
            var axis = font.axes[a];
            if (currentVals[axis.tag] === undefined)
                axis.currentVal = axis.default;
            else
                axis.currentVal = currentVals[axis.tag];
            var controlContainer = $("<div class='control-container'>");
            var controlDiv = $("<div class='control'>");
            var inputSlider = $('<input id="slider-' + axis.tag + '" class="ap-slider axis-slider" type="range" value="0.5" min="0" max="1" step="0.000001">');
            var inputNumeric = $('<input class="axis-numeric" type="text">');
            $(inputNumeric).change(function() {
                var slider = $(this).siblings(".axis-slider");
                var axis = $(slider).data("axis");
                var val = parseFloat($(this).val());
                if (val < axis.min) {
                    val = axis.min;
                    $(this).val(axis.min)
                } else if (val > axis.max) {
                    val = axis.max;
                    $(this).val(axis.max)
                }
                axis.currentVal = val;
                console.log("changing to " + axis.currentVal);
                $(slider).val(transformAxis(axis, axis.currentVal, "←"));
                updateVariationsCSS(textbox_current, font)
            });
            $(inputSlider).data("axis", axis).on("input", function() {
                var axis = $(this).data("axis");
                axis.currentVal = axis.min + this.value * (axis.max - axis.min);
                $(this).siblings(".axis-numeric").val(axis.currentVal);
                updateVariationsCSS(textbox_current, font)
            });
            $(controlDiv).append(inputSlider).append(inputNumeric).append('&nbsp;&nbsp;<span class="fontawesome resetaxis noselect" style="font-size:0.333rem;" title="Reset">&#xf0e2;</span>');
            $(controlContainer).append("<div class='control-label'>" + axis.name + "</div>").append(controlDiv);
            if (axis.flags & 1)
                $(controlContainer).addClass("axis-hidden");
            $("#axis_sliders").append(controlContainer);
            $(inputSlider).val(transformAxis(axis, axis.currentVal, "←"));
            $(inputNumeric).val(axis.currentVal);
            if (axis.flags & 1)
                numHiddenAxes++
        }
        if (numHiddenAxes)
            $("#toggle-hidden-axes").show();
        else
            $("#toggle-hidden-axes").hide()
    }
    $(".resetaxis").click(function() {
        var slider = $(this).siblings(".axis-slider");
        var axis = slider.data("axis");
        axis.currentVal = axis.default;
        $(slider).val(transformAxis(axis, axis.currentVal, "←"));
        $(slider).siblings(".axis-numeric").val(axis.currentVal);
        updateVariationsCSS(textbox_current, axis.font)
    })
}
function getFontForFontMenuName(menuName) {
    menuName = menuName.replace(/['"]/g, "");
    for (var f = 0; f < fonts.length; f++) {
        if (menuName == fonts[f].menuName)
            return fonts[f]
    }
    return false
}
function getFontForFontFamily(fontFamily) {
    fontFamily = fontFamily.replace(/['"]/g, "");
    for (var f = 0; f < fonts.length; f++) {
        if (fontFamily == fonts[f].fontFamily)
            return fonts[f]
    }
    return false
}
function getAxisWithName(font, tag) {
    for (var a = 0; a < font.axes.length; a++) {
        var axis = font.axes[a];
        if (axis.tag == tag)
            return axis
    }
    return false
}
function instancePicker_refresh(font) {
    if (typeof font == "string")
        font = getFontForFontMenuName(font);
    $("#instance-picker").empty().prop("disabled", false);
    if (font.instances instanceof Array) {
        for (var i = 0; i < font.instances.length; i++) {
            var instance = font.instances[i];
            var defaultNote = instance.isDefault ? " (default)" : "";
            var option = $("<option>" + instance.name + defaultNote + "</option>");
            $(option).data("instance", instance);
            $("#instance-picker").append(option)
        }
    }
    return true
}
function showInstallAnimation(font) {
    var html = '<div style="font-size:80%;">' + font.familyName + " " + "</div><div style=\"font-family: '" + font.fontFamily + "'\">" + (font.sample || "ABCabc123") + "</div>";
    var notification = $("<div class='notification success'>").html(html);
    $("#notifications").append(notification);
    $(notification).fadeIn();
    setTimeout(function() {
        hideNotification(notification)
    }, 1750, notification)
}
function getName(font, nameId) {
    return nameId >= 0 && nameId < font.names.length ? font.names[nameId] : false
}
function getAxisName(font, tag, nameId) {
    if (nameId !== false) {
        var axisName = getName(font, nameId);
        return axisName !== false ? axisName : tag
    } else if (registeredAxes[tag])
        return registeredAxes[tag];
    else
        return tag
}
var wght = 176;
var wdth = 804;
var textbox_current;
function rgb2hexAndOpacity(rgb) {
    var rgbArray, hex, opacity;
    console.log(rgb);
    rgbArray = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (rgbArray === null)
        rgbArray = rgb.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*(\d+)\)$/);
    hex = ("0" + parseInt(rgbArray[1]).toString(16)).slice(-2) + ("0" + parseInt(rgbArray[2]).toString(16)).slice(-2) + ("0" + parseInt(rgbArray[3]).toString(16)).slice(-2);
    if (rgb[4] !== undefined)
        opacity = parseFloat(rgb[4]);
    return {
        hex: hex,
        opacity: opacity
    }
}
var loupe;
var settings;
var handleDrag;
function bodyAllowDrop(event) {
    event.preventDefault()
}
$(function() {
    $("body").on("dragover", bodyAllowDrop);
    var specimen;
    loupe = {
        active: false,
        top: 0,
        left: 0,
        element: null,
        dragging: false,
        scale: 3,
        size: 360,
        clickX: 0,
        clickY: 0,
        srcLeft: $("#maincolumn").offset().left,
        srcTop: $("#maincolumn").offset().top,
        shape: "circle"
    };
    loupe.zoom = Math.log2(loupe.scale);
    handleDrag = {
        dragging: false,
        clickX: 0,
        clickY: 0,
        size: 16,
        handle: null,
        handleNumber: null,
        textbox: null
    };
    settings = {
        active: false
    };
    for (var f in fonts) {
        var font = fonts[f];
        font.axes = [];
        font.instances = [];
        font.names = [];
        font.errors = [];
        font.warnings = [];
        if (!font.fontFamily)
            fonts[f].fontFamily = fonts[f].menuName;
        $("#font-picker").append("<option id='font-" + font.fontFamily.replace(/ /g, "_") + "'>" + font.menuName + "</option>");
        if (font.type == "webfont" && font.menuName && font.file && font.file.name)
            $("#webfonts").append("@font-face {font-family:'" + font.fontFamily + "'; src:url('" + config["EXTERNAL_ROOT"] + "/fonts/webfonts/" + font.file.name + "');}\n")
    }
    $("#font-picker").change(function() {
        var menuName = $("#font-picker").val();
        var font = getFontForFontMenuName(menuName);
        $(textbox_current).css("font-family", '"' + font.fontFamily + '"');
        console.log("changing to " + font.fontFamily);
        axes_refresh(font);
        instancePicker_refresh(font);
        updateVariationsCSS(textbox_current, font)
    });
    ["private", "public"].forEach(function(publicity) {
        for (var s in specimens) {
            specimen = specimens[s];
            var styling = 'style="position: relative;"';
            if (specimen.type == publicity) {
                var specimenList = "#specimen-list-" + (specimen["name"] == "__DEFAULT__" ? "default" : publicity);
                if ($(specimenList + " .specimen-button").length == 0)
                    $(specimenList).empty();
                $('<li class="specimen-button" ' + styling + '><a href="' + config["EXTERNAL_ROOT"] + "/specimens/" + specimen["name"] + '">' + specimen["name_full"] + "</a></li>").data("specimen", specimen).append(specimen.type == "public" ? null : "<div style='top: 0.3em; right: 0; position: absolute; padding-right: 0.25em; font-size: 0.75em; display: none;' class='fontawesome bin'>&#xf1f8;</div>").appendTo(specimenList)
            }
        }
    });
    $(".specimen-button").click(function() {
        var specimen = $(this).data("specimen");
        window.history.pushState({}, "Axis-Praxis", config["EXTERNAL_ROOT"] + "/specimens/" + specimen.name);
        $("#maincolumn").empty();
        $("#textbox-picker").empty();
        var textbox_prefix = "";
        for (var t in specimen.textboxes) {
            var textbox = specimen.textboxes[t];
            $("#textbox-picker").append('<option id="option-' + textbox_prefix + textbox.id + '">' + textbox.id + "</option>");
            var textbox_div = $("<div>" + specimen["name"] + "</div>").attr({
                id: textbox_prefix + textbox.id,
                style: textbox.style,
                contentEditable: "true"
            }).data("textbox", textbox).addClass("textbox").html(textbox.content).appendTo("#maincolumn");
            if (t == 0)
                textbox_current = textbox_div;
            $(textbox_div).keyup(function(e) {
                updateLoupe()
            });
            $(textbox_div).keydown(function(e) {
                updateLoupe()
            })
        }
        console.log(specimen);
        var font = getFontForFontFamily($(textbox_current).css("font-family"));
        $("#font-picker").val(font.menuName);
        instancePicker_refresh(font);
        axes_refresh(font);
        alignControl_refresh();
        $(".textbox").focus(setTextboxFocus);
        fontSizeControl_refresh();
        textbox_type_refresh();
        color_control_refresh();
        $(".specimen-button").removeClass("active");
        $(this).addClass("active");
        updateLoupe();
        return false
    });
    $(".specimen-button").mouseenter(function() {
        $(this).children(".bin").show()
    });
    $(".specimen-button").mouseleave(function() {
        $(this).children(".bin").hide()
    });
    $(".bin").click(function() {
        var specimenButton = $(this).closest(".specimen-button");
        var specimenName = $(specimenButton).text();
        specimenName = specimenName.substr(0, specimenName.length - 1);
        if (confirm("Delete specimen “" + specimenName + "”. Are you sure?")) {
            var specimenNameToDelete = $(specimenButton).data("specimen").name;
            $.post(config["EXTERNAL_ROOT"] + "/ajax_specimen_delete.php", {
                name: specimenNameToDelete
            }).done(function(data) {
                console.log("AJAX ajax_specimen_delete.php done");
                $(specimenButton).remove();
                $(".specimen-button:eq(0)").click()
            })
        }
    });
    $("#textbox-picker").change(function() {
        var id = $(this).children(":selected").prop("id");
        textbox_current = $("#" + id.replace(/^option-/, ""));
        $(textbox_current).fadeIn(50).fadeOut(50).fadeIn(50);
        var font = getFontForFontFamily($(textbox_current).css("font-family"));
        instancePicker_refresh(font);
        alignControl_refresh();
        fontSizeControl_refresh();
        textbox_type_refresh();
        color_control_refresh();
        axes_refresh(font)
    });
    $("#instance-picker").change(function() {
        var instance = $(this).children(":selected").data("instance");
        var axis_sliders = $(".axis-slider");
        for (var a = 0; a < instance.tuple.length; a++) {
            instance.font.axes[a].currentVal = instance.tuple[a];
            $(axis_sliders[a]).val(transformAxis(instance.font.axes[a], instance.tuple[a], "←"));
            $(axis_sliders[a]).siblings(".axis-numeric").val(instance.font.axes[a].currentVal)
        }
        updateVariationsCSS(textbox_current, instance.font)
    });
    $("#toggle-hidden-axes").click(function() {
        $(".axis-slider").each(function() {
            if ($(this).data("axis").flags & 1)
                $(this).closest(".control-container").toggle()
        })
    });
    console.log($("#text").css("background-color"));
    console.log($("#background-color-picker").val());
    var fontsize, lineheight, fontvarsettings;
    $("#fontsize-slider").on("input", function() {
        fontsize = 9 + this.value * (192 - 9);
        $(textbox_current).css("font-size", fontsize + "px");
        var font = getFontForFontFamily($(textbox_current).css("font-family"));
        var varSettings = $(textbox_current).css("font-variation-settings");
        console.log(varSettings);
        if ($("#ap-settings-opsz-px-link").prop("checked")) {
            var axis_opsz = getAxisWithName(font, "opsz");
            if (axis_opsz) {
                axis_opsz.currentVal = (fontsize - parseFloat($("#ap-settings-opsz-px-offset").val())) / parseFloat($("#ap-settings-opsz-px-ratio").val());
                axis_opsz.currentVal = Math.max(axis_opsz.min, axis_opsz.currentVal);
                axis_opsz.currentVal = Math.min(axis_opsz.max, axis_opsz.currentVal);
                var opsz_slider = false;
                $(".axis-slider").each(function(i, slider) {
                    if ($(slider).data("axis").tag == "opsz")
                        opsz_slider = slider
                });
                $(opsz_slider).val(transformAxis(axis_opsz, axis_opsz.currentVal, "←"));
                $(opsz_slider).siblings(".axis-numeric").val(axis_opsz.currentVal);
                updateVariationsCSS(textbox_current, font)
            }
        }
        updateLoupe()
    });
    $("#lineheight-slider").on("input", function() {
        lineheight = 75 + this.value * (200 - 75);
        $(textbox_current).css("line-height", lineheight + "%");
        updateLoupe()
    });
    $("#color-picker").change(function() {
        $(textbox_current).css("color", this.value);
        updateLoupe()
    });
    $("#background-color-picker").change(function() {
        $(textbox_current).css("background-color", this.value);
        updateLoupe()
    });
    $("#textbox-type").change(function() {
        var ftw = false;
        var parameters = $("#textbox-type").val().split(",");
        if (parameters.length >= 2)
            ftw = parameters[1] ? true : false;
        console.log(parameters);
        console.log("Setting FTW to " + ftw);
        $(textbox_current).css("width", $(textbox_current).width() + "px");
        $(textbox_current).css("position", parameters[0].trim());
        $(textbox_current).data("fit-to-width", ftw);
        if (ftw) {
            $(textbox_current).text($(textbox_current).text().substr(0, 120));
            $(textbox_current).css({
                "white-space": "nowrap"
            });
            fitToWidth(textbox_current)
        }
    });
    for (var f = 0, font; font = fonts[f]; f++) {
        font.loaded = false;
        if (font.type == "system") {
            parseTTXAxesAndInstances(font, ttxdata_local[font.fontFamily])
        } else if (font.type == "webfont") {
            font.url = config["EXTERNAL_ROOT"] + "/fonts/webfonts/" + font.file.name;
            var oReq = new XMLHttpRequest;
            oReq.open("GET", font.url, true);
            oReq.responseType = "arraybuffer";
            oReq._myFont = font;
            oReq._myFontCount = fonts.length;
            oReq._myFontsToAdd = [];
            oReq._myFontIndex = f;
            oReq.onload = function(oEvent) {
                var arrayBuffer = this.response;
                if (arrayBuffer) {
                    var dv = new DataView(arrayBuffer);
                    this._myFont.file.size = arrayBuffer.byteLength;
                    var thisfont = newFont(dv, this._myFont)
                }
            }
            ;
            oReq.send(null)
        }
    }
    setTimeout(function() {
        if (query.specimen) {
            $(".specimen-button").each(function() {
                var specimen = $(this).data("specimen");
                if (specimen && specimen.name == query.specimen)
                    $(this).trigger("click")
            })
        } else
            $(".specimen-button:eq(0)").click()
    }, 250);
    $("#icon-loupe").click(function() {
        if (loupe.active) {
            loupe.active = false;
            $("#loupe").empty().hide()
        } else {
            loupe.active = true;
            loupe.element = $("#loupe");
            $("#loupe").css({
                width: loupe.size + "px",
                height: loupe.size + "px",
                borderRadius: loupe.size / 2 + "px",
                display: "block"
            });
            var clone = $("#maincolumn").clone();
            $(clone).css({
                position: "absolute",
                left: (1 - loupe.scale) * loupe.size / 2 + "px",
                top: (1 - loupe.scale) * loupe.size / 2 + "px",
                backgroundColor: "white",
                transform: "scale(" + loupe.scale + ")",
                transformOrigin: "top left",
                outline: "1000px solid white"
            });
            $("#loupe").css({
                left: loupe.srcLeft + "px",
                top: loupe.srcTop + "px"
            });
            $("#loupe").empty().append(clone);
            $(loupe.element).on("mousedown", function(e) {
                $("#loupe").css("cursor", "none");
                if (e.shiftKey) {
                    loupe.changeZoom = true;
                    loupe.zoomStart = loupe.zoom;
                    loupe.changeZoomPos = [e.pageX, e.pageY]
                } else {
                    loupe.changeZoom = false;
                    loupe.clickX = e.pageX - $("#loupe").offset().left;
                    loupe.clickY = e.pageY - $("#loupe").offset().top;
                    loupe.dragging = true
                }
                return false
            });
            $(loupe.element).on("mousemove", function(e) {
                if (loupe.changeZoom) {
                    loupe.zoom = loupe.zoomStart + (e.pageY - loupe.changeZoomPos[1]) / 100;
                    loupe.scale = Math.pow(2, loupe.zoom);
                    $(loupe.element).children("#maincolumn").css({
                        left: (loupe.srcLeft - $("#loupe").offset().left) * loupe.scale + loupe.size / 2 * (1 - loupe.scale) + "px",
                        top: (loupe.srcTop - $("#loupe").offset().top) * loupe.scale + loupe.size / 2 * (1 - loupe.scale) + "px"
                    });
                    updateLoupe()
                } else if (loupe.dragging) {
                    $(loupe.element).css({
                        left: e.pageX - loupe.clickX + "px",
                        top: e.pageY - loupe.clickY + "px"
                    });
                    $(loupe.element).children("#maincolumn").css({
                        left: (loupe.srcLeft + loupe.clickX - e.pageX) * loupe.scale + loupe.size / 2 * (1 - loupe.scale) + "px",
                        top: (loupe.srcTop + loupe.clickY - e.pageY) * loupe.scale + loupe.size / 2 * (1 - loupe.scale) + "px"
                    })
                }
            });
            $("body").on("mouseup", function(e) {
                loupe.dragging = false;
                loupe.changeZoom = false;
                loupe.zoomStart = false;
                $(loupe.element).css("cursor", "move");
                console.log("mouseup")
            })
        }
    });
    $("#icon-play").click(function() {
        $(".icon-play-pause").toggle();
        $(".icon-play-play").toggle()
    });
    $("#icon-save").click(function() {
        $("#save-detail").show();
        $("#save-title").empty().focus()
    });
    $("#icon-download").click(function() {
        var textboxes = [];
        var documentFonts = [];
        if (loupe.active) {
            loupe.active = false;
            $("#loupe").empty().hide()
        }
        $("#maincolumn .textbox").find(".textbox-handle").remove();
        $("#maincolumn .textbox").each(function() {
            var textbox = {
                id: $(this).prop("id"),
                style: $(this).attr("style"),
                content: $(this).html()
            };
            textboxes.push(textbox);
            var font = getFontForFontFamily($(this).css("font-family"));
            documentFonts.push({
                filename: font.file.name,
                menuName: font.menuName,
                type: font.type
            });
            console.log("esesees")
        });
        alert("real");
        console.log(documentFonts);
        $.post(config["EXTERNAL_ROOT"] + "/ajax_preparezip.php", {
            fonts: JSON.stringify(documentFonts),
            textboxes: JSON.stringify(textboxes)
        }).done(function(data) {
            console.log(JSON.stringify(documentFonts));
            console.log("-----");
            console.log(JSON.stringify(textboxes));
            console.log("AJAX data loaded");
            console.log(data)
        })
    });
    $("#save-button").click(function(e) {
        var textboxes = [];
        var dragDropFonts = [];
        if (loupe.active) {
            loupe.active = false;
            $("#loupe").empty().hide()
        }
        $("#maincolumn .textbox").find(".textbox-handle").remove();
        $("#maincolumn .textbox").each(function() {
            var textbox = {
                id: $(this).prop("id"),
                style: $(this).attr("style"),
                content: $(this).html()
            };
            textboxes.push(textbox)
        });
        console.log(textboxes);
        $.post(config["EXTERNAL_ROOT"] + "/ajax_htmlupload.php", {
            title: $("#save-title").val(),
            textboxes: JSON.stringify(textboxes),
            fonts: dragDropFonts
        }).done(function(data) {
            console.log("AJAX data loaded");
            console.log(data);
            data = JSON.parse(data);
            window.location = config["EXTERNAL_ROOT"] + "/specimens/" + data.name
        });
        $("#save-detail").hide();
        $("#share-options").hide();
        e.preventDefault()
    });
    $("body").keydown(function(e) {});
    $("#icon-settings").click(function() {
        if (settings.active) {
            settings.active = false;
            $("#settings").hide()
        } else {
            settings.active = true;
            $("#settings").css("z-index", "5");
            $("#settings").show()
        }
    });
    $("#icon-share").mouseenter(function() {
        $("#share-options").show()
    }).mouseleave(function() {
        $("#share-options").hide()
    });
    $("#reset-axes").click(function() {
        var axis;
        $(".axis-slider").each(function(i, slider) {
            axis = $(slider).data("axis");
            axis.currentVal = axis.default;
            $(slider).val(transformAxis(axis, axis.currentVal, "←"));
            $(slider).siblings(".axis-numeric").val(axis.currentVal)
        });
        updateVariationsCSS(textbox_current, axis.font)
    });
    $("#randomize-axes").click(function() {
        var axis;
        $(".axis-slider").each(function(i, slider) {
            axis = $(slider).data("axis");
            axis.currentVal = axis.min + Math.random() * (axis.max - axis.min);
            $(slider).val(transformAxis(axis, axis.currentVal, "←"));
            $(slider).siblings(".axis-numeric").val(axis.currentVal)
        });
        updateVariationsCSS(textbox_current, axis.font)
    });
    $("#show-css-html").click(function() {
        $("#css-html").toggle();
        if ($("#css-html").is(":visible")) {
            $("#css-html").css("z-index", "5");
            var styleObj = $(textbox_current).prop("style");
            for (var i = 0, css = ""; i < styleObj.length; i++)
                css += styleObj[i] + ": " + styleObj[styleObj[i]] + ";\n";
            $("#css-html-css").val(css);
            $("#css-html-html").val($(textbox_current).html())
        }
    });
    $("#textbox-new").click(function() {
        newTextboxId = prompt("Type the DOM id of new textbox to be added at the end of the specimen.", "new-textbox");
        if ($("#" + newTextboxId).length > 0) {
            var baseId = newTextboxId;
            newTextboxId = null;
            for (var suffix = 1; suffix < 100 && !newTextboxId; suffix++) {
                var tryId = baseId + "-" + suffix;
                if ($("#" + tryId).length == 0)
                    newTextboxId = tryId
            }
        }
        var textbox = $("<div/>").prop("id", newTextboxId).prop("contenteditable", true).addClass("textbox").attr("style", "font-size:32px; font-family: Skia;").html("New textbox").focus(setTextboxFocus);
        $("#maincolumn").append(textbox);
        $("#textbox-picker").append('<option selected id="option-' + newTextboxId + '">' + newTextboxId + "</option>")
    });
    $(".align-control").click(function() {
        var align;
        $(".align-control").css("color", "lightgrey");
        $(this).css("color", "black");
        switch ($(this).text()) {
        case "":
            align = "left";
            break;
        case "":
            align = "center";
            break;
        case "":
            align = "right";
            break;
        case "":
            align = "justify";
            break
        }
        if (align)
            $(textbox_current).css("text-align", align);
        updateLoupe()
    });
    $(".close-button").click(function() {
        $(this).closest(".popup").hide()
    });
    $("#fontinfo-icon").click(function() {
        $("#fontinfo").toggle();
        if ($("#fontinfo").is(":visible")) {
            $("#fontinfo").css("z-index", "5");
            var font = getFontForFontFamily($(textbox_current).css("font-family"));
            $("#fontinfo .popup-content").empty();
            $("#fontinfo .popup-content").append("<div class='popup-key'>File name</div><div class='popup-value'>" + font.file.name + "</div><br clear='all'/>");
            $("#fontinfo .popup-content").append("<div class='popup-key'>File size</div><div class='popup-value'>" + font.file.size + " bytes</div><br clear='all'/>");
            var errorList = "";
            if (font.errors.length)
                $.each(font.errors, function(i, error) {
                    errorList += "<span style='color:red'>" + error + "</span><br/>"
                });
            else
                errorList = "none";
            $("#fontinfo .popup-content").append("<div class='popup-key'>Errors</div><div class='popup-value'>" + errorList + "</div><br clear='all'/>");
            var resourceList = "";
            if (font.resources) {
                $.each(font.resources, function(i, resource) {
                    resourceList += i + 1 + ". <a href='" + resource.url + "'>" + (resource.type || resource.title) + "</a><br/>"
                })
            }
            $("#fontinfo .popup-content").append("<div class='popup-key'>Resources</div><div class='popup-value'>" + resourceList + "</div><br clear='all'/>");
            $("#fontinfo .popup-content").append("<div class='popup-key'>Axes</div><div class='popup-value'>" + font.axes.length + "</div><br clear='all'/>");
            $.each(font.axes, function(i, axis) {
                let styles = [];
                if (registeredAxes[axis.tag])
                    styles.push("text-decoration: underline;");
                if (axis.flags & 1)
                    styles.push("color: grey;");
                let styledTag = '<span style="' + styles.join("") + '">' + axis.tag + "</span>";
                $("#fontinfo .popup-content").append("<div class='popup-key' style='font-weight: normal; font-size: 75%;'>&nbsp;" + styledTag + " (" + axis.name + ")</div><div class='popup-value'>" + axis.min + "…" + axis.default + "…" + axis.max + "</div><br clear='all'/>")
            });
            $("#fontinfo .popup-content").append("<div class='popup-key'>Named instances</div><div class='popup-value'>" + font.instances.length + "</div><br clear='all'/>");
            $.each(font.instances, function(i, instance) {
                $("#fontinfo .popup-content").append("<div class='popup-key' style='font-weight: normal; font-size: 75%;'>&nbsp;" + instance.name + "</div><div class='popup-value'>[" + instance.tuple.join(",") + "]</div><br clear='all'/>")
            });
            $("#fontinfo .popup-content").append("<div class='popup-key'>Names</div><div class='popup-value'></div><br clear='all'/>");
            $.each(font.names, function(i, name) {
                if (i < 256 && name !== undefined)
                    $("#fontinfo .popup-content").append("<div class='popup-key' style='font-weight: normal; font-size: 75%;'>&nbsp;" + opentypeNameDefs[i] + "</div><div class='popup-value'>" + name + "</div><br clear='all'/>")
            })
        }
    });
    $("#rightcolumn")[0].addEventListener("dragover", handleDragOver, false);
    $("#rightcolumn")[0].addEventListener("drop", handleFileSelect, false);
    if (!CSS.supports("font-variation-settings", "'wdth' 0.0")) {
        $("#browser-warning").show()
    }
});
function addFocusMethod(textbox) {
    $(textbox).focus(function() {
        textbox_current = this;
        var font = getFontForFontFamily("Skia");
        $("#font-picker").val(font.menuName);
        instancePicker_refresh(font);
        axes_refresh(font);
        alignControl_refresh();
        fontSizeControl_refresh()
    })
}
function fitToWidth(textbox) {
    var clone;
    if ($(textbox).siblings(".ftw-clone").length == 0) {
        clone = $(textbox).clone().addClass("ftw-clone").removeClass("textbox").css({
            "z-index": 1,
            _left: 0,
            _top: 0,
            _color: "red"
        });
        $(clone).children(".textbox-handle").remove();
        $(clone).insertBefore(textbox);
        $(textbox).css({
            color: "rgba(0,0,0,0.0)",
            "z-index": -1,
            "background-color": "rgba(0,0,0,0.0)"
        })
    } else
        clone = $(textbox).siblings(".ftw-clone");
    var width = $(textbox).width();
    var overflowWidth = $(textbox)[0].scrollWidth;
    console.log(width + " *** " + overflowWidth);
    var xScale = width / overflowWidth;
    $(clone).css({
        "transform-origin": "top left",
        transform: "scale(" + xScale + ", 1)"
    })
}
function setTextboxFocus() {
    textbox_current = this;
    var font = getFontForFontFamily($(this).css("font-family"));
    $("#font-picker").val(font.menuName);
    instancePicker_refresh(font);
    axes_refresh(font);
    alignControl_refresh();
    fontSizeControl_refresh();
    color_control_refresh();
    $("#textbox-picker").val(this.id);
    $(".textbox-handle").remove();
    if ($(this).css("position") == "relative") {
        var handle = $("<div/>").addClass("textbox-handle relative").css({
            left: $(this).width() - handleDrag.size / 2 + "px",
            top: $(this).height() / 2 - handleDrag.size / 2 + "px"
        }).appendTo(this);
        $(handle).on("mousedown", function(e) {
            handleDrag.handle = e.target;
            handleDrag.left = $(handleDrag.handle).position().left;
            handleDrag.top = $(handleDrag.handle).position().top;
            handleDrag.clickX = e.pageX - $(handleDrag.handle).offset().left;
            handleDrag.clickY = e.pageY - $(handleDrag.handle).offset().top;
            handleDrag.dragging = true;
            handleDrag.textbox = $(e.target).parent(".textbox");
            $(handleDrag.textbox).prop("contentEditable", false);
            $(handleDrag.textbox).css("border-right-style", "double");
            return false
        });
        $("body").on("mousemove", function(e) {
            if (handleDrag.dragging) {
                handleDrag.left = e.pageX - handleDrag.clickX - $(handleDrag.textbox).offset().left;
                var newWidth = handleDrag.left + handleDrag.size / 2;
                if (newWidth <= $(handleDrag.textbox).parent().width()) {
                    $(handleDrag.textbox).css("width", newWidth + "px");
                    var newHeight = $(handleDrag.textbox).height();
                    $(handleDrag.handle).css("left", handleDrag.left + "px");
                    $(handleDrag.handle).css("top", newHeight / 2 - handleDrag.size / 2 + "px")
                }
            }
        });
        $("body").on("mouseup", function(e) {
            if (handleDrag.dragging) {
                console.log(e.pageX + " ;;; " + $(handleDrag.textbox).offset().left);
                $(handleDrag.textbox).prop("contentEditable", true);
                $(handleDrag.textbox).css("border-right-style", "inherit");
                handleDrag.dragging = false;
                handleDrag.handle = null;
                handleDrag.textbox = null
            }
        })
    } else if ($(this).css("position") == "absolute") {
        for (var i = 0; i < 4; i++) {
            var handle = $("<div/>").addClass("textbox-handle").css({
                left: i % 2 * $(this).width() - handleDrag.size / 2 + "px",
                top: parseInt(i / 2) * $(this).height() - handleDrag.size / 2 + "px"
            }).data("handleNumber", i);
            $(handle).on("mousedown", function(e) {
                handleDrag.handle = e.target;
                handleDrag.clickX = e.pageX - $(handleDrag.handle).offset().left;
                handleDrag.clickY = e.pageY - $(handleDrag.handle).offset().top;
                handleDrag.dragging = true;
                handleDrag.handleNumber = $(handleDrag.handle).data("handleNumber");
                handleDrag.textbox = $(e.target).parent(".textbox");
                $(handleDrag.textbox).prop("contentEditable", false);
                console.log("mousedown: " + e.pageX + " ;;; " + $(handleDrag.textbox).offset().left);
                return false
            });
            console.log(i + "," + parseInt(i / 2) + "," + i % 2);
            $(this).append(handle)
        }
        $("body").on("mousemove", function(e) {
            if (handleDrag.dragging) {
                var oldLeft = parseFloat($(handleDrag.textbox).css("left")) || 0;
                handleDrag.left = e.pageX - $(handleDrag.textbox).parent().offset().left;
                handleDrag.top = e.pageY - $(handleDrag.textbox).parent().offset().top;
                var handleAt = [$(handleDrag.handle).position().left + handleDrag.size / 2, $(handleDrag.handle).position().top + handleDrag.size / 2];
                var newWidth;
                if (handleDrag.handleNumber == 0 || handleDrag.handleNumber == 1 || handleDrag.handleNumber == 2) {
                    console.log(oldLeft + "," + handleDrag.left + " --- " + $(handleDrag.handle).css("left") + " -- " + $(handleDrag.textbox).css("left"));
                    if (handleDrag.handleNumber != 1) {
                        newWidth = $(handleDrag.textbox).width() + oldLeft - handleDrag.left;
                        console.log(newWidth);
                        $(handleDrag.textbox).width(newWidth);
                        $(handleDrag.textbox).css("left", handleDrag.left + "px");
                        $(handleDrag.textbox).css("left", handleDrag.left + "px")
                    }
                    if (handleDrag.handleNumber == 0 || handleDrag.handleNumber == 1)
                        $(handleDrag.textbox).css("top", handleDrag.top + "px")
                }
                if (handleDrag.handleNumber == 1 || handleDrag.handleNumber == 3) {
                    newWidth = handleDrag.left + handleDrag.size / 2 - $(handleDrag.textbox).position().left;
                    $(handleDrag.textbox).css("width", newWidth + "px")
                }
                if (handleDrag.handleNumber == 2 || handleDrag.handleNumber == 3) {
                    newHeight = handleDrag.top + handleDrag.size / 2 - $(handleDrag.textbox).position().top;
                    $(handleDrag.textbox).css("height", newHeight + "px")
                }
                $(".textbox-handle").each(function() {
                    var width = $(this).parent().width();
                    var height = $(this).parent().height();
                    switch ($(this).data("handleNumber")) {
                    case 1:
                        $(this).css("left", width - handleDrag.size / 2 + "px");
                        break;
                    case 2:
                        $(this).css("top", height - handleDrag.size / 2 + "px");
                        break;
                    case 3:
                        $(this).css("left", width - handleDrag.size / 2 + "px");
                        $(this).css("top", height - handleDrag.size / 2 + "px");
                        break
                    }
                });
                console.log("FTW: " + $(handleDrag.textbox).data("fit-to-width"));
                if ($(handleDrag.textbox).data("fit-to-width")) {
                    fitToWidth(handleDrag.textbox);
                    var width = $(handleDrag.textbox).width();
                    var overflowWidth = $(handleDrag.textbox)[0].scrollWidth;
                    console.log(width + " *** " + overflowWidth);
                    var xScale = width / overflowWidth;
                    $(handleDrag.textbox).css({
                        "transform-origin": "top left",
                        transform: "scale(" + xScale + ", 1)"
                    })
                }
            }
        });
        $("body").on("mouseup", function(e) {
            $(handleDrag.textbox).prop("contentEditable", true);
            handleDrag.dragging = false;
            handleDrag.handle = null;
            handleDrag.textbox = null
        })
    }
}
function handleDragOver(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = "copy";
    console.log(evt)
}
function handleFileSelect(evt) {
    evt.stopPropagation();
    evt.preventDefault();
    var dropTarget = this;
    var files = evt.dataTransfer.files;
    var filesUploaded = 0;
    var firstFile_fontFamily = "";
    for (var i = 0, f; f = files[i]; i++) {
        var reader = new FileReader;
        reader.onload = function(theFile) {
            return function(e) {
                var dv = new DataView(e.target.result);
                var font = newFont(dv);
                font.file = {
                    name: theFile.name,
                    lastModified: theFile.lastModified,
                    size: theFile.size,
                    type: theFile.type
                };
                font.type = "dragdrop";
                var tempUint8array = new Uint8Array(e.target.result);
                font.fontFamily = fonts.length + "/" + font.type + "/" + font.menuName;
                if (getFontForFontMenuName(font.menuName)) {
                    var baseName = font.menuName;
                    font.menuName = null;
                    for (var suffix = 1; suffix < 100 && !font.menuName; suffix++) {
                        var newName = baseName + " " + suffix;
                        if (!getFontForFontMenuName(newName))
                            font.menuName = newName
                    }
                }
                if (font.menuName) {
                    font.fontFamily = fonts.length + "/" + font.type + "/" + font.menuName;
                    fonts.push(font);
                    $("#webfonts").append("@font-face {font-family:'" + font.fontFamily + "'; " + "src: url('data:;base64," + uint8ToBase64(tempUint8array) + "') format('truetype');} ");
                    if ($("#font-picker option.dragdrop").length == 0)
                        $("#font-picker").append("<option disabled>──────────</option>");
                    $("#font-picker").append("<option id='font-" + font.fontFamily.replace(/ /g, "_") + "' class='dragdrop'>" + font.menuName + "</option>");
                    $("#font-picker").val(font.menuName).change();
                    instancePicker_refresh(font)
                } else {
                    alert("Error: Font name issue means font could not be added.")
                }
            }
        }(f);
        reader.readAsArrayBuffer(f)
    }
}
