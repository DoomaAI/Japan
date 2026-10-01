// Where the server hands back a stored file, a photo or a voice note. Each is read with the
// family's session cookie, so these are only ever used inside the app.
export const documentUrl=d=>`/api/document?id=${encodeURIComponent(d.id)}`;
export const photoUrl=p=>`/api/photo?id=${encodeURIComponent(p.id)}`;
export const voiceUrl=v=>`/api/voice?id=${encodeURIComponent(v.id)}`;
