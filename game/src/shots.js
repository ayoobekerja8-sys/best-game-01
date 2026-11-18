import {STEP} from './config.js';
import {SCREEN_TITLE,SCREEN_PLAY,SCREEN_OVER,SCREEN_VICTORY} from './render.js';
import {EVENT_OVER,EVENT_WIN} from './world.js';

// Autopilot: aims at the boss first, else the nearest enemy; picks the move
// direction that maximises the closest predicted threat distance 0.45 s ahead
// (enemies and bullets advanced linearly), with a small pull toward the target
// when it is far away. Deterministic: no randomness anywhere.
const DIRS=[[0,0],[1,0],[-1,0],[0,1],[0,-1],[0.7071,0.7071],[0.7071,-0.7071],[-0.7071,0.7071],[-0.7071,-0.7071]];
// Last seen positions, for estimating an enemy's velocity (target leading).
// Deterministic: the pilot is called once per fixed step, in order.
const lastSeen=new Map();
function leadAim(s,target){
  const prev=lastSeen.get(target);
  const d=Math.hypot(target.x-s.player.x,target.y-s.player.y);
  let ax=target.x,ay=target.y;
  if(prev){const vx=(target.x-prev.x)/(1/60),vy=(target.y-prev.y)/(1/60),t=d/590;ax+=vx*t;ay+=vy*t;}
  lastSeen.set(target,{x:target.x,y:target.y});
  return {x:ax,y:ay};
}
function pilot(s){
  const p=s.player;
  let target=null,best=Infinity;
  for(const e of s.enemies){const d=Math.hypot(e.x-p.x,e.y-p.y);if(e.boss||d<best){if(e.boss){target=e;break;}best=d;target=e;}}
  if(!target)target={x:640,y:160};
  const speed=255,H=0.55;
  let move={x:0,y:0},moveScore=-Infinity,danger=Infinity;
  for(const [dx,dy] of DIRS){
    const nx=Math.max(30,Math.min(1250,p.x+dx*speed*H)),ny=Math.max(30,Math.min(690,p.y+dy*speed*H));
    let worst=Infinity;
    for(const e of s.enemies){const ex=e.x,ey=e.y;worst=Math.min(worst,Math.hypot(ex-nx,ey-ny)-(e.w/2+(e.boss?70:15)));}
    for(const b of s.enemyBullets){const bx=b.x+b.vx*H,by=b.y+b.vy*H;worst=Math.min(worst,Math.hypot(bx-nx,by-ny)-b.r-15);}
    for(const b of s.braziers){if(b.lit&&p.hp<=3)worst+=Math.max(0,200-Math.hypot(b.x-nx,b.y-ny))*0.35;}
    const td=Math.hypot(target.x-nx,target.y-ny);
    let score=worst+(td>420?-td*0.05:0);
    if(s.boss)score-=Math.abs(Math.hypot(s.boss.x-nx,s.boss.y-ny)-340)*0.08;
    // Do not get cornered: a mild pull away from the walls.
    score-=(Math.max(0,120-nx)+Math.max(0,nx-1160)+Math.max(0,120-ny)+Math.max(0,ny-600))*0.05;
    if(score>moveScore){moveScore=score;move={x:dx,y:dy};}
  }
  for(const b of s.enemyBullets)danger=Math.min(danger,Math.hypot(b.x-p.x,b.y-p.y));
  for(const e of s.enemies)danger=Math.min(danger,Math.hypot(e.x-p.x,e.y-p.y)-(e.w/2+15));
  const aim=target===null?{x:640,y:160}:leadAim(s,target);
  return {x:move.x,y:move.y,aim,fire:true,dash:danger<60&&p.dashCd<=0};
}

// Upgrade priority for the staged run: damage first, then the other
// damage multipliers, then mobility, then the rest.
const PRIORITY=[0,1,2,3,7,4,6,8,9,5];
function pickUpgrade(world){
  const draft=world.state.draft;
  for(const want of PRIORITY){const i=draft.indexOf(want);if(i>=0){world.chooseUpgrade(i);return;}}
  if(draft.length)world.chooseUpgrade(0);
}

export function stageShot(name,world){world.reset();const s=world.state;if(name==='start'){for(let i=0;i<300;i++)world.step(STEP,{x:Math.sin(i/50),y:0,aim:{x:640,y:250},fire:true},true);return {screen:SCREEN_TITLE,best:0};}
 if(name==='play'){s.wave=3;s.waveRemain=12;s.spawn=0;for(let i=0;i<500;i++)world.step(STEP,pilot(s));return {screen:SCREEN_PLAY,best:s.score};}
 if(name==='boss'){s.wave=5;s.waveRemain=0;world.spawnBoss();for(let i=0;i<1000&&s.boss;i++)world.step(STEP,pilot(s));return {screen:SCREEN_PLAY,best:s.score};}
 // Fast-forward an ordinary seeded run. Upgrades are selected only when the real world offers them.
 let guard=0,events=0;while(!s.won&&s.player.hp>0&&guard++<900000){if(s.draft.length)pickUpgrade(world);events=world.step(STEP,pilot(s));if(events&EVENT_OVER)break;if(events&EVENT_WIN)break;}
 return {screen:s.won?SCREEN_VICTORY:SCREEN_OVER,best:s.score};}
