<!-- Generated from guides.html by scripts/build-agent-docs.js. Do not edit by hand. -->
Source: https://manticorp.github.io/unrealheightmap/guides.html
Title: Import Guides · 16/32 Bit Heightmap Generator
Summary: Step-by-step guides for importing real-world heightmaps, texture maps and 3D models into Unreal Engine, Blender, Godot, Unity, QGIS, Gaea, Houdini and 3D printing slicers.

# Import Guides

These guides go further than the [main documentation](https://manticorp.github.io/unrealheightmap/instructions.md). Each one covers which export settings to choose, how to get true real-world scale, and how to use the extra texture maps in that program.

[

## Unreal Engine 5

Landscape import with exact Z scale, tiled World Partition imports, weightmap layers, a landscape material and water.

](https://manticorp.github.io/unrealheightmap/guide-unreal.md)

[

## Blender

Displacement in metres, Cycles adaptive subdivision, Geometry Nodes, importing meshes, and draping albedo and normal maps.

](https://manticorp.github.io/unrealheightmap/guide-blender.md)

[

## Godot 4

Terrain3D and HTerrain imports, height scale maths, texture layers, and plugin-free meshes and collision.

](https://manticorp.github.io/unrealheightmap/guide-godot.md)

[

## Unity

Converting to RAW, Terrain sizing in metres, terrain layers from the masks, and importing GLB meshes.

](https://manticorp.github.io/unrealheightmap/guide-unity.md)

[

## QGIS, Gaea, World Machine, Houdini and more

Georeferenced imports for GIS, terrain tools for erosion and detailing, and editing 16-bit files without banding.

](https://manticorp.github.io/unrealheightmap/guide-other.md)

[

## 3D printing

Sizing, height exaggeration and base thickness, plus slicer settings for crisp terrain prints.

](https://manticorp.github.io/unrealheightmap/guide-3d-printing.md)

## Before you start: which export?

Target

Heightmap format

Size

Normalisation

Normal map

Unreal Engine

PNG 16-bit

Unreal sizes (1009, 2017, 4033, 8129)

Smart

DirectX

Blender

EXR 32-bit or PNG 16-bit, or a mesh (OBJ/GLB)

Any

Off (EXR) or Smart (PNG)

OpenGL

Godot (Terrain3D)

EXR 32-bit

Any (power of two is tidiest)

Off

OpenGL

Godot (HTerrain)

EXR 32-bit

Power of two plus one (1025, 2049, 4097)

Off

OpenGL

Unity

PNG 16-bit, converted to RAW

Power of two plus one (1025, 2049, 4097)

Smart

OpenGL

QGIS / GIS

PNG 16-bit (with world file)

Any

Smart, then rescale

Not needed

3D printing

STL (Export 3D Model)

Mesh resolution 512 to 1024

Doesn't matter

Not needed

**PNG or EXR?** The 16-bit PNG works everywhere. A 32-bit EXR works without conversion in Blender, Godot, Houdini and Gaea: with normalisation **Off** it stores true heights in metres, including below sea level, and with Smart or Regular it stores 0.0 (lowest) to 1.0 (highest). Avoid the 16-bit (half-float) EXR for heights. It only has about 2,000 steps near the top of the range, which is coarser than the PNG.

Any width and height can be typed into **Output Width / Height**, so sizes such as 1025 or 2049 that aren't in the presets work too.

### Two numbers to note down

After you click Generate, the tool shows the **height range** (lowest and highest point in metres) and the size of the area. Every guide uses them:

-   **Metres per pixel** = area width in metres ÷ image width in pixels.
-   **Height range** = highest − lowest point, in metres. With Regular or Smart normalisation, black is the lowest point and white is the highest. With normalisation Off, pixel values are heights in metres.
