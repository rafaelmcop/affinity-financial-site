export const defaultVideoId='3HOKK2MTtNQ';
export const demoVideoId='M7lc1UVf-VE';
export const demoHlsUrl='https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';
const videoPattern=/^[A-Za-z0-9_-]{11}$/;
export function getYouTubeId(value){
 const text=String(value||'').trim();if(videoPattern.test(text))return text;
 let url;try{url=new URL(text)}catch{return null}
 if(!['https:','http:'].includes(url.protocol)||url.username||url.password)return null;
 let id;if(url.hostname==='youtu.be')id=url.pathname.split('/')[1];
 else if(['youtube.com','www.youtube.com','m.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com'].includes(url.hostname))id=url.pathname==='/watch'?url.searchParams.get('v'):url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)\/?$/)?.[1];
 else if(url.pathname==='/app')id=url.hash.match(/^#\/watch\/([A-Za-z0-9_-]{11})(?:[/?&]|$)/)?.[1];
 return id&&videoPattern.test(id)?id:null;
}
export function getHlsUrl(value){let url;try{url=new URL(String(value||'').trim())}catch{return null}return url.protocol==='https:'&&!url.username&&!url.password&&url.href.length<=8192?url.href:null;}
export function youtubeErrorMessage(code){if([101,150].includes(Number(code)))return 'Este vídeo não permite reprodução incorporada. Use “Abrir no YouTube” ou escolha outro vídeo.';if(Number(code)===100)return 'Este vídeo está privado, foi removido ou não está disponível. Use “Abrir no YouTube” ou escolha outro.';if(Number(code)===153)return 'O YouTube não autorizou este player no navegador. Use “Abrir no YouTube”.';return 'Não foi possível carregar esse vídeo. Use “Abrir no YouTube” ou escolha outro vídeo.';}
export function createPlayerController({video,mount,loadHls,loadYouTube,onStatus=()=>{},onSource=()=>{},origin}){
 let generation=0,kind=null,hls=null,youtube=null,disposed=false;
 const status=(message,tone='info')=>{if(!disposed)onStatus(message,tone)};
 function stop(){generation++;kind=null;const oldHls=hls,oldYoutube=youtube;hls=null;youtube=null;oldHls?.destroy();oldYoutube?.destroy();mount.replaceChildren();mount.hidden=true;video.pause();video.removeAttribute('src');video.load();video.hidden=true;onSource(null);}
 function active(ticket,source){return !disposed&&generation===ticket&&kind===source}
 async function youtubeSource(id){if(!videoPattern.test(id))throw Error('Cole um link ou ID de vídeo válido.');if(disposed)return;stop();kind='youtube';const ticket=generation;onSource('youtube',id);mount.hidden=false;status('Carregando o player do YouTube…');
  try{const api=await loadYouTube();if(!active(ticket,'youtube'))return;const node=mount.ownerDocument.createElement('div');mount.append(node);youtube=new api.Player(node,{host:'https://www.youtube-nocookie.com',videoId:id,playerVars:{autoplay:0,playsinline:1,hl:'pt-BR',origin,rel:0},events:{onReady(){if(active(ticket,'youtube'))status('Vídeo pronto. Toque em Play para começar.');},onError(event){if(active(ticket,'youtube'))status(youtubeErrorMessage(event.data),'error');},onStateChange(event){if(active(ticket,'youtube')&&event.data===1)status('Reproduzindo vídeo do YouTube.');if(active(ticket,'youtube')&&event.data===2)status('Reprodução pausada.');}}});
  }catch{if(active(ticket,'youtube'))status('O YouTube não respondeu. Confira sua conexão ou use “Abrir no YouTube”.','error');}
 }
 async function hlsSource(value){const url=getHlsUrl(value);if(!url)throw Error('Use um endereço HTTPS válido, sem usuário ou senha antes do domínio.');if(disposed)return;stop();kind='hls';const ticket=generation;onSource('hls');video.hidden=false;status('Preparando o canal…');
  // Native HLS, including Safari/iPad, avoids downloading the optional MSE library.
  if(video.canPlayType('application/vnd.apple.mpegurl')){video.src=url;status('Canal pronto. Toque em Play para começar.');return;}
  try{const Hls=await loadHls();if(!active(ticket,'hls'))return;if(!Hls.isSupported()){stop();status('Este navegador não oferece suporte a HLS. Tente um navegador compatível.','error');return;}
   const instance=new Hls({debug:false,autoStartLoad:false,backBufferLength:30,maxBufferLength:20});hls=instance;
   instance.on(Hls.Events.ERROR,(_event,error)=>{if(!active(ticket,'hls')||hls!==instance||!error.fatal)return;stop();status('Não foi possível carregar o canal. Confira o link, a conexão e a autorização/CORS do provedor.','error');});
   instance.on(Hls.Events.MANIFEST_PARSED,()=>{if(active(ticket,'hls'))status('Canal pronto. Toque em Play para começar.');});
   instance.loadSource(url);instance.attachMedia(video);
  }catch{if(active(ticket,'hls')){stop();status('Não foi possível preparar o canal neste navegador. Tente novamente.','error');}}
 }
 const playing=()=>{if(kind==='hls')status('Reproduzindo canal HLS.');};
 const play=()=>{if(kind==='hls')hls?.startLoad(-1);};
 const paused=()=>{if(kind==='hls')status('Reprodução pausada.');};
 const error=()=>{if(kind!=='hls')return;stop();status('Não foi possível reproduzir o canal. Confira o acesso e o formato do provedor.','error');};
 video.addEventListener('play',play);video.addEventListener('playing',playing);video.addEventListener('error',error);video.addEventListener('pause',paused);
 function dispose(){stop();disposed=true;video.removeEventListener('play',play);video.removeEventListener('playing',playing);video.removeEventListener('error',error);video.removeEventListener('pause',paused);}
 async function togglePlay(){if(kind==='youtube'&&youtube){if(youtube.getPlayerState?.()===1)youtube.pauseVideo();else youtube.playVideo();}else if(kind==='hls'){if(video.paused)await video.play();else video.pause();}else throw Error('Aguarde o vídeo ficar pronto.');}
 return {youtube:youtubeSource,hls:hlsSource,stop,dispose,togglePlay,get source(){return kind}};
}
