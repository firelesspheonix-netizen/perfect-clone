# Add optional back clothing reference

## What will change
- Add an optional **Clothing (Back)** image upload beside the existing front clothing image.
- Include the back image in generated-image requests only when one is supplied.
- Tell the image generator to use the front and back references together for accurate garment details.
- Preserve the back image when saving/loading character presets, saved settings, history, exports, and imports.
- Keep older saved characters compatible by treating a missing back image as empty.

## Verification
- Check the app compiles successfully.
- Verify the new upload appears in the character clothing section and can accept/remove an image.
