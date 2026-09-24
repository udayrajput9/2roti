/**
 * Enterprise Visually-Lossless Image Optimization Pipeline
 * 
 * - Downsamples oversized raw camera/stock resolutions (up to 5600px) down to crisp Retina HD (max 1200px)
 * - Employs Lanczos3 interpolation for razor-sharp edge preservation without ringing
 * - Re-encodes with MozJPEG (Quality 85, Progressive Scans, Trellis Quantization)
 * - Generates next-gen WebP variants (Quality 85, Effort 6, Smart Subsampling)
 * - Fixes format anomalies (e.g. HEIF/raw PNG files disguised as .jpg)
 * - Preserves visual color fidelity (sRGB) while stripping heavy EXIF/GPS metadata
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const TARGET_DIRECTORIES = [
  { dir: path.resolve(__dirname, '../website/public/images/food'), maxDim: 1200, isLogo: false },
  { dir: path.resolve(__dirname, '../website/public/logos'), maxDim: 800, isLogo: true },
  { dir: path.resolve(__dirname, '../admin-web/public/images/food'), maxDim: 1200, isLogo: false },
  { dir: path.resolve(__dirname, '../admin-web/public/logos'), maxDim: 800, isLogo: true },
  { dir: path.resolve(__dirname, '../assets/logos'), maxDim: 800, isLogo: true },
  { dir: path.resolve(__dirname, '../assets'), maxDim: 1200, isLogo: false }
];

async function processDirectory({ dir, maxDim, isLogo }) {
  if (!fs.existsSync(dir)) return { count: 0, origBytes: 0, newBytes: 0 };

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let count = 0;
  let origBytes = 0;
  let newBytes = 0;

  console.log(`\n======================================================`);
  console.log(`  Processing: ${dir}`);
  console.log(`======================================================`);

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const ext = path.extname(entry.name).toLowerCase();
    if (!['.jpg', '.jpeg', '.png'].includes(ext)) continue;

    const filePath = path.join(dir, entry.name);
    const baseName = path.basename(entry.name, ext);
    const stat = fs.statSync(filePath);
    const originalSize = stat.size;
    origBytes += originalSize;

    try {
      const inputBuffer = fs.readFileSync(filePath);
      const meta = await sharp(inputBuffer).metadata();

      const pipeline = sharp(inputBuffer).rotate();

      // Only resize if larger than maxDim
      if (meta.width > maxDim || meta.height > maxDim) {
        pipeline.resize({
          width: maxDim,
          height: maxDim,
          fit: 'inside',
          withoutEnlargement: true,
          kernel: sharp.kernel.lanczos3
        });
      }

      // 1. Generate / Overwrite Optimized JPEG (or PNG if original was true PNG with alpha)
      let optimizedBuffer;
      const isPngWithAlpha = ext === '.png' && meta.hasAlpha;

      if (isPngWithAlpha) {
        optimizedBuffer = await pipeline
          .clone()
          .png({ compressionLevel: 9, palette: true, quality: 85 })
          .toBuffer();
      } else {
        optimizedBuffer = await pipeline
          .clone()
          .jpeg({
            quality: isLogo ? 88 : 84,
            progressive: true,
            mozjpeg: true,
            trellisQuantisation: true,
            overshootDeringing: true,
            optimizeScans: true
          })
          .toBuffer();
      }

      // Write optimized file atomically
      const tmpPath = filePath + '.tmp';
      fs.writeFileSync(tmpPath, optimizedBuffer);
      fs.renameSync(tmpPath, filePath);

      const optimizedSize = optimizedBuffer.length;
      newBytes += optimizedSize;

      // 2. Generate Next-Gen WebP variant
      const webpPath = path.join(dir, `${baseName}.webp`);
      const webpBuffer = await pipeline
        .clone()
        .webp({
          quality: isLogo ? 88 : 84,
          effort: 6,
          smartSubsample: true
        })
        .toBuffer();

      fs.writeFileSync(webpPath, webpBuffer);

      count++;
      const savedPct = ((1 - optimizedSize / originalSize) * 100).toFixed(1);
      console.log(
        `✓ ${entry.name.padEnd(36)}: ${(originalSize / 1024).toFixed(0).padStart(6)} KB -> ${(optimizedSize / 1024).toFixed(0).padStart(4)} KB (${savedPct}% saved) | WebP: ${(webpBuffer.length / 1024).toFixed(0)} KB`
      );
    } catch (err) {
      console.error(`✗ Error processing ${entry.name}:`, err.message);
      newBytes += originalSize; // fallback
    }
  }

  return { count, origBytes, newBytes };
}

async function run() {
  const startTime = Date.now();
  let totalCount = 0;
  let totalOrigBytes = 0;
  let totalNewBytes = 0;

  for (const target of TARGET_DIRECTORIES) {
    const res = await processDirectory(target);
    totalCount += res.count;
    totalOrigBytes += res.origBytes;
    totalNewBytes += res.newBytes;
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const totalSavedMb = ((totalOrigBytes - totalNewBytes) / 1024 / 1024).toFixed(2);
  const totalSavedPct = totalOrigBytes > 0 ? ((1 - totalNewBytes / totalOrigBytes) * 100).toFixed(1) : 0;

  console.log(`\n======================================================`);
  console.log(`  OPTIMIZATION COMPLETE in ${duration}s`);
  console.log(`  Files Processed : ${totalCount}`);
  console.log(`  Original Size   : ${(totalOrigBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Optimized Size  : ${(totalNewBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Bandwidth Saved : ${totalSavedMb} MB (${totalSavedPct}% overall reduction)`);
  console.log(`======================================================\n`);
}

run().catch((err) => {
  console.error('Fatal error running image optimization:', err);
  process.exit(1);
});
