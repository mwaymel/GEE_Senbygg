# Automatic detection of changes in buildings using Sentinel 1 on Google Earth Engine (GEE) - SENBYGG project

The Senbygg project aims to detect changes in buildings using data from the Sentinel-1 satellite. Sentinel-1, a radar satellite, provides information on height variations by comparing images taken at different times. By comparing median images from consecutive years, the code can identify the construction or demolition of buildings and generate annual change maps.
The original project was funded by the Framework Partnership Agreement on Copernicus User Uptake (FPCUP) and the Norwegian Space Agency (NOSA). The action was coordinated by NOSA with the Norwegian Mapping Authority (NMA) as an implementing partner and NORCE as a sub-contractor to the NMA. Several Python code files were developed during the initial project, which Torgeir Ferdinand Klingenberg later adapted for our specific case study, enhancing their usability.
This new Senbygg study aimed to adapt the code for the specific area of study, update calls to external resources if necessary, and test the accuracy of the code by comparing it to field data. It was also planned to explore other potential detection methods if any appeared promising and to test their accuracy.

*SENBYGG project.pdf* is the report of this project.

*GEE_Senbygg.js* is the GEE code file.

In the *Areas of interest* folder can be found the areas of interest and some field data.

The *GEE results* folder contains all the output from GEE.

*GEE_senbygg.qgz* is a QGIS project with all output layers.

## Steps to run the code

### Make your GEE code file

To use GEE, a Google account is needed. Go to this webside [https://code.earthengine.google.com/](https://code.earthengine.google.com/) and connect to your Google account.

In the left pannel, choose **Scripts** and *NEW* -> *Repository*. Name your repository (ex: *Senbygg*).

Then *NEW* -> *File*, check the right repository is selected and name your file (ex: *GEE_Senbygg*).

Now, you simply have to Copy and Paste the content of the code file *GEE_Senbygg.js* in your new GEE file. If needed, adapt the area of interest and the parameters in the first section **PARAMETERS TO SET**.

### Upload the input files needed

In the *Input data* folder are the ground truth data and the file of sea level correction in Norway. Both are needed to run the code.

You need to upload them in your GEE account. First, dowmload them from GitHub. 
Then click on **Assets** in the left pannel. Choose *NEW* -> *Shape files* for the area of interest. Pay attention to select all the files with name *vector_Fjoloy_truth_0_20* EXCEPT the QMD extension from your computer, you can keep the default naming, and then UPLOAD.

By refreshing the **Assets** pannel, the new assets should appear. For both, click on it and copy **Image ID** (left side), then paste it in the first section **PARAMETERS TO SET** for the area name.

Don't forget to **Save** your changes, and click on **Run** to execute the code.

## Output

### Data displayed on GEE

When running the code, the layers should slowly appeard on the down map pannel. You can choose which maps you want to display by pointing on *Layers* and checking or unchecking. You can also set some transparency and change the color settings there.

### Downloading the data

On the top of the right pannel, you can also choose **Tasks**, which normally becomes orange. Then, in **UNSUBMITTED TASKS**, you have all the output data of the algorithm to download in raster or vector version. 
The data can only be exported to your Google Drive [https://drive.google.com/drive/u/0/my-drive](https://drive.google.com/drive/u/0/my-drive). The export might take some time. In the end, it will appear on your Drive, in the folder specified in the section **PARAMETERS TO SET** (and create it if it does not exist yet). Then, you just have to download the data on your computer from your Drive.

