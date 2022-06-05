# ForestAZ
ForestAZ, ForestAz - Using Google Earth Engine and Copernicus Sentinel data for forest mapping, assessment and monitoring in small oceanic islands – the case-study of S. Miguel Island.

## Introduction
ForestAZ is an open tool conceived to help public stakeholders from Sao Miguel island in Azores. The tool provides useful information such time-series analysis of main vegetation indexes values throughout the time, up-to-date forest invetory classification, Above Ground Carbon (AGC) estimation per specie within the offical forest perimeter of Sao Miguel island. In addition it maps the main vegetation indexes in all the island. 

ForestAZ application is available in the following link to use it: [ForestAZ](https://manuferu.users.earthengine.app/view/forestaz)

In addition, the code and features used to develop de app and the information on how to recreate the application are within this repository [ForestAZ repo](https://github.com/Manuferu/ForestAZ).

## Features:

#### ForestAZ.js:
 Code based on Javascript to be placed in Google Earth Engine playground repository
#### Shapefiles:
 In this folder you will find all shapefiles used in the ForestAZ.js.
 the list of shapefiles are:
 - Perimetroforestal_SM : This shapefile contains the forest boundaries of the island.

 - SM_Admin0 : This shapefile contains the administrative boundary level 0 of Sao Miguel island.

 - Points: This shapefile contains points with different tree species taken from the last official forest inventory from DRRF (Azores Regional Authority in Forest Affairs). This points have been used in the code to both train and validate the classification by splitting them in 70% for training and 30% for validating.

It has been used [Sentinel-2 MSI, Level-2A](https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S2_SR) and [Sentinel-1 SAR GRD](https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S1_GRD?hl=en). Sentinel 2 product is surface reflectance, it has been corrected using [cloud removal algorithm](https://github.com/fitoprincipe/geetools-code-editor) from the effects of the atmosphere, terrain and cirrus correction from the Top of Atmosphere Level 1C implemented by Rodrigo E. Principe 2019.

Sentinel 1 GRD (Ground Range Detected), uses [Sentinel-1 Toolbox](https://elib.dlr.de/89926/) to generate calibrated and orthocorrected product. Each scene was pre-processed using Sentinel-1 toolbox in the following steps: thermal noise removal, radiometric calibration, terrain correction using SRTM 30 and ASTER DEM.

Since the area of study is based in Sao Miguel island, it has been applied a transformation from Sentinel 1 GRD to Sentinel 1 ARD (Analysis Ready) to mitigate the radiometric distorsions caused by topography. To do that, it has been implemented developed by Moulissa et al. 2021 that implements additional border noise correction, speckle filtering  and radiometric terrain normalization.

## How it works

To make it run in your side, you will need to create a [Google Earth Engine account](https://developers.google.com/earth-engine). Once the account is set, you will be able to copy paste the code in your [GEE console](https://code.earthengine.google.com/). After doing that, you can save the file with the name you want in your account.

## Contact:

 For any queries regarding this project, please do contact the corresponding authors through:

 Manuel Fernandez : manuel.fernandez@ichec.ie
 Artur Gil : artur.jf.gil@uac.pt 

## References:

- Mullissa, A.; Vollrath, A.; Odongo-Braun, C.; Slagter, B.; Balling, J.; Gou, Y.; Gorelick, N.; Reiche, J. Sentinel-1 SAR Backscatter Analysis Ready Data Preparation in Google Earth Engine. Remote Sens. 2021, 13, 1954. https://doi.org/10.3390/rs13101954
- Principe, Rodrigo E. 2022. cloud masks. https://github.com/fitoprincipe/geetools-code-editor/blob/master/cloud_masks (2022)


[![License: CC BY 4.0](https://img.shields.io/badge/License-CC%20BY%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by/4.0/)
