<!-- Generated from guide-3d-printing.html by scripts/build-agent-docs.js. Do not edit by hand. -->
Source: https://manticorp.github.io/unrealheightmap/guide-3d-printing.html
Title: 3D Printing Guide · 16/32 Bit Heightmap Generator
Summary: Print real-world terrain: choosing area, size, height exaggeration and base thickness, then slicing in PrusaSlicer, Bambu Studio or Cura.

# 3D printing real terrain

The tool exports a watertight, ready-to-slice STL, so you don't need any other software.

## 1\. Choose the area

-   **Frame your area with some relief.** A mountain, a valley or a volcano. Flat farmland prints as a flat slab.
-   **Output zoom.** The STL uses the area shown by the orange rectangle. Very high zooms don't add printable detail: on a 150 mm print, a 0.4 mm nozzle resolves about 375 points across. For a 20 km area, zoom 12 to 13 data is plenty, and Mapterhorn lidar areas give the crispest small prints.
-   Check it in **3D Preview** first, with the exaggeration you plan to use.

## 2\. Export settings

3D Model Format

**STL**

Mesh Resolution

**512** for prints up to about 150 mm. **1024** for larger prints or very rugged terrain. Beyond that, files grow large with no visible gain at nozzle scale.

Shape

**Solid with base**. This makes a closed, flat-bottomed model that needs no supports.

Base Thickness

**2 to 3 mm** under the lowest point. Use more for large prints to prevent warping, or if you want to engrave a label on the side.

Scale

**Print size (mm)**, with Print Width set to the length of the longer side.

Height Exaggeration

**1** for alpine terrain. **1.5 to 2** for hills. **2 to 3** for gentle landscapes, coasts and plains. Real terrain looks surprisingly flat at small scale: at 150 mm wide, a 20 km area with 1,500 m of relief is only 11 mm tall at 1×.

After generating a heightmap, the output also shows the height/width ratio, and how tall the print would be at 100 mm wide with no exaggeration.

## 3\. Slicing

STL files have no units. The tool writes millimetres, which every slicer assumes.

-   **Check the size** shown in the slicer matches your Print Width. In PrusaSlicer, decline the "convert from inches" prompt, which only applies to genuine inch files.
-   **Orientation:** flat on the base. No supports are needed.
-   **Layer height:** 0.08 to 0.12 mm shows contours best. Variable layer height saves time by using thin layers only near the peaks:
    -   PrusaSlicer: select the model → **Variable layer height** → **Adaptive**.
    -   Bambu Studio: **Variable layer height** (adaptive).
    -   Cura: **Experimental → Use Adaptive Layers**.
-   **Walls and infill:** 2 to 3 walls and 10 to 15% infill. Use 4 or more top layers so the terrain surface is solid.
-   **Seam:** place it at the back or on a sharp corner, so it doesn't run down a mountainside.
-   **Ironing:** leave it off. It flattens the contours you want to see.

These are typical settings that work well for terrain. Adjust them for your printer and material.

## 4\. Make it look great

-   **Colour by height:** on single-nozzle printers, add colour changes at layer heights, for example green, then grey at the treeline, then white for snow. Work out the layer height for a real altitude:
    
    ```
    print Z (mm) = base + (altitude − lowest) × exaggeration × print width ÷ area width (m) ÷ 1000
    ```
    
    Multi-material printers (AMS, MMU) can do the same with height-range modifiers.
-   **Water:** export with **Flatten below water level** so lakes and the sea print as perfectly flat surfaces. That's ideal for a colour change, or for pouring resin afterwards.
-   **Tiles:** for prints larger than your bed, export neighbouring areas at the same output zoom and the same Norm From / Norm To, so the heights match. Print them at the same Print Width and exaggeration.
-   **Resin printers:** use a thinner base (1.5 to 2 mm), hollow large models in your resin slicer, and add drain holes in the base.

## Troubleshooting

The print is tiny, or 25 times too big

The slicer converted units. Re-import and decline any inch conversion, or check the importer's unit setting. The STL is in millimetres.

Thin spikes or jagged ridges

Lower the Mesh Resolution or the exaggeration. Very sharp ridges narrower than your nozzle can't print cleanly.

The slicer says the mesh has errors

"Solid with base" models are built watertight. If a slicer still complains, run its repair function (it should find nothing to fix) and check you didn't export "Top surface only", which is an open skin.
