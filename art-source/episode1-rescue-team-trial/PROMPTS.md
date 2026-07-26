# Episode 1 art source

These raster sources were created with OpenAI's built-in image generation mode
for the `rescue-team-trial` vertical slice. The generated PNG files are kept
beside this note so the production WebP layers can be rebuilt.

## Shared direction

- Premium Korean children's educational dress-up game
- Crisp dark-navy outlines and polished picture-book shading
- Warm coral, yellow, navy, sky-blue palette
- No text, labels, watermark, UI, or duplicate objects

## Background

A sunny 4:3 rescue-team training yard with a warm cream-and-coral headquarters,
lockers, cones, low hurdles, a practice path, and generous open foreground space
for the character. No people and no oversized rescue symbol.

## Character

A front-facing Korean child hero in a symmetrical dress-up doll pose, wearing
only a fitted white base T-shirt, navy shorts, and white ankle socks on a flat
`#00FF00` chroma-key background. Three generated moods are retained: ready,
success, and hopeful retry.

## Item sheets

Four 2x2 chroma-key sprite sheets contain the episode's sixteen items:

- Tops: rescue jacket, sports hoodie, yellow raincoat, party shirt
- Bottoms: active pants, sky denim, beige shorts, long skirt
- Shoes: sneakers, rain boots, slippers, dress shoes
- Accessories: reflective band, rescue cap, whistle, canvas tote

Run `node scripts/prepare-episode1-assets.mjs` to remove the chroma key, split
the sheets, and rebuild thumbnails and 1024x1536 wearable layers.
