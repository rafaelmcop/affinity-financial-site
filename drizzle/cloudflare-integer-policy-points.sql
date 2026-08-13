UPDATE agentPolicies SET points=CAST(ROUND(COALESCE(points,0),0) AS INTEGER);
