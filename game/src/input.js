export const ACTION_CONFIRM=1,ACTION_PAUSE=2,ACTION_MUTE=4;
export function createInput(canvas){
 const held=new Set(); let actions=0,mouse={x:640,y:360},fire=false,dash=false,choice=-1;
 const map={KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'};
 window.addEventListener('keydown',e=>{if(map[e.code])held.add(map[e.code]);else if(e.code==='Space'){fire=true;actions|=ACTION_CONFIRM;}else if(e.code==='Enter'){actions|=ACTION_CONFIRM;}else if(e.code==='ShiftLeft'||e.code==='ShiftRight'){dash=true;}else if(e.code==='Escape'||e.code==='KeyP')actions|=ACTION_PAUSE;else if(e.code==='KeyM')actions|=ACTION_MUTE;else if(/^Digit[123]$/.test(e.code)){choice=Number(e.code.slice(-1))-1;actions|=ACTION_CONFIRM;}else return;e.preventDefault();});
 window.addEventListener('keyup',e=>{if(map[e.code])held.delete(map[e.code]);if(e.code==='Space')fire=false;if(e.code==='ShiftLeft'||e.code==='ShiftRight')dash=false;});
 const point=e=>{const r=canvas.getBoundingClientRect();mouse.x=(e.clientX-r.left)*1280/r.width;mouse.y=(e.clientY-r.top)*720/r.height;};
 canvas.addEventListener('pointermove',point);canvas.addEventListener('pointerdown',e=>{point(e);if(e.button===2)dash=true;else {fire=true;choice=-1;actions|=ACTION_CONFIRM;}});window.addEventListener('pointerup',e=>{if(e.button===2)dash=false;else fire=false;});canvas.addEventListener('contextmenu',e=>e.preventDefault());window.addEventListener('blur',()=>{held.clear();fire=false;dash=false;});
 return {read(){let x=(held.has('right')?1:0)-(held.has('left')?1:0),y=(held.has('down')?1:0)-(held.has('up')?1:0);if(x&&y){x*=.7071;y*=.7071;}return {x,y,aim:{...mouse},fire,dash,actions:take()};},takeActions:take,takeChoice(){let c=choice;choice=-1;return c;}};function take(){let a=actions;actions=0;return a;}
}
