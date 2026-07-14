const PROCESS_IMAGE_OVER_BYTES = 256 * 1024;
const MAX_IMAGE_DIMENSION = 1600;
const OUTPUT_QUALITY = 0.82;
const MAX_PARALLEL_COMPRESSIONS = 2;

const compressibleImageTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

type DrawableImage = {
  height: number;
  source: CanvasImageSource;
  width: number;
  dispose: () => void;
};

function webpFilename(name: string) {
  const basename = name.replace(/\.[^.]+$/, "") || "image";
  return `${basename}.webp`;
}

function canvasBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

async function loadDrawable(file: File): Promise<DrawableImage> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return {
      height: bitmap.height,
      source: bitmap,
      width: bitmap.width,
      dispose: () => bitmap.close(),
    };
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  image.src = objectUrl;
  await image.decode();
  return {
    height: image.naturalHeight,
    source: image,
    width: image.naturalWidth,
    dispose: () => URL.revokeObjectURL(objectUrl),
  };
}

export async function compressImageUpload(file: File): Promise<File> {
  if (
    file.size <= PROCESS_IMAGE_OVER_BYTES ||
    !compressibleImageTypes.has(file.type.toLowerCase())
  ) {
    return file;
  }

  let drawable: DrawableImage | null = null;
  try {
    drawable = await loadDrawable(file);
    const scale = Math.min(
      1,
      MAX_IMAGE_DIMENSION / Math.max(drawable.width, drawable.height),
    );
    const width = Math.max(1, Math.round(drawable.width * scale));
    const height = Math.max(1, Math.round(drawable.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: true });
    if (!context) return file;

    context.drawImage(drawable.source, 0, 0, width, height);
    const blob = await canvasBlob(canvas, "image/webp", OUTPUT_QUALITY);
    if (!blob || blob.size >= file.size * 0.95) return file;

    return new File([blob], webpFilename(file.name), {
      lastModified: file.lastModified,
      type: "image/webp",
    });
  } catch {
    // Uploading the original is safer than blocking the form on browser codec
    // support or a malformed image that the backend can validate itself.
    return file;
  } finally {
    drawable?.dispose();
  }
}

export async function optimizeImageRequestInit(init: RequestInit) {
  if (
    typeof FormData === "undefined" ||
    typeof File === "undefined" ||
    !(init.body instanceof FormData)
  ) {
    return init;
  }

  const entries = Array.from(init.body.entries());
  const optimizedValues: FormDataEntryValue[] = new Array(entries.length);
  for (let start = 0; start < entries.length; start += MAX_PARALLEL_COMPRESSIONS) {
    const batch = entries.slice(start, start + MAX_PARALLEL_COMPRESSIONS);
    const values = await Promise.all(
      batch.map(([, value]) =>
        value instanceof File ? compressImageUpload(value) : value,
      ),
    );
    values.forEach((value, index) => {
      optimizedValues[start + index] = value;
    });
  }

  const body = new FormData();
  entries.forEach(([key], index) => {
    body.append(key, optimizedValues[index]);
  });
  return { ...init, body };
}
