import JSZip from 'jszip';
import { writePsd } from 'ag-psd';

export interface ImageData {
    name: string;
    blob: Blob;
    url: string;
    width: number;
    height: number;
    index: number;
}

export async function processZip(file: File): Promise<ImageData[]> {
    const zip = new JSZip();
    const contents = await zip.loadAsync(file);
    const pngFiles = Object.keys(contents.files).filter(name => name.toLowerCase().endsWith('.png') && !name.startsWith('__MACOSX'));
    
    // Sort files numerically by filename
    pngFiles.sort((a, b) => {
        const numA = parseInt(a.match(/\d+/)?.[0] || '0');
        const numB = parseInt(b.match(/\d+/)?.[0] || '0');
        return numA - numB;
    });

    const imageData: ImageData[] = [];
    
    for (let i = 0; i < pngFiles.length; i++) {
        const name = pngFiles[i];
        const blob = await contents.files[name].async('blob');
        const url = URL.createObjectURL(blob);
        
        // Get dimensions
        const dimensions = await getImageDimensions(url);
        
        imageData.push({
            name: name.split('/').pop() || name,
            blob,
            url,
            width: dimensions.width,
            height: dimensions.height,
            index: i
        });
    }

    return imageData;
}

function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            resolve({ width: img.width, height: img.height });
        };
        img.src = url;
    });
}

export async function generatePsd(images: ImageData[]): Promise<Blob> {
    if (images.length === 0) throw new Error('No images to process');

    // Determine canvas size (max of all images)
    const maxWidth = Math.max(...images.map(img => img.width));
    const maxHeight = Math.max(...images.map(img => img.height));

    const layers = [];

    // Process from lowest to highest (bottom to top)
    // ag-psd's children array has the first element at the bottom?
    // Actually, in ag-psd, the first element in children is the TOP layer if it's like a list.
    // Wait, let's check ag-psd documentation in search results: "The first element in the array is the bottom-most layer."
    // Let me re-verify. Usually PSD structures have bottom layers first in the array.
    
    for (const imgData of images) {
        const canvas = document.createElement('canvas');
        canvas.width = imgData.width;
        canvas.height = imgData.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        // Load image into canvas
        const img = await loadImage(imgData.url);
        ctx.drawImage(img, 0, 0);

        layers.push({
            name: imgData.name,
            canvas: canvas,
            top: Math.floor((maxHeight - imgData.height) / 2),
            left: Math.floor((maxWidth - imgData.width) / 2),
            opacity: 255,
            visible: true
        });
    }

    const psd = {
        width: maxWidth,
        height: maxHeight,
        children: layers // ag-psd: first is bottom
    };

    const buffer = writePsd(psd);
    return new Blob([buffer], { type: 'application/x-photoshop' });
}

function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = url;
    });
}
