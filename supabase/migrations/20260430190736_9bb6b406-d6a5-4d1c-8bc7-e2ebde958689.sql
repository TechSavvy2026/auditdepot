CREATE POLICY "Firm owners update contracts"
ON public.contracts
FOR UPDATE
TO public
USING (firm_id IN (SELECT firms.id FROM firms WHERE firms.owner_id = auth.uid()));