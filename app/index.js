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

const wizardType = {
    NONE: "none",
    DATA: "data",
    STYLE: "style"
};

let currentWizard = wizardType.NONE;

const dataWizardTexts = [];
const styleWizardTexts = [];

window.addEventListener('DOMContentLoaded', (event) => {
    //initialize all_features array using areas data
    for(let i = 0; i < areas.length; i++)
    {
        const feature = new ol.Feature({geometry: new ol.geom.MultiPolygon(areas[i].polygons)});
        feature.set("name", areas[i].name, true);
        feature.set("admin_level", areas[i].admin_level, true);
        all_features.push(feature);
    }

    //add the first feature (BiH) to map
    map.getLayers().getArray()[1].getSource().addFeature(all_features[0]);

    //get dynamic labels
    let texts = document.querySelectorAll(".activate_on_data_wizard");
    texts.forEach(element => {
        dataWizardTexts.push(element);
    });

    texts = document.querySelectorAll(".activate_on_style_wizard");
    texts.forEach(element => {
        styleWizardTexts.push(element);
    });

    //add listener to "choose file" button
    const input = document.querySelector("#wizard_file_input");
    input.addEventListener('change', handleFileSelect);
});

function handleFileSelect(evt) {
    if (currentWizard == wizardType.DATA) {
        handleDataFileSelect(evt);
    } else {
        handleStyleFileSelect(evt);
    }
}
function handleDataFileSelect(evt) {
    clearFeatures();
    Papa.parse(evt.target.files[0], {
        complete: function(results) {
            const data = results.data;
            for(let i = 0; i < data.length; i++) {
                //validation check
                let line_valid = false;
                let line_data = data[i];
                let feature;
                if (line_data.length > 1) {
                    feature = all_features.find((f) => f.get("name") == line_data[0]);
                    if (feature) {
                        if (isValidInt(line_data[1])) {
                            line_valid = true;
                        }
                    }
                }
                
                if (line_valid) {
                    //correct feature found, add it to the map
                    const style = new ol.style.Style();
                    const stroke = new ol.style.Stroke({color: "grey", width: 1.25});
                    style.setStroke(stroke);
                    feature.setStyle(style);
                    feature.set("data", parseInt(line_data[1]), true);
                    map.getLayers().getArray()[1].getSource().addFeature(feature);
                }
            }
            setCurrentWizard(wizardType.STYLE);
        },
        delimiter: ";"
    });
}

function handleStyleFileSelect(evt) {
    Papa.parse(evt.target.files[0], {
        complete: function(results) {
            const data = results.data;
            //validation check
            let lines_valid = true;
            for(let i = 0; i < data.length; i++) {
                let line_data = data[i];
                let line_valid = false;
                if(line_data.length > 2)
                {
                    if (isValidInt(line_data[0])) {
                        if (isValidInt(line_data[1])) {
                            if (isValidRGBAValue(line_data[2])) {
                                line_valid = true;
                            }
                        }
                    }
                }
                if (!line_valid) {
                    line_valid = false;
                    break;
                }
            }

            if (lines_valid) {
                const features = map.getLayers().getArray()[1].getSource().getFeatures();
                for(let i = 0; i < features.length; i++) {
                    let found = false;
                    for(let j = 0; j < data.length; j++) {
                        let line_data = data[j];
                        if (features[i].get("data") > parseInt(line_data[0]) && features[i].get("data") <= parseInt(line_data[1])) {
                            //styling for this feature found, apply
                            const fill = new ol.style.Fill({color: line_data[2]});
                            features[i].getStyle().setFill(fill);
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        const fill = new ol.style.Fill({color: "rgba(0,0,0,1)"});
                        features[i].getStyle().setFill(fill);
                    }
                }
                map.getLayers().getArray()[1].getSource().changed();
                setCurrentWizard(wizardType.NONE);
            }
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
        case wizardType.NONE:
            setCurrentWizard(wizardType.DATA);
            break;
        case wizardType.DATA:
        case wizardType.STYLE:
            setCurrentWizard(wizardType.NONE);
            break;
        default:
    }
}

function setCurrentWizard(wizard) {
    currentWizard = wizard;
    const x = document.querySelector("#wizard");
    switch(currentWizard) {
        case wizardType.NONE:
            x.style.display = "none";
            break;
        case wizardType.DATA:
            x.style.display = "flex";
            break;
        case wizardType.STYLE:
            x.style.display = "flex";
            break;
        default:
    }
    setWizardTexts(currentWizard);
}

function setWizardTexts(wizard) {
    dataWizardTexts.forEach(element => {
        if (wizard == wizardType.DATA) {
            element.style.display = "block";
        } else {
            element.style.display = "none";
        }
    });
    styleWizardTexts.forEach(element => {
        if (wizard == wizardType.STYLE) {
            element.style.display = "block";
        } else {
            element.style.display = "none";
        }
    });
}

function isValidRGBAValue(s) {
    const p = /rgba\((\d+),(\d+),(\d+),(\d\.\d+)\)/;
    const result = s.match(p);
    if (result != null && result.length == 5) {
        let rgb_values_ok = true;
        let a_value_ok = false;
        for (let i = 1; i < 5; i++) {
            const x = parseInt(result[i]);
            if (x < 0 && x > 255) {
                rgb_values_ok = false;
            }
        }

        const a = parseFloat(result[4]);
        if(a >= 0.0 && a <= 1.0) {
            a_value_ok = true;
        }
        
        if (rgb_values_ok && a_value_ok) {
            return true;
        }
        
    }
    return false;
}

function isValidInt(s) {
    if (!isNaN(parseInt(s))) {
        return true;
    }
    return false;
}