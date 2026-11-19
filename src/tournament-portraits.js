/* Local photo fitting for the registered 320 x 887 uniform plates. */
(() => {
  'use strict';
  const target = [
    [154,51],[180,57],[199,78],[207,99],[207,124],[201,146],[188,164],[174,174],
    [155,180],[137,176],[121,166],[109,150],[102,127],[102,103],[106,81],[125,61],
    [131,105],[178,105],[155,129],[155,147]
  ];
  const mesh = [
    [1,17,0],[2,17,1],[17,2,3],[17,5,18],[5,19,18],[9,19,8],[19,9,10],
    [19,11,18],[11,19,10],[17,16,0],[16,17,18],[16,13,14],[13,16,12],
    [16,11,12],[11,16,18],[4,17,3],[17,4,5],[6,19,5],[16,15,0],[15,16,14],
    [19,7,8],[6,7,19]
  ];
  const clamp = (x, low, high) => Math.min(high, Math.max(low, x));
  const image = url => new Promise((resolve,reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(Error('Hindi mabasa ang larawan.'));
    img.src = url;
  });
  function canvas(w,h) {
    const el = document.createElement('canvas'); el.width=w; el.height=h; return el;
  }
  const plates = new Map(), photos = new Map();
  let detector, detectionQueue = Promise.resolve();
  function loadScript(name) {
    return new Promise((resolve,reject) => {
      const s = document.createElement('script');
      s.src = 'assets/' + name + '-1594.js';
      s.onload = resolve; s.onerror = () => reject(Error('Hindi mabuksan ang awtomatikong paghanay.'));
      document.head.append(s);
    });
  }
  async function initDetector() {
    await Promise.all([loadScript('tournament-detector'),loadScript('tournament-landmarks')]);
    const api = window.faceapi;
    await api.tf.setBackend('cpu'); await api.tf.ready();
    for (const [net, model] of Object.entries(window.AVTournamentWeights1594)) {
      const buffer = Uint8Array.from(atob(model.data), c=>c.charCodeAt(0)).buffer;
      api.nets[net].loadFromWeightMap(api.tf.io.decodeWeights(buffer,model.weights));
    }
    window.AVTournamentWeights1594 = null;
    return api;
  }
  function average(points) {
    return points.reduce((v,p)=>[v[0]+p[0]/points.length,v[1]+p[1]/points.length],[0,0]);
  }
  // The four interior landmarks and chin also support a teacher's five-point calibration.
  function fromPins(pins, width, height) {
    const [left,right,nose,mouth,chin] = pins.map(p=>[p[0]*width,p[1]*height]);
    const mid = average([left,right]);
    const across = [(right[0]-left[0])/47,(right[1]-left[1])/47];
    const down = [(chin[0]-mid[0])/75,(chin[1]-mid[1])/75];
    const points = target.slice(0,16).map(([x,y])=>[mid[0]+(x-154.5)*across[0]+(y-105)*down[0],mid[1]+(x-154.5)*across[1]+(y-105)*down[1]]);
    points[8]=chin;
    return points.concat([left,right,nose,mouth]).map(p=>[p[0]/width,p[1]/height]);
  }
  function validPins(pins) {
    if (!Array.isArray(pins) || pins.length!==5 || !pins.every(p=>Array.isArray(p)&&p.length===2&&p.every(v=>Number.isFinite(v)&&v>=0&&v<=1))) return false;
    const [l,r,n,m,c]=pins, eyes=average([l,r]), dx=r[0]-l[0],dy=r[1]-l[1];
    const below=p=>dx*(p[1]-eyes[1])-dy*(p[0]-eyes[0]);
    return dx>.025 && below(n)>0 && below(m)>below(n) && below(c)>below(m);
  }
  async function detect(photo) {
    detector ||= initDetector();
    const api = await detector;
    const detectAt=size=>api.detectAllFaces(photo.el,new api.TinyFaceDetectorOptions({inputSize:size,scoreThreshold:.34})).withFaceLandmarks(true);
    let matches=await detectAt(320);
    if(!matches.length) matches=await detectAt(416);
    if (matches.length!==1) return {state:matches.length?'multiple':'manual'};
    const p = matches[0].landmarks.positions.map(v=>[v.x/photo.w,v.y/photo.h]);
    const pins = [average(p.slice(36,42)),average(p.slice(42,48)),p[30],average([p[62],p[66]]),p[8]];
    if (!validPins(pins)) return {state:'manual'};
    const points = fromPins(pins,photo.w,photo.h);
    // The detector follows this student's own jaw, even for a slightly tilted photo.
    for (const [dest,src] of [[3,16],[4,15],[5,14],[6,12],[7,10],[8,8],[9,6],[10,4],[11,3],[12,1],[13,0]]) points[dest]=p[src];
    return {state:'ready',points,pins};
  }
  async function readPhoto(url) {
    const img=await image(url);
    const ratio=Math.min(1,480/Math.max(img.naturalWidth,img.naturalHeight));
    const el=canvas(Math.max(1,Math.round(img.naturalWidth*ratio)),Math.max(1,Math.round(img.naturalHeight*ratio)));
    const ctx=el.getContext('2d',{willReadFrequently:true}); ctx.drawImage(img,0,0,el.width,el.height);
    return {el,w:el.width,h:el.height,pixels:ctx.getImageData(0,0,el.width,el.height).data};
  }
  function photo(url) {
    if (!photos.has(url)) {
      if (photos.size>=24) photos.delete(photos.keys().next().value);
      photos.set(url,readPhoto(url));
    }
    return photos.get(url);
  }
  function fit(photo) {
    if (!photo.detected) {
      photo.detected = detectionQueue.then(()=>detect(photo)).catch(()=>({state:'manual'}));
      detectionQueue = photo.detected.then(()=>{});
    }
    return photo.detected;
  }
  function plate(look) {
    if (!plates.has(look)) plates.set(look,image(window.AVTournamentArt1594[look]));
    return plates.get(look);
  }
  function sample(photo,x,y,ch) {
    x=clamp(x,0,photo.w-1); y=clamp(y,0,photo.h-1);
    const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy;
    const a=4*(iy*photo.w+ix)+ch,b=a+(ix+1<photo.w?4:0),row=iy+1<photo.h?4*photo.w:0;
    return (1-fy)*((1-fx)*photo.pixels[a]+fx*photo.pixels[b])+fy*((1-fx)*photo.pixels[a+row]+fx*photo.pixels[b+row]);
  }
  function harmonize(data,points,portrait,side) {
    const cheeks=[average([points[12],points[16],points[18]]),average([points[4],points[17],points[18]])];
    const neck=[[148,190],[153,191],[157,188]].map(([x,y])=>4*(320*y+(side==='blue'?319-x:x)));
    const gain=[0,1,2].map(c=>{
      const litFace=cheeks.reduce((v,p)=>v+sample(portrait,p[0],p[1],c),0)/cheeks.length;
      const plateNeck=neck.reduce((v,i)=>v+data[i+c],0)/neck.length;
      return clamp(litFace*.88/Math.max(45,plateNeck),.51,1.6);
    });
    for (let i=0;i<data.length;i+=4) {
      if (!data[i+3]) continue;
      const y=Math.floor(i/(4*320)),r=data[i],g=data[i+1],b=data[i+2];
      if (y>790 || r<45 || r<=g || g<=b) continue;
      const hue=(r-g)/Math.max(1,r-b);
      const coverage=clamp((hue-.25)*9,0,1)*clamp((.91-hue)*10,0,1)*clamp((r-b-13)/20,0,1);
      for (let c=0;c<3;c++) data[i+c]*=1+coverage*(gain[c]-1);
    }
  }
  function distanceToEdge(x,y,outline) {
    let min=Infinity;
    for(let i=0;i<16;i++){
      const [a,b]=outline[i], [c,d]=outline[(i+1)%16],dx=c-a,dy=d-b;
      const t=clamp(((x-a)*dx+(y-b)*dy)/(dx*dx+dy*dy),0,1);
      min=Math.min(min,(x-a-t*dx)**2+(y-b-t*dy)**2);
    }
    return Math.sqrt(min);
  }
  // Inverse-map each triangle at pixel centers, avoiding seams between facial features.
  function compositeFace(out,src,dst,portrait) {
    for(const triangle of mesh){
      const [a,b,c]=triangle.map(i=>dst[i]),[A,B,C]=triangle.map(i=>src[i]);
      const det=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
      for(let y=Math.floor(Math.min(a[1],b[1],c[1]));y<=Math.ceil(Math.max(a[1],b[1],c[1]));y++){
        for(let x=Math.floor(Math.min(a[0],b[0],c[0]));x<=Math.ceil(Math.max(a[0],b[0],c[0]));x++){
          const u=((b[1]-c[1])*(x+.5-c[0])+(c[0]-b[0])*(y+.5-c[1]))/det;
          const v=((c[1]-a[1])*(x+.5-c[0])+(a[0]-c[0])*(y+.5-c[1]))/det,w=1-u-v;
          if(u<0||v<0||w<0) continue;
          const sx=A[0]*u+B[0]*v+C[0]*w,sy=A[1]*u+B[1]*v+C[1]*w,idx=4*(y*320+x);
          const t=clamp(distanceToEdge(x+.5,y+.5,dst)/5,0,1);
          const opacity=t*t*(3-2*t)*sample(portrait,sx,sy,3)/255;
          for(let ch=0;ch<3;ch++) out[idx+ch]+=opacity*(sample(portrait,sx,sy,ch)-out[idx+ch]);
        }
      }
    }
  }
  // A plain school-photo backdrop lets us keep the actual hair, ears, expression and face shape.
  // Complex or tightly cropped backdrops use the fitted facial mesh instead.
  function naturalHead(out,source,portrait,side) {
    const eyes=average([source[16],source[17]]),chin=source[8];
    const dx=source[17][0]-source[16][0],dy=source[17][1]-source[16][1],span=Math.hypot(dx,dy);
    const ux=dx/span,uy=dy/span,down=(chin[1]-eyes[1])*ux-(chin[0]-eyes[0])*uy;
    if(down<8)return false;
    const scale=.76*(75/down)+.24*clamp(47/span,.85*75/down,1.15*75/down),center=side==='blue'?165:155;
    const toSource=(x,y)=>[chin[0]+((x-center)*ux-(y-180)*uy)/scale,chin[1]+((x-center)*uy+(y-180)*ux)/scale];
    const colors=[];
    for(const x of [.04,.96]) for(const y of [.04,.17,.30,.43]){
      colors.push([0,1,2].map(c=>sample(portrait,x*portrait.w,y*portrait.h,c)));
    }
    const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
    const background=[0,1,2].map(c=>colors.map(v=>v[c]).sort((a,b)=>a-b)[4]);
    const palette=colors.filter(v=>dist(v,background)<66);
    if(palette.length<6 || toSource(center,25)[1]<-3)return false;
    const outline=source.slice(0,16).map(([x,y])=>[center+scale*((x-chin[0])*ux+(y-chin[1])*uy),180+scale*((y-chin[1])*ux-(x-chin[0])*uy)]);
    function inside(x,y) {
      let hit=false;
      for(let i=0,j=15;i<16;j=i++){
        const [a,b]=outline[i],[c,d]=outline[j];
        if((b>y)!==(d>y) && x<(c-a)*(y-b)/(d-b)+a)hit=!hit;
      }
      return hit;
    }
    const width=232,height=264,left=center-width/2;
    const rgb=new Uint8ClampedArray(width*height*3),alpha=new Float32Array(width*height);
    let upperHair=0,outer=0;
    for(let y=0;y<height;y++)for(let col=0;col<width;col++){
      const x=left+col,offset=y*width+col,[sx,sy]=toSource(x,y);
      if(sx<1||sy<1||sx>=portrait.w-1||sy>=portrait.h-1)continue;
      const pixel=[0,1,2].map(c=>sample(portrait,sx,sy,c));rgb.set(pixel,offset*3);
      const fromCenter=Math.abs(x-center),colorGap=Math.min(...palette.map(v=>dist(pixel,v)));
      let a=clamp((colorGap-24)/25,0,1);
      // A wall shadow has nearly the same chromaticity as the wall in direct light.
      const light=pixel[0]+pixel[1]+pixel[2],ref=background[0]+background[1]+background[2];
      const brightness=light/Math.max(1,ref);
      if(brightness>.49 && brightness<1.16){
        const shadowGap=dist(pixel,background.map(v=>v*brightness));
        a*=clamp((shadowGap-12)/21,0,1);
      }
      if(y>140 && pixel[2]>=pixel[0]-4 && Math.max(...pixel)>123)a=0;
      const core=inside(x,y);
      if(core)a=1;
      else if(y>110){
        // Let ears extend slightly past the measured jaw; long dark hair may extend farther.
        const ear=Math.max(2,15-Math.abs(y-120)*.24);
        const neckSkin=y>160 && fromCenter<32 && pixel[0]>pixel[2]+14 && pixel[0]>pixel[1]+4;
        const neck=neckSkin?clamp((198-y)/12,0,1)*clamp((31-fromCenter)/7,0,1):0;
        const edge=clamp((ear+4-distanceToEdge(x,y,outline))/4,0,1);
        const hair=clamp((125-Math.max(...pixel))/35,0,1);
        a*=Math.max(edge,hair,neck);
      }
      // Preserve dark locks at the sides; feather the original neck into the neutral collar.
      if(y>172){
        const neckWidth=Math.max(12,32-(y-172)*.35);
        const neck=clamp((neckWidth+3-fromCenter)/6,0,1)*clamp((198-y)/13,0,1);
        const hair=clamp((122-Math.max(...pixel))/30,0,1)*clamp((fromCenter-19)/9,0,1)*clamp((254-y)/20,0,1);
        a*=Math.max(neck,hair,core?1:0);
      }
      a*=clamp((113-fromCenter)/11,0,1)*clamp((y+1)/3,0,1);
      alpha[offset]=a;
      if(y<60&&fromCenter<35&&a>.9)upperHair++;
      if(y<90&&fromCenter>100&&a>.55)outer++;
    }
    if(upperHair<220||outer>430)return false;
    // Keep the connected head only; a shadow or another object on the wall cannot become hair.
    const seed=105*width+Math.floor(width/2),connected=new Uint8Array(alpha.length),stack=[seed];
    connected[seed]=1;
    while(stack.length){
      const n=stack.pop(),col=n%width;
      for(const k of [col?n-1:-1,col<width-1?n+1:-1,n-width,n+width]){
        if(k<0||k>=alpha.length||connected[k]||alpha[k]<.10)continue;
        connected[k]=1;stack.push(k);
      }
    }
    for(let y=0;y<height;y++)for(let col=0;col<width;col++){
      const x=left+col,idx=4*(y*320+x),p=y*width+col;
      if(!connected[p])continue;
      const a=alpha[p];
      for(let c=0;c<3;c++) out[idx+c]=rgb[3*p+c];
      out[idx+3]=Math.round(a*255);
    }
    return true;
  }
  function placement(value) {
    const bounded=(key,min,max,fallback)=>Number.isFinite(value?.[key])?Math.round(clamp(value[key],min,max)):fallback;
    return {size:bounded('size',90,112,100),x:bounded('x',-10,10,0),y:bounded('y',-8,8,0)};
  }
  // Split at the real neckline. The upper neck remains behind the moving head.
  function separateHead(frame,head,side,look,usePlateHair) {
    for(let y=0;y<204;y++)for(let x=0;x<320;x++){
      const localX=side==='blue'?319-x:x,i=4*(y*320+x);
      const ponytail=look==='yellow' && localX>194 && y<Math.min(203,180+(localX-194)*.5);
      const mainHead=y<180 && (y<165 || Math.abs(localX-155)<64-(y-165)*1.5);
      if(!ponytail&&!mainHead)continue;
      if(usePlateHair)for(let c=0;c<4;c++)head[i+c]=frame[i+c];
      if(y<163 || Math.abs(localX-155)>20) {
        frame[i+3]=0;
      } else {
        const neck=4*(188*320+x);
        for(let c=0;c<4;c++) frame[i+c]=frame[neck+c];
      }
    }
  }
  async function render(look,side,portrait,normalized,adjustment) {
    const body=await plate(look==='white'?'teal':look),el=canvas(320,887),ctx=el.getContext('2d',{willReadFrequently:true});
    if(side==='blue'){ctx.translate(320,0);ctx.scale(-1,1);}
    ctx.drawImage(body,0,0);ctx.resetTransform();
    const frame=ctx.getImageData(0,0,320,887);
    const source=normalized.map(p=>[p[0]*portrait.w,p[1]*portrait.h]);
    // Mirror the stance, keeping the student's face in the orientation of the original photo.
    const dest=target.map(([x,y])=>[x+(side==='blue'?11:0),y]);
    if(look==='white'){
      // Shift only the teal fabric to white while retaining its original folds and collar.
      for(let i=0;i<frame.data.length;i+=4){
        const y=Math.floor(i/(4*320)),r=frame.data[i],g=frame.data[i+1],b=frame.data[i+2];
        if(y<168||y>410||g<r+6||g<b||!frame.data[i+3])continue;
        const white=255-Math.pow(1-g/255,1.35)*158;
        frame.data[i]=white-2;frame.data[i+1]=white;frame.data[i+2]=Math.min(255,white+3);
      }
    }
    harmonize(frame.data,source,portrait,side);
    const head=canvas(320,264),headContext=head.getContext('2d');
    const layer=headContext.createImageData(head.width,head.height);
    const hasHair=naturalHead(layer.data,source,portrait,side);
    separateHead(frame.data,layer.data,side,look,!hasHair);
    if(!hasHair)compositeFace(layer.data,source,dest,portrait);
    headContext.putImageData(layer,0,0);
    ctx.putImageData(frame,0,0);
    const fit=placement(adjustment),anchor=side==='blue'?165:155;
    ctx.translate(anchor+(side==='blue'?-fit.x:fit.x),180+fit.y);
    ctx.scale(fit.size/100,fit.size/100);
    ctx.drawImage(head,-anchor,-180);
    return el.toDataURL('image/webp',.93);
  }
  window.AVTournamentPortraits1594={photo,fit,fromPins,validPins,render,placement};
})();
