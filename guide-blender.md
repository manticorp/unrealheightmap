<!-- Generated from guide-blender.html by scripts/build-agent-docs.js. Do not edit by hand. -->
Source: https://manticorp.github.io/unrealheightmap/guide-blender.html
Title: Blender Guide · 16/32 Bit Heightmap Generator
Summary: Use real-world heightmaps in Blender at true scale: Displace modifier maths, Cycles adaptive subdivision, Geometry Nodes, mesh import, albedo and normal maps, BlenderGIS.

# Blender: advanced terrain workflows

This guide is written for Blender 4.2 LTS to 5.x, and notes where the versions differ. There are four ways to get terrain in, from simplest to most flexible:

1.  [Import a ready-made mesh](https://manticorp.github.io/unrealheightmap/guide-blender.md#mesh) (OBJ/GLB). Quickest, with true scale automatically.
2.  [Displace modifier](https://manticorp.github.io/unrealheightmap/guide-blender.md#displace) on a plane. Editable, and works in EEVEE and Cycles.
3.  [Cycles shader displacement with adaptive subdivision](https://manticorp.github.io/unrealheightmap/guide-blender.md#adaptive). The most detail for the least memory, for final renders.
4.  [Geometry Nodes](https://manticorp.github.io/unrealheightmap/guide-blender.md#geonodes). Procedural, one vertex per pixel, easy to scatter on.

Then: [materials from the albedo and maps](https://manticorp.github.io/unrealheightmap/guide-blender.md#materials), [BlenderGIS](https://manticorp.github.io/unrealheightmap/guide-blender.md#blendergis), [performance](https://manticorp.github.io/unrealheightmap/guide-blender.md#performance) and [troubleshooting](https://manticorp.github.io/unrealheightmap/guide-blender.md#troubleshooting).

## The numbers you'll need

Export a **16-bit PNG** with **Smart** normalisation, then note from the generator page:

-   **Area width × height in metres.** This is shown in Bounds & projection, or work it out as XY scale ÷ 100 × pixels.
-   **Height range:** the lowest and highest heights in metres. _Range = highest − lowest._

Black in the PNG is the lowest point and white is the highest. Blender reads a 16-bit PNG as 0.0 to 1.0, so multiplying by the range gives true heights.

**Even simpler: 32-bit EXR in metres.** Export **OpenEXR 32-bit** with normalisation **Off**. Each pixel is then the true height in metres, including below sea level. In the steps below, use **Strength / Scale 1** and leave the object at Z = 0. For the Displace modifier, also untick **Clamp** in the texture's Colors panel, so heights below 0 aren't cut off. Avoid the 16-bit EXR, which is coarser than the PNG.

## 1\. Import a ready-made mesh

1.  In the tool, click **Export 3D Model** with Format **GLB** (or OBJ), Shape **Top surface only** and Scale **Real world (metres)**. A mesh resolution of 1024 to 2048 is good for close-ups.
2.  In Blender, use **File → Import → glTF 2.0 (.glb/.gltf)** or **Wavefront (.obj)**. Both convert the Y-up file to Blender's Z-up automatically with the default axis settings.
3.  The mesh is centred on the origin, in metres, at true proportions. Its UVs cover the top 0 to 1, so the albedo and normal map line up directly (see [materials](https://manticorp.github.io/unrealheightmap/guide-blender.md#materials)).

For an STL made for printing (in millimetres), set the importer's **Scale** to 0.001 to see it at real print size in Blender's metre units.

## 2\. Displace modifier on a plane

1.  **Add → Mesh → Plane.** In the N panel, set **Dimensions** X and Y to the area's width and height in metres, then apply the scale (**Ctrl+A → Scale**).
2.  Add a **Subdivision Surface** modifier set to **Simple**. Each level quadruples the faces: level 10 gives 1024 × 1024. For one vertex per pixel on big maps, subdivide in Edit Mode instead (Subdivide with Number of Cuts), or use [Geometry Nodes](https://manticorp.github.io/unrealheightmap/guide-blender.md#geonodes).
3.  Add a **Displace** modifier below it:
    -   **Texture**: New → Image or Movie → open the 16-bit PNG.
    -   **Coordinates**: `UV`. The plane's UVs already cover 0 to 1.
    -   **Direction**: `Z`.
    -   **Midlevel**: `0`.
    -   **Strength**: the **height range in metres**.
4.  In the texture's image settings, set **Color Space** to **Non-Color**. Otherwise Blender applies a colour curve and bends the heights.
5.  For absolute heights, set the object's Location Z to the **lowest height**.

The modifier works as `offset = (pixel − Midlevel) × Strength`. With Midlevel 0 and Strength equal to the range, black stays at 0 and white rises by the full range.

**Example:** a 2017 px export covering 13.3 km, with heights from 120 m to 1,620 m.

Plane 13,300 × 13,300 m, Strength `1500`, Midlevel `0`, Location Z `120`.

## 3\. Cycles: shader displacement with adaptive subdivision

Adaptive subdivision adds detail only where the camera can see it, measured in screen pixels. It's the best way to render a huge heightmap at full detail.

1.  Set the render engine to **Cycles**.
    -   On **Blender 4.x**, also set **Feature Set** to **Experimental**. Adaptive subdivision was still experimental there.
    -   On **Blender 5.0+**, it's a standard feature, so skip this step.
2.  Make a plane at the area's size, as above, and add a **Subdivision Surface** modifier (Simple), as the last modifier.
    -   5.x: open the modifier's **Adaptive Subdivision** panel and turn it on.
    -   4.x: tick **Adaptive Subdivision** in Object Properties.
3.  In the material:
    -   Add an **Image Texture** with the PNG, Color Space **Non-Color** and Interpolation **Cubic**.
    -   Connect it to a **Displacement** node with **Midlevel** 0 and **Scale** equal to the height range. Leave Space at Object, and keep the object's scale at 1.
    -   Connect the Displacement node to the Material Output's **Displacement** socket.
4.  Under Material Properties → Settings → Surface, set **Displacement** to **Displacement Only**, or **Displacement and Bump** for extra fine detail.
5.  Under Render Properties → **Subdivision**, set **Dicing Rate Render**. 1 px is full detail and 2 to 4 px is much lighter. Raise **Offscreen Scale** so terrain behind the camera stays cheap. **Max Subdivisions** caps the depth.

Displacement only appears in Rendered viewport mode or in final renders.

## 4\. Geometry Nodes

This gives exactly one vertex per pixel, which makes it easy to scatter trees by slope or height:

1.  Add a Geometry Nodes modifier to any object and replace its input with a **Grid** node:
    -   **Size X / Y** = the area's width and height in metres
    -   **Vertices X / Y** = the image's pixel size (or half that for a lighter mesh)
2.  Add an **Image Texture** node (geometry version) with the PNG. Connect the Grid's **UV Map** output to its **Vector** input. Use Linear interpolation.
3.  Run the Color through a **Math → Multiply** by the height range, then into the Z of a **Combine XYZ**, then into a **Set Position** node's **Offset**.
4.  To keep UVs for materials, use **Store Named Attribute** (Face Corner, Vector, name `UVMap`) on the Grid's UV Map output before Set Position.

The exported slope, curvature and height-band PNGs can be sampled the same way and fed into **Distribute Points on Faces** → Density, to place forests, rocks and snow only where they belong.

## Materials from the albedo and maps

Every export from the same area shares the same 0 to 1 UVs, so no alignment is needed.

-   **Albedo:** Image Texture (sRGB) into Principled BSDF **Base Color**.
-   **Normal map:** export **OpenGL**. Load it as an Image Texture set to **Non-Color**, then connect it to a **Normal Map** node (Tangent Space) and on to the BSDF **Normal**. Recent versions (5.1+) also have a DirectX/OpenGL **Convention** option on the Normal Map node, if you only have the DirectX version.
-   **Masks** (slope, curvature, height bands, water), all Non-Color:
    -   Use them as **Mix** factors between grass, rock and snow shaders.
    -   Run a mask through a **Color Ramp** to sharpen or move the transition.
    -   Use the water mask to add a glossy, dark wet band along shores.
-   **Close-up detail:** mix tiling PBR textures (for example from Poly Haven) using box-projected **Object** coordinates. The albedo alone gets blurry close to the camera, because satellite imagery is often 0.5 to 10 m per pixel.

## Georeferenced import with BlenderGIS

[BlenderGIS](https://github.com/domlysz/BlenderGIS) is still maintained and supports Blender 4.x and 5.x. It's useful if you combine the terrain with other GIS data, such as OpenStreetMap buildings or GPS tracks.

1.  In BlenderGIS's settings, set the scene CRS to **EPSG:3857**. Add it to the predefined CRS list if it's missing.
2.  In the 3D Viewport header, open **GIS → Import → Georeferenced raster** and choose the PNG. Its `.pgw` world file must be in the same folder with the same name. BlenderGIS ignores the `.prj`, so tick **Specify raster CRS** and choose EPSG:3857.
3.  Pick the mode **DEM as displacement texture**.
4.  BlenderGIS assumes the pixel values are raw elevations, so for a normalised PNG it sets an enormous Strength. Afterwards, set the Displace modifier's **Strength** to the height range and its Midlevel to 0.
5.  Import the albedo the same way with **Basemap on mesh**.

## Performance

-   **Vertex counts.** An 8129² grid is 66 million vertices. Keep the viewport subdivision low and the render subdivision high, or use adaptive subdivision.
-   **Simplify.** Render Properties → **Simplify** caps **Max Subdivision** and **Texture Limit** separately for the viewport and the render.
-   **Decimate.** A Decimate modifier (Planar or Collapse) after the Displace modifier greatly reduces flat areas before you export to a game engine.
-   **Halve the source.** For background mountains, export at a lower output zoom. Detail you can't see still costs memory.

## Troubleshooting

The terrain is terraced or stepped

The image was saved as 8-bit somewhere, or the Color Space isn't Non-Color. Re-open the tool's 16-bit PNG and check the Image Editor's header shows 16-bit.

The heights are slightly wrong, with peaks fine but valleys too low

The image is set to sRGB instead of Non-Color. Heightmaps are data, so they must be Non-Color. EXRs exported before November 2026 also stored heights on a curve, so re-export those.

Displacement does nothing (Cycles)

Check that Material Settings → Displacement is not set to Bump Only, and that you're in Rendered view. For adaptive subdivision on 4.x, check that the Feature Set is Experimental.

The terrain is mirrored

Imported meshes are already correct. For a plane you made yourself, check you didn't rotate it. Image row 1 (north) should be at +Y, the top of the Top view.

## References

-   [Displace modifier](https://docs.blender.org/manual/en/latest/modeling/modifiers/deform/displace.html)
-   [Cycles subdivision settings](https://docs.blender.org/manual/en/latest/render/cycles/render_settings/subdivision.html) and [5.0 release notes](https://developer.blender.org/docs/release_notes/5.0/cycles/)
-   [Displacement node](https://docs.blender.org/manual/en/latest/render/shader_nodes/displacement/displacement.html)
-   [Geometry Nodes Image Texture](https://docs.blender.org/manual/en/latest/modeling/geometry_nodes/texture/image.html)
-   [BlenderGIS](https://github.com/domlysz/BlenderGIS)
