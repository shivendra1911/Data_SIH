# Himalayan Flood Prediction Data Sources Research

This document compiles the research on open/free APIs and historical datasets required for training and operating a real-time Himalayan flood prediction model.

## 1. Primary Prediction Factors (APIs & Datasets)

### 1.1 Rainfall Intensity (mm/hr)
*   **NASA POWER API (Prediction of Worldwide Energy Resources)**
    *   **Endpoint:** `https://power.larc.nasa.gov/api/temporal/daily/point` (or hourly)
    *   **Auth:** Free, no API key required for standard usage.
    *   **Format:** JSON, CSV.
    *   **Coverage:** Global (includes Uttarakhand/Himalayas).
    *   **Integration:** Use Python `requests` library. Useful for historical training data (`PRECTOTCORR` parameter).
*   **India Meteorological Department (IMD)**
    *   **Access:** Use the open-source Python library `imdlib` to fetch historical gridded rainfall data without API keys.
    *   **Format:** NetCDF / Binary (converted to CSV via xarray/pandas).
    *   **Coverage:** India (high resolution 0.25° x 0.25°).
    *   **Real-time:** Official APIs exist at `api.imd.gov.in` but require IP whitelisting/Nodal Officer approval.

### 1.2 Soil Moisture Saturation (%)
*   **Copernicus Climate Data Store (CDS API)**
    *   **Endpoint:** Accessed via `cdsapi` Python package.
    *   **Auth:** Free registration required to get an API key (saved in `~/.cdsapirc`).
    *   **Format:** NetCDF (parse with xarray).
    *   **Coverage:** Global (includes Himalayas).
*   **ESA Climate Change Initiative (CCI)**
    *   **Access:** Python package `esa_cci_sm`.
    *   **Format:** NetCDF.
*   **ISRO Bhuvan**
    *   **Access:** Bhuvan NOEDA (Open Data Archive) provides Soil Moisture and NDVI data. Requires user registration. Data often downloaded manually or via Web Map Services (WMS).

### 1.3 Terrain Slope (Degrees/DEM)
*   **ISRO Bhuvan / CartoDEM**
    *   **Access:** Free via Bhuvan portal.
    *   **Coverage:** India (high resolution 30m).
*   **USGS / NASA SRTM (Shuttle Radar Topography Mission)**
    *   **Endpoint:** Earthdata Search / OpenTopography API.
    *   **Auth:** Free Earthdata account required.

### 1.4 River Water Levels & Discharge (m)
*   **India-WRIS (Water Resources Information System)**
    *   **Endpoint:** APIs managed by the National Water Informatics Centre (NWIC) at `nwic.gov.in`.
    *   **Auth:** Government registration may be required for bulk/live data access.
    *   **Coverage:** Indian river basins.
*   **Central Water Commission (CWC)**
    *   **Access:** CWC does not provide a direct open API. Data is disseminated through `ffs.india-water.gov.in`. Historical data requires a formal request (Hydrological Data Request Form).

### 1.5 Seismic Magnitude (Richter)
*   **USGS Earthquake API (FDSN Event Web Service)**
    *   **Endpoint:** `https://earthquake.usgs.gov/fdsnws/event/1/query`
    *   **Auth:** 100% Free, no authentication or API keys required.
    *   **Format:** GeoJSON, CSV.
    *   **Coverage:** Global.
    *   **Integration:** Use standard `requests.get()` in Python. Filter by `starttime`, `endtime`, `minmagnitude`, and spatial bounding boxes for the Himalayas.

---

## 2. Historical Flood Event Datasets

These datasets are critical for training the AI model to recognize pre-disaster conditions.

### 2.1 Kedarnath Disaster (June 2013)
*   **Rainfall:** IMD 0.25° Gridded Rainfall Data (1901-2024 archive). Accessible via `imdlib` or IMD Pune portal.
*   **Flood Mapping:** Copernicus Emergency Management Service (EMS) JRC Data Catalogue (search: "Floods in Uttarakhand state - India (2013-06-27)"). Vector/Raster formats.

### 2.2 Chamoli Glacier Burst (February 2021)
*   **Geospatial & Impact Data:** Environmental Information Data Centre (EIDC) provides shapefiles for buildings, infrastructure, and river channel reaches.
*   **DEMs:** National Snow and Ice Data Center (NSIDC) provides pre-event 2-m DEM composites.
*   **Satellite:** NASA Earthdata and Copernicus Sentinel-2 (Feb 2021 archives).

### 2.3 Nepal Floods (2024)
*   **Source:** Humanitarian Data Exchange (HDX).
*   **Datasets:** UNOSAT satellite-derived flood extent (Shapefiles, Geodatabases). Search "Nepal Flooding 2024" on data.humdata.org.
*   **Impact Data:** Bipad Portal (Nepal DRR Portal) hosts historical CSVs on fatalities and affected households.

### 2.4 Nepal Langtang Flood/Debris Flow (August 2026)
*   **Source:** Source Cooperative (Planet Labs) STAC catalog for high-res satellite imagery of the Bhote Koshi–Trishuli corridor.
*   **Impact Data:** Humanitarian Data Exchange (HDX) for damage mapping and building footprints.
*   **Note:** Identified geologically as a debris avalanche/flash flood triggered by a glacier-rock collapse rather than a standard GLOF.

---

## 3. Integration Plan for `fetch_realtime_data.py`

1.  **USGS API (Seismic):** Direct HTTP GET requests using `requests` (JSON parsing).
2.  **NASA POWER (Weather/Rainfall):** Direct HTTP GET requests using `requests` (JSON parsing).
3.  **Copernicus CDS (Soil Moisture):** Integrate the `cdsapi` Python client.
4.  **CWC/India-WRIS (River Levels):** Web scraping of public dashboards (e.g., `ffs.india-water.gov.in`) or formal API requests via NWIC if credentials can be acquired.
5.  **Terrain Data (DEMs):** Downloaded offline as GeoTIFF files and processed locally using `rasterio` to calculate slopes dynamically based on coordinates.
