import { traverseLayers } from "./functions/traverse-layers";
import { settings } from "./constants/settings";
import { fastClone } from "./functions/fast-clone";
import { getLayout, hasChildren, isGroupNode } from "./lib/helpers";

const allPropertyNames = [
  "id",
  "width",
  "height",
  "currentPage",
  "cancel",
  "origin",
  "onmessage",
  "center",
  "zoom",
  "fontName",
  "name",
  "visible",
  "locked",
  "constraints",
  "relativeTransform",
  "x",
  "y",
  "rotation",
  "constrainProportions",
  "layoutAlign",
  "layoutGrow",
  "opacity",
  "blendMode",
  "isMask",
  "effects",
  "effectStyleId",
  "expanded",
  "backgrounds",
  "backgroundStyleId",
  "fills",
  "strokes",
  "strokeWeight",
  "strokeMiterLimit",
  "strokeAlign",
  "strokeCap",
  "strokeJoin",
  "dashPattern",
  "fillStyleId",
  "strokeStyleId",
  "cornerRadius",
  "cornerSmoothing",
  "topLeftRadius",
  "topRightRadius",
  "bottomLeftRadius",
  "bottomRightRadius",
  "exportSettings",
  "overflowDirection",
  "numberOfFixedChildren",
  "description",
  "layoutMode",
  "primaryAxisSizingMode",
  "counterAxisSizingMode",
  "primaryAxisAlignItems",
  "counterAxisAlignItems",
  "paddingLeft",
  "paddingRight",
  "paddingTop",
  "paddingBottom",
  "itemSpacing",
  "layoutGrids",
  "gridStyleId",
  "clipsContent",
  "guides",
  "guides",
  "selection",
  "selectedTextRange",
  "backgrounds",
  "arcData",
  "pointCount",
  "pointCount",
  "innerRadius",
  "vectorNetwork",
  "vectorPaths",
  "handleMirroring",
  "textAlignHorizontal",
  "textAlignVertical",
  "textAutoResize",
  "paragraphIndent",
  "paragraphSpacing",
  "autoRename",
  "textStyleId",
  "fontSize",
  "fontName",
  "textCase",
  "textDecoration",
  "letterSpacing",
  "lineHeight",
  "characters",
  "mainComponent",
  "scaleFactor",
  "booleanOperation",
  "expanded",
  "name",
  "type",
  "paints",
  "type",
  "fontSize",
  "textDecoration",
  "fontName",
  "letterSpacing",
  "lineHeight",
  "paragraphIndent",
  "paragraphSpacing",
  "textCase",
  "type",
  "effects",
  "type",
  "layoutGrids",
];

const defaultFont = { family: "Roboto", style: "Regular" };
type AnyStringMap = { [key: string]: any };

function assign(a: BaseNode & AnyStringMap, b: AnyStringMap) {
  for (const key in b) {
    const value = b[key];
    if (key === "data" && value && typeof value === "object") {
      const currentData =
        JSON.parse(a.getSharedPluginData("builder", "data") || "{}") || {};
      const newData = value;
      const mergedData = Object.assign({}, currentData, newData);
      // TODO merge plugin data
      a.setSharedPluginData("builder", "data", JSON.stringify(mergedData));
    } else if (
      typeof value != "undefined" &&
      ["width", "height", "type", "ref", "children", "svg"].indexOf(key) === -1
    ) {
      try {
        a[key] = b[key];
      } catch (err) {
        console.warn(`Assign error for property "${key}"`, a, b, err);
      }
    }
  }
}
function getImageFills(layer: RectangleNode | TextNode) {
  const images =
    Array.isArray(layer.fills) &&
    layer.fills.filter((item) => item.type === "IMAGE");
  return images;
}

async function processImages(layer: RectangleNode | TextNode) {
  const images = getImageFills(layer);
  return (
    images &&
    Promise.all(
      images.map(async (image: any) => {
        if (image && image.intArr) {
          image.imageHash = await figma.createImage(image.intArr).hash;
          delete image.intArr;
        }
      })
    )
  );
}

const normalizeName = (str: string) =>
  str.toLowerCase().replace(/[^a-z]/gi, "");

const fontCache: { [key: string]: FontName | undefined } = {};

async function getMatchingFont(fontStr: string, availableFonts: Font[]) {
  const familySplit = fontStr.split(/\s*,\s*/);

  for (const family of familySplit) {
    const normalized = normalizeName(family);
    for (const availableFont of availableFonts) {
      const normalizedAvailable = normalizeName(availableFont.fontName.family);
      if (normalizedAvailable === normalized) {
        const cached = fontCache[normalizedAvailable];
        if (cached) {
          return cached;
        }
        await figma.loadFontAsync(availableFont.fontName);
        fontCache[fontStr] = availableFont.fontName;
        fontCache[normalizedAvailable] = availableFont.fontName;
        return availableFont.fontName;
      }
    }
  }

  return defaultFont;
}

// This shows the HTML page in "ui.html".
figma.showUI(__html__);

// Calls to "parent.postMessage" from within the HTML page will trigger this
// callback. The callback will be passed the "pluginMessage" property of the
// posted message.
 figma.ui.onmessage = async (msg) => {
  
  if (msg.type === 'not-import') {
    const nodes: SceneNode[] = [];
    for (let i = 0; i < msg.count; i++) {
      const rect = figma.createRectangle();
      rect.x = i * 150;
      rect.fills = [{type: 'SOLID', color: {r: 1, g: 0.5, b: 0}}];
      figma.currentPage.appendChild(rect);
      nodes.push(rect);
    }
    figma.currentPage.selection = nodes;
    figma.viewport.scrollAndZoomIntoView(nodes);
  }
  if (msg.type === "import") {
    const availableFonts = (await figma.listAvailableFontsAsync()).filter(
      (font) => font.fontName.style === "Regular"
    );
    await figma.loadFontAsync(defaultFont);
    const { data } = msg;
    const { layers } = data;
    const rects: SceneNode[] = [];
    let baseFrame: PageNode | FrameNode = figma.currentPage;
    // TS bug? TS is implying that frameRoot is PageNode and ignoring the type declaration
    // and the reassignment unless I force it to treat baseFrame as any
    let frameRoot: PageNode | FrameNode = baseFrame as any;
    for (const rootLayer of layers) {
      await traverseLayers(rootLayer, async (layer: any, parent) => {
        try {
          if (layer.type === "FRAME" || layer.type === "GROUP") {
            const frame = figma.createFrame();
            frame.x = layer.x;
            frame.y = layer.y;
            frame.resize(layer.width || 1, layer.height || 1);
            assign(frame, layer);
            rects.push(frame);
            ((parent && (parent as any).ref) || baseFrame).appendChild(frame);
            layer.ref = frame;
            if (!parent) {
              frameRoot = frame;
              baseFrame = frame;
            }
            // baseFrame = frame;
          } else if (layer.type === "SVG") {
            const node = figma.createNodeFromSvg(layer.svg);
            node.x = layer.x;
            node.y = layer.y;
            node.resize(layer.width || 1, layer.height || 1);
            layer.ref = node;
            rects.push(node);
            assign(node, layer);
            ((parent && (parent as any).ref) || baseFrame).appendChild(node);
          } else if (layer.type === "RECTANGLE") {
            const rect = figma.createRectangle();
            if (getImageFills(layer)) {
              await processImages(layer);
            }
            assign(rect, layer);
            rect.resize(layer.width || 1, layer.height || 1);
            rects.push(rect);
            layer.ref = rect;
            ((parent && (parent as any).ref) || baseFrame).appendChild(rect);
          } else if (layer.type == "TEXT") {
            const text = figma.createText();
            if (layer.fontFamily) {
              const cached = fontCache[layer.fontFamily];
              if (cached) {
                text.fontName = cached;
              } else {
                const family = await getMatchingFont(
                  layer.fontFamily || "",
                  availableFonts
                );
                text.fontName = family;
              }
              delete layer.fontFamily;
            }
            assign(text, layer);
            layer.ref = text;
            text.resize(layer.width || 1, layer.height || 1);
            text.textAutoResize = "HEIGHT";
            const lineHeight =
              (layer.lineHeight && layer.lineHeight.value) || layer.height;
            let adjustments = 0;
            while (
              typeof text.fontSize === "number" &&
              typeof layer.fontSize === "number" &&
              (text.height > Math.max(layer.height, lineHeight) * 1.2 ||
                text.width > layer.width * 1.2)
            ) {
              // Don't allow changing more than ~30%
              if (adjustments++ > layer.fontSize * 0.3) {
                console.warn("Too many font adjustments", text, layer);
                // debugger
                break;
              }
              try {
                text.fontSize = text.fontSize - 1;
              } catch (err) {
                console.warn("Error on resize text:", layer, text, err);
              }
            }
            rects.push(text);
            ((parent && (parent as any).ref) || baseFrame).appendChild(text);
          }
        } catch (err) {
          console.warn("Error on layer:", layer, err);
        }
      });
    }
    if (frameRoot.type === "FRAME") {
      figma.currentPage.selection = [frameRoot];
    }

    figma.ui.postMessage({
      type: "doneLoading",
      rootId: frameRoot.id,
    });

    figma.viewport.scrollAndZoomIntoView([frameRoot]);

    if (process.env.NODE_ENV !== "development") {
      figma.closePlugin();
    }
  }
  // Make sure to close the plugin when you're done. Otherwise the plugin will
  // keep running, which shows the cancel button at the bottom of the screen.
  figma.closePlugin();
};
