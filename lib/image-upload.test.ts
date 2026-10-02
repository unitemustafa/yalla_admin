import { File } from "node:buffer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { validateImageUpload } from "./image-upload";
import { mediaSpecs } from "./media-specs";

afterEach(() => vi.unstubAllGlobals());

describe("image uploads", () => {
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
