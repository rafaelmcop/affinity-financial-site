// Light is the only supported portal appearance. Old clients cannot re-enable a retired theme.
export async function agentAppearance(env,owner,input){
 if(input!==undefined&&!['light','dark'].includes(input.theme))throw Error('A aparência do portal é clara.');
 return {theme:'light'};
}
