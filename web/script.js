var map = L.map("map", {
  center: [48.2082, 16.3738],
  zoom: 12,
  maxZoom: 23,
  minZoom: 10,
  maxBounds: [
    [48.0, 16.2],
    [48.4, 16.6],
  ],
}).setView([48.2082, 16.3738], 13); // Vienna center
var minZoom = 17; // Show parking spots only at zoom 15+
var tileSize = 0.005; // 500m in degrees (~WGS84 near Vienna)
var loadedTiles = new Map(); // Store loaded tiles
var displayedTiles = new Map();
var gridBounds = {
  minx: 16.20183574,
  miny: 48.12302008,
  maxx: 16.5464744,
  maxy: 48.31235361,
};
const infosLink = document.getElementById("infos-link");
const infos = document.getElementById("infos");
var zoomHint = document.getElementById("zoom-hint");

maplibregl.setRTLTextPlugin(
  "https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js"
);
L.maplibreGL({
  style:
    "https://tiles-eu.stadiamaps.com/styles/stamen_toner_lite.json?api_key=9cb5a2cf-4b74-4e87-ade1-320768b874d4",
  attribution:
    '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

function getVisibleTiles() {
  var bounds = map.getBounds();
  var minx = bounds.getWest();
  var miny = bounds.getSouth();
  var maxx = bounds.getEast();
  var maxy = bounds.getNorth();

  var tiles = [];
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
      tiles.push(`x${x}_y${y}.geojson`);
    }
  }
  return tiles;
}

function onEachFeature(feature, layer) {
  layer.on("click", function (e) {
    console.log(e);
  });
}

async function loadTiles() {
  if (map.getZoom() >= minZoom) {
    zoomHint.classList.add("hidden");
    var neededTileIds = getVisibleTiles();

    for (const tileId of neededTileIds) {
      if (!loadedTiles.get(tileId)) {
        response = await fetch(`parkplaetze/${tileId}`);
        if (!response.ok) throw new Error("Tile not found");
        data = await response.json();
        loadedTiles.set(
          tileId,
          await L.geoJSON(data, {
            style: { color: "blue", weight: 1, opacity: 0.7 },
            onEachFeature: onEachFeature,
          })
        );
      }
    }

    for (let [tileId, tile] of displayedTiles) {
      if (!neededTileIds.includes(tileId)) {
        map.removeLayer(tile);
        displayedTiles.delete(tileId);
      }
    }
    neededTileIds
      .filter((tileId) => !displayedTiles.get(tileId))
      .forEach((tileId) => {
        tile = loadedTiles.get(tileId);
        map.addLayer(tile);
        displayedTiles.set(tileId, tile);
      });
  } else {
    zoomHint.classList.remove("hidden");
    displayedTiles.forEach((value, _) => map.removeLayer(value));
    displayedTiles = new Map();
  }
}

map.on("zoomend moveend", loadTiles);
loadTiles();

infosLink.addEventListener("click", (event) => {
  event.stopPropagation();
  if (infos.classList.contains("visible")) {
    infos.classList.remove("visible");
    infosLink.textContent = "?";
  } else {
    infos.classList.add("visible");
    infosLink.textContent = "X";
  }
});
