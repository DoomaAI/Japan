import React from 'react';
import {FileText,Link2,StickyNote,Film,Image as ImageIcon} from 'lucide-react';
import {documentThumbnail} from './trip-features.js';
const fileUrl=d=>`/api/document?id=${encodeURIComponent(d.id)}`;
const HEIC=['image/heic','image/heif'];
// A thumbnail for a ticket, luggage tag or attached file. A real photo when there is one to
// draw, otherwise a labelled tile — so every row is the same shape and every one is tappable.
export default function DocumentThumb({doc,attachments=[],onView}){
 const picture=documentThumbnail(doc,attachments);
 const others=attachments.filter(a=>a.pathname).length;
 if(picture)return <button type="button" className="doc-thumb" onClick={()=>onView(picture)}
  aria-label={`Open ${picture===doc?doc.title:`the photo attached to ${doc.title}`} full screen`}>
  <img src={fileUrl(picture)} alt="" loading="lazy" decoding="async"/>
  {picture!==doc&&others>1&&<span className="doc-thumb-count">{others}</span>}
 </button>;
 if(doc.type==='application/pdf')return <button type="button" className="doc-thumb tile pdf" onClick={()=>onView(doc)}
  aria-label={`Open ${doc.title} full screen`}><FileText size={22}/><span>PDF</span></button>;
 if(HEIC.includes(doc.type))return <a className="doc-thumb tile" href={fileUrl(doc)} target="_blank" rel="noopener noreferrer"
  aria-label={`Open the original photo for ${doc.title}`}><ImageIcon size={22}/><span>HEIC</span></a>;
 if(doc.type?.startsWith('video/'))return <a className="doc-thumb tile" href={fileUrl(doc)} target="_blank" rel="noopener noreferrer"
  aria-label={`Open the video for ${doc.title}`}><Film size={22}/><span>Video</span></a>;
 if(doc.type==='link')return <a className="doc-thumb tile" href={doc.url} target="_blank" rel="noopener noreferrer"
  aria-label={`Open the link for ${doc.title}`}><Link2 size={22}/><span>Link</span></a>;
 return <span className="doc-thumb tile quiet" aria-hidden="true"><StickyNote size={22}/><span>Note</span></span>;
}
