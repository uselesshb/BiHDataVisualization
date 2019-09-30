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
    document.getElementById('files').addEventListener('change', handleFileSelect, false);

    for(let i = 0; i < relations.length; i++)
    {
        const feature = new ol.Feature({geometry: new ol.geom.MultiPolygon(relations[i].polygons)});
        feature.set("name", relations[i]["name"], true);
        feature.set("admin_level", relations[i]["admin_level"], true);
        all_features.push(feature);
    }

    //all_features[i].setStyle(new ol.style.Style({stroke: new ol.style.Stroke({color: "grey", width: 1}), fill: new ol.style.Fill({color: "rgba(0, 255, 0, 0.2)"})}));
});

function handleFileSelect(evt) {
    const file = evt.target.files[0];

    const reader = new FileReader();

    reader.addEventListener('load', function(e) {
        map.getLayers().getArray()[1].getSource().clear();
        const requested_features = e.target.result.split("\n"); //TODO windows new line style \r\n
        console.log(requested_features);
        for(let i = 0; i < requested_features.length; i++){
            for(let j = 0; j < all_features.length; j++){
                if(all_features[j].get("name") == requested_features[i]){
                    const feature = all_features[j];
                    const style = new ol.style.Style();
                    const stroke = new ol.style.Stroke({color: "grey", width: 2});
                    style.setStroke(stroke);
                    feature.setStyle(style);
                    map.getLayers().getArray()[1].getSource().addFeature(feature);
                    break;
                }
            }
        }
    });

    reader.readAsText(file);
}