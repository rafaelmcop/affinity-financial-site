chrome.runtime.onInstalled.addListener(details=>{if(details.reason==='install')chrome.tabs.create({url:chrome.runtime.getURL('consent.html')});});
async function requireStoreConsent(){const consent=await chrome.storage.local.get('affinityDataConsent');if(consent.affinityDataConsent!==true)throw Error('Open the Affinity connector icon and review its data access settings before enabling synchronization.');}

async function requireNationalLifeConsent(){
 if(!await chrome.permissions.contains({origins:['https://www.nationallife.com/*']}))throw Error('Abra o ícone da extensão Affinity e clique em Allow National Life access.');
}
