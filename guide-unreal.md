<!-- Generated from guide-unreal.html by scripts/build-agent-docs.js. Do not edit by hand. -->
Source: https://manticorp.github.io/unrealheightmap/guide-unreal.html
Title: Unreal Engine Guide · 16/32 Bit Heightmap Generator
Summary: Import real-world heightmaps into Unreal Engine 5 landscapes at true scale: Z scale maths, tiled World Partition imports, weightmap layers, landscape materials, water and Nanite.

# Unreal Engine 5: advanced landscape import

This guide covers Unreal Engine 5.4 to 5.7. You'll get a landscape at true real-world scale and absolute height, with material layers driven by the exported masks. Where Epic's documentation doesn't cover a detail, the guide says so.

1.  [Export settings](https://manticorp.github.io/unrealheightmap/guide-unreal.md#export)
2.  [Creating the landscape](https://manticorp.github.io/unrealheightmap/guide-unreal.md#import)
3.  [Getting the scale exactly right](https://manticorp.github.io/unrealheightmap/guide-unreal.md#scale)
4.  [Big worlds: tiled import and World Partition](https://manticorp.github.io/unrealheightmap/guide-unreal.md#tiled)
5.  [Material layers from the masks](https://manticorp.github.io/unrealheightmap/guide-unreal.md#layers)
6.  [A starter landscape material](https://manticorp.github.io/unrealheightmap/guide-unreal.md#material)
7.  [Water](https://manticorp.github.io/unrealheightmap/guide-unreal.md#water)
8.  [Nanite, virtual textures and large worlds](https://manticorp.github.io/unrealheightmap/guide-unreal.md#performance)
9.  [Importing GLB/OBJ meshes instead](https://manticorp.github.io/unrealheightmap/guide-unreal.md#meshes)
10.  [Troubleshooting](https://manticorp.github.io/unrealheightmap/guide-unreal.md#troubleshooting)

## 1\. Export settings

Output Format

**PNG 16-bit**. Unreal's landscape importer accepts 16-bit grayscale PNG, `.r16` and `.raw`. EXR isn't supported for landscapes.

Size

One of Unreal's recommended sizes, so the landscape fits whole components: **505, 1009, 2017, 4033 or 8129**. They're under Default Sizes → Unreal Engine.

Normalisation

**Smart**. This uses the full 16-bit range for your area, and the Z scale the tool shows makes the heights true again.

Extra Outputs

Normal map **DirectX**. Add slope, curvature and height bands if you want material layers.

After generating, note the values under the map: **Height range**, and the scales `XY` and `Z`.

## 2\. Creating the landscape

1.  Switch to **Landscape Mode** (Shift+2, or the Modes dropdown).
2.  Under **Manage → New**, choose **Import from File**.
3.  Next to **Heightmap File**, choose your PNG. **Heightmap Resolution** fills in from the file.
4.  Set **Scale** X and Y to the tool's `XY` value, and Z to its `Z` value. See the next section for the location.
5.  Check the component layout. **Fit To Data** picks one automatically, but in some versions it picks very large component counts. Entering the values from the table below is more reliable.
6.  Keep **Enable Edit Layers** ticked. It's needed for non-destructive sculpting and for the Water plugin.
7.  Click **Import**.

### Recommended component layouts

From Epic's [Landscape Technical Guide](https://dev.epicgames.com/documentation/en-us/unreal-engine/landscape-technical-guide-in-unreal-engine):

Heightmap size

Section Size (quads)

Sections per Component

Number of Components

8129

127 × 127

2 × 2

32 × 32

4033

63 × 63

2 × 2

32 × 32

2017

63 × 63

2 × 2

16 × 16

1009

63 × 63

2 × 2

8 × 8

505

63 × 63

2 × 2

4 × 4

Resolution = components × quads per component + 1. That's why Unreal's sizes are odd numbers like 2017 rather than 2048.

## 3\. Getting the scale exactly right

### XY: centimetres per pixel

Landscape Scale X/Y is the distance between vertices in centimetres. The tool's `XY` value is the area width in metres × 100 ÷ pixel width. At 46° latitude and output zoom 14, for example, each pixel covers about 6.6 m, so XY ≈ 660.

The export is in Web Mercator, which stretches distances by 1/cos(latitude). The tool's XY value is worked out from the real ground distance at your latitude, so use it rather than a value from the zoom table.

### Z: fitting the height range

At Z scale 100, Unreal maps the 16-bit range to 512 m: −256 m at black, +256 m at white, and 0 at mid-grey (32768). For a normalised heightmap:

```
Z scale = height range (m) × 100 ÷ 512
        = height range (m) × 0.1953125
```

This is the `Z` value the tool shows. Epic's own example: Mauna Kea's 4,207 m gives 4207 × 100 × 0.001953125 = 821.68.

### Location Z: absolute heights

The landscape's mid-grey sits at its Location Z. To put sea level at world Z = 0, raise the landscape to the middle of its height range:

```
Location Z (cm) = (lowest + highest) ÷ 2 × 100
```

**Worked example:** the tool reports a height range of 120 m to 1,620 m from a 2017 px export covering 13.3 km.

-   Range = 1,500 m, so Z = 1500 × 100 ÷ 512 = `292.97`
-   Location Z = (120 + 1620) ÷ 2 × 100 = `87000`
-   XY = 13,300 m × 100 ÷ 2017 = `659.4`

Black pixels now sit at 120 m (12,000 cm) and white at 1,620 m, matching the real terrain.

Keeping absolute height matters when you combine several exports, place real-world data (GPS tracks, buildings), or use the water level. If you only need the shape, leave Location Z at 0.

### Several exports with one shared scale

If separate exports must line up, for example neighbouring areas or the same area at different detail, give them all the same **Norm From** and **Norm To**. They then share one Z scale and one Location Z.

## 4\. Big worlds: tiled import and World Partition

A single 8129 heightmap already gives about 53 km at 6.6 m per pixel. For bigger or more detailed worlds, use a tiled export.

1.  In the tool, set **Tiled Export** → Tile by size (for example 2017 × 2017) or Tile by count. Tick **Unreal 5.7+ naming** (files end in `_x00_y00`) and **Zip Exports?**.
2.  Set normalisation to Smart, or enter your own Norm From and Norm To. Every tile shares one height scale, so one Z scale and Location Z work for all of them.
3.  In a World Partition level, under New → Import from File, set the **World Partition Grid Size** and **Region Size**, then pick _one_ of the tiles. Unreal asks whether to use the tiled image path. Answer **Yes**.
4.  Set Scale and Location exactly as for a single file, then Import.

**Known 5.7 issue:** several users report that tiled imports into a World Partition level in 5.7.x show one tile repeated across the whole landscape. The same files work in 5.5 and 5.6, and Epic hasn't acknowledged it yet. If it happens to you:

-   import into a non-World Partition (Basic) level first, then use **Tools → Convert Level**
-   or create a flat landscape of the same size and use **Manage → Import** with Import Type **Subregion** to bring the heights in

Reports: [1](https://forums.unrealengine.com/t/landscape-heightmap-import-duplicates-single-tile-in-world-partition-ue-5-7/2745963), [2](https://forums.unrealengine.com/t/major-problem-importing-tiled-heightmap-from-gaea/2706407).

-   **Tile naming.** Epic doesn't document the exact file naming it expects. The community convention, which is what the tool writes, is lower-case `_x` before `_y` with the column number first. If Unreal doesn't recognise the set, try renaming to unpadded numbers (`_x0_y0`).
-   **Gaps between tiles.** The tool's tiles sit edge to edge without sharing a row of pixels. If you see a one-quad gap or step between tiles, import one large file instead (up to 8129) and let World Partition split it into streaming proxies. That always gives a seamless result.
-   **Tiles in the wrong order** (rows swapped): re-import with **Flip Y Axis** ticked.

## 5\. Material layers from the masks

The height bands are made to be landscape weightmaps. They blend smoothly at each boundary, and at every pixel they add up to full white, which is what weight-blended layers need. Slope and curvature work best as non-weight-blended overlays.

1.  Create a landscape material with one layer per mask (see the next section) and assign it to the landscape.
2.  In **Paint** mode, click **+** next to each Target Layer and choose **Weight-Blended Layer (normal)** for the height bands, or **Non Weight-Blended Layer** for overlays such as a snow or cliff mask. Save the Layer Info assets.
3.  Import each mask: right-click the target layer and choose **Import from file**, or use **Manage → Import**, which has a file slot per layer. Pick the matching PNG, for example `…_band_01_500m-1500m.png`.

-   **Size must match exactly.** Weightmaps must be the same resolution as the heightmap. They are when they come from the same export.
-   **Format.** Weightmaps must be 8-bit grayscale, which the tool's masks are.
-   **Import button greyed out?** Some versions report a mismatch even for the right size (Epic bug UE-241268). Re-select the heightmap resolution, or import the weightmaps right after creating the landscape.

Painting on top still works: imported weights are just a starting point.

## 6\. A starter landscape material

A simple material that uses the exports:

-   **Layer blend:** a **Landscape Layer Blend** node with one entry per height band (for example Grass, Rock, Snow), each set to **LB Weight Blend**. Plug each layer's tiling textures into its input.
-   **Tiling detail:** drive the texture UVs with a **LandscapeLayerCoords** node (Mapping Type `TCMT Auto`). A Mapping Scale of 1 to 4 gives 1 to 4 vertices per texture repeat. For steep cliffs, use the **WorldAlignedTexture** function (triplanar) on the rock layer to avoid stretching.
-   **Whole-landscape albedo or normal map:** to stretch one image across the entire landscape, use a LandscapeLayerCoords node with **Mapping Scale** equal to the landscape's resolution in quads (heightmap size − 1, for example 2016). Different engine versions sample slightly differently, so check alignment against a known feature and adjust by ±1 if needed.
-   **Normal map texture:** import the DirectX normal PNG, set its texture **Compression Settings** to _Normalmap_, and blend it with the detail normals (BlendAngleCorrectedNormals). This brings back fine detail that a coarse landscape can't hold.
-   **Procedural slope:** instead of the slope texture, you can compute slope live from the landscape's world normal (VertexNormalWS → Z), so it stays correct after sculpting. The exported slope mask is still useful as a starting weightmap.

## 7\. Water

1.  Enable the **Water** plugin (Edit → Plugins) and restart.
2.  From the **Place Actors** panel, drag a **Water Body Ocean**, **Lake** or **River** into the level. Oceans and lakes are closed splines, and a lake sits at one height.
3.  Set the water height to match the tool's **Water Level**. With absolute Location Z, sea level is Z = 0. For a lake, use its surface height × 100 in centimetres.
4.  To trace the spline, import the exported **water mask** as a non-weight-blended layer. It shows the shoreline on the landscape, so you can follow it.

Water bodies can carve the landscape (**Affects Landscape**), but only on landscapes with Edit Layers enabled. If you exported with **Flatten below water level**, the sea floor is already flat at the water level, so you can turn carving off or give it a gentle depth curve.

For a simple still lake, a flat plane with a water material at the right height also works.

## 8\. Nanite, virtual textures and large worlds

-   **Nanite landscape** (5.3+): select the landscape, tick **Enable Nanite** in Details, then **Build Data**. It keeps silhouettes crisp at a distance and makes high-resolution imports far cheaper to render. Turn on **Nanite Skirt** if you see cracks between streaming proxies far away.
-   **Runtime Virtual Texturing:** add a Runtime Virtual Texture Volume around the landscape (**Set Bounds**) and write the material output to it. Complex multi-layer materials are then cached instead of re-shaded every frame, which makes a big difference on large, layered terrains.
-   **Large World Coordinates** are on by default in UE5. A 50 to 100 km real-world landscape works without the jitter UE4 had beyond about 20 km.

## 9\. Importing GLB/OBJ meshes instead

A landscape is best for anything you'll walk on or sculpt. For backdrops, distant mountains or a table-top model, a static mesh from **Export 3D Model** can be simpler:

-   Export **GLB**, Shape **Top surface only**, Scale **Real world (metres)**.
-   Import through the Content Browser (Interchange). glTF is in metres and Unreal converts it to centimetres on import. For OBJ, which has no units, set **Offset Uniform Scale** to 100.
-   Tick **Build Nanite** for high-resolution meshes.
-   The mesh UVs cover the top surface 0 to 1, so an albedo or normal map from the same export lines up without any setup.

## 10\. Troubleshooting

The landscape has stair steps or terracing

The heightmap went through an 8-bit step somewhere: an image editor, a conversion, or `.r8`. Import the tool's PNG directly, or keep it 16-bit in every program. Very flat areas at a huge Z scale can also step. Use Smart normalisation so the full 65,536 levels cover your actual range.

Mountains are far too tall or too flat

The Z scale doesn't match the export. Use the tool's `Z` value, which depends on that export's height range. Don't reuse it from another export unless both used the same Norm From and Norm To.

Everything is the right shape but at the wrong height

Set Location Z to the midpoint of the height range × 100 (see [Getting the scale exactly right](https://manticorp.github.io/unrealheightmap/guide-unreal.md#scale)).

The landscape is mirrored or north is in the wrong place

Image rows run along Unreal's +Y axis, so looking down in the Top view, north is towards −Y. If tiles or features come out mirrored, re-import with **Flip Y Axis**.

The import is huge or slow

Check the component count. Fit To Data sometimes picks far more components than needed. Use the table in [Creating the landscape](https://manticorp.github.io/unrealheightmap/guide-unreal.md#import). The maximum is 32 × 32 components.

## References

-   [Importing and exporting landscape heightmaps](https://dev.epicgames.com/documentation/en-us/unreal-engine/importing-and-exporting-landscape-heightmaps-in-unreal-engine)
-   [Landscape Technical Guide](https://dev.epicgames.com/documentation/en-us/unreal-engine/landscape-technical-guide-in-unreal-engine) (sizes and Z scale)
-   [Custom heightmaps and layers](https://dev.epicgames.com/documentation/en-us/unreal-engine/creating-and-using-custom-heightmaps-and-layers-in-unreal-engine)
-   [Landscape material expressions](https://dev.epicgames.com/documentation/en-us/unreal-engine/landscape-material-expressions-in-unreal-engine)
-   [Water system](https://dev.epicgames.com/documentation/en-us/unreal-engine/water-system-in-unreal-engine)
-   [Nanite landscapes](https://dev.epicgames.com/documentation/en-us/unreal-engine/using-nanite-with-landscapes-in-unreal-engine)
