// A successful retry must supersede an earlier unavailable/download_failed state.
// Conversely, a late metadata-only event must never hide already stored media.
export const mediaUpsert = `INSERT INTO messages(owner,id,chat,body,direction,stamp,ack,mediaKey,mime,filename,mediaKind,mediaSize,mediaState) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(owner,id) DO UPDATE SET
ack=MAX(messages.ack,excluded.ack),
mediaKey=COALESCE(excluded.mediaKey,messages.mediaKey),
mime=CASE WHEN excluded.mediaKey IS NOT NULL OR messages.mediaKey IS NULL THEN COALESCE(excluded.mime,messages.mime) ELSE messages.mime END,
filename=CASE WHEN excluded.mediaKey IS NOT NULL OR messages.mediaKey IS NULL THEN COALESCE(excluded.filename,messages.filename) ELSE messages.filename END,
mediaKind=CASE WHEN excluded.mediaKey IS NOT NULL OR messages.mediaKey IS NULL THEN COALESCE(excluded.mediaKind,messages.mediaKind) ELSE messages.mediaKind END,
mediaSize=CASE WHEN excluded.mediaKey IS NOT NULL OR messages.mediaKey IS NULL THEN COALESCE(excluded.mediaSize,messages.mediaSize) ELSE messages.mediaSize END,
mediaState=CASE WHEN excluded.mediaKey IS NOT NULL OR messages.mediaKey IS NOT NULL THEN 'ready' ELSE COALESCE(excluded.mediaState,messages.mediaState) END`;
