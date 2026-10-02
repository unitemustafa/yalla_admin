import { File } from "node:buffer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { validateImageUpload } from "./image-upload";
import { mediaSpecs } from "./media-specs";

afterEach(() => vi.unstubAllGlobals());

describe("image uploads", () => {
  it("accepts decoded small and rectangular images for every upload slot", async () => {
    const file = new File(["fixture"], "source.png", { type: "image/png" });
    for (const spec of Object.values(mediaSpecs)) {
      for (const [width, height] of [[1, 1], [32, 96], [96, 32]]) {
        const close = vi.fn();
        vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width, height, close }));
        expect(await validateImageUpload(file as unknown as globalThis.File, spec)).toBeNull();
        expect(close).toHaveBeenCalledOnce();
      }
    }
  });

  it("preserves safe processing limits", async () => {
    const close = vi.fn();
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 12001, height: 1, close }));
    const file = new File(["fixture"], "source.png", { type: "image/png" });
    expect(await validateImageUpload(file as unknown as globalThis.File, mediaSpecs.product)).toContain("الآمنة");
    expect(close).toHaveBeenCalledOnce();
  });

  it("releases the object URL after decoding fails", async () => {
    vi.stubGlobal("createImageBitmap", undefined);
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL: () => "blob:failed", revokeObjectURL });
    vi.stubGlobal("Image", class { decode() { return Promise.reject(new Error("Invalid image")); } });
    const file = new File(["corrupt"], "source.png", { type: "image/png" });
    expect(await validateImageUpload(file as unknown as globalThis.File, mediaSpecs.product)).toContain("تعذر");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:failed");
  });
});
