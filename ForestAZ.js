// Features /////
///////////////////////////////////////////////////////////////////
var SM = ee.FeatureCollection("users/Manuferu/SM_Admin0"),
    forest = ee.FeatureCollection("users/Manuferu/Perimetroforestal_SM"),
    table = ee.FeatureCollection("users/Manuferu/Points"),
    dem = ee.Image("USGS/SRTMGL1_003");


///////////////////////////////////// ForestAZ project
// Authors: Manuel Fernandez and Artur Gil
// contact: manuel.fernandez@ichec.ie 
//////////////////////////////////////

// A UI to interactively filter a collection, select an individual image
// from the results, display it with a variety of visualizations, and export it.

// The namespace for our application.  
var app = {};

app.createPanels = function() {
/* The introduction section. */
  app.intro = {
    legend: ui.Panel({style: {position: "top-left", padding: "8px 15px"}}),
    panel: ui.Panel([
      ui.Label({value: 'ForestAz app', style: {fontWeight: "bold", fontSize: "18px", margin: "0 0 4px 0", padding: "0"}}),
      ui.Label('Welcome to the Azorean Forest Monitoring App - ForestAz. The application aims to support a cost-effective semi-automatic monitoring of the Public Forest Perimeter of São Miguel island.'),
      ui.Label({value: "See the chapter  published in book: The Ever Growing use of Copernicus across Europe’s Regions: a selection of 99 user stories by local and regional authorities, Publisher: NEREUS / European Space Agency / European Commission, pp.102-103", style: {fontWeight: "normal", fontSize: "12px", maxWidth: "500px", margin: "0 0 4px 0", padding: "0"}}).setUrl("https://www.researchgate.net/publication/329170562_Sentinel-based_Azores_Regional_Forest_Inventory")
    ]),
  };

  /* The collection filter controls. */
  app.filters = {
    mapCenter: ui.Checkbox({label: 'Filter to map center', value: true}),
    
    startDate: ui.Textbox('YYYY-MM-DD', '2020-07-10'),
    //: ui.DateSlider({start: '2021-01-01', style: {width: '400px'}}),
    endDate: ui.Textbox('YYYY-MM-DD', '2020-10-23'),
    cloudpercentage: ui.Textbox("XX","10"),
    applyButton: ui.Button('Apply filters', app.applyFilters),
    loadingLabel: ui.Label({
      value: 'Loading...',
      style: {stretch: 'vertical', color: 'blue', shown: false}
    })
  };

  /* The panel for the filter control widgets. */
  app.filters.panel = ui.Panel({
    widgets: [ 
      ui.Label('Filters', {fontWeight: 'bold'}),
      ui.Label('Start date', app.HELP_TEXT_STYLE), app.filters.startDate,
      ui.Label('End date', app.HELP_TEXT_STYLE), app.filters.endDate,
      ui.Label('Cloud cover',app.HELP_TEXT_STYLE),app.filters.cloudpercentage,
      app.filters.mapCenter,
      
      ui.Panel([
        app.filters.applyButton,
        app.filters.loadingLabel
      ], ui.Panel.Layout.flow('horizontal'))
    ],
    style: app.SECTION_STYLE
  });
  
 

  /* The image picker section. */
  app.picker = {
    // Create a select with a function that reacts to the "change" event.
    select: ui.Select({
      placeholder: 'Select an image ID',
      onChange: app.refreshMapLayer
    }),
    // Create a button that centers the map on a given object.
    centerButton: ui.Button('Center on map', function() {
      Map.centerObject(Map.layers().get(0).get('eeObject'));
    })
  };

  /* The panel for the picker section with corresponding widgets. */
  app.picker.panel = ui.Panel({
    widgets: [
      ui.Label('Select an image', {fontWeight: 'bold'}),
      ui.Panel([
        app.picker.select,
        app.picker.centerButton
      ], ui.Panel.Layout.flow('horizontal'))
    ],
    style: app.SECTION_STYLE
  });

  /* The visualization section. */
  app.vis = {
    label: ui.Label(),
    // Create a select with a function that reacts to the "change" event.
    select: ui.Select({
      items: Object.keys(app.VIS_OPTIONS),
      onChange: function() {
        // Update the label's value with the select's description.
        
        var option = app.VIS_OPTIONS[app.vis.select.getValue()];
        app.vis.label.setValue(option.description);
        // Refresh the map layer.
        app.refreshMapLayer();
      }
    })
  };
  


  /* The panel for the visualization section with corresponding widgets. */
  app.vis.panel = ui.Panel({
    widgets: [
      ui.Label('Vegetation Assessment (São Miguel Island)', {fontWeight: 'bold', color:'Green'}),
      app.vis.select,
      app.vis.label
    ],
    style: app.SECTION_STYLE
  });

  // Default the select to the first value.
  app.vis.select.setValue(app.vis.select.items().get(0));



  //////////////////////////////////////////////////////////////////////////////
  /////////////*classification of Sao Miguel island*//////////////////////////////
  ///////////////////////////////////////////////////////////////////////////////
 
  ///////////////////////////////////CART//////////////////////////////////////////
  app.btn_CART = {
    button: ui.Button({
      label: 'Mapping with CART',
      // React to the button's click event.
      onClick: function() {
          var imageId = app.picker.select.getValue();
          var imageId1 = app.picker.select.items().get(0);
          
          Map.clear();
          var image = ee.Image(app.COLLECTION_ID + '/' + imageId).clip(SM);
          var image1= ee.Image(app.COLLECTION_ID + '/' + imageId1).clip(SM);
          
          //sincornization image selected with Sentinel 1
          var startS1N= ee.Number(image.get('system:time_start'))
          var startS1D=ee.Date(startS1N)
          var difference=10 * 24 * 60 * 60 * 1000;
          var endS1D=ee.Date(startS1N.add(difference));
          
          var SS1N=ee.Number(image1.get('system:time_start'))
          var SS1D=ee.Date(SS1N)
          var ES1D=ee.Date(SS1N.add(difference));
          

          
          /////////////////////////////////////
          // Sentinel 1 image Analysis Ready Data (ARD)
          //
          // Title: Sentinel-1 SAR Backscatter Analysis Ready Data Preparation in Google Earth Engine
          //
          // citation: Mullissa, A.; Vollrath, A.; Odongo-Braun, C.; Slagter, B.; Balling, J.; Gou, Y.; Gorelick, N.; Reiche, J. Sentinel-1 SAR Backscatter Analysis Ready Data Preparation in Google Earth Engine. Remote Sens. 2021, 13, 1954. https://doi.org/10.3390/rs13101954 
          //
          // repository: https://github.com/adugnag/gee_s1_ard/blob/main/README.md
          /////////////////////////////////////
          
          var wrapper = require('users/adugnagirma/gee_s1_ard:wrapper');
          var helper = require('users/adugnagirma/gee_s1_ard:utilities');
          
          //
          // Define parameters
          //
          //image 1 parameters
          var parameter = {//1. Data Selection
              START_DATE: startS1D,
              STOP_DATE: endS1D,
              POLARIZATION:'VVVH',
              ORBIT : 'BOTH',
              GEOMETRY: SM, //uncomment if interactively selecting a region of interest
              //GEOMETRY: ee.Geometry.Polygon([[[104.80, 11.61],[104.80, 11.36],[105.16, 11.36],[105.16, 11.61]]], null, false), //Uncomment if providing coordinates
              //GEOMETRY: ee.Geometry.Polygon([[[112.05, -0.25],[112.05, -0.45],[112.25, -0.45],[112.25, -0.25]]], null, false),
              //2. Additional Border noise correction
              APPLY_ADDITIONAL_BORDER_NOISE_CORRECTION: true,
              //3.Speckle filter
              APPLY_SPECKLE_FILTERING: true,
              SPECKLE_FILTER_FRAMEWORK: 'MULTI',
              SPECKLE_FILTER: 'BOXCAR',
              SPECKLE_FILTER_KERNEL_SIZE: 15,
              SPECKLE_FILTER_NR_OF_IMAGES: 10,
              //4. Radiometric terrain normalization
              APPLY_TERRAIN_FLATTENING: true,
              DEM: ee.Image('USGS/SRTMGL1_003'),
              TERRAIN_FLATTENING_MODEL: 'VOLUME',
              TERRAIN_FLATTENING_ADDITIONAL_LAYOVER_SHADOW_BUFFER: 0,
              //5. Output
              FORMAT : 'DB',
              CLIP_TO_ROI: SM,
              SAVE_ASSETS: false
          }
          
          // image 2 parameters
          var parameter2 = {//1. Data Selection
              START_DATE: SS1D,
              STOP_DATE: ES1D,
              POLARIZATION:'VVVH',
              ORBIT : 'BOTH',
              GEOMETRY: SM, //uncomment if interactively selecting a region of interest
              //GEOMETRY: ee.Geometry.Polygon([[[104.80, 11.61],[104.80, 11.36],[105.16, 11.36],[105.16, 11.61]]], null, false), //Uncomment if providing coordinates
              //GEOMETRY: ee.Geometry.Polygon([[[112.05, -0.25],[112.05, -0.45],[112.25, -0.45],[112.25, -0.25]]], null, false),
              //2. Additional Border noise correction
              APPLY_ADDITIONAL_BORDER_NOISE_CORRECTION: true,
              //3.Speckle filter
              APPLY_SPECKLE_FILTERING: true,
              SPECKLE_FILTER_FRAMEWORK: 'MULTI',
              SPECKLE_FILTER: 'BOXCAR',
              SPECKLE_FILTER_KERNEL_SIZE: 15,
              SPECKLE_FILTER_NR_OF_IMAGES: 10,
              //4. Radiometric terrain normalization
              APPLY_TERRAIN_FLATTENING: true,
              DEM: ee.Image('USGS/SRTMGL1_003'),
              TERRAIN_FLATTENING_MODEL: 'VOLUME',
              TERRAIN_FLATTENING_ADDITIONAL_LAYOVER_SHADOW_BUFFER: 0,
              //5. Output
              FORMAT : 'DB',
              CLIP_TO_ROI: SM,
              SAVE_ASSETS: false
          }
          // Do job
          //image 1
          var s1_preprocces = wrapper.s1_preproc(parameter);
          var s1 = s1_preprocces[0];
          s1_preprocces = s1_preprocces[1];
          var S1_ard = s1_preprocces.first();
          
          //image 2
          var s1_preprocces1 = wrapper.s1_preproc(parameter2);
          var s1_2 = s1_preprocces1[0];
          s1_preprocces1 = s1_preprocces1[1];
          var S1_ard_2 = s1_preprocces1.first();
          
          
          
          var bandsS1=["VV","VH"];
          image = image.addBands(S1_ard.select(bandsS1)).clip(SM);
          image1 = image1.addBands(S1_ard_2.select(bandsS1)).clip(SM);
          ////////////
          // 
          // Title Sentinel 2 cloud mask
          //
          // 
          //
          // citation: Rodrigo E Principe
          //
          // repository: https://github.com/fitoprincipe/geetools-code-editor
          /////////////////
         
          
          var cloud_masks = require('users/fitoprincipe/geetools:cloud_masks');
          var sentinel2function = cloud_masks.sentinel2();
          var compos_first = sentinel2function(image1);
          var composite = sentinel2function(image);

          ////////////////////End cloud mask////////////////////////////////////////////////////////////////////
          // Use these bands for classification.
          
          var bands = ["B[2-8].*","B1[0-2]","VV","VH"];
          // The name of the property on the points storing the class label.
          var classProperty = 'CID';

          var newfc=table;
          // Sample the composite to generate training data.  Note that the
          // class label is stored in the 'landcover' property.
          var training = composite.select(bands).sampleRegions({
          collection: newfc,
          properties: [classProperty],
          scale: 30
          });
          

          
          
          
          /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
          //* classifier CART *
          ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

          // Train a CART classifier.
          var classifierCART = ee.Classifier.smileCart(25).train({
          features: training,
          classProperty: classProperty,
          });
          
          // Print some info about the classifier (specific to CART).
          print('CART, explained', classifierCART.explain());

          // Classify the composite.
          var classifiedCART = composite.classify(classifierCART);
          //var classifiedCART_first = compos_first.classify(classifierCART);// first image of the date range
          Map.centerObject(newfc);
          var palette =['006400', 'EEE8AA','8B4513', '98FB98', '00FA9A','FF8C00', '0073FF'];
          //var palette_sub =['006400','EEE8AA','8B4513','98FB98','FF8C00','808080','0073FF'];
          //Map.addLayer(classifiedCART_first, {min: 0, max: 11, palette: palette},'CART classification first');
          Map.addLayer(classifiedCART.clip(forest), {min: 1, max: 7, palette: palette},'CART classification');
          

          // Do some accuracy assessment.  Fist, add a column of random uniforms to the training dataset.
          var withRandom = training.randomColumn('random');
          //var withRandom_first=training_first.randomColumn('random')
          // We want to reserve some of the data for testing, to avoid overfitting the model.
          var split = 0.7;  // Roughly 70% training, 30% testing.
          var trainingPartition = withRandom.filter(ee.Filter.lt('random', split));
          var testingPartition = withRandom.filter(ee.Filter.gte('random', split));
          //var trainingPartition_first=withRandom_first.filter(ee.Filter.lt('random', split));
          //var testingPartition_first = withRandom_first.filter(ee.Filter.gte('random', split));
          
          // Trained with 70% of our data.
          var trainedClassifier = ee.Classifier.gmoMaxEnt().train({
            features: trainingPartition,
            classProperty: classProperty,
            inputProperties: bands
          });
          
          // Classify the test FeatureCollection.
          var test = testingPartition.classify(trainedClassifier);
          //var test_first=testingPartition_first.classify(trainedClassifier_first)
          // Print the confusion matrix.
          var confusionMatrix = test.errorMatrix(classProperty, 'classification');
          //var confusionMatrix_first=test_first.errorMatrix(classProperty, 'classification');
          
          var trainAccuracyCART = classifierCART.confusionMatrix();
          //var trainAccuracyCART_first = classifierCART.confusionMatrix();
          print('Resubstitution error matrix: ', trainAccuracyCART.array());
          print('Training overall accuracy CART: ', trainAccuracyCART.kappa());
          //print('Training overall accuracy CART first image: ', trainAccuracyCART_first.kappa());
          
          
          
          //////////////////////////////////////////////////Area and AboveGround Carbon////
          var all = classifiedCART.select(['classification']);
          print(all)
          var acacia = all.eq(1).multiply(ee.Image.pixelArea());
          //var lawsoniana = all.eq(2).multiply(ee.Image.pixelArea());
          var cryptomeria = all.eq(2).multiply(ee.Image.pixelArea());
          var eucalyptus= all.eq(3).multiply(ee.Image.pixelArea());
          var myrica= all.eq(4).multiply(ee.Image.pixelArea());
          //var Ofolhosas= all.eq(6).multiply(ee.Image.pixelArea());
          //var Oresinosas= all.eq(7).multiply(ee.Image.pixelArea());
          //var Persea= all.eq(8).multiply(ee.Image.pixelArea());
          var Pinaster= all.eq(5).multiply(ee.Image.pixelArea());
          //var Tumbergi= all.eq(10).multiply(ee.Image.pixelArea());
          var Pittosporum= all.eq(6).multiply(ee.Image.pixelArea());
          var Vegetas= all.eq(7).multiply(ee.Image.pixelArea());
          //put it in hectares and calculate sequestration Carbon
          var acastats = acacia.divide(10000).multiply(126.1).reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: SM,
          scale: 30
          });
          //var lawstats = lawsoniana.divide(10000).multiply(79).reduceRegion({
          //reducer: ee.Reducer.sum(),
          //geometry: SM,
          //scale: 30
          //});
          var cryptomeriastats = cryptomeria.divide(10000).multiply(76.8).reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: SM,
          scale: 30
          });
          var eucalyptusstats = eucalyptus.divide(10000).multiply(92.2).reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: SM,
          scale: 30
          });
          var Myricastats = myrica.divide(10000).multiply(79).reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: SM,
          scale: 30
          });
          //var Ofolhosasstats = Ofolhosas.divide(10000).multiply(79).reduceRegion({
          //reducer: ee.Reducer.sum(),
          //geometry: SM,
          //scale: 30
          //});
          //var Oresinosasstats = Oresinosas.divide(10000).multiply(79).reduceRegion({
          //reducer: ee.Reducer.sum(),
          //geometry: SM,
          //scale: 30
          //});
          //var Perseastats = Persea.divide(10000).multiply(79).reduceRegion({
          //reducer: ee.Reducer.sum(),
          //geometry: SM,
          //scale: 30
          //});
          var Pinasterstats = Pinaster.divide(10000).multiply(89.7).reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: SM,
          scale: 30
          });
          var Pittosporumstats = Pittosporum.divide(10000).multiply(128.65).reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: SM,
          scale: 30
          });
          var Vegetasstats = Vegetas.divide(10000).multiply(79).reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: SM,
          scale: 30
          });
          
          

          var options1 = {
            title: 'Carbon sequestration in the entire island of Sao Miguel in Mg C. and (%)'
          };
          
          var dataTable1={
            cols: [{id: 'name', label: 'Type name', type: 'string'},
            {id: 'carbon', label: 'Mg C', type: 'number'}],
            rows: [{c: [{v: 'Acacia Melanoxylon'}, {v: ee.Number(acastats.get('classification')).getInfo()}]},
            //{c: [{v: 'Chamaecyparis lawsoniana'}, {v: ee.Number(lawstats.get('classification')).getInfo()}]},
            {c: [{v: 'Cryptomeria japonica'}, {v: ee.Number(cryptomeriastats.get('classification')).getInfo()}]},
            {c: [{v: 'Eucalyptus globulus'}, {v: ee.Number(eucalyptusstats.get('classification')).getInfo()}]},
            {c: [{v: 'Myrica faya'}, {v: ee.Number(Myricastats.get('classification')).getInfo()}]},
            //{c: [{v: 'Persea indica'}, {v: ee.Number(Perseastats.get('classification')).getInfo()}]},
            {c: [{v: 'Pinus pinaster'}, {v: ee.Number(Pinasterstats.get('classification')).getInfo()}]},
            {c: [{v: 'Pittosporum undulatum'}, {v: ee.Number(Pittosporumstats.get('classification')).getInfo()}]},
            {c: [{v: 'Other native vegetation patches'}, {v: ee.Number(Vegetasstats.get('classification')).getInfo()}]}]
          };
          
          var chart = new ui.Chart(dataTable1, 'PieChart')
          .setOptions(options1);
          
          //print(chart);
          
          
      //----------------------------------PERIMETRO FORESTAL--------------------------------------------------------------
       
          //put it in hectares and calculate sequestration Carbon
          var acastatsF = acacia.divide(10000).multiply(126.1).reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: forest,
          scale: 30
          });
          //var lawstatsF = lawsoniana.divide(10000).multiply(79).reduceRegion({
          //reducer: ee.Reducer.sum(),
          //geometry: forest,
          //scale: 30
          //});
          var cryptomeriastatsF = cryptomeria.divide(10000).multiply(76.8).reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: forest,
          scale: 30
          });
          var eucalyptusstatsF = eucalyptus.divide(10000).multiply(92.2).reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: forest,
          scale: 30
          });
          var MyricastatsF = myrica.divide(10000).multiply(79).reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: forest,
          scale: 30
          });
          //var PerseastatsF = Persea.divide(10000).multiply(79).reduceRegion({
          //reducer: ee.Reducer.sum(),
          //geometry: forest,
          //scale: 30
          //});
          var PinasterstatsF = Pinaster.divide(10000).multiply(89.7).reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: forest,
          scale: 30
          });
          var PittosporumstatsF = Pittosporum.divide(10000).multiply(128.65).reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: forest,
          scale: 30
          });
          var VegetasstatsF = Vegetas.divide(10000).multiply(79).reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: forest,
          scale: 30
          });
          
          var options = {
          title: 'Carbon sequestration in the forest perimeter of Sao Miguel in Mg C.and (%)'
          };
          
          var dataTable2={
           cols: [{id: 'name', label: 'Type name', type: 'string'},
            {id: 'carbon', label: ' Total Mg C', type: 'number'}],
            rows: [{c: [{v: 'Acacia Melanoxylon'}, {v: ee.Number(acastatsF.get('classification')).getInfo()}]},
            //{c: [{v: 'Chamaecyparis lawsoniana'}, {v: ee.Number(lawstatsF.get('classification')).getInfo()}]},
            {c: [{v: 'Cryptomeria japonica'}, {v: ee.Number(cryptomeriastatsF.get('classification')).getInfo()}]},
            {c: [{v: 'Eucalyptus globulus'}, {v: ee.Number(eucalyptusstatsF.get('classification')).getInfo()}]},
            {c: [{v: 'Myrica faya'}, {v: ee.Number(MyricastatsF.get('classification')).getInfo()}]},
            //{c: [{v: 'Persea indica'}, {v: ee.Number(PerseastatsF.get('classification')).getInfo()}]},
            {c: [{v: 'Pinus pinaster'}, {v: ee.Number(PinasterstatsF.get('classification')).getInfo()}]},
            {c: [{v: 'Pittosporum undulatum'}, {v: ee.Number(PittosporumstatsF.get('classification')).getInfo()}]},
            {c: [{v: 'Other native vegetation patches'}, {v: ee.Number(VegetasstatsF.get('classification')).getInfo()}]}]
          };
          
          var chart3 = new ui.Chart(dataTable2, 'PieChart')
          .setOptions(options);
          
          var dataTable={
            cols: [{id: 'name', label: 'Type name', type: 'string'},
            {id: 'carbon', label: 'Mg C/ Ha', type: 'number'},
            {id: 'carbon', label: 'Mg C', type: 'number'}],
            rows: [{c: [{v: 'Acacia Melanoxylon'},{v: '126.1 '}, {v: ee.Number(acastatsF.get('classification')).getInfo()}]},
            //{c: [{v: 'Chamaecyparis lawsoniana'},{v: '79 '}, {v: ee.Number(lawstatsF.get('classification')).getInfo()}]},
            {c: [{v: 'Cryptomeria japonica'},{v: '76.8 '}, {v: ee.Number(cryptomeriastatsF.get('classification')).getInfo()}]},
            {c: [{v: 'Eucalyptus globulus'},{v: '92.2 '}, {v: ee.Number(eucalyptusstatsF.get('classification')).getInfo()}]},
            {c: [{v: 'Myrica faya'},{v: '79 '}, {v: ee.Number(MyricastatsF.get('classification')).getInfo()}]},
            //{c: [{v: 'Persea indica'},{v: '79 '}, {v: ee.Number(PerseastatsF.get('classification')).getInfo()}]},
            {c: [{v: 'Pinus pinaster'},{v: '89.7 '}, {v: ee.Number(PinasterstatsF.get('classification')).getInfo()}]},
            {c: [{v: 'Pittosporum undulatum'},{v: '128.65 '}, {v: ee.Number(PittosporumstatsF.get('classification')).getInfo()}]},
            {c: [{v: 'Other native vegetation patches'},{v: '79'}, {v: ee.Number(VegetasstatsF.get('classification')).getInfo()}]}]
          };
          
          var chart2 = new ui.Chart(dataTable2, 'Table');
          
          

          Map.setCenter(-25.24124, 37.74997, 13);  
 
      // Create legend title
        var legend = ui.Panel({
          style: {
            width: "400px",
            position: 'bottom-right',
            padding: '8px 20px'
          }
        });

        var legendTitle = ui.Label({
        value: 'Classification Legend',
        style: {
          fontWeight: 'bold',
          fontSize: '15px',
          margin: '0 0 4px 0',
          padding: '0'
        }
        });

      // Add the title to the panel
      legend.add(legendTitle);
    
      var makeRow = function(color, name) {
      // Create the label that is actually the colored box.
      var colorBox = ui.Label({
        style: {
          backgroundColor: '#' + color,
          // Use padding to give the box height and width.
          padding: '8px',
          margin: '0 0 4px 0'
        }
      });
      // Create the label filled with the description text.
      var description = ui.Label({
        value: name,
        style: {fontSize: '10px',
          margin: '0 0 4px 6px'}
      });
      // return the panel
      return ui.Panel({
        widgets: [colorBox, description],
        layout: ui.Panel.Layout.Flow('horizontal')
        });
      };

    // name of the legend
    var names =['Acacia melanoxylon','Cryptomaeria japonica','Eucalyptus globulus','Myrica faya','Pinus pinaster','Pittosporum undulatum','Other native vegetation patches'];
    // Add color and and names
    var trainarray = trainAccuracyCART.array();
    for (var i = 0; i < 7; i++) {
      //print(palette[i]);
      //print(names[i]);
      legend.add(makeRow(palette[i], names[i]));
      }
    legend.add(chart3);
    legend.add(chart2);
      // Create legend title
        var classlegend = ui.Panel({
          style: {
            width: "400px",
            position: 'top-center',
            padding: '8px 20px'
          }
        });

        var classlegend_title = ui.Label({
        value: 'classifier stats',
        style: {
          fontWeight: 'bold',
          fontSize: '15px',
          margin: '0 0 4px 0',
          padding: '0'
        }
        });
        var accuracyCART = trainAccuracyCART.kappa();
       
    //trainAccuracyCART.evaluate(function(trainclient){
    //  classlegend.add(ui.Label({
    //    value: trainclient,
    //    style: {
    //      fontWeight: 'bold',
    //      fontSize: '15px',
    //      margin: '0 0 4px 0',
    //      padding: '0'
    //    }
    //    }));
    //});
    var dataclassifiers={
           cols: [{id: 'name', label: 'Name', type: 'string'},
            {id: 'number', label: ' Value', type: 'number'}],
            rows: [{c: [{v: 'Overall accuracy'}, {v: ee.Number(trainAccuracyCART.accuracy()).getInfo()}]},
            {c: [{v: 'Kappa statistic'}, {v: ee.Number(trainAccuracyCART.kappa()).getInfo()}]}
            ]};
    var chartclass = new ui.Chart(dataclassifiers, 'Table');
    
    //accuracyCART.evaluate(function(accuracyclient){
    //  classlegend.add(print('Overall accuracy',ui.Label({
    //    value: accuracyclient,
    //    style: {
    //      fontWeight: 'bold',
    //      fontSize: '15px',
    //      margin: '0 0 4px 0',
    //      padding: '0'
    //    }
    //    })));
    //});
    Map.add(legend);
    classlegend.add(classlegend_title);
    classlegend.add(chartclass);
    Map.add(classlegend);
        
    }
  })
};
  
  
  
  
  app.btn_CART.panel = ui.Panel({
    widgets: [
      ui.Label('Mapping (Public Forest Perimeter of São Miguel Island)', {fontWeight: 'bold'}),
      app.btn_CART.button
    ],
    style: app.SECTION_STYLE
  });
  
  ///////////////////////////////////END CART//////////////////////////////////////
 
  /////////////////////////////////////////Classification Random Forest////////////////////////////////
  /////////////////////////////////////////////////////////////////////////////////////////////////////
  
  app.btn_RF = {
    button: ui.Button({
      label: 'Mapping with RF',
      // React to the button's click event.
      onClick: function() {
          var imageId = app.picker.select.getValue(); //image ID selected by the user
          var imageId1 = app.picker.select.items().get(0); // first image ID of the list filtered by the app
          
          Map.clear();
          var image = ee.Image(app.COLLECTION_ID + '/' + imageId).clip(SM); // add image ID to the image collection to set the correct name of the image and 
                                                                              //  clip it with the Sao Miguel vector geometry
          var image1= ee.Image(app.COLLECTION_ID + '/' + imageId1).clip(SM); //
          
          //sincornization image selected with Sentinel 1. It picks the time_start data of both sentinel images (start date). Then it takes
          // this date and add 10 days more to further filter between those two dates
          var startS1N= ee.Number(image.get('system:time_start'))
          var startS1D=ee.Date(startS1N)
          var difference=10 * 24 * 60 * 60 * 1000;
          var endS1D=ee.Date(startS1N.add(difference));
          
          var SS1N=ee.Number(image1.get('system:time_start'))
          var SS1D=ee.Date(SS1N)
          var ES1D=ee.Date(SS1N.add(difference));
          
          //Once we set the interval of days wanted, we filter for both images the Sentinel 1 images containing VV and VH bands, between the interval 
          //previously set and that are passing thru Sao Miguel. Over the list of images we get the first one, since will be the closer one in time
          
          /////////////////////////////////////
          // Sentinel 1 image Analysis Ready Data (ARD)
          //
          // Title: Sentinel-1 SAR Backscatter Analysis Ready Data Preparation in Google Earth Engine
          //
          // citation: Mullissa, A.; Vollrath, A.; Odongo-Braun, C.; Slagter, B.; Balling, J.; Gou, Y.; Gorelick, N.; Reiche, J. Sentinel-1 SAR Backscatter Analysis Ready Data Preparation in Google Earth Engine. Remote Sens. 2021, 13, 1954. https://doi.org/10.3390/rs13101954 
          //
          // repository: https://github.com/adugnag/gee_s1_ard/blob/main/README.md
          /////////////////////////////////////
          
          var wrapper = require('users/adugnagirma/gee_s1_ard:wrapper');
          var helper = require('users/adugnagirma/gee_s1_ard:utilities');
          
          //
          // Define parameters
          //
          //image 1 parameters
          var parameter = {//1. Data Selection
              START_DATE: startS1D,
              STOP_DATE: endS1D,
              POLARIZATION:'VVVH',
              ORBIT : 'BOTH',
              GEOMETRY: SM, //uncomment if interactively selecting a region of interest
              //GEOMETRY: ee.Geometry.Polygon([[[104.80, 11.61],[104.80, 11.36],[105.16, 11.36],[105.16, 11.61]]], null, false), //Uncomment if providing coordinates
              //GEOMETRY: ee.Geometry.Polygon([[[112.05, -0.25],[112.05, -0.45],[112.25, -0.45],[112.25, -0.25]]], null, false),
              //2. Additional Border noise correction
              APPLY_ADDITIONAL_BORDER_NOISE_CORRECTION: true,
              //3.Speckle filter
              APPLY_SPECKLE_FILTERING: true,
              SPECKLE_FILTER_FRAMEWORK: 'MULTI',
              SPECKLE_FILTER: 'BOXCAR',
              SPECKLE_FILTER_KERNEL_SIZE: 15,
              SPECKLE_FILTER_NR_OF_IMAGES: 10,
              //4. Radiometric terrain normalization
              APPLY_TERRAIN_FLATTENING: true,
              DEM: ee.Image('USGS/SRTMGL1_003'),
              TERRAIN_FLATTENING_MODEL: 'VOLUME',
              TERRAIN_FLATTENING_ADDITIONAL_LAYOVER_SHADOW_BUFFER: 0,
              //5. Output
              FORMAT : 'DB',
              CLIP_TO_ROI: SM,
              SAVE_ASSETS: false
          }
          
          // image 2 parameters
          var parameter2 = {//1. Data Selection
              START_DATE: SS1D,
              STOP_DATE: ES1D,
              POLARIZATION:'VVVH',
              ORBIT : 'BOTH',
              GEOMETRY: SM, //uncomment if interactively selecting a region of interest
              //GEOMETRY: ee.Geometry.Polygon([[[104.80, 11.61],[104.80, 11.36],[105.16, 11.36],[105.16, 11.61]]], null, false), //Uncomment if providing coordinates
              //GEOMETRY: ee.Geometry.Polygon([[[112.05, -0.25],[112.05, -0.45],[112.25, -0.45],[112.25, -0.25]]], null, false),
              //2. Additional Border noise correction
              APPLY_ADDITIONAL_BORDER_NOISE_CORRECTION: true,
              //3.Speckle filter
              APPLY_SPECKLE_FILTERING: true,
              SPECKLE_FILTER_FRAMEWORK: 'MULTI',
              SPECKLE_FILTER: 'BOXCAR',
              SPECKLE_FILTER_KERNEL_SIZE: 15,
              SPECKLE_FILTER_NR_OF_IMAGES: 10,
              //4. Radiometric terrain normalization
              APPLY_TERRAIN_FLATTENING: true,
              DEM: ee.Image('USGS/SRTMGL1_003'),
              TERRAIN_FLATTENING_MODEL: 'VOLUME',
              TERRAIN_FLATTENING_ADDITIONAL_LAYOVER_SHADOW_BUFFER: 0,
              //5. Output
              FORMAT : 'DB',
              CLIP_TO_ROI: SM,
              SAVE_ASSETS: false
          }
          // Do job
          //image 1
          var s1_preprocces = wrapper.s1_preproc(parameter);
          var s1 = s1_preprocces[0];
          s1_preprocces = s1_preprocces[1];
          var S1_ard = s1_preprocces.first();
          
          //image 2
          var s1_preprocces1 = wrapper.s1_preproc(parameter2);
          var s1_2 = s1_preprocces1[0];
          s1_preprocces1 = s1_preprocces1[1];
          var S1_ard_2 = s1_preprocces1.first();
          
          
          
          var bandsS1=["VV","VH"];
          image = image.addBands(S1_ard.select(bandsS1)).clip(SM);
          image1 = image1.addBands(S1_ard_2.select(bandsS1)).clip(SM);
          ////////////
          // 
          // Title Sentinel 2 cloud mask
          //
          // citation: Rodrigo E Principe
          //
          // repository: https://github.com/fitoprincipe/geetools-code-editor
          /////////////////
          
          
          //var computeQAbits = function(image, start, end, newName) {
          //var pattern = 0;
          //for (var i=start; i<=end; i++) {
          //  pattern += Math.pow(2, i);
          //}
          //return image.select([0], [newName]).bitwiseAnd(pattern).rightShift(start);
          //};
    
          //var cloud_mask = image.select("QA60");
          //var cloud_mask_first_image= image1.select("QA60");
          //var opaque = computeQAbits(cloud_mask, 10, 10, "opaque");
          //var opaque_first=computeQAbits(cloud_mask_first_image, 10, 10, "opaque");
          //var cirrus = computeQAbits(cloud_mask, 11, 11, "cirrus");
          //var cirrus_first=computeQAbits(cloud_mask_first_image, 11, 11, "cirrus");
          //var mask = opaque.or(cirrus);
          //var mask_first = opaque_first.or(cirrus_first);
          
          //var compos_first=image1.updateMask(mask_first.not()).clip(SM);    
          
          //var composite =image.updateMask(mask.not()).clip(SM);
          
          var cloud_masks = require('users/fitoprincipe/geetools:cloud_masks');
          var sentinel2function = cloud_masks.sentinel2();
          var compos_first = sentinel2function(image1);
          var composite = sentinel2function(image);
          ////////////////////////////////////////////////////////////////////////////////////////
          // Use these bands for classification.
          
          var bands = ["B[2-8].*","B1[0-2]","VV","VH"];
          // The name of the property on the points storing the class label.
          var classProperty = 'CID';

          var newfc=table;
          // Sample the composite to generate training data.  Note that the
          // class label is stored in the 'landcover' property.
          var training = composite.select(bands).sampleRegions({
          collection: newfc,
          properties: [classProperty],
          scale: 30
          });
          var training_first = compos_first.select(bands).sampleRegions({
          collection: newfc,
          properties: [classProperty],
          scale: 30
          });

          
          
          
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///      *Random Forest **
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Train a Random Forest classifier.
      var classifierRF = ee.Classifier.smileRandomForest(10).train({
      features: training,
      classProperty: classProperty,
      });
      var classifierRF_first = ee.Classifier.smileRandomForest(10).train({
      features: training_first,
      classProperty: classProperty,
      });

  
// Print some info about the classifier (specific to CART).
//print('CART, explained', classifierRF.explain());

      // Classify the composite.
      var classifiedRF = composite.classify(classifierRF);
      Map.centerObject(newfc);
      var classifiedRF_first = composite.classify(classifierRF_first);
      var palette_RF =['006400', 'EEE8AA','8B4513', '98FB98', '00FA9A','FF8C00', '0073FF'];

      Map.addLayer(classifiedRF.clip(forest), {min: 1, max: 7, palette: palette_RF},'RF classification');
      // random uniforms to the training dataset.
      var split = 0.7;  //  70% training, 30% testing.
      var withRandomRF = training.randomColumn('random');
      var withRandomRF_first = training_first.randomColumn('random')
      // We want to reserve some of the data for testing, to avoid overfitting the model.
      //var split = 0.7;  // Roughly 70% training, 30% testing.
      var trainingPartitionRF = withRandomRF.filter(ee.Filter.lt('random', split));
      var testingPartitionRF = withRandomRF.filter(ee.Filter.gte('random', split));
      var trainingPartitionRF_first = withRandomRF_first.filter(ee.Filter.lt('random', split));
      var testingPartitionRF_first= withRandomRF_first.filter(ee.Filter.gte('random', split));

      // Trained with 70% of our data.
     var trainedClassifierRF = ee.Classifier.gmoMaxEnt().train({
      features: trainingPartitionRF,
      classProperty: classProperty,
      inputProperties: bands
     });
     var trainedClassifierRF_first = ee.Classifier.gmoMaxEnt().train({
      features: trainingPartitionRF_first,
      classProperty: classProperty,
      inputProperties: bands
     });

    // Classify the test FeatureCollection.
    
    var testRF = testingPartitionRF.classify(trainedClassifierRF);
    var testRF_first = testingPartitionRF_first.classify(trainedClassifierRF_first);

    // Print the confusion matrix.
    var confusionMatrixRF = testRF.errorMatrix(classProperty, 'classification RF');
    var confusionMatrixRF_first = testRF_first.errorMatrix(classProperty, 'classification RF');
    //print('Confusion Matrix RF', confusionMatrixRF);


    var trainAccuracyRF = classifierRF.confusionMatrix();
    var trainAccuracyRF_first = classifierRF_first.confusionMatrix();
    print('Resubstitution error matrix RF: ', trainAccuracyRF);
    print('Training overall accuracy RF: ', trainAccuracyRF.kappa());

     //////////////////////////////////////////////////Area and AboveGround Carbon
  //  ------------------------------------ALL SAO MIGUEL------------------------------
          
          var all = classifiedRF.select(['classification']);
          var all_first = classifiedRF_first.select(['classification']);
          var acacia = all.eq(1).multiply(ee.Image.pixelArea());
          //var lawsoniana = all.eq(2).multiply(ee.Image.pixelArea());
          var cryptomeria = all.eq(2).multiply(ee.Image.pixelArea());
          var eucalyptus= all.eq(3).multiply(ee.Image.pixelArea());
          var Myrica= all.eq(4).multiply(ee.Image.pixelArea());
          //var Ofolhosas= all.eq(6).multiply(ee.Image.pixelArea());
          //var Oresinosas= all.eq(7).multiply(ee.Image.pixelArea());
          //var Persea= all.eq(8).multiply(ee.Image.pixelArea());
          var Pinaster= all.eq(5).multiply(ee.Image.pixelArea());
          //var Tumbergi= all.eq(10).multiply(ee.Image.pixelArea());
          var Pittosporum= all.eq(6).multiply(ee.Image.pixelArea());
          var Vegetas= all.eq(7).multiply(ee.Image.pixelArea());
          //put it in hectares and calculate sequestration Carbon
          var acastats = acacia.divide(10000).multiply(126.1).reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: SM,
          scale: 30
          });
          //var lawstats = lawsoniana.divide(10000).multiply(79).reduceRegion({
          //reducer: ee.Reducer.sum(),
          //geometry: SM,
          //scale: 30
          //});
          var cryptomeriastats = cryptomeria.divide(10000).multiply(76.8).reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: SM,
          scale: 30
          });
          var eucalyptusstats = eucalyptus.divide(10000).multiply(92.2).reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: SM,
          scale: 30
          });
          var Myricastats = Myrica.divide(10000).multiply(79).reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: SM,
          scale: 30
          });
          //var Perseastats = Persea.divide(10000).multiply(79).reduceRegion({
          //reducer: ee.Reducer.sum(),
          //geometry: SM,
          //scale: 30
          //});
          var Pinasterstats = Pinaster.divide(10000).multiply(89.7).reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: SM,
          scale: 30
          });
          var Pittosporumstats = Pittosporum.divide(10000).multiply(128.65).reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: SM,
          scale: 30
          });
          var Vegetasstats = Vegetas.divide(10000).multiply(79).reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: SM,
          scale: 30
          });
          

          var options1 = {
          title: 'Carbon sequestration in the entire island of Sao Miguel in Mg C. and (%)'
          };
          
          var dataTable1={
            cols: [{id: 'name', label: 'Type name', type: 'string'},
            {id: 'carbon', label: 'Mg C', type: 'number'}],
            rows: [{c: [{v: 'Acacia Melanoxylon'}, {v: ee.Number(acastats.get('classification')).getInfo()}]},
            //{c: [{v: 'Chamaecyparis lawsoniana'}, {v: ee.Number(lawstats.get('classification')).getInfo()}]},
            {c: [{v: 'Cryptomeria japonica'}, {v: ee.Number(cryptomeriastats.get('classification')).getInfo()}]},
            {c: [{v: 'Eucalyptus globulus'}, {v: ee.Number(eucalyptusstats.get('classification')).getInfo()}]},
            {c: [{v: 'Myrica faya'}, {v: ee.Number(Myricastats.get('classification')).getInfo()}]},
            //{c: [{v: 'Persea indica'}, {v: ee.Number(Perseastats.get('classification')).getInfo()}]},
            {c: [{v: 'Pinus pinaster'}, {v: ee.Number(Pinasterstats.get('classification')).getInfo()}]},
            {c: [{v: 'Pittosporum undulatum'}, {v: ee.Number(Pittosporumstats.get('classification')).getInfo()}]},
            {c: [{v: 'Other native vegetation patches'}, {v: ee.Number(Vegetasstats.get('classification')).getInfo()}]}]
          };
          
          var chart = new ui.Chart(dataTable1, 'PieChart')
          .setOptions(options1);
          
          //print(chart);
          
          
      //----------------------------------PERIMETRO FORESTAL--------------------------------------------------------------
       
          //put it in hectares and calculate sequestration Carbon
          var acastatsF = acacia.divide(10000).multiply(126.1).reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: forest,
          scale: 30
          });
          //var lawstatsF = lawsoniana.divide(10000).multiply(79).reduceRegion({
          //reducer: ee.Reducer.sum(),
          //geometry: forest,
          //scale: 30
          //});
          var cryptomeriastatsF = cryptomeria.divide(10000).multiply(76.8).reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: forest,
          scale: 30
          });
          var eucalyptusstatsF = eucalyptus.divide(10000).multiply(92.2).reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: forest,
          scale: 30
          });
          var MyricastatsF = Myrica.divide(10000).multiply(79).reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: forest,
          scale: 30
          });
          //var PerseastatsF = Persea.divide(10000).multiply(79).reduceRegion({
          //reducer: ee.Reducer.sum(),
          //geometry: forest,
          //scale: 30
          //});
          var PinasterstatsF = Pinaster.divide(10000).multiply(89.7).reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: forest,
          scale: 30
          });
          var PittosporumstatsF = Pittosporum.divide(10000).multiply(128.65).reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: forest,
          scale: 30
          });
          var VegetasstatsF = Vegetas.divide(10000).multiply(79).reduceRegion({
          reducer: ee.Reducer.sum(),
          geometry: forest,
          scale: 30
          });
          
          var options = {
          title: 'Carbon sequestration in the forest perimeter of Sao Miguel in Mg C.and (%)'
          };
          
          var dataTable2={
           cols: [{id: 'name', label: 'Type name', type: 'string'},
            {id: 'carbon', label: ' Total Mg C', type: 'number'}],
            rows: [{c: [{v: 'Acacia Melanoxylon'}, {v: ee.Number(acastatsF.get('classification')).getInfo()}]},
            //{c: [{v: 'Chamaecyparis lawsoniana'}, {v: ee.Number(lawstatsF.get('classification')).getInfo()}]},
            {c: [{v: 'Cryptomeria japonica'}, {v: ee.Number(cryptomeriastatsF.get('classification')).getInfo()}]},
            {c: [{v: 'Eucalyptus globulus'}, {v: ee.Number(eucalyptusstatsF.get('classification')).getInfo()}]},
            {c: [{v: 'Myrica faya'}, {v: ee.Number(MyricastatsF.get('classification')).getInfo()}]},
            //{c: [{v: 'Persea indica'}, {v: ee.Number(PerseastatsF.get('classification')).getInfo()}]},
            {c: [{v: 'Pinus pinaster'}, {v: ee.Number(PinasterstatsF.get('classification')).getInfo()}]},
            {c: [{v: 'Pittosporum undulatum'}, {v: ee.Number(PittosporumstatsF.get('classification')).getInfo()}]},
            {c: [{v: 'Other native vegetation patches'}, {v: ee.Number(VegetasstatsF.get('classification')).getInfo()}]}]
          };
          
          var chart3 = new ui.Chart(dataTable2, 'PieChart')
          .setOptions(options);
          
          var dataTable={
            cols: [{id: 'name', label: 'Type name', type: 'string'},
            {id: 'carbon', label: 'Mg C/ Ha', type: 'number'},
            {id: 'carbon', label: 'Mg C', type: 'number'}],
            rows: [{c: [{v: 'Acacia Melanoxylon'},{v: '126.1 '}, {v: ee.Number(acastatsF.get('classification')).getInfo()}]},
            //{c: [{v: 'Chamaecyparis lawsoniana'},{v: '79 '}, {v: ee.Number(lawstatsF.get('classification')).getInfo()}]},
            {c: [{v: 'Cryptomeria japonica'},{v: '76.8 '}, {v: ee.Number(cryptomeriastatsF.get('classification')).getInfo()}]},
            {c: [{v: 'Eucalyptus globulus'},{v: '92.2 '}, {v: ee.Number(eucalyptusstatsF.get('classification')).getInfo()}]},
            {c: [{v: 'Myrica faya'},{v: '79 '}, {v: ee.Number(MyricastatsF.get('classification')).getInfo()}]},
            //{c: [{v: 'Persea indica'},{v: '79 '}, {v: ee.Number(PerseastatsF.get('classification')).getInfo()}]},
            {c: [{v: 'Pinus pinaster'},{v: '89.7 '}, {v: ee.Number(PinasterstatsF.get('classification')).getInfo()}]},
            {c: [{v: 'Pittosporum undulatum'},{v: '128.65 '}, {v: ee.Number(PittosporumstatsF.get('classification')).getInfo()}]},
            {c: [{v: 'Pittosporum undulatum'},{v: '79 '}, {v: ee.Number(VegetasstatsF.get('classification')).getInfo()}]}]
          };
          
          var chart2 = new ui.Chart(dataTable, 'Table');
          
          
          //print(chart2);
          
          //Map.addLayer(forest);
          
         //List of land cover categories
         //Map.setCenter(-25.24124, 37.74997, 13);  
         Map.setCenter(-25.24124, 37.74997, 13);  

        var legend = ui.Panel({
          style: {
            width: "400px",
            position: 'bottom-right',
            padding: '8px 20px'
          }
        });
 
        // Create legend title

      var legendTitle = ui.Label({
        value: 'Classification Legend',
          style: {
            fontWeight: 'bold',
            fontSize: '15px',
            margin: '0 0 4px 0',
            padding: '0'
          }
      });

      // Add the title to the panel
      legend.add(legendTitle);
    
      var makeRow = function(color, name) {
        // Create the label that is actually the colored box.
        var colorBox = ui.Label({
          style: {
            backgroundColor: '#' + color,
            // Use padding to give the box height and width.
            padding: '8px',
            margin: '0 0 4px 0'
          }
        });
        // Create the label filled with the description text.
        var description = ui.Label({
          value: name,
          style: {fontSize: '10px',
          margin: '0 0 4px 6px'}
        });
        // return the panel
        return ui.Panel({
          widgets: [colorBox, description],
          layout: ui.Panel.Layout.Flow('horizontal')
        });
      };

      // name of the legend
      var names =['Acacia melanoxylon','Cryptomaeria japonica','Eucalyptus globulus','Myrica faya','Pinus pinaster','Pittosporum undulatum','Other native vegetation patches'];
      // Add color and and names
      for (var i = 0; i < 7; i++) {
        //print(palette[i]);
        //print(names[i]);
        legend.add(makeRow(palette_RF[i], names[i]));
        }
      legend.add(chart3);
      legend.add(chart2);
      
      var dataclassifiers={
           cols: [{id: 'name', label: 'Name', type: 'string'},
            {id: 'number', label: ' Value', type: 'number'}],
            rows: [{c: [{v: 'Overall accuracy'}, {v: ee.Number(trainAccuracyRF.accuracy()).getInfo()}]},
            {c: [{v: 'Kappa statistic'}, {v: ee.Number(trainAccuracyRF.kappa()).getInfo()}]}
            ]};
      var chartclass = new ui.Chart(dataclassifiers, 'Table');

      Map.add(legend);
      var classlegend = ui.Panel({
          style: {
            width: "400px",
            position: 'top-center',
            padding: '8px 20px'
          }
        });

        var classlegend_title = ui.Label({
        value: 'classifier stats',
        style: {
          fontWeight: 'bold',
          fontSize: '15px',
          margin: '0 0 4px 0',
          padding: '0'
        }
        });
      
      classlegend.add(classlegend_title);
      classlegend.add(chartclass);
        
      Map.add(classlegend);

  }
  })
};

  app.btn_RF.panel = ui.Panel({
    widgets: [
      ui.Label('', {fontWeight: 'bold'}),
      app.btn_RF.button
      //button of other islands
    ],
    style: app.SECTION_STYLE
  });
   
   /////////////////////////////////////////End Random Forest//////////////////////////////////////////////
   
  app.btn_plot = {
    button: ui.Button({
      label: 'Show line-plot',
      onClick: function(){
        var panel2 = ui.Panel();
    panel2.clear();
    
    var intro2 = ui.Panel([
          ui.Label({
            value: 'Time-Series analysis of all images between start and end date of official forest area',
            style: {fontSize: '14px', fontWeight: 'bold'}
          
          })
        ]);
    
    panel2.add(intro2);
    // Create an Band spectrum chart.
        var bandsChart = ui.Chart.image.series(app.ImageCollection_filtered.select(['B8', 'B4', 'B3'],['nir', 'red', 'green']), forest)
            .setOptions({
              title: 'bands Reflectance',
              vAxis: {title: 'Bands value'},
              hAxis: {title: 'Date', format: 'dd-MM-yy', gridlines: {count: 7}},
              
            });
         panel2.widgets().set(6, bandsChart);
         
        
        var ndviChart = ui.Chart.image.series({
          imageCollection: app.ImageCollection_filtered.map(function(img) {
            return img.normalizedDifference(['B8', 'B4'])
                      .rename('NDVI')
                      .copyProperties(img, ['system:time_start']);
          }), 
          region: forest,
          reducer:ee.Reducer.mean(),
          scale:30
        })
              .setOptions({
              title: 'NDVI evolution',
              vAxis: {title: 'ndvi'},
              hAxis: {title: 'Date', format: 'dd-MM-yy', gridlines: {count: 7}},
            });
            
        panel2.widgets().set(3, ndviChart);
        var ndwiChart = ui.Chart.image.series({
          imageCollection: app.ImageCollection_filtered.map(function(img) {
            return img.normalizedDifference(['B3', 'B8'])
                      .rename('NDWI')
                      .copyProperties(img, ['system:time_start']);
          }), 
          region: forest
        })
              .setOptions({
              title: 'NDWI evolution',
              vAxis: {title: 'ndwi'},
              hAxis: {title: 'Date', format: 'dd-MM-yy', gridlines: {count: 7}},
            });
        panel2.widgets().set(5, ndwiChart);
        
        var nbrChart = ui.Chart.image.series({
          imageCollection: app.ImageCollection_filtered.map(function(img) {
            return img.normalizedDifference(['B8', 'B12'])
                      .rename('NBR')
                      .copyProperties(img, ['system:time_start']);
          }), 
          region: forest
        })
              .setOptions({
              title: 'NBR evolution',
              vAxis: {title: 'nbr'},
              hAxis: {title: 'Date', format: 'dd-MM-yy', gridlines: {count: 7}},
            });
        panel2.widgets().set(5, nbrChart);  
        
        var npcriChart = ui.Chart.image.series({
          imageCollection: app.ImageCollection_filtered.map(function(img) {
            return img.normalizedDifference(['B4', 'B2'])
                      .rename('NPCRI')
                      .copyProperties(img, ['system:time_start']);
          }), 
          region: forest
        })
              .setOptions({
              title: 'NPCRI evolution',
              vAxis: {title: 'npcri'},
              hAxis: {title: 'Date', format: 'dd-MM-yy', gridlines: {count: 7}},
            });
        panel2.widgets().set(9, npcriChart);
      ui.root.insert(1, panel2);
        
        
        
      }
    })
  };
  
  app.btn_plot.panel = ui.Panel({
    widgets: [
      ui.Label('Time-series line-plots', {fontWeight: 'bold'}),
      app.btn_plot.button
      //button of other islands
    ],
    style: app.SECTION_STYLE
  });
  
  
 
 
};


  /** Applies the selection filters currently selected in the UI. */
  app.applyFilters = function() {
    app.setLoadingMode(true);
   
    
   
    var filtered = ee.ImageCollection(app.COLLECTION_ID);

    var filtered2 = ee.ImageCollection(app.RadarID);
  
    // Filter bounds to the map if the checkbox is marked.
    if (app.filters.mapCenter.getValue()) {
      filtered = filtered.filterBounds(Map.getCenter());
      
    }
      

    // Set filter variables.
    var start = app.filters.startDate.getValue();
    if (start) start = ee.Date(start);
    var end = app.filters.endDate.getValue();
    if (end) end = ee.Date(end);
    var cloud = app.filters.cloudpercentage.getValue();
    //var cloud=cloud1.Tofloat();
    if (cloud) cloud= ee.Number.parse(cloud);
    if (start) filtered = filtered.filterDate(start, end).filterMetadata('CLOUDY_PIXEL_PERCENTAGE',"less_than",cloud)
    
    if (start) filtered2 = filtered2.filterDate(start, end);

    
      app.ImageCollection_filtered = filtered
      app.ImageCollection_filtered2 = filtered2
    
     //var SS1N=ee.Number(image1.get('system:time_start'))
      //    var SS1D=ee.Date(SS1N)

    // Get the list of computed ids of Sentinel 2
    var computedIds = filtered
        .limit(app.IMAGE_COUNT_LIMIT)
        .reduceColumns(ee.Reducer.toList(), ['system:index'])
        .get('list');
    print(computedIds)
    // I have create a List with the computed ids in order to handle it better
    var List=ee.List(computedIds)
    
    computedIds.evaluate(function(ids) {
      // Update the image picker with the given list of ids.
      app.setLoadingMode(false);
      app.picker.select.items().reset(ids);
      // Default the image picker to the first id.
     app.picker.select.setValue(app.picker.select.items().get(0));
    });
    
  };
 
  //// Show plots ////
  //app.applyPlot = function(){
    //app.setLoadingMode(true);
    
    
    
 // };


/** Creates the app helper functions. */
app.createHelpers = function() {
  /**
   * Enables or disables loading mode.
   * @param {boolean} enabled Whether loading mode is enabled.
   */
  app.setLoadingMode = function(enabled) {
    // Set the loading label visibility to the enabled mode.
    app.filters.loadingLabel.style().set('shown', enabled);
    // Set each of the widgets to the given enabled mode.
    var loadDependentWidgets = [
      app.vis.select,
      app.filters.startDate,
      app.filters.endDate,
      app.filters.cloudpercentage,
      app.filters.applyButton,
      //app.filters.plotButton,
      app.filters.mapCenter,
      app.picker.select,
      app.picker.centerButton,
      //app.btn_plot.button,
      app.btn_CART.button,
      app.btn_RF.button,
    ];
    loadDependentWidgets.forEach(function(widget) {
      widget.setDisabled(enabled);
    });
  };
  
 
  /** Refreshes the current map layer based on the UI widget states. */
  app.refreshMapLayer = function() {
    
    Map.clear();
    var imageId = app.picker.select.getValue();
    var imageId1 = app.picker.select.items().get(0);
    
    if (imageId) {
      // If an image id is found, create an image.
      var imagepre = ee.Image(app.COLLECTION_ID + '/' + imageId).clip(SM);
      
      //var qa = imagepre.select('QA60');

      // Bits 10 and 11 are clouds and cirrus, respectively.
      //var cloudBitMask = 1 << 10;
      //var cirrusBitMask = 1 << 11;

      // Both flags should be set to zero, indicating clear conditions.
      //var mask = qa.bitwiseAnd(cloudBitMask).eq(0).and(qa.bitwiseAnd(cirrusBitMask).eq(0));
      
      //var image = imagepre.updateMask(mask).divide(10000);
      
      ////////////
      // 
      // Title Sentinel 2 cloud mask
      //
      // 
      //
      // citation: Rodrigo E Principe
      //
      // repository: https://github.com/fitoprincipe/geetools-code-editor
      /////////////////
      
      var cloud_masks = require('users/fitoprincipe/geetools:cloud_masks');
      var sentinel2function = cloud_masks.sentinel2();
      //var compos_first = sentinel2function(image1);
      var image = sentinel2function(imagepre);
      
      // End cloud mask
      ///////////////////
      
      var layer;
      //var image1= ee.Image(app.COLLECTION_ID + '/' + imageId1).clip(SM);
      
      if (app.vis.select.getValue() === 'RGB (B4,B3,B2)') {
        layer = image.divide(10000);
        
      } else {
        layer = image;
      }
      var layer2;
      if (app.vis.select.getValue() === 'NDVI (B8-B4/B8+B4)') {
        layer = s2ndvi(image);
      } else {
        layer2 = image;
      }
      if (app.vis.select.getValue() === 'NPCRI (B4-B2/B4+B2)') {
        layer = s2npcri(image);
      } else {
        layer2 = image;
      }
      if (app.vis.select.getValue() === 'NDMI (B8-B11/B8+B11)') {
        layer = s2ndmi(image);
      } else {
        layer2 = image;
      }
      
      if (app.vis.select.getValue() === 'NDWI (B3-B8/B3+B8)') {
        layer = s2ndwi(image);
        //print(image)
      } else {
        layer2 = image;
      }
      
      if (app.vis.select.getValue() === 'NBR (B8-B12/B8+B12)') {
        layer = s2nbr(image);
        print(image)
      } else {
        layer2 = image;
      }
      if (app.vis.select.getValue() === 'BSI ((B11+B4)-(B8+B2))/((B11+B4)+(B8+B2))') {
        layer = s2bsi(image);
        print(image)
      } else {
        layer2 = image;
      }
      
      
      // Add the image to the map with the corresponding visualization options.
      var visOption = app.VIS_OPTIONS[app.vis.select.getValue()];
      Map.addLayer(layer, visOption.visParams, imageId);
     

      //Map.addLayer(layer21, visOption.visParams, imageId);


      /////////////// Create Panel ///////////////
      // Create a panel to hold our widgets.
      ///////////////////////////////////////////
      
      
    
    }
   
  };
}; 

function s2ndmi(image){
  var ndmi = image.normalizedDifference(['B8', 'B11']);
  return image.addBands(ndmi);
}
                 
function s2ndvi(image){
  var ndvi = image.normalizedDifference(['B8', 'B4']);
  return image.addBands(ndvi);
  
}
function s2npcri(image){
  var npcri = image.normalizedDifference(['B4', 'B2']);
  return image.addBands(npcri);
}

function s2ndwi(image){
  var ndwi = image.normalizedDifference(['B3', 'B8']);
 
  return image.addBands(ndwi);
}
function s2nbr(image){
  var nbr = image.normalizedDifference(['B8', 'B12']);
  return image.addBands(nbr);
  
}
function s2bsi(image){
  
  var numerator =(image.select('B11').add(image.select('B4'))).subtract(image.select('B8').add(image.select('B2')));
  var denom = (image.select('B11').add(image.select('B4'))).add(image.select('B8').add(image.select('B2')));
  
  var bsi = numerator.divide(denom);
  return image.addBands(bsi);
  
}



////////////////////////////////////////////////////////////////////////////////////////////////////////////////Here

var palette = [ 'FFFFFF', 'CE7E45', 'DF923D', 'F1B555', 'FCD163', '99B718',
               '74A901', '66A000', '529400', '3E8601', '207401', '056201',
               '004C00', '023B01', '012E01', '011D01', '011301'];

 var ndwiViz = ['00FFFF', '0000FF'];
 
 var nbrViz =['00FFFF','Green','Yellow','Red']
 var bsiViz=['00ff00','00ad00']

///////////////////////////////////

///////////////////////////////////
 
/** Creates the app constants. */
app.createConstants = function() {
  var cloudBitMask = ee.Number(2).pow(10).int();
  var cirrusBitMask = ee.Number(2).pow(11).int();
  
  //image collection filtered with cloud masking
  app.ImageCollection_filtered = ee.ImageCollection('COPERNICUS//S2_SR');

  app.ImageCollection_radar=ee.ImageCollection('COPERNICUS/S1_GRD');
  app.RadarID='COPERNICUS/S1_GRD';
  
  app.COLLECTION_ID = 'COPERNICUS/S2';
  
  
  //app.COLLECTION_ID_2='LANDSAT/LC8_SR';
  app.SECTION_STYLE = {margin: '40px 0 0 0'};
  app.HELPER_TEXT_STYLE = {
      margin: '8px 0 -3px 8px',
      fontSize: '12px',
      color: 'gray'
  };
  app.IMAGE_COUNT_LIMIT = 20;
  
  

  app.VIS_OPTIONS = {
    'RGB (B4,B3,B2)': {
      description:'Red, Green and Blue composition' +
                  '',
      visParams:{min:0, max:0.3,bands: ['B4', 'B3', 'B2']}
      
    },
   'NDVI (B8-B4/B8+B4)': {
      description: 'Normalized Differenced Vegetation index ' +
                   '',
      visParams:  {min: 0, max: 0.7,  palette:palette, bands: ['nd']}
      
    },
    'NPCRI (B4-B2/B4+B2)': {
      description: 'Normalized Pigment Chlorophyll ratio Index  ' +
                   '',
      visParams:  {min: 0, max: 0.7,  palette:palette, bands: ['nd']}
    },
     'NDWI (B3-B8/B3+B8)': {
      description: 'Normalized Difference Water Index  ' +
                   '',
      visParams:  {min: -0.6, max: 0.1,  palette:ndwiViz, bands: ['nd']}
      
    },
    'NBR (B8-B12/B8+B12)': {
      description: 'Normalized Burn Ratio index ' +
                   '',
      visParams:  {min: 0.1,max:1,  palette:nbrViz, bands: ['nd']}
    },
    'BSI ((B11+B4)-(B8+B2))/((B11+B4)+(B8+B2))': {
      description: 'Bare Soil Index  ' +
                   '',
      visParams:  {min: -0.6, max: 1,  palette:nbrViz, bands: ['B11_1']}//
    },
    
    
    
  };
};


/** Creates the application interface. */
app.boot = function() {
  app.createConstants();
  app.createHelpers();
  app.createPanels();
  var main = ui.Panel({
    widgets: [
      app.intro.panel,
      app.filters.panel,
      app.btn_plot.panel,
      app.picker.panel,
      app.vis.panel,
      //app.btn_plot,
      app.btn_CART.panel,
      app.btn_RF.panel,
    ],
    style: {width: '350px', padding: '15px'}
  });
  
 ui.root.insert(0, main);
  

  Map.setCenter(-25.24124, 37.74997, 13);  
  
  app.applyFilters();
  //app.applyPlot();


};
 



app.boot();
     
