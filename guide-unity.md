<!-- Generated from guide-unity.html by scripts/build-agent-docs.js. Do not edit by hand. -->
Source: https://manticorp.github.io/unrealheightmap/guide-unity.html
Title: Unity Guide · 16/32 Bit Heightmap Generator
Summary: Import real-world heightmaps into Unity Terrain at true scale: converting to 16-bit RAW, terrain sizing, splatmaps from height bands, and GLB meshes with glTFast.

# Unity: Terrain import at real-world scale

This works the same in Unity 2022 LTS and Unity 6. Unity's Terrain imports 16-bit RAW heightmaps with sides of 2n+1 pixels, so the work is mostly choosing the right export and converting it.

## 1\. Export

-   **Format:** PNG 16-bit.
-   **Size:** a square 2n+1. Type **1025**, **2049** or **4097** into Output Width and Height. The largest Unity Terrain heightmap is 4097. For more, use a tiled export with 2049 or 4097 tiles and one Terrain per tile.
-   **Normalisation:** Smart.
-   **Extra Outputs:** OpenGL normal map and height bands, if you want them.

Note the **height range** (lowest and highest in metres) and the area width in metres.

## 2\. Convert to RAW

Unity's Import Raw reads headerless 16-bit grayscale, little-endian ("Windows" byte order). With [ImageMagick](https://imagemagick.org) 7:

```
magick heightmap.png -depth 16 -endian LSB gray:heightmap.raw
```

If your export isn't already 2n+1 (for example 1024 or 2048), pad it by repeating the edge pixels:

```
magick heightmap.png -virtual-pixel edge -set option:distort:viewport 1025x1025+0+0 -filter point -distort SRT 0 -depth 16 -endian LSB gray:heightmap.raw
```

On ImageMagick 6, use `convert`. In Photoshop, save as **Photoshop Raw** with **IBM PC** byte order, keeping the image in 16 Bits/Channel mode.

## 3\. Import into a Terrain

1.  **GameObject → 3D Object → Terrain.**
2.  Select it, open **Terrain Settings** (gear icon) → **Texture Resolutions (On Terrain Data)** → **Import Raw…**, and pick the `.raw` file.
3.  In the Import Heightmap window:
    -   **Depth**: Bit 16
    -   **Resolution**: detected from the file size. Check it reads 1025, 2049 or 4097.
    -   **Byte Order**: Windows
    -   **Terrain Size**: X = Z = the area width in metres, and Y = the **height range** in metres
    -   **Flip Vertically**: Unity puts the first image row (north) at the terrain's −Z edge. Tick it if you want north at +Z.
4.  Set the Terrain's Transform **Position Y** to the **lowest height** for absolute heights.

**Example:** a 2049 px export covering 13.5 km, with heights from 120 m to 1,620 m.

Terrain Size `13500, 1500, 13500`, Position Y `120`.

-   **Height limit:** Terrain Height must be between 1 and 10,000 m, which fits every real-world range.
-   **Unpadded size:** Width and Length = (pixels − 1) × metres per pixel. If you padded a 1024 export to 1025, the extra pixel adds one metres-per-pixel step of width.

### Terrain Toolbox alternative

The **Terrain Tools** package (`com.unity.terrain-tools`) adds **Window → Terrain → Terrain Toolbox**. Its Create New Terrain → **Import Heightmap** can build several tiled terrains from a batch of RAW files, and has **Height Remap** and **Flip Axis** options. Use RAW files there too. 16-bit PNGs imported as Unity textures may lose precision.

## 4\. Terrain layers from the height bands

Unity stores terrain painting in splatmaps: RGBA textures where each channel is one Terrain Layer. Layer 1 is red, layer 2 green, layer 3 blue and layer 4 alpha, and the next splatmap carries on with layer 5. The tool's height bands add up to white, so they make a valid splatmap.

1.  Pack up to four band masks into one RGBA image:
    
    ```
    magick *_band_00_*.png *_band_01_*.png *_band_02_*.png *_band_03_*.png -set colorspace sRGB -combine -define png:color-type=6 splat0.png
    ```
    
    If you padded the heightmap, pad the bands to the terrain's **Control Texture Resolution** too (or resize them to it).
2.  Create Terrain Layers (grass, rock, snow and so on) on the Terrain, in the same order as the bands.
3.  Apply the image with Terrain Toolbox → **Terrain Utilities → Import Splatmaps** → add `splat0.png` → **Apply to Terrain**.

The OpenGL normal map and albedo are whole-terrain textures. Unity's Terrain Layers are tiling textures, so use them in a custom terrain shader, or on a mesh exported from the tool (below).

## 5\. Meshes instead of Terrain

-   **GLB:** install **glTFast** (Package Manager → **+** → Install package by name → `com.unity.cloud.gltfast`). Version 6.18 is the last that supports 2022.3; newer versions need Unity 6. GLB files then import like any model, at 1 unit = 1 m.
-   **OBJ:** imports natively. Check the **Scale Factor** and tick **Generate Colliders** on the Model tab.
-   Export with **Top surface only** and **Real world (metres)**. The UVs cover the top, so the albedo and OpenGL normal map line up in a standard Lit material.

## Troubleshooting

The Import Raw resolution is wrong, or the terrain is noise

The file isn't 16-bit little-endian, or isn't a square 2n+1. Re-run the ImageMagick command with `-endian LSB`, check the file is exactly width × height × 2 bytes, and set Byte Order to Windows.

The terrain is terraced

The heightmap went through 8 bits somewhere. Convert from the tool's 16-bit PNG directly, and choose Depth: Bit 16 in the import window.

The mountains are the wrong height

Terrain Size Y must equal the height range of _that_ export. Unity maps white to the full Terrain Height.

Tiled terrains don't line up in height

All tiles from one tiled export share one height scale, so give every Terrain the same Size Y and Position Y. For separate exports, set the same Norm From and Norm To in the tool.

## References

-   [Unity manual: working with heightmaps](https://docs.unity3d.com/Manual/terrain-Heightmaps.html)
-   [Terrain Toolbox: Import Heightmap](https://docs.unity3d.com/Packages/com.unity.terrain-tools@5.3/manual/toolbox-import-heightmap.html) and [Import Splatmaps](https://docs.unity3d.com/Packages/com.unity.terrain-tools@5.3/manual/toolbox-import-splatmaps.html)
-   [glTFast installation](https://docs.unity3d.com/Packages/com.unity.cloud.gltfast@6.20/manual/installation.html)
