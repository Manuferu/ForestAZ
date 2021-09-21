// Import of files needed
// Please substitute your_path with your on directory path //////
///////////////////////////////////////////////////////////////////
var SM = ee.FeatureCollection("users/Manuferu/SM_Admin0"),
    table4 = ee.FeatureCollection("users/Manuferu/tra_val_edominante_dissolve"),
    forest = ee.FeatureCollection("users/Manuferu/Perimetroforestal_SM");


//////ForestAZ project
//

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
      ui.Label('Welcome to the Azorean forest inventory. The application aims to give the tools for an efficent forest monitoring' +
      ' in Sao Miguel island'),
      ui.Label({value: "See the chapter  published in book: The Ever Growing use of Copernicus across Europe’s Regions: a selection of 99 user stories by local and regional authorities, Publisher: NEREUS / European Space Agency / European Commission, pp.102-103", style: {fontWeight: "normal", fontSize: "12px", maxWidth: "500px", margin: "0 0 4px 0", padding: "0"}}).setUrl("https://www.researchgate.net/publication/329170562_Sentinel-based_Azores_Regional_Forest_Inventory")
    ]),
  };

  /* The collection filter controls. */
  app.filters = {
    mapCenter: ui.Checkbox({label: 'Filter to map center', value: true}),
    
    startDate: ui.Textbox('YYYY-MM-DD', '2020-07-10'),
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
      ui.Label('Vegetation Assessment', {fontWeight: 'bold', color:'Green'}),
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
          
          //Sentinel1 for image selected
          
          var S1= ee.ImageCollection('COPERNICUS/S1_GRD')
          .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
          .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
          .filterDate(startS1D, endS1D)
          .filterBounds(SM)
          .first();
          
          var S1_image1= ee.ImageCollection('COPERNICUS/S1_GRD')
          .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
          .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
          .filterDate(SS1D, ES1D)
          .filterBounds(SM)
          .first();
          
          
          
          var bandsS1=["VV","VH"];
          image = image.addBands(S1.select(bandsS1)).clip(SM);
          image1 = image1.addBands(S1_image1.select(bandsS1)).clip(SM);
         //////////////////////////////////////////////////continuar por aqui///////////////
          var computeQAbits = function(image, start, end, newName) {
          var pattern = 0;
          for (var i=start; i<=end; i++) {
            pattern += Math.pow(2, i);
          }
          return image.select([0], [newName]).bitwiseAnd(pattern).rightShift(start);
          };
    
          var cloud_mask = image.select("QA60");
          var cloud_mask_first_image= image1.select("QA60");
          var opaque = computeQAbits(cloud_mask, 10, 10, "opaque");
          var opaque_first=computeQAbits(cloud_mask_first_image, 10, 10, "opaque");
          var cirrus = computeQAbits(cloud_mask, 11, 11, "cirrus");
          var cirrus_first=computeQAbits(cloud_mask_first_image, 11, 11, "cirrus");
          var mask = opaque.or(cirrus);
          var mask_first = opaque_first.or(cirrus_first);
          
          var compos_first=image1.updateMask(mask_first.not()).clip(SM);    
          
          var composite =image.updateMask(mask.not()).clip(SM);
          
          //print(composite);
          
          //Map.addLayer(composite, {bands: ['B4', 'B3', 'B2']},'proof 1');
          
          ////////////////////////////////////////////////////////////////////////////////////////
          // Use these bands for classification.
          
          var bands = ["B[2-8].*","B1[0-2]","VV","VH"];
          // The name of the property on the points storing the class label.
          var classProperty = 'CID';

          var newfc=table4;
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

          
          
          
          /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
          //* classifier CART *
          ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

          // Train a CART classifier.
          var classifierCART = ee.Classifier.smileCart().train({
          features: training,
          classProperty: classProperty,
          });
          
          // Print some info about the classifier (specific to CART).
          print('CART, explained', classifierCART.explain());

          // Classify the composite.
          var classifiedCART = composite.classify(classifierCART);
          var classifiedCART_first = compos_first.classify(classifierCART);
          Map.centerObject(newfc);
          var palette =['006400', '32CD32', 'EEE8AA',
                        '8B4513', '98FB98', '00FA9A',
                        '90EE90', '00008B', 'FF8C00',
                        'ADFF2F', '808080'];
          //Map.addLayer(classifiedCART_first, {min: 0, max: 12, palette: palette},'CART classification first');
          Map.addLayer(classifiedCART, {min: 0, max: 12, palette: palette},'CART classification');
          print(classifiedCART)

          // Optionally, do some accuracy assessment.  Fist, add a column of
          // random uniforms to the training dataset.
          var withRandom = training.randomColumn('random');
          var withRandom_first=training_first.randomColumn('random')
          // We want to reserve some of the data for testing, to avoid overfitting the model.
          var split = 0.7;  // Roughly 70% training, 30% testing.
          var trainingPartition = withRandom.filter(ee.Filter.lt('random', split));
          var testingPartition = withRandom.filter(ee.Filter.gte('random', split));
          var trainingPartition_first=withRandom_first.filter(ee.Filter.lt('random', split));
          var testingPartition_first = withRandom_first.filter(ee.Filter.gte('random', split));
          
          // Trained with 70% of our data.
          var trainedClassifier = ee.Classifier.gmoMaxEnt().train({
            features: trainingPartition,
            classProperty: classProperty,
            inputProperties: bands
          });
          
          var trainedClassifier_first = ee.Classifier.gmoMaxEnt().train({
            features: trainingPartition_first,
            classProperty: classProperty,
            inputProperties: bands
          });
          
          // Classify the test FeatureCollection.
          var test = testingPartition.classify(trainedClassifier);
          var test_first=testingPartition_first.classify(trainedClassifier_first)
          // Print the confusion matrix.
          var confusionMatrix = test.errorMatrix(classProperty, 'classification');
          var confusionMatrix_first=test_first.errorMatrix(classProperty, 'classification');
          
          var trainAccuracyCART = classifierCART.confusionMatrix();
          var trainAccuracyCART_first = classifierCART.confusionMatrix();
          print('Resubstitution error matrix: ', trainAccuracyCART);
          print('Training overall accuracy CART: ', trainAccuracyCART.kappa());
          print('Training overall accuracy CART first image: ', trainAccuracyCART_first.kappa());
          
          ////////change detection////////////////////////////
          
          //var change = classifiedCART.subtract(classsifiedCART_first);
          
          //var newclassified = classifiedCART.subtract(change)
          
          //////////////////////////////////////////////////Area and AboveGround Carbon
          var all = classifiedCART.select(['classification']);
          var acacia = all.eq(1).multiply(ee.Image.pixelArea());
          //var lawsoniana = all.eq(2).multiply(ee.Image.pixelArea());
          var cryptomeria = all.eq(3).multiply(ee.Image.pixelArea());
          var eucalyptus= all.eq(4).multiply(ee.Image.pixelArea());
          var Myrica= all.eq(5).multiply(ee.Image.pixelArea());
          //var Ofolhosas= all.eq(6).multiply(ee.Image.pixelArea());
          //var Oresinosas= all.eq(7).multiply(ee.Image.pixelArea());
          //var Persea= all.eq(8).multiply(ee.Image.pixelArea());
          var Pinaster= all.eq(9).multiply(ee.Image.pixelArea());
          //var Tumbergi= all.eq(10).multiply(ee.Image.pixelArea());
          var Pittosporum= all.eq(11).multiply(ee.Image.pixelArea());
          var Vegetas= all.eq(12).multiply(ee.Image.pixelArea());
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
          print('Total carbon sequestration of Acacia melanoxylon: ', acastats.get('classification'), ' Mg C');
          //print('Total carbon sequestration of Chamaecyparis Lawsoniana: ', lawstats.get('classification'), ' Mg C');
          print('Total carbon sequestration of Cryptomeria japonica: ', cryptomeriastats.get('classification'), ' Mg C');
          print('Total carbon sequestration of Eucalyptus globulus: ', eucalyptusstats.get('classification'), ' Mg C');
          print('Total carbon sequestration of Myrica faya: ', Myricastats.get('classification'), ' Mg C');
          //print('Total carbon sequestration of Persea indica: ', Perseastats.get('classification'), ' Mg C');
          print('Total carbon sequestration of Pinus pinaster: ', Pinasterstats.get('classification'), ' Mg C');
          print('Total carbon sequestration of Pittosporum undulatum: ', Pittosporumstats.get('classification'), ' Mg C');
          
          //Map.addLayer(newclassified, {min: 0, max: 12, palette: palette},'change detection map CART');
  
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
            {c: [{v: 'Pittosporum undulatum'}, {v: ee.Number(Pittosporumstats.get('classification')).getInfo()}]}]
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
          //print('Total carbon sequestration of Acacia melanoxylon in forest perimeter: ', acastatsF.get('classification'), ' Mg C');
          //print('Total carbon sequestration of Chamaecyparis Lawsoniana in forest perimeter: ', lawstatsF.get('classification'), ' Mg C');
          //print('Total carbon sequestration of Cryptomeria japonica in forest perimeter: ', cryptomeriastatsF.get('classification'), ' Mg C');
          //print('Total carbon sequestration of Eucalyptus globulus in forest perimeter: ', eucalyptusstatsF.get('classification'), ' Mg C');
          //print('Total carbon sequestration of Myrica faya in forest perimeter: ', MyricastatsF.get('classification'), ' Mg C');
          //print('Total carbon sequestration of Persea indica in forest perimeter: ', PerseastatsF.get('classification'), ' Mg C');
          //print('Total carbon sequestration of Pinus pinaster in forest perimeter: ', PinasterstatsF.get('classification'), ' Mg C');
          //print('Total carbon sequestration of Pittosporum undulatum in forest perimeter: ', PittosporumstatsF.get('classification'), ' Mg C');
          
          //print('Keys: ',acastatsF.keys());
          
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
            {c: [{v: 'Pittosporum undulatum'}, {v: ee.Number(PittosporumstatsF.get('classification')).getInfo()}]}]
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
            {c: [{v: 'Pittosporum undulatum'},{v: '128.65 '}, {v: ee.Number(PittosporumstatsF.get('classification')).getInfo()}]}]
          };
          
          var chart2 = new ui.Chart(dataTable, 'Table');
          
          
          //print(chart2);
          
          Map.addLayer(forest);
          
          print(chart2,chart3);
        
        
        
        
        
      }
  })
};
  
  ///////////////////////////////////END CART//////////////////////////////////////
  
  
  app.btn_CART.panel = ui.Panel({
    widgets: [
      ui.Label('Mapping', {fontWeight: 'bold'}),
      app.btn_CART.button,
      
      
    ],
    style: app.SECTION_STYLE
  });
  
  
 
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
          
          var S1= ee.ImageCollection('COPERNICUS/S1_GRD')
          .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
          .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
          .filterDate(startS1D, endS1D)
          .filterBounds(SM)
          .first();
          
          var S1_image1= ee.ImageCollection('COPERNICUS/S1_GRD')
          .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
          .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VH'))
          .filterDate(SS1D, ES1D)
          .filterBounds(SM)
          .first();
          
          
          
          var bandsS1=["VV","VH"];
          image = image.addBands(S1.select(bandsS1)).clip(SM);
          image1 = image1.addBands(S1_image1.select(bandsS1)).clip(SM);
         //////////////////////////////////////////////////continuar por aqui///////////////
          var computeQAbits = function(image, start, end, newName) {
          var pattern = 0;
          for (var i=start; i<=end; i++) {
            pattern += Math.pow(2, i);
          }
          return image.select([0], [newName]).bitwiseAnd(pattern).rightShift(start);
          };
    
          var cloud_mask = image.select("QA60");
          var cloud_mask_first_image= image1.select("QA60");
          var opaque = computeQAbits(cloud_mask, 10, 10, "opaque");
          var opaque_first=computeQAbits(cloud_mask_first_image, 10, 10, "opaque");
          var cirrus = computeQAbits(cloud_mask, 11, 11, "cirrus");
          var cirrus_first=computeQAbits(cloud_mask_first_image, 11, 11, "cirrus");
          var mask = opaque.or(cirrus);
          var mask_first = opaque_first.or(cirrus_first);
          
          var compos_first=image1.updateMask(mask_first.not()).clip(SM);    
          
          var composite =image.updateMask(mask.not()).clip(SM);
          
          //print(composite);
          
          //Map.addLayer(composite, {bands: ['B4', 'B3', 'B2']},'proof 1');
          
          ////////////////////////////////////////////////////////////////////////////////////////
          // Use these bands for classification.
          
          var bands = ["B[2-8].*","B1[0-2]","VV","VH"];
          // The name of the property on the points storing the class label.
          var classProperty = 'CID';

          var newfc=table4;
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
      var classifierRF = ee.Classifier.smileRandomForest(24).train({
      features: training,
      classProperty: classProperty,
      });
      var classifierRF_first = ee.Classifier.smileRandomForest(24).train({
      features: training_first,
      classProperty: classProperty,
      });

  
// Print some info about the classifier (specific to CART).
//print('CART, explained', classifierRF.explain());

// Classify the composite.
      var classifiedRF = composite.classify(classifierRF);
      Map.centerObject(newfc);
      var classifiedRF_first = composite.classify(classifierRF_first);
      Map.addLayer(classifiedRF, {min: 0, max: 12, palette: palette},'RF classification');
// Optionally, do some accuracy assessment.  Fist, add a column of
// random uniforms to the training dataset.
      var split = 0.7;  // Roughly 70% training, 30% testing.
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
    print('Training overall accuracy RF first image: ', trainAccuracyRF_first.kappa());
    
     //////////////////////////////////////////////////Area and AboveGround Carbon
  //  ------------------------------------ALL SAO MIGUEL------------------------------
          
          var all = classifiedRF.select(['classification']);
          var all_first = classifiedRF_first.select(['classification']);
          var acacia = all.eq(1).multiply(ee.Image.pixelArea());
          //var lawsoniana = all.eq(2).multiply(ee.Image.pixelArea());
          var cryptomeria = all.eq(3).multiply(ee.Image.pixelArea());
          var eucalyptus= all.eq(4).multiply(ee.Image.pixelArea());
          var Myrica= all.eq(5).multiply(ee.Image.pixelArea());
          //var Ofolhosas= all.eq(6).multiply(ee.Image.pixelArea());
          //var Oresinosas= all.eq(7).multiply(ee.Image.pixelArea());
          //var Persea= all.eq(8).multiply(ee.Image.pixelArea());
          var Pinaster= all.eq(9).multiply(ee.Image.pixelArea());
          //var Tumbergi= all.eq(10).multiply(ee.Image.pixelArea());
          var Pittosporum= all.eq(11).multiply(ee.Image.pixelArea());
          var Vegetas= all.eq(12).multiply(ee.Image.pixelArea());
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
          //print('Total carbon sequestration of Acacia melanoxylon: ', acastats.get('classification'), ' Mg C');
          //print('Total carbon sequestration of Chamaecyparis Lawsoniana: ', lawstats.get('classification'), ' Mg C');
          //print('Total carbon sequestration of Cryptomeria japonica: ', cryptomeriastats.get('classification'), ' Mg C');
          //print('Total carbon sequestration of Eucalyptus globulus: ', eucalyptusstats.get('classification'), ' Mg C');
          //print('Total carbon sequestration of Myrica faya: ', Myricastats.get('classification'), ' Mg C');
          //print('Total carbon sequestration of Persea indica: ', Perseastats.get('classification'), ' Mg C');
          //print('Total carbon sequestration of Pinus pinaster: ', Pinasterstats.get('classification'), ' Mg C');
          //print('Total carbon sequestration of Pittosporum undulatum: ', Pittosporumstats.get('classification'), ' Mg C');
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
            {c: [{v: 'Pittosporum undulatum'}, {v: ee.Number(Pittosporumstats.get('classification')).getInfo()}]}]
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
          //print('Total carbon sequestration of Acacia melanoxylon in forest perimeter: ', acastatsF.get('classification'), ' Mg C');
          //print('Total carbon sequestration of Chamaecyparis Lawsoniana in forest perimeter: ', lawstatsF.get('classification'), ' Mg C');
          //print('Total carbon sequestration of Cryptomeria japonica in forest perimeter: ', cryptomeriastatsF.get('classification'), ' Mg C');
          //print('Total carbon sequestration of Eucalyptus globulus in forest perimeter: ', eucalyptusstatsF.get('classification'), ' Mg C');
          //print('Total carbon sequestration of Myrica faya in forest perimeter: ', MyricastatsF.get('classification'), ' Mg C');
          //print('Total carbon sequestration of Persea indica in forest perimeter: ', PerseastatsF.get('classification'), ' Mg C');
          //print('Total carbon sequestration of Pinus pinaster in forest perimeter: ', PinasterstatsF.get('classification'), ' Mg C');
          //print('Total carbon sequestration of Pittosporum undulatum in forest perimeter: ', PittosporumstatsF.get('classification'), ' Mg C');
          
          //print('Keys: ',acastatsF.keys());
          
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
            {c: [{v: 'Pittosporum undulatum'}, {v: ee.Number(PittosporumstatsF.get('classification')).getInfo()}]}]
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
            {c: [{v: 'Pittosporum undulatum'},{v: '128.65 '}, {v: ee.Number(PittosporumstatsF.get('classification')).getInfo()}]}]
          };
          
          var chart2 = new ui.Chart(dataTable, 'Table');
          
          
          //print(chart2);
          
          Map.addLayer(forest);
          
          print(chart2,chart3);
         //List of land cover categories
         

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
 
};

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
      app.filters.mapCenter,
      app.picker.select,
      app.picker.centerButton,
      app.btn_CART.button,
      app.btn_RF.button,
    ];
    loadDependentWidgets.forEach(function(widget) {
      widget.setDisabled(enabled);
    });
  };

  /** Applies the selection filters currently selected in the UI. */
    app.applyFilters = function() {
    app.setLoadingMode(true);
   
    ////////////////////////////////////////////////////////////////////////////////////error//////
   
   
   
   
    var filtered = ee.ImageCollection(app.COLLECTION_ID)
    
    
    var filtered2 = ee.ImageCollection(app.RadarID)
  
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
 

  
 
  /** Refreshes the current map layer based on the UI widget states. */
  app.refreshMapLayer = function() {
    
    Map.clear();
    var imageId = app.picker.select.getValue();
    var imageId1 = app.picker.select.items().get(0);
    
    if (imageId) {
      // If an image id is found, create an image.
      var imagepre = ee.Image(app.COLLECTION_ID + '/' + imageId).clip(SM);
      
      var qa = imagepre.select('QA60');

      // Bits 10 and 11 are clouds and cirrus, respectively.
      var cloudBitMask = 1 << 10;
      var cirrusBitMask = 1 << 11;

      // Both flags should be set to zero, indicating clear conditions.
      var mask = qa.bitwiseAnd(cloudBitMask).eq(0).and(qa.bitwiseAnd(cirrusBitMask).eq(0));
      
      var image = imagepre.updateMask(mask).divide(10000);
     
      var layer;
      var image1= ee.Image(app.COLLECTION_ID + '/' + imageId1).clip(SM);
      if (app.vis.select.getValue() === 'NDVI (B8-B4/B8+B4)') {
        layer = s2ndvi(image);
      } else {
        layer = image;
      }
      var layer2;
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
      
      //AVI (B8*((1-B4)*(B8-B4)))^(1/3)
      if (app.vis.select.getValue() === 'AVI (B8*((1-B4)*(B8-B4)))^(1/3)') {
        layer = s2avi(image);
        //print(image)
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


      /////////////// Create chart ///////////////
      // Create a panel to hold our widgets.
      var panel2 = ui.Panel();
      panel2.style().set('width', '300px');
      
      // Create an intro panel with labels.
      var intro2 = ui.Panel([
        ui.Label({
          value: 'Chart Inspector',
          style: {fontSize: '14px', fontWeight: 'bold'}
          
        }),
        ui.Label('Click a point on the map to inspect.')
       
      ]);
    
    panel2.add(intro2);
          // Create panels to hold lon/lat values.
      var lon = ui.Label();
      var lat = ui.Label();
      panel2.add(ui.Panel([lon, lat], ui.Panel.Layout.flow('horizontal')));// add coordinates of the point
      
      // Register a callback on the default map to be invoked when the map is clicked.
      Map.onClick(function(coords) {
        panel2.clear();
        // Update the lon/lat panel with values from the click event.
        lon.setValue('lon: ' + coords.lon.toFixed(2)),
        lat.setValue('lat: ' + coords.lat.toFixed(2));
      
        // Add dot for the point clicked on.//buffer of 1Km as well
        var point = ee.Geometry.Point(coords.lon, coords.lat).buffer(1000);
        var dot = ui.Map.Layer(point, {color: '000000'});
        Map.layers().set(1, dot);
    
        // Create an Band spectrum chart.
        var bandsChart = ui.Chart.image.series(app.ImageCollection_filtered.select(['B8', 'B4', 'B3'],['nir', 'red', 'green']), forest)
            .setOptions({
              title: 'bands Reflectance',
              vAxis: {title: 'Bands value'},
              hAxis: {title: 'Date', format: 'MM-yy', gridlines: {count: 7}},
              
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
              hAxis: {title: 'Date', format: 'MM-yy', gridlines: {count: 7}},
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
              hAxis: {title: 'Date', format: 'MM-yy', gridlines: {count: 7}},
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
              hAxis: {title: 'Date', format: 'MM-yy', gridlines: {count: 7}},
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
              hAxis: {title: 'Date', format: 'MM-yy', gridlines: {count: 7}},
            });
        panel2.widgets().set(9, npcriChart);
        
      });
      
      Map.style().set('cursor', 'crosshair');
      
   ui.root.insert(1, panel2);
    
    }
   
  };
}; 


/////////////////////////////////////////////////////////////////////////
////////////////function to cloud mask sentinel 2 images////////////////
//////////////////////////////////////////////////////////////////////
 function maskS2clouds(image) {
  var qa = image.select('QA60');

  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = ee.Number(2).pow(10).int();
  var cirrusBitMask = ee.Number(2).pow(11).int();

  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0).and(
             qa.bitwiseAnd(cirrusBitMask).eq(0));

  // Return the masked and scaled data.
  return image.updateMask(mask).divide(10000)
  .copyProperties(image,["system:time_start"])
}

function s2ndmi(image){
  var ndmi = image.normalizedDifference(['B8', 'B11']);
  return image.addBands(ndmi);
}///////////here
                 
function s2ndvi(image){
  var ndvi = image.normalizedDifference(['B8', 'B4']);
  return image.addBands(ndvi);
}
function s2npcri(image){
  var npcri = image.normalizedDifference(['B4', 'B2']);
  return image.addBands(npcri);
}
function s2avi(image){
  var avi = image.expression(
    '(B8 * ((1 - B4) / (B8 - B4)))^(1/3)', {
      'B8': image.select('B8'),
      'B4': image.select('B4')
  });
  return image.addBands(avi);
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



////////////////////////Calculate Change Detection for different indexes//////////////////////////////

function s2cva4VegIndex(imageId1, imageId, index){
  var visOption = app.VIS_OPTIONS[app.vis.select.getValue()];
   
  if (index === 'NDVI (B8-B4/B8+B4)'){
        var transf_1 = s2ndvi(imageId1)
        var transf_2 = s2ndvi(imageId)
        var diff=transf_2.select('nd').subtract(transf_1.select('nd'));
        var pow=diff.pow(2);
        var sq=pow.sqrt();
        var cos=transf_1.divide(sq);
        var dir= cos.acos();
        var paletteZ = ['FFFF00','FF0000', '0000FF', '00FF00'];
        var std=diff.reduce(ee.Reducer.stdDev());
        var thres=std.multiply(1);
        //if subtract thres-diff positive true change else nothing
        var truechange= thres.subtract(diff);
        var mask=truechange.lt(0);
        var mask2=truechange.lt(0.2);
        var class1=mask2.subtract(mask);
        var mask3=truechange.lt(0.4);
        var class2=(mask3.subtract(mask2)).multiply(2);
        var mask4=truechange.gte(0.4);
        var class3=(mask4.subtract(mask3)).multiply(3);
        var change=class3.eq(3).add(class2.eq(2)).add(class1.eq(1))
        
        Map.addLayer(change.clip(SM), {min:0,max:3,palette: ['FFFF00','FF0000']}, 'NDVI change detection map');
        //.updateMask(sq.gt(0)), {min: 1, max: 4, palette: paletteZ}, 'type zones');
        var min = sq.min(sq);
        console.log(min.get('nd'));
        //console.log(image1.addBands(sq))
  } else if (index === 'NDWI (B3-B8/B3+B8)') {
        
        var transf_3 = s2ndwi(imageId1)
        var transf_4 = s2ndwi(imageId)
        var diff_ndwi=transf_4.subtract(transf_3);
        print(transf_3)
        print(transf_4)
        print(diff_ndwi)
        
        var vizParams = diff_ndwi.visualize({
          palette: ['00FFFF', '0000FF']
        });
        
        Map.addLayer(diff_ndwi,vizParams);
  } else if (index === 'NBR (B8-B12/B8+B12)') {
        var transf_5 = s2nbr(image1)
        var transf_6 = s2nbr(image)
        var diff_nbr=transf_6.subtract(transf_5);
        var pow_nbr=diff_nbr.pow(2);
        var sq_nbr=pow_nbr.sqrt();
        Map.addLayer(sq_nbr)
        
  } else if (index === 'BSI ((B11+B4)-(B8+B2))/((B11+B4)+(B8+B2))') {
        var transf_7 = s2bsi(image1)
        var transf_8 = s2bsi(image)
        var diff_bsi=transf_8.subtract(transf_7);
        //var pow_bsi=diff_bsi.pow(2);
        //var sq_bsi=pow_bsi.sqrt();
        Map.addLayer(diff_bsi)
  } else if (index === 'AVI (B8*((1-B4)*(B8-B4)))^(1/3)') {
        var transf_9 = s2avi(image1)
        var transf_10 = s2avi(image)
        var diff_avi=transf_10.subtract(transf_9);
        var pow_avi=diff_avi.pow(2);
        var sq_avi=pow_avi.sqrt();
        Map.addLayer(sq_avi)
  }else if (index === 'NPCRI (B4-B2/B4+B2)') {
        var transf_11 = s2npcri(image1)
        var transf_12 = s2npcri(image)
        var diff_npcri=transf_12.subtract(transf_11);
        var pow_npcri=diff_npcri.pow(2);
        var sq_npcri=pow_npcri.sqrt();
        Map.addLayer(sq_npcri)
  }
} 




//end s2cva4VegIndex

////////////////////////////////////////////////////////////////////////////////////////////////////////////////Here

var palette = [ 'FFFFFF', 'CE7E45', 'DF923D', 'F1B555', 'FCD163', '99B718',
               '74A901', '66A000', '529400', '3E8601', '207401', '056201',
               '004C00', '023B01', '012E01', '011D01', '011301'];

 var ndwiViz = ['00FFFF', '0000FF'];
 
 var nbrViz =['00FFFF','Green','Yellow','Red']
 var bsiViz=['00ff00','00ad00']
 var sld_intervals =
  '<RasterSymbolizer>' +
    '<ColorMap  type="intervals" extended="false" >' +
      '<ColorMapEntry color="#0000ff" quantity="-0.1" label="Enhanced Regrowth"/>' +
      '<ColorMapEntry color="#00ff00" quantity="0.1" label="Unburned" />' +
      '<ColorMapEntry color="#007f30" quantity="0.27" label="Low Severity" />' +
      '<ColorMapEntry color="#30b855" quantity="0.66" label="Moderate Severity" />' +
      '<ColorMapEntry color="#ff0000" quantity="1" label="High Severity" />' +
    '</ColorMap>' +
  '</RasterSymbolizer>';
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
  //app.ImageCollection_filtered_2=ee.ImageCollection('LANDSAT/LC8_L1T');
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
    'AVI (B8*((1-B4)*(B8-B4)))^(1/3)': {
      description: 'Advanced Vegetation Index  ' +
                   '',
      visParams:  {min: -0.6, max: 1,  palette:nbrViz, bands: ['nd']}//
    },
    //AVI (B8*((1-B4)*(B8-B4)))^(1/3)
    
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
      app.picker.panel,
      app.vis.panel,
      app.btn_CART.panel,
      app.btn_RF.panel,
    ],
    style: {width: '350px', padding: '15px'}
  });
  
 ui.root.insert(0, main);
  

  Map.setCenter(-25.6666698, 37.7333298, 10);  
  
  
  app.applyFilters();


};
 



app.boot();
     
