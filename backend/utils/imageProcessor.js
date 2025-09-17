import sharp from "sharp";
import path from "path";

export async function processImage(inputPath, outputFileName) {
  const outputPath = path.join(process.cwd(), "public", "images", outputFileName);

  await sharp(inputPath)
    .resize(1200)           
    .webp({ quality: 80 })  
    .toFile(outputPath);

  return outputPath;
}
