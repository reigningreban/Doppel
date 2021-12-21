import { BuilderElement } from "@builder.io/sdk";


import * as fileType from "file-type";
import * as React from "react";
import {useState} from 'react'
import * as ReactDOM from "react-dom";
import loadingGif from "./gear-loading.gif"
import { traverseLayers } from "./functions/traverse-layers";

const useDev = false;

const apiHost = useDev ? "http://localhost:5000" : "https://builder.io";
const BASE64_MARKER = ";base64,";
type Node = TextNode | RectangleNode;
function convertDataURIToBinary(dataURI: string) {
    const base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
    const base64 = dataURI.substring(base64Index);
    const raw = window.atob(base64);
    const rawLength = raw.length;
    const array = new Uint8Array(new ArrayBuffer(rawLength));
  
    for (let i = 0; i < rawLength; i++) {
      array[i] = raw.charCodeAt(i);
    }
    return array;
  }
function getImageFills(layer: Node) {
    const images =
      Array.isArray(layer.fills) &&
      layer.fills.filter((item) => item.type === "IMAGE");
    return images;
  }
  async function processImages(layer: Node) {
    const images = getImageFills(layer);
  
    const convertToSvg = (value: string) => {
      (layer as any).type = "SVG";
      (layer as any).svg = value;
      if (typeof layer.fills !== "symbol") {
        layer.fills = layer.fills.filter((item) => item.type !== "IMAGE");
      }
    };
    return images
      ? Promise.all(
          images.map(async (image: any) => {
            try {
              if (image) {
                const url = image.url;
                if (url.startsWith("data:")) {
                  const type = url.split(/[:,;]/)[1];
                  if (type.includes("svg")) {
                    const svgValue = decodeURIComponent(url.split(",")[1]);
                    convertToSvg(svgValue);
                    return Promise.resolve();
                  } else {
                    if (url.includes(BASE64_MARKER)) {
                      image.intArr = convertDataURIToBinary(url);
                      delete image.url;
                    } else {
                      console.info(
                        "Found data url that could not be converted",
                        url
                      );
                    }
                    return;
                  }
                }
  
                const isSvg = url.endsWith(".svg");
  
                // Proxy returned content through Builder so we can access cross origin for
                // pulling in photos, etc
                const res = await fetch(
                  "https://builder.io/api/v1/proxy-api?url=" +
                    encodeURIComponent(url)
                );
  
                const contentType = res.headers.get("content-type");
                if (isSvg || (contentType && contentType.includes("svg"))) {
                  const text = await res.text();
                  convertToSvg(text);
                } else {
                  const arrayBuffer = await res.arrayBuffer();
                  const type = fileType(arrayBuffer);
                  if (
                    type &&
                    (type.ext.includes("svg") || type.mime.includes("svg"))
                  ) {
                    convertToSvg(await res.text());
                    return;
                  } else {
                    const intArr = new Uint8Array(arrayBuffer);
                    delete image.url;
                    image.intArr = intArr;
                  }
                }
              }
            } catch (err) {
              console.warn("Could not fetch image", layer, err);
            }
          })
        )
      : Promise.resolve([]);
  }
const App = () => {
    const [loading, setLoading] = useState(false)
    const [few, setFew] = useState(false)
    const generate = () => {
        const input = document.createElement("input");

        input.type = "file";
        input.accept = "application/JSON";
        document.body.appendChild(input);
        input.style.visibility = "hidden";
        input.click();
        const onFocus = () => {
            setTimeout(() => {
              if (
                input.parentElement &&
                (!input.files || input.files.length === 0)
              ) {
                done();
              }
            }, 200);
          };

          const done = () => {
            input.remove();
            setLoading(false)
            window.removeEventListener("focus", onFocus);
          };

          window.addEventListener("focus", onFocus);

          // TODO: parse and upload images!
          input.addEventListener("change", (event) => {
            const file = (event.target as HTMLInputElement)
              .files![0];
            if (file) {
              setLoading(true)
              setTimeout(() => {
                setFew(true)
              }, 3000);
              var reader = new FileReader();

              // Closure to capture the file information.
              reader.onload = (e) => {
                const text = (e.target as any).result;
                try {
                  const json = JSON.parse(text);
                  Promise.all(
                    json.layers.map(async (rootLayer: Node) => {
                      await traverseLayers(
                        rootLayer,
                        (layer: any) => {
                          if (getImageFills(layer)) {
                            return processImages(layer).catch(
                              (err) => {
                                console.warn(
                                  "Could not process image",
                                  err
                                );
                              }
                            );
                          }
                        }
                      );
                    })
                  )
                    .then(() => {
                      parent.postMessage(
                        {
                          pluginMessage: {
                            type: "import",
                            count: 5,
                            data: json,
                          },
                        },
                        "*"
                      );
                      setTimeout(() => {
                        done();
                      }, 1000);
                    })
                    .catch((err) => {
                      done();
                      console.error(err);
                      alert(err);
                    });
                } catch (err) {
                  alert("File read error: " + err);
                  done();
                }
              };

              reader.readAsText(file);
            } else {
              done();
            }
          });
    }
    return(
        <div className = "text-center text-white">
            <h1 className = "py-4 text-2xl font-bold text-blue-400 border-b border-white">Doppel</h1>
            {
              loading?
              <div className = "flex flex-wrap items-center justify-center">
                <img src = {loadingGif} className = "w-24" />
                <p className = "w-full text-center">{few ? "This may take a few minutes..." : "Loading..."}</p>
              </div>
              :
              <p className = "px-2 mt-5 font-bold">Click <span className = "text-blue-400 cursor-pointer hover:text-blue-500 hover:underline" onClick = {generate}>Here</span> to upload your JSON file and generate your desired design</p>
            }
            
        </div>
    )
}
ReactDOM.render(<App />, document.getElementById('root'));