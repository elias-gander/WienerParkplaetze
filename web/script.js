const minZoom = 17;
const maxZoom = 21;
const tileSize = 0.005;
const gridBounds = {
  minx: 16.20183574,
  miny: 48.12302008,
  maxx: 16.5464744,
  maxy: 48.31235361,
};
const assetPixels = 256;
const vehicleAssetRotations = [
  0, 22, 45, 68, 90, 112, 135, 158, 180, 202, 225, 248, 270, 292, 315, 338,
];
const vehicleAssetCount = 5;
const treeAssetCount = 1;
const zoomHintElement = document.getElementById("zoom-hint");
const loadingIndicatorElement = document.getElementById("loading-indicator");
const infosLinkElement = document.getElementById("infos-link");
const infosElement = document.getElementById("infos");
const remainingParkingSpotsElement = document.getElementById(
  "remaining-parking-spots"
);
const treesPlantedElement = document.getElementById("trees-planted");
const explosionElement = document.getElementById("explosion");
const map = new maplibregl.Map({
  container: "map",
  style: "https://tiles.stadiamaps.com/styles/stamen_toner_lite.json",
  center: [16.3738, 48.2082],
  zoom: 12,
  maxZoom: maxZoom,
  minZoom: 10,
  pitch: 20,
  dragRotate: false,
  pitchWithRotate: false,
  rollEnabled: false,
  touchPitch: false,
  touchZoomRotate: false,
  maxBounds: [
    [gridBounds.minx, gridBounds.miny],
    [gridBounds.maxx, gridBounds.maxy],
  ],
});
var remainingParkingSpots = 258205;
var treesPlanted = 0;
var isPlanting = false;

function getVisibleTileIds() {
  var bounds = map.getBounds();
  var minx = bounds.getWest();
  var miny = bounds.getSouth();
  var maxx = bounds.getEast();
  var maxy = bounds.getNorth();
  var tileIds = [];
  for (
    var x = Math.floor((minx - gridBounds.minx) / tileSize);
    x <= Math.floor((maxx - gridBounds.minx) / tileSize);
    x++
  ) {
    for (
      var y = Math.floor((miny - gridBounds.miny) / tileSize);
      y <= Math.floor((maxy - gridBounds.miny) / tileSize);
      y++
    ) {
      tileIds.push(`x${x}_y${y}`);
    }
  }
  return tileIds;
}

function getPixelCount(metres, zoom) {
  const lat = map.getCenter().lat;
  const earthCircumference = 40075016.686;
  const metersPerPixel =
    (earthCircumference * Math.cos((lat * Math.PI) / 180)) /
    Math.pow(2, zoom + 8);
  return metres / metersPerPixel;
}

function format(number) {
  return new Intl.NumberFormat("de-DE", { useGrouping: "always" }).format(
    number
  );
}

function plantTree(lngLat, sourceId, featureId) {
  if (isPlanting) {
    return;
  }
  isPlanting = true;
  setTimeout(
    () => explosionElement.setAttribute("src", "assets/explosion.gif"),
    0
  );
  const marker = new maplibregl.Marker({ element: explosionElement })
    .setLngLat(lngLat)
    .addTo(map);
  explosionElement.style.width = `${getPixelCount(10, map.getZoom())}px`;

  setTimeout(() => {
    explosionElement.setAttribute("src", "");
    marker.remove();
    isPlanting = false;
  }, 1000);
  setTimeout(() => {
    const source = map.getSource(sourceId);
    const data = JSON.parse(JSON.stringify(source._data));
    data.features = data.features.map((feature) => {
      if (feature.id === featureId) {
        if (!feature.properties.isTree) {
          treesPlantedElement.textContent = format(++treesPlanted);
          remainingParkingSpots.textContent = format(--remainingParkingSpots);
          feature.properties.isTree = true;
        }
      }
      return feature;
    });
    source.setData(data);
  }, 400);
}

async function loadTiles() {
  if (map.getZoom() < minZoom) {
    return;
  }

  const neededTileIds = getVisibleTileIds();
  for (const tileId of neededTileIds) {
    if (!map.getSource(tileId)) {
      response = await fetch(`parkplaetze/${tileId}.geojson`);
      data = await response.json();
      map.addSource(tileId, { type: "geojson", data: data });
      map.addLayer(
        {
          id: tileId,
          type: "fill",
          source: tileId,
          minzoom: minZoom,
          paint: {
            "fill-opacity": 0,
          },
        },
        "3d-buildings"
      );
      map.addLayer(
        {
          id: tileId + "_line",
          type: "line",
          source: tileId,
          minzoom: minZoom,
          filter: ["==", ["coalesce", ["get", "isTree"], false], false],
          paint: {
            "line-opacity": 0.2,
            "line-dasharray": [3, 2],
            "line-width": [
              "interpolate",
              ["exponential", 2],
              ["zoom"],
              minZoom,
              getPixelCount(0.2, minZoom),
              maxZoom,
              getPixelCount(0.2, maxZoom),
            ],
            "line-offset": [
              "interpolate",
              ["exponential", 2],
              ["zoom"],
              minZoom,
              getPixelCount(0.1, minZoom),
              maxZoom,
              getPixelCount(0.1, maxZoom),
            ],
          },
        },
        "3d-buildings"
      );
      for (let i = 0; i < vehicleAssetCount; i++) {
        for (rotation of vehicleAssetRotations) {
          map.addLayer(
            {
              id: `${tileId}_vehicle${i}_${rotation}`,
              type: "symbol",
              source: tileId,
              minzoom: minZoom,
              filter: [
                "all",
                ["==", ["coalesce", ["get", "isTree"], false], false],
                ["==", ["get", "rotation"], rotation],
                ["==", ["get", "vehicle_id"], i],
              ],
              layout: {
                "icon-image": ["literal", `vehicle${i}_${rotation}`],
                "icon-size": [
                  "interpolate",
                  ["exponential", 2],
                  ["zoom"],
                  minZoom,
                  getPixelCount(10, minZoom) / assetPixels,
                  maxZoom,
                  getPixelCount(10, maxZoom) / assetPixels,
                ],
                "icon-allow-overlap": true,
                "icon-padding": 0,
              },
            },
            "3d-buildings"
          );
        }
      }
      for (let i = 0; i < treeAssetCount; i++) {
        map.addLayer(
          {
            id: `${tileId}_tree${i}`,
            type: "symbol",
            source: tileId,
            minzoom: minZoom,
            filter: ["==", ["coalesce", ["get", "isTree"], false], true],
            layout: {
              "icon-image": ["literal", `tree${i}`],
              "icon-size": [
                "interpolate",
                ["exponential", 2],
                ["zoom"],
                minZoom,
                getPixelCount(10, minZoom) / assetPixels,
                maxZoom,
                getPixelCount(10, maxZoom) / assetPixels,
              ],
              "icon-allow-overlap": true,
              "icon-padding": 0,
            },
          },
          "3d-buildings"
        );
      }

      map.on("mousemove", tileId, (e) => {
        map.getCanvas().style.cursor = e.features[0].properties.isTree
          ? ""
          : "crosshair";
      });
      map.on("mouseleave", tileId, (e) => {
        map.getCanvas().style.cursor = "";
      });
      map.on("click", tileId, (e) => {
        if (!e.features[0].properties.isTree) {
          plantTree(e.lngLat, tileId, e.features[0].id);
        }
      });
    }
  }
}

treesPlantedElement.textContent = format(treesPlanted);
remainingParkingSpotsElement.textContent = format(remainingParkingSpots);
infosLinkElement.addEventListener("click", () => {
  if (infosElement.classList.contains("visible")) {
    infosElement.classList.remove("visible");
    infosLinkElement.textContent = "?";
  } else {
    infosElement.classList.add("visible");
    infosLinkElement.textContent = "X";
  }
});
map.on("load", async () => {
  map.on("sourcedata", (e) => {
    loadingIndicatorElement.classList.remove("hidden");
  });
  map.on("idle", () => {
    loadingIndicatorElement.classList.add("hidden");
  });

  for (let i = 0; i < vehicleAssetCount; i++) {
    for (rotation of vehicleAssetRotations) {
      const response = await map.loadImage(
        `assets/vehicles/sampled_tiles/vehicle${i}_${rotation}.png`
      );
      map.addImage(`vehicle${i}_${rotation}`, response.data);
    }
  }
  for (let i = 0; i < treeAssetCount; i++) {
    const response = await map.loadImage(`assets/tree${i}.png`);
    map.addImage(`tree${i}`, response.data);
  }

  map.on("zoom", () => {
    if (map.getZoom() >= minZoom) {
      zoomHintElement.classList.add("hidden");
    } else {
      zoomHintElement.classList.remove("hidden");
    }
  });

  map.addSource("openmaptiles", {
    url: `https://api.maptiler.com/tiles/v3/tiles.json?key=ud46ehKwd6sMnWr8iEjZ`,
    type: "vector",
  });
  map.addLayer({
    id: "3d-buildings",
    source: "openmaptiles",
    "source-layer": "building",
    type: "fill-extrusion",
    minzoom: minZoom,
    filter: ["!=", ["get", "hide_3d"], true],
    paint: {
      "fill-extrusion-color": "lightgray",
      "fill-extrusion-height": ["get", "render_height"],
      "fill-extrusion-opacity": 0.5,
    },
  });

  map.on("moveend", loadTiles);
  await loadTiles();
});
