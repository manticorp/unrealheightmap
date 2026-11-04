
<div align="right">
  <details>
    <summary >🌐 Language</summary>
    <div>
      <div align="center">
        <a href="https://openaitx.github.io/view.html?user=manticorp&project=unrealheightmap&lang=en">English</a>
        | <a href="https://openaitx.github.io/view.html?user=manticorp&project=unrealheightmap&lang=zh-CN">简体中文</a>
        | <a href="https://openaitx.github.io/view.html?user=manticorp&project=unrealheightmap&lang=zh-TW">繁體中文</a>
        | <a href="https://openaitx.github.io/view.html?user=manticorp&project=unrealheightmap&lang=ja">日本語</a>
        | <a href="https://openaitx.github.io/view.html?user=manticorp&project=unrealheightmap&lang=ko">한국어</a>
        | <a href="https://openaitx.github.io/view.html?user=manticorp&project=unrealheightmap&lang=hi">हिन्दी</a>
        | <a href="https://openaitx.github.io/view.html?user=manticorp&project=unrealheightmap&lang=th">ไทย</a>
        | <a href="https://openaitx.github.io/view.html?user=manticorp&project=unrealheightmap&lang=fr">Français</a>
        | <a href="https://openaitx.github.io/view.html?user=manticorp&project=unrealheightmap&lang=de">Deutsch</a>
        | <a href="https://openaitx.github.io/view.html?user=manticorp&project=unrealheightmap&lang=es">Español</a>
        | <a href="https://openaitx.github.io/view.html?user=manticorp&project=unrealheightmap&lang=it">Italiano</a>
        | <a href="https://openaitx.github.io/view.html?user=manticorp&project=unrealheightmap&lang=ru">Русский</a>
        | <a href="https://openaitx.github.io/view.html?user=manticorp&project=unrealheightmap&lang=pt">Português</a>
        | <a href="https://openaitx.github.io/view.html?user=manticorp&project=unrealheightmap&lang=nl">Nederlands</a>
        | <a href="https://openaitx.github.io/view.html?user=manticorp&project=unrealheightmap&lang=pl">Polski</a>
        | <a href="https://openaitx.github.io/view.html?user=manticorp&project=unrealheightmap&lang=ar">العربية</a>
        | <a href="https://openaitx.github.io/view.html?user=manticorp&project=unrealheightmap&lang=fa">فارسی</a>
        | <a href="https://openaitx.github.io/view.html?user=manticorp&project=unrealheightmap&lang=tr">Türkçe</a>
        | <a href="https://openaitx.github.io/view.html?user=manticorp&project=unrealheightmap&lang=vi">Tiếng Việt</a>
        | <a href="https://openaitx.github.io/view.html?user=manticorp&project=unrealheightmap&lang=id">Bahasa Indonesia</a>
        | <a href="https://openaitx.github.io/view.html?user=manticorp&project=unrealheightmap&lang=as">অসমীয়া</
      </div>
    </div>
  </details>
</div>

# 16/32 Bit Grayscale PNG/EXR Heightmap Generator

A browser-based tool for generating high-quality 16-bit grayscale PNG heightmaps or 16/32-bit EXR heightmaps from real-world terrain data.

Perfect for creating realistic landscapes in Unreal Engine 5 and other game engines or 3D software, such as Terrain3d, Godot4 and Blender.

🌐 **Live Website:** [https://manticorp.github.io/unrealheightmap/](https://manticorp.github.io/unrealheightmap/)

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/L4L212G6M7)

## ⚠️ Important Notice

We have started hitting the free tier limits from some map services, so the site *may not work* until we get some funding to up these limits. If you find this tool useful, please consider supporting the project!

## ✨ Features

- **High-Quality 16/32-bit Output** - Generate heightmaps with 65,536/4,294,967,296 levels of detail (vs only 256 in 8-bit)
- **Real-World Terrain Data** - Uses high-quality elevation data from [Mapzen's global elevation service](https://www.mapzen.com/blog/elevation/)
- **Interactive Map Interface** - Visual selection of terrain areas using an intuitive map interface
- **Multiple Normalisation Modes** - Choose between None, Regular, or Smart normalisation to optimize your heightmap data
- **Flexible Output Sizes** - Preset sizes for Unreal Engine or custom dimensions up to 8129×8129 pixels
- **Browser-Based** - No installation required, works entirely in your web browser
- **Real-Time Preview** - See the area you're exporting with an overlay on the map
- **Copy & Paste Coordinates** - Support for multiple coordinate formats including DMS and decimal degrees
- **Place Search** - Find mountains, valleys and towns by name, or type coordinates
- **Shareable Links** - The URL holds your location and export settings; copy it to share or bookmark an exact export
- **Water Handling** - Flatten everything below a water level and export a water mask
- **Extra Texture Maps** - Normal map (DirectX or OpenGL), slope, curvature and height-band masks for landscape materials and layer weightmaps

## 🎯 Use Cases

- Creating realistic terrain for Unreal Engine 5/Blender/Terrain3D landscapes
- Game development with accurate real-world topography
- 3D modeling and visualization projects
- Geographic information system (GIS) applications
- Educational and scientific visualization

## 🚀 Quick Start

1. Visit [https://manticorp.github.io/unrealheightmap/](https://manticorp.github.io/unrealheightmap/)
2. Use the map to navigate to your desired location or enter coordinates manually
3. Adjust the output zoom and size to define your export area (shown as an orange rectangle)
4. Select a normalisation mode appropriate for your use case
5. Click "Generate" to create and download your heightmap

For detailed instructions, visit the [Documentation](https://manticorp.github.io/unrealheightmap/instructions.html) page.

## 📖 Documentation

- **[Instructions](https://manticorp.github.io/unrealheightmap/instructions.html)** - Comprehensive guide on how to use the tool
- **[Examples](https://manticorp.github.io/unrealheightmap/examples.html)** - Gallery of heightmaps created with the tool
- **[License Info](https://manticorp.github.io/unrealheightmap/rights.html)** - Information about data sources and licensing

## 🛠️ Technology Stack

- **TypeScript** - Type-safe application code
- **Leaflet** - Interactive map interface
- **jQuery** - DOM manipulation and UI interactions
- **UPNG.js** - PNG encoding/decoding
- **Pako** - Data compression
- **Webpack** - Module bundling
- **Bulma** - CSS framework
- **SASS** - CSS preprocessing

## 💻 Development Setup

### Prerequisites

- Node.js (v14 or higher recommended)
- npm (comes with Node.js)

### Installation

```bash
# Clone the repository
git clone https://github.com/manticorp/unrealheightmap.git
cd unrealheightmap

# Install dependencies
npm install
```

### Build Commands

```bash
# Development build
npm run build

# Production build
npm run author

# Watch mode (auto-rebuild on changes)
npm run watch

# Run unit tests
npm test
```

### Project Structure

```
├── src/                   # Source TypeScript and SASS files
│   ├── app.ts             # Main application logic
│   ├── main.ts            # Entry point
│   ├── png.ts             # PNG processing
│   ├── processor.ts       # Web worker for image processing
│   ├── sass/              # Stylesheets
│   └── templates/         # HTML templates
├── public/                # Static assets and build output
│   ├── dist/              # Built JavaScript and CSS
│   ├── im/                # Images
│   └── examples/          # Example heightmaps
├── index.html             # Main application page
├── instructions.html      # Documentation page
├── examples.html          # Examples page
└── webpack.config.js      # Webpack configuration
```

## 🎨 Examples

### Grand Canyon (64km)
[View in tool](https://manticorp.github.io/unrealheightmap/#latitude/36.18111652966563/longitude/-112.021/zoom/10/outputzoom/14/width/8129/height/8129)

![Grand Canyon Example](public/im/grand_canyon_desserty.png)

For more examples, visit the [Examples page](https://manticorp.github.io/unrealheightmap/examples.html).

## 🔧 Normalisation Modes

### None
No normalisation performed. Pixel values directly represent height in meters (negative values are set to 0).

### Regular
Scales height values to use the full 16-bit range (0-65535), maximizing detail across the entire heightmap.

### Smart
An advanced mode that handles data errors and outliers. Uses a 99.9% window to filter extreme values while preserving authentic min/max values within 1 standard deviation.

## 📊 Output Format

- **Format:** 16-bit Grayscale PNG, 16-bit EXR or 32-bit EXR
- **Bit Depth:** 65,536 levels of detail (2^16) or 4,294,967,296 (2^32)
- **Precision:** Capable of representing Mount Everest (8,849m) in ~13cm intervals (16 bit)
- **Source Data:** Mapzen elevation data (24-bit precision, ~4mm fidelity)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues, fork the repository, and create pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

The elevation data is provided by [Mapzen](https://www.mapzen.com/blog/elevation/) and may have its own licensing terms.

## 💖 Support

If you find this tool useful, please consider supporting the project:

- ☕ [Buy me a coffee on Ko-fi](https://ko-fi.com/harrymustoeplayfair)
- ⭐ Star this repository
- 🐦 Share it with others who might find it useful

## 🙏 Acknowledgments

- [Mapzen](https://www.mapzen.com/) for providing high-quality global elevation data
- [Unreal Engine](https://www.unrealengine.com/) community for inspiration and use cases
- All contributors and users of this tool

## 📞 Contact

- **Author:** Harry Mustoe-Playfair
- **Email:** harry.mustoeplayfair@gmail.com
- **GitHub:** [manticorp](https://github.com/manticorp)

---

Made with ❤️ for the Unreal Engine, 3D and game development community
