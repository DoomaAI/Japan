import React from 'react';
import {Receipt} from 'lucide-react';
// Shopping tax-free in Japan, as it works until the end of October 2026. From 1 November 2026
// Japan moves to paying the tax and claiming it back at the airport, which is after we are home.
export const TAX_FREE=[
 ['Where','Shops with the red “Japan. Tax-free Shop” sign, or a tax-free counter in a department store.'],
 ['How much','¥5,000 or more before tax, in one shop on one day. Receipts from different days or shops do not add up.'],
 ['Passport','Each buyer shows their own passport, the real one, not a photo. The purchase is recorded against it.'],
 ['Food, drink and cosmetics','Sealed in a bag at the till. Do not open it until we have left Japan. Up to ¥500,000 each.'],
 ['Clothes, toys and electronics','Can be used while we are here, but must leave Japan with us.'],
 ['At the airport','Customs can ask to see tax-free items, so keep them in a bag we can reach.'],
 ['Coming home','Tax-free in Japan is still bought overseas, so it counts towards the Australian duty-free allowance.']
];
export default function TaxFree(){
 return <details className="callout tax-free">
  <summary><Receipt size={18}/> <strong>Shopping tax-free: 10% off from ¥5,000</strong></summary>
  <ul>{TAX_FREE.map(([k,v])=><li key={k}><strong>{k}.</strong> {v}</li>)}</ul>
  <p><small>These are the rules until 31 October 2026. From 1 November Japan charges the tax and refunds it at the airport instead.</small></p>
 </details>;
}
