// declare the map variable here to give it a global scope
let myMap;
// currently-displayed GeoJSON layer (used for resetStyle on hover)
let currentGeoJson = null;

// we might as well declare our baselayer(s) here too
const CartoDB_Positron = L.tileLayer(
	'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', 
	{
		attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
	}
);


// Add a new tile layer (Esri World Imagery)
const Esri_WorldImagery = L.tileLayer(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {
        attribution: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }
);

// add the basemap style(s) to a JS object for the layer control
let baseLayers = {
	"CartoDB": CartoDB_Positron,
	"Esri World Imagery": Esri_WorldImagery
};

function initialize(){
	// attach change listener to dropdown so we don't use inline handlers
	const sel = document.getElementById('mapdropdown');
	if (sel) {
		sel.addEventListener('change', function(e){
			loadMap(e.target.value);
		});
	}

	// load the default map
	loadMap();
};

function fetchData(url){
    //load the data
    fetch(url)
        .then(function(response){
            return response.json();
        })
        .then(function(json){
			//create a Leaflet GeoJSON layer using the fetched json and add it to the map object
			// store the layer so we can call resetStyle() from event handlers
			if (currentGeoJson) {
				try { currentGeoJson.remove(); } catch (e) { /* ignore */ }
				currentGeoJson = null;
			}
			currentGeoJson = L.geoJson(json, {style: styleAll, pointToLayer: generateCircles, onEachFeature: addPopups}).addTo(myMap);
        })
};
function generateCircles(feature, latlng) {
	// apply styling from styleAll so different datasets (cities vs stations)
	const opts = styleAll(feature);
	return L.circleMarker(latlng, opts);
}

function styleAll(feature, latlng) {
	var styles = {dashArray: null, dashOffset: null, lineJoin: null, lineCap: null, stroke: false, color: '#000', opacity: 1, weight: 1, fillColor: '#fff', fillOpacity: 0.5, radius: 6 };

	// Defensive: ensure properties exist
	const props = feature && feature.properties ? feature.properties : {};

	// If this is a megacity dataset (capitalized 'City' property), make it red and more visible
	if (props.City || props.City === '') {
		styles.fillColor = 'red';
		styles.fillOpacity = 0.8;
		styles.radius = 8;
		styles.stroke = true;
		styles.color = '#800';
		styles.weight = 1;
	} else {
		// Points that are train stations: use cyan when postal_code exists
		if (props.postal_code) {
			styles.fillColor = 'cyan';
		} else {
			styles.fillColor = '#fff';
		}
		styles.fillOpacity = 0.5;
		styles.stroke = true;
		styles.radius = 6;
	}

	return styles;
}

function addPopups(feature, layer) {
	// Format popup HTML depending on dataset
	let popupHtml = '';
	const props = feature && feature.properties ? feature.properties : {};

	if (props.City) {
		// megacities dataset
		popupHtml += '<div class="popup-city">';
		popupHtml += '<strong>City:</strong> ' + props.City + '<br/>';
		if (props.Population) {
			popupHtml += '<strong>Population:</strong> ' + props.Population.toLocaleString();
		}
		popupHtml += '</div>';
	} else if (props.stat_name) {
		// train stations dataset
		popupHtml += '<div class="popup-station">';
		popupHtml += '<strong>Station:</strong> ' + props.stat_name + '<br/>';
		if (props.city) popupHtml += '<strong>City:</strong> ' + props.city + '<br/>';
		if (props.province) popupHtml += '<strong>Province:</strong> ' + props.province;
		popupHtml += '</div>';
	} else {
		// generic fallback
		const name = props.name || props.NAME || props.city || props.stat_name || props.City || 'Unknown';
		popupHtml = '<div><strong>Name:</strong> ' + name + '</div>';
	}

	layer.bindPopup(popupHtml);

	// add hover highlight handlers
	layer.on({
		mouseover: function(e) {
			const target = e.target;
			// visual highlight: stronger border and higher fill opacity
			try {
				target.setStyle({ weight: 2, color: '#FFD54F', fillOpacity: 1 });
			} catch (err) {
				// some layers (Markers) may not support setStyle
			}
			if (target.bringToFront) target.bringToFront();
		},
		mouseout: function(e) {
			const target = e.target;
			// reset style using the stored geojson layer
			if (currentGeoJson && typeof currentGeoJson.resetStyle === 'function') {
				try { currentGeoJson.resetStyle(target); } catch (err) { /* ignore */ }
			}
		}
	});

	// Get the geographic coordinates of the layer (left here if needed later)
	// let latlng = layer.getLatLng();

}

function loadMap(mapid){
	// default to 'mapa' when no id is provided
	if (!mapid) mapid = 'mapa';

	// remove any existing map instance so switching maps works cleanly
	if (myMap) {
		try {
			myMap.remove();
		} catch (e) {
			console.warn('Error removing existing map:', e);
		}
		myMap = null;
	}

	// choose map options and dataset URL based on the selected map id
	let mapOptions;
	let dataUrl;

	if (mapid === 'mapa') {
		// Map A: train stations (Canada-focused)
		mapOptions = {
			center: [46.58, -78.19],
			zoom: 5,
			maxZoom: 18,
			minZoom: 3,
			layers: CartoDB_Positron
		};
		dataUrl = "https://raw.githubusercontent.com/brubcam/GEOG-464_Lab-7/main/DATA/train-stations.geojson";
	} else if (mapid === 'mapb') {
		// Map B: megacities (global view)
		mapOptions = {
			center: [20, 0],
			zoom: 2,
			maxZoom: 6,
			minZoom: 1,
			layers: CartoDB_Positron
		};
		dataUrl = "https://raw.githubusercontent.com/brubcam/GEOG-464_Lab-7/main/DATA/megacities.geojson";
	} else {
		// fallback: behave like mapa
		mapOptions = {
			center: [46.58, -78.19],
			zoom: 5,
			maxZoom: 18,
			minZoom: 3,
			layers: CartoDB_Positron
		};
		dataUrl = "https://raw.githubusercontent.com/brubcam/GEOG-464_Lab-7/main/DATA/train-stations.geojson";
	}

	// create the map with the chosen options
	myMap = L.map('mapdiv', mapOptions);

	// declare basemap selector widget
	let lcontrol = L.control.layers(baseLayers);

	// load the selected dataset
	fetchData(dataUrl);

	// add the layer control to the map
	lcontrol.addTo(myMap);

	// position the custom map selector below Leaflet's zoom control if present
	try {
		const mapDiv = document.getElementById('mapdiv');
		const controlsEl = mapDiv ? mapDiv.querySelector('.map-controls') : null;
		const zoomEl = mapDiv ? mapDiv.querySelector('.leaflet-control-zoom') : null;
		if (controlsEl) {
			if (zoomEl) {
				const zoomRect = zoomEl.getBoundingClientRect();
				const mapRect = mapDiv.getBoundingClientRect();
				const topPx = (zoomRect.top - mapRect.top) + zoomRect.height + 8; // 8px gap
				controlsEl.style.top = topPx + 'px';
			} else {
				// fallback
				controlsEl.style.top = '80px';
			}
		}
	} catch (e) {
		// ignore positioning errors
	}
};

window.onload = initialize();