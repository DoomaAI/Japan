import React from 'react';
import {CircleHelp} from 'lucide-react';
// Every page used to open with a paragraph or two of why before anything you could touch. One
// line stays under the title; the rest folds behind this, for the first visit and the odd
// question, and out of the way on the twentieth.
export default function HowThisWorks({children,label='How this works'}){
 return <details className="how-this-works"><summary><CircleHelp size={15}/>{label}</summary><div>{children}</div></details>;
}
