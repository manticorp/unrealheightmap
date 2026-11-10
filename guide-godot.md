<!-- Generated from guide-godot.html by scripts/build-agent-docs.js. Do not edit by hand. -->
Source: https://manticorp.github.io/unrealheightmap/guide-godot.html
Title: Godot Guide · 16/32 Bit Heightmap Generator
Summary: Import real-world heightmaps into Godot 4 with Terrain3D or HTerrain at true scale, plus plugin-free meshes and HeightMapShape3D collision.

# Godot 4: Terrain3D, HTerrain and plugin-free terrain

Godot has no built-in terrain system. You have three good options:

-   [**Terrain3D**](https://manticorp.github.io/unrealheightmap/guide-godot.md#terrain3d): a high-performance C++ terrain with clipmap LOD, sculpting and texture painting. It handles any size and is the best choice for big worlds.
-   [**HTerrain**](https://manticorp.github.io/unrealheightmap/guide-godot.md#hterrain): a GDScript plugin, simple to set up, up to 4097 × 4097.
-   [**No plugin**](https://manticorp.github.io/unrealheightmap/guide-godot.md#no-plugin): a GLB mesh plus collision. Good for small areas, backdrops and prototypes.

## Step 0: Choose the heightmap file

**Godot loads PNGs as 8 bits per channel**, so a 16-bit PNG is cut down to 256 levels and the terrain comes out terraced. Use one of the two options below instead.

### Option A: 32-bit EXR in metres (easiest)

Export **OpenEXR 32-bit** with normalisation **Off**. Godot reads EXR as floating point, and every pixel is the true height in metres, including below sea level. No conversion or height maths is needed. Avoid the 16-bit EXR, which is coarser than the PNG.

### Option B: 16-bit RAW from the PNG

Export a **16-bit PNG** with **Smart** normalisation, and note the **height range** (lowest and highest in metres) and the metres per pixel. Then convert with [ImageMagick](https://imagemagick.org) 7:

```
magick heightmap.png -depth 16 -endian LSB gray:heightmap.r16
```

For HTerrain, which needs a 2n+1 square, pad by repeating the edge pixels. For example, from a 1024 export:

```
magick heightmap.png -virtual-pixel edge -set option:distort:viewport 1025x1025+0+0 -filter point -distort SRT 0 -depth 16 -endian LSB gray:heightmap.r16
```

On ImageMagick 6, use `convert` instead of `magick`. GIMP (Export As → Raw image data) also works if the image is in 16-bit precision.

Export the extra maps with the **OpenGL** normal map. Godot uses the OpenGL (Y+) convention.

## Terrain3D

Written for Terrain3D 1.x. See the [official import docs](https://terrain3d.readthedocs.io/en/stable/docs/import_export.html).

### Import

1.  Install Terrain3D from the Asset Library or GitHub, and enable it in Project Settings → Plugins.
2.  Open the scene `addons/terrain_3d/tools/importer.tscn` and select the **Importer** node. Its Inspector is the import tool.
3.  Under **Import File**:
    -   `height_file_name`: the **EXR** (Option A), with `height_scale` 1 and `height_offset` 0. The values are already metres.
    -   Or the `.r16` file (Option B; `.raw` works too) with:
        -   `r16_size` = the image width × height in pixels
        -   `r16_range` = **(lowest, highest)** in metres. Terrain3D maps black to the first value and white to the second.
        -   `height_scale` 1 and `height_offset` 0
    -   A 32-bit EXR exported with Smart normalisation (0 to 1) also works: set `height_scale` to the height range and `height_offset` to the lowest height.
    -   `color_file_name` (optional): the albedo PNG. It becomes the terrain's colour map.
    -   `import_position`: where the terrain goes. It's rounded to the region size.
4.  Click **Run Import**, check the result, then set `destination_directory` and click **Save to Disk**.
5.  In your game scene, add a Terrain3D node and point its **Data Directory** at that folder.

### Horizontal scale

Terrain3D places one vertex per metre by default. Set the Terrain3D node's **vertex\_spacing** to the export's metres per pixel, for example 6.6, so the terrain spans its real width. This only scales X and Z, so heights stay correct.

Very large vertex spacing makes close-up terrain blocky. To walk around in detail, export at a higher output zoom rather than stretching a coarse export.

### Region size

A Terrain3D world is up to 32 × 32 regions. Choose **Regions → Region Size** (64 to 2048) greater than the image width ÷ 32. For example, use 256 for an 8129 export and 128 or more for a 4096 export. Any image size works, and Terrain3D slices and pads it automatically.

### Texturing

-   **Albedo:** imported as the colour map. Terrain3D blends it with your texture layers.
-   **Height bands, slope and curvature** can't be imported directly. Terrain3D's control map uses its own format. Use the masks as a visual reference while painting, or apply them with a short tool script using the Terrain3D API. Terrain3D also has slope-based auto-shading built in.

## HTerrain (Zylann's heightmap plugin)

See the [HTerrain docs](https://hterrain-plugin.readthedocs.io). Current versions target Godot 4.x.

1.  Add an **HTerrain** node, select it, and choose **Terrain → Import** from the toolbar menu.
2.  Set **Heightmap** to either:
    -   a 32-bit EXR exported with normalisation Off at a 2n+1 size (type 1025, 2049 or 4097 into the tool). HTerrain uses EXR values as-is, so they're already metres, and Min/Max height are ignored.
    -   or the padded `.r16` file, with **Raw endianess** Little Endian, **Bit depth** 16-bit, and **Min height** / **Max height** set to the lowest and highest heights in metres.
3.  Optional: **Colormap** = the albedo PNG.
4.  Import, then set the node's **Map Scale** X and Z to the metres per pixel. Leave Y at 1.

-   **Size rule:** HTerrain terrains are square and 2n+1 (513, 1025, 2049, 4097). Other sizes are padded with height 0, which makes a cliff at the edge. That's why Step 0 pads with edge pixels. 8129 exports are too large, so tile them or use Terrain3D.
-   **Raw files must be square:** HTerrain works out the size from the file length.
-   **Splatmap:** HTerrain accepts a 4-layer RGBA splatmap PNG. Pack up to four height bands into one with ImageMagick:
    
    ```
    magick *_band_00_*.png *_band_01_*.png *_band_02_*.png *_band_03_*.png -set colorspace sRGB -combine -define png:color-type=6 splatmap.png
    ```
    

## Without a plugin

### Visual mesh: GLB

1.  In the tool, use **Export 3D Model** with Format GLB, Shape Top surface only, and Scale Real world (metres).
2.  Drop it into the project. Godot imports glTF natively, at 1 unit = 1 metre.
3.  Double-click it to open **Advanced Import Settings**. Select the mesh, then tick **Physics → Generate**, set Body Type to **Static** and Shape Type to **Trimesh**, and reimport.
4.  Apply the albedo and the OpenGL normal map in a StandardMaterial3D. The UVs cover the top surface, so they line up.

### Collision: HeightMapShape3D from RAW

For big terrains, a heightmap collision shape is much cheaper than a trimesh. This GDScript reads the 16-bit RAW from Step 0 at full precision:

```
@export var raw_path := "res://terrain/heightmap.r16"
@export var size := Vector2i(1025, 1025)   # pixels
@export var min_height := 120.0            # metres
@export var max_height := 1620.0
@export var metres_per_pixel := 6.6

func _ready() -> void:
	var bytes := FileAccess.get_file_as_bytes(raw_path)
	var data := PackedFloat32Array()
	data.resize(size.x * size.y)
	for i in data.size():
		var h := lerpf(min_height, max_height, bytes.decode_u16(i * 2) / 65535.0)
		data[i] = h / metres_per_pixel   # node is scaled up below
	var shape := HeightMapShape3D.new()
	shape.map_width = size.x
	shape.map_depth = size.y
	shape.map_data = data
	var col := CollisionShape3D.new()
	col.shape = shape
	col.scale = Vector3.ONE * metres_per_pixel   # spacing in metres
	add_child(col)   # attach to a StaticBody3D
```

-   **Grid spacing.** HeightMapShape3D always has a spacing of one unit, centred on the node. Scale the node uniformly by the metres per pixel and divide the heights by the same amount. The default physics engine doesn't allow non-uniform scale; Jolt does.
-   **From the EXR instead** (Godot 4.3+): load the 32-bit EXR exported with normalisation Off, and pass 0 and 1 as the range so the values stay in metres.
    
    ```
    var img := Image.load_from_file("res://terrain/heightmap.exr")
    img.convert(Image.FORMAT_RF)
    shape.update_map_data_from_image(img, 0.0, 1.0)  # values are already metres
    ```
    
    Scale the node and divide the heights by the metres per pixel, as above.

## Troubleshooting

The terrain is terraced in Godot

A PNG was loaded directly, so it was cut down to 8-bit. Use a 32-bit EXR or 16-bit RAW (Step 0).

The terrain is far too big or small horizontally

Set Terrain3D's vertex\_spacing, or HTerrain's Map Scale X/Z, to the export's metres per pixel. Both default to 1 m.

There's a cliff along two edges (HTerrain)

The image wasn't 2n+1, so HTerrain padded it with zeros. Pad with edge pixels using the ImageMagick command in Step 0.

The terrain is mirrored north to south

Image row 1 (north) maps to −Z in Godot. If your project treats +Z as north, rotate the terrain 180° or flip the image vertically before converting (add `-flip` to the ImageMagick command).
