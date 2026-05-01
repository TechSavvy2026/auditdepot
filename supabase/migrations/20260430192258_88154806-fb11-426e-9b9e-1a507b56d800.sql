
-- Entity owners can view invoices on their contracts
CREATE POLICY "Entity owners view invoices"
ON public.invoices
FOR SELECT
TO public
USING (contract_id IN (
  SELECT id FROM public.contracts WHERE entity_id IN (
    SELECT id FROM public.entities WHERE owner_id = auth.uid()
  )
));

-- Firm owners can update invoices (mark paid)
CREATE POLICY "Firm owners update invoices"
ON public.invoices
FOR UPDATE
TO public
USING (firm_id IN (SELECT id FROM public.firms WHERE owner_id = auth.uid()));

-- Entity owners can update invoices (mark paid)
CREATE POLICY "Entity owners update invoices"
ON public.invoices
FOR UPDATE
TO public
USING (contract_id IN (
  SELECT id FROM public.contracts WHERE entity_id IN (
    SELECT id FROM public.entities WHERE owner_id = auth.uid()
  )
));
