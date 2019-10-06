const all_features = [];

const vectorSource = new ol.source.Vector();

const vectorLayer = new ol.layer.Vector({
    source: vectorSource,
});

const tileLayer = new ol.layer.Tile({
    source: new ol.source.OSM()
});

const mapView = new ol.View({
    center: ol.proj.fromLonLat([17.450, 43.930]),
    zoom: 8.45
});

const map = new ol.Map({
    target: "map",
    layers: [
        tileLayer,
        vectorLayer
    ],
    view: mapView
});

window.addEventListener('DOMContentLoaded', (event) => {
    document.getElementById("data_file_input").addEventListener("change", handleDataFileSelect, false);
    document.getElementById("style_file_input").addEventListener("change", handleStyleFileSelect, false);

    for(let i = 0; i < relations.length; i++)
    {
        const feature = new ol.Feature({geometry: new ol.geom.MultiPolygon(relations[i].polygons)});
        feature.set("name", relations[i]["name"], true);
        feature.set("admin_level", relations[i]["admin_level"], true);
        all_features.push(feature);
    }

    map.getLayers().getArray()[1].getSource().addFeature(all_features[0]);
});

function handleDataFileSelect(evt) {
    const file = evt.target.files[0];

    const reader = new FileReader();

    reader.addEventListener("load", function(e) {
        //clear features from vector source
        const features = map.getLayers().getArray()[1].getSource().getFeatures();
        for(let i = 0; i < features.length; i++){
            features[i].unset("data", true);
        }
        map.getLayers().getArray()[1].getSource().clear();

        //read rows from data file and add the requested features to vector source
        const data_rows = e.target.result.split(/\r?\n/);
        for(let i = 0; i < data_rows.length; i++){
            const row = data_rows[i].split(";");
            let found = false;
            for(let j = 0; j < all_features.length; j++){
                if(all_features[j].get("name") == row[0]){
                    const feature = all_features[j];
                    const style = new ol.style.Style();
                    const stroke = new ol.style.Stroke({color: "grey", width: 1.25});
                    style.setStroke(stroke);
                    feature.setStyle(style);
                    feature.set("data", parseInt(row[1]), true);
                    map.getLayers().getArray()[1].getSource().addFeature(feature);
                    found = true;
                    break;
                }
            }
            if(!found){
                console.log("Unknown feature: " + row[0]);
            }
        }
    });

    reader.readAsText(file);
}

function handleStyleFileSelect(evt) {
    const file = evt.target.files[0];

    const reader = new FileReader();

    reader.addEventListener("load", function(e) {
        //read rows from style file and change fill colors for features in vector source
        const style_rows = e.target.result.split(/\r?\n/);
        const features = map.getLayers().getArray()[1].getSource().getFeatures();
        for(let j = 0; j < features.length; j++){
            let found = false;
            for(let i = 0; i < style_rows.length; i++){
                const row = style_rows[i].split(";");
                if(features[j].get("data") > parseInt(row[0]) && features[j].get("data") <= parseInt(row[1])){
                    console.log(typeof(features[j].get("data")));
                    const fill = new ol.style.Fill({color: row[2]});
                    features[j].getStyle().setFill(fill);
                    found = true;
                    break;
                }
            }
            if(!found){
                const fill = new ol.style.Fill({color: "rgba(0,0,0,1)"});
                features[j].getStyle().setFill(fill);
            }
        }

        map.getLayers().getArray()[1].getSource().changed();
    });

    reader.readAsText(file);
}