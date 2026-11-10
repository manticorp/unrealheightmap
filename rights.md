<!-- Generated from rights.html by scripts/build-agent-docs.js. Do not edit by hand. -->
Source: https://manticorp.github.io/unrealheightmap/rights.html
Title: Data Licences · 16/32 Bit Heightmap Generator
Summary: Licences, attribution and usage rights for the elevation data and map imagery used by the 16/32 Bit Heightmap Generator.

# Map License Information

## AWS Terrain Tiles (Mapzen) Elevation Data

When "AWS Terrain Tiles" is chosen as the elevation data (the default), heights come from the [Terrain Tiles dataset on the Registry of Open Data on AWS](https://registry.opendata.aws/terrain-tiles/). [Mapzen](https://www.mapzen.com/blog/elevation/) originally built it, and the tiles stayed available as open data after Mapzen shut down.

It is not 100% clear what the usage rights for the heightmaps are now. This was the ["rights" page that appeared on the Mapzen site.](https://www.mapzen.com/rights/#services-and-data-sources)

This was their [attribution guidance](https://github.com/tilezen/joerd/blob/master/docs/attribution.md), specifically.

If in doubt, the following snippet should be included on your project:

© [Mapzen](https://www.mapzen.com/rights), [OpenStreetMap](https://openstreetmap.org/copyright), and [others](https://www.mapzen.com/rights/#services-and-data-sources).

```
© <a href="https://www.mapzen.com/rights">Mapzen</a>,  <a href="https://openstreetmap.org/copyright">OpenStreetMap</a> , and <a href="https://www.mapzen.com/rights/#services-and-data-sources">others</a>.
```

## Mapterhorn Elevation Data

When "Mapterhorn" is chosen as the elevation data, heights come from [Mapterhorn](https://mapterhorn.com), an open-data project that combines Copernicus GLO-30 worldwide with high-resolution national datasets, including USGS 3DEP for the USA and lidar for the UK and much of Europe.

Each source has its own licence. The full list is on the [Mapterhorn attribution page](https://mapterhorn.com/attribution). If in doubt, include:

© [Mapterhorn](https://mapterhorn.com/attribution) and the open-data sources listed there.

## NOAA ETOPO 2022 (Land and Sea Floor)

When "NOAA ETOPO 2022" is chosen, heights come from NOAA's National Centers for Environmental Information, served through their DEM mosaic service. NOAA data is in the public domain. Please credit:

NOAA National Centers for Environmental Information (2022): ETOPO 2022 15 Arc-Second Global Relief Model. [doi:10.25921/fd45-gt74](https://doi.org/10.25921/fd45-gt74)

## Mars, Moon and Mercury Elevation Data

Mars heights come from the MGS MOLA global DEM (463 m), Moon heights from the LRO LOLA global DEM (118 m) and Mercury heights from the MESSENGER global DEM (665 m), all NASA mission data published by [USGS Astrogeology](https://astrogeology.usgs.gov) and in the public domain. The Gale crater model is the 1 m HiRISE stereo DEM mosaic made for the Mars Science Laboratory (Curiosity) mission by NASA, JPL, the University of Arizona and USGS, also in the public domain. Please credit the mission science team, NASA and USGS Astrogeology. The Mars and Moon base maps are from [OpenPlanetaryMap](https://www.openplanetary.org/opm), built from NASA, USGS and ESA data; the Mercury and Gale crater base maps are drawn in your browser from the elevation data.

The treemap uses [ESA WorldCover](https://esa-worldcover.org) 2021 tree cover (© ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021) processed by the ESA WorldCover consortium, CC BY 4.0), read through [Microsoft's Planetary Computer](https://planetarycomputer.microsoft.com/dataset/esa-worldcover), and in Switzerland the vegetation height model of the Swiss National Forest Inventory (© BAFU / WSL / swisstopo, [Swiss open government data](https://www.geo.admin.ch/en/general-terms-of-use-fsdi)). Leaf types come from OpenStreetMap. Please credit them when you publish work made with the treemap.

## OpenStreetMap Layers

The OpenStreetMap layer masks are drawn from data © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), available under the [Open Database License (ODbL)](https://opendatacommons.org/licenses/odbl/), fetched through the [Overpass API](https://overpass-api.de). If you publish something made with them, credit "© OpenStreetMap contributors".

## Other Maps (Preview and Albedo)

Each preview map shows a link to its copyright information at the bottom of the map display.

Albedo images made with "Generate Albedo" come from the selected preview map, so they're covered by that provider's terms. Some of these don't allow commercial use, so check before shipping them in a product.

Most map providers can be found [on the leaflet providers page](https://leaflet-extras.github.io/leaflet-providers/preview/).

## Place Search

Place search uses [Photon](https://photon.komoot.io) by Komoot, which uses data © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors.
