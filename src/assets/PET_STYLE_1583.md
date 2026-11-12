# Pet scene and font update — v1.5.83

The supplied game-mode design is used directly as `src/assets/pet-mode-card-1583.webp` (format conversion only). Its entire card is a keyboard-accessible Play button. The scene follows the supplied layout with separate moveable Nina, pet, food bowl, speech bubble, and question panel. Other modes and saved layouts retain their existing data.

These three project images were created with the built-in image generation tool, using the supplied scene screenshot as the reference. The original PNGs are preserved in generated_images; final game assets use WebP with the original alpha preserved.

| Game asset | Original generated image | Use |
|---|---|---|
| `src/assets/pet-garden-1583.webp` | `exec-4def2167-f1da-4b9f-a4af-47310bd892c9.png` | Wide background, no baked characters or UI |
| `src/assets/pet-food-1583.webp` | `exec-2c2a12a1-f023-4b7e-9a17-d5dbdad3394e.png` | Transparent blue food bowl and feeding projectile |
| `src/assets/puppy-emotions-1583.webp` | `exec-a5a283b6-5991-425b-a6a4-4bd6da04702e.png` | Two equal cells: hungry at left, happy at right |

Nina's original rear-view sprite and the owl/carabao sprites from v1.5.82 are retained. Only one puppy is shown in the scene; its scale increases after each feeding.

## Garden prompt

Use case: precise-object-edit. Asset type: layered game scene background. Edit target/reference: the attached Pakainin ang mga Alaga game screenshot. Extract and complete ONLY its cheerful illustrated outdoor landscape as a clean ultrawide approximately 3:1 background image. Preserve the screenshot's vivid friendly 2D children's-book illustration style and composition: leafy tree canopy and big trunk along the far left, a small yellow Philippine school with red roof and tiny Philippine flag in the middle distance slightly left of center, blue sky and soft white clouds, distant green hills and trees, wooden fences, bright green lawn, flowers and broad leaves along the lower corners. Leave the central foreground lawn open for separately rendered characters and a food bowl. The ground line for characters is near the lower edge. Remove ALL screenshot UI, meters, panels, buttons, words, speech bubbles, characters, dog, food bowl, particles, and stars. Reconstruct the scenery naturally where removed. No characters, no animals, no lettering, no interface, no borders, no watermark. Fill the complete ultrawide image with the landscape, no blank margin.

## Food bowl prompt

Use case: background-extraction. Asset type: transparent game sprite. Edit target/reference: the attached Pakainin ang mga Alaga screenshot. Extract and cleanly redraw just the bright blue pet-food bowl shown near the bottom middle of its landscape. Blue rounded bowl with white paw emblem, heaped orange-brown round dry food pellets. Preserve its friendly 2D children's-book illustration style, thick clean dark outline and cheerful highlights. Single complete bowl, centered and large, fully visible with a little padding. No dog, no person, no landscape, no lettering, no yellow glow rays or stars. Genuine transparent background, including around the bowl. Keep all highlights opaque. No checkerboard printed into the image.

## Puppy emotions prompt

Use case: identity-preserve. Asset type: two-frame puppy emotion sprite sheet for the real game. Reference image: the attached Pakainin ang mga Alaga screenshot. Create a transparent sprite sheet in exactly 2 equal SQUARE cells arranged side-by-side, overall 2:1 landscape. Both cells show the SAME complete sitting golden-orange puppy from the screenshot: floppy darker orange ears, cream muzzle chest and paws, small dark nose, dark outlined soft friendly 2D children's-book illustration. Same proportions, angle, size, position and ground line in both cells, facing slightly left toward the player. Left cell: hungry/sad puppy, soft downturned mouth and pleading open eyes, gently drooping ears, child-friendly and not distressed. Right cell: happy puppy, eyes closed with joy, big open smile, lifted curved tail. Each dog's full silhouette fits its own cell with at least 8% transparent margin and no overlap across the middle. No bowl, collar, words, scenery, sparkle marks, floor, shadow disc or additional animals. Real transparent background across both cells.


