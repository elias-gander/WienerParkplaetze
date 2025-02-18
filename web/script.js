class StreetObject {
  constructor(name, id, assetName, takesUpFullSpot = false) {
    this.name = name;
    this.id = id;
    this.assetName = assetName;
    this.takesUpFullSpot = takesUpFullSpot;
  }
}

const parkingSpot = new StreetObject("Parkplatz", 1, "parkplatz", true);
const tree = new StreetObject("Baum", 2, "baum");
const flowerBed = new StreetObject("Blumenbeet", 3, "blumenbeet");
const raisedBed = new StreetObject("Hochbeet", 4, "hochbeet");
const seating = new StreetObject("Sitzgelegenheit", 5, "sitzgelegenheit");
const sidewalk = new StreetObject("Gehsteig", 6, "gehsteig");
const bikeLane = new StreetObject("Radweg", 7, "radweg");
const schanigarten = new StreetObject("Schanigarten", 8, "schanigarten", true);
const nothing = new StreetObject("Freifläche", 9, "freiflaeche");
const streetObjects = [
  parkingSpot,
  tree,
  flowerBed,
  raisedBed,
  seating,
  sidewalk,
  bikeLane,
  schanigarten,
  nothing,
];
const minZoom = 17;
const maxZoom = 21;
const tileSize = 0.005;
const gridBounds = {
  minx: 16.20183574,
  miny: 48.12302008,
  maxx: 16.5464744,
  maxy: 48.31235361,
};
const assetPixels = 159;
const zoomHintElement = document.getElementById("zoom-hint");
const loadingIndicatorElement = document.getElementById("loading-indicator");
const infosLinkElement = document.getElementById("infos-link");
const infosElement = document.getElementById("infos");
const remainingParkingSpotsElement = document.getElementById("stats-remaining");
const usedParkingSpotsElement = document.getElementById("stats-used");
const actionsElement = document.getElementById("actions");
const map = new maplibregl.Map({
  container: "map",
  style: "https://tiles.stadiamaps.com/styles/stamen_toner_lite.json",
  center: [16.3738, 48.2082],
  zoom: 12,
  maxZoom: maxZoom,
  minZoom: 10,
  maxBounds: [
    [gridBounds.minx, gridBounds.miny],
    [gridBounds.maxx, gridBounds.maxy],
  ],
});
var remainingParkingSpots = 258205;
var usedParkingSpots = 0;
var selectedFeature;

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

function placeStreetObject(newStreetObjectId, newTakesUpFullSpot) {
  if (!selectedFeature) {
    return;
  }
  const source = map.getSource(selectedFeature.source);
  const data = JSON.parse(JSON.stringify(source._data));
  data.features = data.features.map((feature) => {
    if (feature.id === selectedFeature.id) {
      const currentStreetObjectId =
        feature.properties.streetObjectId ?? parkingSpot.id;
      if (
        currentStreetObjectId === parkingSpot.id &&
        newStreetObjectId !== parkingSpot.id
      ) {
        usedParkingSpotsElement.textContent = format(++usedParkingSpots);
        remainingParkingSpotsElement.textContent = format(
          --remainingParkingSpots
        );
      }
      if (
        currentStreetObjectId !== parkingSpot.id &&
        newStreetObjectId === parkingSpot.id
      ) {
        usedParkingSpotsElement.textContent = format(--usedParkingSpots);
        remainingParkingSpotsElement.textContent = format(
          ++remainingParkingSpots
        );
      }
      const currentTakesUpFullSpot = streetObjects.find(
        (obj) => obj.id === currentStreetObjectId
      ).takesUpFullSpot;
      if (
        newTakesUpFullSpot ||
        currentTakesUpFullSpot ||
        feature.properties.streetObjectId2
      ) {
        feature.properties.streetObjectId = newStreetObjectId;
        feature.properties.streetObjectId2 = undefined;
      } else {
        feature.properties.streetObjectId2 = newStreetObjectId;
      }
    }
    return feature;
  });
  source.setData(data);
}

async function loadTiles() {
  if (map.getZoom() < minZoom) {
    return;
  }

  var neededTileIds = getVisibleTileIds();
  for (const tileId of neededTileIds) {
    if (!map.getSource(tileId)) {
      response = await fetch(`parkplaetze/${tileId}.geojson`);
      data = await response.json();
      map.addSource(tileId, { type: "geojson", data: data });
      map.addLayer({
        id: tileId,
        type: "fill",
        source: tileId,
        minzoom: minZoom,
        paint: {
          "fill-color": "blue",
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "isSelected"], false],
            0.2,
            0,
          ],
        },
      });
      streetObjects.forEach((obj) => {
        const layer = {
          id: `${tileId}_${obj.assetName}`,
          type: "symbol",
          source: tileId,
          minzoom: minZoom,
          filter: ["==", ["coalesce", ["get", "streetObjectId"], 1], obj.id],
          layout: {
            "icon-image": ["literal", obj.assetName],
            "icon-size": [
              "interpolate",
              ["exponential", 2],
              ["zoom"],
              minZoom,
              getPixelCount(5, minZoom) / assetPixels,
              maxZoom,
              getPixelCount(5, maxZoom) / assetPixels,
            ],
            "icon-rotate": ["get", "rotation"],
            "icon-allow-overlap": true,
            "icon-padding": 0,
            "icon-anchor": obj.takesUpFullSpot ? "center" : "left",
          },
        };
        map.addLayer(layer);
        if (!obj.takesUpFullSpot) {
          var additionalLayer = structuredClone(layer);
          additionalLayer.id += "_2";
          (additionalLayer.filter = [
            "==",
            ["coalesce", ["get", "streetObjectId2"], 1],
            obj.id,
          ]),
            (additionalLayer.layout["icon-anchor"] = "right");
          map.addLayer(additionalLayer);
        }
      });

      map.on("mouseenter", tileId, function () {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", tileId, function () {
        map.getCanvas().style.cursor = "";
      });
    }
  }
}

usedParkingSpotsElement.textContent = format(usedParkingSpots);
remainingParkingSpotsElement.textContent = format(remainingParkingSpots);
actionsElement.innerHTML = streetObjects
  .map(
    (obj) =>
      `<button onclick="placeStreetObject(${obj.id}, ${obj.takesUpFullSpot})"><img src="assets/${obj.assetName}.png"><span>${obj.name}</span></button>`
  )
  .join("");
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

  for (let obj of streetObjects) {
    const response = await map.loadImage(`assets/${obj.assetName}.png`);
    map.addImage(obj.assetName, response.data);
  }

  map.on("moveend", loadTiles);
  map.on("zoom", () => {
    if (map.getZoom() >= minZoom) {
      zoomHintElement.classList.add("hidden");
    } else {
      zoomHintElement.classList.remove("hidden");
      if (selectedFeature) {
        map.setFeatureState(selectedFeature, { isSelected: false });
        selectedFeature = undefined;
        actionsElement.classList.add("hidden");
      }
    }
  });
  map.on("click", (e) => {
    if (selectedFeature) {
      map.setFeatureState(selectedFeature, { isSelected: false });
      selectedFeature = undefined;
    }
    const feature = map
      .queryRenderedFeatures(e.point)
      .find((f) => f.layer.type === "fill" && f.source.match(/^x\d+_y\d+$/));
    if (!feature) {
      actionsElement.classList.add("hidden");
      return;
    }
    console.log(feature);
    const newSelectedFeature = { source: feature.source, id: feature.id };
    map.setFeatureState(newSelectedFeature, { isSelected: true });
    selectedFeature = newSelectedFeature;
    actionsElement.classList.remove("hidden");
  });

  await loadTiles();
});
