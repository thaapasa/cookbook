# Assets

Source files for media that the app ships in a processed form. The browser never
loads these files directly.

## App icon

`icon/` has the source SVGs of the app icon, one for light mode and one for dark
mode. The favicons in `src/client/public/` are generated from them.

To update the favicons, edit the SVGs and generate the favicon files again.
Replace the files in `src/client/public/` with the new ones.
