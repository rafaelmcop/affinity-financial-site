CREATE INDEX IF NOT EXISTS idx_crm_clients_owner
  ON crmClients(lower(assignedAdminEmail));

CREATE INDEX IF NOT EXISTS idx_crm_clients_owner_email
  ON crmClients(lower(assignedAdminEmail), lower(trim(email)));

CREATE INDEX IF NOT EXISTS idx_crm_clients_owner_name
  ON crmClients(lower(assignedAdminEmail), lower(trim(name)));

CREATE INDEX IF NOT EXISTS idx_agent_policies_owner_client
  ON agentPolicies(lower(agentEmail), clientId);

CREATE INDEX IF NOT EXISTS idx_agent_policies_owner_email
  ON agentPolicies(lower(agentEmail), lower(trim(clientEmail)));

CREATE INDEX IF NOT EXISTS idx_agent_policies_owner_name
  ON agentPolicies(lower(agentEmail), lower(trim(clientName)));
