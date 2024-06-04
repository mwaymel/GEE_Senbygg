//This is a Javascript code for running in Google Earth Engine

//Authors: Mathilde Waymel for Kartverket - Adapted version from SENBYGG python code

//_________________________________________________________________________________________________
//_________________________________________________________________________________________________

//              This code spots the changes in buildings using Sentinel1 data


//_____________________________________PARAMETERS TO SET___________________________________________

//Area of interest
var area = ee.FeatureCollection("users/majuwa/senbygg/Trondheim_area");

//Period of interest
var year_start = '2019';
var year_end_included = '2023';

//Export parameters
var name_export = 'Trondheim_area_10m';
var export_folder = 'Senbygg GEE';
var scale = 10; 

//Ground truth layer (if available)
var ground_truth_building = ee.FeatureCollection("users/majuwa/senbygg/Bygningsendring_Verdal_2020_2023");


//Algorithm parameters
var Thr_vv = 3.0; //Detection threshold on backscatter difference in VV channel [in dB]
var Thr_vh = 3.0; //Detection threshold on backscatter difference in VH channel [in dB]
var Thr_ndet = 4; //Required no. detections over all tracks and polarisations for overall decision to be change
var Thr_ns = 2;//8 //Minimum no. samples per track
var Thr_coh = 0.22; //Threshold on coherence value

var PositiveChangeValue = 1;
var NegativeChangeValue = 2;


//_________________________________________________________________________________________________

//_________________________Image collection building__________________________

var Coll_img = ee.ImageCollection('COPERNICUS/S1_GRD')
        .filter(ee.Filter.eq('instrumentMode', 'IW'))
        .filter(ee.Filter.date(year_start+'-01-01', year_end_included+'-12-31'))
        .filterBounds(area.geometry())
        .map(function(image) {
          var edge = image.lt(-30.0);
          var maskedImage = image.mask().and(edge.not());
          return image.updateMask(maskedImage);
        });

//_________Masking water and vegetation________
var cloudBitMask = ee.Number(2).pow(10).int();
var cirrusBitMask = ee.Number(2).pow(11).int();
function mask_quality(img){
  var qa = img.select('QA60');
  var ma = qa.bitwiseAnd(cloudBitMask).eq(0).and(
             qa.bitwiseAnd(cirrusBitMask).eq(0));
  img = img.mask(ma);
  return img;
}
var sentinel2 = ee.ImageCollection('COPERNICUS/S2_SR').filterBounds(area.geometry());
sentinel2 = sentinel2.filter(ee.Filter.date(year_end_included+'-05-01', year_end_included+'-10-30'));
sentinel2 = sentinel2.map(mask_quality);
var median_s2 = sentinel2.reduce(ee.Reducer.median());
var ndwi_water_mask = median_s2.normalizedDifference(['B3_median', 'B8_median']).rename('NDWI');
var ndvi_vegetation_mask = median_s2.normalizedDifference(['B8_median', 'B4_median']).rename('NDVI');

function mask_water_veg(img){
  img = img.updateMask(ndwi_water_mask.lte(0));
  img = img.updateMask(ndvi_vegetation_mask.lt(0.15));
  return img;
}
Coll_img = Coll_img.map(mask_water_veg);

//_______Available orbits for the area_____
var relative_orbits = Coll_img.aggregate_array('relativeOrbitNumber_start').distinct();
print('Available orbits', relative_orbits);
function sort_by_orbit(orbit) {
    var img_orbit = Coll_img.filter(ee.Filter.eq('relativeOrbitNumber_start', orbit));   
    return img_orbit;
  }
var list_img_by_orbit = relative_orbits.map(sort_by_orbit);
var years = ee.List.sequence(ee.Number.parse(year_start), ee.Number.parse(year_end_included)); 
print('Years', years);


//_____________Computation of the mean change image for each year for each orbit__________

//_____Threshold images______
var img_Thr = ee.Image([Thr_vv,Thr_vh]).rename(['VV', 'VH']);
var img_null = ee.Image([0,0]).rename(['VV', 'VH']);  

function detect_change_by_orbit(ImgColl) {
  //Takes an imagecollection of images available for one orbit and return an Image of 3 bands (change, changetype, confidence)
  
  //Get the mean image for each year
  var mean_by_year = years.map(function mean_by_year(year) {
    var year_nb = ee.String(ee.Number(year)).slice(0,4);
    var img_given_year = ee.ImageCollection(ImgColl).filter(ee.Filter.date(year_nb.cat('-01-01'), year_nb.cat('-12-31')));
    var nb_img_year_orbit = img_given_year.count();
    var mean_year_orbit = img_given_year.mean();    //contains 3 mean bands (VV, VH, angle)
    mean_year_orbit = ee.Image(ee.Algorithms.If(mean_year_orbit.bandNames().length().subtract(1), mean_year_orbit, img_null)); 
    return ee.Image(mean_year_orbit).set(ee.Dictionary(['year', year, 'nb_img_year_orbit', nb_img_year_orbit])).select(['VV', 'VH']);
  });
  
  //__________missing test enough list_nb_img_orbit
  //__________missing confidence

  //Compute the change compared to the year before
  var one_orbit_change_with_year_before = ee.List.sequence(1, years.size().subtract(1)).map(function(y) { 
    var mean_y1 = ee.Image(mean_by_year.get(ee.Number(y).subtract(1)));
    var mean_y2 = ee.Image(mean_by_year.get(y));
  
    var diff_mean = mean_y2.subtract(mean_y1);
    diff_mean = ee.Image(ee.Algorithms.If(diff_mean.bandNames().length().subtract(1), diff_mean, img_null)); 

    var img_detect = diff_mean.abs().gte(img_Thr);
    img_detect = ee.Image(ee.Algorithms.If(img_detect.bandNames().length().subtract(1), img_detect, img_null)); 

    var detect_total_year = img_detect.select('VH').add(img_detect.select('VV'));

    var change_positive_year = diff_mean.select('VH').gte(img_Thr.select('VH')).or(diff_mean.select('VV').gte(img_Thr.select('VV')));
    var change_negative_year = diff_mean.select('VH').lte(img_Thr.select('VH').multiply(-1)).or(diff_mean.select('VV').lte(img_Thr.select('VV').multiply(-1)));

    var img_output = ee.Image([detect_total_year.rename('detect_total_year'), change_positive_year.rename('change_positive_year'), change_negative_year.rename('change_negative_year')]);
    return img_output.set(ee.Dictionary(['period', ee.String(years.get(ee.Number(y).subtract(1))).slice(0,4).cat('-').cat(ee.String(years.get(y)).slice(0,4))])); 
  });
  
  return one_orbit_change_with_year_before;
}

var listImg_change_by_orbit = list_img_by_orbit.map(detect_change_by_orbit);
print('List change by orbit and by year', listImg_change_by_orbit);


//_________Computation of the change image for each year taking all orbits into account__________

function detect_change_by_year(y) {
  var list_Change_one_year = listImg_change_by_orbit.map(function get_year(listImg_change_one_orbit) {
    return ee.List(listImg_change_one_orbit).get(y);
  });
  var period_value = ee.Image(list_Change_one_year.get(0)).get('period');
  var ImgSum_Thr_ndet = ee.ImageCollection(list_Change_one_year).sum().gte(ee.Image([Thr_ndet, Thr_ndet, Thr_ndet]));
  return ee.Image(ImgSum_Thr_ndet).set(ee.Dictionary(['period', period_value]));
}
var ImgColl_change_by_year = ee.ImageCollection(ee.List.sequence(0, years.size().subtract(2)).map(detect_change_by_year));
print('Change by year', ImgColl_change_by_year);


//_____________change_year_____________
function new_format_change_year(y) {
  var year_value = ee.Number.parse(ee.String(ee.Image(y).get('period')).slice(-4));
  var img_year = y.select('detect_total_year');
  return img_year.multiply(year_value).toInt();
}
var change_year = ImgColl_change_by_year.map(new_format_change_year).max();
change_year = change_year.updateMask(change_year.neq(0));


//____________change_type_______________
function positive_change_type(y) {
  return y.select('change_positive_year');
}
var positive_change_year = ImgColl_change_by_year.map(positive_change_type).max();
function negative_change_type(y) {
  return y.select('change_negative_year');
}
var negative_change_year = ImgColl_change_by_year.map(negative_change_type).max();

var change_type = positive_change_year.multiply(PositiveChangeValue).add(negative_change_year.multiply(NegativeChangeValue));
change_type = change_type.updateMask(change_year.neq(0));


//______________change_confidence__________

//______missing

//_________________________COMPARISON GROUND TRUTH______________________

//______missing


//___________________________________Display_____________________________

Map.centerObject(area);
Map.addLayer(ee.Image().byte().paint({featureCollection: area,color: 1,width: 3}), {palette: 'FF0000'}, 'area of interest');

var imageVisParam = {"opacity":1,"bands":["detect_total_year"],"min":2019,"max":2023,"palette":["ffffff","00ff03","00d2ff","0f00ff"]};
Map.addLayer(change_year, imageVisParam, 'Change by year');

var imageVisParam = {"opacity":1,"palette":["ff0000","0014ff","00ff0f"]};
Map.addLayer(change_type, imageVisParam, 'Change type');

Map.addLayer(ground_truth_building, {color: 'FF0000'}, 'building ground truth');

//_______________________________________________________________________
//===================================EXPORTS=============================

var change_year_name_export = name_export + '_change_year_'+year_start+'_'+year_end_included;
var change_type_name_export = name_export + '_change_type_'+year_start+'_'+year_end_included;

var area_geom = ee.Geometry(area.geometry()).transform();
var projection = area_geom.projection().getInfo(); 

//change_year
Export.image.toDrive({
  image: change_year,
  description: change_year_name_export,
  folder: export_folder,
  scale: scale,
  crs: projection.crs,
  region: area
});

//change_type
Export.image.toDrive({
  image: change_type,
  description: change_type_name_export,
  folder: export_folder,
  scale: scale,
  crs: projection.crs,
  region: area
});

