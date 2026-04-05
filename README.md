# Rikoshop PSD Studio 🎨

An advanced file processing system to convert ZIP archives containing PNG images into layered Photoshop (PSD) files.

## Features
- **Numerical Sorting**: Automatically sorts layers based on numbers in filenames (e.g., `layer_1.png` → bottom, `layer_10.png` → top).
- **Pro Alignment**: Center-aligns images if canvas sizes differ.
- **Transparency Preservation**: Maintains full transparency for each separate layer.
- **Premium UI**: Modern dark-mode interface with drag-and-drop support.

## How to use (Website)
1.  Open the website in your browser (running at `http://localhost:5173`).
2.  Drag your **ZIP file** into the drop zone.
3.  Review the list of extracted PNGs.
4.  Click **"Generate output.psd"**.
5.  Download your final layered PSD file!

## Technical Stack
- **Framework**: Vite + TypeScript
- **Processing**: [ag-psd](https://github.com/mizuno-takaaki/ag-psd) (PSD Engine)
- **Archive Handling**: [JSZip](https://github.com/Stuk/jszip)
- **Interface**: Vanilla CSS with glassmorphism and Lucide icons.

## Development
- Run `npm run dev` to start the local laboratory.
- Run `npm run build` to create a production bundle.

---
*Created for Innu Muthhal Pro kalikal mathhram project.*
