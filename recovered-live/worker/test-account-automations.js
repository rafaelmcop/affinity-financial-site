// This real mailbox is reserved for integration testing, never customer automation.
export const testAccountAutomationsDisabled=owner=>String(owner||'').trim().toLowerCase()==='rafaelmcop@hotmail.com';
