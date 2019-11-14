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
    DATA_OK: "data_ok",
    DATA_ERROR: "data_error",
    STYLE: "style",
    STYLE_ERROR: "style_error"
};

let currentWizard = wizardType.NONE;

let timeoutFunctionId = 0;

window.addEventListener('DOMContentLoaded', (event) => {
    //initialize all_features array using areas data
    let x = document.querySelector("#area_names_text");
    for(let i = 0; i < areas.length; i++)
    {
        const feature = new ol.Feature({geometry: new ol.geom.MultiPolygon(areas[i].polygons)});
        feature.set("name", areas[i].name, true);
        feature.set("admin_level", areas[i].admin_level, true);
        all_features.push(feature);

        x.innerHTML = x.innerHTML + areas[i].name + "\n";
    }

    //add the first feature (BiH) to map
    map.getLayers().getArray()[1].getSource().addFeature(all_features[0]);

    //add listener to "choose file" button
    const input = document.querySelector("#wizard_file_input");
    input.addEventListener("change", handleFileSelect);
});

window.addEventListener("click", function(e){  
    //clicking outside the wizard or start button closes the wizard
    let wizard =  document.querySelector("#wizard");
    let startButton =  document.querySelector("#start_button");
    if (!wizard.contains(e.target) && !startButton.contains(e.target) && currentWizard != wizardType.NONE) {
        setCurrentWizard(wizardType.NONE);
        clearTimeout(timeoutFunctionId);
        resetMap();
    }
  });

function handleFileSelect(evt) {
    switch(currentWizard) {
        case wizardType.DATA:
        case wizardType.DATA_ERROR:
            handleDataFileSelect(evt);
            break;
        
        case wizardType.STYLE:
        case wizardType.STYLE_ERROR:
            handleStyleFileSelect(evt);
            break;
    }
}
function handleDataFileSelect(evt) {
    clearFeatures();
    Papa.parse(evt.target.files[0], {
        complete: function(results) {
            const data = results.data;
            let file_valid = true;
            for(let i = 0; i < data.length; i++) {
                //validation check
                let line_valid = false;
                let error = "";
                let line_data = data[i];
                let feature;
                if (line_data.length > 1) {
                    feature = all_features.find((f) => f.get("name") == line_data[0]);
                    if (feature) {
                        if (isValidInt(line_data[1])) {
                            line_valid = true;
                        }
                        else {
                            error = "Greška! U liniji " + (i+1).toString() + ": Nevažeći broj (" + line_data[1] + ")";
                        }
                    }
                    else {
                        error = "Greška! U liniji " + (i+1).toString() + ": Nepoznato područje (" + line_data[0] + ")";
                    }
                }
                else {
                    error = "Greška! U liniji " + (i+1).toString() + ": Nedovoljan broj podataka, potrebno ime područja i brojčana vrijednost."
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
                else {
                    file_valid = false;
                    setErrorText(error);
                    break;
                }
            }
            if (file_valid) {
                setCurrentWizard(wizardType.DATA_OK);
                timeoutFunctionId = setTimeout(() => {
                    setCurrentWizard(wizardType.STYLE);
                }, 1000);
            }
            else {
                setCurrentWizard(wizardType.STYLE_ERROR);
            }
        },
        delimiter: ";"
    });
}

function handleStyleFileSelect(evt) {
    Papa.parse(evt.target.files[0], {
        complete: function(results) {
            const data = results.data;
            //validation check
            let file_valid = true;
            for(let i = 0; i < data.length; i++) {
                let line_data = data[i];
                let line_valid = false;
                let error = "";
                if(line_data.length > 2)
                {
                    if (isValidInt(line_data[0])) {
                        if (isValidInt(line_data[1])) {
                            if (isValidRGBAValue(line_data[2])) {
                                line_valid = true;
                            }
                            else {
                                error = "Greška! U liniji " + (i+1).toString() + ": Nevažeća RGBA vrijednost (" + line_data[2] + ")";
                            }
                        }
                        else {
                            error = "Greška! U liniji " + (i+1).toString() + ": Nevažeći broj (" + line_data[1] + ")";
                        }
                    }
                    else {
                        error = "Greška! U liniji " + (i+1).toString() + ": Nevažeći broj (" + line_data[0] + ")";
                    }
                }
                else {
                    error = "Greška! U liniji " + (i+1).toString() + ": Nedovoljan broj podataka, potreban početak raspona, kraj raspona i RGBA vrijednost."
                }
                if (!line_valid) {
                    file_valid = false;
                    setErrorText(error);
                    break;
                }
            }
            if (file_valid) {
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
            else {
                setCurrentWizard(wizardType.STYLE_ERROR);
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

function resetMap() {
    clearFeatures();
    map.getLayers().getArray()[1].getSource().addFeature(all_features[0]);
}

function onStartButtonClick() {
    if (currentWizard == wizardType.NONE) {
        setCurrentWizard(wizardType.DATA);
        resetMap();
    }
}

function onAreaNamesButtonClick() {
    let x = document.querySelector("#area_names_text");
    if (x.style.display == "none" || x.style.display == "") {
        x.style.display = "block";
    }
    else {
        x.style.display = "none";
    }
}

function setCurrentWizard(wizard) {
    if (currentWizard != wizard) {
        currentWizard = wizard;
        const x = document.querySelector("#wizard");
        switch(currentWizard) {
            case wizardType.NONE:
                x.style.display = "none";
                break;
            case wizardType.DATA:
            case wizardType.STYLE:
                x.style.display = "flex";
                break;
            default:
        }
    
        let scriptActivatedElements = x.querySelectorAll(".script_activated");
        scriptActivatedElements.forEach(element => {
            if (element.classList.contains(currentWizard)) {
                element.style.display = "block";
            } else {
                element.style.display = "none";
            }
        }); 
    }
}

function isValidRGBAValue(s) {
    const p = /rgba\((\d+), ?(\d+), ?(\d+), ?(\d\.\d+)\)/;
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

function setErrorText(error) {
    const x = document.querySelector("#error_text");
    x.innerHTML = error;
}