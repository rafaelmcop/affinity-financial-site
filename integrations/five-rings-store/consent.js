(async()=>{const field=document.getElementById('agree'),status=document.getElementById('status');field.checked=(await chrome.storage.local.get('affinityDataConsent')).affinityDataConsent===true;document.getElementById('save').onclick=async()=>{await chrome.storage.local.set({affinityDataConsent:field.checked});if(!field.checked)await chrome.storage.session.remove('affinity-five-rings-checkpoint');status.textContent=field.checked?'Synchronization enabled. Return to your Affinity portal to connect your account.':'New synchronization jobs are disabled.';};})();

const nationalLifeHosts={origins:['https://www.nationallife.com/*']};
const nationalLifeStatus=document.getElementById('national-life-access-status');
async function showNationalLifeAccess(){
 const enabled=await chrome.permissions.contains(nationalLifeHosts);
 nationalLifeStatus.textContent=enabled?'Browser access enabled. Your Affinity administrator must also release this feature.':'Browser access has not been enabled.';
}
document.getElementById('national-life-enable').onclick=async()=>{
 try{await chrome.permissions.request(nationalLifeHosts);await showNationalLifeAccess();}
 catch{nationalLifeStatus.textContent='Could not enable National Life access.';}
};
document.getElementById('national-life-disable').onclick=async()=>{await chrome.permissions.remove(nationalLifeHosts);await showNationalLifeAccess();};
void showNationalLifeAccess();
