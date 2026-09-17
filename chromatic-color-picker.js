/* Chromatic colour picker — extracted from references/colour-picker.html
   Enhances every <input type="color"> on the page with a wheel + sliders popover.
   Exposes window.Chromatic = { init, refreshAll, create, ColorPicker }.  */

;(function(){
"use strict";

function hexToRgb(h){
  h=h.replace("#","");
  if(h.length===3) h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  return{r:parseInt(h.slice(0,2),16),g:parseInt(h.slice(2,4),16),b:parseInt(h.slice(4,6),16)};
}
function rgbToHex(r,g,b){
  return"#"+[r,g,b].map(function(c){return Math.max(0,Math.min(255,Math.round(c))).toString(16).padStart(2,"0")}).join("");
}
function rgbToHsv(r,g,b){
  r/=255;g/=255;b/=255;
  var mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn,h,s=mx?d/mx:0,v=mx;
  if(!d)h=0;else if(mx===r)h=((g-b)/d+(g<b?6:0))/6;
  else if(mx===g)h=((b-r)/d+2)/6;else h=((r-g)/d+4)/6;
  return{h:h*360,s:s,v:v};
}
function hsvToRgb(h,s,v){
  h/=360;var i=Math.floor(h*6),f=h*6-i,p=v*(1-s),q=v*(1-f*s),t=v*(1-(1-f)*s),r,g,b;
  switch(i%6){
    case 0:r=v;g=t;b=p;break;case 1:r=q;g=v;b=p;break;case 2:r=p;g=v;b=t;break;
    case 3:r=p;g=q;b=v;break;case 4:r=t;g=p;b=v;break;case 5:r=v;g=p;b=q;break;
  }
  return{r:Math.round(r*255),g:Math.round(g*255),b:Math.round(b*255)};
}
function lin(c){c/=255;return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4)}
function lum(r,g,b){return .2126*lin(r)+.7152*lin(g)+.0722*lin(b)}
function contrast(a,b){var l1=lum(a.r,a.g,a.b),l2=lum(b.r,b.g,b.b);return(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05)}
function getEffBg(el){
  var n=el;
  if(n&&n.matches&&n.matches('input[type="color"],input[type="colour"]'))n=n.parentElement||n;
  while(n&&n!==document.documentElement){
    var bg=getComputedStyle(n).backgroundColor;
    if(bg&&bg!=="transparent"&&bg!=="rgba(0, 0, 0, 0)"){
      var m=bg.match(/rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
      if(m){var a=m[4]!=null?parseFloat(m[4]):1;if(a>.05)return{r:+m[1],g:+m[2],b:+m[3]}}
    }
    n=n.parentElement;
  }
  return{r:255,g:255,b:255};
}
function isDark(c){return lum(c.r,c.g,c.b)<.4}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function angleBetween(cx,cy,px,py){return(Math.atan2(px-cx,-(py-cy))*180/Math.PI+360)%360}
function angleDelta(a,b){var d=b-a;if(d>180)d-=360;if(d<-180)d+=360;return d}
function hasDarkThemeSignal(el){
  var n=el;
  while(n&&n!==document.documentElement){
    if(n.classList&&(n.classList.contains("is-dark")||n.classList.contains("dark")))return true;
    if(n.getAttribute){
      var theme=n.getAttribute("data-theme");
      if(theme&&theme.toLowerCase()==="dark")return true;
    }
    n=n.parentElement;
  }
  return false;
}
function resolveThemeMode(el){
  var probe=el&&el.matches&&el.matches('input[type="color"],input[type="colour"]')?(el.parentElement||el):el;
  if(hasDarkThemeSignal(probe)||hasDarkThemeSignal(document.body)||hasDarkThemeSignal(document.documentElement))return true;
  if(document.body&&document.body.classList.contains("is-dark"))return true;
  return isDark(getEffBg(probe||document.body||document.documentElement));
}

var ID="chromatic-v2-styles";
if(!document.getElementById(ID)){
var s=document.createElement("style");s.id=ID;
s.textContent=`
.cp-wrap{display:inline-flex;position:relative;vertical-align:middle}
.cp-wrap>input[type=color],.cp-wrap>input[type=colour]{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;border:0!important}
.cp-swatch{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:4px;border:1.5px solid var(--cp-swatch-border,rgba(0,0,0,.1));cursor:pointer;padding:0;outline:none;position:relative;overflow:hidden;background:none;transition:transform .12s cubic-bezier(.22,1,.36,1),box-shadow .15s ease}
.cp-swatch:hover{transform:scale(1.05);box-shadow:0 2px 8px rgba(0,0,0,.1)}
.cp-swatch:active{transform:scale(.96)}
.cp-swatch:focus-visible{box-shadow:0 0 0 2px rgba(99,102,241,.45)}
.cp-panel{position:absolute;z-index:99999;width:248px;max-width:calc(100vw - 12px);padding:12px;border-radius:var(--cp-radius,4px);background:var(--cp-bg);border:1px solid var(--cp-border);box-shadow:var(--cp-shadow);backdrop-filter:blur(26px) saturate(1.6);-webkit-backdrop-filter:blur(26px) saturate(1.6);opacity:0;transform:scale(.97) translateY(-4px);pointer-events:none;transition:opacity .18s cubic-bezier(.22,1,.36,1),transform .18s cubic-bezier(.22,1,.36,1),box-shadow .42s cubic-bezier(.22,1,.36,1),background .35s ease,border-color .35s ease;font-family:var(--cp-font,-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif);color:var(--cp-text);user-select:none;-webkit-user-select:none;box-sizing:border-box;isolation:isolate;overflow-x:hidden;overflow-y:auto}
.cp-panel *,.cp-panel *::before,.cp-panel *::after{box-sizing:border-box}
.cp-panel::before{content:"";position:absolute;inset:-24px;border-radius:18px;background:radial-gradient(circle at var(--cp-rainbow-x,50%) var(--cp-rainbow-y,50%),rgba(255,110,92,.18) 0%,rgba(255,194,92,.14) 18%,rgba(160,222,122,.12) 36%,rgba(100,182,255,.15) 54%,rgba(171,123,255,.14) 72%,rgba(255,115,186,.11) 88%,transparent 100%);filter:blur(24px);opacity:var(--cp-rainbow-opacity,0);pointer-events:none;z-index:-1;transition:opacity .38s cubic-bezier(.22,1,.36,1)}
.cp-panel.cp-open{opacity:1;transform:scale(1) translateY(0);pointer-events:auto}
.cp-panel.cp-light{--cp-bg:linear-gradient(180deg,rgba(255,255,255,.74),rgba(242,242,239,.58));--cp-border:rgba(17,17,19,.16);--cp-text:#131317;--cp-muted:#555762;--cp-input-bg:rgba(255,255,255,.5);--cp-input-border:rgba(17,17,19,.14);--cp-shadow:0 34px 64px -24px rgba(0,0,0,.3),0 16px 28px -22px rgba(0,0,0,.18),0 4px 12px rgba(0,0,0,.08);--cp-shadow-live:0 42px 78px -26px rgba(0,0,0,.3),0 18px 34px -22px rgba(0,0,0,.18),0 6px 16px rgba(0,0,0,.1);--cp-basin-bg:linear-gradient(180deg,#f3f5f8,#d9dde4);--cp-basin-highlight:rgba(255,255,255,.65);--cp-basin-shadow:rgba(17,17,19,.14);--cp-wheel-bg:#eff2f6;--cp-spokes:rgba(255,255,255,.34);--cp-spoke-glow:rgba(255,255,255,.16);--cp-groove-ring:rgba(17,17,19,.08);--cp-groove-opacity:.34;--cp-fly-hub:#fbfcfe;--cp-fly-gap:rgba(255,255,255,.66);--cp-fly-divider:rgba(255,255,255,.32);--cp-copy-bg:rgba(17,17,19,.05)}
.cp-panel.cp-dark{--cp-bg:linear-gradient(180deg,rgba(32,32,37,.82),rgba(12,12,15,.66));--cp-border:rgba(255,255,255,.18);--cp-text:#eef0f5;--cp-muted:#b8becb;--cp-input-bg:rgba(255,255,255,.1);--cp-input-border:rgba(255,255,255,.16);--cp-shadow:0 38px 72px -22px rgba(0,0,0,.8),0 20px 40px -24px rgba(0,0,0,.54),0 6px 18px rgba(0,0,0,.3);--cp-shadow-live:0 46px 86px -24px rgba(0,0,0,.8),0 24px 48px -24px rgba(0,0,0,.58),0 8px 20px rgba(0,0,0,.32);--cp-basin-bg:linear-gradient(180deg,#272b34,#111318);--cp-basin-highlight:rgba(255,255,255,.12);--cp-basin-shadow:rgba(0,0,0,.28);--cp-wheel-bg:#0f1217;--cp-spokes:rgba(255,255,255,.18);--cp-spoke-glow:rgba(255,255,255,.04);--cp-groove-ring:rgba(255,255,255,.08);--cp-groove-opacity:.28;--cp-fly-hub:#e7edf7;--cp-fly-gap:rgba(255,255,255,.18);--cp-fly-divider:rgba(255,255,255,.14);--cp-copy-bg:rgba(255,255,255,.08)}
.cp-panel.cp-shadow-live{box-shadow:var(--cp-shadow-live)}
.cp-enhancement-toggle{position:absolute;top:8px;right:8px;width:22px;height:22px;border-radius:50%;border:1px solid var(--cp-border);background:var(--cp-input-bg);color:var(--cp-muted);display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:9;transition:all .2s ease;padding:0}
.cp-enhancement-toggle svg{width:12px;height:12px}
.cp-panel.cp-mode-enhanced .cp-enhancement-toggle{background:#3b82f6;border-color:#2563eb;color:#fff}
.cp-eyedropper{position:absolute;top:8px;left:8px;width:22px;height:22px;border-radius:50%;border:1px solid var(--cp-border);background:var(--cp-input-bg);color:var(--cp-muted);display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:9;transition:all .2s ease;padding:0}
.cp-eyedropper:hover{color:var(--cp-text);background:rgba(99,102,241,.1)}
.cp-eyedropper svg{width:11px;height:11px}
.cp-wheel-wrap{position:relative;width:100%;aspect-ratio:1/1;margin:4px auto 12px;cursor:grab;touch-action:none;isolation:isolate}
.cp-wheel-wrap:active{cursor:grabbing}
.cp-wheel-basin{position:absolute;inset:0;border-radius:50%;border:1px solid var(--cp-border);background:repeating-conic-gradient(from -0.5deg, var(--cp-spoke-glow) 0 1deg, transparent 1deg 18deg),var(--cp-basin-bg);box-shadow:inset 0 1px 0 var(--cp-basin-highlight),inset 0 10px 20px var(--cp-basin-shadow),0 1px 0 rgba(255,255,255,.04)}
.cp-wheel-basin::after{content:"";position:absolute;inset:11px;border-radius:50%;border:1px solid var(--cp-border);opacity:.36}
.cp-wheel{position:absolute;inset:11px;border-radius:50%;background-color:var(--cp-wheel-bg);background-image:radial-gradient(circle closest-side, #fff, transparent), conic-gradient(#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00);background-size:cover;will-change:transform;box-shadow:inset 0 1px 0 rgba(255,255,255,.26),inset 0 -18px 24px rgba(0,0,0,.12);z-index:1}
.cp-panel.cp-mode-enhanced .cp-wheel{background-image:url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Cg transform='rotate(18 100 100)'%3E%3Cpath d='M 100,100 Q 125,50 158.8,19.1 A 100,100 0 0,0 100,0 Q 80,45 100,100 Z' fill='%23FF3B30' transform='rotate(0 100 100)'/%3E%3Cpath d='M 100,100 Q 125,50 158.8,19.1 A 100,100 0 0,0 100,0 Q 80,45 100,100 Z' fill='%23FF8C00' transform='rotate(36 100 100)'/%3E%3Cpath d='M 100,100 Q 125,50 158.8,19.1 A 100,100 0 0,0 100,0 Q 80,45 100,100 Z' fill='%23FFCC00' transform='rotate(72 100 100)'/%3E%3Cpath d='M 100,100 Q 125,50 158.8,19.1 A 100,100 0 0,0 100,0 Q 80,45 100,100 Z' fill='%2328CD41' transform='rotate(108 100 100)'/%3E%3Cpath d='M 100,100 Q 125,50 158.8,19.1 A 100,100 0 0,0 100,0 Q 80,45 100,100 Z' fill='%2300E5FF' transform='rotate(144 100 100)'/%3E%3Cpath d='M 100,100 Q 125,50 158.8,19.1 A 100,100 0 0,0 100,0 Q 80,45 100,100 Z' fill='%2300A3FF' transform='rotate(180 100 100)'/%3E%3Cpath d='M 100,100 Q 125,50 158.8,19.1 A 100,100 0 0,0 100,0 Q 80,45 100,100 Z' fill='%23007AFF' transform='rotate(216 100 100)'/%3E%3Cpath d='M 100,100 Q 125,50 158.8,19.1 A 100,100 0 0,0 100,0 Q 80,45 100,100 Z' fill='%235856D6' transform='rotate(252 100 100)'/%3E%3Cpath d='M 100,100 Q 125,50 158.8,19.1 A 100,100 0 0,0 100,0 Q 80,45 100,100 Z' fill='%23AF52DE' transform='rotate(288 100 100)'/%3E%3Cpath d='M 100,100 Q 125,50 158.8,19.1 A 100,100 0 0,0 100,0 Q 80,45 100,100 Z' fill='%23FF2D55' transform='rotate(324 100 100)'/%3E%3C/g%3E%3C/svg%3E")}
.cp-wheel-inner{position:absolute;inset:11px;border-radius:50%;border:1px solid var(--cp-border);box-shadow:inset 0 1px 3px rgba(0,0,0,.12),inset 0 -8px 14px rgba(0,0,0,.08);z-index:2}
.cp-wheel-groove{position:absolute;inset:0;border-radius:50%;background:radial-gradient(circle at 35% 28%,rgba(255,255,255,.14),transparent 42%),radial-gradient(circle at 65% 74%,rgba(0,0,0,.08),transparent 50%);box-shadow:inset 0 14px 24px rgba(255,255,255,.03),inset 0 -14px 24px rgba(0,0,0,.12);opacity:var(--cp-groove-opacity);pointer-events:none;z-index:3}
.cp-wheel-gloss{position:absolute;inset:11px;border-radius:50%;background:linear-gradient(145deg,rgba(255,255,255,.22) 0%,rgba(255,255,255,.05) 35%,transparent 50%,rgba(0,0,0,.04) 80%,rgba(0,0,0,.08) 100%);pointer-events:none;z-index:4}
.cp-wheel-dot{position:absolute;width:14px;height:14px;border-radius:50%;border:2.5px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.18),0 1px 4px rgba(0,0,0,.3);transform:translate(-50%,-50%);pointer-events:none;z-index:5;transition:width .1s,height .1s}
.cp-slider{position:relative;width:100%;height:12px;border-radius:3px;cursor:pointer;touch-action:none;margin-bottom:8px}
.cp-slider-track{position:absolute;inset:0;border-radius:3px;border:1px solid var(--cp-border);box-shadow:inset 0 1px 2px rgba(0,0,0,.12);background-clip:padding-box}
.cp-slider-thumb{position:absolute;top:50%;width:16px;height:16px;border-radius:50%;border:2.5px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.12),0 1px 4px rgba(0,0,0,.18);transform:translate(-50%,-50%);pointer-events:none}
.cp-slider-label{font-size:9.5px;letter-spacing:.6px;text-transform:uppercase;font-weight:600;color:var(--cp-muted);margin-bottom:4px;display:block}
.cp-bottom{display:flex;align-items:center;gap:6px;margin-top:4px}
.cp-preview{width:26px;height:26px;border-radius:999px;flex-shrink:0;border:1px solid var(--cp-border)}
.cp-hex-shell{position:relative;flex:0 0 auto;width:72px;height:26px;border-radius:999px;border:1px solid var(--cp-input-border);background:var(--cp-input-bg);overflow:hidden;cursor:pointer;transition:background .18s ease,border-color .12s,box-shadow .12s}
.cp-hex-shell:focus-within{border-color:rgba(99,102,241,.5);box-shadow:0 0 0 2.5px rgba(99,102,241,.1)}
.cp-hex-shell.cp-copied{background:var(--cp-copy-bg);border-color:rgba(34,197,94,.22)}
.cp-hex{width:100%;height:100%;padding:0 8px;border:0;background:transparent;font-size:12px;font-family:var(--cp-mono,'SF Mono','Fira Code','JetBrains Mono','Cascadia Code',monospace);color:var(--cp-text);outline:none;letter-spacing:.3px;cursor:pointer;transition:opacity .18s ease,transform .26s cubic-bezier(.22,1,.36,1)}
.cp-hex-feedback{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:4px;padding:0 6px;background:var(--cp-input-bg);color:var(--cp-text);font-size:10px;font-weight:600;letter-spacing:.18px;opacity:0;transform:translateY(6px) scale(.94);pointer-events:none;white-space:nowrap;transition:opacity .18s ease,transform .28s cubic-bezier(.22,1,.36,1)}
.cp-hex-feedback svg{width:12px;height:12px;color:#22c55e;flex-shrink:0}
.cp-hex-shell.cp-copied .cp-hex{opacity:0;transform:scale(.96)}
.cp-hex-shell.cp-copied .cp-hex-feedback{opacity:1;transform:translateY(0) scale(1)}
.cp-contrast{display:flex;align-items:center;gap:4px;margin-left:auto;white-space:nowrap}
.cp-ratio{font-size:10.5px;color:var(--cp-muted);font-variant-numeric:tabular-nums}
.cp-grade{padding:1.5px 4px;border-radius:3px;font-size:9px;font-weight:700;letter-spacing:.5px;line-height:1.1}
.cp-aaa{background:rgba(34,197,94,.12);color:#22c55e}
.cp-aa{background:rgba(250,204,21,.14);color:#ca8a04}
.cp-dark .cp-aa{color:#facc15}
.cp-aa-lg{background:rgba(249,115,22,.12);color:#f97316}
.cp-fail{background:rgba(239,68,68,.1);color:#ef4444}
.cp-div{height:1px;background:linear-gradient(90deg,transparent 0%,transparent 10%,var(--cp-border) 28%,var(--cp-border) 72%,transparent 90%,transparent 100%);margin:10px 0 8px}
.cp-fmt{display:flex;align-items:center;gap:5px}
.cp-fmt-label{font-size:9.5px;color:var(--cp-muted);letter-spacing:.3px;text-transform:uppercase;font-weight:600;min-width:22px}
.cp-fmt-val{font-size:11.5px;color:var(--cp-text);font-family:var(--cp-mono,'SF Mono','Fira Code','JetBrains Mono','Cascadia Code',monospace);font-variant-numeric:tabular-nums}
.cp-copy{margin-left:auto;background:var(--cp-copy-bg);border:1px solid var(--cp-border);padding:4px;cursor:pointer;color:var(--cp-muted);border-radius:999px;display:flex;align-items:center;justify-content:center;transform:translate3d(var(--cp-copy-x,0),var(--cp-copy-y,0),0);transition:color .12s,background .12s,transform .16s cubic-bezier(.22,1,.36,1),border-color .12s;will-change:transform}
.cp-copy:hover{color:var(--cp-text);background:var(--cp-input-bg)}
.cp-copy svg{width:13px;height:13px}
.cp-copy.cp-copied{color:#22c55e}
`;
(document.head||document.documentElement).appendChild(s);
}

var COPY='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5.5" y="5.5" width="8" height="8" rx="1"/><path d="M10.5 5.5V3.5a1.5 1.5 0 0 0-1.5-1.5H3.5A1.5 1.5 0 0 0 2 3.5V9a1.5 1.5 0 0 0 1.5 1.5h2"/></svg>';
var CHECK='<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5 6.5 11.5 12.5 4.5"/></svg>';

var activeCP=null;
var INSTANCES=[];
var themeWatcherStarted=false;

function CP(input){
  if(input._cp) return;
  input._cp=this;
  this.input=input;
  var initHex=/^#[0-9a-f]{6}$/i.test(input.value)?input.value:"#6366f1";
  var ir=hexToRgb(initHex);
  this.hsv=rgbToHsv(ir.r,ir.g,ir.b);
  this.pickerAngle=this.hsv.h;
  this.isOpen=false;
  this.wheelRot=0;this.wheelVel=0;this.wheelDrag=false;
  this.wheelLastAngle=0;this.wheelLastTime=0;this.wheelClickStart=null;this.wheelAnim=null;
  this.dragSat=false;this.dragVal=false;
  this.bgColor=getEffBg(input.parentElement||input);
  this.dark=resolveThemeMode(input);
  this.enhancedMode = true;
  try {
    if (localStorage.getItem("cp-enhanced") === "false") {
      this.enhancedMode = false;
    }
  } catch(e) {}
  INSTANCES.push(this);
  this._build();this._bind();this._syncSwatch();
}

CP.prototype._build=function(){
  this.wrap=document.createElement("span");
  this.wrap.className="cp-wrap";
  this.input.parentNode.insertBefore(this.wrap,this.input);
  this.wrap.appendChild(this.input);
  this.swatch=document.createElement("button");
  this.swatch.type="button";this.swatch.className="cp-swatch";
  this.swatch.setAttribute("aria-label","Choose color");
  if(this.dark)this.swatch.style.setProperty("--cp-swatch-border","rgba(255,255,255,.13)");
  this.wrap.appendChild(this.swatch);
  this.panel=document.createElement("div");
  this.panel.className="cp-panel "+(this.dark?"cp-dark":"cp-light")+(this.enhancedMode?" cp-mode-enhanced":"");
  this.panel.innerHTML=
    '<button type="button" class="cp-eyedropper" aria-label="Pick color from screen" title="Pick color from screen"><svg viewBox="0 0 640 640"><path fill="currentColor" d="M405.6 93.2L304 194.8L294.6 185.4C282.1 172.9 261.8 172.9 249.3 185.4C236.8 197.9 236.8 218.2 249.3 230.7L409.3 390.7C421.8 403.2 442.1 403.2 454.6 390.7C467.1 378.2 467.1 357.9 454.6 345.4L445.2 336L546.8 234.4C585.8 195.4 585.8 132.2 546.8 93.3C507.8 54.4 444.6 54.3 405.7 93.3zM119.4 387.3C104.4 402.3 96 422.7 96 443.9L96 486.3L69.4 526.2C60.9 538.9 62.6 555.8 73.4 566.6C84.2 577.4 101.1 579.1 113.8 570.6L153.7 544L196.1 544C217.3 544 237.7 535.6 252.7 520.6L362.1 411.2L316.8 365.9L207.4 475.3C204.4 478.3 200.3 480 196.1 480L160 480L160 443.9C160 439.7 161.7 435.6 164.7 432.6L274.1 323.2L228.8 277.9L119.4 387.3z"/></svg></button>'+
    '<button type="button" class="cp-enhancement-toggle" aria-label="Toggle Enhancements" title="Toggle Enhancements"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.6 5.4c.15.54.56.95 1.1 1.1L20.1 10l-5.4 1.6c-.54.15-.95.56-1.1 1.1L12 18.1l-1.6-5.4c-.15-.54-.56-.95-1.1-1.1L3.9 10l5.4-1.6c.54-.15.95-.56 1.1-1.1L12 2z"/></svg></button>'+
    '<div class="cp-wheel-wrap"><div class="cp-wheel-basin"></div><div class="cp-wheel"></div><div class="cp-wheel-inner"></div><div class="cp-wheel-groove"></div><div class="cp-wheel-gloss"></div><div class="cp-wheel-dot"></div></div>'+
    '<span class="cp-slider-label">Brightness</span>'+
    '<div class="cp-slider cp-val"><div class="cp-slider-track"></div><div class="cp-slider-thumb"></div></div>'+
    '<span class="cp-slider-label">Saturation</span>'+
    '<div class="cp-slider cp-sat"><div class="cp-slider-track"></div><div class="cp-slider-thumb"></div></div>'+
    '<div class="cp-bottom"><div class="cp-preview"></div><div class="cp-hex-shell"><input type="text" class="cp-hex" spellcheck="false" maxlength="7" aria-label="Hex color"><span class="cp-hex-feedback" aria-hidden="true">'+CHECK+'<span>Copied</span></span></div><div class="cp-contrast"><span class="cp-ratio"></span><span class="cp-grade"></span></div></div>'+
    '<div class="cp-div"></div>'+
    '<div class="cp-fmt"><span class="cp-fmt-label">RGB</span><span class="cp-fmt-val cp-rgb"></span><button type="button" class="cp-copy" aria-label="Copy RGB">'+COPY+'</button></div>';
  document.body.appendChild(this.panel);
  this.eyedropperBtn=this.panel.querySelector(".cp-eyedropper");
  this.toggleBtn=this.panel.querySelector(".cp-enhancement-toggle");
  this.wheelWrap=this.panel.querySelector(".cp-wheel-wrap");
  this.wheelEl=this.panel.querySelector(".cp-wheel");
  this.wheelDot=this.panel.querySelector(".cp-wheel-dot");
  this.satSlider=this.panel.querySelector(".cp-sat");
  this.satTrack=this.satSlider.querySelector(".cp-slider-track");
  this.satThumb=this.satSlider.querySelector(".cp-slider-thumb");
  this.valSlider=this.panel.querySelector(".cp-val");
  this.valTrack=this.valSlider.querySelector(".cp-slider-track");
  this.valThumb=this.valSlider.querySelector(".cp-slider-thumb");
  this.preview=this.panel.querySelector(".cp-preview");
  this.hexShell=this.panel.querySelector(".cp-hex-shell");
  this.hexInput=this.panel.querySelector(".cp-hex");
  this.ratioEl=this.panel.querySelector(".cp-ratio");
  this.gradeEl=this.panel.querySelector(".cp-grade");
  this.rgbEl=this.panel.querySelector(".cp-rgb");
  this.copyBtn=this.panel.querySelector(".cp-copy");
};

CP.prototype._bind=function(){
  var self=this;
  this.swatch.addEventListener("click",function(e){e.stopPropagation();self.toggle()});
  
  if(window.EyeDropper){
    this.eyedropperBtn.addEventListener("click",function(e){
      e.stopPropagation();
      var ed=new EyeDropper();
      ed.open().then(function(result){
        var val=result.sRGBHex;
        var rgb=hexToRgb(val);
        self.hsv=rgbToHsv(rgb.r,rgb.g,rgb.b);
        self.pickerAngle=self.hsv.h;
        self._update(false, true);
      }).catch(function(){});
    });
  }else{
    this.eyedropperBtn.style.display="none";
  }

  this.toggleBtn.addEventListener("click",function(e){
    e.stopPropagation();
    self.enhancedMode=!self.enhancedMode;
    try{localStorage.setItem("cp-enhanced",self.enhancedMode)}catch(err){}
    self.panel.classList.toggle("cp-mode-enhanced",self.enhancedMode);
    if(!self.enhancedMode){
      self.wheelRot=0;
      self.pickerAngle=self.hsv.h;
    } else {
      var bestDist=Infinity, bestAng=0;
      for (var a=0; a<360; a+=36) {
         var mappedHex=self._getSegmentHue(a);
         var dh=Math.abs(mappedHex-self.hsv.h);
         if(dh>180)dh=360-dh;
         if(dh<bestDist){bestDist=dh;bestAng=a;}
      }
      self.pickerAngle = bestAng + 18; // visually center it in the chosen slice
      self.wheelRot=0;
    }
    self._applyWheel();
    self._update(false, true); // true = keeps the actual hsv.h same temporarily so indicator moves but color does not snap immediately
  });

  /* wheel */
  this.wheelWrap.addEventListener("pointerdown",function(e){
    e.preventDefault();self.wheelWrap.setPointerCapture(e.pointerId);
    if(self.wheelAnim){cancelAnimationFrame(self.wheelAnim);self.wheelAnim=null}
    var metrics=self._wheelMetrics();
    var cx=metrics.cx,cy=metrics.cy;
    self.wheelLastAngle=angleBetween(cx,cy,e.clientX,e.clientY);
    self.wheelLastTime=performance.now();self.wheelVel=0;
    self.wheelDrag=self.enhancedMode;
    self.wheelClickStart={x:e.clientX,y:e.clientY,time:performance.now()};
    if(!self.enhancedMode) self._pickHueFromPointer(e);
  });
  this.wheelWrap.addEventListener("pointermove",function(e){
    if(!self.enhancedMode && self.wheelClickStart) {
        self._pickHueFromPointer(e);
        return;
    }
    if(!self.wheelDrag)return;
    var metrics=self._wheelMetrics();
    var cx=metrics.cx,cy=metrics.cy;
    var now=performance.now();
    var angle=angleBetween(cx,cy,e.clientX,e.clientY);
    var delta=angleDelta(self.wheelLastAngle,angle);
    self.wheelRot+=delta;
    var dt=now-self.wheelLastTime;
    if(dt>0)self.wheelVel=delta/dt;
    self.wheelLastAngle=angle;self.wheelLastTime=now;
    self._applyWheel();
  });
  var endWheel=function(e){
    if(!self.enhancedMode && self.wheelClickStart) {
        self.wheelClickStart=null;
        self.wheelWrap.releasePointerCapture(e.pointerId);
        return;
    }
    if(!self.wheelDrag)return;self.wheelDrag=false;
    var cs=self.wheelClickStart;
    if(cs){
      var dist=Math.hypot(e.clientX-cs.x,e.clientY-cs.y);
      var elapsed=performance.now()-cs.time;
      if(dist<6&&elapsed<300){self._pickHueFromPointer(e);self.wheelClickStart=null;return}
    }
    self.wheelClickStart=null;
    if(Math.abs(self.wheelVel)>.01){
      var friction=.985,last=performance.now();
      (function spin(){
        var now=performance.now(),dt=now-last;last=now;
        self.wheelRot+=self.wheelVel*dt;
        self.wheelVel*=friction;
        self._applyWheel();
        if(Math.abs(self.wheelVel)>.002)self.wheelAnim=requestAnimationFrame(spin);
        else self.wheelAnim=null;
      })();
    }
  };
  this.wheelWrap.addEventListener("pointerup",endWheel);
  this.wheelWrap.addEventListener("lostpointercapture",endWheel);

  /* saturation */
  this.satSlider.addEventListener("pointerdown",function(e){e.preventDefault();self.satSlider.setPointerCapture(e.pointerId);self.dragSat=true;self._handleSat(e)});
  this.satSlider.addEventListener("pointermove",function(e){if(self.dragSat)self._handleSat(e)});
  this.satSlider.addEventListener("pointerup",function(){self.dragSat=false});
  this.satSlider.addEventListener("lostpointercapture",function(){self.dragSat=false});

  /* brightness */
  this.valSlider.addEventListener("pointerdown",function(e){e.preventDefault();self.valSlider.setPointerCapture(e.pointerId);self.dragVal=true;self._handleVal(e)});
  this.valSlider.addEventListener("pointermove",function(e){if(self.dragVal)self._handleVal(e)});
  this.valSlider.addEventListener("pointerup",function(){self.dragVal=false});
  this.valSlider.addEventListener("lostpointercapture",function(){self.dragVal=false});

  /* hex */
  this.hexInput.addEventListener("input",function(){
    var v=self.hexInput.value.trim();if(!v.startsWith("#"))v="#"+v;
    v=v.replace(/[^#0-9a-fA-F]/g,"").slice(0,7);
    if(v.length===4||v.length===7){var rgb=hexToRgb(v);self.hsv=rgbToHsv(rgb.r,rgb.g,rgb.b);self.pickerAngle=self.hsv.h;self._update(true)}
  });
  this.hexInput.addEventListener("click",function(){
    self._copyHex();
    self.hexInput.blur();
  });
  this.hexInput.addEventListener("blur",function(){self._fmtHex()});
  this.hexInput.addEventListener("keydown",function(e){if(e.key==="Enter"){e.preventDefault();self._fmtHex();self.hexInput.blur()}});

  this.copyBtn.addEventListener("click",function(e){e.stopPropagation();self._copyRgb()});
  this.copyBtn.addEventListener("pointermove",function(e){self._tiltCopy(e)});
  this.copyBtn.addEventListener("pointerleave",function(){self._resetCopyTilt()});
  this.panel.addEventListener("pointerenter",function(e){self._activateShadow();self._updateShadowGlow(e)});
  this.panel.addEventListener("pointermove",function(e){self._updateShadowGlow(e)});
  this.panel.addEventListener("pointerleave",function(){self._deactivateShadow()});
  this._viewportChange=function(){if(self.isOpen){self._position();self._applyWheel()}};

  this._docClick=function(e){if(!self.panel.contains(e.target)&&!self.swatch.contains(e.target))self.close()};
  this._docKey=function(e){if(e.key==="Escape")self.close()};
};

CP.prototype._syncTheme=function(){
  this.bgColor=getEffBg(this.wrap||this.input.parentElement||this.input);
  this.dark=resolveThemeMode(this.wrap||this.input);
  this.panel.classList.toggle("cp-dark",this.dark);
  this.panel.classList.toggle("cp-light",!this.dark);
  if(this.dark)this.swatch.style.setProperty("--cp-swatch-border","rgba(255,255,255,.2)");
  else this.swatch.style.removeProperty("--cp-swatch-border");
};

CP.prototype._wheelMetrics=function(){
  var rect=this.wheelEl.getBoundingClientRect();
  return{rect:rect,cx:rect.left+rect.width/2,cy:rect.top+rect.height/2,left:this.wheelEl.offsetLeft,top:this.wheelEl.offsetTop,radius:this.wheelEl.offsetWidth/2};
};

CP.prototype._tiltCopy=function(e){
  var r=this.copyBtn.getBoundingClientRect();
  var dx=(e.clientX-(r.left+r.width/2))/r.width;
  var dy=(e.clientY-(r.top+r.height/2))/r.height;
  this.copyBtn.style.setProperty("--cp-copy-x",(dx*4).toFixed(2)+"px");
  this.copyBtn.style.setProperty("--cp-copy-y",(dy*4).toFixed(2)+"px");
};

CP.prototype._resetCopyTilt=function(){
  this.copyBtn.style.setProperty("--cp-copy-x","0px");
  this.copyBtn.style.setProperty("--cp-copy-y","0px");
};

CP.prototype._activateShadow=function(){
  this.panel.classList.add("cp-shadow-live");
  this.panel.style.setProperty("--cp-rainbow-opacity",".55");
};

CP.prototype._updateShadowGlow=function(e){
  var rect=this.panel.getBoundingClientRect();
  var x=((e.clientX-rect.left)/rect.width)*100;
  var y=((e.clientY-rect.top)/rect.height)*100;
  this.panel.style.setProperty("--cp-rainbow-x",clamp(x,0,100).toFixed(2)+"%");
  this.panel.style.setProperty("--cp-rainbow-y",clamp(y,0,100).toFixed(2)+"%");
};

CP.prototype._deactivateShadow=function(){
  this.panel.classList.remove("cp-shadow-live");
  this.panel.style.setProperty("--cp-rainbow-opacity","0");
  this.panel.style.setProperty("--cp-rainbow-x","50%");
  this.panel.style.setProperty("--cp-rainbow-y","50%");
};

CP.prototype._showHexCopyFeedback=function(){
  var self=this;
  if(this.hexCopyResetTimer)clearTimeout(this.hexCopyResetTimer);
  this.hexShell.classList.add("cp-copied");
  this.hexCopyResetTimer=setTimeout(function(){
    self.hexShell.classList.remove("cp-copied");
  },1400);
};

CP.prototype._showRgbCopyFeedback=function(){
  var self=this;
  if(this.rgbCopyResetTimer)clearTimeout(this.rgbCopyResetTimer);
  this.copyBtn.innerHTML=CHECK;this.copyBtn.classList.add("cp-copied");
  this.rgbCopyResetTimer=setTimeout(function(){
    self.copyBtn.innerHTML=COPY;self.copyBtn.classList.remove("cp-copied");
  },1400);
};

CP.prototype._resetCopyFeedback=function(){
  if(this.hexCopyResetTimer)clearTimeout(this.hexCopyResetTimer);
  if(this.rgbCopyResetTimer)clearTimeout(this.rgbCopyResetTimer);
  this.hexShell.classList.remove("cp-copied");
  this.copyBtn.innerHTML=COPY;this.copyBtn.classList.remove("cp-copied");
};

CP.prototype._writeText=function(text){
  if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(text);
  return new Promise(function(resolve,reject){
    var ta=document.createElement("textarea");
    ta.value=text;ta.setAttribute("readonly","");
    ta.style.position="fixed";ta.style.opacity="0";ta.style.pointerEvents="none";
    document.body.appendChild(ta);ta.select();
    try{
      if(document.execCommand&&document.execCommand("copy"))resolve();
      else reject(new Error("Copy command failed"));
    }catch(err){reject(err)}
    document.body.removeChild(ta);
  });
};

CP.prototype._copyHex=function(){
  var self=this;var rgb=hsvToRgb(this.hsv.h,this.hsv.s,this.hsv.v);
  var hex=rgbToHex(rgb.r,rgb.g,rgb.b);
  this._writeText(hex).then(function(){self._showHexCopyFeedback()}).catch(function(){});
};

CP.prototype._copyRgb=function(){
  var self=this;
  this._writeText(this.rgbEl.textContent).then(function(){self._showRgbCopyFeedback()}).catch(function(){});
};

CP.prototype._applyWheel=function(){
  var tilt=this.enhancedMode?clamp(this.wheelVel*120,-7,7):0;
  this.wheelEl.style.transform="rotate("+this.wheelRot+"deg) perspective(500px) rotateY("+tilt+"deg)";
  this._positionDot();
};
CP.prototype._positionDot=function(){
  var metrics=this._wheelMetrics();
  var r=metrics.radius;
  var dotR=this.enhancedMode?Math.max(r-10,r*.72):this.hsv.s*r;
  var screenAngle=(this.pickerAngle!==undefined?this.pickerAngle:this.hsv.h)+this.wheelRot;
  var rad=screenAngle*Math.PI/180;
  var x=metrics.left+r+dotR*Math.sin(rad),y=metrics.top+r-dotR*Math.cos(rad);
  this.wheelDot.style.left=x+"px";this.wheelDot.style.top=y+"px";
  var actualH = this.enhancedMode?this._getSegmentHue(this.pickerAngle!==undefined?this.pickerAngle:this.hsv.h):this.hsv.h;
  var actualS = this.enhancedMode?100:this.hsv.s*100;
  this.wheelDot.style.backgroundColor="hsl("+Math.round(actualH)+","+Math.round(actualS)+"%,50%)";
};
CP.prototype._pickHueFromPointer=function(e){
  var metrics=this._wheelMetrics();
  var cx=metrics.cx,cy=metrics.cy;
  var screenAngle=angleBetween(cx,cy,e.clientX,e.clientY);
  this.pickerAngle=((screenAngle-this.wheelRot)%360+360)%360;
  this.hsv.h = this.enhancedMode ? this._getSegmentHue(this.pickerAngle) : this.pickerAngle;
  if(!this.enhancedMode){
    var dist=Math.hypot(e.clientX-cx,e.clientY-cy);
    this.hsv.s=clamp(dist/metrics.radius,0,1);
  }
  this._update();
};
CP.prototype._getSegmentHue=function(angle){
  if(angle==null)return 0;
  angle=(angle%360+360)%360;
  var i=Math.floor(angle/36);
  var hues=[3, 33, 48, 129, 186, 202, 211, 241, 280, 348];
  return hues[i]||0;
};
CP.prototype._handleSat=function(e){
  var r=this.satSlider.getBoundingClientRect();
  this.hsv.s=clamp((e.clientX-r.left)/r.width,0,1);this._update();
};
CP.prototype._handleVal=function(e){
  var r=this.valSlider.getBoundingClientRect();
  this.hsv.v=clamp((e.clientX-r.left)/r.width,0,1);this._update();
};
CP.prototype._update=function(skipHex, keepHue){
  if (!keepHue && this.enhancedMode) {
      this.hsv.h = this._getSegmentHue(this.pickerAngle);
  }
  var rgb=hsvToRgb(this.hsv.h,this.hsv.s,this.hsv.v);
  var hex=rgbToHex(rgb.r,rgb.g,rgb.b);
  this._positionDot();
  var gv=Math.round(this.hsv.v*255);
  var satFull=hsvToRgb(this.hsv.h,1,this.hsv.v);
  this.satTrack.style.backgroundImage="linear-gradient(to right,rgb("+gv+","+gv+","+gv+"),"+rgbToHex(satFull.r,satFull.g,satFull.b)+")";
  this.satThumb.style.left=(this.hsv.s*100)+"%";this.satThumb.style.backgroundColor=hex;
  var brightFull=hsvToRgb(this.hsv.h,this.hsv.s,1);
  this.valTrack.style.backgroundImage="linear-gradient(to right,#000,"+rgbToHex(brightFull.r,brightFull.g,brightFull.b)+")";
  this.valThumb.style.left=(this.hsv.v*100)+"%";this.valThumb.style.backgroundColor=hex;
  this.preview.style.backgroundColor=hex;
  if(!skipHex)this.hexInput.value=hex;
  this.rgbEl.textContent="rgb("+rgb.r+", "+rgb.g+", "+rgb.b+")";
  this._syncSwatch();this._updateContrast(rgb);
  this.input.value=hex;
  this.input.dispatchEvent(new Event("input",{bubbles:true}));
  this.swatch.setAttribute("title",hex);
};
CP.prototype._syncSwatch=function(){
  var rgb=hsvToRgb(this.hsv.h,this.hsv.s,this.hsv.v);
  this.swatch.style.backgroundColor=rgbToHex(rgb.r,rgb.g,rgb.b);
};
CP.prototype._updateContrast=function(rgb){
  var r=contrast(rgb,this.bgColor);
  this.ratioEl.textContent=r.toFixed(1)+":1";
  var g,c;
  if(r>=7){g="AAA";c="cp-aaa"}
  else if(r>=4.5){g="AA";c="cp-aa"}
  else if(r>=3){g="AA\u2009lg";c="cp-aa-lg"}
  else{g="Fail";c="cp-fail"}
  this.gradeEl.textContent=g;this.gradeEl.className="cp-grade "+c;
};
CP.prototype._fmtHex=function(){
  var rgb=hsvToRgb(this.hsv.h,this.hsv.s,this.hsv.v);
  this.hexInput.value=rgbToHex(rgb.r,rgb.g,rgb.b);
};
CP.prototype.toggle=function(){this.isOpen?this.close():this.open()};
CP.prototype.open=function(){
  if(this.input.disabled)return;
  if(activeCP&&activeCP!==this)activeCP.close();
  activeCP=this;this.isOpen=true;
  this._syncTheme();
  this.panel.classList.add("cp-open");
  this._update();
  this._position();
  this._applyWheel();
  var self=this;
  requestAnimationFrame(function(){
    document.addEventListener("pointerdown",self._docClick,true);
    document.addEventListener("keydown",self._docKey);
    window.addEventListener("resize",self._viewportChange);
    window.addEventListener("scroll",self._viewportChange,true);
  });
};
CP.prototype.close=function(){
  if(!this.isOpen)return;this.isOpen=false;
  this.panel.classList.remove("cp-open");activeCP=null;
  if(this.wheelAnim){cancelAnimationFrame(this.wheelAnim);this.wheelAnim=null}
  this._resetCopyFeedback();
  this._resetCopyTilt();
  this._deactivateShadow();
  document.removeEventListener("pointerdown",this._docClick,true);
  document.removeEventListener("keydown",this._docKey);
  window.removeEventListener("resize",this._viewportChange);
  window.removeEventListener("scroll",this._viewportChange,true);
  this.input.dispatchEvent(new Event("change",{bubbles:true}));
};
CP.prototype._position=function(){
  var sr=this.swatch.getBoundingClientRect();
  var margin=6,gap=6;
  var pw=Math.max(0,Math.min(248,window.innerWidth-margin*2));
  var maxHeight=Math.max(180,window.innerHeight-margin*2);
  this.panel.style.width=pw+"px";
  this.panel.style.maxHeight=maxHeight+"px";
  var ph=Math.min(this.panel.scrollHeight||400,maxHeight);
  var topBelow=sr.bottom+window.scrollY+gap;
  var topAbove=sr.top+window.scrollY-ph-gap;
  var minTop=window.scrollY+margin;
  var maxTop=window.scrollY+window.innerHeight-ph-margin;
  var top=topBelow;
  if(topBelow+ph>window.scrollY+window.innerHeight-margin)top=topAbove;
  top=Math.max(minTop,Math.min(top,maxTop));
  var left=sr.left+window.scrollX+sr.width/2-pw/2;
  left=Math.max(window.scrollX+margin,Math.min(left,window.scrollX+window.innerWidth-pw-margin));
  this.panel.style.top=top+"px";
  this.panel.style.left=left+"px";
};
/* Adopt a value written to the underlying input from outside (e.g. a form that
   loads a different record into the same field). */
CP.prototype.sync=function(){
  var v=this.input.value;
  if(!/^#[0-9a-f]{6}$/i.test(v))return;
  var rgb=hexToRgb(v);
  this.hsv=rgbToHsv(rgb.r,rgb.g,rgb.b);
  this.pickerAngle=this.hsv.h;
  this._syncSwatch();
  this.swatch.setAttribute("title",v);
  if(this.isOpen)this._update();
};
CP.prototype.destroy=function(){
  this.close();
  if(this.panel.parentNode)this.panel.parentNode.removeChild(this.panel);
  if(this.wrap.parentNode){this.wrap.parentNode.insertBefore(this.input,this.wrap);this.wrap.parentNode.removeChild(this.wrap)}
  this.input.style.cssText="";delete this.input._cp;
};

var SEL='input[type="color"],input[type="colour"]';
function initAll(){var els=document.querySelectorAll(SEL);for(var i=0;i<els.length;i++)if(!els[i]._cp)new CP(els[i])}
function refreshAll(){for(var i=0;i<INSTANCES.length;i++)if(INSTANCES[i]&&INSTANCES[i].input&&INSTANCES[i].input.isConnected){INSTANCES[i]._syncTheme();if(INSTANCES[i].isOpen){INSTANCES[i]._position();INSTANCES[i]._applyWheel();INSTANCES[i]._update()}}}
function watchTheme(){
  if(themeWatcherStarted||typeof MutationObserver==="undefined")return;
  themeWatcherStarted=true;
  var onThemeChange=function(){refreshAll()};
  new MutationObserver(onThemeChange).observe(document.documentElement,{attributes:true,attributeFilter:["class","style"]});
  if(document.body)new MutationObserver(onThemeChange).observe(document.body,{attributes:true,attributeFilter:["class","style"]});
  if(window.matchMedia){
    var media=window.matchMedia("(prefers-color-scheme: dark)");
    if(media.addEventListener)media.addEventListener("change",onThemeChange);
    else if(media.addListener)media.addListener(onThemeChange);
  }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initAll);else initAll();
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",watchTheme);else watchTheme();
if(typeof MutationObserver!=="undefined"){
  var start=function(){new MutationObserver(function(muts){for(var m=0;m<muts.length;m++){var nodes=muts[m].addedNodes;for(var n=0;n<nodes.length;n++){var nd=nodes[n];if(nd.nodeType!==1)continue;if(nd.matches&&nd.matches(SEL)&&!nd._cp)new CP(nd);if(nd.querySelectorAll){var nested=nd.querySelectorAll(SEL);for(var k=0;k<nested.length;k++)if(!nested[k]._cp)new CP(nested[k])}}}}).observe(document.body,{childList:true,subtree:true})};
  if(document.body)start();else document.addEventListener("DOMContentLoaded",start);
}
function getInstance(input){return input&&input._cp instanceof CP?input._cp:null}
function setValue(input,hex){
  if(!input)return null;
  input.value=hex;
  if(!input._cp)new CP(input);
  var inst=getInstance(input);
  if(inst)inst.sync();
  return inst;
}
window.Chromatic={init:initAll,refreshAll:refreshAll,create:function(i){return new CP(i)},get:getInstance,setValue:setValue,ColorPicker:CP};
})();
