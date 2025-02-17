class StreetObject {
  constructor(name, id, assetName, takesUpFullSpot = false) {
    this.name = name;
    this.id = id;
    this.assetName = assetName;
    this.takesUpFullSpot = takesUpFullSpot;
  }
}

const car = new StreetObject("Kfz", 1, "kfz", true);
const tree = new StreetObject("Baum", 2, "baum");
const flowerBed = new StreetObject("Blumenbeet", 3, "blumenbeet");
const raisedBed = new StreetObject("Hochbeet", 4, "hochbeet");
const seating = new StreetObject("Sitzgelegenheit", 5, "sitzgelegenheit");
const sidewalk = new StreetObject("Gehsteig", 6, "gehsteig");
const bikeLane = new StreetObject("Radweg", 7, "radweg");
const schanigarten = new StreetObject("Schanigarten", 8, "schanigarten", true);
const nothing = new StreetObject("Freifläche", 9, "freiflaeche");
const streetObjects = [
  car,
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
const zoomHint = document.getElementById("zoom-hint");
const infosLink = document.getElementById("infos-link");
const infos = document.getElementById("infos");
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

function onClick(e) {
  const feature = e.features[0];
  map.setFeatureState(
    { source: feature.source, id: feature.id },
    { selected: true }
  );

  const bbox = turf.bbox(
    map
      .getSource(feature.source)
      ._data.features.find((f) => f.id === feature.id)
  );
  const northLng = (bbox[0] + bbox[2]) / 2;
  const northLat = bbox[3];
  const northLngLat = [northLng, northLat];
  const southLng = (bbox[0] + bbox[2]) / 2;
  const southLat = bbox[1];
  const southLngLat = [southLng, southLat];
  const northPoint = map.project(northLngLat);
  const popupHeight = 150;
  let popupLngLat;
  let popupAnchor;
  if (northPoint.y - popupHeight >= 0) {
    popupLngLat = northLngLat;
    popupAnchor = "bottom";
  } else {
    popupLngLat = southLngLat;
    popupAnchor = "top";
  }
  let popup = new maplibregl.Popup({ anchor: popupAnchor })
    .setLngLat(popupLngLat)
    .setHTML(
      streetObjects
        .map(
          (obj) =>
            `<button onclick="placeStreetObject(\'${feature.source}\', ${feature.id}, ${obj.id}, ${obj.takesUpFullSpot})">${obj.name}</button>`
        )
        .join("")
    );
  popup.on("close", () => {
    map.setFeatureState(
      { source: feature.source, id: feature.id },
      { selected: false }
    );
  });
  popup.addTo(map);
}

function placeStreetObject(
  sourceId,
  featureId,
  streetObjectId,
  newTakesUpFullSpot
) {
  const source = map.getSource(sourceId);
  const data = JSON.parse(JSON.stringify(source._data));
  data.features = data.features.map((feature) => {
    if (feature.id === featureId) {
      const currentTakesUpFullSpot = streetObjects.find(
        (obj) => obj.id === (feature.properties.streetObjectId ?? car.id)
      ).takesUpFullSpot;
      if (
        newTakesUpFullSpot ||
        currentTakesUpFullSpot ||
        feature.properties.streetObjectId2
      ) {
        feature.properties.streetObjectId = streetObjectId;
        feature.properties.streetObjectId2 = null;
      } else {
        feature.properties.streetObjectId2 = streetObjectId;
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
            ["boolean", ["feature-state", "selected"], false],
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

      map.on("click", tileId, onClick);
      map.on("mouseenter", tileId, function () {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", tileId, function () {
        map.getCanvas().style.cursor = "";
      });
    }
  }
}

infosLink.addEventListener("click", () => {
  if (infos.classList.contains("visible")) {
    infos.classList.remove("visible");
    infosLink.textContent = "?";
  } else {
    infos.classList.add("visible");
    infosLink.textContent = "X";
  }
});
map.on("load", async () => {
  for (let obj of streetObjects) {
    const response = await map.loadImage(`assets/${obj.assetName}.png`);
    map.addImage(obj.assetName, response.data);
  }

  map.on("moveend", loadTiles);
  map.on("zoom", () => {
    if (map.getZoom() >= minZoom) {
      zoomHint.classList.add("hidden");
    } else {
      zoomHint.classList.remove("hidden");
    }
  });

  await loadTiles();
});
