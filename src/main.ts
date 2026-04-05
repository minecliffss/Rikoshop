import './style.css';
import { processZip, generatePsd } from './converter';
import type { ImageData } from './converter';

const dropzone = document.getElementById('dropzone') as HTMLDivElement;
const fileInput = document.getElementById('fileInput') as HTMLInputElement;
const processSection = document.getElementById('processSection') as HTMLElement;
const convertBtn = document.getElementById('convertBtn') as HTMLButtonElement;
const affinityBtn = document.getElementById('affinityBtn') as HTMLButtonElement;
const canvaBtn = document.getElementById('canvaBtn') as HTMLButtonElement;
const gimpBtn = document.getElementById('gimpBtn') as HTMLButtonElement;
const restartBtn = document.getElementById('restartBtn') as HTMLButtonElement;
const appStatus = document.getElementById('appStatus') as HTMLElement;
const fileCountText = document.getElementById('fileCountText') as HTMLParagraphElement;

let extractedImages: ImageData[] = [];

// ── Drag & Drop ──
dropzone.addEventListener('click', () => fileInput.click());

dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-over');
});

dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));

dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    if (e.dataTransfer?.files.length) {
        handleFile(e.dataTransfer.files[0]);
    }
});

fileInput.addEventListener('change', () => {
    if (fileInput.files?.length) {
        handleFile(fileInput.files[0]);
    }
});

// ── File Handling ──
async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.zip')) {
        alert('Please upload a .zip file containing PNG images.');
        return;
    }

    try {
        if(appStatus) appStatus.textContent = 'Extracting...';
        extractedImages = await processZip(file);

        if (extractedImages.length === 0) {
            alert('No PNG images found inside the ZIP.');
            if(appStatus) appStatus.textContent = 'No PNGs found';
            return;
        }

        fileCountText.textContent = `${extractedImages.length} layers embedded`;
        processSection.classList.remove('hidden');
        dropzone.classList.add('hidden');
        if(appStatus) appStatus.textContent = `${extractedImages.length} layers ready`;
    } catch (err) {
        console.error(err);
        alert('Failed to read the ZIP file.');
        if(appStatus) appStatus.textContent = 'Error';
    }
}

// ── Helper: set all buttons loading/idle ──
function setButtonsLoading(loading: boolean) {
    const allBtns = [convertBtn, affinityBtn, canvaBtn, gimpBtn];
    allBtns.forEach(btn => btn.style.opacity = loading ? '0.5' : '1');
    allBtns.forEach(btn => btn.disabled = loading);
}

function resetButtonLabels() {
    const allBtns = [convertBtn, affinityBtn, canvaBtn, gimpBtn];
    allBtns.forEach(btn => {
        btn.style.opacity = '1';
        btn.disabled = false;
    });
}

// ── Export PSD ──
convertBtn.addEventListener('click', async () => {
    if (extractedImages.length === 0) return;

    try {
        setButtonsLoading(true);
        if(appStatus) appStatus.textContent = 'Building PSD layers...';

        const psdBlob = await generatePsd(extractedImages);
        const url = URL.createObjectURL(psdBlob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'output.psd';
        a.click();

        if(appStatus) appStatus.textContent = 'PSD downloaded';
    } catch (err) {
        console.error(err);
        alert('Failed to generate PSD.');
        if(appStatus) appStatus.textContent = 'Error';
    } finally {
        resetButtonLabels();
    }
});

// ── Export .afphoto (PSD renamed to .afphoto) ──
affinityBtn.addEventListener('click', async () => {
    if (extractedImages.length === 0) return;

    try {
        setButtonsLoading(true);
        if(appStatus) appStatus.textContent = 'Building Affinity layers...';

        const psdBlob = await generatePsd(extractedImages);
        // Re-wrap as .afphoto blob
        const afBlob = new Blob([psdBlob], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(afBlob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'output.afphoto';
        a.click();

        if(appStatus) appStatus.textContent = 'Affinity file downloaded';
    } catch (err) {
        console.error(err);
        alert('Failed to generate Affinity file.');
        if(appStatus) appStatus.textContent = 'Error';
    } finally {
        resetButtonLabels();
    }
});

// ── Open in Canva ──
canvaBtn.addEventListener('click', async () => {
    if (extractedImages.length === 0) return;
    try {
        setButtonsLoading(true);
        if(appStatus) appStatus.textContent = 'Building PSD for Canva...';

        const psdBlob = await generatePsd(extractedImages);
        const url = URL.createObjectURL(psdBlob);

        // Download the PSD
        const a = document.createElement('a');
        a.href = url;
        a.download = 'canva_upload.psd';
        a.click();

        // Redirect to Canva Upload Page format
        window.open('https://www.canva.com/folder/uploads', '_blank');

        if(appStatus) appStatus.textContent = 'PSD saved! Upload it to Canva.';
    } catch (err) {
        console.error(err);
        alert('Failed to generate file for Canva.');
        if(appStatus) appStatus.textContent = 'Error';
    } finally {
        resetButtonLabels();
    }
});

// ── Open in GIMP ──
gimpBtn.addEventListener('click', async () => {
    if (extractedImages.length === 0) return;
    try {
        setButtonsLoading(true);
        if(appStatus) appStatus.textContent = 'Building PSD for GIMP...';

        const psdBlob = await generatePsd(extractedImages);
        const url = URL.createObjectURL(psdBlob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'output_gimp.psd';
        a.click();

        if(appStatus) appStatus.textContent = 'GIMP file downloaded';
    } catch (err) {
        console.error(err);
        alert('Failed to generate file for GIMP.');
        if(appStatus) appStatus.textContent = 'Error';
    } finally {
        resetButtonLabels();
    }
});

restartBtn.addEventListener('click', () => {
    extractedImages.forEach(img => URL.revokeObjectURL(img.url));
    extractedImages = [];

    processSection.classList.add('hidden');
    dropzone.classList.remove('hidden');
    fileInput.value = '';
    if(appStatus) appStatus.textContent = 'Ready';
});
