# simple-off-viewer
A simple Off viewer for webpage inclusion.

This project is meant as a standalone project and will probably not be maintained
with further updates of the related libraries like jQuery and Three.js.

## Single model over the whole page
To run the project, please [setup a local web server](https://create3000.github.io/x_ite/setup-a-localhost-server/)
I usually either
- use VSCode live server extension
- use a command line terminal and Python, cd to the project folder then run python -m http.server

Finally, run `http://127.0.0.1:5501/index.html` in your browser. The port (here 5501) depends on your local server.

This viewer also correctly parses OFF files produced by Antiprism.
[http://www.antiprism.com](http://www.antiprism.com)

If you want to see a more advanced version of the viewer please visit.
[https://asliceofcuriosity.fr/blog/extra/polyhedra-viewer-antiprism.html](https://asliceofcuriosity.fr/blog/extra/polyhedra-viewer-antiprism.html)

Note: this project also makes use of an info box that appears on the bottom left corner of the window.
You may remove it if you don't need it. The related files are in the info/ folder.

### Controls
* Click and drag with the mouse right click to rotate the model.
* The mouse wheel zooms in or out.
* Press 5 to reset the model position or triple click.

## Multiple models on the same page

The `index-multi-viewer.html` example shows how to include multiple viewer on the same page.
It is as simple as adding as many div to your page like so:
```
	<div class="threeJS-viewer" src="/off/U1.off"></div>
```

It is possible to change the rendering with the following attributes:
- data-vertex-radius : default is "0.03"
- data-edge-radius : default is "0.02"
- data-background-color :  default is "#cccccc", color is in hexadecimal format, don't forget the #
- data-fullscreen-background-color :  default is "#cccccc", color is in hexadecimal format, don't forget the #
- data-rotation-speed : default is "0"
- data-rotation-axis : default is the vertical direction "0,1,0"
- data-vertex-color : default if the original color from the off file, color is in hexadecimal format
- data-edge-color : default if the original color from the off file, color is in hexadecimal format
- data-face-Color : default if the original color from the off file, color is in hexadecimal format
- data-vertices-active : default is true, set to "false" to deactivate
- data-edges-active : default is true, set to "false" to deactivate 
- data-faces-active : default is true, set to "false" to deactivate 
like so
```
<div class="threeJS-viewer" src="/off/U1.off" data-edges-active="true" data-faces-active="true"
    data-vertices-active="true" data-background-color="#ff00ff" data-edge-color="#aaffffcc"
    data-vertex-color="#ffffaacc" data-face-color="#aaaaffcc" data-vertex-radius="0.05" data-edge-radius="0.1"
    data-rotation-axis="1,0,0" data-rotation-speed="-1"></div>
```

You may also set the parameters globally using css styling with a double dash in front the "data", like so:
```
.threeJS-viewer-canvas {
    --data-background-color: #33aa33;
    --data-fullscreen-background-color: #3333aa;
}
```

### Controls
* Click and drag with the mouse right click to rotate the model.
* Click and drag with the mouse left click to pan the model.
* The mouse wheel zooms in or out.
* Press R to reset the model position or triple click.
* Press F to trigger fullscreen or double click.

### Known issues
* After a double or triple click, the mouse seems to be in a selection mode and grabs onto the model. Click once anywhere to release it. If you have a solution for that, please either make a PR with the correction or create an issue with a working solution.