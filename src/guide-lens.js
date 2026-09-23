// How far a zoomed page may be dragged before its edge would come away from the screen's.
export const panLimit=(scale,width,height)=>({x:Math.max(0,(scale-1)*width/2),y:Math.max(0,(scale-1)*height/2)});
