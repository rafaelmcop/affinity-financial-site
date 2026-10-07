import test from 'node:test';
import assert from 'node:assert/strict';
import {mediaResponse,mediaFilename} from './media-response.mjs';

test('downloads carry an extension matching the actual media format',()=>{
 assert.equal(mediaFilename(null,'image/jpeg'),'arquivo.jpg');
 assert.equal(mediaFilename(null,'audio/ogg; codecs=opus'),'arquivo.ogg');
 assert.equal(mediaFilename('teste.png','image/jpeg'),'teste.jpg');
 assert.equal(mediaFilename('exame.pdf','application/pdf'),'exame.pdf');
 assert.equal(mediaFilename('arquivo.json','image/webp'),'arquivo.webp');
});
test('plain text with legacy file kind never gets an attachment link',()=>{
  const output=mediaResponse({id:'text',mediaKey:null,mediaKind:'file',mime:null,filename:null,mediaState:null},()=>{throw Error('No file key to check');});
  assert.equal(output.mediaUrl,null);assert.equal(output.mediaKind,null);assert.equal('mediaKey' in output,false);
});
test('only existing stored files get links, including older rows without ready state',()=>{
  for(const mime of ['image/png','audio/ogg','application/pdf']){
    const row={id:'file',mediaKey:'stored',mediaKind:'file',mime,mediaState:null};
    const available=mediaResponse(row,()=>true);
    assert.equal(available.mediaState,'ready');assert.equal(available.mediaUrl,'/api/agent/whatsapp/media?id=file');
    assert.equal(mediaResponse(row,()=>false).mediaUrl,null);
  }
});
test('failed media keeps its error state without a download link',()=>{
  const output=mediaResponse({id:'failed',mediaKey:null,mediaKind:'audio',mime:'audio/ogg',mediaState:'download_failed'},()=>false);
  assert.equal(output.mediaUrl,null);assert.equal(output.mediaKind,'audio');assert.equal(output.mediaState,'download_failed');
});
