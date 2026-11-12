# Pakainin ang mga Alaga — v1.5.85

Choose **Pakainin ang mga Alaga** from the game-mode menu. Nina, the girl in
yellow from the user's story, is a selectable full-body character seen from
behind. **Magdagdag ng Tauhan** accepts another named character image, so the
mode can be reused for other classroom activities. Give the activity its own
name and choose a puppy, owl, or carabao.

Correct answers send food to the animal, make it jump, reduce its Gutom Meter
by 20, and visibly increase its size. Five successful feedings make it **Busog**.
A wrong answer leaves the pet hungry and reduces the character's energy by 10;
the answer is explained and the learner can retry. At zero energy, the activity
offers rest and then continues. There is no answer timer or combat in this mode.

Both this mode and the existing Classic Adventure have **Import Questions** and
**Question Editor** controls. Use the editor's Excel template, import `.xlsx` or
UTF-8 `.csv`, review the preview, then save. Imported/edited questions are stored
with the selected curriculum lesson. The question bank is shared with Tournament;
Single Player's source choice is stored independently for each activity/lesson.
No questions are saved merely by previewing a file, and invalid rows cannot be
saved. Existing classroom records and the device's trial/activation are retained.

The manual layout editor can move/resize the new scene's character, pet, question
panel, and other objects. The live energy/hunger fills are excluded from resizing.

The game-mode card uses the supplied illustration within the same standard card and thumbnail layout as the other modes. The activity has a
wide Philippine schoolyard scene with a blue food bowl, a sad/happy puppy, and
large question and answer panels. The puppy still grows after every feeding.

Use **FONT / LAKI NG TEKSTO** in setup, or **FONT** during play, to change the font
family, title size, question size, answer size, label size, boldness, and text
color. Changes preview immediately. **SAVE** keeps them on this device for later
activities and restarts. **CANCEL** or Escape restores the previous font;
**DEFAULT** previews the original settings, which can then be saved. Editing
pauses the activity and preserves a manually paused state.

Build the new update with `python tools/build_pet_style_update.py`. It verifies
the published v1.5.82 base and preserves every other packed game mode.

Assets and the generation prompts are documented in [src/assets/README.md](src/assets/README.md).
The scene update's files and exact prompts are in [PET_STYLE_1583.md](src/assets/PET_STYLE_1583.md).

Keyboard: **A** selects the left answer, **B** the middle, and **C** the right.
Uppercase and lowercase both work. **Enter** activates the visible next/retry
button after feedback. Typing in editors, dialogs, and paused activities does
not submit answers; repeated key-down events are ignored.
