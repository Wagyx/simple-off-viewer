# simple-off-viewer
A simple Off viewer for webpage inclusion.

This project is meant as a standalone project and will probably not be maintained
with further updates of the related libraries like jQuery and Three.js.

To run the project, please [setup a local web server](https://create3000.github.io/x_ite/setup-a-localhost-server/)
I usually either
- use VSCode live server extension
- use a command line terminal and Python, cd to the project folder then run python -m http.server

Finally, run `http://127.0.0.1:5501/index.html` in your browser. The port (here 5501) depends on your local server.

This viewer also correctly parses OFF files produced by Antiprism.
[http://www.antiprism.com](http://www.antiprism.com)

If you want to see a more advanced version of the viewer please visit.
[https://asliceofcuriosity.fr/blog/extra/polyhedra-viewer-antiprism.html](https://asliceofcuriosity.fr/blog/extra/polyhedra-viewer-antiprism.html)

## Multiple viewer on the same page

The `index-multi-viewer.html` example shows how to include multiple viewer on the same page.
It is as simple as adding as many div to your page like so:
```
	<div class="threeJS-viewer" src="/off/U1.off"></div>
```

It is possible to change the rendering with the following attributes:
- data-vertex-radius : default is "0.03"
- data-edge-radius : default is "0.02"
- data-background-color :  default is "#cccccc", color is in hexadecimal format, don't forget the #
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


Each viewer can go to full screen and back by double clicking or by pressing the F key.


