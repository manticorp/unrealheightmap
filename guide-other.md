<!-- Generated from guide-other.html by scripts/build-agent-docs.js. Do not edit by hand. -->
Source: https://manticorp.github.io/unrealheightmap/guide-other.html
Title: QGIS, Gaea, World Machine & Houdini Guide · 16/32 Bit Heightmap Generator
Summary: Use real-world heightmaps in QGIS (georeferenced, rescaled to metres), Gaea, World Machine, Houdini, Photoshop and Substance Designer.

# GIS, terrain tools and image editors

All of these start from the **16-bit PNG** export with **Smart** normalisation. Note the **height range** (lowest and highest in metres) and the **metres per pixel** shown after generating.

-   [QGIS and GDAL](https://manticorp.github.io/unrealheightmap/guide-other.md#qgis)
-   [Gaea](https://manticorp.github.io/unrealheightmap/guide-other.md#gaea)
-   [World Machine](https://manticorp.github.io/unrealheightmap/guide-other.md#worldmachine)
-   [Houdini](https://manticorp.github.io/unrealheightmap/guide-other.md#houdini)
-   [Photoshop, GIMP and Substance Designer](https://manticorp.github.io/unrealheightmap/guide-other.md#editors)

## QGIS and GDAL

### Load it in the right place

1.  Keep the PNG together with its `.pgw` world file and `.prj`, all with the same base name. The tool links them under the output, and they're included in zips.
2.  Drag the PNG into QGIS. GDAL reads the world file automatically, so the image lands in the right place.
3.  QGIS may not pick up the projection from the `.prj` next to a PNG. If the layer shows an unknown CRS, set it: right-click the layer → **Layer CRS → Set Layer CRS** → **EPSG:3857**.

### Turn pixel values into metres

The PNG holds normalised values from 0 to 65535, not metres. Convert with **Raster → Raster Calculator**, replacing 120 and 1620 with your height range:

```
120 + "heightmap@1" / 65535 * (1620 - 120)
```

Save the result as a GeoTIFF (Float32). It now holds true elevations in metres.

### Reproject before measuring

EPSG:3857 (Web Mercator) stretches horizontal distances by 1/cos(latitude). Slope, hillshade and distance tools then give wrong answers. Reproject first with **Raster → Projections → Warp (Reproject)**:

-   Target CRS: your local UTM zone (for example EPSG:32632 for the Alps).
-   Resampling: **Bilinear** or **Cubic**.

Then **Raster → Analysis → Hillshade / Slope** work correctly with a Z factor of 1.

### Command line

```
# georeference and rescale to metres in one go (heights 120–1620 m)
gdal_translate -a_srs EPSG:3857 -ot Float32 -scale 0 65535 120 1620 heightmap.png heightmap_m.tif
# reproject to UTM 32N at 10 m pixels
gdalwarp -t_srs EPSG:32632 -tr 10 10 -r cubic heightmap_m.tif heightmap_utm.tif
```

## Gaea

Use Gaea to add erosion, snow and detail on top of real terrain, then export maps for your engine.

1.  Set the terrain's world **Scale** to the area width in metres, and its **Height** to the height range in metres.
2.  Add a **File** node and load the 16-bit PNG. Gaea stores heights from 0 to 1 internally and multiplies them by the terrain Height, so a normalised PNG maps directly to true relative heights.
3.  Keep the source unclamped. Gaea's docs suggest **Raw** scale for most files.
4.  Add erosion nodes. Because the scale is real, erosion and flow features come out at plausible sizes.
5.  Export at Unreal sizes (2017, 4033) for Unreal, and use the same Z scale maths as in the [Unreal guide](https://manticorp.github.io/unrealheightmap/guide-unreal.md#scale). The range is the Gaea terrain Height.

Gaea's docs also describe a _Match / Correct Heights_ recipe for terrains that need absolute altitudes. See the [Gaea documentation](https://docs.gaea.app).

## World Machine

1.  Add a **File Input** device and load the 16-bit PNG.
2.  Under elevation mapping, choose **Specify** and enter the lowest and highest heights in metres. _Full Range_ would stretch it to the whole world height instead.
3.  Under **World Placement**, set its size to the area's width and height in metres (**Set in Layout…**), so it matches your world extents.
4.  Build erosion and texture outputs as usual. For tiled builds into Unreal, use World Machine's own tiled output.

See the [File Input documentation](https://help.world-machine.com/topic/file-input-and-output/).

## Houdini

1.  Add a **HeightField File** SOP and load the PNG, with **Type** set to Height.
2.  **Size Method**: **Grid Spacing**, set to the metres per pixel.
3.  **Height Scale**: the height range in metres.
4.  For absolute altitudes, add a **HeightField Transform** or a Volume Wrangle (`@height += 120;`, using your lowest height).
5.  Load the extra masks into a second HeightField File with Type **Mask** to drive erosion, scattering or layer exports.

See the [HeightField File documentation](https://www.sidefx.com/docs/houdini/nodes/sop/heightfield_file.html).

## Photoshop, GIMP and Substance Designer

The rule for all of them: **never let the heightmap drop to 8 bits**. One 8-bit save cuts 65,536 levels to 256, and the terrain comes out terraced.

-   **Photoshop:** the PNG opens in **16 Bits/Channel** mode (check **Image → Mode**). Edit in 16-bit, and save with **Save As** (PNG or TIFF). Some _Export As_ and _Save for Web_ paths write 8-bit. Avoid sharpening and levels with clipping, which flatten peaks and valleys.
-   **GIMP:** check **Image → Precision** shows 16-bit, and choose a _linear_ precision so edits don't apply a gamma curve. Export the PNG with 16 bpc (on by default for 16-bit images).
-   **Substance 3D Designer:** set the bitmap's colour space to raw or linear (non-colour) and graph precision to 16-bit or higher. Bitmap painting only works on 8-bit images, so do painting on separate masks.
-   **Extra maps** (slope, curvature, bands, water) are 8-bit masks by design. They're fine to edit, paint and blur in any editor.
