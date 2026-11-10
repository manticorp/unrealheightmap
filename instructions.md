<!-- Generated from instructions.html by scripts/build-agent-docs.js. Do not edit by hand. -->
Source: https://manticorp.github.io/unrealheightmap/instructions.html
Title: Documentation · 16/32 Bit Heightmap Generator
Summary: How to export 16-bit PNG and EXR heightmaps, texture maps and 3D models of real-world terrain for Unreal Engine, Godot, Terrain3D, Blender and 3D printing.

# Heightmap Generator Documentation

This tool turns real-world elevation data into heightmaps for Unreal Engine, Godot, Terrain3D, Blender, Unity and 3D printing. It runs entirely in your browser, with nothing to install or sign up for.

You can export:

-   **Heightmaps** as 16-bit PNG, 16- or 32-bit OpenEXR or GeoTIFF, as one file or tiled, rotated, cut to a custom shape or made seamless
-   **Texture maps** that line up with the heightmap: normal, slope, curvature, AO, water flow, aspect, sunlight, height bands, OpenStreetMap masks and rule-painted material weightmaps
-   **Splines and scatter points** for roads, rivers, trees and rocks, with Blender and Unreal scripts
-   **Albedo** (colour) images from satellite, topographic and other map styles
-   **3D models** as STL, OBJ, GLB or multi-colour 3MF, with buildings, labels and lithophanes, and a 3D preview before you download
-   **Contours, laser-cut layers and shaded-relief posters**

**Contents**

1.  [Quick start](https://manticorp.github.io/unrealheightmap/instructions.md#quick-start)
2.  [Finding your way around](https://manticorp.github.io/unrealheightmap/instructions.md#layout)
3.  [Finding a place and sharing links](https://manticorp.github.io/unrealheightmap/instructions.md#finding)
4.  [Elevation data](https://manticorp.github.io/unrealheightmap/instructions.md#elevation-data)
5.  [Output zoom and size](https://manticorp.github.io/unrealheightmap/instructions.md#size)
6.  [Output formats](https://manticorp.github.io/unrealheightmap/instructions.md#formats)
7.  [Tiled exports](https://manticorp.github.io/unrealheightmap/instructions.md#tiling)
8.  [Rotated and custom-shaped areas](https://manticorp.github.io/unrealheightmap/instructions.md#rotation)
9.  [Seamless tiling](https://manticorp.github.io/unrealheightmap/instructions.md#seamless)
10.  [Normalisation](https://manticorp.github.io/unrealheightmap/instructions.md#normalisation)
11.  [Water and extra texture maps](https://manticorp.github.io/unrealheightmap/instructions.md#extra-maps)
12.  [Sea level](https://manticorp.github.io/unrealheightmap/instructions.md#sea-level)
13.  [Carving roads, rivers and lakes](https://manticorp.github.io/unrealheightmap/instructions.md#carve)
14.  [OpenStreetMap layers](https://manticorp.github.io/unrealheightmap/instructions.md#osm)
15.  [Material painter](https://manticorp.github.io/unrealheightmap/instructions.md#painter)
16.  [Real trees (treemap)](https://manticorp.github.io/unrealheightmap/instructions.md#trees)
17.  [Scatter points](https://manticorp.github.io/unrealheightmap/instructions.md#scatter)
18.  [Road and river splines](https://manticorp.github.io/unrealheightmap/instructions.md#splines)
19.  [Albedo](https://manticorp.github.io/unrealheightmap/instructions.md#albedo)
20.  [3D preview and 3D model export](https://manticorp.github.io/unrealheightmap/instructions.md#3d)
21.  [3D printing extras](https://manticorp.github.io/unrealheightmap/instructions.md#printing)
22.  [Contour lines](https://manticorp.github.io/unrealheightmap/instructions.md#contours)
23.  [Elevation profile](https://manticorp.github.io/unrealheightmap/instructions.md#profile)
24.  [Viewshed](https://manticorp.github.io/unrealheightmap/instructions.md#viewshed)
25.  [Sunlight](https://manticorp.github.io/unrealheightmap/instructions.md#sunlight)
26.  [Posters](https://manticorp.github.io/unrealheightmap/instructions.md#poster)
27.  [Importing into Unreal Engine](https://manticorp.github.io/unrealheightmap/instructions.md#unreal)
28.  [Godot, Terrain3D, Blender and Unity](https://manticorp.github.io/unrealheightmap/instructions.md#other-software)
29.  [Georeferencing (QGIS and GIS)](https://manticorp.github.io/unrealheightmap/instructions.md#gis)
30.  [FAQs and troubleshooting](https://manticorp.github.io/unrealheightmap/instructions.md#faq)

## Quick start

1.  **Find your area.** Type a place name in the search box, drag the map, or paste coordinates.
2.  **Choose the elevation data.** Mapterhorn is the most detailed in most places. See [Elevation data](https://manticorp.github.io/unrealheightmap/instructions.md#elevation-data).
3.  **Set the output zoom and size.** The orange rectangle on the map shows exactly what will be exported.
4.  **Choose a format.** For Unreal, use PNG 16-bit with Smart normalisation (the defaults).
5.  **Click Generate Heightmap.** Your file downloads when it's ready. Any extra maps you ticked download with it, and the **Results** tab shows the Unreal scale values and links to the import helpers.

![The map with an orange rectangle marking the export area](https://manticorp.github.io/unrealheightmap/public/im/mapview.png)

The orange rectangle shows the area that will be exported.

## Finding your way around

The map fills the left of the page. The settings are in a sidebar on the right (below the map on phones), grouped into tabs:

Area

Where and how big: latitude, longitude, output zoom, size, map style, rotation, custom shapes and seamless tiling.

Terrain

Where the heights come from and what happens to them: elevation data, sea level, water, and carving roads, rivers and lakes.

Layers

Maps that go with the heightmap: OpenStreetMap masks, the material painter, scatter points and texture maps.

Analysis

Looking at the terrain: elevation profiles, viewsheds, sunlight and contour lines.

3D & Print

3D models, buildings and 3D printing extras (colour bands, labels, lithophanes).

Export

The heightmap file format, tiles, splines, import helpers and posters.

Results

What your last export made: height range, Unreal scale values, download links and notes.

Each tab is made of sections you can fold away; a small label on a folded section shows when it's switched on. The size, resolution and height range of the area, and the **Generate Heightmap** and **Albedo** buttons, stay at the bottom of the sidebar.

The **Map / Split / 3D** switch at the top right of the map shows the map, the 3D preview, or both.

## Finding a place and sharing links

### Search

Type a mountain, valley, lake or town into **Search for a place** and pick a result with the mouse or the arrow keys and Enter. The map moves there. You can also type coordinates into the search box.

### Coordinates

![Latitude and longitude inputs](https://manticorp.github.io/unrealheightmap/public/im/latlng_inputs.png)

Latitude and longitude inputs

Latitude and longitude set the centre of the export. You can type them in, or paste a coordinate string onto the page and the map jumps there. These formats all work:

-   `03°04′33″S 37°21′12″E`
-   `3.0674° S, 37.3556° E`
-   `-3.0674, 37.3556`

### Shareable links

The page address always holds your current location and settings, for example:

`…/unrealheightmap/#lat=27.98791&lng=86.92529&z=13&oz=12&w=1009&h=1009`

Bookmark it to come back to the exact same export, or use **Copy share link** to send it to someone. Settings left at their defaults are left out of the link to keep it short. Old links in the `#latitude/…/longitude/…` format still work.

## Elevation data

Use the **Elevation Data** setting to choose where the heights come from.

Source

Coverage and detail

Max output zoom

AWS Terrain Tiles (Mapzen)

Worldwide. Mostly 30 to 90 m, with 3 to 10 m in the USA. This was the original data source for the tool. It has some known errors, see [FAQs](https://manticorp.github.io/unrealheightmap/instructions.md#faq).

15

Mapterhorn

Copernicus GLO-30 (30 m) worldwide, plus 0.25 to 10 m lidar for the USA (USGS 3DEP), the UK, most of Europe, Japan, New Zealand and more. See [mapterhorn.com](https://mapterhorn.com) for coverage.

18

NOAA ETOPO 2022

Land and sea floor worldwide at about 450 m (15 arc-seconds), with detailed ocean bathymetry. Best for coastlines, islands, sea mounts and ocean trenches.

12

Mapterhorn land + ETOPO sea floor

Mapterhorn's detailed land, with ETOPO's bathymetry wherever Mapterhorn shows flat sea, blended along the coast. The best choice for harbours, coasts and islands. Land below sea level away from the coast (the Dead Sea, polders) keeps its real height.

18

Mars: MOLA

The whole of Mars at 463 m, from NASA's Mars Global Surveyor laser altimeter. Heights are relative to the Mars "sea level" (areoid). The map switches to a Mars base map, and all sizes and scales use Mars's radius.

11

Mars: Gale crater

A 1 m model of Gale crater and Mount Sharp, where NASA's Curiosity rover is exploring, made from HiRISE stereo images. Outside it, MOLA fills in. The map draws its own shaded relief from the heights.

17

Moon: LRO LOLA

The whole Moon at 118 m, from NASA's Lunar Reconnaissance Orbiter laser altimeter. Heights are relative to a 1,737.4 km sphere.

12

Mercury: MESSENGER

The whole of Mercury at 665 m, from NASA's MESSENGER mission. Heights are relative to a 2,439.4 km sphere. The map draws its own shaded relief from the heights, since there's no Mercury tile server.

10

Your own file

A GeoTIFF in EPSG:4326 (lat/long) or EPSG:3857, or an SRTM `.hgt` tile, for example lidar from your national mapping agency. The file is read in your browser and never uploaded. Other projections such as UTM need reprojecting first (QGIS: _Raster → Projections → Warp_ to EPSG:4326). Outside the file's outline, shown in green on the map, the terrain is flat at its lowest height.

Depends on the file

On Mars, the Moon and Mercury, OpenStreetMap layers (and everything built on them: carving, splines, buildings), georeferencing files, the sunlight map and the real-sun preview are switched off, since they only describe Earth. Switching world picks a sensible output zoom for it.

-   **Upscaling.** Where Mapterhorn only has 30 m data, higher output zooms are smoothly upscaled from it. After each export, a line under the result tells you how detailed the source data really was (in metres per pixel), and whether any of it was upscaled.
-   **Surface model.** Copernicus measures the top of whatever is there, so dense forests and large buildings can show up as bumps. The lidar areas show bare ground.

Data credits and licences are on the [License Info](https://manticorp.github.io/unrealheightmap/rights.md) page.

## Output zoom and size

Two settings decide how much ground the export covers:

-   **Output Zoom** sets how much ground each pixel covers. Each step up halves the metres per pixel and doubles the detail.
-   **Output Width / Height (px)** set how many pixels there are.

Area covered = pixels × metres per pixel. The orange rectangle on the map updates as you change either setting.

Output zoom

Metres per pixel at the equator

A 2017 px export covers

10

153 m

308 km

12

38 m

77 km

13

19 m

39 km

14

9.6 m

19 km

15

4.8 m

9.6 km

16

2.4 m

4.8 km

17

1.2 m

2.4 km

18

0.6 m

1.2 km

Away from the equator, multiply by cos(latitude). For example, at 46° (the Alps) each pixel covers about 70% of the ground shown in the table.

**Default Sizes** lists Unreal Engine's recommended landscape sizes (such as 1009, 2017, 4033 and 8129) and powers of two (such as 1024 and 4096) for Godot, Terrain3D and others. A single export can be up to 8129 × 8129. For anything bigger, use [tiled exports](https://manticorp.github.io/unrealheightmap/instructions.md#tiling).

**Choosing a zoom.** There's no benefit to an output zoom much higher than the source data supports. Do a small test export first and read the source-detail line under the result. For 30 m data, zoom 12 to 13 is about the limit. For 1 m lidar, zoom 16 to 17 is worthwhile.

## Output formats

Format

Levels of detail

Best for

PNG 16-bit

65,536

Unreal Engine landscapes, and most other software

OpenEXR 16-bit

Half-float, about 2,000 steps near the top of the range

Previews only. It's coarser than the PNG.

OpenEXR 32-bit

Full float

Blender, Godot (Terrain3D, HTerrain), Houdini and Gaea. With normalisation Off it stores true metres, including below sea level. Otherwise it stores 0.0 to 1.0.

GeoTIFF 32-bit

Full float, always true metres

QGIS, ArcGIS, GDAL and other GIS tools. The projection (EPSG:3857) and position are stored inside the file. Normalisation doesn't apply.

16 bits gives 65,536 height levels. That's enough to cover sea level to the top of Everest (8,849 m) in steps of about 13 cm, and with normalisation (see below) a 1,000 m mountain gets 1.5 cm steps. An 8-bit image only has 256 levels, which gives visible terracing.

## Tiled exports

Use **Export → Tiles** to split one big area into several files, for example for Unreal World Partition, or to get past the single-image size limit.

-   **Tile by size**: set the width and height of each tile in pixels.
-   **Tile by count**: set how many tiles across and down.
-   **Zip Exports?** bundles all the tiles (and their extra maps and georeferencing files) into one zip, instead of many separate downloads.
-   **Pad tile exports** makes the edge tiles the same size as the others, filling the extra space with blank pixels. Without it, edge tiles are cropped to whatever is left over.
-   **Unreal 5.7+ naming** names tiles `_x00_y00`, `_x01_y00`, and so on, which Unreal's tiled landscape import picks up automatically. Otherwise tiles are named `_tile_ROW_COL`.

All tiles share one height scale, so heights match across the seams.

**Very large areas.** With Regular or Smart normalisation, the whole area is generated in memory first and then cut into tiles. If you set normalisation to Off, or enter your own Norm From and Norm To, tiles are generated one at a time instead. That uses far less memory and is the way to go for huge exports.

## Rotated and custom-shaped areas

Under **Area → Rotation & custom shape**:

-   **Rotation** turns the export area about its centre (degrees clockwise; 90° makes the top of the image point east), so a valley, coastline or ridge can run along the heightmap. The heights, texture maps, OpenStreetMap masks, splines, scatter points, albedo and 3D models all follow the rotation. World files (`.pgw`) include the rotation for GIS; GeoTIFFs are written without it.
-   **Draw a custom shape** to export just an island, a national park or a county: click points around it, then double-click, press Enter or click the first point. The area moves and resizes to fit the shape (using Unreal sizes). Outside the shape the ground drops to the lowest point inside it, and an `area_mask` map is exported with the texture maps. Press Escape to cancel.

## Seamless tiling

Real terrain doesn't repeat, so the left edge never matches the right. **Area → Seamless tiling** changes the heights so the heightmap repeats without a visible join, for tiling backgrounds, distant terrain or endless levels.

Seam cutting (recommended)

Fetches a strip of extra terrain past the right and bottom edges. Fine detail near each join comes from that strip, switching to the other side along the path where the two differ least (usually a valley floor), as in texture quilting. Then the remaining broad mismatch is spread out smoothly (below). **Overlap strip** sets the strip's width; wider strips find better joins.

Smooth only

Splits the heights into a part that repeats, which keeps every crag and gully, and a smooth part that only exists because the edges don't match (Moisan's "periodic plus smooth" method), and drops the smooth part. The broad tilt of the area is spread out across it.

Mirror

Repeats a mirrored copy of the middle of the area as a 2 × 2 block. Always seamless, but every feature gets a mirror twin.

-   **Repeat**: textures and most engines repeat every N pixels. Unreal landscape sections placed side by side share their edge vertices, so choose _last row = first row_ for those.
-   Absolute heights change, by up to the amount shown in Results, so "sea level at Z = 0" no longer holds.
-   The **seam score** shows how well the area tiles as it is: move the box so similar ground sits at opposite edges for the best results.
-   Tick **3 × 3 tiles** in the 3D preview to see the joins.
-   Seamless tiling works up to about 4,100 × 4,100 px.

## Normalisation

Normalisation stretches the heights in your area to fill the full range of the file, so you get the most detail out of 16 bits.

Off

No normalisation. The pixel value is the height in metres, and anything below 0 becomes 0. In a 16-bit PNG, heights are stored in whole metres (1 m steps), and anything below 0 becomes 0. In a 32-bit EXR they're stored as exact metres, including below sea level, which is the easiest way to get true heights into Blender, Godot or Houdini.

Regular

The lowest point becomes black and the highest becomes white, using the full range.

Smart (default)

Like Regular, but ignores the extreme 0.1% of values, so one bad pixel in the source data can't flatten everything else. If the true minimum and maximum are close to the trimmed ones (within one standard deviation), the true values are kept.

**Norm From / Norm To** set the black and white heights yourself, in metres. This is useful at the coast, where you can set Norm From to 0 so the sea floor doesn't use up the range, or when several separate exports need to share one height scale.

After you generate, the height range is shown under the map, along with the Unreal scale values that reproduce real-world heights (see [Importing into Unreal Engine](https://manticorp.github.io/unrealheightmap/instructions.md#unreal)).

### Examples

Normalisation Mode

Off

Regular

Smart

Aizuwakamatsu  
Without source error

![Aizuwakamatsu, no normalisation](https://manticorp.github.io/unrealheightmap/public/im/aizuwakamatsu_none.png)

![Aizuwakamatsu, regular normalisation](https://manticorp.github.io/unrealheightmap/public/im/aizuwakamatsu_regular.png)

![Aizuwakamatsu, smart normalisation](https://manticorp.github.io/unrealheightmap/public/im/aizuwakamatsu_smart.png)

Mt Fuji  
With source error

![Mt Fuji, no normalisation](https://manticorp.github.io/unrealheightmap/public/im/mt_fuji_none.png)

![Mt Fuji, regular normalisation](https://manticorp.github.io/unrealheightmap/public/im/mt_fuji_regular.png)

![Mt Fuji, smart normalisation](https://manticorp.github.io/unrealheightmap/public/im/mt_fuji_smart.png)

## Water and extra texture maps

The settings under **Terrain → Water** and **Layers → Texture maps** add 8-bit PNGs that download alongside the heightmap (in a zip when there are several). They're the same size as the heightmap, and they're split into matching tiles for tiled exports. The summary under Texture maps lists what will be included.

### Water

-   **Water Level (m)** is the height treated as the water surface. 0 is sea level. To pick out a mountain lake, set it to the lake's surface height.
-   **Flatten below water level** raises everything below the water level up to it. Otherwise the sea bed takes up a big share of the height range and leaves less detail for the land. This happens before normalisation.
-   **Water mask** is white wherever the terrain is at or below the water level. Use it to place a water plane or paint a shoreline layer.

### Texture maps

-   **Normal Map**: choose _DirectX_ for Unreal, or _OpenGL_ for Godot, Blender and Unity (the green channel is flipped between the two).
-   **Slope**: black is flat and white is vertical. Use it for rock on cliffs and grass on flat ground.
-   **Curvature**: mid-grey is flat, lighter is ridges and peaks, and darker is valleys and gullies. Good for erosion, snow and moss masks.
-   **Ambient occlusion**: how much open sky each point sees. White is open ground; valleys, gullies and the foot of cliffs are darker. Multiply it into your material for depth, or use it for moss and dirt.
-   **Water flow**: where rain collects as it runs downhill. Streams and rivers are bright lines, hillsides and ridges are black. The scale is fixed in real area (under 0.1 hectare upstream is black, 100 km² or more is white), so tiles match. It only counts water from inside the exported area.
-   **Aspect + northness**: _aspect_ is the compass direction each slope faces (1 to 255 = 0 to 360° clockwise from north, 0 = flat). _northness_ is white on steep north-facing slopes, mid-grey on flat or east/west ground and black on steep south-facing slopes, which is handy for snow.
-   **Height Bands (m)**: comma-separated heights, for example `500, 1500`, give three masks: below 500 m, 500 to 1500 m, and above 1500 m. The edges blend smoothly and the masks always add up to white, so they work directly as Unreal landscape layer weightmaps.

## Sea level

**Terrain → Sea level** moves the sea up or down. Heights are shifted so the new sea level is 0 m, so the water mask, "flatten below water level", the 3D preview's water and the Unreal script's Z = 0 all follow it. Presets include the last glacial maximum (−120 m), when land bridges joined Britain to Europe and Asia to America, and all the ice melting (+70 m). Tick **Show the new coastline on the map** to see what floods. The flooding is by height only, so low ground behind hills floods too.

## Carving roads, rivers and lakes

**Terrain → Carve roads, rivers & lakes** shapes the terrain around OpenStreetMap features, so they sit right in a game level:

-   **Roads** get a flat bed that follows a smoothed profile along the road (ignoring bumps and trees in the data), blending back into the hillside over the **shoulder** width. Railways and paths can be included. Bridges are left alone.
-   **Rivers and streams** get a channel that always runs downhill, since OpenStreetMap draws them in the direction of flow. Channels are about 15% as deep as the river is wide (0.5 to 6 m), times **River depth**.
-   **Lakes** are levelled to one surface height.

Carving applies to the heightmap, 3D models, contours and posters. The OpenStreetMap features are downloaded once per area and reused.

## OpenStreetMap layers

Tick any of the **OpenStreetMap Layers** (roads, paths, railways, rivers and streams, lakes, forest, grass, farmland, scrub, rock, glacier, sand, wetland, urban areas and buildings) and the export includes a mask for each: white where the feature is, the same size as the heightmap and split into matching tiles. Roads and rivers are drawn at a realistic width for their type.

-   **Export as weightmaps** makes the layers add up to full white at every pixel, with a _base_ layer for whatever is left. Where layers overlap, the more specific one wins (roads over buildings over water over forest over grass, and so on). That's what Unreal landscape layers expect.
-   The data comes from the public Overpass API, for areas up to 2,500 km². Busy cities with buildings selected can take a minute, and the servers are sometimes slow; if no answer comes within two minutes the export carries on without them.
-   OpenStreetMap has no sea areas, so use the height-based **Water mask** for the sea.
-   Map data © OpenStreetMap contributors, available under the [Open Database License](https://opendatacommons.org/licenses/odbl/). Credit it if you publish something made with these masks.

### Import scripts

With **Blender & Unreal import scripts** ticked, links appear under each heightmap export: a Python script for Blender that builds the terrain at real size (with the albedo, if it's in the same folder), a script for Unreal that sets the landscape's scale and height after you import it, so sea level ends up at Z = 0, and a README with all the numbers.

## Material painter

**Layers → Material painter** builds landscape layer weightmaps from rules, such as "rock above 35°", "snow above 2,800 m on north faces" or "forest where OpenStreetMap says forest". Start from a preset (Alpine, Temperate lowland, Desert, Tropical island, Moon / Mars / Mercury) and change it to suit.

-   Each layer has a height range, a slope range, which way it faces, an optional OpenStreetMap layer it's limited to, a **strength** and some **noise** to break up the edges into natural patches.
-   Layers apply top to bottom. Each takes its share of whatever the layers above it left; the **base layer** gets the rest. Use ▲ ▼ to change the order.
-   The weightmaps always add up to 100%, which is what Unreal landscape layers expect. They're exported as `paint_01_snow.png` and so on, with a `paint_preview.png` in the layer colours.
-   **Preview on map** paints the area on the map and shows how much each layer covers.

## Real trees (treemap)

**Layers → Real trees** maps the real trees in the area from measured data, rather than from rules. Tick **Export a real treemap with the heightmap**, or press **Preview on map** to see the tree cover first (dark green is conifer, light green broadleaf). A progress bar shows each download. The preview appears as soon as the tree data is in; conifer / broadleaf from OpenStreetMap is added when that server answers, which can take half a minute.

-   **Switzerland**: the Swiss National Forest Inventory's 1 m vegetation height model, from swisstopo's yearly aerial surveys (the newest survey of each spot is used). Every tree is picked out one by one as a crown top, at its real height. Areas up to about 4 × 4 km get the full 1 m detail; bigger ones are read more coarsely and the trees are scattered instead.
-   **Everywhere else**: the tree cover class of ESA WorldCover 2021 (10 m). Trees are scattered through the forest at **Trees per hectare**, never closer than **Min spacing**. Mature forests have roughly 200 to 600 trees per hectare.
-   **Conifer or broadleaf** comes from OpenStreetMap forests tagged `leaf_type`; elsewhere trees get the **Leaf type if unmapped**.
-   **Smallest tree** sets how tall canopy must be to count as a tree (Swiss data).

The export adds, on the same grid as the heightmap:

-   `trees_density.png`: share of each pixel under trees (white = full forest). This is the map most game editors and tools like Gaea, World Machine, Unity terrain and Unreal's foliage or PCG want as a tree mask.
-   `trees_conifer.png` and `trees_broadleaf.png`: the same split by leaf type, one mask per kind of tree.
-   `trees_canopy_height_0-51m.png` (Swiss data): canopy height, where pixel value ÷ 5 = metres.
-   `_trees.csv`: every tree with its type, position (pixels, Blender metres, Unreal coordinates), ground height, tree height and crown radius.
-   `_trees_blender.py` and `_trees_unreal.py`: point clouds and instanced meshes like the scatter scripts, one set per leaf type. "Scale" is the tree's height ÷ 10 m, so tree models about 10 m tall come out at each tree's real height.

## Scatter points

**Layers → Scatter** places trees, rocks, bushes or anything else: positions with a random scale and rotation, at a density (per hectare) wherever a painted layer or OpenStreetMap layer says, never closer than a minimum spacing, and only on slopes gentler than the limit. They're exported with the heightmap in a zip:

-   `_scatter.csv`: every point, in pixels, Blender metres and Unreal coordinates.
-   `_scatter_blender.py`: one point-cloud object per set, with _scale_ and _yaw_ attributes. Add Geometry Nodes → Instance on Points to place your models.
-   `_scatter_unreal.py`: run it with the landscape selected (after `unreal_set_scale.py`). It adds one actor per set with an instanced static mesh component, using the mesh path you set (or a basic shape).

## Road and river splines

**Export → Road & river splines** exports roads, railways, paths and rivers from OpenStreetMap as 3D splines, with heights from the (carved) heightmap, clipped to the area. Bridges get a straight deck between their ends.

-   `_splines.csv` and `_splines.geojson` for Houdini, GIS or your own tools.
-   `_splines_blender.py` makes a curve for each one, with a bevel as wide as the road or river.
-   `_splines_unreal.py` (run with the landscape selected, after `unreal_set_scale.py`) adds an actor with a Spline component for each one, in an _OSM Splines_ folder, tagged with its type and width. Use them with PCG, spline meshes or a Blueprint to place roads, fences or water. It needs Unreal 5.1 or later.

## Albedo

**Generate Albedo** exports a colour image of the same area, using whichever **Map Preview Type** is selected: satellite imagery, a topographic map, shaded relief, and so on. It lines up pixel for pixel with the heightmap. Check each map provider's licence before using it commercially (see [License Info](https://manticorp.github.io/unrealheightmap/rights.md)).

## 3D preview and 3D model export

**3D Preview** shows the export area as a 3D model in the page. Drag to orbit, right-drag to pan, and scroll to zoom. If you move the area or change settings, press **Refresh**.

**Export 3D Model** downloads a mesh of the same area:

3D Model Format

**STL** for slicers and 3D printing. **OBJ** for Blender and most 3D apps. **GLB** (binary glTF) for game engines and the web. OBJ and GLB are Y-up with UVs over the top surface, so an albedo or normal map from the same area lines up directly.

Mesh Resolution

Number of vertices along the longer side. 512 is plenty for most prints. Higher values are more detailed, but the file is bigger and slower to make. The estimate under the buttons shows the triangle count and file size.

Shape

**Solid with base** closes the model with walls and a flat bottom, so it's watertight and printable. **Top surface only** is just the terrain skin, which is usually what you want in Blender or an engine.

Base Thickness (mm)

Extra material under the lowest point, so low areas still print solidly.

Scale

**Print size (mm)** scales the longer side to **Print Width**, with heights scaled to match. **Real world (metres)** keeps the model 1:1.

Height Exaggeration

Multiplies heights only. 1 is true to life. 1.5 to 3 often looks better on small prints of gentle terrain.

Simplify

Uses big triangles where the ground is flat or evenly sloped and small ones where it's rough, so files are often 5 to 20 times smaller with no visible difference. **Medium** is the default. **Off** keeps every grid vertex, which makes very large files.

Texture

**Map imagery** drapes the selected Map Preview Type (for example Esri World Imagery) over the model. GLB embeds the image in the file; OBJ downloads as a zip with an `.mtl` and a JPEG. STL can't hold colour. **Texture Size** sets the image's longer side.

In the 3D preview, tick **Real sun** to light the terrain from where the sun really is over that place, for the chosen date and time of day, with shadows. Press ▶ to play through a day. Times are local solar time, so the sun is highest at 12:00.

3D models are built from the real heights in metres, not the normalised heightmap, so their proportions are true whatever normalisation you chose.

**3D buildings from OpenStreetMap** extrudes building footprints to their tagged height (or levels × 3 m, or the default height) and stands them on the terrain. Textured models get real roof colours from the satellite image. They're included in the 3D preview and every 3D format.

## 3D printing extras

-   **3MF** is a modern 3D printing format that keeps colours and parts. PrusaSlicer, Bambu Studio, OrcaSlicer and Cura all open it.
-   **Colour bands** split the model by height into 2 to 6 stacked parts in one 3MF, so a multi-colour printer can print lowlands, slopes and peaks in different filaments: assign a filament to each part in your slicer. Leave **Band heights** empty for equal bands. With one extruder, Results lists the heights (in mm) at which to change filament.
-   **Raised label** adds a plinth along the front (south) edge with the place name and coordinates in raised letters. It needs a solid, print-size STL or 3MF.
-   **Lithophane** makes a thin flat plate whose thickness follows the hillshade: hold it up to a light or a window and the terrain appears. Print it upright with 100% infill. **Thinnest** and **Thickest** set the range; Print Width sets the size.

## Contour lines

**Export Contours** traces contour lines for the export area. **Preview on map** draws them over the map first (laser-cut layers as stacked, shaded sheets) and updates as you change the interval, smoothing or style; **Hide preview** removes them.

-   **Contour Interval** is the height between lines. Leave it empty to pick a round number giving about 20 levels. Every 5th line is drawn thicker.
-   **Topo map lines** are ordinary contour lines for maps and prints.
-   **Laser-cut layers** close each level along the edges of the area, so every level is the outline of all ground at or above it, ready to cut from card, wood or acrylic and stack. Choose _one SVG per sheet_ to get a zip with a file per layer, alignment marks and the next layer engraved as a gluing guide.
-   **SVG** is sized in millimetres (set by **SVG Width**). **DXF** is in real-world metres with each line at its height and one CAD layer per level.

## Elevation profile

Click the mountain button under the zoom controls on the map (or **Analysis → Draw a profile on the map**), then click to draw a line (as many points as you like). Double-click or press Enter to finish. A panel along the bottom of the map shows the heights along the line, with length, highest and lowest point, total climb and descent, and the steepest gradient. Hover the chart to see the spot on the map, or download it as CSV.

## Viewshed

**Analysis → Viewshed** shows everything visible from one spot inside the export area. Click **Pick a viewpoint on the map**, then click the map: green is visible and red is hidden. It allows for the curvature of the planet and standard atmospheric refraction. **Eye height** is how far above the ground you are; **Target height** asks "could I see something this tall there?" (0 is the ground itself). **Download visibility mask** saves a white-is-visible PNG the same size as the heightmap.

## Sunlight

**Analysis → Sunlight over a year** works out how much sun each spot gets over a year: one day each month, sampled every hour, with shadows from the surrounding terrain and the angle of each slope to the sun. Tick **Export a yearly sunlight map** to get a `sunlight.png` with the heightmap (white is sunniest), or press **Preview on map** (and **Hide preview** to remove it). It assumes clear skies, so read it as relative brightness. Use it for snow, moss, vegetation, or where people would build.

## Posters

**Export → Poster print** makes a print-ready shaded-relief map of the area as a PNG, with a title (from the search box unless you type one), coordinates, height range, a scale bar and a north arrow. Choose a style (classic relief, Swiss, night, blueprint, vintage, red planet), paper size (A4 to A1, square, a 16:9 wallpaper, or **Custom size** in mm, cm or inches), resolution (300 dpi for print shops) and contour spacing. **Relief exaggeration** deepens the shading for gentle landscapes. A live preview in the panel updates as you change the options, so you only need to export once you're happy. **Include unrealheightmap credit** adds a small "Generated with unrealheightmap" line in the bottom margin, and **Include QR code link** adds a QR code in the poster's colours that reopens unrealheightmap with the same area and settings. Untick either to leave it off.

**Step-by-step guides:** the [Import Guides](https://manticorp.github.io/unrealheightmap/guides.md) cover [Unreal Engine](https://manticorp.github.io/unrealheightmap/guide-unreal.md), [Blender](https://manticorp.github.io/unrealheightmap/guide-blender.md), [Godot](https://manticorp.github.io/unrealheightmap/guide-godot.md), [Unity](https://manticorp.github.io/unrealheightmap/guide-unity.md), [QGIS, Gaea, World Machine and Houdini](https://manticorp.github.io/unrealheightmap/guide-other.md) and [3D printing](https://manticorp.github.io/unrealheightmap/guide-3d-printing.md) in depth. The sections below are short summaries.

## Importing into Unreal Engine

1.  Export a 16-bit PNG at one of the Unreal sizes, for example 2017 × 2017.
2.  In Unreal, open **Landscape mode → Manage → New → Import from File** and choose the PNG.
3.  To get real-world proportions, set the landscape **Scale** to the values shown under the map after you generate. That's `XY` for X and Y, and `Z` for Z. They're in centimetres per pixel, Unreal's units.
4.  For tiled exports, tick **Unreal 5.7+ naming** and import the folder of tiles.
5.  Use the DirectX normal map and the height-band weightmaps in your landscape material and layers.

Epic's guide: [Creating and using custom heightmaps and layers](https://dev.epicgames.com/documentation/en-us/unreal-engine/creating-and-using-custom-heightmaps-and-layers-in-unreal-engine).

## Godot, Terrain3D, Blender and Unity

-   **Godot:** export a 32-bit EXR with normalisation Off, which Terrain3D and HTerrain import as true metres. Don't import the PNG directly: Godot reads PNGs as 8-bit only.
-   **Blender:** the easiest route is _Export 3D Model_ as OBJ or GLB, top surface only, real-world scale. Alternatively, put the 16-bit PNG on a subdivided plane with a Displace modifier, with its strength set to the height range. Use the OpenGL normal map, and the albedo as the base colour.
-   **Unity:** the Terrain tool imports RAW files, so convert the 16-bit PNG to RAW first (for example with GIMP or Photoshop), or import the GLB as a mesh. Use the OpenGL normal map.
-   **3D printing:** STL, solid with base, print size. Start with 150 mm wide, a 2 mm base and 1.5× exaggeration.

## Georeferencing (QGIS and GIS)

All exports (heightmaps, extra maps and albedo) are in **EPSG:3857** (WGS 84 / Pseudo-Mercator, "Web Mercator"), the same projection as web map tiles.

For GIS work, the easiest option is the **GeoTIFF** output format: it holds true heights in metres and its position is built in.

Each PNG/EXR heightmap and albedo export comes with a world file (`.pgw`, or `.wld` for EXR) and a `.prj` file, linked under the output. Keep them in the same folder as the image with the same name, and QGIS will place it correctly. The exact extent is also shown under **Bounds & projection** on the generator page.

EPSG:3857 units aren't true ground metres: distances are stretched by about 1/cos(latitude). Reproject, for example to your local UTM zone, before measuring distances.

## FAQs and troubleshooting

There's a strange spike, pit or stripe in my heightmap. Why?

Some source tiles have errors, mostly in the AWS / Mapzen data. Try switching **Elevation Data** to Mapterhorn. You can also set the map preview to "Terrarium" at the same zoom to see whether the artefact is in the source. Smart normalisation stops a single bad value from ruining the height range.

![Example error from Mapzen source data in grayscale](https://manticorp.github.io/unrealheightmap/public/im/actual_error_grayscale.png)

![Example error from Mapzen source data in Terrarium format](https://manticorp.github.io/unrealheightmap/public/im/actual_error_terrarium.png)

My terrain looks blurry or terraced at high zoom.

The output zoom is higher than the source data supports at that location, so it's being upscaled. The source-detail line under the export result confirms this. Either lower the output zoom or use Mapterhorn where lidar is available. If the terrain looks terraced, use the 16-bit PNG (not an 8-bit conversion) and make sure normalisation isn't Off.

My older EXR exports look wrong: valleys too low, or odd specks

Before November 2026, EXR exports stored heights on a curve, so mid-heights came out too low, and some pixels in 16-bit EXRs were saved at half their height. Both are fixed. Re-export the area, and use 32-bit EXR for exact heights.

The Generate button says "Output Zoom too high".

The selected elevation source doesn't go that high: AWS goes up to 15 and Mapterhorn up to 18. Lower the output zoom or switch source.

Generating fails, or the page runs out of memory.

Very large exports are processed in your browser's memory. Try a smaller size or fewer extra maps at once. For big areas, use a tiled export with normalisation Off, or with your own Norm From and Norm To, so tiles are generated one at a time. Desktop Chrome, Edge and Firefox handle large exports best. If map tiles fail to load, the service may be busy or rate-limited, so wait a minute and try again.

The 3D preview doesn't appear.

The preview needs WebGL. Check that hardware acceleration is turned on in your browser. Model export still works without the preview.

Why not use the Tangrams heightmapper?

The output from [heightmapper](http://tangrams.github.io/heightmapper) is 8-bit and noisy. In 8-bit, a 1,000 m mountain has a visible step every 4 m.

Can I use the exports commercially?

The elevation data is openly licensed, but you need to credit the sources. Map imagery used for albedo depends on the provider. See [License Info](https://manticorp.github.io/unrealheightmap/rights.md).

How can I support the project?

Map tile services cost money at this tool's scale. If it's useful to you, [buying me a coffee on Ko-fi](https://ko-fi.com/harrymustoeplayfair) helps keep it running. Bug reports and ideas are welcome on [GitHub](https://github.com/manticorp/unrealheightmap/issues).
