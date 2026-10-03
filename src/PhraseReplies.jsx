import React from 'react';
import {repliesFor} from './phrase-replies.js';
// The likely answers to a phrase, folded shut under it: open, each is the Japanese, how it
// sounds, and what it means, so the reply can be recognised when it comes back fast.
export default function PhraseReplies({phrase,open}){
 const replies=repliesFor(phrase);
 if(!replies.length)return null;
 return <details className="phrase-replies" open={open}>
  <summary>What you might hear back · {replies.length}</summary>
  <ul>{replies.map(x=><li key={x.ja}><b lang="ja">{x.ja}</b><span className="phrase-replies-say">“{x.say}”</span><small>{x.en}</small></li>)}</ul>
 </details>;
}
