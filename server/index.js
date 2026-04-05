const express = require('express');
const multer = require('multer');
const JSZip = require('jszip');
const { writePsd, initializeCanvas } = require('ag-psd');
const { createCanvas, loadImage } = require('canvas');
const cors = require('cors');
const path = require('path');

// Initialize ag-psd with node-canvas
initializeCanvas(createCanvas, loadImage);

const app = express();
const port = 3001;

app.use(cors());

// Memory storage for uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', engine: 'Rikoshop PSD Engine v2.0' });
});

// Main conversion endpoint
app.post('/convert', upload.single('file'), async (req, res) => {
    const startTime = Date.now();
    console.log('[ENGINE] Starting conversion...');

    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded. Send a ZIP file.' });
        }

        // Step 1: Extract ZIP
        console.log('[STEP 1] Extracting ZIP archive...');
        const zip = new JSZip();
        const contents = await zip.loadAsync(req.file.buffer);

        // Step 2: Filter PNG files only
        console.log('[STEP 2] Filtering PNG files...');
        const pngFiles = Object.keys(contents.files)
            .filter(name => {
                const lower = name.toLowerCase();
                return lower.endsWith('.png') && !name.startsWith('__MACOSX') && !contents.files[name].dir;
            });

        if (pngFiles.length === 0) {
            return res.status(400).json({ error: 'No PNG files found inside the ZIP.' });
        }

        // Step 3: Sort by number in filename (ascending)
        console.log('[STEP 3] Sorting layers numerically...');
        pngFiles.sort((a, b) => {
            const basename_a = path.basename(a);
            const basename_b = path.basename(b);
            const numA = parseInt(basename_a.match(/\d+/)?.[0] || '0');
            const numB = parseInt(basename_b.match(/\d+/)?.[0] || '0');
            return numA - numB;
        });

        console.log(`[INFO] Found ${pngFiles.length} PNG layers:`);
        pngFiles.forEach((f, i) => console.log(`  Layer ${i}: ${path.basename(f)}`));

        // Step 4: Validate and load images
        console.log('[STEP 4] Loading and validating images...');
        const validImages = [];
        let maxWidth = 0;
        let maxHeight = 0;

        for (const name of pngFiles) {
            try {
                const buffer = await contents.files[name].async('nodebuffer');
                const img = await loadImage(buffer);
                const basename = path.basename(name);

                maxWidth = Math.max(maxWidth, img.width);
                maxHeight = Math.max(maxHeight, img.height);

                validImages.push({
                    name: basename,
                    img: img,
                    width: img.width,
                    height: img.height
                });
                console.log(`  ✓ ${basename} (${img.width}x${img.height})`);
            } catch (err) {
                console.log(`  ✗ Skipping ${path.basename(name)} (corrupt/unreadable)`);
            }
        }

        if (validImages.length === 0) {
            return res.status(400).json({ error: 'All PNG files were corrupt or unreadable.' });
        }

        // Step 5: Normalize canvas and create layers
        console.log(`[STEP 5] Canvas size: ${maxWidth}x${maxHeight}`);
        console.log('[STEP 6] Building layer structure...');

        const layers = [];
        for (const item of validImages) {
            // Create canvas for this layer
            const canvas = createCanvas(item.width, item.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(item.img, 0, 0);

            // Center-align if smaller than canvas
            const offsetX = Math.floor((maxWidth - item.width) / 2);
            const offsetY = Math.floor((maxHeight - item.height) / 2);

            layers.push({
                name: item.name.replace('.png', '').replace('.PNG', ''),
                canvas: canvas,
                left: offsetX,
                top: offsetY,
                opacity: 1,
                transparencyProtected: false,
                hidden: false,
                blendMode: 'normal'
            });
        }

        // Step 7: Build PSD document
        // In ag-psd children array: first element = bottom layer
        console.log('[STEP 7] Generating PSD document...');
        const psd = {
            width: maxWidth,
            height: maxHeight,
            channels: 4, // RGBA
            bitsPerChannel: 8,
            colorMode: 3, // RGB
            children: layers
        };

        const psdBuffer = writePsd(psd);

        // Step 8: Return file
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[DONE] PSD generated in ${elapsed}s (${validImages.length} layers, ${maxWidth}x${maxHeight})`);

        // Get output filename from query param or default
        const outputName = req.query.name || 'output';
        const filename = `${outputName}.psd`;

        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('X-Layers-Count', validImages.length.toString());
        res.setHeader('X-Canvas-Size', `${maxWidth}x${maxHeight}`);
        res.setHeader('X-Processing-Time', `${elapsed}s`);
        res.send(Buffer.from(psdBuffer));

    } catch (err) {
        console.error('[ERROR]', err);
        res.status(500).json({
            error: 'Conversion failed',
            details: err.message
        });
    }
});

app.listen(port, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║     RIKOSHOP PSD ENGINE v2.0                ║');
    console.log('║     Backend ready at http://localhost:3001   ║');
    console.log('║                                              ║');
    console.log('║     POST /convert  → ZIP to layered PSD     ║');
    console.log('║     GET  /health   → Server status           ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');
});
