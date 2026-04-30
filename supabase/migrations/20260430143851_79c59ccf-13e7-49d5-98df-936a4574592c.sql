-- Entity owners can update bids on their RFPs (to accept/reject)
CREATE POLICY "Entity owners update bids on their rfps"
ON public.bids
FOR UPDATE
USING (rfp_id IN (
  SELECT rfps.id FROM rfps
  WHERE rfps.entity_id IN (
    SELECT entities.id FROM entities WHERE entities.owner_id = auth.uid()
  )
));

-- Entity owners can create contracts for their entities
CREATE POLICY "Entity owners create contracts"
ON public.contracts
FOR INSERT
WITH CHECK (entity_id IN (
  SELECT entities.id FROM entities WHERE entities.owner_id = auth.uid()
));