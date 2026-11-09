// Boot: build the practice lobby, load state, size the map, start the loop
setupPractice();
initState();


new ResizeObserver(() => requestAnimationFrame(() => resize())).observe(cvs.parentElement);
addEventListener("resize", () => resize());
setInterval(renderTop, 30000);
window.__mapReady = true;
resize();
{ const [x, y] = zoneCentre(); cam.z = .9; Object.assign(cam, { x: x - vw / 2 / cam.z, y: y - vh / 2 / cam.z }); clampCam(); }
render();
requestAnimationFrame(loop);
connectLive();
open("title");
