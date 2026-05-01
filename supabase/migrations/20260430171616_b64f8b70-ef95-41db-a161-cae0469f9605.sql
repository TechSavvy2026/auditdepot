-- Add completed to contract_status enum
ALTER TYPE public.contract_status ADD VALUE IF NOT EXISTS 'completed';

-- Allow entity owners to update their contracts
CREATE POLICY "Entity owners update contracts"
ON public.contracts
FOR UPDATE
USING (entity_id IN (SELECT id FROM entities WHERE owner_id = auth.uid()));