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

const currentWizardEnum = {
    NONE: "none",
    DATA: "data",
    STYLE: "style"
};

let currentWizard = currentWizardEnum.NONE;

const dataWizardTexts = [];
const styleWizardTexts = [];

window.addEventListener('DOMContentLoaded', (event) => {
    for(let i = 0; i < areas.length; i++)
    {
        const feature = new ol.Feature({geometry: new ol.geom.MultiPolygon(areas[i].polygons)});
        feature.set("name", areas[i]["name"], true);
        feature.set("admin_level", areas[i]["admin_level"], true);
        all_features.push(feature);
    }

    map.getLayers().getArray()[1].getSource().addFeature(all_features[0]);

    let texts = document.querySelectorAll(".activate_on_data_wizard");
    texts.forEach(element => {
        dataWizardTexts.push(element);
    });

    texts = document.querySelectorAll(".activate_on_style_wizard");
    texts.forEach(element => {
        styleWizardTexts.push(element);
    });
});

function handleDataFileSelect(evt) {
    clearFeatures();

    Papa.parse(evt.target.files[0], {
        complete: function(results) {
            const data = results.data;
            for(let i = 0; i < data.length; i++) {
                let found = false;
                for(let j = 0; j < all_features.length; j++) {
                    if (all_features[j].get("name") == data[i][0]) {
                        const feature = all_features[j];
                        const style = new ol.style.Style();
                        const stroke = new ol.style.Stroke({color: "grey", width: 1.25});
                        style.setStroke(stroke);
                        feature.setStyle(style);
                        feature.set("data", parseInt(data[i][1]), true);
                        map.getLayers().getArray()[1].getSource().addFeature(feature);
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    console.log("Unknown feature: " + data[i][0]);
                }
            }
        },
        delimiter: ";"
    });
}

function handleStyleFileSelect(evt) {
    Papa.parse(evt.target.files[0], {
        complete: function(results) {
            const data = results.data;
            const features = map.getLayers().getArray()[1].getSource().getFeatures();
            for(let j = 0; j < features.length; j++) {
                let found = false;
                for(let i = 0; i < data.length; i++) {
                    if (features[j].get("data") > parseInt(data[i][0]) && features[j].get("data") <= parseInt(data[i][1])) {
                        const fill = new ol.style.Fill({color: data[i][2]});
                        features[j].getStyle().setFill(fill);
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    const fill = new ol.style.Fill({color: "rgba(0,0,0,1)"});
                    features[j].getStyle().setFill(fill);
                }
            }
            map.getLayers().getArray()[1].getSource().changed();
        },
        delimiter: ";"
    });
}

function clearFeatures() {
    const features = map.getLayers().getArray()[1].getSource().getFeatures();
    for(let i = 0; i < features.length; i++) {
        features[i].unset("data", true);
    }
    map.getLayers().getArray()[1].getSource().clear();
}

function onStartButtonClick() {
    switch(currentWizard) {
        case currentWizardEnum.NONE:
            setCurrentWizard(currentWizardEnum.DATA);
            break;
        case currentWizardEnum.DATA:
        case currentWizardEnum.STYLE:
            setCurrentWizard(currentWizardEnum.NONE);
            break;
        default:
    }
}

function setCurrentWizard(wizard) {
    currentWizard = wizard;
    const x = document.querySelector("#wizard");
    switch(currentWizard) {
        case currentWizardEnum.NONE:
            x.style.display = "none";

            break;
        case currentWizardEnum.DATA:
            x.style.display = "flex";
            break;
        case currentWizardEnum.STYLE:
            x.style.display = "flex";
            break;
        default:
    }
    setWizardTexts(currentWizard);
}

function setWizardTexts(wizard) {
    dataWizardTexts.forEach(element => {
        if (wizard == currentWizardEnum.DATA) {
            element.style.display = "block";
        } else {
            element.style.display = "none";
        }
    });
    styleWizardTexts.forEach(element => {
        if (wizard == currentWizardEnum.STYLE) {
            element.style.display = "none";
        } else {
            element.style.display = "none";
        }
    });
}